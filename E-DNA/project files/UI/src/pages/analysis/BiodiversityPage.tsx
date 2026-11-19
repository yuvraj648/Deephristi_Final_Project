// ========================================================
// DEEPDRISHTI BIODIVERSITY ANALYSIS WORKSPACE
// Dedicated scientific tabs: ALPHA (α), BETA (β), and GAMMA (γ) diversity
// Features:
// - Interactive (i) Diversity Guide Modal for Alpha, Beta, and Gamma theory
// - Rich KPI cards with Meaning, Formula, and Ecological Interpretation
// - Interactive floating tooltips on all table header columns
// - Complete Whittaker diversity decomposition (γ = ᾱ × β)
// ========================================================

import React, { useState, useMemo } from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import { Plate } from '../../components/common/Plate';
import { KPICard } from '../../components/common/KPICard';
import {
  BookOpen,
  Info,
  X,
  Layers,
  Dna,
  Sparkles,
  Activity,
  CheckCircle2,
  Binary,
} from 'lucide-react';

// ── Reusable Interactive Table Header with Floating Tooltip ──────────────────
interface TableHeaderWithTooltipProps {
  label: string;
  align?: 'left' | 'right' | 'center';
  termTitle: string;
  meaning: string;
  formula?: string;
  interpretation?: string;
}

const TableHeaderWithTooltip: React.FC<TableHeaderWithTooltipProps> = ({
  label,
  align = 'left',
  termTitle,
  meaning,
  formula,
  interpretation,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <th
      className={`px-3 py-2.5 font-normal text-ink-muted relative group select-none ${
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
      }`}
    >
      <div
        className={`inline-flex items-center gap-1 cursor-help ${
          align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-mono text-[11px] group-hover:text-sky-300 transition-colors">
          {label}
        </span>
        <span
          className={`text-[10px] font-mono px-1 py-0.5 rounded transition-colors ${
            isOpen ? 'text-sky-400 bg-sky-950/60 font-bold' : 'text-ink-faint group-hover:text-sky-400'
          }`}
        >
          ⓘ
        </span>
      </div>

      {/* Floating Tooltip (Styled like Image 3 with high z-index) */}
      <div
        className={`absolute top-full mb-1 w-72 p-3 bg-[#050e18] border border-sky-500/40 text-white rounded-plate shadow-2xl transition-all z-50 text-left font-sans text-[11px] leading-snug space-y-1.5 ${
          align === 'right' ? 'right-0' : 'left-0'
        } ${
          isOpen
            ? 'opacity-100 pointer-events-auto block'
            : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto'
        }`}
      >
        <div className="flex items-center justify-between border-b border-rule/60 pb-1">
          <span className="font-mono text-[10px] text-sky-400 font-bold uppercase tracking-wider">
            {termTitle}
          </span>
          {isOpen && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="text-[10px] text-neutral-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        <div>
          <span className="text-sky-300 font-semibold font-mono text-[9px] uppercase tracking-wider block">
            Meaning:
          </span>
          <p className="text-neutral-200 text-[11px] leading-relaxed">{meaning}</p>
        </div>

        {formula && (
          <div className="p-1.5 bg-[#02070e] rounded border border-emerald-500/30">
            <span className="text-emerald-400 font-mono text-[9px] uppercase tracking-wider block font-semibold">
              Formula / Computation:
            </span>
            <code className="text-emerald-200 font-mono text-[10px] block pt-0.5 leading-tight">
              {formula}
            </code>
          </div>
        )}

        {interpretation && (
          <div>
            <span className="text-amber-300 font-semibold font-mono text-[9px] uppercase tracking-wider block">
              Ecological Interpretation:
            </span>
            <p className="text-neutral-300 text-[10px] leading-relaxed">{interpretation}</p>
          </div>
        )}
      </div>
    </th>
  );
};

export const BiodiversityPage: React.FC = () => {
  const { alphaDiversity, getBetaDiversity, getGammaDiversity, filters } = useAnalysis();
  const [activeTab, setActiveTab] = useState<'alpha' | 'beta' | 'gamma'>('alpha');
  const [showGuideModal, setShowGuideModal] = useState(false);

  const beta = getBetaDiversity();
  const gamma = getGammaDiversity();

  // Calculate Mean Alpha Richness for Whittaker decomposition
  const meanAlphaRichness = useMemo(() => {
    if (!alphaDiversity || alphaDiversity.length === 0) return 1;
    return (
      alphaDiversity.reduce((acc, a) => acc + a.observedRichness, 0) / alphaDiversity.length
    );
  }, [alphaDiversity]);

  // Beta Diversity Statistics
  const betaStats = useMemo(() => {
    if (!beta.cells || beta.cells.length === 0) {
      return {
        meanBray: 0,
        meanJaccard: 0,
        maxTurnoverPair: 'N/A',
        maxBrayVal: 0,
        avgSharedTaxa: 0,
      };
    }
    const sumBray = beta.cells.reduce((s, c) => s + c.brayCurtis, 0);
    const sumJaccard = beta.cells.reduce((s, c) => s + c.jaccard, 0);
    const sumShared = beta.cells.reduce((s, c) => s + c.sharedTaxaCount, 0);

    let maxCell = beta.cells[0];
    beta.cells.forEach((c) => {
      if (c.brayCurtis > maxCell.brayCurtis) {
        maxCell = c;
      }
    });

    return {
      meanBray: sumBray / beta.cells.length,
      meanJaccard: sumJaccard / beta.cells.length,
      maxTurnoverPair: `${maxCell.siteA.split(' - ')[0]} ↔ ${maxCell.siteB.split(' - ')[0]}`,
      maxBrayVal: maxCell.brayCurtis,
      avgSharedTaxa: Math.round(sumShared / beta.cells.length),
    };
  }, [beta.cells]);

  // Whittaker Multiplicative Beta Turnover: β = γ / ᾱ
  const whittakerBeta = useMemo(() => {
    if (meanAlphaRichness <= 0) return 1;
    return (gamma.totalObservedRichness / meanAlphaRichness).toFixed(2);
  }, [gamma.totalObservedRichness, meanAlphaRichness]);

  return (
    <div className="space-y-6">
      {/* ── Header, Theory Guide Button & Tab Selector ── */}
      <div className="flex flex-wrap items-center justify-between border-b border-rule pb-3 gap-3">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block">
            Ecological Metrics & Multi-Scale Partitioning
          </span>
          <h1 className="font-serif text-[26px] font-medium text-ink leading-tight">
            Biodiversity Indices
          </h1>
          <p className="text-[12px] text-ink-muted mt-0.5">
            Statistical characterization of biological richness, entropy, and spatial community turnover across sampled depths.
          </p>
        </div>

        {/* Action Controls: (i) Guide Button + Tab Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Prominent Diversity Theory Guide Button */}
          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded font-mono text-xs font-semibold shadow-md transition-all"
            title="Open comprehensive guide on Alpha, Beta, and Gamma diversity"
          >
            <BookOpen size={13} />
            <span>ⓘ Diversity Guide (α, β, γ)</span>
          </button>

          {/* Tab Controls */}
          <div className="flex border border-rule rounded-control overflow-hidden bg-paper font-mono text-[12px]">
            <button
              type="button"
              onClick={() => setActiveTab('alpha')}
              className={`px-3.5 py-1.5 uppercase tracking-wider transition-colors flex items-center gap-1 ${
                activeTab === 'alpha'
                  ? 'bg-survey text-white font-medium'
                  : 'text-ink-muted hover:text-ink hover:bg-paper-sunk'
              }`}
              title="Within-sample diversity (Observed Richness, Shannon, Simpson, Pielou)"
            >
              <span>Alpha Diversity (α)</span>
              <span className="text-[10px] opacity-75">ⓘ</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('beta')}
              className={`px-3.5 py-1.5 uppercase tracking-wider border-l border-rule transition-colors flex items-center gap-1 ${
                activeTab === 'beta'
                  ? 'bg-survey text-white font-medium'
                  : 'text-ink-muted hover:text-ink hover:bg-paper-sunk'
              }`}
              title="Between-sample community turnover (Bray-Curtis, Jaccard)"
            >
              <span>Beta Turnover (β)</span>
              <span className="text-[10px] opacity-75">ⓘ</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('gamma')}
              className={`px-3.5 py-1.5 uppercase tracking-wider border-l border-rule transition-colors flex items-center gap-1 ${
                activeTab === 'gamma'
                  ? 'bg-survey text-white font-medium'
                  : 'text-ink-muted hover:text-ink hover:bg-paper-sunk'
              }`}
              title="Regional pooled diversity across all stations (Whittaker decomposition)"
            >
              <span>Gamma Pool (γ)</span>
              <span className="text-[10px] opacity-75">ⓘ</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          TAB 1: ALPHA DIVERSITY (α)
          ======================================================== */}
      {activeTab === 'alpha' && (
        <div className="space-y-6">
          {/* Alpha Diversity KPI Strip with Rich (i) Hover & Click Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              eyebrow="Mean Observed Richness (S)"
              value={
                alphaDiversity.length > 0
                  ? Math.round(meanAlphaRichness)
                  : 0
              }
              unit="ASVs / sample"
              meta="sample mean"
              meaning="Total number of unique Amplicon Sequence Variants (ASVs) detected within an individual water sample."
              formula="S = Total distinct ASVs with sequence reads > 0"
              interpretation="Measures baseline local species richness. Higher values indicate species-rich, biodiverse water columns (e.g. coral reef edges or shelf mixing zones)."
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
              meaning="Information-theoretic entropy index quantifying biological richness and relative abundance uniformity simultaneously."
              formula="H' = - Σ [ p_i × ln(p_i) ] where p_i is relative taxon abundance"
              interpretation="Values typically range from 1.5 to 4.5. High Shannon (>3.5) reflects a well-balanced marine ecosystem; low values (<2.0) indicate dominance by bloom species."
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
              meaning="Probability that two randomly sampled DNA sequences belong to different biological taxa."
              formula="1 - D = 1 - Σ (p_i²)"
              interpretation="Ranges from 0 (monoculture) to 1.0 (infinitely diverse community). Values above 0.85 confirm high ecological diversity and resilience."
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
              meaning="Equitability index comparing actual observed Shannon entropy to the maximum possible entropy if all species were equally abundant."
              formula="J' = H' ÷ ln(S)"
              interpretation="Ranges from 0 to 1.0. A high ratio (>0.6) indicates reads are evenly spread across taxa without single-species monopolization."
            />
          </div>

          {/* Within-Sample Table with Floating Tooltips on Headers */}
          <Plate
            eyebrow="SPECIMEN READOUT"
            title="Within-Sample Alpha Diversity Table"
            meta={`n = ${alphaDiversity.length} samples`}
            figureCaption="Table 1 — Sample-level alpha diversity indices: observed richness (S), Shannon index (H'), Gini-Simpson index (1 - D), and Pielou's evenness (J'). Hover over or click column headers for statistical definitions."
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px] font-mono">
                <thead className="bg-paper-sunk border-b border-rule text-ink-muted">
                  <tr>
                    <TableHeaderWithTooltip
                      label="Sample ID"
                      termTitle="Sample Identifier"
                      meaning="Unique biological specimen code assigned during hydrographic Niskin bottle water collection."
                      formula="Expedition Cast + Sample Sequence Code"
                      interpretation="Identifies the precise physical water filter replicate."
                    />
                    <TableHeaderWithTooltip
                      label="Station / Site"
                      termTitle="Sampling Station"
                      meaning="Calibrated oceanographic hydrographic station along the expedition survey route."
                      interpretation="Enables geospatial mapping and depth transect correlation."
                    />
                    <TableHeaderWithTooltip
                      label="Depth"
                      align="right"
                      termTitle="Sampling Depth (m)"
                      meaning="Vertical water column depth in meters below sea surface."
                      interpretation="Categorizes vertical marine zones: Epipelagic (<200m), Mesopelagic (200-1000m), and Bathypelagic (>1000m)."
                    />
                    <TableHeaderWithTooltip
                      label="Observed Richness"
                      align="right"
                      termTitle="Observed ASV Richness (S)"
                      meaning="Total unique amplicon sequence variants detected in this specific specimen."
                      formula="S = Count of distinct ASVs"
                      interpretation="Direct count of taxonomic lineages present in the sampled water."
                    />
                    <TableHeaderWithTooltip
                      label="Shannon (H')"
                      align="right"
                      termTitle="Shannon Entropy Index (H')"
                      meaning="Entropy measure combining species count and relative abundance uniformity."
                      formula="H' = - Σ [ p_i × ln(p_i) ]"
                      interpretation="High values (>3.5) represent diverse, mature marine communities."
                    />
                    <TableHeaderWithTooltip
                      label="Simpson (1 - D)"
                      align="right"
                      termTitle="Gini-Simpson Diversity (1 - D)"
                      meaning="Probability that two randomly picked sequences represent different taxa."
                      formula="1 - D = 1 - Σ (p_i²)"
                      interpretation="接近 1.0 indicates community is not dominated by any single taxon."
                    />
                    <TableHeaderWithTooltip
                      label="Evenness (J')"
                      align="right"
                      termTitle="Pielou's Evenness (J')"
                      meaning="Ratio of observed Shannon diversity to maximal theoretical diversity."
                      formula="J' = H' ÷ ln(S)"
                      interpretation="Values near 1.0 denote balanced species populations without bloom dominance."
                    />
                    <TableHeaderWithTooltip
                      label="Total Reads"
                      align="right"
                      termTitle="Total Sequenced Reads"
                      meaning="Sum of high-quality amplicon reads mapped to classified ASVs in this sample."
                      formula="Total Reads = Σ Abundance of all ASVs"
                      interpretation="Provides sequencing depth verification for reliable abundance estimation."
                    />
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

      {/* ========================================================
          TAB 2: BETA DIVERSITY (β)
          ======================================================== */}
      {activeTab === 'beta' && (
        <div className="space-y-6">
          {/* Beta Diversity KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              eyebrow="Mean Bray-Curtis"
              value={betaStats.meanBray.toFixed(2)}
              meta="abundance dissimilarity"
              meaning="Average compositional dissimilarity across all hydrographic station pairs, weighted by relative taxa abundance."
              formula="BC = 1 - [ (2 × Σ min(x_Ai, x_Bi)) ÷ (Total_A + Total_B) ]"
              interpretation="0.0 = identical communities; 1.0 = completely disjoint communities. High values (>0.70) reveal pronounced community turnover across stations."
            />
            <KPICard
              eyebrow="Mean Jaccard Distance"
              value={betaStats.meanJaccard.toFixed(2)}
              meta="presence/absence turnover"
              meaning="Average taxonomic turnover rate based solely on whether species are present or absent, ignoring sequence read counts."
              formula="Jaccard = 1 - [ Shared ÷ (Site A + Site B - Shared) ]"
              interpretation="Measures true species replacement across depth and geographic distance regardless of read depth."
            />
            <KPICard
              eyebrow="Highest Turnover Pair"
              value={betaStats.maxBrayVal.toFixed(2)}
              unit="BC"
              meta={betaStats.maxTurnoverPair}
              meaning="The pair of oceanographic stations exhibiting the greatest biological divergence in community composition."
              formula="Max [ BC(Site_i, Site_j) ] across all pairs"
              interpretation="Identifies key environmental transition boundaries (e.g. shallow shelf waters vs bathypelagic deep trench)."
            />
            <KPICard
              eyebrow="Avg Shared Taxa"
              value={betaStats.avgSharedTaxa}
              unit="taxa"
              meta="core community overlap"
              meaning="Average number of biological taxa that persist and occur simultaneously across sampled station pairs."
              formula="Mean [ Shared Taxa Count between Site A and Site B ]"
              interpretation="Represents ubiquitous ecological generalists that maintain marine ecosystem stability."
            />
          </div>

          <Plate
            eyebrow="COMMUNITY DISSIMILARITY"
            title="Pairwise Bray-Curtis & Jaccard Matrix"
            meta={`${beta.sites.length} stations cross-compared`}
            figureCaption="Table 2 — Pairwise community dissimilarity: Bray-Curtis dissimilarity (abundance-weighted) and Jaccard distance (presence/absence turnover). Hover over or click column headers for mathematical details."
          >
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-[12px] font-mono">
                <thead className="bg-paper-sunk border-b border-rule text-ink-muted sticky top-0">
                  <tr>
                    <TableHeaderWithTooltip
                      label="Station Pair"
                      termTitle="Hydrographic Station Pair"
                      meaning="Two oceanographic sampling stations compared for community composition and species turnover."
                      interpretation="Reveals biological divergence across depth or geographic distance."
                    />
                    <TableHeaderWithTooltip
                      label="Bray-Curtis Dissimilarity"
                      align="right"
                      termTitle="Bray-Curtis Dissimilarity (BC)"
                      meaning="Abundance-weighted distance metric quantifying how dissimilar two stations are in species counts."
                      formula="BC_ij = 1 - [ (2 × C_ij) ÷ (S_i + S_j) ]"
                      interpretation="0 = identical species abundance; 1 = zero shared species between stations."
                    />
                    <TableHeaderWithTooltip
                      label="Jaccard Distance"
                      align="right"
                      termTitle="Jaccard Distance (J)"
                      meaning="Turnover metric evaluating species replacement based strictly on presence/absence."
                      formula="Jaccard = 1 - [ Shared ÷ (Site A + Site B - Shared) ]"
                      interpretation="Pure species turnover independent of sequencing read depth."
                    />
                    <TableHeaderWithTooltip
                      label="Shared Taxa"
                      align="right"
                      termTitle="Shared Taxa Count"
                      meaning="Number of distinct biological taxa present at both sampling stations."
                      interpretation="Measures the common core assemblage connecting the two sites."
                    />
                    <TableHeaderWithTooltip
                      label="Unique to Site A"
                      align="right"
                      termTitle="Taxa Restricted to Site A"
                      meaning="Number of biological taxa detected strictly at Station A and absent from Station B."
                      interpretation="Reflects local habitat specialists or localized environmental adaptations."
                    />
                    <TableHeaderWithTooltip
                      label="Unique to Site B"
                      align="right"
                      termTitle="Taxa Restricted to Site B"
                      meaning="Number of biological taxa detected strictly at Station B and absent from Station A."
                      interpretation="Reflects species replacement on the opposite side of the environmental gradient."
                    />
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

      {/* ========================================================
          TAB 3: GAMMA POOL (γ)
          ======================================================== */}
      {activeTab === 'gamma' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              eyebrow="Total Regional Observed Richness"
              value={gamma.totalObservedRichness}
              unit="ASVs"
              meta="gamma pool richness"
              meaning="Total unique Amplicon Sequence Variants cataloged across the entire regional expedition transect."
              formula="γ = Total unique ASVs in pooled dataset"
              interpretation="Represents the macro-scale genetic reservoir of the surveyed ocean basin."
            />
            <KPICard
              eyebrow="Total Distinct Taxa"
              value={gamma.totalTaxaCount}
              meta={`at ${filters.taxonomicRank} rank`}
              meaning="Total unique Linnaean biological taxa classified at the active taxonomic rank across all stations."
              formula="Count of unique classified taxonomic names"
              interpretation="Quantifies high-level phylogenetic richness across the ocean region."
            />
            <KPICard
              eyebrow="Regional Pooled Shannon"
              value={gamma.regionalShannon}
              unit="H'"
              meta="across all stations"
              meaning="Regional-scale Shannon diversity index computed by pooling all reads across all stations simultaneously."
              formula="H'_gamma = - Σ [ P_global × ln(P_global) ]"
              interpretation="Reflects the overall biodiversity capacity and ecosystem maturity of the broad marine basin."
            />
            <KPICard
              eyebrow="Whittaker Turnover Ratio"
              value={whittakerBeta}
              unit="β"
              meta="regional expansion factor"
              meaning="Whittaker's multiplicative beta diversity ratio comparing regional richness to local average sample richness."
              formula="β_Whittaker = Gamma Richness (γ) ÷ Mean Alpha Richness (ᾱ)"
              interpretation="Values significantly greater than 1.0 indicate strong spatial and depth-wise species turnover across the ocean."
            />
          </div>

          <Plate
            eyebrow="REGIONAL DISCOVERY"
            title="Gamma Biodiversity Summary & Lineage Saturation"
            figureCaption="Fig. 1 — Regional gamma diversity synthesis representing pooled biodiversity across all bathymetric stations."
          >
            <div className="p-4 space-y-3 font-sans text-[13px] text-ink-muted leading-relaxed">
              <p>
                Regional gamma diversity integrates all distinct Amplicon Sequence Variants across the study transect ({filters.taxonomicRank} rank). The observed total richness stands at <span className="font-mono text-ink font-semibold">{gamma.totalObservedRichness} ASVs</span> across <span className="font-mono text-ink font-semibold">{gamma.totalAbundance.toLocaleString()} total sequenced reads</span>.
              </p>
              <p>
                The Whittaker community turnover ratio of <span className="font-mono text-survey font-bold">{whittakerBeta} β</span> indicates that regional richness is over {whittakerBeta}× higher than the average local sample richness (<span className="font-mono text-ink font-semibold">{Math.round(meanAlphaRichness)} ASVs</span>). This reflects substantial vertical stratification across depth gradients between epipelagic shelf waters, the Oxygen Minimum Zone (OMZ), and the bathyal slope.
              </p>
            </div>
          </Plate>
        </div>
      )}

      {/* ========================================================
          ECOLOGICAL DIVERSITY GUIDE MODAL (α, β, γ EXPLAINED)
          (z-[99999] prevents any map overlap or bleed-through)
          ======================================================== */}
      {showGuideModal && (
        <div
          className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex justify-center items-start overflow-y-auto p-4 pt-16 sm:pt-20 pb-12"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGuideModal(false);
          }}
        >
          <div className="bg-[#05080E] border border-rule/80 rounded-plate max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl font-sans relative my-auto">
            {/* Pinned Modal Header */}
            <div className="p-5 border-b border-rule flex items-start justify-between bg-[#05080E] rounded-t-plate flex-shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wider border border-sky-500/40 text-sky-400 bg-sky-950/40">
                    ECOLOGICAL DIVERSITY METRICS
                  </span>
                  <span className="text-xs font-mono text-ink-muted">
                    Whittaker Partitioning Framework
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white font-serif">
                  Understanding Alpha (α), Beta (β), and Gamma (γ) Diversity
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Scientific meaning, mathematical formulation, and practical marine interpretation.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-control text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Whittaker Equation Banner */}
              <div className="p-4 bg-sky-950/30 rounded border border-sky-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase text-sky-400">
                  <Sparkles size={15} />
                  <span>Whittaker's Biodiversity Decomposition Theorem</span>
                </div>
                <div className="p-2.5 bg-[#030a13] rounded border border-sky-500/20 text-center font-mono text-sm text-sky-300 font-bold">
                  Gamma Diversity (γ) = Mean Alpha Diversity (ᾱ) × Beta Turnover (β)
                </div>
                <p className="text-xs text-neutral-200 leading-relaxed font-sans">
                  In simple words: <strong>Alpha</strong> is the species diversity in a single drop of water / one station; <strong>Beta</strong> is how much the species change as you travel between stations or dive deeper; and <strong>Gamma</strong> is the complete species pool of the entire ocean region.
                </p>
              </div>

              {/* 3 Pillar Cards (Alpha, Beta, Gamma) */}
              <div className="space-y-4">
                {/* Alpha Card */}
                <div className="p-4 bg-paper-sunk rounded border border-rule space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-sky-900/50 text-sky-300 font-mono text-[10px] font-bold border border-sky-700">
                        ALPHA (α)
                      </span>
                      <h3 className="text-sm font-bold text-white">
                        Within-Sample Local Diversity
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold">Local Site Level</span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    <strong>What it means:</strong> Measures the biological richness and community balance at one specific sampling location or water sample.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                    <div className="p-2 bg-[#050f1e] rounded border border-rule/60">
                      <span className="text-sky-300 font-bold block">Shannon Index (H')</span>
                      <span className="text-neutral-300 font-sans text-[10px]">Quantifies biological entropy. Higher values mean higher richness and abundance balance.</span>
                    </div>
                    <div className="p-2 bg-[#050f1e] rounded border border-rule/60">
                      <span className="text-sky-300 font-bold block">Simpson (1 - D)</span>
                      <span className="text-neutral-300 font-sans text-[10px]">Probability two random DNA reads differ. Measures resistance to single-species dominance.</span>
                    </div>
                  </div>
                </div>

                {/* Beta Card */}
                <div className="p-4 bg-paper-sunk rounded border border-rule space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-900/50 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-700">
                        BETA (β)
                      </span>
                      <h3 className="text-sm font-bold text-white">
                        Between-Site Community Turnover
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold">Spatial & Depth Gradient</span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    <strong>What it means:</strong> Measures how much the species composition changes when you travel from one station to another, or from shallow waters into the deep bathypelagic abyss.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                    <div className="p-2 bg-[#050f1e] rounded border border-rule/60">
                      <span className="text-emerald-300 font-bold block">Bray-Curtis Dissimilarity</span>
                      <span className="text-neutral-300 font-sans text-[10px]">Abundance-weighted distance (0 = identical; 1 = completely different species).</span>
                    </div>
                    <div className="p-2 bg-[#050f1e] rounded border border-rule/60">
                      <span className="text-emerald-300 font-bold block">Jaccard Distance</span>
                      <span className="text-neutral-300 font-sans text-[10px]">Presence/absence turnover evaluating pure species replacement.</span>
                    </div>
                  </div>
                </div>

                {/* Gamma Card */}
                <div className="p-4 bg-paper-sunk rounded border border-rule space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-purple-900/50 text-purple-300 font-mono text-[10px] font-bold border border-purple-700">
                        GAMMA (γ)
                      </span>
                      <h3 className="text-sm font-bold text-white">
                        Total Regional Species Pool
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-purple-400 font-semibold">Broad Regional Biome</span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    <strong>What it means:</strong> Represents the total cumulative biodiversity cataloged across all sampled locations in the entire Arabian Sea study region.
                  </p>
                  <div className="p-2 bg-[#050f1e] rounded border border-rule/60 text-[11px] font-mono">
                    <span className="text-purple-300 font-bold block">Whittaker Ratio (β = γ / ᾱ)</span>
                    <span className="text-neutral-300 font-sans text-[10px]">
                      Current expedition ratio: <strong>{whittakerBeta}×</strong>. Indicates regional richness is {whittakerBeta} times higher than average local samples due to strong environmental depth partitioning.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pinned Modal Footer */}
            <div className="px-5 py-3.5 border-t border-rule flex justify-between items-center bg-[#05080E] rounded-b-plate flex-shrink-0">
              <span className="text-[10px] font-mono text-ink-faint">
                SCIENTIFIC CALIBRATION • DEEPDRISHTI ECOLOGICAL ENGINE
              </span>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded font-semibold text-xs transition-colors shadow-md"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
