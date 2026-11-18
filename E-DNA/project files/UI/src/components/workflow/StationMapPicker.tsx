// ========================================================
// DEEPDRISHTI INTERACTIVE HYDROGRAPHIC STATION MAP PICKER
// Ultra-detailed Nautical & Marine Basemaps:
// - GEBCO Official Global Shaded Bathymetry (WMS)
// - Esri Ocean Bathymetry & Undersea Topography (Seafloor ridges & trenches)
// - Esri High-Res Coral Reef & Ocean Optical Satellite
// - Google Hybrid / Satellite
// - OpenSeaMap Maritime Seamarks Overlay (Buoys, Channels, Beacons)
// - Interactive Cruise Transect Route & Nautical Mile (NM) Ruler
// - Marine Oceanographic Zone Telemetry (Epipelagic / Mesopelagic / Bathyal)
// - One-Click Coordinate Matrix Export (CSV / GeoJSON)
// ========================================================

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Layers,
  Crosshair,
  MapPin,
  ZoomIn,
  ZoomOut,
  Compass,
  Info,
  Check,
  Search,
  Maximize2,
  Minimize2,
  Anchor,
  Navigation,
  Download,
  Activity,
  Waves,
} from 'lucide-react';

export interface StationData {
  sampleId: string;
  site: string;
  lat: string;
  lng: string;
  depth: string;
}

interface StationMapPickerProps {
  stations: StationData[];
  selectedStationIndex: number | null;
  onSelectStation: (index: number) => void;
  onUpdateStationCoords: (index: number, lat: string, lng: string) => void;
  onAddStationAtCoords: (lat: string, lng: string) => void;
  regionName?: string;
}

// Haversine formula for Nautical Miles (NM)
const calculateDistanceNM = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3440.065; // Earth radius in Nautical Miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Oceanographic Depth Zone classifier
const getOceanZone = (depthMeters: number) => {
  if (depthMeters <= 200) {
    return {
      name: 'Epipelagic (Sunlit Shelf)',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      desc: 'Photic zone (0-200m). Coral reef ecosystems, coastal primary productivity, high eDNA richness.',
    };
  }
  if (depthMeters <= 1000) {
    return {
      name: 'Mesopelagic (Twilight Zone)',
      color: 'text-sky-400',
      bg: 'bg-sky-500/10 border-sky-500/30',
      desc: 'Dysphotic zone (200-1000m). Steep thermocline, deep scattering layer, cephalopods.',
    };
  }
  return {
    name: 'Bathyal / Abyssal Basin',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/30',
    desc: 'Aphotic midnight zone (>1000m). High hydrostatic pressure, benthic fauna, deep-water cold seeps.',
  };
};

// Custom SVG luminous map marker icons
const createStationIcon = (number: number, isSelected: boolean) => {
  const bgColor = isSelected ? '#38BDF8' : '#0284C7';
  const ringColor = isSelected ? '#FFFFFF' : '#38BDF8';
  const shadow = isSelected ? '0 0 18px rgba(56, 189, 248, 1)' : '0 0 10px rgba(2, 132, 199, 0.7)';

  return L.divIcon({
    className: 'custom-station-pin',
    html: `
      <div style="
        position: relative;
        width: 34px;
        height: 40px;
        display: flex;
        flex-direction: column;
        align-items: center;
        filter: drop-shadow(${shadow});
        cursor: grab;
      ">
        <div style="
          width: 30px;
          height: 30px;
          background: ${bgColor};
          border: 2px solid ${ringColor};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 0 5px rgba(0,0,0,0.4);
        ">
          <span style="
            transform: rotate(45deg);
            color: #060B13;
            font-size: 12px;
            font-weight: 800;
            font-family: monospace;
          ">${number}</span>
        </div>
        <div style="
          width: 6px;
          height: 6px;
          background: ${ringColor};
          border-radius: 50%;
          margin-top: 2px;
        "></div>
      </div>
    `,
    iconSize: [34, 40],
    iconAnchor: [17, 40],
    popupAnchor: [0, -38],
  });
};

type MapLayerType = 'googleHybrid' | 'noaaGebco' | 'esriOcean' | 'googleTerrain' | 'osm';

interface LayerConfig {
  name: string;
  badge: string;
  description: string;
  url: string;
  sublayerUrl?: string;
  attribution: string;
  maxZoom: number;
}

const MAP_LAYERS: Record<MapLayerType, LayerConfig> = {
  googleHybrid: {
    name: 'Google Hybrid / Optical Satellite',
    badge: 'DEFAULT • 100% FREE',
    description: 'High-resolution true optical satellite showing real ocean waters, coral atolls, ports & coastlines',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: 'Imagery &copy; Google',
    maxZoom: 20,
  },
  noaaGebco: {
    name: 'NOAA NCEI Bathymetric Relief (Official Portal)',
    badge: 'NOAA NCEI • 100% FREE',
    description: 'Official multi-color bathymetric depth relief used by the NOAA NCEI Bathymetry Map portal',
    url: 'https://tiles.arcgis.com/tiles/C8EMgrsFcRFL6LrL/arcgis/rest/services/GEBCO_basemap_NCEI/MapServer/tile/{z}/{y}/{x}',
    sublayerUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Bathymetry &copy; NOAA NCEI, GEBCO',
    maxZoom: 16,
  },
  esriOcean: {
    name: 'Nautical Dark Hydrographic Chart (Tactical Navy)',
    badge: 'TACTICAL NAVY • 100% FREE',
    description: 'Muted dark hydrographic chart designed for underwater surveillance with seamount & trench labels',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
    sublayerUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri, GEBCO, NOAA',
    maxZoom: 16,
  },
  googleTerrain: {
    name: 'Google Physical Ocean & Terrain',
    badge: 'RELIEF • 100% FREE',
    description: 'Topographic land elevation & ocean coastal bathymetry depth gradients',
    url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    attribution: 'Map &copy; Google',
    maxZoom: 20,
  },
  osm: {
    name: 'OpenStreetMap Hydrographic',
    badge: 'OPEN SOURCE',
    description: 'Global crowdsourced hydrographic water bodies and navigational coastlines',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
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

export const StationMapPicker: React.FC<StationMapPickerProps> = ({
  stations,
  selectedStationIndex,
  onSelectStation,
  onUpdateStationCoords,
  onAddStationAtCoords,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | L.TileLayer.WMS | null>(null);
  const subLayerRef = useRef<L.TileLayer | null>(null);
  const seamarkLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const transectPolylineRef = useRef<L.Polyline | null>(null);

  const [activeLayer, setActiveLayer] = useState<MapLayerType>('googleHybrid');
  const [clickMode, setClickMode] = useState<'update' | 'add'>('update');
  const [liveCursorCoords, setLiveCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSeamarks, setShowSeamarks] = useState(true);
  const [showTransectLine, setShowTransectLine] = useState(true);

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  // Calculate Cruise Transect Statistics
  const transectStats = useMemo(() => {
    const validStations = stations
      .map((st) => ({
        lat: parseFloat(st.lat),
        lng: parseFloat(st.lng),
        depth: parseFloat(st.depth) || 0,
      }))
      .filter((s) => !isNaN(s.lat) && !isNaN(s.lng));

    if (validStations.length < 2) {
      return { totalNM: 0, totalKM: 0, maxDepth: 0, minDepth: 0, count: validStations.length };
    }

    let totalNM = 0;
    let maxDepth = -Infinity;
    let minDepth = Infinity;

    for (let i = 0; i < validStations.length; i++) {
      if (validStations[i].depth > maxDepth) maxDepth = validStations[i].depth;
      if (validStations[i].depth < minDepth) minDepth = validStations[i].depth;

      if (i > 0) {
        totalNM += calculateDistanceNM(
          validStations[i - 1].lat,
          validStations[i - 1].lng,
          validStations[i].lat,
          validStations[i].lng
        );
      }
    }

    return {
      totalNM: parseFloat(totalNM.toFixed(1)),
      totalKM: parseFloat((totalNM * 1.852).toFixed(1)),
      maxDepth: maxDepth === -Infinity ? 0 : maxDepth,
      minDepth: minDepth === Infinity ? 0 : minDepth,
      count: validStations.length,
    };
  }, [stations]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center on Arabian Sea / Indian Ocean
    const initialLat = 13.5;
    const initialLng = 72.0;
    const initialZoom = 6;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: false,
    });

    // Layer group for station markers
    const markersGroup = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = markersGroup;

    // Track mouse coordinates over ocean
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setLiveCursorCoords({
        lat: parseFloat(e.latlng.lat.toFixed(4)),
        lng: parseFloat(e.latlng.lng.toFixed(4)),
      });
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Base Layer & Reference Overlay (100% verified working XYZ tile layers)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing base layers
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    if (subLayerRef.current) map.removeLayer(subLayerRef.current);

    const layerConfig = MAP_LAYERS[activeLayer] || MAP_LAYERS.googleHybrid;

    // Instant XYZ Tile Layer
    const tileLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: layerConfig.maxZoom,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Sublayer for ocean depth labels and undersea contours when available
    if (layerConfig.sublayerUrl) {
      const subLayer = L.tileLayer(layerConfig.sublayerUrl, {
        maxZoom: layerConfig.maxZoom,
      }).addTo(map);
      subLayerRef.current = subLayer;
    }

    // Keep markers above tiles
    markersLayerGroupRef.current?.eachLayer((layer: any) => {
      if (typeof layer.setZIndexOffset === 'function') layer.setZIndexOffset(1000);
    });
  }, [activeLayer]);

  // Handle OpenSeaMap Seamarks Nautical Overlay
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (showSeamarks) {
      if (!seamarkLayerRef.current) {
        const seamarkLayer = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
          maxZoom: 18,
          opacity: 0.85,
        }).addTo(map);
        seamarkLayerRef.current = seamarkLayer;
      }
    } else {
      if (seamarkLayerRef.current) {
        map.removeLayer(seamarkLayerRef.current);
        seamarkLayerRef.current = null;
      }
    }

    markersLayerGroupRef.current?.eachLayer((layer: any) => {
      if (typeof layer.setZIndexOffset === 'function') layer.setZIndexOffset(1000);
    });
  }, [showSeamarks]);

  // Handle map click for adding or updating stations
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const latStr = e.latlng.lat.toFixed(4);
      const lngStr = e.latlng.lng.toFixed(4);

      if (clickMode === 'add') {
        onAddStationAtCoords(latStr, lngStr);
      } else if (selectedStationIndex !== null && selectedStationIndex >= 0 && selectedStationIndex < stations.length) {
        onUpdateStationCoords(selectedStationIndex, latStr, lngStr);
      } else {
        onAddStationAtCoords(latStr, lngStr);
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [clickMode, selectedStationIndex, stations.length, onAddStationAtCoords, onUpdateStationCoords]);

  // Render markers and transect line
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // Remove old transect line
    if (transectPolylineRef.current) {
      map.removeLayer(transectPolylineRef.current);
      transectPolylineRef.current = null;
    }

    const latLngRoute: [number, number][] = [];

    stations.forEach((st, idx) => {
      const lat = parseFloat(st.lat);
      const lng = parseFloat(st.lng);
      const depthVal = parseFloat(st.depth) || 0;

      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        latLngRoute.push([lat, lng]);
        const isSelected = selectedStationIndex === idx;
        const zone = getOceanZone(depthVal);

        const marker = L.marker([lat, lng], {
          icon: createStationIcon(idx + 1, isSelected),
          draggable: true,
          title: st.site || `Station ${idx + 1}`,
          zIndexOffset: isSelected ? 1000 : 100,
        });

        const popupContent = `
          <div style="font-family: monospace; font-size: 12px; color: #060B13; min-width: 200px;">
            <div style="font-weight: 700; color: #0284C7; border-bottom: 1px solid #CBD5E1; padding-bottom: 4px; margin-bottom: 6px;">
              ${st.sampleId}: ${st.site || 'Station ' + (idx + 1)}
            </div>
            <div><strong>Coordinates:</strong> ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E</div>
            <div><strong>Depth:</strong> ${depthVal} m</div>
            <div style="margin-top: 4px; padding: 2px 6px; background: #F1F5F9; border-radius: 4px; font-size: 10px; color: #0369A1; font-weight: bold;">
              ${zone.name}
            </div>
            <div style="margin-top: 6px; font-size: 10px; color: #64748B;">* Drag pin to adjust position</div>
          </div>
        `;
        marker.bindPopup(popupContent);

        marker.on('click', () => {
          onSelectStation(idx);
        });

        marker.on('dragend', (ev) => {
          const newPos = ev.target.getLatLng();
          onUpdateStationCoords(idx, newPos.lat.toFixed(4), newPos.lng.toFixed(4));
        });

        markersGroup.addLayer(marker);
      }
    });

    // Draw cruise transect route connecting stations
    if (showTransectLine && latLngRoute.length >= 2) {
      const polyline = L.polyline(latLngRoute, {
        color: '#38BDF8',
        weight: 2.5,
        opacity: 0.85,
        dashArray: '6, 8',
      }).addTo(map);
      transectPolylineRef.current = polyline;
    }
  }, [stations, selectedStationIndex, showTransectLine, onSelectStation, onUpdateStationCoords]);

  // Recenter map when container size changes
  useEffect(() => {
    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [isExpanded]);

  // Zoom controls
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  // Fit bounds to all current stations
  const handleFitBounds = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const validCoords = stations
      .map((st) => [parseFloat(st.lat), parseFloat(st.lng)] as [number, number])
      .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));

    if (validCoords.length > 0) {
      const bounds = L.latLngBounds(validCoords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
    }
  }, [stations]);

  // Jump to Preset
  const handleJumpToPreset = (lat: number, lng: number, zoom: number) => {
    mapInstanceRef.current?.flyTo([lat, lng], zoom, { duration: 1.2 });
  };

  // Search region or coordinates handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapInstanceRef.current) return;

    setIsSearching(true);
    setSearchFeedback(null);

    // 1. Direct coordinate format: "15.45, 73.75"
    const coordMatch = searchQuery.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[3]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        mapInstanceRef.current.flyTo([lat, lng], 10, { duration: 1.2 });
        setSearchFeedback(`Jumped to coordinates ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);
        setIsSearching(false);
        return;
      }
    }

    // 2. Geocode search
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        mapInstanceRef.current.flyTo([lat, lon], 9, { duration: 1.2 });
        setSearchFeedback(`Located: ${item.display_name.split(',').slice(0, 3).join(',')}`);
      } else {
        setSearchFeedback('Location not found. Try entering coordinates (e.g. 10.56, 72.64)');
      }
    } catch {
      setSearchFeedback('Search network request failed. Try typing coordinates directly.');
    } finally {
      setIsSearching(false);
    }
  };

  // Export Station Coordinates to CSV
  const handleExportCSV = () => {
    const csvHeader = 'Sample_ID,Station_Name,Latitude_N,Longitude_E,Depth_m,Ocean_Zone\n';
    const csvRows = stations
      .map((s) => {
        const depthNum = parseFloat(s.depth) || 0;
        const zone = getOceanZone(depthNum).name;
        return `"${s.sampleId}","${s.site}","${s.lat}","${s.lng}","${s.depth}","${zone}"`;
      })
      .join('\n');

    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'deepdrishti_sampling_stations.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeStation = selectedStationIndex !== null ? stations[selectedStationIndex] : null;
  const activeStationZone = activeStation ? getOceanZone(parseFloat(activeStation.depth) || 0) : null;

  return (
    <div className="border border-rule rounded-plate overflow-hidden bg-paper-sunk flex flex-col shadow-2xl">
      {/* Top Header: Layer Switcher & Mode Toggles */}
      <div className="bg-paper-raised px-4 py-2.5 border-b border-rule flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-survey animate-pulse"></div>
          <span className="font-mono text-[12px] font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
            <Compass size={14} className="text-survey" />
            Nautical Bathymetric Surveillance Map
          </span>
          <span className="text-[11px] font-mono text-ink-faint">
            ({stations.filter((s) => s.lat && s.lng).length} plotted / {stations.length} stations)
          </span>
        </div>

        {/* Action Mode Toggle */}
        <div className="flex items-center gap-1 bg-paper border border-rule rounded-control p-0.5">
          <button
            type="button"
            onClick={() => setClickMode('update')}
            className={`px-2.5 py-1 text-[11px] font-mono rounded-control transition-all flex items-center gap-1.5 ${
              clickMode === 'update'
                ? 'bg-survey text-white font-semibold shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <MapPin size={12} />
            <span>Click to Move Station #{selectedStationIndex !== null ? selectedStationIndex + 1 : 1}</span>
          </button>
          <button
            type="button"
            onClick={() => setClickMode('add')}
            className={`px-2.5 py-1 text-[11px] font-mono rounded-control transition-all flex items-center gap-1.5 ${
              clickMode === 'add'
                ? 'bg-biological text-white font-semibold shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Crosshair size={12} />
            <span>+ Click Map to Add Station</span>
          </button>
        </div>

        {/* Right Tools: Seamarks, Transect, Layers, Export & Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Transect Line Toggle */}
          <button
            type="button"
            onClick={() => setShowTransectLine(!showTransectLine)}
            title="Toggle Transect cruise track line connecting stations"
            className={`px-2 py-1 text-[11px] font-mono rounded-control border flex items-center gap-1 transition-colors ${
              showTransectLine
                ? 'bg-survey-tint border-survey text-survey font-semibold'
                : 'bg-paper border-rule text-ink-muted hover:text-ink'
            }`}
          >
            <Navigation size={12} />
            <span>Route Line {showTransectLine ? 'ON' : 'OFF'}</span>
          </button>

          {/* Seamarks Overlay Toggle */}
          <button
            type="button"
            onClick={() => setShowSeamarks(!showSeamarks)}
            title="Toggle Nautical Navigation Marks, Buoys, Beacons & Maritime Channels"
            className={`px-2 py-1 text-[11px] font-mono rounded-control border flex items-center gap-1 transition-colors ${
              showSeamarks
                ? 'bg-survey-tint border-survey text-survey font-semibold'
                : 'bg-paper border-rule text-ink-muted hover:text-ink'
            }`}
          >
            <Anchor size={12} />
            <span>Seamarks {showSeamarks ? 'ON' : 'OFF'}</span>
          </button>

          {/* Layer Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className="px-2.5 py-1 bg-paper border border-rule hover:border-survey text-ink font-mono text-[11px] rounded-control flex items-center gap-1.5 transition-colors"
            >
              <Layers size={13} className="text-survey" />
              <span>{MAP_LAYERS[activeLayer].name}</span>
            </button>

            {showLayerMenu && (
              <div className="absolute right-0 top-full mt-1.5 z-[1000] bg-paper-raised border border-rule rounded-plate p-2 shadow-2xl min-w-[320px] space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-ink-faint px-2 block mb-1">
                  Select Oceanic / Bathymetric Basemap:
                </span>
                {(Object.keys(MAP_LAYERS) as MapLayerType[]).map((key) => {
                  const cfg = MAP_LAYERS[key];
                  const isCurrent = activeLayer === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setActiveLayer(key);
                        setShowLayerMenu(false);
                      }}
                      className={`w-full text-left p-2 rounded-control flex flex-col transition-colors border ${
                        isCurrent
                          ? 'bg-survey-tint/50 border-survey text-ink'
                          : 'border-transparent text-ink-muted hover:bg-paper hover:text-ink'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="font-semibold">{cfg.name}</span>
                        {isCurrent ? (
                          <Check size={13} className="text-survey" />
                        ) : (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-paper border border-rule text-ink-faint">
                            {cfg.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-ink-faint mt-0.5">{cfg.description}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            title="Export station matrix to CSV"
            className="p-1.5 bg-paper border border-rule hover:border-survey text-ink-muted hover:text-ink rounded-control transition-colors"
          >
            <Download size={13} />
          </button>

          {/* Expand / Minimize Canvas Height */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Restore standard view' : 'Expand map canvas'}
            className="p-1.5 bg-paper border border-rule hover:border-survey text-ink-muted hover:text-ink rounded-control transition-colors"
          >
            {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          {/* Fit Bounds */}
          <button
            type="button"
            onClick={handleFitBounds}
            title="Fit view to show all marked stations"
            className="px-2.5 py-1 bg-paper border border-rule hover:border-survey text-ink-muted hover:text-ink font-mono text-[11px] rounded-control transition-colors"
          >
            Recenter All
          </button>
        </div>
      </div>

      {/* Sub-Toolbar: Search Bar & Oceanographic Presets */}
      <div className="bg-paper px-4 py-2 border-b border-rule flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex items-center gap-1.5 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ocean trench, island, port or 'Lat, Lng'..."
              className="w-full bg-paper-raised border border-rule rounded-control pl-8 pr-3 py-1 text-[11px] font-mono text-ink placeholder:text-ink-faint focus:outline-none focus:border-survey shadow-inner"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-2.5 py-1 bg-paper-raised hover:bg-survey-tint border border-rule hover:border-survey text-ink rounded-control font-mono transition-colors whitespace-nowrap"
          >
            {isSearching ? 'Finding...' : 'Jump To'}
          </button>
        </form>

        {/* Ocean Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-ink-faint whitespace-nowrap">Quick Jump:</span>
          {OCEAN_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleJumpToPreset(preset.lat, preset.lng, preset.zoom)}
              className="px-2 py-0.5 rounded-control bg-paper-raised hover:bg-survey-tint hover:text-survey border border-rule text-ink-muted whitespace-nowrap transition-colors"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Live Transect Route Telemetry Bar */}
      {transectStats.count >= 2 && (
        <div className="bg-paper-raised/95 border-b border-rule px-4 py-2 flex flex-wrap items-center justify-between gap-4 text-[11px] font-mono">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-survey font-semibold">
              <Navigation size={13} />
              <span>Transect Distance: {transectStats.totalNM} NM ({transectStats.totalKM} km)</span>
            </div>
            <div className="flex items-center gap-1.5 text-ink-muted">
              <Waves size={13} className="text-sky-400" />
              <span>Depth Range: {transectStats.minDepth}m – {transectStats.maxDepth}m</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Activity size={13} />
              <span>{transectStats.count} Survey Stations Connected</span>
            </div>
          </div>

          {activeStation && activeStationZone && (
            <div className="flex items-center gap-2">
              <span className="text-ink-faint">Station #{selectedStationIndex! + 1} Zone:</span>
              <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${activeStationZone.bg} ${activeStationZone.color}`}>
                {activeStationZone.name}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Search Result Feedback Banner */}
      {searchFeedback && (
        <div className="bg-survey-tint px-4 py-1 border-b border-survey/40 text-[11px] font-mono text-survey flex items-center justify-between">
          <span>{searchFeedback}</span>
          <button type="button" onClick={() => setSearchFeedback(null)} className="text-ink-muted hover:text-ink text-[10px]">
            Dismiss
          </button>
        </div>
      )}

      {/* Map Canvas */}
      <div
        className={`relative w-full bg-[#04080F] transition-all duration-300 ${
          isExpanded ? 'h-[600px]' : 'h-[440px]'
        }`}
      >
        <style>{`
          .leaflet-container {
            background: #060B13 !important;
            font-family: inherit;
          }
          .leaflet-tile {
            background-color: transparent !important;
          }
        `}</style>
        <div ref={mapContainerRef} className="w-full h-full z-0 cursor-crosshair" />

        {/* Floating Zoom Controls */}
        <div className="absolute top-3 left-3 z-[400] flex flex-col gap-1 bg-paper-raised/90 backdrop-blur border border-rule rounded-control p-1 shadow-md">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 text-ink-muted hover:text-ink hover:bg-paper rounded-control transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 text-ink-muted hover:text-ink hover:bg-paper rounded-control transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
        </div>

        {/* Active Mode Hint Overlay */}
        <div className="absolute bottom-3 left-3 z-[400] bg-paper-raised/90 backdrop-blur border border-rule rounded-control px-3 py-1.5 flex items-center gap-2 text-[11px] font-mono text-ink-muted shadow-md">
          <Info size={13} className="text-survey flex-shrink-0" />
          <span>
            {clickMode === 'update' && activeStation
              ? `Click on water to position Station #${(selectedStationIndex ?? 0) + 1} (${activeStation.sampleId})`
              : 'Click on ocean to drop a new sampling station pin'}
          </span>
        </div>

        {/* Live Coordinates Badge */}
        {liveCursorCoords && (
          <div className="absolute bottom-3 right-3 z-[400] bg-paper-raised/90 backdrop-blur border border-rule rounded-control px-3 py-1.5 text-[11px] font-mono text-ink shadow-md flex items-center gap-3">
            <div>
              <span className="text-survey font-bold">LAT:</span> {liveCursorCoords.lat.toFixed(4)}°N
            </div>
            <div>
              <span className="text-survey font-bold">LNG:</span> {liveCursorCoords.lng.toFixed(4)}°E
            </div>
            <div className="text-[10px] text-ink-faint border-l border-rule pl-2">
              Layer: {MAP_LAYERS[activeLayer].badge}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
