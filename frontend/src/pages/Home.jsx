import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import videoSrc from '../assets/e1.mp4'

const Home = () => {
  const { user, profile } = useAuth()
  const [latestDetection, setLatestDetection] = useState(null)
  const [loading, setLoading] = useState(true)

  // FIXED: Correct .or() syntax without spaces
  const fetchLatestDetection = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('camera_data')
        .select('*')
        .or('image_found.eq.true,voice_found.eq.true') // Correct syntax
        .order('timestamp', { ascending: false })
        .limit(1)

      if (error) throw error

      if (data && data.length > 0) {
        setLatestDetection(data[0])
      } else {
        setLatestDetection(null)
      }
    } catch (error) {
      console.error('Error fetching latest detection:', error)
      setLatestDetection(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLatestDetection()

    // Refresh every 2 minutes
    const interval = setInterval(fetchLatestDetection, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Format time ago
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'No data'

    const now = new Date()
    const detectionTime = new Date(timestamp)
    const diffMs = now - detectionTime
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return detectionTime.toLocaleDateString()
  }

  // Format coordinates
  const formatCoordinates = (lat, lng) => {
    if (!lat || !lng) return 'coordinates unavailable'
    return `${parseFloat(lat).toFixed(4)}°N, ${parseFloat(lng).toFixed(4)}°E`
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900 text-white py-12 lg:py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/30 to-teal-500/30"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: Content */}
            <div className="space-y-6 lg:space-y-8">
              <div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                  <span className="text-emerald-300">Ele</span>
                  <span className="text-white">Vision</span>
                </h1>
                <div className="h-1 w-24 bg-emerald-400 mt-4"></div>
              </div>

              <div className="space-y-5">
                <h2 className="text-2xl sm:text-3xl font-semibold text-emerald-100">
                  Advanced Elephant Detection & Community Alert System
                </h2>
                <p className="text-lg text-green-100 leading-relaxed max-w-2xl">
                  Real-time AI-powered monitoring that detects elephants using cameras and sensors,
                  instantly alerts communities via SMS, and helps prevent human-wildlife conflict.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  {user ? (
                    <>
                      <Link
                        to="/profile"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg text-center"
                      >
                        Go to Dashboard
                      </Link>
                      {profile?.is_admin && (
                        <Link
                          to="/admin"
                          className="border-2 border-emerald-300 text-emerald-100 hover:bg-emerald-300 hover:text-green-900 font-bold py-3 px-8 rounded-lg transition-all duration-300 text-center"
                        >
                          Admin Panel
                        </Link>
                      )}
                    </>
                  ) : (
                    <>
                      <Link
                        to="/signup"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg text-center"
                      >
                        Join the Mission
                      </Link>
                      <Link
                        to="/login"
                        className="border-2 border-emerald-300 text-emerald-100 hover:bg-emerald-300 hover:text-green-900 font-bold py-3 px-8 rounded-lg transition-all duration-300 text-center"
                      >
                        Sign In
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Video */}
            <div className="relative mt-8 lg:mt-0">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden shadow-2xl border border-white/20">
                <video
                  className="w-full h-full object-cover rounded-xl"
                  src={videoSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                />
                <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                  LIVE DEMO
                </div>
              </div>
              <p className="text-center text-emerald-200 text-sm mt-3">
                AI detection in action
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Government-Style Notification Box - Always Visible */}
      <section className="bg-gray-50 py-4 border-b-2 border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md border-l-4 border-blue-500 overflow-hidden">
            {/* Header */}
            <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900">Wildlife Alert System</h3>
                    
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    loading ? 'bg-yellow-100 text-yellow-800 animate-pulse' :
                    latestDetection ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {loading ? 'LOADING' : latestDetection ? 'LIVE' : 'STANDBY'}
                  </span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-4 py-3">
              {loading ? (
                <div className="flex items-center space-x-3 text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm">Loading latest elephant detection data...</span>
                </div>
              ) : latestDetection ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <span className="text-amber-600 text-2xl">Elephant</span>
                    </div>
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Latest Detection:</span>
                      <span className="ml-2">
                        Elephant spotted at {formatCoordinates(latestDetection.latitude, latestDetection.longitude)}
                      </span>
                      <span className="ml-2 text-gray-500">
                        • Camera {latestDetection.camera_id} • {getTimeAgo(latestDetection.timestamp)}
                      </span>
                      <span className="ml-2">
                        {latestDetection.image_found && latestDetection.voice_found && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Photo + Audio Confirmed
                          </span>
                        )}
                        {latestDetection.image_found && !latestDetection.voice_found && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Photo Visual
                          </span>
                        )}
                        {!latestDetection.image_found && latestDetection.voice_found && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Audio Audio
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-gray-500">
                    {!user && (
                      <Link to="/signup" className="text b lue-600 hover:text-blue-800 font-medium">
                        Get SMS Alerts →
                      </Link>
                    )}
                    <span>Auto-refresh: 2min</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <span className="text-gray-400 text-2xl">Radar</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">System Status:</span>
                      <span className="ml-2">
                        No recent elephant detections. All cameras are active and monitoring.
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Online Online
                    </span>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>
                  {latestDetection ? `Alert ID: WDS-${latestDetection.data_id}` : 'Wildlife Detection System'} 
                  {' '}• Last updated: {new Date().toLocaleTimeString()}
                </span>
                <button
                  onClick={fetchLatestDetection}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Refresh Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-12">
            A complete system combining technology and community action.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { icon: "Camera", title: "Detection", desc: "AI cameras & sensors monitor 24/7 for elephant presence" },
              { icon: "Brain", title: "Analysis", desc: "ML algorithms confirm elephant detection instantly" },
              { icon: "Siren", title: "Alert", desc: "SMS & notifications sent to communities in seconds" },
              { icon: "Chart", title: "Insights", desc: "Track movement patterns for better wildlife protection" }
            ].map((step, i) => (
              <div key={i} className="text-center group">
                <div className="bg-emerald-100 group-hover:bg-emerald-200 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300 shadow-lg">
                  <span className="text-3xl">{step.icon}</span>
                </div>
                <h3 className="font-semibold text-lg mb-2 text-gray-900">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Stats */}
      {latestDetection && (
        <section className="py-12 bg-gradient-to-r from-gray-50 to-emerald-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Live System Status</h2>
              <p className="text-gray-600">Real-time data from our elephant detection network</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-lg p-6 text-center border-l-4 border-emerald-500">
                <div className="text-3xl font-bold text-emerald-600 mb-2">ACTIVE</div>
                <div className="text-gray-600">System Status</div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 text-center border-l-4 border-blue-500">
                <div className="text-3xl font-bold text-blue-600 mb-2">{latestDetection.camera_id}</div>
                <div className="text-gray-600">Latest Camera</div>
                <div className="mt-2 text-sm text-blue-600">
                  Location {formatCoordinates(latestDetection.latitude, latestDetection.longitude)}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 text-center border-l-4 border-orange-500">
                <div className="text-3xl font-bold text-orange-600 mb-2">{getTimeAgo(latestDetection.timestamp)}</div>
                <div className="text-gray-600">Last Detection</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-gradient-to-r from-emerald-600 to-teal-700 py-16">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Protect Wildlife. Protect Communities.
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Join thousands using EleVision to prevent human-elephant conflict with smart technology.
          </p>
          {user ? (
            <Link
              to="/profile"
              className="inline-block bg-white text-emerald-700 font-bold py-4 px-10 rounded-lg hover:bg-gray-100 transition transform hover:scale-105"
            >
              Open Dashboard
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="bg-white text-emerald-700 font-bold py-4 px-10 rounded-lg hover:bg-gray-100 transition transform hover:scale-105"
              >
                Get Started Free
              </Link>
              <Link
                to="/login"
                className="border-2 border-white text-white font-bold py-4 px-10 rounded-lg hover:bg-white hover:text-emerald-700 transition"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default Home