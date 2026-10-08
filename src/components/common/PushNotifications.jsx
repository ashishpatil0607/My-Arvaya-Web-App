import { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { requestFcmToken, onForegroundMessage, isFirebaseConfigured } from "../../services/firebase";

/**
 * Keeps the stored FCM token fresh for the logged-in user (it's sent to the backend as
 * cloud_id by authService) and surfaces foreground messages as toasts.
 */
export default function PushNotifications() {
  const { user, showToast } = useAuth();
  const userId = user?.id || user?.user_id || user?.app_user_id;

  useEffect(() => {
    if (!userId || !isFirebaseConfigured) return;
    requestFcmToken().catch((err) => console.error("Push notification setup failed:", err));
  }, [userId]);

  useEffect(() => {
    if (!userId || !isFirebaseConfigured) return;
    let unsubscribe = null;
    let cancelled = false;
    onForegroundMessage((payload) => {
      const title = payload.notification?.title || payload.data?.title;
      const body = payload.notification?.body || payload.data?.body;
      // Longer messages stay up longer: 6s base + ~reading time, capped at 15s
      const duration = Math.min(15000, 6000 + (body?.length || 0) * 40);
      showToast(body || "", "info", { title: title || "New notification", duration });
    }).then((unsub) => {
      if (cancelled) unsub();
      else unsubscribe = unsub;
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [userId, showToast]);

  return null;
}
