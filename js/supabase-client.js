const SUPABASE_URL = 'https://xmkqznceprpvibovzcnf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhta3F6bmNlcHJwdmlib3Z6Y25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MDcxNDksImV4cCI6MjA5NTI4MzE0OX0.FuhNT9djV5nKyicQbSwEB4ViodghZFiU7EUzrF96CXo';

// Initialize Supabase client using the UMD CDN build
// The CDN exposes window.supabase = { createClient }
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('[Supabase] Client initialized for project: xmkqznceprpvibovzcnf');
