// ========================================================
// DEEPDRISHTI PLATE & SPECIMEN CONTAINER
// Ruled scientific instrument plate with header strip & caption
// ========================================================

import React from 'react';

interface PlateProps {
  eyebrow?: string;
  title?: string;
  meta?: React.ReactNode;
  figureCaption?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  noPadding?: boolean;
}

export const Plate: React.FC<PlateProps> = ({
  eyebrow,
  title,
  meta,
  figureCaption,
  children,
  className = '',
  action,
  noPadding = false,
}) => {
  return (
    <div
      className={`bg-paper-raised border border-rule rounded-plate flex flex-col ${className}`}
    >
      {(eyebrow || title || meta || action) && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-rule bg-paper-sunk/40">
          <div className="flex flex-col">
            {eyebrow && (
              <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint">
                {eyebrow}
              </span>
            )}
            {title && (
              <h3 className="font-serif font-medium text-[16px] text-ink leading-tight">
                {title}
              </h3>
            )}
          </div>
          <div className="flex items-center gap-3">
            {meta && (
              <div className="text-[12px] font-mono text-ink-muted">
                {meta}
              </div>
            )}
            {action}
          </div>
        </div>
      )}

      <div className={`flex-1 ${noPadding ? '' : 'p-4'}`}>
        {children}
      </div>

      {figureCaption && (
        <div className="px-4 py-2 border-t border-rule bg-paper-sunk/20">
          <p className="text-[12px] text-ink-faint italic font-serif leading-normal">
            {figureCaption}
          </p>
        </div>
      )}
    </div>
  );
};
