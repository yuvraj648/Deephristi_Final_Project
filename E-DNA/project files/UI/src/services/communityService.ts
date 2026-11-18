import { formatSupabaseError, supabase } from '../lib/supabase';

export type CommunityCategory = 'discovery' | 'field_log' | 'taxa_query' | 'protocol';

export interface CommunityComment {
  id: string;
  author: string;
  role: string;
  affiliation: string;
  avatar: string;
  avatarBg: string;
  timestamp: string;
  content: string;
  likes: number;
  userLiked?: boolean;
}

export interface CommunityPost {
  id: string;
  author: string;
  role: string;
  affiliation: string;
  avatar: string;
  avatarBg: string;
  timestamp: string;
  category: CommunityCategory;
  title: string;
  content: string;
  stationTag?: string;
  asvTag?: string;
  channelTag?: string;
  endorsed: boolean;
  endorseCount: number;
  bookmarked: boolean;
  comments: CommunityComment[];
}

export interface CommunityPostDraft {
  category: CommunityCategory;
  title: string;
  content: string;
  stationTag?: string;
  asvTag?: string;
  channelTag?: string;
}

interface DatabaseError {
  code?: string;
  message?: string;
}

interface PostRow {
  id: string;
  author_name: string;
  category: CommunityCategory;
  title: string;
  content: string;
  station_tag: string | null;
  asv_tag: string | null;
  channel_tag: string | null;
  created_at: string;
}

interface CommentRow {
  id: string;
  post_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

interface PostStatsRow {
  post_id: string;
  endorsement_count: number;
  endorsed_by_me: boolean;
  bookmarked_by_me: boolean;
}

interface CommentStatsRow {
  comment_id: string;
  endorsement_count: number;
  endorsed_by_me: boolean;
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured for community persistence.');
  }
  return supabase;
}

function throwCommunityError(error: DatabaseError, operation: string): never {
  const message = error.message || '';
  if (
    error.code === 'PGRST202' ||
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    message.toLowerCase().includes('schema cache') ||
    message.toLowerCase().includes('could not find the table')
  ) {
    throw new Error(
      'Community schema is not initialized. Apply supabase/migrations/002_community_schema.sql in the Supabase SQL Editor.'
    );
  }
  throw new Error(`${operation}: ${formatSupabaseError(error)}`);
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase() || 'R';
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString();
}

function mapComment(row: CommentRow, likes: number, userLiked: boolean): CommunityComment {
  const author = row.author_name || 'Researcher';
  return {
    id: row.id,
    author,
    role: 'Researcher',
    affiliation: 'DeepDrishti community',
    avatar: initials(author),
    avatarBg: 'bg-survey',
    timestamp: formatTimestamp(row.created_at),
    content: row.content,
    likes,
    userLiked,
  };
}

export async function getCommunityUser(): Promise<{ id: string } | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('auth session missing') ||
      message.includes('invalid jwt') ||
      message.includes('jwt expired')
    ) {
      return null;
    }
    throwCommunityError(error, 'Could not verify the community session');
  }
  return data.user ? { id: data.user.id } : null;
}

export async function listCommunityPosts(): Promise<CommunityPost[]> {
  const client = requireSupabase();
  const { data: postData, error: postError } = await client
    .from('community_posts')
    .select('id, author_name, category, title, content, station_tag, asv_tag, channel_tag, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (postError) throwCommunityError(postError, 'Could not load community posts');
  const postRows = (postData ?? []) as PostRow[];
  if (postRows.length === 0) return [];

  const postIds = postRows.map((post) => post.id);
  const [
    { data: commentData, error: commentError },
    { data: postStatsData, error: postStatsError },
  ] = await Promise.all([
    client
      .from('community_comments')
      .select('id, post_id, author_name, content, created_at')
      .in('post_id', postIds)
      .order('created_at', { ascending: true }),
    client.rpc('get_community_post_stats', { p_post_ids: postIds }),
  ]);

  if (commentError) throwCommunityError(commentError, 'Could not load community comments');
  if (postStatsError) throwCommunityError(postStatsError, 'Could not load community post statistics');

  const commentRows = (commentData ?? []) as CommentRow[];
  const commentIds = commentRows.map((comment) => comment.id);
  let commentStatsRows: CommentStatsRow[] = [];

  if (commentIds.length > 0) {
    const { data, error } = await client.rpc('get_community_comment_stats', {
      p_comment_ids: commentIds,
    });
    if (error) throwCommunityError(error, 'Could not load community comment statistics');
    commentStatsRows = (data ?? []) as CommentStatsRow[];
  }

  const commentsByPost = new Map<string, CommunityComment[]>();
  const commentStatsById = new Map(
    commentStatsRows.map((row) => [row.comment_id, row])
  );
  for (const row of commentRows) {
    const comments = commentsByPost.get(row.post_id) ?? [];
    const stats = commentStatsById.get(row.id);
    comments.push(
      mapComment(row, stats?.endorsement_count ?? 0, stats?.endorsed_by_me ?? false)
    );
    commentsByPost.set(row.post_id, comments);
  }

  const postStatsById = new Map(
    ((postStatsData ?? []) as PostStatsRow[]).map((row) => [row.post_id, row])
  );

  return postRows.map((row) => {
    const author = row.author_name || 'Researcher';
    const stats = postStatsById.get(row.id);
    return {
      id: row.id,
      author,
      role: 'Researcher',
      affiliation: 'DeepDrishti community',
      avatar: initials(author),
      avatarBg: 'bg-survey',
      timestamp: formatTimestamp(row.created_at),
      category: row.category,
      title: row.title,
      content: row.content,
      stationTag: row.station_tag ?? undefined,
      asvTag: row.asv_tag ?? undefined,
      channelTag: row.channel_tag ?? undefined,
      endorsed: stats?.endorsed_by_me ?? false,
      endorseCount: stats?.endorsement_count ?? 0,
      bookmarked: stats?.bookmarked_by_me ?? false,
      comments: commentsByPost.get(row.id) ?? [],
    };
  });
}

export async function createCommunityPost(
  researcherId: string,
  draft: CommunityPostDraft
): Promise<CommunityPost> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('community_posts')
    .insert({
      author_id: researcherId,
      category: draft.category,
      title: draft.title.trim(),
      content: draft.content.trim(),
      station_tag: draft.stationTag || null,
      asv_tag: draft.asvTag || null,
      channel_tag: draft.channelTag || null,
    })
    .select('id, author_name, category, title, content, station_tag, asv_tag, channel_tag, created_at')
    .single();

  if (error) throwCommunityError(error, 'Could not publish the community dispatch');
  const row = data as PostRow;
  const author = row.author_name || 'Researcher';
  return {
    id: row.id,
    author,
    role: 'Researcher',
    affiliation: 'DeepDrishti community',
    avatar: initials(author),
    avatarBg: 'bg-survey',
    timestamp: formatTimestamp(row.created_at),
    category: row.category,
    title: row.title,
    content: row.content,
    stationTag: row.station_tag ?? undefined,
    asvTag: row.asv_tag ?? undefined,
    channelTag: row.channel_tag ?? undefined,
    endorsed: false,
    endorseCount: 0,
    bookmarked: false,
    comments: [],
  };
}

export async function createCommunityComment(
  researcherId: string,
  postId: string,
  content: string
): Promise<CommunityComment> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('community_comments')
    .insert({ author_id: researcherId, post_id: postId, content: content.trim() })
    .select('id, post_id, author_name, content, created_at')
    .single();

  if (error) throwCommunityError(error, 'Could not submit the community response');
  return mapComment(data as CommentRow, 0, false);
}

export async function setPostEndorsed(
  researcherId: string,
  postId: string,
  endorsed: boolean
): Promise<void> {
  const client = requireSupabase();
  const result = endorsed
    ? await client
        .from('community_post_endorsements')
        .delete()
        .eq('post_id', postId)
        .eq('researcher_id', researcherId)
    : await client
        .from('community_post_endorsements')
        .insert({ post_id: postId, researcher_id: researcherId });

  if (result.error) throwCommunityError(result.error, 'Could not update the post endorsement');
}

export async function setPostBookmarked(
  researcherId: string,
  postId: string,
  bookmarked: boolean
): Promise<void> {
  const client = requireSupabase();
  const result = bookmarked
    ? await client
        .from('community_bookmarks')
        .delete()
        .eq('post_id', postId)
        .eq('researcher_id', researcherId)
    : await client
        .from('community_bookmarks')
        .insert({ post_id: postId, researcher_id: researcherId });

  if (result.error) throwCommunityError(result.error, 'Could not update the saved post');
}

export async function setCommentEndorsed(
  researcherId: string,
  commentId: string,
  endorsed: boolean
): Promise<void> {
  const client = requireSupabase();
  const result = endorsed
    ? await client
        .from('community_comment_endorsements')
        .delete()
        .eq('comment_id', commentId)
        .eq('researcher_id', researcherId)
    : await client
        .from('community_comment_endorsements')
        .insert({ comment_id: commentId, researcher_id: researcherId });

  if (result.error) throwCommunityError(result.error, 'Could not update the comment endorsement');
}
