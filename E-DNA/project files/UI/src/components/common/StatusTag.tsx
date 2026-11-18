// ========================================================
// DEEPDRISHTI STATUS TAG
// Specimen-standard rectangular tags with hatch patterns
// ========================================================

import React from 'react';
import type { AssignmentStatus, NoveltyStatus } from '../../domain/types';

interface StatusTagProps {
  status?: AssignmentStatus | NoveltyStatus | 'demo' | 'uploaded' | 'ready' | 'planned' | 'divergent';
  label?: string;
  className?: string;
}

export const StatusTag: React.FC<StatusTagProps> = ({ status, label, className = '' }) => {
  // Completely suppress any demo data tags
  if (status === 'demo' && (!label || label.toLowerCase().includes('demo'))) {
    return null;
  }

  let displayLabel = label;
  let styleClasses = 'bg-paper-sunk text-ink-muted border-rule';

  if (!displayLabel) {
    if (status === 'assigned') displayLabel = 'ASSIGNED';
    else if (status === 'low_confidence') displayLabel = 'LOW CONFIDENCE';
    else if (status === 'unassigned') displayLabel = 'UNASSIGNED';
    else if (status === 'potentially_divergent' || status === 'divergent') displayLabel = 'DIVERGENT CANDIDATE';
    else if (status === 'known') displayLabel = 'KNOWN TAXON';
    else if (status === 'not_evaluated') displayLabel = 'NOT EVALUATED';
    else if (status === 'uploaded') displayLabel = 'UPLOADED';
    else if (status === 'planned') displayLabel = 'PLANNED / INACTIVE';
    else displayLabel = String(status || '').toUpperCase();
  }

  if (status === 'assigned') {
    styleClasses = 'bg-biological/10 text-biological border-biological/40';
  } else if (status === 'low_confidence') {
    styleClasses = 'bg-warning/10 text-warning border-warning/40 hatch-dotted';
  } else if (status === 'unassigned') {
    styleClasses = 'bg-[#C9C6BA]/20 text-ink-muted border-[#B9B4A3] hatch-diagonal';
  } else if (status === 'potentially_divergent' || status === 'divergent') {
    styleClasses = 'bg-aubergine/15 text-aubergine border-aubergine/50 hatch-cross font-medium';
  } else if (status === 'demo') {
    styleClasses = 'bg-warning/15 text-warning border-warning/50 hatch-amber';
  } else if (status === 'uploaded') {
    styleClasses = 'bg-survey/10 text-survey border-survey/40';
  } else if (status === 'planned') {
    styleClasses = 'bg-paper-sunk text-ink-faint border-rule italic';
  }

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-control text-[10px] font-mono tracking-wider uppercase border leading-none select-none ${styleClasses} ${className}`}
    >
      {displayLabel}
    </span>
  );
};
