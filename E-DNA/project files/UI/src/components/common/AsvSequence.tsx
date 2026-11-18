// ========================================================
// DEEPDRISHTI ASV SEQUENCE COMPONENT
// Colorblind-safe mono nucleotide sequence with copy support
// ========================================================

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface AsvSequenceProps {
  sequence: string;
  truncateLength?: number;
  showCopy?: boolean;
  className?: string;
}

export const AsvSequence: React.FC<AsvSequenceProps> = ({
  sequence,
  truncateLength,
  showCopy = false,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const displaySeq = truncateLength ? sequence.slice(0, truncateLength) : sequence;
  const isTruncated = truncateLength && sequence.length > truncateLength;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(sequence);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const renderNucleotides = (str: string) => {
    return str.split('').map((char, idx) => {
      const upper = char.toUpperCase();
      let colorClass = 'text-ink-faint';
      if (upper === 'A') colorClass = 'text-[#2C6E9E] font-medium';
      else if (upper === 'C') colorClass = 'text-[#2F8F7A] font-medium';
      else if (upper === 'G') colorClass = 'text-[#D08A2E] font-medium';
      else if (upper === 'T') colorClass = 'text-[#C2542D] font-medium';

      return (
        <span key={idx} className={colorClass}>
          {upper}
        </span>
      );
    });
  };

  return (
    <div className={`inline-flex items-center gap-2 font-mono text-[12px] tracking-wider select-all ${className}`}>
      <span className="break-all font-mono">
        {renderNucleotides(displaySeq)}
        {isTruncated && <span className="text-ink-faint">… ({sequence.length} bp)</span>}
      </span>
      {showCopy && (
        <button
          type="button"
          onClick={handleCopy}
          className="p-1 rounded-control hover:bg-paper-sunk text-ink-muted hover:text-ink transition-colors flex-shrink-0"
          title="Copy full nucleotide sequence"
        >
          {copied ? <Check size={14} className="text-biological" /> : <Copy size={14} />}
        </button>
      )}
    </div>
  );
};
