import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import maplibregl from 'maplibre-gl'
import 'leaflet/dist/leaflet.css'
import 'maplibre-gl/dist/maplibre-gl.css'

// MapTiler API Key from environment variables
const MAPTILER_KEY = import.meta.env. VITE_MAPTILER_KEY
const BACKEND_URL = import. meta.env. VITE_BACKEND_URL || 'http://localhost:4000'

// Real API that connects to Supabase database
const api = {
  getAlertPoints: async () => {
    try {
      console.log('Public page: Fetching alert points from Supabase database');
      
      const response = await fetch(`${BACKEND_URL}/api/alert-points`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (! response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console. log('Public page: Alert points loaded from database:', result. data?. length || 0);
      return result;
    } catch (error) {
      console.error('Public page: Error fetching alert points:', error);
      throw error;
    }
  }
}

// Clean Google-style Warning Marker
const createWarningMarker = () => {
  return L.divIcon({
    className: 'custom-warning-marker',
    html: `
      <div class="marker-container">
        <div class="marker-pin">
          <span class="marker-icon">⚠️</span>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  })
}

// Simplified Satellite Map Component
const SatelliteMapReadOnly = ({ alertPoints, center, zoom }) => {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markers = useRef([])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    try {
      map. current = new maplibregl. Map({
        container: mapContainer.current,
        style: `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`,
        center: [center[1], center[0]], // [lng, lat]
        zoom: zoom - 1
      })

      map.current.on("load", () => {
        console.log("✅ Satellite map loaded successfully");
      });

      map.current.addControl(new maplibregl. NavigationControl(), 'top-right')

    } catch (error) {
      console. error("❌ Error initializing satellite map:", error);
    }

    return () => {
      if (map.current) {
        map.current. remove()
        map.current = null
      }
    }
  }, [])

  // Update markers when alertPoints change
  useEffect(() => {
    if (! map.current || ! map.current.loaded()) return

    // Clear existing markers
    markers.current.forEach(marker => marker.remove())
    markers.current = []

    // Add alert point markers (simplified)
    alertPoints.forEach(point => {
      try {
        const lat = parseFloat(point.latitude)
        const lng = parseFloat(point.longitude)

        // Create simple marker element
        const el = document.createElement('div')
        el.className = 'satellite-marker'
        el.innerHTML = `
          <div style="
            width: 36px;
            height: 36px;
            background: #ea4335;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <span style="
              font-size: 18px;
              color: white;
              font-weight: bold;
            ">⚠️</span>
          </div>
        `

        const popup = new maplibregl.Popup({ offset: 25 })
          .setHTML(`
            <div style="padding: 16px; min-width: 250px; font-family: system-ui;">
              <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 20px; margin-right: 8px;">⚠️</span>
                <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #202124;">${point.name}</h3>
              </div>
              ${point.description ? `
                <p style="margin: 0 0 12px 0; color: #5f6368; font-size: 14px; line-height: 1.4;">
                  ${point.description}
                </p>
              ` : ''}
              <div style="margin-bottom: 12px; padding: 10px; background: #fff3cd; border-radius: 6px; border-left: 3px solid #ffc107;">
                <p style="margin: 0; font-size: 12px; color: #856404;">
                  <strong>📍 Location:</strong> ${lat.toFixed(6)}, ${lng. toFixed(6)}
                </p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #856404;">
                  <strong>📅 Alert Since:</strong> ${new Date(point.created_at).toLocaleDateString()}
                </p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #856404;">
                  <strong>⚠️ Danger Zone:</strong> 10 km radius
                </p>
              </div>
              <div style="padding: 10px; background: #f8d7da; border-radius: 6px; border-left: 3px solid #dc3545;">
                <p style="margin: 0; font-size: 12px; color: #721c24; font-weight: 600;">
                  🚨 Exercise extreme caution in this area
                </p>
              </div>
            </div>
          `)

        const marker = new maplibregl.Marker(el)
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map.current)

        markers.current.push(marker)
      } catch (error) {
        console.error("❌ Error adding marker:", error);
      }
    })
  }, [alertPoints])

  return (
    <div 
      ref={mapContainer} 
      style={{ 
        width: '100%', 
        height: '100%',
        minHeight: "500px" 
      }} 
    />
  )
}

const AlertZone = () => {
  const [alertPoints, setAlertPoints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mapView, setMapView] = useState('standard')
  const [mapKey, setMapKey] = useState(0) // Force re-render of map

  // Default center (India)
  const defaultCenter = [20.5937, 78.9629]
  const defaultZoom = 6

  useEffect(() => {
    fetchAlertPoints()
  }, [])

  const fetchAlertPoints = async () => {
    try {
      setLoading(true)
      setError('')
      
      const result = await api.getAlertPoints()
      
      if (result.success) {
        setAlertPoints(result.data || [])
        console.log('✅ Public page loaded', result.data?.length || 0, 'alert points from Supabase');
      } else {
        throw new Error(result. error || 'Failed to load alert points');
      }
    } catch (err) {
      console.error('Public page fetch error:', err)
      setError(`Failed to load alert points: ${err.message}`)
      setAlertPoints([])
    } finally {
      setLoading(false)
    }
  }

  // Handle map view change
  const handleMapViewChange = (newView) => {
    setMapView(newView)
    setMapKey(prev => prev + 1) // Force re-render
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading elephant alert zones...</p>
          <p className="mt-2 text-sm text-gray-400">Connecting to database...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        /* Leaflet container fix */
        .leaflet-container {
          height: 100% !important;
          width: 100% !important;
          z-index: 1;
        }
        
        /* Custom marker styles */
        .custom-warning-marker {
          background: none ! important;
          border: none !important;
        }
        
        . marker-container {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .marker-pin {
          width: 36px;
          height: 36px;
          background: #ea4335;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        
        .marker-icon {
          font-size: 18px;
          color: white;
          font-weight: bold;
        }
        
        /* Satellite marker styles */
        .satellite-marker {
          cursor: pointer;
        }
        
        /* Fix leaflet popup z-index */
        .leaflet-popup {
          z-index: 1000 !important;
        }
        
        . leaflet-popup-pane {
          z-index: 1000 !important;
        }
      `}</style>
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Clean Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              🐘 Elephant Alert Zones
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Stay informed about current elephant detection zones for your safety.     
              These areas have been identified as locations where elephant activity has been detected.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Real-time data • 10km safety radius zones
            </p>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <div className="flex items-center">
                <span className="mr-2">⚠️</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Main Map Section */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
            {/* Clean Map Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <span className="mr-2">🗺️</span>
                  Alert Zone Map
                </h2>
                
                {/* Clean Map Toggle */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => handleMapViewChange('standard')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      mapView === 'standard'
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    🗺️ Standard
                  </button>
                  <button
                    onClick={() => handleMapViewChange('satellite')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      mapView === 'satellite'
                        ?  "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    🛰️ Satellite
                  </button>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <p className="text-gray-600 text-sm">
                  🟡 Yellow circles show 10km safety zones around alert points
                </p>
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {alertPoints.length} Active Zones
                </div>
              </div>
            </div>

            {/* Map Container */}
            <div className="relative">
              <div style={{ height: "500px" }}>
                {mapView === 'standard' ? (
                  <MapContainer
                    key={`standard-${mapKey}`} // Force re-render with key
                    center={defaultCenter}
                    zoom={defaultZoom}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                    attributionControl={true}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      maxZoom={19}
                    />
                    
                    {/* Alert points with 10km circles */}
                    {alertPoints.map((point) => {
                      const lat = parseFloat(point.latitude);
                      const lng = parseFloat(point.longitude);
                      
                      // Validate coordinates
                      if (isNaN(lat) || isNaN(lng)) {
                        console.warn('Invalid coordinates for point:', point);
                        return null;
                      }
                      
                      return (
                        <React.Fragment key={point.id}>
                          {/* 10km Radius Circle */}
                          <Circle
                            center={[lat, lng]}
                            radius={10000} // 10km in meters
                            pathOptions={{
                              color: '#fbbf24',
                              weight: 2,
                              opacity: 0.8,
                              fillColor: '#fef3c7',
                              fillOpacity: 0.3,
                            }}
                          />
                          
                          {/* Alert Point Marker */}
                          <Marker
                            position={[lat, lng]}
                            icon={createWarningMarker()}
                          >
                            <Popup maxWidth={300}>
                              <div className="p-3 min-w-[250px]">
                                <div className="flex items-center mb-3">
                                  <span className="text-xl mr-2">⚠️</span>
                                  <h3 className="font-semibold text-gray-900">{point.name}</h3>
                                </div>
                                {point.description && (
                                  <p className="text-gray-600 text-sm mb-3">{point.description}</p>
                                )}
                                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
                                  <div className="text-xs text-yellow-800 space-y-1">
                                    <p><strong>📍 Location:</strong> {lat.toFixed(6)}, {lng. toFixed(6)}</p>
                                    <p><strong>📅 Alert Since:</strong> {new Date(point. created_at).toLocaleDateString()}</p>
                                    <p><strong>⚠️ Safety Zone:</strong> 10 km radius</p>
                                  </div>
                                </div>
                                <div className="bg-orange-50 border border-orange-200 rounded p-2">
                                  <p className="text-xs text-orange-800 font-medium">
                                    🚨 Exercise caution in this area
                                  </p>
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                        </React.Fragment>
                      );
                    })}
                  </MapContainer>
                ) : (
                  <SatelliteMapReadOnly
                    key={`satellite-${mapKey}`} // Force re-render with key
                    alertPoints={alertPoints}
                    center={defaultCenter}
                    zoom={defaultZoom}
                  />
                )}
              </div>

              {/* Clean Map Overlays */}
              {alertPoints.length > 0 && (
                <div className="absolute bottom-4 left-4 bg-white rounded-lg p-3 shadow-lg border">
                  <div className="flex items-center text-sm">
                    <span className="text-lg mr-2">⚠️</span>
                    <div>
                      <div className="font-semibold text-gray-900">{alertPoints.length} Alert Zones</div>
                      <div className="text-gray-600">Live monitoring active</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium">
                <div className="flex items-center">
                  <span className="animate-pulse mr-2">🔵</span>
                  Live • {mapView === "satellite" ? "Satellite" : "Standard"} View
                </div>
              </div>
            </div>
          </div>

          {/* Clean Safety Information Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Travel Safety */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-3 rounded-full mr-4">
                  <span className="text-2xl">🚗</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Travel Safety</h3>
              </div>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Avoid marked 10km zones when possible
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Use alternate routes
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Travel during daylight hours
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Keep windows closed near zones
                </li>
              </ul>
            </div>

            {/* Emergency Contact */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center mb-4">
                <div className="bg-green-100 p-3 rounded-full mr-4">
                  <span className="text-2xl">📞</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Emergency Contact</h3>
              </div>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  Report sightings immediately
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  Emergency Services: <strong>100</strong>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  Wildlife Helpline: <strong>1926</strong>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  Forest Department offices
                </li>
              </ul>
            </div>

            {/* High Risk Times */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center mb-4">
                <div className="bg-orange-100 p-3 rounded-full mr-4">
                  <span className="text-2xl">⏰</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">High Risk Times</h3>
              </div>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <strong>Dawn:</strong> 5:00 AM - 7:00 AM
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <strong>Dusk:</strong> 6:00 PM - 8:00 PM
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  Night hours (avoid completely)
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  Monsoon season (June-Sept)
                </li>
              </ul>
            </div>
          </div>

          {/* Clean Alert Points List */}
          {alertPoints.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Current Alert Zones ({alertPoints.length})
                </h2>
              </div>
              <div className="p-6">
                <div className="grid gap-4">
                  {alertPoints. map((point, index) => (
                    <div key={point.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold mr-3">
                              {index + 1}
                            </div>
                            <h4 className="font-semibold text-gray-900 flex items-center">
                              <span className="mr-2">⚠️</span>
                              {point. name}
                            </h4>
                          </div>
                          {point.description && (
                            <p className="text-gray-600 mb-2 ml-11">{point.description}</p>
                          )}
                          <div className="ml-11 text-sm text-gray-500 space-y-1">
                            <p><strong>📍 Location:</strong> {parseFloat(point.latitude). toFixed(6)}, {parseFloat(point.longitude).toFixed(6)}</p>
                            <p><strong>📅 Active Since:</strong> {new Date(point.created_at).toLocaleDateString()}</p>
                            <p><strong>🎯 Safety Zone:</strong> 10 km radius (~314 km²)</p>
                          </div>
                        </div>
                        <div className="ml-4 bg-yellow-100 p-2 rounded-lg">
                          <span className="text-xl">⚠️</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Clean Empty State */}
          {alertPoints.length === 0 && ! loading && (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">No Active Alert Zones</h3>
              <p className="text-gray-600 text-lg mb-4">
                Great news! Currently, there are no active elephant alert zones.  
              </p>
              <p className="text-gray-500">
                Continue to monitor this page for updates and always follow general wildlife safety guidelines.
              </p>
            </div>
          )}

          {/* Clean Footer Info */}
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">🗺️</span>
                  Map Legend
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="w-6 h-6 mr-3 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">⚠️</span>
                    </div>
                    <span className="text-gray-700">Alert Zone Center</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-6 h-6 mr-3 bg-yellow-200 border-2 border-yellow-400 rounded-full flex items-center justify-center">
                      <span className="text-yellow-700 text-xs font-bold">10</span>
                    </div>
                    <span className="text-gray-700">10km Safety Zone</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">📊</span>
                  System Status
                </h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Database Connected
                  </p>
                  <p className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Real-time Updates
                  </p>
                  <p className="flex items-center">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    Pan-India Coverage
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default AlertZone