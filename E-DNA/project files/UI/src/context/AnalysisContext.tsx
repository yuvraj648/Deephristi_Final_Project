// ==========================================================
// DEEPDRISHTI ANALYSIS CONTEXT & SINGLE SOURCE OF TRUTH
// Guarantees all pages share the exact same derived metrics
// ==========================================================

import React, { createContext, useContext, useState, useMemo, useCallback, useTransition, useDeferredValue } from 'react';
import type {
  Expedition,
  AnalysisFilters,
  KPISummary,
  AlphaDiversityItem,
  SiteProfile,
  TaxonomicRank,
  ASV,
} from '../domain/types';
import {
  computeKPISummary,
  computeAlphaDiversity,
  computeBetaDiversity,
  computeGammaDiversity,
  computeSiteProfiles,
  computeLocationTaxaMatrix,
  computeTaxonomyRollup,
  filterExpedition,
} from '../domain/metrics';
import {
  loadExpedition as loadExpeditionFromService,
  deleteExpedition as deleteExpeditionFromService,
  listExpeditions,
  getInitialActiveExpedition,
  setPersistedActiveExpeditionId,
  getRepository,
} from '../services/dataService';

export const initialFilters: AnalysisFilters = {
  depthRange: [null, null],
  dateRange: [null, null],
  selectedSites: [],
  taxonomicRank: 'class',
  minConfidence: 0,
  assignmentStatus: ['assigned', 'low_confidence', 'unassigned'],
  noveltyFilter: 'all',
  searchQuery: '',
};

interface ActiveDrawerState {
  type: 'asv' | 'site' | 'cluster';
  id: string;
}

interface AnalysisContextType {
  expedition: Expedition;
  filters: AnalysisFilters;
  theme: 'paper' | 'dark-abyss';
  activeDrawer: ActiveDrawerState | null;
  selectedSiteId: string | null;
  selectedAsvId: string | null;
  selectedClusterId: string | null;
  // Selectors & Derived data
  kpis: KPISummary;
  alphaDiversity: AlphaDiversityItem[];
  siteProfiles: SiteProfile[];
  filteredAsvs: ASV[];
  repositoryMode: 'supabase' | 'local';
  // Actions
  setExpedition: (exp: Expedition) => void;
  loadExpeditionById: (id: string) => Promise<void>;
  deleteExpeditionById: (id: string) => Promise<void>;
  updateFilter: <K extends keyof AnalysisFilters>(key: K, value: AnalysisFilters[K]) => void;
  resetFilters: () => void;
  setTheme: (theme: 'paper' | 'dark-abyss') => void;
  setActiveDrawer: (drawer: ActiveDrawerState | null) => void;
  setSelectedSiteId: (siteId: string | null) => void;
  setSelectedAsvId: (asvId: string | null) => void;
  setSelectedClusterId: (clusterId: string | null) => void;
  // Matrix selector
  getLocationTaxaMatrix: (measure?: 'abundance' | 'occurrence' | 'normalized' | 'asv_count', topN?: number) => {
    sites: string[];
    taxa: string[];
    matrix: (number | null)[][];
    maxVal: number;
  };
  getBetaDiversity: () => ReturnType<typeof computeBetaDiversity>;
  getGammaDiversity: () => ReturnType<typeof computeGammaDiversity>;
  getTaxonomyRollup: (rank?: TaxonomicRank) => ReturnType<typeof computeTaxonomyRollup>;
}

const AnalysisContext = createContext<AnalysisContextType | null>(null);

export const AnalysisProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to persisted active or Demo Expedition
  const [expedition, setExpeditionState] = useState<Expedition>(() => getInitialActiveExpedition());
  const [filters, setFilters] = useState<AnalysisFilters>(initialFilters);
  const [theme, setThemeState] = useState<'paper' | 'dark-abyss'>('dark-abyss');
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawerState | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [selectedAsvId, setSelectedAsvId] = useState<string | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);

  const setTheme = useCallback((newTheme: 'paper' | 'dark-abyss') => {
    setThemeState(newTheme);
    document.documentElement.classList.add('dark-workspace');
  }, []);

  const [, startTransition] = useTransition();

  const setExpedition = useCallback((newExp: Expedition) => {
    // Update the expedition immediately so navigation is instant
    setExpeditionState(newExp);
    setPersistedActiveExpeditionId(newExp.id);
    // Defer filter/drawer resets so they don't block initial paint
    startTransition(() => {
      setFilters(initialFilters);
      setActiveDrawer(null);
      setSelectedSiteId(null);
    });
  }, [startTransition]);

  const loadExpeditionById = useCallback(async (id: string) => {
    const loaded = await loadExpeditionFromService(id);
    if (loaded) {
      setExpedition(loaded);
    }
  }, [setExpedition]);

  const deleteExpeditionById = useCallback(async (id: string) => {
    await deleteExpeditionFromService(id);
    if (expedition.id === id) {
      const remaining = await listExpeditions();
      const next = remaining[0];
      if (next) {
        const nextExp = await loadExpeditionFromService(next.id);
        if (nextExp) setExpedition(nextExp);
      }
    }
  }, [expedition.id, setExpedition]);

  const updateFilter = useCallback(<K extends keyof AnalysisFilters>(key: K, value: AnalysisFilters[K]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  // Defer expensive metric computations — UI paints instantly, metrics catch up
  const deferredExpedition = useDeferredValue(expedition);
  const deferredFilters = useDeferredValue(filters);

  const kpis = useMemo(() => computeKPISummary(deferredExpedition, deferredFilters), [deferredExpedition, deferredFilters]);
  const alphaDiversity = useMemo(() => computeAlphaDiversity(deferredExpedition, deferredFilters), [deferredExpedition, deferredFilters]);
  const siteProfiles = useMemo(() => computeSiteProfiles(deferredExpedition, deferredFilters), [deferredExpedition, deferredFilters]);

  const filteredAsvs = useMemo(() => {
    const filtered = filterExpedition(deferredExpedition, deferredFilters);
    return filtered.asvs;
  }, [deferredExpedition, deferredFilters]);

  const getLocationTaxaMatrix = useCallback(
    (measure: 'abundance' | 'occurrence' | 'normalized' | 'asv_count' = 'abundance', topN: number = 8) => {
      return computeLocationTaxaMatrix(deferredExpedition, deferredFilters, measure, topN);
    },
    [deferredExpedition, deferredFilters]
  );

  const getBetaDiversity = useCallback(() => {
    return computeBetaDiversity(deferredExpedition, deferredFilters);
  }, [deferredExpedition, deferredFilters]);

  const getGammaDiversity = useCallback(() => {
    return computeGammaDiversity(deferredExpedition, deferredFilters);
  }, [deferredExpedition, deferredFilters]);

  const getTaxonomyRollup = useCallback(
    (rank?: TaxonomicRank) => {
      return computeTaxonomyRollup(deferredExpedition, deferredFilters, rank || deferredFilters.taxonomicRank);
    },
    [deferredExpedition, deferredFilters]
  );

  const value: AnalysisContextType = useMemo(() => ({
    expedition,
    filters,
    theme,
    activeDrawer,
    selectedSiteId,
    selectedAsvId,
    selectedClusterId,
    kpis,
    alphaDiversity,
    siteProfiles,
    filteredAsvs,
    repositoryMode: getRepository().mode,
    setExpedition,
    loadExpeditionById,
    deleteExpeditionById,
    updateFilter,
    resetFilters,
    setTheme,
    setActiveDrawer,
    setSelectedSiteId,
    setSelectedAsvId,
    setSelectedClusterId,
    getLocationTaxaMatrix,
    getBetaDiversity,
    getGammaDiversity,
    getTaxonomyRollup,
  }), [
    expedition, filters, theme, activeDrawer,
    selectedSiteId, selectedAsvId, selectedClusterId,
    kpis, alphaDiversity, siteProfiles, filteredAsvs,
    setExpedition, loadExpeditionById, deleteExpeditionById,
    updateFilter, resetFilters, setTheme,
    setActiveDrawer, setSelectedSiteId, setSelectedAsvId, setSelectedClusterId,
    getLocationTaxaMatrix, getBetaDiversity, getGammaDiversity, getTaxonomyRollup,
  ]);

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
};

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
}
