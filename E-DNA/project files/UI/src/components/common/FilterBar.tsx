// ========================================================
// DEEPDRISHTI GLOBAL ANALYSIS FILTER BAR
// Active filter chips and quick controls across all pages
// ========================================================

import React from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import type { TaxonomicRank } from '../../domain/types';
import { Filter, X, RotateCcw, Search } from 'lucide-react';

export const FilterBar: React.FC = () => {
  const { filters, updateFilter, resetFilters } = useAnalysis();

  const ranks: TaxonomicRank[] = [
    'kingdom',
    'phylum',
    'class',
    'order',
    'family',
    'genus',
    'species',
  ];

  // Determine active filter chips
  const activeChips: { id: string; label: string; onRemove: () => void }[] = [];

  if (filters.taxonomicRank !== 'class') {
    activeChips.push({
      id: 'rank',
      label: `Rank: ${filters.taxonomicRank}`,
      onRemove: () => updateFilter('taxonomicRank', 'class'),
    });
  }

  if (filters.depthRange[0] !== null || filters.depthRange[1] !== null) {
    const min = filters.depthRange[0] !== null ? `${filters.depthRange[0]}m` : '0m';
    const max = filters.depthRange[1] !== null ? `${filters.depthRange[1]}m` : 'max';
    activeChips.push({
      id: 'depth',
      label: `Depth: ${min} – ${max}`,
      onRemove: () => updateFilter('depthRange', [null, null]),
    });
  }

  if (filters.selectedSites.length > 0) {
    activeChips.push({
      id: 'sites',
      label: `Sites: ${filters.selectedSites.length} selected`,
      onRemove: () => updateFilter('selectedSites', []),
    });
  }

  if (filters.minConfidence > 0) {
    activeChips.push({
      id: 'conf',
      label: `Min Conf: ${(filters.minConfidence * 100).toFixed(0)}%`,
      onRemove: () => updateFilter('minConfidence', 0),
    });
  }

  if (filters.noveltyFilter !== 'all') {
    activeChips.push({
      id: 'novelty',
      label: filters.noveltyFilter === 'potentially_divergent' ? 'Divergent Only' : 'Known Only',
      onRemove: () => updateFilter('noveltyFilter', 'all'),
    });
  }

  if (filters.assignmentStatus.length < 3) {
    activeChips.push({
      id: 'status',
      label: `Status: ${filters.assignmentStatus.join(', ')}`,
      onRemove: () => updateFilter('assignmentStatus', ['assigned', 'low_confidence', 'unassigned']),
    });
  }

  if (filters.searchQuery) {
    activeChips.push({
      id: 'search',
      label: `Search: "${filters.searchQuery}"`,
      onRemove: () => updateFilter('searchQuery', ''),
    });
  }

  return (
    <div className="bg-paper border-b border-rule px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[13px]">
      <div className="flex items-center flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-ink-muted mr-1 font-mono text-[11px] uppercase tracking-wider">
          <Filter size={14} className="text-ink-muted" />
          <span>Filters:</span>
        </div>

        {/* Taxonomic Rank Quick Selector */}
        <div className="relative inline-flex items-center">
          <span className="text-[11px] font-mono text-ink-faint mr-1">Rank:</span>
          <select
            value={filters.taxonomicRank}
            onChange={(e) => updateFilter('taxonomicRank', e.target.value as TaxonomicRank)}
            className="bg-paper-raised border border-rule text-ink font-mono text-[12px] py-1 px-2 rounded-control focus:outline-none focus:border-survey cursor-pointer"
          >
            {ranks.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Depth Preset Filter */}
        <div className="relative inline-flex items-center ml-1">
          <span className="text-[11px] font-mono text-ink-faint mr-1">Depth:</span>
          <select
            value={
              filters.depthRange[0] === null && filters.depthRange[1] === null
                ? 'all'
                : filters.depthRange[0] === 0 && filters.depthRange[1] === 100
                ? 'epipelagic'
                : filters.depthRange[0] === 100 && filters.depthRange[1] === 700
                ? 'omz'
                : filters.depthRange[0] === 700
                ? 'bathyal'
                : 'custom'
            }
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'all') updateFilter('depthRange', [null, null]);
              else if (v === 'epipelagic') updateFilter('depthRange', [0, 100]);
              else if (v === 'omz') updateFilter('depthRange', [100, 700]);
              else if (v === 'bathyal') updateFilter('depthRange', [700, 4000]);
            }}
            className="bg-paper-raised border border-rule text-ink font-mono text-[12px] py-1 px-2 rounded-control focus:outline-none focus:border-survey cursor-pointer"
          >
            <option value="all">All Depths</option>
            <option value="epipelagic">Subsurface (0–100m)</option>
            <option value="omz">OMZ / Meso (100–700m)</option>
            <option value="bathyal">Bathyal (&gt;700m)</option>
          </select>
        </div>

        {/* Novelty Filter */}
        <div className="relative inline-flex items-center ml-1">
          <span className="text-[11px] font-mono text-ink-faint mr-1">Novelty:</span>
          <select
            value={filters.noveltyFilter}
            onChange={(e) => updateFilter('noveltyFilter', e.target.value as any)}
            className="bg-paper-raised border border-rule text-ink font-mono text-[12px] py-1 px-2 rounded-control focus:outline-none focus:border-survey cursor-pointer"
          >
            <option value="all">All Groups</option>
            <option value="potentially_divergent">Divergent Candidates Only</option>
            <option value="known">Known Taxa Only</option>
          </select>
        </div>

        {/* Active Chips */}
        {activeChips.map((chip) => (
          <span
            key={chip.id}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-survey-tint/50 border border-survey/30 text-survey font-mono text-[11px] rounded-control"
          >
            <span>{chip.label}</span>
            <button
              type="button"
              onClick={chip.onRemove}
              className="hover:text-ink transition-colors"
              title="Remove filter"
            >
              <X size={12} />
            </button>
          </span>
        ))}

        {activeChips.length > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 text-[11px] font-mono text-ink-faint hover:text-ink ml-1 transition-colors"
            title="Reset all filters to default"
          >
            <RotateCcw size={12} />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* Global Search query */}
      <div className="relative flex items-center">
        <Search size={14} className="absolute left-2.5 text-ink-muted" />
        <input
          type="text"
          placeholder="Filter ASV, Taxon, Sequence..."
          value={filters.searchQuery}
          onChange={(e) => updateFilter('searchQuery', e.target.value)}
          className="bg-paper-raised border border-rule rounded-control pl-8 pr-3 py-1 text-[12px] font-mono text-ink placeholder:text-ink-faint focus:outline-none focus:border-survey w-56"
        />
        {filters.searchQuery && (
          <button
            type="button"
            onClick={() => updateFilter('searchQuery', '')}
            className="absolute right-2 text-ink-faint hover:text-ink"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
};
