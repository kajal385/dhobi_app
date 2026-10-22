/**
 * @format
 */

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// Register Firebase Background Push Notification Handler (Modular RN Firebase v26)
try {
  const messaging = getMessaging();
  setBackgroundMessageHandler(messaging, async (remoteMessage) => {
    console.log('[FCM Background Message Received]:', remoteMessage?.messageId);
  });
} catch (e) {
  console.warn('[FCM Background Handler Warning]:', e);
}

AppRegistry.registerComponent(appName, () => App);
