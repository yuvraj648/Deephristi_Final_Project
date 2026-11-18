// ========================================================
// DEEPDRISHTI CLUSTER DETAIL DRAWER
// Detailed analysis of candidate divergent sequence clusters
// Strictly adheres to scientific language (never "new species")
// ========================================================

import React from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import { Drawer } from '../common/Modal';
import { StatusTag } from '../common/StatusTag';
import { AsvSequence } from '../common/AsvSequence';

export const ClusterDetailDrawer: React.FC = () => {
  const { activeDrawer, setActiveDrawer, expedition, setActiveDrawer: openDrawer } = useAnalysis();

  const isOpen = activeDrawer?.type === 'cluster';
  const clusterId = activeDrawer?.id;
  const cluster = expedition.clusters.find((c) => c.cluster_id === clusterId);

  if (!cluster) return null;

  // Find all member ASVs
  const memberAsvs = expedition.asvs.filter((a) => cluster.asv_ids.includes(a.asv_id));
  
  // Find distinct samples where these ASVs occur
  const memberOccurrences = expedition.occurrences.filter((o) => cluster.asv_ids.includes(o.asv_id));
  const distinctSampleIds = Array.from(new Set(memberOccurrences.map((o) => o.sample_id)));
  const totalClusterReads = memberOccurrences.reduce((sum, o) => sum + o.abundance, 0);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={() => setActiveDrawer(null)}
      eyebrow="DIVERGENT CANDIDATE GROUP"
      title={cluster.cluster_id}
      width="w-[520px]"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-rule">
          <StatusTag status="potentially_divergent" />
          <span className="font-mono text-[12px] text-ink-muted">
            {cluster.divergence !== undefined ? `${cluster.divergence.toFixed(1)}% Sequence Divergence` : 'Divergent'}
          </span>
        </div>

        {/* Specimen Profile Card */}
        <div className="bg-paper-sunk border border-rule rounded-plate p-4 space-y-2 text-[13px] font-mono">
          <div className="flex justify-between">
            <span className="text-ink-faint">Closest Reference Taxon:</span>
            <span className="text-ink font-semibold">{cluster.closest_known_assignment || 'Unassigned Marine Metazoa'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-faint">Estimated Divergence:</span>
            <span className="text-ink font-semibold text-aubergine">
              {cluster.divergence !== undefined ? `${cluster.divergence.toFixed(1)}%` : 'Requires alignment'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-faint">Constituent ASVs:</span>
            <span className="text-ink font-medium">{cluster.asv_ids.length} sequences</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-faint">Detected in Stations:</span>
            <span className="text-ink font-medium">{distinctSampleIds.length} samples</span>
          </div>
          <div className="flex justify-between border-t border-rule pt-2">
            <span className="text-ink-faint">Cumulative Reads:</span>
            <span className="text-ink font-medium tabular-nums">{totalClusterReads.toLocaleString()} reads</span>
          </div>
        </div>

        {/* Novelty Signal Explanation */}
        <div className="border border-rule rounded-plate p-3.5 bg-paper">
          <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block mb-1.5">
            Diagnostic Sequence Novelty Signal
          </span>
          <p className="text-[13px] text-ink-muted font-sans leading-relaxed">
            {cluster.novelty_signal}
          </p>
        </div>

        {/* Member ASVs List */}
        <div>
          <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block mb-2">
            Associated Amplicon Sequence Variants ({memberAsvs.length})
          </span>
          <div className="border border-rule rounded-plate divide-y divide-rule bg-paper-raised">
            {memberAsvs.map((asv) => {
              const asvReads = expedition.occurrences
                .filter((o) => o.asv_id === asv.asv_id)
                .reduce((s, o) => s + o.abundance, 0);

              return (
                <div
                  key={asv.asv_id}
                  className="p-3 hover:bg-paper-sunk/30 cursor-pointer flex flex-col gap-1 transition-colors"
                  onClick={() => openDrawer({ type: 'asv', id: asv.asv_id })}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[13px] font-semibold text-survey hover:underline">
                      {asv.asv_id}
                    </span>
                    <span className="font-mono text-[11px] text-ink-muted tabular-nums">
                      {asvReads.toLocaleString()} reads
                    </span>
                  </div>
                  <div className="max-w-full overflow-hidden">
                    <AsvSequence sequence={asv.sequence} truncateLength={36} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Drawer>
  );
};
