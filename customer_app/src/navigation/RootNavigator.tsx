import React, { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import AppNavigator from './AppNavigator';
import SplashScreen from '../screens/auth/SplashScreen';
import AnimatedAuthScreen from '../screens/auth/AnimatedAuthScreen';
import { fcmService } from '../services/fcmService';
import { useTheme } from '../context/ThemeContext';

export const navigationRef = createNavigationContainerRef();
const Stack = createStackNavigator();

export const RootNavigator = () => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const { navigationTheme } = useTheme();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Initialize Firebase Cloud Messaging listeners
  useEffect(() => {
    fcmService.requestPermission();
    fcmService.setupListeners(navigationRef);

    if (isAuthenticated && user?.id) {
      fcmService.registerTokenWithBackend(undefined, user.id);
    }

    return () => {
      fcmService.destroy();
    };
  }, [isAuthenticated, user?.id]);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      {isAuthenticated ? (
        <AppNavigator />
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="AuthFlow" component={AnimatedAuthScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};
export default RootNavigator;
