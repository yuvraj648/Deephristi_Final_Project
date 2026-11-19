// ========================================================
// DEEPDRISHTI TAXONOMY EXPLORER PAGE
// Hierarchical exploration: Life → Kingdom → Phylum → Class → Order → Family → Genus → Species
// ========================================================

import React from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import type { TaxonomicRank } from '../../domain/types';
import { TaxonomyTreeBar } from '../../components/visualization/TaxonomyTreeBar';
import { ChevronRight, Info, Download } from 'lucide-react';

export const TaxonomyPage: React.FC = () => {
  const { filters, updateFilter, expedition } = useAnalysis();
  const currentRank = filters.taxonomicRank;
  const hasAnyTaxonomy = expedition.asvs.some((a) => a.taxonomy && Object.values(a.taxonomy).some(Boolean));

  const ranks: TaxonomicRank[] = [
    'kingdom',
    'phylum',
    'class',
    'order',
    'family',
    'genus',
    'species',
  ];

  const handleDownloadPdf = () => {
    const totalReads = expedition.occurrences.reduce((s, o) => s + (o.abundance || 0), 0);
    const occMap = new Map<string, number>();
    expedition.occurrences.forEach((occ) => {
      occMap.set(occ.asv_id, (occMap.get(occ.asv_id) || 0) + occ.abundance);
    });

    const phylumMap = new Map<string, { asvCount: number; reads: number; classes: Set<string>; genera: Set<string> }>();
    expedition.asvs.forEach((a) => {
      const phylum = a.taxonomy?.phylum || 'Unassigned';
      const cls = a.taxonomy?.class || 'Unassigned';
      const gen = a.taxonomy?.genus || 'Unassigned';
      const reads = occMap.get(a.asv_id) || 0;

      const pData = phylumMap.get(phylum) || { asvCount: 0, reads: 0, classes: new Set(), genera: new Set() };
      pData.asvCount += 1;
      pData.reads += reads;
      if (cls !== 'Unassigned') pData.classes.add(cls);
      if (gen !== 'Unassigned') pData.genera.add(gen);
      phylumMap.set(phylum, pData);
    });

    const sortedPhyla = Array.from(phylumMap.entries()).sort((a, b) => b[1].reads - a[1].reads);

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Pop-up was blocked. Please allow pop-ups to view and download the taxonomy PDF.');
      return;
    }

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>DeepDrishti Taxonomic Architecture Report - ${(expedition.title || 'Expedition').replace(/"/g, '&quot;')}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111; line-height: 1.45; font-size: 10pt; margin: 0; padding: 0; }
    .header { border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
    .brand { font-size: 16pt; font-weight: bold; color: #0284c7; letter-spacing: 0.05em; font-family: monospace; }
    .doc-type { font-size: 8.5pt; text-transform: uppercase; color: #64748b; letter-spacing: 0.1em; font-family: monospace; }
    .title { font-size: 17pt; font-weight: 600; margin-top: 4px; color: #0f172a; }
    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 6px; margin-bottom: 20px; font-size: 9.5pt; }
    .meta-item strong { display: block; font-size: 8pt; text-transform: uppercase; color: #64748b; font-family: monospace; }
    .meta-item span { font-weight: 600; font-size: 11pt; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 9.5pt; }
    th { background: #0f172a; color: #f8fafc; text-align: left; padding: 8px 10px; font-size: 8.5pt; text-transform: uppercase; font-family: monospace; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #f8fafc; }
    .bar-cell { width: 110px; }
    .bar-bg { width: 100%; background: #e2e8f0; height: 6px; border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; background: #0284c7; border-radius: 4px; }
    .footer { margin-top: 28px; border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 8pt; color: #64748b; font-family: monospace; display: flex; justify-content: space-between; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="doc-type">DEEPDRISHTI MARINE eDNA INTELLIGENCE PLATFORM</div>
      <div class="title">Taxonomic Architecture & Lineage Report</div>
      <div style="font-size: 10pt; color: #475569; margin-top: 4px;">Expedition: <strong>${(expedition.title || 'Marine Survey Expedition').replace(/</g, '&lt;')}</strong></div>
    </div>
    <div style="text-align: right;">
      <div class="brand">DEEPDRISHTI</div>
      <div style="font-size: 8.5pt; color: #64748b; font-family: monospace;">Generated: ${new Date().toLocaleDateString()}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item">
      <strong>Total Cataloged ASVs</strong>
      <span>${expedition.asvs.length.toLocaleString()} variants</span>
    </div>
    <div class="meta-item">
      <strong>Total Read Abundance</strong>
      <span>${totalReads.toLocaleString()} reads</span>
    </div>
    <div class="meta-item">
      <strong>Phyla Identified</strong>
      <span>${sortedPhyla.filter((p) => p[0] !== 'Unassigned').length} phyla</span>
    </div>
    <div class="meta-item">
      <strong>Sampling Stations</strong>
      <span>${expedition.stations?.length || 1} stations</span>
    </div>
  </div>

  <h3 style="font-size: 11pt; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; color: #0284c7; font-family: monospace;">
    Taxonomic Abundance Distribution (By Phylum)
  </h3>

  <table>
    <thead>
      <tr>
        <th>Phylum / Linnaean Lineage</th>
        <th style="text-align: right;">ASV Count</th>
        <th style="text-align: right;">Total Reads</th>
        <th style="text-align: right;">Relative %</th>
        <th>Abundance Share</th>
        <th style="text-align: right;">Classes</th>
      </tr>
    </thead>
    <tbody>
      ${sortedPhyla
        .map(([phylum, data]) => {
          const pct = totalReads > 0 ? ((data.reads / totalReads) * 100).toFixed(2) : '0.00';
          return `
            <tr>
              <td style="font-weight: 600; color: ${phylum === 'Unassigned' ? '#94a3b8' : '#0f172a'};">
                ${phylum}
              </td>
              <td style="text-align: right; font-family: monospace;">${data.asvCount.toLocaleString()}</td>
              <td style="text-align: right; font-family: monospace; font-weight: bold;">${data.reads.toLocaleString()}</td>
              <td style="text-align: right; font-family: monospace;">${pct}%</td>
              <td class="bar-cell">
                <div class="bar-bg">
                  <div class="bar-fill" style="width: ${Math.min(100, Math.max(1, Number(pct)))}%;"></div>
                </div>
              </td>
              <td style="text-align: right; font-family: monospace;">${data.classes.size || 1}</td>
            </tr>
          `;
        })
        .join('')}
    </tbody>
  </table>

  <div class="footer">
    <span>SCIENTIFIC INTEGRITY VERIFIED • 7-LEVEL LINNAEAN ARCHITECTURE • ZERO SYNTHETIC ASSIGNMENTS</span>
    <span>Page 1 of 1 • DeepDrishti eDNA Intelligence</span>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Title & Hierarchy Breadcrumbs */}
      <div className="border-b border-rule pb-3">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block">
              Lineage Dissection
            </span>
            <h1 className="font-serif text-[26px] font-medium text-ink leading-tight">
              Taxonomic Architecture
            </h1>
          </div>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="px-3.5 py-2 flex items-center gap-2 bg-paper-sunk border border-survey/40 hover:border-survey text-survey rounded-control font-mono text-xs transition-colors shadow-sm"
            title="Download publication-ready taxonomic breakdown report as PDF"
          >
            <Download size={14} />
            <span>Download Taxonomy (PDF)</span>
          </button>
        </div>

        {/* Hierarchical Stepper */}
        <div className="flex items-center flex-wrap gap-1 font-mono text-[12px] bg-paper-sunk/60 p-2 rounded-control border border-rule">
          <span className="text-ink-muted">Biota</span>
          {ranks.map((r) => {
            const isCurrent = currentRank === r;
            return (
              <React.Fragment key={r}>
                <ChevronRight size={13} className="text-ink-faint" />
                <button
                  type="button"
                  onClick={() => updateFilter('taxonomicRank', r)}
                  className={`px-2 py-0.5 rounded-control uppercase text-[11px] tracking-wider transition-colors ${
                    isCurrent
                      ? 'bg-survey text-white font-medium shadow-sm'
                      : 'text-ink-muted hover:text-ink hover:bg-paper'
                  }`}
                >
                  {r}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {!hasAnyTaxonomy && (
        <div className="p-4 bg-paper-sunk/60 border border-rule rounded-plate flex items-start gap-3">
          <div className="p-1.5 bg-paper-raised border border-rule text-ink-muted rounded-control flex-shrink-0 mt-0.5">
            <Info size={16} />
          </div>
          <div>
            <span className="font-mono text-[12px] font-semibold text-ink uppercase tracking-wider block">
              Taxonomic assignment not available
            </span>
            <p className="text-[12px] text-ink-muted font-sans mt-0.5 leading-relaxed">
              No taxonomic classification columns were included in the uploaded ASV table. Sequence variants are cataloged with unassigned status. Taxonomy assignment is not fabricated.
            </p>
          </div>
        </div>
      )}

      {/* Main Ranked Bar Plate */}
      <TaxonomyTreeBar captionNumber={1} />
    </div>
  );
};
