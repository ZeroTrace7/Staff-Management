// Supabase client initialisation.
// config.local.js (gitignored) can override these defaults for local dev.
// On Vercel the defaults below are used directly — the anon key is public by design.

const _cfg = window.STAFF_MANAGEMENT_CONFIG || {};

const SUPABASE_URL =
  _cfg.supabaseUrl || 'https://xmkqznceprpvibovzcnf.supabase.co';

const SUPABASE_ANON_KEY =
  _cfg.supabaseAnonKey ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhta3F6bmNlcHJwdmlib3Z6Y25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MDcxNDksImV4cCI6MjA5NTI4MzE0OX0.FuhNT9djV5nKyicQbSwEB4ViodghZFiU7EUzrF96CXo';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('[Supabase] Client initialized.');
