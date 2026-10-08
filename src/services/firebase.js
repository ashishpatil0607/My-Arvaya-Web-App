import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, deleteToken, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

const FCM_TOKEN_KEY = "arvaya_fcm_token";

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && VAPID_KEY);

let messagingPromise = null;

// Resolves to null when the browser has no push support (e.g. iOS Safari outside an installed PWA)
function getMessagingInstance() {
  if (!messagingPromise) {
    messagingPromise = (async () => {
      if (!isFirebaseConfigured || !(await isSupported())) return null;
      const app = getApps()[0] || initializeApp(firebaseConfig);
      return getMessaging(app);
    })();
  }
  return messagingPromise;
}

// Service workers can't read import.meta.env, so the config is passed on the registration URL
async function registerMessagingServiceWorker() {
  const params = new URLSearchParams(firebaseConfig);
  return navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params}`);
}

/**
 * Asks for notification permission (if not decided yet) and returns the FCM token,
 * or null if push is unsupported, not configured, or permission was denied.
 */
export async function requestFcmToken() {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const serviceWorkerRegistration = await registerMessagingServiceWorker();
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration });
  if (token) localStorage.setItem(FCM_TOKEN_KEY, token);
  return token;
}

export function getStoredFcmToken() {
  return localStorage.getItem(FCM_TOKEN_KEY) || "";
}

/**
 * Same as requestFcmToken but never throws and gives up after timeoutMs,
 * so a pending permission prompt can't block the caller (e.g. login).
 */
export async function ensureFcmToken(timeoutMs = 8000) {
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
  try {
    return (await Promise.race([requestFcmToken(), timeout])) || getStoredFcmToken();
  } catch (err) {
    console.error("ensureFcmToken error:", err);
    return getStoredFcmToken();
  }
}

export async function removeFcmToken() {
  const messaging = await getMessagingInstance();
  localStorage.removeItem(FCM_TOKEN_KEY);
  if (!messaging) return;
  try {
    await deleteToken(messaging);
  } catch (err) {
    console.error("removeFcmToken error:", err);
  }
}

/** Subscribes to messages received while the app tab is in focus. Returns an unsubscribe fn. */
export async function onForegroundMessage(callback) {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}
