import apiClient from '../api/client';
import { Order, PaginatedResponse } from '../types';
import { DEFAULT_SHOPS } from './shopService';

// ── Incrementing local order ID ──────────────────────────────
let _localOrderId = 1001;

export const defaultOrderBYLGX5: Order = {
  id: 9999,
  order_number: 'ORD-BYLGX5',
  status: 'ready',
  service_type: 'wash_fold',
  items: [
    { id: 1, name: 'Wash & Fold - Jeans', item_name: 'Jeans', service_name: 'Wash & Fold', quantity: 1, price: 100, total: 100 } as any,
    { id: 2, name: 'Wash & Iron - Saree', item_name: 'Saree', service_name: 'Wash & Iron', quantity: 1, price: 150, total: 150 } as any,
  ],
  customer_name: 'Kajal Gajare',
  customer_mobile: '9309386003',
  customer_phone: '9309386003',
  pickup_address: {
    id: 101,
    label: 'Work',
    address_line1: 'OrangBits Software Technologies (India) Pvt. Ltd., Kalat Nagar, Wakad',
    city: 'Pimpri-Chinchwad, Pune',
    state: 'Maharashtra',
    pincode: '411057',
    is_default: true,
  } as any,
  delivery_address: {
    id: 101,
    label: 'Work',
    address_line1: 'OrangBits Software Technologies (India) Pvt. Ltd., Kalat Nagar, Wakad',
    city: 'Pimpri-Chinchwad, Pune',
    state: 'Maharashtra',
    pincode: '411057',
    is_default: true,
  } as any,
  pickup_date: new Date().toISOString().split('T')[0],
  pickup_time: '10:00 AM - 12:00 PM',
  pickup_slot: '10:00 AM - 12:00 PM',
  delivery_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
  notes: 'Time Slot: 10:00 AM - 12:00 PM. Call before arrival',
  payment_method: 'Pay on Delivery (COD)',
  subtotal: 250,
  discount: 0,
  delivery_fee: 20,
  total: 270,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  delivery_boy_name: 'Rahul Sharma',
  delivery_boy_phone: '+91 9876543210',
  assigned_by: 'Laundry Owner (DhobiPro Express)',
  delivery_boy: {
    id: 'db_101',
    name: 'Rahul Sharma',
    phone: '+91 9876543210',
    vehicle_number: 'MH 14 DX 8821',
    vehicle_type: 'Delivery Bike',
    rating: 4.9,
    assigned_by: 'Laundry Owner (DhobiPro Express)',
  } as any,
  shop: {
    id: 1,
    name: 'DhobiPro Express Laundry',
    address: 'Wakad Main Road, Pune',
    rating: 4.8,
    review_count: 142,
    is_open: true,
    services: [],
    phone: '+91 9876543210',
  } as any,
};

export const defaultDeliveredOrder: Order = {
  id: 8888,
  order_number: 'ORD-DLV789',
  status: 'delivered',
  service_type: 'wash_iron',
  items: [
    { id: 1, name: 'Wash & Fold - T-Shirt', item_name: 'T-Shirt', service_name: 'Wash & Fold', quantity: 2, price: 35, total: 70 } as any,
    { id: 2, name: 'Wash & Iron - Trousers', item_name: 'Trousers', service_name: 'Wash & Iron', quantity: 2, price: 50, total: 100 } as any,
    { id: 3, name: 'Wash & Iron - Saree', item_name: 'Saree', service_name: 'Wash & Iron', quantity: 1, price: 150, total: 150 } as any,
  ],
  customer_name: 'Kajal Gajare',
  customer_mobile: '9309386003',
  customer_phone: '9309386003',
  pickup_address: {
    id: 101,
    label: 'Work',
    address_line1: 'OrangBits Software Technologies (India) Pvt. Ltd., Kalat Nagar, Wakad',
    city: 'Pimpri-Chinchwad, Pune',
    state: 'Maharashtra',
    pincode: '411057',
    is_default: true,
  } as any,
  delivery_address: {
    id: 101,
    label: 'Work',
    address_line1: 'OrangBits Software Technologies (India) Pvt. Ltd., Kalat Nagar, Wakad',
    city: 'Pimpri-Chinchwad, Pune',
    state: 'Maharashtra',
    pincode: '411057',
    is_default: true,
  } as any,
  pickup_date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
  pickup_time: '10:00 AM - 12:00 PM',
  pickup_slot: '10:00 AM - 12:00 PM',
  delivery_date: new Date(Date.now() - 3600000 * 4).toISOString().split('T')[0],
  notes: 'Delivered at reception. Please hand over to security if not available.',
  payment_method: 'Pay on Delivery (COD)',
  subtotal: 320,
  discount: 0,
  delivery_fee: 20,
  total: 340,
  created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  updated_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  delivery_boy_name: 'Rahul Sharma',
  delivery_boy_phone: '+91 9876543210',
  assigned_by: 'Laundry Owner (DhobiPro Express)',
  delivery_boy: {
    id: 'db_101',
    name: 'Rahul Sharma',
    phone: '+91 9876543210',
    vehicle_number: 'MH 14 DX 8821',
    vehicle_type: 'DhobiPro Electric Scooter',
    rating: 4.9,
    assigned_by: 'Laundry Owner (DhobiPro Express)',
  } as any,
  shop: {
    id: 1,
    name: 'DhobiPro Express Laundry',
    address: 'Wakad Main Road, Pune',
    rating: 4.8,
    review_count: 142,
    is_open: true,
    services: [],
    phone: '+91 9876543210',
  } as any,
};

const _localOrders: Order[] = [];

function makeMockOrder(data: {
  shop_id?: number;
  shop_name?: string;
  shop?: any;
  shop_address?: string;
  shop_phone?: string;
  service_type: string;
  items: { name: string; quantity: number; price?: number; unit_price?: number; total?: number; total_price?: number; item_name?: string; service_name?: string }[];
  pickup_address_id: number;
  delivery_address_id: number;
  pickup_date: string;
  delivery_date: string;
  pickup_time?: string;
  pickup_slot?: string;
  notes?: string;
  use_wallet?: boolean;
  payment_method?: string;
  total_amount?: number;
  subtotal?: number;
  customer_name?: string;
  customer_mobile?: string;
  pickup_address?: string;
}): Order {
  const id = _localOrderId++;
  const items = data.items.map(i => {
    const itemPrice = i.price || i.unit_price || 50;
    const itemTotal = i.total || i.total_price || (itemPrice * i.quantity);
    let cleanItemName = i.item_name || i.name;
    let cleanServiceName = i.service_name;
    if (i.name && i.name.includes('-')) {
      const parts = i.name.split('-');
      if (!cleanServiceName) cleanServiceName = parts[0].trim();
      if (!i.item_name) cleanItemName = parts[parts.length - 1].trim();
    }
    return {
      name: i.name,
      item_name: cleanItemName,
      service_name: cleanServiceName,
      quantity: i.quantity,
      price: itemPrice,
      unit_price: itemPrice,
      total: itemTotal,
      total_price: itemTotal,
    };
  });
  const subtotal = data.subtotal || items.reduce((s, i) => s + i.total, 0);
  const total = data.total_amount || (subtotal + 20);

  // Dynamically resolve exact selected shop
  let targetShop: any = null;
  if (data.shop && typeof data.shop === 'object') {
    targetShop = data.shop;
  } else if (data.shop_id) {
    targetShop = DEFAULT_SHOPS.find(s => s.id === Number(data.shop_id));
  } else if (data.shop_name) {
    targetShop = DEFAULT_SHOPS.find(s => s.name?.toLowerCase() === String(data.shop_name).toLowerCase());
  }

  const resolvedShopName = targetShop?.name || data.shop_name || 'DhobiPro Express Laundry';
  const resolvedShopAddress = targetShop?.address || data.shop_address || 'Wakad Main Road, Pune';
  const resolvedShopPhone = targetShop?.phone || data.shop_phone || '+91 9876543210';
  const resolvedShopRating = targetShop?.rating || 4.8;
  const resolvedShopReviews = targetShop?.review_count || 142;
  const resolvedShopLogo = targetShop?.logo || null;

  const resolvedShop = {
    id: targetShop?.id || data.shop_id || 1,
    name: resolvedShopName,
    address: resolvedShopAddress,
    rating: resolvedShopRating,
    review_count: resolvedShopReviews,
    phone: resolvedShopPhone,
    logo: resolvedShopLogo,
    is_open: true,
    services: [],
  };

  // Exactly assign the delivery partner appointed by this laundry owner
  const assignedDriver = {
    id: 'db_101',
    name: 'Rahul Sharma',
    phone: '+91 9876543210',
    vehicle_number: 'MH 14 DX 8821',
    vehicle_type: 'Delivery Bike',
    rating: 4.9,
    assigned_by: `Laundry Owner (${resolvedShopName})`,
  };

  const mock: Order = {
    id,
    order_number: `ORD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    status: 'placed',
    service_type: (data.service_type as any) || 'wash_fold',
    items: items as any,
    customer_name: data.customer_name || 'Kajal Gajare',
    customer_mobile: data.customer_mobile || '9309386003',
    customer_phone: data.customer_mobile || '9309386003',
    pickup_address: {
      id: data.pickup_address_id,
      label: 'Home',
      address_line1: data.pickup_address || 'Flat 302, Green Acres, Wakad Main Road',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411057',
      is_default: true,
    } as any,
    delivery_address: {
      id: data.delivery_address_id,
      label: 'Home',
      address_line1: data.pickup_address || 'Flat 302, Green Acres, Wakad Main Road',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411057',
      is_default: true,
    } as any,
    pickup_date: data.pickup_date,
    pickup_time: data.pickup_time || '10:00 AM - 12:00 PM',
    pickup_slot: data.pickup_slot || data.pickup_time || '10:00 AM - 12:00 PM',
    delivery_date: data.delivery_date,
    notes: data.notes || '',
    payment_method: (data.payment_method as any) || 'cash_on_delivery',
    subtotal,
    discount: 0,
    delivery_fee: 20,
    total,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    delivery_boy_name: assignedDriver.name,
    delivery_boy_phone: assignedDriver.phone,
    assigned_by: assignedDriver.assigned_by,
    delivery_boy: assignedDriver as any,
    delivery_partner: assignedDriver as any,
    shop: resolvedShop as any,
  };
  _localOrders.unshift(mock);
  return mock;
}

export const orderService = {
  getOrders: async (page = 1): Promise<Order[]> => {
    try {
      const res = await apiClient.get('/orders', { params: { page }, timeout: 4000 });
      const raw = res.data?.data || res.data;
      const list = Array.isArray(raw) ? raw : (raw?.data || []);
      return list;
    } catch {
      const safeLocalOrders = JSON.parse(JSON.stringify(_localOrders));
      return safeLocalOrders;
    }
  },

  getActiveOrders: async (): Promise<Order[]> => {
    try {
      const res = await apiClient.get('/orders/active', { timeout: 4000 });
      const raw = res.data?.data || res.data;
      const list = Array.isArray(raw) ? raw : (raw?.data || []);
      return list;
    } catch {
      const filtered = _localOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
      return JSON.parse(JSON.stringify(filtered));
    }
  },

  clearLocalOrders: () => {
    _localOrders.length = 0;
  },

  getOrderById: async (id: number | string): Promise<Order> => {
    try {
      const res = await apiClient.get(`/orders/${id}`, { timeout: 4000 });
      const result = res.data?.data || res.data;
      if (result) return result;
    } catch {
      // offline fallback
    }
    const local = _localOrders.find(o => o.id === Number(id) || String(o.id) === String(id) || o.order_number === String(id));
    if (local) return local;
    return defaultOrderBYLGX5;
  },

  createOrder: async (data: {
    shop_id?: number;
    shop_name?: string;
    shop?: any;
    shop_address?: string;
    shop_phone?: string;
    user_id?: number | string;
    customer_name?: string;
    customer_mobile?: string;
    total_amount?: number;
    subtotal?: number;
    pickup_address?: string;
    service_type: string;
    items: { name: string; quantity: number; price?: number; total?: number; item_name?: string; service_name?: string }[];
    pickup_address_id: number;
    delivery_address_id: number;
    pickup_date: string;
    pickup_time?: string;
    pickup_slot?: string;
    delivery_date: string;
    notes?: string;
    use_wallet?: boolean;
    payment_method?: string;
  }): Promise<Order> => {
    try {
      const res = await apiClient.post('/orders', data);
      const order = res.data.data || res.data;
      if (!order || !order.id) throw new Error('Invalid response');
      _localOrders.unshift(order);
      return order;
    } catch (err: any) {
      console.warn('createOrder API failed:', err?.response?.data || err?.message);
      // Network unavailable — create a local mock order so the booking flow continues
      return makeMockOrder(data as any);
    }
  },

  cancelOrder: async (id: number, reason?: string): Promise<Order> => {
    try {
      const res = await apiClient.post(`/orders/${id}/cancel`, { reason });
      return res.data.data;
    } catch {
      const local = _localOrders.find(o => o.id === id);
      if (local) { local.status = 'cancelled'; return local; }
      throw new Error('Order not found');
    }
  },

  rateOrder: async (id: number, rating: number, review?: string): Promise<void> => {
    try {
      await apiClient.post(`/orders/${id}/rate`, { rating, review });
    } catch {
      // Silently ignore rating errors offline
    }
  },

  updateOrderStatus: async (id: number, status: string): Promise<Order> => {
    try {
      const res = await apiClient.patch(`/orders/${id}/status`, { status });
      return res.data.data || res.data;
    } catch {
      const local = _localOrders.find(o => o.id === id);
      if (local) { (local as any).status = status; return local; }
      throw new Error('Order not found');
    }
  },

  confirmDeliveryAvailability: async (id: number | string, isAvailable: boolean, notes?: string): Promise<Order> => {
    try {
      const res = await apiClient.post(`/orders/${id}/confirm-availability`, { is_available: isAvailable, notes });
      return res.data.data || res.data;
    } catch {
      const targetId = Number(id);
      const local = _localOrders.find(o => o.id === targetId || String(o.id) === String(id) || o.order_number === String(id));
      if (local) {
        if (isAvailable) {
          local.status = 'customer_confirmed' as any;
          (local as any).is_customer_available = true;
          (local as any).customer_confirmed_at = new Date().toISOString();
        } else {
          (local as any).is_customer_available = false;
        }
        return local;
      }
      throw new Error('Order not found');
    }
  },
};

