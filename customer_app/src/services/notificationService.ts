import apiClient from '../api/client';
import { Notification, PaginatedResponse } from '../types';

export const notificationService = {
  getNotifications: async (page = 1): Promise<PaginatedResponse<Notification>> => {
    try {
      const res = await apiClient.get('/notifications', { params: { page } });
      if (res && res.data) {
        return res.data;
      }
    } catch (apiErr: any) {
      console.log('[notificationService] /notifications API unreachable or 404, generating order updates from /orders');
    }

    // Resilient fallback: Query active orders and build rich order status notifications
    try {
      const ordersRes = await apiClient.get('/orders');
      const ordersData = ordersRes.data;
      const ordersList: any[] = Array.isArray(ordersData)
        ? ordersData
        : (ordersData?.data || []);

      const statusInfo: Record<string, [string, string]> = {
        PENDING: ['📋 Order Placed', 'Your laundry order has been received and is awaiting confirmation.'],
        ACCEPTED: ['✅ Order Confirmed', 'The laundry owner has confirmed your booking.'],
        CONFIRMED: ['✅ Order Confirmed', 'The laundry owner has confirmed your booking.'],
        PICKUP_ASSIGNED: ['🛵 Pickup Scheduled', 'A delivery partner has been assigned for pickup.'],
        PICKED_UP: ['🧺 Laundry Picked Up', 'Your clothes have been collected by our delivery rider.'],
        IN_PROGRESS: ['🧼 Washing & Ironing', 'Your clothes are being professionally cleaned and steam pressed.'],
        PROCESSING: ['🧼 Washing & Ironing', 'Your garments are currently in washing and dry-cleaning process.'],
        WASHING: ['🧼 Washing in Progress', 'Your clothes are currently inside the wash cycle.'],
        IRONING: ['👔 Steam Ironing', 'Your garments are being steam pressed.'],
        READY: ['✨ Ready for Delivery', 'Your laundry is packed and ready for delivery.'],
        READY_FOR_DELIVERY: ['✨ Ready for Delivery', 'Your laundry is packed and ready for delivery.'],
        OUT_FOR_DELIVERY: ['🚀 Out for Delivery', 'Our delivery rider is on the way to your doorstep with fresh clothes!'],
        DELIVERED: ['🎉 Order Delivered', 'Your fresh laundry has been delivered. Thank you!'],
        COMPLETED: ['🎉 Order Completed', 'Your order has been completed successfully.'],
        CANCELLED: ['⚠️ Order Cancelled', 'Your order was cancelled by the shop or admin.'],
      };

      const generatedNotifs: Notification[] = [];
      let counter = 1;

      ordersList.forEach((order: any) => {
        const orderNum = order.order_number ? `#${order.order_number}` : `#ORD-${order.id}`;
        const currentStatus = String(order.status || 'PENDING').toUpperCase();
        const shopName = order.laundry_shop?.name || order.shop_name || 'DhobiPro Laundry';

        // Include status history steps if available
        if (Array.isArray(order.status_history) && order.status_history.length > 0) {
          order.status_history.forEach((hist: any) => {
            const histStatus = String(hist.status || currentStatus).toUpperCase();
            const [stTitle, stDesc] = statusInfo[histStatus] || ['📦 Order Update', `Order status updated to ${histStatus}`];
            generatedNotifs.push({
              id: Number(hist.id || (order.id * 100 + counter++)),
              title: `${stTitle} ${orderNum}`,
              body: `${stDesc} (${shopName})`,
              type: 'ORDER_STATUS_UPDATE',
              is_read: false,
              data: { order_id: order.id, status: histStatus },
              created_at: hist.created_at || order.updated_at || new Date().toISOString(),
            });
          });
        } else {
          const [stTitle, stDesc] = statusInfo[currentStatus] || ['📦 Order Update', `Order status is ${currentStatus}`];
          generatedNotifs.push({
            id: Number(order.id * 100 + counter++),
            title: `${stTitle} ${orderNum}`,
            body: `${stDesc} (${shopName})`,
            type: 'ORDER_STATUS_UPDATE',
            is_read: false,
            data: { order_id: order.id, status: currentStatus },
            created_at: order.updated_at || order.created_at || new Date().toISOString(),
          });
        }
      });

      // Sort descending by created_at
      generatedNotifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return {
        data: generatedNotifs,
        current_page: 1,
        last_page: 1,
        per_page: 20,
        total: generatedNotifs.length,
      };
    } catch (orderErr) {
      return {
        data: [],
        current_page: 1,
        last_page: 1,
        per_page: 20,
        total: 0,
      };
    }
  },

  markRead: async (id: number): Promise<void> => {
    await apiClient.post(`/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await apiClient.post('/notifications/read-all');
  },

  deleteNotification: async (id: number): Promise<void> => {
    await apiClient.delete(`/notifications/${id}`);
  },
};

