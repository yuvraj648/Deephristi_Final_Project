// ========================================================
// DEEPDRISHTI KPI READOUT CARD
// Plain scientific figure readout: eyebrow, mono number, unit line, thin rule
// ========================================================

import React from 'react';

interface KPICardProps {
  eyebrow: string;
  value: string | number | null;
  unit?: string;
  meta?: string;
  className?: string;
  divergent?: boolean;
  description?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  eyebrow,
  value,
  unit,
  meta,
  className = '',
  divergent = false,
  description,
}) => {
  const displayVal = value !== null && value !== undefined ? (
    typeof value === 'number' ? value.toLocaleString() : value
  ) : (
    'N/A'
  );

  return (
    <div className={`group relative flex flex-col py-3 px-4 bg-paper-raised border border-rule hover:border-survey/60 transition-all rounded-plate ${description ? 'cursor-help' : ''} ${className}`}>
      {/* Floating Hover Description Tooltip */}
      {description && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-[#071320] border border-survey/40 text-white rounded-plate shadow-floating opacity-0 pointer-events-none group-hover:opacity-100 transition-all z-30 text-left font-sans text-[11px] leading-snug">
          <span className="font-mono text-[10px] text-survey font-semibold uppercase block mb-1">
            {eyebrow}
          </span>
          <p className="text-neutral-200">{description}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#071320]" />
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint">
          {eyebrow}
        </span>
        {description && (
          <span className="text-[10px] font-mono text-ink-faint group-hover:text-survey transition-colors">
            ⓘ
          </span>
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
