/**
 * Attendance Module — js/attendance.js
 * Ties together Auth, Location, Camera, OfflineSync and Supabase
 * All timestamps stored as UTC ISO 8601 strings — NEVER local time
 */

const Attendance = {
  _profile: null, // Cached user profile (role, company_id, id)

  // ─── Load profile once ────────────────────────────────────────────────────
  async _ensureProfile() {
    if (!this._profile) {
      this._profile = await Auth.getProfile();
    }
    return this._profile;
  },

  // ─── CLOCK IN ────────────────────────────────────────────────────────────
  async clockIn(videoElement) {
    const profile = await this._ensureProfile();
    if (!profile) return { success: false, error: 'Not authenticated.' };

    // 1. Get GPS
    let posData;
    try {
      posData = await LocationService.acquireVerifiedPosition();
    } catch (err) {
      return { success: false, error: err.message };
    }

    // 2. Capture selfie + upload
    let selfieUrl = null;
    if (videoElement) {
      const upload = await CameraService.captureAndUpload(
        videoElement,
        profile.id,
        profile.company_id
      );
      if (!upload.success) {
        console.warn('[Attendance] Selfie upload failed, proceeding without:', upload.error);
      } else {
        selfieUrl = upload.url;
      }
    }

    // 3. Build record — UTC timestamp always
    const record = {
      user_id:               profile.id,
      company_id:            profile.company_id,
      type:                  'clock_in',
      selfie_url:            selfieUrl,
      lat:                   posData.lat,
      lng:                   posData.lng,
      accuracy_meters:       posData.accuracy,
      timestamp:             new Date().toISOString(), // UTC
      is_geofence_valid:     null, // Will be set by admin or server validation
      distance_from_office:  null, // Calculated below if company has geofence
      synced_offline:        false,
      spoof_flags:           posData.spoofFlags
    };

    // 4. Try to insert into Supabase
    const { error } = await supabase.from('attendance_logs').insert(record);
    if (error) {
      console.warn('[Attendance] Supabase insert failed — queuing offline:', error.message);
      OfflineSync.saveToQueue({ ...record, _syncedAt: null });
      return { success: true, offline: true };
    }

    // 5. Update last known location
    await this._updateLastKnownLocation(profile, posData);

    console.log('[Attendance] Clock IN recorded at', record.timestamp);
    return { success: true, offline: false, record };
  },

  // ─── CLOCK OUT ───────────────────────────────────────────────────────────
  async clockOut(videoElement) {
    const profile = await this._ensureProfile();
    if (!profile) return { success: false, error: 'Not authenticated.' };

    // 1. Get GPS
    let posData;
    try {
      posData = await LocationService.acquireVerifiedPosition();
    } catch (err) {
      return { success: false, error: err.message };
    }

    // 2. Capture selfie on clock-out too (optional but good for audit)
    let selfieUrl = null;
    if (videoElement) {
      const upload = await CameraService.captureAndUpload(
        videoElement,
        profile.id,
        profile.company_id
      );
      if (upload.success) selfieUrl = upload.url;
    }

    // 3. Build record
    const record = {
      user_id:             profile.id,
      company_id:          profile.company_id,
      type:                'clock_out',
      selfie_url:          selfieUrl,
      lat:                 posData.lat,
      lng:                 posData.lng,
      accuracy_meters:     posData.accuracy,
      timestamp:           new Date().toISOString(), // UTC
      synced_offline:      false,
      spoof_flags:         posData.spoofFlags
    };

    // 4. Insert
    const { error } = await supabase.from('attendance_logs').insert(record);
    if (error) {
      console.warn('[Attendance] Offline queue for clock_out:', error.message);
      OfflineSync.saveToQueue({ ...record, _syncedAt: null });
      return { success: true, offline: true };
    }

    console.log('[Attendance] Clock OUT recorded at', record.timestamp);
    return { success: true, offline: false, record };
  },

  // ─── UPDATE LAST KNOWN LOCATION (passive tracking) ───────────────────────
  async _updateLastKnownLocation(profile, posData) {
    await supabase.from('last_known_locations').upsert({
      user_id:         profile.id,
      company_id:      profile.company_id,
      lat:             posData.lat,
      lng:             posData.lng,
      accuracy_meters: posData.accuracy,
      updated_at:      new Date().toISOString() // UTC
    }, { onConflict: 'user_id' });
  },

  // ─── GET TODAY'S LOGS for the current user ────────────────────────────────
  async getTodayLogs() {
    const profile = await this._ensureProfile();
    if (!profile) return [];

    // UTC midnight → UTC midnight+1day
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', profile.id)
      .gte('timestamp', todayStart.toISOString())
      .lt('timestamp',  todayEnd.toISOString())
      .order('timestamp', { ascending: true });

    if (error) { console.error('[Attendance] getTodayLogs error:', error.message); return []; }
    return data;
  }
};

window.Attendance = Attendance;
