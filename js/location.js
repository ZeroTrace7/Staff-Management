/**
 * Location Module
 * Handles GPS, Geofencing, and Anti-spoofing
 */

const LocationService = {
  async getCurrentPosition() {
    console.log('[Location] Getting position...');
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve(position),
          (error) => reject(error),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }
    });
  },

  calculateDistance(lat1, lon1, lat2, lon2) {
    // Haversine formula
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180; // φ, λ in radians
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
  },
  
  checkSpoofing(position) {
     // TODO: Add jitter and speed analysis
     return {
         jitter: false,
         teleport: false,
         consistency: false
     };
  }
};

window.LocationService = LocationService;
