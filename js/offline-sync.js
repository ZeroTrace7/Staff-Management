/**
 * Offline Sync Module — js/offline-sync.js
 * Queues attendance records in localStorage when Supabase is unreachable.
 * Syncs automatically when the device comes back online.
 */

const OfflineSync = {
  QUEUE_KEY: 'sm_attendance_queue',

  // ─── ADD RECORD TO QUEUE ─────────────────────────────────────────────────
  saveToQueue(record) {
    const queue = this.getQueue();
    queue.push({ ...record, _queuedAt: new Date().toISOString() });
    localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
    console.log(`[OfflineSync] Record queued. Queue size: ${queue.length}`);
  },

  // ─── GET QUEUE ────────────────────────────────────────────────────────────
  getQueue() {
    try {
      const raw = localStorage.getItem(this.QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  // ─── QUEUE SIZE (for UI badge) ────────────────────────────────────────────
  getQueueSize() {
    return this.getQueue().length;
  },

  // ─── CLEAR QUEUE ─────────────────────────────────────────────────────────
  clearQueue() {
    localStorage.removeItem(this.QUEUE_KEY);
    console.log('[OfflineSync] Queue cleared.');
  },

  // ─── SYNC ALL QUEUED RECORDS TO SUPABASE ─────────────────────────────────
  async syncNow() {
    const queue = this.getQueue();
    if (queue.length === 0) {
      console.log('[OfflineSync] Queue empty — nothing to sync.');
      return { synced: 0, failed: 0 };
    }

    console.log(`[OfflineSync] Syncing ${queue.length} records...`);
    let synced = 0;
    let failed = 0;
    const remaining = [];

    for (const record of queue) {
      // Remove internal queue metadata before inserting
      const { _queuedAt, _syncedAt, ...cleanRecord } = record;
      cleanRecord.synced_offline = true; // Mark as synced from queue

      const { error } = await getSupabaseClient().from('attendance_logs').insert(cleanRecord);
      if (error) {
        console.error('[OfflineSync] Failed to sync record:', error.message);
        remaining.push(record);
        failed++;
      } else {
        synced++;
      }
    }

    // Save only the ones that failed back to queue
    localStorage.setItem(this.QUEUE_KEY, JSON.stringify(remaining));
    console.log(`[OfflineSync] Done: ${synced} synced, ${failed} failed.`);
    return { synced, failed };
  }
};

window.OfflineSync = OfflineSync;

// ─── AUTO-SYNC on network restore ────────────────────────────────────────────
window.addEventListener('online', async () => {
  console.log('[Network] Back online — attempting sync...');
  const result = await OfflineSync.syncNow();
  if (result.synced > 0) {
    // Notify the user if there's UI to show
    const banner = document.getElementById('emp-top-banner');
    if (banner) {
      banner.textContent = `✅ ${result.synced} offline record(s) synced successfully.`;
      banner.style.background = '#065F46';
      setTimeout(() => { banner.textContent = ''; }, 4000);
    }
  }
});
