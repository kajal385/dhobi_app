importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyDieUYvi0ikEfv6EJI_9Veb8xvcxqRWb1Y",
  projectId: "laundry-app-2606a",
  messagingSenderId: "747932342697",
  appId: "1:747932342697:web:dhobipro_owner_web"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[Owner Web Worker] Received background notification:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'New Laundry Order 🧺';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'A customer has placed an order for your shop.',
    icon: '/favicon.ico',
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = '/orders';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
