import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import AppShell from '../components/AppShell';
import DetectionRow from '../components/DetectionRow';
import DetectionPreview from '../components/DetectionPreview';
import { downloadDetectionsReport } from '../utils/exportDetectionsPdf';
import DetectionExportPreviewPopover from '../components/DetectionExportPreviewPopover';

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'http://localhost:5003/api/v1';

const DetectionRecords = () => {
  const location = useLocation();
  const [selectedDetection, setSelectedDetection] = useState(null);
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cameraFilter, setCameraFilter] = useState('All Cameras');
  const [threatFilter, setThreatFilter] = useState('All Threats');
  const [confidenceFilter, setConfidenceFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('Last 24h');
  const [showExportPreview, setShowExportPreview] = useState(false);

  // Handle incoming alert investigation navigation
  useEffect(() => {
    const targetAlert = location.state?.alert;
    const targetDetection = location.state?.detection;
    const targetDetectionId = location.state?.detectionId || location.state?.id;

    if (targetDetection) {
      setSelectedDetection(targetDetection);
      return;
    }

    if (targetAlert) {
      const dData = targetAlert.detectionData || {};
      const alertDet = {
        id: `ALT-${String(targetAlert._id || targetAlert.id || Date.now()).slice(-8).toUpperCase()}`,
        cameraSource: targetAlert.location || targetAlert.sector || 'CAM_SURVEILLANCE',
        objectDetected: dData.detectedObject || targetAlert.title?.replace('Alert:', '').trim() || 'SEA MINE',
        confidence: typeof targetAlert.confidence === 'number'
          ? (targetAlert.confidence <= 1 ? targetAlert.confidence * 100 : targetAlert.confidence)
          : 78.0,
        timestamp: targetAlert.createdAt || new Date(),
        status: 'investigating',
        threatStatus: 'DANGER',
        distance_m: typeof dData.distance_m === 'number' ? dData.distance_m : 5.4,
        modelsUsed: dData.modelsUsed || ['FUNIE-GAN', 'YOLOv8', 'MiDaS'],
        boundingBox: dData.boundingBox || null,
        snapshotPath: dData.snapshotPath || null,
        enhancedImage: dData.snapshotPath || null,
        reviewNotes: targetAlert.description || ''
      };

      setSelectedDetection(alertDet);
      setDetections((prev) => {
        if (!prev || prev.length === 0) return [alertDet];
        const exists = prev.some(d => d.id === alertDet.id);
        return exists ? prev : [alertDet, ...prev];
      });
    } else if (targetDetectionId && detections.length > 0) {
      const match = detections.find(d => String(d.id) === String(targetDetectionId) || String(d._id) === String(targetDetectionId));
      if (match) setSelectedDetection(match);
    }
  }, [location.state]);

  // Fetch detections from API
  const fetchDetections = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE.replace(/\/$/, '')}/detections`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const fetched = response.data.data ?? [];
      setDetections((prev) => {
        if (selectedDetection && !fetched.some(d => d.id === selectedDetection.id)) {
          return [selectedDetection, ...fetched];
        }
        return fetched;
      });
    } catch (err) {
      console.error('Error fetching detections:', err);
      setError('Failed to fetch detections from server');
      setDetections([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchDetections();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchDetections, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // Dynamic filter lists from detections and standard naval classes
  const cameraOptions = [
    'All Cameras',
    ...Array.from(new Set([
      'Local preview camera A',
      'Local preview camera B',
      'Patrol Stream North (YouTube)',
      'Patrol Stream South (YouTube)',
      'LAB_UPLOAD',
      ...detections.map(d => d.cameraSource).filter(Boolean)
    ]))
  ];

  const threatOptions = [
    'All Threats',
    ...Array.from(new Set([
      'SEA MINE',
      'SUBMERSIBLE',
      'DIVER / PERSONNEL',
      'UNDERWATER STRUCTURE',
      'MARINE DEBRIS',
      'MARINE LIFE',
      ...detections.map(d => d.objectDetected).filter(Boolean)
    ]))
  ];

  // Filter detections
  const filteredDetections = detections.filter(detection => {
    const matchesSearch = (detection.id ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (detection.objectDetected ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCamera = cameraFilter === 'All Cameras' || detection.cameraSource === cameraFilter;
    const matchesThreat = threatFilter === 'All Threats' || 
      String(detection.objectDetected || '').toUpperCase() === threatFilter.toUpperCase();
    
    const confVal = typeof detection.confidence === 'number'
      ? (detection.confidence <= 1 ? detection.confidence * 100 : detection.confidence)
      : 0;
    const matchesConfidence = confidenceFilter === 'All' || 
      (confidenceFilter === 'High' && confVal >= 85) ||
      (confidenceFilter === 'Medium' && confVal >= 65 && confVal < 85) ||
      (confidenceFilter === 'Low' && confVal < 65);
    
    return matchesSearch && matchesCamera && matchesThreat && matchesConfidence;
  });

  const buildExportFilterSummary = useCallback(() => {
    const parts = [
      `Camera: ${cameraFilter}`,
      `Threat: ${threatFilter}`,
      `Confidence: ${confidenceFilter}`,
      `Date range (UI): ${dateFilter}`,
    ];
    const q = searchQuery.trim();
    if (q) parts.push(`Search: "${q}"`);
    return parts.join(' · ');
  }, [cameraFilter, threatFilter, confidenceFilter, dateFilter, searchQuery]);

  const handleExportPdf = () => {
    downloadDetectionsReport(filteredDetections, buildExportFilterSummary());
  };

  return (
    <AppShell>
      <div className="flex flex-1 min-h-0 overflow-hidden flex-col">
        <main className="flex flex-1 grid grid-cols-12 overflow-hidden bg-background-dark/30 min-h-0">
          {/* Detection Table Section */}
          <section className="col-span-7 border-r border-border-muted bg-background-dark flex flex-col min-h-0 h-full overflow-hidden">
            {/* Header */}
            <div className="border-b border-border-muted p-4 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">DETECTION RECORDS</h2>
                  <p className="text-[10px] text-slate-500 mt-1">{filteredDetections.length.toLocaleString()} Records</p>
                </div>
                <div className="relative flex items-center gap-2">
                  <div
                    className="relative"
                    onMouseEnter={() => setShowExportPreview(true)}
                    onMouseLeave={() => setShowExportPreview(false)}
                  >
                    <button
                      type="button"
                      onClick={handleExportPdf}
                      className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary text-[10px] font-bold uppercase rounded text-primary hover:bg-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label="Download detection records as PDF"
                      aria-describedby="detection-export-preview-hint"
                    >
                      <span className="material-symbols-outlined text-sm" aria-hidden="true">download</span>
                      Export PDF
                    </button>
                    {showExportPreview && (
                      <DetectionExportPreviewPopover
                        rows={filteredDetections}
                        filterSummary={buildExportFilterSummary()}
                      />
                    )}
                  </div>
                  <span id="detection-export-preview-hint" className="sr-only">
                    Hover for a compact preview of the export layout. Click to download the PDF.
                  </span>
                </div>
              </div>

              {/* Filter Controls */}
              <div className="grid grid-cols-4 gap-2">
                <select 
                  value={cameraFilter}
                  onChange={(e) => setCameraFilter(e.target.value)}
                  className="bg-slate-800 border border-border-muted text-[10px] px-2 py-1.5 rounded text-slate-300 focus:outline-none focus:border-primary truncate"
                >
                  {cameraOptions.map((cam) => (
                    <option key={cam} value={cam}>{cam}</option>
                  ))}
                </select>
                <select 
                  value={threatFilter}
                  onChange={(e) => setThreatFilter(e.target.value)}
                  className="bg-slate-800 border border-border-muted text-[10px] px-2 py-1.5 rounded text-slate-300 focus:outline-none focus:border-primary truncate"
                >
                  {threatOptions.map((th) => (
                    <option key={th} value={th}>{th}</option>
                  ))}
                </select>
                <select 
                  value={confidenceFilter}
                  onChange={(e) => setConfidenceFilter(e.target.value)}
                  className="bg-slate-800 border border-border-muted text-[10px] px-2 py-1.5 rounded text-slate-300 focus:outline-none focus:border-primary"
                >
                  <option>All</option>
                  <option>High (85%+)</option>
                  <option>Medium (65-85%)</option>
                  <option>Low (&lt;65%)</option>
                </select>
                <select 
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-slate-800 border border-border-muted text-[10px] px-2 py-1.5 rounded text-slate-300 focus:outline-none focus:border-primary"
                >
                  <option>Last 24h</option>
                  <option>Last 7d</option>
                  <option>Last 30d</option>
                  <option>All Time</option>
                </select>
              </div>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-border-muted shrink-0">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-500 text-sm">search</span>
                <input
                  type="text"
                  placeholder="Search by ID or object type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800 border border-border-muted text-slate-100 pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Detection Table */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-4xl animate-spin text-primary mb-2">refresh</span>
                    <p className="text-sm text-slate-400">Loading detections...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-4xl text-red-400 mb-2">error</span>
                    <p className="text-sm text-red-400">{error}</p>
                    <button 
                      onClick={fetchDetections}
                      className="mt-4 px-4 py-2 bg-primary text-background-dark text-[10px] font-bold uppercase rounded hover:brightness-110"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="border-b border-border-muted">
                    <div className="grid grid-cols-6 gap-3 px-4 py-3 text-left text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                      <div>Detection ID</div>
                      <div>Camera Source</div>
                      <div>Object Detected</div>
                      <div>Confidence</div>
                      <div>Timestamp</div>
                      <div>Status</div>
                    </div>
                  </div>
                  <div className="divide-y divide-border-muted">
                    {filteredDetections.length === 0 ? (
                      <div className="flex items-center justify-center h-full py-8">
                        <div className="text-center">
                          <span className="material-symbols-outlined text-4xl text-slate-500 mb-2">search_off</span>
                          <p className="text-sm text-slate-500">No detections found</p>
                        </div>
                      </div>
                    ) : (
                      filteredDetections.map((detection) => (
                        <DetectionRow
                          key={detection.id}
                          detection={detection}
                          onSelect={() => setSelectedDetection(detection)}
                          isSelected={selectedDetection?.id === detection.id}
                        />
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Detection Preview Panel */}
          <section className="col-span-5 bg-background-dark flex flex-col min-h-0 h-full overflow-hidden">
            {selectedDetection ? (
              <DetectionPreview
                detection={selectedDetection}
                onUpdateDetection={(updated) => {
                  setSelectedDetection(updated);
                  setDetections((prev) =>
                    prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d))
                  );
                }}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <span className="material-symbols-outlined text-6xl mb-4">data_object</span>
                  <p className="text-sm">Select a detection to view details</p>
                </div>
              </div>
            )}
          </section>
        </main>

      <footer className="h-8 shrink-0 bg-background-dark border-t border-border-muted px-6 flex items-center justify-between">
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
            <span className="text-[9px] font-bold uppercase text-slate-500 tracking-tighter">System Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase text-slate-500 tracking-tighter">Latency: 12ms</span>
          </div>
        </div>
        <div className="text-[9px] font-mono text-slate-600 uppercase tracking-tighter">
          Session ID: MAS-8821-XRA-99
        </div>
      </footer>
      </div>
    </AppShell>
  );
};

export default DetectionRecords;
