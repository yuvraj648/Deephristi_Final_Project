// ========================================================
// DEEPDRISHTI EMPTY STATE COMPONENT
// Line-drawn bathymetric contour illustration & declarative text
// ========================================================

import React from 'react';

interface EmptyStateProps {
  title?: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No observations available',
  description,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-paper-raised border border-rule rounded-plate ${className}`}
    >
      {/* Restrained line-drawn bathymetric contour icon */}
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-rule-strong mb-4"
      >
        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
        <ellipse cx="32" cy="32" rx="20" ry="14" stroke="currentColor" strokeWidth="1" />
        <ellipse cx="32" cy="32" rx="12" ry="7" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
        <circle cx="32" cy="32" r="3" fill="var(--ink-faint)" />
        <line x1="32" y1="4" x2="32" y2="8" stroke="currentColor" strokeWidth="1" />
        <line x1="32" y1="56" x2="32" y2="60" stroke="currentColor" strokeWidth="1" />
        <line x1="4" y1="32" x2="8" y2="32" stroke="currentColor" strokeWidth="1" />
        <line x1="56" y1="32" x2="60" y2="32" stroke="currentColor" strokeWidth="1" />
      </svg>

      <h4 className="font-serif font-medium text-[16px] text-ink mb-1">
        {title}
      </h4>
      <p className="text-[13px] text-ink-muted max-w-md font-sans leading-relaxed mb-4">
        {description}
      </p>

      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-3 py-1.5 bg-survey hover:bg-survey-hover text-white text-[12px] font-mono uppercase tracking-wider rounded-control transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
