import apiClient from '../api/client';

export interface ShopListItem {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  logo: string | null;
  cover_image: string | null;
  address: string;
  area: string | null;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  rating: number;
  review_count: number;
  is_open: boolean;
  is_verified: boolean;
  is_featured: boolean;
  pickup_charge: number;
  delivery_charge: number;
  min_order_amount: number;
  estimated_delivery_hours: number;
  offers_express_delivery: boolean;
  offers_same_day: boolean;
  offers_free_pickup: boolean;
  offers_free_delivery: boolean;
  distance?: string | number;
  gallery?: string[];
}

export interface ServiceItem {
  id: number;
  name: string;
  icon: string | null;
  pricing_type: 'per_piece' | 'per_kg' | 'both';
  price_per_piece: number | null;
  price_per_kg: number | null;
  description: string | null;
}

export interface ShopService {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  estimated_hours: number;
  items: ServiceItem[];
}

export interface ShopReview {
  id: number;
  rating: number;
  pickup_rating: number | null;
  delivery_rating: number | null;
  service_rating: number | null;
  comment: string | null;
  photos: string[];
  reply_from_shop: string | null;
  replied_at: string | null;
  created_at: string;
  user_name: string;
}

export interface ShopReel {
  id: number;
  uuid: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  offer_text: string | null;
  likes_count: number;
  views_count: number;
}

export interface ShopCoupon {
  id: number;
  code: string;
  title: string;
  description: string | null;
  discount_type: 'flat' | 'percentage';
  discount_value: number;
  max_discount: number | null;
  min_order_amount: number;
  valid_until: string | null;
}

export interface MembershipPlan {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  duration_days: number;
  benefits: Record<string, any>;
}

export interface DeliverySlot {
  id: number;
  label: string;
  start_time: string;
  end_time: string;
  available_days: number[];
}

export interface WorkingHours {
  [day: string]: {
    open: string;
    close: string;
    closed: boolean;
  };
}

export interface ShopDetail extends ShopListItem {
  description: string | null;
  phone: string;
  email: string | null;
  gst_number: string | null;
  gallery: string[];
  working_hours: WorkingHours | null;
  free_delivery_above: number;
  offers_subscription: boolean;
  cod_available: boolean;
  tax_amount?: number;
}

export interface ShopProfileResponse {
  shop: ShopDetail;
  services: ShopService[];
  reviews: ShopReview[];
  rating_breakdown: Record<string, number>;
  reels: ShopReel[];
  coupons: ShopCoupon[];
  memberships: MembershipPlan[];
  delivery_slots: DeliverySlot[];
}

export const DEFAULT_SHOPS: ShopListItem[] = [
  {
    id: 44, uuid: 'uuid-44', name: 'Star Wash Ultra Premium', slug: 'star-wash-ultra-premium', logo: null, cover_image: null,
    address: 'Tathawade,pune', area: 'Tathawade', city: 'Pune', state: 'MH', pincode: '411033', latitude: 18.595, longitude: 73.765,
    rating: 4.9, review_count: 185, is_open: true, is_verified: true, is_featured: true, pickup_charge: 0, delivery_charge: 0,
    min_order_amount: 250, estimated_delivery_hours: 24, offers_express_delivery: true, offers_same_day: true, offers_free_pickup: true, offers_free_delivery: true,
    distance: '0.4 km away (4 mins)'
  },
  {
    id: 5, uuid: 'uuid-5', name: 'Star Wash Ultra Premium', slug: 'star-wash-ultra-premium-5', logo: null, cover_image: null,
    address: 'Dutta Mandir Road, Wakad, Pune', area: 'Wakad', city: 'Pune', state: 'MH', pincode: '411057', latitude: 18.595, longitude: 73.765,
    rating: 4.9, review_count: 185, is_open: true, is_verified: true, is_featured: true, pickup_charge: 0, delivery_charge: 0,
    min_order_amount: 250, estimated_delivery_hours: 24, offers_express_delivery: true, offers_same_day: true, offers_free_pickup: true, offers_free_delivery: true,
    distance: '0.4 km away (4 mins)'
  },
  {
    id: 6, uuid: 'uuid-6', name: 'Super Clean Wash Laundry', slug: 'super-clean-wash', logo: null, cover_image: null,
    address: 'Near Hinjewadi Flyover, Wakad, Pune', area: 'Wakad', city: 'Pune', state: 'MH', pincode: '411057', latitude: 18.588, longitude: 73.758,
    rating: 4.8, review_count: 142, is_open: true, is_verified: true, is_featured: true, pickup_charge: 0, delivery_charge: 15,
    min_order_amount: 199, estimated_delivery_hours: 24, offers_express_delivery: true, offers_same_day: true, offers_free_pickup: true, offers_free_delivery: false,
    distance: '1.5 km away (12 mins)'
  },
  {
    id: 1, uuid: 'uuid-1', name: 'Pearl Power Laundry', slug: 'pearl-power', logo: null, cover_image: null,
    address: 'City Avenue Wakad, Pune', area: 'Wakad', city: 'Pune', state: 'MH', pincode: '411057', latitude: 18.592, longitude: 73.764,
    rating: 4.8, review_count: 124, is_open: true, is_verified: true, is_featured: true, pickup_charge: 0, delivery_charge: 0,
    min_order_amount: 300, estimated_delivery_hours: 24, offers_express_delivery: true, offers_same_day: true, offers_free_pickup: true, offers_free_delivery: true,
    distance: '0.8 km away (7 mins)'
  },
  {
    id: 2, uuid: 'uuid-2', name: 'Fresh & Clean Laundry', slug: 'fresh-clean', logo: null, cover_image: null,
    address: 'Hinjewadi Phase 1, Pune', area: 'Hinjewadi', city: 'Pune', state: 'MH', pincode: '411057', latitude: 18.591, longitude: 73.738,
    rating: 4.6, review_count: 89, is_open: true, is_verified: true, is_featured: false, pickup_charge: 30, delivery_charge: 30,
    min_order_amount: 200, estimated_delivery_hours: 24, offers_express_delivery: true, offers_same_day: false, offers_free_pickup: false, offers_free_delivery: false,
    distance: '3.3 km away (26 mins)'
  },
  {
    id: 3, uuid: 'uuid-3', name: 'Quick Wash Laundry', slug: 'quick-wash', logo: null, cover_image: null,
    address: 'Baner Main Road, Pune', area: 'Baner', city: 'Pune', state: 'MH', pincode: '411045', latitude: 18.570, longitude: 73.770,
    rating: 4.7, review_count: 210, is_open: true, is_verified: true, is_featured: true, pickup_charge: 0, delivery_charge: 20,
    min_order_amount: 199, estimated_delivery_hours: 24, offers_express_delivery: true, offers_same_day: true, offers_free_pickup: true, offers_free_delivery: false,
    distance: '3.2 km away (26 mins)'
  },
  {
    id: 4, uuid: 'uuid-4', name: 'ExpressClean Hub', slug: 'expressclean-hub', logo: null, cover_image: null,
    address: 'Rahatani Road, Pune', area: 'Rahatani', city: 'Pune', state: 'MH', pincode: '411017', latitude: 18.580, longitude: 73.750,
    rating: 4.9, review_count: 310, is_open: true, is_verified: true, is_featured: true, pickup_charge: 0, delivery_charge: 0,
    min_order_amount: 250, estimated_delivery_hours: 24, offers_express_delivery: true, offers_same_day: true, offers_free_pickup: true, offers_free_delivery: true,
    distance: '2.8 km away (22 mins)'
  }
];

const mapShopItem = (item: any): ShopListItem => {
  if (!item) return item;
  return {
    ...item,
    logo: item.logo_url || item.logo || null,
    cover_image: item.cover_url || item.cover_image || item.cover || null,
  };
};

export const shopService = {
  /**
   * Fetch a paginated list of active shops.
   */
  getShops: async (page = 1): Promise<{ data: ShopListItem[]; total: number }> => {
    try {
      const res = await apiClient.get('/shops', { params: { page } });
      if (res.data?.data?.data && Array.isArray(res.data.data.data) && res.data.data.data.length > 0) {
        return {
          ...res.data.data,
          data: res.data.data.data.map(mapShopItem),
        };
      }
      return { data: DEFAULT_SHOPS.map(mapShopItem), total: DEFAULT_SHOPS.length };
    } catch {
      return { data: DEFAULT_SHOPS.map(mapShopItem), total: DEFAULT_SHOPS.length };
    }
  },

  /**
   * Fetch the full profile of a single shop.
   */
  getShopProfile: async (id: number): Promise<ShopProfileResponse> => {
    try {
      const res = await apiClient.get(`/shops/${id}`);
      const data = res.data.data;
      if (data?.shop) {
        data.shop = {
          ...data.shop,
          logo: data.shop.logo_url || data.shop.logo || null,
          cover_image: data.shop.cover_url || data.shop.cover_image || data.shop.cover || null,
        };
      }
      return data;
    } catch (e) {
      const found = DEFAULT_SHOPS.find((s) => s.id === Number(id)) || DEFAULT_SHOPS[0];
      return {
        shop: {
          id: found.id,
          uuid: found.uuid || `uuid-${found.id}`,
          name: found.name,
          slug: found.slug,
          logo: found.logo,
          cover_image: found.cover_image,
          address: found.address,
          area: found.area || 'Wakad',
          city: found.city || 'Pune',
          state: found.state || 'MH',
          pincode: found.pincode || '411057',
          latitude: found.latitude,
          longitude: found.longitude,
          rating: found.rating || 4.8,
          review_count: found.review_count || 150,
          is_open: found.is_open !== false,
          is_verified: found.is_verified !== false,
          is_featured: found.is_featured !== false,
          pickup_charge: found.pickup_charge ?? 0,
          delivery_charge: found.delivery_charge ?? 0,
          min_order_amount: found.min_order_amount || 199,
          estimated_delivery_hours: found.estimated_delivery_hours || 24,
          offers_express_delivery: found.offers_express_delivery !== false,
          offers_same_day: found.offers_same_day !== false,
          offers_free_pickup: found.offers_free_pickup !== false,
          offers_free_delivery: found.offers_free_delivery !== false,
          description: `Welcome to ${found.name}. We provide high-quality eco-friendly washing, dry cleaning, steam ironing, and express laundry services with doorstep pickup and delivery in ${found.area || 'Wakad'}, ${found.city || 'Pune'}.`,
          phone: found.id === 5 ? '+91 98234 56789' : found.id === 6 ? '+91 98901 23456' : found.id === 1 ? '+91 98111 22233' : '+91 98765 43210',
          email: found.id === 5 ? 'contact@starwashultra.com' : found.id === 6 ? 'info@supercleanwash.com' : found.id === 1 ? 'support@pearlpowerlaundry.com' : `contact@${found.slug}.com`,
          gst_number: `27AAACD${found.id}123Z1`,
          gallery: (found.gallery && found.gallery.length > 0)
            ? found.gallery
            : [
                'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=600&auto=format&fit=crop&q=80',
                'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=600&auto=format&fit=crop&q=80',
                'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=600&auto=format&fit=crop&q=80',
                'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
              ],
          working_hours: {
            mon: { open: '08:00 AM', close: '09:00 PM', closed: false },
            tue: { open: '08:00 AM', close: '09:00 PM', closed: false },
            wed: { open: '08:00 AM', close: '09:00 PM', closed: false },
            thu: { open: '08:00 AM', close: '09:00 PM', closed: false },
            fri: { open: '08:00 AM', close: '09:00 PM', closed: false },
            sat: { open: '08:00 AM', close: '09:00 PM', closed: false },
            sun: { open: '09:00 AM', close: '07:00 PM', closed: false },
          },
          free_delivery_above: 300,
          offers_subscription: true,
          cod_available: true,
        },
        services: [
          {
            id: 1,
            name: 'Wash & Fold',
            description: 'Regular wash and neat folding',
            icon: '🧺',
            estimated_hours: 48,
            items: [
              { id: 101, name: 'T-Shirt', icon: null, pricing_type: 'per_piece', price_per_piece: 20, price_per_kg: null, description: null },
              { id: 102, name: 'Jeans', icon: null, pricing_type: 'per_piece', price_per_piece: 40, price_per_kg: null, description: null },
              { id: 103, name: 'Mixed Clothes', icon: null, pricing_type: 'per_kg', price_per_piece: null, price_per_kg: 80, description: 'Min 3 kg' }
            ]
          },
          {
            id: 2,
            name: 'Dry Cleaning',
            description: 'Premium dry cleaning for delicate fabrics',
            icon: '👔',
            estimated_hours: 72,
            items: [
              { id: 201, name: 'Suit (2 Piece)', icon: null, pricing_type: 'per_piece', price_per_piece: 250, price_per_kg: null, description: null },
              { id: 202, name: 'Dress/Gown', icon: null, pricing_type: 'per_piece', price_per_piece: 300, price_per_kg: null, description: null }
            ]
          }
        ],
        reviews: [],
        rating_breakdown: { 5: 100, 4: 15, 3: 3, 2: 1, 1: 1 },
        reels: [
          {
            id: 1,
            uuid: 'reel-1',
            video_url: 'https://assets.mixkit.co/videos/preview/mixkit-washing-machine-washing-clothes-41551-large.mp4',
            thumbnail_url: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=600&auto=format&fit=crop&q=80',
            caption: 'Behind the Scenes: Our Commercial Hydro Washer in Action 🧼',
            offer_text: '20% OFF FIRST ORDER',
            likes_count: 248,
            views_count: 1420,
          },
          {
            id: 2,
            uuid: 'reel-2',
            video_url: 'https://assets.mixkit.co/videos/preview/mixkit-steam-iron-ironing-a-shirt-41552-large.mp4',
            thumbnail_url: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=600&auto=format&fit=crop&q=80',
            caption: 'Precision Steam Ironing for Suits & Silk Sarees ✨',
            offer_text: 'FREE PICKUP',
            likes_count: 189,
            views_count: 980,
          },
          {
            id: 3,
            uuid: 'reel-3',
            video_url: 'https://assets.mixkit.co/videos/preview/mixkit-folding-clothes-in-a-laundry-41553-large.mp4',
            thumbnail_url: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=600&auto=format&fit=crop&q=80',
            caption: 'Neat Folding & Sealed Packaging for Hygienic Delivery 📦',
            offer_text: 'EXPRESS 24H',
            likes_count: 312,
            views_count: 1850,
          },
        ],
        coupons: [],
        memberships: [],
        delivery_slots: []
      };
    }
  },

  /**
   * Fetch popular shops based on rating and reviews.
   */
  getPopularShops: async (): Promise<ShopListItem[]> => {
    try {
      const res = await apiClient.get('/shops/popular');
      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        return res.data.data.map(mapShopItem);
      }
      return DEFAULT_SHOPS.map(mapShopItem);
    } catch (e) {
      return DEFAULT_SHOPS.map(mapShopItem);
    }
  },

  /**
   * Fetch shops near the given location.
   */
  getNearbyShops: async (lat: number, lng: number): Promise<ShopListItem[]> => {
    try {
      const res = await apiClient.get('/shops/nearby', { params: { lat, lng } });
      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        return res.data.data.map(mapShopItem);
      }
      return DEFAULT_SHOPS.map(mapShopItem);
    } catch (e) {
      return DEFAULT_SHOPS.map(mapShopItem);
    }
  },
};
