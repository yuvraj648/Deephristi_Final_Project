// ========================================================
// DEEPDRISHTI WORKSPACE SETTINGS
// Configuration for researcher profile, reference databases,
// display preferences (Paper vs Abyss), and export settings
// ========================================================

import React, { useState } from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import { Plate } from '../../components/common/Plate';
import { Moon, Sun, Save, LogOut } from 'lucide-react';

interface SettingsPageProps {
  onLogout: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onLogout }) => {
  const { theme, setTheme, expedition } = useAnalysis();
  const [researcherName, setResearcherName] = useState(expedition.researcher);
  const [refDatabase, setRefDatabase] = useState('silva_138_1');
  const [bootstrapCutoff, setBootstrapCutoff] = useState('80');
  const [divergenceThreshold, setDivergenceThreshold] = useState('12');
  const [saveConfirmed, setSaveConfirmed] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveConfirmed(true);
    setTimeout(() => setSaveConfirmed(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="border-b border-rule pb-3">
        <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block">
          Station Environment
        </span>
        <h1 className="font-serif text-[26px] font-medium text-ink leading-tight">
          System Preferences & Settings
        </h1>
        <p className="text-[13px] text-ink-muted mt-1">
          Manage station session credentials, reference taxonomy libraries, analysis cutoffs, and surface display modes.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Display Preferences */}
        <Plate eyebrow="SURFACE APPEARANCE" title="Display Preferences">
          <div className="space-y-4 font-mono text-[13px]">
            <div>
              <span className="text-ink-faint text-[11px] uppercase tracking-wider block mb-2">
                Workspace Surface Tone
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setTheme('paper')}
                  className={`p-4 rounded-plate border text-left flex items-start gap-3 transition-all ${
                    theme === 'paper'
                      ? 'border-survey bg-paper-sunk/60 ring-1 ring-survey shadow-sm'
                      : 'border-rule bg-paper hover:border-rule-strong'
                  }`}
                >
                  <Sun size={20} className="text-survey flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-ink block">Chart Paper (Default)</span>
                    <span className="text-[11px] text-ink-muted font-sans block mt-0.5">
                      Light warm paper tones (#F4F2EC). High-contrast reading for scientific matrices and print-fidelity charts.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('dark-abyss')}
                  className={`p-4 rounded-plate border text-left flex items-start gap-3 transition-all ${
                    theme === 'dark-abyss'
                      ? 'border-survey bg-paper-sunk/60 ring-1 ring-survey shadow-sm'
                      : 'border-rule bg-paper hover:border-rule-strong'
                  }`}
                >
                  <Moon size={20} className="text-survey flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-ink block">Abyss Ink (Dark Surface)</span>
                    <span className="text-[11px] text-ink-muted font-sans block mt-0.5">
                      Dark deep ocean tones (#0A1218). Low-light laboratory conditions and nocturnal surveillance compatibility.
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </Plate>

        {/* Section 2: Researcher Profile */}
        <Plate eyebrow="INVESTIGATOR IDENTITY" title="Researcher Profile">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-[13px]">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-ink-faint mb-1">
                Principal Investigator / Lab Name
              </label>
              <input
                type="text"
                value={researcherName}
                onChange={(e) => setResearcherName(e.target.value)}
                className="w-full bg-paper border border-rule rounded-control px-3 py-1.5 text-ink focus:outline-none focus:border-survey text-[13px]"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-ink-faint mb-1">
                Current Expedition Identifier
              </label>
              <input
                type="text"
                disabled
                value={expedition.id}
                className="w-full bg-paper-sunk border border-rule rounded-control px-3 py-1.5 text-ink-faint text-[13px] cursor-not-allowed"
              />
            </div>
          </div>
        </Plate>

        {/* Section 3: Reference Database & Classification Config */}
        <Plate eyebrow="BIOINFORMATICS ENGINES" title="Reference Database Configuration">
          <div className="space-y-4 font-mono text-[13px]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] uppercase tracking-wider text-ink-faint">
                    Reference Taxonomy Library
                  </label>
                  <span
                    className="text-[11px] text-sky-400 cursor-help"
                    title="The authoritative reference gene bank used to match amplicon DNA barcodes against verified specimens."
                  >
                    ⓘ
                  </span>
                </div>
                <select
                  value={refDatabase}
                  onChange={(e) => setRefDatabase(e.target.value)}
                  className="w-full bg-paper border border-rule rounded-control px-3 py-1.5 text-ink focus:outline-none focus:border-survey text-[12px] cursor-pointer"
                >
                  <option value="silva_138_1">SILVA v138.1 (Eukaryotic 18S/16S)</option>
                  <option value="ncbi_genbank_marine">NCBI GenBank Marine Metazoa v2026</option>
                  <option value="boldsystems_v4">BOLD Systems COI Barcode Library</option>
                </select>
                <p className="text-[10px] text-ink-muted font-sans leading-tight">
                  SILVA is optimal for plankton and micro-algae; NCBI/BOLD specialize in marine animals and fishes.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] uppercase tracking-wider text-ink-faint">
                    Bootstrap Cutoff Threshold (%)
                  </label>
                  <span
                    className="text-[11px] text-sky-400 cursor-help"
                    title="Minimum statistical probability required to confirm a classification rank (standard: 80%). Lowering allows more guesses; raising prevents false positives."
                  >
                    ⓘ
                  </span>
                </div>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={bootstrapCutoff}
                  onChange={(e) => setBootstrapCutoff(e.target.value)}
                  className="w-full bg-paper border border-rule rounded-control px-3 py-1.5 text-ink focus:outline-none focus:border-survey text-[12px]"
                />
                <p className="text-[10px] text-ink-muted font-sans leading-tight">
                  Standard cutoff is 80%. Sequences with lower confidence are marked 'unassigned' rather than guessed.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] uppercase tracking-wider text-ink-faint">
                    Novelty Divergence Threshold (%)
                  </label>
                  <span
                    className="text-[11px] text-sky-400 cursor-help"
                    title="Minimum genetic distance from published references to flag an organism as a candidate divergent lineage (standard: 12%)."
                  >
                    ⓘ
                  </span>
                </div>
                <input
                  type="number"
                  min="5"
                  max="30"
                  value={divergenceThreshold}
                  onChange={(e) => setDivergenceThreshold(e.target.value)}
                  className="w-full bg-paper border border-rule rounded-control px-3 py-1.5 text-ink focus:outline-none focus:border-survey text-[12px]"
                />
                <p className="text-[10px] text-ink-muted font-sans leading-tight">
                  Variants with &gt;12% divergence from known reference barcodes are sent to the Novelty Explorer.
                </p>
              </div>
            </div>
          </div>
        </Plate>

        {/* Submit Actions */}
        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 border border-error/40 text-error hover:bg-error/10 font-mono text-[12px] rounded-control transition-colors"
          >
            <LogOut size={14} />
            <span>Terminate Researcher Session</span>
          </button>

          <div className="flex items-center gap-3">
            {saveConfirmed && (
              <span className="text-[12px] font-mono text-biological">
                Preferences saved successfully.
              </span>
            )}
            <button
              type="submit"
              className="px-5 py-2 bg-survey hover:bg-survey-hover text-white font-mono text-[13px] uppercase tracking-wider rounded-control transition-colors flex items-center gap-1.5 shadow-floating"
            >
              <Save size={14} />
              <span>Save Configuration</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
