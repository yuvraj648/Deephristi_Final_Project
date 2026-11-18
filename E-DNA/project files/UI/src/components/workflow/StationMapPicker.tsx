// ========================================================
// DEEPDRISHTI INTERACTIVE HYDROGRAPHIC STATION MAP PICKER
// Interactive Leaflet map with Google Satellite/Roadmap & Esri Ocean layers.
// Two-way synchronization: Map click/drag <-> Table inputs.
// ========================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, Crosshair, MapPin, ZoomIn, ZoomOut, Compass, Info, Check } from 'lucide-react';

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

// Custom SVG luminous map marker icons
const createStationIcon = (number: number, isSelected: boolean) => {
  const bgColor = isSelected ? '#38BDF8' : '#0284C7';
  const ringColor = isSelected ? '#FFFFFF' : '#38BDF8';
  const shadow = isSelected ? '0 0 16px rgba(56, 189, 248, 0.9)' : '0 0 8px rgba(2, 132, 199, 0.6)';

  return L.divIcon({
    className: 'custom-station-pin',
    html: `
      <div style="
        position: relative;
        width: 32px;
        height: 38px;
        display: flex;
        flex-direction: column;
        align-items: center;
        filter: drop-shadow(${shadow});
        cursor: grab;
      ">
        <div style="
          width: 28px;
          height: 28px;
          background: ${bgColor};
          border: 2px solid ${ringColor};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 0 4px rgba(0,0,0,0.4);
        ">
          <span style="
            transform: rotate(45deg);
            color: #060B13;
            font-size: 11px;
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
    iconSize: [32, 38],
    iconAnchor: [16, 38],
    popupAnchor: [0, -36],
  });
};

type MapLayerType = 'satellite' | 'roadmap' | 'ocean' | 'osm';

const MAP_LAYERS: Record<MapLayerType, { name: string; url: string; attribution: string; maxZoom: number }> = {
  satellite: {
    name: 'Google Hybrid / Satellite',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: 'Map data &copy; Google',
    maxZoom: 20,
  },
  roadmap: {
    name: 'Google Roadmap',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: 'Map data &copy; Google',
    maxZoom: 20,
  },
  ocean: {
    name: 'Esri Ocean Bathymetry',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri, GEBCO, NOAA, National Geographic',
    maxZoom: 13,
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
};

const OCEAN_PRESETS = [
  { name: 'Lakshadweep', lat: 10.56, lng: 72.64, zoom: 8 },
  { name: 'Eastern Arabian Sea', lat: 15.5, lng: 71.5, zoom: 6 },
  { name: 'Malabar Coast', lat: 11.25, lng: 74.85, zoom: 7 },
  { name: 'Bay of Bengal', lat: 14.5, lng: 85.0, zoom: 6 },
  { name: 'Andaman & Nicobar', lat: 11.7, lng: 92.7, zoom: 7 },
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
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [activeLayer, setActiveLayer] = useState<MapLayerType>('satellite');
  const [clickMode, setClickMode] = useState<'update' | 'add'>('update');
  const [liveCursorCoords, setLiveCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center: Indian Ocean Basin / Arabian Sea
    const initialLat = 15.0;
    const initialLng = 72.0;
    const initialZoom = 6;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: false,
    });

    // Add Tile Layer
    const layerConfig = MAP_LAYERS[activeLayer];
    const tileLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: layerConfig.maxZoom,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Layer group for station markers
    const markersGroup = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = markersGroup;

    // Track mouse coordinates over map
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

  // Update Layer when activeLayer changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const layerConfig = MAP_LAYERS[activeLayer];
    const newLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: layerConfig.maxZoom,
    }).addTo(map);

    tileLayerRef.current = newLayer;
  }, [activeLayer]);

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
        // If no station selected, default to adding a new one
        onAddStationAtCoords(latStr, lngStr);
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [clickMode, selectedStationIndex, stations.length, onAddStationAtCoords, onUpdateStationCoords]);

  // Render markers and keep them in sync with stations array
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();
    const latLngBounds: L.LatLng[] = [];

    stations.forEach((st, idx) => {
      const lat = parseFloat(st.lat);
      const lng = parseFloat(st.lng);

      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        const isSelected = selectedStationIndex === idx;
        const marker = L.marker([lat, lng], {
          icon: createStationIcon(idx + 1, isSelected),
          draggable: true,
          title: st.site || `Station ${idx + 1}`,
        });

        // Popup content
        const popupContent = `
          <div style="font-family: monospace; font-size: 12px; color: #060B13; min-width: 170px;">
            <div style="font-weight: 700; color: #0284C7; border-bottom: 1px solid #CBD5E1; padding-bottom: 4px; margin-bottom: 6px;">
              ${st.sampleId}: ${st.site || 'Station ' + (idx + 1)}
            </div>
            <div><strong>Lat:</strong> ${lat.toFixed(4)}°N</div>
            <div><strong>Lng:</strong> ${lng.toFixed(4)}°E</div>
            <div><strong>Depth:</strong> ${st.depth || '0'} m</div>
            <div style="margin-top: 6px; font-size: 10px; color: #64748B;">* Drag pin to adjust position</div>
          </div>
        `;
        marker.bindPopup(popupContent);

        // Marker click selects the station
        marker.on('click', () => {
          onSelectStation(idx);
        });

        // Draggable pin updates station coordinates
        marker.on('dragend', (ev) => {
          const newPos = ev.target.getLatLng();
          onUpdateStationCoords(idx, newPos.lat.toFixed(4), newPos.lng.toFixed(4));
        });

        markersGroup.addLayer(marker);
        latLngBounds.push(L.latLng(lat, lng));
      }
    });
  }, [stations, selectedStationIndex, onSelectStation, onUpdateStationCoords]);

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

  const activeStation = selectedStationIndex !== null ? stations[selectedStationIndex] : null;

  return (
    <div className="border border-rule rounded-plate overflow-hidden bg-paper-sunk flex flex-col shadow-lg">
      {/* Map Control Header Toolbar */}
      <div className="bg-paper-raised px-4 py-2.5 border-b border-rule flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-survey animate-pulse"></div>
          <span className="font-mono text-[12px] font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
            <Compass size={14} className="text-survey" />
            Interactive Marine Sampling Map
          </span>
          <span className="text-[11px] font-mono text-ink-faint">
            ({stations.filter((s) => s.lat && s.lng).length} plotted / {stations.length} stations)
          </span>
        </div>

        {/* Action Mode Toggle: Update Selected vs Add New */}
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
            <span>Click Map to Move Station #{selectedStationIndex !== null ? selectedStationIndex + 1 : 1}</span>
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
            <span>+ Click Map to Add New Station</span>
          </button>
        </div>

        {/* Layer Switcher & Fit Bounds */}
        <div className="flex items-center gap-2">
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
              <div className="absolute right-0 top-full mt-1.5 z-[1000] bg-paper-raised border border-rule rounded-plate p-1 shadow-2xl min-w-[210px]">
                {(Object.keys(MAP_LAYERS) as MapLayerType[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setActiveLayer(key);
                      setShowLayerMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-[11px] font-mono rounded-control flex items-center justify-between transition-colors ${
                      activeLayer === key
                        ? 'bg-survey-tint text-survey font-semibold'
                        : 'text-ink-muted hover:bg-paper hover:text-ink'
                    }`}
                  >
                    <span>{MAP_LAYERS[key].name}</span>
                    {activeLayer === key && <Check size={12} />}
                  </button>
                ))}
              </div>
            )}
          </div>

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

      {/* Preset Ocean Regions Bar */}
      <div className="bg-paper px-4 py-1.5 border-b border-rule flex items-center gap-2 overflow-x-auto text-[11px] font-mono">
        <span className="text-ink-faint whitespace-nowrap">Quick Jump Region:</span>
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

      {/* Map Canvas */}
      <div className="relative w-full h-[380px] bg-[#04080F]">
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

        {/* Helper Hint Overlay */}
        <div className="absolute bottom-3 left-3 z-[400] bg-paper-raised/90 backdrop-blur border border-rule rounded-control px-2.5 py-1.5 flex items-center gap-2 text-[11px] font-mono text-ink-muted shadow-md">
          <Info size={13} className="text-survey flex-shrink-0" />
          <span>
            {clickMode === 'update' && activeStation
              ? `Clicking map updates coordinates for ${activeStation.sampleId} (${activeStation.site || 'Current Station'})`
              : 'Click anywhere on the ocean to drop a new sampling station pin'}
          </span>
        </div>

        {/* Live Cursor Coordinates Badge */}
        {liveCursorCoords && (
          <div className="absolute bottom-3 right-3 z-[400] bg-paper-raised/90 backdrop-blur border border-rule rounded-control px-2.5 py-1 text-[11px] font-mono text-ink shadow-md flex items-center gap-2">
            <span className="text-survey font-bold">LAT:</span> {liveCursorCoords.lat.toFixed(4)}°N
            <span className="text-survey font-bold ml-1">LNG:</span> {liveCursorCoords.lng.toFixed(4)}°E
          </div>
        )}
      </div>
    </div>
  );
};
