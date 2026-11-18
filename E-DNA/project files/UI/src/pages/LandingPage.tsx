// ========================================================
// DEEPDRISHTI COMMON LANDING PAGE
// Abyss-ink surface with procedurally generated bathymetric contours,
// graticule ticks, and dual operational role cards (Researcher & Captain)
// ========================================================

import React from 'react';
import { BrandMark } from '../components/common/BrandMark';
import { Dna, Compass, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onEnterResearcher: () => void;
  onEnterSurveillance: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterResearcher, onEnterSurveillance }) => {
  return (
    <div className="relative min-h-screen bg-[#0A1218] text-[#E9E6DC] flex flex-col justify-between overflow-hidden select-none">
      {/* Procedurally generated bathymetric contour background lines (8-12% opacity) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none stroke-[#7FB2C9]/10 fill-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M-100,200 C300,100 600,400 1200,250 S1600,100 2000,300" strokeWidth="1" />
        <path d="M-100,320 C250,220 700,520 1150,380 S1650,220 2000,420" strokeWidth="1" strokeDasharray="4 4" />
        <path d="M-100,440 C350,350 650,650 1100,510 S1550,350 2000,540" strokeWidth="1" />
        <path d="M-100,560 C400,480 800,780 1250,640 S1700,480 2000,680" strokeWidth="1" />
        <path d="M-100,680 C320,600 750,900 1300,770 S1800,600 2000,800" strokeWidth="1" strokeDasharray="6 3" />
        
        {/* Subtle graticule grid */}
        <line x1="20%" y1="0" x2="20%" y2="100%" stroke="rgba(200,220,230,0.05)" strokeWidth="0.8" />
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(200,220,230,0.05)" strokeWidth="0.8" />
        <line x1="80%" y1="0" x2="80%" y2="100%" stroke="rgba(200,220,230,0.05)" strokeWidth="0.8" />
        <line x1="0" y1="33%" x2="100%" y2="33%" stroke="rgba(200,220,230,0.05)" strokeWidth="0.8" />
        <line x1="0" y1="66%" x2="100%" y2="66%" stroke="rgba(200,220,230,0.05)" strokeWidth="0.8" />
      </svg>

      {/* Frame Graticule Degree Ticks */}
      <div className="absolute top-4 left-6 text-[10px] font-mono text-[#7FB2C9]/60 tracking-wider">
        GRID REF: 18°55′N 72°49′E • DATUM: WGS-84 • CHART BATHYMETRY
      </div>
      <div className="absolute top-4 right-6 text-[10px] font-mono text-[#7FB2C9]/60 tracking-wider">
        SYS.REV: 2.6.4 / OPERATIONAL
      </div>

      {/* Top Header Strip */}
      <header className="px-8 pt-12 pb-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <BrandMark size={28} inverted={true} />
          <span className="font-serif font-bold text-[18px] tracking-[0.15em] uppercase text-[#E9E6DC]">
            DEEPDRISHTI
          </span>
        </div>
        <div className="text-[11px] font-mono text-[#7FB2C9]/70 tracking-widest uppercase">
          Marine Monitoring Platform
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-8 py-12 flex-1 flex flex-col justify-center z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Brand Statement */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-control border border-[#7FB2C9]/20 bg-[#101B24] text-[11px] font-mono tracking-widest uppercase text-[#7FB2C9]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7FB2C9]" />
              Hydrographic Intelligence System
            </div>

            <h1 className="font-serif text-[42px] sm:text-[50px] font-normal tracking-tight text-[#E9E6DC] leading-[1.12]">
              DEEPDRISHTI
            </h1>

            <p className="font-serif italic text-[22px] sm:text-[24px] text-[#7FB2C9] leading-snug">
              “Seeing the ocean beyond what the eye can see.”
            </p>

            <p className="text-[14px] text-[#A2B0BA] font-sans leading-relaxed max-w-lg">
              DeepDrishti lets us understand what is happening beneath the ocean surface through biological and visual evidence. An integrated marine intelligence platform for biodiversity discovery and underwater observation.
            </p>
          </div>

          {/* Right Column: Two Role Selection Cards */}
          <div className="lg:col-span-6 flex flex-col gap-5">
            {/* CARD 1: RESEARCHER */}
            <div className="bg-[#101B24] border border-[#233440] hover:border-[#7FB2C9] rounded-plate p-6 transition-all duration-200 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-control bg-[#17252F] border border-[#233440] text-[#7FB2C9]">
                    <Dna size={22} strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#3F7D5A] border border-[#3F7D5A]/40 bg-[#3F7D5A]/10 px-2 py-0.5 rounded-control">
                    Active Module
                  </span>
                </div>

                <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#7FB2C9]/80 block mb-1">
                  Module 01 • Biological Evidence
                </span>
                <h2 className="font-serif text-[22px] font-medium text-[#E9E6DC] mb-2">
                  eDNA Biodiversity Intelligence
                </h2>
                <p className="text-[13px] text-[#A2B0BA] leading-relaxed mb-6 font-sans">
                  Discover and analyze hidden marine biodiversity through environmental DNA. Process Amplicon Sequence Variants (ASVs), evaluate community turnover, and detect divergent sequence lineages.
                </p>
              </div>

              <button
                type="button"
                onClick={onEnterResearcher}
                className="w-full py-2.5 px-4 bg-[#1F5A7A] hover:bg-[#256C91] text-[#E9E6DC] font-mono text-[13px] tracking-wider uppercase rounded-control transition-colors flex items-center justify-center gap-2 group-hover:bg-[#7FB2C9] group-hover:text-[#0A1218]"
              >
                <span>Enter as Researcher</span>
                <ArrowRight size={15} />
              </button>
            </div>

            {/* CARD 2: UNDERWATER SURVEILLANCE & RECONNAISSANCE */}
            <div className="bg-[#101B24] border border-[#233440] hover:border-[#38BDF8] rounded-plate p-6 transition-all duration-200 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-control bg-[#17252F] border border-[#233440] text-[#38BDF8]">
                    <Compass size={22} strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#38BDF8] border border-[#38BDF8]/40 bg-[#38BDF8]/10 px-2 py-0.5 rounded-control">
                    Active Module
                  </span>
                </div>

                <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#38BDF8]/80 block mb-1">
                  Module 02 • Physical Surveillance & Threats
                </span>
                <h2 className="font-serif text-[22px] font-medium text-[#E9E6DC] mb-2">
                  Underwater Surveillance
                </h2>
                <p className="text-[13px] text-[#A2B0BA] leading-relaxed mb-6 font-sans">
                  Tactical marine monitoring station with real-time YOLOv8 threat detection (mines, submersibles, divers), MiDaS depth telemetry, and FUNIE-GAN optical enhancement.
                </p>
              </div>

              <button
                type="button"
                onClick={onEnterSurveillance}
                className="w-full py-2.5 px-4 bg-[#0E4A68] hover:bg-[#156085] text-[#E9E6DC] font-mono text-[13px] tracking-wider uppercase rounded-control transition-colors flex items-center justify-center gap-2 group-hover:bg-[#38BDF8] group-hover:text-[#0A1218]"
              >
                <span>Enter Surveillance Deck</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Footer Frame */}
      <footer className="px-8 py-6 border-t border-[#17252F] flex flex-wrap items-center justify-between text-[11px] font-mono text-[#677580] z-10">
        <div>
          DEEPDRISHTI OCEANOGRAPHIC SYSTEMS • MARINE BIODIVERSITY WORKSTATION
        </div>
        <div className="flex items-center gap-6">
          <span>COORDINATES: ARABIAN SEA & INDIAN OCEAN BASIN</span>
          <span>STATION SURVEY DECK</span>
        </div>
      </footer>
    </div>
  );
};
