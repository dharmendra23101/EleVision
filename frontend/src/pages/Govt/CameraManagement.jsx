import React, { useState, useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import maplibregl from 'maplibre-gl'
import 'leaflet/dist/leaflet.css'
import 'maplibre-gl/dist/maplibre-gl.css'
import { supabase } from '../../lib/supabase'

// MapTiler API Key
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY

// MapTiler style mapping
const mapStyleMap = {
  standard: "basic-v2",
  satellite: "satellite",
  hybrid: "hybrid"
}

// --- ELEPHANT TRACKING CONSTANTS ---
const MAX_ELEPHANT_SPEED_KMH = 25 // Maximum elephant movement speed in km/h

// --- LEAFLET SETUP ---
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// --- CUSTOM ICONS ---
const createCameraIcon = (type, cameraId) => {
  const getTypeColor = () => {
    if (type === 'both') return '#8B5CF6'
    if (type === 'image') return '#EF4444'
    if (type === 'audio') return '#F59E0B'
    return '#6B7280'
  }

  const getTypeIcon = () => {
    if (type === 'both') return '📷🔊'
    if (type === 'image') return '📷'
    if (type === 'audio') return '🔊'
    return '📹'
  }

  const numericId = cameraId.replace(/[^0-9]/g, '') || '?'

  return L.divIcon({
    html: `
      <div style="
        background-color: ${getTypeColor()};
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 3px 10px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
        cursor: pointer;
        color: white;
        position: relative;
      ">
        <div style="
          position: absolute;
          top: -2px;
          right: -2px;
          background: rgba(0,0,0,0.7);
          color: white;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: bold;
        ">
          ${numericId}
        </div>
        ${getTypeIcon()}
      </div>
    `,
    className: 'camera-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

// --- DETECTION POINT ICON ---
const createDetectionIcon = (type, isRecent = false) => {
  const getTypeColor = () => {
    if (type === 'both') return '#8B5CF6'
    if (type === 'image') return '#EF4444'
    if (type === 'audio') return '#F59E0B'
    return '#6B7280'
  }

  const size = isRecent ? 12 : 8
  const opacity = isRecent ? 0.9 : 0.7

  return L.divIcon({
    html: `
      <div style="
        background-color: ${getTypeColor()};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        opacity: ${opacity};
        ${isRecent ? 'animation: pulse 2s infinite;' : ''}
      "></div>
    `,
    className: 'detection-point',
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
  })
}

// --- HELPER FUNCTIONS ---
const deg2rad = (deg) => deg * (Math.PI / 180)

const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

const calculateBearing = (lat1, lng1, lat2, lng2) => {
  const dLon = deg2rad(lng2 - lng1)
  const y = Math.sin(dLon) * Math.cos(deg2rad(lat2))
  const x = Math.cos(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) -
            Math.sin(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(dLon)
  const bearing = Math.atan2(y, x)
  return (bearing * 180 / Math.PI + 360) % 360
}

const getRandomColor = () => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F1948A', '#85C1E9', '#76D7C4', '#F7DC6F', '#BB8FCE'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

// --- ARROW ICON FOR DIRECTION (Similar to prototype) ---
const createArrowIcon = (color, rotation) => {
  return L.divIcon({
    html: `
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${rotation}deg)">
        <path d="M12 2 L12 18 M12 18 L7 13 M12 18 L17 13" 
              stroke="${color}" 
              stroke-width="2" 
              fill="none" 
              stroke-linecap="round" 
              stroke-linejoin="round"/>
      </svg>
    `,
    className: 'arrow-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  })
}

// --- FIXED ELEPHANT PATH TRACKING ALGORITHM (Exactly like prototype) ---
const processElephantPaths = (detectionData) => {
  if (!detectionData || detectionData.length === 0) return []

  // Filter valid detections
  const validDetections = detectionData
    .filter(d => d.latitude && d.longitude && (d.image_found || d.voice_found))
    .map(d => ({
      ...d,
      lat: parseFloat(d.latitude),
      lng: parseFloat(d.longitude),
      time: new Date(d.timestamp)
    }))
    .sort((a, b) => a.time - b.time) // Sort by time ascending

  if (validDetections.length < 2) return []

  let elephantPaths = []

  // Process each detection point
  validDetections.forEach(point => {
    let bestPathIndex = -1
    let lowestSpeedDiff = Infinity

    // Check each existing path to see if this point can be added
    for (let i = 0; i < elephantPaths.length; i++) {
      const currentPath = elephantPaths[i]
      const lastPoint = currentPath[currentPath.length - 1]
      
      // Calculate time difference in hours
      const timeDiffHours = (point.time - lastPoint.time) / (1000 * 60 * 60)
      
      // Only consider if time is positive (chronological order)
      if (timeDiffHours > 0) {
        const distKm = getDistanceFromLatLonInKm(
          lastPoint.lat, lastPoint.lng, 
          point.lat, point.lng
        )
        const requiredSpeed = distKm / timeDiffHours
        
        // Check if movement is physically possible for an elephant
        if (requiredSpeed <= MAX_ELEPHANT_SPEED_KMH) {
          // Choose the path with the lowest required speed
          if (requiredSpeed < lowestSpeedDiff) {
            lowestSpeedDiff = requiredSpeed
            bestPathIndex = i
          }
        }
      }
    }

    // Add point to best matching path or create new path
    if (bestPathIndex > -1) {
      elephantPaths[bestPathIndex].push(point)
    } else {
      elephantPaths.push([point])
    }
  })

  // Filter paths with at least 2 points and add metadata
  return elephantPaths
    .filter(path => path.length >= 2)
    .map((path, index) => {
      // Calculate statistics
      let totalDistance = 0
      let segmentDetails = []
      
      for (let i = 1; i < path.length; i++) {
        const prev = path[i - 1]
        const curr = path[i]
        const distance = getDistanceFromLatLonInKm(prev.lat, prev.lng, curr.lat, curr.lng)
        const timeHours = (curr.time - prev.time) / (1000 * 60 * 60)
        const speed = timeHours > 0 ? distance / timeHours : 0
        
        totalDistance += distance
        
        segmentDetails.push({
          distance,
          timeHours,
          speed,
          bearing: calculateBearing(prev.lat, prev.lng, curr.lat, curr.lng)
        })
      }
      
      const totalTimeHours = (path[path.length - 1].time - path[0].time) / (1000 * 60 * 60)
      const avgSpeed = totalTimeHours > 0 ? totalDistance / totalTimeHours : 0
      
      return {
        id: `elephant_path_${index}_${Date.now()}`,
        name: `Elephant Group ${index + 1}`,
        path: path,
        coordinates: path.map(p => [p.lat, p.lng]),
        color: getRandomColor(),
        startTime: path[0].time,
        endTime: path[path.length - 1].time,
        totalDistance,
        detectionCount: path.length,
        avgSpeed,
        segmentDetails,
        totalTimeHours
      }
    })
}

// --- RESIZABLE PANEL COMPONENT ---
const ResizablePanel = ({ children, initialHeight = 300, minHeight = 150, maxHeight = 600 }) => {
  const [height, setHeight] = useState(initialHeight)
  const [isResizing, setIsResizing] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return
      const newHeight = window.innerHeight - e.clientY
      if (newHeight >= minHeight && newHeight <= maxHeight) {
        setHeight(newHeight)
      }
    }

    const handleMouseUp = () => setIsResizing(false)

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, minHeight, maxHeight])

  return (
    <div 
      ref={panelRef}
      className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg"
      style={{ height: `${height}px`, zIndex: 1000 }}
    >
      <div 
        className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
        onMouseDown={() => setIsResizing(true)}
      >
        <div className="w-12 h-1 bg-gray-400 rounded-full"></div>
      </div>
      
      <div className="h-full pt-2 overflow-hidden flex flex-col">
        {children}
      </div>
    </div>
  )
}

// --- SATELLITE MAP COMPONENT ---
const SatelliteMap = ({ cameras, selectedCamera, onCameraClick, mapView, center, zoom, detectionPoints, elephantPaths, showPoints, showPaths }) => {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markers = useRef([])

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: `https://api.maptiler.com/maps/${mapStyleMap[mapView]}/style.json?key=${MAPTILER_KEY}`,
        center: [center[1], center[0]],
        zoom: zoom - 1
      })

      map.current.addControl(new maplibregl.NavigationControl(), 'top-right')

    } catch (error) {
      console.error("Error loading satellite map:", error)
    }

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [mapView])

  useEffect(() => {
    if (!map.current) return

    const updateMarkers = () => {
      markers.current.forEach(marker => marker.remove())
      markers.current = []

      // Add camera markers
      cameras.forEach(camera => {
        try {
          if (!camera.latitude || !camera.longitude) return

          const numericId = camera.id.replace(/[^0-9]/g, '') || '?'
          const typeColor = camera.type === 'both' ? '#8B5CF6' : 
                           camera.type === 'image' ? '#EF4444' : 
                           camera.type === 'audio' ? '#F59E0B' : '#6B7280'

          const el = document.createElement('div')
          el.innerHTML = `
            <div style="
              width: 36px;
              height: 36px;
              background: ${typeColor};
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 3px 10px rgba(0,0,0,0.4);
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              font-weight: bold;
              color: white;
              position: relative;
            ">
              <div style="
                position: absolute;
                top: -2px;
                right: -2px;
                background: rgba(0,0,0,0.7);
                color: white;
                border-radius: 50%;
                width: 16px;
                height: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 9px;
                font-weight: bold;
              ">
                ${numericId}
              </div>
              ${camera.type === 'both' ? '📷🔊' : camera.type === 'image' ? '📷' : camera.type === 'audio' ? '🔊' : '📹'}
            </div>
          `

          el.addEventListener('click', () => onCameraClick(camera))

          const popup = new maplibregl.Popup({ offset: 25 })
            .setHTML(`
              <div style="padding: 12px; min-width: 200px; font-family: system-ui;">
                <h4 style="margin: 0 0 8px 0; font-weight: 600;">📹 ${camera.id}</h4>
                <p style="margin: 0; font-size: 12px; color: #666;">
                  Type: ${camera.type.charAt(0).toUpperCase() + camera.type.slice(1)} Detection
                </p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">
                  Location: ${camera.state || 'Unknown'}, ${camera.district || 'N/A'}
                </p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">
                  Detections: ${camera.detectionCount} total
                </p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">
                  Last: ${camera.lastActivity}
                </p>
              </div>
            `)

          const marker = new maplibregl.Marker(el)
            .setLngLat([parseFloat(camera.longitude), parseFloat(camera.latitude)])
            .setPopup(popup)
            .addTo(map.current)

          markers.current.push(marker)
        } catch (error) {
          console.error("Error adding marker:", error)
        }
      })

      // Add detection points if enabled
      if (showPoints && detectionPoints.length > 0) {
        detectionPoints.forEach((point) => {
          const isRecent = (new Date() - new Date(point.timestamp)) / (1000 * 60 * 60) <= 24
          const pointColor = point.image_found && point.voice_found ? '#8B5CF6' :
                            point.image_found ? '#EF4444' :
                            point.voice_found ? '#F59E0B' : '#6B7280'

          const el = document.createElement('div')
          el.innerHTML = `
            <div style="
              width: ${isRecent ? '12px' : '8px'};
              height: ${isRecent ? '12px' : '8px'};
              background: ${pointColor};
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              opacity: ${isRecent ? '0.9' : '0.7'};
              ${isRecent ? 'animation: pulse 2s infinite;' : ''}
            "></div>
          `

          const popup = new maplibregl.Popup({ offset: 15 })
            .setHTML(`
              <div style="padding: 10px; min-width: 180px; font-family: system-ui;">
                <h5 style="margin: 0 0 6px 0; font-weight: 600;">📍 Detection Point</h5>
                <p style="margin: 0; font-size: 11px; color: #666;">
                  Camera: ${point.camera_id}
                </p>
                <p style="margin: 2px 0; font-size: 11px; color: #666;">
                  Type: ${point.image_found && point.voice_found ? 'Both' : 
                          point.image_found ? 'Image' : 
                          point.voice_found ? 'Audio' : 'None'}
                </p>
                <p style="margin: 2px 0; font-size: 11px; color: #666;">
                  Time: ${new Date(point.timestamp).toLocaleString()}
                </p>
              </div>
            `)

          const marker = new maplibregl.Marker(el)
            .setLngLat([parseFloat(point.longitude), parseFloat(point.latitude)])
            .setPopup(popup)
            .addTo(map.current)

          markers.current.push(marker)
        })
      }

      // Add elephant paths if enabled
      if (showPaths && elephantPaths.length > 0) {
        elephantPaths.forEach((elephantPath, index) => {
          // Remove existing path layers
          if (map.current.getSource(`elephant-path-${index}`)) {
            map.current.removeLayer(`elephant-path-line-${index}`)
            map.current.removeSource(`elephant-path-${index}`)
          }

          // Add polyline for elephant path
          const coordinates = elephantPath.coordinates.map(coord => [coord[1], coord[0]])
          
          map.current.addSource(`elephant-path-${index}`, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {
                pathId: elephantPath.id,
                name: elephantPath.name,
                detectionCount: elephantPath.detectionCount,
                totalDistance: elephantPath.totalDistance,
                avgSpeed: elephantPath.avgSpeed
              },
              geometry: {
                type: 'LineString',
                coordinates: coordinates
              }
            }
          })

          map.current.addLayer({
            id: `elephant-path-line-${index}`,
            type: 'line',
            source: `elephant-path-${index}`,
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': elephantPath.color,
              'line-width': 4,
              'line-opacity': 0.8,
              'line-dasharray': [10, 10]
            }
          })

          // Add arrow markers
          elephantPath.segmentDetails.forEach((segment, segmentIndex) => {
            const fromPoint = elephantPath.path[segment.fromIndex || segmentIndex]
            const toPoint = elephantPath.path[segment.toIndex || segmentIndex + 1]
            
            const midLat = (fromPoint.lat + toPoint.lat) / 2
            const midLng = (fromPoint.lng + toPoint.lng) / 2
            
            const arrowEl = document.createElement('div')
            arrowEl.innerHTML = `
              <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${segment.bearing}deg)">
                <path d="M12 2 L12 18 M12 18 L7 13 M12 18 L17 13" 
                      stroke="${elephantPath.color}" 
                      stroke-width="2" 
                      fill="none" 
                      stroke-linecap="round" 
                      stroke-linejoin="round"/>
              </svg>
            `

            const arrowMarker = new maplibregl.Marker(arrowEl)
              .setLngLat([midLng, midLat])
              .addTo(map.current)

            markers.current.push(arrowMarker)
          })

          // Add path point markers
          elephantPath.path.forEach((point, pointIndex) => {
            const el = document.createElement('div')
            el.innerHTML = `
              <div style="
                width: 12px;
                height: 12px;
                background: ${elephantPath.color};
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                cursor: pointer;
              "></div>
            `

            const popup = new maplibregl.Popup({ offset: 15 })
              .setHTML(`
                <div style="padding: 12px; min-width: 200px; font-family: system-ui;">
                  <h5 style="margin: 0 0 8px 0; font-weight: 600;">🐘 ${elephantPath.name}</h5>
                  <p style="margin: 0; font-size: 12px; color: #666;">
                    Point ${pointIndex + 1} of ${elephantPath.path.length}
                  </p>
                  <p style="margin: 2px 0; font-size: 12px; color: #666;">
                    Time: ${point.time.toLocaleString()}
                  </p>
                  <p style="margin: 2px 0; font-size: 12px; color: #666;">
                    Detection: ${point.image_found && point.voice_found ? 'Both 📷🔊' : 
                               point.image_found ? 'Image 📷' : 
                               point.voice_found ? 'Audio 🔊' : 'None ❌'}
                  </p>
                </div>
              `)

            const pointMarker = new maplibregl.Marker(el)
              .setLngLat([point.lng, point.lat])
              .setPopup(popup)
              .addTo(map.current)

            markers.current.push(pointMarker)
          })
        })
      }
    }

    if (map.current._loaded) {
      updateMarkers()
    } else {
      map.current.on("load", updateMarkers)
    }

  }, [cameras, onCameraClick, detectionPoints, elephantPaths, showPoints, showPaths])

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
}

// --- MAIN COMPONENT ---
const CameraManagement = () => {
  const [cameras, setCameras] = useState([])
  const [selectedCamera, setSelectedCamera] = useState(null)
  const [selectedCameraData, setSelectedCameraData] = useState([])
  const [allDetectionData, setAllDetectionData] = useState([])
  const [filteredDetectionPoints, setFilteredDetectionPoints] = useState([])
  const [elephantPaths, setElephantPaths] = useState([])
  const [loading, setLoading] = useState(true)
  const [mapView, setMapView] = useState('standard')
  
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [bottomPanelOpen, setBottomPanelOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [showDetectionPoints, setShowDetectionPoints] = useState(false)
  const [showElephantPaths, setShowElephantPaths] = useState(false)
  
  const [filters, setFilters] = useState({
    activityTime: 'all',
    detectionType: 'all',
    dateRange: '7d',
    hasLocation: 'all',
    state: 'all',
    district: 'all',
    block: 'all',
    locality: 'all'
  })

  const [locationOptions, setLocationOptions] = useState({
    states: [],
    districts: [],
    blocks: [],
    localities: []
  })

  const [stats, setStats] = useState({
    totalCameras: 0,
    imageDetections: 0,
    audioDetections: 0,
    bothDetections: 0,
    noDetections: 0,
    totalDetections: 0,
    detectionPoints: 0,
    elephantPaths: 0
  })

  const defaultCenter = [20.5937, 78.9629]
  const defaultZoom = 6

  const isRecentActivity = (timestamp, timeFilter = '24h') => {
    if (!timestamp) return false
    const now = new Date()
    const activityTime = new Date(timestamp)
    const hoursDiff = (now - activityTime) / (1000 * 60 * 60)
    
    switch (timeFilter) {
      case '1h': return hoursDiff <= 1
      case '24h': return hoursDiff <= 24
      case '2d': return hoursDiff <= 48
      case '7d': return hoursDiff <= 168
      case '30d': return hoursDiff <= 720
      default: return true
    }
  }

  const getTimeAgo = (dateString) => {
    if (!dateString) return 'Never'
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return new Date(dateString).toLocaleDateString()
  }

  const fetchCameras = async () => {
    try {
      setLoading(true)
      
      // Get all approved cameras
      const { data: camerasData, error: camerasError } = await supabase
        .from('approved_cameras')
        .select('id, password, sim_number, created_at, state, district, block, locality')
        .order('created_at', { ascending: false })

      if (camerasError) throw camerasError

      // Get location options for filters
      const states = [...new Set(camerasData.map(c => c.state).filter(Boolean))]
      const districts = [...new Set(camerasData.map(c => c.district).filter(Boolean))]
      const blocks = [...new Set(camerasData.map(c => c.block).filter(Boolean))]
      const localities = [...new Set(camerasData.map(c => c.locality).filter(Boolean))]
      
      setLocationOptions({ states, districts, blocks, localities })

      // Get ALL detection data
      const { data: allDetections, error: detectionsError } = await supabase
        .from('camera_data')
        .select('*')
        .or('image_found.eq.true,voice_found.eq.true')
        .order('timestamp', { ascending: true })

      if (detectionsError) throw detectionsError
      
      // Filter detections with GPS coordinates
      const detectionPoints = allDetections?.filter(d => d.latitude && d.longitude) || []
      setAllDetectionData(allDetections || [])
      setFilteredDetectionPoints(detectionPoints)

      // Process elephant paths using the FIXED algorithm
      const paths = processElephantPaths(allDetections || [])
      setElephantPaths(paths)

      // Process camera data
      const processedCameras = await Promise.all(
        camerasData.map(async (camera) => {
          const { data: latestActivity } = await supabase
            .from('camera_data')
            .select('timestamp, image_found, voice_found, latitude, longitude')
            .eq('camera_id', camera.id)
            .order('timestamp', { ascending: false })
            .limit(1)

          const { count: detectionCount } = await supabase
            .from('camera_data')
            .select('*', { count: 'exact', head: true })
            .eq('camera_id', camera.id)
            .or('image_found.eq.true,voice_found.eq.true')

          const latest = latestActivity?.[0]

          const type = latest ?  
            (latest.image_found && latest.voice_found ? 'both' :
             latest.image_found ? 'image' : 
             latest.voice_found ? 'audio' : 'none') : 'none'

          return {
            ...camera,
            type,
            detectionCount: detectionCount || 0,
            lastActivity: getTimeAgo(latest?.timestamp),
            lastTimestamp: latest?.timestamp,
            latitude: latest?.latitude,
            longitude: latest?.longitude
          }
        })
      )

      setCameras(processedCameras)

      // Calculate stats
      const totalCameras = processedCameras.length
      const imageDetections = processedCameras.filter(c => c.type === 'image').length
      const audioDetections = processedCameras.filter(c => c.type === 'audio').length
      const bothDetections = processedCameras.filter(c => c.type === 'both').length
      const noDetections = processedCameras.filter(c => c.type === 'none').length
      const totalDetections = processedCameras.reduce((sum, c) => sum + c.detectionCount, 0)

      setStats({ 
        totalCameras, 
        imageDetections, 
        audioDetections, 
        bothDetections, 
        noDetections, 
        totalDetections,
        detectionPoints: detectionPoints.length,
        elephantPaths: paths.length
      })

    } catch (error) {
      console.error('Error fetching cameras:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyDetectionFilters = useMemo(() => {
    let filtered = allDetectionData.filter(d => d.latitude && d.longitude)

    if (filters.activityTime !== 'all') {
      filtered = filtered.filter(d => isRecentActivity(d.timestamp, filters.activityTime))
    }

    if (filters.detectionType !== 'all') {
      filtered = filtered.filter(d => {
        if (filters.detectionType === 'image') return d.image_found && !d.voice_found
        if (filters.detectionType === 'audio') return d.voice_found && !d.image_found
        if (filters.detectionType === 'both') return d.image_found && d.voice_found
        if (filters.detectionType === 'none') return !d.image_found && !d.voice_found
        return true
      })
    }

    return filtered
  }, [allDetectionData, filters])

  useEffect(() => {
    setFilteredDetectionPoints(applyDetectionFilters)
  }, [applyDetectionFilters])

  const fetchSelectedCameraData = async (cameraId) => {
    if (!cameraId) return
    
    try {
      let query = supabase
        .from('camera_data')
        .select('*')
        .eq('camera_id', cameraId)
        .order('timestamp', { ascending: false })

      if (filters.detectionType !== 'all') {
        if (filters.detectionType === 'image') query = query.eq('image_found', true).eq('voice_found', false)
        else if (filters.detectionType === 'audio') query = query.eq('voice_found', true).eq('image_found', false)
        else if (filters.detectionType === 'both') query = query.eq('image_found', true).eq('voice_found', true)
        else if (filters.detectionType === 'none') query = query.eq('image_found', false).eq('voice_found', false)
      }

      if (filters.dateRange !== 'all') {
        const now = new Date()
        const cutoffDate = new Date()
        if (filters.dateRange === '1d') cutoffDate.setDate(now.getDate() - 1)
        else if (filters.dateRange === '7d') cutoffDate.setDate(now.getDate() - 7)
        else if (filters.dateRange === '30d') cutoffDate.setDate(now.getDate() - 30)
        query = query.gte('timestamp', cutoffDate.toISOString())
      }

      const { data, error } = await query.limit(50)
      if (error) throw error

      setSelectedCameraData(data || [])
    } catch (error) {
      console.error('Error fetching camera data:', error)
    }
  }

  const filteredAndSortedCameras = useMemo(() => {
    let filtered = cameras

    if (searchQuery) {
      filtered = filtered.filter(camera =>
        camera.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camera.state?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camera.district?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camera.block?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camera.locality?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (filters.activityTime !== 'all') {
      filtered = filtered.filter(camera => 
        isRecentActivity(camera.lastTimestamp, filters.activityTime)
      )
    }

    if (filters.state !== 'all') filtered = filtered.filter(c => c.state === filters.state)
    if (filters.district !== 'all') filtered = filtered.filter(c => c.district === filters.district)
    if (filters.block !== 'all') filtered = filtered.filter(c => c.block === filters.block)
    if (filters.locality !== 'all') filtered = filtered.filter(c => c.locality === filters.locality)

    if (filters.detectionType !== 'all') {
      filtered = filtered.filter(camera => camera.type === filters.detectionType)
    }

    if (filters.hasLocation !== 'all') {
      if (filters.hasLocation === 'yes') {
        filtered = filtered.filter(camera => camera.latitude && camera.longitude)
      } else {
        filtered = filtered.filter(camera => !camera.latitude || !camera.longitude)
      }
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.id.localeCompare(b.id)
        case 'voice_detected':
          return (b.type === 'audio' || b.type === 'both' ? 1 : 0) - (a.type === 'audio' || a.type === 'both' ? 1 : 0) || a.id.localeCompare(b.id)
        case 'image_detected':
          return (b.type === 'image' || b.type === 'both' ? 1 : 0) - (a.type === 'image' || a.type === 'both' ? 1 : 0) || a.id.localeCompare(b.id)
        case 'both_detected':
          return (b.type === 'both' ? 1 : 0) - (a.type === 'both' ? 1 : 0) || a.id.localeCompare(b.id)
        case 'no_detection':
          return (b.type === 'none' ? 1 : 0) - (a.type === 'none' ? 1 : 0) || a.id.localeCompare(b.id)
        case 'activity': return new Date(b.lastTimestamp || 0) - new Date(a.lastTimestamp || 0)
        case 'detections': return b.detectionCount - a.detectionCount
        default: return 0
      }
    })

    return filtered
  }, [cameras, searchQuery, filters, sortBy])

  useEffect(() => {
    fetchCameras()
  }, [])

  useEffect(() => {
    if (selectedCamera) {
      fetchSelectedCameraData(selectedCamera.id)
      setBottomPanelOpen(true)
    }
  }, [selectedCamera, filters])

  const handleCameraClick = (camera) => {
    setSelectedCamera(camera)
  }

  const handleMapViewChange = (view) => {
    setMapView(view)
  }

  const resetFilters = () => {
    setFilters({
      activityTime: 'all',
      detectionType: 'all',
      dateRange: '7d',
      hasLocation: 'all',
      state: 'all',
      district: 'all',
      block: 'all',
      locality: 'all'
    })
    setSearchQuery('')
  }

  const getDetectionBadge = (type) => {
    switch (type) {
      case 'both': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">📷🔊 Both</span>
      case 'image': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">📷 Image</span>
      case 'audio': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">🔊 Audio</span>
      default: return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">❌ None</span>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading cameras, analyzing elephant paths...</p>
          <p className="mt-2 text-sm text-gray-500">Max Speed Logic: {MAX_ELEPHANT_SPEED_KMH} km/h</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        .leaflet-container {
          height: 100% !important;
          width: 100% !important;
          z-index: 1;
        }
        
        .camera-marker, .detection-point, .arrow-icon {
          background: none !important;
          border: none !important;
        }
        
        .panel-transition {
          transition: all 0.3s ease-in-out;
        }
        
        .leaflet-div-icon {
          background: transparent !important;
          border: none !important;
        }
        
        .marker-cluster {
          background: rgba(255, 107, 107, 0.8) !important;
          border: 3px solid white !important;
          border-radius: 50% !important;
        }
        
        .marker-cluster div {
          background: rgba(255, 107, 107, 0.9) !important;
          color: white !important;
          font-weight: bold !important;
          border-radius: 50% !important;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50 flex h-screen overflow-hidden">
        {/* Left Panel */}
        <div className={`bg-white shadow-lg border-r border-gray-200 flex flex-col panel-transition ${
          leftPanelOpen ? 'w-80' : 'w-0'
        } overflow-hidden`}>
          
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">📹 Cameras</h2>
              <button onClick={() => setLeftPanelOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                <span className="text-gray-500">←</span>
              </button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Search cameras, locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-blue-50 p-2 rounded text-center">
                <div className="text-lg font-bold text-blue-600">{stats.totalCameras}</div>
                <div className="text-xs text-blue-600">Total</div>
              </div>
              <div className="bg-purple-50 p-2 rounded text-center">
                <div className="text-lg font-bold text-purple-600">{stats.bothDetections}</div>
                <div className="text-xs text-purple-600">Both</div>
              </div>
              <div className="bg-red-50 p-2 rounded text-center">
                <div className="text-lg font-bold text-red-600">{stats.imageDetections}</div>
                <div className="text-xs text-red-600">Image</div>
              </div>
              <div className="bg-amber-50 p-2 rounded text-center">
                <div className="text-lg font-bold text-amber-600">{stats.audioDetections}</div>
                <div className="text-xs text-amber-600">Audio</div>
              </div>
            </div>

            <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">📍</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Detection Points</div>
                    <div className="text-xs text-gray-600">{filteredDetectionPoints.length} points</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetectionPoints(!showDetectionPoints)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    showDetectionPoints ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border border-blue-300'
                  }`}
                >
                  {showDetectionPoints ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="mb-4 p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🐘</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Elephant Paths</div>
                    <div className="text-xs text-gray-600">{stats.elephantPaths} paths • {MAX_ELEPHANT_SPEED_KMH} km/h max</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowElephantPaths(!showElephantPaths)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    showElephantPaths ? 'bg-orange-600 text-white' : 'bg-white text-orange-600 border border-orange-300'
                  }`}
                >
                  {showElephantPaths ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <select
                value={filters.activityTime}
                onChange={(e) => setFilters(prev => ({...prev, activityTime: e.target.value}))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
              >
                <option value="all">All Activity Times</option>
                <option value="1h">Last 1 Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="2d">Last 2 Days</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>

              <select
                value={filters.detectionType}
                onChange={(e) => setFilters(prev => ({...prev, detectionType: e.target.value}))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
              >
                <option value="all">All Detection Types</option>
                <option value="image">Image Only</option>
                <option value="audio">Audio Only</option>
                <option value="both">Both</option>
                <option value="none">No Detection</option>
              </select>

              <select
                value={filters.state}
                onChange={(e) => setFilters(prev => ({...prev, state: e.target.value}))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
              >
                <option value="all">All States</option>
                {locationOptions.states.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
              >
                <option value="name">Sort by Name</option>
                <option value="activity">Sort by Activity</option>
                <option value="detections">Sort by Detection Count</option>
              </select>
            </div>

            {(searchQuery || filters.activityTime !== 'all' || filters.detectionType !== 'all' || filters.state !== 'all' || sortBy !== 'name') && (
              <button onClick={resetFilters} className="w-full mt-2 text-xs text-blue-600 hover:text-blue-800">
                Clear All Filters
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-2 space-y-2">
              {filteredAndSortedCameras.map((camera) => (
                <div
                  key={camera.id}
                  onClick={() => handleCameraClick(camera)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedCamera?.id === camera.id
                      ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">{camera.id}</h4>
                    {getDetectionBadge(camera.type)}
                  </div>
                  
                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="flex justify-between">
                      <span>State:</span>
                      <span className="font-medium">{camera.state || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Detections:</span>
                      <span className="font-medium">{camera.detectionCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Activity:</span>
                      <span>{camera.lastActivity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GPS:</span>
                      <span className={camera.latitude && camera.longitude ? 'text-green-600' : 'text-red-500'}>
                        {camera.latitude && camera.longitude ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-gray-200">
            <button onClick={fetchCameras} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium">
              🔄 Refresh Data
            </button>
          </div>
        </div>

        {/* Main Map Area */}
        <div className="flex-1 relative">
          <div className="absolute top-4 left-4 z-[1000] flex items-center space-x-2">
            {!leftPanelOpen && (
              <button onClick={() => setLeftPanelOpen(true)} className="bg-white hover:bg-gray-50 p-2 rounded-lg shadow-lg border border-gray-200">
                <span className="text-gray-600">📹</span>
              </button>
            )}

            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
              <div className="flex">
                <button onClick={() => handleMapViewChange('standard')} className={`px-4 py-2 text-sm font-medium ${
                  mapView === 'standard' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}>
                  🗺️ Standard
                </button>
                <button onClick={() => handleMapViewChange('satellite')} className={`px-4 py-2 text-sm font-medium ${
                  mapView === 'satellite' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}>
                  🛰️ Satellite
                </button>
                <button onClick={() => handleMapViewChange('hybrid')} className={`px-4 py-2 text-sm font-medium ${
                  mapView === 'hybrid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}>
                  🌍 Hybrid
                </button>
              </div>
            </div>
          </div>

          <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[300px]">
            <h4 className="font-semibold text-gray-900 mb-2">📊 Live Monitoring</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Cameras:</span>
                <span className="font-medium">{stats.totalCameras}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>📍 Detection Points:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-blue-600">{filteredDetectionPoints.length}</span>
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>🐘 Elephant Paths:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-orange-600">{stats.elephantPaths}</span>
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                </div>
              </div>
              <div className="flex justify-between">
                <span>Max Speed Logic:</span>
                <span className="font-medium text-gray-600">{MAX_ELEPHANT_SPEED_KMH} km/h</span>
              </div>
              <div className="flex justify-between">
                <span>Filtered Cameras:</span>
                <span className="font-medium text-gray-600">{filteredAndSortedCameras.length}</span>
              </div>
              {(showDetectionPoints || showElephantPaths) && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs space-y-1">
                  {showDetectionPoints && <div>📍 Showing all detection points</div>}
                  {showElephantPaths && <div>🐘 Tracking {stats.elephantPaths} elephant movement paths</div>}
                </div>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="w-full h-full">
            {mapView === 'standard' ? (
              <MapContainer center={defaultCenter} zoom={defaultZoom} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                
                <MarkerClusterGroup chunkedLoading maxClusterRadius={80} spiderfyOnMaxZoom={true} showCoverageOnHover={false} zoomToBoundsOnClick={true}>
                  {filteredAndSortedCameras.filter(c => c.latitude && c.longitude).map((camera) => (
                    <Marker key={camera.id} position={[parseFloat(camera.latitude), parseFloat(camera.longitude)]} icon={createCameraIcon(camera.type, camera.id)} eventHandlers={{ click: () => handleCameraClick(camera) }}>
                      <Popup>
                        <div className="p-3 min-w-[240px]">
                          <h4 className="font-semibold mb-2">📹 {camera.id}</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between items-center">
                              <span>Detection Type:</span>
                              {getDetectionBadge(camera.type)}
                            </div>
                            <div className="flex justify-between">
                              <span>State:</span>
                              <span className="font-medium">{camera.state || 'Unknown'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Detections:</span>
                              <span className="font-medium">{camera.detectionCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Last Activity:</span>
                              <span>{camera.lastActivity}</span>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MarkerClusterGroup>

                {/* Detection Points */}
                {showDetectionPoints && (
                  <MarkerClusterGroup chunkedLoading maxClusterRadius={30} spiderfyOnMaxZoom={true} showCoverageOnHover={false} zoomToBoundsOnClick={true}>
                    {filteredDetectionPoints.map((point) => {
                      const isRecent = (new Date() - new Date(point.timestamp)) / (1000 * 60 * 60) <= 24
                      const detectionType = point.image_found && point.voice_found ? 'both' : point.image_found ? 'image' : point.voice_found ? 'audio' : 'none'
                      
                      return (
                        <Marker key={`detection-${point.data_id}`} position={[parseFloat(point.latitude), parseFloat(point.longitude)]} icon={createDetectionIcon(detectionType, isRecent)}>
                          <Popup>
                            <div className="p-2 min-w-[180px]">
                              <h5 className="font-semibold mb-1 text-sm">📍 Detection Point</h5>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span>Camera:</span>
                                  <span className="font-medium">{point.camera_id}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Type:</span>
                                  <span className={`px-1 py-0.5 rounded text-xs ${
                                    detectionType === 'both' ? 'bg-purple-100 text-purple-800' :
                                    detectionType === 'image' ? 'bg-red-100 text-red-800' :
                                    detectionType === 'audio' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {detectionType === 'both' ? '📷🔊' : detectionType === 'image' ? '📷' : detectionType === 'audio' ? '🔊' : '❌'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Time:</span>
                                  <span className="font-medium">{new Date(point.timestamp).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      )
                    })}
                  </MarkerClusterGroup>
                )}

                {/* Elephant Paths */}
                {showElephantPaths && elephantPaths.map((elephantPath, index) => (
                  <React.Fragment key={`elephant-path-${index}`}>
                    {/* Path Line */}
                    <Polyline positions={elephantPath.coordinates} color={elephantPath.color} weight={4} opacity={0.8} dashArray="10, 10">
                      <Popup>
                        <div className="p-3">
                          <h4 className="font-semibold mb-2">🐘 {elephantPath.name}</h4>
                          <div className="text-sm space-y-1">
                            <div><strong>Points:</strong> {elephantPath.detectionCount}</div>
                            <div><strong>Distance:</strong> {elephantPath.totalDistance.toFixed(1)} km</div>
                            <div><strong>Duration:</strong> {elephantPath.totalTimeHours.toFixed(1)} hours</div>
                            <div><strong>Avg Speed:</strong> {elephantPath.avgSpeed.toFixed(1)} km/h</div>
                            <div><strong>Start:</strong> {elephantPath.startTime.toLocaleString()}</div>
                            <div><strong>End:</strong> {elephantPath.endTime.toLocaleString()}</div>
                            <div className="mt-2 p-2 bg-orange-50 rounded text-xs">
                              <strong>Max Speed Logic:</strong> {MAX_ELEPHANT_SPEED_KMH} km/h
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Polyline>
                    
                    {/* Direction Arrows */}
                    {elephantPath.segmentDetails.map((segment, segmentIndex) => {
                      const fromPoint = elephantPath.path[segmentIndex]
                      const toPoint = elephantPath.path[segmentIndex + 1]
                      const midLat = (fromPoint.lat + toPoint.lat) / 2
                      const midLng = (fromPoint.lng + toPoint.lng) / 2
                      
                      return (
                        <Marker key={`arrow-${index}-${segmentIndex}`} position={[midLat, midLng]} icon={createArrowIcon(elephantPath.color, segment.bearing)}>
                          <Popup>
                            <div className="p-2">
                              <div className="text-xs">
                                <div><strong>🐘 {elephantPath.name}</strong></div>
                                <div>Segment {segmentIndex + 1} → {segmentIndex + 2}</div>
                                <div>Distance: {segment.distance.toFixed(1)} km</div>
                                <div>Time: {segment.timeHours.toFixed(1)} hours</div>
                                <div>Speed: {segment.speed.toFixed(1)} km/h</div>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      )
                    })}

                    {/* Path Points */}
                    {elephantPath.path.map((point, pointIndex) => (
                      <Marker key={`path-point-${index}-${pointIndex}`} position={[point.lat, point.lng]} icon={L.divIcon({
                        html: `<div style="width: 12px; height: 12px; background: ${elephantPath.color}; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`,
                        className: 'path-point',
                        iconSize: [12, 12],
                        iconAnchor: [6, 6],
                      })}>
                        <Popup>
                          <div className="p-2 min-w-[200px]">
                            <h5 className="font-semibold mb-1 text-sm">🐘 {elephantPath.name}</h5>
                            <div className="space-y-1 text-xs">
                              <div><strong>Point:</strong> {pointIndex + 1} of {elephantPath.path.length}</div>
                              <div><strong>Camera:</strong> {point.camera_id}</div>
                              <div><strong>Time:</strong> {point.time.toLocaleString()}</div>
                              <div><strong>Detection:</strong> {
                                point.image_found && point.voice_found ? 'Both 📷🔊' : 
                                point.image_found ? 'Image 📷' : 
                                point.voice_found ? 'Audio 🔊' : 'None ❌'
                              }</div>
                              {pointIndex > 0 && (
                                <div className="mt-2 p-1 bg-gray-50 rounded">
                                  <div><strong>From Previous:</strong></div>
                                  <div>Distance: {getDistanceFromLatLonInKm(
                                    elephantPath.path[pointIndex-1].lat, 
                                    elephantPath.path[pointIndex-1].lng, 
                                    point.lat, 
                                    point.lng
                                  ).toFixed(1)} km</div>
                                  <div>Time: {((point.time - elephantPath.path[pointIndex-1].time) / (1000 * 60 * 60)).toFixed(1)} hours</div>
                                  <div>Speed: {(getDistanceFromLatLonInKm(
                                    elephantPath.path[pointIndex-1].lat, 
                                    elephantPath.path[pointIndex-1].lng, 
                                    point.lat, 
                                    point.lng
                                  ) / ((point.time - elephantPath.path[pointIndex-1].time) / (1000 * 60 * 60))).toFixed(1)} km/h</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </React.Fragment>
                ))}
              </MapContainer>
            ) : (
              <SatelliteMap
                cameras={filteredAndSortedCameras.filter(c => c.latitude && c.longitude)}
                selectedCamera={selectedCamera}
                onCameraClick={handleCameraClick}
                mapView={mapView}
                center={defaultCenter}
                zoom={defaultZoom}
                detectionPoints={filteredDetectionPoints}
                elephantPaths={elephantPaths}
                showPoints={showDetectionPoints}
                showPaths={showElephantPaths}
              />
            )}
          </div>
        </div>

        {/* Bottom Panel */}
        {bottomPanelOpen && selectedCamera && (
          <ResizablePanel initialHeight={350} minHeight={200} maxHeight={700}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold text-gray-900">📹 {selectedCamera.id}</h3>
                {getDetectionBadge(selectedCamera.type)}
                <span className="text-sm text-gray-500">{selectedCameraData.length} records</span>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={filters.detectionType}
                  onChange={(e) => setFilters(prev => ({...prev, detectionType: e.target.value}))}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="image">Image Only</option>
                  <option value="audio">Audio Only</option>
                  <option value="both">Both</option>
                  <option value="none">No Detection</option>
                </select>

                <button onClick={() => setBottomPanelOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                  <span className="text-gray-500">✕</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {selectedCameraData.length > 0 ? (
                <div className="grid gap-3">
                  {selectedCameraData.slice(0, 30).map((record) => (
                    <div key={record.data_id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg border">
                      <div className="flex-shrink-0 w-28">
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(record.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(record.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="text-xs text-blue-600 font-medium">
                          {getTimeAgo(record.timestamp)}
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        {record.image_found && record.voice_found && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                            📷🔊 Both
                          </span>
                        )}
                        {record.image_found && !record.voice_found && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                            📷 Image
                          </span>
                        )}
                        {!record.image_found && record.voice_found && (
                          <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                            🔊 Audio
                          </span>
                        )}
                        {!record.image_found && !record.voice_found && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                            ❌ None
                          </span>
                        )}
                      </div>

                      <div className="flex-1 text-sm">
                        {record.latitude && record.longitude ? (
                          <div className="space-y-1">
                            <div className="text-green-600 font-medium">📍 GPS Available</div>
                            <div className="text-xs text-gray-600">
                              {parseFloat(record.latitude).toFixed(4)}, {parseFloat(record.longitude).toFixed(4)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-400">📍 No GPS data</div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {record.image_url && (
                          <img src={record.image_url} alt="Detection" className="w-16 h-12 object-cover rounded cursor-pointer hover:opacity-75 border" onClick={() => window.open(record.image_url, '_blank')} />
                        )}
                        {record.voice_url && (
                          <a href={record.voice_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-purple-100 text-purple-600 rounded hover:bg-purple-200">
                            🔊
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">📹</div>
                  <h4 className="text-lg font-medium mb-2">No detection records found</h4>
                </div>
              )}
            </div>
          </ResizablePanel>
        )}
      </div>
    </>
  )
}

export default CameraManagement