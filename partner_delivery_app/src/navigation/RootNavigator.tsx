import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { AuthNavigator } from './AuthNavigator';
import { OwnerNavigator } from './OwnerNavigator';
import { DeliveryBoyNavigator } from './DeliveryBoyNavigator';
import { useAuth } from '../context/AuthContext';
import { SplashScreen } from '../screens/SplashScreen';

const Stack = createStackNavigator();

export const RootNavigator = () => {
  const { isAuthenticated, userRole } = useAuth();
  const [showAppLaunchSplash, setShowAppLaunchSplash] = useState(true);

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
    <NavigationContainer>
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
