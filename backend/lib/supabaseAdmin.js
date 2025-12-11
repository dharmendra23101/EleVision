// Simple wrapper to create the Supabase admin client using the service role key.
// Used by server routes that must call RPCs with elevated privileges.

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
  // Do not throw here to avoid startup crash in some environments, but calls will fail.
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  // Adjust global options if needed
  auth: {
    // You can provide additional settings here if required
  }
})

module.exports = supabaseAdmin