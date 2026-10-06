import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { storage } from '../api/client';

export interface User {
  id: number;
  phone: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  alternate_phone?: string | null;
  is_phone_verified: boolean;
  wallet_balance: string;
  referral_code?: string;
  address?: string | null;
  area?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const getStoredUser = (): User | null => {
  try {
    const raw = storage.getString('user_profile');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading stored user_profile', e);
  }
  return null;
};

const getStoredToken = (): string | null => {
  try {
    const token = storage.getString('auth_token');
    return token && token.trim().length > 0 ? token : null;
  } catch (e) {
    return null;
  }
};

const storedToken = getStoredToken();
const storedUser = getStoredUser();
const isUserLoggedIn = Boolean(storedToken && storedUser);

const initialState: AuthState = {
  user: isUserLoggedIn ? storedUser : null,
  token: isUserLoggedIn ? storedToken : null,
  isAuthenticated: isUserLoggedIn,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    authSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.loading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      storage.set('auth_token', action.payload.token);
      try {
        storage.set('user_profile', JSON.stringify(action.payload.user));
      } catch (e) {}
    },
    authFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateProfile: (state, action: PayloadAction<Partial<User>>) => {
      const current = state.user || {
        id: 1,
        phone: '9309386003',
        name: 'Kajal Gajare',
        email: 'kajal-gajare750@dhobipro.com',
        avatar: null,
        is_phone_verified: true,
        wallet_balance: '0',
        address: 'Flat 302, Green Acres',
        area: 'Wakad',
        city: 'Pune',
        pincode: '411057',
      };
      state.user = { ...current, ...action.payload };
      try {
        storage.set('user_profile', JSON.stringify(state.user));
      } catch (e) {
        console.warn('Error storing user_profile', e);
      }
    },
    logoutUser: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      try {
        if (typeof (storage as any).delete === 'function') {
          (storage as any).delete('auth_token');
          (storage as any).delete('user_profile');
        }
        if (typeof storage.remove === 'function') {
          storage.remove('auth_token');
          storage.remove('user_profile');
        }
      } catch (e) {}
    },
  },
});

export const { authStart, authSuccess, authFailure, updateProfile, logoutUser } = authSlice.actions;
export default authSlice.reducer;
