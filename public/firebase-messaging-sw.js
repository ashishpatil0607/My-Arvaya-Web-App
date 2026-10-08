/* Handles FCM push messages while the app is closed or in a background tab. */
importScripts("https://www.gstatic.com/firebasejs/13.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/13.0.0/firebase-messaging-compat.js");

// Config is passed as query params by src/services/firebase.js
const params = new URL(self.location).searchParams;

firebase.initializeApp({
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  storageBucket: params.get("storageBucket"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
});

const messaging = firebase.messaging();

// Messages with a `notification` payload are shown by FCM automatically.
// Data-only messages are shown here.
messaging.onBackgroundMessage((payload) => {
  if (payload.notification) return;
  const data = payload.data || {};
  self.registration.showNotification(data.title || "Arvaya Healthcare", {
    body: data.body || "",
    icon: data.icon || "/logo.png",
    data: { link: data.link || data.click_action || "/notifications" },
  });
});

// Focus an open tab (or open a new one) at the notification's link
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const fcmData = event.notification.data?.FCM_MSG?.data || {};
  const link = event.notification.data?.link || fcmData.link || "/notifications";
  const url = new URL(link, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
