// ========================================================
// DEEPDRISHTI CREATE RESEARCH EXPEDITION
// Guided expedition setup: metadata, sampling stations, coordinate matrix
// ========================================================

import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, ArrowRight } from 'lucide-react';
import type { Sample } from '../../domain/types';

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
  const [region, setRegion] = useState('');
  const [date, setDate] = useState('2026-03-30');
  const [description, setDescription] = useState('');

  const [stations, setStations] = useState<
    { sampleId: string; site: string; lat: string; lng: string; depth: string }[]
  >([
    { sampleId: 'SMP_001', site: 'Station S01 - Coastal', lat: '18.92', lng: '72.45', depth: '25' },
    { sampleId: 'SMP_002', site: 'Station S02 - Shelf Break', lat: '16.80', lng: '71.20', depth: '150' },
    { sampleId: 'SMP_003', site: 'Station S03 - Bathyal Margin', lat: '14.85', lng: '68.80', depth: '1200' },
  ]);

  const addStation = () => {
    const idx = stations.length + 1;
    setStations([
      ...stations,
      {
        sampleId: `SMP_${String(idx).padStart(3, '0')}`,
        site: `Station S0${idx}`,
        lat: '',
        lng: '',
        depth: '',
      },
    ]);
  };

  const removeStation = (index: number) => {
    setStations(stations.filter((_, i) => i !== index));
  };

  const updateStation = (index: number, field: string, value: string) => {
    const updated = [...stations];
    (updated[index] as any)[field] = value;
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
      <header className="flex items-center justify-between border-b border-rule pb-3 max-w-4xl mx-auto w-full">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 text-ink-muted hover:text-ink text-[12px] font-mono transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Cancel & Return</span>
        </button>
        <span className="font-mono text-[11px] text-ink-faint uppercase tracking-wider">
          Step 1 of 4 • Expedition Definition
        </span>
      </header>

      <main className="max-w-4xl mx-auto my-6 w-full flex-1">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Plate */}
          <div className="bg-paper-raised border border-rule rounded-plate p-6">
            <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block mb-1">
              Field Study Protocol
            </span>
            <h1 className="font-sans text-[24px] font-semibold text-ink tracking-tight mb-1">
              Create Research Expedition
            </h1>
            <p className="text-[13px] text-ink-muted">
              Configure survey metadata and sampling stations. This forms the hydrographic reference framework for biological sequence integration.
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
                  className="w-full bg-paper border border-rule rounded-control px-3 py-1.5 text-[13px] font-mono text-ink focus:outline-none focus:border-survey"
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
                  className="w-full bg-paper border border-rule rounded-control px-3 py-1.5 text-[13px] font-mono text-ink focus:outline-none focus:border-survey"
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
                  className="w-full bg-paper border border-rule rounded-control px-3 py-1.5 text-[13px] font-mono text-ink focus:outline-none focus:border-survey"
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
                  className="w-full bg-paper border border-rule rounded-control px-3 py-1.5 text-[13px] font-mono text-ink focus:outline-none focus:border-survey"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-muted mb-1">
                  Expedition Objectives & Field Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Detailed scientific objectives, transect parameters, and water filtration protocols..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-paper border border-rule rounded-control px-3 py-1.5 text-[13px] font-sans text-ink focus:outline-none focus:border-survey"
                />
              </div>
            </div>
          </div>

          {/* Sampling Information Section */}
          <div className="bg-paper-raised border border-rule rounded-plate p-6">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-rule">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block">
                  Field Stations
                </span>
                <h2 className="font-sans text-[18px] font-semibold text-ink tracking-tight">
                  Sampling Locations & Depths
                </h2>
              </div>
              <button
                type="button"
                onClick={addStation}
                className="px-2.5 py-1 bg-paper border border-rule hover:border-rule-strong text-ink font-mono text-[11px] rounded-control flex items-center gap-1 transition-colors"
              >
                <Plus size={13} />
                <span>Add Station</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px] font-mono">
                <thead className="bg-paper-sunk border-b border-rule">
                  <tr>
                    <th className="px-3 py-1.5 font-normal text-ink-muted">Sample ID</th>
                    <th className="px-3 py-1.5 font-normal text-ink-muted">Site / Station Name</th>
                    <th className="px-3 py-1.5 font-normal text-ink-muted">Latitude (°N)</th>
                    <th className="px-3 py-1.5 font-normal text-ink-muted">Longitude (°E)</th>
                    <th className="px-3 py-1.5 font-normal text-ink-muted">Depth (m)</th>
                    <th className="px-2 py-1.5 font-normal text-ink-muted text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule bg-paper">
                  {stations.map((st, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={st.sampleId}
                          onChange={(e) => updateStation(idx, 'sampleId', e.target.value)}
                          className="w-24 bg-paper-raised border border-rule px-2 py-0.5 rounded-control focus:outline-none focus:border-survey text-[12px]"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={st.site}
                          onChange={(e) => updateStation(idx, 'site', e.target.value)}
                          className="w-48 bg-paper-raised border border-rule px-2 py-0.5 rounded-control focus:outline-none focus:border-survey text-[12px]"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          step="0.0001"
                          placeholder="e.g. 18.92"
                          value={st.lat}
                          onChange={(e) => updateStation(idx, 'lat', e.target.value)}
                          className="w-28 bg-paper-raised border border-rule px-2 py-0.5 rounded-control focus:outline-none focus:border-survey text-[12px]"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          step="0.0001"
                          placeholder="e.g. 72.45"
                          value={st.lng}
                          onChange={(e) => updateStation(idx, 'lng', e.target.value)}
                          className="w-28 bg-paper-raised border border-rule px-2 py-0.5 rounded-control focus:outline-none focus:border-survey text-[12px]"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          placeholder="e.g. 50"
                          value={st.depth}
                          onChange={(e) => updateStation(idx, 'depth', e.target.value)}
                          className="w-20 bg-paper-raised border border-rule px-2 py-0.5 rounded-control focus:outline-none focus:border-survey text-[12px]"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {stations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeStation(idx)}
                            className="p-1 text-ink-muted hover:text-error transition-colors"
                            title="Remove station"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              className="px-5 py-2 bg-survey hover:bg-survey-hover text-white rounded-control font-mono text-[13px] uppercase tracking-wider transition-colors flex items-center gap-2"
            >
              <span>Continue to Data Source</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </form>
      </main>

      <footer className="border-t border-rule pt-3 text-center text-[11px] font-mono text-ink-faint max-w-4xl mx-auto w-full">
        HYDROGRAPHIC FRAMEWORK READY FOR SEQUENCE INGESTION
      </footer>
    </div>
  );
};
