// ========================================================
// DEEPDRISHTI WORKSPACE HEADER
// Persistent top navigation with brand mark, expedition info, & theme switch
// ========================================================

import React from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import { BrandMark } from '../common/BrandMark';
import { StatusTag } from '../common/StatusTag';
import { Moon, Sun, ArrowLeft, Compass } from 'lucide-react';

interface HeaderProps {
  currentView: string;
  onNavigate?: (view: string) => void;
  onExitWorkspace?: () => void;
  exitLabel?: string;
  headerContext?: {
    title: string;
    subtitle: string;
  };
  showReportButton?: boolean;
  onOpenSurveillance?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  onExitWorkspace,
  exitLabel = 'Expeditions',
  headerContext,
  showReportButton = true,
  onOpenSurveillance,
}) => {
  const { expedition, kpis, theme, setTheme } = useAnalysis();

  const toggleTheme = () => {
    setTheme(theme === 'paper' ? 'dark-abyss' : 'paper');
  };

  const depthRangeStr =
    kpis.depthMin !== null && kpis.depthMax !== null
      ? `${kpis.depthMin}m – ${kpis.depthMax}m`
      : 'Depth unrecorded';

  return (
    <header className="bg-paper-raised border-b border-rule px-6 py-2.5 flex items-center justify-between gap-4 z-20">
      {/* Left: Brand Mark + Back Action */}
      <div className="flex items-center gap-4">
        {onExitWorkspace && !headerContext ? (
          <button
            type="button"
            onClick={onExitWorkspace}
            className="flex items-center gap-1.5 text-ink-muted hover:text-ink text-[12px] font-mono transition-colors border-r border-rule pr-4"
            title="Return to Expedition Selection"
          >
            <ArrowLeft size={15} />
            <span>{exitLabel}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 border-r border-rule pr-4">
            <BrandMark size={22} />
            <span className="font-serif font-semibold text-[15px] tracking-tight text-ink">
              DEEPDRISHTI
            </span>
          </div>
        )}

        {headerContext && onExitWorkspace && (
          <button
            type="button"
            onClick={onExitWorkspace}
            className="flex items-center gap-1.5 text-ink-muted hover:text-ink text-[12px] font-mono transition-colors border-r border-rule pr-4"
            title="Return to Research Home"
          >
            <ArrowLeft size={15} />
            <span>{exitLabel}</span>
          </button>
        )}

        {headerContext ? (
          <div className="flex min-w-0 flex-col">
            <h2 className="truncate font-medium text-[16px] text-ink leading-tight">
              {headerContext.title}
            </h2>
            <div className="truncate text-[11px] text-ink-faint">{headerContext.subtitle}</div>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-medium text-[16px] text-ink leading-tight">
                {expedition.name}
              </h2>
              {expedition.provenance === 'uploaded' && <StatusTag status="uploaded" />}
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-ink-faint">
              <span>{expedition.region}</span>
              <span>•</span>
              <span>{kpis.sampleCount} Samples</span>
              <span>•</span>
              <span>{kpis.siteCount} Stations</span>
              <span>•</span>
              <span>{depthRangeStr}</span>
            </div>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Workspace Theme Toggle (Paper / Dark Abyss) */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-2 py-1 rounded-control border border-rule hover:bg-paper-sunk text-ink-muted hover:text-ink text-[11px] font-mono transition-colors"
          title={`Switch to ${theme === 'paper' ? 'Dark Abyss' : 'Chart Paper'} surface`}
        >
          {theme === 'paper' ? (
            <>
              <Moon size={13} />
              <span>Abyss Surface</span>
            </>
          ) : (
            <>
              <Sun size={13} />
              <span>Paper Surface</span>
            </>
          )}
        </button>

        {/* Quick Report Link */}
        {showReportButton && (
          <button
            type="button"
            onClick={() => onNavigate?.('report')}
            className={`px-2.5 py-1 text-[12px] font-mono uppercase tracking-wider rounded-control border transition-colors ${
              currentView === 'report'
                ? 'bg-survey text-white border-survey'
                : 'border-rule text-ink hover:bg-paper-sunk'
            }`}
          >
            Report
          </button>
        )}

        {/* Underwater Surveillance Module 02 Link */}
        {onOpenSurveillance && (
          <button
            type="button"
            onClick={onOpenSurveillance}
            className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-mono uppercase tracking-wider rounded-control border border-[#0284C7]/40 bg-[#0284C7]/10 hover:bg-[#0284C7]/20 text-[#0284C7] dark:text-[#38BDF8] transition-colors"
            title="Switch to Module 02: Underwater Physical Surveillance Deck"
          >
            <Compass size={13} />
            <span>Surveillance</span>
          </button>
        )}
      </div>
    </header>
  );
};
