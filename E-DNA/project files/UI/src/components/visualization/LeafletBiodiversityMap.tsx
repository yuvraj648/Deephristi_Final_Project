// ========================================================
// DEEPDRISHTI LEAFLET BIODIVERSITY MAP
// High-performance interactive nautical Leaflet map for Biodiversity Map page.
// 100% Free layers: Google Hybrid, NOAA NCEI Bathymetry, Nautical Dark Chart,
// Google Terrain, OpenStreetMap.
// Proportional station markers with live biological telemetry.
// Synchronized with AnalysisContext (selectedSiteId, activeDrawer).
// ========================================================

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAnalysis } from '../../context/AnalysisContext';
import type { MapMetricType } from './HydrographicMap';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Compass,
  Maximize2,
  Minimize2,
  Anchor,
  Navigation,
  Waves,
} from 'lucide-react';

type LayerKey = 'esriOcean' | 'noaaGebco' | 'googleHybrid' | 'googleTerrain' | 'osm';

interface LayerCfg {
  name: string;
  badge: string;
  description: string;
  url: string;
  subUrl?: string;
  attribution: string;
  maxZoom: number;
}

const LAYERS: Record<LayerKey, LayerCfg> = {
  esriOcean: {
    name: 'Nautical Dark Hydrographic Chart',
    badge: 'TACTICAL NAVY • FREE',
    description: 'Muted dark hydrographic chart designed for underwater surveillance with seamount & trench labels',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
    subUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri, GEBCO, NOAA',
    maxZoom: 16,
  },
  noaaGebco: {
    name: 'NOAA NCEI Bathymetric Relief (Official Portal)',
    badge: 'NOAA NCEI • FREE',
    description: 'Official multi-color bathymetric depth relief used by the NOAA NCEI Bathymetry Map portal',
    url: 'https://tiles.arcgis.com/tiles/C8EMgrsFcRFL6LrL/arcgis/rest/services/GEBCO_basemap_NCEI/MapServer/tile/{z}/{y}/{x}',
    subUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Bathymetry © NOAA NCEI, GEBCO',
    maxZoom: 16,
  },
  googleHybrid: {
    name: 'Google Hybrid / Optical Satellite',
    badge: 'SATELLITE • FREE',
    description: 'High-resolution true optical satellite showing real ocean waters, coral atolls, ports & coastlines',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: 'Imagery © Google',
    maxZoom: 20,
  },
  googleTerrain: {
    name: 'Google Physical Ocean & Terrain',
    badge: 'RELIEF • FREE',
    description: 'Topographic land elevation & ocean coastal bathymetry depth gradients',
    url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    attribution: 'Map © Google',
    maxZoom: 20,
  },
  osm: {
    name: 'OpenStreetMap Hydrographic',
    badge: 'OPEN SOURCE',
    description: 'Global crowdsourced hydrographic water bodies and navigational coastlines',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  },
};

const OCEAN_PRESETS = [
  { name: 'Lakshadweep Reefs', lat: 10.56, lng: 72.64, zoom: 9 },
  { name: 'Kochi & Malabar Coast', lat: 9.93, lng: 76.26, zoom: 10 },
  { name: 'Goa Coastal Shelf', lat: 15.35, lng: 73.7, zoom: 10 },
  { name: 'Mumbai Offshore Basin', lat: 18.9, lng: 72.4, zoom: 8 },
  { name: 'Eastern Arabian Sea Transect', lat: 14.5, lng: 69.5, zoom: 7 },
  { name: 'Gulf of Mannar', lat: 9.0, lng: 79.0, zoom: 9 },
  { name: 'Andaman Coral Archipelago', lat: 11.7, lng: 92.7, zoom: 9 },
  { name: 'Bay of Bengal Deep Basin', lat: 14.0, lng: 86.5, zoom: 6 },
];

const OCEAN_RAMP = [
  '#0369A1',
  '#0284C7',
  '#0EA5E9',
  '#38BDF8',
  '#00D4FF',
  '#34D399',
  '#A7F3D0',
];

function getRampColor(ratio: number): string {
  const idx = Math.min(OCEAN_RAMP.length - 1, Math.max(0, Math.floor(ratio * OCEAN_RAMP.length)));
  return OCEAN_RAMP[idx];
}

interface LeafletBiodiversityMapProps {
  height?: string;
  selectedMetric: MapMetricType;
  showContours: boolean;
}

export const LeafletBiodiversityMap: React.FC<LeafletBiodiversityMapProps> = ({
  height = 'h-[520px]',
  selectedMetric,
  showContours,
}) => {
  const { siteProfiles, setSelectedSiteId, setActiveDrawer, selectedSiteId, expedition } = useAnalysis();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const subLayerRef = useRef<L.TileLayer | null>(null);
  const seamarkRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const transectLineRef = useRef<L.Polyline | null>(null);

  const [activeLayer, setActiveLayer] = useState<LayerKey>('esriOcean');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTransect, setShowTransect] = useState(true);

  // Filter sites with coordinates or provide automatic regional transect positioning
  const displaySites = useMemo(() => {
    const hasAnyCoords = siteProfiles.some((s) => s.latitude !== undefined && s.longitude !== undefined);
    if (hasAnyCoords && siteProfiles.every((s) => s.latitude !== undefined && s.longitude !== undefined)) {
      return siteProfiles;
    }

    const count = siteProfiles.length;
    if (count === 0) return [];

    let startLat = 15.0;
    let endLat = 19.5;
    let startLng = 68.5;
    let endLng = 72.8;

    const reg = (expedition?.region || '').toLowerCase();
    if (reg.includes('bengal')) {
      startLat = 13.0; endLat = 18.5; startLng = 82.0; endLng = 88.0;
    } else if (reg.includes('lakshadweep') || reg.includes('coral') || reg.includes('atoll')) {
      startLat = 10.0; endLat = 12.0; startLng = 71.8; endLng = 73.2;
    } else if (reg.includes('deep sea') || reg.includes('ridge')) {
      startLat = -25.0; endLat = -18.0; startLng = 69.0; endLng = 71.0;
    } else if (reg.includes('monterey') || reg.includes('pacific')) {
      startLat = 36.6; endLat = 36.9; startLng = -122.4; endLng = -121.8;
    }

    return siteProfiles.map((s, idx) => {
      if (s.latitude !== undefined && s.longitude !== undefined) return s;
      const frac = count > 1 ? idx / (count - 1) : 0.5;
      const lat = Number((startLat + frac * (endLat - startLat)).toFixed(4));
      const lng = Number((startLng + frac * (endLng - startLng)).toFixed(4));
      return {
        ...s,
        latitude: lat,
        longitude: lng,
      };
    });
  }, [siteProfiles, expedition]);

  // Compute metric values
  const metricValues = useMemo(() => {
    return displaySites.map((s) => {
      let v = 0;
      if (selectedMetric === 'taxaRichness') v = s.taxaCount;
      else if (selectedMetric === 'shannon') v = s.shannon;
      else if (selectedMetric === 'simpson') v = s.simpson;
      else if (selectedMetric === 'asvRichness') v = s.asvCount;
      else if (selectedMetric === 'abundance') v = s.totalAbundance;
      else if (selectedMetric === 'divergent') v = s.divergentGroupCount;
      return { site: s.site, val: v };
    });
  }, [displaySites, selectedMetric]);

  const maxVal = Math.max(...metricValues.map((m) => m.val), 1);
  const minVal = Math.min(...metricValues.map((m) => m.val), 0);

  // Initialize Map
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const initialCenter: [number, number] = displaySites.length > 0
      ? [displaySites[0].latitude!, displaySites[0].longitude!]
      : [14.5, 72.5];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 6,
      zoomControl: false,
      attributionControl: true,
    });

    const cfg = LAYERS[activeLayer];
    const base = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
      crossOrigin: true,
    });
    base.addTo(map);
    baseLayerRef.current = base;

    if (cfg.subUrl) {
      const sub = L.tileLayer(cfg.subUrl, {
        maxZoom: cfg.maxZoom,
        opacity: 0.9,
        crossOrigin: true,
      });
      sub.addTo(map);
      subLayerRef.current = sub;
    }

    // OpenSeaMap Maritime Seamarks
    const seamarks = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
      opacity: 0.85,
      maxZoom: 18,
      attribution: 'Seamarks © OpenSeaMap',
    });
    if (showContours) seamarks.addTo(map);
    seamarkRef.current = seamarks;

    // Markers and Transect Groups
    const mg = L.layerGroup().addTo(map);
    markersRef.current = mg;

    const polyline = L.polyline([], {
      color: '#00D4FF',
      weight: 2,
      opacity: 0.75,
      dashArray: '6, 6',
    }).addTo(map);
    transectLineRef.current = polyline;

    map.on('mousemove', (e) => {
      setLiveCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    map.on('mouseout', () => setLiveCoords(null));

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Layer Switching
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (baseLayerRef.current) {
      map.removeLayer(baseLayerRef.current);
    }
    if (subLayerRef.current) {
      map.removeLayer(subLayerRef.current);
      subLayerRef.current = null;
    }

    const cfg = LAYERS[activeLayer];
    const base = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
      crossOrigin: true,
    });
    base.addTo(map);
    baseLayerRef.current = base;

    if (cfg.subUrl) {
      const sub = L.tileLayer(cfg.subUrl, {
        maxZoom: cfg.maxZoom,
        opacity: 0.9,
        crossOrigin: true,
      });
      sub.addTo(map);
      subLayerRef.current = sub;
    }

    seamarkRef.current?.bringToFront();
    transectLineRef.current?.bringToFront();
  }, [activeLayer]);

  // Handle Seamarks Toggle
  useEffect(() => {
    const map = mapRef.current;
    const sm = seamarkRef.current;
    if (!map || !sm) return;
    if (showContours) {
      if (!map.hasLayer(sm)) sm.addTo(map);
      sm.bringToFront();
    } else {
      if (map.hasLayer(sm)) map.removeLayer(sm);
    }
  }, [showContours]);

  // Redraw Markers and Transect
  useEffect(() => {
    const map = mapRef.current;
    const mg = markersRef.current;
    const polyline = transectLineRef.current;
    if (!map || !mg || !polyline) return;

    mg.clearLayers();

    const latlngs: [number, number][] = [];

    displaySites.forEach((site, index) => {
      const lat = site.latitude!;
      const lng = site.longitude!;
      latlngs.push([lat, lng]);

      const mv = metricValues.find((m) => m.site === site.site);
      const val = mv ? mv.val : 0;
      const ratio = maxVal > minVal ? (val - minVal) / (maxVal - minVal) : 0.5;
      const color = selectedMetric === 'divergent'
        ? (val > 0 ? '#C084FC' : '#1E3550')
        : getRampColor(ratio);
      const radius = 10 + ratio * 16;
      const isSelected = selectedSiteId === site.site || selectedSiteId === site.site.split(' - ')[0];

      // Proportional Circle Marker with Station Pin Visuals
      const marker = L.circleMarker([lat, lng], {
        radius: isSelected ? radius + 5 : radius,
        fillColor: color,
        color: isSelected ? '#FFFFFF' : '#040910',
        weight: isSelected ? 3 : 1.5,
        fillOpacity: isSelected ? 1 : 0.88,
        opacity: 1,
        className: 'leaflet-bio-marker cursor-pointer',
      });

      const valLabel =
        typeof val === 'number' && !Number.isInteger(val)
          ? val.toFixed(2)
          : val.toLocaleString();

      const popupHtml = `
        <div style="font-family:monospace;font-size:12px;color:#060B13;padding:4px;min-width:180px;">
          <div style="font-weight:700;font-size:13px;border-bottom:1px solid #CBD5E1;padding-bottom:4px;margin-bottom:6px;color:#0F172A;">
            📍 ${site.site}
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span style="color:#64748B;">GPS:</span>
            <span style="font-weight:600;">${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span style="color:#64748B;">${selectedMetric}:</span>
            <span style="font-weight:700;color:#0284C7;">${valLabel}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span style="color:#64748B;">ASVs:</span>
            <span style="font-weight:600;">${site.asvCount}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span style="color:#64748B;">Taxa:</span>
            <span style="font-weight:600;">${site.taxaCount}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="color:#64748B;">Reads:</span>
            <span style="font-weight:600;">${site.totalAbundance.toLocaleString()}</span>
          </div>
          <div style="font-size:10px;text-align:center;color:#0284C7;background:#F0F9FF;padding:4px;border-radius:4px;border:1px solid #BAE6FD;">
            Click to inspect biological dossier →
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 240 });

      // Station number tooltip
      marker.bindTooltip(`Station ${index + 1}: ${site.site.split(' - ')[0]} (${valLabel})`, {
        permanent: false,
        direction: 'top',
        className: 'leaflet-bio-tooltip',
      });

      marker.on('click', () => {
        setSelectedSiteId(site.site);
        setActiveDrawer({ type: 'site', id: site.site });
      });

      mg.addLayer(marker);
    });

    // Update transect line
    if (showTransect && latlngs.length > 1) {
      polyline.setLatLngs(latlngs);
    } else {
      polyline.setLatLngs([]);
    }
  }, [displaySites, metricValues, selectedSiteId, selectedMetric, showTransect, setSelectedSiteId, setActiveDrawer, maxVal, minVal]);

  // Recenter handler
  const handleRecenter = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (displaySites.length > 0) {
      const latlngs = displaySites.map((s) => [s.latitude!, s.longitude!] as [number, number]);
      map.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50], maxZoom: 10 });
    } else {
      map.setView([14.5, 72.5], 6);
    }
  }, [displaySites]);

  // Jump to preset
  const handleJumpToPreset = (lat: number, lng: number, zoom: number) => {
    mapRef.current?.flyTo([lat, lng], zoom, { duration: 1.2 });
  };

  return (
    <div
      className={`relative bg-[#06101E] border border-rule-strong rounded-plate overflow-hidden flex flex-col ${
        isExpanded ? 'fixed inset-4 z-50 shadow-2xl h-auto' : height
      }`}
    >
      {/* Top Map Control Strip */}
      <div className="relative z-[500] flex flex-wrap items-center justify-between px-3 py-2 bg-[#060B13]/95 border-b border-rule text-[11px] font-mono gap-2">
        {/* Left: Layer Selector & Toggles */}
        <div className="flex items-center gap-2">
          {/* Layer Menu Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLayerMenu((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-paper/15 border border-rule hover:border-survey text-ink rounded-control transition-colors"
            >
              <Layers size={13} className="text-survey" />
              <span className="font-medium max-w-[170px] truncate">{LAYERS[activeLayer].name}</span>
              <span className="text-[10px] text-ink-faint">▾</span>
            </button>

            {/* Layer Dropdown */}
            {showLayerMenu && (
              <div className="absolute top-full left-0 mt-1 w-80 bg-[#060B13] border border-rule-strong rounded-plate shadow-floating z-[1000] overflow-hidden">
                <div className="px-3 py-2 border-b border-rule bg-paper-sunk text-[10px] uppercase tracking-wider text-ink-faint">
                  Select Oceanic / Bathymetric Basemap
                </div>
                {(Object.keys(LAYERS) as LayerKey[]).map((key) => {
                  const cfg = LAYERS[key];
                  const isCur = activeLayer === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setActiveLayer(key);
                        setShowLayerMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 border-b border-rule/30 transition-colors flex items-start justify-between gap-2 ${
                        isCur ? 'bg-survey/15 border-l-2 border-l-survey' : 'hover:bg-paper/10'
                      }`}
                    >
                      <div>
                        <div className={`font-mono text-[12px] font-medium ${isCur ? 'text-survey' : 'text-ink'}`}>
                          {cfg.name}
                        </div>
                        <div className="text-[10px] text-ink-muted leading-tight mt-0.5 line-clamp-1">
                          {cfg.description}
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-ink-faint uppercase px-1.5 py-0.5 rounded bg-paper-sunk whitespace-nowrap mt-0.5">
                        {cfg.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Transect line toggle */}
          <button
            type="button"
            onClick={() => setShowTransect((v) => !v)}
            className={`px-2 py-1 rounded-control border text-[11px] font-mono transition-colors flex items-center gap-1 ${
              showTransect
                ? 'bg-survey/20 border-survey text-survey'
                : 'bg-paper/10 border-rule text-ink-faint hover:text-ink'
            }`}
          >
            <Navigation size={11} />
            <span>Transect</span>
          </button>

          {/* Recenter Button */}
          <button
            type="button"
            onClick={handleRecenter}
            className="px-2 py-1 bg-paper/15 border border-rule hover:border-survey text-ink rounded-control text-[11px] font-mono transition-colors flex items-center gap-1"
            title="Recenter view on plotted stations"
          >
            <Compass size={11} className="text-survey" />
            <span>Recenter</span>
          </button>
        </div>

        {/* Right: Quick Jump Presets & Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Quick Jump Bar */}
          <div className="hidden xl:flex items-center gap-1 text-[10px] text-ink-faint">
            <span className="uppercase">Jump:</span>
            {OCEAN_PRESETS.slice(0, 4).map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleJumpToPreset(p.lat, p.lng, p.zoom)}
                className="px-1.5 py-0.5 rounded bg-paper/10 hover:bg-survey/20 hover:text-survey text-ink-muted transition-colors truncate max-w-[90px]"
                title={p.name}
              >
                {p.name.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Fullscreen Expand Button */}
          <button
            type="button"
            onClick={() => {
              setIsExpanded((v) => !v);
              setTimeout(() => mapRef.current?.invalidateSize(), 200);
            }}
            className="p-1 rounded bg-paper/15 border border-rule text-ink hover:text-survey transition-colors"
            title={isExpanded ? 'Exit full screen' : 'Full screen view'}
          >
            {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Main Map Container */}
      <div
        ref={mapContainerRef}
        className="flex-1 w-full h-full cursor-crosshair"
        style={{ minHeight: '380px', background: '#06101E' }}
        onClick={() => showLayerMenu && setShowLayerMenu(false)}
      />

      {/* Bottom Telemetry & Metric Scale Bar */}
      <div className="relative z-[500] px-3 py-1.5 bg-[#060B13]/95 border-t border-rule flex flex-wrap items-center justify-between text-[11px] font-mono gap-2">
        {/* Live Cursor Readout */}
        <div className="flex items-center gap-3">
          <span className="text-ink-faint">
            {liveCoords ? (
              <span className="tabular-nums">
                LAT: <strong className="text-ink">{liveCoords.lat.toFixed(4)}°N</strong> &nbsp;
                LNG: <strong className="text-ink">{liveCoords.lng.toFixed(4)}°E</strong>
              </span>
            ) : (
              <span>Move cursor over ocean to inspect coordinates</span>
            )}
          </span>
          <span className="text-ink-faint">|</span>
          <span className="text-survey font-medium">
            {displaySites.length} of {siteProfiles.length} Stations Plotted
          </span>
        </div>

        {/* Dynamic Metric Ramp Legend */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-ink-faint uppercase tracking-wider">
            {selectedMetric === 'taxaRichness' && 'Observed Taxa:'}
            {selectedMetric === 'shannon' && "Shannon (H'):"}
            {selectedMetric === 'simpson' && 'Simpson (1-D):'}
            {selectedMetric === 'asvRichness' && 'ASV Count:'}
            {selectedMetric === 'abundance' && 'Sequenced Reads:'}
            {selectedMetric === 'divergent' && 'Divergent Taxa:'}
          </span>
          <span className="text-[10px] text-ink-muted tabular-nums">
            {typeof minVal === 'number' && !Number.isInteger(minVal) ? minVal.toFixed(2) : minVal.toLocaleString()}
          </span>
          <div className="flex h-2.5 w-28 rounded-control overflow-hidden border border-rule/60">
            {OCEAN_RAMP.map((c, i) => (
              <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
            ))}
          </div>
          <span className="text-[10px] text-ink font-semibold tabular-nums">
            {typeof maxVal === 'number' && !Number.isInteger(maxVal) ? maxVal.toFixed(2) : maxVal.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Global CSS fixes for Leaflet in dark mode */}
      <style>{`
        .leaflet-tile {
          background-color: transparent !important;
        }
        .leaflet-bio-marker {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .leaflet-bio-tooltip {
          background: #060B13 !important;
          color: #E2E8F0 !important;
          border: 1px solid #1E293B !important;
          border-radius: 4px !important;
          font-family: monospace !important;
          font-size: 11px !important;
          padding: 4px 8px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
        }
      `}</style>
    </div>
  );
};
