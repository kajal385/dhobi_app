import apiClient from '../api/client';
import { Wallet, WalletTransaction, PaginatedResponse } from '../types';

export const walletService = {
  getWallet: async (): Promise<Wallet> => {
    const res = await apiClient.get('/wallet');
    return res.data.data || res.data;
  },

  getTransactions: async (page = 1): Promise<PaginatedResponse<WalletTransaction>> => {
    const res = await apiClient.get('/wallet/transactions', { params: { page } });
    return res.data.data || res.data;
  },

  addMoney: async (amount: number): Promise<{ order_id: string; razorpay_key: string }> => {
    const res = await apiClient.post('/wallet/add', { amount });
    return res.data.data;
  },

  verifyPayment: async (data: {
    order_id: string;
    payment_id: string;
    signature: string;
  }): Promise<Wallet> => {
    const res = await apiClient.post('/wallet/verify-payment', data);
    return res.data.data;
  },
};
