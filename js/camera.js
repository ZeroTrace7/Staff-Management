/**
 * Camera Module — js/camera.js
 * Handles getUserMedia, selfie capture, JPEG compression, and Supabase Storage upload
 */

const CameraService = {
  stream: null,
  _videoEl: null,

  // ─── START CAMERA (front-facing) ─────────────────────────────────────────
  async startCamera(videoElement) {
    this._videoEl = videoElement;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      if (videoElement) {
        videoElement.srcObject = this.stream;
        videoElement.play();
      }
      console.log('[Camera] Stream started');
      return { success: true };
    } catch (err) {
      const messages = {
        NotAllowedError:  'Camera permission denied. Please allow camera access.',
        NotFoundError:    'No camera found on this device.',
        NotReadableError: 'Camera is in use by another app.'
      };
      const msg = messages[err.name] || err.message;
      console.error('[Camera] Error:', msg);
      return { success: false, error: msg };
    }
  },

  // ─── STOP CAMERA ──────────────────────────────────────────────────────────
  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      if (this._videoEl) this._videoEl.srcObject = null;
      console.log('[Camera] Stream stopped');
    }
  },

  // ─── CAPTURE FRAME → JPEG Blob ────────────────────────────────────────────
  captureFrame(videoElement, quality = 0.7) {
    const vid = videoElement || this._videoEl;
    if (!vid || !vid.videoWidth) {
      throw new Error('[Camera] Video not ready — cannot capture frame.');
    }

    const canvas = document.createElement('canvas');
    canvas.width  = vid.videoWidth;
    canvas.height = vid.videoHeight;

    const ctx = canvas.getContext('2d');
    // Mirror the image (front camera captures mirrored)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('[Camera] Failed to create image blob.'));
        },
        'image/jpeg',
        quality
      );
    });
  },

  // ─── UPLOAD TO SUPABASE STORAGE ──────────────────────────────────────────
  // Path: {company_id}/{user_id}/{UTC-timestamp}.jpg
  async uploadSelfie(blob, userId, companyId) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // safe filename
    const filePath  = `${companyId}/${userId}/${timestamp}.jpg`;

    const { data, error } = await supabase.storage
      .from('selfies')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (error) {
      console.error('[Camera] Upload error:', error.message);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('selfies')
      .getPublicUrl(filePath);

    console.log('[Camera] Selfie uploaded:', urlData.publicUrl);
    return { success: true, url: urlData.publicUrl, path: filePath };
  },

  // ─── CONVENIENCE: Capture + Upload in one call ───────────────────────────
  async captureAndUpload(videoElement, userId, companyId) {
    const blob = await this.captureFrame(videoElement);
    return await this.uploadSelfie(blob, userId, companyId);
  }
};

window.CameraService = CameraService;
