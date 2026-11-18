// ========================================================
// DEEPDRISHTI MAIN eDNA OVERVIEW DASHBOARD
// Primary workstation command center: KPI readouts,
// high-priority hydrographic map, and location × taxa matrix
// ========================================================

import React from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import { KPICard } from '../../components/common/KPICard';
import { HydrographicMap } from '../../components/visualization/HydrographicMap';
import { ArrowRight, MapPin } from 'lucide-react';

interface OverviewPageProps {
  onNavigate: (view: any) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate }) => {
  const { kpis, expedition, filters } = useAnalysis();

  return (
    <div className="space-y-6">
      {/* Page Title & Context */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-3">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block">
            Executive Summary
          </span>
          <h1 className="font-serif text-[26px] font-medium text-ink leading-tight">
            eDNA Biodiversity Overview
          </h1>
        </div>
        <div className="text-[12px] font-mono text-ink-muted">
          Active Expedition: <span className="text-ink font-medium">{expedition.name}</span>
        </div>
      </div>

      {/* Main KPI Readout Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          eyebrow="Active ASVs"
          value={kpis.totalAsvs}
          meta={`n = ${kpis.totalReads.toLocaleString()} reads`}
          description="Total distinct Amplicon Sequence Variants detected across all sequenced environmental DNA samples."
        />
        <KPICard
          eyebrow={`Taxa Detected (${filters.taxonomicRank})`}
          value={kpis.taxaDetected}
          meta={`${kpis.siteCount} stations sampled`}
          description="Total unique biological taxa classified at the active taxonomic rank across sampled hydrographic stations."
        />
        <KPICard
          eyebrow="Shannon Diversity"
          value={kpis.shannonDiversity}
          unit="H'"
          meta="pooled regional diversity"
          description="Information-theoretic index (H') quantifying community biological richness and relative abundance equitability."
        />
        <KPICard
          eyebrow="Potentially Divergent Groups"
          value={kpis.potentiallyUnknownGroups}
          divergent={kpis.potentiallyUnknownGroups > 0}
          meta={`${expedition.clusters.length} diagnostic clusters`}
          description="Candidate evolutionary lineages exhibiting >12% nucleotide divergence from published reference barcodes."
        />
      </div>

      {/* Ocean Biodiversity Map (Primary Component — Full Workstation Width) */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-survey" />
            <h2 className="font-serif text-[18px] font-medium text-ink">
              Ocean Biodiversity Map
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('map')}
            className="text-[12px] font-mono text-survey hover:underline flex items-center gap-1"
          >
            <span>Full Screen Map</span>
            <ArrowRight size={13} />
          </button>
        </div>
        <HydrographicMap height="h-[520px]" />
        <p className="text-[12px] font-serif italic text-ink-faint">
          Fig. 1 — eDNA-derived ocean biodiversity distribution across sampled locations in {expedition.region}. Toggle between Nautical GIS projection, Station Grid, and K-mer Sequence Latent Manifold.
        </p>
      </div>
    </div>
  );
};
