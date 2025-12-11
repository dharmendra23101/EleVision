import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from "react-leaflet";
import L from "leaflet";
import maplibregl from "maplibre-gl";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { useAuth } from '../../hooks/useAuth';

// Fix leaflet marker icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default. mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// MapTiler API Key from environment variables
const MAPTILER_KEY = import.meta.env. VITE_MAPTILER_KEY;
const BACKEND_URL = import. meta.env. VITE_BACKEND_URL || 'http://localhost:4000';

// Optimized API functions
const api = {
  getAlertPoints: async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/alert-points`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response. ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Alert points loaded:', result. data?. length || 0);
      return result;
    } catch (error) {
      console.error('❌ API Error - Get Alert Points:', error);
      throw error;
    }
  },

  createAlertPoint: async (pointData) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/alert-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pointData)
      });
      
      if (!response.ok) {
        const errorData = await response.json(). catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Alert point created:', result.data?.name);
      return result;
    } catch (error) {
      console.error('❌ API Error - Create Alert Point:', error);
      throw error;
    }
  },

  deleteAlertPoint: async (id) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/alert-points/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        const errorData = await response. json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Alert point deleted:', id);
      return result;
    } catch (error) {
      console.error('❌ API Error - Delete Alert Point:', error);
      throw error;
    }
  }
};

// Enhanced Custom Marker
const createMarker = (color = "#dc2626", type = "alert") => {
  const emoji = type === "alert" ? "🚨" : "📍";
  return L.divIcon({
    className: "custom-marker-icon",
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background: ${color};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 4px solid white;
        box-shadow: 0 4px 15px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      ">
        <span style="
          transform: rotate(45deg);
          font-size: 20px;
          color: white;
          font-weight: bold;
          text-shadow: 0 2px 4px rgba(0,0,0,0.7);
        ">${emoji}</span>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

// Leaflet Map Click Handler
const MapEvents = ({ onClick }) => {
  useMapEvents({ click: onClick });
  return null;
};

// Simplified Satellite Map Component
const SatelliteMap = ({
  alertPoints,
  selectedLocation,
  onMapClick,
  onRemovePoint,
  center,
  zoom,
}) => {
  const container = useRef(null);
  const mapRef = useRef(null);
  const markers = useRef([]);

  // Initialize map
  useEffect(() => {
    if (!container.current || mapRef.current) return;

    try {
      mapRef.current = new maplibregl.Map({
        container: container. current,
        style: `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`,
        center: [center[1], center[0]], // [lng, lat]
        zoom: zoom - 1,
      });

      mapRef.current.on("load", () => {
        console.log("✅ Satellite map loaded successfully");
      });

      mapRef.current.on("click", (e) => {
        onMapClick({
          latlng: { lat: e.lngLat.lat, lng: e.lngLat.lng },
        });
      });

      // Add controls
      mapRef. current.addControl(new maplibregl.NavigationControl(), "top-right");
      mapRef. current.addControl(new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true
      }), "top-right");

    } catch (error) {
      console. error("❌ Error initializing satellite map:", error);
    }

    return () => {
      if (mapRef.current) {
        mapRef. current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when alert points change
  useEffect(() => {
    if (!mapRef.current || !mapRef.current.loaded()) return;

    // Clear existing markers
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    // Add alert point markers
    alertPoints.forEach((point) => {
      try {
        const lat = parseFloat(point.latitude);
        const lng = parseFloat(point.longitude);

        // Create marker element
        const el = document.createElement('div');
        el.className = 'satellite-marker';
        el.innerHTML = `
          <div style="
            width: 40px;
            height: 40px;
            background: #dc2626;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 4px solid white;
            box-shadow: 0 4px 15px rgba(0,0,0,0. 4);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <span style="
              transform: rotate(45deg);
              font-size: 20px;
              color: white;
              font-weight: bold;
              text-shadow: 0 2px 4px rgba(0,0,0,0. 7);
            ">🚨</span>
          </div>
        `;

        // Create popup
        const popup = new maplibregl.Popup({ offset: 25 })
          .setHTML(`
            <div style="padding: 16px; min-width: 250px; font-family: system-ui;">
              <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 22px; margin-right: 8px;">🚨</span>
                <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #1f2937;">${point.name}</h3>
              </div>
              ${point.description ?  `
                <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                  ${point.description}
                </p>
              ` : ''}
              <div style="margin-bottom: 12px; padding: 10px; background: #fef3c7; border-radius: 6px; border-left: 3px solid #f59e0b;">
                <p style="margin: 0; font-size: 12px; color: #92400e;">
                  <strong>📍 Location:</strong> ${lat.toFixed(6)}, ${lng. toFixed(6)}
                </p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #92400e;">
                  <strong>📅 Created:</strong> ${new Date(point.created_at).toLocaleDateString()}
                </p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #92400e;">
                  <strong>🎯 Detection Zone:</strong> 5 km radius
                </p>
              </div>
              <button 
                onclick="window.removePoint_${point.id}('${point.id}')" 
                style="
                  width: 100%;
                  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                  color: white;
                  border: none;
                  padding: 12px 16px;
                  border-radius: 8px;
                  font-size: 14px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.3s;
                  box-shadow: 0 4px 12px rgba(239, 68, 68, 0. 3);
                "
                onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(239, 68, 68, 0.4)';"
                onmouseout="this.style.transform='translateY(0)'; this.style. boxShadow='0 4px 12px rgba(239, 68, 68, 0. 3)';"
              >
                🗑️ Remove Alert Point
              </button>
            </div>
          `);

        // Create marker
        const marker = new maplibregl.Marker(el)
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(mapRef.current);

        // Add remove point function to window
        window[`removePoint_${point. id}`] = (id) => onRemovePoint(id);
        
        markers.current.push(marker);
      } catch (error) {
        console.error("❌ Error adding marker:", error);
      }
    });

    // Add selected location marker
    if (selectedLocation) {
      try {
        const el = document.createElement('div');
        el.innerHTML = `
          <div style="
            width: 40px;
            height: 40px;
            background: #3b82f6;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 4px solid white;
            box-shadow: 0 4px 15px rgba(0,0,0,0.4);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: pulse 2s infinite;
          ">
            <span style="
              transform: rotate(45deg);
              font-size: 20px;
              color: white;
              font-weight: bold;
              text-shadow: 0 2px 4px rgba(0,0,0,0.7);
            ">📍</span>
          </div>
        `;

        const popup = new maplibregl.Popup({ offset: 25 })
          . setHTML(`
            <div style="padding: 12px; font-family: system-ui;">
              <h4 style="margin: 0 0 8px 0; color: #1f2937; font-weight: 600;">📍 New Detection Zone</h4>
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                ${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}
              </p>
              <p style="margin: 6px 0 0 0; font-size: 11px; color: #9ca3af;">
                Will create 5km detection radius
              </p>
            </div>
          `);

        const marker = new maplibregl. Marker(el)
          .setLngLat([selectedLocation.longitude, selectedLocation.latitude])
          .setPopup(popup)
          .addTo(mapRef.current);

        markers.current. push(marker);
      } catch (error) {
        console.error("❌ Error adding selected location marker:", error);
      }
    }

    // Cleanup
    return () => {
      alertPoints.forEach(point => {
        delete window[`removePoint_${point.id}`];
      });
    };
  }, [alertPoints, selectedLocation, onRemovePoint]);

  return (
    <div 
      ref={container} 
      style={{ 
        width: "100%", 
        height: "100%",
        minHeight: "500px" 
      }} 
    />
  );
};

// MAIN COMPONENT
export default function GovtAlertZone() {
  const { user } = useAuth();
  const [alertPoints, setAlertPoints] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapView, setMapView] = useState("standard");
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const defaultCenter = [20.5937, 78.9629];
  const defaultZoom = 6;

  useEffect(() => {
    loadAlertPoints();
  }, []);

  const loadAlertPoints = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await api.getAlertPoints();
      
      if (result.success) {
        setAlertPoints(result.data || []);
      } else {
        throw new Error(result. error || 'Failed to load alert points');
      }
    } catch (err) {
      console.error('Error loading alert points:', err);
      setError(`Failed to load alert points: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = useCallback((e) => {
    console.log('Map clicked:', e.latlng);
    setSelectedLocation({ 
      latitude: e.latlng. lat, 
      longitude: e.latlng.lng 
    });
    setError("");
  }, []);

  const addPoint = async () => {
    if (!selectedLocation || !formData.name. trim()) {
      setError("Please provide a location name");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const pointData = {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        name: formData.name. trim(),
        description: formData.description.trim(),
        created_by: user?. id || null
      };

      const result = await api. createAlertPoint(pointData);

      if (result.success) {
        setAlertPoints([result.data, ...alertPoints]);
        setSelectedLocation(null);
        setFormData({ name: "", description: "" });
        setSuccess("🎉 Alert point added with 5km detection zone!");
        
        setTimeout(() => setSuccess(""), 4000);
      } else {
        throw new Error(result. error || 'Failed to create alert point');
      }
    } catch (err) {
      console.error('Error adding alert point:', err);
      setError(`Failed to add alert point: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const removePoint = async (id) => {
    if (! confirm("Are you sure you want to remove this alert point and its 5km detection zone?")) return;

    try {
      const result = await api. deleteAlertPoint(id);
      
      if (result.success) {
        setAlertPoints(alertPoints. filter((p) => p.id !== id));
        setSuccess("✅ Alert point and detection zone removed!");
        
        setTimeout(() => setSuccess(""), 4000);
      } else {
        throw new Error(result.error || 'Failed to remove alert point');
      }
    } catch (err) {
      console.error('Error removing alert point:', err);
      setError(`Failed to remove alert point: ${err.message}`);
    }
  };

  const cancelSelection = () => {
    setSelectedLocation(null);
    setFormData({ name: "", description: "" });
    setError("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-6 text-gray-700 text-xl font-semibold">Loading Alert Zone Management... </p>
          <p className="mt-2 text-sm text-gray-500">Connecting to database & preparing maps...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        . leaflet-container {
          height: 100%;
          width: 100%;
          z-index: 1;
        }
        
        .satellite-marker {
          cursor: pointer;
        }
        
        @keyframes pulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1);
          }
          50% { 
            opacity: 0.7; 
            transform: scale(1. 05);
          }
        }

        .custom-marker-icon {
          background: none ! important;
          border: none !important;
        }
      `}</style>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              🛰️ Alert Zone Management
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Monitor and manage elephant detection zones with 5km radius coverage areas.  
              Click on the map to add new alert points with automatic detection zones.
            </p>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-400 text-xl">❌</span>
                </div>
                <div className="ml-3">
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-lg shadow-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-green-400 text-xl">✅</span>
                </div>
                <div className="ml-3">
                  <p className="text-green-700 font-medium">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Map Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Map Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center">
                      <span className="mr-2">🗺️</span>
                      Interactive Detection Map
                    </h2>
                    
                    {/* Map Toggle */}
                    <div className="flex bg-white/10 rounded-lg p-1">
                      <button
                        onClick={() => setMapView("standard")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                          mapView === "standard"
                            ? "bg-white text-indigo-600 shadow-sm"
                            : "text-white/80 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        🗺️ Standard
                      </button>
                      <button
                        onClick={() => setMapView("satellite")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                          mapView === "satellite"
                            ? "bg-white text-indigo-600 shadow-sm"
                            : "text-white/80 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        🛰️ Satellite
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-indigo-100 text-sm">
                      🟡 Yellow circles show 5km detection zones • Click to add new points
                    </p>
                    <div className="bg-white/20 px-3 py-1 rounded-full">
                      <span className="text-white text-sm font-medium">
                        {alertPoints.length} Detection Zones
                      </span>
                    </div>
                  </div>
                </div>

                {/* Map Container */}
                <div className="relative">
                  <div style={{ height: "550px" }}>
                    {mapView === "standard" ? (
                      <MapContainer
                        center={defaultCenter}
                        zoom={defaultZoom}
                        style={{ height: "100%", width: "100%" }}
                        className="z-0"
                      >
                        <TileLayer 
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />
                        <MapEvents onClick={handleMapClick} />

                        {/* Alert Points with 5km Circles */}
                        {alertPoints.map((p) => (
                          <React.Fragment key={p.id}>
                            {/* 5km Radius Circle */}
                            <Circle
                              center={[parseFloat(p.latitude), parseFloat(p.longitude)]}
                              radius={5000} // 5km in meters
                              pathOptions={{
                                color: '#f59e0b',
                                weight: 3,
                                opacity: 0.8,
                                fillColor: '#fbbf24',
                                fillOpacity: 0.25,
                              }}
                            />
                            
                            {/* Alert Point Marker */}
                            <Marker
                              position={[parseFloat(p. latitude), parseFloat(p.longitude)]}
                              icon={createMarker("#dc2626", "alert")}
                            >
                              <Popup>
                                <div className="p-3 min-w-[220px]">
                                  <div className="flex items-center mb-3">
                                    <span className="text-xl mr-2">🚨</span>
                                    <h3 className="font-bold text-gray-900 text-lg">{p.name}</h3>
                                  </div>
                                  {p.description && (
                                    <p className="text-gray-600 text-sm mb-3 leading-relaxed">{p.description}</p>
                                  )}
                                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-3">
                                    <div className="text-xs text-yellow-800 space-y-1">
                                      <p><strong>📍 Location:</strong> {parseFloat(p.latitude).toFixed(6)}, {parseFloat(p.longitude). toFixed(6)}</p>
                                      <p><strong>📅 Created:</strong> {new Date(p.created_at).toLocaleDateString()}</p>
                                      <p><strong>🎯 Detection Zone:</strong> 5 km radius</p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => removePoint(p.id)}
                                    className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-3 rounded-lg text-sm font-bold transition-all transform hover:scale-105"
                                  >
                                    🗑️ Remove Detection Zone
                                  </button>
                                </div>
                              </Popup>
                            </Marker>
                          </React.Fragment>
                        ))}

                        {/* Selected Location Marker */}
                        {selectedLocation && (
                          <>
                            <Circle
                              center={[selectedLocation.latitude, selectedLocation.longitude]}
                              radius={5000}
                              pathOptions={{
                                color: '#3b82f6',
                                weight: 3,
                                opacity: 0.6,
                                fillColor: '#60a5fa',
                                fillOpacity: 0.2,
                                dashArray: '10, 10'
                              }}
                            />
                            <Marker
                              position={[selectedLocation.latitude, selectedLocation.longitude]}
                              icon={createMarker("#3b82f6", "new")}
                            >
                              <Popup>
                                <div className="p-2">
                                  <h4 className="font-bold text-blue-600">📍 New Detection Zone</h4>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                                  </p>
                                  <p className="text-xs text-blue-600 mt-2">
                                    🎯 Will create 5km alert radius
                                  </p>
                                </div>
                              </Popup>
                            </Marker>
                          </>
                        )}
                      </MapContainer>
                    ) : (
                      <SatelliteMap
                        alertPoints={alertPoints}
                        selectedLocation={selectedLocation}
                        onMapClick={handleMapClick}
                        onRemovePoint={removePoint}
                        center={defaultCenter}
                        zoom={defaultZoom}
                      />
                    )}
                  </div>

                  {/* Map Overlay Info */}
                  {selectedLocation && (
                    <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-xl border">
                      <div className="flex items-center">
                        <span className="text-3xl mr-3">📍</span>
                        <div>
                          <h4 className="font-bold text-gray-900">Location Selected</h4>
                          <p className="text-sm text-gray-600">
                            {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                          </p>
                          <p className="text-xs text-blue-600 mt-1">5km detection zone ready</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="absolute top-4 left-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-xl shadow-lg">
                    <div className="flex items-center">
                      <span className="animate-pulse mr-2">🟢</span>
                      <span className="text-sm font-medium">
                        {mapView === "satellite" ? "Satellite" : "Standard"} • 5km Zones Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Control Panel */}
            <div className="space-y-6">
              {/* Add Point Form */}
              {selectedLocation ? (
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center">
                      <span className="mr-2">📝</span>
                      Add Detection Zone
                    </h3>
                    <button
                      onClick={cancelSelection}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <span className="text-xl">✕</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Zone Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target. value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        placeholder="e.g., Forest Edge Detection Zone"
                        required
                        maxLength={255}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e. target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        placeholder="Details about this detection zone..."
                        rows="3"
                        maxLength={1000}
                      />
                    </div>

                    <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
                      <h4 className="font-medium text-yellow-800 mb-3 flex items-center">
                        <span className="mr-2">🎯</span>
                        Detection Zone Details
                      </h4>
                      <div className="text-sm text-yellow-700 space-y-2">
                        <p><strong>📍 Center:</strong> {selectedLocation.latitude.toFixed(6)}°, {selectedLocation.longitude.toFixed(6)}°</p>
                        <p><strong>📏 Radius:</strong> 5 kilometers</p>
                        <p><strong>📐 Coverage:</strong> ~78. 5 km² area</p>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={addPoint}
                        disabled={submitting || !formData.name. trim()}
                        className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 px-4 rounded-lg font-bold hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center transform hover:scale-105"
                      >
                        {submitting ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Creating Zone...
                          </>
                        ) : (
                          <>
                            <span className="mr-2">🎯</span>
                            Create 5km Zone
                          </>
                        )}
                      </button>
                      <button
                        onClick={cancelSelection}
                        className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        disabled={submitting}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">ℹ️</span>
                    Zone Instructions
                  </h3>
                  <div className="space-y-3 text-gray-600">
                    <div className="flex items-start">
                      <span className="mr-3 text-lg">🎯</span>
                      <p>Click anywhere on the map to create a 5km detection zone</p>
                    </div>
                    <div className="flex items-start">
                      <span className="mr-3 text-lg">🟡</span>
                      <p>Yellow circles show active 5km detection areas</p>
                    </div>
                    <div className="flex items-start">
                      <span className="mr-3 text-lg">🚨</span>
                      <p>Red markers indicate zone centers with alert capabilities</p>
                    </div>
                    <div className="flex items-start">
                      <span className="mr-3 text-lg">🛰️</span>
                      <p>Switch between Standard and Satellite views as needed</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Statistics */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">📊</span>
                  Zone Statistics
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-yellow-100 text-sm">Detection Zones</p>
                        <p className="text-3xl font-bold">{alertPoints.length}</p>
                        <p className="text-xs text-yellow-200 mt-1">
                          ~{(alertPoints.length * 78.5). toFixed(1)} km² coverage
                        </p>
                      </div>
                      <span className="text-4xl">🎯</span>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-4 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">Map View</p>
                        <p className="text-lg font-bold capitalize">{mapView}</p>
                      </div>
                      <span className="text-2xl">{mapView === "satellite" ? "🛰️" : "🗺️"}</span>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm">Status</p>
                        <p className="text-lg font-bold">Active</p>
                      </div>
                      <span className="text-2xl">✅</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Alert Points List */}
          {alertPoints.length > 0 && (
            <div className="mt-8 bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <span className="mr-2">🎯</span>
                  Active Detection Zones ({alertPoints.length}) - 5km Radius Each
                </h2>
              </div>
              <div className="p-6">
                <div className="grid gap-6">
                  {alertPoints.map((point, index) => (
                    <div key={point.id} className="border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 hover:shadow-lg transition-all transform hover:scale-105">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-3">
                            <div className="flex items-center justify-center w-10 h-10 bg-yellow-500 text-white rounded-full text-sm font-bold mr-4">
                              {index + 1}
                            </div>
                            <h4 className="text-xl font-bold text-gray-900">{point.name}</h4>
                          </div>
                          {point.description && (
                            <p className="text-gray-700 mb-3 ml-14 leading-relaxed">{point.description}</p>
                          )}
                          <div className="ml-14 text-sm space-y-2">
                            <p className="flex items-center text-gray-600">
                              <span className="mr-2">📍</span>
                              <strong>Center:</strong> {parseFloat(point.latitude).toFixed(6)}, {parseFloat(point.longitude).toFixed(6)}
                            </p>
                            <p className="flex items-center text-gray-600">
                              <span className="mr-2">📅</span>
                              <strong>Created:</strong> {new Date(point. created_at).toLocaleDateString()}
                            </p>
                            <p className="flex items-center text-yellow-600">
                              <span className="mr-2">🎯</span>
                              <strong>Detection Radius:</strong> 5.0 km (~78.5 km² area)
                            </p>
                            <p className="flex items-center text-gray-500">
                              <span className="mr-2">🆔</span>
                              <strong>Zone ID:</strong> {point.id}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removePoint(point.id)}
                          className="ml-6 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-3 rounded-xl transition-all transform hover:scale-110"
                          title="Remove Detection Zone"
                        >
                          <span className="text-lg">🗑️</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Empty State */}
          {alertPoints.length === 0 && !loading && (
            <div className="mt-8 bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl p-12 text-center">
              <div className="text-8xl mb-6">🎯</div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Ready to Create Detection Zones</h3>
              <p className="text-gray-600 text-lg mb-3">
                Your system is ready to create 5km radius detection zones for elephant monitoring. 
              </p>
              <p className="text-gray-500 mb-6">
                Click anywhere on the map above to place your first detection zone with automatic 5km coverage.
              </p>
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-yellow-800 text-sm font-medium">
                  💡 Each zone covers ~78.5 km² with 5km radius detection capability
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}