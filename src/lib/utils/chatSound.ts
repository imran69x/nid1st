/**
 * Web Audio Synthesizer & Notification Utility for WhatsApp/Messenger style alerts
 * Completely self-contained: works cross-browser without external audio files
 */

const SOUND_PREF_KEY = "nid_scanner_chat_sound_enabled";

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const pref = localStorage.getItem(SOUND_PREF_KEY);
  return pref !== "false"; // default to true
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_PREF_KEY, enabled ? "true" : "false");
}

/**
 * Play WhatsApp / Messenger style incoming message chime
 */
export function playIncomingMessageSound(): void {
  if (!isSoundEnabled() || typeof window === "undefined") return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // First Note: G5 (784 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(784, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Second Note: C6 (1046.5 Hz) - classic WhatsApp chime tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1046.5, now + 0.08);
    gain2.gain.setValueAtTime(0.3, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.35);
  } catch (err) {
    // Audio context may be restricted before first user interaction
  }
}

/**
 * Play subtle pop sound for sent message
 */
export function playOutgoingMessageSound(): void {
  if (!isSoundEnabled() || typeof window === "undefined") return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.08);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch (err) {
    // ignore
  }
}

/**
 * Request Browser Notification Permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return "denied";
  }
}

/**
 * Show HTML5 system/desktop/mobile notification
 * Uses ServiceWorkerRegistration.showNotification() for Android Chrome / Tablets
 * and falls back to desktop Notification API.
 */
export async function showBrowserNotification(
  title: string,
  body: string,
  icon?: string,
  onClick?: () => void,
  data?: any
): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    // 1. Android Chrome & Mobile/Tablets REQUIRE Service Worker registration
    if ("serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            body,
            icon: icon || "/favicon.ico",
            badge: icon || "/favicon.ico",
            vibrate: [200, 100, 200, 100, 200], // WhatsApp-style double vibration
            tag: "nid_chat_notification_" + (data?.convId || "general"),
            renotify: true,
            data: data || { url: "/chat" },
          } as any);
          return;
        }
      } catch (swErr) {
        // Fallback to regular Notification if SW not available
      }
    }

    // 2. Desktop Browser fallback (Chrome, Edge, Firefox on Windows/Mac)
    const notification = new Notification(title, {
      body,
      icon: icon || "/favicon.ico",
      badge: "/favicon.ico",
      tag: "nid_chat_notification",
    });

    notification.onclick = () => {
      window.focus();
      if (onClick) onClick();
      notification.close();
    };

    // Auto close after 6s
    setTimeout(() => {
      try {
        notification.close();
      } catch {}
    }, 6000);
  } catch (err) {
    console.warn("Notification error:", err);
  }
}
