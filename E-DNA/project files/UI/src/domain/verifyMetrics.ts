// ========================================================
// METRICS VERIFICATION WITH HAND-CHECKED TINY FIXTURE
// Pure test verifying exact mathematical computations
// ========================================================

import {
  computeAlphaDiversity,
  computeBetaDiversity,
  computeKPISummary,
} from './metrics';
import type { Expedition } from './types';

export function runMetricsVerification(): { passed: boolean; details: string[] } {
  const details: string[] = [];
  let passed = true;

  // Tiny hand-checkable fixture
  const tinyExpedition: Expedition = {
    id: 'exp_test_tiny',
    name: 'Tiny Test Expedition',
    researcher: 'Test Researcher',
    region: 'Test Lagoon',
    created: '2026-01-01T00:00:00Z',
    updated: '2026-01-01T00:00:00Z',
    provenance: 'demo',
    samples: [
      { sample_id: 'S1', site: 'SiteA', depth: 10, date: '2026-01-01' },
      { sample_id: 'S2', site: 'SiteB', depth: 20, date: '2026-01-01' },
    ],
    asvs: [
      {
        asv_id: 'ASV1',
        sequence: 'ACTGACTGACTG',
        assignment_status: 'assigned',
        novelty_status: 'known',
        confidence: 0.99,
        taxonomy: { class: 'TaxonX' },
      },
      {
        asv_id: 'ASV2',
        sequence: 'TGCAACTGACTG',
        assignment_status: 'assigned',
        novelty_status: 'known',
        confidence: 0.95,
        taxonomy: { class: 'TaxonY' },
      },
    ],
    occurrences: [
      { asv_id: 'ASV1', sample_id: 'S1', abundance: 10 },
      { asv_id: 'ASV2', sample_id: 'S1', abundance: 10 },
      { asv_id: 'ASV1', sample_id: 'S2', abundance: 20 },
    ],
    clusters: [],
  };

  // 1. Verify Alpha Diversity
  const alpha = computeAlphaDiversity(tinyExpedition, {});
  const s1 = alpha.find((a) => a.sample_id === 'S1')!;
  const s2 = alpha.find((a) => a.sample_id === 'S2')!;

  // S1: 10 and 10 -> Shannon should be ln(2) = 0.693, Simpson = 0.500
  if (Math.abs(s1.shannon - 0.693) < 0.005) {
    details.push(`✓ S1 Shannon diversity correct: ${s1.shannon} (expected ~0.693)`);
  } else {
    passed = false;
    details.push(`✗ S1 Shannon diversity mismatch: got ${s1.shannon}, expected 0.693`);
  }

  if (Math.abs(s1.simpson - 0.500) < 0.005) {
    details.push(`✓ S1 Simpson diversity correct: ${s1.simpson} (expected 0.500)`);
  } else {
    passed = false;
    details.push(`✗ S1 Simpson diversity mismatch: got ${s1.simpson}, expected 0.500`);
  }

  // S2: only ASV1 -> Shannon = 0, Simpson = 0
  if (s2.shannon === 0 && s2.simpson === 0) {
    details.push(`✓ S2 Monotypic diversity correct: Shannon=0, Simpson=0`);
  } else {
    passed = false;
    details.push(`✗ S2 Monotypic diversity mismatch: got Shannon=${s2.shannon}, Simpson=${s2.simpson}`);
  }

  // 2. Verify Beta Diversity (Bray-Curtis & Jaccard)
  const beta = computeBetaDiversity(tinyExpedition, { taxonomicRank: 'class' });
  const cell = beta.cells.find((c) => (c.siteA === 'SiteA' && c.siteB === 'SiteB') || (c.siteA === 'SiteB' && c.siteB === 'SiteA'))!;

  // BC = 1 - (2*10 / 40) = 0.500
  if (Math.abs(cell.brayCurtis - 0.500) < 0.005) {
    details.push(`✓ Bray-Curtis dissimilarity correct: ${cell.brayCurtis} (expected 0.500)`);
  } else {
    passed = false;
    details.push(`✗ Bray-Curtis mismatch: got ${cell.brayCurtis}, expected 0.500`);
  }

  // Jaccard: intersection=1, union=2 -> dist = 1 - 0.5 = 0.500
  if (Math.abs(cell.jaccard - 0.500) < 0.005) {
    details.push(`✓ Jaccard distance correct: ${cell.jaccard} (expected 0.500)`);
  } else {
    passed = false;
    details.push(`✗ Jaccard mismatch: got ${cell.jaccard}, expected 0.500`);
  }

  // 3. Verify KPIs
  const kpis = computeKPISummary(tinyExpedition, {});
  if (kpis.totalAsvs === 2 && kpis.totalReads === 40 && kpis.sampleCount === 2) {
    details.push(`✓ KPI counts correct: ASVs=2, Reads=40, Samples=2`);
  } else {
    passed = false;
    details.push(`✗ KPI count mismatch`);
  }

  return { passed, details };
}

// Self-executing when run directly in node/tsx
const result = runMetricsVerification();
console.log('Metrics Verification Results:');
result.details.forEach((d) => console.log('  ' + d));
console.log('Overall Status:', result.passed ? 'PASSED' : 'FAILED');
