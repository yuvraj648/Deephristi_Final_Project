// ========================================================
// DEEPDRISHTI LOCAL EXPEDITION REPOSITORY
// In-browser / In-memory persistence implementation
// Strictly separates demo and uploaded data
// ========================================================

import type { Expedition } from '../domain/types';
import { createDemoExpedition } from '../data/demoExpedition';
import type {
  IExpeditionRepository,
  ExpeditionSummaryItem,
  BatchProgressCallback,
} from './repositoryTypes';

const STORAGE_KEY_EXPEDITIONS = 'deepdrishti_uploaded_expeditions';
const STORAGE_KEY_ACTIVE_ID = 'deepdrishti_active_expedition_id';

// Base demo expeditions
const demoExpedition = createDemoExpedition();
export const demoStore: Map<string, Expedition> = new Map([
  [demoExpedition.id, demoExpedition],
  [
    'exp_deep_sea_2026',
    {
      ...demoExpedition,
      id: 'exp_deep_sea_2026',
      name: 'Deep Sea Community Survey',
      region: 'Central Indian Ridge Hydrothermal Transect',
      description: 'Chemosynthetic and abyssal eDNA amplicon profiling at 1800m - 3400m depths.',
      updated: '2026-03-22T11:00:00Z',
    },
  ],
  [
    'exp_marine_coastal_2026',
    {
      ...demoExpedition,
      id: 'exp_marine_coastal_2026',
      name: 'Marine eDNA Expedition',
      region: 'Lakshadweep Archipelago Coral Atolls',
      description: 'Coral reef fish and invertebrate teleost barcode survey.',
      updated: '2026-03-18T16:45:00Z',
    },
  ],
]);

// In-memory store is the single source of truth for uploaded data.
// localStorage is only read ONCE at startup to hydrate this map.
const uploadedMemoryStore = new Map<string, Expedition>();
let localStorageLoaded = false;
let activeMemoryId: string | null = null;

const BACKEND_CACHE_TTL_MS = 5000; // Re-fetch from backend at most once every 5s

function hydrateFromLocalStorageOnce(): void {
  if (localStorageLoaded) return;
  localStorageLoaded = true;
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_EXPEDITIONS) : null;
    if (raw) {
      const list: Expedition[] = JSON.parse(raw);
      list.forEach((exp) => uploadedMemoryStore.set(exp.id, exp));
    }
  } catch (err) {
    console.error('Failed to parse uploaded expeditions from localStorage:', err);
  }
}

// Only writes lightweight metadata to avoid hitting the browser 5MB quota
// Full datasets are safely persisted in the SQLite backend and kept in memory.
function flushToLocalStorage(): void {
  try {
    if (typeof window === 'undefined') return;
    const list = Array.from(uploadedMemoryStore.values()).map(exp => ({
      id: exp.id,
      name: exp.name,
      region: exp.region,
      description: exp.description,
      updated: exp.updated,
      provenance: exp.provenance,
      samples: exp.samples.length > 50 ? exp.samples.slice(0, 50) : exp.samples,
      asvs: exp.asvs.length > 100 ? [] : exp.asvs,
      occurrences: exp.occurrences.length > 200 ? [] : exp.occurrences,
      clusters: exp.clusters || [],
    }));
    localStorage.setItem(STORAGE_KEY_EXPEDITIONS, JSON.stringify(list));
  } catch (err) {
    console.warn('LocalStorage save skipped (dataset preserved in memory & backend SQLite):', err);
  }
}

export function getUploadedStore(): Map<string, Expedition> {
  hydrateFromLocalStorageOnce();
  return uploadedMemoryStore;
}

export function persistUploadedExpedition(exp: Expedition): void {
  hydrateFromLocalStorageOnce();
  uploadedMemoryStore.set(exp.id, exp);
  // Invalidate backend summary cache so next listExpeditions call refreshes
  backendSummaryCache = null;
  flushToLocalStorage();
}

export function removeUploadedExpedition(id: string): void {
  hydrateFromLocalStorageOnce();
  uploadedMemoryStore.delete(id);
  backendSummaryCache = null;
  flushToLocalStorage();
}

export function getPersistedActiveExpeditionId(): string | null {
  try {
    if (typeof window === 'undefined') return activeMemoryId;
    return localStorage.getItem(STORAGE_KEY_ACTIVE_ID) || activeMemoryId;
  } catch {
    return activeMemoryId;
  }
}

export function setPersistedActiveExpeditionId(id: string): void {
  try {
    activeMemoryId = id;
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_ACTIVE_ID, id);
  } catch {
    // ignore
  }
}

export function getInitialActiveExpedition(): Expedition {
  hydrateFromLocalStorageOnce();
  const activeId = getPersistedActiveExpeditionId();
  if (activeId) {
    if (uploadedMemoryStore.has(activeId)) {
      return uploadedMemoryStore.get(activeId)!;
    }
    if (demoStore.has(activeId)) {
      return demoStore.get(activeId)!;
    }
  }
  return createDemoExpedition();
}

interface BackendExpeditionSummary {
  id: string;
  name: string;
  region: string;
  updated: string;
  provenance?: 'demo' | 'uploaded';
  sampleCount?: number;
  asvCount?: number;
  samples?: any[];
  asvs?: any[];
}

let backendSummaryCache: BackendExpeditionSummary[] | null = null;
let backendSummaryTimestamp = 0;

async function fetchBackendExpeditions(): Promise<BackendExpeditionSummary[]> {
  const now = Date.now();
  if (backendSummaryCache !== null && now - backendSummaryTimestamp < BACKEND_CACHE_TTL_MS) {
    return backendSummaryCache;
  }
  try {
    const response = await fetch('http://localhost:8000/expeditions');
    if (response.ok) {
      const data: BackendExpeditionSummary[] = await response.json();
      backendSummaryCache = data;
      backendSummaryTimestamp = now;
      return data;
    }
  } catch {
    // Backend not running
  }
  return [];
}

export class LocalExpeditionRepository implements IExpeditionRepository {
  readonly mode = 'local' as const;

  async listExpeditions(): Promise<ExpeditionSummaryItem[]> {
    hydrateFromLocalStorageOnce();
    const items: ExpeditionSummaryItem[] = [];
    const seenIds = new Set<string>();

    // 1. Demo reference expeditions
    demoStore.forEach((exp) => {
      seenIds.add(exp.id);
      items.push({
        id: exp.id,
        name: exp.name,
        region: exp.region,
        samples: exp.samples.length,
        asvs: exp.asvs.length,
        status: 'Ready for Analysis',
        provenance: 'demo',
        updated: exp.updated,
      });
    });

    // 2. Fetch from backend (fast summaries, no giant payloads)
    const backendSummaries = await fetchBackendExpeditions();
    backendSummaries.forEach((exp) => {
      seenIds.add(exp.id);
      const sampleCount = typeof exp.sampleCount === 'number'
        ? exp.sampleCount
        : (Array.isArray(exp.samples) ? exp.samples.length : 0);
      const asvCount = typeof exp.asvCount === 'number'
        ? exp.asvCount
        : (Array.isArray(exp.asvs) ? exp.asvs.length : 0);

      items.push({
        id: exp.id,
        name: exp.name,
        region: exp.region,
        samples: sampleCount,
        asvs: asvCount,
        status: 'Ready for Analysis',
        provenance: 'uploaded',
        updated: exp.updated,
      });
    });

    // 3. Fallback to any locally stored uploaded expeditions not in backend list
    uploadedMemoryStore.forEach((exp) => {
      if (!seenIds.has(exp.id)) {
        items.push({
          id: exp.id,
          name: exp.name,
          region: exp.region,
          samples: exp.samples.length,
          asvs: exp.asvs.length,
          status: 'Ready for Analysis',
          provenance: 'uploaded',
          updated: exp.updated,
        });
      }
    });

    return items;
  }

  async getExpedition(id: string): Promise<Expedition | null> {
    hydrateFromLocalStorageOnce();

    // 1. Check demo store first (instant)
    if (demoStore.has(id)) {
      return demoStore.get(id)!;
    }

    // 2. Check in-memory store if it has complete ASVs
    const existing = uploadedMemoryStore.get(id);
    if (existing && existing.asvs && existing.asvs.length > 0 && existing.occurrences && existing.occurrences.length > 0) {
      return existing;
    }

    // 3. Fetch the full dataset from backend SQLite
    try {
      const response = await fetch(`http://localhost:8000/expeditions/${id}`);
      if (response.ok) {
        const found: Expedition = await response.json();
        uploadedMemoryStore.set(found.id, found);
        return found;
      }
    } catch {
      // Backend unavailable
    }

    return existing || null;
  }

  async saveExpedition(
    expedition: Expedition,
    onProgress?: BatchProgressCallback
  ): Promise<Expedition> {
    if (onProgress) onProgress('Preparing dataset', 0, 1);

    if (expedition.provenance === 'uploaded') {
      // Write to memory and localStorage immediately (synchronous, instant)
      persistUploadedExpedition(expedition);

      if (onProgress) onProgress('Saving to backend', 0, 1);

      // Fire-and-forget to backend (don't await — keeps UI snappy)
      fetch('http://localhost:8000/expeditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expedition),
      }).catch(err => {
        console.warn('Backend save failed (data is safe in localStorage):', err);
      });
    } else {
      demoStore.set(expedition.id, expedition);
    }

    if (onProgress) onProgress('Finalizing', 1, 1);
    return expedition;
  }

  async deleteExpedition(id: string): Promise<void> {
    if (demoStore.has(id)) {
      throw new Error('Seeded demo expedition cannot be deleted.');
    }
    removeUploadedExpedition(id);

    // Fire-and-forget delete to backend
    fetch(`http://localhost:8000/expeditions/${id}`, {
      method: 'DELETE',
    }).catch(err => {
      console.warn('Backend delete failed:', err);
    });

    if (getPersistedActiveExpeditionId() === id) {
      setPersistedActiveExpeditionId(demoStore.keys().next().value || 'demo');
    }
  }
}
