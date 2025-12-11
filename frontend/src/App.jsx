import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Profile from './pages/Profile'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminCameraManagement from './pages/admin/CameraManagement'
import UserManagement from './pages/admin/UserManagement'
import GovtUserManagement from './pages/Govt/GovtUserManagement'
import GovtCameraManagement from './pages/Govt/CameraManagement'
import AlertZone from './pages/AlertZone'
import GovtAlertZone from './pages/Govt/AlertZone'
import LoadingSpinner from './components/LoadingSpinner'

const AppContent = () => {
  const { loading } = useAuth()
  const [showContent, setShowContent] = React.useState(false)

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setShowContent(true)
    }, 3000)

    if (!loading) {
      clearTimeout(timeout)
      setShowContent(true)
    }

    return () => clearTimeout(timeout)
  }, [loading])

  if (loading && !showContent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 text-lg">Loading EleVision...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Public Alert Zone Route */}
          <Route path="/alert-zones" element={<AlertZone />} />
          
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          
          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/cameras"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminCameraManagement />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute adminOnly={true}>
                <UserManagement />
              </ProtectedRoute>
            }
          />

          {/* Government Routes */}
          <Route
            path="/govt/users"
            element={
              <ProtectedRoute govtOnly={true}>
                <GovtUserManagement />
              </ProtectedRoute>
            }
          />

          <Route
            path="/govt/cameras"
            element={
              <ProtectedRoute govtOnly={true}>
                <GovtCameraManagement />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/govt/alert-zones"
            element={
              <ProtectedRoute govtOnly={true}>
                <GovtAlertZone />
              </ProtectedRoute>
            }
          />
          
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      
      <Footer />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  )
}

export default App