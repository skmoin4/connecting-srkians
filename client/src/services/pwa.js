/**
 * PWA + push readiness.
 *  - Registers the service worker (app-shell cache + offline fallback) in production builds.
 *  - Push: the backend sends FCM messages once FIREBASE_* credentials are configured. To enable
 *    browser push, add the Firebase JS SDK, obtain an FCM token with your VAPID key and POST it to
 *    /api/v1/users/me/fcm-tokens (see README → Firebase Setup). `registerPushToken` does the POST.
 */
import { http } from '../api/client.js';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

export const pushSupported = () => typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;

export async function requestPushPermission() {
  if (!pushSupported()) return 'unsupported';
  return Notification.requestPermission();
}

export const registerPushToken = (token) => http.post('/users/me/fcm-tokens', { token });
