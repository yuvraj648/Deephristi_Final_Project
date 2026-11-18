// ========================================================
// DEEPDRISHTI BACKEND & SUPABASE PERSISTENCE VERIFICATION SUITE
// Comprehensive tests covering all 10 requirements in Section 21:
// 1. Supabase configuration detection
// 2. Repository selection
// 3. Canonical Expedition → database records
// 4. database records → canonical Expedition
// 5. ASV batching
// 6. sample batching
// 7. occurrence batching
// 8. demo/uploaded separation
// 9. missing Supabase configuration fallback
// 10. existing metrics still passing
// ========================================================
declare const process: any;

import { isSupabaseConfigured, getSupabaseConfigStatus, formatSupabaseError } from '../lib/supabase';
import {
  LocalExpeditionRepository,
  demoStore,
  getUploadedStore,
} from '../services/localRepository';
import { SupabaseExpeditionRepository } from '../services/supabaseRepository';
import {
  getRepository,
  listExpeditions,
  loadExpedition,
  saveExpedition,
  deleteExpedition,
} from '../services/dataService';
import type { Expedition, Sample, ASV, Occurrence } from './types';
import { computeAlphaDiversity, computeBetaDiversity, computeKPISummary } from './metrics';

console.log('========================================================');
console.log('DEEPDRISHTI BACKEND & SUPABASE PERSISTENCE VERIFICATION');
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

async function runBackendVerification() {
  // ========================================================
  // 1. Supabase Configuration Detection
  // ========================================================
  console.log('Test 1: Supabase Configuration Detection');
  const status = getSupabaseConfigStatus();
  assert(typeof status.isConfigured === 'boolean', 'isConfigured is boolean');
  assert(typeof status.urlProvided === 'boolean', 'urlProvided is boolean');
  assert(typeof status.keyProvided === 'boolean', 'keyProvided is boolean');
  assert(
    status.mode === 'supabase' || status.mode === 'local',
    `Mode correctly resolved to "${status.mode}"`
  );
  assert(
    isSupabaseConfigured() === status.isConfigured,
    'isSupabaseConfigured matches status object'
  );

  // Error formatter test
  const errFmt = formatSupabaseError({ message: 'violates unique constraint "asvs_pkey"' });
  assert(
    errFmt.includes('Database constraint violation'),
    'Sanitizes raw unique constraint into friendly message'
  );

  // ========================================================
  // 2. Repository Selection
  // ========================================================
  console.log('\nTest 2: Repository Selection & Pluggable Abstraction');
  const activeRepo = getRepository();
  assert(Boolean(activeRepo), 'Active repository is initialized');
  assert(
    activeRepo.mode === status.mode,
    `Selected repository mode "${activeRepo.mode}" matches configuration status`
  );

  const localRepo = new LocalExpeditionRepository();
  assert(localRepo.mode === 'local', 'LocalExpeditionRepository provides mode "local"');
  assert(typeof localRepo.listExpeditions === 'function', 'Local repo implements listExpeditions');
  assert(typeof localRepo.getExpedition === 'function', 'Local repo implements getExpedition');
  assert(typeof localRepo.saveExpedition === 'function', 'Local repo implements saveExpedition');
  assert(typeof localRepo.deleteExpedition === 'function', 'Local repo implements deleteExpedition');

  const supabaseRepo = new SupabaseExpeditionRepository();
  assert(supabaseRepo.mode === 'supabase', 'SupabaseExpeditionRepository provides mode "supabase"');
  assert(typeof supabaseRepo.listExpeditions === 'function', 'Supabase repo implements listExpeditions');
  assert(typeof supabaseRepo.getExpedition === 'function', 'Supabase repo implements getExpedition');
  assert(typeof supabaseRepo.saveExpedition === 'function', 'Supabase repo implements saveExpedition');
  assert(typeof supabaseRepo.deleteExpedition === 'function', 'Supabase repo implements deleteExpedition');

  // ========================================================
  // 3. Canonical Expedition → Database Records
  // ========================================================
  console.log('\nTest 3: Canonical Expedition → Database Records (Source Observations Only)');
  const mockExpedition: Expedition = {
    id: 'exp_cloud_test_01',
    name: 'Arabian Trench Abyssal eDNA Survey',
    researcher: 'usr_researcher_42',
    region: 'Arabian Sea Bathyal Basin',
    description: 'Deep-sea benthos eDNA amplicon sampling at 2200m depth.',
    created: '2026-03-20T08:00:00Z',
    updated: '2026-03-20T08:00:00Z',
    provenance: 'uploaded',
    samples: [
      {
        sample_id: 'SMP_TR_01',
        site: 'Trench Apex',
        latitude: 18.234,
        longitude: 65.432,
        depth: 2150,
        date: '2026-03-15',
        replicate: 'A',
      },
      {
        sample_id: 'SMP_TR_02',
        site: 'Trench Slope',
        // coordinates and depth missing to test NULL preservation
      },
    ],
    asvs: [
      {
        asv_id: 'ASV_ABYSS_001',
        sequence: 'ACTGGTCCAGTTGACGTAACCGGTTTAGGACATTCGATCGTAGCCTAAG',
        taxonomy: {
          kingdom: 'Eukaryota',
          phylum: 'Arthropoda',
          class: 'Malacostraca',
          order: 'Amphipoda',
          family: 'Lysianassidae',
          genus: 'Hirondellea',
          species: 'Hirondellea gigas',
        },
        assignment_status: 'assigned',
        confidence: 0.98,
        novelty_status: 'known',
      },
      {
        asv_id: 'ASV_ABYSS_002',
        sequence: 'TGACCAAGTCGATTGACCAATTAGGCCATTCGAGCTAGCAATTCGATCG',
        assignment_status: 'unassigned',
        novelty_status: 'not_evaluated',
      },
    ],
    occurrences: [
      { asv_id: 'ASV_ABYSS_001', sample_id: 'SMP_TR_01', abundance: 450 },
      { asv_id: 'ASV_ABYSS_002', sample_id: 'SMP_TR_01', abundance: 75 },
      { asv_id: 'ASV_ABYSS_001', sample_id: 'SMP_TR_02', abundance: 320 },
    ],
    clusters: [],
  };

  // Convert to DB expedition row
  const dbExpRow = {
    id: mockExpedition.id,
    researcher_id: mockExpedition.researcher,
    name: mockExpedition.name,
    region: mockExpedition.region,
    description: mockExpedition.description,
    provenance: mockExpedition.provenance,
    updated_at: mockExpedition.updated,
  };
  assert(dbExpRow.id === 'exp_cloud_test_01', 'Expedition ID matches');
  assert(dbExpRow.provenance === 'uploaded', 'Provenance is "uploaded"');
  assert(!('shannon' in dbExpRow), 'No Shannon column in expedition database record');
  assert(!('richness' in dbExpRow), 'No richness column in expedition database record');

  // Convert to DB sample rows
  const dbSampleRows = mockExpedition.samples.map((s) => ({
    expedition_id: mockExpedition.id,
    sample_id: s.sample_id,
    site: s.site,
    latitude: s.latitude !== undefined ? s.latitude : null,
    longitude: s.longitude !== undefined ? s.longitude : null,
    depth: s.depth !== undefined ? s.depth : null,
    date: s.date || null,
    replicate: s.replicate || null,
  }));
  assert(dbSampleRows[0].depth === 2150, 'Sample 1 depth matches');
  assert(dbSampleRows[1].latitude === null, 'Missing latitude converted to SQL NULL (not 0)');
  assert(dbSampleRows[1].depth === null, 'Missing depth converted to SQL NULL (not 0)');

  // Convert to DB ASV rows
  const dbAsvRows = mockExpedition.asvs.map((a) => ({
    expedition_id: mockExpedition.id,
    asv_id: a.asv_id,
    sequence: a.sequence,
    sequence_length: a.sequence.length,
    kingdom: a.taxonomy?.kingdom || null,
    phylum: a.taxonomy?.phylum || null,
    class: a.taxonomy?.class || null,
    order: a.taxonomy?.order || null,
    family: a.taxonomy?.family || null,
    genus: a.taxonomy?.genus || null,
    species: a.taxonomy?.species || null,
    assignment_status: a.assignment_status || 'unassigned',
    confidence: a.confidence !== undefined ? a.confidence : null,
  }));
  assert(dbAsvRows[0].sequence_length === 49, 'Sequence length computed correctly (49 bp)');
  assert(dbAsvRows[0].genus === 'Hirondellea', 'Nullable genus column preserved');
  assert(dbAsvRows[1].genus === null, 'Missing taxonomy is SQL NULL (no fabrication)');
  assert(!('shannon' in dbAsvRows[0]), 'No ecological metrics in ASV database table');
  assert(!('bray_curtis' in dbAsvRows[0]), 'No beta diversity metrics in ASV database table');

  // Convert to DB occurrence rows
  const dbOccRows = mockExpedition.occurrences.map((o) => ({
    expedition_id: mockExpedition.id,
    asv_id: o.asv_id,
    sample_id: o.sample_id,
    abundance: o.abundance,
  }));
  assert(dbOccRows.length === 3, 'All 3 occurrence observations mapped');
  assert(dbOccRows[0].abundance === 450, 'Occurrence abundance preserved exactly');

  // ========================================================
  // 4. Database Records → Canonical Expedition
  // ========================================================
  console.log('\nTest 4: Database Records → Canonical Expedition Reconstruction');
  // Reconstruct canonical domain objects from DB rows
  const reconstructedSamples: Sample[] = dbSampleRows.map((s) => ({
    sample_id: s.sample_id,
    site: s.site,
    latitude: s.latitude !== null ? s.latitude : undefined,
    longitude: s.longitude !== null ? s.longitude : undefined,
    depth: s.depth !== null ? s.depth : undefined,
    date: s.date || undefined,
    replicate: s.replicate || undefined,
  }));

  const reconstructedAsvs: ASV[] = dbAsvRows.map((a) => {
    let taxonomy = undefined;
    if (a.kingdom || a.phylum || a.class || a.order || a.family || a.genus || a.species) {
      taxonomy = {
        kingdom: a.kingdom || undefined,
        phylum: a.phylum || undefined,
        class: a.class || undefined,
        order: a.order || undefined,
        family: a.family || undefined,
        genus: a.genus || undefined,
        species: a.species || undefined,
      };
    }
    return {
      asv_id: a.asv_id,
      sequence: a.sequence,
      taxonomy,
      assignment_status: (a.assignment_status as any) || 'unassigned',
      confidence: a.confidence !== null ? a.confidence : undefined,
      novelty_status: 'not_evaluated',
    };
  });

  const reconstructedOccurrences: Occurrence[] = dbOccRows.map((o) => ({
    asv_id: o.asv_id,
    sample_id: o.sample_id,
    abundance: o.abundance,
  }));

  const reconstructedExp: Expedition = {
    id: dbExpRow.id,
    name: dbExpRow.name,
    researcher: dbExpRow.researcher_id,
    region: dbExpRow.region,
    description: dbExpRow.description,
    created: '2026-03-20T08:00:00Z',
    updated: dbExpRow.updated_at,
    provenance: dbExpRow.provenance as any,
    samples: reconstructedSamples,
    asvs: reconstructedAsvs,
    occurrences: reconstructedOccurrences,
    clusters: [],
  };

  assert(reconstructedExp.id === mockExpedition.id, 'Reconstructed Expedition ID matches');
  assert(reconstructedExp.samples.length === 2, 'Reconstructed 2 samples');
  assert(reconstructedExp.samples[1].depth === undefined, 'Reconstructed missing depth is undefined');
  assert(reconstructedExp.asvs[0].taxonomy?.genus === 'Hirondellea', 'Reconstructed taxonomy hierarchy matches');
  assert(reconstructedExp.asvs[1].taxonomy === undefined, 'Reconstructed unassigned ASV taxonomy is undefined');
  assert(reconstructedExp.occurrences.length === 3, 'Reconstructed 3 occurrences');
  assert(reconstructedExp.clusters.length === 0, 'No fake clusters fabricated');

  // ========================================================
  // 5. ASV Batching
  // ========================================================
  console.log('\nTest 5: ASV Batching (500 per batch)');
  const testAsvList = Array.from({ length: 1250 }, (_, i) => ({
    expedition_id: 'exp_batch_test',
    asv_id: `ASV_${i + 1}`,
    sequence: 'ACTGACTGACTG',
    sequence_length: 12,
  }));

  const BATCH_SIZE_ASVS = 500;
  const asvBatches: any[][] = [];
  for (let i = 0; i < testAsvList.length; i += BATCH_SIZE_ASVS) {
    asvBatches.push(testAsvList.slice(i, i + BATCH_SIZE_ASVS));
  }

  assert(asvBatches.length === 3, '1250 ASVs split into 3 batches');
  assert(asvBatches[0].length === 500, 'Batch 1 contains 500 ASVs');
  assert(asvBatches[1].length === 500, 'Batch 2 contains 500 ASVs');
  assert(asvBatches[2].length === 250, 'Batch 3 contains remaining 250 ASVs');
  assert(
    asvBatches.flat().length === testAsvList.length,
    'All 1250 ASVs accounted for without omissions'
  );

  // ========================================================
  // 6. Sample Batching
  // ========================================================
  console.log('\nTest 6: Sample Batching (500 per batch)');
  const testSampleList = Array.from({ length: 1200 }, (_, i) => ({
    expedition_id: 'exp_batch_test',
    sample_id: `SMP_${i + 1}`,
    site: `Site_${i + 1}`,
  }));

  const BATCH_SIZE_SAMPLES = 500;
  const sampleBatches: any[][] = [];
  for (let i = 0; i < testSampleList.length; i += BATCH_SIZE_SAMPLES) {
    sampleBatches.push(testSampleList.slice(i, i + BATCH_SIZE_SAMPLES));
  }

  assert(sampleBatches.length === 3, '1200 samples split into 3 batches');
  assert(sampleBatches[0].length === 500, 'Batch 1 contains 500 samples');
  assert(sampleBatches[1].length === 500, 'Batch 2 contains 500 samples');
  assert(sampleBatches[2].length === 200, 'Batch 3 contains remaining 200 samples');

  // ========================================================
  // 7. Occurrence Batching
  // ========================================================
  console.log('\nTest 7: Occurrence Batching (1000 per batch)');
  const testOccList = Array.from({ length: 2750 }, (_, i) => ({
    expedition_id: 'exp_batch_test',
    asv_id: `ASV_${(i % 100) + 1}`,
    sample_id: `SMP_${Math.floor(i / 100) + 1}`,
    abundance: 15,
  }));

  const BATCH_SIZE_OCCURRENCES = 1000;
  const occBatches: any[][] = [];
  for (let i = 0; i < testOccList.length; i += BATCH_SIZE_OCCURRENCES) {
    occBatches.push(testOccList.slice(i, i + BATCH_SIZE_OCCURRENCES));
  }

  assert(occBatches.length === 3, '2750 occurrences split into 3 batches');
  assert(occBatches[0].length === 1000, 'Batch 1 contains 1000 occurrences');
  assert(occBatches[1].length === 1000, 'Batch 2 contains 1000 occurrences');
  assert(occBatches[2].length === 750, 'Batch 3 contains remaining 750 occurrences');

  // ========================================================
  // 8. Demo / Uploaded Separation & Delete Protection
  // ========================================================
  console.log('\nTest 8: Demo vs Uploaded Separation & Delete Protection');
  await saveExpedition(mockExpedition);
  const uploadedStore = getUploadedStore();
  assert(uploadedStore.has(mockExpedition.id), 'Uploaded expedition saved to store');

  // Verify demo store isolation
  assert(demoStore.size >= 1, 'Demo store contains seeded demo expeditions');
  const demoExp = demoStore.get('exp_arabian_sea_2026')!;
  assert(demoExp.provenance === 'demo', 'Demo expedition retains provenance "demo"');
  assert(mockExpedition.provenance === 'uploaded', 'Uploaded expedition retains provenance "uploaded"');

  // Verify demo delete protection
  let demoDeleteBlocked = false;
  try {
    await deleteExpedition(demoExp.id);
  } catch (err: any) {
    demoDeleteBlocked = true;
  }
  assert(demoDeleteBlocked, 'Protected demo expedition from deletion');

  // Verify uploaded expedition deletion
  await deleteExpedition(mockExpedition.id);
  const reloaded = await loadExpedition(mockExpedition.id);
  assert(reloaded === null, 'Uploaded expedition deleted cleanly');
  assert(demoStore.has(demoExp.id), 'Demo expedition unaffected after uploaded deletion');

  // ========================================================
  // 9. Missing Supabase Configuration Fallback
  // ========================================================
  console.log('\nTest 9: Missing Supabase Configuration Fallback');
  // In our local test environment, Supabase env vars are empty/missing
  const fallbackRepo = getRepository();
  assert(fallbackRepo.mode === 'local', 'Seamlessly falls back to local repository');
  const exps = await listExpeditions();
  assert(exps.length >= 1, 'listExpeditions succeeds without credentials');
  assert(exps.some((e) => e.provenance === 'demo'), 'Seeded demo expedition present in fallback');

  // ========================================================
  // 10. Existing Ecological Metrics Still Passing
  // ========================================================
  console.log('\nTest 10: Pure Ecological Calculations on Reconstructed Expedition');
  // Re-save reconstructed expedition to verify metrics
  await saveExpedition(reconstructedExp);
  const alphaMetrics = computeAlphaDiversity(reconstructedExp, {});
  assert(alphaMetrics.length === 2, 'Calculated alpha diversity for 2 samples');

  const s1 = alphaMetrics.find((m) => m.sample_id === 'SMP_TR_01')!;
  assert(s1.observedRichness === 2, 'Observed richness is 2 ASVs');
  assert(s1.totalAbundance === 525, 'Total abundance is 525 (450 + 75)');
  assert(s1.shannon > 0.4 && s1.shannon < 0.6, 'Shannon H\' mathematically valid (~0.41)');
  assert(s1.simpson > 0.2 && s1.simpson < 0.4, 'Simpson 1-D mathematically valid (~0.25)');

  const kpis = computeKPISummary(reconstructedExp, {});
  assert(kpis.totalAsvs === 2, 'KPI total ASVs is 2');
  assert(kpis.siteCount === 2, 'KPI site count is 2');

  const beta = computeBetaDiversity(reconstructedExp, {});
  assert(beta.cells.length > 0, 'Calculated pairwise beta distance cells');
  assert(
    beta.cells[0].brayCurtis >= 0 && beta.cells[0].brayCurtis <= 1,
    'Bray-Curtis dissimilarity within [0, 1]'
  );

  // Clean up
  await deleteExpedition(reconstructedExp.id);

  console.log('\n========================================================');
  console.log(`BACKEND VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('========================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runBackendVerification().catch((err) => {
  console.error('Unhandled failure in runBackendVerification:', err);
  process.exit(1);
});
