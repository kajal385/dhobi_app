import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Order } from '../types';

interface OrderState {
  orders: Order[];
  activeOrder: Order | null;
  loading: boolean;
  error: string | null;
}

const initialState: OrderState = {
  orders: [],
  activeOrder: null,
  loading: false,
  error: null,
};

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    ordersLoading: (state) => {
      state.loading = true;
      state.error = null;
    },
    setOrders: (state, action: PayloadAction<any>) => {
      state.loading = false;
      const payload = action.payload;
      if (Array.isArray(payload)) {
        state.orders = payload;
      } else if (payload && Array.isArray(payload.data)) {
        state.orders = payload.data;
      } else {
        state.orders = [];
      }
    },
    setActiveOrder: (state, action: PayloadAction<Order | null>) => {
      state.loading = false;
      state.activeOrder = action.payload;
    },
    addOrder: (state, action: PayloadAction<Order>) => {
      state.orders.unshift(action.payload);
    },
    updateOrderStatus: (
      state,
      action: PayloadAction<{ id: number; status: Order['status'] }>
    ) => {
      const order = state.orders.find((o) => o.id === action.payload.id);
      if (order) {
        order.status = action.payload.status;
      }
      if (state.activeOrder?.id === action.payload.id) {
        state.activeOrder.status = action.payload.status;
      }
    },
    ordersError: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    clearOrders: (state) => {
      state.orders = [];
      state.activeOrder = null;
    },
  },
});

export const {
  ordersLoading,
  setOrders,
  setActiveOrder,
  addOrder,
  updateOrderStatus,
  ordersError,
  clearOrders,
} = orderSlice.actions;

export default orderSlice.reducer;
