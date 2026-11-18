// ========================================================
// DEEPDRISHTI COMPREHENSIVE UPLOAD & METRIC VERIFICATION SUITE
// Tests all 12 requirements specified in Section 18:
// 1. valid ASV parsing
// 2. invalid nucleotide detection
// 3. duplicate ASV detection
// 4. abundance parsing
// 5. metadata parsing
// 6. missing metadata handling
// 7. Expedition transformation
// 8. Shannon calculation
// 9. Simpson calculation
// 10. Bray-Curtis calculation
// 11. Jaccard calculation
// 12. uploaded data replacing demo data
declare const process: any;

import {
  parseAsvTable,
  parseSampleMetadata,
  validateDataset,
  createExpeditionFromUploads,
  saveExpedition,
  loadExpedition,
  listExpeditions,
} from '../services/dataService';
import {
  computeAlphaDiversity,
  computeBetaDiversity,
} from './metrics';

console.log('========================================================');
console.log('DEEPDRISHTI AUTOMATED VERIFICATION SUITE (SECTION 18)');
console.log('========================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    failCount++;
  }
}

// Wrap everything in an async IIFE so we can await parseAsvTable
(async () => {

// ========================================================
// 1. Valid ASV Parsing
// ========================================================
console.log('Test 1: Valid ASV parsing (TSV / CSV)');
const validAsvTsv = `ASV_ID\tSequence\ttaxonomy\tSMP_1\tSMP_2\tSMP_3
ASV_1\tACTGGTCCAGTTGACGTAACCGGTTTAGGACATTCGATCGTAGCCTAAGCTAGCATCGATCGAT\tk__Eukaryota;p__Chordata;c__Actinopterygii;o__Clupeiformes;f__Clupeidae;g__Sardinella;s__Sardinella longiceps\t10\t0\t5
ASV_2\tTGACCAAGTCGATTGACCAATTAGGCCATTCGAGCTAGCAATTCGATCGATAGCTACGATCGTT\tk__Eukaryota;p__Chordata;c__Actinopterygii;o__Scombriformes;f__Scombridae;g__Rastrelliger;s__Rastrelliger kanagurta\t10\t10\t0
ASV_3\tGCTAGCAATTCGATCGATCGTAGGCTACCAAGTCGATCGGATTAGGACATTCGATCGTAGCTA\tk__Eukaryota;p__Arthropoda;c__Malacostraca;o__Euphausiacea;f__Euphausiidae;g__Euphausia;s__Euphausia diomedeae\t0\t10\t15
ASV_4\tAAGCTAGCATCGATCGATCGTAGCCTAGATCGATAGCTACCAAGTCGATTGACCAATTAGGCC\tk__Eukaryota;p__Mollusca;c__Cephalopoda;o__Oegopsida;f__Ommastrephidae;g__Sthenoteuthis;s__Sthenoteuthis oualaniensis\t0\t0\t20`;

const parsed1 = await parseAsvTable(validAsvTsv, '\t');
assert(parsed1.asvs.length === 4, 'Parsed 4 ASVs successfully');
assert(parsed1.sampleIds.length === 3, 'Identified 3 sample columns', `got ${parsed1.sampleIds.length}`);
assert(parsed1.occurrences.length === 7, 'Parsed 7 non-zero occurrences', `got ${parsed1.occurrences.length}`);
assert(parsed1.warnings.filter((w) => w.severity === 'error').length === 0, 'No blocking errors on valid input');

// ========================================================
// 2. Invalid Nucleotide Detection
// ========================================================
console.log('\nTest 2: Invalid nucleotide detection');
const invalidSeqTsv = `ASV_ID\tSequence\tSMP_1
ASV_BAD\tACTG12399ZZ_INVALID\t50`;
const parsed2 = await parseAsvTable(invalidSeqTsv, '\t');
const malformedWarn = parsed2.warnings.find((w) => w.type === 'malformed_sequence');
assert(Boolean(malformedWarn), 'Detected non-IUPAC characters', JSON.stringify(parsed2.warnings));
assert(malformedWarn?.severity === 'error', 'Malformed sequence classified as ERROR severity');

// ========================================================
// 3. Duplicate ASV Detection
// ========================================================
console.log('\nTest 3: Duplicate ASV detection');
const duplicateAsvTsv = `ASV_ID\tSequence\tSMP_1
ASV_DUP\tACTGGTCCAGTTGACGTAAC\t10
ASV_DUP\tTGACCAAGTCGATTGACCAA\t20`;
const parsed3 = await parseAsvTable(duplicateAsvTsv, '\t');
const dupWarn = parsed3.warnings.find((w) => w.type === 'duplicate_id');
assert(Boolean(dupWarn), 'Detected duplicate ASV ID', JSON.stringify(parsed3.warnings));
assert(dupWarn?.severity === 'error', 'Duplicate ASV ID classified as ERROR severity');

// ========================================================
// 4. Abundance Parsing (Negative & Non-numeric Handling)
// ========================================================
console.log('\nTest 4: Abundance parsing (negative and non-numeric detection)');
const badAbundanceTsv = `ASV_ID\tSequence\tSMP_1\tSMP_2
ASV_A\tACTGGTCCAGTTGACGTAAC\t-15\tnot_a_number`;
const parsed4 = await parseAsvTable(badAbundanceTsv, '\t');
const negWarn = parsed4.warnings.find((w) => w.type === 'negative_abundance');
const nonNumWarn = parsed4.warnings.find((w) => w.type === 'non_numeric_abundance');
assert(Boolean(negWarn), 'Detected negative abundance', JSON.stringify(parsed4.warnings));
assert(Boolean(nonNumWarn), 'Detected non-numeric abundance', JSON.stringify(parsed4.warnings));

// ========================================================
// 5. Metadata Parsing
// ========================================================
console.log('\nTest 5: Sample metadata parsing');
const metadataTsv = `sample_id\tsite\tlatitude\tlongitude\tdepth\tdate\treplicate
SMP_1\tStation Alpha\t18.92\t72.45\t25\t2026-03-15\tR1
SMP_2\tStation Beta\t16.80\t71.20\t150\t2026-03-16\tR1
SMP_3\tStation Gamma\t\t\t\t2026-03-18\tR1`; // Intentionally missing coordinates & depth

const metaParsed = parseSampleMetadata(metadataTsv, '\t');
assert(metaParsed.samples.length === 3, 'Parsed 3 sample records from metadata');
assert(metaParsed.samples[0].latitude === 18.92, 'Sample 1 latitude matches');
assert(metaParsed.samples[0].depth === 25, 'Sample 1 depth matches');

// ========================================================
// 6. Missing Metadata Handling (NEVER convert to 0!)
// ========================================================
console.log('\nTest 6: Missing metadata handling (strict undefined preservation, never 0)');
const s3 = metaParsed.samples[2];
assert(s3.latitude === undefined, 'Missing latitude is undefined (NOT 0)');
assert(s3.longitude === undefined, 'Missing longitude is undefined (NOT 0)');
assert(s3.depth === undefined, 'Missing depth is undefined (NOT 0)');

const validationResult = validateDataset(metaParsed.samples, parsed1.asvs, parsed1.occurrences, parsed1.sampleIds);
const missingLoc = validationResult.warnings.find((w) => w.type === 'missing_location' && w.sample_id === 'SMP_3');
const missingDepth = validationResult.warnings.find((w) => w.type === 'missing_depth' && w.sample_id === 'SMP_3');
assert(Boolean(missingLoc), 'Reported missing coordinates for SMP_3');
assert(Boolean(missingDepth), 'Reported missing depth for SMP_3');
assert(missingLoc?.severity === 'warning', 'Missing metadata is warning, not blocking analysis');
assert(validationResult.valid === true, 'Dataset can proceed despite missing metadata (valid=true)');

// ========================================================
// 7. Expedition Transformation (Canonical Model)
// ========================================================
console.log('\nTest 7: Expedition transformation (Canonical Domain Model)');
const uploadedExpedition = createExpeditionFromUploads(
  {
    name: 'Real Indian Ocean Uploaded Survey',
    researcher: 'Dr. Test Marine Biologist',
    region: 'Arabian Sea Western Basin',
    description: 'Deterministic uploaded ASV dataset for pipeline testing.',
  },
  parsed1.asvs,
  parsed1.occurrences,
  metaParsed.samples
);

assert(uploadedExpedition.provenance === 'uploaded', 'Provenance is strictly "uploaded"');
assert(uploadedExpedition.clusters.length === 0, 'No fake clusters fabricated (clusters=[])');
assert(uploadedExpedition.asvs.length === 4, 'All 4 ASVs mapped into canonical Expedition');
assert(uploadedExpedition.occurrences.length === 7, 'All 7 occurrences mapped into canonical Expedition');
assert(uploadedExpedition.samples.length === 3, 'All 3 samples mapped into canonical Expedition');
// Verify abundance lives strictly on Occurrence and not on ASV
const asvObj = uploadedExpedition.asvs[0] as any;
assert(asvObj.abundance === undefined, 'Abundance does NOT live on ASV object');
assert(asvObj.shannon === undefined, 'Shannon does NOT live on ASV object');
assert(asvObj.richness === undefined, 'Richness does NOT live on ASV object');

// ========================================================
// 8. Shannon Diversity Calculation
// ========================================================
console.log('\nTest 8: Shannon diversity index H\' calculation');
const alphaList = computeAlphaDiversity(uploadedExpedition, {});
const smp1Alpha = alphaList.find((a) => a.sample_id === 'SMP_1');
assert(Boolean(smp1Alpha), 'Alpha diversity calculated for SMP_1');
assert(smp1Alpha?.shannon === 0.693, 'SMP_1 Shannon H\' is exactly 0.693', `got ${smp1Alpha?.shannon}`);

// ========================================================
// 9. Simpson Diversity Calculation (Gini-Simpson 1 - D)
// ========================================================
console.log('\nTest 9: Simpson diversity index (1 - D) calculation');
assert(smp1Alpha?.simpson === 0.5, 'SMP_1 Simpson (1-D) is exactly 0.500', `got ${smp1Alpha?.simpson}`);
assert(smp1Alpha?.observedRichness === 2, 'SMP_1 Observed richness is 2 ASVs');

// ========================================================
// 10. Bray-Curtis Dissimilarity Calculation
// ========================================================
console.log('\nTest 10: Bray-Curtis dissimilarity calculation');
const betaResult = computeBetaDiversity(uploadedExpedition, { taxonomicRank: 'species' });
const cellAlphaBeta = betaResult.cells.find(
  (c) =>
    (c.siteA === 'Station Alpha' && c.siteB === 'Station Beta') ||
    (c.siteA === 'Station Beta' && c.siteB === 'Station Alpha')
);
assert(Boolean(cellAlphaBeta), 'Pairwise Beta distance computed for Station Alpha vs Beta');
assert(cellAlphaBeta?.brayCurtis === 0.5, 'Bray-Curtis dissimilarity is exactly 0.500', `got ${cellAlphaBeta?.brayCurtis}`);

// ========================================================
// 11. Jaccard Distance Calculation
// ========================================================
console.log('\nTest 11: Jaccard distance calculation');
assert(cellAlphaBeta?.jaccard === 0.667, 'Jaccard distance is exactly 0.667', `got ${cellAlphaBeta?.jaccard}`);
assert(cellAlphaBeta?.sharedTaxaCount === 1, 'Shared taxa count is 1');

// ========================================================
// 12. Uploaded Data Replacing Demo Data (Separation of Stores)
// ========================================================
console.log('\nTest 12: Uploaded data replacing demo data & store separation');
await saveExpedition(uploadedExpedition);
const loadedExp = await loadExpedition(uploadedExpedition.id);
assert(Boolean(loadedExp), 'Uploaded expedition loaded from repository');
assert(loadedExp?.provenance === 'uploaded', 'Loaded expedition retains "uploaded" provenance');
assert(loadedExp?.name === 'Real Indian Ocean Uploaded Survey', 'Loaded expedition name matches');

// Verify demo dataset is still accessible and completely unmixed
const demoList = await listExpeditions();
const demoEntry = demoList.find((e) => e.provenance === 'demo');
const uploadedEntry = demoList.find((e) => e.provenance === 'uploaded');
assert(Boolean(demoEntry), 'Demo expedition remains available in repository');
assert(Boolean(uploadedEntry), 'Uploaded expedition listed alongside demo expedition');
assert(uploadedExpedition.asvs.length === 4, 'Uploaded ASV count is 4 (not mixed with 160 demo ASVs)');

console.log('\n========================================================');
console.log(`FINAL RESULT: ${passCount} PASSED, ${failCount} FAILED`);
console.log('========================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

})();
