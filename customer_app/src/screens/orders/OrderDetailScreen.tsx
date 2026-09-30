import React from 'react';
import TrackingScreen from '../tracking/TrackingScreen';

/**
 * OrderDetailScreen now directly renders the unified TrackingScreen
 * which includes Laundry Shop info, Order Status timeline, Customer Address,
 * Order Items & Prices, Notes, Payment Summary, and Action Buttons.
 */
export const OrderDetailScreen = (props: any) => {
  return <TrackingScreen {...props} />;
};

export default OrderDetailScreen;
