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
    let rejected = 0;
    const remaining = [];

    for (const record of queue) {
      // Remove internal queue metadata before inserting
      const { _queuedAt, _syncedAt, ...cleanRecord } = record;
      cleanRecord.synced_offline = true; // Mark as synced from queue

      const { error } = await getSupabaseClient().from('attendance_logs').insert(cleanRecord);
      if (error) {
        const msg = String(error.message || '').toLowerCase();
        const isPermanentFailure = msg.includes('row-level security') ||
          msg.includes('violates') || msg.includes('duplicate');

        if (isPermanentFailure) {
          // Don't re-queue records that will never succeed (e.g. geofence rejection)
          console.warn('[OfflineSync] Permanently rejected record (discarded):', error.message);
          rejected++;
        } else {
          // Transient error — keep in queue for retry
          console.error('[OfflineSync] Transient sync failure (will retry):', error.message);
          remaining.push(record);
        }
        failed++;
      } else {
        synced++;
      }
    }

    // Save only the ones that had transient failures back to queue
    localStorage.setItem(this.QUEUE_KEY, JSON.stringify(remaining));
    console.log(`[OfflineSync] Done: ${synced} synced, ${failed} failed, ${rejected} rejected.`);
    return { synced, failed, rejected };
  }
};

window.OfflineSync = OfflineSync;

// ─── AUTO-SYNC on network restore ────────────────────────────────────────────
window.addEventListener('online', async () => {
  console.log('[Network] Back online — attempting sync...');
  const result = await OfflineSync.syncNow();
  const banner = document.getElementById('emp-top-banner');
  if (!banner) return;

  if (result.synced > 0 && result.rejected === 0) {
    banner.textContent = `✅ ${result.synced} offline record(s) synced successfully.`;
    banner.style.background = '#065F46';
  } else if (result.rejected > 0) {
    banner.textContent = `⚠️ ${result.rejected} record(s) rejected — you were outside the office zone.`;
    banner.style.background = '#7F1D1D';
  } else if (result.synced > 0) {
    banner.textContent = `✅ ${result.synced} synced, ${result.rejected} rejected (outside zone).`;
    banner.style.background = '#92400E';
  }

  if (result.synced > 0 || result.rejected > 0) {
    setTimeout(() => { banner.textContent = ''; }, 6000);
  }
});

