import apiClient from '../api/client';
import { Notification, PaginatedResponse } from '../types';

export const notificationService = {
  getNotifications: async (page = 1): Promise<PaginatedResponse<Notification>> => {
    const res = await apiClient.get('/notifications', { params: { page } });
    // Backend returns data -> current_page, etc. The array is in data.data
    return res.data; 
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

