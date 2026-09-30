import React, { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import AppNavigator from './AppNavigator';
import SplashScreen from '../screens/auth/SplashScreen';
import AnimatedAuthScreen from '../screens/auth/AnimatedAuthScreen';

const Stack = createStackNavigator();

export const RootNavigator = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
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
