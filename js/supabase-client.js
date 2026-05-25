// Supabase client initialisation.
// If STAFF_MANAGEMENT_CONFIG is injected before this file, it overrides the defaults below.
// Otherwise the baked-in project settings are used.

const _cfg = window.STAFF_MANAGEMENT_CONFIG || {};

const SUPABASE_URL =
  _cfg.supabaseUrl || 'https://xmkqznceprpvibovzcnf.supabase.co';

const SUPABASE_ANON_KEY =
  _cfg.supabaseAnonKey ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhta3F6bmNlcHJwdmlib3Z6Y25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MDcxNDksImV4cCI6MjA5NTI4MzE0OX0.FuhNT9djV5nKyicQbSwEB4ViodghZFiU7EUzrF96CXo';

let supabase = null;

try {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[Supabase] Client initialized.');
  } else {
    console.error('[Supabase] SDK failed to load.');
  }
} catch (err) {
  console.error('[Supabase] Client initialization failed:', err.message);
}
