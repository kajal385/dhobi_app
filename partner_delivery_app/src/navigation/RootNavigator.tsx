import React, { useState, useEffect } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { AuthNavigator } from './AuthNavigator';
import { OwnerNavigator } from './OwnerNavigator';
import { DeliveryBoyNavigator } from './DeliveryBoyNavigator';
import { useAuth } from '../context/AuthContext';
import { SplashScreen } from '../screens/SplashScreen';
import { partnerFcmService } from '../services/fcmService';

export const partnerNavigationRef = createNavigationContainerRef();
const Stack = createStackNavigator();

export const RootNavigator = () => {
  const { isAuthenticated, userRole, currentUser } = useAuth();
  const [showAppLaunchSplash, setShowAppLaunchSplash] = useState(true);

  // Initialize Partner Firebase Cloud Messaging
  useEffect(() => {
    partnerFcmService.requestPermission();
    partnerFcmService.setupListeners(partnerNavigationRef);

    if (isAuthenticated && currentUser?.id) {
      partnerFcmService.registerTokenWithBackend(undefined, currentUser.id, userRole || 'owner');
    }

    return () => {
      partnerFcmService.destroy();
    };
  }, [isAuthenticated, userRole, currentUser?.id]);

  // App launch splash screen
  if (showAppLaunchSplash) {
    return (
      <SplashScreen
        role="delivery_boy"
        onFinish={() => setShowAppLaunchSplash(false)}
      />
    );
  }

  return (
    <NavigationContainer ref={partnerNavigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : userRole === 'owner' ? (
          <Stack.Screen name="OwnerRoot" component={OwnerNavigator} />
        ) : (
          <Stack.Screen name="DeliveryBoyRoot" component={DeliveryBoyNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
