/* Receives push notifications for "Τέλη Κυκλοφορίας" (Firebase Cloud Messaging).
   The page passes its public Firebase config in the ?config= query when it registers this worker. */
importScripts(
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js"
);
const cfg = JSON.parse(new URL(self.location.href).searchParams.get("config") || "{}");
firebase.initializeApp(cfg);
const messaging = firebase.messaging();

// Messages with a `notification` block are shown automatically.
// Data-only messages: show them ourselves.
messaging.onBackgroundMessage((payload) => {
  if (payload.notification) return;
  const d = payload.data || {};
  self.registration.showNotification(d.title || "Τέλη Κυκλοφορίας", { body: d.body || "", icon: "/icon-192.png", badge: "/icon-192.png", data: { link: d.link || "/" } });
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && (event.notification.data.link || (event.notification.data.FCM_MSG && event.notification.data.FCM_MSG.data && event.notification.data.FCM_MSG.data.link))) || "/";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if ("focus" in c) { c.navigate(link); return c.focus(); }
    return clients.openWindow(link);
  }));
});
