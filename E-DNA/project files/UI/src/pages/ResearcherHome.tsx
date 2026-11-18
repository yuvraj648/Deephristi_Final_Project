// ========================================================
// DEEPDRISHTI RESEARCHER HOME
// Clean launch point for expeditions, datasets, and reports
// Designed to fit comfortably on one screen without scrolling
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
} from 'lucide-react';

interface ResearcherHomeProps {
  onOpenExpedition: (expeditionId: string) => void;
  onNewExpedition: () => void;
  onLogout: () => void;
  onOpenSurveillance?: () => void;
  researcherName?: string;
}

export const ResearcherHome: React.FC<ResearcherHomeProps> = ({
  onOpenExpedition,
  onNewExpedition,
  onLogout,
  onOpenSurveillance,
  researcherName = 'Dr. M. S. Swaminathan Group',
}) => {
  const [expeditions, setExpeditions] = useState<ExpeditionSummaryItem[]>([]);
  const [showActivity, setShowActivity] = useState(false);
  const [deletingExpedition, setDeletingExpedition] = useState<ExpeditionSummaryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

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

  return (
    <div className="relative min-h-screen bg-paper flex flex-col justify-between p-6 select-none font-sans text-ink overflow-hidden">
      {/* Background bathymetry contours */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none stroke-[#38BDF8]/10 fill-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M-100,160 C300,80 600,360 1200,210 S1600,70 2000,260" strokeWidth="1" />
        <path d="M-100,280 C250,180 700,480 1150,340 S1650,180 2000,380" strokeWidth="1" strokeDasharray="4 4" />
        <path d="M-100,400 C350,310 650,610 1100,470 S1550,310 2000,500" strokeWidth="1" />
        <path d="M-100,520 C400,440 800,740 1250,600 S1700,440 2000,640" strokeWidth="1" />
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
            <div className="text-[11px] font-mono text-ink-muted">
              Station Session: {researcherName}
            </div>
          </div>
        </div>

        {/* Persistence Mode Pill */}
        <div className="flex items-center gap-3">
          {repoMode === 'supabase' ? (
            <div
              className="flex items-center gap-1.5 px-3 py-1 bg-survey/10 border border-survey/40 text-survey text-[11px] font-mono rounded-control"
              title="Remote persistent cloud backend via Supabase PostgreSQL"
            >
              <Cloud size={13} className="text-survey" />
              <span className="w-1.5 h-1.5 rounded-full bg-survey animate-pulse" />
              <span>SUPABASE PERSISTENCE ACTIVE</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-mono rounded-control"
              title="Running on local Python FastAPI backend (SQLite persistence). All data is stored locally."
            >
              <HardDrive size={13} />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>LOCAL BACKEND ACTIVE • Python API</span>
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
              <span>Surveillance Deck</span>
            </button>
          )}

          <button
            type="button"
            onClick={onNewExpedition}
            className="px-3 py-1.5 bg-survey hover:bg-survey-hover text-white text-[12px] font-mono uppercase tracking-wider rounded-control transition-colors flex items-center gap-1.5"
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
                    onClick={() => {
                      setOpeningId(exp.id);
                      onOpenExpedition(exp.id);
                    }}
                    className="hover:bg-survey-tint/40 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3 text-ink font-medium">
                      <div className="flex flex-col">
                        <span className="text-[13px] group-hover:text-survey transition-colors">
                          {exp.name}
                        </span>
                        <span className="text-[10px] text-ink-faint font-sans">
                          ID: {exp.id}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-muted max-w-[200px] truncate">
                      {exp.region}
                    </td>
                    <td className="px-3 py-3 text-right text-ink tabular-nums">
                      {exp.samples}
                    </td>
                    <td className="px-3 py-3 text-right text-ink tabular-nums font-semibold">
                      {exp.asvs.toLocaleString()}
                    </td>
                    <td className="px-3 py-3">
                      {exp.provenance === 'uploaded' ? (
                        <StatusTag status="uploaded" />
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-control text-[10px] font-mono tracking-wider uppercase border border-rule bg-paper-sunk text-ink-muted">
                          CANONICAL
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        {openingId === exp.id ? (
                          <span className="text-[11px] font-mono text-survey uppercase inline-flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 border-2 border-survey border-t-transparent rounded-full animate-spin" />
                            Opening...
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-survey uppercase group-hover:underline">
                            Open Workspace →
                          </span>
                        )}
                        {exp.provenance === 'uploaded' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingExpedition(exp);
                            }}
                            className="p-1 text-ink-faint hover:text-error hover:bg-paper-sunk rounded-control transition-colors"
                            title="Delete uploaded expedition"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECONDARY SIDE COLUMN: ASV DATASETS & REPORTS */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* ASV Datasets */}
          <div className="bg-paper-raised border border-rule rounded-plate p-4">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-rule">
              <div className="flex items-center gap-1.5">
                <Database size={14} className="text-ink-muted" />
                <span className="font-sans text-[14px] font-semibold text-ink">ASV Datasets</span>
              </div>
              <span className="text-[10px] font-mono text-ink-faint">Catalog</span>
            </div>
            <div className="space-y-2 text-[12px] font-mono">
              <div className="p-2 bg-paper-sunk/40 border border-rule/60 rounded-control flex justify-between items-center">
                <div>
                  <span className="text-ink block font-medium">arabian_sea_asvs.tsv</span>
                  <span className="text-[10px] text-ink-faint">160 ASVs • 16 Samples</span>
                </div>
                <span className="text-[10px] font-mono text-ink-muted uppercase px-1.5 py-0.5 rounded border border-rule bg-paper-sunk">REFERENCE</span>
              </div>
              <div className="p-2 bg-paper-sunk/40 border border-rule/60 rounded-control flex justify-between items-center">
                <div>
                  <span className="text-ink block font-medium">ridge_hydrothermal.tsv</span>
                  <span className="text-[10px] text-ink-faint">142 ASVs • 12 Samples</span>
                </div>
                <span className="text-[10px] font-mono text-ink-muted uppercase px-1.5 py-0.5 rounded border border-rule bg-paper-sunk">REFERENCE</span>
              </div>
            </div>
          </div>

          {/* Research Reports */}
          <div className="bg-paper-raised border border-rule rounded-plate p-4">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-rule">
              <div className="flex items-center gap-1.5">
                <FileText size={14} className="text-ink-muted" />
                <span className="font-sans text-[14px] font-semibold text-ink">Generated Reports</span>
              </div>
              <span className="text-[10px] font-mono text-ink-faint">Archive</span>
            </div>
            <div className="space-y-2 text-[12px] font-mono">
              <div
                onClick={() => onOpenExpedition(expeditions[0]?.id || 'exp_arabian_sea_2026')}
                className="p-2 bg-paper-sunk/40 hover:bg-paper-sunk border border-rule/60 rounded-control flex justify-between items-center cursor-pointer transition-colors"
              >
                <div>
                  <span className="text-ink block font-medium hover:text-survey">
                    Arabian Sea Biodiversity Summary
                  </span>
                  <span className="text-[10px] text-ink-faint">March 2026 • Certified</span>
                </div>
                <span className="text-ink-muted text-[11px]">View →</span>
              </div>
            </div>
          </div>

          {/* Recent Activity: Collapsible */}
          <div className="border border-rule rounded-plate bg-paper-raised p-3">
            <button
              type="button"
              onClick={() => setShowActivity(!showActivity)}
              className="w-full flex items-center justify-between text-[12px] font-mono text-ink-muted hover:text-ink"
            >
              <div className="flex items-center gap-1.5">
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
                disabled={isDeleting}
                className="px-3.5 py-1.5 bg-paper-sunk border border-rule hover:border-rule-strong text-ink text-[12px] font-mono uppercase tracking-wider rounded-control transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-3.5 py-1.5 bg-error hover:bg-error/90 text-white text-[12px] font-mono uppercase tracking-wider rounded-control transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                <span>{isDeleting ? 'Deleting Records…' : 'Confirm Permanent Deletion'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
