/**
 * DhobiPro Admin & Owner Web Panel - Firebase Cloud Messaging Integration
 * Handles browser push notification permission, service worker registration,
 * FCM token synchronization with Laravel backend, and foreground message alerts.
 */

(function () {
  'use strict';

  // Check browser support for Service Worker & Notifications
  const isSupported = ('Notification' in window) && ('serviceWorker' in navigator) && ('PushManager' in window);

  if (!isSupported) {
    console.info('[DhobiPro Push] Browser push notifications are not supported on this browser or platform.');
    return;
  }

  // Retrieve Firebase configuration from window.DHOBI_CONFIG
  const firebaseConfig = (window.DHOBI_CONFIG && window.DHOBI_CONFIG.firebase) || {
    apiKey: "AIzaSyDieUYvi0ikEfv6EJI_9Veb8xvcxqRWb1Y",
    projectId: "laundry-app-2606a",
    messagingSenderId: "747932342697",
    appId: "1:747932342697:web:dhobipro_admin_web"
  };

  let messaging = null;
  let swRegistration = null;

  // Initialize Firebase Web App if not already initialized
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    messaging = firebase.messaging();
  } catch (err) {
    console.warn('[DhobiPro Push] Firebase initialization error:', err);
    return;
  }

  // Soft notification audio chime using HTML5 Web Audio API
  function playNotificationChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      // AudioContext could be blocked by autoplay policies
    }
  }

  // Display floating in-app notification banner
  function showInAppAlert(title, body, url) {
    playNotificationChime();

    let bannerContainer = document.getElementById('dhobiPushAlertContainer');
    if (!bannerContainer) {
      bannerContainer = document.createElement('div');
      bannerContainer.id = 'dhobiPushAlertContainer';
      bannerContainer.style.cssText = 'position: fixed; top: 20px; right: 24px; z-index: 999999; display: flex; flex-direction: column; gap: 12px; max-width: 380px; width: calc(100vw - 48px); pointer-events: none;';
      document.body.appendChild(bannerContainer);
    }

    const item = document.createElement('div');
    item.style.cssText = `
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 14px;
      padding: 14px 18px;
      box-shadow: 0 16px 36px rgba(129, 98, 238, 0.22), 0 4px 12px rgba(0, 0, 0, 0.08);
      border: 1px solid rgba(129, 98, 238, 0.25);
      border-left: 5px solid #8162EE;
      display: flex;
      flex-direction: column;
      gap: 6px;
      pointer-events: auto;
      animation: dhobiSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      color: #1E293B;
      font-family: 'Plus Jakarta Sans', sans-serif;
    `;

    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 800; font-size: 0.88rem; color: #8162EE; display: flex; align-items: center; gap: 6px;">
          <span>🔔</span> ${title}
        </span>
        <button type="button" class="close-alert-btn" style="background: none; border: none; font-size: 1.1rem; color: #94A3B8; cursor: pointer; padding: 0 4px; line-height: 1;">&times;</button>
      </div>
      <p style="margin: 0; font-size: 0.82rem; color: #475569; font-weight: 500; line-height: 1.35;">${body}</p>
      ${url ? `<a href="${url}" style="margin-top: 4px; align-self: flex-start; font-size: 0.78rem; font-weight: 700; color: #8162EE; text-decoration: none;">View Details &rarr;</a>` : ''}
    `;

    bannerContainer.appendChild(item);

    const closeBtn = item.querySelector('.close-alert-btn');
    closeBtn.addEventListener('click', () => {
      item.style.opacity = '0';
      item.style.transform = 'translateX(20px)';
      item.style.transition = 'all 0.25s ease';
      setTimeout(() => item.remove(), 250);
    });

    setTimeout(() => {
      if (item.parentNode) {
        item.style.opacity = '0';
        item.style.transform = 'translateX(20px)';
        item.style.transition = 'all 0.3s ease';
        setTimeout(() => item.remove(), 300);
      }
    }, 7000);
  }

  // Register device FCM token with backend API
  async function syncTokenWithBackend(token) {
    if (!token) return;

    const base = (window.DHOBI_CONFIG && window.DHOBI_CONFIG.baseUrl) ? window.DHOBI_CONFIG.baseUrl : '';
    const user = (window.DHOBI_CONFIG && window.DHOBI_CONFIG.user) || {};
    const isOwner = (window.DHOBI_CONFIG && window.DHOBI_CONFIG.isLaundryOwner) || false;

    const payload = {
      token: token,
      device_type: 'web',
      app_type: isOwner ? 'owner' : 'admin',
      user_id: user.id || null,
      device_name: `${navigator.userAgentData ? navigator.userAgentData.platform : 'Web'} (${navigator.userAgent.indexOf('Chrome') !== -1 ? 'Chrome' : 'Browser'})`
    };

    try {
      const url = `${base}/includes/api_proxy.php?endpoint=${encodeURIComponent('/fcm/token')}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log('[DhobiPro Push] Registered Web FCM token with backend:', data);
    } catch (e) {
      console.warn('[DhobiPro Push] Could not sync token with backend API:', e);
    }
  }

  // Update UI Bell indicator
  function updatePushNotificationUI(permissionState) {
    const btn = document.getElementById('webPushToggleBtn');
    if (!btn) return;

    if (permissionState === 'granted') {
      btn.innerHTML = `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10B981; margin-right:6px; box-shadow:0 0 6px #10B981;"></span> Push Alerts Active`;
      btn.style.color = '#10B981';
      btn.style.background = 'rgba(16, 185, 129, 0.08)';
      btn.style.borderColor = 'rgba(16, 185, 129, 0.25)';
      btn.title = 'Push notifications enabled. You will receive live order and system alerts.';
    } else if (permissionState === 'denied') {
      btn.innerHTML = `<span>⚠️</span> Push Blocked`;
      btn.style.color = '#EF4444';
      btn.style.background = 'rgba(239, 68, 68, 0.08)';
      btn.style.borderColor = 'rgba(239, 68, 68, 0.25)';
      btn.title = 'Notifications are blocked in your browser settings. Click lock icon in address bar to unblock.';
    } else {
      btn.innerHTML = `<span>🔔</span> Enable Alerts`;
      btn.style.color = '#8162EE';
      btn.style.background = 'rgba(129, 98, 238, 0.08)';
      btn.style.borderColor = 'rgba(129, 98, 238, 0.25)';
      btn.title = 'Click to enable real-time order and platform desktop push notifications.';
    }
  }

  // Request browser permission and fetch token
  async function requestNotificationPermission() {
    try {
      const permission = await Notification.requestPermission();
      updatePushNotificationUI(permission);

      if (permission === 'granted') {
        const swPath = (window.DHOBI_CONFIG && window.DHOBI_CONFIG.baseUrl ? window.DHOBI_CONFIG.baseUrl : '') + '/firebase-messaging-sw.js';
        swRegistration = await navigator.serviceWorker.register(swPath);

        const currentToken = await messaging.getToken({
          serviceWorkerRegistration: swRegistration
        });

        if (currentToken) {
          localStorage.setItem('dhobipro_web_fcm_token', currentToken);
          await syncTokenWithBackend(currentToken);
          if (window.showToast) {
            window.showToast('Push notifications enabled successfully! 🔔', 'success');
          }
        }
      } else if (permission === 'denied') {
        if (window.showToast) {
          window.showToast('Notification permission denied. Please allow notifications in browser settings.', 'error');
        }
      }
    } catch (err) {
      console.warn('[DhobiPro Push] Permission request error:', err);
    }
  }

  // Initialize service worker and listeners on DOM ready
  document.addEventListener('DOMContentLoaded', async () => {
    // Inject animation CSS
    const animStyle = document.createElement('style');
    animStyle.textContent = `
      @keyframes dhobiSlideIn {
        from { opacity: 0; transform: translateY(-12px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
    `;
    document.head.appendChild(animStyle);

    // Initial UI state
    updatePushNotificationUI(Notification.permission);

    const toggleBtn = document.getElementById('webPushToggleBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        requestNotificationPermission();
      });
    }

    // If permission already granted, silently ensure token is registered
    if (Notification.permission === 'granted') {
      try {
        const swPath = (window.DHOBI_CONFIG && window.DHOBI_CONFIG.baseUrl ? window.DHOBI_CONFIG.baseUrl : '') + '/firebase-messaging-sw.js';
        swRegistration = await navigator.serviceWorker.register(swPath);

        const token = await messaging.getToken({ serviceWorkerRegistration: swRegistration });
        if (token) {
          localStorage.setItem('dhobipro_web_fcm_token', token);
          syncTokenWithBackend(token);
        }
      } catch (e) {
        console.warn('[DhobiPro Push] Silent token sync error:', e);
      }
    }

    // Setup foreground message listener
    messaging.onMessage((payload) => {
      console.log('[DhobiPro Push Foreground Message]:', payload);
      const title = payload.notification?.title || payload.data?.title || 'DhobiPro Update';
      const body = payload.notification?.body || payload.data?.body || 'New update received on the platform.';
      const orderId = payload.data?.order_id;
      const type = payload.data?.type;
      const url = payload.data?.url || (orderId ? `/orders/index.php?search=${orderId}` : (type === 'verification_request' ? '/laundries/index.php' : '/orders/index.php'));

      showInAppAlert(title, body, url);
    });
  });

  // Global interface
  window.DhobiWebNotifications = {
    requestPermission: requestNotificationPermission,
    getRegistration: () => swRegistration
  };
})();
