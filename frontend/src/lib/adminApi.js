import { supabase } from '../lib/supabase'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || ''

async function getAccessToken() {
  // returns the current session access token
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token || null
  return token
}

async function callBackend(path, body) {
  if (!BACKEND_URL) {
    throw new Error('VITE_BACKEND_URL is not set in your frontend .env')
  }

  const token = await getAccessToken()
  if (!token) throw new Error('No access token found. Please login as admin.')

  const res = await fetch(`${BACKEND_URL.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || json.message || `Request failed (${res.status})`)
  }
  return json
}

export async function assignGovtApi({ user_id, department = '', designation = '' }) {
  if (!user_id) throw new Error('user_id required')
  return callBackend('/api/admin/govt/assign', { user_id, department, designation })
}

export async function revokeGovtApi({ user_id }) {
  if (!user_id) throw new Error('user_id required')
  return callBackend('/api/admin/govt/revoke', { user_id })
}