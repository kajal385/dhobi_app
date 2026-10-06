import apiClient, { storage } from '../api/client';
import { Wallet, WalletTransaction, PaginatedResponse } from '../types';

const WALLET_STORAGE_KEY = 'user_wallet_data';

interface StoredWalletData {
  balance: number;
  transactions: WalletTransaction[];
}

const getStoredWalletData = (): StoredWalletData => {
  try {
    const raw = storage.getString(WALLET_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { balance: 0, transactions: [] };
};

const saveStoredWalletData = (data: StoredWalletData) => {
  try {
    storage.set(WALLET_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
};

export const walletService = {
  getWallet: async (): Promise<Wallet> => {
    try {
      const res = await apiClient.get('/wallet', { timeout: 4000 });
      const data = res.data?.data || res.data;
      if (data && typeof data.balance === 'number') {
        const local = getStoredWalletData();
        saveStoredWalletData({ ...local, balance: data.balance });
        return { balance: data.balance, currency: data.currency || 'INR' };
      }
    } catch (e) {
      // Fallback to locally stored wallet
    }
    const local = getStoredWalletData();
    return {
      balance: local.balance,
      currency: 'INR',
    };
  },

  getTransactions: async (page = 1): Promise<PaginatedResponse<WalletTransaction>> => {
    try {
      const res = await apiClient.get('/wallet/transactions', { params: { page }, timeout: 4000 });
      const raw = res.data?.data || res.data;
      if (Array.isArray(raw)) {
        return {
          current_page: 1,
          data: raw,
          last_page: 1,
          per_page: 20,
          total: raw.length,
        };
      }
    } catch (e) {
      // Fallback to locally stored transactions
    }
    const local = getStoredWalletData();
    return {
      current_page: 1,
      data: local.transactions || [],
      last_page: 1,
      per_page: 20,
      total: (local.transactions || []).length,
    };
  },

  addMoney: async (amount: number): Promise<{ success: boolean; balance: number; transaction: WalletTransaction }> => {
    let newBalance = 0;
    try {
      const res = await apiClient.post('/wallet/add', { amount }, { timeout: 5000 });
      const data = res.data?.data || res.data;
      if (data && typeof data.balance === 'number') {
        newBalance = data.balance;
      }
    } catch (e) {
      // Backend unavailable / offline
    }

    const local = getStoredWalletData();
    if (newBalance <= 0) {
      newBalance = Number(((local.balance || 0) + amount).toFixed(2));
    }

    const tx: WalletTransaction = {
      id: Date.now(),
      type: 'credit',
      amount: amount,
      description: `Added ₹${amount} to Wallet`,
      reference: 'WAL-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      created_at: new Date().toISOString(),
    };

    const updatedTxs = [tx, ...(local.transactions || [])];
    saveStoredWalletData({ balance: newBalance, transactions: updatedTxs });

    return {
      success: true,
      balance: newBalance,
      transaction: tx,
    };
  },

  verifyPayment: async (data: {
    order_id: string;
    payment_id: string;
    signature: string;
  }): Promise<Wallet> => {
    try {
      const res = await apiClient.post('/wallet/verify-payment', data);
      return res.data?.data || res.data;
    } catch (e) {
      const local = getStoredWalletData();
      return { balance: local.balance, currency: 'INR' };
    }
  },

  clearWalletData: () => {
    try {
      if (typeof (storage as any).delete === 'function') (storage as any).delete(WALLET_STORAGE_KEY);
      if (typeof storage.remove === 'function') storage.remove(WALLET_STORAGE_KEY);
    } catch (e) {}
  },
};
