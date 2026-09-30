import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Notification } from '../types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    notificationsLoading: (state) => {
      state.loading = true;
    },
    setNotifications: (state, action: PayloadAction<Notification[]>) => {
      state.loading = false;
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter((n) => !n.is_read).length;
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.is_read) {
        state.unreadCount += 1;
      }
    },
    markRead: (state, action: PayloadAction<number>) => {
      const notif = state.notifications.find((n) => n.id === action.payload);
      if (notif && !notif.is_read) {
        notif.is_read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllRead: (state) => {
      state.notifications.forEach((n) => (n.is_read = true));
      state.unreadCount = 0;
    },
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
  },
});

export const {
  notificationsLoading,
  setNotifications,
  addNotification,
  markRead,
  markAllRead,
  clearNotifications,
} = notificationSlice.actions;

export default notificationSlice.reducer;
