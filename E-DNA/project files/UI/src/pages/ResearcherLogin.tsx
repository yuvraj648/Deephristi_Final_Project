// ========================================================
// DEEPDRISHTI RESEARCHER AUTHENTICATION
// Laboratory field credential verification on chart-paper surface
// ========================================================

import React, { useState } from 'react';
import { BrandMark } from '../components/common/BrandMark';
import { ArrowLeft, KeyRound, Cloud, HardDrive, Info } from 'lucide-react';
import { supabase, isSupabaseConfigured, formatSupabaseError } from '../lib/supabase';

interface ResearcherLoginProps {
  onLoginSuccess: (researcherId: string, mode: 'cloud' | 'local') => void;
  onBackToLanding: () => void;
}

export const ResearcherLogin: React.FC<ResearcherLoginProps> = ({
  onLoginSuccess,
  onBackToLanding,
}) => {
  const configured = isSupabaseConfigured();
  const [email, setEmail] = useState(configured ? '' : 'researcher');
  const [password, setPassword] = useState(configured ? '' : 'access');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!email.trim() || !password.trim()) {
      setError('Please provide both credentials.');
      return;
    }

    if (configured && supabase) {
      setIsLoading(true);
      try {
        if (isSignUpMode) {
          const { data, error: signUpError } = await supabase.auth.signUp({
            email: email.trim(),
            password,
          });
          if (signUpError) throw signUpError;
          if (data.user) {
            setInfoMessage('Account created successfully. You may now sign in.');
            setIsSignUpMode(false);
          }
        } else {
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (signInError) throw signInError;
          if (data.user) {
            onLoginSuccess(data.user.email || data.user.id, 'cloud');
          }
        }
      } catch (err: any) {
        setError(formatSupabaseError(err));
      } finally {
        setIsLoading(false);
      }
    } else {
      // Local Mode
      onLoginSuccess(email.trim(), 'local');
    }
  };



  return (
    <div className="relative min-h-screen bg-paper flex flex-col justify-between p-6 select-none animate-fadeIn transition-opacity duration-200 overflow-hidden">
      {/* Bathymetric contour background lines matching Landing & Surveillance */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none stroke-[#38BDF8]/10 fill-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M-100,180 C300,90 600,380 1200,220 S1600,80 2000,280" strokeWidth="1" />
        <path d="M-100,300 C250,200 700,500 1150,360 S1650,200 2000,400" strokeWidth="1" strokeDasharray="4 4" />
        <path d="M-100,420 C350,330 650,630 1100,490 S1550,330 2000,520" strokeWidth="1" />
        <path d="M-100,540 C400,460 800,760 1250,620 S1700,460 2000,660" strokeWidth="1" />
        
        {/* Subtle graticule grid */}
        <line x1="25%" y1="0" x2="25%" y2="100%" stroke="rgba(56,189,248,0.04)" strokeWidth="0.8" />
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(56,189,248,0.04)" strokeWidth="0.8" />
        <line x1="75%" y1="0" x2="75%" y2="100%" stroke="rgba(56,189,248,0.04)" strokeWidth="0.8" />
      </svg>

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-rule pb-4">
        <button
          type="button"
          onClick={onBackToLanding}
          className="flex items-center gap-2 text-ink-muted hover:text-[#38BDF8] text-[12px] font-mono transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Return to Role Selection</span>
        </button>
        <div className="flex items-center gap-2">
          <BrandMark size={20} />
          <span className="font-serif font-semibold text-[14px] text-ink uppercase tracking-wider">
            DEEPDRISHTI / eDNA
          </span>
        </div>
      </header>

      {/* Main Authentication Plate */}
      <main className="relative z-10 max-w-md w-full mx-auto my-12">
        <div className="bg-paper-raised/95 backdrop-blur-md border border-rule-strong rounded-plate p-8 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
          {/* Mode Banner */}
          <div className="mb-6 p-3 rounded-control border text-[11px] font-mono">
            {configured ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-survey font-semibold">
                  <Cloud size={14} />
                  <span>SUPABASE CLOUD PERSISTENCE DETECTED</span>
                </div>
                <p className="text-ink-muted font-sans text-[12px] leading-relaxed">
                  Sign in with your researcher credentials to access remote expeditions and persist uploads to Supabase PostgreSQL.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold">
                  <HardDrive size={14} />
                  <span>LOCAL MODE • Supabase Connection Not Configured</span>
                </div>
                <p className="text-ink-muted font-sans text-[12px] leading-relaxed">
                  Using local storage and seeded reference datasets. To connect a real cloud backend, configure <code className="bg-paper-sunk px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> and <code className="bg-paper-sunk px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code>.
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-2.5 bg-error/10 border border-error/40 text-error text-[12px] font-mono rounded-control">
                {error}
              </div>
            )}

            {infoMessage && (
              <div className="p-2.5 bg-survey/10 border border-survey/40 text-survey text-[12px] font-mono rounded-control flex items-center gap-1.5">
                <Info size={14} />
                <span>{infoMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-muted mb-1.5">
                {configured ? 'Researcher Email' : 'Researcher Identifier'}
              </label>
              <input
                type={configured ? 'email' : 'text'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-paper border border-rule rounded-control px-3 py-2 text-[13px] font-mono text-ink focus:outline-none focus:border-survey focus:bg-paper-raised"
                placeholder={configured ? 'researcher@ocean.institute.org' : 'researcher'}
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-muted mb-1.5">
                {configured ? 'Account Password' : 'Authentication Passcode'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-paper border border-rule rounded-control px-3 py-2 text-[13px] font-mono text-ink focus:outline-none focus:border-survey focus:bg-paper-raised"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-survey hover:bg-survey-hover text-white font-mono text-[13px] uppercase tracking-wider rounded-control transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <KeyRound size={15} />
                <span>
                  {isLoading
                    ? 'Authenticating…'
                    : configured
                    ? isSignUpMode
                      ? 'Register Account in Supabase'
                      : 'Sign In with Supabase'
                    : 'Access Research Workspace'}
                </span>
              </button>

              {configured && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUpMode(!isSignUpMode);
                      setError(null);
                      setInfoMessage(null);
                    }}
                    className="w-full py-2 px-3 bg-transparent hover:bg-paper-sunk text-ink font-mono text-[11px] rounded-control transition-colors text-ink-muted hover:text-ink text-center"
                  >
                    {isSignUpMode
                      ? 'Already have an account? Switch to Sign In'
                      : 'Need a new researcher account? Click to Register'}
                  </button>

                  <div className="relative flex items-center justify-center my-1">
                    <span className="w-full border-t border-rule" />
                    <span className="bg-paper-raised px-2 text-[10px] font-mono text-ink-faint uppercase">or</span>
                    <span className="w-full border-t border-rule" />
                  </div>

                  <button
                    type="button"
                    onClick={() => onLoginSuccess(email.trim() || 'researcher-local', 'local')}
                    className="w-full py-2 px-3 border border-rule hover:border-[#38BDF8]/60 bg-paper-sunk/30 hover:bg-paper-sunk text-ink font-mono text-[11px] rounded-control transition-colors text-ink-muted hover:text-[#38BDF8] text-center flex items-center justify-center gap-2"
                  >
                    <HardDrive size={13} />
                    <span>Continue in Offline Local Mode (Bypass Cloud)</span>
                  </button>
                </>
              )}

            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-rule text-center">
            <span className="text-[11px] font-mono text-ink-faint">
              STATION CLEARANCE: LEVEL 3 BIODIVERSITY RESEARCH
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-rule pt-4 text-center text-[11px] font-mono text-ink-faint">
        DEEPDRISHTI OCEANOGRAPHIC SURVEY SUITE • CRYPTOGRAPHIC ACCESS CONTROL
      </footer>
    </div>
  );
};
