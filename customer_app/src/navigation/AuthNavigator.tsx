import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PhoneInputScreen from '../screens/auth/PhoneInputScreen';
import OtpVerifyScreen from '../screens/auth/OtpVerifyScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';

const Stack = createStackNavigator();

export const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="PhoneInput" component={PhoneInputScreen} />
      <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
    </Stack.Navigator>
  );
};
export default AuthNavigator;
