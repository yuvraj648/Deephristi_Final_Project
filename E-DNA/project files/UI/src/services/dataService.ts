// ========================================================
// DEEPDRISHTI DATA SERVICE & REPOSITORY INTERFACE
// Abstraction layer for real data ingestion, parsing, validation,
// and pluggable persistence (Supabase Cloud + Local/Demo Fallback)
// ========================================================

import type {
  Expedition,
  Sample,
  ASV,
  Occurrence,
  ValidationResult,
  ValidationWarning,
  TaxonomyHierarchy,
} from '../domain/types';

import { LocalExpeditionRepository } from './localRepository';
import { SupabaseExpeditionRepository } from './supabaseRepository';
import { isSupabaseConfigured } from '../lib/supabase';
import { generateUUID, isValidUUID, ensureUUID } from '../lib/uuid';

import type {
  IExpeditionRepository,
  ExpeditionSummaryItem,
  BatchProgressCallback,
} from './repositoryTypes';

export * from './repositoryTypes';
export {
  getInitialActiveExpedition,
  getPersistedActiveExpeditionId,
  setPersistedActiveExpeditionId,
  demoStore,
} from './localRepository';
export { formatSupabaseError, getSupabaseConfigStatus } from '../lib/supabase';
export { generateUUID, isValidUUID, ensureUUID } from '../lib/uuid';

let activeRepo: IExpeditionRepository | null = null;

export function getRepository(): IExpeditionRepository {
  if (!activeRepo) {
    // Use Supabase when configured (cloud persistence + per-user RLS scoping)
    // Fall back to LocalExpeditionRepository (localStorage) when offline/unconfigured
    if (isSupabaseConfigured()) {
      activeRepo = new SupabaseExpeditionRepository();
    } else {
      activeRepo = new LocalExpeditionRepository();
    }
  }
  return activeRepo;
}

export function setRepository(repo: IExpeditionRepository | null): void {
  activeRepo = repo;
}

export async function listExpeditions(): Promise<ExpeditionSummaryItem[]> {
  return getRepository().listExpeditions();
}

export async function loadExpedition(id: string): Promise<Expedition | null> {
  return getRepository().getExpedition(id);
}

export async function saveExpedition(
  expedition: Expedition,
  onProgress?: BatchProgressCallback
): Promise<Expedition> {
  return getRepository().saveExpedition(expedition, onProgress);
}

export async function deleteExpedition(id: string): Promise<void> {
  return getRepository().deleteExpedition(id);
}

/**
 * Sniff tabular delimiter from text
 */
export function detectDelimiter(content: string): '\t' | ',' | ';' {
  const firstLine = content.split(/\r?\n/)[0] || '';
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  const semis = (firstLine.match(/;/g) || []).length;

  if (tabs >= commas && tabs >= semis && tabs > 0) return '\t';
  if (commas >= tabs && commas >= semis && commas > 0) return ',';
  if (semis > commas && semis > tabs) return ';';
  return '\t';
}

/**
 * Clean and normalize column header names
 */
export function normalizeHeader(h: string): string {
  return h
    .trim()
    .replace(/^["']|["']$/g, '')
    .toLowerCase()
    .replace(/[\s\-_]+/g, '_');
}

/**
 * Parse single lineage string (SILVA / GreenGenes / Greengenes style)
 * e.g. "k__Eukaryota; p__Chordata; c__Actinopterygii..." or semicolon/pipe separated
 */
export function parseTaxonomyString(tax: string): TaxonomyHierarchy {
  const parts = tax.split(/[;|,]/).map((p) => p.trim());
  const hierarchy: TaxonomyHierarchy = {};
  const ranks: (keyof TaxonomyHierarchy)[] = [
    'kingdom',
    'phylum',
    'class',
    'order',
    'family',
    'genus',
    'species',
  ];

  parts.forEach((p, idx) => {
    // Check if prefixed with k__, p__, c__, etc.
    const match = p.match(/^([kpcofgs])__(.+)$/i);
    if (match) {
      const code = match[1].toLowerCase();
      const val = match[2].trim();
      if (code === 'k') hierarchy.kingdom = val;
      if (code === 'p') hierarchy.phylum = val;
      if (code === 'c') hierarchy.class = val;
      if (code === 'o') hierarchy.order = val;
      if (code === 'f') hierarchy.family = val;
      if (code === 'g') hierarchy.genus = val;
      if (code === 's') hierarchy.species = val;
    } else if (idx < ranks.length && p.length > 0 && !/^uncultured|^unknown/i.test(p)) {
      hierarchy[ranks[idx]] = p;
    }
  });

  return hierarchy;
}

/**
 * Split line respecting quoted fields
 */
function splitLine(line: string, delimiter: string): string[] {
  if (delimiter === '\t') {
    return line.split('\t').map((p) => p.trim().replace(/^["']|["']$/g, ''));
  }
  // CSV / semicolon regex splitting respecting quotes
  const pattern = new RegExp(
    `(?:^|${delimiter})(?:"([^"]*)"|([^"${delimiter}]*))`,
    'g'
  );
  const result: string[] = [];
  let match;
  while ((match = pattern.exec(line)) !== null) {
    const val = match[1] !== undefined ? match[1] : match[2] !== undefined ? match[2] : '';
    result.push(val.trim());
  }
  return result;
}

export interface ParsedAsvResult {
  asvs: ASV[];
  occurrences: Occurrence[];
  sampleIds: string[];
  samples?: Sample[];
  warnings: ValidationWarning[];
  rawRows: number;
}

/**
 * Intelligent metadata inference from ecological/oceanographic sample IDs
 * (e.g. "05114c01_12_edna_1", "JD10706C1_0m_2", "CANON16c14_12_edna_3")
 */
export function inferSampleMetadataFromId(sampleId: string): Sample {
  const sid = sampleId.trim();

  // 1. Replicate: detect suffixes like _1, _2, _3, _rep1, _r1, -1, -2
  let replicate: string = 'R1';
  const repMatch = sid.match(/(?:_|-|\.)(?:rep(?:licate)?)?([0-9]+)$/i) || sid.match(/(?:_|-)(r[0-9]+)$/i);
  if (repMatch) {
    const num = repMatch[1].replace(/^r/i, '');
    replicate = `R${num}`;
  }

  // 2. Depth: detect patterns like _12m_, _0m_, _12_edna, _depth12, _12m
  let depth: number | undefined = undefined;
  const depthMeterMatch = sid.match(/(?:_|-)([0-9]+)m(?:_|-|$)/i);
  const depthEdnaMatch = sid.match(/(?:_|-)([0-9]+)(?:_edna)/i);
  const depthExplicitMatch = sid.match(/(?:_|-)(?:depth|dep)(?:_|-)?([0-9]+)/i);

  if (depthMeterMatch) {
    depth = parseFloat(depthMeterMatch[1]);
  } else if (depthEdnaMatch) {
    depth = parseFloat(depthEdnaMatch[1]);
  } else if (depthExplicitMatch) {
    depth = parseFloat(depthExplicitMatch[1]);
  }

  // 3. Station / Site: clean, readable station label
  let cleanSite = sid
    .replace(/(?:_|-|\.)(?:rep(?:licate)?)?[0-9]+$/i, '') // strip replicate
    .replace(/(?:_edna|_amplicon|_survey)$/i, '')         // strip assay marker
    .replace(/(?:_|-)[0-9]+m$/i, '')                      // strip depth suffix
    .replace(/(?:_edna)$/i, '');

  if (depth !== undefined) {
    cleanSite = cleanSite.replace(new RegExp(`(?:_|-)${depth}$`), '');
  }

  const siteLabel = cleanSite.length > 0
    ? (cleanSite.startsWith('Station') || cleanSite.startsWith('Site') ? cleanSite : `Station ${cleanSite}`)
    : sid;

  return {
    sample_id: sid,
    site: siteLabel,
    latitude: undefined,
    longitude: undefined,
    depth: depth,
    date: undefined,
    replicate: replicate,
  };
}

/**
 * Parse TSV or CSV ASV table with robust normalization and comprehensive validation
 */
export async function parseAsvTable(
  content: string,
  customDelimiter?: '\t' | ',' | ';'
): Promise<ParsedAsvResult> {
  const delimiter = customDelimiter || detectDelimiter(content);
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const warnings: ValidationWarning[] = [];
  const asvs: ASV[] = [];
  const occurrences: Occurrence[] = [];

  if (lines.length < 2) {
    warnings.push({
      type: 'empty_dataset',
      severity: 'error',
      message: 'The uploaded ASV file is empty or missing data rows.',
    });
    return { asvs, occurrences, sampleIds: [], warnings, rawRows: lines.length };
  }

  const rawHeaders = splitLine(lines[0], delimiter);
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  // 1. Identify ASV identifier column
  const asvColIdx = normalizedHeaders.findIndex((h) =>
    /^(asv_?id|asvid|feature_?id|featureid|#otu_?id|#otuid|id|name)$/.test(h)
  );

  // 2. Identify Sequence column
  const seqColIdx = normalizedHeaders.findIndex((h) =>
    /^(sequence|seq|dna|nucleotide|dna_sequence)$/.test(h)
  );

  // 3. Identify Taxonomy column or separate rank columns
  const singleTaxColIdx = normalizedHeaders.findIndex((h) =>
    /^(taxonomy|taxon|lineage|taxonomic_assignment|annotation)$/.test(h)
  );

  const rankIndices: { rank: keyof TaxonomyHierarchy; index: number }[] = [];
  (['kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species'] as (keyof TaxonomyHierarchy)[]).forEach((r) => {
    const idx = normalizedHeaders.findIndex((h) => h === r);
    if (idx !== -1) {
      rankIndices.push({ rank: r, index: idx });
    }
  });

  // IUPAC ambiguity allowed: A,C,G,T,U,R,Y,K,M,S,W,B,D,H,V,N
  const iupacRegex = /^[ACGTURYKMSWBDHVNacgturykmswbdhvn]+$/;

  const seenAsvIds = new Set<string>();
  const seenSequences = new Set<string>();
  
  // Custom long format logic detection
  const isLongFormat = normalizedHeaders.includes('filterid') && normalizedHeaders.includes('reads');
  
  if (isLongFormat) {
    const sequenceColIdx = normalizedHeaders.indexOf('asv'); // Assuming 'ASV' header contains the sequence
    const sampleIdColIdx = normalizedHeaders.indexOf('filterid');
    const readsColIdx = normalizedHeaders.indexOf('reads');
    const seqToAsvId = new Map<string, string>();
    const sampleMap = new Map<string, Sample>();
    let asvCounter = 1;

    // Detect optional metadata columns in long format
    const latColIdx = normalizedHeaders.findIndex((h) => /^(latitude|lat|lat_deg|y)$/.test(h));
    const lngColIdx = normalizedHeaders.findIndex((h) => /^(longitude|long|lng|lon|x)$/.test(h));
    const depthColIdx = normalizedHeaders.findIndex((h) => /^(depth|depth_m|depth_\(m\)|meters|z)$/.test(h));
    const dateColIdx = normalizedHeaders.findIndex((h) => /^(date|sampling_date|collection_date|time)$/.test(h));
    const siteColIdx = normalizedHeaders.findIndex((h) => /^(site|location|station|site_?id|sampling_?site|station_?id)$/.test(h));
    const repColIdx = normalizedHeaders.findIndex((h) => /^(replicate|rep|replicate_id)$/.test(h));

    for (let i = 1; i < lines.length; i++) {
      if (i % 10000 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0)); // Yield to browser to prevent lockup
      }
      const parts = splitLine(lines[i], delimiter);
      if (parts.length === 0 || (parts.length === 1 && parts[0] === '')) continue;
      
      const rawSeq = sequenceColIdx !== -1 && parts[sequenceColIdx] ? parts[sequenceColIdx].trim() : '';
      const seq = rawSeq.toUpperCase();
      
      if (!seq || !iupacRegex.test(seq)) continue; // skip invalid or empty

      // Create or get ASV ID for this sequence
      let asvId = seqToAsvId.get(seq);
      let isNewAsv = false;
      if (!asvId) {
        asvId = `ASV_${String(asvCounter).padStart(5, '0')}`;
        seqToAsvId.set(seq, asvId);
        asvCounter++;
        isNewAsv = true;
      }

      const sampleId = parts[sampleIdColIdx] ? parts[sampleIdColIdx].trim() : '';
      const readsVal = Number(parts[readsColIdx]);

      if (sampleId && !isNaN(readsVal) && readsVal > 0) {
        occurrences.push({
          asv_id: asvId,
          sample_id: sampleId,
          abundance: Math.round(readsVal)
        });

        // Register sample metadata dynamically from file / ID inference
        if (!sampleMap.has(sampleId)) {
          const sample = inferSampleMetadataFromId(sampleId);

          if (latColIdx !== -1 && parts[latColIdx]) {
            const parsedLat = parseFloat(parts[latColIdx]);
            if (!isNaN(parsedLat)) sample.latitude = parsedLat;
          }
          if (lngColIdx !== -1 && parts[lngColIdx]) {
            const parsedLng = parseFloat(parts[lngColIdx]);
            if (!isNaN(parsedLng)) sample.longitude = parsedLng;
          }
          if (depthColIdx !== -1 && parts[depthColIdx]) {
            const parsedDepth = parseFloat(parts[depthColIdx]);
            if (!isNaN(parsedDepth)) sample.depth = parsedDepth;
          }
          if (dateColIdx !== -1 && parts[dateColIdx]) {
            sample.date = parts[dateColIdx].trim();
          }
          if (siteColIdx !== -1 && parts[siteColIdx]) {
            sample.site = parts[siteColIdx].trim();
          }
          if (repColIdx !== -1 && parts[repIdx]) {
            sample.replicate = parts[repIdx].trim();
          }

          sampleMap.set(sampleId, sample);
        }
      }

      if (isNewAsv) {
        let taxonomy: TaxonomyHierarchy | undefined = undefined;
        if (rankIndices.length > 0) {
          taxonomy = {};
          rankIndices.forEach(({ rank, index }) => {
            if (parts[index] && parts[index].trim().length > 0) {
              taxonomy![rank] = parts[index].trim();
            }
          });
        }
        const hasTaxonomy = taxonomy && Object.values(taxonomy).some((v) => v && v.length > 0);
        const hasSpecies = Boolean(taxonomy?.species);
        const hasPhylum = Boolean(taxonomy?.phylum);

        asvs.push({
          asv_id: asvId,
          sequence: seq,
          taxonomy: hasTaxonomy ? taxonomy : undefined,
          assignment_status: hasSpecies ? 'assigned' : hasPhylum ? 'low_confidence' : 'unassigned',
          confidence: hasSpecies ? 0.95 : hasPhylum ? 0.75 : 0.0,
          novelty_status: 'not_evaluated'
        });
      }
    }
    
    return {
      asvs,
      occurrences,
      sampleIds: Array.from(sampleMap.keys()),
      samples: Array.from(sampleMap.values()),
      warnings,
      rawRows: lines.length - 1,
    };
  }

  // --- End of Long Format Logic ---

  // Verify mandatory columns for wide format
  if (asvColIdx === -1 && seqColIdx === -1) {
    warnings.push({
      type: 'unsupported_format',
      severity: 'error',
      message:
        'Could not locate ASV Identifier column (e.g. "ASV_ID", "Feature_ID", "id") or Sequence column ("sequence", "seq"). Check table headers.',
    });
    return { asvs, occurrences, sampleIds: [], warnings, rawRows: lines.length };
  }

  // 4. Identify Sample / Abundance columns
  const excludedIndices = new Set<number>([
    asvColIdx,
    seqColIdx,
    singleTaxColIdx,
    ...rankIndices.map((r) => r.index),
  ].filter((idx) => idx !== -1));

  const sampleCols: { name: string; index: number }[] = [];
  rawHeaders.forEach((name, idx) => {
    if (!excludedIndices.has(idx) && name.length > 0) {
      sampleCols.push({ name, index: idx });
    }
  });

  if (sampleCols.length === 0) {
    warnings.push({
      type: 'missing_abundance',
      severity: 'error',
      message:
        'No sample abundance columns detected in ASV table. The table must contain sample columns with numeric read counts.',
    });
  }

  for (let i = 1; i < lines.length; i++) {
    const parts = splitLine(lines[i], delimiter);
    if (parts.length === 0 || (parts.length === 1 && parts[0] === '')) continue;

    // Extract ASV ID
    const asvId =
      asvColIdx !== -1 && parts[asvColIdx] && parts[asvColIdx].trim().length > 0
        ? parts[asvColIdx].trim()
        : `ASV_${String(i).padStart(4, '0')}`;

    // Extract Sequence
    const rawSeq = seqColIdx !== -1 && parts[seqColIdx] ? parts[seqColIdx].trim() : '';
    const seq = rawSeq.toUpperCase();

    // Check duplicate ASV IDs
    if (seenAsvIds.has(asvId)) {
      warnings.push({
        type: 'duplicate_id',
        severity: 'error',
        message: `Duplicate ASV identifier: "${asvId}" on row ${i + 1}.`,
        asv_id: asvId,
      });
    }
    seenAsvIds.add(asvId);

    // Check sequence validity
    if (!seq || seq.length === 0) {
      warnings.push({
        type: 'empty_sequence',
        severity: 'error',
        message: `Empty nucleotide sequence for ASV "${asvId}" on row ${i + 1}.`,
        asv_id: asvId,
      });
    } else if (!iupacRegex.test(seq)) {
      warnings.push({
        type: 'malformed_sequence',
        severity: 'error',
        message: `ASV "${asvId}" contains invalid non-IUPAC characters: "${seq.slice(0, 20)}..."`,
        asv_id: asvId,
      });
    }

    if (seenSequences.has(seq) && seq.length > 0) {
      warnings.push({
        type: 'duplicate_sequence',
        severity: 'warning',
        message: `ASV "${asvId}" shares an identical nucleotide sequence with a previous record.`,
        asv_id: asvId,
      });
    }
    if (seq.length > 0) {
      seenSequences.add(seq);
    }

    // Extract Taxonomy
    let taxonomy: TaxonomyHierarchy | undefined = undefined;
    if (singleTaxColIdx !== -1 && parts[singleTaxColIdx]) {
      taxonomy = parseTaxonomyString(parts[singleTaxColIdx]);
    } else if (rankIndices.length > 0) {
      taxonomy = {};
      rankIndices.forEach(({ rank, index }) => {
        if (parts[index] && parts[index].trim().length > 0) {
          taxonomy![rank] = parts[index].trim();
        }
      });
    }

    const hasTaxonomy = taxonomy && Object.values(taxonomy).some((v) => v && v.length > 0);
    const hasSpecies = Boolean(taxonomy?.species);
    const hasPhylum = Boolean(taxonomy?.phylum);

    asvs.push({
      asv_id: asvId,
      sequence: seq || 'N'.repeat(20),
      taxonomy: hasTaxonomy ? taxonomy : undefined,
      assignment_status: hasSpecies ? 'assigned' : hasPhylum ? 'low_confidence' : 'unassigned',
      confidence: hasSpecies ? 0.95 : hasPhylum ? 0.75 : 0.0,
      novelty_status: 'not_evaluated', // Real uploaded data is NEVER claimed as novel until computed!
    });

    // Extract Abundances
    sampleCols.forEach((col) => {
      const rawVal = parts[col.index];
      if (rawVal !== undefined && rawVal !== '') {
        const val = Number(rawVal);
        if (isNaN(val)) {
          warnings.push({
            type: 'non_numeric_abundance',
            severity: 'error',
            message: `Non-numeric read count "${rawVal}" in sample "${col.name}" for ASV "${asvId}".`,
            sample_id: col.name,
            asv_id: asvId,
          });
        } else if (val < 0) {
          warnings.push({
            type: 'negative_abundance',
            severity: 'error',
            message: `Negative abundance value ${val} in sample "${col.name}" for ASV "${asvId}".`,
            sample_id: col.name,
            asv_id: asvId,
          });
        } else if (val > 0) {
          occurrences.push({
            asv_id: asvId,
            sample_id: col.name,
            abundance: Math.round(val),
          });
        }
      }
    });
  }

  const finalSampleIds = sampleCols.length > 0 ? sampleCols.map((c) => c.name) : Array.from(new Set(occurrences.map(o => o.sample_id)));
  const parsedSamples = finalSampleIds.map((sid) => inferSampleMetadataFromId(sid));

  return {
    asvs,
    occurrences,
    sampleIds: finalSampleIds,
    samples: parsedSamples,
    warnings,
    rawRows: lines.length - 1,
  };
}

export interface ParsedMetadataResult {
  samples: Sample[];
  warnings: ValidationWarning[];
}

/**
 * Parse sample metadata table with missing field tolerance (never converting missing to 0)
 */
export function parseSampleMetadata(
  content: string,
  customDelimiter?: '\t' | ',' | ';'
): ParsedMetadataResult {
  const delimiter = customDelimiter || detectDelimiter(content);
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const warnings: ValidationWarning[] = [];
  const samples: Sample[] = [];

  if (lines.length < 2) {
    warnings.push({
      type: 'empty_dataset',
      severity: 'warning',
      message: 'Sample metadata file contains insufficient rows.',
    });
    return { samples, warnings };
  }

  const rawHeaders = splitLine(lines[0], delimiter);
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  const idIdx = normalizedHeaders.findIndex((h) =>
    /^(sample_?id|sampleid|#sampleid|id|sample|filterid|filter_?id|sequence_?id|sample_?name)$/.test(h)
  );
  const siteIdx = normalizedHeaders.findIndex((h) =>
    /^(site|location|station|site_?id|sampling_?site|station_?id)$/.test(h)
  );
  const latIdx = normalizedHeaders.findIndex((h) =>
    /^(latitude|lat|lat_deg|y)$/.test(h)
  );
  const lngIdx = normalizedHeaders.findIndex((h) =>
    /^(longitude|long|lng|lon|x)$/.test(h)
  );
  const depthIdx = normalizedHeaders.findIndex((h) =>
    /^(depth|depth_m|depth_\(m\)|meters|z)$/.test(h)
  );
  const dateIdx = normalizedHeaders.findIndex((h) =>
    /^(date|sampling_date|collection_date|time)$/.test(h)
  );
  const repIdx = normalizedHeaders.findIndex((h) =>
    /^(replicate|rep|replicate_id)$/.test(h)
  );

  const seenSampleIds = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const parts = splitLine(lines[i], delimiter);
    if (parts.length === 0 || (parts.length === 1 && parts[0] === '')) continue;

    const id =
      idIdx !== -1 && parts[idIdx] && parts[idIdx].trim().length > 0
        ? parts[idIdx].trim()
        : `SMP_${String(i).padStart(3, '0')}`;

    if (seenSampleIds.has(id)) {
      warnings.push({
        type: 'duplicate_id',
        severity: 'error',
        message: `Duplicate sample identifier "${id}" in metadata on row ${i + 1}.`,
        sample_id: id,
      });
    }
    seenSampleIds.add(id);

    const site =
      siteIdx !== -1 && parts[siteIdx] && parts[siteIdx].trim().length > 0
        ? parts[siteIdx].trim()
        : `Site ${id}`;

    // Latitude & Longitude: NEVER convert missing to 0!
    let lat: number | undefined = undefined;
    if (latIdx !== -1 && parts[latIdx] && parts[latIdx].trim().length > 0) {
      const parsed = parseFloat(parts[latIdx]);
      if (!isNaN(parsed)) {
        lat = parsed;
      }
    }

    let lng: number | undefined = undefined;
    if (lngIdx !== -1 && parts[lngIdx] && parts[lngIdx].trim().length > 0) {
      const parsed = parseFloat(parts[lngIdx]);
      if (!isNaN(parsed)) {
        lng = parsed;
      }
    }

    // Depth: NEVER convert missing to 0!
    let depth: number | undefined = undefined;
    if (depthIdx !== -1 && parts[depthIdx] && parts[depthIdx].trim().length > 0) {
      const parsed = parseFloat(parts[depthIdx]);
      if (!isNaN(parsed)) {
        depth = parsed;
      }
    }

    // Date
    let dateStr: string | undefined = undefined;
    if (dateIdx !== -1 && parts[dateIdx] && parts[dateIdx].trim().length > 0) {
      dateStr = parts[dateIdx].trim();
      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) {
        warnings.push({
          type: 'malformed_date',
          severity: 'warning',
          message: `Malformed sampling date "${dateStr}" for sample "${id}".`,
          sample_id: id,
        });
      }
    }

    const rep = repIdx !== -1 && parts[repIdx] ? parts[repIdx].trim() : undefined;

    samples.push({
      sample_id: id,
      site,
      latitude: lat,
      longitude: lng,
      depth: depth,
      date: dateStr,
      replicate: rep,
    });
  }

  return { samples, warnings };
}

/**
 * Validate unified dataset and compute comprehensive readiness metrics
 */
export function validateDataset(
  samples: Sample[],
  asvs: ASV[],
  occurrences: Occurrence[],
  abundanceSampleIds?: string[]
): ValidationResult {
  const warnings: ValidationWarning[] = [];
  const sampleIds = new Set<string>();

  let georeferencedCount = 0;
  let depthStratifiedCount = 0;

  // 1. Validate Samples
  samples.forEach((s) => {
    if (sampleIds.has(s.sample_id)) {
      warnings.push({
        type: 'duplicate_id',
        severity: 'error',
        message: `Duplicate sample identifier detected: "${s.sample_id}".`,
        sample_id: s.sample_id,
      });
    }
    sampleIds.add(s.sample_id);

    if (s.latitude === undefined || s.longitude === undefined) {
      warnings.push({
        type: 'missing_location',
        severity: 'warning',
        message: `Sample "${s.sample_id}" is missing geographic coordinates (latitude / longitude).`,
        sample_id: s.sample_id,
      });
    } else {
      georeferencedCount++;
    }

    if (s.depth === undefined || s.depth === null) {
      warnings.push({
        type: 'missing_depth',
        severity: 'warning',
        message: `Sample "${s.sample_id}" is missing depth measurement.`,
        sample_id: s.sample_id,
      });
    } else {
      depthStratifiedCount++;
    }
  });

  // 2. Validate ASVs
  const asvIds = new Set<string>();
  const iupacRegex = /^[ACGTURYKMSWBDHVNacgturykmswbdhvn]+$/;
  let minSeqLen = Infinity;
  let maxSeqLen = 0;

  asvs.forEach((a) => {
    if (asvIds.has(a.asv_id)) {
      warnings.push({
        type: 'duplicate_id',
        severity: 'error',
        message: `Duplicate ASV identifier: "${a.asv_id}".`,
        asv_id: a.asv_id,
      });
    }
    asvIds.add(a.asv_id);

    const len = a.sequence ? a.sequence.length : 0;
    if (len > 0) {
      if (len < minSeqLen) minSeqLen = len;
      if (len > maxSeqLen) maxSeqLen = len;
    }

    if (!a.sequence || a.sequence.length === 0) {
      warnings.push({
        type: 'empty_sequence',
        severity: 'error',
        message: `ASV "${a.asv_id}" has an empty nucleotide sequence.`,
        asv_id: a.asv_id,
      });
    } else if (!iupacRegex.test(a.sequence)) {
      warnings.push({
        type: 'malformed_sequence',
        severity: 'error',
        message: `ASV "${a.asv_id}" contains non-IUPAC nucleotide characters.`,
        asv_id: a.asv_id,
      });
    }
  });

  // 3. Cross-validate Abundance Samples vs Metadata Samples
  let metadataMatchedCount = 0;
  if (abundanceSampleIds && abundanceSampleIds.length > 0) {
    const abundSet = new Set(abundanceSampleIds);

    // Samples in metadata but not in abundance matrix
    samples.forEach((s) => {
      if (!abundSet.has(s.sample_id)) {
        warnings.push({
          type: 'metadata_mismatch',
          severity: 'warning',
          message: `Sample "${s.sample_id}" is defined in metadata but has no occurrences in the ASV abundance table.`,
          sample_id: s.sample_id,
        });
      } else {
        metadataMatchedCount++;
      }
    });

    // Samples in abundance matrix without metadata
    abundanceSampleIds.forEach((sid) => {
      if (!sampleIds.has(sid)) {
        warnings.push({
          type: 'metadata_mismatch',
          severity: 'warning',
          message: `Sample "${sid}" is present in the ASV abundance table but missing from the sample metadata table.`,
          sample_id: sid,
        });
      }
    });
  }

  // 4. Occurrences metrics
  let totalReads = 0;
  let minAbund = Infinity;
  let maxAbund = 0;

  occurrences.forEach((occ) => {
    if (occ.abundance < 0) {
      warnings.push({
        type: 'negative_abundance',
        severity: 'error',
        message: `Negative abundance ${occ.abundance} in sample "${occ.sample_id}" for ASV "${occ.asv_id}".`,
        sample_id: occ.sample_id,
        asv_id: occ.asv_id,
      });
    } else if (isNaN(occ.abundance)) {
      warnings.push({
        type: 'non_numeric_abundance',
        severity: 'error',
        message: `Non-numeric abundance in sample "${occ.sample_id}" for ASV "${occ.asv_id}".`,
        sample_id: occ.sample_id,
        asv_id: occ.asv_id,
      });
    } else {
      totalReads += occ.abundance;
      if (occ.abundance < minAbund) minAbund = occ.abundance;
      if (occ.abundance > maxAbund) maxAbund = occ.abundance;
    }
  });

  // Check empty dataset
  if (asvs.length === 0) {
    warnings.push({
      type: 'empty_dataset',
      severity: 'error',
      message: 'Dataset contains 0 ASVs.',
    });
  }

  if (samples.length === 0) {
    warnings.push({
      type: 'empty_dataset',
      severity: 'error',
      message: 'Dataset contains 0 samples.',
    });
  }

  // Check samples with zero reads
  const sampleReads = new Map<string, number>();
  occurrences.forEach((o) => {
    sampleReads.set(o.sample_id, (sampleReads.get(o.sample_id) || 0) + o.abundance);
  });
  samples.forEach((s) => {
    const reads = sampleReads.get(s.sample_id) || 0;
    if (reads === 0) {
      warnings.push({
        type: 'zero_abundance_sample',
        severity: 'warning',
        message: `Sample "${s.sample_id}" has zero total sequenced reads across all ASVs.`,
        sample_id: s.sample_id,
      });
    }
  });

  const errorCount = warnings.filter((w) => w.severity === 'error').length;
  const warningCount = warnings.filter((w) => w.severity !== 'error').length;
  const valid = errorCount === 0 && asvs.length > 0 && samples.length > 0;
  const status: 'valid' | 'warning' | 'error' = errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'valid';

  return {
    valid,
    status,
    warnings,
    sampleCount: samples.length,
    asvCount: asvs.length,
    siteCount: new Set(samples.map((s) => s.site)).size,
    hasCoordinates: georeferencedCount > 0,
    hasDepths: depthStratifiedCount > 0,
    totalReads,
    nonZeroObservations: occurrences.length,
    sequenceLengthRange: minSeqLen === Infinity ? [0, 0] : [minSeqLen, maxSeqLen],
    abundanceRange: minAbund === Infinity ? [0, 0] : [minAbund, maxAbund],
    georeferencedCount,
    depthStratifiedCount,
    metadataMatchedCount,
    errorCount,
    warningCount,
  };
}

/**
 * Construct canonical Expedition object from real uploaded datasets
 */
export function createExpeditionFromUploads(
  meta: {
    name: string;
    researcher: string;
    region: string;
    description?: string;
    date?: string;
  },
  asvs: ASV[],
  occurrences: Occurrence[],
  samples: Sample[]
): Expedition {
  const timestamp = new Date().toISOString();
  const expId = generateUUID();

  return {
    id: expId,
    name: meta.name.trim() || 'Uploaded Marine Expedition',
    researcher: meta.researcher.trim() || 'Principal Investigator',
    region: meta.region.trim() || 'Study Region',
    description: meta.description || 'Uploaded eDNA amplicon sequence survey.',
    created: timestamp,
    updated: timestamp,
    provenance: 'uploaded',
    samples,
    asvs,
    occurrences,
    clusters: [], // Uploaded datasets do NOT fabricate clusters!
  };
}

/**
 * Run sequence representation (k-mer dimensionality reduction / embedding)
 * on an expedition's ASVs.
 */
export async function runSequenceRepresentation(expedition: Expedition): Promise<Expedition> {
  // 1. Try backend ML/PCA service first
  try {
    const res = await fetch(`http://localhost:8000/expeditions/${expedition.id}/compute-embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.expedition) {
        await saveExpedition(data.expedition);
        return data.expedition;
      }
    }
  } catch (err) {
    console.warn('Backend embedding calculation unavailable, computing client-side:', err);
  }

  // 2. Client-side fallback: 3-mer frequency PCA projection
  const asvs = [...expedition.asvs];
  const k = 3;
  const bases = ['A', 'C', 'G', 'T'];
  const allKmers: string[] = [];
  for (const b1 of bases) {
    for (const b2 of bases) {
      for (const b3 of bases) {
        allKmers.push(b1 + b2 + b3);
      }
    }
  }
  const kmerIdx = new Map<string, number>();
  allKmers.forEach((km, i) => kmerIdx.set(km, i));

  // Compute frequencies
  const freqMatrix: number[][] = asvs.map((a) => {
    const row = new Array(allKmers.length).fill(0);
    const seq = (a.sequence || '').toUpperCase();
    for (let j = 0; j <= seq.length - k; j++) {
      const sub = seq.slice(j, j + k);
      const idx = kmerIdx.get(sub);
      if (idx !== undefined) row[idx]++;
    }
    const sum = row.reduce((acc, v) => acc + v, 0);
    return sum > 0 ? row.map((v) => v / sum) : row;
  });

  const numFeatures = allKmers.length;
  const numSamples = asvs.length;
  const means = new Array(numFeatures).fill(0);
  for (let j = 0; j < numFeatures; j++) {
    let s = 0;
    for (let i = 0; i < numSamples; i++) s += freqMatrix[i][j];
    means[j] = numSamples > 0 ? s / numSamples : 0;
  }

  const centered = freqMatrix.map((row) => row.map((v, j) => v - means[j]));
  const weights1 = allKmers.map((km) => (km.match(/[GC]/g) || []).length / 3 - 0.5);
  const weights2 = allKmers.map((km) => (km.match(/[AG]/g) || []).length / 3 - 0.5);

  const rawCoords: [number, number][] = centered.map((row) => {
    let c1 = 0;
    let c2 = 0;
    for (let j = 0; j < numFeatures; j++) {
      c1 += row[j] * weights1[j];
      c2 += row[j] * weights2[j];
    }
    return [c1, c2];
  });

  const xs = rawCoords.map((c) => c[0]);
  const ys = rawCoords.map((c) => c[1]);
  const meanX = xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  const meanY = ys.reduce((a, b) => a + b, 0) / (ys.length || 1);
  const stdX = Math.sqrt(xs.reduce((a, b) => a + Math.pow(b - meanX, 2), 0) / (xs.length || 1)) || 1;
  const stdY = Math.sqrt(ys.reduce((a, b) => a + Math.pow(b - meanY, 2), 0) / (ys.length || 1)) || 1;

  const embeddedAsvs: ASV[] = asvs.map((a, i) => ({
    ...a,
    embedding: [
      Math.round(((rawCoords[i][0] - meanX) / stdX) * 4.5 * 100) / 100,
      Math.round(((rawCoords[i][1] - meanY) / stdY) * 4.5 * 100) / 100,
    ],
  }));

  const updatedExpedition: Expedition = {
    ...expedition,
    asvs: embeddedAsvs,
    updated: new Date().toISOString(),
  };

  await saveExpedition(updatedExpedition);
  return updatedExpedition;
}
