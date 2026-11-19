// ========================================================
// DEEPDRISHTI ASV EXPLORER PAGE
// Modern scientific aesthetic matching the taxonomy card design:
// - Deep dark `#05080E` surface with clean borders
// - Crisp typography, pill badges, and true abundance bars
// - Retains colorful nucleotide sequence styling (A/C/G/T)
// - Supports both Card and Table views with search, sort & filters
// ========================================================

import React, { useState, useMemo } from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import { AsvSequence } from '../../components/common/AsvSequence';
import {
  ArrowUpDown,
  Search,
  LayoutGrid,
  List,
  Filter,
  Dna,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Sparkles,
  Download,
} from 'lucide-react';
import type { ASV } from '../../domain/types';

export const AsvExplorerPage: React.FC = () => {
  const { filteredAsvs, expedition, setActiveDrawer, selectedAsvId, setSelectedAsvId, filters } = useAnalysis();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'potentially_divergent' | 'unassigned'>('all');
  const [sortField, setSortField] = useState<'abundance' | 'samples' | 'confidence' | 'asv_id'>('abundance');
  const [sortAsc, setSortAsc] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Pre-calculate abundance and sample occurrence for every ASV
  const asvMetricsMap = useMemo(() => {
    const map = new Map<string, { abundance: number; sampleCount: number }>();
    expedition.occurrences.forEach((occ) => {
      const current = map.get(occ.asv_id) || { abundance: 0, sampleCount: 0 };
      current.abundance += occ.abundance;
      current.sampleCount += 1;
      map.set(occ.asv_id, current);
    });
    return map;
  }, [expedition.occurrences]);

  const totalReads = useMemo(() => {
    return expedition.occurrences.reduce((s, o) => s + o.abundance, 0);
  }, [expedition.occurrences]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
    setCurrentPage(1);
  };

  // Filtered and sorted ASVs
  const processedAsvs = useMemo(() => {
    let result = filteredAsvs.filter((asv) => {
      // Status filter
      if (statusFilter === 'potentially_divergent' && asv.novelty_status !== 'potentially_divergent') return false;
      if (statusFilter === 'assigned' && (asv.assignment_status !== 'assigned' || asv.novelty_status === 'potentially_divergent')) return false;
      if (statusFilter === 'unassigned' && asv.assignment_status !== 'unassigned') return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const idMatch = asv.asv_id.toLowerCase().includes(q);
        const seqMatch = asv.sequence.toLowerCase().includes(q);
        const taxMatch = asv.taxonomy ? Object.values(asv.taxonomy).some((v) => v?.toLowerCase().includes(q)) : false;
        const clusterMatch = asv.cluster_id?.toLowerCase().includes(q);
        return idMatch || seqMatch || taxMatch || clusterMatch;
      }
      return true;
    });

    result.sort((a, b) => {
      const metricsA = asvMetricsMap.get(a.asv_id) || { abundance: 0, sampleCount: 0 };
      const metricsB = asvMetricsMap.get(b.asv_id) || { abundance: 0, sampleCount: 0 };

      let valA: any = a.asv_id;
      let valB: any = b.asv_id;

      if (sortField === 'abundance') {
        valA = metricsA.abundance;
        valB = metricsB.abundance;
      } else if (sortField === 'samples') {
        valA = metricsA.sampleCount;
        valB = metricsB.sampleCount;
      } else if (sortField === 'confidence') {
        valA = a.confidence ?? 0;
        valB = b.confidence ?? 0;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [filteredAsvs, searchQuery, statusFilter, sortField, sortAsc, asvMetricsMap]);

  const totalPages = Math.max(1, Math.ceil(processedAsvs.length / pageSize));
  const paginatedAsvs = processedAsvs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSelectAsv = (asv: ASV) => {
    setSelectedAsvId(asv.asv_id);
    setActiveDrawer({ type: 'asv', id: asv.asv_id });
  };

  const handleDownloadAllAsvsCsv = () => {
    const header = 'asv_id,sequence,kingdom,phylum,class,order,family,genus,species,confidence,assignment_status,novelty_status,total_reads,sample_sites';
    const rows = expedition.asvs.map((asv) => {
      const metrics = asvMetricsMap.get(asv.asv_id) || { abundance: 0, sampleCount: 0 };
      const t = asv.taxonomy || {};
      const esc = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
      return [
        esc(asv.asv_id),
        esc(asv.sequence),
        esc(t.kingdom || ''),
        esc(t.phylum || ''),
        esc(t.class || ''),
        esc(t.order || ''),
        esc(t.family || ''),
        esc(t.genus || ''),
        esc(t.species || ''),
        asv.confidence != null ? (asv.confidence * 100).toFixed(2) : '',
        esc(asv.assignment_status || ''),
        esc(asv.novelty_status || ''),
        metrics.abundance,
        metrics.sampleCount,
      ].join(',');
    });

    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(expedition.title || 'expedition').toLowerCase().replace(/\s+/g, '_')}_all_asvs_${Date.now()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const getStatusBadge = (asv: ASV) => {
    if (asv.novelty_status === 'potentially_divergent') {
      return (
        <span className="px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60 text-[10px] font-mono tracking-wider font-semibold uppercase">
          Divergent Candidate
        </span>
      );
    }
    if (asv.assignment_status === 'unassigned') {
      return (
        <span className="px-2 py-0.5 rounded-full bg-neutral-800/80 text-[#D4CEB8] border border-neutral-700/60 text-[10px] font-mono tracking-wider font-semibold uppercase">
          Unassigned
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 text-[10px] font-mono tracking-wider font-semibold uppercase">
        Assigned
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Container styled like the Taxonomy Card */}
      <div className="bg-[#05080E] border border-rule/80 rounded-plate p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-[0.12em] bg-sky-950/80 text-sky-400 px-2 py-0.5 rounded-control border border-sky-800/60 font-semibold">
                Sequence Archive
              </span>
              <span className="text-[11px] font-mono text-neutral-400">
                18S-V9 / COI Amplicon Repertoire
              </span>
            </div>
            <h1 className="text-[24px] sm:text-[28px] font-semibold text-white tracking-tight">
              Amplicon Sequence Variants (ASVs)
            </h1>
            <p className="text-[13px] text-neutral-400 mt-0.5 font-sans">
              High-throughput catalog of verified nucleotide barcodes, taxonomic affiliations, and geographic occurrences.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex border border-white/10 rounded-control overflow-hidden bg-white/5 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-sky-500 text-white font-medium shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
                title="Cards View (Standard Taxonomy Aesthetic)"
              >
                <LayoutGrid size={13} />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 flex items-center gap-1.5 border-l border-white/10 transition-colors ${
                  viewMode === 'table'
                    ? 'bg-sky-500 text-white font-medium shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
                title="Dense Table View"
              >
                <List size={13} />
                <span>Table</span>
              </button>
            </div>

            {/* Total Variants Pill */}
            <span className="px-3 py-1 rounded-full bg-sky-950/80 text-sky-400 border border-sky-800/60 text-[12px] font-medium font-sans">
              {processedAsvs.length} variants
            </span>

            {/* Global Download All CSV Button */}
            <button
              type="button"
              onClick={handleDownloadAllAsvsCsv}
              className="px-3 py-1.5 flex items-center gap-1.5 bg-[#0B1320] border border-sky-500/40 hover:border-sky-400 text-sky-400 hover:text-sky-300 rounded-control font-mono text-[11px] transition-colors shadow-sm"
              title="Download all cataloged ASVs in the current expedition as CSV"
            >
              <Download size={13} />
              <span>Download CSV</span>
            </button>
          </div>
        </div>

        {/* Search, Filter & Sort Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] font-mono">
          {/* Status filter pills */}
          <div className="flex flex-wrap items-center gap-1">
            {[
              { id: 'all', label: 'All Variants' },
              { id: 'assigned', label: 'Assigned' },
              { id: 'potentially_divergent', label: 'Divergent Lineages' },
              { id: 'unassigned', label: 'Unassigned' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id as any);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-control text-[11px] transition-all ${
                  statusFilter === tab.id
                    ? 'bg-sky-500 text-white font-medium shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Sort Select */}
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-neutral-400 uppercase">Sort:</span>
              <select
                value={sortField}
                onChange={(e) => handleSort(e.target.value as any)}
                className="bg-[#0B1320] border border-white/10 text-white py-1 px-2 rounded-control focus:border-sky-500 focus:outline-none"
              >
                <option value="abundance">Abundance (Read Count)</option>
                <option value="samples">Sample Occurrences</option>
                <option value="confidence">Confidence Score</option>
                <option value="asv_id">ASV Identifier</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[180px] max-w-[220px]">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search ASV, taxon, sequence..."
                className="w-full bg-[#0B1320] border border-white/10 focus:border-sky-500 rounded-control pl-7 pr-2 py-1 text-[11px] text-white placeholder:text-neutral-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area: Cards View or Table View */}
      {processedAsvs.length === 0 ? (
        <div className="bg-[#05080E] border border-rule/80 rounded-plate p-12 text-center space-y-3">
          <Dna size={32} className="mx-auto text-neutral-400" />
          <h4 className="text-[18px] font-semibold text-white">No ASVs match active filters</h4>
          <p className="text-[12px] font-mono text-neutral-400 max-w-md mx-auto">
            Try adjusting your search term or switching to "All Variants".
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* ========================================================
           CARDS VIEW (Exact Taxonomy Card Aesthetic & Hierarchy)
           ======================================================== */
        <div className="space-y-4">
          {paginatedAsvs.map((asv) => {
            const metrics = asvMetricsMap.get(asv.asv_id) || { abundance: 0, sampleCount: 0 };
            const isSelected = selectedAsvId === asv.asv_id;
            const isUnassigned = asv.assignment_status === 'unassigned';
            const isDivergent = asv.novelty_status === 'potentially_divergent';
            const activeTaxon = asv.taxonomy?.[filters.taxonomicRank];
            const taxonLabel =
              activeTaxon && activeTaxon.toLowerCase() !== 'unassigned'
                ? activeTaxon
                : asv.taxonomy?.phylum && asv.taxonomy.phylum.toLowerCase() !== 'unassigned'
                ? asv.taxonomy.phylum
                : asv.taxonomy?.class && asv.taxonomy.class.toLowerCase() !== 'unassigned'
                ? asv.taxonomy.class
                : asv.taxonomy?.species && asv.taxonomy.species.toLowerCase() !== 'unassigned'
                ? asv.taxonomy.species
                : asv.taxonomy?.kingdom || 'Unassigned';

            // Relative abundance calculation corresponding to bar length
            const relativeAbundance =
              totalReads > 0 ? Math.round((metrics.abundance / totalReads) * 1000) / 10 : 0;
            const barWidth = Math.min(
              100,
              Math.max(relativeAbundance > 0 ? 0.6 : 0, relativeAbundance)
            );

            // Bar color logic matching taxonomy reference
            let barColor = 'bg-sky-500';
            if (isDivergent) barColor = 'bg-purple-500';
            else if (isUnassigned) barColor = 'bg-[#D4CEB8]';

            return (
              <div
                key={asv.asv_id}
                onClick={() => handleSelectAsv(asv)}
                className={`bg-[#05080E] border rounded-plate p-5 space-y-3 transition-all cursor-pointer shadow-sm hover:shadow-md ${
                  isSelected
                    ? 'border-sky-500 ring-1 ring-sky-500'
                    : 'border-rule/80 hover:border-sky-500/60'
                }`}
              >
                {/* Line 1: ASV ID, Status Pill, Cluster Badge | Raw Read Count */}
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-[16px] font-semibold text-white tracking-tight font-mono">
                      {asv.asv_id}
                    </span>
                    {getStatusBadge(asv)}
                    {asv.cluster_id && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-800/40 text-[10px] font-mono">
                        {asv.cluster_id}
                      </span>
                    )}
                  </div>
                  <span className="text-[16px] font-bold text-white tabular-nums tracking-tight font-sans flex-shrink-0">
                    {metrics.abundance.toLocaleString()} reads
                  </span>
                </div>

                {/* Line 2: Taxon Label, Site Occurrences, Confidence | % of Total Reads */}
                <div className="flex items-center justify-between text-[13px] text-neutral-400 font-sans gap-3">
                  <div className="flex items-center gap-2 truncate">
                    <span className={`font-medium ${isUnassigned ? 'text-neutral-400 italic' : 'text-neutral-200'}`}>
                      {taxonLabel}
                    </span>
                    <span>•</span>
                    <span>{metrics.sampleCount} sites</span>
                    <span>•</span>
                    <span>
                      Conf: {asv.confidence !== undefined ? `${(asv.confidence * 100).toFixed(0)}%` : 'N/A'}
                    </span>
                  </div>
                  <span className="tabular-nums font-medium flex-shrink-0">
                    {relativeAbundance}% of reads
                  </span>
                </div>

                {/* Line 3: Sleek Horizontal Abundance Bar */}
                <div className="w-full h-2 rounded-full bg-[#18202A] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>

                {/* Line 4: Colorful Nucleotide Sequence Box */}
                <div className="pt-1">
                  <div className="bg-[#0B121C] border border-white/5 rounded-control px-3.5 py-2 flex items-center justify-between gap-3">
                    <div className="overflow-hidden">
                      <AsvSequence sequence={asv.sequence} truncateLength={48} showCopy={false} />
                    </div>
                    <span className="text-[10px] font-mono text-sky-400 hover:underline flex-shrink-0 flex items-center gap-1">
                      <span>Dossier</span>
                      <ExternalLink size={11} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ========================================================
           TABLE VIEW (Modern Dark Scientific Layout)
           ======================================================== */
        <div className="bg-[#05080E] border border-rule/80 rounded-plate overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px] font-mono border-collapse">
              <thead className="bg-[#0B1320] border-b border-white/10 text-neutral-400 select-none">
                <tr>
                  <th
                    onClick={() => handleSort('asv_id')}
                    className="px-4 py-3 font-medium cursor-pointer hover:text-white w-32"
                  >
                    <div className="flex items-center gap-1">
                      <span>ASV ID</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-4 py-3 font-medium min-w-[240px]">Nucleotide Sequence</th>
                  <th
                    onClick={() => handleSort('samples')}
                    className="px-4 py-3 font-medium text-right cursor-pointer hover:text-white w-24"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Sites</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('abundance')}
                    className="px-4 py-3 font-medium text-right cursor-pointer hover:text-white w-28"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Reads</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-4 py-3 font-medium">Taxon ({filters.taxonomicRank})</th>
                  <th
                    onClick={() => handleSort('confidence')}
                    className="px-4 py-3 font-medium text-right cursor-pointer hover:text-white w-20"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Conf.</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-4 py-3 font-medium w-32">Status</th>
                  <th className="px-4 py-3 font-medium w-24">Cluster</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-[#05080E]">
                {paginatedAsvs.map((asv) => {
                  const metrics = asvMetricsMap.get(asv.asv_id) || { abundance: 0, sampleCount: 0 };
                  const isSelected = selectedAsvId === asv.asv_id;
                  const activeTaxon = asv.taxonomy?.[filters.taxonomicRank];
                  const taxonLabel =
                    activeTaxon && activeTaxon.toLowerCase() !== 'unassigned'
                      ? activeTaxon
                      : asv.taxonomy?.phylum && asv.taxonomy.phylum.toLowerCase() !== 'unassigned'
                      ? asv.taxonomy.phylum
                      : asv.taxonomy?.class && asv.taxonomy.class.toLowerCase() !== 'unassigned'
                      ? asv.taxonomy.class
                      : asv.taxonomy?.species && asv.taxonomy.species.toLowerCase() !== 'unassigned'
                      ? asv.taxonomy.species
                      : asv.taxonomy?.kingdom || 'Unassigned';

                  return (
                    <tr
                      key={asv.asv_id}
                      onClick={() => handleSelectAsv(asv)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-sky-500/15 text-white'
                          : 'hover:bg-white/[0.03] text-neutral-200'
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold text-sky-400 font-mono">
                        {asv.asv_id}
                      </td>
                      <td className="px-4 py-3 max-w-[280px] overflow-hidden truncate">
                        <AsvSequence sequence={asv.sequence} truncateLength={28} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-neutral-400">
                        {metrics.sampleCount}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-white">
                        {metrics.abundance.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 truncate max-w-[180px]">
                        <span className={taxonLabel === 'Unassigned' ? 'text-neutral-400 italic' : 'text-white'}>
                          {taxonLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-neutral-300">
                        {asv.confidence !== undefined ? `${(asv.confidence * 100).toFixed(0)}%` : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(asv)}
                      </td>
                      <td className="px-4 py-3 text-neutral-400 font-mono text-[11px]">
                        {asv.cluster_id || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="bg-[#05080E] border border-rule/80 rounded-plate px-5 py-3 flex items-center justify-between font-mono text-[12px] text-neutral-400 shadow-sm">
          <span>
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, processedAsvs.length)} of{' '}
            {processedAsvs.length} variants
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 border border-white/10 rounded-control disabled:opacity-40 hover:bg-white/5 text-white transition-colors"
            >
              Previous
            </button>
            <span className="px-2 text-white">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 border border-white/10 rounded-control disabled:opacity-40 hover:bg-white/5 text-white transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};