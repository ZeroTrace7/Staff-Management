/**
 * Auth Module
 * Handles owner bootstrap, admin-led employee provisioning, and role-aware auth.
 */

const Auth = {
  PENDING_OWNER_KEY: 'sm_pending_owner_bootstrap',

  _requireClient() {
    if (!window.staffSupabaseClient) {
      throw new Error('Backend connection is unavailable. Refresh and try again.');
    }
    if (!window.staffSupabaseClient.auth) {
      throw new Error('Backend client is not initialized correctly. Refresh and try again.');
    }
    return window.staffSupabaseClient;
  },

  _createIsolatedClient() {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('Supabase SDK is unavailable.');
    }
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  },

  _savePendingOwnerBootstrap(email, companyName) {
    localStorage.setItem(this.PENDING_OWNER_KEY, JSON.stringify({
      email,
      companyName
    }));
  },

  _loadPendingOwnerBootstrap() {
    try {
      const raw = localStorage.getItem(this.PENDING_OWNER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  _clearPendingOwnerBootstrap() {
    localStorage.removeItem(this.PENDING_OWNER_KEY);
  },

  async signUpOwner(email, password, companyName) {
    try {
      const client = this._requireClient();
      const { data: authData, error: authError } = await client.auth.signUp({
        email,
        password
      });
      if (authError) throw authError;
      if (!authData.user) {
        throw new Error('Signup was not completed. This email may already be registered, or signup is disabled in Supabase. If this is your email, uncheck "Creating a new account" and sign in.');
      }

      this._savePendingOwnerBootstrap(email, companyName);

      if (!authData.session) {
        return {
          success: true,
          needsConfirmation: true,
          message: 'Confirm the email, then sign in to finish workspace setup.'
        };
      }

      return await this.completeOwnerBootstrap(companyName, authData.user.email || email);
    } catch (err) {
      console.error('[Auth] signUpOwner error:', err.message);
      return { success: false, error: err.message };
    }
  },

  async completeOwnerBootstrap(companyName, ownerEmail) {
    try {
      const session = await this.getSession();
      if (!session) {
        throw new Error('You must be signed in to finish setup.');
      }

      const existingProfile = await this.getProfile();
      if (existingProfile) {
        this._clearPendingOwnerBootstrap();
        return { success: true, profile: existingProfile };
      }

      const userId = session.user.id;
      const email = ownerEmail || session.user.email;
      const trimmedCompany = (companyName || '').trim();
      if (!trimmedCompany) {
        throw new Error('Company name is required to finish setup.');
      }

      const client = this._requireClient();
      const { data: company, error: companyError } = await client
        .from('companies')
        .insert({
          name: trimmedCompany,
          admin_ids: [userId],
          geofence_lat: 0,
          geofence_lng: 0,
          geofence_radius: 100
        })
        .select()
        .single();
      if (companyError) throw companyError;

      const { data: profile, error: userError } = await client
        .from('users')
        .insert({
          id: userId,
          company_id: company.id,
          name: `${trimmedCompany} Admin`,
          email,
          role: 'admin'
        })
        .select()
        .single();
      if (userError) throw userError;

      this._clearPendingOwnerBootstrap();
      console.log('[Auth] Owner bootstrap complete:', userId);
      return { success: true, profile, company };
    } catch (err) {
      console.error('[Auth] completeOwnerBootstrap error:', err.message);
      return { success: false, error: err.message };
    }
  },

  async provisionEmployee(employeeEmail, employeePassword, employeeName) {
    try {
      const adminProfile = await this.getProfile();
      if (!adminProfile || adminProfile.role !== 'admin') {
        throw new Error('Only admins can add employees.');
      }

      const isolatedClient = this._createIsolatedClient();
      const client = this._requireClient();
      const { data: authData, error: authError } = await isolatedClient.auth.signUp({
        email: employeeEmail,
        password: employeePassword
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Employee auth account was not created.');

      const { data: profile, error: profileError } = await client
        .from('users')
        .insert({
          id: authData.user.id,
          company_id: adminProfile.company_id,
          name: employeeName,
          email: employeeEmail,
          role: 'employee'
        })
        .select()
        .single();
      if (profileError) throw profileError;

      await isolatedClient.auth.signOut();

      console.log('[Auth] Employee provisioned:', employeeEmail);
      return {
        success: true,
        employee: profile,
        needsConfirmation: !authData.session
      };
    } catch (err) {
      console.error('[Auth] provisionEmployee error:', err.message);
      return { success: false, error: err.message };
    }
  },

  async signIn(email, password) {
    try {
      const client = this._requireClient();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;

      let profile = await this.getProfile();
      if (!profile) {
        const pending = this._loadPendingOwnerBootstrap();
        if (pending && pending.email === (data.user.email || email)) {
          const bootstrap = await this.completeOwnerBootstrap(pending.companyName, data.user.email || email);
          if (!bootstrap.success) {
            throw new Error(bootstrap.error);
          }
          profile = bootstrap.profile || await this.getProfile();
        }
      }

      if (!profile) {
        throw new Error('Account profile not found. Ask the owner to finish setup.');
      }

      console.log('[Auth] Signed in as:', profile.role);
      return { success: true, user: data.user, profile };
    } catch (err) {
      console.error('[Auth] signIn error:', err.message);
      const message = String(err.message || '');
      if (message.toLowerCase().includes('email not confirmed')) {
        return {
          success: false,
          error: 'Check your email and confirm your account before signing in.'
        };
      }
      return { success: false, error: message };
    }
  },

  async signOut() {
    try {
      const client = this._requireClient();
      const { error } = await client.auth.signOut();
      if (error) console.error('[Auth] signOut error:', error.message);
    } catch (err) {
      console.error('[Auth] signOut error:', err.message);
    }
    window.location.href = 'index.html';
  },

  async getSession() {
    try {
      const client = this._requireClient();
      const { data: { session } } = await client.auth.getSession();
      return session;
    } catch (err) {
      console.error('[Auth] getSession error:', err.message);
      return null;
    }
  },

  async getProfile() {
    const session = await this.getSession();
    if (!session) return null;

    try {
      const client = this._requireClient();
      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('[Auth] getProfile error:', error.message);
        return null;
      }
      return data || null;
    } catch (err) {
      console.error('[Auth] getProfile error:', err.message);
      return null;
    }
  },

  async getCompany(companyId) {
    try {
      const client = this._requireClient();
      const { data, error } = await client
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error) {
        console.error('[Auth] getCompany error:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error('[Auth] getCompany error:', err.message);
      return null;
    }
  },

  async updateCompanySettings(companyId, payload) {
    try {
      const client = this._requireClient();
      const { data, error } = await client
        .from('companies')
        .update(payload)
        .eq('id', companyId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, company: data };
    } catch (err) {
      console.error('[Auth] updateCompanySettings error:', err.message);
      return { success: false, error: err.message };
    }
  },

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
      if (profile.role === 'admin') window.location.href = 'owner.html';
      else if (profile.role === 'employee') window.location.href = 'employee.html';
      else window.location.href = 'index.html';
      return null;
    }

    return profile;
  }
};

window.Auth = Auth;
