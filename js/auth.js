/**
 * Auth Module — js/auth.js
 * Handles Supabase Auth: signup, signin, signout, session management, route guards
 */

const Auth = {

  // ─── SIGN UP (Owner creates company + account) ───────────────────────────
  async signUpOwner(email, password, companyName) {
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + '/owner.html' }
      });
      if (authError) throw authError;

      const userId = authData.user.id;

      // 2. Insert company record
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          admin_ids: [userId],
          geofence_lat: 0,
          geofence_lng: 0,
          geofence_radius: 100
        })
        .select()
        .single();
      if (companyError) throw companyError;

      // 3. Insert user profile
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          company_id: company.id,
          name: companyName + ' Admin',
          email,
          role: 'admin'
        });
      if (userError) throw userError;

      console.log('[Auth] Owner signup successful:', userId);
      return { success: true, user: authData.user };
    } catch (err) {
      console.error('[Auth] signUpOwner error:', err.message);
      return { success: false, error: err.message };
    }
  },

  // ─── SIGN UP (Employee joins via invite code / company) ──────────────────
  async signUpEmployee(email, password, name, companyId) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + '/employee.html' }
      });
      if (authError) throw authError;

      const userId = authData.user.id;

      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          company_id: companyId,
          name,
          email,
          role: 'employee'
        });
      if (userError) throw userError;

      console.log('[Auth] Employee signup successful:', userId);
      return { success: true, user: authData.user };
    } catch (err) {
      console.error('[Auth] signUpEmployee error:', err.message);
      return { success: false, error: err.message };
    }
  },

  // ─── SIGN IN ─────────────────────────────────────────────────────────────
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Fetch user profile to determine role
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role, company_id, name')
        .eq('id', data.user.id)
        .single();
      if (profileError) throw profileError;

      console.log('[Auth] Signed in as:', profile.role);
      return { success: true, user: data.user, profile };
    } catch (err) {
      console.error('[Auth] signIn error:', err.message);
      return { success: false, error: err.message };
    }
  },

  // ─── SIGN OUT ────────────────────────────────────────────────────────────
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('[Auth] signOut error:', error.message);
    window.location.href = 'index.html';
  },

  // ─── GET SESSION ─────────────────────────────────────────────────────────
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // ─── GET PROFILE ─────────────────────────────────────────────────────────
  async getProfile() {
    const session = await this.getSession();
    if (!session) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error) { console.error('[Auth] getProfile error:', error.message); return null; }
    return data;
  },

  // ─── ROUTE GUARD ─────────────────────────────────────────────────────────
  // Call at top of owner.html and employee.html to redirect unauthenticated users
  async requireAuth(expectedRole) {
    const session = await this.getSession();
    if (!session) {
      console.warn('[Auth] No session — redirecting to login');
      window.location.href = 'index.html';
      return null;
    }

    const profile = await this.getProfile();
    if (!profile) {
      console.warn('[Auth] No profile found — redirecting to login');
      window.location.href = 'index.html';
      return null;
    }

    if (expectedRole && profile.role !== expectedRole) {
      console.warn(`[Auth] Role mismatch — expected ${expectedRole}, got ${profile.role}`);
      window.location.href = 'index.html';
      return null;
    }

    return profile;
  }
};

window.Auth = Auth;
