/**
 * Location Module — js/location.js
 * GPS acquisition, Haversine geofence check, anti-spoofing via jitter & speed analysis
 */

const LocationService = {
  _samples: [],          // Last N position samples for anti-spoofing
  MAX_SAMPLES: 5,
  MAX_SPEED_KMH: 120,    // If employee "moves" faster than this → spoof flag
  MIN_ACCURACY_M: 150,   // Reject GPS readings worse than this

  // ─── PRIMARY: Get high-accuracy GPS position ──────────────────────────────
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error('Geolocation is not supported by this browser.'));
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const result = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: new Date().toISOString() // UTC always
          };

          if (result.accuracy > this.MIN_ACCURACY_M) {
            console.warn(`[Location] Low accuracy: ${result.accuracy}m — retrying`);
            // Still resolve but flag it; caller decides to block or allow
          }

          this._addSample(result);
          resolve(result);
        },
        (err) => {
          const messages = {
            1: 'Location permission was denied. Please enable it in your browser settings.',
            2: 'Location unavailable. Please move to an open area and try again.',
            3: 'Location request timed out. Please try again.'
          };
          reject(new Error(messages[err.code] || err.message));
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0
        }
      );
    });
  },

  // ─── HAVERSINE: Distance between two lat/lng points in metres ─────────────
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in metres
    const φ1 = lat1 * (Math.PI / 180);
    const φ2 = lat2 * (Math.PI / 180);
    const Δφ = (lat2 - lat1) * (Math.PI / 180);
    const Δλ = (lon2 - lon1) * (Math.PI / 180);

    const a = Math.sin(Δφ / 2) ** 2 +
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // metres
  },

  // ─── GEOFENCE CHECK ───────────────────────────────────────────────────────
  isInsideGeofence(userLat, userLng, officeLat, officeLng, radiusMetres) {
    const dist = this.calculateDistance(userLat, userLng, officeLat, officeLng);
    return {
      inside: dist <= radiusMetres,
      distanceMetres: Math.round(dist)
    };
  },

  // ─── ANTI-SPOOFING ────────────────────────────────────────────────────────
  _addSample(pos) {
    this._samples.push(pos);
    if (this._samples.length > this.MAX_SAMPLES) {
      this._samples.shift(); // Keep only last N
    }
  },

  checkSpoofing(currentPos) {
    const flags = {
      teleport: false,     // Impossible speed jump between readings
      jitter: false,       // Suspiciously perfect / zero-movement signal
      lowAccuracy: false,  // GPS accuracy too poor to trust
    };

    // Check accuracy
    if (currentPos.accuracy > this.MIN_ACCURACY_M) {
      flags.lowAccuracy = true;
    }

    if (this._samples.length < 2) return flags; // Not enough data yet

    const prev = this._samples[this._samples.length - 2];
    const curr = this._samples[this._samples.length - 1];

    // Teleport check: speed between last two readings
    const distMetres = this.calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    const timeDiffMs  = new Date(curr.timestamp) - new Date(prev.timestamp);
    const timeDiffSec = timeDiffMs / 1000;

    if (timeDiffSec > 0) {
      const speedKmh = (distMetres / timeDiffSec) * 3.6;
      if (speedKmh > this.MAX_SPEED_KMH) {
        flags.teleport = true;
        console.warn(`[Location] Teleport flag: ${speedKmh.toFixed(1)} km/h`);
      }
    }

    // Jitter check: last 3+ samples all have EXACTLY the same coords (mock/fake GPS)
    if (this._samples.length >= 3) {
      const last3 = this._samples.slice(-3);
      const allSameLat = last3.every(s => s.lat === last3[0].lat);
      const allSameLng = last3.every(s => s.lng === last3[0].lng);
      if (allSameLat && allSameLng) {
        flags.jitter = true;
        console.warn('[Location] Jitter flag: identical coords across 3 samples');
      }
    }

    return flags;
  },

  // ─── FULL ACQUIRE: Position + Spoof Check (used by attendance.js) ─────────
  async acquireVerifiedPosition() {
    const pos = await this.getCurrentPosition();
    const spoofFlags = this.checkSpoofing(pos);
    const isSuspicious = Object.values(spoofFlags).some(f => f === true);

    if (isSuspicious) {
      console.warn('[Location] Suspicious position detected:', spoofFlags);
    }

    return {
      lat: pos.lat,
      lng: pos.lng,
      accuracy: pos.accuracy,
      timestamp: pos.timestamp,
      spoofFlags,
      isSuspicious
    };
  }
};

window.LocationService = LocationService;
