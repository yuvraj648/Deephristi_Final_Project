// ========================================================
// DEEPDRISHTI BRAND MARK & DEMO DATA BANNER
// Minimalist nautical geometric eye contour mark
// ========================================================

import React from 'react';

export const BrandMark: React.FC<{ size?: number; className?: string; inverted?: boolean }> = ({
  size = 22,
  className = '',
  inverted = false,
}) => {
  const strokeColor = inverted ? 'var(--abyss-accent)' : 'var(--survey)';
  const centerColor = inverted ? 'var(--abyss-text)' : 'var(--ink)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="DeepDrishti Logo"
    >
      {/* Outer bathymetric contour arc */}
      <path
        d="M2 12C5 6.5 19 6.5 22 12C19 17.5 5 17.5 2 12Z"
        stroke={strokeColor}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Middle contour ring */}
      <ellipse
        cx="12"
        cy="12"
        rx="5.5"
        ry="3.5"
        stroke={strokeColor}
        strokeWidth="1.1"
        strokeDasharray="2.5 1.5"
      />
      {/* Center pupil / core observation point */}
      <circle cx="12" cy="12" r="2" fill={centerColor} />
    </svg>
  );
};

export const DemoBanner: React.FC<{ provenance?: 'demo' | 'uploaded' }> = ({ provenance = 'demo' }) => {
  if (provenance === 'uploaded') {
    return (
      <aside
        aria-label="Uploaded Dataset Notice"
        className="w-full bg-survey-tint/60 border-b border-survey/30 py-1 px-4 text-center select-none"
      >
        <div className="flex items-center justify-center gap-2 text-[11px] font-mono tracking-wider uppercase text-survey">
          <span className="font-semibold">UPLOADED DATA</span>
          <span className="text-ink-muted">— Active expedition is derived from user-provided ASV sequencing data.</span>
        </div>
      </aside>
    );
  }

  // Never render demo data notice
  return null;
};
