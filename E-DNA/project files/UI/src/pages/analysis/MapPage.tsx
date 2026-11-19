// ========================================================
// DEEPDRISHTI BIODIVERSITY MAP PAGE
// Dedicated large nautical chart workstation with synchronized side profile
// and integrated Location × Taxa heatmap underneath
// ========================================================

import React, { useState } from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import { HydrographicMap } from '../../components/visualization/HydrographicMap';
import type { MapMetricType } from '../../components/visualization/HydrographicMap';
import { LocationTaxaHeatmap } from '../../components/visualization/LocationTaxaHeatmap';
import { KPICard } from '../../components/common/KPICard';
import { MapPin, LayoutGrid, Layers, Columns, ArrowRight, Eye, EyeOff } from 'lucide-react';

type WorkstationView = 'gis_chart' | 'taxa_heatmap' | 'combined';

export const MapPage: React.FC = () => {
  const { siteProfiles, selectedSiteId, setActiveDrawer } = useAnalysis();
  const [metric, setMetric] = useState<MapMetricType>('taxaRichness');
  const [workstationView, setWorkstationView] = useState<WorkstationView>('gis_chart');
  const [showSideProfile, setShowSideProfile] = useState(true);

  // Currently selected site profile or first available
  const activeProfile = selectedSiteId
    ? siteProfiles.find((s) => s.site === selectedSiteId)
    : siteProfiles[0];

  return (
    <div className="space-y-6">
      {/* Title & View Switcher Bar */}
      <div className="border-b border-rule pb-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block">
            Spatial Oceanography
          </span>
          <h1 className="font-serif text-[26px] font-medium text-ink leading-tight">
            eDNA-Derived Ocean Biodiversity Distribution
          </h1>
          <p className="text-[13px] text-ink-muted mt-1">
            Observed biological diversity across hydrographic sampling stations derived strictly from amplicon sequence occurrences.
          </p>
        </div>

        {/* Professional Workstation Mode Switcher */}
        <div className="flex items-center gap-1 bg-paper-sunk p-1 rounded-control border border-rule text-[12px] font-mono">
          <button
            type="button"
            onClick={() => setWorkstationView('gis_chart')}
            className={`px-3 py-1.5 rounded-control transition-colors flex items-center gap-1.5 ${
              workstationView === 'gis_chart'
                ? 'bg-survey text-white font-medium shadow-sm'
                : 'text-ink-muted hover:text-ink hover:bg-paper'
            }`}
          >
            <Layers size={13} />
            <span>Bathymetric GIS Chart</span>
          </button>
          <button
            type="button"
            onClick={() => setWorkstationView('taxa_heatmap')}
            className={`px-3 py-1.5 rounded-control transition-colors flex items-center gap-1.5 ${
              workstationView === 'taxa_heatmap'
                ? 'bg-survey text-white font-medium shadow-sm'
                : 'text-ink-muted hover:text-ink hover:bg-paper'
            }`}
          >
            <LayoutGrid size={13} />
            <span>Location × Taxa Heatmap</span>
          </button>
          <button
            type="button"
            onClick={() => setWorkstationView('combined')}
            className={`px-3 py-1.5 rounded-control transition-colors flex items-center gap-1.5 ${
              workstationView === 'combined'
                ? 'bg-survey text-white font-medium shadow-sm'
                : 'text-ink-muted hover:text-ink hover:bg-paper'
            }`}
          >
            <Columns size={13} />
            <span>Combined View</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: FOCUSED GIS CHART & PROFILE */}
      {(workstationView === 'gis_chart' || workstationView === 'combined') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Large Interactive Map */}
          <div className={`${showSideProfile ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col space-y-2 transition-all`}>
            <HydrographicMap
              height={workstationView === 'combined' ? 'h-[480px]' : 'h-[580px]'}
              selectedMetric={metric}
              onSelectMetric={setMetric}
            />
            <div className="flex items-center justify-between text-[11px] font-mono text-ink-faint">
              <span className="italic">
                Fig. 1 — Hydrographic chart with calibrated isobaths, graticule frame, and dynamic teardrop pins. Click any pin to load telemetry.
              </span>
              <div className="flex items-center gap-3">
                {!showSideProfile && (
                  <button
                    type="button"
                    onClick={() => setShowSideProfile(true)}
                    className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-mono text-[11px]"
                    title="Show station telemetry profile"
                  >
                    <Eye size={13} />
                    <span>Show Station Profile</span>
                  </button>
                )}
                {workstationView === 'gis_chart' && (
                  <button
                    type="button"
                    onClick={() => setWorkstationView('taxa_heatmap')}
                    className="text-survey hover:underline flex items-center gap-1 font-sans"
                  >
                    <span>Open Heatmap Matrix</span>
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right-Side Analysis Profile */}
          {showSideProfile && (
            <div className="lg:col-span-4 bg-[#050A14] border border-rule rounded-plate p-5 space-y-4 max-h-[580px] overflow-y-auto shadow-xl">
              <div className="border-b border-rule pb-3 flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-sky-400 block font-semibold">
                    Active Station Profile
                  </span>
                  <h2 className="font-serif text-[18px] font-medium text-white flex items-center gap-1.5 mt-0.5">
                    <MapPin size={16} className="text-sky-400 shrink-0" />
                    <span className="truncate">{activeProfile ? activeProfile.site : 'No Station Selected'}</span>
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSideProfile(false)}
                  className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Hide side panel to maximize map"
                >
                  <EyeOff size={15} />
                </button>
              </div>

              {activeProfile ? (
                <div className="space-y-4 font-sans">
                  {/* Coordinates & Depths */}
                  <div className="bg-[#03070E] border border-rule rounded p-3 text-[12px] font-mono space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Coordinates:</span>
                      <span className="text-sky-300 font-semibold">
                        {activeProfile.latitude !== undefined && activeProfile.longitude !== undefined
                          ? `${activeProfile.latitude.toFixed(4)}°N, ${activeProfile.longitude.toFixed(4)}°E`
                          : 'Requires metadata'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Sampling Depths:</span>
                      <span className="text-white font-medium">
                        {activeProfile.depths.length > 0 ? activeProfile.depths.map((d) => `${d}m`).join(', ') : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Total Reads:</span>
                      <span className="text-white font-semibold tabular-nums">
                        {activeProfile.totalAbundance.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Station Biodiversity Metrics */}
                  <div className="grid grid-cols-2 gap-2">
                    <KPICard
                      eyebrow="ASVs"
                      value={activeProfile.asvCount}
                      meta="exact sequence variants"
                      meaning="The number of distinct, error-corrected DNA barcode sequences found in this station's water samples."
                      formula="ASVs = Count of unique amplicon sequence variants"
                      interpretation="High ASV counts mean high genetic variety in the local micro-plankton and marine organisms at this GPS site."
                    />
                    <KPICard
                      eyebrow="Taxa"
                      value={activeProfile.taxaCount}
                      meta="identified groups"
                      meaning="The number of distinct biological species, genera, or families classified at this hydrographic station."
                      formula="Taxa = Count of recognized biological taxonomic groups"
                      interpretation="Shows how many different kinds of marine organisms live together at this station's depth and coordinate."
                    />
                    <KPICard
                      eyebrow="Shannon"
                      value={activeProfile.shannon}
                      unit="H'"
                      meta="entropy index"
                      meaning="Measures both species variety and how evenly the DNA counts are shared among them."
                      formula="H' = - Sum [ (Species Share) × ln(Species Share) ]"
                      interpretation="Scores above 2.0 mean a balanced, healthy community. Scores below 1.0 mean a single species dominates this water layer."
                    />
                    <KPICard
                      eyebrow="Simpson"
                      value={activeProfile.simpson}
                      unit="1-D"
                      meta="dominance weight"
                      meaning="The likelihood (from 0 to 1) that two random DNA reads from this station belong to completely different species."
                      formula="1 - D = 1 - Sum [ (Species Share)² ]"
                      interpretation="Values near 1.0 mean great diversity with no single species crowding out others. Low values mean one dominant organism."
                    />
                  </div>

                  {/* Dominant Taxa */}
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-neutral-400 block mb-2 font-semibold">
                      Dominant Detected Groups
                    </span>
                    <div className="border border-rule rounded overflow-hidden max-h-[140px] overflow-y-auto">
                      <table className="w-full text-left text-[11px] font-mono">
                        <thead className="bg-[#03070E] border-b border-rule sticky top-0">
                          <tr>
                            <th className="px-2.5 py-1 text-neutral-400 font-normal">Taxon</th>
                            <th className="px-2.5 py-1 text-neutral-400 font-normal text-right">%</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rule/60 bg-[#050A14]">
                          {activeProfile.dominantTaxa.map((d, i) => (
                            <tr key={i}>
                              <td className="px-2.5 py-1 text-neutral-200">{d.taxon}</td>
                              <td className="px-2.5 py-1 text-right text-sky-400 font-semibold tabular-nums">
                                {d.percentage}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Inspect Full Station Action */}
                  <button
                    type="button"
                    onClick={() => setActiveDrawer({ type: 'site', id: activeProfile.site })}
                    className="w-full py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold rounded text-xs transition-colors shadow-md font-mono"
                  >
                    Inspect Detailed Station Dossier →
                  </button>
                </div>
              ) : (
                <div className="py-8 text-center text-neutral-400 font-mono text-[12px]">
                  Select a station on the chart to inspect.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: LOCATION × TAXA HEATMAP */}
      {(workstationView === 'taxa_heatmap' || workstationView === 'combined') && (
        <div className={`space-y-3 ${workstationView === 'combined' ? 'pt-4 border-t border-rule' : ''}`}>
          <LocationTaxaHeatmap captionNumber={workstationView === 'combined' ? 2 : 1} />
        </div>
      )}
    </div>
  );
};
