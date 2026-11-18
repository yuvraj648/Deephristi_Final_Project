// ========================================================
// DEEPDRISHTI RESEARCHER COMMUNITY & DISPATCH HUB
// Cross-expedition community view for oceanography research collaboration.
// ========================================================

import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  ThumbsUp,
  Bookmark,
  Sparkles,
  MapPin,
  Dna,
  Send,
  Search,
  CheckCircle2,
  Tag,
  FileText,
  Clock,
  ExternalLink,
  X,
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import {
  createCommunityComment,
  createCommunityPost,
  getCommunityUser,
  listCommunityPosts,
  setCommentEndorsed,
  setPostBookmarked,
  setPostEndorsed,
} from '../../services/communityService';
import type {
  CommunityCategory,
  CommunityComment,
  CommunityPost,
} from '../../services/communityService';

type Comment = CommunityComment;

interface Post extends CommunityPost {
  telemetrySnapshot?: {
    label: string;
    value: string;
    highlight?: boolean;
  }[];
  sequenceSnippet?: {
    header: string;
    sequence: string;
    divergence: string;
  };
  comments: Comment[];
}

interface CommunityPageProps {
  onExit: () => void;
  onOpenSurveillance?: () => void;
  persistenceMode: 'cloud' | 'local';
}

type FeedTab = 'all' | 'saved' | Post['category'];

type CommunityMode = 'loading' | 'local' | 'cloud' | 'auth-required' | 'error';

const FEED_TABS: { id: FeedTab; label: string }[] = [
  { id: 'all', label: 'All updates' },
  { id: 'saved', label: 'Saved' },
  { id: 'discovery', label: 'Discoveries' },
  { id: 'field_log', label: 'Field logs' },
  { id: 'taxa_query', label: 'Taxa queries' },
  { id: 'protocol', label: 'Protocols' },
];

const DISPATCH_CATEGORIES: { id: Post['category']; label: string; color: string }[] = [
  { id: 'discovery', label: 'Discovery', color: 'border-aubergine text-aubergine bg-aubergine/10' },
  { id: 'field_log', label: 'Cruise field log', color: 'border-survey text-survey bg-survey/10' },
  { id: 'taxa_query', label: 'Taxa verification', color: 'border-biological text-biological bg-biological/10' },
  { id: 'protocol', label: 'Lab protocol', color: 'border-warning text-warning bg-warning/10' },
];

export const CommunityPage: React.FC<CommunityPageProps> = ({
  onExit,
  onOpenSurveillance,
  persistenceMode,
}) => {

  // Active filter tab & search
  const [activeTab, setActiveTab] = useState<FeedTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChannel, setActiveChannel] = useState<string | null>(null);

  // Modal / Composer state
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerTitle, setComposerTitle] = useState('');
  const [composerContent, setComposerContent] = useState('');
  const [composerCategory, setComposerCategory] = useState<CommunityCategory>('discovery');
  const [composerStation, setComposerStation] = useState<string>('');
  const [composerAsv, setComposerAsv] = useState('');
  const [composerTag, setComposerTag] = useState('');

  // Toast notification for actions (e.g., share)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [communityMode, setCommunityMode] = useState<CommunityMode>(
    persistenceMode === 'local' ? 'local' : 'loading'
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedReloadKey, setFeedReloadKey] = useState(0);
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [isCloudActionPending, setIsCloudActionPending] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Comments state
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({
    'post-1': true,
  });
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Seeded rich posts
  const [posts, setPosts] = useState<Post[]>([
    {
      id: 'post-1',
      author: 'Dr. Elena Rostova',
      role: 'Principal Bioinformatician',
      affiliation: 'Scripps Institution of Oceanography / Tara Oceans',
      avatar: 'ER',
      avatarBg: 'bg-[#1C4E75]',
      timestamp: '2 hours ago',
      category: 'discovery',
      title: 'Cohesive cluster of 14 candidate divergent Rhodophyta sequences isolated at 850m depth',
      content:
        'During our automated divergence pipeline run on Station G-14 (18°12\'N, 68°45\'E) within the northern oxygen minimum zone, we detected a tight latent cluster of 14 Amplicon Sequence Variants with an average 14.8% divergence from SILVA 138.1 and NCBI GenBank reference barcodes.\n\nAll variants share a conserved 24-bp motif in the hypervariable V9 region and maintain strong vertical persistence across three independent sampling depths (750m, 850m, 950m) with over 18,400 reads. We invite peer laboratories in the Indian Ocean consortium to review the centroid alignment.',
      stationTag: 'Station G-14 (OMZ Core)',
      asvTag: 'ASV_IND_04928',
      channelTag: '#NovelSequenceVariants',
      endorsed: false,
      endorseCount: 34,
      bookmarked: true,
      telemetrySnapshot: [
        { label: 'Cluster ID', value: 'CLUST-03 (Candidate)', highlight: true },
        { label: 'Pairwise Divergence', value: '14.8%', highlight: true },
        { label: 'Sampled Reads', value: '18,420' },
        { label: 'Depth Zone', value: '850m (Mesopelagic)' },
      ],
      sequenceSnippet: {
        header: '>ASV_IND_04928 | 18S-V9 Rhodophyta candidate lineage',
        sequence: 'CCTGCGGCTTAATTTGACTCAACACGGGAAAACTCACCAGGCCCGGACACCGTAAGGATTGACAGATTGAGAGCTCTTTCTTGATTCT',
        divergence: '14.8% vs SILVA 138.1',
      },
      comments: [
        {
          id: 'c1',
          author: 'Dr. Priya Nair',
          role: 'Molecular Ecologist',
          affiliation: 'NIO Goa Marine Genomics',
          avatar: 'PN',
          avatarBg: 'bg-[#2F8F7A]',
          timestamp: '1 hour ago',
          content:
            'We observed an identical 18S-V9 sub-clade during the 2024 Arabian Sea deep-trawl at 920m near the Murray Ridge. Our raw FASTQ reads are uploaded on SeaDataNet. Happy to share sequence centroids for cross-alignment!',
          likes: 6,
        },
        {
          id: 'c2',
          author: 'Prof. Kenji Sato',
          role: 'Chief Microbiologist',
          affiliation: 'JAMSTEC Marine Ecology Lab',
          avatar: 'KS',
          avatarBg: 'bg-[#C2542D]',
          timestamp: '35 minutes ago',
          content:
            'The high GC content (58.2%) in these amplicons strongly correlates with secondary membrane stabilization in abyssal barophilic eukaryotes. Great find!',
          likes: 4,
        },
      ],
    },
    {
      id: 'post-2',
      author: 'Prof. Kenji Sato',
      role: 'Chief Marine Ecologist',
      affiliation: 'JAMSTEC Marine Microbiome Lab',
      avatar: 'KS',
      avatarBg: 'bg-[#C2542D]',
      timestamp: '5 hours ago',
      category: 'protocol',
      title: 'Bench protocol update: 0.22 μm Sterivex filtration QA for high-turbidity coastal stations',
      content:
        'Quality assurance observation for cruise teams: In coastal stations with heavy suspended particulate matter, pre-filtering sea water through a 1.2 μm glass fiber membrane prior to the 0.22 μm PES Sterivex capsule prevented column clogging and reduced PCR inhibitor carryover by 42%.\n\nCritically, amplicon recovery for target eukaryotic barcodes remained at 96.4%. Full bench protocol SOP and filtration curves have been synchronized with the DeepDrishti automated pipeline documentation.',
      stationTag: 'Station K-02',
      channelTag: '#SterivexQA',
      endorsed: true,
      endorseCount: 42,
      bookmarked: false,
      telemetrySnapshot: [
        { label: 'Flow Rate', value: '<50 mL/min' },
        { label: 'Inhibitor Reduction', value: '-42%', highlight: true },
        { label: 'Barcode Yield', value: '96.4%' },
        { label: 'Filter Type', value: 'Sterivex PES 0.22μm' },
      ],
      comments: [
        {
          id: 'c3',
          author: 'Dr. Marcus Vance',
          role: 'Fleet Surveyor',
          affiliation: 'NOAA Ocean Exploration',
          avatar: 'MV',
          avatarBg: 'bg-[#D08A2E]',
          timestamp: '3 hours ago',
          content:
            'Excellent refinement, Kenji. We will implement this for tomorrow morning\'s CTD rosette deployment along transect line B.',
          likes: 3,
        },
      ],
    },
    {
      id: 'post-3',
      author: 'Dr. Marcus Vance',
      role: 'Hydrographic Fleet Surveyor',
      affiliation: 'NOAA Ocean Exploration',
      avatar: 'MV',
      avatarBg: 'bg-[#D08A2E]',
      timestamp: 'Yesterday at 17:40',
      category: 'field_log',
      title: 'CTD Rosette Cast Telemetry & Thermocline Biological Transition at Station G-08',
      content:
        'Completed CTD Rosette Cast #12 at Station G-08 (depth 1,420m). We registered an exceptionally sharp thermocline boundary between 85m and 115m, where water temperature plummeted from 26.4°C down to 17.6°C.\n\nPreliminary shipboard fluorometry and rapid eDNA amplicon screening registered a dramatic 3.8× surge in Copepoda and Dinoflagellate sequence reads at the chlorophyll maximum. Physical oceanographic telemetry has been georeferenced directly into our Nautical GIS map plate.',
      stationTag: 'Station G-08',
      channelTag: '#ThermoclineGradients',
      endorsed: false,
      endorseCount: 27,
      bookmarked: false,
      telemetrySnapshot: [
        { label: 'Sonde Temp', value: '17.6°C', highlight: true },
        { label: 'Salinity', value: '35.9 PSU' },
        { label: 'Dissolved O₂', value: '1.38 mL/L' },
        { label: 'Chlorophyll-a', value: '2.4 μg/L', highlight: true },
      ],
      comments: [],
    },
  ]);

  useEffect(() => {
    let active = true;

    const loadCommunity = async () => {
      setFeedError(null);
      setCommunityMode(persistenceMode === 'local' ? 'local' : 'loading');

      try {
        if (persistenceMode === 'local') {
          if (active) setCommunityMode('local');
          return;
        }

        const user = await getCommunityUser();
        if (!active) return;
        if (!user) {
          setCurrentUserId(null);
          setCommunityMode('auth-required');
          return;
        }

        const communityPosts = await listCommunityPosts();
        if (!active) return;
        setCurrentUserId(user.id);
        setPosts(communityPosts);
        setCommunityMode('cloud');
      } catch (error) {
        if (!active) return;
        setFeedError(error instanceof Error ? error.message : 'Could not load the community feed.');
        setCommunityMode('error');
      }
    };

    void loadCommunity();
    return () => {
      active = false;
    };
  }, [feedReloadKey, persistenceMode]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = composerTitle.trim();
    const content = composerContent.trim();
    if (!title || !content) return;
    setActionError(null);

    const channelTag = composerTag.trim()
      ? composerTag.trim().startsWith('#')
        ? composerTag.trim()
        : `#${composerTag.trim()}`
      : undefined;

    try {
      let newPost: Post;
      if (communityMode === 'cloud') {
        if (!currentUserId) throw new Error('Your researcher session is no longer available. Sign in again.');
        setIsSavingPost(true);
        newPost = await createCommunityPost(currentUserId, {
          category: composerCategory,
          title,
          content,
          stationTag: composerStation.trim() || undefined,
          asvTag: composerAsv.trim() || undefined,
          channelTag,
        });
      } else if (communityMode === 'local') {
        newPost = {
          id: `post-${Date.now()}`,
          author: 'You',
          role: 'Researcher',
          affiliation: 'Local preview',
          avatar: 'YO',
          avatarBg: 'bg-survey',
          timestamp: 'Just now',
          category: composerCategory,
          title,
          content,
          stationTag: composerStation.trim() || undefined,
          asvTag: composerAsv.trim() || undefined,
          channelTag,
          endorsed: false,
          endorseCount: 0,
          bookmarked: false,
          comments: [],
        };
      } else {
        throw new Error('The community is not ready to accept posts. Retry loading the feed.');
      }

      setPosts((previous) => [newPost, ...previous]);
      setComposerTitle('');
      setComposerContent('');
      setComposerStation('');
      setComposerAsv('');
      setComposerTag('');
      setIsComposerOpen(false);
      showToast(communityMode === 'cloud' ? 'Dispatch published to the community.' : 'Dispatch added to this local preview.');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not publish the dispatch.');
    } finally {
      setIsSavingPost(false);
    }
  };

  const handleToggleEndorse = async (postId: string) => {
    const post = posts.find((item) => item.id === postId);
    if (!post) return;

    if (communityMode === 'cloud') {
      if (!currentUserId) {
        setActionError('Your researcher session is no longer available. Sign in again.');
        return;
      }
      if (isCloudActionPending) return;
      setIsCloudActionPending(true);
      setActionError(null);
      try {
        await setPostEndorsed(currentUserId, postId, post.endorsed);
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Could not update the endorsement.');
        return;
      } finally {
        setIsCloudActionPending(false);
      }
    }

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const isNowEndorsed = !post.endorsed;
          return {
            ...post,
            endorsed: isNowEndorsed,
            endorseCount: isNowEndorsed ? post.endorseCount + 1 : post.endorseCount - 1,
          };
        }
        return post;
      })
    );
  };

  const handleToggleBookmark = async (postId: string) => {
    const post = posts.find((item) => item.id === postId);
    if (!post) return;

    if (communityMode === 'cloud') {
      if (!currentUserId) {
        setActionError('Your researcher session is no longer available. Sign in again.');
        return;
      }
      if (isCloudActionPending) return;
      setIsCloudActionPending(true);
      setActionError(null);
      try {
        await setPostBookmarked(currentUserId, postId, post.bookmarked);
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Could not update the saved post.');
        return;
      } finally {
        setIsCloudActionPending(false);
      }
    }

    const next = !post.bookmarked;
    setPosts((prev) =>
      prev.map((post) => {
        return post.id === postId ? { ...post, bookmarked: next } : post;
      })
    );
    showToast(
      next
        ? communityMode === 'cloud' ? 'Saved to your account.' : 'Saved for this preview.'
        : communityMode === 'cloud' ? 'Removed from your saved posts.' : 'Removed from this preview.'
    );
  };

  // Toggle Comments
  const handleToggleComments = (postId: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handleAddComment = async (postId: string) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;
    setActionError(null);

    let newComment: Comment;
    if (communityMode === 'cloud') {
      if (!currentUserId) {
        setActionError('Your researcher session is no longer available. Sign in again.');
        return;
      }
      if (isSavingComment) return;
      setIsSavingComment(true);
      try {
        newComment = await createCommunityComment(currentUserId, postId, text);
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Could not submit the response.');
        return;
      } finally {
        setIsSavingComment(false);
      }
    } else if (communityMode === 'local') {
      newComment = {
        id: `c-${Date.now()}`,
        author: 'You',
        role: 'Researcher',
        affiliation: 'Local preview',
        avatar: 'YO',
        avatarBg: 'bg-survey',
        timestamp: 'Just now',
        content: text,
        likes: 0,
      };
    } else {
      setActionError('The community is not ready to accept responses. Retry loading the feed.');
      return;
    }

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            comments: [...post.comments, newComment],
          };
        }
        return post;
      })
    );

    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    setExpandedComments((prev) => ({ ...prev, [postId]: true }));
    showToast(communityMode === 'cloud' ? 'Response shared with the community.' : 'Response added to this local preview.');
  };

  const handleLikeComment = async (postId: string, commentId: string) => {
    const comment = posts
      .find((post) => post.id === postId)
      ?.comments.find((item) => item.id === commentId);
    if (!comment) return;

    if (communityMode === 'cloud') {
      if (!currentUserId) {
        setActionError('Your researcher session is no longer available. Sign in again.');
        return;
      }
      if (isCloudActionPending) return;
      setIsCloudActionPending(true);
      setActionError(null);
      try {
        await setCommentEndorsed(currentUserId, commentId, Boolean(comment.userLiked));
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Could not update the response endorsement.');
        return;
      } finally {
        setIsCloudActionPending(false);
      }
    }

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            comments: post.comments.map((c) => {
              if (c.id === commentId) {
                const liked = c.userLiked;
                return {
                  ...c,
                  likes: liked ? c.likes - 1 : c.likes + 1,
                  userLiked: !liked,
                };
              }
              return c;
            }),
          };
        }
        return post;
      })
    );
  };

  // Filter posts
  const postsReady = communityMode === 'local' || communityMode === 'cloud';
  const visiblePosts = postsReady ? posts : [];
  const filteredPosts = visiblePosts.filter((post) => {
    if (activeTab === 'saved' && !post.bookmarked) return false;
    if (activeTab !== 'all' && activeTab !== 'saved' && post.category !== activeTab) return false;
    if (activeChannel && post.channelTag !== activeChannel) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = post.title.toLowerCase().includes(q);
      const matchContent = post.content.toLowerCase().includes(q);
      const matchAuthor = post.author.toLowerCase().includes(q);
      const matchTag = post.channelTag?.toLowerCase().includes(q);
      const matchStation = post.stationTag?.toLowerCase().includes(q);
      const matchAsv = post.asvTag?.toLowerCase().includes(q);
      return matchTitle || matchContent || matchAuthor || matchTag || matchStation || matchAsv;
    }
    return true;
  });

  const getCategoryMeta = (cat: Post['category']) => {
    switch (cat) {
      case 'discovery':
        return {
          label: 'Discovery Announcement',
          tagClass: 'bg-aubergine/15 text-aubergine border-aubergine/40',
          dotClass: 'bg-aubergine',
        };
      case 'field_log':
        return {
          label: 'Cruise Field Log',
          tagClass: 'bg-survey/15 text-survey border-survey/40',
          dotClass: 'bg-survey',
        };
      case 'taxa_query':
        return {
          label: 'Taxa Verification',
          tagClass: 'bg-biological/15 text-biological border-biological/40',
          dotClass: 'bg-biological',
        };
      case 'protocol':
        return {
          label: 'Laboratory Protocol',
          tagClass: 'bg-warning/15 text-warning border-warning/40',
          dotClass: 'bg-warning',
        };
    }
  };

  const canPost = communityMode === 'local' || communityMode === 'cloud';
  const retryCommunityLoad = () => setFeedReloadKey((key) => key + 1);

  return (
    <div className="flex min-h-screen flex-col bg-paper font-sans text-ink">
      <Header
        currentView="community"
        onExitWorkspace={onExit}
        exitLabel="Research home"
        headerContext={{
          title: 'Research network',
          subtitle: 'Cross-expedition community',
        }}
        showReportButton={false}
        onOpenSurveillance={onOpenSurveillance}
      />
      <div className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0B1726] border border-survey text-white px-4 py-2.5 rounded-plate shadow-floating flex items-center gap-2 font-mono text-[12px] animate-fadeIn">
          <CheckCircle2 size={16} className="text-survey" />
          <span>{toastMessage}</span>
        </div>
      )}

        <section className="flex flex-col gap-4 border-b border-rule pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-survey">
                Research network
              </span>
              <span className="rounded-full border border-rule px-2 py-0.5 text-[11px] text-ink-faint">
                {communityMode === 'cloud'
                  ? 'Shared community'
                  : communityMode === 'local'
                    ? 'Local preview'
                    : communityMode === 'loading'
                      ? 'Connecting'
                      : communityMode === 'auth-required'
                        ? 'Sign-in required'
                        : 'Unavailable'}
              </span>
            </div>
            <h1 className="text-2xl font-semibold leading-tight text-ink sm:text-3xl">Community</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              Exchange field observations, discuss eDNA findings, and share practical protocols across expeditions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setIsComposerOpen(true);
            }}
            disabled={!canPost || isSavingPost}
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-control bg-survey px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-survey-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 sm:self-auto"
          >
            <Send size={15} />
            <span>New dispatch</span>
          </button>
        </section>
        <p className="-mt-3 text-xs leading-5 text-ink-faint">
          {communityMode === 'cloud'
            ? 'Posts and interactions are saved to Supabase and shared with signed-in researchers.'
            : communityMode === 'local'
              ? 'Sample posts and interactions are temporary and are not shared with other researchers.'
              : communityMode === 'auth-required'
                ? 'Your Supabase session is missing. Return to Research Home and sign in again.'
                : communityMode === 'error'
                  ? 'The shared community could not be loaded.'
                  : 'Connecting to the shared research community…'}
        </p>
        {actionError && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-plate border border-error/40 bg-error/10 px-4 py-3 text-sm text-error"
          >
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              aria-label="Dismiss community error"
              className="shrink-0 hover:opacity-70"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* ========================================================
              Community feed
            ======================================================== */}
        <main className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
          <section className="min-w-0 space-y-5 xl:col-span-8">
          {/* Top Create Post Bar (Facebook / LinkedIn Style) */}
          <div className="space-y-3 rounded-plate border border-rule bg-paper-raised p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-survey text-sm font-bold text-white shadow-sm">
                YO
              </div>
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setIsComposerOpen(true);
                }}
                disabled={!canPost || isSavingPost}
                className="flex flex-1 items-center justify-between rounded-control border border-rule bg-paper px-4 py-3 text-left text-sm text-ink-muted transition-colors hover:border-rule-strong hover:text-ink"
              >
                <span>Share an observation, ask a question, or start a discussion...</span>
                <Send size={15} className="ml-2 flex-shrink-0 text-survey" />
              </button>
            </div>

            {/* Quick action bar */}
            <div className="grid grid-cols-4 gap-1 pt-2 border-t border-rule text-[12px] font-mono text-ink-muted">
              <button
                type="button"
                disabled={!canPost}
                onClick={() => {
                  setComposerCategory('discovery');
                  setIsComposerOpen(true);
                }}
                className="py-1.5 px-2 rounded-control hover:bg-paper-sunk flex items-center justify-center gap-1.5 text-aubergine hover:text-aubergine transition-colors"
              >
                <Sparkles size={14} />
                <span className="hidden sm:inline">Discovery</span>
              </button>
              <button
                type="button"
                disabled={!canPost}
                onClick={() => {
                  setComposerCategory('field_log');
                  setIsComposerOpen(true);
                }}
                className="py-1.5 px-2 rounded-control hover:bg-paper-sunk flex items-center justify-center gap-1.5 text-survey hover:text-survey transition-colors"
              >
                <MapPin size={14} />
                <span className="hidden sm:inline">Field Log</span>
              </button>
              <button
                type="button"
                disabled={!canPost}
                onClick={() => {
                  setComposerCategory('taxa_query');
                  setIsComposerOpen(true);
                }}
                className="py-1.5 px-2 rounded-control hover:bg-paper-sunk flex items-center justify-center gap-1.5 text-biological hover:text-biological transition-colors"
              >
                <Dna size={14} />
                <span className="hidden sm:inline">Taxa Query</span>
              </button>
              <button
                type="button"
                disabled={!canPost}
                onClick={() => {
                  setComposerCategory('protocol');
                  setIsComposerOpen(true);
                }}
                className="py-1.5 px-2 rounded-control hover:bg-paper-sunk flex items-center justify-center gap-1.5 text-warning hover:text-warning transition-colors"
              >
                <FileText size={14} />
                <span className="hidden sm:inline">Protocol</span>
              </button>
            </div>
          </div>

          {/* Feed Filter Strip & Search */}
          <div className="flex items-end justify-between gap-4 px-1">
            <div>
              <h2 className="text-lg font-semibold text-ink">Dispatch feed</h2>
              <p className="mt-1 text-xs text-ink-muted">
                {communityMode === 'cloud'
                  ? 'Browse shared researcher dispatches.'
                  : 'Browse and filter the sample research posts.'}
              </p>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-ink-faint">
              {communityMode === 'loading'
                ? 'Loading…'
                : communityMode === 'auth-required' || communityMode === 'error'
                  ? 'Unavailable'
                  : `${filteredPosts.length} ${filteredPosts.length === 1 ? 'post' : 'posts'}`}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-plate border border-rule bg-paper-raised p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-1">
              {FEED_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-pressed={activeTab === tab.id}
                  className={`rounded-control px-3 py-2 text-xs transition-colors ${
                    activeTab === tab.id
                      ? 'bg-survey text-white font-medium'
                      : 'text-ink-muted hover:text-ink hover:bg-paper-sunk'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative flex-1 min-w-[160px] max-w-[210px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search community posts"
                placeholder="Search dispatches..."
                className="w-full rounded-control border border-rule bg-paper py-2 pl-8 pr-8 text-sm text-ink placeholder:text-ink-faint focus:border-survey focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Posts List */}
          <div className="space-y-4">
            {communityMode === 'loading' ? (
              <div role="status" className="rounded-plate border border-rule bg-paper-raised p-10 text-center text-sm text-ink-muted">
                Loading community posts…
              </div>
            ) : communityMode === 'auth-required' ? (
              <div role="alert" className="space-y-3 rounded-plate border border-rule bg-paper-raised p-10 text-center">
                <h4 className="text-lg font-semibold text-ink">Sign in to view the community</h4>
                <p className="text-sm text-ink-muted">
                  Shared posts are available only to authenticated researchers.
                </p>
                <button
                  type="button"
                  onClick={onExit}
                  className="rounded-control border border-rule px-3.5 py-2 text-sm text-ink hover:bg-paper-sunk"
                >
                  Return to Research Home
                </button>
              </div>
            ) : communityMode === 'error' ? (
              <div role="alert" className="space-y-3 rounded-plate border border-error/40 bg-error/10 p-8 text-center">
                <h4 className="text-lg font-semibold text-ink">Could not load the community feed</h4>
                <p className="text-sm text-ink-muted">{feedError}</p>
                <button
                  type="button"
                  onClick={retryCommunityLoad}
                  className="rounded-control border border-rule px-3.5 py-2 text-sm text-ink hover:bg-paper-sunk"
                >
                  Retry
                </button>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="bg-paper-raised border border-rule rounded-plate p-10 text-center space-y-3">
                <MessageSquare size={32} className="mx-auto text-ink-faint" />
                <h4 className="font-serif font-medium text-[17px] text-ink">
                  {communityMode === 'cloud'
                    ? posts.length === 0
                      ? 'No community dispatches yet'
                      : 'No dispatches match these filters'
                    : 'No dispatches found in this category'}
                </h4>
                <p className="text-[12px] font-mono text-ink-muted max-w-md mx-auto">
                  {communityMode === 'cloud' && posts.length === 0
                    ? 'Be the first researcher to share an observation or question.'
                    : 'Try adjusting your search query or clearing the active channel filter.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('all');
                    setActiveChannel(null);
                    setSearchQuery('');
                  }}
                  className="px-3.5 py-1.5 bg-paper hover:bg-paper-sunk border border-rule text-ink font-mono text-[11px] rounded-control"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              filteredPosts.map((post) => {
                const meta = getCategoryMeta(post.category);
                const isExpanded = expandedComments[post.id] ?? false;

                return (
                  <article
                    key={post.id}
                    className="bg-paper-raised border border-rule rounded-plate shadow-sm hover:border-rule-strong transition-all overflow-hidden"
                  >
                    {/* Post Header Card */}
                    <div className="p-5 pb-3 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-11 h-11 rounded-full ${post.avatarBg} text-white font-serif font-bold text-[14px] flex items-center justify-center flex-shrink-0 shadow-sm border border-white/20`}
                          >
                            {post.avatar}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-serif font-medium text-[15px] text-ink leading-tight">
                                {post.author}
                              </span>
                              <span
                                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-control border flex items-center gap-1 ${meta.tagClass}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                                {meta.label}
                              </span>
                            </div>
                            <p className="text-[11px] font-mono text-ink-muted leading-tight mt-0.5">
                              {post.role} • <span className="text-ink-faint">{post.affiliation}</span>
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] font-mono text-ink-faint mt-1">
                              <Clock size={11} />
                              <span>{post.timestamp}</span>
                            </div>
                          </div>
                        </div>

                        {/* Top right actions */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleBookmark(post.id)}
                            disabled={isCloudActionPending}
                            aria-pressed={post.bookmarked}
                            aria-label={post.bookmarked ? 'Remove bookmark' : 'Save dispatch'}
                            className={`p-1.5 rounded-control transition-colors ${
                              post.bookmarked ? 'text-survey bg-survey/15' : 'text-ink-faint hover:text-ink'
                            }`}
                            title={post.bookmarked ? 'Saved to Bookmarks' : 'Save Dispatch'}
                          >
                            <Bookmark size={16} fill={post.bookmarked ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                      </div>

                      {/* Post Headline & Body Text */}
                      <div className="space-y-2 pt-1">
                        <h2 className="font-serif font-medium text-[18px] text-ink leading-snug">
                          {post.title}
                        </h2>
                        <p className="text-[13px] font-sans text-ink leading-relaxed whitespace-pre-line">
                          {post.content}
                        </p>
                      </div>

                      {/* Metadata Badges */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
                        {post.stationTag && (
                          <span className="bg-paper-sunk text-ink px-2.5 py-1 rounded-control border border-rule flex items-center gap-1.5">
                            <MapPin size={12} className="text-survey" />
                            <span>{post.stationTag}</span>
                          </span>
                        )}
                        {post.asvTag && (
                          <span className="bg-paper-sunk text-ink px-2.5 py-1 rounded-control border border-rule flex items-center gap-1.5">
                            <Dna size={12} className="text-aubergine" />
                            <span>{post.asvTag}</span>
                          </span>
                        )}
                        {post.channelTag && (
                          <button
                            type="button"
                            onClick={() => setActiveChannel(post.channelTag || null)}
                            className="bg-survey/10 hover:bg-survey/20 text-survey px-2.5 py-1 rounded-control border border-survey/30 font-medium transition-colors"
                          >
                            {post.channelTag}
                          </button>
                        )}
                      </div>

                      {/* Sequence Snippet Card (if present) */}
                      {post.sequenceSnippet && (
                        <div className="bg-[#060F1A] border border-rule-strong rounded-plate p-3 space-y-1.5 font-mono text-[11px]">
                          <div className="flex items-center justify-between text-ink-faint border-b border-rule/60 pb-1">
                            <span className="text-[10px] text-aubergine font-semibold">
                              {post.sequenceSnippet.header}
                            </span>
                            <span className="text-[10px] bg-aubergine/20 text-aubergine px-1.5 py-0.5 rounded-control">
                              {post.sequenceSnippet.divergence}
                            </span>
                          </div>
                          <div className="text-emerald-400 font-mono text-[11px] break-all tracking-wider selection:bg-survey selection:text-white">
                            {post.sequenceSnippet.sequence}
                          </div>
                        </div>
                      )}

                      {/* Telemetry Metric Snapshot Strip */}
                      {post.telemetrySnapshot && post.telemetrySnapshot.length > 0 && (
                        <div className="bg-paper-sunk/70 border border-rule rounded-plate p-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-[11px]">
                          {post.telemetrySnapshot.map((tele) => (
                            <div
                              key={tele.label}
                              className={`bg-paper p-2 rounded-control border ${
                                tele.highlight ? 'border-aubergine/40 shadow-sm' : 'border-rule'
                              }`}
                            >
                              <span className="text-[9px] uppercase tracking-wider text-ink-faint block truncate">
                                {tele.label}
                              </span>
                              <span
                                className={`font-bold text-[12px] block mt-0.5 truncate ${
                                  tele.highlight ? 'text-aubergine' : 'text-ink'
                                }`}
                              >
                                {tele.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-rule bg-paper-sunk/30 px-5 py-2 text-xs text-ink-muted">
                      <div className="flex items-center gap-2">
                        <ThumbsUp size={13} className="text-survey" />
                        <span>
                          {communityMode === 'cloud'
                            ? `${post.endorseCount} endorsements`
                            : post.endorseCount > 0
                              ? `${post.endorseCount} sample reactions`
                              : 'No sample reactions yet'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleComments(post.id)}
                          className="hover:underline"
                        >
                          {post.comments.length} responses
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1 border-t border-rule px-3 py-1.5 text-xs font-medium text-ink-muted sm:px-5">
                      <button
                        type="button"
                        onClick={() => handleToggleEndorse(post.id)}
                        disabled={isCloudActionPending}
                        aria-pressed={post.endorsed}
                        className={`py-2 rounded-control flex items-center justify-center gap-1.5 transition-colors font-medium ${
                          post.endorsed
                            ? 'text-survey bg-survey/15 font-semibold'
                            : 'hover:bg-paper-sunk hover:text-ink'
                        }`}
                      >
                        <ThumbsUp size={14} fill={post.endorsed ? 'currentColor' : 'none'} />
                        <span>Endorse</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleComments(post.id)}
                        className="py-2 rounded-control flex items-center justify-center gap-1.5 hover:bg-paper-sunk hover:text-ink transition-colors"
                      >
                        <MessageSquare size={14} />
                        <span>Discuss</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleBookmark(post.id)}
                        disabled={isCloudActionPending}
                        className={`py-2 rounded-control flex items-center justify-center gap-1.5 transition-colors ${
                          post.bookmarked ? 'text-survey' : 'hover:bg-paper-sunk hover:text-ink'
                        }`}
                      >
                        <Bookmark size={14} fill={post.bookmarked ? 'currentColor' : 'none'} />
                        <span>Save</span>
                      </button>
                    </div>

                    {/* Threaded Discussion (Comments) Section */}
                    {isExpanded && (
                      <div className="border-t border-rule bg-paper-sunk/40 p-5 space-y-4 animate-fadeIn">
                        {/* New Comment Input */}
                        <div className="flex items-start gap-3">
                                      <div className="w-8 h-8 rounded-full bg-survey text-white font-serif font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                            YO
                          </div>
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              maxLength={4000}
                              value={commentInputs[post.id] || ''}
                              disabled={isSavingComment}
                              onChange={(e) =>
                                setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddComment(post.id);
                              }}
                              placeholder="Write a peer review, critique, or observation..."
                              className="w-full bg-paper border border-rule focus:border-survey rounded-control px-3 py-2 text-[12px] text-ink placeholder:text-ink-faint focus:outline-none font-sans"
                            />
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleAddComment(post.id)}
                                disabled={!(commentInputs[post.id] || '').trim() || isSavingComment}
                                className="px-3.5 py-1 bg-survey hover:bg-survey-hover disabled:opacity-40 text-white text-[11px] font-mono rounded-control font-medium transition-colors"
                              >
                                {isSavingComment ? 'Submitting…' : 'Submit Response'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Existing Threaded Comments */}
                        {post.comments.length > 0 && (
                          <div className="space-y-3 pt-2">
                            {post.comments.map((comm) => (
                              <div
                                key={comm.id}
                                className="flex items-start gap-3 text-[12px] group"
                              >
                                <div
                                  className={`w-7 h-7 rounded-full ${comm.avatarBg} text-white font-serif font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5`}
                                >
                                  {comm.avatar}
                                </div>
                                <div className="flex-1 bg-paper border border-rule rounded-plate p-3 space-y-1 shadow-sm">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="font-serif font-medium text-ink">
                                        {comm.author}
                                      </span>
                                      <span className="text-[10px] font-mono text-ink-faint">
                                        {comm.role} • {comm.affiliation}
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-mono text-ink-faint">
                                      {comm.timestamp}
                                    </span>
                                  </div>
                                  <p className="text-[12px] font-sans text-ink leading-relaxed">
                                    {comm.content}
                                  </p>
                                  <div className="flex items-center gap-3 pt-1 text-[10px] font-mono text-ink-faint">
                                    <button
                                      type="button"
                                      onClick={() => handleLikeComment(post.id, comm.id)}
                                      disabled={isCloudActionPending}
                                      className={`hover:text-survey flex items-center gap-1 ${
                                        comm.userLiked ? 'text-survey font-semibold' : ''
                                      }`}
                                    >
                                      <span>Endorse</span>
                                      {comm.likes > 0 && <span>({comm.likes})</span>}
                                    </button>
                                    <span>•</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCommentInputs((prev) => ({
                                          ...prev,
                                          [post.id]: `@${comm.author} `,
                                        }));
                                      }}
                                      className="hover:text-survey"
                                    >
                                      Reply
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </section>

        <aside className="min-w-0 space-y-5 xl:col-span-4">
          <section className="rounded-plate border border-rule bg-paper-raised p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">Research channels</h2>
                <p className="mt-1 text-xs leading-5 text-ink-muted">Filter the feed by a shared topic.</p>
              </div>
              {activeChannel && (
                <button
                  type="button"
                  onClick={() => setActiveChannel(null)}
                  className="text-xs font-medium text-survey hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="space-y-1">
              {Array.from(
                new Set(visiblePosts.flatMap((post) => (post.channelTag ? [post.channelTag] : [])))
              ).map((tag) => {
                const isActive = activeChannel === tag;
                const postCount = visiblePosts.filter((post) => post.channelTag === tag).length;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveChannel(isActive ? null : tag)}
                    aria-pressed={isActive}
                    className={`flex w-full items-center justify-between gap-3 rounded-control px-3 py-2.5 text-left text-sm transition-colors ${
                      isActive
                        ? 'bg-survey/15 text-sky-200'
                        : 'text-ink-muted hover:bg-paper-sunk hover:text-ink'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Tag size={14} className="shrink-0 text-survey" />
                      <span className="truncate">{tag}</span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-ink-faint">{postCount}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-plate border border-rule bg-paper-raised p-5 shadow-sm">
            <h2 className="text-base font-semibold text-ink">Share useful research</h2>
            <p className="mt-1 text-xs leading-5 text-ink-muted">
              Keep dispatches clear and reproducible. Include context that helps others assess the observation.
            </p>
            <ul className="mt-4 space-y-2 text-xs leading-5 text-ink-muted">
              <li>• Add station, depth, and sample identifiers when relevant.</li>
              <li>• Include units, methods, and reference databases.</li>
              <li>• Separate observed results from interpretation.</li>
            </ul>
          </section>

          <section className="rounded-plate border border-rule bg-paper-raised p-5 shadow-sm">
            <h2 className="border-b border-rule pb-3 text-base font-semibold text-ink">
              Reference resources
            </h2>
            <div className="mt-2 space-y-1">
              <a
                href="https://www.ncbi.nlm.nih.gov/genbank/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-control py-2 text-sm text-ink-muted transition-colors hover:text-survey"
              >
                <span>NCBI GenBank</span>
                <ExternalLink size={14} className="shrink-0 text-ink-faint" />
              </a>
              <a
                href="https://www.arb-silva.de/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-control py-2 text-sm text-ink-muted transition-colors hover:text-survey"
              >
                <span>SILVA database</span>
                <ExternalLink size={14} className="shrink-0 text-ink-faint" />
              </a>
              <a
                href="https://taraoceans.sb-roscoff.fr/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-control py-2 text-sm text-ink-muted transition-colors hover:text-survey"
              >
                <span>Tara Oceans</span>
                <ExternalLink size={14} className="shrink-0 text-ink-faint" />
              </a>
              <a
                href="https://www.bco-dmo.org/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-control py-2 text-sm text-ink-muted transition-colors hover:text-survey"
              >
                <span>BCO-DMO data portal</span>
                <ExternalLink size={14} className="shrink-0 text-ink-faint" />
              </a>
            </div>
          </section>
        </aside>
      </main>

      {/* ========================================================
          Community dispatch composer
          ======================================================== */}
      {isComposerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="community-composer-title"
            className="max-h-[90vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-plate border border-rule bg-paper-raised p-5 shadow-floating sm:p-6"
          >
            <div className="flex items-center justify-between border-b border-rule pb-4">
              <div className="flex items-center gap-2">
                <Send size={18} className="text-survey" />
                <h3 id="community-composer-title" className="text-lg font-semibold text-ink">
                  {communityMode === 'cloud' ? 'New shared dispatch' : 'New community dispatch'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                aria-label="Close dispatch form"
                className="text-ink-faint hover:text-ink p-1 rounded-control"
              >
                <X size={18} />
              </button>
            </div>

            {actionError && (
              <div role="alert" className="rounded-control border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
                {actionError}
              </div>
            )}

            <form onSubmit={handleCreatePost} className="space-y-4">
              {/* Category Pills */}
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-ink-faint block mb-1.5 font-semibold">
                  Dispatch Category
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  {DISPATCH_CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setComposerCategory(c.id)}
                      aria-pressed={composerCategory === c.id}
                      className={`p-2 rounded-control border text-center transition-all ${
                        composerCategory === c.id ? `${c.color} font-bold ring-1 ring-survey` : 'border-rule text-ink-muted bg-paper'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">
                  Dispatch Title / Subject
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={composerTitle}
                  onChange={(e) => setComposerTitle(e.target.value)}
                  placeholder="e.g., Cohesive 14-ASV cluster observed in OMZ core at Station G-14..."
                  className="w-full rounded-control border border-rule bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-survey focus:outline-none"
                />
              </div>

              {/* Body Content */}
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">
                  Details
                </label>
                <textarea
                  rows={6}
                  required
                  maxLength={10000}
                  value={composerContent}
                  onChange={(e) => setComposerContent(e.target.value)}
                  placeholder="Detail sample collection protocols, amplification metrics, sequence anomalies, or questions for consortium peer review..."
                  className="w-full resize-y rounded-control border border-rule bg-paper p-3.5 text-sm leading-relaxed text-ink placeholder:text-ink-faint focus:border-survey focus:outline-none"
                />
              </div>

              {/* Associated Tags Grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">
                    Tag Station (Optional)
                  </label>
                  <input
                    maxLength={120}
                    value={composerStation}
                    onChange={(e) => setComposerStation(e.target.value)}
                    placeholder="e.g. Station G-14"
                    className="w-full rounded-control border border-rule bg-paper px-2.5 py-2 text-sm text-ink focus:border-survey focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">
                    Tag ASV / Cluster (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    value={composerAsv}
                    onChange={(e) => setComposerAsv(e.target.value)}
                    placeholder="e.g. ASV_IND_04928"
                    className="w-full rounded-control border border-rule bg-paper px-2.5 py-2 text-sm text-ink focus:border-survey focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">
                    Channel / Topic Hashtag
                  </label>
                  <input
                    type="text"
                    maxLength={80}
                    value={composerTag}
                    onChange={(e) => setComposerTag(e.target.value)}
                    placeholder="e.g. #NovelTaxa"
                    className="w-full rounded-control border border-rule bg-paper px-2.5 py-2 text-sm text-ink focus:border-survey focus:outline-none"
                  />
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex flex-col gap-3 border-t border-rule pt-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-ink-faint">
                  {communityMode === 'cloud'
                    ? 'Published posts are visible to signed-in researchers.'
                    : 'Local preview only; not saved or shared.'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsComposerOpen(false)}
                    disabled={isSavingPost}
                    className="rounded-control border border-rule px-4 py-2 text-sm text-ink transition-colors hover:bg-paper-sunk"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPost}
                    className="flex items-center gap-2 rounded-control bg-survey px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-survey-hover"
                  >
                    <Send size={13} />
                    <span>
                      {isSavingPost
                        ? 'Publishing…'
                        : communityMode === 'cloud'
                          ? 'Publish dispatch'
                          : 'Add to preview'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};