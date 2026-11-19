// ========================================================
// DEEPDRISHTI SELECT BIOLOGICAL DATA
// Ingestion selection: Processed ASVs (Recommended) + Optional Metadata vs Raw FASTQ reads
// ========================================================

import React, { useState, useRef } from 'react';
import { ArrowLeft, Upload, FileCode, Dna, CheckCircle2, AlertCircle, FileText, Check, ArrowRight } from 'lucide-react';
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

  // Handle FASTQ Upload
  const handleFastqUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onDataLoaded({
      fileName: file.name,
      asvs: [],
      occurrences: [],
      samples: [],
      abundanceSampleIds: [],
      warnings: [
        {
          type: 'unsupported_format',
          severity: 'error',
          message: 'Raw FASTQ uploaded. DADA2 denoising and error-rate learning must be executed in external pipeline or cluster backend. Denoising not faked.',
        },
      ],
      isFastqUpload: true,
    });
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
                  Process raw sequencing reads through the eDNA workflow. Accepts demultiplexed FASTQ (.fastq / .fq.gz) archives.
                </p>
              </div>

              <div className="pt-4 border-t border-rule space-y-2">
                <input
                  type="file"
                  id="fastq-upload"
                  onChange={handleFastqUpload}
                  accept=".fastq,.fq,.gz"
                  className="hidden"
                />
                <label
                  htmlFor="fastq-upload"
                  className="w-full py-2.5 px-3 bg-paper-sunk border border-rule hover:border-rule-strong text-ink font-mono text-[12px] uppercase tracking-wider rounded-control transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload size={14} />
                  <span>Upload FASTQ Reads</span>
                </label>
                <div className="text-[11px] font-mono text-ink-faint text-center">
                  Notice: Backend compute cluster required for full DADA2 execution.
                </div>
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
              disabled={!asvFile || isProcessing}
              className={`px-5 py-2.5 rounded-control font-mono text-[13px] uppercase tracking-wider transition-colors flex items-center gap-2 ${
                asvFile
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
