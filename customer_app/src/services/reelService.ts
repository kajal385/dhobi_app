import client from '../api/client';

export interface Reel {
  id: string;
  shopName: string;
  video_url: string;
  thumbnail_url?: string;
  caption?: string;
  offer?: string;
  likes: number;
  shares: number;
  service: string;
  bg: string;
  isLiked: boolean;
  isSaved: boolean;
  isFollowing: boolean;
}

export const reelService = {
  getReels: async (): Promise<Reel[]> => {
    try {
      const response = await client.get('/reels');
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching reels:', error);
      throw error;
    }
  },
};
