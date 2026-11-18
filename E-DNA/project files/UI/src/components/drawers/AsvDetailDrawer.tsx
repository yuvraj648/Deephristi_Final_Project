// ========================================================
// DEEPDRISHTI ASV DETAIL DRAWER
// Comprehensive biological record for an Amplicon Sequence Variant
// ========================================================

import React from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import { Drawer } from '../common/Modal';
import { AsvSequence } from '../common/AsvSequence';
import { StatusTag } from '../common/StatusTag';

export const AsvDetailDrawer: React.FC = () => {
  const { activeDrawer, setActiveDrawer, expedition } = useAnalysis();

  const isOpen = activeDrawer?.type === 'asv';
  const asvId = activeDrawer?.id;
  const asv = expedition.asvs.find((a) => a.asv_id === asvId);

  // Derived values for this ASV
  const occurrences = expedition.occurrences.filter((o) => o.asv_id === asvId);
  const totalAbundance = occurrences.reduce((sum, o) => sum + o.abundance, 0);
  const sampleCount = occurrences.length;

  if (!asv) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={() => setActiveDrawer(null)}
      eyebrow="SPECIMEN RECORD"
      title={asv.asv_id}
      width="w-[520px]"
    >
      <div className="space-y-6">
        {/* Status Strip */}
        <div className="flex items-center gap-2 pb-3 border-b border-rule">
          <StatusTag status={asv.assignment_status} />
          {asv.novelty_status === 'potentially_divergent' && (
            <StatusTag status={asv.novelty_status} />
          )}
          {asv.cluster_id && (
            <span className="font-mono text-[11px] text-ink-muted">
              Cluster: {asv.cluster_id}
            </span>
          )}
        </div>

        {/* Taxonomic Classification */}
        <div>
          <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block mb-2">
            Taxonomic Assignment Hierarchy
          </span>
          <div className="bg-paper-sunk border border-rule rounded-plate p-3 text-[13px] font-mono space-y-1">
            <div className="flex justify-between">
              <span className="text-ink-faint">Kingdom:</span>
              <span className="text-ink font-medium">{asv.taxonomy?.kingdom || 'Not available'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-faint">Phylum:</span>
              <span className="text-ink font-medium">{asv.taxonomy?.phylum || 'Not available'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-faint">Class:</span>
              <span className="text-ink font-medium">{asv.taxonomy?.class || 'Not available'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-faint">Order:</span>
              <span className="text-ink font-medium">{asv.taxonomy?.order || 'Not available'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-faint">Family:</span>
              <span className="text-ink font-medium">{asv.taxonomy?.family || 'Not available'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-faint">Genus:</span>
              <span className="text-ink font-medium italic">{asv.taxonomy?.genus || 'Not available'}</span>
            </div>
            <div className="flex justify-between border-t border-rule pt-1 mt-1">
              <span className="text-ink-faint">Species:</span>
              <span className="text-ink font-semibold italic">{asv.taxonomy?.species || 'Unassigned to species rank'}</span>
            </div>
          </div>
        </div>

        {/* Confidence & Reference Support */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-paper border border-rule p-3 rounded-control">
            <span className="text-[11px] font-mono uppercase text-ink-faint block">Assignment Confidence</span>
            <span className="text-[20px] font-mono text-ink font-medium">
              {asv.confidence !== undefined ? `${(asv.confidence * 100).toFixed(1)}%` : 'N/A'}
            </span>
          </div>
          <div className="bg-paper border border-rule p-3 rounded-control">
            <span className="text-[11px] font-mono uppercase text-ink-faint block">Sequence Length</span>
            <span className="text-[20px] font-mono text-ink font-medium">{asv.sequence.length} bp</span>
          </div>
        </div>

        {asv.reference_support && (
          <div className="border border-rule rounded-plate p-3 bg-paper">
            <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block mb-2">
              Reference Database Support
            </span>
            <div className="text-[12px] font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-ink-muted">Best Hit Reference:</span>
                <span className="text-ink">{asv.reference_support.best_hit || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Query Identity:</span>
                <span className="text-ink">
                  {asv.reference_support.identity !== undefined
                    ? `${asv.reference_support.identity.toFixed(1)}%`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Alignment Coverage:</span>
                <span className="text-ink">
                  {asv.reference_support.coverage !== undefined
                    ? `${asv.reference_support.coverage.toFixed(1)}%`
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Nucleotide Sequence */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint">
              Nucleotide Sequence (5' → 3')
            </span>
            <span className="text-[11px] font-mono text-ink-muted">{asv.sequence.length} bp</span>
          </div>
          <div className="p-3 bg-paper-sunk border border-rule rounded-control overflow-x-auto max-h-40">
            <AsvSequence sequence={asv.sequence} showCopy={true} />
          </div>
        </div>

        {/* Observed Sample Distribution */}
        <div>
          <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block mb-2">
            Sample Distribution (Total Abundance: {totalAbundance.toLocaleString()} reads across {sampleCount} samples)
          </span>
          {occurrences.length === 0 ? (
            <p className="text-[12px] text-ink-faint font-mono">No occurrences in currently active samples.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto border border-rule rounded-plate">
              <table className="w-full text-left text-[12px] font-mono">
                <thead className="bg-paper-sunk border-b border-rule sticky top-0">
                  <tr>
                    <th className="px-3 py-1.5 text-ink-muted font-normal">Sample ID</th>
                    <th className="px-3 py-1.5 text-ink-muted font-normal">Site Station</th>
                    <th className="px-3 py-1.5 text-ink-muted font-normal text-right">Read Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule bg-paper-raised">
                  {occurrences.map((occ) => {
                    const sample = expedition.samples.find((s) => s.sample_id === occ.sample_id);
                    return (
                      <tr key={occ.sample_id} className="hover:bg-paper-sunk/40">
                        <td className="px-3 py-1 text-ink">{occ.sample_id}</td>
                        <td className="px-3 py-1 text-ink-muted">{sample?.site || 'N/A'}</td>
                        <td className="px-3 py-1 text-right text-ink font-medium tabular-nums">
                          {occ.abundance.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};
