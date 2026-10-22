importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyDieUYvi0ikEfv6EJI_9Veb8xvcxqRWb1Y",
  projectId: "laundry-app-2606a",
  messagingSenderId: "747932342697",
  appId: "1:747932342697:web:dhobipro_admin_web"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const title = payload.notification?.title || payload.data?.title || 'DhobiPro Platform Alert';
  const body = payload.notification?.body || payload.data?.body || 'You have a new order or account update.';
  const orderId = payload.data?.order_id;
  const type = payload.data?.type || 'general';

  const notificationOptions = {
    body: body,
    icon: '/assets/images/logo.png',
    badge: '/assets/images/logo.png',
    tag: orderId ? `order-${orderId}` : `dhobi-${Date.now()}`,
    vibrate: [200, 100, 200],
    data: {
      ...payload.data,
      url: payload.data?.url || (orderId ? `/orders/index.php?search=${orderId}` : (type === 'verification_request' ? '/laundries/index.php' : '/orders/index.php'))
    }
  };

  self.registration.showNotification(title, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/orders/index.php';

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
