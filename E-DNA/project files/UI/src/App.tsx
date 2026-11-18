// ========================================================
// DEEPDRISHTI APPLICATION ROOT & ROUTING SHELL
// Manages application state machine: Landing → Auth → Home → Workflow → Scoped Workspace
// ========================================================

import React, { useState } from 'react';
import { AnalysisProvider, useAnalysis } from './context/AnalysisContext';
import { LandingPage } from './pages/LandingPage';
import { ResearcherLogin } from './pages/ResearcherLogin';
import { ResearcherHome } from './pages/ResearcherHome';
import { NewExpeditionForm } from './pages/workflow/NewExpeditionForm';
import { DataSourceSelect } from './pages/workflow/DataSourceSelect';
import { DataConfiguration } from './pages/workflow/DataConfiguration';
import { ProcessingPipeline } from './pages/workflow/ProcessingPipeline';
import { OverviewPage } from './pages/analysis/OverviewPage';
import { AsvExplorerPage } from './pages/analysis/AsvExplorerPage';
import { TaxonomyPage } from './pages/analysis/TaxonomyPage';
import { BiodiversityPage } from './pages/analysis/BiodiversityPage';
import { MapPage } from './pages/analysis/MapPage';
import { CommunityPage } from './pages/analysis/CommunityPage';
import { NoveltyPage } from './pages/analysis/NoveltyPage';
import { AiAnalysisPage } from './pages/analysis/AiAnalysisPage';
import { ComparePage } from './pages/analysis/ComparePage';
import { ReportPage } from './pages/analysis/ReportPage';
import { SettingsPage } from './pages/analysis/SettingsPage';
import { SurveillanceStationPage } from './pages/SurveillanceStationPage';

import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import type { WorkspaceView } from './components/layout/Sidebar';
import { FilterBar } from './components/common/FilterBar';
import { AsvDetailDrawer } from './components/drawers/AsvDetailDrawer';
import { SiteDetailDrawer } from './components/drawers/SiteDetailDrawer';
import { ClusterDetailDrawer } from './components/drawers/ClusterDetailDrawer';
import type { Sample, ASV, Occurrence, Expedition } from './domain/types';
import { createExpeditionFromUploads } from './services/dataService';

type AppScreen =
  | 'landing'
  | 'auth'
  | 'home'
  | 'new_expedition'
  | 'data_source'
  | 'data_config'
  | 'processing'
  | 'workspace'
  | 'surveillance';

const MainAppContent: React.FC = () => {
  const { expedition, setExpedition, loadExpeditionById } = useAnalysis();

  const [screen, setScreen] = useState<AppScreen>('landing');
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('overview');
  const [researcherUser, setResearcherUser] = useState<string>('Dr. M. S. Swaminathan Group');

  // Staged creation workflow state
  const [stagedExpeditionMeta, setStagedExpeditionMeta] = useState<{
    name: string;
    researcher: string;
    region: string;
    description: string;
    date: string;
    initialSamples: Sample[];
  } | null>(null);

  const [stagedBioData, setStagedBioData] = useState<{
    fileName: string;
    metadataFileName?: string;
    asvs: ASV[];
    occurrences: Occurrence[];
    samples: Sample[];
    abundanceSampleIds?: string[];
  } | null>(null);

  const [stagedExpeditionToSave, setStagedExpeditionToSave] = useState<Expedition | null>(null);

  // Workflow Handlers
  const handleStartNewExpedition = () => {
    setScreen('new_expedition');
  };

  const handleExpeditionMetaProceed = (meta: any) => {
    setStagedExpeditionMeta(meta);
    setScreen('data_source');
  };

  const handleBioDataLoaded = (bio: any) => {
    setStagedBioData({
      fileName: bio.fileName,
      metadataFileName: bio.metadataFileName,
      asvs: bio.asvs,
      occurrences: bio.occurrences,
      samples: bio.samples,
      abundanceSampleIds: bio.abundanceSampleIds,
    });
    setScreen('data_config');
  };

  const handleConfigProceed = (validated: { samples: Sample[]; asvs: ASV[]; occurrences: Occurrence[] }) => {
    if (stagedExpeditionMeta) {
      const newExp = createExpeditionFromUploads(
        stagedExpeditionMeta,
        validated.asvs,
        validated.occurrences,
        validated.samples
      );
      setStagedExpeditionToSave(newExp);
    }
    setScreen('processing');
  };

  const handleProcessingComplete = () => {
    setScreen('workspace');
    setWorkspaceView('overview');
  };

  const handleOpenExistingExpedition = async (expeditionId: string) => {
    await loadExpeditionById(expeditionId);
    setScreen('workspace');
    setWorkspaceView('overview');
  };

  // 1. Landing Page
  if (screen === 'landing') {
    return (
      <LandingPage
        onEnterResearcher={() => setScreen('auth')}
        onEnterSurveillance={() => setScreen('surveillance')}
      />
    );
  }

  // 1b. Underwater Physical Surveillance Station (Module 02)
  if (screen === 'surveillance') {
    return (
      <SurveillanceStationPage
        onBackToLanding={() => setScreen('landing')}
        onNavigateToResearcher={() => setScreen('auth')}
      />
    );
  }

  // 2. Researcher Authentication
  if (screen === 'auth') {
    return (
      <ResearcherLogin
        onLoginSuccess={(userId) => {
          if (userId) setResearcherUser(userId);
          setScreen('home');
        }}
        onBackToLanding={() => setScreen('landing')}
      />
    );
  }

  // 3. Researcher Launch Home
  if (screen === 'home') {
    return (
      <ResearcherHome
        onOpenExpedition={handleOpenExistingExpedition}
        onNewExpedition={handleStartNewExpedition}
        onLogout={() => setScreen('landing')}
        onOpenSurveillance={() => setScreen('surveillance')}
        researcherName={researcherUser}
      />
    );
  }

  // 4. Guided Workflow Steps
  if (screen === 'new_expedition') {
    return (
      <NewExpeditionForm
        onCancel={() => setScreen('home')}
        onProceed={handleExpeditionMetaProceed}
      />
    );
  }

  if (screen === 'data_source') {
    return (
      <DataSourceSelect
        onBack={() => setScreen('new_expedition')}
        onDataLoaded={handleBioDataLoaded}
        stagedInitialSamples={stagedExpeditionMeta?.initialSamples}
      />
    );
  }

  if (screen === 'data_config' && stagedBioData) {
    return (
      <DataConfiguration
        fileName={stagedBioData.fileName}
        metadataFileName={stagedBioData.metadataFileName}
        samples={stagedBioData.samples}
        asvs={stagedBioData.asvs}
        occurrences={stagedBioData.occurrences}
        abundanceSampleIds={stagedBioData.abundanceSampleIds}
        onBack={() => setScreen('data_source')}
        onProceed={handleConfigProceed}
      />
    );
  }

  if (screen === 'processing') {
    return (
      <ProcessingPipeline
        isAsvData={true}
        isDemoMode={!stagedExpeditionToSave && expedition.provenance === 'demo'}
        expeditionToSave={stagedExpeditionToSave}
        onComplete={() => {
          if (stagedExpeditionToSave) {
            setExpedition(stagedExpeditionToSave);
            setStagedExpeditionToSave(null);
          }
          handleProcessingComplete();
        }}
        onCancelOrBack={() => setScreen('data_config')}
      />
    );
  }

  // 5. Scoped Analysis Workspace
  return (
    <div className="min-h-screen bg-paper flex flex-col font-sans text-ink">
      {/* Workspace Header */}
      <Header
        currentView={workspaceView}
        onNavigate={(view) => setWorkspaceView(view as WorkspaceView)}
        onExitWorkspace={() => setScreen('home')}
        onOpenSurveillance={() => setScreen('surveillance')}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        {/* Persistent Collapsible Sidebar */}
        <Sidebar
          activeView={workspaceView}
          onNavigate={setWorkspaceView}
          onLogout={() => setScreen('landing')}
        />

        {/* Scrollable Workstation Surface */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Global Filter Bar */}
          <FilterBar />

          {/* Active Workspace Page View */}
          <main className="flex-1 p-6 max-w-7xl w-full mx-auto animate-fadeIn">
            {workspaceView === 'overview' && <OverviewPage onNavigate={setWorkspaceView} />}
            {workspaceView === 'asv_explorer' && <AsvExplorerPage />}
            {workspaceView === 'taxonomy' && <TaxonomyPage />}
            {workspaceView === 'biodiversity' && <BiodiversityPage />}
            {workspaceView === 'map' && <MapPage />}
            {workspaceView === 'community' && <CommunityPage />}
            {workspaceView === 'novelty' && <NoveltyPage />}
            {workspaceView === 'ai_analysis' && <AiAnalysisPage />}
            {workspaceView === 'compare' && <ComparePage />}
            {workspaceView === 'report' && <ReportPage />}
            {workspaceView === 'settings' && <SettingsPage onLogout={() => setScreen('landing')} />}
          </main>
        </div>
      </div>

      {/* Drawers / Detail Inspection Layers */}
      <AsvDetailDrawer />
      <SiteDetailDrawer />
      <ClusterDetailDrawer />
    </div>
  );
};

export default function App() {
  return (
    <AnalysisProvider>
      <MainAppContent />
    </AnalysisProvider>
  );
}
