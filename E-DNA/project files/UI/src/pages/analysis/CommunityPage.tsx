// ========================================================
// DEEPDRISHTI RESEARCHER COMMUNITY & DISPATCH HUB
// Top-tier academic social collaboration platform for oceanographers,
// molecular ecologists, and taxonomists. Designed with high-density
// visual hierarchy, rich data previews, threaded discussions,
// and real-time expedition telemetric dispatching.
// ========================================================

import React, { useState } from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import {
  MessageSquare,
  ThumbsUp,
  Share2,
  Bookmark,
  Sparkles,
  MapPin,
  Dna,
  Send,
  Search,
  Filter,
  CheckCircle2,
  Users,
  Tag,
  Paperclip,
  Activity,
  Compass,
  FileText,
  Clock,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Globe,
  Image as ImageIcon,
  Award,
  ExternalLink,
  X,
  Flame,
  ShieldCheck,
  Radio,
  Eye,
} from 'lucide-react';

interface Comment {
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

interface Post {
  id: string;
  author: string;
  role: string;
  affiliation: string;
  avatar: string;
  avatarBg: string;
  timestamp: string;
  category: 'discovery' | 'field_log' | 'taxa_query' | 'protocol';
  title: string;
  content: string;
  stationTag?: string;
  asvTag?: string;
  channelTag?: string;
  readsCount: number;
  endorsed: boolean;
  endorseCount: number;
  bookmarked: boolean;
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

export const CommunityPage: React.FC = () => {
  const { expedition, siteProfiles, kpis } = useAnalysis();

  // Active filter tab & search
  const [activeTab, setActiveTab] = useState<'all' | 'discovery' | 'field_log' | 'taxa_query' | 'protocol'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChannel, setActiveChannel] = useState<string | null>(null);

  // Modal / Composer state
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerTitle, setComposerTitle] = useState('');
  const [composerContent, setComposerContent] = useState('');
  const [composerCategory, setComposerCategory] = useState<'discovery' | 'field_log' | 'taxa_query' | 'protocol'>('discovery');
  const [composerStation, setComposerStation] = useState<string>('');
  const [composerAsv, setComposerAsv] = useState('');
  const [composerTag, setComposerTag] = useState('');

  // Toast notification for actions (e.g., share)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
      stationTag: siteProfiles[0]?.site || 'Station G-14 (OMZ Core)',
      asvTag: 'ASV_IND_04928',
      channelTag: '#NovelSequenceVariants',
      readsCount: 284,
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
      stationTag: siteProfiles[1]?.site || 'Station K-02',
      channelTag: '#SterivexQA',
      readsCount: 162,
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
      stationTag: siteProfiles[2]?.site || 'Station G-08',
      channelTag: '#ThermoclineGradients',
      readsCount: 310,
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

  // Stories / Live Cruise Reels
  const stories = [
    {
      id: 's-user',
      isCreate: true,
      author: 'You',
      station: 'Draft Field Note',
      tag: '+ Create Dispatch',
      gradient: 'from-[#0A1A2B] via-[#0E2840] to-[#164164]',
    },
    {
      id: 's-1',
      author: 'Dr. Elena Rostova',
      station: 'Station G-14 (850m)',
      tag: '14 Divergent ASVs',
      gradient: 'from-[#193245] to-[#254B68]',
      avatar: 'ER',
      avatarBg: 'bg-[#1C4E75]',
    },
    {
      id: 's-2',
      author: 'Prof. Kenji Sato',
      station: 'Molecular Lab',
      tag: 'Sterivex QA Update',
      gradient: 'from-[#2D2338] to-[#453258]',
      avatar: 'KS',
      avatarBg: 'bg-[#C2542D]',
    },
    {
      id: 's-3',
      author: 'Dr. Marcus Vance',
      station: 'Station G-08 Cast',
      tag: 'Thermocline Spike',
      gradient: 'from-[#163532] to-[#22504B]',
      avatar: 'MV',
      avatarBg: 'bg-[#D08A2E]',
    },
    {
      id: 's-4',
      author: 'Dr. Priya Nair',
      station: 'NIO Goa Lab',
      tag: 'Murray Ridge FASTQ',
      gradient: 'from-[#3A2A1A] to-[#5C432A]',
      avatar: 'PN',
      avatarBg: 'bg-[#2F8F7A]',
    },
  ];

  // Handle post creation
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerContent.trim() && !composerTitle.trim()) return;

    const newPost: Post = {
      id: `post-${Date.now()}`,
      author: 'Dr. Asmit V. (You)',
      role: 'Lead Taxonomist & Bioinformatician',
      affiliation: 'DeepDrishti Marine Consortium / NIO',
      avatar: 'AV',
      avatarBg: 'bg-survey',
      timestamp: 'Just now',
      category: composerCategory,
      title: composerTitle.trim() || 'Expedition Dispatch & Research Insight',
      content: composerContent.trim(),
      stationTag: composerStation || undefined,
      asvTag: composerAsv || undefined,
      channelTag: composerTag.startsWith('#') ? composerTag : composerTag ? `#${composerTag}` : '#ArabianSeaExpedition',
      readsCount: 1,
      endorsed: false,
      endorseCount: 0,
      bookmarked: false,
      comments: [],
    };

    setPosts([newPost, ...posts]);
    setComposerTitle('');
    setComposerContent('');
    setComposerStation('');
    setComposerAsv('');
    setComposerTag('');
    setIsComposerOpen(false);
    showToast('Your dispatch has been published to the Consortium Feed.');
  };

  // Toggle Endorse (Like)
  const handleToggleEndorse = (postId: string) => {
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

  // Toggle Bookmark
  const handleToggleBookmark = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const next = !post.bookmarked;
          showToast(next ? 'Dispatch saved to your bookmarks' : 'Dispatch removed from bookmarks');
          return { ...post, bookmarked: next };
        }
        return post;
      })
    );
  };

  // Toggle Comments
  const handleToggleComments = (postId: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  // Add Comment
  const handleAddComment = (postId: string) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;

    const newComment: Comment = {
      id: `c-${Date.now()}`,
      author: 'Dr. Asmit V.',
      role: 'Lead Taxonomist',
      affiliation: 'DeepDrishti Consortium',
      avatar: 'AV',
      avatarBg: 'bg-survey',
      timestamp: 'Just now',
      content: text,
      likes: 0,
    };

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
    showToast('Comment posted successfully');
  };

  // Like a comment
  const handleLikeComment = (postId: string, commentId: string) => {
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
  const filteredPosts = posts.filter((post) => {
    if (activeTab !== 'all' && post.category !== activeTab) return false;
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0B1726] border border-survey text-white px-4 py-2.5 rounded-plate shadow-floating flex items-center gap-2 font-mono text-[12px] animate-fadeIn">
          <CheckCircle2 size={16} className="text-survey" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner / Expedition Header */}
      <div className="relative rounded-plate border border-rule overflow-hidden bg-gradient-to-r from-[#071320] via-[#0B1E32] to-[#122E48] p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.12em] bg-survey/20 text-survey px-2 py-0.5 rounded-control border border-survey/30 font-semibold">
                Marine Academic Network
              </span>
              <span className="text-[11px] font-mono text-ink-faint flex items-center gap-1.5">
                <Globe size={12} className="text-survey" />
                <span>Consortium Node: IO-942</span>
              </span>
            </div>
            <h1 className="font-serif text-[28px] font-medium text-ink leading-tight">
              Researcher Exchange & Cruise Dispatches
            </h1>
            <p className="text-[13px] text-ink-muted max-w-3xl leading-relaxed">
              Real-time scientific communication channel for oceanographers, taxonomists, and molecular biologists participating in{' '}
              <strong className="text-ink font-semibold">{expedition.name}</strong> ({expedition.region}).
            </p>
          </div>

          {/* Quick Actions / Status Pill */}
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-paper-raised/80 border border-rule rounded-control text-[12px] font-mono text-ink">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>4 Researchers Active Now</span>
            </div>
            <button
              type="button"
              onClick={() => setIsComposerOpen(true)}
              className="px-4 py-2 bg-survey hover:bg-survey-hover text-white text-[12px] font-mono font-medium rounded-control flex items-center gap-2 shadow-sm transition-all"
            >
              <Send size={13} />
              <span>Publish Dispatch</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Cruise Dispatches / Stories Reel */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-ink-faint uppercase tracking-wider px-1">
          <span>Live Field Telemetry & Dispatches</span>
          <span>{stories.length} Broadcasts</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {stories.map((story) => {
            if (story.isCreate) {
              return (
                <div
                  key={story.id}
                  onClick={() => setIsComposerOpen(true)}
                  className="group relative h-40 rounded-plate border border-dashed border-rule-strong hover:border-survey bg-paper-raised/60 hover:bg-paper-raised transition-all cursor-pointer flex flex-col items-center justify-center p-3 text-center overflow-hidden"
                >
                  <div className="w-10 h-10 rounded-full bg-survey/15 border border-survey/40 text-survey flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Send size={16} />
                  </div>
                  <span className="font-serif font-medium text-[13px] text-ink block leading-tight">
                    New Dispatch
                  </span>
                  <span className="text-[10px] font-mono text-ink-muted mt-1">
                    Share telemetry or query
                  </span>
                </div>
              );
            }

            return (
              <div
                key={story.id}
                onClick={() => {
                  setSearchQuery(story.author);
                  showToast(`Filtered feed by ${story.author}`);
                }}
                className={`relative h-40 rounded-plate border border-rule hover:border-survey overflow-hidden cursor-pointer shadow-sm group transition-all bg-gradient-to-br ${story.gradient} p-3 flex flex-col justify-between`}
              >
                {/* Author Avatar Badge */}
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-full ${story.avatarBg} text-white font-serif font-bold text-[11px] flex items-center justify-center border-2 border-white/20 shadow-sm`}>
                    {story.avatar}
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>

                {/* Story Info */}
                <div className="space-y-0.5">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-white/70 block truncate">
                    {story.station}
                  </span>
                  <p className="font-serif font-medium text-[13px] text-white leading-tight line-clamp-2">
                    {story.tag}
                  </p>
                  <span className="text-[10px] font-mono text-white/60 block truncate">
                    {story.author}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main 3-Column Workstation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================
            LEFT COLUMN: Researcher Profile & Research Channels
            ======================================================== */}
        <div className="lg:col-span-3 space-y-5">
          {/* Researcher Profile Card */}
          <div className="bg-paper-raised border border-rule rounded-plate overflow-hidden shadow-sm">
            {/* Header banner */}
            <div className="h-16 bg-gradient-to-r from-[#0C2438] via-[#143B5A] to-[#1E527B]" />
            <div className="px-4 pb-4 -mt-8 space-y-3">
              <div className="flex items-end justify-between">
                <div className="w-14 h-14 rounded-full bg-survey text-white font-serif font-bold text-[18px] flex items-center justify-center border-4 border-paper-raised shadow-md">
                  AV
                </div>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 px-2 py-0.5 rounded-control font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Verified Principal
                </span>
              </div>

              <div>
                <h3 className="font-serif font-medium text-[16px] text-ink leading-tight flex items-center gap-1.5">
                  <span>Dr. Asmit V.</span>
                  <CheckCircle2 size={15} className="text-survey" />
                </h3>
                <p className="text-[11px] font-mono text-ink-muted mt-0.5">
                  Principal Taxonomist & Molecular Ecologist
                </p>
                <p className="text-[11px] text-ink-faint font-sans mt-0.5">
                  NIO Goa / DeepDrishti Marine Consortium
                </p>
              </div>

              {/* Research Metrics Strip */}
              <div className="grid grid-cols-3 gap-1 pt-2 border-t border-rule text-center font-mono text-[11px]">
                <div className="bg-paper-sunk/60 p-2 rounded-control">
                  <span className="text-[9px] text-ink-faint block uppercase">ASVs</span>
                  <span className="font-bold text-ink text-[13px]">{kpis.totalAsvs}</span>
                </div>
                <div className="bg-paper-sunk/60 p-2 rounded-control">
                  <span className="text-[9px] text-ink-faint block uppercase">Stations</span>
                  <span className="font-bold text-ink text-[13px]">{siteProfiles.length}</span>
                </div>
                <div className="bg-paper-sunk/60 p-2 rounded-control">
                  <span className="text-[9px] text-ink-faint block uppercase">Clusters</span>
                  <span className="font-bold text-aubergine text-[13px]">{expedition.clusters.length}</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-1 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(true)}
                  className="w-full py-2 bg-survey hover:bg-survey-hover text-white rounded-control font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Send size={12} />
                  <span>Create Field Dispatch</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const myPosts = posts.filter((p) => p.author.includes('Asmit'));
                    if (myPosts.length > 0) {
                      setSearchQuery('Asmit');
                    } else {
                      showToast('You have not published any dispatches yet.');
                    }
                  }}
                  className="w-full py-1.5 bg-paper hover:bg-paper-sunk border border-rule text-ink rounded-control font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <FileText size={12} className="text-ink-muted" />
                  <span>My Dispatches ({posts.filter((p) => p.author.includes('Asmit')).length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Research Channels & Topics */}
          <div className="bg-paper-raised border border-rule rounded-plate p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-rule pb-2">
              <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint font-semibold flex items-center gap-1.5">
                <Tag size={13} className="text-survey" />
                <span>Expedition Channels</span>
              </span>
              {activeChannel && (
                <button
                  type="button"
                  onClick={() => setActiveChannel(null)}
                  className="text-[10px] font-mono text-survey hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>

            <div className="space-y-1 text-[12px] font-mono">
              {[
                { tag: '#ArabianSeaExpedition', name: 'Arabian Sea Cruise Transect', count: 28, icon: '🌊' },
                { tag: '#NovelSequenceVariants', name: 'Novel ASV Lineage Flags', count: 19, icon: '🧬' },
                { tag: '#SterivexQA', name: 'Filtration & Bench QA', count: 14, icon: '🔬' },
                { tag: '#ThermoclineGradients', name: 'CTD Sonde Telemetry', count: 11, icon: '📊' },
                { tag: '#TaxonomicConsensus', name: 'SILVA / NCBI Inquiries', count: 8, icon: '🏛️' },
              ].map((item) => {
                const isActive = activeChannel === item.tag;
                return (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => setActiveChannel(isActive ? null : item.tag)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-control text-left transition-all ${
                      isActive
                        ? 'bg-survey text-white font-medium shadow-sm'
                        : 'text-ink-muted hover:text-ink hover:bg-paper-sunk'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[13px]">{item.icon}</span>
                      <span className="truncate">{item.tag}</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-control ${isActive ? 'bg-white/20 text-white' : 'bg-paper-sunk text-ink-faint'}`}>
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Consortium Telemetry */}
          <div className="bg-paper-raised border border-rule rounded-plate p-4 space-y-2.5 text-[12px] font-mono text-ink-muted">
            <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint font-semibold block border-b border-rule pb-2">
              Active Cruise Metadata
            </span>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span>Expedition:</span>
                <span className="text-ink font-semibold">{expedition.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Reads:</span>
                <span className="text-ink">{kpis.totalReads.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Shannon Diversity:</span>
                <span className="text-ink">{kpis.shannonDiversity} H'</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-emerald-500 font-medium">Telemetry Synchronized</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            CENTER COLUMN: Main Dispatch Feed
            ======================================================== */}
        <div className="lg:col-span-6 space-y-5">
          {/* Top Create Post Bar (Facebook / LinkedIn Style) */}
          <div className="bg-paper-raised border border-rule rounded-plate p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-survey text-white font-serif font-bold text-[14px] flex items-center justify-center flex-shrink-0 shadow-sm">
                AV
              </div>
              <button
                type="button"
                onClick={() => setIsComposerOpen(true)}
                className="flex-1 bg-paper hover:bg-paper-sunk border border-rule rounded-full px-4 py-2.5 text-left text-[13px] text-ink-faint hover:text-ink transition-colors font-sans flex items-center justify-between"
              >
                <span>Share a field observation, ask the consortium, or log an anomaly, Dr. Asmit...</span>
                <Send size={14} className="text-survey flex-shrink-0 ml-2" />
              </button>
            </div>

            {/* Quick action bar */}
            <div className="grid grid-cols-4 gap-1 pt-2 border-t border-rule text-[12px] font-mono text-ink-muted">
              <button
                type="button"
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
          <div className="bg-paper-raised border border-rule rounded-plate p-2.5 flex flex-wrap items-center justify-between gap-3 text-[12px] font-mono shadow-sm">
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: 'all', label: 'All Updates' },
                { id: 'discovery', label: 'Discoveries' },
                { id: 'field_log', label: 'Field Logs' },
                { id: 'taxa_query', label: 'Taxa Queries' },
                { id: 'protocol', label: 'Protocols' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-control text-[11px] transition-all ${
                    activeTab === tab.id
                      ? 'bg-survey text-white font-medium shadow-sm'
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
                placeholder="Search dispatches..."
                className="w-full bg-paper border border-rule focus:border-survey rounded-control pl-8 pr-2 py-1 text-[11px] text-ink placeholder:text-ink-faint focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Posts List */}
          <div className="space-y-4">
            {filteredPosts.length === 0 ? (
              <div className="bg-paper-raised border border-rule rounded-plate p-10 text-center space-y-3">
                <MessageSquare size={32} className="mx-auto text-ink-faint" />
                <h4 className="font-serif font-medium text-[17px] text-ink">
                  No dispatches found in this category
                </h4>
                <p className="text-[12px] font-mono text-ink-muted max-w-md mx-auto">
                  Try adjusting your search query or clearing the active channel filter.
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
                              <CheckCircle2 size={14} className="text-survey flex-shrink-0" />
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
                              <span>•</span>
                              <Globe size={11} title="Public Consortium Broadcast" />
                              <span>•</span>
                              <Eye size={11} />
                              <span>{post.readsCount} reads</span>
                            </div>
                          </div>
                        </div>

                        {/* Top right actions */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleBookmark(post.id)}
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

                    {/* Social Proof Bar */}
                    <div className="px-5 py-2 border-t border-rule bg-paper-sunk/30 flex items-center justify-between text-[11px] font-mono text-ink-muted">
                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-1">
                          <span className="w-4 h-4 rounded-full bg-survey text-white flex items-center justify-center text-[9px]">👍</span>
                          <span className="w-4 h-4 rounded-full bg-aubergine text-white flex items-center justify-center text-[9px]">🧬</span>
                        </div>
                        <span>
                          {post.endorseCount > 0
                            ? `${post.endorseCount} researchers endorsed this`
                            : 'Be the first to endorse'}
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

                    {/* Action Bar (Facebook / LinkedIn style 4-button strip) */}
                    <div className="px-5 py-1.5 border-t border-rule grid grid-cols-4 gap-1 text-[12px] font-mono text-ink-muted">
                      <button
                        type="button"
                        onClick={() => handleToggleEndorse(post.id)}
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
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          showToast('Link to dispatch copied to clipboard');
                        }}
                        className="py-2 rounded-control flex items-center justify-center gap-1.5 hover:bg-paper-sunk hover:text-ink transition-colors"
                      >
                        <Share2 size={14} />
                        <span>Share</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleBookmark(post.id)}
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
                            AV
                          </div>
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              value={commentInputs[post.id] || ''}
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
                                disabled={!(commentInputs[post.id] || '').trim()}
                                className="px-3.5 py-1 bg-survey hover:bg-survey-hover disabled:opacity-40 text-white text-[11px] font-mono rounded-control font-medium transition-colors"
                              >
                                Submit Response
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
        </div>

        {/* ========================================================
            RIGHT COLUMN: Active Scientists & Cruise Resources
            ======================================================== */}
        <div className="lg:col-span-3 space-y-5">
          {/* Active Researchers in Field */}
          <div className="bg-paper-raised border border-rule rounded-plate p-4 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-rule pb-2">
              <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint font-semibold flex items-center gap-1.5">
                <Users size={13} className="text-survey" />
                <span>Consortium Scientists</span>
              </span>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 px-1.5 py-0.5 rounded-control font-semibold">
                4 Online
              </span>
            </div>

            <div className="space-y-3 text-[12px]">
              {[
                {
                  name: 'Dr. Elena Rostova',
                  role: 'Bioinformatics Lead',
                  org: 'Scripps / Tara Oceans',
                  status: 'Reviewing CLUST-03',
                  avatar: 'ER',
                  avatarBg: 'bg-[#1C4E75]',
                  online: true,
                },
                {
                  name: 'Prof. Kenji Sato',
                  role: 'Chief Microbiologist',
                  org: 'JAMSTEC Lab',
                  status: 'In Laboratory',
                  avatar: 'KS',
                  avatarBg: 'bg-[#C2542D]',
                  online: true,
                },
                {
                  name: 'Dr. Marcus Vance',
                  role: 'Hydrographic Fleet',
                  org: 'NOAA Ocean Exploration',
                  status: 'At CTD Rosette',
                  avatar: 'MV',
                  avatarBg: 'bg-[#D08A2E]',
                  online: true,
                },
                {
                  name: 'Dr. Priya Nair',
                  role: 'Molecular Ecologist',
                  org: 'NIO Goa Marine Genomics',
                  status: 'Aligning FASTQ',
                  avatar: 'PN',
                  avatarBg: 'bg-[#2F8F7A]',
                  online: true,
                },
                {
                  name: 'Cmdr. Sarah Jenkins',
                  role: 'Naval Operations',
                  org: 'Tactical Surveillance Desk',
                  status: 'Stationed Port 5175',
                  avatar: 'SJ',
                  avatarBg: 'bg-[#4C5A63]',
                  online: false,
                },
              ].map((res) => (
                <div key={res.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="relative flex-shrink-0">
                      <div
                        className={`w-8 h-8 rounded-full ${res.avatarBg} text-white font-serif text-[11px] font-bold flex items-center justify-center border border-white/20`}
                      >
                        {res.avatar}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-paper-raised ${
                          res.online ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                        }`}
                      />
                    </div>
                    <div className="overflow-hidden">
                      <span className="font-serif font-medium text-ink block text-[13px] leading-tight truncate">
                        {res.name}
                      </span>
                      <span className="text-[10px] font-mono text-ink-muted block truncate">
                        {res.org}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setComposerTitle(`Query for ${res.name}: `);
                      setIsComposerOpen(true);
                    }}
                    className="text-[10px] font-mono text-survey hover:underline flex-shrink-0"
                  >
                    Query
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Trending Cruise Research Topics */}
          <div className="bg-paper-raised border border-rule rounded-plate p-4 space-y-3 shadow-sm">
            <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint font-semibold block border-b border-rule pb-2 flex items-center gap-1.5">
              <Flame size={13} className="text-warning" />
              <span>Trending Cruise Topics</span>
            </span>
            <div className="space-y-2 text-[12px] font-mono">
              {[
                { tag: '#OxygenMinimumZone', posts: '18 dispatches', rank: '1' },
                { tag: '#CandidateRhodophyta', posts: '14 dispatches', rank: '2' },
                { tag: '#SterivexRecovery', posts: '9 dispatches', rank: '3' },
                { tag: '#MurrayRidgeDeepCast', posts: '6 dispatches', rank: '4' },
              ].map((t) => (
                <div
                  key={t.tag}
                  onClick={() => setActiveChannel(t.tag)}
                  className="flex items-center justify-between p-1.5 rounded-control hover:bg-paper-sunk cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-ink-faint">#{t.rank}</span>
                    <span className="text-ink font-medium">{t.tag}</span>
                  </div>
                  <span className="text-[10px] text-ink-faint">{t.posts}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Academic Repositories & External Databases */}
          <div className="bg-paper-raised border border-rule rounded-plate p-4 space-y-2.5 text-[12px] font-mono shadow-sm">
            <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint font-semibold block border-b border-rule pb-2">
              Reference Data Repositories
            </span>
            <div className="space-y-1.5 text-[11px]">
              <a
                href="https://www.ncbi.nlm.nih.gov/genbank/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between text-ink hover:text-survey py-1 border-b border-rule/50 transition-colors"
              >
                <span>NCBI GenBank Barcodes</span>
                <ExternalLink size={11} className="text-ink-faint" />
              </a>
              <a
                href="https://www.arb-silva.de/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between text-ink hover:text-survey py-1 border-b border-rule/50 transition-colors"
              >
                <span>SILVA 138.1 SSU Archive</span>
                <ExternalLink size={11} className="text-ink-faint" />
              </a>
              <a
                href="https://taraoceans.sb-roscoff.fr/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between text-ink hover:text-survey py-1 border-b border-rule/50 transition-colors"
              >
                <span>Tara Oceans Global Dataset</span>
                <ExternalLink size={11} className="text-ink-faint" />
              </a>
              <a
                href="https://www.bco-dmo.org/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between text-ink hover:text-survey py-1 transition-colors"
              >
                <span>BCO-DMO Ocean Telemetry</span>
                <ExternalLink size={11} className="text-ink-faint" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          FULL MODAL COMPOSER: Top-Level Professional Post Creator
          ======================================================== */}
      {isComposerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-paper-raised border border-rule rounded-plate shadow-floating max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <div className="flex items-center gap-2">
                <Send size={18} className="text-survey" />
                <h3 className="font-serif font-medium text-[18px] text-ink">
                  Publish Consortium Dispatch
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="text-ink-faint hover:text-ink p-1 rounded-control"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              {/* Category Pills */}
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-ink-faint block mb-1.5 font-semibold">
                  Dispatch Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                  {[
                    { id: 'discovery', label: 'Discovery', color: 'border-aubergine text-aubergine bg-aubergine/10' },
                    { id: 'field_log', label: 'Cruise Field Log', color: 'border-survey text-survey bg-survey/10' },
                    { id: 'taxa_query', label: 'Taxa Verification', color: 'border-biological text-biological bg-biological/10' },
                    { id: 'protocol', label: 'Lab Protocol', color: 'border-warning text-warning bg-warning/10' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setComposerCategory(c.id as any)}
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
                <label className="text-[11px] font-mono uppercase tracking-wider text-ink-faint block mb-1 font-semibold">
                  Dispatch Title / Subject
                </label>
                <input
                  type="text"
                  required
                  value={composerTitle}
                  onChange={(e) => setComposerTitle(e.target.value)}
                  placeholder="e.g., Cohesive 14-ASV cluster observed in OMZ core at Station G-14..."
                  className="w-full bg-paper border border-rule focus:border-survey rounded-control px-3.5 py-2 text-[13px] font-serif text-ink placeholder:text-ink-faint focus:outline-none"
                />
              </div>

              {/* Body Content */}
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-ink-faint block mb-1 font-semibold">
                  Detailed Field Observation & Findings
                </label>
                <textarea
                  rows={6}
                  required
                  value={composerContent}
                  onChange={(e) => setComposerContent(e.target.value)}
                  placeholder="Detail sample collection protocols, amplification metrics, sequence anomalies, or questions for consortium peer review..."
                  className="w-full bg-paper border border-rule focus:border-survey rounded-control p-3.5 text-[13px] font-sans text-ink placeholder:text-ink-faint focus:outline-none leading-relaxed resize-none"
                />
              </div>

              {/* Associated Tags Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] font-mono">
                <div>
                  <label className="text-ink-faint uppercase text-[10px] block mb-1">
                    Tag Station (Optional)
                  </label>
                  <select
                    value={composerStation}
                    onChange={(e) => setComposerStation(e.target.value)}
                    className="w-full bg-paper border border-rule text-ink py-1.5 px-2.5 rounded-control focus:border-survey focus:outline-none"
                  >
                    <option value="">None (Cruise General)</option>
                    {siteProfiles.slice(0, 15).map((s) => (
                      <option key={s.site} value={s.site}>
                        {s.site}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-ink-faint uppercase text-[10px] block mb-1">
                    Tag ASV / Cluster (Optional)
                  </label>
                  <input
                    type="text"
                    value={composerAsv}
                    onChange={(e) => setComposerAsv(e.target.value)}
                    placeholder="e.g. ASV_IND_04928"
                    className="w-full bg-paper border border-rule text-ink py-1.5 px-2.5 rounded-control focus:border-survey focus:outline-none"
                  >
                  </input>
                </div>

                <div>
                  <label className="text-ink-faint uppercase text-[10px] block mb-1">
                    Channel / Topic Hashtag
                  </label>
                  <input
                    type="text"
                    value={composerTag}
                    onChange={(e) => setComposerTag(e.target.value)}
                    placeholder="e.g. #NovelTaxa"
                    className="w-full bg-paper border border-rule text-ink py-1.5 px-2.5 rounded-control focus:border-survey focus:outline-none"
                  />
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-rule">
                <span className="text-[11px] font-mono text-ink-faint">
                  Broadcasts to all {expedition.region} consortium nodes
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsComposerOpen(false)}
                    className="px-4 py-2 border border-rule hover:bg-paper-sunk text-ink rounded-control font-mono text-[12px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-survey hover:bg-survey-hover text-white rounded-control font-mono text-[12px] font-medium flex items-center gap-2 shadow-sm"
                  >
                    <Send size={13} />
                    <span>Publish Dispatch</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};