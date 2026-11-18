// ========================================================
// DEEPDRISHTI NAUTICAL HYDROGRAPHIC CHART MAP
// Muted paper-toned basemap, bathymetric contours, graticule ticks,
// scale bar, north arrow, live coordinates, and proportional markers
// ========================================================

import React, { useState, useMemo } from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import { Compass, AlertCircle, MapPin, Grid, Layers, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { GeoreferenceModal } from './GeoreferenceModal';
import { CommunityUmap } from './CommunityUmap';

export type MapMetricType =
  | 'taxaRichness'
  | 'shannon'
  | 'simpson'
  | 'asvRichness'
  | 'abundance'
  | 'divergent';

export const HydrographicMap: React.FC<{
  height?: string;
  selectedMetric?: MapMetricType;
  onSelectMetric?: (metric: MapMetricType) => void;
  showControls?: boolean;
}> = ({
  height = 'h-[500px]',
  selectedMetric: externalMetric,
  onSelectMetric,
  showControls = true,
}) => {
  const { siteProfiles, setActiveDrawer, setSelectedSiteId, selectedSiteId, expedition, setExpedition } = useAnalysis();

  const [internalMetric, setInternalMetric] = useState<MapMetricType>('taxaRichness');
  const [showContours, setShowContours] = useState(true);
  const [hoveredCoords, setHoveredCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [hoveredSite, setHoveredSite] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'gis' | 'grid' | 'kmer'>('gis');
  const [showUnmappedList, setShowUnmappedList] = useState(false);
  const [showGeorefModal, setShowGeorefModal] = useState(false);

  const activeMetric = externalMetric || internalMetric;
  const setMetric = onSelectMetric || setInternalMetric;

  // Filter sites that have valid geographic coordinates
  const validSites = useMemo(() => {
    return siteProfiles.filter((s) => s.latitude !== undefined && s.longitude !== undefined);
  }, [siteProfiles]);

  const unmappedSites = useMemo(() => {
    return siteProfiles.filter((s) => s.latitude === undefined || s.longitude === undefined);
  }, [siteProfiles]);

  // Bounding box calculation for projection
  const bounds = useMemo(() => {
    if (validSites.length === 0) {
      return { minLat: 12.0, maxLat: 21.0, minLng: 66.0, maxLng: 75.0 };
    }
    const lats = validSites.map((s) => s.latitude!);
    const lngs = validSites.map((s) => s.longitude!);
    const minLat = Math.min(...lats) - 1.2;
    const maxLat = Math.max(...lats) + 1.2;
    const minLng = Math.min(...lngs) - 1.5;
    const maxLng = Math.max(...lngs) + 1.5;
    return { minLat, maxLat, minLng, maxLng };
  }, [validSites]);

  const isArabianSea = useMemo(() => {
    return bounds.minLng >= 65 && bounds.maxLng <= 78 && bounds.minLat >= 10 && bounds.maxLat <= 24;
  }, [bounds]);

  const latTicks = useMemo(() => {
    const min = Math.floor(bounds.minLat);
    const max = Math.ceil(bounds.maxLat);
    const diff = max - min;
    const step = Math.max(1, Math.round(diff / 4));
    const ticks: number[] = [];
    for (let l = min + step; l < max; l += step) ticks.push(l);
    return ticks.length > 0 ? ticks : [Math.round((bounds.minLat + bounds.maxLat) / 2)];
  }, [bounds]);

  const lngTicks = useMemo(() => {
    const min = Math.floor(bounds.minLng);
    const max = Math.ceil(bounds.maxLng);
    const diff = max - min;
    const step = Math.max(1, Math.round(diff / 4));
    const ticks: number[] = [];
    for (let l = min + step; l < max; l += step) ticks.push(l);
    return ticks.length > 0 ? ticks : [Math.round((bounds.minLng + bounds.maxLng) / 2)];
  }, [bounds]);

  // Project lat/lng to SVG viewBox (0,0 to 800, 520)
  const svgWidth = 800;
  const svgHeight = 520;
  const padding = 50;

  const project = (lat: number, lng: number) => {
    const x = padding + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * (svgWidth - 2 * padding);
    // Invert Y because latitude increases northward
    const y = svgHeight - padding - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * (svgHeight - 2 * padding);
    return { x, y };
  };

  const unproject = (x: number, y: number) => {
    const lng = bounds.minLng + ((x - padding) / (svgWidth - 2 * padding)) * (bounds.maxLng - bounds.minLng);
    const lat = bounds.maxLat - ((y - padding) / (svgHeight - 2 * padding)) * (bounds.maxLat - bounds.minLat);
    return { lat, lng };
  };

  // Determine metric value & radius for all sites
  const allMetricValues = useMemo(() => {
    return siteProfiles.map((site) => {
      let val = 0;
      if (activeMetric === 'taxaRichness') val = site.taxaCount;
      else if (activeMetric === 'shannon') val = site.shannon;
      else if (activeMetric === 'simpson') val = site.simpson;
      else if (activeMetric === 'asvRichness') val = site.asvCount;
      else if (activeMetric === 'abundance') val = site.totalAbundance;
      else if (activeMetric === 'divergent') val = site.divergentGroupCount;
      return { site: site.site, val };
    });
  }, [siteProfiles, activeMetric]);

  const maxVal = Math.max(...allMetricValues.map((m) => m.val), 1);
  const minVal = Math.min(...allMetricValues.map((m) => m.val), 0);

  // Sequential ramp colors: 7 stops (Luminous ocean blue to cyan gradient)
  const oceanRamp = [
    '#0369A1',
    '#0284C7',
    '#0EA5E9',
    '#38BDF8',
    '#00D4FF',
    '#34D399',
    '#A7F3D0',
  ];

  const getColorForVal = (val: number) => {
    if (activeMetric === 'divergent') {
      return val > 0 ? '#C084FC' : '#1E3550';
    }
    const ratio = maxVal > minVal ? (val - minVal) / (maxVal - minVal) : 0.5;
    const idx = Math.min(oceanRamp.length - 1, Math.max(0, Math.floor(ratio * oceanRamp.length)));
    return oceanRamp[idx];
  };

  const getRadiusForVal = (val: number) => {
    const ratio = maxVal > minVal ? (val - minVal) / (maxVal - minVal) : 0.5;
    return 6 + ratio * 14;
  };

  // If no sites have coordinates and view is gis, auto-fall to grid or offer georef
  const hasValidGis = validSites.length > 0;

  return (
    <div className={`relative bg-[#06101E] border border-rule-strong rounded-plate flex flex-col select-none overflow-hidden ${height}`}>
      {/* Top Map Control Strip */}
      {showControls && (
        <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-paper-raised/95 border-b border-rule z-10 text-[12px] font-mono gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-ink-faint uppercase text-[11px] tracking-wider">Metric:</span>
              <select
                value={activeMetric}
                onChange={(e) => setMetric(e.target.value as MapMetricType)}
                className="bg-paper border border-rule text-ink py-1 px-2 rounded-control focus:outline-none focus:border-survey cursor-pointer text-[12px]"
              >
                <option value="taxaRichness">Taxa Richness (Observed)</option>
                <option value="shannon">Shannon Diversity (H')</option>
                <option value="simpson">Simpson Diversity (1 - D)</option>
                <option value="asvRichness">ASV Richness</option>
                <option value="abundance">Total Read Abundance</option>
                <option value="divergent">Candidate Divergent Groups</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex border border-rule rounded-control overflow-hidden bg-paper text-[11px]">
              <button
                type="button"
                onClick={() => setViewMode('gis')}
                className={`px-2.5 py-1 flex items-center gap-1 transition-colors ${
                  viewMode === 'gis'
                    ? 'bg-survey text-white font-medium'
                    : 'text-ink-muted hover:text-ink hover:bg-paper-sunk'
                }`}
                title="Mercator GIS Projection"
              >
                <Layers size={13} />
                <span>Nautical GIS</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 flex items-center gap-1 border-l border-rule transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-survey text-white font-medium'
                    : 'text-ink-muted hover:text-ink hover:bg-paper-sunk'
                }`}
                title="All Stations Ecological Grid Layout"
              >
                <Grid size={13} />
                <span>Station Grid ({siteProfiles.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kmer')}
                className={`px-2.5 py-1 flex items-center gap-1 border-l border-rule transition-colors ${
                  viewMode === 'kmer'
                    ? 'bg-survey text-white font-medium'
                    : 'text-ink-muted hover:text-ink hover:bg-paper-sunk'
                }`}
                title="K-mer Sequence Representation & Latent Manifold (UMAP)"
              >
                <Sparkles size={13} />
                <span>K-mer Map</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {viewMode === 'gis' && (
              <label className="flex items-center gap-1.5 cursor-pointer text-ink-muted hover:text-ink">
                <input
                  type="checkbox"
                  checked={showContours}
                  onChange={(e) => setShowContours(e.target.checked)}
                  className="rounded-control border-rule text-survey focus:ring-0"
                />
                <span className="text-[11px]">Contours</span>
              </label>
            )}

            {/* Quick Georeference Button */}
            {viewMode !== 'kmer' && (
              <button
                type="button"
                onClick={() => setShowGeorefModal(true)}
                className="px-2.5 py-1 bg-paper border border-rule hover:border-survey text-ink rounded-control flex items-center gap-1.5 text-[11px] font-medium transition-colors shadow-sm"
              >
                <MapPin size={12} className="text-survey" />
                <span>Georeference Stations</span>
              </button>
            )}

            {/* Live Coordinate Readout */}
            {viewMode === 'gis' && (
              <div className="bg-paper-sunk px-2.5 py-1 rounded-control border border-rule text-[11px] text-ink flex items-center gap-1.5 tabular-nums">
                <span className="text-ink-faint">LOC:</span>
                <span>
                  {hoveredCoords
                    ? `${hoveredCoords.lat.toFixed(3)}° N, ${hoveredCoords.lng.toFixed(3)}° E`
                    : 'Move cursor over chart'}
                </span>
              </div>
            )}
            {viewMode === 'kmer' && (
              <div className="bg-paper-sunk px-2.5 py-1 rounded-control border border-rule text-[11px] text-aubergine flex items-center gap-1.5 font-medium">
                <Sparkles size={12} />
                <span>Latent Space Manifold</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sleek, Compact Unmapped Stations Notice */}
      {unmappedSites.length > 0 && viewMode !== 'kmer' && (
        <div className="px-4 py-1.5 bg-paper-sunk border-b border-rule flex flex-col z-10 text-[11px] font-mono text-ink-muted transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-warning flex-shrink-0" />
              <span>
                <strong>{unmappedSites.length} station{unmappedSites.length > 1 ? 's' : ''}</strong> without GPS coordinates in metadata.
              </span>
              <button
                type="button"
                onClick={() => setShowGeorefModal(true)}
                className="text-survey hover:underline font-semibold ml-1 flex items-center gap-1"
              >
                <Sparkles size={11} />
                <span>Assign Coordinates / Apply Preset →</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'gis' ? 'grid' : 'gis')}
                className="text-ink hover:text-survey font-medium underline"
              >
                {viewMode === 'gis' ? 'Switch to Station Grid View' : 'Switch to GIS Map'}
              </button>
              <button
                type="button"
                onClick={() => setShowUnmappedList(!showUnmappedList)}
                className="flex items-center gap-0.5 text-ink-faint hover:text-ink"
              >
                <span>{showUnmappedList ? 'Hide details' : 'View list'}</span>
                {showUnmappedList ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>
          </div>

          {showUnmappedList && (
            <div className="mt-1.5 pt-1.5 border-t border-rule/60 text-[10px] text-ink-faint max-h-20 overflow-y-auto leading-relaxed">
              {unmappedSites.map((s) => s.site).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Station Grid / K-mer UMAP / Nautical GIS View */}
      {viewMode === 'kmer' ? (
        <div className="flex-1 overflow-y-auto p-3 bg-paper-sunk/30">
          <CommunityUmap height={height === 'h-[430px]' ? 'h-[310px]' : 'h-[400px]'} captionNumber={1} />
        </div>
      ) : viewMode === 'grid' ? (
        <div className="flex-1 overflow-y-auto p-4 bg-paper-sunk/30">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {siteProfiles.map((site) => {
              const metricEntry = allMetricValues.find((m) => m.site === site.site);
              const val = metricEntry ? metricEntry.val : 0;
              const fillColor = getColorForVal(val);
              const isSelected = selectedSiteId === site.site;

              return (
                <div
                  key={site.site}
                  onClick={() => {
                    setSelectedSiteId(site.site);
                    setActiveDrawer({ type: 'site', id: site.site });
                  }}
                  className={`p-2.5 rounded-plate border transition-all cursor-pointer bg-paper hover:shadow-floating ${
                    isSelected
                      ? 'border-survey ring-1 ring-survey shadow-sm'
                      : 'border-rule hover:border-rule-strong'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="font-mono text-[11px] font-semibold text-ink truncate" title={site.site}>
                      {site.site.split(' - ')[0]}
                    </span>
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-ink/40 flex-shrink-0"
                      style={{ backgroundColor: fillColor }}
                    />
                  </div>
                  <div className="space-y-0.5 text-[10px] font-mono text-ink-muted">
                    <div className="flex justify-between">
                      <span>Value:</span>
                      <span className="font-medium text-ink tabular-nums">
                        {typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(2) : val.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>ASVs:</span>
                      <span className="text-ink">{site.asvCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reads:</span>
                      <span className="text-ink">{site.totalAbundance.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : !hasValidGis ? (
        /* Empty GIS State */
        <div className="relative flex-1 flex flex-col items-center justify-center p-8 text-center bg-paper-raised">
          <div className="max-w-md space-y-3">
            <div className="w-12 h-12 rounded-full bg-paper-sunk border border-rule flex items-center justify-center mx-auto text-ink-muted">
              <Compass size={24} />
            </div>
            <h3 className="font-serif text-[18px] font-medium text-ink">
              Geographic Coordinates Missing
            </h3>
            <p className="text-[13px] text-ink-muted font-sans leading-relaxed">
              None of the {siteProfiles.length} stations have latitude/longitude in their metadata. Click below to assign coordinates or switch to the Station Grid layout to explore all stations.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowGeorefModal(true)}
                className="px-4 py-2 bg-survey hover:bg-survey-hover text-white rounded-control font-mono text-[12px] font-medium transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Sparkles size={14} />
                <span>Georeference Stations</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className="px-4 py-2 bg-paper border border-rule hover:border-rule-strong text-ink rounded-control font-mono text-[12px] transition-colors"
              >
                View Station Grid
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative flex-1 w-full h-full overflow-hidden">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full cursor-crosshair"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * svgWidth;
            const mouseY = ((e.clientY - rect.top) / rect.height) * svgHeight;
            setHoveredCoords(unproject(mouseX, mouseY));
          }}
          onMouseLeave={() => setHoveredCoords(null)}
        >
          {/* Chart Background (Deep Oceanic Abyss) */}
          <rect width={svgWidth} height={svgHeight} fill="#06101E" />

          {/* Stepped Bathymetric Depth Contours (Cyan Glow Lines) */}
          {isArabianSea && showContours && (
            <g className="stroke-[#0284C7]/30 fill-none" strokeWidth="0.8">
              {/* Shelf 100m Contour */}
              <path
                d="M 620,30 Q 600,150 580,280 T 540,490"
                strokeDasharray="4 2"
                strokeWidth="1"
                stroke="rgba(0, 212, 255, 0.35)"
              />
              <text x="590" y="160" className="fill-[#38BDF8] font-mono text-[9px]">
                -100m (Shelf)
              </text>

              {/* 500m Slope Contour */}
              <path
                d="M 520,30 Q 500,160 470,290 T 430,490"
                stroke="rgba(2, 132, 199, 0.45)"
                strokeWidth="0.9"
              />
              <text x="490" y="200" className="fill-[#38BDF8] font-mono text-[9px]">
                -500m (OMZ)
              </text>

              {/* 1000m Intermediate Contour */}
              <path
                d="M 420,30 Q 390,170 370,300 T 330,490"
                stroke="rgba(2, 132, 199, 0.35)"
                strokeWidth="0.8"
              />
              <text x="390" y="240" className="fill-[#38BDF8] font-mono text-[9px]">
                -1000m
              </text>

              {/* 2000m Bathyal Contour */}
              <path
                d="M 310,30 Q 280,180 260,310 T 220,490"
                stroke="rgba(2, 132, 199, 0.25)"
                strokeWidth="0.8"
              />
              <text x="280" y="280" className="fill-[#38BDF8] font-mono text-[9px]">
                -2000m (Bathyal)
              </text>

              {/* 3000m Abyssal Contour */}
              <path
                d="M 210,30 Q 180,190 160,320 T 120,490"
                stroke="rgba(2, 132, 199, 0.2)"
                strokeWidth="0.7"
                strokeDasharray="5 3"
              />
              <text x="180" y="320" className="fill-[#38BDF8] font-mono text-[9px]">
                -3000m (Abyssal)
              </text>
            </g>
          )}

          {/* Continental Coastline (Deep Shelf Navy Land) */}
          {isArabianSea && (
            <>
              <path
                d="M 680,0 Q 660,120 640,240 T 600,520 L 800,520 L 800,0 Z"
                fill="#0A1826"
                stroke="#0284C7"
                strokeWidth="1.2"
              />
              <text
                x="710"
                y="260"
                className="fill-[#38BDF8]/70 font-serif tracking-[0.2em] uppercase text-[11px] transform rotate-90"
              >
                Continental Shelf / Coast
              </text>
            </>
          )}

          {/* Graticule Grid Lines & Edge Ticks */}
          <g className="stroke-[#152A42]" strokeWidth="0.5" strokeDasharray="3 3">
            {latTicks.map((lat) => {
              const { y } = project(lat, 70);
              return (
                <line key={`lat-${lat}`} x1={padding} y1={y} x2={svgWidth - padding} y2={y} />
              );
            })}
            {lngTicks.map((lng) => {
              const { x } = project(16, lng);
              return (
                <line key={`lng-${lng}`} x1={x} y1={padding} x2={x} y2={svgHeight - padding} />
              );
            })}
          </g>

          {/* Graticule Frame Ticks & Degree Labels */}
          <rect
            x={padding}
            y={padding}
            width={svgWidth - 2 * padding}
            height={svgHeight - 2 * padding}
            fill="none"
            stroke="#1E3A5A"
            strokeWidth="1"
          />

          {latTicks.map((lat) => {
            const { y } = project(lat, bounds.minLng);
            return (
              <g key={`lbl-lat-${lat}`}>
                <line x1={padding - 4} y1={y} x2={padding} y2={y} stroke="#38BDF8" strokeWidth="1" />
                <text
                  x={padding - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-[#8BA2B8] font-mono text-[9px] tabular-nums"
                >
                  {lat}°N
                </text>
              </g>
            );
          })}

          {lngTicks.map((lng) => {
            const { x } = project(bounds.minLat, lng);
            return (
              <g key={`lbl-lng-${lng}`}>
                <line x1={x} y1={svgHeight - padding} x2={x} y2={svgHeight - padding + 4} stroke="#38BDF8" strokeWidth="1" />
                <text
                  x={x}
                  y={svgHeight - padding + 14}
                  textAnchor="middle"
                  className="fill-[#8BA2B8] font-mono text-[9px] tabular-nums"
                >
                  {lng}°E
                </text>
              </g>
            );
          })}

          {/* Sampling Station Markers */}
          {validSites.map((site) => {
            const { x, y } = project(site.latitude!, site.longitude!);
            const metricEntry = allMetricValues.find((m) => m.site === site.site);
            const val = metricEntry ? metricEntry.val : 0;
            const radius = getRadiusForVal(val);
            const fillColor = getColorForVal(val);
            const isSelected = selectedSiteId === site.site;
            const isHovered = hoveredSite === site.site;

            return (
              <g
                key={site.site}
                className="cursor-pointer transition-transform duration-150"
                onClick={() => {
                  setSelectedSiteId(site.site);
                  setActiveDrawer({ type: 'site', id: site.site });
                }}
                onMouseEnter={() => setHoveredSite(site.site)}
                onMouseLeave={() => setHoveredSite(null)}
              >
                {/* Outer glowing ring on selection or hover */}
                {(isSelected || isHovered) && (
                  <circle
                    cx={x}
                    cy={y}
                    r={radius + 4}
                    fill="none"
                    stroke="#00D4FF"
                    strokeWidth="1.8"
                    strokeDasharray={isSelected ? 'none' : '2 2'}
                  />
                )}

                {/* Flat proportional circle with crisp dark boundary */}
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={fillColor}
                  stroke="#040910"
                  strokeWidth="1.2"
                  fillOpacity="0.92"
                />

                {/* Station Label */}
                <text
                  x={x + radius + 4}
                  y={y + 3}
                  className="fill-[#F0F6FC] font-mono text-[10px] font-semibold tracking-wide pointer-events-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                >
                  {site.site.split(' - ')[0]}
                </text>
              </g>
            );
          })}

          {/* Nautical Compass Rose (North Arrow) */}
          <g transform="translate(730, 80)">
            <circle cx="0" cy="0" r="18" fill="none" stroke="#1E3A5A" strokeWidth="0.8" />
            <polygon points="0,-16 4,0 0,2 -4,0" fill="#00D4FF" />
            <polygon points="0,16 4,0 0,2 -4,0" fill="#0E2840" />
            <polygon points="16,0 0,-4 -2,0 0,4" fill="#0E2840" />
            <polygon points="-16,0 0,-4 -2,0 0,4" fill="#0E2840" />
            <text x="0" y="-20" textAnchor="middle" className="fill-[#00D4FF] font-serif font-bold text-[11px]">
              N
            </text>
          </g>

          {/* Chart Scale Bar */}
          <g transform={`translate(${padding + 16}, ${svgHeight - padding - 22})`}>
            <rect x="0" y="0" width="100" height="4" fill="#00D4FF" />
            <rect x="50" y="0" width="50" height="4" fill="#081424" stroke="#1E3A5A" strokeWidth="0.5" />
            <text x="0" y="-4" className="fill-[#8BA2B8] font-mono text-[9px]">0</text>
            <text x="50" y="-4" className="fill-[#8BA2B8] font-mono text-[9px]">50</text>
            <text x="100" y="-4" className="fill-[#8BA2B8] font-mono text-[9px]">100 km</text>
            <text x="0" y="14" className="fill-[#5C7288] font-mono text-[8px] uppercase tracking-wider">
              Mercator WGS-84
            </text>
          </g>
        </svg>

        {/* Legend Plate */}
        <div className="absolute bottom-3 right-3 bg-paper-raised/95 border border-rule p-2.5 rounded-plate shadow-floating text-[11px] font-mono">
          <div className="font-semibold text-ink mb-1.5 uppercase text-[10px] tracking-wider">
            {activeMetric === 'taxaRichness' && 'Observed Taxa'}
            {activeMetric === 'shannon' && "Shannon Diversity (H')"}
            {activeMetric === 'simpson' && 'Simpson Index (1-D)'}
            {activeMetric === 'asvRichness' && 'ASV Count'}
            {activeMetric === 'abundance' && 'Sequenced Reads'}
            {activeMetric === 'divergent' && 'Divergent Candidate Groups'}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-ink-faint text-[9px]">{minVal.toLocaleString()}</span>
            <div className="flex h-2 w-28 rounded-control overflow-hidden border border-rule">
              {oceanRamp.map((c, i) => (
                <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
              ))}
            </div>
            <span className="text-ink text-[9px] font-medium">{maxVal.toLocaleString()}</span>
          </div>
        </div>
      </div>
      )}

      {/* Georeference Modal */}
      {showGeorefModal && (
        <GeoreferenceModal
          expedition={expedition}
          onClose={() => setShowGeorefModal(false)}
          onSave={(updatedExpedition) => {
            setExpedition(updatedExpedition);
            setShowGeorefModal(false);
          }}
        />
      )}
    </div>
  );
};

