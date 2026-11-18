// ========================================================
// DEEPDRISHTI MODAL & SLIDE-OVER DRAWER
// Calibrated floating panel with soft shadow & crisp ruled frame
// ========================================================

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  eyebrow,
  children,
  width = 'w-[440px]',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/30 transition-opacity backdrop-none"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        className={`relative z-10 ${width} max-w-full h-full bg-paper-raised border-l border-rule shadow-floating flex flex-col`}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-rule bg-paper-sunk/40">
          <div>
            {eyebrow && (
              <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block">
                {eyebrow}
              </span>
            )}
            <h3 className="font-serif font-medium text-[18px] text-ink">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-control hover:bg-paper-sunk text-ink-muted hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
};
