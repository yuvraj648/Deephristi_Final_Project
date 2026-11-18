// ========================================================
// DEEPDRISHTI CREATE RESEARCH EXPEDITION
// Guided expedition setup: metadata, sampling stations, coordinate matrix
// Integrated with Interactive Leaflet Satellite/Ocean Map Picker
// ========================================================

import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, ArrowRight, MapPin, Compass } from 'lucide-react';
import type { Sample } from '../../domain/types';
import { StationMapPicker } from '../../components/workflow/StationMapPicker';
import type { StationData } from '../../components/workflow/StationMapPicker';

interface NewExpeditionFormProps {
  onCancel: () => void;
  onProceed: (expeditionMeta: {
    name: string;
    researcher: string;
    region: string;
    description: string;
    date: string;
    initialSamples: Sample[];
  }) => void;
}

export const NewExpeditionForm: React.FC<NewExpeditionFormProps> = ({ onCancel, onProceed }) => {
  const [name, setName] = useState('');
  const [researcher, setResearcher] = useState('Dr. Swaminathan Marine Lab');
  const [region, setRegion] = useState('Eastern Arabian Sea & Malabar Coast');
  const [date, setDate] = useState('2026-03-30');
  const [description, setDescription] = useState('');

  const [stations, setStations] = useState<StationData[]>([
    { sampleId: 'SMP_001', site: 'Station S01 - Coastal Reef', lat: '15.45', lng: '73.75', depth: '25' },
    { sampleId: 'SMP_002', site: 'Station S02 - Continental Shelf', lat: '14.80', lng: '72.90', depth: '150' },
    { sampleId: 'SMP_003', site: 'Station S03 - Bathyal Basin', lat: '13.95', lng: '71.80', depth: '1200' },
  ]);

  const [selectedStationIndex, setSelectedStationIndex] = useState<number>(0);

  const addStation = () => {
    const idx = stations.length + 1;
    const newStation: StationData = {
      sampleId: `SMP_${String(idx).padStart(3, '0')}`,
      site: `Station S0${idx}`,
      lat: '',
      lng: '',
      depth: '50',
    };
    setStations([...stations, newStation]);
    setSelectedStationIndex(stations.length);
  };

  const addStationWithCoords = (lat: string, lng: string) => {
    const idx = stations.length + 1;
    const newStation: StationData = {
      sampleId: `SMP_${String(idx).padStart(3, '0')}`,
      site: `Station S0${idx} - Marine Transect`,
      lat,
      lng,
      depth: '45',
    };
    setStations([...stations, newStation]);
    setSelectedStationIndex(stations.length);
  };

  const updateStationCoords = (index: number, lat: string, lng: string) => {
    if (index < 0 || index >= stations.length) return;
    const updated = [...stations];
    updated[index] = {
      ...updated[index],
      lat,
      lng,
    };
    setStations(updated);
  };

  const removeStation = (index: number) => {
    if (stations.length <= 1) return;
    const updated = stations.filter((_, i) => i !== index);
    setStations(updated);
    if (selectedStationIndex >= updated.length) {
      setSelectedStationIndex(Math.max(0, updated.length - 1));
    }
  };

  const updateStation = (index: number, field: keyof StationData, value: string) => {
    const updated = [...stations];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setStations(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const initialSamples: Sample[] = stations.map((st) => ({
      sample_id: st.sampleId || `SMP_${Date.now()}`,
      site: st.site || 'Unspecified Station',
      latitude: st.lat ? parseFloat(st.lat) : undefined,
      longitude: st.lng ? parseFloat(st.lng) : undefined,
      depth: st.depth ? parseFloat(st.depth) : undefined,
      date,
    }));

    onProceed({
      name,
      researcher,
      region: region || 'Indian Ocean Basin',
      description,
      date,
      initialSamples,
    });
  };

  return (
    <div className="min-h-screen bg-paper p-6 font-sans text-ink flex flex-col justify-between select-none">
      <header className="flex items-center justify-between border-b border-rule pb-3 max-w-5xl mx-auto w-full">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 text-ink-muted hover:text-ink text-[12px] font-mono transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Cancel & Return</span>
        </button>
        <span className="font-mono text-[11px] text-ink-faint uppercase tracking-wider">
          Step 1 of 4 • Expedition Definition & Hydrographic Framework
        </span>
      </header>

      <main className="max-w-5xl mx-auto my-6 w-full flex-1">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Plate */}
          <div className="bg-paper-raised border border-rule rounded-plate p-6 shadow-md">
            <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-survey block mb-1">
              Field Study Protocol
            </span>
            <h1 className="font-sans text-[24px] font-semibold text-ink tracking-tight mb-1">
              Create Research Expedition
            </h1>
            <p className="text-[13px] text-ink-muted">
              Configure survey metadata and hydrographic field stations. You can pinpoint sampling sites directly on the interactive satellite/ocean map below or type coordinates manually.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-muted mb-1">
                  Expedition Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lakshadweep eDNA Reef Biodiversity Survey"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-paper border border-rule rounded-control px-3 py-1.5 text-[13px] font-mono text-ink focus:outline-none focus:border-survey shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-muted mb-1">
                  Lead Researcher / Institute *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. A. Ramanathan (National Institute of Oceanography)"
                  value={researcher}
                  onChange={(e) => setResearcher(e.target.value)}
                  className="w-full bg-paper border border-rule rounded-control px-3 py-1.5 text-[13px] font-mono text-ink focus:outline-none focus:border-survey shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-muted mb-1">
                  Study Oceanographic Region *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eastern Arabian Sea & Malabar Coast"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full bg-paper border border-rule rounded-control px-3 py-1.5 text-[13px] font-mono text-ink focus:outline-none focus:border-survey shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-muted mb-1">
                  Sampling Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-paper border border-rule rounded-control px-3 py-1.5 text-[13px] font-mono text-ink focus:outline-none focus:border-survey shadow-inner"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-muted mb-1">
                  Expedition Objectives & Field Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Detailed scientific objectives, transect parameters, and water filtration protocols..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-paper border border-rule rounded-control px-3 py-1.5 text-[13px] font-sans text-ink focus:outline-none focus:border-survey shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* Interactive Map Section */}
          <div className="bg-paper-raised border border-rule rounded-plate p-6 space-y-4 shadow-md">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-survey block">
                Geospatial Matrix
              </span>
              <h2 className="font-sans text-[18px] font-semibold text-ink tracking-tight flex items-center gap-2">
                <Compass size={18} className="text-survey" />
                <span>Geographic Station Pinpointing</span>
              </h2>
              <p className="text-[12px] text-ink-muted mt-0.5">
                Click anywhere on the map to set coordinates or drop a new station. Drag any pin to fine-tune its position.
              </p>
            </div>

            {/* Live Leaflet Map Component */}
            <StationMapPicker
              stations={stations}
              selectedStationIndex={selectedStationIndex}
              onSelectStation={(idx) => setSelectedStationIndex(idx)}
              onUpdateStationCoords={updateStationCoords}
              onAddStationAtCoords={addStationWithCoords}
              regionName={region}
            />

            {/* Stations Table */}
            <div className="pt-2">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-rule">
                <div>
                  <h3 className="font-sans text-[15px] font-semibold text-ink tracking-tight">
                    Field Stations & Depths
                  </h3>
                  <span className="text-[11px] font-mono text-ink-faint">
                    Select a row to link it with the map, or type coordinates directly to update map markers.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={addStation}
                  className="px-3 py-1 bg-paper border border-rule hover:border-survey text-ink font-mono text-[11px] rounded-control flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Plus size={13} className="text-survey" />
                  <span>+ Add Station Row</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-control border border-rule">
                <table className="w-full text-left text-[12px] font-mono">
                  <thead className="bg-paper-sunk border-b border-rule">
                    <tr>
                      <th className="px-3 py-2 font-normal text-ink-muted w-12 text-center">Pin</th>
                      <th className="px-3 py-2 font-normal text-ink-muted">Sample ID</th>
                      <th className="px-3 py-2 font-normal text-ink-muted">Site / Station Name</th>
                      <th className="px-3 py-2 font-normal text-ink-muted">Latitude (°N)</th>
                      <th className="px-3 py-2 font-normal text-ink-muted">Longitude (°E)</th>
                      <th className="px-3 py-2 font-normal text-ink-muted">Depth (m)</th>
                      <th className="px-2 py-2 font-normal text-ink-muted text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule bg-paper">
                    {stations.map((st, idx) => {
                      const isSelected = selectedStationIndex === idx;
                      return (
                        <tr
                          key={idx}
                          onClick={() => setSelectedStationIndex(idx)}
                          className={`transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-survey-tint/30 border-l-2 border-l-survey'
                              : 'hover:bg-paper-raised/60'
                          }`}
                        >
                          {/* Station Pin Indicator */}
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                                isSelected
                                  ? 'bg-survey text-white ring-2 ring-survey/40 shadow-sm'
                                  : 'bg-paper-raised border border-rule text-ink-muted'
                              }`}
                              title={isSelected ? 'Active station on map' : 'Click to select this station'}
                            >
                              {idx + 1}
                            </span>
                          </td>

                          {/* Sample ID */}
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={st.sampleId}
                              onChange={(e) => updateStation(idx, 'sampleId', e.target.value)}
                              className="w-24 bg-paper-raised border border-rule px-2 py-1 rounded-control focus:outline-none focus:border-survey text-[12px]"
                            />
                          </td>

                          {/* Site Name */}
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={st.site}
                              onChange={(e) => updateStation(idx, 'site', e.target.value)}
                              placeholder="e.g. Station 01 - Coastal"
                              className="w-48 bg-paper-raised border border-rule px-2 py-1 rounded-control focus:outline-none focus:border-survey text-[12px]"
                            />
                          </td>

                          {/* Latitude */}
                          <td className="px-3 py-2">
                            <div className="relative flex items-center">
                              <input
                                type="number"
                                step="0.0001"
                                placeholder="e.g. 15.45"
                                value={st.lat}
                                onChange={(e) => updateStation(idx, 'lat', e.target.value)}
                                className="w-28 bg-paper-raised border border-rule px-2 py-1 rounded-control focus:outline-none focus:border-survey text-[12px]"
                              />
                            </div>
                          </td>

                          {/* Longitude */}
                          <td className="px-3 py-2">
                            <div className="relative flex items-center">
                              <input
                                type="number"
                                step="0.0001"
                                placeholder="e.g. 73.75"
                                value={st.lng}
                                onChange={(e) => updateStation(idx, 'lng', e.target.value)}
                                className="w-28 bg-paper-raised border border-rule px-2 py-1 rounded-control focus:outline-none focus:border-survey text-[12px]"
                              />
                            </div>
                          </td>

                          {/* Depth */}
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                placeholder="e.g. 25"
                                value={st.depth}
                                onChange={(e) => updateStation(idx, 'depth', e.target.value)}
                                className="w-20 bg-paper-raised border border-rule px-2 py-1 rounded-control focus:outline-none focus:border-survey text-[12px]"
                              />
                              <span className="text-[11px] text-ink-faint">m</span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-2 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedStationIndex(idx);
                                }}
                                className={`p-1 rounded-control transition-colors ${
                                  isSelected ? 'text-survey' : 'text-ink-muted hover:text-ink'
                                }`}
                                title="Locate & focus on map"
                              >
                                <MapPin size={14} />
                              </button>
                              {stations.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeStation(idx);
                                  }}
                                  className="p-1 text-ink-muted hover:text-error transition-colors"
                                  title="Remove station"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-rule rounded-control font-mono text-[13px] text-ink-muted hover:text-ink hover:bg-paper-sunk transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-survey hover:bg-survey-hover text-white rounded-control font-mono text-[13px] uppercase tracking-wider transition-colors flex items-center gap-2 shadow-md"
            >
              <span>Continue to Data Source</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </form>
      </main>

      <footer className="border-t border-rule pt-3 text-center text-[11px] font-mono text-ink-faint max-w-5xl mx-auto w-full">
        HYDROGRAPHIC FRAMEWORK READY FOR SEQUENCE INGESTION
      </footer>
    </div>
  );
};
