/**
 * Utility Functions
 */

const Utils = {
  formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  },

  formatTime(date) {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  },

  exportToCSV(data, filename) {
    console.log('[Utils] Exporting CSV...', filename);
    // TODO: convert data array to CSV and trigger download
  }
};

window.Utils = Utils;
