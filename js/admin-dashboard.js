/**
 * Admin Dashboard Module
 * Loads owner stats, staff roster, geofence summary, map, and realtime refreshes.
 */

const AdminDashboard = {
  _profile: null,
  _company: null,
  _map: null,
  _markers: [],
  _geofenceCircle: null,
  _channel: null,

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

  async _fetchUsers() {
    const profile = await this._ensureProfile();
    if (!profile) return [];

    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, is_active, created_at')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[AdminDashboard] _fetchUsers error:', error.message);
      return [];
    }
    return data;
  },

  async _fetchTodayLogs() {
    const profile = await this._ensureProfile();
    if (!profile) return [];

    const range = this._getLocalDayRange();
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('id, user_id, type, timestamp, is_geofence_valid, distance_from_office, synced_offline')
      .eq('company_id', profile.company_id)
      .gte('timestamp', range.start)
      .lt('timestamp', range.end)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('[AdminDashboard] _fetchTodayLogs error:', error.message);
      return [];
    }
    return data;
  },

  async _fetchLocations() {
    const profile = await this._ensureProfile();
    if (!profile) return [];

    const { data, error } = await supabase
      .from('last_known_locations')
      .select('user_id, lat, lng, accuracy_meters, updated_at')
      .eq('company_id', profile.company_id);

    if (error) {
      console.error('[AdminDashboard] _fetchLocations error:', error.message);
      return [];
    }
    return data;
  },

  _groupLogsByUser(logs) {
    return logs.reduce((acc, log) => {
      if (!acc[log.user_id]) acc[log.user_id] = [];
      acc[log.user_id].push(log);
      return acc;
    }, {});
  },

  _isLate(log, workStartTime) {
    if (!log || !workStartTime || log.type !== 'clock_in') return false;

    const dt = new Date(log.timestamp);
    const [hours, minutes] = String(workStartTime).split(':').map(Number);
    const actual = dt.getHours() * 60 + dt.getMinutes();
    const expected = (hours || 0) * 60 + (minutes || 0);
    return actual > expected;
  },

  _setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  },

  _formatGeofenceSummary(company) {
    if (!company) return 'Not configured yet.';
    if (Number(company.geofence_lat) === 0 && Number(company.geofence_lng) === 0) {
      return 'Not configured yet.';
    }

    return `${Number(company.geofence_radius)}m radius · ${Number(company.geofence_lat).toFixed(5)}, ${Number(company.geofence_lng).toFixed(5)} · starts ${company.work_start_time || '09:00'}`;
  },

  populateGeofenceSummary(company) {
    const summary = this._formatGeofenceSummary(company);
    this._setText('geofence-summary', summary);
    this._setText('settings-geofence-summary', summary);

    const lat = document.getElementById('geofence-lat');
    const lng = document.getElementById('geofence-lng');
    const radius = document.getElementById('geofence-radius');
    const time = document.getElementById('work-start-time');

    if (company) {
      if (lat) lat.value = company.geofence_lat ?? '';
      if (lng) lng.value = company.geofence_lng ?? '';
      if (radius) radius.value = company.geofence_radius ?? 100;
      if (time) time.value = String(company.work_start_time || '09:00').slice(0, 5);
    }
  },

  bindSearch() {
    const input = document.getElementById('staff-search');
    if (!input || input.dataset.bound === 'true') return;

    const rerender = Utils.debounce(() => {
      this.fetchEmployees();
    }, 150);

    input.addEventListener('input', rerender);
    input.dataset.bound = 'true';
  },

  async loadStats() {
    const [users, logs, locations, company] = await Promise.all([
      this._fetchUsers(),
      this._fetchTodayLogs(),
      this._fetchLocations(),
      this._ensureCompany()
    ]);

    this.populateGeofenceSummary(company);

    const employees = users.filter(user => user.role === 'employee');
    const admins = users.filter(user => user.role === 'admin');
    const archived = users.filter(user => !user.is_active);
    const logsByUser = this._groupLogsByUser(logs);

    let present = 0;
    let clockedOut = 0;
    let late = 0;
    let outsideZone = 0;

    employees.forEach((employee) => {
      const userLogs = logsByUser[employee.id] || [];
      const firstClockIn = userLogs.find(log => log.type === 'clock_in');
      const lastLog = userLogs[userLogs.length - 1];

      if (firstClockIn && this._isLate(firstClockIn, company?.work_start_time)) {
        late++;
      }
      if (userLogs.some(log => log.is_geofence_valid === false)) {
        outsideZone++;
      }
      if (lastLog?.type === 'clock_in') {
        present++;
      } else if (lastLog?.type === 'clock_out') {
        clockedOut++;
      }
    });

    const notMarked = Math.max(employees.length - present - clockedOut, 0);
    const absent = notMarked;

    this._setText('owner-stats-date', `Based on ${Utils.formatDate(new Date().toISOString())}`);
    this._setText('stat-not-marked', notMarked);
    this._setText('stat-present', present);
    this._setText('stat-absent', absent);
    this._setText('stat-late', late);
    this._setText('stat-geofence-alerts', outsideZone);
    this._setText('stat-clocked-out', clockedOut);
    this._setText('stat-heads', users.filter(user => user.is_active !== false).length);
    this._setText('stat-archived', archived.length);
    this._setText('stat-admins', admins.length);
    this._setText('stat-location-updates', locations.length);
    this._setText('stat-employees', employees.length);
  },

  async fetchEmployees() {
    const [users, logs] = await Promise.all([
      this._fetchUsers(),
      this._fetchTodayLogs()
    ]);

    const container = document.getElementById('staff-list');
    if (!container) return;

    const searchTerm = (document.getElementById('staff-search')?.value || '').trim().toLowerCase();
    const logsByUser = this._groupLogsByUser(logs);

    const employees = users
      .filter(user => user.role === 'employee')
      .filter(user => !searchTerm || user.name.toLowerCase().includes(searchTerm) || user.email.toLowerCase().includes(searchTerm));

    if (!employees.length) {
      container.innerHTML = '<div style="color: #9CA3AF; font-size: 0.95rem;">No matching employees found.</div>';
      return;
    }

    container.innerHTML = employees.map((employee) => {
      const userLogs = logsByUser[employee.id] || [];
      const lastLog = userLogs[userLogs.length - 1];
      const status = lastLog
        ? (lastLog.type === 'clock_in' ? 'Punched in' : 'Clocked out')
        : 'No punch yet';
      const statusColor = lastLog
        ? (lastLog.type === 'clock_in' ? '#22C55E' : '#F59E0B')
        : '#9CA3AF';
      const timestamp = lastLog ? Utils.formatDateTime(lastLog.timestamp) : 'No activity today';
      const geofence = lastLog && lastLog.distance_from_office != null
        ? `${Utils.formatDistance(lastLog.distance_from_office)} from office`
        : 'No location stored';

      return `
        <div style="background: #0F172A; border: 1px solid #1F2937; border-radius: 14px; padding: 16px;">
          <div class="flex justify-between items-start gap-4">
            <div>
              <div style="font-weight: 600; color: white;">${employee.name}</div>
              <div style="font-size: 0.85rem; color: #9CA3AF; margin-top: 4px;">${employee.email}</div>
            </div>
            <div style="font-size: 0.8rem; font-weight: 600; color: ${statusColor};">${status}</div>
          </div>
          <div style="font-size: 0.85rem; color: #CBD5E1; margin-top: 12px;">${timestamp}</div>
          <div style="font-size: 0.8rem; color: #94A3B8; margin-top: 6px;">${geofence}</div>
        </div>
      `;
    }).join('');
  },

  async loadMap() {
    const mapEl = document.getElementById('owner-map');
    if (!mapEl || typeof L === 'undefined') return;

    const [company, users, locations] = await Promise.all([
      this._ensureCompany(),
      this._fetchUsers(),
      this._fetchLocations()
    ]);
    const userMap = new Map(users.map(user => [user.id, user]));

    if (!this._map) {
      this._map = L.map('owner-map');
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this._map);
    }

    this._markers.forEach(marker => marker.remove());
    this._markers = [];
    if (this._geofenceCircle) {
      this._geofenceCircle.remove();
      this._geofenceCircle = null;
    }

    locations.forEach((location) => {
      const user = userMap.get(location.user_id);
      const marker = L.marker([location.lat, location.lng]).addTo(this._map);
      marker.bindPopup(`
        <div style="min-width: 180px;">
          <strong>${user?.name || 'Employee'}</strong><br>
          ${Utils.formatDateTime(location.updated_at)}<br>
          Accuracy: ${Math.round(location.accuracy_meters || 0)}m
        </div>
      `);
      this._markers.push(marker);
    });

    if (company && Number(company.geofence_lat) !== 0 && Number(company.geofence_lng) !== 0) {
      this._geofenceCircle = L.circle([company.geofence_lat, company.geofence_lng], {
        radius: company.geofence_radius,
        color: '#2563EB',
        fillColor: '#2563EB',
        fillOpacity: 0.12
      }).addTo(this._map);
      this._map.setView([company.geofence_lat, company.geofence_lng], 16);
    } else if (locations.length) {
      this._map.setView([locations[0].lat, locations[0].lng], 14);
    } else {
      this._map.setView([28.6139, 77.2090], 12);
    }

    setTimeout(() => {
      this._map.invalidateSize();
    }, 0);
  },

  subscribeRealtime() {
    if (this._channel) return;

    this._channel = supabase.channel('owner-live-attendance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_logs' }, () => {
        this.refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'last_known_locations' }, () => {
        this.refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        this.refresh();
      })
      .subscribe();
  },

  async refresh() {
    try {
      await Promise.all([
        this.loadStats(),
        this.fetchEmployees()
      ]);

      if (!document.getElementById('view-map')?.classList.contains('hidden')) {
        await this.loadMap();
      }
    } catch (err) {
      console.error('[AdminDashboard] refresh error:', err.message);
      const list = document.getElementById('staff-list');
      if (list) {
        list.innerHTML = '<div style="color: #FCA5A5; font-size: 0.95rem;">Dashboard data could not be loaded.</div>';
      }
    }
  },

  async init() {
    try {
      const profile = await this._ensureProfile();
      if (!profile || profile.role !== 'admin') return;

      await this._ensureCompany();
      this.bindSearch();
      this.subscribeRealtime();
      await this.refresh();
    } catch (err) {
      console.error('[AdminDashboard] init error:', err.message);
    }
  }
};

window.AdminDashboard = AdminDashboard;
