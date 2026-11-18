// ========================================================
// DEEPDRISHTI TAXONOMY RANKED BAR VISUALIZATION
// Modern scientific dashboard aesthetic matching exact reference:
// - Title: {Rank} Distribution with "{n} taxa" pill
// - Species Name | Read Count in bold white
// - {n} ASVs · {m} sites | {x}% of reads
// - Sleek horizontal bar where bar width represents relative abundance (% of total reads)
// - Warm neutral stone/beige for Unassigned, subtle sky-blue for identified species
// - Exact 1:1 correspondence between bar length and percentage
// ========================================================

import React, { useState, useMemo } from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import type { TaxonomicRank } from '../../domain/types';

export const TaxonomyTreeBar: React.FC<{
  captionNumber?: number;
}> = () => {
  const { filters, updateFilter, getTaxonomyRollup, expedition } = useAnalysis();
  const currentRank = filters.taxonomicRank;
  const data = useMemo(() => getTaxonomyRollup(currentRank), [getTaxonomyRollup, currentRank]);

  const [showAll, setShowAll] = useState(false);

  const ranks: TaxonomicRank[] = [
    'kingdom',
    'phylum',
    'class',
    'order',
    'family',
    'genus',
    'species',
  ];

  const hasAnyTaxonomy = useMemo(
    () => expedition.asvs.some((a) => a.taxonomy && Object.values(a.taxonomy).some(Boolean)),
    [expedition.asvs]
  );

  const displayedData = showAll ? data : data.slice(0, 15);

  return (
    <div className="bg-[#05080E] border border-rule/80 rounded-plate p-6 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-[20px] font-semibold text-white tracking-tight">
            {currentRank.charAt(0).toUpperCase() + currentRank.slice(1)} Distribution
          </h2>
          <p className="text-[13px] text-neutral-400 mt-0.5 font-sans">
            Sequencing abundance across identified taxa
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Hierarchical rank switcher */}
          <div className="flex border border-white/10 rounded-control overflow-hidden bg-white/5 font-mono">
            {ranks.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => updateFilter('taxonomicRank', r)}
                className={`px-2.5 py-1 uppercase text-[10px] tracking-wider transition-colors ${
                  currentRank === r
                    ? 'bg-sky-500 text-white font-medium shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
                title={`View ${r} distribution`}
              >
                {r.slice(0, 3)}
              </button>
            ))}
          </div>

          {/* Taxa count pill badge */}
          <span className="px-2.5 py-0.5 rounded-full bg-sky-950/80 text-sky-400 border border-sky-800/60 text-[12px] font-medium font-sans">
            {data.length} taxa
          </span>
        </div>
      </div>

      {/* Content */}
      {!hasAnyTaxonomy ? (
        <div className="py-8 text-center bg-white/[0.02] rounded-control border border-white/5 space-y-2 p-6">
          <span className="font-mono text-[13px] font-semibold text-white uppercase tracking-wider block">
            Taxonomic assignment not available
          </span>
          <p className="text-[12px] text-neutral-400 font-sans max-w-md mx-auto leading-relaxed">
            This dataset was ingested without reference database taxonomic lineage assignments. Sequence variants are cataloged with unassigned status.
          </p>
        </div>
      ) : data.length === 0 ? (
        <div className="py-8 text-center text-neutral-400 font-mono text-[13px]">
          No taxonomic assignments available at {currentRank} rank for active filters.
        </div>
      ) : (
        <div className="space-y-6">
          {displayedData.map((item) => {
            const isUnassigned = item.taxon === 'Unassigned';
            // Bar width directly represents relative abundance (% of total reads)
            // Exactly matching the percentage label
            const barWidth = Math.min(
              100,
              Math.max(item.relativeAbundance > 0 ? 0.6 : 0, item.relativeAbundance)
            );

            return (
              <div key={item.taxon} className="space-y-1.5 group">
                {/* Line 1: Taxon Name & Read Count */}
                <div className="flex items-baseline justify-between">
                  <span className="text-[16px] font-semibold text-white tracking-tight">
                    {item.taxon}
                  </span>
                  <span className="text-[16px] font-bold text-white tabular-nums tracking-tight font-sans">
                    {item.abundance.toLocaleString()}
                  </span>
                </div>

                {/* Line 2: Metadata (ASVs · sites) & Percentage of reads */}
                <div className="flex items-center justify-between text-[13px] text-neutral-400 font-sans">
                  <span>
                    {item.asvCount} ASVs · {item.sampleOccurrence} sites
                  </span>
                  <span className="tabular-nums font-medium">
                    {item.relativeAbundance}% of reads
                  </span>
                </div>

                {/* Line 3: Sleek horizontal progress bar */}
                <div className="w-full h-2.5 rounded-full bg-[#1A222D] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isUnassigned ? 'bg-[#D4CEB8]' : 'bg-sky-500'
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}

          {/* Show All / Collapse toggle if more than 15 taxa */}
          {data.length > 15 && (
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="px-4 py-1.5 rounded-control bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 font-mono text-[11px] transition-colors"
              >
                {showAll ? 'Show top 15 taxa' : `Show all ${data.length} taxa`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer Caption matching the reference design */}
      <div className="pt-2 text-[12px] text-neutral-400 font-sans border-t border-white/5">
        Illustrative redesign: bars now use the same percentage scale as the labels.
      </div>
    </div>
  );
};