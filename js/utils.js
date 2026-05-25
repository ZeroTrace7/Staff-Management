/**
 * Utils Module — js/utils.js
 * Date formatting (UTC → local display), CSV export, and misc helpers
 * RULE: All dates stored as UTC. Display conversion happens here ONLY.
 */

const Utils = {

  // ─── DATE / TIME FORMATTING ──────────────────────────────────────────────

  // "25 May 2026"
  formatDate(utcIsoString) {
    const d = new Date(utcIsoString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }).format(d);
  },

  // "09:32 AM"
  formatTime(utcIsoString) {
    const d = new Date(utcIsoString);
    return new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric', minute: '2-digit', hour12: true,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }).format(d);
  },

  // "Mon, 25 May · 09:32 AM"
  formatDateTime(utcIsoString) {
    const d = new Date(utcIsoString);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const date = new Intl.DateTimeFormat('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', timeZone: tz
    }).format(d);
    const time = new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz
    }).format(d);
    return `${date} · ${time}`;
  },

  // ─── UTC TODAY boundaries (for daily queries) ────────────────────────────
  getTodayUTC() {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start: start.toISOString(), end: end.toISOString() };
  },

  // ─── CSV EXPORT ──────────────────────────────────────────────────────────
  exportToCSV(rows, filename = 'attendance.csv') {
    if (!rows || rows.length === 0) return;

    const headers = Object.keys(rows[0]);
    const csvRows = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(h => {
          const val = row[h] ?? '';
          // Escape commas and quotes
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`[Utils] CSV exported: ${filename} (${rows.length} rows)`);
  },

  // ─── MISC ────────────────────────────────────────────────────────────────

  // Truncate long strings for display
  truncate(str, maxLen = 20) {
    if (!str) return '';
    return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
  },

  // Format metres for display: "0.45 km" or "320 m"
  formatDistance(metres) {
    if (metres >= 1000) return `${(metres / 1000).toFixed(2)} km`;
    return `${Math.round(metres)} m`;
  },

  // Debounce for search inputs etc.
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }
};

window.Utils = Utils;
