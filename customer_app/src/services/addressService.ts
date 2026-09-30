import apiClient from '../api/client';
import { Address } from '../types';

// ── Mock addresses used when API is unavailable ──────────────
const MOCK_ADDRESSES: Address[] = [
  {
    id: 1,
    label: 'Home',
    full_address: 'Flat 302, Green Acres, Wakad Main Road',
    address_line1: 'Flat 302, Green Acres, Wakad Main Road',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411057',
    is_default: true,
    latitude: 18.5987,
    longitude: 73.7688,
  } as any,
  {
    id: 2,
    label: 'Office',
    full_address: 'Office no 805, Sayaji Hotel Road, Wakad',
    address_line1: 'Office no 805, Sayaji Hotel Road, Wakad',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411057',
    is_default: false,
    latitude: 18.595,
    longitude: 73.765,
  } as any,
];

export const addressService = {
  getAddresses: async (): Promise<Address[]> => {
    try {
      const res = await apiClient.get('/addresses');
      const data = res.data.data || res.data;
      if (Array.isArray(data) && data.length > 0) return data;
      return MOCK_ADDRESSES;
    } catch {
      return MOCK_ADDRESSES;
    }
  },

  addAddress: async (data: Partial<Address>): Promise<Address> => {
    try {
      const res = await apiClient.post('/addresses', data);
      return res.data.data || res.data;
    } catch {
      const newAddr = { ...data, id: Date.now(), is_default: false } as Address;
      MOCK_ADDRESSES.push(newAddr);
      return newAddr;
    }
  },

  updateAddress: async (id: number, data: Partial<Address>): Promise<Address> => {
    try {
      const res = await apiClient.put(`/addresses/${id}`, data);
      return res.data.data || res.data;
    } catch {
      const idx = MOCK_ADDRESSES.findIndex(a => a.id === id);
      if (idx !== -1) { MOCK_ADDRESSES[idx] = { ...MOCK_ADDRESSES[idx], ...data }; return MOCK_ADDRESSES[idx]; }
      throw new Error('Address not found');
    }
  },

  deleteAddress: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`/addresses/${id}`);
    } catch {
      const idx = MOCK_ADDRESSES.findIndex(a => a.id === id);
      if (idx !== -1) MOCK_ADDRESSES.splice(idx, 1);
    }
  },

  setDefault: async (id: number): Promise<Address> => {
    try {
      const res = await apiClient.post(`/addresses/${id}/default`);
      return res.data.data || res.data;
    } catch {
      MOCK_ADDRESSES.forEach(a => { a.is_default = a.id === id; });
      return MOCK_ADDRESSES.find(a => a.id === id) || MOCK_ADDRESSES[0];
    }
  },
};

