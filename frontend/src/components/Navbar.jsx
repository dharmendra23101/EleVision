import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const Navbar = () => {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false)
  const [govtDropdownOpen, setGovtDropdownOpen] = useState(false)
  
  // Refs to detect clicks outside dropdowns
  const userDropdownRef = useRef(null)
  const adminDropdownRef = useRef(null)
  const govtDropdownRef = useRef(null)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
    setUserDropdownOpen(false)
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userDropdownRef.current && !userDropdownRef. current.contains(event.target) &&
        adminDropdownRef.current && !adminDropdownRef.current.contains(event.target) &&
        govtDropdownRef.current && !govtDropdownRef.current.contains(event.target)
      ) {
        setUserDropdownOpen(false)
        setAdminDropdownOpen(false)
        setGovtDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Toggle functions
  const toggleUserDropdown = () => {
    setUserDropdownOpen(prev => !prev)
    setAdminDropdownOpen(false)
    setGovtDropdownOpen(false)
  }

  const toggleAdminDropdown = () => {
    setAdminDropdownOpen(prev => !prev)
    setUserDropdownOpen(false)
    setGovtDropdownOpen(false)
  }

  const toggleGovtDropdown = () => {
    setGovtDropdownOpen(prev => ! prev)
    setUserDropdownOpen(false)
    setAdminDropdownOpen(false)
  }

  const getDisplayName = () => {
    if (profile?.full_name) return profile.full_name. split(' ')[0]
    if (user?.email) return user.email.split('@')[0]
    return 'User'
  }

  const getInitials = () => getDisplayName().charAt(0).toUpperCase()

  const getProfileColor = () => {
    if (! user?.email) return 'bg-gray-500'
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500']
    let hash = 0
    for (let i = 0; i < user.email.length; i++) {
      hash = user.email.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  // Simple fallback avatar without external dependencies
  const ProfilePicture = ({ size = 'w-8 h-8' }) => {
    return (
      <div className={`${size} ${getProfileColor()} rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-sm`}>
        {getInitials()}
      </div>
    )
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-emerald-600">EleVision</span>
            </Link>
          </div>

          {/* Center Navigation - Public Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/alert-zones" className="text-gray-600 hover:text-emerald-600 font-medium transition-colors">
              Alert Zones
            </Link>
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Admin Menu - Only for admins */}
                {profile?.is_admin && (
                  <div className="relative" ref={adminDropdownRef}>
                    <button
                      onClick={toggleAdminDropdown}
                      className="flex items-center space-x-2 text-gray-700 hover:text-emerald-600 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-gray-100"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                      </svg>
                      <span>Admin</span>
                      <svg className={`w-4 h-4 transition-transform ${adminDropdownOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {/* Admin Dropdown */}
                    {adminDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                        <div className="py-2">
                          <Link
                            to="/admin"
                            onClick={() => setAdminDropdownOpen(false)}
                            className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                          >
                            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                            </svg>
                            Dashboard
                          </Link>
                          <Link
                            to="/admin/cameras"
                            onClick={() => setAdminDropdownOpen(false)}
                            className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                          >
                            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                            </svg>
                            📹 Camera Management
                          </Link>
                          <Link
                            to="/admin/users"
                            onClick={() => setAdminDropdownOpen(false)}
                            className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                          >
                            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            👥 User Management
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Government Menu - Only for government users */}
                {profile?.is_govt && (
                  <div className="relative" ref={govtDropdownRef}>
                    <button
                      onClick={toggleGovtDropdown}
                      className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-gray-100"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h. 01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                        <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-. 46-8-1.308z" />
                      </svg>
                      <span>Government</span>
                      <svg className={`w-4 h-4 transition-transform ${govtDropdownOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {/* Government Dropdown */}
                    {govtDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                        <div className="py-2">
                          <Link
                            to="/govt/users"
                            onClick={() => setGovtDropdownOpen(false)}
                            className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                          >
                            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                            </svg>
                            👥 User Management
                          </Link>
                          <Link
                            to="/govt/cameras"
                            onClick={() => setGovtDropdownOpen(false)}
                            className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                          >
                            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                            </svg>
                            📹 Camera Management
                          </Link>
                          <Link
                            to="/govt/alert-zones"
                            onClick={() => setGovtDropdownOpen(false)}
                            className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                          >
                            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5. 05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9. 9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                            </svg>
                            🗺️ Alert Zones
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* User Profile Dropdown */}
                <div className="relative" ref={userDropdownRef}>
                  <button
                    onClick={toggleUserDropdown}
                    className="flex items-center space-x-3 text-sm rounded-full focus:outline-none hover:bg-gray-100 p-2 transition-all"
                  >
                    <ProfilePicture />
                    <span className="hidden sm:block font-medium text-gray-700">{getDisplayName()}</span>
                    <svg className={`w-4 h-4 text-gray-500 transition-transform ${userDropdownOpen ?  'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {/* User Dropdown */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                      <div className="px-4 py-4 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                          <ProfilePicture size="w-12 h-12" />
                          <div>
                            <p className="font-semibold text-gray-900">{profile?.full_name || getDisplayName()}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="py-2">
                        <Link
                          to="/profile"
                          onClick={() => setUserDropdownOpen(false)}
                          className="block px-4 py-3 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                        >
                          View Profile
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/alert-zones" className="md:hidden text-gray-600 hover:text-emerald-600 font-medium">
                  Alert Zones
                </Link>
                <Link to="/login" className="text-gray-600 hover:text-emerald-600 font-medium">
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 transition shadow-sm"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar