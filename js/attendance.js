/**
 * Attendance Module
 * Enforces mandatory selfie + GPS and keeps the current punch state recoverable.
 */

const Attendance = {
  _profile: null,
  _company: null,

  async _ensureProfile() {
    if (!this._profile) {
      this._profile = await Auth.getProfile();
    }
    return this._profile;
  },

  async _ensureCompany() {
    const profile = await this._ensureProfile();
    if (!profile) return null;

    if (!this._company || this._company.id !== profile.company_id) {
      this._company = await Auth.getCompany(profile.company_id);
    }
    return this._company;
  },

  _isCompanyGeofenceConfigured(company) {
    return company &&
      Number(company.geofence_lat) !== 0 &&
      Number(company.geofence_lng) !== 0 &&
      Number(company.geofence_radius) > 0;
  },

  _isNetworkFailure(error) {
    const message = String(error?.message || error || '').toLowerCase();
    return !navigator.onLine ||
      message.includes('failed to fetch') ||
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timed out');
  },

  _getLocalDayRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  },

  async _buildRecord(type, selfieBlob) {
    const profile = await this._ensureProfile();
    const company = await this._ensureCompany();

    if (!profile) throw new Error('Not authenticated.');
    if (!selfieBlob) throw new Error('Selfie capture is required.');
    if (!company) throw new Error('Company profile was not found.');
    if (!this._isCompanyGeofenceConfigured(company)) {
      throw new Error('Office geofence is not configured yet. Ask the owner to finish setup.');
    }

    const posData = await LocationService.acquireVerifiedPosition();
    const upload = await CameraService.uploadSelfie(selfieBlob, profile.id, profile.company_id);
    if (!upload.success) {
      throw new Error(upload.error || 'Selfie upload failed.');
    }

    const geofence = LocationService.isInsideGeofence(
      posData.lat,
      posData.lng,
      company.geofence_lat,
      company.geofence_lng,
      company.geofence_radius
    );

    return {
      record: {
        user_id: profile.id,
        company_id: profile.company_id,
        type,
        selfie_url: upload.url,
        lat: posData.lat,
        lng: posData.lng,
        accuracy_meters: posData.accuracy,
        timestamp: new Date().toISOString(),
        is_geofence_valid: geofence.inside,
        distance_from_office: geofence.distanceMetres,
        synced_offline: false,
        spoof_flags: posData.spoofFlags
      },
      profile,
      posData
    };
  },

  async _insertOrQueue(record) {
    const { error } = await getSupabaseClient().from('attendance_logs').insert(record);
    if (!error) {
      return { success: true, offline: false, record };
    }

    if (this._isNetworkFailure(error)) {
      OfflineSync.saveToQueue({ ...record, _syncedAt: null });
      return { success: true, offline: true, record };
    }

    const message = String(error.message || '');
    if (message.toLowerCase().includes('row-level security')) {
      throw new Error('Attendance save is not allowed yet. Ask the owner to update attendance permissions.');
    }
    throw new Error(message || 'Attendance could not be saved.');
  },

  async clockIn(selfieBlob) {
    try {
      const { record, profile, posData } = await this._buildRecord('clock_in', selfieBlob);
      const result = await this._insertOrQueue(record);

      if (!result.offline) {
        await this._updateLastKnownLocation(profile, posData);
      }

      console.log('[Attendance] Clock IN recorded:', record.timestamp);
      return result;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async clockOut(selfieBlob) {
    try {
      const { record, profile, posData } = await this._buildRecord('clock_out', selfieBlob);
      const result = await this._insertOrQueue(record);

      if (!result.offline) {
        await this._updateLastKnownLocation(profile, posData);
      }

      console.log('[Attendance] Clock OUT recorded:', record.timestamp);
      return result;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async _updateLastKnownLocation(profile, posData) {
    const { error } = await getSupabaseClient().from('last_known_locations').upsert({
      user_id: profile.id,
      company_id: profile.company_id,
      lat: posData.lat,
      lng: posData.lng,
      accuracy_meters: posData.accuracy,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    if (error) {
      console.error('[Attendance] _updateLastKnownLocation error:', error.message);
    }
  },

  async getTodayLogs() {
    const profile = await this._ensureProfile();
    if (!profile) return [];

    const range = this._getLocalDayRange();
    const { data, error } = await getSupabaseClient()
      .from('attendance_logs')
      .select('*')
      .eq('user_id', profile.id)
      .gte('timestamp', range.start)
      .lt('timestamp', range.end)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('[Attendance] getTodayLogs error:', error.message);
      return [];
    }
    return data;
  },

  async getPunchState() {
    const logs = await this.getTodayLogs();
    if (!logs.length) {
      return {
        isPunchedIn: false,
        lastLog: null
      };
    }

    const lastLog = logs[logs.length - 1];
    return {
      isPunchedIn: lastLog.type === 'clock_in',
      lastLog
    };
  }
};

window.Attendance = Attendance;
