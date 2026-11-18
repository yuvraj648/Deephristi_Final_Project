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
import { MapPin } from 'lucide-react';

export const MapPage: React.FC = () => {
  const { siteProfiles, selectedSiteId, setActiveDrawer } = useAnalysis();
  const [metric, setMetric] = useState<MapMetricType>('taxaRichness');

  // Currently selected site profile or first available
  const activeProfile = selectedSiteId
    ? siteProfiles.find((s) => s.site === selectedSiteId)
    : siteProfiles[0];

  return (
    <div className="space-y-6">
      {/* Title & Subtitle */}
      <div className="border-b border-rule pb-3">
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

      {/* Main Map + Right-Side Station Profile Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Large Interactive Map */}
        <div className="lg:col-span-8 flex flex-col space-y-2">
          <HydrographicMap
            height="h-[520px]"
            selectedMetric={metric}
            onSelectMetric={setMetric}
          />
          <p className="text-[12px] font-serif italic text-ink-faint">
            Fig. 1 — Hydrographic chart plate with calibrated isobaths, graticule frame, and proportional markers. Click any station marker to load biological telemetry.
          </p>
        </div>

        {/* Right-Side Analysis Profile */}
        <div className="lg:col-span-4 bg-paper-raised border border-rule rounded-plate p-5 space-y-5">
          <div className="border-b border-rule pb-3">
            <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block">
              Active Station Profile
            </span>
            <h2 className="font-serif text-[18px] font-medium text-ink flex items-center gap-1.5 mt-0.5">
              <MapPin size={16} className="text-survey" />
              <span>{activeProfile ? activeProfile.site : 'No Station Selected'}</span>
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
                <div className="border border-rule rounded-plate overflow-hidden">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead className="bg-paper-sunk border-b border-rule">
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
                className="w-full py-2 bg-paper border border-rule hover:border-rule-strong text-ink font-mono text-[12px] rounded-control transition-colors"
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

      {/* Synchronized Location × Taxa Heatmap Below Map */}
      <div className="pt-4 border-t border-rule">
        <LocationTaxaHeatmap captionNumber={2} />
      </div>
    </div>
  );
};
