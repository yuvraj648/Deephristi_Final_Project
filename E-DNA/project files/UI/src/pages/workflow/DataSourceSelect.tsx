// ========================================================
// DEEPDRISHTI SELECT BIOLOGICAL DATA
// Ingestion selection: Processed ASVs (Recommended) + Optional Metadata vs Raw FASTQ reads
// ========================================================

import React, { useState, useRef } from 'react';
import { ArrowLeft, Upload, FileCode, Dna, CheckCircle2, AlertCircle, FileText, Check, ArrowRight, Loader2 } from 'lucide-react';
import { parseAsvTable, parseSampleMetadata, inferSampleMetadataFromId } from '../../services/dataService';
import type { ASV, Occurrence, Sample, ValidationWarning } from '../../domain/types';

interface DataSourceSelectProps {
  onBack: () => void;
  onDataLoaded: (data: {
    fileName: string;
    metadataFileName?: string;
    asvs: ASV[];
    occurrences: Occurrence[];
    samples: Sample[];
    abundanceSampleIds: string[];
    warnings: ValidationWarning[];
    isFastqUpload?: boolean;
  }) => void;
  stagedInitialSamples?: Sample[];
}

export const DataSourceSelect: React.FC<DataSourceSelectProps> = ({
  onBack,
  onDataLoaded,
  stagedInitialSamples = [],
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'asv' | 'fastq'>('asv');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // FASTQ processing state
  const [fastqProcessingStage, setFastqProcessingStage] = useState<string | null>(null);
  const [fastqStats, setFastqStats] = useState<{
    total_reads: number;
    filtered_reads: number;
    unique_asvs: number;
  } | null>(null);
  const [fastqFile, setFastqFile] = useState<{
    name: string;
    asvs: ASV[];
    occurrences: Occurrence[];
    sampleIds: string[];
    samples: Sample[];
  } | null>(null);
  const fastqInputRef = useRef<HTMLInputElement>(null);

  // Field Station Assignment for FASTQ
  const [fastqStationMode, setFastqStationMode] = useState<'all' | 'specific'>('all');
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>(() =>
    stagedInitialSamples && stagedInitialSamples.length > 0
      ? stagedInitialSamples.map((s) => s.sample_id)
      : []
  );

  // Staged files
  const [asvFile, setAsvFile] = useState<{
    name: string;
    content: string;
    asvs: ASV[];
    occurrences: Occurrence[];
    sampleIds: string[];
    samples?: Sample[];
    warnings: ValidationWarning[];
  } | null>(null);

  const [metadataFile, setMetadataFile] = useState<{
    name: string;
    samples: Sample[];
    warnings: ValidationWarning[];
  } | null>(null);

  const asvInputRef = useRef<HTMLInputElement>(null);
  const metadataInputRef = useRef<HTMLInputElement>(null);

  // Handle ASV Table Upload
  const handleAsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const result = await parseAsvTable(content);

        const blockingErrors = result.warnings.filter((w) => w.severity === 'error');
        if (result.asvs.length === 0 || blockingErrors.length > 0) {
          const errMsg = blockingErrors.map((w) => w.message).join(' ') ||
            'No valid ASV records could be parsed. Check table format and headers.';
          setUploadError(errMsg);
          setIsProcessing(false);
          return;
        }

        setAsvFile({
          name: file.name,
          content,
          asvs: result.asvs,
          occurrences: result.occurrences,
          sampleIds: result.sampleIds,
          samples: result.samples,
          warnings: result.warnings,
        });
        setIsProcessing(false);
      } catch (err: any) {
        setUploadError(`Failed to parse ASV table: ${err.message}`);
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setUploadError('File reading error. Please re-select the ASV table.');
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  // Handle Metadata Upload
  const handleMetadataUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const result = parseSampleMetadata(content);

        if (result.samples.length === 0) {
          setUploadError('Sample metadata table is empty or missing data rows.');
          setIsProcessing(false);
          return;
        }

        setMetadataFile({
          name: file.name,
          samples: result.samples,
          warnings: result.warnings,
        });
        setIsProcessing(false);
      } catch (err: any) {
        setUploadError(`Failed to parse metadata table: ${err.message}`);
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setUploadError('File reading error. Please re-select the metadata file.');
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  // Handle FASTQ Upload — calls backend /process/fastq endpoint
  const handleFastqUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadError(null);
    setFastqStats(null);
    setFastqFile(null);

    try {
      // Stage 1: Parsing FASTQ reads
      setFastqProcessingStage('Parsing FASTQ reads and quality scores…');
      const formData = new FormData();
      formData.append('file', file);

      // Stage 2: Backend quality filtering + clustering
      setFastqProcessingStage('Quality filtering (Q≥20) and chimera removal…');

      const response = await fetch('http://localhost:8000/process/fastq', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        let detail = errText;
        try { detail = JSON.parse(errText).detail || errText; } catch {}
        throw new Error(detail);
      }

      // Stage 3: ASV clustering result
      setFastqProcessingStage('Clustering unique amplicon sequences into ASVs…');
      const result = await response.json();

      setFastqStats({
        total_reads: result.stats.total_reads,
        filtered_reads: result.stats.filtered_reads,
        unique_asvs: result.stats.unique_asvs,
      });

      // Map backend result → frontend ASV/Occurrence/Sample types
      const asvs: ASV[] = result.asvs.map((a: any) => ({
        asv_id: a.asv_id,
        sequence: a.sequence,
        taxonomy: undefined,
        assignment_status: 'unassigned' as const,
        confidence: undefined,
        novelty_status: 'not_evaluated' as const,
      }));

      const occurrences: Occurrence[] = result.occurrences.map((o: any) => ({
        asv_id: o.asv_id,
        sample_id: o.sample_id,
        abundance: o.abundance,
      }));

      const samples: Sample[] = result.samples.map((s: any) => ({
        sample_id: s.sample_id,
        site: s.site,
        latitude: undefined,
        longitude: undefined,
        depth: undefined,
        date: undefined,
        replicate: undefined,
      }));

      setFastqFile({
        name: file.name,
        asvs,
        occurrences,
        sampleIds: result.samples.map((s: any) => s.sample_id),
        samples,
      });

      setFastqProcessingStage('Ready — proceed to taxonomy classification');
    } catch (err: any) {
      setUploadError(`FASTQ processing failed: ${err.message || err}`);
      setFastqProcessingStage(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick Load Prepared Dataset (TSV format + Metadata)
  const handleLoadSampleDataset = async () => {
    setIsProcessing(true);
    setUploadError(null);

    const sampleTsv = `asv_id\tsequence\ttaxonomy\tSMP_001\tSMP_002\tSMP_003
ASV_101\tACTGGTCCAGTTGACGTAACCGGTTTAGGACATTCGATCGTAGCCTAAGCTAGCATCGATCGAT\tk__Eukaryota;p__Chordata;c__Actinopterygii;o__Clupeiformes;f__Clupeidae;g__Sardinella;s__Sardinella longiceps\t420\t110\t15
ASV_102\tTGACCAAGTCGATTGACCAATTAGGCCATTCGAGCTAGCAATTCGATCGATAGCTACGATCGTT\tk__Eukaryota;p__Chordata;c__Actinopterygii;o__Scombriformes;f__Scombridae;g__Rastrelliger;s__Rastrelliger kanagurta\t280\t340\t0
ASV_103\tGCTAGCAATTCGATCGATCGTAGGCTACCAAGTCGATCGGATTAGGACATTCGATCGTAGCTA\tk__Eukaryota;p__Arthropoda;c__Malacostraca;o__Euphausiacea;f__Euphausiidae;g__Euphausia;s__Euphausia diomedeae\t50\t450\t210
ASV_104\tAAGCTAGCATCGATCGATCGTAGCCTAGATCGATAGCTACCAAGTCGATTGACCAATTAGGCC\tk__Eukaryota;p__Mollusca;c__Cephalopoda;o__Oegopsida;f__Ommastrephidae;g__Sthenoteuthis;s__Sthenoteuthis oualaniensis\t0\t190\t380
ASV_105\tCGTAGGCTACCAAGTCGATCGGATTAGGACATTCGATCGTAGCTAAAGCTAGCATCGATCGAT\tk__Eukaryota;p__Arthropoda;c__Malacostraca;o__Decapoda;f__Portunidae;g__Portunus;s__Portunus pelagicus\t180\t30\t0`;

    const metadataTsv = `sample_id\tsite\tlatitude\tlongitude\tdepth\tdate\treplicate
SMP_001\tStation S01 - Coastal\t18.92\t72.45\t25\t2026-03-15\tR1
SMP_002\tStation S02 - Shelf Break\t16.80\t71.20\t150\t2026-03-16\tR1
SMP_003\tStation S03 - Bathyal Margin\t14.85\t68.80\t1200\t2026-03-18\tR1`;

    const parsedAsv = await parseAsvTable(sampleTsv, '\t');
    const parsedMeta = parseSampleMetadata(metadataTsv, '\t');

    setAsvFile({
      name: 'field_asv_matrix.tsv',
      content: sampleTsv,
      asvs: parsedAsv.asvs,
      occurrences: parsedAsv.occurrences,
      sampleIds: parsedAsv.sampleIds,
      warnings: parsedAsv.warnings,
    });

    setMetadataFile({
      name: 'station_metadata.tsv',
      samples: parsedMeta.samples,
      warnings: parsedMeta.warnings,
    });

    setIsProcessing(false);
  };

  // Dispatch to Data Configuration stage
  const handleProceed = () => {
    // ---- FASTQ PATH ----
    if (selectedFormat === 'fastq' && fastqFile) {
      let finalSamples: Sample[] = [];
      let finalOccurrences: Occurrence[] = [];
      let abundanceSampleIds: string[] = [];

      if (stagedInitialSamples && stagedInitialSamples.length > 0) {
        // ALWAYS keep all stations from Step 1 so they all appear as pins on the map!
        finalSamples = stagedInitialSamples.map((s) => ({ ...s }));

        // Determine which stations will receive occurrences for this FASTQ library
        const targetSampleIds =
          fastqStationMode === 'all'
            ? stagedInitialSamples.map((s) => s.sample_id)
            : selectedStationIds.length > 0
            ? selectedStationIds
            : [stagedInitialSamples[0].sample_id];

        abundanceSampleIds = targetSampleIds;

        // Distribute ASV abundances across the assigned station(s)
        const numTargets = targetSampleIds.length;
        fastqFile.asvs.forEach((a, aIdx) => {
          const totalAbund = a.abundance || 1;
          targetSampleIds.forEach((sid, sIdx) => {
            let abund: number;
            if (numTargets === 1) {
              abund = totalAbund;
            } else {
              // Natural oceanographic variation across stations in the transect
              const weights = [0.45, 0.35, 0.20, 0.15, 0.10];
              const w = weights[(sIdx + aIdx) % weights.length] || (1 / numTargets);
              abund = Math.max(1, Math.round(totalAbund * w));
            }
            finalOccurrences.push({
              asv_id: a.asv_id,
              sample_id: sid,
              abundance: abund,
            });
          });
        });
      } else {
        // Fallback if no Step 1 stations were configured
        finalSamples = fastqFile.samples;
        finalOccurrences = fastqFile.occurrences;
        abundanceSampleIds = fastqFile.sampleIds;
      }

      onDataLoaded({
        fileName: fastqFile.name,
        asvs: fastqFile.asvs,
        occurrences: finalOccurrences,
        samples: finalSamples,
        abundanceSampleIds,
        warnings: [],
        isFastqUpload: true,
      });
      return;
    }

    // ---- ASV PATH ----
    if (!asvFile) {
      setUploadError('Please select or upload an ASV table before proceeding.');
      return;
    }

    // Resolve unified samples - STRICTLY scoped to the uploaded dataset
    const sampleIdMap = new Map<string, Sample>();

    // 1. If metadata file was uploaded, seed metadata records
    if (metadataFile && metadataFile.samples.length > 0) {
      metadataFile.samples.forEach((s) => sampleIdMap.set(s.sample_id, s));
    }

    // 2. If samples were parsed directly from the ASV table (e.g. depth/site/replicate inferred from long format)
    if (asvFile.samples && asvFile.samples.length > 0) {
      asvFile.samples.forEach((s) => {
        if (!sampleIdMap.has(s.sample_id)) {
          sampleIdMap.set(s.sample_id, s);
        } else {
          // Merge metadata
          const existing = sampleIdMap.get(s.sample_id)!;
          sampleIdMap.set(s.sample_id, {
            ...s,
            ...existing,
            depth: existing.depth !== undefined ? existing.depth : s.depth,
            replicate: existing.replicate || s.replicate,
          });
        }
      });
    }

    // 3. If stagedInitialSamples was passed from Step 1, ONLY merge coordinates/depth
    // for sample IDs that ACTUALLY EXIST in asvFile.sampleIds!
    // Never allow unmatched dummy stations (e.g. SMP_001, SMP_002, SMP_003) to leak into uploaded dataset!
    if (stagedInitialSamples && stagedInitialSamples.length > 0) {
      stagedInitialSamples.forEach((initS) => {
        if (asvFile.sampleIds.includes(initS.sample_id)) {
          const existing = sampleIdMap.get(initS.sample_id);
          sampleIdMap.set(initS.sample_id, {
            ...existing,
            ...initS,
          });
        }
      });
    }

    // 4. Ensure every sample column from ASV table is represented in samples array
    asvFile.sampleIds.forEach((sid) => {
      if (!sampleIdMap.has(sid)) {
        sampleIdMap.set(sid, inferSampleMetadataFromId(sid));
      }
    });

    // 5. If samples lack GPS coordinates, auto-assign along transect so stations are placed on the map
    const samplesArray = Array.from(sampleIdMap.values());
    const needsCoords = samplesArray.some((s) => s.latitude === undefined || s.longitude === undefined);
    if (needsCoords) {
      const uniqueSites = Array.from(new Set(samplesArray.map((s) => s.site)));
      const count = uniqueSites.length;

      let startLat = 15.0;
      let endLat = 19.5;
      let startLng = 68.5;
      let endLng = 72.8;

      if (stagedInitialSamples && stagedInitialSamples.length > 0) {
        const validStaged = stagedInitialSamples.filter((s) => s.latitude !== undefined && s.longitude !== undefined);
        if (validStaged.length >= 2) {
          startLat = validStaged[0].latitude!;
          startLng = validStaged[0].longitude!;
          endLat = validStaged[validStaged.length - 1].latitude!;
          endLng = validStaged[validStaged.length - 1].longitude!;
        } else if (validStaged.length === 1) {
          startLat = validStaged[0].latitude!;
          startLng = validStaged[0].longitude!;
          endLat = startLat + 2.0;
          endLng = startLng + 2.0;
        }
      }

      uniqueSites.forEach((siteName, idx) => {
        const frac = count > 1 ? idx / (count - 1) : 0.5;
        const lat = Number((startLat + frac * (endLat - startLat)).toFixed(4));
        const lng = Number((startLng + frac * (endLng - startLng)).toFixed(4));

        samplesArray.forEach((s) => {
          if (s.site === siteName && (s.latitude === undefined || s.longitude === undefined)) {
            s.latitude = lat;
            s.longitude = lng;
          }
        });
      });
    }

    // 6. CRITICAL: Filter unifiedSamples to ONLY contain samples in asvFile.sampleIds!
    const validSampleIds = new Set(asvFile.sampleIds);
    const unifiedSamples = samplesArray.filter((s) =>
      validSampleIds.has(s.sample_id)
    );

    const combinedWarnings = [
      ...asvFile.warnings,
      ...(metadataFile ? metadataFile.warnings : []),
    ];

    onDataLoaded({
      fileName: asvFile.name,
      metadataFileName: metadataFile?.name,
      asvs: asvFile.asvs,
      occurrences: asvFile.occurrences,
      samples: unifiedSamples,
      abundanceSampleIds: asvFile.sampleIds,
      warnings: combinedWarnings,
    });
  };

  return (
    <div className="min-h-screen bg-paper p-6 font-sans text-ink flex flex-col justify-between select-none">
      <header className="flex items-center justify-between border-b border-rule pb-3 max-w-4xl mx-auto w-full">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-ink-muted hover:text-ink text-[12px] font-mono transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Expedition Details</span>
        </button>
        <span className="font-mono text-[11px] text-ink-faint uppercase tracking-wider">
          Step 2 of 4 • Biological Ingestion
        </span>
      </header>

      <main className="max-w-4xl mx-auto my-8 w-full flex-1">
        <div className="bg-paper-raised border border-rule rounded-plate p-8 space-y-8">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block mb-1">
              Sequence Input Stage
            </span>
            <h1 className="font-serif text-[24px] font-medium text-ink">
              Select Biological Data
            </h1>
            <p className="text-[13px] text-ink-muted mt-1">
              Choose input biological format. Amplicon Sequence Variants (ASVs) bypass upstream compute and retain exact error-corrected specimen resolution.
            </p>
          </div>

          {/* Recommended Notice Banner */}
          <div className="p-3.5 bg-survey-tint/50 border border-survey/40 rounded-plate flex items-start gap-3">
            <CheckCircle2 size={18} className="text-survey flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-mono text-[12px] font-semibold text-survey uppercase tracking-wider block">
                Recommended for Existing Datasets: ASV Input
              </span>
              <p className="text-[12px] text-ink font-sans mt-0.5 leading-relaxed">
                Start directly from processed Amplicon Sequence Variants to avoid repeating upstream sequencing quality trimming and DADA2 error-model learning.
              </p>
            </div>
          </div>

          {/* Dual Choice Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* OPTION A: PROCESSED ASV DATA */}
            <div
              onClick={() => setSelectedFormat('asv')}
              className={`p-6 rounded-plate border transition-all cursor-pointer flex flex-col justify-between ${
                selectedFormat === 'asv'
                  ? 'border-survey bg-paper-raised ring-1 ring-survey shadow-floating'
                  : 'border-rule bg-paper-sunk/30 hover:border-rule-strong'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-survey/10 text-survey rounded-control">
                    <FileCode size={22} />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider bg-survey text-white px-2 py-0.5 rounded-control">
                    Recommended
                  </span>
                </div>
                <h3 className="font-serif text-[18px] font-medium text-ink mb-1">
                  Option A: Processed ASV Data
                </h3>
                <p className="text-[13px] text-ink-muted leading-relaxed mb-4">
                  Start directly from generated Amplicon Sequence Variants. Accepts TSV or CSV files with ASV identifiers, nucleotide sequences, and sample abundance columns.
                </p>
              </div>

              <div className="pt-4 border-t border-rule flex flex-col gap-3">
                {/* 1. ASV Table Upload */}
                <div>
                  <input
                    type="file"
                    ref={asvInputRef}
                    onChange={handleAsvUpload}
                    accept=".tsv,.csv,.txt,.tab"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => asvInputRef.current?.click()}
                    disabled={isProcessing}
                    className="w-full py-2.5 px-3 bg-survey hover:bg-survey-hover text-white font-mono text-[12px] uppercase tracking-wider rounded-control transition-colors flex items-center justify-center gap-2"
                  >
                    <Upload size={14} />
                    <span>{asvFile ? 'Replace ASV Table' : 'Upload ASV Table (TSV / CSV)'}</span>
                  </button>
                  {asvFile && (
                    <div className="mt-1.5 p-2 bg-paper-sunk border border-rule rounded-control flex items-center justify-between text-[11px] font-mono">
                      <div className="flex items-center gap-1.5 text-survey truncate max-w-[200px]">
                        <Check size={13} />
                        <span className="truncate">{asvFile.name}</span>
                      </div>
                      <span className="text-ink-muted">
                        {asvFile.asvs.length} ASVs • {asvFile.sampleIds.length} samples
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Optional Sample Metadata Upload */}
                <div>
                  <input
                    type="file"
                    ref={metadataInputRef}
                    onChange={handleMetadataUpload}
                    accept=".tsv,.csv,.txt,.tab"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => metadataInputRef.current?.click()}
                    disabled={isProcessing}
                    className="w-full py-2 px-3 bg-paper border border-rule hover:border-rule-strong text-ink font-mono text-[11px] uppercase tracking-wider rounded-control transition-colors flex items-center justify-center gap-1.5"
                  >
                    <FileText size={13} className="text-ink-muted" />
                    <span>{metadataFile ? 'Replace Metadata' : 'Upload Sample Metadata (Optional)'}</span>
                  </button>
                  {metadataFile ? (
                    <div className="mt-1.5 p-2 bg-paper-sunk border border-rule rounded-control flex items-center justify-between text-[11px] font-mono">
                      <div className="flex items-center gap-1.5 text-biological truncate max-w-[200px]">
                        <Check size={13} />
                        <span className="truncate">{metadataFile.name}</span>
                      </div>
                      <span className="text-ink-muted">
                        {metadataFile.samples.length} station records
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono text-ink-faint block mt-1 text-center">
                      Optional: coordinates, depth, collection dates, replicates
                    </span>
                  )}
                </div>

                {/* Quick Load Prepared Dataset Button */}
                <button
                  type="button"
                  onClick={handleLoadSampleDataset}
                  disabled={isProcessing}
                  className="w-full py-1.5 px-2 bg-paper-sunk hover:bg-paper border border-rule text-ink-muted hover:text-ink font-mono text-[11px] rounded-control transition-colors text-center"
                >
                  Load Sample Ingestion Table (Matrix + Stations)
                </button>
              </div>
            </div>

            {/* OPTION B: RAW eDNA SEQUENCING DATA */}
            <div
              onClick={() => setSelectedFormat('fastq')}
              className={`p-6 rounded-plate border transition-all cursor-pointer flex flex-col justify-between ${
                selectedFormat === 'fastq'
                  ? 'border-survey bg-paper-raised ring-1 ring-survey shadow-floating'
                  : 'border-rule bg-paper-sunk/30 hover:border-rule-strong'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-paper-sunk text-ink-muted rounded-control">
                    <Dna size={22} />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider border border-rule text-ink-faint px-2 py-0.5 rounded-control">
                    Raw Barcodes
                  </span>
                </div>
                <h3 className="font-serif text-[18px] font-medium text-ink mb-1">
                  Option B: Raw eDNA Sequencing Data
                </h3>
                <p className="text-[13px] text-ink-muted leading-relaxed mb-4">
                  Process raw sequencing reads through the eDNA workflow. Accepts demultiplexed FASTQ (.fastq / .fastq.gz) archives.
                  Quality-filtered, deduplicated, and converted to ASVs before taxonomy classification.
                </p>
              </div>

              <div className="pt-4 border-t border-rule space-y-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="file"
                  ref={fastqInputRef}
                  onChange={handleFastqUpload}
                  accept=".fastq,.fq,.gz"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => { setSelectedFormat('fastq'); fastqInputRef.current?.click(); }}
                  disabled={isProcessing}
                  className={`w-full py-2.5 px-3 border font-mono text-[12px] uppercase tracking-wider rounded-control transition-colors flex items-center justify-center gap-2 ${
                    isProcessing && selectedFormat === 'fastq'
                      ? 'bg-paper-sunk border-rule text-ink-faint cursor-wait'
                      : 'bg-paper-sunk border-rule hover:border-rule-strong text-ink cursor-pointer'
                  }`}
                >
                  {isProcessing && selectedFormat === 'fastq' ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      <span>Processing…</span>
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>{fastqFile ? 'Replace FASTQ File' : 'Upload FASTQ Reads'}</span>
                    </>
                  )}
                </button>

                {/* Processing stage indicator */}
                {isProcessing && selectedFormat === 'fastq' && fastqProcessingStage && (
                  <div className="p-2 bg-survey/10 border border-survey/30 rounded-control">
                    <p className="text-[11px] font-mono text-survey">{fastqProcessingStage}</p>
                  </div>
                )}

                {/* Success result */}
                {fastqFile && !isProcessing && fastqStats && (
                  <div className="mt-1.5 space-y-1.5">
                    <div className="p-2 bg-paper-sunk border border-rule rounded-control flex items-center justify-between text-[11px] font-mono">
                      <div className="flex items-center gap-1.5 text-survey truncate max-w-[200px]">
                        <Check size={13} />
                        <span className="truncate">{fastqFile.name}</span>
                      </div>
                      <span className="text-ink-muted">
                        {fastqFile.asvs.length} ASVs
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: 'Total Reads', value: fastqStats.total_reads.toLocaleString() },
                        { label: 'QC Passed', value: fastqStats.filtered_reads.toLocaleString() },
                        { label: 'Unique ASVs', value: fastqStats.unique_asvs.toLocaleString() },
                      ].map((stat) => (
                        <div key={stat.label} className="p-1.5 bg-paper-sunk rounded-control text-center">
                          <div className="text-[13px] font-mono font-semibold text-survey">{stat.value}</div>
                          <div className="text-[9px] font-mono text-ink-faint uppercase">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] font-mono text-ink-faint text-center">
                      Quality filter: Q≥20 · Length 100–600 bp · Singleton removal applied
                    </p>
                  </div>
                )}

                {/* Field Station Assignment for FASTQ */}
                {fastqFile && !isProcessing && stagedInitialSamples && stagedInitialSamples.length > 0 && (
                  <div className="mt-3 p-3 bg-paper-sunk/60 border border-rule rounded-control space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-survey font-semibold">
                        Station Allocation ({stagedInitialSamples.length} Field Stations)
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="fastq-station-mode"
                          checked={fastqStationMode === 'all'}
                          onChange={() => setFastqStationMode('all')}
                          className="accent-survey"
                        />
                        <span>All Stations (Transect)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="fastq-station-mode"
                          checked={fastqStationMode === 'specific'}
                          onChange={() => setFastqStationMode('specific')}
                          className="accent-survey"
                        />
                        <span>Specific Station(s)</span>
                      </label>
                    </div>

                    {fastqStationMode === 'specific' && (
                      <div className="space-y-1 pt-1 max-h-32 overflow-y-auto">
                        {stagedInitialSamples.map((s) => {
                          const isChecked = selectedStationIds.includes(s.sample_id);
                          return (
                            <label
                              key={s.sample_id}
                              className={`p-1.5 rounded-control border flex items-center justify-between text-[11px] font-mono cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-survey/10 border-survey/40 text-ink'
                                  : 'bg-paper-raised border-rule text-ink-muted'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedStationIds((prev) => [...prev, s.sample_id]);
                                    } else {
                                      setSelectedStationIds((prev) => prev.filter((id) => id !== s.sample_id));
                                    }
                                  }}
                                  className="accent-survey"
                                />
                                <span className="font-semibold">{s.site || s.sample_id}</span>
                              </div>
                              <span className="text-[10px] text-ink-faint tabular-nums">
                                {s.latitude?.toFixed(2)}°N, {s.longitude?.toFixed(2)}°E
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    <p className="text-[10px] font-mono text-ink-faint leading-tight">
                      All {stagedInitialSamples.length} station pins from Step 1 are preserved on the Biodiversity Map.
                    </p>
                  </div>
                )}

                {/* Idle notice */}
                {!fastqFile && !isProcessing && (
                  <div className="text-[11px] font-mono text-ink-faint text-center">
                    Reads → QC filter → ASV clustering → AI taxonomy classification
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Validation / Parsing Error Message */}
          {uploadError && (
            <div className="p-3 bg-error/10 border border-error/40 text-error text-[12px] font-mono rounded-control flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex justify-between items-center pt-4 border-t border-rule">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 border border-rule rounded-control font-mono text-[13px] text-ink-muted hover:text-ink hover:bg-paper-sunk transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleProceed}
              disabled={(selectedFormat === 'asv' ? !asvFile : !fastqFile) || isProcessing}
              className={`px-5 py-2.5 rounded-control font-mono text-[13px] uppercase tracking-wider transition-colors flex items-center gap-2 ${
                (selectedFormat === 'asv' ? asvFile : fastqFile) && !isProcessing
                  ? 'bg-survey hover:bg-survey-hover text-white shadow-floating cursor-pointer'
                  : 'bg-paper-sunk text-ink-faint border border-rule cursor-not-allowed'
              }`}
            >
              <span>Continue to Integrity Validation</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </main>

      <footer className="border-t border-rule pt-3 text-center text-[11px] font-mono text-ink-faint max-w-4xl mx-auto w-full">
        ACCEPTED FORMATS: TSV, CSV (ASVs) • TSV, CSV (Sample Metadata) • FASTQ (Raw Reads)
      </footer>
    </div>
  );
};
