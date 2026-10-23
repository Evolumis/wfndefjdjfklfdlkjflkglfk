// Notification and Sound helper for Mobile and Desktop
export class MobileNotifier {
  private static audioCtx: AudioContext | null = null;

  // Synthesize a pleasant chime sound using Web Audio API (Zero external MP3 dependencies)
  public static playChime(type: 'submission' | 'chat' | 'urgent' = 'submission') {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx || this.audioCtx.state === 'suspended') {
        this.audioCtx = new AudioContextClass();
      }

      const ctx = this.audioCtx;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      if (type === 'urgent') {
        // Double high ping for urgent callbacks
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.1);
          gain.gain.setValueAtTime(0.3, now + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.35);
        });
      } else {
        // Warm pleasant chime
        [440, 554.37, 659.25].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.12);
          gain.gain.setValueAtTime(0.2, now + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 0.45);
        });
      }

      // Trigger phone vibration if available
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(type === 'urgent' ? [150, 80, 150, 80, 250] : [200, 100, 200]);
      }
    } catch (e) {
      console.warn('Audio/Vibration notification failed:', e);
    }
  }

  // Request browser permission for system notifications
  public static async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    if (Notification.permission === 'granted') {
      return 'granted';
    }
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.error(e);
      return 'denied';
    }
  }

  // Send a native push/system notification
  public static sendNotification(title: string, options?: { body: string; tag?: string; icon?: string }) {
    this.playChime(options?.tag === 'urgent' ? 'urgent' : 'submission');

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: options?.body,
          icon: options?.icon || '/pwa-192x192.png',
          badge: options?.icon || '/pwa-192x192.png',
          tag: options?.tag,
        });
      } catch (err) {
        // Some mobile browsers require serviceWorkerRegistration.showNotification
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, {
              body: options?.body,
              icon: options?.icon || '/pwa-192x192.png',
              tag: options?.tag,
            });
          });
        }
      }
    }
  }
}
