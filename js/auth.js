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

  _getEmailRedirectUrl(pageName) {
    return new URL(pageName, window.location.origin).toString();
  },

  async _getFreshAccessToken() {
    const client = this._requireClient();
    let { data: { session } } = await client.auth.getSession();
    const expiresAtMs = Number(session?.expires_at || 0) * 1000;
    const expiresSoon = expiresAtMs && expiresAtMs - Date.now() < 60000;

    if (!session?.access_token || expiresSoon) {
      const refreshed = await client.auth.refreshSession();
      session = refreshed.data?.session || session;
    }

    return session?.access_token || '';
  },

  _createUuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
      (Number(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4).toString(16)
    );
  },

  async signUpOwner(email, password, companyName) {
    try {
      const client = this._requireClient();
      const trimmedEmail = (email || '').trim();
      const trimmedCompany = (companyName || '').trim();
      const { data: authData, error: authError } = await client.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: this._getEmailRedirectUrl('owner.html'),
          data: {
            company_name: trimmedCompany,
            role: 'admin'
          }
        }
      });
      if (authError) throw authError;
      if (!authData.user) {
        throw new Error('This email is already registered. Sign in instead.');
      }
      if (Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
        throw new Error('This email is already registered. Sign in instead.');
      }

      this._savePendingOwnerBootstrap(trimmedEmail, trimmedCompany);

      if (!authData.session) {
        return {
          success: true,
          needsConfirmation: true,
          message: 'Check your email and confirm your account before signing in.'
        };
      }

      return await this.completeOwnerBootstrap(trimmedCompany, authData.user.email || trimmedEmail);
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
      const company = {
        id: this._createUuid(),
        name: trimmedCompany,
        admin_ids: [userId],
        geofence_lat: 0,
        geofence_lng: 0,
        geofence_radius: 100
      };

      const { error: companyError } = await client
        .from('companies')
        .insert(company);
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

      let accessToken = await this._getFreshAccessToken();
      if (!accessToken) throw new Error('Your session expired. Sign out and sign in again.');

      let response = await fetch('/api/create-employee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: employeeName,
          email: employeeEmail,
          password: employeePassword
        })
      });

      let payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        accessToken = await this._getFreshAccessToken();
        if (accessToken) {
          response = await fetch('/api/create-employee', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              name: employeeName,
              email: employeeEmail,
              password: employeePassword
            })
          });
          payload = await response.json().catch(() => ({}));
        }
      }

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Employee account could not be created.');
      }

      console.log('[Auth] Employee provisioned:', employeeEmail);
      return {
        success: true,
        employee: payload.employee,
        needsConfirmation: false
      };
    } catch (err) {
      console.error('[Auth] provisionEmployee error:', err.message);
      return { success: false, error: err.message };
    }
  },

  async resendOwnerConfirmation(email, companyName) {
    try {
      const trimmedEmail = (email || '').trim();
      if (!trimmedEmail) throw new Error('Email is required.');

      if (companyName) {
        this._savePendingOwnerBootstrap(trimmedEmail, companyName);
      }

      const client = this._requireClient();
      const { error } = await client.auth.resend({
        type: 'signup',
        email: trimmedEmail,
        options: {
          emailRedirectTo: this._getEmailRedirectUrl('owner.html')
        }
      });
      if (error) throw error;

      return { success: true, message: 'Confirmation email sent. Check your inbox.' };
    } catch (err) {
      console.error('[Auth] resendOwnerConfirmation error:', err.message);
      return { success: false, error: err.message };
    }
  },

  async signIn(email, password, options = {}) {
    try {
      const client = this._requireClient();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;

      let profile = await this.getProfile();
      if (!profile) {
        let bootstrapCompany = '';
        const pending = this._loadPendingOwnerBootstrap();
        if (pending && pending.email === (data.user.email || email)) {
          bootstrapCompany = pending.companyName;
        } else if (options.allowOwnerBootstrap) {
          bootstrapCompany = options.companyName || data.user.user_metadata?.company_name || '';
        }

        if (bootstrapCompany) {
          const bootstrap = await this.completeOwnerBootstrap(bootstrapCompany, data.user.email || email);
          if (!bootstrap.success) {
            throw new Error(bootstrap.error);
          }
          profile = bootstrap.profile || await this.getProfile();
        } else if (options.allowOwnerBootstrap) {
          throw new Error('Enter your company name to finish setup.');
        }
      }

      if (!profile) {
        throw new Error('Account setup is incomplete. Ask your admin to add your profile.');
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
