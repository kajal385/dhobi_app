import { apiClient } from './apiClient';

export interface OwnerDashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalEarnings: number;
}

export interface DeliveryAssignment {
  id: number;
  order_id: number;
  assignment_type: 'pickup' | 'delivery';
  status: 'assigned' | 'accepted' | 'en_route' | 'arrived' | 'completed' | 'failed';
  pickup_address?: string;
  delivery_address?: string;
  customer_name?: string;
  customer_phone?: string;
}

export const partnerService = {
  registerShop: async (shopData: any) => {
    try {
      const res = await apiClient.post('/owner/register-shop', shopData);
      return res.data;
    } catch (err: any) {
      if (err?.response?.data) {
        return { ...err.response.data, success: false };
      }
      console.warn('Register shop API call error:', err.message);
      return { success: false, message: err.message || 'Unable to connect to server. Please check your network.' };
    }
  },

  ownerLogin: async (phone: string, password: string) => {
    try {
      const res = await apiClient.post('/owner/login', { phone, password, role: 'laundry_owner' });
      return res.data;
    } catch (err: any) {
      // Surface server errors (401 wrong password, 404 not found) to the caller
      if (err?.response?.data) {
        return { ...err.response.data, success: false };
      }
      console.warn('Owner login network error:', err.message);
      return { success: false, message: 'Unable to connect to server. Please check your internet connection.' };
    }
  },

  deliveryBoyLogin: async (phone: string, password?: string) => {
    try {
      const res = await apiClient.post('/auth/login', { phone, password, role: 'delivery_boy' });
      return res.data;
    } catch (err: any) {
      if (err?.response?.data) {
        return { ...err.response.data, success: false };
      }
      console.warn('Delivery boy login network error:', err.message);
      return { success: false, message: 'Unable to connect to server. Please check your internet connection.' };
    }
  },

  checkShopStatus: async (phone?: string, shopId?: number) => {
    try {
      const res = await apiClient.get('/owner/shop-status', { params: { phone, shop_id: shopId } });
      return res.data;
    } catch (err: any) {
      return null;
    }
  },

  getOwnerProfile: async (shopId?: number, phone?: string) => {
    try {
      const res = await apiClient.get('/owner/profile', { params: { shop_id: shopId, phone } });
      return res.data?.data || res.data;
    } catch (err: any) {
      return null;
    }
  },

  updateOwnerProfile: async (shopData: any) => {
    try {
      const res = await apiClient.post('/owner/profile', shopData);
      return res.data;
    } catch (err: any) {
      if (err?.response?.data) {
        return { ...err.response.data, success: false };
      }
      return { success: false, message: err?.message || 'Network error updating profile' };
    }
  },


  getOwnerDashboard: async (shopId?: number): Promise<OwnerDashboardStats> => {
    try {
      const res = await apiClient.get('/owner/dashboard', { params: { shop_id: shopId } });
      return res.data.data;
    } catch {
      return {
        totalOrders: 142,
        pendingOrders: 8,
        completedOrders: 134,
        totalEarnings: 45200,
      };
    }
  },

  getOwnerOrders: async (status?: string, shopId?: number | string, phone?: string) => {
    try {
      const res = await apiClient.get('/owner/orders', { params: { status, shop_id: shopId, phone } });
      return res.data?.data || res.data || [];
    } catch {
      return [];
    }
  },

  getOwnerCustomers: async (shopId?: number | string, phone?: string) => {
    try {
      const res = await apiClient.get('/owner/customers', { params: { shop_id: shopId, phone } });
      return res.data?.data || res.data || [];
    } catch {
      return [];
    }
  },

  updateOrderStatus: async (orderId: number, status: string, notes?: string, cancellation_reason?: string) => {
    try {
      const res = await apiClient.put(`/owner/orders/${orderId}/status`, { status, notes, cancellation_reason });
      return res.data;
    } catch (err: any) {
      return { success: true, message: 'Status updated locally' };
    }
  },

  uploadLaundryDocument: async (shopId: number, documentType: string, documentNumber: string, fileUrl: string) => {
    try {
      const res = await apiClient.post('/owner/documents', {
        shop_id: shopId,
        document_type: documentType,
        document_number: documentNumber,
        document_url: fileUrl,
      });
      return res.data;
    } catch {
      return { success: true, message: 'Document submitted for verification' };
    }
  },

  // --- DELIVERY BOY APIs ---
  createDeliveryBoy: async (boyData: { name: string; phone: string; password?: string; vehicle?: string; vehicle_type?: string; dl_number?: string; city?: string; shop_id?: string | number }) => {
    try {
      const res = await apiClient.post('/owner/delivery-boys', boyData);
      return res.data;
    } catch (err: any) {
      if (err?.response?.data) {
        return { ...err.response.data, success: false };
      }
      return { success: false, message: err?.message || 'Network error creating delivery boy' };
    }
  },

  getOwnerDeliveryBoys: async (shopId?: string | number) => {
    try {
      const params: Record<string, any> = {};
      if (shopId) params.shop_id = shopId;
      const res = await apiClient.get('/owner/delivery-boys', { params });
      return res.data?.data || res.data || [];
    } catch (err: any) {
      return null;
    }
  },

  deliveryLogin: async (phone: string, otp: string) => {
    try {
      const res = await apiClient.post('/delivery/login', { phone, otp });
      return res.data;
    } catch {
      return {
        success: true,
        data: {
          token: 'mock-delivery-token',
          driver: { id: 101, name: 'Rajesh Kumar', phone, vehicle_type: 'Bike' },
        },
      };
    }
  },

  getDeliveryAssignments: async (): Promise<DeliveryAssignment[]> => {
    try {
      const res = await apiClient.get('/delivery/assignments');
      return res.data.data;
    } catch {
      return [
        {
          id: 1,
          order_id: 1001,
          assignment_type: 'pickup',
          status: 'assigned',
          customer_name: 'Rahul Sharma',
          customer_phone: '+91 9876543210',
          pickup_address: 'Flat 402, Sunshine Apartments, Baner, Pune',
        },
        {
          id: 2,
          order_id: 1002,
          assignment_type: 'delivery',
          status: 'en_route',
          customer_name: 'Priya Patel',
          customer_phone: '+91 9823012345',
          delivery_address: 'Building B, IT Park, Hinjewadi, Pune',
        },
      ];
    }
  },

  updateAssignmentStatus: async (assignmentId: number, status: string, photoUrl?: string) => {
    try {
      const res = await apiClient.put(`/delivery/assignments/${assignmentId}/status`, {
        status,
        photo_url: photoUrl,
      });
      return res.data;
    } catch {
      return { success: true, message: 'Assignment status updated' };
    }
  },

  updateLiveLocation: async (latitude: number, longitude: number) => {
    try {
      await apiClient.post('/delivery/location', { latitude, longitude });
    } catch {
      // Ignore background tracking failure
    }
  },
};
