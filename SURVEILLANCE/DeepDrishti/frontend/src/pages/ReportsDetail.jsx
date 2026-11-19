import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AppShell from '../components/AppShell';

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'http://localhost:5003/api/v1';

const FLASK_STATIC_ORIGIN =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FLASK_URL) ||
  'http://localhost:5001';

const resolveImageUrl = (img) => {
  if (!img) return null;
  if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) return img;
  return `${FLASK_STATIC_ORIGIN}${img.startsWith('/') ? '' : '/'}${img}`;
};

const PLACEHOLDER_IMG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480" fill="#08101e"><rect width="100%" height="100%"/><circle cx="400" cy="240" r="100" stroke="#00d4ff" stroke-width="2" stroke-dasharray="6 6" fill="none" opacity="0.4"/><line x1="400" y1="100" x2="400" y2="380" stroke="#00d4ff" stroke-width="1.5" opacity="0.3"/><line x1="260" y1="240" x2="540" y2="240" stroke="#00d4ff" stroke-width="1.5" opacity="0.3"/><text x="50%" y="48%" fill="#00d4ff" font-size="16" font-family="monospace" text-anchor="middle" font-weight="bold">TACTICAL TELEMETRY SNAPSHOT</text><text x="50%" y="58%" fill="#64748b" font-size="12" font-family="monospace" text-anchor="middle">LIVE STREAM LOGGED</text></svg>'
  );

const ReportsDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { incidentData } = location.state || {};

  const [selectedAction, setSelectedAction] = useState(incidentData?.status || '');
  const [observationNotes, setObservationNotes] = useState(incidentData?.notes || '');
  const [savingNote, setSavingNote] = useState(false);
  const [timelineLog, setTimelineLog] = useState([
    { time: incidentData?.time || '14:05:44', type: 'SYSTEM', message: `ALERT_LOGGED: ${incidentData?.title || 'UNDERWATER_OBJECT'}` },
    { time: new Date().toLocaleTimeString('en-US', { hour12: false }), type: 'AI_PIPELINE', message: `MODELS: ${(incidentData?.modelsUsed || ['FUNIE-GAN', 'YOLOv8', 'MiDaS']).join(', ')}` },
    { time: new Date().toLocaleTimeString('en-US', { hour12: false }), type: 'SYSTEM', message: 'AWAITING_OPERATOR_REVIEW', isCurrent: true }
  ]);

  if (!incidentData) {
    navigate('/reports');
    return null;
  }

  const handleAction = async (action) => {
    setSelectedAction(action);
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    let logMsg = `ACTION_SELECTED: ${action.toUpperCase()}`;

    try {
      if (action === 'false_positive') {
        logMsg = 'OPERATOR_CLASSIFIED: FALSE_POSITIVE (FILTER_APPLIED)';
        if (incidentData?.id) {
          await axios.patch(`${API_BASE.replace(/\/$/, '')}/detections/${incidentData.id}/false-positive`, {
            reviewedBy: 'Captain Atha',
            notes: observationNotes || 'Operator verified as false positive'
          }, { headers });
        }
      } else if (action === 'confirmed_threat') {
        logMsg = 'OPERATOR_CLASSIFIED: CONFIRMED_THREAT (HIGH_PRIORITY)';
        if (incidentData?.id) {
          await axios.patch(`${API_BASE.replace(/\/$/, '')}/detections/${incidentData.id}/confirm`, {
            reviewedBy: 'Captain Atha',
            notes: observationNotes || 'Operator confirmed threat'
          }, { headers });
        }
      } else if (action === 'escalate') {
        logMsg = 'TACTICAL_ESCALATION: DISPATCHED_TO_NAVAL_COMMAND';
      } else if (action === 'assign_team') {
        logMsg = 'DEPLOYMENT: ASSIGNED_TO_RAPID_RESPONSE_DIVERS';
      }
    } catch (e) {
      console.error('Action error:', e);
    }

    const newEntry = {
      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      type: 'OPERATOR',
      message: logMsg
    };
    setTimelineLog(prev => [...prev, newEntry]);
  };

  const handleSaveNotes = async () => {
    if (!incidentData?.id) return;
    try {
      setSavingNote(true);
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.put(`${API_BASE.replace(/\/$/, '')}/detections/${incidentData.id}`, {
        reviewNotes: observationNotes
      }, { headers });
      setTimelineLog(prev => [...prev, {
        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        type: 'OPERATOR',
        message: 'OBSERVATION_NOTES_SAVED_TO_RECORD'
      }]);
    } catch (e) {
      console.error('Failed to save notes:', e);
    } finally {
      setSavingNote(false);
    }
  };


  return (
    <AppShell>
      <div className="flex flex-1 min-h-0 overflow-hidden flex-col">
        <div className="flex flex-1 min-h-0 overflow-hidden flex-row">
        <main className="flex-1 flex flex-col min-w-0 bg-background-dark relative min-h-0">
          <div className="scanline absolute inset-0 z-0"></div>
          {/* Viewport */}
          <div className="flex-1 p-6 relative flex flex-col gap-4 z-10">
            <div className="flex-1 bg-slate-900 border border-primary/20 relative overflow-hidden group">
              {/* Incident Image */}
              <div
                className="absolute inset-0 bg-cover bg-center opacity-80"
                style={{ backgroundImage: `url(${resolveImageUrl(incidentData.image) || PLACEHOLDER_IMG})` }}
              />
              
              {/* Tactical Overlays */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-48 border border-primary/20 rounded-full flex items-center justify-center pointer-events-none">
                <div className="size-2 bg-primary rounded-full"></div>
                <div className="absolute inset-0 border-t border-primary/40 w-1/4 left-0 top-1/2"></div>
                <div className="absolute inset-0 border-t border-primary/40 w-1/4 right-0 top-1/2"></div>
              </div>
              
              {/* Bounding Box */}
              <div className="absolute top-1/4 left-1/3 w-64 h-48 border-2 border-primary/60 shadow-[0_0_20px_rgba(0,212,255,0.3)] pointer-events-none">
                <div className="absolute -top-6 left-0 bg-primary/80 text-background-dark text-[10px] font-bold px-2 py-0.5 uppercase">
                  TARGET: {incidentData.title || incidentData.objectDetected || 'UNDERWATER_OBJECT'}
                </div>
              </div>
              
              {/* HUD Controls */}
              <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                <button className="size-10 bg-background-dark/80 border border-primary/30 text-primary flex items-center justify-center hover:bg-primary hover:text-background-dark">
                  <span className="material-symbols-outlined">add</span>
                </button>
                <button className="size-10 bg-background-dark/80 border border-primary/30 text-primary flex items-center justify-center hover:bg-primary hover:text-background-dark">
                  <span className="material-symbols-outlined">remove</span>
                </button>
                <button className="size-10 bg-background-dark/80 border border-primary/30 text-primary flex items-center justify-center hover:bg-primary hover:text-background-dark">
                  <span className="material-symbols-outlined">fullscreen</span>
                </button>
              </div>
              
              <div className="absolute top-4 left-4 bg-background-dark/60 border border-border-navy px-3 py-1.5">
                <p className="text-[10px] font-mono text-primary leading-tight">LATENCY: 42ms</p>
                <p className="text-[10px] font-mono text-primary leading-tight">FPS: 60.0</p>
              </div>
            </div>

            {/* Technical Details Grid */}
            <div className="grid grid-cols-5 gap-px bg-border-navy border border-border-navy shrink-0">
              <div className="bg-panel-dark p-3">
                <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Object Class</p>
                <p className="text-sm font-mono text-slate-200 uppercase truncate">{incidentData.title || incidentData.objectDetected || 'SEA MINE'}</p>
              </div>
              <div className="bg-panel-dark p-3">
                <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Confidence %</p>
                <p className="text-sm font-mono text-primary">{((typeof incidentData.confidence === 'number' ? (incidentData.confidence <= 1 ? incidentData.confidence * 100 : incidentData.confidence) : 75)).toFixed(1)}%</p>
              </div>
              <div className="bg-panel-dark p-3">
                <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Status</p>
                <p className="text-sm font-mono text-yellow-400 uppercase">{selectedAction?.toUpperCase() || incidentData.status?.toUpperCase() || 'INVESTIGATING'}</p>
              </div>
              <div className="bg-panel-dark p-3">
                <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Camera Feed</p>
                <p className="text-sm font-mono text-slate-200 truncate">{incidentData.camera || 'CAM_ALPHA'}</p>
              </div>
              <div className="bg-panel-dark p-3">
                <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Est. Distance</p>
                <p className="text-sm font-mono text-slate-200">{incidentData.distance_m ? `${incidentData.distance_m.toFixed(1)}m` : '6.5m'}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 shrink-0">
              <button
                type="button"
                onClick={() => navigate('/enhancement-lab')}
                className="flex-1 bg-primary/10 border border-primary/30 text-primary h-10 text-[11px] font-bold uppercase tracking-widest hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">photo_filter</span> Enhance Frame
              </button>
              <button
                type="button"
                onClick={() => navigate('/surveillance')}
                className="flex-1 bg-primary text-background-dark h-10 text-[11px] font-bold uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">sensors</span> Open Live Feed
              </button>
            </div>
          </div>
        </main>

        {/* Right Panel: Response Actions */}
        <section className="w-96 border-l border-border-navy flex flex-col bg-panel-dark/50 p-6 gap-6">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Operator Console</h2>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => handleAction('false_positive')}
                className={`bg-panel-dark border p-3 text-left hover:border-threat-low group transition-all ${
                  selectedAction === 'false_positive' ? 'border-threat-low' : 'border-border-navy'
                }`}
              >
                <span className="material-symbols-outlined text-slate-500 group-hover:text-threat-low mb-2 block">check_circle</span>
                <p className="text-[10px] font-bold uppercase text-slate-300">False Positive</p>
              </button>
              <button 
                onClick={() => handleAction('confirmed_threat')}
                className={`bg-panel-dark border p-3 text-left hover:border-threat-high group transition-all ${
                  selectedAction === 'confirmed_threat' ? 'border-threat-high' : 'border-border-navy'
                }`}
              >
                <span className="material-symbols-outlined text-slate-500 group-hover:text-threat-high mb-2 block">report_problem</span>
                <p className="text-[10px] font-bold uppercase text-slate-300">Confirmed Threat</p>
              </button>
              <button 
                onClick={() => handleAction('escalate')}
                className={`bg-panel-dark border p-3 text-left hover:border-primary group transition-all ${
                  selectedAction === 'escalate' ? 'border-primary' : 'border-border-navy'
                }`}
              >
                <span className="material-symbols-outlined text-slate-500 group-hover:text-primary mb-2 block">arrow_upward</span>
                <p className="text-[10px] font-bold uppercase text-slate-300">Escalate Priority</p>
              </button>
              <button 
                onClick={() => handleAction('assign_team')}
                className={`bg-panel-dark border p-3 text-left hover:border-primary group transition-all ${
                  selectedAction === 'assign_team' ? 'border-primary' : 'border-border-navy'
                }`}
              >
                <span className="material-symbols-outlined text-slate-500 group-hover:text-primary mb-2 block">group_add</span>
                <p className="text-[10px] font-bold uppercase text-slate-300">Assign to Team</p>
              </button>
            </div>
          </div>

          <div className="flex flex-col flex-1 gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase text-slate-500">Observation Notes</label>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={savingNote}
                  className="px-2 py-0.5 text-[9px] font-bold uppercase bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 rounded"
                >
                  {savingNote ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
              <textarea 
                value={observationNotes}
                onChange={(e) => setObservationNotes(e.target.value)}
                onBlur={handleSaveNotes}
                className="bg-background-dark border border-border-navy rounded-sm p-3 text-xs text-slate-200 focus:border-primary focus:ring-0 resize-none h-24 placeholder-slate-600 font-display" 
                placeholder="Enter findings..."
              />
            </div>

            <div className="flex flex-col flex-1 overflow-hidden">
              <label className="text-[10px] font-bold uppercase text-slate-500 mb-2">Incident Timeline Log</label>
              <div className="flex-1 bg-background-dark/50 border border-border-navy rounded-sm overflow-y-auto custom-scrollbar p-3 font-mono text-[10px]">
                <div className="space-y-3">
                  {timelineLog.map((entry, index) => (
                    <div key={index} className="flex gap-3">
                      <span className={`${entry.isCurrent ? 'text-primary animate-pulse' : 'text-primary opacity-50'} shrink-0`}>
                        {entry.time}
                      </span>
                      <span className={`${entry.isCurrent ? 'text-primary font-bold' : 'text-slate-400'}`}>
                        <span className="text-slate-200">[{entry.type}]</span> {entry.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
        </div>

      {/* Bottom Bar: Quick Actions */}
      <footer className="h-12 shrink-0 border-t border-border-navy flex items-center justify-between px-6 bg-background-dark">
        <div className="flex gap-6">
          <button
            type="button"
            onClick={() => {
              const exportBlob = new Blob([JSON.stringify({ incident: incidentData, notes: observationNotes, timeline: timelineLog }, null, 2)], { type: 'application/json' });
              const exportUrl = URL.createObjectURL(exportBlob);
              const a = document.createElement('a');
              a.href = exportUrl;
              a.download = `incident-${incidentData.id || 'evidence'}.json`;
              a.click();
              URL.revokeObjectURL(exportUrl);
            }}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-lg">download</span> Export Evidence
          </button>
          <button
            type="button"
            onClick={() => {
              navigate('/reports');
            }}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-lg">description</span> Reports Summary
          </button>
        </div>
        <button 
          onClick={() => navigate('/reports')}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-200 hover:text-primary transition-colors px-3 py-1.5 border border-border-navy bg-slate-800/50"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span> Return to Reports
        </button>
      </footer>
      </div>
    </AppShell>
  );
};

export default ReportsDetail;
