// ========================================================
// DEEPDRISHTI SUPABASE EXPEDITION REPOSITORY
// Cloud persistence layer leveraging Supabase PostgreSQL with RLS
// Batched streaming insertion and deterministic canonical reconstruction
// ========================================================

import type { Expedition, Sample, ASV, Occurrence, TaxonomyHierarchy } from '../domain/types';
import { supabase } from '../lib/supabase';
import {
  demoStore,
  persistUploadedExpedition,
  removeUploadedExpedition,
  getPersistedActiveExpeditionId,
  setPersistedActiveExpeditionId,
} from './localRepository';
import type {
  IExpeditionRepository,
  ExpeditionSummaryItem,
  BatchProgressCallback,
} from './repositoryTypes';
import { ensureUUID } from '../lib/uuid';

const BATCH_SIZE_SAMPLES = 500;
const BATCH_SIZE_ASVS = 500;
const BATCH_SIZE_OCCURRENCES = 1000;
const PAGE_SIZE_FETCH = 1000;

export class SupabaseExpeditionRepository implements IExpeditionRepository {
  readonly mode = 'supabase' as const;

  /**
   * Helper to perform batched upserts with progress telemetry
   */
  private async executeBatchInsert<T extends Record<string, any>>(
    table: string,
    rows: T[],
    batchSize: number,
    stageName: string,
    onProgress?: BatchProgressCallback
  ): Promise<void> {
    const total = rows.length;
    if (total === 0) return;

    if (!supabase) {
      throw new Error('Supabase client is not initialized.');
    }

    for (let i = 0; i < total; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await supabase.from(table).upsert(batch as any);

      if (error) {
        throw new Error(
          `Database insertion failed on table "${table}" (records ${i + 1}–${i + batch.length}): ${error.message}`
        );
      }

      const completed = Math.min(i + batch.length, total);
      if (onProgress) {
        onProgress(stageName, completed, total);
      }
    }
  }

  /**
   * Fetch all records from a table with pagination to overcome default 1000 row limits
   */
  private async fetchAllRecords<T>(
    table: string,
    expeditionId: string,
    selectCols: string = '*'
  ): Promise<T[]> {
    if (!supabase) return [];
    const all: T[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const to = from + PAGE_SIZE_FETCH - 1;
      const { data, error } = await supabase
        .from(table)
        .select(selectCols)
        .eq('expedition_id', expeditionId)
        .range(from, to);

      if (error) {
        throw new Error(`Failed to fetch records from "${table}": ${error.message}`);
      }

      if (data && data.length > 0) {
        all.push(...(data as unknown as T[]));
        from += data.length;
        if (data.length < PAGE_SIZE_FETCH) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    return all;
  }

  async listExpeditions(): Promise<ExpeditionSummaryItem[]> {
    const uploadedItems: ExpeditionSummaryItem[] = [];

    // 1. Fetch remote uploaded expeditions from Supabase (RLS ensures only this user's own)
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('expeditions')
          .select('id, name, region, provenance, updated_at, created_at')
          .eq('provenance', 'uploaded')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('DeepDrishti: Supabase query error in listExpeditions:', error.message);
        } else if (data) {
          for (const exp of data) {
            // Get approximate sample & asv counts
            const { count: sampleCount } = await supabase
              .from('samples')
              .select('*', { count: 'exact', head: true })
              .eq('expedition_id', exp.id);

            const { count: asvCount } = await supabase
              .from('asvs')
              .select('*', { count: 'exact', head: true })
              .eq('expedition_id', exp.id);

            uploadedItems.push({
              id: exp.id,
              name: exp.name,
              region: exp.region,
              samples: sampleCount || 0,
              asvs: asvCount || 0,
              status: 'Cloud Synchronized',
              provenance: 'uploaded',
              updated: exp.updated_at || exp.created_at,
            });
          }
        }
      } catch (err: any) {
        console.warn('DeepDrishti: Failed to list remote expeditions from Supabase:', err.message);
      }
    }

    // 2. Build demo items from local demoStore (always visible to everyone, never stored in cloud)
    const demoItems: ExpeditionSummaryItem[] = [];
    demoStore.forEach((exp) => {
      demoItems.push({
        id: exp.id,
        name: exp.name,
        region: exp.region,
        samples: exp.samples.length,
        asvs: exp.asvs.length,
        status: 'Standard Demo',
        provenance: 'demo',
        updated: exp.updated,
      });
    });

    // Demos first, then user's own uploaded expeditions
    return [...demoItems, ...uploadedItems];
  }

  async getExpedition(id: string): Promise<Expedition | null> {
    // 1. Check local demo store first
    if (demoStore.has(id)) {
      return JSON.parse(JSON.stringify(demoStore.get(id)));
    }

    if (!supabase) return null;

    try {
      // 2. Fetch expedition header from Supabase
      const { data: expRow, error: expError } = await supabase
        .from('expeditions')
        .select('*')
        .eq('id', id)
        .single();

      if (expError || !expRow) {
        return null;
      }

      // 3. Fetch all dependent samples (paginated)
      const sampleRows = await this.fetchAllRecords<any>('samples', id);
      const samples: Sample[] = sampleRows.map((s) => ({
        sample_id: s.sample_id,
        site: s.site,
        latitude: s.latitude !== null && s.latitude !== undefined ? s.latitude : undefined,
        longitude: s.longitude !== null && s.longitude !== undefined ? s.longitude : undefined,
        depth: s.depth !== null && s.depth !== undefined ? s.depth : undefined,
        date: s.date || undefined,
        replicate: s.replicate || undefined,
      }));

      // 4. Fetch all dependent ASVs (paginated)
      const asvRows = await this.fetchAllRecords<any>('asvs', id);
      const asvs: ASV[] = asvRows.map((a) => {
        let taxonomy: TaxonomyHierarchy | undefined = undefined;
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
          assignment_status: a.assignment_status || 'unassigned',
          confidence: a.confidence !== null && a.confidence !== undefined ? a.confidence : undefined,
          novelty_status: 'not_evaluated',
        };
      });

      // 5. Fetch all occurrences (sparse abundance matrix, paginated)
      const occRows = await this.fetchAllRecords<any>('occurrences', id);
      const occurrences: Occurrence[] = occRows.map((o) => ({
        asv_id: o.asv_id,
        sample_id: o.sample_id,
        abundance: o.abundance,
      }));

      const canonicalExp: Expedition = {
        id: expRow.id,
        name: expRow.name,
        researcher: expRow.researcher_id || 'Authenticated Researcher',
        region: expRow.region,
        description: expRow.description || 'Uploaded eDNA amplicon sequence survey.',
        created: expRow.created_at,
        updated: expRow.updated_at,
        provenance: 'uploaded',
        samples,
        asvs,
        occurrences,
        clusters: [], // Real uploaded data does NOT fabricate clusters
      };

      // Cache locally for instant reload
      persistUploadedExpedition(canonicalExp);

      return canonicalExp;
    } catch (err: any) {
      console.error(`DeepDrishti: Failed to load expedition ${id} from Supabase:`, err);
      return null;
    }
  }

  async saveExpedition(
    expedition: Expedition,
    onProgress?: BatchProgressCallback
  ): Promise<Expedition> {
    if (expedition.provenance === 'demo') {
      demoStore.set(expedition.id, JSON.parse(JSON.stringify(expedition)));
      return expedition;
    }

    if (!supabase) {
      throw new Error('Supabase client is not configured. Falling back to local store.');
    }

    if (onProgress) onProgress('Preparing dataset', 0, 1);

    // Ensure expedition.id conforms to Supabase PostgreSQL UUID format
    const validExpId = ensureUUID(expedition.id);
    expedition.id = validExpId;

    // Get current authenticated user if logged in
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Stage 1: Insert Expedition Header
    if (onProgress) onProgress('Uploading expedition', 0, 1);
    const { error: expError } = await supabase.from('expeditions').upsert({
      id: validExpId,
      researcher_id: user?.id || null,
      name: expedition.name,
      region: expedition.region,
      description: expedition.description,
      provenance: 'uploaded',
      updated_at: new Date().toISOString(),
    });

    if (expError) {
      throw new Error(`Failed to upload expedition header to Supabase: ${expError.message}`);
    }
    if (onProgress) onProgress('Uploading expedition', 1, 1);

    // Stage 2: Batch Insert Samples
    const sampleRows = expedition.samples.map((s) => ({
      expedition_id: validExpId,
      sample_id: s.sample_id,
      site: s.site,
      latitude: s.latitude !== undefined ? s.latitude : null,
      longitude: s.longitude !== undefined ? s.longitude : null,
      depth: s.depth !== undefined ? s.depth : null,
      date: s.date || null,
      replicate: s.replicate || null,
    }));

    await this.executeBatchInsert(
      'samples',
      sampleRows,
      BATCH_SIZE_SAMPLES,
      'Uploading samples',
      onProgress
    );

    // Stage 3: Batch Insert ASVs
    const asvRows = expedition.asvs.map((a) => ({
      expedition_id: validExpId,
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

    await this.executeBatchInsert(
      'asvs',
      asvRows,
      BATCH_SIZE_ASVS,
      'Uploading ASVs',
      onProgress
    );

    // Stage 4: Batch Insert Occurrences
    const occurrenceRows = expedition.occurrences.map((o) => ({
      expedition_id: validExpId,
      asv_id: o.asv_id,
      sample_id: o.sample_id,
      abundance: o.abundance,
    }));

    await this.executeBatchInsert(
      'occurrences',
      occurrenceRows,
      BATCH_SIZE_OCCURRENCES,
      'Uploading abundance records',
      onProgress
    );

    if (onProgress) onProgress('Finalizing', 1, 1);

    // Also cache locally for seamless offline access
    persistUploadedExpedition(expedition);

    return expedition;
  }

  async deleteExpedition(id: string): Promise<void> {
    if (demoStore.has(id)) {
      throw new Error('Seeded demo expedition cannot be deleted.');
    }

    if (!supabase) {
      throw new Error('Supabase client is not configured.');
    }

    // Database foreign keys have ON DELETE CASCADE
    const { error } = await supabase.from('expeditions').delete().eq('id', id);
    if (error) {
      throw new Error(`Failed to delete expedition from Supabase: ${error.message}`);
    }

    // Also remove from local cache
    removeUploadedExpedition(id);

    if (getPersistedActiveExpeditionId() === id) {
      const firstDemo = Array.from(demoStore.values())[0];
      setPersistedActiveExpeditionId(firstDemo?.id || '');
    }
  }
}
