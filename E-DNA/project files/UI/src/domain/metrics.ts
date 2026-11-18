// ========================================================
// DEEPDRISHTI SCIENTIFIC METRICS MODULE
// Pure ecological and statistical calculations
// Single Source of Truth for derived quantities (O(N) optimized)
// ========================================================

import type {
  Expedition,
  AnalysisFilters,
  KPISummary,
  AlphaDiversityItem,
  BetaDistanceCell,
  SiteProfile,
  TaxonomicRank,
  ASV,
  Sample,
  Occurrence,
} from './types';

export interface FilteredExpeditionView {
  samples: Sample[];
  asvs: ASV[];
  occurrences: Occurrence[];
  sampleIdSet: Set<string>;
  asvIdSet: Set<string>;
  sampleMap: Map<string, Sample>;
  asvMap: Map<string, ASV>;
}

/**
 * Filter expedition data according to active global filters.
 * Does NOT mutate the underlying expedition.
 * Optimized with Map lookups for O(1) retrieval downstream.
 */
export function filterExpedition(
  expedition: Expedition,
  filters: Partial<AnalysisFilters>
): FilteredExpeditionView {
  // Check if filtering is active
  const hasSiteFilter = Boolean(filters.selectedSites && filters.selectedSites.length > 0);
  const hasDepthFilter = Boolean(filters.depthRange && (filters.depthRange[0] !== null || filters.depthRange[1] !== null));
  const hasDateFilter = Boolean(filters.dateRange && (filters.dateRange[0] || filters.dateRange[1]));
  const hasConfidenceFilter = Boolean(filters.minConfidence !== undefined && filters.minConfidence > 0);
  const hasStatusFilter = Boolean(filters.assignmentStatus && filters.assignmentStatus.length > 0 && filters.assignmentStatus.length < 3);
  const hasNoveltyFilter = Boolean(filters.noveltyFilter && filters.noveltyFilter !== 'all');
  const hasSearchFilter = Boolean(filters.searchQuery && filters.searchQuery.trim().length > 0);

  // 1. Filter Samples
  const samples = (!hasSiteFilter && !hasDepthFilter && !hasDateFilter)
    ? expedition.samples
    : expedition.samples.filter((s) => {
        // Site filter
        if (hasSiteFilter && !filters.selectedSites!.includes(s.site)) return false;

        // Depth filter
        if (filters.depthRange) {
          const [minD, maxD] = filters.depthRange;
          if (minD !== null && (s.depth === undefined || s.depth < minD)) return false;
          if (maxD !== null && (s.depth === undefined || s.depth > maxD)) return false;
        }

        // Date filter
        if (filters.dateRange) {
          const [startDate, endDate] = filters.dateRange;
          if (startDate && (!s.date || s.date < startDate)) return false;
          if (endDate && (!s.date || s.date > endDate)) return false;
        }

        return true;
      });

  const sampleIdSet = new Set(samples.map((s) => s.sample_id));
  const sampleMap = new Map<string, Sample>();
  samples.forEach((s) => sampleMap.set(s.sample_id, s));

  // 2. Filter ASVs
  const asvs = (!hasConfidenceFilter && !hasStatusFilter && !hasNoveltyFilter && !hasSearchFilter)
    ? expedition.asvs
    : expedition.asvs.filter((asv) => {
        // Minimum confidence
        if (filters.minConfidence !== undefined && filters.minConfidence > 0) {
          if (asv.confidence !== undefined && asv.confidence < filters.minConfidence) {
            return false;
          }
        }

        // Assignment status
        if (filters.assignmentStatus && filters.assignmentStatus.length > 0) {
          if (!filters.assignmentStatus.includes(asv.assignment_status)) {
            return false;
          }
        }

        // Novelty filter
        if (filters.noveltyFilter && filters.noveltyFilter !== 'all') {
          if (asv.novelty_status !== filters.noveltyFilter) {
            return false;
          }
        }

        // Search query (ASV ID, sequence, taxon)
        if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
          const q = filters.searchQuery.toLowerCase().trim();
          const idMatch = asv.asv_id.toLowerCase().includes(q);
          const seqMatch = asv.sequence.toLowerCase().includes(q);
          const taxMatch = asv.taxonomy && Object.values(asv.taxonomy).some(
            (v) => v && v.toLowerCase().includes(q)
          );
          if (!idMatch && !seqMatch && !taxMatch) {
            return false;
          }
        }

        return true;
      });

  const asvIdSet = new Set(asvs.map((a) => a.asv_id));
  const asvMap = new Map<string, ASV>();
  asvs.forEach((a) => asvMap.set(a.asv_id, a));

  // 3. Filter Occurrences matching both valid samples and valid ASVs
  const occurrences = (samples.length === expedition.samples.length && asvs.length === expedition.asvs.length)
    ? expedition.occurrences.filter((occ) => occ.abundance > 0)
    : expedition.occurrences.filter(
        (occ) => sampleIdSet.has(occ.sample_id) && asvIdSet.has(occ.asv_id) && occ.abundance > 0
      );

  return {
    samples,
    asvs,
    occurrences,
    sampleIdSet,
    asvIdSet,
    sampleMap,
    asvMap,
  };
}

/**
 * Compute KPI Summary (O(N) time with Map lookups)
 */
export function computeKPISummary(
  expedition: Expedition,
  filters: Partial<AnalysisFilters>
): KPISummary {
  const filtered = filterExpedition(expedition, filters);
  const { asvMap } = filtered;
  
  // Active ASVs that actually appear in filtered occurrences
  const presentAsvIds = new Set(filtered.occurrences.map((o) => o.asv_id));
  const activeAsvs = filtered.asvs.filter((a) => presentAsvIds.has(a.asv_id));

  // Taxa detected at current rank (or species/genus default)
  const rank = filters.taxonomicRank || 'class';
  const taxaSet = new Set<string>();
  activeAsvs.forEach((a) => {
    const name = a.taxonomy?.[rank];
    if (name) taxaSet.add(name);
  });

  // Potentially unknown / divergent groups count
  const unknownGroups = activeAsvs.filter(
    (a) => a.novelty_status === 'potentially_divergent' || a.assignment_status === 'unassigned'
  ).length;

  // Total reads
  const totalReads = filtered.occurrences.reduce((sum, o) => sum + o.abundance, 0);

  // Overall Shannon diversity across all aggregated taxa
  const taxaAbundanceMap = new Map<string, number>();
  filtered.occurrences.forEach((occ) => {
    const asv = asvMap.get(occ.asv_id);
    const taxonName = asv?.taxonomy?.[rank] || 'Unassigned';
    taxaAbundanceMap.set(taxonName, (taxaAbundanceMap.get(taxonName) || 0) + occ.abundance);
  });

  let shannon: number | null = null;
  if (totalReads > 0 && taxaAbundanceMap.size > 0) {
    let shannonSum = 0;
    taxaAbundanceMap.forEach((abund) => {
      const p = abund / totalReads;
      if (p > 0) {
        shannonSum -= p * Math.log(p);
      }
    });
    shannon = Math.round(shannonSum * 100) / 100;
  }

  // Depth range of present samples
  const depths = filtered.samples
    .map((s) => s.depth)
    .filter((d): d is number => d !== undefined);
  const depthMin = depths.length > 0 ? Math.min(...depths) : null;
  const depthMax = depths.length > 0 ? Math.max(...depths) : null;

  const sites = new Set(filtered.samples.map((s) => s.site));

  return {
    totalAsvs: activeAsvs.length,
    taxaDetected: taxaSet.size,
    shannonDiversity: shannon,
    potentiallyUnknownGroups: unknownGroups,
    totalReads,
    sampleCount: filtered.samples.length,
    siteCount: sites.size,
    depthMin,
    depthMax,
  };
}

/**
 * Compute Alpha Diversity per Sample / Site
 * Shannon, Simpson, Observed Richness, Pielou's Evenness
 */
export function computeAlphaDiversity(
  expedition: Expedition,
  filters: Partial<AnalysisFilters>
): AlphaDiversityItem[] {
  const filtered = filterExpedition(expedition, filters);
  const { sampleMap } = filtered;

  // Group occurrences by sample
  const occurrencesBySample = new Map<string, Occurrence[]>();
  filtered.occurrences.forEach((occ) => {
    const list = occurrencesBySample.get(occ.sample_id) || [];
    list.push(occ);
    occurrencesBySample.set(occ.sample_id, list);
  });

  const results: AlphaDiversityItem[] = [];

  sampleMap.forEach((sample, sampleId) => {
    const occs = occurrencesBySample.get(sampleId) || [];
    const totalAbundance = occs.reduce((sum, o) => sum + o.abundance, 0);
    const observedRichness = occs.length; // distinct ASVs in sample

    let shannon = 0;
    let simpson = 0;

    if (totalAbundance > 0) {
      let sumP2 = 0;
      occs.forEach((o) => {
        const p = o.abundance / totalAbundance;
        if (p > 0) {
          shannon -= p * Math.log(p);
          sumP2 += p * p;
        }
      });
      simpson = 1 - sumP2; // Gini-Simpson
    }

    const pielou = observedRichness > 1 ? shannon / Math.log(observedRichness) : 1;

    results.push({
      sample_id: sampleId,
      site: sample.site,
      depth: sample.depth,
      observedRichness,
      shannon: Math.round(shannon * 1000) / 1000,
      simpson: Math.round(simpson * 1000) / 1000,
      pielouEvenness: Math.round(pielou * 1000) / 1000,
      totalAbundance,
    });
  });

  return results.sort((a, b) => a.site.localeCompare(b.site));
}

/**
 * Compute Site Profiles for Map and Community summary
 */
export function computeSiteProfiles(
  expedition: Expedition,
  filters: Partial<AnalysisFilters>
): SiteProfile[] {
  const filtered = filterExpedition(expedition, filters);
  const { sampleMap, asvMap } = filtered;
  const rank = filters.taxonomicRank || 'class';

  // Group samples and occurrences by site
  const siteMap = new Map<string, { samples: Sample[]; asvs: Set<string>; occs: Occurrence[] }>();

  filtered.samples.forEach((sample) => {
    if (!siteMap.has(sample.site)) {
      siteMap.set(sample.site, { samples: [], asvs: new Set(), occs: [] });
    }
    siteMap.get(sample.site)!.samples.push(sample);
  });

  filtered.occurrences.forEach((occ) => {
    const sample = sampleMap.get(occ.sample_id);
    if (sample && siteMap.has(sample.site)) {
      const siteData = siteMap.get(sample.site)!;
      siteData.asvs.add(occ.asv_id);
      siteData.occs.push(occ);
    }
  });

  const profiles: SiteProfile[] = [];

  siteMap.forEach((data, siteName) => {
    const lats = data.samples.map((s) => s.latitude).filter((lat): lat is number => lat !== undefined);
    const lngs = data.samples.map((s) => s.longitude).filter((lng): lng is number => lng !== undefined);
    const depths = data.samples.map((s) => s.depth).filter((d): d is number => d !== undefined);

    const lat = lats.length > 0 ? lats[0] : undefined;
    const lng = lngs.length > 0 ? lngs[0] : undefined;

    const totalAbundance = data.occs.reduce((sum, o) => sum + o.abundance, 0);

    // Taxa breakdown
    const taxaAbundance = new Map<string, number>();
    let divergentCount = 0;

    data.asvs.forEach((asvId) => {
      const asv = asvMap.get(asvId);
      if (asv) {
        if (asv.novelty_status === 'potentially_divergent') {
          divergentCount++;
        }
      }
    });

    data.occs.forEach((occ) => {
      const asv = asvMap.get(occ.asv_id);
      const taxon = asv?.taxonomy?.[rank] || 'Unassigned';
      taxaAbundance.set(taxon, (taxaAbundance.get(taxon) || 0) + occ.abundance);
    });

    // Dominant taxa percentages
    const dominantTaxa: { taxon: string; percentage: number }[] = [];
    if (totalAbundance > 0) {
      Array.from(taxaAbundance.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([taxon, count]) => {
          dominantTaxa.push({
            taxon,
            percentage: Math.round((count / totalAbundance) * 1000) / 10,
          });
        });
    }

    // Shannon & Simpson at site level
    let shannon = 0;
    let simpson = 0;
    if (totalAbundance > 0) {
      let sumP2 = 0;
      taxaAbundance.forEach((count) => {
        const p = count / totalAbundance;
        if (p > 0) {
          shannon -= p * Math.log(p);
          sumP2 += p * p;
        }
      });
      simpson = 1 - sumP2;
    }

    profiles.push({
      site: siteName,
      latitude: lat,
      longitude: lng,
      sampleIds: data.samples.map((s) => s.sample_id),
      depths,
      asvCount: data.asvs.size,
      taxaCount: taxaAbundance.size,
      shannon: Math.round(shannon * 100) / 100,
      simpson: Math.round(simpson * 100) / 100,
      totalAbundance,
      dominantTaxa,
      divergentGroupCount: divergentCount,
    });
  });

  return profiles.sort((a, b) => a.site.localeCompare(b.site));
}

/**
 * Compute Location x Taxa Matrix for Heatmap visualization (O(N) single-pass)
 */
export function computeLocationTaxaMatrix(
  expedition: Expedition,
  filters: Partial<AnalysisFilters>,
  measure: 'abundance' | 'occurrence' | 'normalized' | 'asv_count' = 'abundance',
  topN: number = 8
): {
  sites: string[];
  taxa: string[];
  matrix: (number | null)[][]; // rows = sites, cols = taxa
  maxVal: number;
} {
  const filtered = filterExpedition(expedition, filters);
  const { sampleMap, asvMap } = filtered;
  const rank = filters.taxonomicRank || 'class';

  // Get unique sites
  const sites = Array.from(new Set(filtered.samples.map((s) => s.site))).sort();

  // Aggregate overall abundance per taxon to select top N
  const overallTaxaAbundance = new Map<string, number>();
  filtered.occurrences.forEach((occ) => {
    const asv = asvMap.get(occ.asv_id);
    const taxon = asv?.taxonomy?.[rank] || 'Unassigned';
    overallTaxaAbundance.set(taxon, (overallTaxaAbundance.get(taxon) || 0) + occ.abundance);
  });

  const sortedTaxa = Array.from(overallTaxaAbundance.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t);

  const topTaxaList = sortedTaxa.slice(0, topN);
  const topTaxaSet = new Set(topTaxaList);
  const hasOther = sortedTaxa.length > topN;
  const taxa = hasOther ? [...topTaxaList, 'Other'] : [...topTaxaList];

  // Single O(N) pass to accumulate stats per (site, colTaxon)
  const siteTaxaStats = new Map<string, Map<string, { abundance: number; sampleIds: Set<string>; asvIds: Set<string> }>>();
  const siteTotalAbundance = new Map<string, number>();

  filtered.occurrences.forEach((occ) => {
    const sample = sampleMap.get(occ.sample_id);
    if (!sample) return;
    const site = sample.site;

    siteTotalAbundance.set(site, (siteTotalAbundance.get(site) || 0) + occ.abundance);

    const asv = asvMap.get(occ.asv_id);
    const rawTaxon = asv?.taxonomy?.[rank] || 'Unassigned';
    const colTaxon = topTaxaSet.has(rawTaxon) ? rawTaxon : (hasOther ? 'Other' : rawTaxon);

    let siteMapObj = siteTaxaStats.get(site);
    if (!siteMapObj) {
      siteMapObj = new Map();
      siteTaxaStats.set(site, siteMapObj);
    }

    let stats = siteMapObj.get(colTaxon);
    if (!stats) {
      stats = { abundance: 0, sampleIds: new Set(), asvIds: new Set() };
      siteMapObj.set(colTaxon, stats);
    }
    stats.abundance += occ.abundance;
    stats.sampleIds.add(occ.sample_id);
    stats.asvIds.add(occ.asv_id);
  });

  // Build matrix in O(sites * taxa)
  let maxVal = 0;
  const matrix: (number | null)[][] = sites.map((site) => {
    const siteStats = siteTaxaStats.get(site);
    const totalSiteReads = siteTotalAbundance.get(site) || 1;

    return taxa.map((colTaxon) => {
      const stats = siteStats?.get(colTaxon);
      if (!stats || stats.abundance === 0) {
        return null;
      }

      let val: number;
      if (measure === 'abundance') {
        val = stats.abundance;
      } else if (measure === 'occurrence') {
        val = stats.sampleIds.size;
      } else if (measure === 'asv_count') {
        val = stats.asvIds.size;
      } else {
        // normalized
        val = Math.round((stats.abundance / totalSiteReads) * 1000) / 10;
      }

      if (val > maxVal) maxVal = val;
      return val;
    });
  });

  return { sites, taxa, matrix, maxVal };
}

/**
 * Compute Beta Diversity Distance Matrix between sites (Bray-Curtis & Jaccard)
 */
export function computeBetaDiversity(
  expedition: Expedition,
  filters: Partial<AnalysisFilters>
): {
  sites: string[];
  cells: BetaDistanceCell[];
  brayMatrix: number[][];
  jaccardMatrix: number[][];
} {
  const filtered = filterExpedition(expedition, filters);
  const { sampleMap, asvMap } = filtered;
  const rank = filters.taxonomicRank || 'class';
  const sites = Array.from(new Set(filtered.samples.map((s) => s.site))).sort();

  // Build taxa abundance profile for each site
  const siteProfiles = new Map<string, Map<string, number>>();
  const siteTaxaSets = new Map<string, Set<string>>();

  sites.forEach((site) => {
    siteProfiles.set(site, new Map<string, number>());
    siteTaxaSets.set(site, new Set<string>());
  });

  filtered.occurrences.forEach((occ) => {
    const sample = sampleMap.get(occ.sample_id);
    if (sample && siteProfiles.has(sample.site)) {
      const asv = asvMap.get(occ.asv_id);
      const taxon = asv?.taxonomy?.[rank] || 'Unassigned';
      const map = siteProfiles.get(sample.site)!;
      map.set(taxon, (map.get(taxon) || 0) + occ.abundance);
      siteTaxaSets.get(sample.site)!.add(taxon);
    }
  });

  const cells: BetaDistanceCell[] = [];
  const brayMatrix: number[][] = [];
  const jaccardMatrix: number[][] = [];

  for (let i = 0; i < sites.length; i++) {
    brayMatrix[i] = [];
    jaccardMatrix[i] = [];
    const siteA = sites[i];
    const mapA = siteProfiles.get(siteA)!;
    const setA = siteTaxaSets.get(siteA)!;
    const totalA = Array.from(mapA.values()).reduce((sum, v) => sum + v, 0);

    for (let j = 0; j < sites.length; j++) {
      const siteB = sites[j];
      if (i === j) {
        brayMatrix[i][j] = 0;
        jaccardMatrix[i][j] = 0;
        continue;
      }

      const mapB = siteProfiles.get(siteB)!;
      const setB = siteTaxaSets.get(siteB)!;
      const totalB = Array.from(mapB.values()).reduce((sum, v) => sum + v, 0);

      // Union of all taxa present in either site
      const allTaxa = new Set([...setA, ...setB]);
      let minSum = 0;
      let sharedCount = 0;

      allTaxa.forEach((taxon) => {
        const countA = mapA.get(taxon) || 0;
        const countB = mapB.get(taxon) || 0;
        minSum += Math.min(countA, countB);
        if (countA > 0 && countB > 0) {
          sharedCount++;
        }
      });

      // Bray-Curtis Dissimilarity: 1 - 2*minSum / (totalA + totalB)
      let bc = 1.0;
      if (totalA + totalB > 0) {
        bc = 1 - (2 * minSum) / (totalA + totalB);
      }
      bc = Math.round(Math.max(0, Math.min(1, bc)) * 1000) / 1000;
      brayMatrix[i][j] = bc;

      // Jaccard distance: 1 - (|A intersect B| / |A union B|)
      const unionCount = allTaxa.size;
      let jaccard = 1.0;
      if (unionCount > 0) {
        jaccard = 1 - sharedCount / unionCount;
      }
      jaccard = Math.round(Math.max(0, Math.min(1, jaccard)) * 1000) / 1000;
      jaccardMatrix[i][j] = jaccard;

      if (i < j) {
        cells.push({
          siteA,
          siteB,
          brayCurtis: bc,
          jaccard,
          sharedTaxaCount: sharedCount,
          uniqueTaxaSiteA: setA.size - sharedCount,
          uniqueTaxaSiteB: setB.size - sharedCount,
        });
      }
    }
  }

  return { sites, cells, brayMatrix, jaccardMatrix };
}

/**
 * Compute Gamma Diversity (regional pool)
 */
export function computeGammaDiversity(
  expedition: Expedition,
  filters: Partial<AnalysisFilters>
): {
  totalObservedRichness: number;
  totalTaxaCount: number;
  totalAbundance: number;
  regionalShannon: number;
} {
  const filtered = filterExpedition(expedition, filters);
  const { asvMap } = filtered;
  const rank = filters.taxonomicRank || 'class';

  const presentAsvs = new Set(filtered.occurrences.map((o) => o.asv_id));
  const taxaCounts = new Map<string, number>();
  let totalAbundance = 0;

  filtered.occurrences.forEach((occ) => {
    const asv = asvMap.get(occ.asv_id);
    const taxon = asv?.taxonomy?.[rank] || 'Unassigned';
    taxaCounts.set(taxon, (taxaCounts.get(taxon) || 0) + occ.abundance);
    totalAbundance += occ.abundance;
  });

  let regionalShannon = 0;
  if (totalAbundance > 0) {
    taxaCounts.forEach((count) => {
      const p = count / totalAbundance;
      if (p > 0) {
        regionalShannon -= p * Math.log(p);
      }
    });
  }

  return {
    totalObservedRichness: presentAsvs.size,
    totalTaxaCount: taxaCounts.size,
    totalAbundance,
    regionalShannon: Math.round(regionalShannon * 100) / 100,
  };
}

/**
 * Compute Taxonomic Rollup
 */
export function computeTaxonomyRollup(
  expedition: Expedition,
  filters: Partial<AnalysisFilters>,
  rank: TaxonomicRank
): {
  taxon: string;
  asvCount: number;
  abundance: number;
  relativeAbundance: number;
  sampleOccurrence: number;
  avgConfidence: number;
}[] {
  const filtered = filterExpedition(expedition, filters);
  const { asvMap } = filtered;
  const totalReads = filtered.occurrences.reduce((sum, o) => sum + o.abundance, 0);

  const rollup = new Map<
    string,
    {
      asvIds: Set<string>;
      abundance: number;
      samples: Set<string>;
      confidences: number[];
    }
  >();

  filtered.occurrences.forEach((occ) => {
    const asv = asvMap.get(occ.asv_id);
    const taxon = asv?.taxonomy?.[rank] || 'Unassigned';
    if (!rollup.has(taxon)) {
      rollup.set(taxon, {
        asvIds: new Set(),
        abundance: 0,
        samples: new Set(),
        confidences: [],
      });
    }
    const item = rollup.get(taxon)!;
    item.asvIds.add(occ.asv_id);
    item.abundance += occ.abundance;
    item.samples.add(occ.sample_id);
    if (asv?.confidence !== undefined) {
      item.confidences.push(asv.confidence);
    }
  });

  return Array.from(rollup.entries())
    .map(([taxon, data]) => {
      const avgConf =
        data.confidences.length > 0
          ? data.confidences.reduce((a, b) => a + b, 0) / data.confidences.length
          : 0;
      return {
        taxon,
        asvCount: data.asvIds.size,
        abundance: data.abundance,
        relativeAbundance:
          totalReads > 0 ? Math.round((data.abundance / totalReads) * 1000) / 10 : 0,
        sampleOccurrence: data.samples.size,
        avgConfidence: Math.round(avgConf * 100) / 100,
      };
    })
    .sort((a, b) => b.abundance - a.abundance);
}
