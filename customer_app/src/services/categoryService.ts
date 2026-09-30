import { apiClient } from '../api/client';

// ─────────────────────────────────────────────────────────────
//  Category Types
// ─────────────────────────────────────────────────────────────
export interface Category {
  id: number;
  name: string;
  key: string;
  icon: string;          // fallback emoji
  iconFamily?: string;   // vector icon family
  iconName?: string;     // vector icon name
  color: string;         // hex bg colour
  description?: string;
  is_active: boolean;
  sort_order: number;
}

// ─────────────────────────────────────────────────────────────
//  Static fallback (used when API is unreachable)
// ─────────────────────────────────────────────────────────────
export const STATIC_CATEGORIES: Category[] = [
  {
    id: 1,
    name: 'Wash & Fold',
    key: 'wash_fold',
    icon: '🧺',
    iconFamily: 'MaterialCommunityIcons',
    iconName: 'washing-machine',
    color: '#D7D9FC',
    description: 'Per kg pricing, fresh & clean',
    is_active: true,
    sort_order: 1,
  },
  {
    id: 2,
    name: 'Wash & Iron',
    key: 'wash_iron',
    icon: '👕',
    iconFamily: 'MaterialCommunityIcons',
    iconName: 'tshirt-crew',
    color: '#F3DDF0',
    description: 'Washed and neatly ironed',
    is_active: true,
    sort_order: 2,
  },
  {
    id: 3,
    name: 'Dry Cleaning',
    key: 'dry_clean',
    icon: '👔',
    iconFamily: 'MaterialCommunityIcons',
    iconName: 'hanger',
    color: '#FDE0D3',
    description: 'Premium fabric care',
    is_active: true,
    sort_order: 3,
  },
  {
    id: 4,
    name: 'Steam Iron',
    key: 'steam_iron',
    icon: '♨️',
    iconFamily: 'MaterialCommunityIcons',
    iconName: 'iron',
    color: '#FDDFC2',
    description: 'Wrinkle-free every time',
    is_active: true,
    sort_order: 4,
  },
  {
    id: 5,
    name: 'Shoe Cleaning',
    key: 'shoe_cleaning',
    icon: '👟',
    iconFamily: 'MaterialCommunityIcons',
    iconName: 'shoe-sneaker',
    color: '#E8F5E9',
    description: 'Deep cleaning for footwear',
    is_active: true,
    sort_order: 5,
  },
  {
    id: 6,
    name: 'Carpet Cleaning',
    key: 'carpet_cleaning',
    icon: '🪶',
    iconFamily: 'MaterialCommunityIcons',
    iconName: 'rug',
    color: '#E1F5FE',
    description: 'Vacuum and wash',
    is_active: true,
    sort_order: 6,
  },
  {
    id: 7,
    name: 'Blanket Cleaning',
    key: 'blanket_cleaning',
    icon: '🛌',
    iconFamily: 'MaterialCommunityIcons',
    iconName: 'bed',
    color: '#FCE4EC',
    description: 'Heavy winter blankets',
    is_active: true,
    sort_order: 7,
  },
  {
    id: 8,
    name: 'Curtain Cleaning',
    key: 'curtain_cleaning',
    icon: '🪟',
    iconFamily: 'MaterialCommunityIcons',
    iconName: 'curtains',
    color: '#FFF8E1',
    description: 'Dust removal and steam',
    is_active: true,
    sort_order: 8,
  },
  {
    id: 9,
    name: 'Sofa Cover Cleaning',
    key: 'sofa_cover_cleaning',
    icon: '🛋️',
    iconFamily: 'MaterialCommunityIcons',
    iconName: 'sofa',
    color: '#F3E5F5',
    description: 'Upholstery covers',
    is_active: true,
    sort_order: 9,
  },
  {
    id: 10,
    name: 'Premium Garments',
    key: 'premium_garments',
    icon: '✨',
    iconFamily: 'MaterialCommunityIcons',
    iconName: 'star-shooting-outline',
    color: '#FFF3E0',
    description: 'White-glove delicate care',
    is_active: true,
    sort_order: 10,
  },
  {
    id: 11,
    name: 'Express Laundry',
    key: 'express_laundry',
    icon: '🚀',
    iconFamily: 'MaterialCommunityIcons',
    iconName: 'truck-fast-outline',
    color: '#FFEBEE',
    description: 'Same day delivery',
    is_active: true,
    sort_order: 11,
  },
  {
    id: 12,
    name: 'Commercial Laundry',
    key: 'commercial_laundry',
    icon: '🏢',
    iconFamily: 'MaterialCommunityIcons',
    iconName: 'office-building',
    color: '#ECEFF1',
    description: 'Bulk orders for businesses',
    is_active: true,
    sort_order: 12,
  },
];

// ─────────────────────────────────────────────────────────────
//  Category Service
// ─────────────────────────────────────────────────────────────
export const categoryService = {
  /**
   * Fetch all active categories from the API.
   * Falls back to STATIC_CATEGORIES if the request fails.
   */
  getCategories: async (): Promise<Category[]> => {
    try {
      const response = await apiClient.get<{ data: Category[] }>('/categories');
      return response.data.data ?? (response.data as unknown as Category[]);
    } catch {
      // Return static data so the UI always has something to show
      return STATIC_CATEGORIES;
    }
  },

  /**
   * Admin: create a new category.
   */
  createCategory: async (
    data: Omit<Category, 'id'>
  ): Promise<Category> => {
    const response = await apiClient.post<{ data: Category }>('/categories', data);
    return response.data.data;
  },

  /**
   * Admin: update an existing category.
   */
  updateCategory: async (
    id: number,
    data: Partial<Omit<Category, 'id'>>
  ): Promise<Category> => {
    const response = await apiClient.put<{ data: Category }>(
      `/categories/${id}`,
      data
    );
    return response.data.data;
  },

  /**
   * Admin: deactivate a category.
   */
  deleteCategory: async (id: number): Promise<void> => {
    await apiClient.delete(`/categories/${id}`);
  },
};
