// ========================================================
// DEEPDRISHTI MODAL & SLIDE-OVER DRAWER
// Calibrated floating panel with soft shadow & crisp ruled frame
// ========================================================

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
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
  width = 'w-[480px]',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 top-14 z-[9990] flex justify-end">
      {/* Backdrop that dims and allows click-outside to close */}
      <div
        className="fixed inset-0 top-14 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel positioned strictly below header */}
      <div
        className={`relative z-10 ${width} max-w-full h-full bg-[#070D18] border-l border-rule shadow-2xl flex flex-col font-sans`}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-rule bg-[#050A14] flex-shrink-0">
          <div>
            {eyebrow && (
              <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-sky-400 block font-semibold">
                {eyebrow}
              </span>
            )}
            <h3 className="font-serif font-medium text-[18px] text-white">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-control hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 text-ink">{children}</div>
      </div>
    </div>,
    document.body
  );
};
