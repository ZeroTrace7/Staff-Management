/**
 * Camera Module
 * Handles getUserMedia, selfie capture, and compression
 */

const CameraService = {
  stream: null,

  async startCamera(videoElement) {
    console.log('[Camera] Starting camera...');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' } 
      });
      if (videoElement) {
          videoElement.srcObject = this.stream;
      }
      return true;
    } catch (err) {
      console.error('[Camera] Error starting camera:', err);
      return false;
    }
  },

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      console.log('[Camera] Camera stopped.');
    }
  },

  captureSelfie(videoElement) {
    console.log('[Camera] Capturing selfie...');
    return new Promise((resolve, reject) => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            
            // Compress to JPEG
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            resolve(dataUrl);
        } catch (err) {
            reject(err);
        }
    });
  }
};

window.CameraService = CameraService;
