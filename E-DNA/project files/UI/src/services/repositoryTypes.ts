// ========================================================
// DEEPDRISHTI EXPEDITION REPOSITORY INTERFACES
// Pluggable repository contract for Local vs Supabase persistence
// ========================================================

import type { Expedition } from '../domain/types';

export type BatchProgressCallback = (
  stage: string,
  current: number,
  total: number
) => void;

export interface ExpeditionSummaryItem {
  id: string;
  name: string;
  region: string;
  samples: number;
  asvs: number;
  status: string;
  provenance: 'demo' | 'uploaded';
  updated: string;
}

export interface IExpeditionRepository {
  readonly mode: 'supabase' | 'local';

  listExpeditions(): Promise<ExpeditionSummaryItem[]>;

  getExpedition(id: string): Promise<Expedition | null>;

  saveExpedition(
    expedition: Expedition,
    onProgress?: BatchProgressCallback
  ): Promise<Expedition>;

  deleteExpedition(id: string): Promise<void>;
}
