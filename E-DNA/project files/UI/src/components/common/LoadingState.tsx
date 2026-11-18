// ========================================================
// DEEPDRISHTI SKELETON & PIPELINE LOADING STATE
// Determinate progress indicator & paper-sunk skeleton blocks
// ========================================================

import React from 'react';

export const SkeletonPlate: React.FC<{ rows?: number; height?: string }> = ({
  rows = 4,
  height = 'h-32',
}) => {
  return (
    <div className="bg-paper-raised border border-rule rounded-plate p-4 animate-pulse">
      <div className="h-4 bg-paper-sunk rounded-control w-1/4 mb-4" />
      <div className={`w-full bg-paper-sunk rounded-control ${height} mb-3`} />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-3 bg-paper-sunk rounded-control w-full" />
        ))}
      </div>
    </div>
  );
};

export const BasePairDivider: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center justify-center gap-1 text-ink-faint py-3 ${className}`}>
      <span className="font-mono text-[11px] tracking-widest select-none">
        |───[A-T]───|───[C-G]───|───[G-C]───|───[T-A]───|
      </span>
    </div>
  );
};

export const DeterminateProgressBar: React.FC<{
  currentStep: number;
  totalSteps: number;
  label?: string;
  className?: string;
}> = ({ currentStep, totalSteps, label, className = '' }) => {
  const percent = Math.min(100, Math.round((currentStep / totalSteps) * 100));

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      <div className="flex justify-between items-center text-[11px] font-mono text-ink-muted">
        <span>{label || 'Analysis Pipeline Execution'}</span>
        <span>
          STEP {currentStep} OF {totalSteps} ({percent}%)
        </span>
      </div>
      <div className="w-full h-1.5 bg-paper-sunk rounded-control overflow-hidden border border-rule">
        <div
          className="h-full bg-survey transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
