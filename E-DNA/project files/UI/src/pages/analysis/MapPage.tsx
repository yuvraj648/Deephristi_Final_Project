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
import { MapPin, LayoutGrid, Layers, Columns, ArrowRight } from 'lucide-react';

type WorkstationView = 'gis_chart' | 'taxa_heatmap' | 'combined';

export const MapPage: React.FC = () => {
  const { siteProfiles, selectedSiteId, setActiveDrawer } = useAnalysis();
  const [metric, setMetric] = useState<MapMetricType>('taxaRichness');
  const [workstationView, setWorkstationView] = useState<WorkstationView>('gis_chart');

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
          <div className="lg:col-span-8 flex flex-col space-y-2">
            <HydrographicMap
              height={workstationView === 'combined' ? 'h-[430px]' : 'h-[500px]'}
              selectedMetric={metric}
              onSelectMetric={setMetric}
            />
            <div className="flex items-center justify-between text-[11px] font-mono text-ink-faint">
              <span className="italic">
                Fig. 1 — Hydrographic chart with calibrated isobaths, graticule frame, and dynamic teardrop pins. Click any pin to load telemetry.
              </span>
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

          {/* Right-Side Analysis Profile */}
          <div className="lg:col-span-4 bg-paper-raised border border-rule rounded-plate p-5 space-y-5">
            <div className="border-b border-rule pb-3">
              <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block">
                Active Station Profile
              </span>
              <h2 className="font-serif text-[18px] font-medium text-ink flex items-center gap-1.5 mt-0.5">
                <MapPin size={16} className="text-survey shrink-0" />
                <span className="truncate">{activeProfile ? activeProfile.site : 'No Station Selected'}</span>
              </h2>
            </div>

            {activeProfile ? (
              <div className="space-y-4">
                {/* Coordinates & Depths */}
                <div className="bg-paper-sunk/60 border border-rule rounded-plate p-3 text-[12px] font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-ink-faint">Coordinates:</span>
                    <span className="text-ink font-medium">
                      {activeProfile.latitude !== undefined && activeProfile.longitude !== undefined
                        ? `${activeProfile.latitude.toFixed(2)}°N, ${activeProfile.longitude.toFixed(2)}°E`
                        : 'Requires metadata'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-faint">Sampling Depths:</span>
                    <span className="text-ink font-medium">
                      {activeProfile.depths.length > 0 ? activeProfile.depths.map((d) => `${d}m`).join(', ') : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-faint">Total Reads:</span>
                    <span className="text-ink font-semibold tabular-nums">
                      {activeProfile.totalAbundance.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Station Biodiversity Metrics */}
                <div className="grid grid-cols-2 gap-2">
                  <KPICard eyebrow="ASVs" value={activeProfile.asvCount} />
                  <KPICard eyebrow="Taxa" value={activeProfile.taxaCount} />
                  <KPICard eyebrow="Shannon" value={activeProfile.shannon} unit="H'" />
                  <KPICard eyebrow="Simpson" value={activeProfile.simpson} unit="1-D" />
                </div>

                {/* Dominant Taxa */}
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block mb-2">
                    Dominant Detected Groups
                  </span>
                  <div className="border border-rule rounded-plate overflow-hidden max-h-[140px] overflow-y-auto">
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead className="bg-paper-sunk border-b border-rule sticky top-0">
                        <tr>
                          <th className="px-2.5 py-1 text-ink-muted font-normal">Taxon</th>
                          <th className="px-2.5 py-1 text-ink-muted font-normal text-right">%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rule bg-paper">
                        {activeProfile.dominantTaxa.map((d, i) => (
                          <tr key={i}>
                            <td className="px-2.5 py-1 text-ink">{d.taxon}</td>
                            <td className="px-2.5 py-1 text-right text-ink font-medium tabular-nums">
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
                  className="w-full py-2 bg-paper border border-rule hover:border-survey text-ink hover:text-survey font-mono text-[12px] rounded-control transition-colors"
                >
                  Inspect Detailed Station Dossier →
                </button>
              </div>
            ) : (
              <div className="py-8 text-center text-ink-faint font-mono text-[12px]">
                Select a station on the chart to inspect.
              </div>
            )}
          </div>
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
