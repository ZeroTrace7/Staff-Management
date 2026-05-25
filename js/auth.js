/**
 * Auth Module — js/auth.js
 * v1.1 — Fixes bootstrap deadlock, adds admin-created employee provisioning,
 *         role-aware routing after sign-in
 */

const Auth = {

  // ─── SIGN UP OWNER (first-admin bootstrap) ────────────────────────────────
  // Flow: signUp auth → insert company → insert own profile
  // Works because RLS now has:
  //   - "Authenticated users can create companies" (INSERT on companies)
  //   - "Users can insert their own profile" (INSERT on users WHERE id = auth.uid())
  async signUpOwner(email, password, companyName) {
    try {
      // 1. Create auth user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
      });
      if (authError) throw authError;

      // Supabase may return user but require email confirmation
      if (!authData.user) throw new Error('Signup failed — no user returned.');
      const userId = authData.user.id;

      // 2. If email confirmation is required, session won't exist yet
      // We need to wait for auto-confirm or handle the flow
      if (!authData.session) {
        // Email confirmation is ON — user must verify first
        return {
          success: true,
          needsConfirmation: true,
          message: 'Check your email to confirm your account, then sign in.'
        };
      }

      // 3. Insert company (allowed by "Authenticated users can create companies")
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

      // 4. Insert own profile (allowed by "Users can insert their own profile")
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
      return { success: true, user: authData.user, companyId: company.id };
    } catch (err) {
      console.error('[Auth] signUpOwner error:', err.message);
      return { success: false, error: err.message };
    }
  },

  // ─── PROVISION EMPLOYEE (called by admin from dashboard) ──────────────────
  // Admin creates auth user + profile in one call
  // Note: Supabase anon key can't use admin.createUser(), so we create a
  // temporary signup, then the admin inserts the profile row.
  async provisionEmployee(employeeEmail, employeePassword, employeeName) {
    try {
      const adminProfile = await this.getProfile();
      if (!adminProfile || adminProfile.role !== 'admin') {
        throw new Error('Only admins can add employees.');
      }

      // 1. Create the employee's auth account
      //    We sign them up, which creates auth.users entry
      //    Then immediately sign back in as admin
      const currentSession = await this.getSession();

      const { data: empAuth, error: empAuthErr } = await supabase.auth.signUp({
        email: employeeEmail,
        password: employeePassword
      });
      if (empAuthErr) throw empAuthErr;
      if (!empAuth.user) throw new Error('Employee auth creation failed.');

      // 2. Re-authenticate as admin (signUp above may have changed the session)
      if (currentSession) {
        await supabase.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token
        });
      }

      // 3. Insert employee profile (allowed by "Admins can insert users in their company")
      const { error: profileErr } = await supabase
        .from('users')
        .insert({
          id: empAuth.user.id,
          company_id: adminProfile.company_id,
          name: employeeName,
          email: employeeEmail,
          role: 'employee'
        });
      if (profileErr) throw profileErr;

      console.log('[Auth] Employee provisioned:', employeeName, employeeEmail);
      return { success: true, employeeId: empAuth.user.id };
    } catch (err) {
      console.error('[Auth] provisionEmployee error:', err.message);
      return { success: false, error: err.message };
    }
  },

  // ─── SIGN IN (role-aware — returns profile with role) ─────────────────────
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Fetch profile to get role
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role, company_id, name, id')
        .eq('id', data.user.id)
        .single();
      if (profileError) throw profileError;

      console.log('[Auth] Signed in as:', profile.role, '—', profile.name);
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
  async requireAuth(expectedRole) {
    const session = await this.getSession();
    if (!session) {
      window.location.href = 'index.html';
      return null;
    }

    const profile = await this.getProfile();
    if (!profile) {
      window.location.href = 'index.html';
      return null;
    }

    if (expectedRole && profile.role !== expectedRole) {
      // Role mismatch — redirect to the correct portal
      if (profile.role === 'admin') window.location.href = 'owner.html';
      else if (profile.role === 'employee') window.location.href = 'employee.html';
      else window.location.href = 'index.html';
      return null;
    }

    return profile;
  }
};

window.Auth = Auth;
