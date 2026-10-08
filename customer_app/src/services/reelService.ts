import client from '../api/client';

export interface Reel {
  id: string;
  shopId?: string;
  shopName: string;
  video_url: string;
  thumbnail_url?: string;
  ownerName?: string;
  location?: string;
  caption?: string;
  offer?: string;
  likes?: number;
  shares?: number;
  service?: string;
  bg?: string;
  isLiked?: boolean;
  isSaved?: boolean;
  isFollowing?: boolean;
}

export const FALLBACK_REELS: Reel[] = [
  {
    id: 'laundry-video-1',
    shopName: 'Dhobi UltraPro',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-washing-machine-washing-clothes-41551-large.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=800&auto=format&fit=crop&q=80',
    caption: 'Automatic Garment Cleansing & Deep Fabric Care',
    offer: 'EXPRESS DELIVERY AVAILABLE',
    likes: 98,
    shares: 24,
    service: 'Premium Wash & Fold',
    bg: '#000000',
    isLiked: false,
    isSaved: false,
    isFollowing: false,
  },
  {
    id: 'laundry-video-2',
    shopName: 'Dhobi Express Hub',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-steam-iron-ironing-a-shirt-41552-large.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=800&auto=format&fit=crop&q=80',
    caption: 'Crease-Free High Heat Steam Pressing',
    offer: 'FLAT 20% OFF ON FIRST WASH',
    likes: 142,
    shares: 31,
    service: 'Steam Ironing & Press',
    bg: '#000000',
    isLiked: false,
    isSaved: false,
    isFollowing: false,
  },
  {
    id: 'laundry-video-3',
    shopName: 'CleanWear Care',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-folding-clothes-in-a-laundry-41553-large.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=800&auto=format&fit=crop&q=80',
    caption: 'Hygienic Folding & Protective Packaging',
    offer: 'FREE PICKUP & DELIVERY',
    likes: 85,
    shares: 19,
    service: 'Eco Wash & Packaging',
    bg: '#000000',
    isLiked: false,
    isSaved: false,
    isFollowing: false,
  },
];

import defaultReels from '../constants/reels.json';

export const reelService = {
  getReels: async (): Promise<Reel[]> => {
    const localReels: Reel[] = Array.isArray(defaultReels) ? (defaultReels as Reel[]) : [];
    try {
      const response = await client.get('/reels');
      const items = response.data?.data;
      if (Array.isArray(items) && items.length > 0) {
        // Merge: local reels first, followed by remote reels not already included
        const merged: Reel[] = [...localReels];
        for (const remote of items) {
          if (!merged.some(m => m.id === remote.id || m.video_url === remote.video_url)) {
            merged.push(remote);
          }
        }
        return merged;
      }
      return localReels.length > 0 ? localReels : FALLBACK_REELS;
    } catch (error) {
      console.warn('Backend reels unavailable, loading local reels.json:', error);
      return localReels.length > 0 ? localReels : FALLBACK_REELS;
    }
  },
};

