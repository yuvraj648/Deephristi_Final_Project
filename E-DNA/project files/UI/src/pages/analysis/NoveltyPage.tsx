// ========================================================
// DEEPDRISHTI NOVELTY EXPLORER
// Candidate divergent sequence groups and diagnostic divergence markers
// Strict scientific terminology: never "new species", always divergent candidates
// ========================================================

import React from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import { StatusTag } from '../../components/common/StatusTag';
import { ArrowRight, AlertCircle } from 'lucide-react';

export const NoveltyPage: React.FC = () => {
  const { expedition, setActiveDrawer, setSelectedClusterId } = useAnalysis();
  const clusters = expedition.clusters;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="border-b border-rule pb-3">
        <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block">
          Genomic Divergence Screening
        </span>
        <h1 className="font-serif text-[26px] font-medium text-ink leading-tight">
          Potentially Novel / Divergent Sequence Groups
        </h1>
        <p className="text-[13px] text-ink-muted mt-1">
          Amplicon sequence variants exhibiting substantial nucleotide divergence (&gt;12%) from published reference databases, forming distinct monophyletic sequence clusters.
        </p>
      </div>

      {/* Scientific Principle Notice */}
      <div className="p-3.5 bg-paper-sunk/60 border border-rule rounded-plate flex items-start gap-3">
        <AlertCircle size={16} className="text-ink-muted flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-ink font-sans leading-relaxed">
          <strong className="font-mono uppercase text-[11px] text-ink">Scientific Nomenclature Guideline:</strong> Machine learning sequence clusters represent <em className="italic">candidate divergent sequence groups</em> or unassigned lineages. Formal taxonomic designation requires morphological holotype examination or multi-locus genomic corroboration.
        </p>
      </div>

      {/* Ruled Cluster Cards / Specimen Plates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {clusters.length === 0 ? (
          <div className="col-span-full py-12 px-6 text-center bg-[#05080E] border border-rule/80 rounded-plate space-y-2">
            <span className="font-mono text-[14px] font-semibold text-white uppercase tracking-wider block">
              Novelty analysis not evaluated
            </span>
            <p className="text-[13px] text-neutral-400 font-sans max-w-lg mx-auto leading-relaxed">
              Automated divergence scanning, reference database comparison, and machine learning cluster discovery have not been executed on this dataset. Candidate novelty clusters are never fabricated.
            </p>
          </div>
        ) : (
          clusters.map((cluster) => {
            const memberOccurrences = expedition.occurrences.filter((o) =>
              cluster.asv_ids.includes(o.asv_id)
            );
            const distinctSamples = Array.from(new Set(memberOccurrences.map((o) => o.sample_id)));
            const totalAbundance = memberOccurrences.reduce((s, o) => s + o.abundance, 0);
            const divergenceNum = cluster.divergence !== undefined ? cluster.divergence : 12.0;

            return (
              <div
                key={cluster.cluster_id}
                className="group bg-[#05080E] border border-rule/80 hover:border-purple-600/60 rounded-plate p-5 flex flex-col justify-between transition-all space-y-5 shadow-sm hover:shadow-md"
              >
                <div className="space-y-4">
                  {/* Top Bar: Cluster ID & Pill Badge */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <span className="font-serif text-[18px] font-semibold text-white tracking-tight flex items-center gap-1.5">
                      <span className="text-purple-400 font-mono text-[16px] font-bold">
                        {cluster.cluster_id}
                      </span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60 text-[11px] font-mono tracking-wider font-semibold uppercase">
                      Divergent Candidate
                    </span>
                  </div>

                  {/* Quantitative Parameters */}
                  <div className="space-y-2.5 font-sans text-[13px]">
                    <div className="flex items-baseline justify-between">
                      <span className="text-neutral-400">Constituent ASVs:</span>
                      <span className="text-white font-semibold tabular-nums">
                        {cluster.asv_ids.length} variants
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-neutral-400">Sample Occurrence:</span>
                      <span className="text-white font-semibold tabular-nums">
                        {distinctSamples.length} stations
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-neutral-400">Total Read Count:</span>
                      <span className="text-white font-bold tabular-nums">
                        {totalAbundance.toLocaleString()}
                      </span>
                    </div>

                    {/* Estimated Divergence with sleek progress bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-neutral-400">Estimated Divergence:</span>
                        <span className="text-purple-400 font-bold tabular-nums">
                          {cluster.divergence !== undefined ? `${cluster.divergence}%` : 'N/A'}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#18202A] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-purple-500 transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.max(5, (divergenceNum / 25) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Closest Reference */}
                    <div className="pt-3 border-t border-white/5 space-y-0.5">
                      <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-[0.08em] block">
                        Closest Reference:
                      </span>
                      <span className="text-white font-semibold text-[14px] truncate block tracking-tight">
                        {cluster.closest_known_assignment}
                      </span>
                    </div>
                  </div>

                  {/* Signal note card */}
                  <div className="p-3 bg-[#0B121C] rounded-control border border-white/5 text-[12px] font-sans text-neutral-300 leading-relaxed">
                    {cluster.novelty_signal}
                  </div>
                </div>

                {/* Explore Action Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClusterId(cluster.cluster_id);
                    setActiveDrawer({ type: 'cluster', id: cluster.cluster_id });
                  }}
                  className="w-full py-2.5 px-4 bg-purple-950/30 hover:bg-purple-900/50 border border-purple-800/50 hover:border-purple-600 text-purple-200 hover:text-white font-mono text-[12px] font-medium rounded-control transition-all flex items-center justify-center gap-2 group/btn shadow-sm"
                >
                  <span>Explore Cluster Dossier</span>
                  <ArrowRight size={13} className="group-hover/btn:translate-x-1 transition-transform text-purple-400 group-hover/btn:text-white" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
