import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import marineService from '../services/marineService';
import FeedVideoPlayer from '../components/FeedVideoPlayer';
import AppShell from '../components/AppShell';

function formatAgeMs(ms) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)} s`;
  return `${Math.round(ms / 60000)} m`;
}

function mapPanelSeverityToAlert(panelSeverity) {
  const u = String(panelSeverity || '').toUpperCase();
  if (u === 'CRITICAL') return 'critical';
  if (u === 'HIGH') return 'high';
  if (u === 'MEDIUM') return 'medium';
  return 'low';
}

const Surveillance = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [feeds, setFeeds] = useState([]);
  const [selectedFeed, setSelectedFeed] = useState(null);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [actionStatus, setActionStatus] = useState(null);
  const [markingRoi, setMarkingRoi] = useState(false);
  const [markCorner, setMarkCorner] = useState(null);
  const [raiseBusy, setRaiseBusy] = useState(false);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);

  const videoRef = useRef(null);
  const viewportRef = useRef(null);

  const formatDistance = (dist) => {
    if (dist == null || dist === '') return '—';
    const n = Number(dist);
    if (isNaN(n)) return '—';
    return `${n.toFixed(1)}m`;
  };

  const parseBoundingBox = (bbox) => {
    if (!bbox) return null;
    let x1, y1, x2, y2;
    if (Array.isArray(bbox) && bbox.length >= 4) {
      [x1, y1, x2, y2] = bbox;
    } else if (typeof bbox === 'object') {
      if ('x1' in bbox && 'y1' in bbox && 'x2' in bbox && 'y2' in bbox) {
        x1 = bbox.x1; y1 = bbox.y1; x2 = bbox.x2; y2 = bbox.y2;
      } else if ('x' in bbox && 'y' in bbox && 'width' in bbox && 'height' in bbox) {
        x1 = bbox.x; y1 = bbox.y; x2 = bbox.x + bbox.width; y2 = bbox.y + bbox.height;
      } else {
        return null;
      }
    } else {
      return null;
    }

    if (typeof x1 !== 'number' || typeof y1 !== 'number' || typeof x2 !== 'number' || typeof y2 !== 'number') {
      return null;
    }
    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return null;

    // Already normalized [0, 1]
    if (x1 <= 1 && y1 <= 1 && x2 <= 1 && y2 <= 1 && x2 > x1 && y2 > y1) {
      return {
        top: y1 * 100,
        left: x1 * 100,
        width: (x2 - x1) * 100,
        height: (y2 - y1) * 100,
      };
    }

    // Adaptive pixel normalization
    const refW = x2 > 600 ? 1280 : 596;
    const refH = y2 > 350 ? 720 : 336;
    const left = Math.max(0, Math.min(95, (x1 / refW) * 100));
    const top = Math.max(0, Math.min(95, (y1 / refH) * 100));
    const width = Math.max(3, Math.min(100 - left, ((x2 - x1) / refW) * 100));
    const height = Math.max(3, Math.min(100 - top, ((y2 - y1) / refH) * 100));
    return { top, left, width, height };
  };

  const selectedFeedId = searchParams.get('feed');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let feedsData;
        try {
          feedsData = await marineService.getActiveFeeds();
        } catch (err) {
          console.log('Using test feeds data');
          feedsData = await marineService.getTestActiveFeeds();
        }
        const feedsList = feedsData.data || [];
        setFeeds(feedsList);
        const paramId = new URLSearchParams(window.location.search).get('feed');
        if (!paramId && feedsList.length > 0) {
          setSearchParams({ feed: String(feedsList[0]._id) }, { replace: true });
        }
      } catch (err) {
        console.error('Failed to fetch feeds:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [setSearchParams]);

  useEffect(() => {
    if (!selectedFeedId) {
      setSelectedFeed(null);
      setRecentAlerts([]);
      return;
    }
    const idForApi = String(selectedFeedId);
    const fetchFeedDetails = async () => {
      try {
        setSelectedFeed(null);
        let feedDetails;
        try {
          feedDetails = await marineService.getSurveillanceMode(idForApi);
        } catch (err) {
          console.log('Using test surveillance data');
          feedDetails = await marineService.getTestSurveillanceMode(idForApi);
        }
        setSelectedFeed(feedDetails.data?.feed || null);
        setRecentAlerts(feedDetails.data?.recentAlerts || []);
      } catch (err) {
        console.error('Failed to fetch feed details:', err);
        setSelectedFeed(null);
        setRecentAlerts([]);
      }
    };
    fetchFeedDetails();
  }, [selectedFeedId]);

  useEffect(() => {
    if (!selectedFeed) return;
    const paused = selectedFeed.surveillance?.streamPaused;
    if (typeof paused === 'boolean') {
      setIsPaused(paused);
    }
  }, [selectedFeed]);

  const refreshAiAnalysis = useCallback(async () => {
    if (!selectedFeedId) return;
    try {
      setAnalysisLoading(true);
      setAnalysisError(null);
      const res = await marineService.getSurveillanceAiAnalysis(String(selectedFeedId));
      setAiAnalysis(res.data || null);
      if (res.data && typeof res.data.streamPaused === 'boolean') {
        setIsPaused(res.data.streamPaused);
      }
    } catch (e) {
      console.error(e);
      setAnalysisError(e.message || 'Could not load AI analysis');
      setAiAnalysis(null);
    } finally {
      setAnalysisLoading(false);
    }
  }, [selectedFeedId]);

  useEffect(() => {
    refreshAiAnalysis();
    const t = setInterval(refreshAiAnalysis, 5000); // Increased frequency for real-time feel
    return () => clearInterval(t);
  }, [refreshAiAnalysis]);

  const setStatus = (msg, isErr = false) => {
    setActionStatus({ msg, isErr });
    setTimeout(() => setActionStatus(null), 5000);
  };

  const handleCameraSelect = (feedId) => {
    setSearchParams({ feed: String(feedId) });
  };

  const handleReturnToGrid = () => {
    navigate('/dashboard');
  };

  const handleRaiseAlert = async () => {
    if (!selectedFeedId || !selectedFeed) return;
    const threatInfo = aiAnalysis?.threatAssessment;
    try {
      setRaiseBusy(true);
      const sev = mapPanelSeverityToAlert(threatInfo?.severity);
      const confBySev = { critical: 0.95, high: 0.88, medium: 0.78, low: 0.68 };
      const confidence = confBySev[sev] ?? 0.85;
      await marineService.createAlert({
        feedId: String(selectedFeedId),
        type: 'threat',
        confidence,
        severity: sev,
        title: `Operator alert — ${selectedFeed.title || 'Feed'}`,
        description: `Manual raise from surveillance. Context: ${threatInfo?.summary || 'n/a'}`,
        detectionData: {
          threat: true,
          detectedObject: 'operator_manual_raise',
          frameTimestamp: new Date().toISOString(),
        },
      });
      setStatus('Alert created; check system logs and dashboard.');
      refreshAiAnalysis();
    } catch (e) {
      setStatus(e.message || 'Could not create alert', true);
    } finally {
      setRaiseBusy(false);
    }
  };

  const handleResumePause = async () => {
    const next = !isPaused;
    setIsPaused(next);
    try {
      const res = await marineService.postSurveillanceStream(
        String(selectedFeedId),
        next ? 'pause' : 'resume'
      );
      if (typeof res.data?.streamPaused === 'boolean') {
        setIsPaused(res.data.streamPaused);
      }
      setStatus(
        next
          ? 'Stream paused for this camera (saved on server).'
          : 'Stream resumed for this camera (saved on server).'
      );
      refreshAiAnalysis();
    } catch (e) {
      setIsPaused(!next);
      setStatus(e.message || 'Stream action failed', true);
    }
  };

  const handleCaptureFrame = async () => {
    try {
      let snapshotHint = false;
      const cap = videoRef.current?.captureDataUrl?.();
      if (cap) snapshotHint = true;
      await marineService.postSurveillanceCapture(String(selectedFeedId), {
        snapshotHint,
      });
      setStatus(
        snapshotHint
          ? 'Capture recorded (snapshot taken from local video).'
          : 'Capture event logged (embed streams cannot grab frames in-browser).'
      );
      refreshAiAnalysis();
    } catch (e) {
      setStatus(e.message || 'Capture failed', true);
    }
  };

  const handleEnhanceFrame = async () => {
    try {
      const res = await marineService.postSurveillanceEnhanceFrame(String(selectedFeedId));
      const hint = res.data?.enhancementLabPath || '/enhancement-lab';
      setStatus(`${res.message || 'OK'} Open ${hint} to run the model on an image.`);
    } catch (e) {
      setStatus(e.message || 'Enhance request failed', true);
    }
  };

  const toggleMarkArea = () => {
    setMarkingRoi((m) => !m);
    setMarkCorner(null);
    setStatus(
      !markingRoi
        ? 'Click twice on the video to set opposite corners of the ROI.'
        : 'ROI marking cancelled.'
    );
  };

  const onViewportClick = async (e) => {
    if (!markingRoi || !viewportRef.current || !selectedFeedId) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const nx = clamp01((e.clientX - rect.left) / rect.width);
    const ny = clamp01((e.clientY - rect.top) / rect.height);
    if (!markCorner) {
      setMarkCorner({ x: nx, y: ny });
    } else {
      const x = Math.min(markCorner.x, nx);
      const y = Math.min(markCorner.y, ny);
      const w = Math.abs(nx - markCorner.x);
      const h = Math.abs(ny - markCorner.y);
      try {
        await marineService.postSurveillanceMarkArea(String(selectedFeedId), { x, y, w, h });
        setStatus('Marked region saved.');
        refreshAiAnalysis();
      } catch (err) {
        setStatus(err.message || 'Failed to save ROI', true);
      }
      setMarkingRoi(false);
      setMarkCorner(null);
    }
  };

  const env = aiAnalysis?.environmentQuality;
  const threat = aiAnalysis?.threatAssessment;
  const modelAct = aiAnalysis?.modelActivity;
  const detectedList = aiAnalysis?.detectedObjects || [];

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-0 flex-1 items-center justify-center bg-background-dark text-slate-100">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
            <p className="text-primary">Loading Surveillance Mode...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!selectedFeed) {
    return (
      <AppShell>
        <div className="flex min-h-0 flex-1 items-center justify-center bg-background-dark text-slate-100">
          <div className="text-center">
            <div className="mb-4 text-6xl text-red-500">⚠️</div>
            <p className="mb-4 text-xl">Feed not found</p>
            <button
              type="button"
              onClick={handleReturnToGrid}
              className="rounded bg-primary px-6 py-2 text-background-dark transition-colors hover:bg-primary/80"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background-dark font-display text-slate-100">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-primary/30 bg-background-dark px-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl text-primary">videocam</span>
              <h1 className="text-lg font-bold uppercase tracking-wider">
                Camera: {selectedFeed.title || 'Loading...'}
              </h1>
            </div>
            <div className="h-4 w-px bg-primary/30"></div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary"></span>
              <span className="text-sm font-bold tracking-widest text-primary">LIVE STREAM</span>
            </div>
          </div>
          {actionStatus && (
            <div
              className={`max-w-md truncate text-[10px] ${actionStatus.isErr ? 'text-red-400' : 'text-primary'}`}
            >
              {actionStatus.msg}
            </div>
          )}
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="flex w-20 shrink-0 flex-col items-center gap-4 border-r border-primary/20 bg-background-dark/50 py-4">
            {feeds.map((feed) => (
              <button
                type="button"
                key={feed._id}
                onClick={() => handleCameraSelect(feed._id)}
                className={`group relative flex h-12 w-12 cursor-pointer items-center justify-center border hover:border-primary/40 ${
                  String(selectedFeedId) === String(feed._id)
                    ? 'border-primary bg-primary/10'
                    : 'border-primary/10'
                }`}
                aria-label={`Select camera ${feed.title}`}
              >
                <span
                  className={`material-symbols-outlined text-lg ${
                    String(selectedFeedId) === String(feed._id) ? 'text-primary' : 'text-slate-500'
                  }`}
                >
                  videocam
                </span>
                {feed.activeAlerts > 0 && (
                  <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-red-500"></span>
                )}
              </button>
            ))}
          </aside>

          <main className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden bg-black/95 p-2 sm:p-4">
            <div
              ref={viewportRef}
              className={`relative aspect-video w-full max-w-full max-h-full overflow-hidden border border-primary/40 bg-[#080c14] shadow-2xl flex items-center justify-center ${
                markingRoi ? 'ring-2 ring-primary/50' : ''
              }`}
              style={{
                aspectRatio: '16 / 9',
                maxWidth: '100%',
                maxHeight: '100%',
              }}
            >
              {selectedFeed.url ? (
                <FeedVideoPlayer
                  ref={videoRef}
                  key={selectedFeedId}
                  url={selectedFeed.url}
                  title={selectedFeed.title || 'Surveillance'}
                  className="pointer-events-auto h-full w-full object-contain"
                  iframeSandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  paused={isPaused}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-900">
                  <p className="text-xl">No video feed available</p>
                </div>
              )}

              {markingRoi && (
                <button
                  type="button"
                  className="absolute inset-0 z-20 cursor-crosshair bg-transparent"
                  aria-label="Click twice to define region corners"
                  onClick={onViewportClick}
                />
              )}

              {markCorner && markingRoi && (
                <div
                  className="pointer-events-none absolute z-30 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-primary/80"
                  style={{
                    left: `${markCorner.x * 100}%`,
                    top: `${markCorner.y * 100}%`,
                  }}
                />
              )}

              {/* Live recording indicator */}
              <div className="pointer-events-none absolute left-3 top-3 sm:left-4 sm:top-4 z-20 flex items-center gap-2 border border-primary/40 bg-black/70 px-2.5 py-1 backdrop-blur-sm rounded-sm">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                <span className="text-[10px] font-bold tracking-[0.2em] text-primary">REC</span>
              </div>

              {/* Live bounding boxes: only active alerts from the last 20 seconds */}
              {showBoundingBoxes && recentAlerts.filter((alert) => {
                if (!alert.createdAt) return false;
                const age = Date.now() - new Date(alert.createdAt).getTime();
                return age < 20000;
              }).map((alert) => {
                const box = parseBoundingBox(alert.detectionData?.boundingBox);
                if (!box) return null;
                const severity = (alert.severity || 'medium').toLowerCase();
                const rawName = String(alert.detectionData?.detectedObject || alert.title || 'OBJECT');
                const isMine = rawName.toUpperCase().includes('MINE');
                const isThreat = isMine || rawName.toUpperCase().includes('SUB') || rawName.toUpperCase().includes('DIVER') || severity === 'critical';

                return (
                  <div
                    key={alert._id}
                    className={`pointer-events-none absolute border-2 transition-all duration-300 z-10 ${
                      isThreat
                        ? 'border-red-500 bg-red-500/15 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                        : severity === 'high'
                          ? 'border-amber-400 bg-amber-400/15 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                          : 'border-primary bg-primary/10 shadow-[0_0_8px_rgba(0,212,255,0.3)]'
                    }`}
                    style={{
                      top: `${box.top}%`,
                      left: `${box.left}%`,
                      width: `${box.width}%`,
                      height: `${box.height}%`,
                    }}
                  >
                    <div
                      className={`absolute -top-5 left-0 px-1.5 py-0.5 whitespace-nowrap text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow rounded-xs ${
                        isThreat
                          ? 'bg-red-500 text-white'
                          : severity === 'high'
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-primary text-slate-950'
                      }`}
                    >
                      <span>{rawName}</span>
                      {alert.confidence != null && (
                        <span className="font-mono">
                          {Math.round(alert.confidence > 1 ? alert.confidence : alert.confidence * 100)}%
                        </span>
                      )}
                      {alert.detectionData?.distance_m != null && (
                        <span className="border-l border-current/30 pl-1 font-mono">
                          {formatDistance(alert.detectionData.distance_m)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </main>

          <aside className="flex w-72 sm:w-80 shrink-0 flex-col overflow-hidden border-l border-primary/20 bg-background-dark">
            <div className="border-b border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-primary">
                  AI Analysis
                </h2>
                <button
                  type="button"
                  onClick={refreshAiAnalysis}
                  className="text-[10px] uppercase font-bold text-slate-400 hover:text-primary transition-colors"
                >
                  Refresh
                </button>
              </div>
              {analysisLoading && (
                <p className="mt-1 text-[10px] text-slate-500">Updating…</p>
              )}
              {analysisError && (
                <p className="mt-1 text-[10px] text-amber-400">{analysisError}</p>
              )}
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              <section>
                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-dim">
                  Environment Quality
                </h3>
                {!env ? (
                  <p className="text-xs text-slate-500">No data</p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="mb-1 flex justify-between text-xs">
                        <span>Visibility</span>
                        <span className="text-primary font-bold">{env.visibility}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-500"
                          style={{ width: `${env.visibility}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="border border-primary/20 bg-primary/5 p-2 rounded-sm">
                        <p className="text-[9px] uppercase text-dim">Turbidity</p>
                        <p className="text-xs font-bold text-primary">{env.turbidity}</p>
                      </div>
                      <div className="border border-primary/20 bg-primary/5 p-2 rounded-sm">
                        <p className="text-[9px] uppercase text-dim">Light pen.</p>
                        <p className="text-xs font-bold text-primary">{env.lightPenetration}</p>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-dim">
                  Detected objects
                </h3>
                {detectedList.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-500">No alert-linked objects</p>
                ) : (
                  <div className="space-y-2">
                    {detectedList.map((obj) => (
                      <div
                        key={obj.id}
                        className="flex flex-col border border-primary/20 bg-primary/5 p-2.5 hover:bg-primary/10 transition-colors gap-1 rounded-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${
                            obj.name.toUpperCase().includes('MINE') 
                              ? 'text-red-400' 
                              : obj.name.toUpperCase().includes('DIVER') || obj.name.toUpperCase().includes('SUB') 
                                ? 'text-amber-400' 
                                : 'text-slate-100'
                          }`}>
                            {obj.name}
                          </span>
                          <span className="font-mono text-xs text-primary font-bold">{obj.confidencePct}%</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono">
                          <span>Dist: <strong className="text-slate-200">{formatDistance(obj.distance_m)}</strong></span>
                          <span>Time: {obj.timestamp ? new Date(obj.timestamp).toLocaleTimeString() : '—'}</span>
                        </div>
                        {Array.isArray(obj.models) && obj.models.length > 0 && (
                          <div className="text-[8px] text-slate-500 uppercase tracking-tighter mt-1 border-t border-primary/10 pt-1 font-mono">
                            Analyzed by: <span className="text-primary font-semibold">{obj.models.join(' + ')}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-dim">
                  Threat assessment
                </h3>
                <div className="border border-primary/30 bg-primary/5 p-3 rounded-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="border border-primary/40 bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {threat?.severity || '—'}
                    </span>
                    <span className="text-[10px] font-bold uppercase">Severity</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    {threat?.summary || 'Analysis loading from server…'}
                  </p>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-dim">
                  Model activity
                </h3>
                <div className="space-y-2 font-mono text-[10px]">
                  <div className="flex items-center justify-between py-1 border-b border-primary/10">
                    <span className="uppercase text-dim">Enhancement (FUNIE-GAN)</span>
                    <span className="font-bold text-primary">ACTIVE</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-primary/10">
                    <span className="uppercase text-dim">Detection (YOLOv8)</span>
                    <span className="font-bold text-primary">ACTIVE</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-primary/10">
                    <span className="uppercase text-dim">Depth Sensor (MiDaS)</span>
                    <span className="font-bold text-emerald-400 font-mono">OPERATIONAL</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="uppercase text-dim">Last detection Δ</span>
                    <span className="text-primary">
                      {formatAgeMs(modelAct?.lastDetectionAgeMs)}
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </aside>
        </div>

        <footer className="flex h-14 sm:h-16 shrink-0 items-center justify-between border-t border-primary/30 bg-background-dark/95 px-4 z-20 backdrop-blur-sm">
          <div
            role="toolbar"
            aria-label="Stream controls"
            className="flex flex-wrap items-center gap-2"
          >
            <button
              type="button"
              onClick={handleResumePause}
              aria-label={isPaused ? 'Resume stream' : 'Pause stream'}
              className="flex h-9 sm:h-10 items-center gap-1.5 sm:gap-2 border border-primary/30 px-3 sm:px-4 text-xs font-bold uppercase hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
            >
              <span className="material-symbols-outlined text-sm">
                {isPaused ? 'play_arrow' : 'pause'}
              </span>
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>
            <button
              type="button"
              onClick={handleCaptureFrame}
              aria-label="Capture frame from stream"
              className="flex h-9 sm:h-10 items-center gap-1.5 sm:gap-2 border border-primary/30 px-3 sm:px-4 text-xs font-bold uppercase hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
            >
              <span className="material-symbols-outlined text-sm">photo_camera</span>
              <span>Capture</span>
            </button>
            <button
              type="button"
              onClick={handleEnhanceFrame}
              aria-label="Request frame enhancement"
              className="flex h-9 sm:h-10 items-center gap-1.5 sm:gap-2 border border-primary/30 px-3 sm:px-4 text-xs font-bold uppercase hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
            >
              <span className="material-symbols-outlined text-sm">hdr_strong</span>
              <span>Enhance</span>
            </button>
            <button
              type="button"
              onClick={toggleMarkArea}
              aria-pressed={markingRoi}
              aria-label={
                markingRoi ? 'Cancel marking region on video' : 'Mark region of interest on video'
              }
              className={`flex h-9 sm:h-10 items-center gap-1.5 sm:gap-2 border px-3 sm:px-4 text-xs font-bold uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors ${
                markingRoi
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-primary/30 hover:bg-primary/10'
              }`}
            >
              <span className="material-symbols-outlined text-sm">edit_square</span>
              <span>Mark ROI</span>
            </button>
            <button
              type="button"
              onClick={() => setShowBoundingBoxes((v) => !v)}
              aria-label="Toggle bounding boxes on video"
              className={`flex h-9 sm:h-10 items-center gap-1.5 sm:gap-2 border px-3 sm:px-4 text-xs font-bold uppercase transition-colors ${
                showBoundingBoxes
                  ? 'border-primary/60 bg-primary/20 text-primary shadow-[0_0_8px_rgba(0,212,255,0.2)]'
                  : 'border-primary/20 text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {showBoundingBoxes ? 'visibility' : 'visibility_off'}
              </span>
              <span>Boxes {showBoundingBoxes ? 'ON' : 'OFF'}</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRaiseAlert}
              disabled={raiseBusy}
              aria-busy={raiseBusy}
              className="flex h-9 sm:h-10 items-center gap-1.5 sm:gap-2 bg-primary px-4 sm:px-6 text-xs font-black uppercase text-background-dark disabled:opacity-50 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-sm">warning</span>
              <span>{raiseBusy ? 'Sending…' : 'Raise alert'}</span>
            </button>
            <button
              type="button"
              onClick={handleReturnToGrid}
              className="flex h-9 sm:h-10 items-center border border-primary/30 px-3 sm:px-4 text-xs font-bold uppercase hover:bg-primary/10 transition-colors"
            >
              Grid view
            </button>
          </div>
        </footer>
      </div>
    </AppShell>
  );
};

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

export default Surveillance;
