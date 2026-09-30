// mockDataStore.ts - Shared Data & Analytics Store for Laundry Partner App
import { apiClient } from './apiClient';

export interface Society {
  id: string;
  name: string;
  orderCount: number;
  towers: {
    name: string;
    flats: {
      flatNo: string;
      customerName?: string;
      mobile?: string;
    }[];
  }[];
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  societyName: string;
  tower: string;
  flat: string;
  address: string;
  previousServices?: string[];
  preferredDeliveryType?: 'Self Pickup' | 'Home Delivery';
  preferredPaymentMethod?: 'UPI' | 'Cash' | 'Bank' | 'Partial' | 'Paid' | 'POD' | 'Unpaid';
  totalOrdersCount: number;
  lastOrderDate?: string;
  notes?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  category: 'Wash & Fold' | 'Wash & Iron' | 'Dry Cleaning' | 'Steam Press' | 'Shoe Care';
  unit: 'Piece' | 'KG';
  price: number;
  expressPriceMultiplier: number;
  isPopular?: boolean;
}

export interface OrderItem {
  serviceId: string;
  serviceName: string;
  qty: number;
  unit: 'Piece' | 'KG';
  pricePerUnit: number;
  totalPrice: number;
}

export interface ManualOrder {
  id: string;
  customerName: string;
  mobile: string;
  societyName: string;
  tower?: string;
  flat?: string;
  address: string;
  items: OrderItem[];
  subtotal?: number;
  discountAmount?: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: 'UPI' | 'Cash' | 'Bank' | 'Partial' | 'Paid' | 'POD' | 'Unpaid';
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid';
  deliveryType: 'Self Pickup' | 'Home Delivery';
  deliveryBoy?: string | null;
  dueDate: string;
  dueTime: string;
  isUrgent: boolean;
  expressSLA?: boolean;
  notes?: string;
  status:
    | 'Placed'
    | 'Received'
    | 'In-Process'
    | 'Ready for Delivery'
    | 'Customer Confirmed'
    | 'Delivery Assigned'
    | 'Out for Delivery'
    | 'Delivered'
    | 'Processing'
    | 'Ready'
    | 'Out For Delivery'
    | 'Completed'
    | 'Cancelled';
  createdAt: string;
  timeline: {
    status: string;
    timestamp: string;
    note?: string;
  }[];
}

export interface DeliveryBoyRecord {
  id: string;
  shopId?: string | number;   // Which laundry shop this delivery boy belongs to
  name: string;
  phone: string;
  password?: string;
  email?: string;
  vehicle: string;
  dlNumber: string;
  status: 'Online' | 'Offline';
  completedTasks: number;
  rating: string;
  documents: string;
  city?: string;
  accountStatus?: 'ACTIVE' | 'SUSPENDED';
  createdAt?: string;
}

// Default Mock Data
const INITIAL_SOCIETIES: Society[] = [
  {
    id: 'soc_1',
    name: 'Green Valley Homes',
    orderCount: 120, // Highest -> Most Used
    towers: [
      {
        name: 'Tower A',
        flats: [
          { flatNo: 'A-101', customerName: 'Rohan Mehta', mobile: '9876512345' },
          { flatNo: 'A-102', customerName: 'Kavita Roy', mobile: '9876523456' },
          { flatNo: 'A-203', customerName: 'Ajit Sharma', mobile: '9876543210' },
        ],
      },
      {
        name: 'Tower B',
        flats: [
          { flatNo: 'B-101', customerName: 'Sunita Rao', mobile: '9876534567' },
          { flatNo: 'B-202', customerName: 'Manoj Joshi', mobile: '9876545678' },
        ],
      },
    ],
  },
  {
    id: 'soc_2',
    name: 'Sun Residency',
    orderCount: 75,
    towers: [
      {
        name: 'Block 1',
        flats: [
          { flatNo: '101', customerName: 'Priya Patel', mobile: '9812322222' },
          { flatNo: '202', customerName: 'Vikram Shinde', mobile: '9812333333' },
        ],
      },
    ],
  },
  {
    id: 'soc_3',
    name: 'Royal Heights',
    orderCount: 40,
    towers: [
      {
        name: 'Wing C',
        flats: [
          { flatNo: 'C-301', customerName: 'Deepak Verma', mobile: '9900011122' },
        ],
      },
    ],
  },
];

const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust_1',
    name: 'Ajit Sharma',
    mobile: '9876543210',
    email: 'ajit.sharma@example.com',
    societyName: 'Green Valley Homes',
    tower: 'Tower A',
    flat: 'A-203',
    address: 'Flat A-203, Tower A, Green Valley Homes, Sector 4, Pune',
    previousServices: ['Wash + Iron', 'Dry Cleaning'],
    preferredDeliveryType: 'Home Delivery',
    preferredPaymentMethod: 'Paid',
    totalOrdersCount: 14,
    lastOrderDate: '2026-08-28',
    notes: 'Prefers mild detergent.',
  },
  {
    id: 'cust_2',
    name: 'Priya Patel',
    mobile: '9812322222',
    societyName: 'Sun Residency',
    tower: 'Block 1',
    flat: '101',
    address: 'Flat 101, Block 1, Sun Residency, Sector 9, Pune',
    previousServices: ['Steam Press'],
    preferredDeliveryType: 'Self Pickup',
    preferredPaymentMethod: 'POD',
    totalOrdersCount: 8,
    lastOrderDate: '2026-08-30',
  },
];

const INITIAL_SERVICES: ServiceItem[] = [
  { id: 'srv_1', name: 'Wash & Fold', category: 'Wash & Fold', unit: 'KG', price: 60, expressPriceMultiplier: 1.5, isPopular: true },
  { id: 'srv_2', name: 'Wash & Iron', category: 'Wash & Iron', unit: 'KG', price: 90, expressPriceMultiplier: 1.5, isPopular: true },
  { id: 'srv_3', name: 'Dry Cleaning (Suits / Blazers)', category: 'Dry Cleaning', unit: 'Piece', price: 350, expressPriceMultiplier: 1.4, isPopular: true },
  { id: 'srv_4', name: 'Steam Press (Shirts / Pants)', category: 'Steam Press', unit: 'Piece', price: 25, expressPriceMultiplier: 1.5, isPopular: true },
  { id: 'srv_5', name: 'Shoe Deep Cleaning', category: 'Shoe Care', unit: 'Piece', price: 290, expressPriceMultiplier: 1.3 },
];

const INITIAL_ORDERS: ManualOrder[] = [
  {
    id: 'ORD-501',
    customerName: 'Amitabh Sharma',
    mobile: '9876543210',
    societyName: 'Green Valley Homes',
    tower: 'Tower A',
    flat: 'A-101',
    address: 'A-101, Tower A, Green Valley Homes, Pune',
    items: [
      { serviceId: 'srv_3', serviceName: 'Dry Cleaning (Suits)', qty: 2, unit: 'Piece', pricePerUnit: 350, totalPrice: 700 },
      { serviceId: 'srv_1', serviceName: 'Wash & Fold', qty: 5, unit: 'KG', pricePerUnit: 60, totalPrice: 300 },
    ],
    totalAmount: 1000,
    paidAmount: 1000,
    remainingAmount: 0,
    paymentMethod: 'Paid',
    paymentStatus: 'Paid',
    deliveryType: 'Home Delivery',
    dueDate: 'Today, 05:00 PM',
    dueTime: 'Evening',
    isUrgent: false,
    expressSLA: false,
    status: 'Received',
    createdAt: '2026-09-07 09:30 AM',
    timeline: [
      { status: 'Received', timestamp: '2026-09-07 09:30 AM', note: 'Order booked by customer' },
    ],
  },
  {
    id: 'ORD-BYLGX5',
    customerName: 'Kajal Gajare',
    mobile: '9309386003',
    societyName: 'OrangBits Software',
    tower: 'Block A',
    flat: '101',
    address: 'OrangBits Software Technologies (India) Pvt. Ltd., Kalat Nagar, Wakad, Pimpri-Chinchwad, Maharashtra 411057, India',
    items: [
      { serviceId: 'srv_1', serviceName: 'Wash & Fold - Jeans', qty: 1, unit: 'Piece', pricePerUnit: 100, totalPrice: 100 },
      { serviceId: 'srv_2', serviceName: 'Wash & Iron - Saree', qty: 1, unit: 'Piece', pricePerUnit: 150, totalPrice: 150 },
    ],
    totalAmount: 270,
    paidAmount: 0,
    remainingAmount: 270,
    paymentMethod: 'Unpaid',
    paymentStatus: 'Unpaid',
    deliveryType: 'Home Delivery',
    dueDate: 'Today, 06:00 PM',
    dueTime: 'Evening',
    isUrgent: false,
    expressSLA: false,
    status: 'Ready',
    createdAt: new Date().toISOString(),
    timeline: [
      { status: 'Received', timestamp: 'Today', note: 'Booked online by customer' },
    ],
  },
  {
    id: 'ORD-HOGZ5T',
    customerName: 'Customer',
    mobile: '9876543210',
    societyName: 'Shivaji Nagar',
    tower: 'Building 12',
    flat: '202',
    address: '12, Shivaji Nagar, Near City Mall, Pune',
    items: [
      { serviceId: 'srv_2', serviceName: 'Wash & Iron - Kurta', qty: 1, unit: 'Piece', pricePerUnit: 260, totalPrice: 260 },
    ],
    totalAmount: 260,
    paidAmount: 0,
    remainingAmount: 260,
    paymentMethod: 'Unpaid',
    paymentStatus: 'Unpaid',
    deliveryType: 'Home Delivery',
    dueDate: 'Today, 07:00 PM',
    dueTime: 'Evening',
    isUrgent: false,
    expressSLA: false,
    status: 'Ready',
    createdAt: new Date().toISOString(),
    timeline: [
      { status: 'Received', timestamp: 'Today', note: 'Booked online' },
    ],
  },
  {
    id: 'ORD-502',
    customerName: 'Pooja Verma',
    mobile: '9812345678',
    societyName: 'Sun Residency',
    tower: 'Block 1',
    flat: '101',
    address: 'Flat 101, Block 1, Sun Residency, Sector 9, Pune',
    items: [
      { serviceId: 'srv_4', serviceName: 'Steam Press (Shirts)', qty: 10, unit: 'Piece', pricePerUnit: 25, totalPrice: 250 },
    ],
    totalAmount: 250,
    paidAmount: 100,
    remainingAmount: 150,
    paymentMethod: 'Partial',
    paymentStatus: 'Partial',
    deliveryType: 'Home Delivery',
    dueDate: 'Today, 06:30 PM',
    dueTime: 'Evening',
    isUrgent: false,
    expressSLA: false,
    status: 'Processing',
    createdAt: '2026-09-07 10:15 AM',
    timeline: [
      { status: 'Received', timestamp: '2026-09-07 10:15 AM', note: 'Order booked by customer' },
      { status: 'Processing', timestamp: '2026-09-07 10:45 AM', note: 'Washing & Pressing' },
    ],
  },
  {
    id: 'ORD-503',
    customerName: 'Suresh Patel',
    mobile: '9988776655',
    societyName: 'Cypress Hills',
    tower: 'Tower C',
    flat: 'C-302',
    address: '88 MG Road, Camp, Pune',
    items: [
      { serviceId: 'srv_3', serviceName: 'Blanket Heavy Wash', qty: 1, unit: 'Piece', pricePerUnit: 450, totalPrice: 450 },
    ],
    totalAmount: 450,
    paidAmount: 0,
    remainingAmount: 450,
    paymentMethod: 'POD',
    paymentStatus: 'Unpaid',
    deliveryType: 'Home Delivery',
    dueDate: 'Today, 04:00 PM',
    dueTime: 'Afternoon',
    isUrgent: false,
    expressSLA: false,
    status: 'Ready',
    createdAt: '2026-09-07 11:00 AM',
    timeline: [
      { status: 'Received', timestamp: '2026-09-07 11:00 AM', note: 'Order booked by customer' },
      { status: 'Ready', timestamp: '2026-09-07 01:00 PM', note: 'Ready for delivery' },
    ],
  },
  {
    id: 'ORD-504',
    customerName: 'Neha Gupta',
    mobile: '9776655443',
    societyName: 'Green Valley Homes',
    tower: 'Tower B',
    flat: 'B-204',
    address: 'B-204, Tower B, Green Valley Homes, Pune',
    items: [
      { serviceId: 'srv_1', serviceName: 'Premium Wash & Fold', qty: 4, unit: 'KG', pricePerUnit: 130, totalPrice: 520 },
    ],
    totalAmount: 520,
    paidAmount: 520,
    remainingAmount: 0,
    paymentMethod: 'Paid',
    paymentStatus: 'Paid',
    deliveryType: 'Self Pickup',
    deliveryBoy: 'Sanket More',
    dueDate: 'Today, 02:00 PM',
    dueTime: 'Afternoon',
    isUrgent: false,
    expressSLA: false,
    status: 'Out For Delivery',
    createdAt: '2026-09-07 08:30 AM',
    timeline: [
      { status: 'Received', timestamp: '2026-09-07 08:30 AM', note: 'Order logged' },
      { status: 'Out For Delivery', timestamp: '2026-09-07 11:30 AM', note: 'Out with rider' },
    ],
  },
  {
    id: 'ORD-505',
    customerName: 'Kajal Gajare',
    mobile: '9309386003',
    societyName: 'Green Valley Homes',
    tower: 'Tower A',
    flat: 'A-101',
    address: 'Flat A-101, Tower A, Green Valley Homes',
    items: [
      { serviceId: 'srv_2', serviceName: 'Wash & Iron', qty: 1, unit: 'KG', pricePerUnit: 90, totalPrice: 90 },
      { serviceId: 'srv_1', serviceName: 'Wash & Fold', qty: 1, unit: 'KG', pricePerUnit: 60, totalPrice: 60 },
      { serviceId: 'srv_3', serviceName: 'Dry Cleaning (Suits / Blazers)', qty: 1, unit: 'Piece', pricePerUnit: 350, totalPrice: 350 },
    ],
    totalAmount: 500,
    paidAmount: 0,
    remainingAmount: 500,
    paymentMethod: 'POD',
    paymentStatus: 'Unpaid',
    deliveryType: 'Self Pickup',
    dueDate: 'Today, 07:00 PM',
    dueTime: 'Evening',
    isUrgent: true,
    expressSLA: true,
    status: 'Received',
    createdAt: '2026-09-07 12:10 PM',
    timeline: [
      { status: 'Received', timestamp: '2026-09-07 12:10 PM', note: 'Urgent order booked by customer' },
    ],
  },
  {
    id: 'ORD-506',
    customerName: 'Rohan Mehta',
    mobile: '9876512345',
    societyName: 'Sun Residency',
    tower: 'Block 2',
    flat: '202',
    address: 'Flat 202, Block 2, Sun Residency, Pune',
    items: [
      { serviceId: 'srv_5', serviceName: 'Shoe Deep Cleaning', qty: 2, unit: 'Piece', pricePerUnit: 290, totalPrice: 580 },
    ],
    totalAmount: 580,
    paidAmount: 580,
    remainingAmount: 0,
    paymentMethod: 'Paid',
    paymentStatus: 'Paid',
    deliveryType: 'Home Delivery',
    dueDate: 'Today, 01:00 PM',
    dueTime: 'Afternoon',
    isUrgent: false,
    expressSLA: false,
    status: 'Completed',
    createdAt: '2026-09-07 07:45 AM',
    timeline: [
      { status: 'Received', timestamp: '2026-09-07 07:45 AM', note: 'Order booked' },
      { status: 'Completed', timestamp: '2026-09-07 01:00 PM', note: 'Order delivered to customer' },
    ],
  },
];

class MockDataStore {
  private societies: Society[] = [...INITIAL_SOCIETIES];
  private customers: Customer[] = [...INITIAL_CUSTOMERS];
  private services: ServiceItem[] = [...INITIAL_SERVICES];
  private orders: ManualOrder[] = [...INITIAL_ORDERS];
  private listeners: (() => void)[] = [];
  private taskOverrides: { [taskId: string]: string } = {};

  constructor() {
    this.fetchDatabaseOrders();
  }

  async fetchDatabaseOrders() {
    try {
      const res = await apiClient.get('/owner/orders?shop_id=1');
      if (res.data && res.data.data && Array.isArray(res.data.data)) {
        const dbOrders: ManualOrder[] = res.data.data.map((item: any) => ({
          id: item.order_number || `ORD-${item.id}`,
          customerName: item.customer?.name || item.customer_name || 'Walk-in Customer',
          mobile: item.customer?.phone || item.mobile || '9876543210',
          societyName: item.society_name || item.pickup_address || 'Green Valley Homes',
          tower: item.tower || 'Tower A',
          flat: item.flat || 'A-101',
          address: item.pickup_address || item.delivery_address || 'Customer Address',
          items:
            Array.isArray(item.items) && item.items.length > 0
              ? item.items.map((i: any) => ({
                  serviceId: 'srv_1',
                  serviceName: i.service_name || i.item_name || 'Laundry Service',
                  qty: parseFloat(i.quantity) || 1,
                  unit: 'Piece',
                  pricePerUnit: parseFloat(i.unit_price) || 50,
                  totalPrice: parseFloat(i.total_price) || 50,
                }))
              : [
                  {
                    serviceId: 'srv_1',
                    serviceName: 'Laundry Service',
                    qty: 1,
                    unit: 'Piece',
                    pricePerUnit: parseFloat(item.total_amount) || 100,
                    totalPrice: parseFloat(item.total_amount) || 100,
                  },
                ],
          totalAmount: parseFloat(item.total_amount) || 0,
          paidAmount: parseFloat(item.paid_amount) || parseFloat(item.total_amount) || 0,
          remainingAmount: parseFloat(item.remaining_amount) || 0,
          paymentMethod: item.payment_method ? (item.payment_method.toUpperCase() as any) : 'UPI',
          paymentStatus: item.payment_status ? (item.payment_status === 'paid' ? 'Paid' : 'Unpaid') : 'Paid',
          deliveryType: item.delivery_type || 'Home Delivery',
          dueDate: item.pickup_date || 'Today',
          dueTime: item.pickup_time_label || 'Evening',
          isUrgent: !!item.is_express,
          expressSLA: !!item.is_express,
          notes: item.special_instructions || item.notes || '',
          status:
            item.status === 'PLACED' || item.status === 'RECEIVED'
              ? 'Received'
              : item.status === 'DELIVERED' || item.status === 'COMPLETED'
              ? 'Completed'
              : 'Processing',
          createdAt: item.created_at || new Date().toISOString(),
          timeline: [
            {
              status: item.status || 'Received',
              timestamp: item.created_at || new Date().toLocaleString(),
              note: 'Order synced from MySQL Database (dhobi_db)',
            },
          ],
        }));

        dbOrders.forEach((dbOrd) => {
          if (!this.orders.some((o) => o.id === dbOrd.id)) {
            this.orders.unshift(dbOrd);
          }
        });

        this.notify();
      }
    } catch (err) {
      console.log('ℹ️ Note fetching database orders:', err);
    }
  }

  // NOTE: Mock delivery boys carry shopId so each laundry only shows their own
  // In production these come from the backend filtered by shop_id
  private deliveryBoys: DeliveryBoyRecord[] = [
    {
      id: 'DB-1',
      name: 'Sanket More',
      phone: '9876543210',
      vehicle: 'Hero Splendor (MH12-AB-1234)',
      dlNumber: 'MH12-2024-00192',
      documents: 'Verified',
      status: 'Online',
      completedTasks: 12,
      rating: '4.9 ⭐',
      city: 'Pune',
      accountStatus: 'ACTIVE',
      createdAt: '2026-09-01',
    },
    {
      id: 'DB-2',
      name: 'Rahul Sharma',
      phone: '9812345678',
      vehicle: 'Honda Activa (MH12-CD-5678)',
      dlNumber: 'MH12-2024-00441',
      documents: 'Verified',
      status: 'Online',
      completedTasks: 8,
      rating: '4.8 ⭐',
      city: 'Pune',
      accountStatus: 'ACTIVE',
      createdAt: '2026-09-02',
    },
  ];

  private currentDeliveryBoyId: string = 'DB-1';

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // Delivery Boys Management — filtered to current shop only
  getDeliveryBoys(shopId?: string | number): DeliveryBoyRecord[] {
    if (shopId) {
      return this.deliveryBoys.filter(
        (b) => b.shopId === shopId || String(b.shopId) === String(shopId)
      );
    }
    return this.deliveryBoys;
  }

  getCurrentDeliveryBoy(): DeliveryBoyRecord {
    return (
      this.deliveryBoys.find((b) => b.id === this.currentDeliveryBoyId) || this.deliveryBoys[0]
    );
  }

  setCurrentDeliveryBoy(idOrPhone: string) {
    const found = this.deliveryBoys.find(
      (b) => b.id === idOrPhone || b.phone === idOrPhone || b.name === idOrPhone
    );
    if (found) {
      this.currentDeliveryBoyId = found.id;
      this.notify();
    }
  }

  saveDeliveryBoy(boyData: Partial<DeliveryBoyRecord>): DeliveryBoyRecord {
    const existingIndex = this.deliveryBoys.findIndex(
      (b) => (boyData.id && b.id === boyData.id) || (boyData.phone && b.phone === boyData.phone)
    );

    if (existingIndex >= 0) {
      const updated = { ...this.deliveryBoys[existingIndex], ...boyData };
      this.deliveryBoys[existingIndex] = updated;
      this.notify();
      return updated;
    } else {
      const newBoy: DeliveryBoyRecord = {
        id: `DB-${Date.now()}`,
        shopId: boyData.shopId,           // ← tie to this laundry's shop
        name: boyData.name || 'New Executive',
        phone: boyData.phone || '',
        password: boyData.password || '123456',
        vehicle: boyData.vehicle || 'Standard Two Wheeler',
        dlNumber: boyData.dlNumber || 'DL-PENDING',
        status: 'Offline',
        completedTasks: 0,
        rating: 'New ⭐',
        documents: boyData.dlNumber ? 'DL Uploaded' : 'Pending Verification',
        city: boyData.city || 'Pune',
        accountStatus: 'ACTIVE',
        createdAt: new Date().toISOString().split('T')[0],
      };
      this.deliveryBoys.push(newBoy);
      this.notify();
      return newBoy;
    }
  }

  // Societies with Dynamic Most Used calculation
  getSocieties(): Society[] {
    return [...this.societies].sort((a, b) => b.orderCount - a.orderCount);
  }

  getMostUsedSociety(): Society | null {
    const sorted = this.getSocieties();
    return sorted.length > 0 ? sorted[0] : null;
  }

  // Customers
  getCustomers(): Customer[] {
    return this.customers;
  }

  findCustomer(societyName: string, tower: string, flat: string, customerName?: string): Customer | null {
    return (
      this.customers.find((c) => {
        const matchesLocation =
          c.societyName.toLowerCase() === societyName.toLowerCase() &&
          c.tower.toLowerCase() === tower.toLowerCase() &&
          c.flat.toLowerCase() === flat.toLowerCase();
        if (customerName) {
          return matchesLocation && c.name.toLowerCase() === customerName.toLowerCase();
        }
        return matchesLocation;
      }) || null
    );
  }

  saveCustomer(newCust: Partial<Customer>): Customer {
    const existingIndex = this.customers.findIndex(
      (c) =>
        c.societyName === newCust.societyName &&
        c.tower === newCust.tower &&
        c.flat === newCust.flat &&
        c.name === newCust.name
    );

    if (existingIndex >= 0) {
      const updated = { ...this.customers[existingIndex], ...newCust };
      this.customers[existingIndex] = updated;
      this.notify();
      return updated;
    } else {
      const created: Customer = {
        id: `cust_${Date.now()}`,
        name: newCust.name || 'Walk-in Customer',
        mobile: newCust.mobile || '',
        societyName: newCust.societyName || '',
        tower: newCust.tower || '',
        flat: newCust.flat || '',
        address: newCust.address || `${newCust.flat}, ${newCust.tower}, ${newCust.societyName}`,
        previousServices: newCust.previousServices || [],
        preferredDeliveryType: newCust.preferredDeliveryType || 'Home Delivery',
        preferredPaymentMethod: newCust.preferredPaymentMethod || 'Paid',
        totalOrdersCount: 1,
        lastOrderDate: new Date().toISOString().split('T')[0],
        notes: newCust.notes,
      };
      this.customers.push(created);
      this.notify();
      return created;
    }
  }

  // Services
  getServices(): ServiceItem[] {
    return this.services;
  }

  getRecommendedServicesForSociety(societyName: string): ServiceItem[] {
    // Dynamic logic based on customer previous services in that society
    const societyCustomers = this.customers.filter((c) => c.societyName === societyName);
    const previousServices = societyCustomers.flatMap((c) => c.previousServices || []);
    if (previousServices.includes('Wash + Iron') || previousServices.includes('Wash & Iron')) {
      return this.services.filter((s) => s.name.includes('Wash & Iron') || s.name.includes('Dry Cleaning'));
    }
    return this.services.filter((s) => s.isPopular);
  }

  // Orders: Urgent orders sorted first, followed by date priority (latest created first)
  getOrders(): ManualOrder[] {
    return [...this.orders].sort((a, b) => {
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;

      const timeA = new Date(a.createdAt || '').getTime() || 0;
      const timeB = new Date(b.createdAt || '').getTime() || 0;
      return timeB - timeA;
    });
  }

  getOrderById(id: string): ManualOrder | undefined {
    return this.orders.find((o) => o.id === id);
  }

  createOrder(orderData: Omit<ManualOrder, 'id' | 'createdAt' | 'status' | 'timeline'>, shopId?: number | string): ManualOrder {
    const nextNum = 500 + this.orders.length + 1;
    const orderId = `ORD-${nextNum}`;
    const now = new Date();
    const timestampStr = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const newOrder: ManualOrder = {
      ...orderData,
      id: orderId,
      status: 'Received',
      createdAt: timestampStr,
      timeline: [
        {
          status: 'Received',
          timestamp: timestampStr,
          note: 'Walk-in / Manual Order created by Partner',
        },
      ],
    };

    this.orders.unshift(newOrder);

    // Increment Society order count dynamically
    const targetSociety = this.societies.find(
      (s) => s.name.toLowerCase() === orderData.societyName.toLowerCase()
    );
    if (targetSociety) {
      targetSociety.orderCount += 1;
    } else {
      this.societies.push({
        id: `soc_${Date.now()}`,
        name: orderData.societyName,
        orderCount: 1,
        towers: [
          {
            name: orderData.tower || '',
            flats: [{ flatNo: orderData.flat || '', customerName: orderData.customerName, mobile: orderData.mobile }],
          },
        ],
      });
    }

    // Save or Update Customer History
    this.saveCustomer({
      name: orderData.customerName,
      mobile: orderData.mobile,
      societyName: orderData.societyName,
      tower: orderData.tower || '',
      flat: orderData.flat || '',
      address: orderData.address,
      preferredDeliveryType: orderData.deliveryType,
      preferredPaymentMethod: orderData.paymentMethod,
    });

    // Async DB Persistence to MySQL (dhobi_db) via Laravel REST API
    apiClient
      .post('/orders', {
        shop_id: shopId ? Number(shopId) : 1,
        customer_name: orderData.customerName,
        customer_mobile: orderData.mobile,
        society_name: orderData.societyName,
        tower: orderData.tower,
        flat: orderData.flat,
        pickup_address: orderData.address,
        delivery_address: orderData.address,
        total_amount: orderData.totalAmount,
        subtotal: orderData.totalAmount,
        paid_amount: orderData.paidAmount,
        remaining_amount: orderData.remainingAmount,
        payment_method: (orderData.paymentMethod || 'cod').toLowerCase(),
        payment_status: (orderData.paymentStatus || 'pending').toLowerCase(),
        delivery_type: orderData.deliveryType,
        due_date: orderData.dueDate,
        due_time: orderData.dueTime,
        is_urgent: orderData.isUrgent,
        express_sla: orderData.expressSLA,
        notes: orderData.notes,
        items: orderData.items.map((i) => ({
          name: i.serviceName,
          quantity: i.qty,
          unit_price: i.pricePerUnit,
          total_price: i.totalPrice,
        })),
      })
      .then((res) => {
        console.log('✅ Walk-in order persisted in MySQL database (dhobi_db):', res.data);
      })
      .catch((err) => {
        console.log('ℹ️ API Walk-in Order persistence note:', err?.message || err);
      });

    this.notify();
    return newOrder;
  }

  assignDeliveryBoy(orderId: string, deliveryBoyName: string) {
    const order = this.orders.find((o) => o.id === orderId || o.id === `ORD-${orderId}`);
    if (order) {
      order.deliveryBoy = deliveryBoyName;
      if (order.status === 'Received' || order.status === 'Processing') {
        order.status = 'Ready';
      }
      const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      order.timeline.push({
        status: 'Out For Delivery',
        timestamp: timestampStr,
        note: `Assigned to delivery partner ${deliveryBoyName}`,
      });
      this.notify();
    }
  }

  getTaskStatus(taskId: string, defaultStatus: string): string {
    return this.taskOverrides[taskId] || defaultStatus;
  }

  updateOrderStatus(orderId: string, newStatus: ManualOrder['status'], note?: string, cancellationReason?: string) {
    const order = this.orders.find((o) => o.id === orderId);
    if (order) {
      order.status = newStatus;
      if (cancellationReason || newStatus === 'Cancelled') {
        (order as any).cancellation_reason = cancellationReason || note || 'Cancelled by laundry shop';
      }
      if (newStatus === 'Completed') {
        order.paymentStatus = 'Paid';
        order.paidAmount = order.totalAmount;
        order.remainingAmount = 0;
      }
      const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      order.timeline.push({
        status: newStatus,
        timestamp: timestampStr,
        note: cancellationReason || note || `Order updated to ${newStatus}`,
      });

      // Sync status update to MySQL database
      apiClient
        .post(`/owner/orders/${orderId}/status`, {
          status: newStatus,
          notes: note || cancellationReason || `Order updated to ${newStatus}`,
          cancellation_reason: cancellationReason || note,
        })
        .catch(() => {});

      this.notify();
    } else {
      this.taskOverrides[orderId] = newStatus;
      this.notify();
    }
  }
}

export const mockDataStore = new MockDataStore();
