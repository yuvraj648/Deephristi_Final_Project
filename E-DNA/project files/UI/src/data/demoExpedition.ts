// ==========================================================
// DEEPDRISHTI DEMO EXPEDITION DATA GENERATOR
// Arabian Sea Marine eDNA Biodiversity Survey
// Seeded, reproducible, mathematically consistent
// ==========================================================

import type { Expedition, Sample, ASV, Occurrence, Cluster } from '../domain/types';

export function createDemoExpedition(): Expedition {
  // 1. Sampling Sites & Stations across the Arabian Sea Bathymetric Gradient
  const siteMetadata = [
    { site: 'Station S01 - Shelf Shallow', lat: 18.92, lng: 72.45, depths: [15, 35] },
    { site: 'Station S02 - Coastal Upwelling', lat: 17.65, lng: 71.90, depths: [25, 75] },
    { site: 'Station S03 - Shelf Break', lat: 16.80, lng: 71.20, depths: [120, 200] },
    { site: 'Station S04 - Oxygen Minimum Zone', lat: 15.95, lng: 70.15, depths: [350, 600] },
    { site: 'Station S05 - Mesopelagic Pelagic', lat: 15.20, lng: 69.40, depths: [500, 800] },
    { site: 'Station S06 - Continental Slope', lat: 14.85, lng: 68.80, depths: [950, 1400] },
    { site: 'Station S07 - Bathyal Deep Sea', lat: 14.10, lng: 68.10, depths: [1800, 2600] },
    { site: 'Station S08 - Abyssal Trench Margin', lat: 13.50, lng: 67.40, depths: [3200] },
  ];

  const samples: Sample[] = [];
  let sampleCounter = 1;

  siteMetadata.forEach((sMeta) => {
    sMeta.depths.forEach((depth, idx) => {
      const padId = String(sampleCounter).padStart(3, '0');
      samples.push({
        sample_id: `SMP_${padId}`,
        site: sMeta.site,
        latitude: sMeta.lat + (Math.sin(sampleCounter) * 0.02),
        longitude: sMeta.lng + (Math.cos(sampleCounter) * 0.02),
        depth: depth,
        date: `2026-03-${String(10 + Math.floor(sampleCounter / 2)).padStart(2, '0')}`,
        replicate: `R${idx + 1}`,
      });
      sampleCounter++;
    });
  });

  // 2. Curated Marine Taxonomic Reference Templates
  const taxonTemplates = [
    // Teleostei (Fishes)
    {
      k: 'Eukaryota', p: 'Chordata', c: 'Actinopterygii', o: 'Clupeiformes', f: 'Clupeidae', g: 'Sardinella', s: 'Sardinella longiceps',
      common: 'Indian Oil Sardine', depthAffinity: 'epipelagic', bestHit: 'NC_003190.1', identity: 99.4, coverage: 100
    },
    {
      k: 'Eukaryota', p: 'Chordata', c: 'Actinopterygii', o: 'Scombriformes', f: 'Scombridae', g: 'Rastrelliger', s: 'Rastrelliger kanagurta',
      common: 'Indian Mackerel', depthAffinity: 'epipelagic', bestHit: 'AP011985.1', identity: 98.9, coverage: 100
    },
    {
      k: 'Eukaryota', p: 'Chordata', c: 'Actinopterygii', o: 'Perciformes', f: 'Serranidae', g: 'Epinephelus', s: 'Epinephelus diacanthus',
      common: 'Spinycheek Grouper', depthAffinity: 'shelf', bestHit: 'DQ197992.1', identity: 98.2, coverage: 99.5
    },
    {
      k: 'Eukaryota', p: 'Chordata', c: 'Actinopterygii', o: 'Myctophiformes', f: 'Myctophidae', g: 'Benthosema', s: 'Benthosema pterotum',
      common: 'Skinnycheek Lanternfish', depthAffinity: 'omz', bestHit: 'KC833119.1', identity: 97.8, coverage: 100
    },
    {
      k: 'Eukaryota', p: 'Chordata', c: 'Actinopterygii', o: 'Stomiiformes', f: 'Sternoptychidae', g: 'Maurolicus', s: 'Maurolicus muelleri',
      common: 'Mueller pearlside', depthAffinity: 'mesopelagic', bestHit: 'HQ721455.1', identity: 96.5, coverage: 98.8
    },
    {
      k: 'Eukaryota', p: 'Chordata', c: 'Actinopterygii', o: 'Gadiformes', f: 'Macrouridae', g: 'Coryphaenoides', s: 'Coryphaenoides armatus',
      common: 'Abyssal Grenadier', depthAffinity: 'bathyal', bestHit: 'NC_005839.1', identity: 98.1, coverage: 100
    },
    // Chondrichthyes (Sharks & Rays)
    {
      k: 'Eukaryota', p: 'Chordata', c: 'Chondrichthyes', o: 'Carcharhiniformes', f: 'Carcharhinidae', g: 'Carcharhinus', s: 'Carcharhinus falciformis',
      common: 'Silky Shark', depthAffinity: 'epipelagic', bestHit: 'KF956321.1', identity: 99.1, coverage: 100
    },
    {
      k: 'Eukaryota', p: 'Chordata', c: 'Chondrichthyes', o: 'Rhinopristiformes', f: 'Rhinidae', g: 'Rhynchobatus', s: 'Rhynchobatus djiddensis',
      common: 'Giant Guitarfish', depthAffinity: 'shelf', bestHit: 'KX214502.1', identity: 97.4, coverage: 99.2
    },
    // Malacostraca (Crustaceans)
    {
      k: 'Eukaryota', p: 'Arthropoda', c: 'Malacostraca', o: 'Euphausiacea', f: 'Euphausiidae', g: 'Euphausia', s: 'Euphausia diomedeae',
      common: 'Tropical Krill', depthAffinity: 'omz', bestHit: 'FJ464521.1', identity: 98.0, coverage: 100
    },
    {
      k: 'Eukaryota', p: 'Arthropoda', c: 'Malacostraca', o: 'Decapoda', f: 'Penaeidae', g: 'Penaeus', s: 'Penaeus monodon',
      common: 'Giant Tiger Prawn', depthAffinity: 'coastal', bestHit: 'AY073274.1', identity: 99.5, coverage: 100
    },
    {
      k: 'Eukaryota', p: 'Arthropoda', c: 'Malacostraca', o: 'Decapoda', f: 'Portunidae', g: 'Portunus', s: 'Portunus pelagicus',
      common: 'Blue Swimmer Crab', depthAffinity: 'shelf', bestHit: 'DQ407675.1', identity: 99.0, coverage: 100
    },
    // Cephalopoda & Mollusca
    {
      k: 'Eukaryota', p: 'Mollusca', c: 'Cephalopoda', o: 'Oegopsida', f: 'Ommastrephidae', g: 'Sthenoteuthis', s: 'Sthenoteuthis oualaniensis',
      common: 'Purpleback Flying Squid', depthAffinity: 'mesopelagic', bestHit: 'JN857319.1', identity: 98.6, coverage: 100
    },
    {
      k: 'Eukaryota', p: 'Mollusca', c: 'Gastropoda', o: 'Pteropoda', f: 'Cavoliniidae', g: 'Cavolinia', s: 'Cavolinia uncinata',
      common: 'Sea Butterfly', depthAffinity: 'epipelagic', bestHit: 'EU429811.1', identity: 97.1, coverage: 98.5
    },
    // Cnidaria
    {
      k: 'Eukaryota', p: 'Cnidaria', c: 'Hydrozoa', o: 'Anthoathecata', f: 'Porpitidae', g: 'Porpita', s: 'Porpita porpita',
      common: 'Blue Button Hydroid', depthAffinity: 'surface', bestHit: 'HM584210.1', identity: 99.2, coverage: 100
    },
    {
      k: 'Eukaryota', p: 'Cnidaria', c: 'Anthozoa', o: 'Scleractinia', f: 'Caryophylliidae', g: 'Caryophyllia', s: 'Caryophyllia ambrosia',
      common: 'Deep-sea Cup Coral', depthAffinity: 'bathyal', bestHit: 'HQ694318.1', identity: 95.8, coverage: 97.4
    },
    // Polychaeta (Annelids)
    {
      k: 'Eukaryota', p: 'Annelida', c: 'Polychaeta', o: 'Eunicida', f: 'Onuphidae', g: 'Hyalinoecia', s: 'Hyalinoecia tubicola',
      common: 'Quill Worm', depthAffinity: 'bathyal', bestHit: 'FJ712891.1', identity: 96.2, coverage: 98.0
    },
  ];

  // Distinct Divergent Candidate Groups
  const clusters: Cluster[] = [
    {
      cluster_id: 'CL_DIV_01',
      asv_ids: ['ASV_0088', 'ASV_0089', 'ASV_0090', 'ASV_0091'],
      closest_known_assignment: 'Unassigned Bathypelagic Decapoda',
      divergence: 14.8,
      novelty_signal: 'Conserved mitochondrial 16S motif with >14% divergence from known Natantia references',
    },
    {
      cluster_id: 'CL_DIV_02',
      asv_ids: ['ASV_0114', 'ASV_0115', 'ASV_0116'],
      closest_known_assignment: 'Benthic Annelida cf. Ampharetidae',
      divergence: 18.2,
      novelty_signal: '18S V4 indel polymorphism absent in NCBI GenBank & SILVA databases',
    },
    {
      cluster_id: 'CL_DIV_03',
      asv_ids: ['ASV_0142', 'ASV_0143'],
      closest_known_assignment: 'Deep Trench Actinopterygii incertae sedis',
      divergence: 12.5,
      novelty_signal: 'Deep bathyal COI sequence cluster diverging from Stomiiformes clade',
    },
  ];

  // 3. Generate ASVs with realistic DNA sequences, embeddings, and status
  const asvs: ASV[] = [];
  const totalAsvCount = 160;

  // Base sequences bank
  const baseMotifs = [
    'ACTGGTCCAGTTGACGTAACCGGTTTAGGACATTCGATCGTAGCCTAAGCTAGCATCGATCGAT',
    'TGACCAAGTCGATTGACCAATTAGGCCATTCGAGCTAGCAATTCGATCGATAGCTACGATCGTT',
    'GCTAGCAATTCGATCGATCGTAGGCTACCAAGTCGATCGGATTAGGACATTCGATCGTAGCTA',
    'AAGCTAGCATCGATCGATCGTAGCCTAGATCGATAGCTACCAAGTCGATTGACCAATTAGGCC',
  ];

  for (let i = 1; i <= totalAsvCount; i++) {
    const asvId = `ASV_${String(i).padStart(4, '0')}`;
    const motifIndex = i % baseMotifs.length;
    // Generate realistic ~150-180 bp nucleotide string
    const seq = (baseMotifs[motifIndex] + baseMotifs[(motifIndex + 1) % baseMotifs.length] + baseMotifs[(motifIndex + 2) % baseMotifs.length]).slice(0, 140 + (i * 7) % 45);

    // Check if part of divergent clusters
    const divCluster = clusters.find((c) => c.asv_ids.includes(asvId));

    let assignmentStatus: ASV['assignment_status'] = 'assigned';
    let noveltyStatus: ASV['novelty_status'] = 'known';
    let clusterId: string | undefined = undefined;
    let confidence = 0.92 + ((i * 13) % 8) * 0.01;
    let refSupport = undefined;
    let taxonomyHierarchy = undefined;

    if (divCluster) {
      assignmentStatus = 'low_confidence';
      noveltyStatus = 'potentially_divergent';
      clusterId = divCluster.cluster_id;
      confidence = 0.62 + ((i * 11) % 15) * 0.01;
      refSupport = {
        best_hit: 'GB_UNCULTURED_MAR_' + String(9000 + i),
        identity: 85.2 + (divCluster.divergence ? (100 - divCluster.divergence) * 0.1 : 0),
        coverage: 92.5,
      };
      taxonomyHierarchy = {
        kingdom: 'Eukaryota',
        phylum: i % 2 === 0 ? 'Arthropoda' : 'Annelida',
        class: 'Unassigned',
      };
    } else if (i % 11 === 0) {
      // Unassigned ASV
      assignmentStatus = 'unassigned';
      noveltyStatus = 'not_evaluated';
      confidence = 0.45;
      taxonomyHierarchy = {
        kingdom: 'Eukaryota',
      };
    } else if (i % 7 === 0) {
      // Low confidence ASV
      assignmentStatus = 'low_confidence';
      noveltyStatus = 'known';
      confidence = 0.72;
      const tpl = taxonTemplates[i % taxonTemplates.length];
      taxonomyHierarchy = {
        kingdom: tpl.k,
        phylum: tpl.p,
        class: tpl.c,
        order: tpl.o,
      };
      refSupport = {
        best_hit: tpl.bestHit,
        identity: 88.5,
        coverage: 94.0,
      };
    } else {
      // Assigned ASV
      const tpl = taxonTemplates[i % taxonTemplates.length];
      confidence = 0.90 + ((i * 3) % 10) * 0.01;
      taxonomyHierarchy = {
        kingdom: tpl.k,
        phylum: tpl.p,
        class: tpl.c,
        order: tpl.o,
        family: tpl.f,
        genus: tpl.g,
        species: tpl.s,
      };
      refSupport = {
        best_hit: tpl.bestHit,
        identity: tpl.identity,
        coverage: tpl.coverage,
      };
    }

    // UMAP 2-D coordinates calculation grouped by taxonomy or novelty
    let xEmbed = 0;
    let yEmbed = 0;
    if (noveltyStatus === 'potentially_divergent') {
      xEmbed = 7.5 + Math.sin(i * 1.5) * 1.2;
      yEmbed = -6.0 + Math.cos(i * 1.5) * 1.2;
    } else {
      const groupAngle = (taxonomyHierarchy.class ? taxonomyHierarchy.class.charCodeAt(0) : 70) * 0.4;
      const radius = 2.5 + ((i * 17) % 35) * 0.1;
      xEmbed = Math.cos(groupAngle + i * 0.15) * radius + (Math.sin(i * 3) * 0.4);
      yEmbed = Math.sin(groupAngle + i * 0.15) * radius + (Math.cos(i * 3) * 0.4);
    }

    asvs.push({
      asv_id: asvId,
      sequence: seq,
      taxonomy: taxonomyHierarchy,
      assignment_status: assignmentStatus,
      confidence: Math.round(confidence * 100) / 100,
      reference_support: refSupport,
      cluster_id: clusterId,
      novelty_status: noveltyStatus,
      embedding: [Math.round(xEmbed * 100) / 100, Math.round(yEmbed * 100) / 100],
    });
  }

  // 4. Generate Occurrences (The ASV x Sample abundance table)
  const occurrences: Occurrence[] = [];

  samples.forEach((sample, sIdx) => {
    // Determine depth tier
    const d = sample.depth || 0;
    const isShallow = d <= 100;
    const isOMZ = d > 100 && d <= 700;
    const isDeep = d > 700;

    asvs.forEach((asv, aIdx) => {
      // Depth ecological sorting
      let prob = 0.28;
      const tpl = taxonTemplates[aIdx % taxonTemplates.length];
      const isDiv = asv.novelty_status === 'potentially_divergent';

      if (isDiv) {
        // Divergent deep water taxa appear primarily in deeper samples
        prob = isDeep ? 0.75 : 0.05;
      } else if (tpl.depthAffinity === 'epipelagic' || tpl.depthAffinity === 'surface' || tpl.depthAffinity === 'coastal') {
        prob = isShallow ? 0.70 : (isOMZ ? 0.15 : 0.02);
      } else if (tpl.depthAffinity === 'omz' || tpl.depthAffinity === 'mesopelagic') {
        prob = isOMZ ? 0.80 : (isShallow ? 0.20 : 0.40);
      } else if (tpl.depthAffinity === 'bathyal' || tpl.depthAffinity === 'shelf') {
        prob = isDeep ? 0.75 : (isOMZ ? 0.35 : 0.10);
      }

      // Seeded pseudorandom check
      const pseudoRand = ((sIdx * 31 + aIdx * 17 + 13) % 100) / 100;
      if (pseudoRand < prob) {
        // Read count abundance
        const baseAbund = 25 + Math.floor(((sIdx * 73 + aIdx * 41) % 450));
        const multiplier = isShallow ? 3.5 : (isOMZ ? 2.0 : 1.2);
        const abundance = Math.floor(baseAbund * multiplier);

        occurrences.push({
          asv_id: asv.asv_id,
          sample_id: sample.sample_id,
          abundance,
        });
      }
    });
  });

  return {
    id: 'exp_arabian_sea_2026',
    name: 'Arabian Sea Biodiversity Survey',
    researcher: 'Dr. M. S. Swaminathan Marine Research Group',
    region: 'Eastern Arabian Sea (13.5°N – 18.9°N, 67.4°E – 72.5°E)',
    description: 'Systematic bathymetric eDNA profiling of pelagic, oxygen-minimum zone (OMZ), and bathyal benthic communities across the west Indian continental margin.',
    created: '2026-03-15T08:00:00Z',
    updated: '2026-03-28T14:30:00Z',
    provenance: 'demo',
    samples,
    asvs,
    occurrences,
    clusters,
  };
}

export function createEmptyExpedition(name: string, researcher: string, region: string, description?: string): Expedition {
  return {
    id: `exp_${Date.now()}`,
    name: name || 'Untitled Marine Expedition',
    researcher: researcher || 'Unspecified Researcher',
    region: region || 'Global Ocean',
    description: description || '',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    provenance: 'uploaded',
    samples: [],
    asvs: [],
    occurrences: [],
    clusters: [],
  };
}
