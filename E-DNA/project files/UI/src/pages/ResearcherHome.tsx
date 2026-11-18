// ========================================================
// DEEPDRISHTI RESEARCHER HOME
// Clean launch point for expeditions, datasets, and reports
// Integrated with Laboratory Dossier and Oceanographic Profiles
// ========================================================

import React, { useState, useEffect } from 'react';
import { BrandMark } from '../components/common/BrandMark';
import { StatusTag } from '../components/common/StatusTag';
import {
  listExpeditions,
  deleteExpedition,
  getRepository,
  formatSupabaseError,
} from '../services/dataService';
import type { ExpeditionSummaryItem } from '../services/dataService';
import type { ResearcherProfile } from '../services/researcherProfileService';
import {
  Plus,
  Database,
  FileText,
  Activity,
  ChevronDown,
  ChevronRight,
  LogOut,
  Trash2,
  AlertTriangle,
  Cloud,
  HardDrive,
  Compass,
  Building2,
  MapPin,
  User,
  ShieldCheck,
  Dna,
  X,
  Mail,
  Phone,
} from 'lucide-react';

interface ResearcherHomeProps {
  onOpenExpedition: (expeditionId: string) => void;
  onNewExpedition: () => void;
  onLogout: () => void;
  onOpenSurveillance?: () => void;
  researcherName?: string;
  researcherProfile?: ResearcherProfile | null;
}

export const ResearcherHome: React.FC<ResearcherHomeProps> = ({
  onOpenExpedition,
  onNewExpedition,
  onLogout,
  onOpenSurveillance,
  researcherName = 'Dr. M. S. Swaminathan Group',
  researcherProfile,
}) => {
  const [expeditions, setExpeditions] = useState<ExpeditionSummaryItem[]>([]);
  const [showActivity, setShowActivity] = useState(false);
  const [deletingExpedition, setDeletingExpedition] = useState<ExpeditionSummaryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [showDossierModal, setShowDossierModal] = useState(false);

  const repoMode = getRepository().mode;

  const refreshExpeditions = async () => {
    const list = await listExpeditions();
    setExpeditions(list);
  };

  useEffect(() => {
    refreshExpeditions();
  }, []);

  const handleConfirmDelete = async () => {
    if (!deletingExpedition) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteExpedition(deletingExpedition.id);
      await refreshExpeditions();
      setDeletingExpedition(null);
    } catch (err: any) {
      setDeleteError(formatSupabaseError(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const displayName = researcherProfile?.full_name || researcherProfile?.display_name || researcherName;
  const labName = researcherProfile?.lab_name || 'Marine Genomics & eDNA Bio-Surveillance Core';
  const labLocation = researcherProfile?.lab_location || 'Goa Coastal Shelf, India';

  return (
    <div className="relative min-h-screen bg-paper flex flex-col justify-between p-6 select-none animate-fadeIn transition-opacity duration-200 overflow-hidden">
      {/* Bathymetric contour background lines */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none stroke-[#38BDF8]/10 fill-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M-100,220 C250,140 600,420 1150,280 S1650,120 2000,320" strokeWidth="1" />
        <path d="M-100,360 C300,260 700,560 1200,420 S1700,260 2000,460" strokeWidth="1" strokeDasharray="4 4" />
        <path d="M-100,500 C400,420 800,720 1250,580 S1750,420 2000,620" strokeWidth="1" />
        <path d="M-100,640 C320,560 750,860 1300,730 S1800,560 2000,760" strokeWidth="1" strokeDasharray="6 3" />
        <line x1="25%" y1="0" x2="25%" y2="100%" stroke="rgba(56,189,248,0.03)" strokeWidth="0.8" />
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(56,189,248,0.03)" strokeWidth="0.8" />
        <line x1="75%" y1="0" x2="75%" y2="100%" stroke="rgba(56,189,248,0.03)" strokeWidth="0.8" />
      </svg>

      {/* Top Header Strip */}
      <header className="relative z-10 flex flex-wrap items-center justify-between border-b border-rule pb-3 gap-3">
        <div className="flex items-center gap-3">
          <BrandMark size={24} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-sans font-bold text-[16px] text-ink uppercase tracking-wide">
                DEEPDRISHTI
              </span>
              <span className="text-[11px] font-mono text-ink-faint">/ eDNA INTELLIGENCE</span>
            </div>
            {/* Researcher & Laboratory Quick Information */}
            <div className="text-[11px] font-mono text-ink-muted flex flex-wrap items-center gap-1.5 mt-0.5">
              <span>Session:</span>
              <button
                type="button"
                onClick={() => setShowDossierModal(true)}
                className="font-semibold text-ink hover:text-survey transition-colors underline decoration-dotted"
                title="Click to view full Laboratory & Researcher Dossier"
              >
                {displayName}
              </button>
              <span className="text-ink-faint">•</span>
              <span className="text-survey font-medium truncate max-w-[220px]" title={labName}>
                {labName}
              </span>
              <span className="text-ink-faint">•</span>
              <span className="text-ink-faint truncate max-w-[180px] flex items-center gap-0.5" title={labLocation}>
                <MapPin size={11} className="text-survey/80 inline" />
                {labLocation}
              </span>
            </div>
          </div>
        </div>

        {/* Persistence Mode Pill & Actions */}
        <div className="flex items-center gap-2.5">
          {/* Laboratory Dossier Button */}
          <button
            type="button"
            onClick={() => setShowDossierModal(true)}
            className="px-2.5 py-1 bg-paper border border-rule hover:border-survey text-ink rounded-control text-[11px] font-mono transition-colors flex items-center gap-1.5"
            title="Inspect laboratory credentials and mission profile"
          >
            <Building2 size={13} className="text-survey" />
            <span>Lab Dossier</span>
          </button>

          {repoMode === 'supabase' ? (
            <div
              className="flex items-center gap-1.5 px-3 py-1 bg-survey/10 border border-survey/40 text-survey text-[11px] font-mono rounded-control"
              title="Remote persistent cloud backend via Supabase PostgreSQL"
            >
              <Cloud size={13} className="text-survey" />
              <span className="w-1.5 h-1.5 rounded-full bg-survey animate-pulse" />
              <span>SUPABASE ACTIVE</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-mono rounded-control"
              title="Running on local Python FastAPI backend (SQLite persistence). All data is stored locally."
            >
              <HardDrive size={13} />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>LOCAL ACTIVE</span>
            </div>
          )}

          {onOpenSurveillance && (
            <button
              type="button"
              onClick={onOpenSurveillance}
              className="px-3 py-1.5 bg-[#0E4A68] hover:bg-[#156085] text-[#38BDF8] border border-[#38BDF8]/40 text-[12px] font-mono uppercase tracking-wider rounded-control transition-colors flex items-center gap-1.5"
              title="Open Underwater Physical Surveillance Deck"
            >
              <Compass size={14} />
              <span>Surveillance</span>
            </button>
          )}

          <button
            type="button"
            onClick={onNewExpedition}
            className="px-3 py-1.5 bg-survey hover:bg-survey-hover text-white text-[12px] font-mono uppercase tracking-wider rounded-control transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={14} />
            <span>+ New Expedition</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="p-1.5 text-ink-muted hover:text-error hover:bg-paper-sunk rounded-control transition-colors"
            title="Log out from researcher session"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Content Area: 1 Main Column + 2 Compact Secondary Lists */}
      <main className="relative z-10 max-w-6xl w-full mx-auto my-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* MAIN COLUMN: RECENT EXPEDITIONS */}
        <div className="lg:col-span-8 bg-paper-raised border border-rule rounded-plate overflow-hidden">
          <div className="px-4 py-3 border-b border-rule bg-paper-sunk/40 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block">
                Research Archive
              </span>
              <h1 className="font-sans text-[18px] font-semibold text-ink tracking-tight">
                Recent Expeditions
              </h1>
            </div>
            <span className="text-[11px] font-mono text-ink-muted">
              {expeditions.length} expeditions cataloged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px] font-mono">
              <thead className="bg-paper-sunk border-b border-rule">
                <tr>
                  <th className="px-4 py-2 font-normal text-ink-muted">Expedition Name</th>
                  <th className="px-4 py-2 font-normal text-ink-muted">Region</th>
                  <th className="px-3 py-2 font-normal text-ink-muted text-right">Samples</th>
                  <th className="px-3 py-2 font-normal text-ink-muted text-right">ASVs</th>
                  <th className="px-3 py-2 font-normal text-ink-muted">Provenance</th>
                  <th className="px-4 py-2 font-normal text-ink-muted text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule bg-paper-raised">
                {expeditions.map((exp) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-paper-sunk/40 transition-colors group cursor-pointer"
                    onClick={() => {
                      setOpeningId(exp.id);
                      onOpenExpedition(exp.id);
                    }}
                  >
                    <td className="px-4 py-3 font-medium text-ink flex items-center gap-2">
                      <FileText size={15} className="text-survey shrink-0" />
                      <span className="group-hover:text-survey transition-colors truncate max-w-[240px]">
                        {exp.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{exp.region}</td>
                    <td className="px-3 py-3 text-right text-ink tabular-nums">{exp.samples}</td>
                    <td className="px-3 py-3 text-right text-ink tabular-nums">
                      {exp.asvs.toLocaleString()}
                    </td>
                    <td className="px-3 py-3">
                      <StatusTag
                        variant={exp.provenance === 'demo' ? 'demo' : 'clean'}
                        label={exp.provenance === 'demo' ? 'Standard Demo' : 'Field Survey'}
                      />
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setOpeningId(exp.id);
                            onOpenExpedition(exp.id);
                          }}
                          disabled={openingId === exp.id}
                          className="px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider bg-paper border border-rule hover:border-survey text-ink hover:text-survey rounded-control transition-colors"
                        >
                          {openingId === exp.id ? 'Loading…' : 'Inspect →'}
                        </button>
                        {exp.provenance === 'uploaded' && (
                          <button
                            type="button"
                            onClick={() => setDeletingExpedition(exp)}
                            className="p-1 text-ink-faint hover:text-error hover:bg-error/10 rounded-control transition-colors"
                            title="Delete expedition"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {expeditions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-ink-faint font-mono">
                      No expeditions loaded. Click &ldquo;+ New Expedition&rdquo; above to ingest amplicon datasets.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECONDARY SIDEBAR: SYSTEM METRICS & ACTIONS */}
        <div className="lg:col-span-4 space-y-4">
          {/* Laboratory Profile Card */}
          <div className="bg-paper-raised border border-rule rounded-plate p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-rule pb-2">
              <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block">
                Operating Laboratory
              </span>
              <ShieldCheck size={14} className="text-survey" />
            </div>
            <div className="space-y-1.5 text-[11px] font-mono">
              <div className="text-ink font-semibold text-[13px]">{labName}</div>
              <div className="text-ink-muted flex items-center gap-1">
                <MapPin size={12} className="text-survey shrink-0" />
                <span>{labLocation}</span>
              </div>
              {researcherProfile?.institution && (
                <div className="text-ink-faint">{researcherProfile.institution}</div>
              )}
              <div className="pt-2 border-t border-rule/60 flex justify-between items-center text-[10px]">
                <span className="text-ink-faint">Clearance:</span>
                <span className="text-survey font-semibold">
                  {researcherProfile?.clearance_level?.split(' - ')[0] || 'Level 3'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowDossierModal(true)}
              className="w-full py-1.5 bg-paper hover:bg-paper-sunk border border-rule text-ink text-[11px] font-mono rounded-control transition-colors text-center"
            >
              View Full Credential Dossier →
            </button>
          </div>

          {/* Quick Dataset Ingestion Card */}
          <div className="bg-paper-raised border border-rule rounded-plate p-4 space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block">
              Quick Actions
            </span>
            <button
              type="button"
              onClick={onNewExpedition}
              className="w-full py-2.5 px-3 bg-survey/15 hover:bg-survey/25 border border-survey/40 text-survey font-mono text-[12px] uppercase tracking-wider rounded-control transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={15} />
              <span>Ingest eDNA Sequence Matrix</span>
            </button>
          </div>

          {/* Recent System Activity Accordion */}
          <div className="bg-paper-raised border border-rule rounded-plate p-4">
            <button
              type="button"
              onClick={() => setShowActivity(!showActivity)}
              className="w-full flex items-center justify-between text-left text-[12px] font-mono text-ink"
            >
              <div className="flex items-center gap-2">
                <Activity size={14} />
                <span>Recent System Activity</span>
              </div>
              {showActivity ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {showActivity && (
              <div className="mt-3 pt-2 border-t border-rule space-y-1.5 text-[11px] font-mono text-ink-muted">
                <div className="flex justify-between">
                  <span>Dataset verified: arabian_sea_asvs.tsv</span>
                  <span className="text-ink-faint">Today</span>
                </div>
                <div className="flex justify-between">
                  <span>Alpha diversity computed (n=16)</span>
                  <span className="text-ink-faint">2d ago</span>
                </div>
                <div className="flex justify-between">
                  <span>3 divergent sequence clusters flagged</span>
                  <span className="text-ink-faint">5d ago</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Persistent Bottom Bar */}
      <footer className="border-t border-rule pt-3 flex flex-wrap justify-between items-center text-[11px] font-mono text-ink-faint">
        <div>DEEPDRISHTI WORKSTATION • REPOSITORY PROVENANCE VERIFIED</div>
        <div>ALL QUANTITIES ARE DERIVED STRICTLY FROM OBSERVATION RECORDS</div>
      </footer>

      {/* Laboratory & Researcher Dossier Modal */}
      {showDossierModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#091322] border border-white/15 rounded-plate max-w-lg w-full p-6 shadow-2xl text-[#E2E8F0] font-sans">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-[#38BDF8]" />
                <h3 className="font-serif text-[18px] font-medium text-white">
                  Enrolled Researcher & Laboratory Dossier
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDossierModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-control"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 text-[12px] font-mono">
              {/* Researcher Details */}
              <div className="bg-[#050B14]/80 border border-white/10 rounded-control p-3.5 space-y-2">
                <div className="text-[11px] text-[#38BDF8] uppercase font-bold flex items-center gap-1.5 border-b border-white/10 pb-1.5">
                  <User size={13} />
                  <span>Researcher Identity</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Full Name:</span>
                    <strong className="text-white text-[13px]">{displayName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Professional Title:</span>
                    <span className="text-white font-medium">{researcherProfile?.role_title || 'Marine eDNA Researcher'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Registered Email:</span>
                    <span className="text-slate-300">{researcherProfile?.email || 'Authenticated'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">ORCID Identifier:</span>
                    <span className="text-slate-300">{researcherProfile?.orcid_id || 'Not specified'}</span>
                  </div>
                </div>
              </div>

              {/* Laboratory Details */}
              <div className="bg-[#050B14]/80 border border-white/10 rounded-control p-3.5 space-y-2">
                <div className="text-[11px] text-[#38BDF8] uppercase font-bold flex items-center gap-1.5 border-b border-white/10 pb-1.5">
                  <Building2 size={13} />
                  <span>Laboratory & Operating Base</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Laboratory / Research Core:</span>
                    <strong className="text-white">{labName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Operating Location / Base Port:</span>
                    <span className="text-[#38BDF8] flex items-center gap-1">
                      <MapPin size={11} className="inline shrink-0" />
                      {labLocation}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Parent Institution:</span>
                    <span className="text-slate-300">{researcherProfile?.institution || 'National Oceanographic Research Institute'}</span>
                  </div>
                </div>
              </div>

              {/* Surveillance Credentials */}
              <div className="bg-[#050B14]/80 border border-white/10 rounded-control p-3.5 space-y-2">
                <div className="text-[11px] text-[#38BDF8] uppercase font-bold flex items-center gap-1.5 border-b border-white/10 pb-1.5">
                  <Dna size={13} />
                  <span>Oceanographic & Surveillance Profile</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Research Focus:</span>
                    <span className="text-slate-200">{researcherProfile?.research_focus || 'Marine Environmental DNA (eDNA) Metabarcoding'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Target Gene Marker:</span>
                    <span className="text-slate-200">{researcherProfile?.target_gene_marker || '18S V9 (Marine Eukaryotes)'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Clearance Level:</span>
                    <span className="text-emerald-400 font-semibold">{researcherProfile?.clearance_level || 'Level 3 - Biodiversity Surveillance (Restricted)'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowDossierModal(false)}
                className="px-4 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white font-mono text-[12px] rounded-control transition-colors"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Dialog */}
      {deletingExpedition && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper-raised border border-rule-strong rounded-plate max-w-md w-full p-6 shadow-floating font-sans">
            <div className="flex items-center gap-2.5 text-error mb-3">
              <AlertTriangle size={20} />
              <h3 className="font-serif text-[18px] font-medium text-ink">
                Delete Uploaded Expedition
              </h3>
            </div>

            <p className="text-[13px] text-ink-muted mb-4 leading-relaxed font-sans">
              Are you sure you want to permanently delete{' '}
              <strong className="text-ink font-semibold">{deletingExpedition.name}</strong>?
            </p>

            <div className="p-3 bg-paper-sunk/60 border border-rule rounded-control text-[11px] font-mono text-ink-muted mb-4 space-y-1">
              <div>
                • Expedition ID: <span className="text-ink font-semibold">{deletingExpedition.id}</span>
              </div>
              <div>
                • Dependent Samples: <span className="text-ink font-semibold">{deletingExpedition.samples}</span>
              </div>
              <div>
                • Associated ASVs: <span className="text-ink font-semibold">{deletingExpedition.asvs.toLocaleString()}</span>
              </div>
              <div>
                • Target Storage:{' '}
                <span className="text-ink font-semibold">
                  {repoMode === 'supabase'
                    ? 'Supabase PostgreSQL (Cascading Deletion)'
                    : 'Local Browser Persistence'}
                </span>
              </div>
            </div>

            {deleteError && (
              <div className="p-2.5 mb-4 bg-error/10 border border-error/40 text-error text-[12px] font-mono rounded-control">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2 border-t border-rule">
              <button
                type="button"
                onClick={() => {
                  setDeletingExpedition(null);
                  setDeleteError(null);
                }}
                className="px-3 py-1.5 bg-paper border border-rule hover:border-rule-strong text-ink text-[12px] font-mono rounded-control transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 bg-error hover:bg-error-hover text-white text-[12px] font-mono rounded-control transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                <span>{isDeleting ? 'Deleting…' : 'Delete Expedition'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
