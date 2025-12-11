import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import CameraManagement from './CameraManagement'
import LoadingSpinner from '../../components/LoadingSpinner'

const AdminDashboard = () => {
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState({
    totalCameras: 0,
    activeCameras: 0,
    totalUsers: 0,
    recentDetections: 0
  })
  const [loading, setLoading] = useState(true)

  // Fetch real statistics
  const fetchStats = async () => {
    try {
      setLoading(true)

      // Get camera count
      const { data: cameras } = await supabase
        .from('approved_cameras')
        .select('id')

      // Get user count  
      const { data: users } = await supabase
        .from('profiles')
        .select('id')

      // Get recent detections (last 24 hours)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      
      const { count: recentDetections } = await supabase
        .from('camera_data')
        .select('*', { count: 'exact', head: true })
        .or('image_found.eq.true,voice_found.eq. true')
        . gte('timestamp', yesterday. toISOString())

      // Get active cameras (cameras with data in last 24 hours)
      const { data: activeCameraData } = await supabase
        .from('camera_data')
        .select('camera_id')
        . gte('timestamp', yesterday.toISOString())

      const uniqueActiveCameras = new Set(activeCameraData?. map(item => item.camera_id) || [])

      setStats({
        totalCameras: cameras?.length || 0,
        activeCameras: uniqueActiveCameras.size,
        totalUsers: users?.length || 0,
        recentDetections: recentDetections || 0
      })

    } catch (error) {
      console. error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'cameras', name: 'Camera Management', icon: '📹' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Welcome, {profile?.full_name || user?.email?.split('@')[0]}</p>
            </div>
            <Link
              to="/"
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'overview' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Total Cameras</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalCameras}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Active Cameras</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.activeCameras}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9. 92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Recent Detections</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.recentDetections}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Total Users</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => setActiveTab('cameras')}
                      className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors"
                    >
                      <div className="text-2xl mb-2">📹</div>
                      <div className="font-medium">Manage Cameras</div>
                      <div className="text-sm text-gray-500">View and monitor all detection cameras</div>
                    </button>
                    
                    <button 
                      onClick={fetchStats}
                      className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors"
                    >
                      <div className="text-2xl mb-2">🔄</div>
                      <div className="font-medium">Refresh Data</div>
                      <div className="text-sm text-gray-500">Update dashboard statistics</div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'cameras' && <CameraManagement />}
      </div>
    </div>
  )
}

export default AdminDashboard