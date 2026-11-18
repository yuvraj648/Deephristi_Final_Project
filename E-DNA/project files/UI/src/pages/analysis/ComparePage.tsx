// ========================================================
// DEEPDRISHTI SAMPLE & COMMUNITY COMPARISON PAGE
// Interactive multi-site contrast: composition turnover,
// Bray-Curtis dissimilarity, Jaccard distance, shared vs unique taxa.
// Supports comparing any subset from 2 to ALL available stations.
// ========================================================

import React, { useState, useMemo } from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import { Plate } from '../../components/common/Plate';
import {
  CheckSquare,
  Square,
  Search,
  CheckCheck,
  RotateCcw,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  BarChart2,
  Layers,
} from 'lucide-react';

export const ComparePage: React.FC = () => {
  const { siteProfiles, filters, getBetaDiversity } = useAnalysis();

  const allSites = useMemo(() => siteProfiles.map((s) => s.site), [siteProfiles]);
  // Default to first four sites or all if <= 4
  const [selectedSites, setSelectedSites] = useState<string[]>(
    allSites.slice(0, Math.min(4, allSites.length))
  );

  // Search filter for station selection pills
  const [stationSearch, setStationSearch] = useState('');
  // Filter for pairwise comparison table
  const [pairSearch, setPairSearch] = useState('');
  // Sorting for pairwise table
  const [sortBy, setSortBy] = useState<'bray_desc' | 'bray_asc' | 'jaccard_desc' | 'shared_desc'>('bray_desc');
  // Pagination for pairwise table
  const [page, setPage] = useState(1);
  const rowsPerPage = 15;

  // Dossier expansion toggle
  const [showAllDossiers, setShowAllDossiers] = useState(false);
  const dossierLimit = showAllDossiers ? selectedSites.length : 8;

  const toggleSite = (site: string) => {
    if (selectedSites.includes(site)) {
      if (selectedSites.length > 2) {
        setSelectedSites(selectedSites.filter((s) => s !== site));
      }
    } else {
      setSelectedSites([...selectedSites, site]);
    }
  };

  const selectAll = () => {
    setSelectedSites([...allSites]);
  };

  const resetToFirstFour = () => {
    setSelectedSites(allSites.slice(0, Math.min(4, allSites.length)));
  };

  const comparedProfiles = useMemo(() => {
    return siteProfiles.filter((s) => selectedSites.includes(s.site));
  }, [siteProfiles, selectedSites]);

  const beta = getBetaDiversity();

  // Find pairwise comparisons between selected sites
  const relevantPairs = useMemo(() => {
    return beta.cells.filter(
      (c) => selectedSites.includes(c.siteA) && selectedSites.includes(c.siteB)
    );
  }, [beta.cells, selectedSites]);

  // Filtered and sorted pairs
  const sortedPairs = useMemo(() => {
    let result = [...relevantPairs];
    if (pairSearch.trim()) {
      const q = pairSearch.toLowerCase();
      result = result.filter(
        (p) => p.siteA.toLowerCase().includes(q) || p.siteB.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'bray_desc':
          return b.brayCurtis - a.brayCurtis;
        case 'bray_asc':
          return a.brayCurtis - b.brayCurtis;
        case 'jaccard_desc':
          return b.jaccard - a.jaccard;
        case 'shared_desc':
          return b.sharedTaxaCount - a.sharedTaxaCount;
        default:
          return 0;
      }
    });

    return result;
  }, [relevantPairs, pairSearch, sortBy]);

  // Paginated pairs
  const totalPages = Math.ceil(sortedPairs.length / rowsPerPage) || 1;
  const paginatedPairs = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return sortedPairs.slice(start, start + rowsPerPage);
  }, [sortedPairs, page, rowsPerPage]);

  // Summary statistics for the selected cohort
  const cohortStats = useMemo(() => {
    if (comparedProfiles.length === 0) {
      return { totalReads: 0, avgShannon: 0, avgBray: 0 };
    }
    const totalReads = comparedProfiles.reduce((acc, p) => acc + p.totalAbundance, 0);
    const avgShannon = (
      comparedProfiles.reduce((acc, p) => acc + p.shannon, 0) / comparedProfiles.length
    ).toFixed(2);
    const avgBray = relevantPairs.length
      ? (
          relevantPairs.reduce((acc, p) => acc + p.brayCurtis, 0) / relevantPairs.length
        ).toFixed(3)
      : '0.000';

    return { totalReads, avgShannon, avgBray };
  }, [comparedProfiles, relevantPairs]);

  // Filtered station list for buttons
  const filteredStationPills = useMemo(() => {
    if (!stationSearch.trim()) return allSites;
    const q = stationSearch.toLowerCase();
    return allSites.filter((s) => s.toLowerCase().includes(q));
  }, [allSites, stationSearch]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-3">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block">
            Multi-Station Contrast & Turnover Analysis
          </span>
          <h1 className="font-serif text-[26px] font-medium text-ink leading-tight">
            Compare Marine Communities
          </h1>
          <p className="text-[13px] text-ink-muted mt-1">
            Quantify ecological turnover, community dissimilarity, and shared vs unique taxonomic groups across any combination of sampled stations.
          </p>
        </div>
        <div className="text-[12px] font-mono text-ink-muted bg-paper-sunk px-3 py-1.5 rounded-control border border-rule">
          Comparing <strong className="text-ink">{selectedSites.length}</strong> of{' '}
          <strong className="text-ink">{allSites.length}</strong> stations
        </div>
      </div>

      {/* Cohort Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-paper-raised border border-rule rounded-plate">
          <span className="text-[10px] font-mono uppercase tracking-wider text-ink-faint block">
            Selected Stations
          </span>
          <span className="font-serif text-[20px] font-medium text-ink">
            {selectedSites.length}
            <span className="text-[12px] font-mono text-ink-muted font-normal"> / {allSites.length}</span>
          </span>
        </div>
        <div className="p-3 bg-paper-raised border border-rule rounded-plate">
          <span className="text-[10px] font-mono uppercase tracking-wider text-ink-faint block">
            Pooled Cohort Reads
          </span>
          <span className="font-serif text-[20px] font-medium text-ink tabular-nums">
            {cohortStats.totalReads.toLocaleString()}
          </span>
        </div>
        <div className="p-3 bg-paper-raised border border-rule rounded-plate">
          <span className="text-[10px] font-mono uppercase tracking-wider text-ink-faint block">
            Mean Shannon Index
          </span>
          <span className="font-serif text-[20px] font-medium text-survey tabular-nums">
            {cohortStats.avgShannon}{' '}
            <span className="text-[12px] font-mono text-ink-muted font-normal">H'</span>
          </span>
        </div>
        <div className="p-3 bg-paper-raised border border-rule rounded-plate">
          <span className="text-[10px] font-mono uppercase tracking-wider text-ink-faint block">
            Pairwise Combinations
          </span>
          <span className="font-serif text-[20px] font-medium text-aubergine tabular-nums">
            {relevantPairs.length}
            <span className="text-[12px] font-mono text-ink-muted font-normal"> contrasts</span>
          </span>
        </div>
      </div>

      {/* Station Selector Bar with Full Capacity & Controls */}
      <div className="p-4 bg-paper-raised border border-rule rounded-plate space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink font-semibold">
              Select Stations to Cross-Examine:
            </span>
            <span className="text-[11px] font-mono text-ink-muted">
              ({selectedSites.length} selected)
            </span>
          </div>

          {/* Quick Selection Actions */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <button
              type="button"
              onClick={selectAll}
              className="px-2.5 py-1 bg-paper hover:bg-paper-sunk border border-rule text-ink rounded-control flex items-center gap-1 transition-colors"
            >
              <CheckCheck size={12} className="text-survey" />
              <span>Select All Stations ({allSites.length})</span>
            </button>
            <button
              type="button"
              onClick={resetToFirstFour}
              className="px-2.5 py-1 bg-paper hover:bg-paper-sunk border border-rule text-ink rounded-control flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={12} className="text-ink-muted" />
              <span>Reset to First 4</span>
            </button>
            <div className="relative min-w-[140px] max-w-[200px]">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="text"
                value={stationSearch}
                onChange={(e) => setStationSearch(e.target.value)}
                placeholder="Find station..."
                className="w-full bg-paper border border-rule focus:border-survey rounded-control pl-7 pr-2 py-1 text-[11px] text-ink placeholder:text-ink-faint focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Station Pills Scrollable Strip */}
        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
          {filteredStationPills.map((site) => {
            const isSelected = selectedSites.includes(site);
            return (
              <button
                key={site}
                type="button"
                onClick={() => toggleSite(site)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-control font-mono text-[11px] border transition-all ${
                  isSelected
                    ? 'bg-survey text-white border-survey font-medium shadow-sm'
                    : 'bg-paper text-ink border-rule hover:border-rule-strong hover:bg-paper-sunk'
                }`}
                title={site}
              >
                {isSelected ? <CheckSquare size={12} /> : <Square size={12} />}
                <span className="truncate max-w-[150px]">{site.split(' - ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Side-by-Side Station Dossiers */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[12px] font-mono text-ink-muted">
          <span>
            Displaying {Math.min(dossierLimit, comparedProfiles.length)} of {comparedProfiles.length} station dossiers
          </span>
          {comparedProfiles.length > 8 && (
            <button
              type="button"
              onClick={() => setShowAllDossiers(!showAllDossiers)}
              className="text-survey hover:underline font-medium"
            >
              {showAllDossiers ? 'Collapse to First 8' : `Show All ${comparedProfiles.length} Dossiers`}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {comparedProfiles.slice(0, dossierLimit).map((p) => (
            <div
              key={p.site}
              className="p-4 bg-paper-raised border border-rule rounded-plate flex flex-col justify-between space-y-3 shadow-sm hover:border-rule-strong transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-ink-faint uppercase block">Station Dossier</span>
                  <button
                    type="button"
                    onClick={() => toggleSite(p.site)}
                    disabled={selectedSites.length <= 2}
                    className="text-[10px] font-mono text-ink-faint hover:text-error disabled:opacity-30"
                    title="Remove from comparison"
                  >
                    Remove
                  </button>
                </div>
                <h3 className="font-serif text-[15px] font-medium text-ink truncate mb-2" title={p.site}>
                  {p.site}
                </h3>
                <div className="space-y-1 font-mono text-[11px] border-t border-rule pt-2 text-ink-muted">
                  <div className="flex justify-between">
                    <span>Depths:</span>
                    <span className="text-ink font-semibold">
                      {p.depths.length > 0 ? p.depths.map((d) => `${d}m`).join(', ') : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Observed ASVs:</span>
                    <span className="text-ink font-semibold">{p.asvCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shannon (H'):</span>
                    <span className="text-survey font-semibold">{p.shannon}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Reads:</span>
                    <span className="text-ink tabular-nums">{p.totalAbundance.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-rule pt-2">
                <span className="text-[10px] font-mono uppercase text-ink-faint block mb-1">
                  Dominant Detected Taxa
                </span>
                <ul className="text-[11px] font-mono text-ink space-y-0.5">
                  {p.dominantTaxa.slice(0, 3).map((d, i) => (
                    <li key={i} className="flex justify-between">
                      <span className="truncate max-w-[120px]">{d.taxon}</span>
                      <span className="text-ink-muted">{d.percentage}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pairwise Dissimilarity Metrics Table with Full Capacity & Controls */}
      <Plate
        eyebrow="CROSS-STATION STATISTICS"
        title={`Beta Dissimilarity & Taxa Overlap Matrix (${relevantPairs.length} Pairs)`}
        meta={`Taxonomic Rank: ${filters.taxonomicRank}`}
        figureCaption="Table 1 — Quantified ecological turnover across all selected stations: Bray-Curtis dissimilarity, Jaccard distance, shared taxa count, and unique taxa pools."
      >
        {relevantPairs.length === 0 ? (
          <div className="py-8 text-center text-ink-faint font-mono text-[12px]">
            Please select at least 2 stations to calculate pairwise turnover.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Table Controls (Search, Sort, Count) */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
              <div className="flex items-center gap-2">
                <span className="text-ink-faint uppercase">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as any);
                    setPage(1);
                  }}
                  className="bg-paper border border-rule text-ink py-1 px-2 rounded-control focus:border-survey focus:outline-none"
                >
                  <option value="bray_desc">Bray-Curtis (High → Low Dissimilarity)</option>
                  <option value="bray_asc">Bray-Curtis (Low → High Dissimilarity)</option>
                  <option value="jaccard_desc">Jaccard Distance (High → Low)</option>
                  <option value="shared_desc">Shared Taxa (Most Shared)</option>
                </select>
              </div>

              <div className="relative min-w-[180px]">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type="text"
                  value={pairSearch}
                  onChange={(e) => {
                    setPairSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Filter contrasts..."
                  className="w-full bg-paper border border-rule focus:border-survey rounded-control pl-7 pr-2 py-1 text-[11px] text-ink placeholder:text-ink-faint focus:outline-none"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-rule rounded-control">
              <table className="w-full text-left text-[12px] font-mono">
                <thead className="bg-paper-sunk border-b border-rule text-ink-muted">
                  <tr>
                    <th className="px-3 py-2 font-normal">Station Contrast</th>
                    <th className="px-3 py-2 font-normal text-right">Bray-Curtis (Abundance)</th>
                    <th className="px-3 py-2 font-normal text-right">Jaccard (Presence/Absence)</th>
                    <th className="px-3 py-2 font-normal text-right">Shared Taxa Count</th>
                    <th className="px-3 py-2 font-normal text-right">Unique to Site A</th>
                    <th className="px-3 py-2 font-normal text-right">Unique to Site B</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule bg-paper-raised">
                  {paginatedPairs.map((p, idx) => (
                    <tr key={idx} className="hover:bg-paper-sunk/30">
                      <td className="px-3 py-2 font-medium text-ink">
                        {p.siteA.split(' - ')[0]} <span className="text-ink-faint">vs</span> {p.siteB.split(' - ')[0]}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-survey font-semibold">
                        {p.brayCurtis.toFixed(3)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink">
                        {p.jaccard.toFixed(3)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-biological font-medium">
                        {p.sharedTaxaCount} taxa
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-muted">
                        {p.uniqueTaxaSiteA} taxa
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-muted">
                        {p.uniqueTaxaSiteB} taxa
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted pt-1">
                <span>
                  Showing {(page - 1) * rowsPerPage + 1}–{Math.min(page * rowsPerPage, sortedPairs.length)} of{' '}
                  {sortedPairs.length} pairwise contrasts
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1 rounded-control border border-rule hover:bg-paper disabled:opacity-40"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <span className="px-2">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1 rounded-control border border-rule hover:bg-paper disabled:opacity-40"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Plate>
    </div>
  );
};