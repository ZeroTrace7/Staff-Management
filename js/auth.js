/**
 * Auth Module
 * Handles Supabase authentication, sessions, and routing
 */

const Auth = {
  async init() {
    console.log('[Auth] Initializing...');
    // TODO: Wire up Supabase session check
  },

  async signUp(email, password, role, metadata) {
    console.log(`[Auth] Signing up ${email} as ${role}`);
    // TODO: Wire up Supabase signUp
  },

  async signIn(email, password) {
    console.log(`[Auth] Signing in ${email}`);
    // TODO: Wire up Supabase signIn
  },

  async signOut() {
    console.log('[Auth] Signing out');
    // TODO: Wire up Supabase signOut
    window.location.href = 'index.html';
  },

  getSession() {
    return null; // TODO: return Supabase session
  }
};

window.Auth = Auth;
