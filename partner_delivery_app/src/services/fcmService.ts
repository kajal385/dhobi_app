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
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import apiClient from './apiClient';

export const PARTNER_NOTIFICATION_CHANNEL_ID = 'dhobipro_partner_channel';

class PartnerFcmService {
  private unsubscribeForeground: (() => void) | null = null;
  private unsubscribeTokenRefresh: (() => void) | null = null;

  private getMessagingInstance() {
    try {
      return getMessaging();
    } catch (e) {
      console.warn('[Partner FCM] Error getting messaging instance:', e);
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
              title: 'Order Alerts Permission',
              message: 'DhobiPro Partner needs notification permission to alert you when new customer orders or pickups are assigned.',
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
      console.warn('[Partner FCM] Permission error:', error);
      return false;
    }
  }

  /**
   * Get device FCM token
   */
  async getDeviceToken(): Promise<string | null> {
    try {
      await this.requestPermission();

      const messagingInstance = this.getMessagingInstance();
      if (!messagingInstance) return null;

      if (Platform.OS === 'ios' && !isDeviceRegisteredForRemoteMessages(messagingInstance)) {
        await registerDeviceForRemoteMessages(messagingInstance);
      }

      const token = await getToken(messagingInstance);
      console.log('[Partner FCM] Device Token:', token ? token.substring(0, 15) + '...' : 'null');
      return token;
    } catch (error) {
      console.warn('[Partner FCM] Token error:', error);
      return null;
    }
  }

  /**
   * Register device token with Laravel backend
   */
  async registerTokenWithBackend(token?: string, userId?: number, role: string = 'owner'): Promise<void> {
    try {
      const tokenToRegister = token || (await this.getDeviceToken());
      if (!tokenToRegister) return;

      await apiClient.post('/owner/fcm/token', {
        token: tokenToRegister,
        device_type: Platform.OS,
        app_type: role === 'owner' ? 'owner' : 'delivery',
        user_id: userId,
        device_name: `${Platform.OS.toUpperCase()} Partner App`,
      });
      console.log('[Partner FCM] Registered with backend successfully');
    } catch (error: any) {
      console.warn('[Partner FCM] Backend sync error:', error.response?.data || error.message);
    }
  }

  /**
   * De-register token on logout
   */
  async unregisterToken(): Promise<void> {
    try {
      const messagingInstance = this.getMessagingInstance();
      const currentToken = messagingInstance ? await getToken(messagingInstance).catch(() => null) : null;
      if (currentToken) {
        await apiClient.post('/owner/fcm/token/remove', { token: currentToken });
      }
      if (messagingInstance) {
        await deleteToken(messagingInstance);
      }
      console.log('[Partner FCM] Token unregistered');
    } catch (error: any) {
      console.warn('[Partner FCM] Error removing token:', error.message);
    }
  }

  /**
   * Setup FCM listeners for foreground, background, tap events
   */
  setupListeners(navigationRef?: any) {
    const messagingInstance = this.getMessagingInstance();
    if (!messagingInstance) return;

    // 1. Foreground message handler
    this.unsubscribeForeground = onMessage(messagingInstance, async (remoteMessage) => {
      console.log('[Partner FCM Foreground Message]:', remoteMessage);

      const title = String(remoteMessage.notification?.title || remoteMessage.data?.title || 'New Order Notification! 🧺');
      const body = String(remoteMessage.notification?.body || remoteMessage.data?.body || 'A new laundry order is waiting for review.');
      const orderId = remoteMessage.data?.order_id;

      Alert.alert(
        title,
        body,
        [
          { text: 'Dismiss', style: 'cancel' },
          {
            text: 'View Order',
            onPress: () => {
              if (orderId && navigationRef?.isReady?.()) {
                navigationRef.navigate('OrderDetail', { orderId: Number(orderId) });
              }
            },
          },
        ],
        { cancelable: true }
      );
    });

    // 2. Notification opened from background
    onNotificationOpenedApp(messagingInstance, (remoteMessage) => {
      console.log('[Partner FCM Notification Opened from Background]:', remoteMessage);
      const orderId = remoteMessage.data?.order_id;
      if (orderId && navigationRef?.isReady?.()) {
        navigationRef.navigate('OrderDetail', { orderId: Number(orderId) });
      }
    });

    // 3. Notification opened from quit state
    getInitialNotification(messagingInstance)
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('[Partner FCM Notification Opened from Quit State]:', remoteMessage);
          const orderId = remoteMessage.data?.order_id;
          if (orderId && navigationRef?.isReady?.()) {
            setTimeout(() => {
              navigationRef.navigate('OrderDetail', { orderId: Number(orderId) });
            }, 1000);
          }
        }
      })
      .catch((err) => {
        console.warn('[Partner FCM] Error checking initial notification:', err);
      });

    // 4. Token refresh listener
    this.unsubscribeTokenRefresh = onTokenRefresh(messagingInstance, (newToken) => {
      console.log('[Partner FCM Token Refreshed]:', newToken.substring(0, 15) + '...');
      this.registerTokenWithBackend(newToken);
    });
  }

  destroy() {
    if (this.unsubscribeForeground) this.unsubscribeForeground();
    if (this.unsubscribeTokenRefresh) this.unsubscribeTokenRefresh();
  }
}

export const partnerFcmService = new PartnerFcmService();
export default partnerFcmService;
