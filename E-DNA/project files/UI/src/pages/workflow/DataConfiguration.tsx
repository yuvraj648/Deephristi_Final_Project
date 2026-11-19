// ========================================================
// DEEPDRISHTI DATA & SAMPLE CONFIGURATION
// Summary readouts, dataset integrity validation table, and sample metadata editor
// Strictly adheres to scientific visual language
// ========================================================

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Info, Sparkles } from 'lucide-react';
import type { Sample, ASV, Occurrence, ValidationResult } from '../../domain/types';
import { validateDataset } from '../../services/dataService';

interface DataConfigurationProps {
  fileName: string;
  metadataFileName?: string;
  samples: Sample[];
  asvs: ASV[];
  occurrences: Occurrence[];
  abundanceSampleIds?: string[];
  onBack: () => void;
  onProceed: (validatedData: { samples: Sample[]; asvs: ASV[]; occurrences: Occurrence[] }) => void;
}

export const DataConfiguration: React.FC<DataConfigurationProps> = ({
  fileName,
  metadataFileName,
  samples: initialSamples,
  asvs,
  occurrences,
  abundanceSampleIds,
  onBack,
  onProceed,
}) => {
  const [samples, setSamples] = useState<Sample[]>(initialSamples);
  const [validation, setValidation] = useState<ValidationResult>(() =>
    validateDataset(initialSamples, asvs, occurrences, abundanceSampleIds)
  );

  const runValidation = (currentSamples: Sample[] = samples) => {
    const res = validateDataset(currentSamples, asvs, occurrences, abundanceSampleIds);
    setValidation(res);
  };

  const updateSampleField = (idx: number, field: keyof Sample, val: any) => {
    const updated = [...samples];
    updated[idx] = { ...updated[idx], [field]: val };
    setSamples(updated);
    runValidation(updated);
  };

  const applyPresetCoordinates = (region: 'arabian_sea' | 'bay_of_bengal' | 'monterey_bay' | 'clear') => {
    if (region === 'clear') {
      const updated = samples.map((s) => ({ ...s, latitude: undefined, longitude: undefined }));
      setSamples(updated);
      runValidation(updated);
      return;
    }

    // Group samples by unique site/station prefix
    const stationGroups = new Map<string, Sample[]>();
    samples.forEach((s) => {
      const stationKey = s.site ? s.site.split('_')[0] : s.sample_id.split('_')[0];
      if (!stationGroups.has(stationKey)) {
        stationGroups.set(stationKey, []);
      }
      stationGroups.get(stationKey)!.push(s);
    });

    const uniqueStationKeys = Array.from(stationGroups.keys());
    const count = uniqueStationKeys.length;

    let startLat = 15.0;
    let endLat = 19.5;
    let startLng = 68.5;
    let endLng = 72.8;

    if (region === 'bay_of_bengal') {
      startLat = 13.0;
      endLat = 18.5;
      startLng = 82.0;
      endLng = 88.0;
    } else if (region === 'monterey_bay') {
      startLat = 36.6;
      endLat = 36.9;
      startLng = -122.4;
      endLng = -121.8;
    }

    const updated = samples.map((s) => {
      const stationKey = s.site ? s.site.split('_')[0] : s.sample_id.split('_')[0];
      const stationIdx = uniqueStationKeys.indexOf(stationKey);
      const frac = count > 1 ? stationIdx / (count - 1) : 0.5;

      const lat = Number((startLat + frac * (endLat - startLat)).toFixed(3));
      const lng = Number((startLng + frac * (endLng - startLng)).toFixed(3));

      return {
        ...s,
        latitude: lat,
        longitude: lng,
      };
    });

    setSamples(updated);
    runValidation(updated);
  };

  const handleContinue = () => {
    try {
      const currentValidation = validateDataset(samples, asvs, occurrences, abundanceSampleIds);
      setValidation(currentValidation);
      if (!currentValidation.valid) return;
      onProceed({ samples, asvs, occurrences });
    } catch (err: any) {
      console.error('Failed to proceed from DataConfiguration:', err);
    }
  };

  const seqMin = validation.sequenceLengthRange ? validation.sequenceLengthRange[0] : 0;
  const seqMax = validation.sequenceLengthRange ? validation.sequenceLengthRange[1] : 0;
  const abundMin = validation.abundanceRange ? validation.abundanceRange[0] : 0;
  const abundMax = validation.abundanceRange ? validation.abundanceRange[1] : 0;

  return (
    <div className="min-h-screen bg-paper p-6 font-sans text-ink flex flex-col justify-between select-none">
      <header className="flex items-center justify-between border-b border-rule pb-3 max-w-5xl mx-auto w-full">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-ink-muted hover:text-ink text-[12px] font-mono transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Ingestion</span>
        </button>
        <span className="font-mono text-[11px] text-ink-faint uppercase tracking-wider">
          Step 3 of 4 • Configuration & Integrity Validation
        </span>
      </header>

      <main className="max-w-5xl mx-auto my-6 w-full flex-1 space-y-6">
        {/* ========================================================
            1. DATASET SUMMARY PLATE
            ======================================================== */}
        <div className="bg-paper-raised border border-rule rounded-plate p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between pb-4 border-b border-rule gap-3">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block">
                Ingestion Telemetry
              </span>
              <h1 className="font-serif text-[22px] font-medium text-ink flex items-center gap-2">
                <span>Dataset Summary:</span>
                <span className="font-mono text-[18px] text-survey">{fileName}</span>
              </h1>
              {metadataFileName && (
                <span className="text-[11px] font-mono text-ink-muted block mt-0.5">
                  Linked Metadata: <span className="text-ink font-medium">{metadataFileName}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Overall Status Badge */}
              <div
                className={`px-3 py-1 rounded-control font-mono text-[12px] uppercase font-semibold tracking-wider flex items-center gap-1.5 border ${
                  validation.status === 'valid'
                    ? 'bg-biological/10 text-biological border-biological/40'
                    : validation.status === 'warning'
                    ? 'bg-warning/10 text-warning border-warning/40'
                    : 'bg-error/10 text-error border-error/40'
                }`}
              >
                {validation.status === 'valid' && <CheckCircle2 size={14} />}
                {validation.status === 'warning' && <AlertTriangle size={14} />}
                {validation.status === 'error' && <XCircle size={14} />}
                <span>STATUS: {validation.status.toUpperCase()}</span>
              </div>

              <button
                type="button"
                onClick={() => runValidation()}
                className="px-3 py-1.5 bg-paper border border-rule hover:border-rule-strong text-ink font-mono text-[12px] rounded-control flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw size={13} />
                <span>Re-validate</span>
              </button>
            </div>
          </div>

          {/* 10 Required Summary Readouts */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-[12px] font-mono">
            <div className="bg-paper-sunk/50 border border-rule p-3 rounded-control">
              <span className="text-[10px] text-ink-faint uppercase block tracking-wider">Number of ASVs</span>
              <span className="text-[20px] font-medium text-ink tabular-nums block mt-1">
                {validation.asvCount.toLocaleString()}
              </span>
              <span className="text-[10px] text-ink-faint">Biological variants</span>
            </div>

            <div className="bg-paper-sunk/50 border border-rule p-3 rounded-control">
              <span className="text-[10px] text-ink-faint uppercase block tracking-wider">Number of Samples</span>
              <span className="text-[20px] font-medium text-ink tabular-nums block mt-1">
                {validation.sampleCount}
              </span>
              <span className="text-[10px] text-ink-faint">{validation.siteCount} distinct sites</span>
            </div>

            <div className="bg-paper-sunk/50 border border-rule p-3 rounded-control">
              <span className="text-[10px] text-ink-faint uppercase block tracking-wider">Total Observations</span>
              <span className="text-[20px] font-medium text-ink tabular-nums block mt-1">
                {(validation.nonZeroObservations ?? occurrences.length).toLocaleString()}
              </span>
              <span className="text-[10px] text-ink-faint">
                {validation.totalReads ? `${validation.totalReads.toLocaleString()} reads` : 'Non-zero cells'}
              </span>
            </div>

            <div className="bg-paper-sunk/50 border border-rule p-3 rounded-control">
              <span className="text-[10px] text-ink-faint uppercase block tracking-wider">Sequence Length Range</span>
              <span className="text-[18px] font-medium text-ink tabular-nums block mt-1">
                {seqMin}–{seqMax} <span className="text-[11px] font-normal text-ink-muted">bp</span>
              </span>
              <span className="text-[10px] text-ink-faint">Amplicon span</span>
            </div>

            <div className="bg-paper-sunk/50 border border-rule p-3 rounded-control">
              <span className="text-[10px] text-ink-faint uppercase block tracking-wider">Abundance Range</span>
              <span className="text-[18px] font-medium text-ink tabular-nums block mt-1">
                {abundMin}–{abundMax.toLocaleString()}
              </span>
              <span className="text-[10px] text-ink-faint">Reads per occurrence</span>
            </div>

            <div className="bg-paper-sunk/50 border border-rule p-3 rounded-control">
              <span className="text-[10px] text-ink-faint uppercase block tracking-wider">Metadata Availability</span>
              <span className="text-[14px] font-semibold text-ink block mt-1">
                {metadataFileName ? 'Provided' : 'Inferred / Partial'}
              </span>
              <span className="text-[10px] text-ink-faint">
                {validation.metadataMatchedCount !== undefined ? `${validation.metadataMatchedCount} matched` : 'Table headers'}
              </span>
            </div>

            <div className="bg-paper-sunk/50 border border-rule p-3 rounded-control">
              <span className="text-[10px] text-ink-faint uppercase block tracking-wider">Coordinate Availability</span>
              <span className="text-[14px] font-semibold text-ink block mt-1">
                {validation.georeferencedCount ?? 0} / {validation.sampleCount}
              </span>
              <span className="text-[10px] text-ink-faint">
                {(validation.georeferencedCount ?? 0) === validation.sampleCount
                  ? 'Complete georeference'
                  : (validation.georeferencedCount ?? 0) > 0
                  ? 'Partial georeference'
                  : 'Requires metadata'}
              </span>
            </div>

            <div className="bg-paper-sunk/50 border border-rule p-3 rounded-control">
              <span className="text-[10px] text-ink-faint uppercase block tracking-wider">Depth Availability</span>
              <span className="text-[14px] font-semibold text-ink block mt-1">
                {validation.depthStratifiedCount ?? 0} / {validation.sampleCount}
              </span>
              <span className="text-[10px] text-ink-faint">
                {(validation.depthStratifiedCount ?? 0) === validation.sampleCount
                  ? 'Complete depths'
                  : (validation.depthStratifiedCount ?? 0) > 0
                  ? 'Partial depths'
                  : 'Requires metadata'}
              </span>
            </div>

            <div className="bg-paper-sunk/50 border border-rule p-3 rounded-control col-span-2">
              <span className="text-[10px] text-ink-faint uppercase block tracking-wider">Validation Integrity</span>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-error font-semibold">
                  {validation.errorCount ?? 0} Errors
                </span>
                <span className="text-ink-faint">•</span>
                <span className="text-warning font-medium">
                  {validation.warningCount ?? 0} Warnings
                </span>
                <span className="text-ink-faint">•</span>
                <span className={validation.valid ? 'text-biological' : 'text-error'}>
                  {validation.valid ? 'Ready for Analysis' : 'Blocking Errors Present'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            2. VALIDATION TABLE
            ======================================================== */}
        <div className="bg-paper-raised border border-rule rounded-plate overflow-hidden">
          <div className="px-4 py-3 bg-paper-sunk/40 border-b border-rule flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-serif text-[16px] font-medium text-ink">
                Dataset Integrity & Validation Report
              </span>
              <span className="text-[11px] font-mono text-ink-faint">
                ({validation.warnings.length} diagnostic items)
              </span>
            </div>
            <span className="font-mono text-[11px] text-ink-muted">
              {validation.errorCount ?? 0} blocking errors
            </span>
          </div>

          {validation.warnings.length === 0 ? (
            <div className="p-6 text-center text-biological font-mono text-[12px] flex items-center justify-center gap-2">
              <CheckCircle2 size={16} />
              <span>All validation rules passed without warnings or errors. Dataset ready for dispatch.</span>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-left text-[12px] font-mono">
                <thead className="bg-paper-sunk border-b border-rule sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-ink-muted font-normal w-24">Severity</th>
                    <th className="px-3 py-2 text-ink-muted font-normal w-40">Diagnostic Category</th>
                    <th className="px-3 py-2 text-ink-muted font-normal w-32">Identifier</th>
                    <th className="px-3 py-2 text-ink-muted font-normal">Diagnostic Finding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule bg-paper">
                  {validation.warnings.map((w, idx) => {
                    const isError = w.severity === 'error';
                    const idLabel = w.sample_id || w.asv_id || '—';

                    return (
                      <tr key={idx} className="hover:bg-paper-sunk/30">
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-control ${
                              isError
                                ? 'bg-error/15 text-error border border-error/30'
                                : 'bg-warning/15 text-warning border border-warning/30'
                            }`}
                          >
                            {w.severity?.toUpperCase() || (isError ? 'ERROR' : 'WARNING')}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-ink-muted uppercase text-[11px]">
                          {w.type.replace(/_/g, ' ')}
                        </td>
                        <td className="px-3 py-2 text-ink font-semibold">{idLabel}</td>
                        <td className="px-3 py-2 text-ink-muted font-sans text-[12px]">
                          {w.message}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ========================================================
            3. SAMPLE METADATA CONFIGURATION TABLE
            ======================================================== */}
        <div className="bg-paper-raised border border-rule rounded-plate overflow-hidden">
          <div className="px-4 py-3 bg-paper-sunk/40 border-b border-rule flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-serif text-[16px] font-medium text-ink">
                Sample Field Metadata Configuration
              </span>
              <span className="text-[11px] font-mono text-ink-faint block mt-0.5">
                Dynamic records parsed from dataset • Missing coordinates remain N/A until configured
              </span>
            </div>

            {/* Quick Georeference Preset Toolbar */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-ink-muted flex items-center gap-1">
                <Sparkles size={13} className="text-survey" />
                <span>Auto-Georeference:</span>
              </span>
              <button
                type="button"
                onClick={() => applyPresetCoordinates('arabian_sea')}
                className="px-2 py-1 bg-paper hover:bg-paper-sunk border border-rule hover:border-survey text-[11px] font-mono text-ink rounded-control transition-colors"
                title="Distribute stations along Eastern Arabian Sea transect"
              >
                Arabian Sea
              </button>
              <button
                type="button"
                onClick={() => applyPresetCoordinates('bay_of_bengal')}
                className="px-2 py-1 bg-paper hover:bg-paper-sunk border border-rule hover:border-survey text-[11px] font-mono text-ink rounded-control transition-colors"
                title="Distribute stations along Bay of Bengal transect"
              >
                Bay of Bengal
              </button>
              <button
                type="button"
                onClick={() => applyPresetCoordinates('clear')}
                className="px-2 py-1 bg-paper hover:bg-paper-sunk border border-rule hover:border-error/40 text-[11px] font-mono text-ink-muted hover:text-error rounded-control transition-colors"
                title="Clear all assigned coordinates"
              >
                Clear
              </button>
              <div className="h-4 w-[1px] bg-rule mx-1 hidden sm:block" />
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-ink-muted">
                <Info size={13} />
                <span>Editable</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left text-[12px] font-mono">
              <thead className="bg-paper-sunk border-b border-rule sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-ink-muted font-normal">Sample ID</th>
                  <th className="px-3 py-2 text-ink-muted font-normal">Station / Site</th>
                  <th className="px-3 py-2 text-ink-muted font-normal">Latitude (°N)</th>
                  <th className="px-3 py-2 text-ink-muted font-normal">Longitude (°E)</th>
                  <th className="px-3 py-2 text-ink-muted font-normal">Depth (m)</th>
                  <th className="px-3 py-2 text-ink-muted font-normal">Date</th>
                  <th className="px-3 py-2 text-ink-muted font-normal">Replicate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule bg-paper">
                {samples.map((s, idx) => (
                  <tr key={s.sample_id} className="hover:bg-paper-sunk/30">
                    <td className="px-3 py-1.5 text-ink font-semibold">{s.sample_id}</td>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        value={s.site}
                        onChange={(e) => updateSampleField(idx, 'site', e.target.value)}
                        className="w-40 bg-paper-raised border border-rule px-2 py-0.5 rounded-control focus:outline-none focus:border-survey text-[11px]"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        step="0.001"
                        value={s.latitude ?? ''}
                        placeholder="N/A"
                        onChange={(e) =>
                          updateSampleField(idx, 'latitude', e.target.value !== '' ? parseFloat(e.target.value) : undefined)
                        }
                        className="w-24 bg-paper-raised border border-rule px-2 py-0.5 rounded-control focus:outline-none focus:border-survey text-[11px] placeholder:text-ink-faint"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        step="0.001"
                        value={s.longitude ?? ''}
                        placeholder="N/A"
                        onChange={(e) =>
                          updateSampleField(idx, 'longitude', e.target.value !== '' ? parseFloat(e.target.value) : undefined)
                        }
                        className="w-24 bg-paper-raised border border-rule px-2 py-0.5 rounded-control focus:outline-none focus:border-survey text-[11px] placeholder:text-ink-faint"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        value={s.depth ?? ''}
                        placeholder="N/A"
                        onChange={(e) =>
                          updateSampleField(idx, 'depth', e.target.value !== '' ? parseFloat(e.target.value) : undefined)
                        }
                        className="w-20 bg-paper-raised border border-rule px-2 py-0.5 rounded-control focus:outline-none focus:border-survey text-[11px] placeholder:text-ink-faint"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        value={s.date ?? ''}
                        placeholder="N/A"
                        onChange={(e) =>
                          updateSampleField(idx, 'date', e.target.value !== '' ? e.target.value : undefined)
                        }
                        className="w-28 bg-paper-raised border border-rule px-2 py-0.5 rounded-control focus:outline-none focus:border-survey text-[11px] placeholder:text-ink-faint"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        value={s.replicate ?? ''}
                        placeholder="R1"
                        onChange={(e) =>
                          updateSampleField(idx, 'replicate', e.target.value !== '' ? e.target.value : undefined)
                        }
                        className="w-16 bg-paper-raised border border-rule px-2 py-0.5 rounded-control focus:outline-none focus:border-survey text-[11px] placeholder:text-ink-faint"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Row */}
        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 border border-rule rounded-control font-mono text-[13px] text-ink-muted hover:text-ink hover:bg-paper-sunk transition-colors"
          >
            Back
          </button>
          <div className="flex items-center gap-3">
            {!validation.valid && (
              <span className="text-[12px] font-mono text-error">
                Resolve blocking errors to proceed
              </span>
            )}
            <button
              type="button"
              onClick={handleContinue}
              disabled={!validation.valid}
              className={`px-5 py-2 rounded-control font-mono text-[13px] uppercase tracking-wider transition-colors flex items-center gap-2 ${
                validation.valid
                  ? 'bg-survey hover:bg-survey-hover text-white shadow-floating cursor-pointer'
                  : 'bg-paper-sunk text-ink-faint border border-rule cursor-not-allowed'
              }`}
            >
              <span>Continue to Processing Pipeline</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </main>

      <footer className="border-t border-rule pt-3 text-center text-[11px] font-mono text-ink-faint max-w-5xl mx-auto w-full">
        METADATA SYNCHRONIZED ACROSS ECOLOGICAL SAMPLES • INTEGRITY VALIDATED
      </footer>
    </div>
  );
};
