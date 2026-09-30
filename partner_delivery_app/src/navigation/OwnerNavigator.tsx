import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { OwnerDashboardScreen } from '../screens/owner/OwnerDashboardScreen';
import { OrderManagementScreen } from '../screens/owner/OrderManagementScreen';
import { ServiceManagementScreen } from '../screens/owner/ServiceManagementScreen';
import { DeliveryBoyManagementScreen } from '../screens/owner/DeliveryBoyManagementScreen';
import { CustomerManagementScreen } from '../screens/owner/CustomerManagementScreen';
import { PromotionsScreen } from '../screens/owner/PromotionsScreen';
import { RevenueDashboardScreen } from '../screens/owner/RevenueDashboardScreen';
import { ReviewsAndMediaScreen } from '../screens/owner/ReviewsAndMediaScreen';
import { ProfileSettingsScreen } from '../screens/owner/ProfileSettingsScreen';
import { NewOrderStep1Screen } from '../screens/owner/NewOrderStep1Screen';
import { NewOrderStep2Screen } from '../screens/owner/NewOrderStep2Screen';
import { OrderDetailScreen } from '../screens/owner/OrderDetailScreen';
import { COLORS } from '../theme';

import { OwnerTabBar } from './OwnerTabBar';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const OwnerTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <OwnerTabBar {...props} />}
    >
      <Tab.Screen name="Dashboard" component={OwnerDashboardScreen} />
      <Tab.Screen name="Orders" component={OrderManagementScreen} />
      <Tab.Screen name="Services" component={ServiceManagementScreen} />
      <Tab.Screen name="Team" component={DeliveryBoyManagementScreen} />
      <Tab.Screen name="Settings" component={ProfileSettingsScreen} />
    </Tab.Navigator>
  );
};

export const OwnerNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OwnerTabs" component={OwnerTabNavigator} />
      <Stack.Screen name="NewOrderStep1" component={NewOrderStep1Screen} />
      <Stack.Screen name="NewOrderStep2" component={NewOrderStep2Screen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="Customers" component={CustomerManagementScreen} />
      <Stack.Screen name="Promotions" component={PromotionsScreen} />
      <Stack.Screen name="RevenueDashboard" component={RevenueDashboardScreen} />
      <Stack.Screen name="ReviewsAndMedia" component={ReviewsAndMediaScreen} />
      <Stack.Screen name="DeliveryBoys" component={DeliveryBoyManagementScreen} />
    </Stack.Navigator>
  );
};
