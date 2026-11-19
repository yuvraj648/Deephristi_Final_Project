// ========================================================
// DEEPDRISHTI KPI READOUT CARD
// Plain scientific figure readout with interactive (i) floating tooltips
// Supports rich meaning, formula, interpretation, and hover/click states
// ========================================================

import React, { useState } from 'react';

export interface KPICardProps {
  eyebrow: string;
  value: string | number | null;
  unit?: string;
  meta?: string;
  className?: string;
  divergent?: boolean;
  description?: string;
  meaning?: string;
  formula?: string;
  interpretation?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  eyebrow,
  value,
  unit,
  meta,
  className = '',
  divergent = false,
  description,
  meaning,
  formula,
  interpretation,
}) => {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  const displayVal = value !== null && value !== undefined ? (
    typeof value === 'number' ? value.toLocaleString() : value
  ) : (
    'N/A'
  );

  const hasTooltip = !!(description || meaning || formula || interpretation);

  return (
    <div
      className={`group relative flex flex-col py-3 px-4 bg-paper-raised border border-rule hover:border-survey/60 transition-all rounded-plate ${className}`}
    >
      {/* Floating Hover & Click Tooltip */}
      {hasTooltip && (
        <div
          className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-[#050e18] border border-sky-500/40 text-white rounded-plate shadow-2xl transition-all z-50 text-left font-sans text-[11px] leading-snug space-y-1.5 ${
            isTooltipOpen
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto'
          }`}
        >
          <div className="flex items-center justify-between border-b border-rule/60 pb-1">
            <span className="font-mono text-[10px] text-sky-400 font-bold uppercase tracking-wider">
              {eyebrow}
            </span>
            {isTooltipOpen && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsTooltipOpen(false);
                }}
                className="text-[10px] text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {description && !meaning && (
            <p className="text-neutral-200 leading-relaxed">{description}</p>
          )}

          {meaning && (
            <div>
              <span className="text-sky-300 font-semibold font-mono text-[9px] uppercase tracking-wider block">
                Meaning:
              </span>
              <p className="text-neutral-200 text-[11px] leading-relaxed">{meaning}</p>
            </div>
          )}

          {formula && (
            <div className="p-1.5 bg-[#02070e] rounded border border-emerald-500/30">
              <span className="text-emerald-400 font-mono text-[9px] uppercase tracking-wider block font-semibold">
                Formula / Computation:
              </span>
              <code className="text-emerald-200 font-mono text-[10px] block pt-0.5 leading-tight">
                {formula}
              </code>
            </div>
          )}

          {interpretation && (
            <div>
              <span className="text-amber-300 font-semibold font-mono text-[9px] uppercase tracking-wider block">
                Ecological Interpretation:
              </span>
              <p className="text-neutral-300 text-[10px] leading-relaxed">{interpretation}</p>
            </div>
          )}

          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#050e18]" />
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint">
          {eyebrow}
        </span>
        {hasTooltip && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsTooltipOpen(!isTooltipOpen);
            }}
            className="text-[10px] font-mono px-1 py-0.5 rounded text-ink-faint hover:text-sky-400 hover:bg-sky-950/40 transition-colors flex items-center gap-0.5 cursor-pointer"
            title="Click to toggle info"
          >
            <span className={isTooltipOpen ? 'text-sky-400 font-bold' : ''}>ⓘ</span>
          </button>
        )}
      </div>

      <div className="flex items-baseline gap-2 mt-1">
        <span
          className={`font-mono text-[28px] font-medium tracking-tight tabular-nums ${
            divergent ? 'text-aubergine font-semibold' : 'text-ink'
          }`}
        >
          {displayVal}
        </span>
        {unit && (
          <span className="text-[12px] font-mono text-ink-muted">
            {unit}
          </span>
        )}
      </div>

      <div className="w-full h-[1px] bg-rule my-2" />
      <div className="text-[11px] font-mono text-ink-faint">
        {meta || 'derived from active dataset'}
      </div>
    </div>
  );
};
