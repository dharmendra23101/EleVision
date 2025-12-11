// Server routes to assign/revoke govt employee role.
// Secured: requires a valid Bearer access token from an admin user.

const express = require('express')
const router = express.Router()
const supabaseAdmin = require('../lib/supabaseAdmin')

// Middleware: verify incoming Bearer token and ensure profile.is_admin = true
async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header missing or malformed' })
    }
    const token = authHeader.split(' ')[1]

    // Validate token -> get user
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userData?.user) {
      console.error('Token validation failed', userErr)
      return res.status(401).json({ error: 'Invalid token' })
    }

    const userId = userData.user.id

    // Check profiles.is_admin using service role client (safe server-side)
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single()

    if (profileErr || !profile) {
      console.error('Profile lookup failed', profileErr)
      return res.status(403).json({ error: 'Admin privileges required' })
    }

    if (!profile.is_admin) {
      return res.status(403).json({ error: 'Admin privileges required' })
    }

    // Attach admin id for downstream use
    req.adminUserId = userId
    next()
  } catch (err) {
    console.error('requireAdmin error', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

// Assign govt role
router.post('/assign', requireAdmin, async (req, res) => {
  try {
    const { user_id, department = null, designation = null } = req.body
    if (!user_id) return res.status(400).json({ error: 'user_id is required' })

    const { error } = await supabaseAdmin.rpc('assign_govt_employee', {
      p_user_id: user_id,
      p_department: department,
      p_designation: designation,
      p_assigned_by: req.adminUserId
    })

    if (error) {
      console.error('assign_govt_employee RPC error:', error)
      return res.status(500).json({ error: error.message || error })
    }

    return res.json({ success: true })
  } catch (err) {
    console.error('assign route error', err)
    return res.status(500).json({ error: err.message || err })
  }
})

// Revoke govt role
router.post('/revoke', requireAdmin, async (req, res) => {
  try {
    const { user_id } = req.body
    if (!user_id) return res.status(400).json({ error: 'user_id is required' })

    const { error } = await supabaseAdmin.rpc('revoke_govt_employee', {
      p_user_id: user_id
    })

    if (error) {
      console.error('revoke_govt_employee RPC error:', error)
      return res.status(500).json({ error: error.message || error })
    }

    return res.json({ success: true })
  } catch (err) {
    console.error('revoke route error', err)
    return res.status(500).json({ error: err.message || err })
  }
})

module.exports = router