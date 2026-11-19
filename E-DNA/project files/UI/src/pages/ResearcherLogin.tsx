// ========================================================
// DEEPDRISHTI RESEARCHER AUTHENTICATION & REGISTRATION
// Full oceanographic laboratory credential verification
// Synchronized with Supabase PostgreSQL `researchers` table
// ========================================================

import React, { useState } from 'react';
import { BrandMark } from '../components/common/BrandMark';
import {
  ArrowLeft,
  KeyRound,
  Cloud,
  HardDrive,
  Info,
  CheckCircle2,
  Building2,
  MapPin,
  User,
  ShieldCheck,
  Dna,
  Lock,
  Mail,
  BadgeAlert,
  ChevronRight,
  Eye,
  EyeOff,
  Compass,
} from 'lucide-react';
import { supabase, isSupabaseConfigured, formatSupabaseError } from '../lib/supabase';
import {
  fetchResearcherProfile,
  saveResearcherProfile,
  type ResearcherProfile,
} from '../services/researcherProfileService';

interface ResearcherLoginProps {
  onLoginSuccess: (profile: any, mode?: 'cloud' | 'local') => void;
  onBackToLanding: () => void;
}

const RESEARCH_ROLES = [
  'Principal Investigator (PI) / Lab Director',
  'Chief Oceanographer / Cruise Scientist',
  'Marine eDNA Bioinformatician',
  'Underwater Bio-Surveillance Specialist',
  'Deep-Sea Benthic Taxonomist',
  'Field Operations & Sampling Technician',
  'Hydrographic Defense & Acoustic Analyst',
  'Postdoctoral Marine Genomics Fellow',
];

const RESEARCH_FOCUSES = [
  'Marine Environmental DNA (eDNA) Metabarcoding',
  'Deep-Sea Benthic Biodiversity & Hydrothermal Vents',
  'Autonomous Underwater Vehicle (AUV) eDNA Surveillance',
  'Pelagic Fisheries Telemetry & Cryptic Species Detection',
  'Coral Reef Resilience & Microbiome Health',
  'Naval Acoustics & Biogenic Scattering Layer Surveillance',
  'Estuarine & Mangrove eDNA Biomonitoring',
];

const GENE_MARKERS = [
  '18S V9 (Marine Eukaryotes & Micro-plankton)',
  '16S V4-V5 (Marine Bacteria & Archaea)',
  '12S MiFish (Teleost & Chondrichthyes Fish)',
  'COI (Metazoan Invertebrates Barcode)',
  'rbcL / 23S (Marine Phytoplankton & Algae)',
  'ITS1 / ITS2 (Marine Fungi & Protists)',
];

const CLEARANCE_LEVELS = [
  'Level 3 - Biodiversity Surveillance & Defense Telemetry (Restricted)',
  'Level 2 - Certified Expedition Cruise Scientist',
  'Level 1 - Open Marine Academic Researcher',
];

export const ResearcherLogin: React.FC<ResearcherLoginProps> = ({
  onLoginSuccess,
  onBackToLanding,
}) => {
  const configured = isSupabaseConfigured();

  // Mode: Sign In vs Sign Up
  const [isSignUpMode, setIsSignUpMode] = useState(false);

  // Sign In / Common Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Comprehensive Registration Fields (eDNA / Marine Surveillance Portal Standard)
  const [fullName, setFullName] = useState('');
  const [labName, setLabName] = useState('');
  const [labLocation, setLabLocation] = useState('');
  const [institution, setInstitution] = useState('');
  const [roleTitle, setRoleTitle] = useState(RESEARCH_ROLES[0]);
  const [researchFocus, setResearchFocus] = useState(RESEARCH_FOCUSES[0]);
  const [targetGeneMarker, setTargetGeneMarker] = useState(GENE_MARKERS[0]);
  const [clearanceLevel, setClearanceLevel] = useState(CLEARANCE_LEVELS[0]);
  const [orcidId, setOrcidId] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Status & Feedback
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    // Basic Validation
    if (!email.trim() || !password.trim()) {
      setError('Please provide email and password.');
      return;
    }

    if (isSignUpMode) {
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please verify your password entry.');
        return;
      }
      if (password.length < 6) {
        setError('Password must contain at least 6 characters.');
        return;
      }
      if (!fullName.trim()) {
        setError('Please enter the full name of the researcher.');
        return;
      }
      if (!labName.trim()) {
        setError('Please enter the laboratory or research group name.');
        return;
      }
      if (!labLocation.trim()) {
        setError('Please enter the laboratory operating location / base port.');
        return;
      }
    }

    // ── Supabase Cloud Mode ──
    if (configured && supabase) {
      setIsLoading(true);
      try {
        if (isSignUpMode) {
          // 1. Register user with Supabase Auth including complete metadata
          const { data, error: signUpError } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                full_name: fullName.trim(),
                display_name: fullName.trim(),
                lab_name: labName.trim(),
                lab_location: labLocation.trim(),
                institution: institution.trim() || 'Oceanographic Research Agency',
                role_title: roleTitle,
                research_focus: researchFocus,
                target_gene_marker: targetGeneMarker,
                clearance_level: clearanceLevel,
                orcid_id: orcidId.trim() || null,
                contact_phone: contactPhone.trim() || null,
              },
            },
          });

          if (signUpError) throw signUpError;

          if (data.user) {
            // 2. Direct upsert into public.researchers table
            const newProfile: ResearcherProfile = {
              id: data.user.id,
              email: data.user.email || email.trim(),
              full_name: fullName.trim(),
              display_name: fullName.trim(),
              lab_name: labName.trim(),
              lab_location: labLocation.trim(),
              institution: institution.trim() || 'Oceanographic Research Agency',
              role_title: roleTitle,
              research_focus: researchFocus,
              target_gene_marker: targetGeneMarker,
              clearance_level: clearanceLevel,
              orcid_id: orcidId.trim() || undefined,
              contact_phone: contactPhone.trim() || undefined,
            };

            await saveResearcherProfile(newProfile);

            // If session already established (email confirmation disabled in Supabase)
            if (data.session) {
              onLoginSuccess(newProfile);
              return;
            }

            setInfoMessage(
              'Researcher registered in Supabase database! You can now sign in with your credentials.'
            );
            setIsSignUpMode(false);
            setPassword('');
            setConfirmPassword('');
          }
        } else {
          // ── Sign In ──
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

          if (signInError) throw signInError;

          if (data.user) {
            // Fetch comprehensive researcher profile from PostgreSQL
            const profile = await fetchResearcherProfile(data.user.id, data.user.email);
            onLoginSuccess(profile, 'cloud');
          }
        }
      } catch (err: any) {
        setError(formatSupabaseError(err));
      } finally {
        setIsLoading(false);
      }
    } else {
      // ── Local Offline Mode Fallback ──
      const localProfile: ResearcherProfile = {
        id: 'local-researcher-' + Date.now(),
        email: email.trim() || 'researcher@deepdrishti.local',
        full_name: fullName.trim() || email.trim().split('@')[0] || 'Dr. Field Researcher',
        display_name: fullName.trim() || email.trim().split('@')[0] || 'Dr. Field Researcher',
        lab_name: labName.trim() || 'Arabian Sea Marine Genomics Facility',
        lab_location: labLocation.trim() || 'Goa Coastal Hub, India',
        institution: institution.trim() || 'CSIR - National Institute of Oceanography (NIO)',
        role_title: roleTitle,
        research_focus: researchFocus,
        target_gene_marker: targetGeneMarker,
        clearance_level: clearanceLevel,
        orcid_id: orcidId.trim() || undefined,
      };

      onLoginSuccess(localProfile, 'local');
    }
  };

  // Quick offline bypass
  const handleOfflineBypass = () => {
    const offlineProfile: ResearcherProfile = {
      id: 'offline-researcher',
      email: 'offline.researcher@marine.local',
      full_name: 'Dr. M. S. Swaminathan Group',
      display_name: 'Dr. M. S. Swaminathan Group',
      lab_name: 'Oceanic Marine Biogeochemistry & eDNA Core',
      lab_location: 'Goa Coastal Shelf, India',
      institution: 'National Institute of Oceanography (NIO)',
      role_title: 'Chief Cruise Oceanographer',
      research_focus: 'Marine Environmental DNA (eDNA) Metabarcoding',
      target_gene_marker: '18S V9 (Marine Eukaryotes & Micro-plankton)',
      clearance_level: 'Level 3 - Biodiversity Surveillance & Defense Telemetry (Restricted)',
    };
    onLoginSuccess(offlineProfile);
  };

  return (
    <div className="relative min-h-screen bg-[#040810] text-[#E2E8F0] flex flex-col justify-between p-4 sm:p-6 select-none animate-fadeIn transition-opacity duration-200 overflow-y-auto">
      {/* Bathymetric contour background lines */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none stroke-[#0284C7]/15 fill-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M-100,180 C300,90 600,380 1200,220 S1600,80 2000,280" strokeWidth="1" />
        <path d="M-100,300 C250,200 700,500 1150,360 S1650,200 2000,400" strokeWidth="1" strokeDasharray="4 4" />
        <path d="M-100,420 C350,330 650,630 1100,490 S1550,330 2000,520" strokeWidth="1" />
        <path d="M-100,540 C400,460 800,760 1250,620 S1700,460 2000,660" strokeWidth="1" />
        <line x1="25%" y1="0" x2="25%" y2="100%" stroke="rgba(2,132,199,0.06)" strokeWidth="0.8" />
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(2,132,199,0.06)" strokeWidth="0.8" />
        <line x1="75%" y1="0" x2="75%" y2="100%" stroke="rgba(2,132,199,0.06)" strokeWidth="0.8" />
      </svg>

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4">
        <button
          type="button"
          onClick={onBackToLanding}
          className="flex items-center gap-2 text-slate-400 hover:text-[#38BDF8] text-[12px] font-mono transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Return to Role Selection</span>
        </button>
        <div className="flex items-center gap-2">
          <BrandMark size={20} />
          <span className="font-serif font-semibold text-[14px] text-white uppercase tracking-wider">
            DEEPDRISHTI / eDNA
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 w-full my-6 flex justify-center">
        <div
          className={`w-full bg-[#091322]/95 backdrop-blur-md border border-white/10 rounded-plate p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.8)] transition-all duration-300 ${
            isSignUpMode ? 'max-w-2xl' : 'max-w-md'
          }`}
        >
          {/* Mode Pill & Header */}
          <div className="mb-6 pb-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-[0.1em] text-[#38BDF8] block">
                {isSignUpMode ? 'Researcher Registration' : 'Station Authentication'}
              </span>
              <h1 className="font-serif text-[22px] font-medium text-white mt-0.5">
                {isSignUpMode
                  ? 'eDNA Researcher & Laboratory Enrolment'
                  : 'Sign in to Hydrographic Hub'}
              </h1>
            </div>

            {/* Supabase Status Tag */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0284C7]/15 border border-[#0284C7]/30 text-[11px] font-mono text-[#38BDF8]">
              <Cloud size={13} />
              <span>{configured ? 'Supabase Connected' : 'Local Standalone'}</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[12px] font-mono rounded-control flex items-start gap-2">
                <BadgeAlert size={16} className="mt-0.5 shrink-0" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {infoMessage && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[12px] font-mono rounded-control flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <span className="leading-snug">{infoMessage}</span>
              </div>
            )}

            {/* ── SIGN UP EXPANDED FORM ── */}
            {isSignUpMode ? (
              <div className="space-y-4">
                {/* SECTION 1: Personal & Researcher Details */}
                <div className="bg-[#050B14]/70 border border-white/10 rounded-control p-4 space-y-3">
                  <div className="flex items-center gap-2 text-[12px] font-mono uppercase text-[#38BDF8] border-b border-white/10 pb-2">
                    <User size={14} />
                    <span className="font-semibold">1. Researcher Identity</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-300 mb-1">
                        Full Name of Researcher <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-[#0E1A2E] border border-white/15 rounded-control px-3 py-2 text-[12px] font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#38BDF8]"
                        placeholder="Dr. Asmit Thakur"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-300 mb-1">
                        Professional Role / Title <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={roleTitle}
                        onChange={(e) => setRoleTitle(e.target.value)}
                        className="w-full bg-[#0E1A2E] border border-white/15 rounded-control px-3 py-2 text-[12px] font-mono text-white focus:outline-none focus:border-[#38BDF8]"
                      >
                        {RESEARCH_ROLES.map((r) => (
                          <option key={r} value={r} className="bg-[#091322]">
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-300 mb-1">
                        Researcher Email <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3 top-2.5 text-slate-500" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-[#0E1A2E] border border-white/15 rounded-control pl-9 pr-3 py-2 text-[12px] font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#38BDF8]"
                          placeholder="asmit01052005@gmail.com"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-300 mb-1">
                        ORCID iD / Registry Identifier <span className="text-slate-500 text-[10px]">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={orcidId}
                        onChange={(e) => setOrcidId(e.target.value)}
                        className="w-full bg-[#0E1A2E] border border-white/15 rounded-control px-3 py-2 text-[12px] font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#38BDF8]"
                        placeholder="0000-0002-1825-0097"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-300 mb-1">
                        Account Password <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-[#0E1A2E] border border-white/15 rounded-control px-3 py-2 pr-9 text-[12px] font-mono text-white focus:outline-none focus:border-[#38BDF8]"
                          placeholder="Min. 6 characters"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-300 mb-1">
                        Confirm Password <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full bg-[#0E1A2E] border rounded-control px-3 py-2 text-[12px] font-mono text-white focus:outline-none ${
                          confirmPassword && confirmPassword !== password
                            ? 'border-rose-500 focus:border-rose-500'
                            : 'border-white/15 focus:border-[#38BDF8]'
                        }`}
                        placeholder="Re-type password"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Laboratory & Physical Base Details */}
                <div className="bg-[#050B14]/70 border border-white/10 rounded-control p-4 space-y-3">
                  <div className="flex items-center gap-2 text-[12px] font-mono uppercase text-[#38BDF8] border-b border-white/10 pb-2">
                    <Building2 size={14} />
                    <span className="font-semibold">2. Laboratory & Operating Base Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-300 mb-1">
                        Laboratory / Research Group Name <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={labName}
                        onChange={(e) => setLabName(e.target.value)}
                        className="w-full bg-[#0E1A2E] border border-white/15 rounded-control px-3 py-2 text-[12px] font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#38BDF8]"
                        placeholder="Marine Genomics & eDNA Bio-Surveillance Lab"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-300 mb-1">
                        Lab Operating Location / Base Port <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <MapPin size={14} className="absolute left-3 top-2.5 text-slate-500" />
                        <input
                          type="text"
                          value={labLocation}
                          onChange={(e) => setLabLocation(e.target.value)}
                          className="w-full bg-[#0E1A2E] border border-white/15 rounded-control pl-9 pr-3 py-2 text-[12px] font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#38BDF8]"
                          placeholder="Goa, India (Arabian Sea Base)"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 mb-1">
                      Parent Oceanographic Institution / University / Naval Wing
                    </label>
                    <input
                      type="text"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="w-full bg-[#0E1A2E] border border-white/15 rounded-control px-3 py-2 text-[12px] font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#38BDF8]"
                      placeholder="CSIR - National Institute of Oceanography (NIO) / INCOIS"
                    />
                  </div>
                </div>

                {/* SECTION 3: Underwater Surveillance & eDNA Focus */}
                <div className="bg-[#050B14]/70 border border-white/10 rounded-control p-4 space-y-3">
                  <div className="flex items-center gap-2 text-[12px] font-mono uppercase text-[#38BDF8] border-b border-white/10 pb-2">
                    <Dna size={14} />
                    <span className="font-semibold">3. eDNA & Oceanographic Credentials</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-300 mb-1">
                        Primary Research Specialization
                      </label>
                      <select
                        value={researchFocus}
                        onChange={(e) => setResearchFocus(e.target.value)}
                        className="w-full bg-[#0E1A2E] border border-white/15 rounded-control px-3 py-2 text-[12px] font-mono text-white focus:outline-none focus:border-[#38BDF8]"
                      >
                        {RESEARCH_FOCUSES.map((f) => (
                          <option key={f} value={f} className="bg-[#091322]">
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-300 mb-1">
                        Primary Amplicon Gene Target
                      </label>
                      <select
                        value={targetGeneMarker}
                        onChange={(e) => setTargetGeneMarker(e.target.value)}
                        className="w-full bg-[#0E1A2E] border border-white/15 rounded-control px-3 py-2 text-[12px] font-mono text-white focus:outline-none focus:border-[#38BDF8]"
                      >
                        {GENE_MARKERS.map((g) => (
                          <option key={g} value={g} className="bg-[#091322]">
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-300 mb-1">
                        Surveillance Clearance Level
                      </label>
                      <select
                        value={clearanceLevel}
                        onChange={(e) => setClearanceLevel(e.target.value)}
                        className="w-full bg-[#0E1A2E] border border-white/15 rounded-control px-3 py-2 text-[12px] font-mono text-white focus:outline-none focus:border-[#38BDF8]"
                      >
                        {CLEARANCE_LEVELS.map((c) => (
                          <option key={c} value={c} className="bg-[#091322]">
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-300 mb-1">
                        Emergency / Field Radio Phone <span className="text-slate-500 text-[10px]">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="w-full bg-[#0E1A2E] border border-white/15 rounded-control px-3 py-2 text-[12px] font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#38BDF8]"
                        placeholder="+91-832-2450450 / Marine VHF Ch. 16"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ── SIGN IN COMPACT FORM ── */
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                    Researcher Email
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#0E1A2E] border border-white/15 rounded-control pl-9 pr-3 py-2 text-[13px] font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#38BDF8]"
                      placeholder="asmit01052005@gmail.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                    Account Password
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#0E1A2E] border border-white/15 rounded-control pl-9 pr-9 py-2 text-[13px] font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#38BDF8]"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Submit & Mode Toggles */}
            <div className="pt-3 space-y-2.5">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-[#0284C7] hover:bg-[#0369A1] text-white font-mono text-[13px] uppercase tracking-wider rounded-control transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#0284C7]/20 disabled:opacity-50"
              >
                <KeyRound size={15} />
                <span>
                  {isLoading
                    ? 'Processing Credentials…'
                    : isSignUpMode
                    ? 'Enroll Laboratory & Register in Supabase'
                    : 'Sign In to DeepDrishti Hub'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsSignUpMode(!isSignUpMode);
                  setError(null);
                  setInfoMessage(null);
                }}
                className="w-full py-2 px-3 text-[#38BDF8] hover:text-white font-mono text-[11px] rounded-control transition-colors text-center border border-white/10 hover:border-[#38BDF8]/40 bg-[#0E1A2E]/50"
              >
                {isSignUpMode
                  ? '← Already enrolled? Switch to Researcher Sign In'
                  : 'New researcher or laboratory? Click to Enrol & Register →'}
              </button>

              <div className="relative flex items-center justify-center my-1">
                <span className="w-full border-t border-white/10" />
                <span className="bg-[#091322] px-2 text-[10px] font-mono text-slate-500 uppercase">or</span>
                <span className="w-full border-t border-white/10" />
              </div>

              <button
                type="button"
                onClick={handleOfflineBypass}
                className="w-full py-2 px-3 border border-white/10 hover:border-[#38BDF8]/60 bg-[#050B14]/40 hover:bg-[#0E1A2E] text-slate-400 hover:text-[#38BDF8] font-mono text-[11px] rounded-control transition-colors text-center flex items-center justify-center gap-2"
              >
                <HardDrive size={13} />
                <span>Continue in Offline Local Mode (Bypass Cloud)</span>
              </button>
            </div>
          </form>

          {/* Clearance Footer Tag */}
          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
              <ShieldCheck size={12} className="text-[#38BDF8]" />
              <span>STATION CLEARANCE: LEVEL 3 BIODIVERSITY RESEARCH & SURVEILLANCE</span>
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 pt-4 text-center text-[11px] font-mono text-slate-500">
        DEEPDRISHTI OCEANOGRAPHIC SURVEY SUITE • CRYPTOGRAPHIC ACCESS CONTROL & LABORATORY PROVENANCE
      </footer>
    </div>
  );
};
