import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import LoadingSpinner from '../../components/LoadingSpinner'
import { useAuth } from '../../hooks/useAuth'
import { Link } from 'react-router-dom'

const GovtUserManagement = () => {
  const { profile } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // filters / UI state
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all') // all | admin | govt | user
  const [stateFilter, setStateFilter] = useState('all')
  const [districtFilter, setDistrictFilter] = useState('all')

  // Access control: only gov users allowed
  useEffect(() => {
    if (profile && !profile.is_govt) {
      setError('Access denied: This section is for government employees only.')
      setLoading(false)
    }
  }, [profile])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError('')

      // fetch profiles and any related govt_employees metadata
      const { data, error } = await supabase
        .from('profiles')
        .select('*,govt_employees(department,designation,assigned_at)')
        .order('full_name', { ascending: true })

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error(err)
      setError('Failed to fetch users: ' + (err.message || err))
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // If profile not loaded yet, wait; otherwise fetch
    if (!profile) return
    // If user is govt, fetch users
    if (profile.is_govt) {
      fetchUsers()
    }
  }, [profile])

  const states = useMemo(() => {
    const setS = new Set()
    users.forEach(u => {
      if (u.state) setS.add(u.state)
    })
    return Array.from(setS).sort()
  }, [users])

  const districts = useMemo(() => {
    const setD = new Set()
    users.forEach(u => {
      if (stateFilter === 'all') {
        if (u.district) setD.add(u.district)
      } else {
        if (u.state === stateFilter && u.district) setD.add(u.district)
      }
    })
    return Array.from(setD).sort()
  }, [users, stateFilter])

  const filtered = useMemo(() => {
    const q = (search || '').trim().toLowerCase()
    return users.filter(u => {
      if (roleFilter === 'admin' && !u.is_admin) return false
      if (roleFilter === 'govt' && !u.is_govt) return false
      if (roleFilter === 'user' && (u.is_admin || u.is_govt)) return false
      if (stateFilter !== 'all' && u.state !== stateFilter) return false
      if (districtFilter !== 'all' && u.district !== districtFilter) return false
      if (q) {
        const hay = `${u.full_name || ''} ${u.mobile_number || ''} ${u.id || ''} ${u.district || ''} ${u.state || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [users, roleFilter, stateFilter, districtFilter, search])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-2xl text-center">
          <h3 className="text-xl font-semibold text-red-600">Access Restricted</h3>
          <p className="mt-2 text-gray-600">{error}</p>
          <div className="mt-4">
            <Link to="/" className="text-blue-600 underline">Return Home</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Government — User Directory</h1>
            <p className="text-sm text-gray-600 mt-1">View and filter registered users for official purposes</p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search name, phone or id"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            />
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-3 py-2 border rounded-md text-sm">
              <option value="all">All Roles</option>
              <option value="govt">Government</option>
              <option value="admin">Admin</option>
              <option value="user">Users</option>
            </select>

            <select value={stateFilter} onChange={e => { setStateFilter(e.target.value); setDistrictFilter('all') }} className="px-3 py-2 border rounded-md text-sm">
              <option value="all">All States</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select value={districtFilter} onChange={e => setDistrictFilter(e.target.value)} className="px-3 py-2 border rounded-md text-sm">
              <option value="all">All Districts</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <button
              onClick={() => { setSearch(''); setRoleFilter('all'); setStateFilter('all'); setDistrictFilter('all') }}
              className="px-3 py-2 bg-gray-100 rounded-md text-sm"
            >
              Clear
            </button>

            <button onClick={fetchUsers} className="px-3 py-2 bg-white border rounded-md text-sm">Refresh</button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dept / Designation</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{u.full_name || '—'}</div>
                    <div className="text-xs text-gray-400">{u.id}</div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {u.mobile_number || '—'}
                    <div className="text-xs text-gray-400">{u.email || ''}</div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {u.district ? `${u.district}, ${u.state || ''}` : (u.state || '—')}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {u.is_admin && <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800">Admin</span>}
                      {u.is_govt && <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">Govt</span>}
                      {!u.is_admin && !u.is_govt && <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">User</span>}
                    </div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {u.govt_employees?.[0] ? `${u.govt_employees[0].department || ''}${u.govt_employees[0].designation ? ` • ${u.govt_employees[0].designation}` : ''}` : '—'}
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-gray-500">
                    No users match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default GovtUserManagement