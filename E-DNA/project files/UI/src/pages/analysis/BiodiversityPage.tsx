// ========================================================
// DEEPDRISHTI BIODIVERSITY ANALYSIS WORKSPACE
// Dedicated scientific tabs: ALPHA, BETA, and GAMMA diversity
// Pure ecological metrics: Shannon, Simpson, Pielou, Bray-Curtis, Jaccard
// ========================================================

import React, { useState } from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import { Plate } from '../../components/common/Plate';
import { KPICard } from '../../components/common/KPICard';

export const BiodiversityPage: React.FC = () => {
  const { alphaDiversity, getBetaDiversity, getGammaDiversity, filters } = useAnalysis();
  const [activeTab, setActiveTab] = useState<'alpha' | 'beta' | 'gamma'>('alpha');

  const beta = getBetaDiversity();
  const gamma = getGammaDiversity();

  return (
    <div className="space-y-6">
      {/* Header & Tab Selector */}
      <div className="flex flex-wrap items-center justify-between border-b border-rule pb-3 gap-3">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block">
            Ecological Metrics
          </span>
          <h1 className="font-serif text-[26px] font-medium text-ink leading-tight">
            Biodiversity Indices
          </h1>
        </div>

        {/* Tab Controls */}
        <div className="flex border border-rule rounded-control overflow-hidden bg-paper font-mono text-[12px]">
          <button
            type="button"
            onClick={() => setActiveTab('alpha')}
            className={`px-4 py-1.5 uppercase tracking-wider transition-colors ${
              activeTab === 'alpha'
                ? 'bg-survey text-white font-medium'
                : 'text-ink-muted hover:text-ink hover:bg-paper-sunk'
            }`}
          >
            Alpha Diversity (α)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('beta')}
            className={`px-4 py-1.5 uppercase tracking-wider border-l border-rule transition-colors ${
              activeTab === 'beta'
                ? 'bg-survey text-white font-medium'
                : 'text-ink-muted hover:text-ink hover:bg-paper-sunk'
            }`}
          >
            Beta Turnover (β)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gamma')}
            className={`px-4 py-1.5 uppercase tracking-wider border-l border-rule transition-colors ${
              activeTab === 'gamma'
                ? 'bg-survey text-white font-medium'
                : 'text-ink-muted hover:text-ink hover:bg-paper-sunk'
            }`}
          >
            Gamma Pool (γ)
          </button>
        </div>
      </div>

      {/* TAB 1: ALPHA DIVERSITY */}
      {activeTab === 'alpha' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KPICard
              eyebrow="Mean Observed Richness (S)"
              value={
                alphaDiversity.length > 0
                  ? Math.round(
                      alphaDiversity.reduce((acc, a) => acc + a.observedRichness, 0) /
                        alphaDiversity.length
                    )
                  : 0
              }
              unit="ASVs / sample"
              meta="sample mean"
            />
            <KPICard
              eyebrow="Mean Shannon Index (H')"
              value={
                alphaDiversity.length > 0
                  ? (
                      alphaDiversity.reduce((acc, a) => acc + a.shannon, 0) / alphaDiversity.length
                    ).toFixed(2)
                  : 'N/A'
              }
              unit="nats"
              meta="entropy measure"
            />
            <KPICard
              eyebrow="Mean Simpson (1 - D)"
              value={
                alphaDiversity.length > 0
                  ? (
                      alphaDiversity.reduce((acc, a) => acc + a.simpson, 0) / alphaDiversity.length
                    ).toFixed(2)
                  : 'N/A'
              }
              meta="Gini-Simpson index"
            />
            <KPICard
              eyebrow="Mean Pielou Evenness (J')"
              value={
                alphaDiversity.length > 0
                  ? (
                      alphaDiversity.reduce((acc, a) => acc + a.pielouEvenness, 0) /
                      alphaDiversity.length
                    ).toFixed(2)
                  : 'N/A'
              }
              meta="evenness ratio"
            />
          </div>

          <Plate
            eyebrow="SPECIMEN READOUT"
            title="Within-Sample Alpha Diversity Table"
            meta={`n = ${alphaDiversity.length} samples`}
            figureCaption="Table 1 — Sample-level alpha diversity indices: observed richness (S), Shannon index (H'), Gini-Simpson index (1 - D), and Pielou's evenness (J')."
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px] font-mono">
                <thead className="bg-paper-sunk border-b border-rule text-ink-muted">
                  <tr>
                    <th className="px-3 py-2 font-normal">Sample ID</th>
                    <th className="px-3 py-2 font-normal">Station / Site</th>
                    <th className="px-3 py-2 font-normal text-right">Depth</th>
                    <th className="px-3 py-2 font-normal text-right">Observed Richness</th>
                    <th className="px-3 py-2 font-normal text-right">Shannon (H')</th>
                    <th className="px-3 py-2 font-normal text-right">Simpson (1 - D)</th>
                    <th className="px-3 py-2 font-normal text-right">Evenness (J')</th>
                    <th className="px-3 py-2 font-normal text-right">Total Reads</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule bg-paper-raised">
                  {alphaDiversity.map((item) => (
                    <tr key={item.sample_id} className="hover:bg-paper-sunk/30">
                      <td className="px-3 py-2 font-semibold text-ink">{item.sample_id}</td>
                      <td className="px-3 py-2 text-ink-muted">{item.site}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {item.depth !== undefined ? `${item.depth}m` : 'N/A'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-ink">
                        {item.observedRichness}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-survey font-medium">
                        {item.shannon.toFixed(3)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink">
                        {item.simpson.toFixed(3)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-muted">
                        {item.pielouEvenness.toFixed(3)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink">
                        {item.totalAbundance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Plate>
        </div>
      )}

      {/* TAB 2: BETA DIVERSITY */}
      {activeTab === 'beta' && (
        <div className="space-y-6">
          <Plate
            eyebrow="COMMUNITY DISSIMILARITY"
            title="Pairwise Bray-Curtis & Jaccard Matrix"
            meta={`${beta.sites.length} stations cross-compared`}
            figureCaption="Table 2 — Pairwise community dissimilarity: Bray-Curtis dissimilarity (abundance-weighted) and Jaccard distance (presence/absence turnover)."
          >
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-[12px] font-mono">
                <thead className="bg-paper-sunk border-b border-rule text-ink-muted sticky top-0">
                  <tr>
                    <th className="px-3 py-2 font-normal">Station Pair</th>
                    <th className="px-3 py-2 font-normal text-right">Bray-Curtis Dissimilarity</th>
                    <th className="px-3 py-2 font-normal text-right">Jaccard Distance</th>
                    <th className="px-3 py-2 font-normal text-right">Shared Taxa</th>
                    <th className="px-3 py-2 font-normal text-right">Unique to Site A</th>
                    <th className="px-3 py-2 font-normal text-right">Unique to Site B</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule bg-paper-raised">
                  {beta.cells.map((cell, idx) => (
                    <tr key={idx} className="hover:bg-paper-sunk/30">
                      <td className="px-3 py-2 text-ink font-medium">
                        {cell.siteA.split(' - ')[0]} <span className="text-ink-faint">↔</span> {cell.siteB.split(' - ')[0]}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-survey font-semibold">
                        {cell.brayCurtis.toFixed(3)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink">
                        {cell.jaccard.toFixed(3)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-biological font-medium">
                        {cell.sharedTaxaCount}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-muted">
                        {cell.uniqueTaxaSiteA}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-muted">
                        {cell.uniqueTaxaSiteB}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Plate>
        </div>
      )}

      {/* TAB 3: GAMMA POOL */}
      {activeTab === 'gamma' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KPICard
              eyebrow="Total Regional Observed Richness"
              value={gamma.totalObservedRichness}
              unit="ASVs"
              meta="gamma pool richness"
            />
            <KPICard
              eyebrow="Total Distinct Taxa"
              value={gamma.totalTaxaCount}
              meta={`at ${filters.taxonomicRank} rank`}
            />
            <KPICard
              eyebrow="Regional Pooled Shannon"
              value={gamma.regionalShannon}
              unit="H'"
              meta="across all stations"
            />
          </div>

          <Plate
            eyebrow="REGIONAL DISCOVERY"
            title="Gamma Biodiversity Summary & Lineage Saturation"
            figureCaption="Fig. 2 — Regional gamma diversity synthesis representing pooled biodiversity across all bathymetric stations."
          >
            <div className="p-4 space-y-3 font-sans text-[13px] text-ink-muted leading-relaxed">
              <p>
                Regional gamma diversity integrates all distinct Amplicon Sequence Variants across the study transect ({filters.taxonomicRank} rank). The observed total richness stands at <span className="font-mono text-ink font-semibold">{gamma.totalObservedRichness} ASVs</span> across <span className="font-mono text-ink font-semibold">{gamma.totalAbundance.toLocaleString()} total sequenced reads</span>.
              </p>
              <p>
                The ratio between gamma richness and average local alpha richness reflects substantial community turnover across the depth gradient, indicating distinct vertical stratification between epipelagic shelf waters, the Oxygen Minimum Zone (OMZ), and the bathyal slope.
              </p>
            </div>
          </Plate>
        </div>
      )}
    </div>
  );
};
