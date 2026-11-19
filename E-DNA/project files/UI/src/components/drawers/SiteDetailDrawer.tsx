// ========================================================
// DEEPDRISHTI SITE DETAIL DRAWER
// Comprehensive biological profile for a sampling station
// ========================================================

import React from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import { Drawer } from '../common/Modal';
import { KPICard } from '../common/KPICard';
import { StatusTag } from '../common/StatusTag';

export const SiteDetailDrawer: React.FC = () => {
  const { activeDrawer, setActiveDrawer, siteProfiles } = useAnalysis();

  const isOpen = activeDrawer?.type === 'site';
  const siteName = activeDrawer?.id;
  const profile = siteProfiles.find((p) => p.site === siteName);

  if (!profile) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={() => setActiveDrawer(null)}
      eyebrow="STATION PROFILE"
      title={profile.site}
      width="w-[500px]"
    >
      <div className="space-y-6">
        {/* Coordinates and Station Metadata */}
        <div className="bg-paper-sunk border border-rule rounded-plate p-3 text-[13px] font-mono space-y-1.5">
          <div className="flex justify-between">
            <span className="text-ink-faint">Latitude:</span>
            <span className="text-ink font-medium">
              {profile.latitude !== undefined ? `${profile.latitude.toFixed(4)}° N` : 'Requires metadata'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-faint">Longitude:</span>
            <span className="text-ink font-medium">
              {profile.longitude !== undefined ? `${profile.longitude.toFixed(4)}° E` : 'Requires metadata'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-faint">Sample Depths:</span>
            <span className="text-ink font-medium">
              {profile.depths.length > 0 ? profile.depths.map((d) => `${d}m`).join(', ') : 'Not available'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-faint">Replicate Samples:</span>
            <span className="text-ink font-medium">{profile.sampleIds.join(', ')}</span>
          </div>
        </div>

        {/* Quantitative Biodiversity Indicators */}
        <div className="grid grid-cols-2 gap-3">
          <KPICard
            eyebrow="Observed ASVs"
            value={profile.asvCount}
            meta={`n = ${profile.sampleIds.length} samples`}
            meaning="The number of unique, error-corrected DNA sequence variants (ASVs) recovered from this station's water samples."
            formula="ASV Count = Count of distinct genetic barcode sequences detected"
            interpretation="Higher counts indicate high genetic variation and microbial richness in the water column at this station."
          />
          <KPICard
            eyebrow="Taxa Detected"
            value={profile.taxaCount}
            meta="taxonomic breadth"
            meaning="The total number of distinct biological species or groups positively identified by our AI models at this site."
            formula="Taxa Count = Number of unique biological classifications at this station"
            interpretation="Reflects the variety of distinct living organisms coexisting at this specific GPS location and depth."
          />
          <KPICard
            eyebrow="Shannon Diversity"
            value={profile.shannon}
            unit="H'"
            meta="information index"
            meaning="Measures the community diversity and population balance at this station. Takes into account both the number of species and their relative abundances."
            formula="H' = - Sum [ (Species Share) × ln(Species Share) ]"
            interpretation="Higher values (>2.0) represent a diverse, stable community with balanced populations. Low values (<1.0) mean one dominant species comprises most of the DNA."
          />
          <KPICard
            eyebrow="Simpson Index"
            value={profile.simpson}
            unit="1 - D"
            meta="dominance weight"
            meaning="The probability (from 0 to 1) that two randomly selected DNA reads belong to completely different species."
            formula="1 - D = 1 - Sum [ (Species Share)² ]"
            interpretation="Values near 1.0 indicate high evenness and resistance to dominance. Values near 0 indicate that a single species monopolizes this sampling layer."
          />
        </div>

        {/* Total Reads */}
        <div className="border border-rule rounded-plate p-3 bg-paper flex items-center justify-between font-mono text-[12px]">
          <span className="text-ink-muted">Total Sequenced Reads:</span>
          <span className="text-ink font-semibold tabular-nums">
            {profile.totalAbundance.toLocaleString()} reads
          </span>
        </div>

        {/* Candidate Divergent Groups */}
        {profile.divergentGroupCount > 0 && (
          <div className="border border-aubergine/40 bg-aubergine/5 p-3 rounded-plate">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-mono uppercase text-aubergine font-medium">
                Divergent Sequence Groups Detected
              </span>
              <StatusTag status="potentially_divergent" />
            </div>
            <p className="text-[12px] text-ink-muted font-sans">
              {profile.divergentGroupCount} candidate divergent ASV(s) identified at this station exhibiting &gt;12% divergence from known reference barcodes.
            </p>
          </div>
        )}

        {/* Dominant Detected Groups */}
        <div>
          <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-faint block mb-2">
            Dominant Detected Taxonomic Groups
          </span>
          <div className="border border-rule rounded-plate overflow-hidden">
            <table className="w-full text-left text-[12px] font-mono">
              <thead className="bg-paper-sunk border-b border-rule">
                <tr>
                  <th className="px-3 py-1.5 text-ink-muted font-normal">Taxon</th>
                  <th className="px-3 py-1.5 text-ink-muted font-normal text-right">Relative Abundance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule bg-paper-raised">
                {profile.dominantTaxa.map((item, idx) => (
                  <tr key={idx} className="hover:bg-paper-sunk/40">
                    <td className="px-3 py-1 text-ink">{item.taxon}</td>
                    <td className="px-3 py-1 text-right text-ink font-medium tabular-nums">
                      {item.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
