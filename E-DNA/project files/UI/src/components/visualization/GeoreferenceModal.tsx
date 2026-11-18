// ========================================================
// DEEPDRISHTI STATION GEOREFERENCING MODAL
// Allows assigning latitude, longitude, and depth to samples/stations
// or applying standard oceanographic transect presets
// ========================================================

import React, { useState } from 'react';
import { X, MapPin, Sparkles, Save, Check } from 'lucide-react';
import type { Expedition, Sample } from '../../domain/types';
import { saveExpedition } from '../../services/dataService';

interface GeoreferenceModalProps {
  expedition: Expedition;
  onClose: () => void;
  onSave: (updatedExpedition: Expedition) => void;
}

export const GeoreferenceModal: React.FC<GeoreferenceModalProps> = ({
  expedition,
  onClose,
  onSave,
}) => {
  // Group samples or edit individual sample coordinates
  const [samples, setSamples] = useState<Sample[]>(() => JSON.parse(JSON.stringify(expedition.samples)));
  const [isSaving, setIsSaving] = useState(false);
  const [appliedPreset, setAppliedPreset] = useState<string | null>(null);

  // Group unique station prefixes for smart auto-assignment
  const updateSampleCoord = (sampleId: string, field: 'latitude' | 'longitude' | 'depth', val: number | undefined) => {
    setSamples((prev) =>
      prev.map((s) => (s.sample_id === sampleId ? { ...s, [field]: val } : s))
    );
  };

  const autoAssignTransect = (preset: 'arabian_sea' | 'monterey_bay' | 'bay_of_bengal') => {
    // Determine unique stations from sample IDs
    const stationGroups = new Map<string, Sample[]>();
    samples.forEach((s) => {
      // Group by station name (e.g. 05114c01 from 05114c01_12_edna_1)
      const stationKey = s.site ? s.site.split('_')[0] : s.sample_id.split('_')[0];
      if (!stationGroups.has(stationKey)) {
        stationGroups.set(stationKey, []);
      }
      stationGroups.get(stationKey)!.push(s);
    });

    const uniqueStationKeys = Array.from(stationGroups.keys());
    const count = uniqueStationKeys.length;

    // Config presets
    let startLat = 15.0;
    let endLat = 19.5;
    let startLng = 68.5;
    let endLng = 72.8;

    if (preset === 'monterey_bay') {
      startLat = 36.6;
      endLat = 36.9;
      startLng = -122.4;
      endLng = -121.8;
    } else if (preset === 'bay_of_bengal') {
      startLat = 13.0;
      endLat = 18.5;
      startLng = 82.0;
      endLng = 88.0;
    }

    const updated = samples.map((s) => {
      const stationKey = s.site ? s.site.split('_')[0] : s.sample_id.split('_')[0];
      const stationIdx = uniqueStationKeys.indexOf(stationKey);
      const frac = count > 1 ? stationIdx / (count - 1) : 0.5;

      const lat = Number((startLat + frac * (endLat - startLat)).toFixed(3));
      const lng = Number((startLng + frac * (endLng - startLng)).toFixed(3));

      // Try to parse depth from sample_id e.g. _12_edna or _0m_
      let depth = s.depth;
      if (depth === undefined) {
        const depthMatch = s.sample_id.match(/_(\d+)(?:m|_edna)/i);
        if (depthMatch) {
          depth = parseInt(depthMatch[1], 10);
        } else {
          depth = 10;
        }
      }

      return {
        ...s,
        latitude: lat,
        longitude: lng,
        depth,
      };
    });

    setSamples(updated);
    setAppliedPreset(preset);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedExpedition: Expedition = {
        ...expedition,
        samples,
      };
      await saveExpedition(updatedExpedition);
      onSave(updatedExpedition);
      onClose();
    } catch (err) {
      console.error('Failed to save coordinates:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4 select-none animate-in fade-in duration-150">
      <div className="bg-paper-raised border border-rule-strong rounded-plate shadow-floating w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-rule flex items-center justify-between bg-paper-sunk/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-survey/10 text-survey flex items-center justify-center border border-survey/30">
              <MapPin size={16} />
            </div>
            <div>
              <h3 className="font-serif text-[18px] font-medium text-ink">
                Georeference Sampling Stations
              </h3>
              <p className="text-[11px] font-mono text-ink-muted">
                Assign GPS coordinates (Lat/Lng) and depths to enable nautical chart mapping
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-muted hover:text-ink p-1.5 rounded-control hover:bg-paper-sunk transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Presets Strip */}
        <div className="px-5 py-3 bg-paper-sunk/60 border-b border-rule flex flex-wrap items-center justify-between gap-3 text-[12px] font-mono">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-survey" />
            <span className="text-ink font-medium">Quick Oceanographic Transect Presets:</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => autoAssignTransect('arabian_sea')}
              className="px-3 py-1 bg-paper border border-rule hover:border-survey text-ink rounded-control transition-colors"
            >
              Arabian Sea Transect (15°–19.5°N)
            </button>
            <button
              type="button"
              onClick={() => autoAssignTransect('bay_of_bengal')}
              className="px-3 py-1 bg-paper border border-rule hover:border-survey text-ink rounded-control transition-colors"
            >
              Bay of Bengal Transect
            </button>
            <button
              type="button"
              onClick={() => autoAssignTransect('monterey_bay')}
              className="px-3 py-1 bg-paper border border-rule hover:border-survey text-ink rounded-control transition-colors"
            >
              Monterey Bay / CANON
            </button>
          </div>
        </div>

        {appliedPreset && (
          <div className="px-5 py-1.5 bg-biological/10 text-biological border-b border-biological/20 text-[11px] font-mono flex items-center gap-1.5">
            <Check size={13} />
            <span>Assigned realistic {appliedPreset.replace(/_/g, ' ')} coordinates to {samples.length} samples. Click Save below to apply to the map.</span>
          </div>
        )}

        {/* Editable Sample Table */}
        <div className="flex-1 overflow-y-auto p-5">
          <table className="w-full text-left text-[12px] font-mono border border-rule rounded-plate">
            <thead className="bg-paper-sunk border-b border-rule sticky top-0 text-ink-muted">
              <tr>
                <th className="px-3 py-2 font-normal">#</th>
                <th className="px-3 py-2 font-normal">Sample ID</th>
                <th className="px-3 py-2 font-normal">Station / Site</th>
                <th className="px-3 py-2 font-normal">Latitude (°N)</th>
                <th className="px-3 py-2 font-normal">Longitude (°E)</th>
                <th className="px-3 py-2 font-normal">Depth (m)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule bg-paper">
              {samples.map((s, idx) => (
                <tr key={s.sample_id} className="hover:bg-paper-sunk/40">
                  <td className="px-3 py-1.5 text-ink-faint">{idx + 1}</td>
                  <td className="px-3 py-1.5 font-medium text-ink truncate max-w-[200px]" title={s.sample_id}>
                    {s.sample_id}
                  </td>
                  <td className="px-3 py-1.5 text-ink-muted truncate max-w-[140px]">{s.site}</td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      step="0.001"
                      placeholder="e.g. 17.5"
                      value={s.latitude ?? ''}
                      onChange={(e) =>
                        updateSampleCoord(
                          s.sample_id,
                          'latitude',
                          e.target.value !== '' ? parseFloat(e.target.value) : undefined
                        )
                      }
                      className="w-24 bg-paper-raised border border-rule px-2 py-0.5 rounded-control focus:outline-none focus:border-survey text-[11px]"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      step="0.001"
                      placeholder="e.g. 71.2"
                      value={s.longitude ?? ''}
                      onChange={(e) =>
                        updateSampleCoord(
                          s.sample_id,
                          'longitude',
                          e.target.value !== '' ? parseFloat(e.target.value) : undefined
                        )
                      }
                      className="w-24 bg-paper-raised border border-rule px-2 py-0.5 rounded-control focus:outline-none focus:border-survey text-[11px]"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      step="1"
                      placeholder="0"
                      value={s.depth ?? ''}
                      onChange={(e) =>
                        updateSampleCoord(
                          s.sample_id,
                          'depth',
                          e.target.value !== '' ? parseInt(e.target.value, 10) : undefined
                        )
                      }
                      className="w-20 bg-paper-raised border border-rule px-2 py-0.5 rounded-control focus:outline-none focus:border-survey text-[11px]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-rule bg-paper-sunk/40 flex items-center justify-between">
          <span className="text-[11px] font-mono text-ink-faint">
            {samples.filter((s) => s.latitude !== undefined && s.longitude !== undefined).length} of {samples.length} samples georeferenced
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 border border-rule text-ink hover:bg-paper-sunk rounded-control font-mono text-[12px] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-5 py-1.5 bg-survey hover:bg-survey-hover text-white rounded-control font-mono text-[12px] font-medium flex items-center gap-1.5 shadow-floating transition-colors disabled:opacity-50"
            >
              <Save size={14} />
              <span>{isSaving ? 'Saving...' : 'Apply & Update Map'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
