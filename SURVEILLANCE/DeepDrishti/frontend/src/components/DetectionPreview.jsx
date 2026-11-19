import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'http://localhost:5003/api/v1';

const FLASK_STATIC_ORIGIN =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FLASK_URL) ||
  'http://localhost:5001';

const DetectionPreview = ({ detection, onUpdateDetection }) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [noteText, setNoteText] = useState(detection?.reviewNotes || '');
  const [hitlCounts, setHitlCounts] = useState(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setNoteText(detection?.reviewNotes || '');
    setStatusMsg(null);
    setShowNoteEditor(false);
    setImgError(false);
  }, [detection?.id, detection?.reviewNotes]);

  // Fetch HITL status once per detection open
  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    axios.get(`${API_BASE.replace(/\/$/, '')}/detections/finetune/status`, { headers, timeout: 4000 })
      .then(r => setHitlCounts(r.data))
      .catch(() => {}); // silent
  }, [detection?.id]);

  const showTempStatus = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 5000);
  };

  const normalizedStatus = String(detection?.status || '').toLowerCase().replace(/[\s_-]+/g, '');

  const getStatusBadge = () => {
    if (normalizedStatus === 'confirmed') {
      return { text: 'CONFIRMED', style: 'bg-green-500/20 text-green-400 border-green-500/40' };
    }
    if (normalizedStatus === 'falsepositive') {
      return { text: 'FALSE POSITIVE', style: 'bg-red-500/20 text-red-400 border-red-500/40' };
    }
    return { text: 'INVESTIGATING', style: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' };
  };

  const getConfidenceColor = (confidence) => {
    const val = typeof confidence === 'number' ? (confidence <= 1 ? confidence * 100 : confidence) : 0;
    if (val >= 85) return 'text-green-400';
    if (val >= 65) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatConfidence = (conf) => {
    if (typeof conf !== 'number' || isNaN(conf)) return '—';
    const val = conf <= 1 ? conf * 100 : conf;
    return `${val.toFixed(1)}%`;
  };

  const rawSnapshot = detection?.snapshotPath || detection?.enhancedImage || detection?.snapshot;
  const snapshotUrl = rawSnapshot && !imgError
    ? (rawSnapshot.startsWith('http') ? rawSnapshot : `${FLASK_STATIC_ORIGIN}${rawSnapshot.startsWith('/') ? '' : '/'}${rawSnapshot}`)
    : null;

  const refreshHitl = async (headers) => {
    try {
      const r = await axios.get(`${API_BASE.replace(/\/$/, '')}/detections/finetune/status`, { headers, timeout: 4000 });
      if (r?.data) setHitlCounts(r.data);
    } catch (_) {}
  };

  const handleMarkFalsePositive = async () => {
    if (!detection?.id || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.patch(`${API_BASE.replace(/\/$/, '')}/detections/${detection.id}/false-positive`, {
        reviewedBy: 'Captain Atha',
        notes: noteText || 'Operator verified as false positive'
      }, { headers });

      const updated = {
        ...detection,
        status: 'false_positive',
        reviewedBy: 'Captain Atha',
        reviewNotes: noteText || 'Operator verified as false positive',
        reviewedAt: new Date().toISOString()
      };
      if (onUpdateDetection) onUpdateDetection(updated);
      showTempStatus('⬛ Marked FALSE POSITIVE — HITL sample queued for YOLO training');
      await refreshHitl(headers);
    } catch (err) {
      console.error('False positive error:', err);
      showTempStatus('Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!detection?.id || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.patch(`${API_BASE.replace(/\/$/, '')}/detections/${detection.id}/confirm`, {
        reviewedBy: 'Captain Atha',
        notes: noteText || 'Operator confirmed threat'
      }, { headers });

      const updated = {
        ...detection,
        status: 'confirmed',
        reviewedBy: 'Captain Atha',
        reviewNotes: noteText || 'Operator confirmed threat',
        reviewedAt: new Date().toISOString()
      };
      if (onUpdateDetection) onUpdateDetection(updated);
      showTempStatus('✅ Threat CONFIRMED — positive sample queued for YOLO fine-tuning');
      await refreshHitl(headers);
    } catch (err) {
      console.error('Confirm error:', err);
      showTempStatus('Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetInvestigating = async () => {
    if (!detection?.id || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.put(`${API_BASE.replace(/\/$/, '')}/detections/${detection.id}`, {
        status: 'investigating'
      }, { headers });

      const updated = { ...detection, status: 'investigating' };
      if (onUpdateDetection) onUpdateDetection(updated);
      showTempStatus('Status reset to INVESTIGATING');
    } catch (err) {
      console.error('Reset investigating error:', err);
      showTempStatus('Failed to reset status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!detection?.id || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.put(`${API_BASE.replace(/\/$/, '')}/detections/${detection.id}`, {
        reviewNotes: noteText
      }, { headers });

      const updated = { ...detection, reviewNotes: noteText };
      if (onUpdateDetection) onUpdateDetection(updated);
      setShowNoteEditor(false);
      showTempStatus('Operator notes saved to database');
    } catch (err) {
      console.error('Save notes error:', err);
      showTempStatus('Failed to save notes');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateReport = () => {
    navigate('/reports/detail', {
      state: {
        incidentData: {
          id: detection.id,
          title: detection.objectDetected || 'DETECTION_OBJECT',
          confidence: detection.confidence,
          camera: detection.cameraSource || 'SURVEILLANCE_CAMERA',
          time: detection.timestamp,
          image: rawSnapshot,
          status: detection.status,
          notes: noteText || detection.reviewNotes,
          modelsUsed: detection.modelsUsed || ['FUNIE-GAN', 'YOLOv8', 'MiDaS'],
          distance_m: detection.distance_m
        }
      }
    });
  };

  const badge = getStatusBadge();

  // HITL counts display
  const hitlTotal = hitlCounts?.counts?.total ?? hitlCounts?.total ?? null;
  const hitlThreshold = hitlCounts?.threshold ?? 10;
  const trainingActive = hitlCounts?.training_active ?? false;
  const bestFeedbackReady = hitlCounts?.best_feedback_available ?? false;

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="border-b border-border-muted p-4 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold truncate">Detection: {detection.id}</h3>
          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-1 text-[10px] font-bold uppercase border rounded ${badge.style}`}>
              {badge.text}
            </span>
            {normalizedStatus !== 'investigating' && (
              <button
                type="button"
                onClick={handleSetInvestigating}
                disabled={isSubmitting}
                className="text-[9px] px-1.5 py-0.5 border border-yellow-500/40 text-yellow-400 rounded hover:bg-yellow-500/10"
                title="Re-open investigation"
              >
                Re-open
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-slate-500 font-mono">
            Detected at {detection.timestamp ? new Date(detection.timestamp).toLocaleString() : '—'}
          </p>
          {statusMsg && (
            <span className="text-[10px] text-primary animate-pulse font-mono max-w-[55%] text-right">{statusMsg}</span>
          )}
        </div>
      </div>

      {/* Camera Snapshot */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto min-h-0">
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase text-slate-500">Camera Snapshot</h4>
          <div className="relative rounded border border-border-muted bg-slate-900 overflow-hidden aspect-video">
            {snapshotUrl ? (
              <img
                src={snapshotUrl}
                alt={detection.objectDetected}
                className="absolute inset-0 w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-500">
                <span className="material-symbols-outlined text-4xl mb-1 text-primary/60">videocam</span>
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 text-center px-4">
                  {rawSnapshot ? 'Snapshot unavailable' : 'No snapshot — new detections auto-capture frame'}
                </span>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-background-dark/80 px-2 py-1 rounded border border-border-muted z-10">
              <span className="text-[9px] font-mono uppercase text-slate-400">{detection.cameraSource}</span>
            </div>
            {/* Detection Overlay */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-primary/60 w-32 h-32 pointer-events-none z-10">
              <span className="absolute -top-5 left-0 bg-primary px-1.5 py-0.5">
                <span className="text-[8px] font-bold text-background-dark">{detection.objectDetected} [{formatConfidence(detection.confidence)}]</span>
              </span>
            </div>
          </div>
        </div>

        {/* Detection Details */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase text-slate-500">Detection Details</h4>
          <div className="bg-background-dark/40 border border-border-muted p-3 rounded space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500">Object Name:</span>
              <span className="text-xs font-bold text-slate-300">{detection.objectDetected}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500">Confidence:</span>
              <span className={`text-xs font-bold font-mono ${getConfidenceColor(detection.confidence)}`}>
                {formatConfidence(detection.confidence)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500">Time Detected:</span>
              <span className="text-xs font-mono text-slate-300">
                {detection.timestamp ? new Date(detection.timestamp).toLocaleString() : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500">Camera Source:</span>
              <span className="text-xs font-mono text-slate-300">{detection.cameraSource}</span>
            </div>
            {detection.distance_m && (
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500">Est. Depth/Distance:</span>
                <span className="text-xs font-mono text-primary font-bold">{detection.distance_m.toFixed(1)}m</span>
              </div>
            )}
            {detection.reviewNotes && (
              <div className="pt-2 border-t border-border-muted">
                <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Operator Notes:</span>
                <p className="text-[11px] text-slate-300 italic bg-slate-900/60 p-2 rounded border border-border-muted">
                  &quot;{detection.reviewNotes}&quot;
                </p>
              </div>
            )}
          </div>
        </div>

        {/* HITL Active Learning Status */}
        {hitlTotal !== null && (
          <div className="bg-slate-900/60 border border-border-muted rounded p-2.5 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">YOLO Active Learning</span>
              {trainingActive && (
                <span className="text-[9px] text-primary animate-pulse font-mono">⚙ TRAINING IN BACKGROUND…</span>
              )}
              {bestFeedbackReady && !trainingActive && (
                <span className="text-[9px] text-green-400 font-mono">✓ Fine-tuned weights ready</span>
              )}
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (hitlTotal / hitlThreshold) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] text-slate-400 font-mono">
              {hitlTotal}/{hitlThreshold} operator feedback samples
              {hitlTotal >= hitlThreshold ? ' — auto fine-tuning triggered ✓' : ` — ${hitlThreshold - hitlTotal} more to trigger fine-tune`}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase text-slate-500">Review Actions</h4>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleMarkFalsePositive}
              disabled={isSubmitting || normalizedStatus === 'falsepositive'}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 border text-[10px] font-bold uppercase rounded transition-all ${
                normalizedStatus === 'falsepositive'
                  ? 'bg-red-500/40 border-red-500 text-white cursor-default'
                  : 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30'
              }`}
            >
              <span className="material-symbols-outlined text-sm">close</span>
              False Positive
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting || normalizedStatus === 'confirmed'}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 border text-[10px] font-bold uppercase rounded transition-all ${
                normalizedStatus === 'confirmed'
                  ? 'bg-green-500/40 border-green-500 text-white cursor-default'
                  : 'bg-primary/20 border-primary/40 text-primary hover:bg-primary/30'
              }`}
            >
              <span className="material-symbols-outlined text-sm">check</span>
              Confirm Threat
            </button>
          </div>
        </div>

        {/* Note Editor Drawer */}
        {showNoteEditor && (
          <div className="p-3 bg-slate-900 border border-primary/30 rounded space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-primary">Enter Observation Note</span>
              <button
                type="button"
                onClick={() => setShowNoteEditor(false)}
                className="text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="E.g. Inspection confirmed training mine, no explosive threat..."
              rows={3}
              className="w-full bg-slate-950 border border-border-muted p-2 text-xs text-slate-200 rounded resize-none focus:outline-none focus:border-primary"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNoteEditor(false)}
                className="px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSubmitting}
                className="px-3 py-1 bg-primary text-background-dark font-bold text-[10px] rounded hover:brightness-110"
              >
                {isSubmitting ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-border-muted p-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowNoteEditor(prev => !prev)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-border-muted text-[10px] font-bold uppercase rounded hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">comment</span>
            {showNoteEditor ? 'Close Note' : 'Add Note'}
          </button>
          <button
            type="button"
            onClick={handleGenerateReport}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-background-dark text-[10px] font-bold uppercase rounded hover:brightness-110 transition-all"
          >
            <span className="material-symbols-outlined text-sm">description</span>
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetectionPreview;
