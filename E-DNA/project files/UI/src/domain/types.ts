// ==========================================
// DEEPDRISHTI DOMAIN MODEL & ENTITY DEFINITIONS
// Single Source of Truth for Scientific eDNA Data
// ==========================================

export type TaxonomicRank = 
  | 'kingdom'
  | 'phylum'
  | 'class'
  | 'order'
  | 'family'
  | 'genus'
  | 'species';

export interface TaxonomyHierarchy {
  kingdom?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
  species?: string;
}

export type AssignmentStatus = 'assigned' | 'low_confidence' | 'unassigned';
export type NoveltyStatus = 'known' | 'potentially_divergent' | 'not_evaluated';
export type Provenance = 'demo' | 'uploaded';

export interface ReferenceSupport {
  best_hit?: string;
  identity?: number; // percentage e.g. 98.4
  coverage?: number; // percentage e.g. 100.0
  accession?: string;
}

export interface Sample {
  sample_id: string;
  site: string; // Site identifier or name
  latitude?: number;
  longitude?: number;
  depth?: number; // Depth in meters
  date?: string; // ISO date string YYYY-MM-DD
  replicate?: string;
}

export interface ASV {
  asv_id: string;
  sequence: string; // Length is derived from sequence.length
  taxonomy?: TaxonomyHierarchy;
  assignment_status: AssignmentStatus;
  confidence?: number; // 0.0 to 1.0
  reference_support?: ReferenceSupport;
  cluster_id?: string;
  novelty_status: NoveltyStatus;
  embedding?: [number, number]; // 2D coordinates for UMAP/t-SNE
}

export interface Occurrence {
  asv_id: string;
  sample_id: string;
  abundance: number; // Raw read count
}

export interface Cluster {
  cluster_id: string;
  asv_ids: string[];
  closest_known_assignment?: string;
  divergence?: number; // percentage divergence e.g. 14.8%
  novelty_signal: string;
}

export interface Expedition {
  id: string;
  name: string;
  researcher: string;
  region: string;
  description?: string;
  created: string;
  updated: string;
  provenance: Provenance;
  samples: Sample[];
  asvs: ASV[];
  occurrences: Occurrence[];
  clusters: Cluster[];
}

export interface AnalysisFilters {
  depthRange: [number | null, number | null];
  dateRange: [string | null, string | null];
  selectedSites: string[];
  taxonomicRank: TaxonomicRank;
  minConfidence: number; // 0.0 to 1.0
  assignmentStatus: AssignmentStatus[];
  noveltyFilter: 'all' | 'known' | 'potentially_divergent';
  searchQuery: string;
}

export type ValidationSeverity = 'error' | 'warning';

export type ValidationWarningType =
  | 'missing_location'
  | 'missing_depth'
  | 'duplicate_id'
  | 'duplicate_sequence'
  | 'empty_sequence'
  | 'missing_abundance'
  | 'negative_abundance'
  | 'non_numeric_abundance'
  | 'malformed_sequence'
  | 'unsupported_format'
  | 'metadata_mismatch'
  | 'malformed_date'
  | 'empty_dataset'
  | 'zero_abundance_sample';

export interface ValidationWarning {
  type: ValidationWarningType;
  severity?: ValidationSeverity;
  message: string;
  sample_id?: string;
  asv_id?: string;
}

export interface ValidationResult {
  valid: boolean; // can proceed to analysis (no blocking errors)
  status: 'valid' | 'warning' | 'error';
  warnings: ValidationWarning[];
  sampleCount: number;
  asvCount: number;
  siteCount: number;
  hasCoordinates: boolean;
  hasDepths: boolean;
  totalReads?: number;
  nonZeroObservations?: number;
  sequenceLengthRange?: [number, number];
  abundanceRange?: [number, number];
  georeferencedCount?: number;
  depthStratifiedCount?: number;
  metadataMatchedCount?: number;
  errorCount?: number;
  warningCount?: number;
}

// Derived Metrics Types
export interface KPISummary {
  totalAsvs: number;
  taxaDetected: number;
  shannonDiversity: number | null;
  potentiallyUnknownGroups: number;
  totalReads: number;
  sampleCount: number;
  siteCount: number;
  depthMin: number | null;
  depthMax: number | null;
}

export interface AlphaDiversityItem {
  sample_id: string;
  site: string;
  depth?: number;
  observedRichness: number;
  shannon: number;
  simpson: number;
  pielouEvenness: number;
  totalAbundance: number;
}

export interface BetaDistanceCell {
  siteA: string;
  siteB: string;
  brayCurtis: number;
  jaccard: number;
  sharedTaxaCount: number;
  uniqueTaxaSiteA: number;
  uniqueTaxaSiteB: number;
}

export interface SiteProfile {
  site: string;
  latitude?: number;
  longitude?: number;
  sampleIds: string[];
  depths: number[];
  asvCount: number;
  taxaCount: number;
  shannon: number;
  simpson: number;
  totalAbundance: number;
  dominantTaxa: { taxon: string; percentage: number }[];
  divergentGroupCount: number;
}

export interface HeatmapCell {
  site: string;
  taxon: string;
  value: number | null; // null if missing
  formattedValue: string;
}
