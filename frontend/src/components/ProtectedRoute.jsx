import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const ProtectedRoute = ({ adminOnly = false, govtOnly = false, children }) => {
  const { user, profile, loading } = useAuth()

  if (loading) return null

  if (!user) return <Navigate to="/login" replace />

  if (adminOnly && !profile?.is_admin) {
    return <Navigate to="/" replace />
  }

  if (govtOnly && !profile?.is_govt) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute