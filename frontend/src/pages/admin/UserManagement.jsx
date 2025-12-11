import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import LoadingSpinner from '../../components/LoadingSpinner'
import { useAuth } from '../../hooks/useAuth'
import { assignGovtApi, revokeGovtApi } from '../../lib/adminApi'

const UserManagement = () => {
  const { profile } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError('')
      const { data, error } = await supabase
        .from('profiles')
        .select('*,govt_employees(department,designation,assigned_at)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      setError('Failed to fetch users: ' + (err.message || err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString()
  }

  const handleAssignGovt = async (user) => {
    if (!profile?.is_admin) {
      alert('Only admins can assign govt role.')
      return
    }
    const dept = prompt('Department (optional):', user.govt_employees?.[0]?.department || '')
    const desig = prompt('Designation (optional):', user.govt_employees?.[0]?.designation || '')
    if (dept === null && desig === null) return

    try {
      setActionLoading(true)
      setError('')
      setSuccessMsg('')
      await assignGovtApi({ user_id: user.id, department: dept || '', designation: desig || '' })
      setSuccessMsg('User marked as Government employee')
      await fetchUsers()
    } catch (err) {
      console.error(err)
      setError(err.message || String(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleRevokeGovt = async (user) => {
    if (!profile?.is_admin) {
      alert('Only admins can revoke govt role.')
      return
    }
    if (!confirm('Revoke Government employee status from this user?')) return
    try {
      setActionLoading(true)
      setError('')
      setSuccessMsg('')
      await revokeGovtApi({ user_id: user.id })
      setSuccessMsg('Government employee status revoked')
      await fetchUsers()
    } catch (err) {
      console.error(err)
      setError(err.message || String(err))
    } finally {
      setActionLoading(false)
    }
  }

  // toggle admin flag via supabase (requires appropriate permissions / RLS)
  const toggleAdmin = async (userId, makeAdmin) => {
    if (!profile?.is_admin) {
      alert('Only admins can change admin status.')
      return
    }
    if (!confirm(`Are you sure you want to ${makeAdmin ? 'make' : 'remove'} admin for this user?`)) return
    try {
      setActionLoading(true)
      setError('')
      setSuccessMsg('')
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: makeAdmin })
        .eq('id', userId)

      if (error) throw error
      setSuccessMsg(`User ${makeAdmin ? 'granted' : 'revoked'} admin`)
      await fetchUsers()
    } catch (err) {
      console.error(err)
      setError(err.message || String(err))
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage all registered users</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchUsers}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50"
            >
              Refresh
            </button>
            {actionLoading && <LoadingSpinner />}
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            {successMsg}
          </div>
        )}

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Registered Users ({users.length})</h3>
          </div>

          {users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{u.full_name || '—'}</div>
                        <div className="text-xs text-gray-400">{u.id}</div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {u.mobile_number || '—'}
                        <div className="text-xs text-gray-400">{u.email || ''}</div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {u.district && u.state ? `${u.district}, ${u.state}` : (u.state || 'No location')}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.is_admin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                            {u.is_admin ? 'Admin' : 'User'}
                          </span>
                          {u.is_govt && <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Govt</span>}
                        </div>
                        {u.govt_employees?.[0] && (
                          <div className="text-xs text-gray-400 mt-1">
                            {u.govt_employees[0].department || ''} {u.govt_employees[0].designation ? `• ${u.govt_employees[0].designation}` : ''}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(u.created_at)}</td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {!u.is_govt ? (
                            <button
                              onClick={() => handleAssignGovt(u)}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                              disabled={actionLoading}
                            >
                              Make Govt
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRevokeGovt(u)}
                              className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                              disabled={actionLoading}
                            >
                              Revoke Govt
                            </button>
                          )}

                          <button
                            onClick={() => toggleAdmin(u.id, !u.is_admin)}
                            className={`px-3 py-1 text-xs rounded text-white ${u.is_admin ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                            disabled={actionLoading}
                          >
                            {u.is_admin ? 'Remove Admin' : 'Make Admin'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>No users found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserManagement