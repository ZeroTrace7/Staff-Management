/**
 * Offline Sync Module
 * Handles queueing failed requests and syncing when back online
 */

const OfflineSync = {
  queueName: 'attendance_sync_queue',

  saveToQueue(record) {
    console.log('[OfflineSync] Saving record to offline queue');
    const queue = this.getQueue();
    queue.push(record);
    localStorage.setItem(this.queueName, JSON.stringify(queue));
    
    // Register background sync if supported
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then(registration => {
        registration.sync.register('sync-attendance');
      });
    }
  },

  getQueue() {
    const data = localStorage.getItem(this.queueName);
    return data ? JSON.parse(data) : [];
  },

  async syncNow() {
    const queue = this.getQueue();
    if (queue.length === 0) return;

    console.log(`[OfflineSync] Attempting to sync ${queue.length} records...`);
    // TODO: Iterate over queue and send to Supabase
    // On success, clear queue
  }
};

window.OfflineSync = OfflineSync;

// Listen for online event
window.addEventListener('online', () => {
  console.log('[Network] Back online, triggering sync');
  OfflineSync.syncNow();
});
