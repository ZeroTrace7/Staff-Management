// Supabase Initialization
// Note: You must replace these with your actual Supabase URL and Anon Key
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

// We will use the UMD build of Supabase from CDN in index.html
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

let supabase = null;

function initSupabase() {
    if (typeof supabaseClient !== 'undefined') {
        supabase = supabaseClient;
    } else if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('[Supabase] Initialized');
    } else {
        console.warn('[Supabase] SDK not loaded. App will run in offline/mock mode.');
    }
}

// Call init on load
initSupabase();
