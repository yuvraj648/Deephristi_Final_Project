// ========================================================
// DEEPDRISHTI COMMUNITY UMAP LATENT EMBEDDING
// Scatter projection of sequence representations: flat points,
// colorblind-safe categorical palettes, no glow, point inspector
// ========================================================

import React, { useState, useMemo } from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import { EmptyState } from '../common/EmptyState';
import type { ASV } from '../../domain/types';
import { runSequenceRepresentation } from '../../services/dataService';

export type UmapColorBy = 'taxonomy' | 'cluster' | 'novelty' | 'confidence';

export const CommunityUmap: React.FC<{
  captionNumber?: number;
  height?: string;
}> = ({ captionNumber = 4, height = 'h-[500px]' }) => {
  const { filteredAsvs, setActiveDrawer, selectedAsvId, setSelectedAsvId, filters, expedition, setExpedition } = useAnalysis();
  const [colorBy, setColorBy] = useState<UmapColorBy>('taxonomy');
  const [hoveredAsv, setHoveredAsv] = useState<ASV | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [computeError, setComputeError] = useState<string | null>(null);

  const handleRunRepresentation = async () => {
    setIsComputing(true);
    setComputeError(null);
    try {
      const updated = await runSequenceRepresentation(expedition);
      setExpedition(updated);
    } catch (err: any) {
      setComputeError(err?.message || 'Failed to compute sequence representations.');
    } finally {
      setIsComputing(false);
    }
  };

  // Filter ASVs that actually have 2D embedding coordinates
  const embeddedAsvs = useMemo(() => {
    return filteredAsvs.filter((a) => a.embedding && a.embedding.length === 2);
  }, [filteredAsvs]);

  // Categorical palette (up to 8)
  const categoricalPalette = [
    '#2C6E9E',
    '#D08A2E',
    '#2F8F7A',
    '#C2542D',
    '#6BAED6',
    '#B9799E',
    '#8C8A3A',
    '#55626B',
  ];

  // Distinct groups for coloring
  const groups = useMemo(() => {
    const set = new Set<string>();
    embeddedAsvs.forEach((a) => {
      if (colorBy === 'taxonomy') {
        set.add(a.taxonomy?.[filters.taxonomicRank] || 'Unassigned');
      } else if (colorBy === 'cluster') {
        set.add(a.cluster_id || 'Singletons');
      } else if (colorBy === 'novelty') {
        set.add(a.novelty_status === 'potentially_divergent' ? 'Candidate Divergent' : 'Known');
      } else {
        const confBucket = (a.confidence || 0) >= 0.9 ? '≥90%' : (a.confidence || 0) >= 0.75 ? '75–90%' : '<75%';
        set.add(confBucket);
      }
    });
    return Array.from(set).slice(0, 8);
  }, [embeddedAsvs, colorBy, filters.taxonomicRank]);

  const getColor = (asv: ASV) => {
    if (colorBy === 'novelty') {
      return asv.novelty_status === 'potentially_divergent' ? '#6B3A5B' : '#2C6E9E';
    }
    if (colorBy === 'confidence') {
      const conf = asv.confidence || 0;
      if (conf >= 0.9) return '#2F8F7A';
      if (conf >= 0.75) return '#D08A2E';
      return '#B3372B';
    }
    if (colorBy === 'cluster') {
      if (!asv.cluster_id) return '#9AA3A8';
      const idx = groups.indexOf(asv.cluster_id);
      return idx !== -1 ? categoricalPalette[idx % categoricalPalette.length] : '#9AA3A8';
    }
    // Taxonomy
    const taxon = asv.taxonomy?.[filters.taxonomicRank] || 'Unassigned';
    if (taxon === 'Unassigned') return '#C9C6BA';
    const idx = groups.indexOf(taxon);
    return idx !== -1 ? categoricalPalette[idx % categoricalPalette.length] : '#9AA3A8';
  };

  // SVG Projection
  const svgWidth = 720;
  const svgHeight = 440;
  const padding = 40;

  const bounds = useMemo(() => {
    if (embeddedAsvs.length === 0) return { minX: -10, maxX: 10, minY: -10, maxY: 10 };
    const xs = embeddedAsvs.map((a) => a.embedding![0]);
    const ys = embeddedAsvs.map((a) => a.embedding![1]);
    const minX = Math.min(...xs) - 1.5;
    const maxX = Math.max(...xs) + 1.5;
    const minY = Math.min(...ys) - 1.5;
    const maxY = Math.max(...ys) + 1.5;
    return { minX, maxX, minY, maxY };
  }, [embeddedAsvs]);

  const project = (x: number, y: number) => {
    const px = padding + ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * (svgWidth - 2 * padding);
    const py = svgHeight - padding - ((y - bounds.minY) / (bounds.maxY - bounds.minY)) * (svgHeight - 2 * padding);
    return { px, py };
  };

  if (embeddedAsvs.length === 0) {
    if (isComputing) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-paper-raised border border-rule rounded-plate space-y-4">
          <div className="w-10 h-10 border-2 border-survey/20 border-t-survey rounded-full animate-spin" />
          <div className="space-y-1">
            <h4 className="font-serif font-medium text-[16px] text-ink">
              Extracting Sequence Representations...
            </h4>
            <p className="text-[12px] font-mono text-ink-muted">
              Computing k-mer oligonucleotide spectra and projecting 2-D latent manifold space.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <EmptyState
          title="Community embedding has not been computed for this dataset."
          description="Sequence representation extraction and dimensionality reduction have not been executed on this dataset. Latent coordinates are not fabricated for uploaded biological data."
          actionText="Run Sequence Representation"
          onAction={handleRunRepresentation}
        />
        {computeError && (
          <p className="text-[12px] font-mono text-error text-center">{computeError}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-paper-raised border border-rule rounded-plate overflow-hidden">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-paper-sunk/40 border-b border-rule text-[12px] font-mono">
        <div className="flex items-center gap-2">
          <span className="text-ink-faint uppercase text-[11px] tracking-wider">Color by:</span>
          <select
            value={colorBy}
            onChange={(e) => setColorBy(e.target.value as UmapColorBy)}
            className="bg-paper border border-rule text-ink py-1 px-2 rounded-control focus:outline-none focus:border-survey cursor-pointer text-[12px]"
          >
            <option value="taxonomy">Taxonomic Group ({filters.taxonomicRank})</option>
            <option value="novelty">Novelty Status (Candidate Divergent)</option>
            <option value="cluster">Divergent Sequence Cluster</option>
            <option value="confidence">Assignment Confidence</option>
          </select>
        </div>

        <div className="text-[11px] text-ink-muted">
          <span>n = {embeddedAsvs.length} sequence points</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className={`relative w-full ${height} bg-paper overflow-hidden`}>
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full cursor-crosshair">
          {/* Subtle Axes */}
          <line
            x1={padding}
            y1={svgHeight - padding}
            x2={svgWidth - padding}
            y2={svgHeight - padding}
            stroke="#B9B4A3"
            strokeWidth="1"
          />
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={svgHeight - padding}
            stroke="#B9B4A3"
            strokeWidth="1"
          />

          <text
            x={svgWidth / 2}
            y={svgHeight - 12}
            textAnchor="middle"
            className="fill-[#4C5A63] font-mono text-[10px] tracking-wider uppercase"
          >
            UMAP Dimension 1
          </text>
          <text
            x={16}
            y={svgHeight / 2}
            textAnchor="middle"
            className="fill-[#4C5A63] font-mono text-[10px] tracking-wider uppercase transform -rotate-90 origin-[16px_220px]"
          >
            UMAP Dimension 2
          </text>

          {/* ASV Scatter Points */}
          {embeddedAsvs.map((asv) => {
            const [x, y] = asv.embedding!;
            const { px, py } = project(x, y);
            const color = getColor(asv);
            const isSelected = selectedAsvId === asv.asv_id;
            const isHovered = hoveredAsv?.asv_id === asv.asv_id;

            return (
              <g
                key={asv.asv_id}
                className="cursor-pointer"
                onClick={() => {
                  setSelectedAsvId(asv.asv_id);
                  setActiveDrawer({ type: 'asv', id: asv.asv_id });
                }}
                onMouseEnter={() => setHoveredAsv(asv)}
                onMouseLeave={() => setHoveredAsv(null)}
              >
                {/* 1.5px ink ring on hover or selection */}
                {(isSelected || isHovered) && (
                  <circle
                    cx={px}
                    cy={py}
                    r={7}
                    fill="none"
                    stroke="#14222B"
                    strokeWidth="1.5"
                  />
                )}
                {/* Flat point at ~0.7 opacity, no glow */}
                <circle
                  cx={px}
                  cy={py}
                  r={asv.novelty_status === 'potentially_divergent' ? 4.5 : 3.5}
                  fill={color}
                  fillOpacity={0.78}
                  stroke={asv.novelty_status === 'potentially_divergent' ? '#6B3A5B' : '#14222B'}
                  strokeWidth="0.8"
                />
              </g>
            );
          })}
        </svg>

        {/* Selected / Hovered Point Inspector */}
        <div className="absolute top-3 left-12 bg-paper-raised/95 border border-rule p-2.5 rounded-plate shadow-floating text-[11px] font-mono max-w-xs pointer-events-none">
          {hoveredAsv ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between border-b border-rule pb-1">
                <span className="font-bold text-ink">{hoveredAsv.asv_id}</span>
                <span className="text-[10px] text-ink-muted uppercase">{hoveredAsv.novelty_status}</span>
              </div>
              <div className="text-ink truncate">
                <span className="text-ink-faint">Taxon:</span>{' '}
                {hoveredAsv.taxonomy?.[filters.taxonomicRank] || hoveredAsv.taxonomy?.class || 'Unassigned'}
              </div>
              <div className="text-ink">
                <span className="text-ink-faint">Confidence:</span>{' '}
                {hoveredAsv.confidence ? `${(hoveredAsv.confidence * 100).toFixed(0)}%` : 'N/A'}
              </div>
              {hoveredAsv.cluster_id && (
                <div className="text-aubergine font-medium">
                  Cluster: {hoveredAsv.cluster_id}
                </div>
              )}
            </div>
          ) : (
            <span className="text-ink-faint italic">Click point to open specimen drawer</span>
          )}
        </div>

        {/* Legend */}
        <div className="absolute bottom-3 right-3 bg-paper-raised/95 border border-rule p-2.5 rounded-plate shadow-floating text-[11px] font-mono">
          <div className="font-semibold text-ink mb-1.5 uppercase text-[10px] tracking-wider">
            {colorBy.toUpperCase()} GROUPS
          </div>
          <div className="flex flex-col gap-1 max-h-28 overflow-y-auto pr-1">
            {groups.map((group, idx) => {
              const color =
                colorBy === 'novelty'
                  ? group === 'Candidate Divergent'
                    ? '#6B3A5B'
                    : '#2C6E9E'
                  : categoricalPalette[idx % categoricalPalette.length];

              return (
                <div key={group} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-ink truncate text-[10px]">{group}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Caption */}
      <div className="px-4 py-2 border-t border-rule bg-paper-sunk/20 text-[12px] text-ink-faint italic font-serif">
        Fig. {captionNumber} — UMAP latent embedding of {embeddedAsvs.length} Amplicon Sequence Variants colored by {colorBy}. Clusters in latent space reflect sequence divergence and lineage cohesion.
      </div>
    </div>
  );
};
