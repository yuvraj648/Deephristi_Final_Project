// ========================================================
// DEEPDRISHTI MODULE 02: UNDERWATER SURVEILLANCE STATION
// Tactical naval command interface integrating YOLOv8 threat detection,
// FUNIE-GAN optical enhancement, MiDaS depth profiling & naval console.
// ========================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Play,
  RotateCw,
  Eye,
  Info,
  Terminal,
  Copy,
  Check
} from 'lucide-react';
import { BrandMark } from '../components/common/BrandMark';

interface SurveillanceStationPageProps {
  onBackToLanding: () => void;
  onNavigateToResearcher?: () => void;
}

export const SurveillanceStationPage: React.FC<SurveillanceStationPageProps> = ({
  onBackToLanding,
  onNavigateToResearcher,
}) => {
  const [isLaunching, setIsLaunching] = useState(false);
  const [copiedRole, setCopiedRole] = useState<string | null>(null);
  const [serviceStatus, setServiceStatus] = useState<{
    frontend_online: boolean;
    backend_online: boolean;
    model_online: boolean;
    all_running: boolean;
  }>({
    frontend_online: false,
    backend_online: false,
    model_online: false,
    all_running: false,
  });
  const [checking, setChecking] = useState(false);
  const checkInterval = useRef<any>(null);

  const surveillanceUrl = 'http://localhost:5175';

  const checkStatus = async () => {
    try {
      setChecking(true);
      const res = await fetch('http://localhost:8000/surveillance/status', {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setServiceStatus({
          frontend_online: !!data.frontend_online,
          backend_online: !!data.backend_online,
          model_online: !!data.model_online,
          all_running: !!data.all_running,
        });
      }
    } catch {
      // Backend api.py might be offline or unreachable; try fallback probe directly
      try {
        const img = new Image();
        img.src = `${surveillanceUrl}/favicon.ico?_t=${Date.now()}`;
        img.onload = () => {
          setServiceStatus(prev => ({ ...prev, frontend_online: true }));
        };
      } catch {
        // quiet
      }
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkStatus();
    checkInterval.current = setInterval(checkStatus, 4000);
    return () => {
      if (checkInterval.current) clearInterval(checkInterval.current);
    };
  }, []);

  const handleLaunchServices = async () => {
    setIsLaunching(true);
    try {
      const res = await fetch('http://localhost:8000/surveillance/launch', {
        method: 'POST',
      });
      if (res.ok) {
        // Poll aggressively for 15 seconds
        let attempts = 0;
        const fastPoll = setInterval(async () => {
          attempts++;
          await checkStatus();
          if (attempts > 12) {
            clearInterval(fastPoll);
            setIsLaunching(false);
          }
        }, 1500);
      } else {
        setIsLaunching(false);
      }
    } catch (e) {
      console.error('Launch failed:', e);
      setIsLaunching(false);
    }
  };

  const copyCredential = (email: string, roleName: string) => {
    navigator.clipboard.writeText(email);
    setCopiedRole(roleName);
    setTimeout(() => setCopiedRole(null), 2000);
  };

  const roles = [
    { role: 'Captain', email: 'captain@aquascope.com', desc: 'Full tactical & command access' },
    { role: 'Vice Captain', email: 'vice@aquascope.com', desc: 'Executive naval operations' },
    { role: 'Surveillance Head', email: 'surveillance@aquascope.com', desc: 'Live multi-camera array' },
    { role: 'Engineer', email: 'engineer@aquascope.com', desc: 'Enhancement Lab & calibration' },
    { role: 'Analyst', email: 'analyst@aquascope.com', desc: 'Detections & acoustic analytics' },
  ];

  return (
    <div className="min-h-screen bg-[#070D12] text-[#E9E6DC] flex flex-col font-sans select-none overflow-hidden">
      {/* Tactical Top Bar */}
      <header className="h-14 bg-[#0B151D] border-b border-[#1A2834] px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBackToLanding}
            className="flex items-center gap-1.5 text-[#7FB2C9] hover:text-white px-2.5 py-1.5 rounded bg-[#101F2B] border border-[#1E3345] hover:border-[#7FB2C9] text-[12px] font-mono transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Hub</span>
          </button>

          <div className="flex items-center gap-2.5 pl-2 border-l border-[#1A2834]">
            <BrandMark size={20} inverted={true} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-semibold text-[14px] tracking-wide text-white">
                  DEEPDRISHTI // SURVEILLANCE DECK
                </span>
                <span className="text-[10px] font-mono bg-[#0284C7]/20 text-[#38BDF8] border border-[#0284C7]/40 px-2 py-0.5 rounded">
                  MODULE 02
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#677580] hidden sm:inline">
                ACOUSTIC & OPTICAL PHYSICAL RECONNAISSANCE
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live Service Status Indicators */}
        <div className="hidden md:flex items-center gap-3 bg-[#081017] px-3 py-1 rounded border border-[#14232F] text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                serviceStatus.model_online
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  : 'bg-zinc-600'
              }`}
            />
            <span className={serviceStatus.model_online ? 'text-emerald-300' : 'text-zinc-500'}>
              AI Model:5001
            </span>
          </div>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                serviceStatus.backend_online
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  : 'bg-zinc-600'
              }`}
            />
            <span className={serviceStatus.backend_online ? 'text-emerald-300' : 'text-zinc-500'}>
              API:5003
            </span>
          </div>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                serviceStatus.frontend_online
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  : 'bg-zinc-600'
              }`}
            />
            <span className={serviceStatus.frontend_online ? 'text-emerald-300' : 'text-zinc-500'}>
              Dashboard:5175
            </span>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2">
          {onNavigateToResearcher && (
            <button
              type="button"
              onClick={onNavigateToResearcher}
              className="hidden lg:flex items-center gap-1 text-[11px] font-mono text-[#7FB2C9] hover:text-white px-2 py-1 rounded hover:bg-[#101F2B]"
            >
              <span>eDNA Module</span>
            </button>
          )}

          <button
            type="button"
            onClick={checkStatus}
            disabled={checking}
            className="p-1.5 text-zinc-400 hover:text-white rounded bg-[#101F2B] border border-[#1E3345] transition-colors"
            title="Refresh connection status"
          >
            <RotateCw size={14} className={checking ? 'animate-spin' : ''} />
          </button>

          {!serviceStatus.frontend_online && (
            <button
              type="button"
              onClick={handleLaunchServices}
              disabled={isLaunching}
              className="flex items-center gap-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white px-3 py-1.5 rounded font-mono text-[12px] font-medium transition-colors shadow-md disabled:opacity-50"
            >
              <Play size={13} fill="currentColor" />
              <span>{isLaunching ? 'Launching...' : 'Start Stack'}</span>
            </button>
          )}

          <a
            href={surveillanceUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 bg-[#172A38] hover:bg-[#20394D] text-[#38BDF8] border border-[#0284C7]/40 px-3 py-1.5 rounded font-mono text-[12px] transition-colors"
          >
            <span>Pop-out Tab</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </header>

      {/* Quick Roles Credential Bar (Collapsible) */}
      <div className="bg-[#0A131A] border-b border-[#14232F] px-4 py-1.5 flex flex-wrap items-center justify-between text-[11px] font-mono text-zinc-400 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[#38BDF8] font-semibold flex items-center gap-1">
            <Info size={12} />
            DEMO ACCESS PROFILES:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {roles.slice(0, 3).map((r) => (
              <button
                key={r.role}
                type="button"
                onClick={() => copyCredential(r.email, r.role)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#101C26] hover:bg-[#172736] border border-[#1C3244] text-zinc-300 transition-colors"
                title={`Click to copy: ${r.email}`}
              >
                <span className="text-[#7FB2C9]">{r.role}:</span>
                <span className="text-zinc-400">{r.email.split('@')[0]}</span>
                {copiedRole === r.role ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              </button>
            ))}
          </div>
        </div>
        <div className="text-[10px] text-zinc-500">
          Target Host: <span className="text-zinc-300 font-mono">http://localhost:5175</span>
        </div>
      </div>

      {/* Main Tactical Screen Container */}
      <div className="flex-1 relative bg-[#050A0E] flex flex-col overflow-hidden">
        {serviceStatus.frontend_online ? (
          /* Live Embedded Surveillance Deck */
          <div className="relative w-full h-full flex-1">
            <iframe
              src={surveillanceUrl}
              title="DeepDrishti Underwater Physical Surveillance"
              className="w-full h-full border-none"
            />
          </div>
        ) : (
          /* Standby Launch Console */
          <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-[#0284C7]/10 border border-[#0284C7]/30 flex items-center justify-center text-[#38BDF8] animate-pulse">
              <Eye size={32} />
            </div>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#0A1620] border border-[#0284C7]/30 text-[#38BDF8] font-mono text-[11px] uppercase tracking-wider mb-3">
                <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
                Surveillance Station Ready for Deployment
              </div>
              <h2 className="font-serif text-3xl font-medium text-white tracking-tight mb-2">
                Underwater Physical Surveillance Deck
              </h2>
              <p className="text-zinc-400 text-sm max-w-xl mx-auto leading-relaxed">
                Connect real-time multi-camera marine optical arrays, YOLOv8 danger detection (sea mines, submersibles, divers), MiDaS depth telemetry, and FUNIE-GAN underwater restoration.
              </p>
            </div>

            {/* Launch Action */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <button
                type="button"
                onClick={handleLaunchServices}
                disabled={isLaunching}
                className="px-6 py-3 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded font-mono text-sm uppercase tracking-wider font-semibold transition-all shadow-[0_0_20px_rgba(2,132,199,0.3)] hover:shadow-[0_0_25px_rgba(2,132,199,0.5)] flex items-center gap-2 disabled:opacity-50"
              >
                <Play size={16} fill="currentColor" />
                <span>{isLaunching ? 'Booting Surveillance Stack...' : 'Launch Surveillance Station'}</span>
              </button>

              <a
                href={surveillanceUrl}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3 bg-[#101C26] hover:bg-[#162736] text-[#7FB2C9] border border-[#1C3244] rounded font-mono text-sm tracking-wider transition-colors flex items-center gap-2"
              >
                <span>Direct Open (Port 5175)</span>
                <ExternalLink size={14} />
              </a>
            </div>

            {/* Microservice Architecture Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full pt-4 text-left">
              <div className="bg-[#0B151D] border border-[#162533] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono text-zinc-500 uppercase">AI Pipeline</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    Port 5001
                  </span>
                </div>
                <h4 className="font-serif text-[15px] font-medium text-white mb-1">
                  FUNIE-GAN & YOLOv8
                </h4>
                <p className="text-[12px] text-zinc-400 leading-snug">
                  Fast underwater GAN color recovery, marine threat detection & MiDaS monocular depth calculation.
                </p>
              </div>

              <div className="bg-[#0B151D] border border-[#162533] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono text-zinc-500 uppercase">Gateway API</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    Port 5003
                  </span>
                </div>
                <h4 className="font-serif text-[15px] font-medium text-white mb-1">
                  Express & MongoDB
                </h4>
                <p className="text-[12px] text-zinc-400 leading-snug">
                  Camera feed ingestion, automated alert generation, RBAC token auth & command dispatches.
                </p>
              </div>

              <div className="bg-[#0B151D] border border-[#162533] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono text-zinc-500 uppercase">Naval Console</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    Port 5175
                  </span>
                </div>
                <h4 className="font-serif text-[15px] font-medium text-white mb-1">
                  Operations Console
                </h4>
                <p className="text-[12px] text-zinc-400 leading-snug">
                  Multi-feed tactical matrix, interactive split-slider enhancement lab, and threat log audit.
                </p>
              </div>
            </div>

            {/* Quick Command Help */}
            <div className="w-full bg-[#081017] border border-[#14232F] rounded p-3 flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-[#38BDF8]" />
                <span>Manual launcher script located at:</span>
                <code className="text-[#7FB2C9] bg-[#0E1A24] px-1.5 py-0.5 rounded">DeepDrishti/run_all.bat</code>
              </div>
              <button
                type="button"
                onClick={checkStatus}
                className="text-[#38BDF8] hover:underline"
              >
                Re-check ports
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
