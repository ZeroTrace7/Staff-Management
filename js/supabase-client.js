const appConfig = window.STAFF_MANAGEMENT_CONFIG || {};
const SUPABASE_URL = appConfig.supabaseUrl;
const SUPABASE_ANON_KEY = appConfig.supabaseAnonKey;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase config. Create js/config.local.js from js/config.example.js.'
  );
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('[Supabase] Client initialized.');
