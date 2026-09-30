import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Screens
import { HomeScreen } from '../screens/home/HomeScreen';
import OrdersScreen from '../screens/orders/OrdersScreen';
import NearByScreen from '../screens/nearby/NearByScreen';
import WalletScreen from '../screens/wallet/WalletScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import BookingScreen from '../screens/booking/BookingScreen';
import OrderDetailScreen from '../screens/orders/OrderDetailScreen';
import MapScreen from '../screens/map/MapScreen';
import TrackingScreen from '../screens/tracking/TrackingScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import SearchScreen from '../screens/search/SearchScreen';
import ShopDetailScreen from '../screens/shop/ShopDetailScreen';
import ReelsScreen from '../screens/reels/ReelsScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { SavedAddressesScreen } from '../screens/profile/SavedAddressesScreen';
import { CustomTabBar } from './CustomTabBar';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ── Tabs order: Orders, Near By, Home, Video, Profile (Home is initial screen) ──
const MainTabs = () => {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Orders"     component={OrdersScreen} />
      <Tab.Screen name="NearByTab"  component={NearByScreen} />
      <Tab.Screen name="HomeTab"    component={HomeScreen} />
      <Tab.Screen name="Reels"      component={ReelsScreen} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs"       component={MainTabs} />
      <Stack.Screen name="Booking"        component={BookingScreen} />
      <Stack.Screen name="OrderDetail"    component={OrderDetailScreen} />
      <Stack.Screen name="Tracking"       component={TrackingScreen} />
      <Stack.Screen name="Notifications"  component={NotificationsScreen} />
      <Stack.Screen name="Search"         component={SearchScreen} />
      <Stack.Screen name="ShopDetail"     component={ShopDetailScreen} />
      <Stack.Screen name="Wallet"         component={WalletScreen} />
      <Stack.Screen name="EditProfile"    component={EditProfileScreen} />
      <Stack.Screen name="SavedAddresses" component={SavedAddressesScreen} />
      <Stack.Screen name="MapScreen"      component={MapScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
