// ========================================================
// DEEPDRISHTI NAUTICAL HYDROGRAPHIC CHART MAP
// Muted paper-toned basemap, bathymetric contours, graticule ticks,
// scale bar, north arrow, live coordinates, and proportional markers.
// Seamlessly delegates to LeafletBiodiversityMap for high-performance
// GIS navigation while preserving Station Grid & K-mer Map views.
// ========================================================

import React, { useState, useMemo } from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import { Compass, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { GeoreferenceModal } from './GeoreferenceModal';
import { CommunityUmap } from './CommunityUmap';
import { LeafletBiodiversityMap } from './LeafletBiodiversityMap';

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

  // Determine metric value for all sites (used in Station Grid)
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

  // Sequential ramp colors: 7 stops
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
                title="Interactive Leaflet GIS Nautical basemap with seafloor telemetry"
              >
                <span>Nautical GIS</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 flex items-center gap-1 transition-colors border-l border-rule ${
                  viewMode === 'grid'
                    ? 'bg-survey text-white font-medium'
                    : 'text-ink-muted hover:text-ink hover:bg-paper-sunk'
                }`}
                title="Station Grid: explore all stations regardless of GPS metadata"
              >
                <span>Station Grid ({siteProfiles.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kmer')}
                className={`px-2.5 py-1 flex items-center gap-1 transition-colors border-l border-rule ${
                  viewMode === 'kmer'
                    ? 'bg-survey text-white font-medium'
                    : 'text-ink-muted hover:text-ink hover:bg-paper-sunk'
                }`}
                title="Community UMAP: 2D genetic ordination landscape"
              >
                <span>K-mer Map</span>
              </button>
            </div>
          </div>

          {/* Right Controls: Contours & Georeferencing */}
          <div className="flex items-center gap-3">
            {viewMode === 'gis' && (
              <label className="flex items-center gap-1.5 cursor-pointer text-ink text-[11px]">
                <input
                  type="checkbox"
                  checked={showContours}
                  onChange={(e) => setShowContours(e.target.checked)}
                  className="rounded border-rule text-survey focus:ring-0 cursor-pointer"
                />
                <span>Contours & Seamarks</span>
              </label>
            )}

            <button
              type="button"
              onClick={() => setShowGeorefModal(true)}
              className="px-2.5 py-1 bg-paper hover:bg-paper-sunk border border-rule hover:border-rule-strong text-ink rounded-control text-[11px] font-mono flex items-center gap-1.5 transition-colors"
              title="Add or edit latitude/longitude coordinates for stations"
            >
              <Sparkles size={12} className="text-survey" />
              <span>Georeference Stations</span>
            </button>
          </div>
        </div>
      )}

      {/* Unmapped Metadata Notification Banner */}
      {unmappedSites.length > 0 && viewMode === 'gis' && (
        <div className="px-4 py-2 bg-paper-sunk/90 border-b border-rule text-[11px] font-mono z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-ink-muted">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>
                <strong className="text-ink">{unmappedSites.length} stations</strong> without GPS coordinates in metadata.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowGeorefModal(true)}
                className="text-survey hover:underline font-medium"
              >
                Assign Coordinates / Apply Preset →
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className="text-ink hover:text-survey transition-colors underline"
              >
                Switch to Station Grid View
              </button>
              <button
                type="button"
                onClick={() => setShowUnmappedList((v) => !v)}
                className="text-ink-faint hover:text-ink flex items-center gap-0.5 text-[10px]"
              >
                <span>{showUnmappedList ? 'Hide' : 'View list'}</span>
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
        /* Real Interactive Leaflet Biodiversity Nautical Map */
        <LeafletBiodiversityMap
          height="h-full flex-1 min-h-[460px]"
          selectedMetric={activeMetric}
          showContours={showContours}
        />
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
