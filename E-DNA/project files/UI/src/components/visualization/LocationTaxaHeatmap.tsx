// ========================================================
// DEEPDRISHTI LOCATION × TAXA HEATMAP
// Signature ecological matrix: sequential ocean ramp,
// hatched missing cells, measure switching, dynamic selection,
// and high-contrast text (black font on bluish/light cells).
// ========================================================

import React, { useState } from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import { Plate } from '../common/Plate';

export type HeatmapMeasure = 'abundance' | 'occurrence' | 'normalized' | 'asv_count';

export const LocationTaxaHeatmap: React.FC<{
  captionNumber?: number;
  initialMeasure?: HeatmapMeasure;
}> = ({ captionNumber = 2, initialMeasure = 'abundance' }) => {
  const { getLocationTaxaMatrix, filters, setActiveDrawer, setSelectedSiteId, selectedSiteId } = useAnalysis();
  const [measure, setMeasure] = useState<HeatmapMeasure>(initialMeasure);
  const [hoveredCell, setHoveredCell] = useState<{
    site: string;
    taxon: string;
    value: number | null;
  } | null>(null);

  const { sites, taxa, matrix, maxVal } = React.useMemo(
    () => getLocationTaxaMatrix(measure, 8),
    [getLocationTaxaMatrix, measure]
  );

  // Ocean sequential ramp: 7 luminous stops
  const oceanRamp = [
    '#EAF1F0',
    '#C6DDE0',
    '#97C4CE',
    '#63A3B9',
    '#3D7FA0',
    '#285C82',
    '#1B3B62',
  ];

  const getCellColor = (val: number | null) => {
    if (val === null || val === undefined || val === 0) return 'transparent';
    const ratio = maxVal > 0 ? val / maxVal : 0;
    const idx = Math.min(oceanRamp.length - 1, Math.max(0, Math.floor(ratio * oceanRamp.length)));
    return oceanRamp[idx];
  };

  const measureLabels: Record<HeatmapMeasure, string> = {
    abundance: 'Read Abundance',
    occurrence: 'Sample Occurrence',
    normalized: 'Relative Abundance (%)',
    asv_count: 'Distinct ASV Count',
  };

  return (
    <Plate
      eyebrow="ECOLOGICAL MATRIX"
      title="Location × Taxa Distribution"
      meta={`Rank: ${filters.taxonomicRank} • ${sites.length} sites × ${taxa.length} taxa`}
      figureCaption={`Fig. ${captionNumber} — Location × Taxa distribution matrix (${measureLabels[measure]}) across sampled stations at ${filters.taxonomicRank} rank. Cross-hatched cells represent missing/undetected observations.`}
      action={
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-ink-faint">Measure:</span>
          <select
            value={measure}
            onChange={(e) => setMeasure(e.target.value as HeatmapMeasure)}
            className="bg-paper border border-rule text-ink py-1 px-2 rounded-control focus:outline-none focus:border-survey cursor-pointer text-[12px]"
          >
            <option value="abundance">Read Abundance</option>
            <option value="occurrence">Sample Occurrence</option>
            <option value="normalized">Normalized Abundance (%)</option>
            <option value="asv_count">ASV Count</option>
          </select>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Header Row: Taxa Columns */}
          <div className="grid grid-cols-[180px_repeat(auto-fit,minmax(70px,1fr))] gap-[2px] mb-[2px]">
            <div className="p-2 text-[11px] font-mono uppercase tracking-wider text-ink-faint bg-paper-sunk/60 rounded-control flex items-center">
              Station / Site
            </div>
            {taxa.map((t) => (
              <div
                key={t}
                className="p-2 text-[11px] font-mono text-ink text-center font-medium bg-paper-sunk/60 rounded-control truncate"
                title={t}
              >
                {t}
              </div>
            ))}
          </div>

          {/* Matrix Rows: Sites */}
          <div className="space-y-[2px]">
            {sites.map((site, rowIdx) => {
              const isSelected =
                selectedSiteId === site ||
                (selectedSiteId && site.startsWith(selectedSiteId)) ||
                (selectedSiteId && selectedSiteId.startsWith(site));

              return (
                <div
                  key={site}
                  className={`grid grid-cols-[180px_repeat(auto-fit,minmax(70px,1fr))] gap-[2px] items-stretch p-0.5 rounded-control transition-all ${
                    isSelected ? 'bg-sky-500/20 ring-1 ring-survey shadow-sm' : ''
                  }`}
                >
                  {/* Site Label Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSiteId(site);
                      setActiveDrawer({ type: 'site', id: site });
                    }}
                    className={`px-2 py-2 text-left font-mono text-[12px] rounded-control truncate transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-survey text-white font-bold'
                        : 'text-ink hover:text-survey hover:bg-paper-sunk/80 bg-paper-sunk/40'
                    }`}
                    title={`Inspect station ${site}`}
                  >
                    <span className="truncate">{site.split(' - ')[0]}</span>
                    <span className="text-[10px] opacity-70">→</span>
                  </button>

                  {/* Heatmap Cells */}
                  {taxa.map((taxon, colIdx) => {
                    const val = matrix[rowIdx]?.[colIdx];
                    const hasVal = val !== null && val !== undefined && val > 0;
                    const bgColor = getCellColor(val);
                    const ratio = maxVal > 0 ? (val ?? 0) / maxVal : 0;
                    // Text contrast: in all light & medium bluish cells, force bold black text for maximum readability!
                    // Only on the deepest navy (>0.7 ratio) use crisp white text.
                    const isDeepNavy = ratio >= 0.7;

                    return (
                      <div
                        key={`${site}-${taxon}`}
                        onMouseEnter={() => setHoveredCell({ site, taxon, value: val })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => {
                          setSelectedSiteId(site);
                          setActiveDrawer({ type: 'site', id: site });
                        }}
                        className={`relative h-10 rounded-control flex items-center justify-center font-mono text-[11px] transition-all cursor-pointer border border-rule/30 ${
                          hasVal ? '' : 'hatch-diagonal bg-[#E5E2D6]/40'
                        } ${isSelected ? 'ring-1 ring-survey/50' : ''}`}
                        style={{ backgroundColor: hasVal ? bgColor : undefined }}
                      >
                        {hasVal ? (
                          <span
                            className={`tabular-nums font-bold ${
                              isDeepNavy ? 'text-white' : 'text-[#060B13]'
                            }`}
                          >
                            {measure === 'normalized'
                              ? `${val}%`
                              : val.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-ink-faint text-[9px] select-none">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Hover Details & Legend */}
          <div className="mt-4 pt-3 border-t border-rule flex flex-wrap items-center justify-between gap-4 text-[12px] font-mono">
            <div>
              {hoveredCell ? (
                <div className="flex items-center gap-2">
                  <span className="text-ink-muted">Selected Cell:</span>
                  <span className="font-semibold text-ink">{hoveredCell.site.split(' - ')[0]}</span>
                  <span className="text-ink-faint">×</span>
                  <span className="font-semibold text-survey">{hoveredCell.taxon}</span>
                  <span className="text-ink-faint">=</span>
                  <span className="font-bold text-ink">
                    {hoveredCell.value !== null
                      ? measure === 'normalized'
                        ? `${hoveredCell.value}%`
                        : `${hoveredCell.value.toLocaleString()} (${measureLabels[measure]})`
                      : 'Missing observation'}
                  </span>
                </div>
              ) : (
                <span className="text-ink-faint italic">
                  Hover over cells to inspect exact quantified readings. Click any cell to select station.
                </span>
              )}
            </div>

            {/* Scale Bar */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-ink-faint uppercase tracking-wider">Low</span>
              <div className="flex h-2.5 w-32 border border-rule rounded-control overflow-hidden">
                {oceanRamp.map((color, idx) => (
                  <div key={idx} className="flex-1 h-full" style={{ backgroundColor: color }} />
                ))}
              </div>
              <span className="text-[10px] text-ink font-semibold uppercase tracking-wider">High</span>
            </div>
          </div>
        </div>
      </div>
    </Plate>
  );
};
