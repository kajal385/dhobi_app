import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { DeliveryBoyDashboardScreen } from '../screens/deliveryBoy/DeliveryBoyDashboardScreen';
import { AssignedOrdersScreen } from '../screens/deliveryBoy/AssignedOrdersScreen';
import { PickupVerificationScreen } from '../screens/deliveryBoy/PickupVerificationScreen';
import { DeliveryVerificationScreen } from '../screens/deliveryBoy/DeliveryVerificationScreen';
import { DeliveryProfileScreen } from '../screens/deliveryBoy/DeliveryProfileScreen';
import { COLORS } from '../theme';

import { DeliveryTabBar } from './DeliveryTabBar';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const DeliveryBoyTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <DeliveryTabBar {...props} />}
    >
      <Tab.Screen name="Dashboard" component={DeliveryBoyDashboardScreen} />
      <Tab.Screen name="Assigned" component={AssignedOrdersScreen} />
      <Tab.Screen name="Profile" component={DeliveryProfileScreen} />
    </Tab.Navigator>
  );
};

export const DeliveryBoyNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DeliveryTabs" component={DeliveryBoyTabNavigator} />
      <Stack.Screen name="PickupVerification" component={PickupVerificationScreen} />
      <Stack.Screen name="DeliveryVerification" component={DeliveryVerificationScreen} />
    </Stack.Navigator>
  );
};
