import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Wallet, WalletTransaction } from '../types';

interface WalletState {
  balance: number;
  currency: string;
  transactions: WalletTransaction[];
  loading: boolean;
  error: string | null;
}

const initialState: WalletState = {
  balance: 0,
  currency: 'INR',
  transactions: [],
  loading: false,
  error: null,
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    walletLoading: (state) => {
      state.loading = true;
      state.error = null;
    },
    setWallet: (state, action: PayloadAction<Wallet>) => {
      state.loading = false;
      state.balance = action.payload.balance;
      state.currency = action.payload.currency;
    },
    setTransactions: (state, action: PayloadAction<WalletTransaction[]>) => {
      state.loading = false;
      state.transactions = action.payload;
    },
    addTransaction: (state, action: PayloadAction<WalletTransaction>) => {
      state.transactions.unshift(action.payload);
      if (action.payload.type === 'credit') {
        state.balance += action.payload.amount;
      } else {
        state.balance -= action.payload.amount;
      }
    },
    walletError: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    clearWallet: (state) => {
      state.balance = 0;
      state.transactions = [];
    },
  },
});

export const {
  walletLoading,
  setWallet,
  setTransactions,
  addTransaction,
  walletError,
  clearWallet,
} = walletSlice.actions;

export default walletSlice.reducer;
