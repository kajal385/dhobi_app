import {
  getMessaging,
  getToken,
  deleteToken,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  onTokenRefresh,
  requestPermission as fbRequestPermission,
  isDeviceRegisteredForRemoteMessages,
  registerDeviceForRemoteMessages,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';
import Toast from 'react-native-toast-message';
import apiClient from '../api/client';

export const CUSTOMER_NOTIFICATION_CHANNEL_ID = 'dhobipro_customer_channel';

class FcmService {
  private unsubscribeForeground: (() => void) | null = null;
  private unsubscribeTokenRefresh: (() => void) | null = null;

  private getMessagingInstance() {
    try {
      return getMessaging();
    } catch (e) {
      console.warn('[FCM] Error getting messaging instance:', e);
      return null;
    }
  }

  /**
   * Request push notification permissions (Android 13+ and iOS)
   */
  async requestPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Notification Permission',
              message: 'DhobiPro needs notification permission to send you real-time order and laundry updates.',
              buttonPositive: 'Allow',
              buttonNegative: 'Deny',
            }
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
      }

      // iOS
      const messagingInstance = this.getMessagingInstance();
      if (!messagingInstance) return false;

      const authStatus = await fbRequestPermission(messagingInstance, {
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        provisional: false,
        sound: true,
      });

      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

      return enabled;
    } catch (error) {
      console.warn('[FCM] Permission request error:', error);
      return false;
    }
  }

  /**
   * Get current device FCM token
   */
  async getDeviceToken(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.log('[FCM] Notification permission not granted');
      }

      const messagingInstance = this.getMessagingInstance();
      if (!messagingInstance) return null;

      // Register device for remote messages on iOS if needed
      if (Platform.OS === 'ios' && !isDeviceRegisteredForRemoteMessages(messagingInstance)) {
        await registerDeviceForRemoteMessages(messagingInstance);
      }

      const token = await getToken(messagingInstance);
      console.log('[FCM] Customer Device Token:', token ? token.substring(0, 15) + '...' : 'null');
      return token;
    } catch (error) {
      console.warn('[FCM] Error fetching device token:', error);
      return null;
    }
  }

  /**
   * Send device token to Laravel backend
   */
  async registerTokenWithBackend(token?: string, userId?: number): Promise<void> {
    try {
      const tokenToRegister = token || (await this.getDeviceToken());
      if (!tokenToRegister) return;

      await apiClient.post('/fcm/token', {
        token: tokenToRegister,
        device_type: Platform.OS,
        app_type: 'customer',
        user_id: userId,
        device_name: `${Platform.OS.toUpperCase()} App`,
      });
      console.log('[FCM] Token registered with backend successfully');
    } catch (error: any) {
      console.warn('[FCM] Failed to sync token with backend:', error.response?.data || error.message);
    }
  }

  /**
   * De-register token on logout
   */
  async unregisterToken(token?: string): Promise<void> {
    try {
      const messagingInstance = this.getMessagingInstance();
      const currentToken =
        token || (messagingInstance ? await getToken(messagingInstance).catch(() => null) : null);
      if (currentToken) {
        await apiClient.post('/fcm/token/remove', { token: currentToken });
      }
      if (messagingInstance) {
        await deleteToken(messagingInstance);
      }
      console.log('[FCM] Token removed successfully');
    } catch (error: any) {
      console.warn('[FCM] Error removing token:', error.message);
    }
  }

  /**
   * Initialize notification listeners (Foreground, Background, Quit-state tap)
   */
  setupListeners(navigationRef?: any) {
    const messagingInstance = this.getMessagingInstance();
    if (!messagingInstance) return;

    // 1. Foreground Message Handler
    this.unsubscribeForeground = onMessage(messagingInstance, async (remoteMessage) => {
      console.log('[FCM Foreground Message]:', remoteMessage);

      const title = remoteMessage.notification?.title || remoteMessage.data?.title || 'DhobiPro Update';
      const body = remoteMessage.notification?.body || remoteMessage.data?.body || 'You have a new update on your order.';
      const orderId = remoteMessage.data?.order_id;
      const notifType = remoteMessage.data?.type || 'ORDER_STATUS_UPDATE';

      // 1. Insert into Redux notification center store in real-time
      try {
        const { store } = require('../store');
        const { addNotification } = require('../store/notificationSlice');
        store.dispatch(
          addNotification({
            id: Date.now(),
            title: String(title),
            body: String(body),
            type: String(notifType),
            is_read: false,
            data: remoteMessage.data || {},
            created_at: new Date().toISOString(),
          })
        );
      } catch (err) {
        console.warn('[FCM] Could not dispatch to store:', err);
      }

      // 2. Show in-app banner/toast popup for order actions
      Toast.show({
        type: 'info',
        text1: String(title),
        text2: String(body),
        visibilityTime: 6000,
        onPress: () => {
          if (orderId && navigationRef?.isReady?.()) {
            navigationRef.navigate('OrderDetail', { orderId: Number(orderId) });
          }
        },
      });
    });

    // 2. Notification Tap from Background
    onNotificationOpenedApp(messagingInstance, (remoteMessage) => {
      console.log('[FCM Notification Opened from Background]:', remoteMessage);
      const orderId = remoteMessage.data?.order_id;
      if (orderId && navigationRef?.isReady?.()) {
        navigationRef.navigate('OrderDetail', { orderId: Number(orderId) });
      }
    });

    // 3. Notification Tap from Terminated (Quit) State
    getInitialNotification(messagingInstance)
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('[FCM Notification Opened from Quit State]:', remoteMessage);
          const orderId = remoteMessage.data?.order_id;
          if (orderId && navigationRef?.isReady?.()) {
            setTimeout(() => {
              navigationRef.navigate('OrderDetail', { orderId: Number(orderId) });
            }, 1000);
          }
        }
      })
      .catch((err) => {
        console.warn('[FCM] Error checking initial notification:', err);
      });

    // 4. Token Refresh Listener
    this.unsubscribeTokenRefresh = onTokenRefresh(messagingInstance, (newToken) => {
      console.log('[FCM Token Refreshed]:', newToken.substring(0, 15) + '...');
      this.registerTokenWithBackend(newToken);
    });
  }

  /**
   * Cleanup listeners
   */
  destroy() {
    if (this.unsubscribeForeground) this.unsubscribeForeground();
    if (this.unsubscribeTokenRefresh) this.unsubscribeTokenRefresh();
  }
}

export const fcmService = new FcmService();
export default fcmService;
