// ========================================================
// DEEPDRISHTI TAXONOMY EXPLORER PAGE
// Hierarchical exploration: Life → Kingdom → Phylum → Class → Order → Family → Genus → Species
// ========================================================

import React from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import type { TaxonomicRank } from '../../domain/types';
import { TaxonomyTreeBar } from '../../components/visualization/TaxonomyTreeBar';
import { ChevronRight, Info } from 'lucide-react';

export const TaxonomyPage: React.FC = () => {
  const { filters, updateFilter, expedition } = useAnalysis();
  const currentRank = filters.taxonomicRank;
  const hasAnyTaxonomy = expedition.asvs.some((a) => a.taxonomy && Object.values(a.taxonomy).some(Boolean));

  const ranks: TaxonomicRank[] = [
    'kingdom',
    'phylum',
    'class',
    'order',
    'family',
    'genus',
    'species',
  ];

  return (
    <div className="space-y-6">
      {/* Title & Hierarchy Breadcrumbs */}
      <div className="border-b border-rule pb-3">
        <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block">
          Lineage Dissection
        </span>
        <h1 className="font-serif text-[26px] font-medium text-ink leading-tight mb-2">
          Taxonomic Architecture
        </h1>

        {/* Hierarchical Stepper */}
        <div className="flex items-center flex-wrap gap-1 font-mono text-[12px] bg-paper-sunk/60 p-2 rounded-control border border-rule">
          <span className="text-ink-muted">Biota</span>
          {ranks.map((r) => {
            const isCurrent = currentRank === r;
            return (
              <React.Fragment key={r}>
                <ChevronRight size={13} className="text-ink-faint" />
                <button
                  type="button"
                  onClick={() => updateFilter('taxonomicRank', r)}
                  className={`px-2 py-0.5 rounded-control uppercase text-[11px] tracking-wider transition-colors ${
                    isCurrent
                      ? 'bg-survey text-white font-medium shadow-sm'
                      : 'text-ink-muted hover:text-ink hover:bg-paper'
                  }`}
                >
                  {r}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {!hasAnyTaxonomy && (
        <div className="p-4 bg-paper-sunk/60 border border-rule rounded-plate flex items-start gap-3">
          <div className="p-1.5 bg-paper-raised border border-rule text-ink-muted rounded-control flex-shrink-0 mt-0.5">
            <Info size={16} />
          </div>
          <div>
            <span className="font-mono text-[12px] font-semibold text-ink uppercase tracking-wider block">
              Taxonomic assignment not available
            </span>
            <p className="text-[12px] text-ink-muted font-sans mt-0.5 leading-relaxed">
              No taxonomic classification columns were included in the uploaded ASV table. Sequence variants are cataloged with unassigned status. Taxonomy assignment is not fabricated.
            </p>
          </div>
        </div>
      )}

      {/* Main Ranked Bar Plate */}
      <TaxonomyTreeBar captionNumber={1} />
    </div>
  );
};
