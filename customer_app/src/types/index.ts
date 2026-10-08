// ─────────────────────────────────────────────────────────────
//  Shared TypeScript types for DhobiPro app
// ─────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'placed'
  | 'pending'
  | 'received'
  | 'accepted'
  | 'picked_up'
  | 'in_process'
  | 'washing'
  | 'ironing'
  | 'ready_for_delivery'
  | 'ready'
  | 'customer_confirmed'
  | 'delivery_assigned'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled';




export type ServiceType = 'wash_fold' | 'wash_iron' | 'dry_clean' | 'iron_only' | 'steam_iron' | 'premium';

export type TransactionType = 'credit' | 'debit';

export interface User {
  id: number;
  phone: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  is_phone_verified: boolean;
  wallet_balance: string;
  referral_code?: string;
}

export interface Address {
  id: number;
  label: string; // Home, Work, etc.
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  country?: string;
  pincode: string;
  is_default: boolean;
  latitude?: number;
  longitude?: number;
}

export interface OrderItem {
  id: number;
  name: string;
  item_name?: string;
  service_name?: string;
  quantity: number;
  price: number;
}

export interface DeliveryBoy {
  id?: number | string;
  name?: string;
  phone?: string;
  avatar?: string;
  rating?: number;
  assigned_by?: string;
}

export interface Order {
  id: number;
  order_number: string;
  status: OrderStatus;
  service_type: ServiceType;
  items: OrderItem[];
  pickup_address: Address;
  delivery_address: Address;
  pickup_date: string;
  pickup_time?: string;
  pickup_slot?: string;
  delivery_date: string;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  notes?: string;
  payment_method?: string;
  customer_name?: string;
  customer_mobile?: string;
  customer_phone?: string;
  customer_available?: boolean;
  is_customer_available?: boolean;
  created_at: string;
  updated_at: string;
  shop?: Shop;
  shop_id?: number;
  shop_name?: string;
  owner_name?: string;
  shop_address?: string;
  shop_phone?: string;
  delivery_boy?: DeliveryBoy;
  delivery_partner?: DeliveryBoy;
  delivery_boy_name?: string;
  delivery_boy_phone?: string;
  assigned_by?: string;
  cancellation_reason?: string;
  cancel_reason?: string;
}

export interface Shop {
  id: number;
  name: string;
  owner_name?: string;
  phone?: string;
  logo?: string;
  rating: number;
  review_count: number;
  distance?: string;
  address: string;
  is_open: boolean;
  services: ServicePrice[];
}

export interface ServicePrice {
  service_type: ServiceType;
  name: string;
  price_per_kg?: number;
  price_per_piece?: number;
}

export interface WalletTransaction {
  id: number;
  type: TransactionType;
  amount: number;
  description: string;
  reference?: string;
  created_at: string;
}

export interface Wallet {
  balance: number;
  currency: string;
}

export interface Notification {
  id: number;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  data?: Record<string, any>;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
