<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\LaundryShop;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ShopController extends Controller
{
    /**
     * Get paginated or full list of active shops for Customer App.
     */
    public function index(Request $request)
    {
        $city = $request->input('city');
        $search = $request->input('search');

        $query = LaundryShop::where('is_active', 1)
            ->whereIn('verification_status', ['approved', 'APPROVED']);

        if ($city) {
            $query->where('city', 'like', "%{$city}%");
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('shop_name', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%");
            });
        }

        $shops = $query->orderBy('rating', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        $formatted = $shops->map(function ($shop) {
            return $this->formatShopForCustomer($shop);
        });

        return response()->json([
            'success' => true,
            'message' => 'Shops retrieved successfully',
            'data'    => [
                'data'  => $formatted,
                'total' => $formatted->count(),
            ],
        ]);
    }

    /**
     * Get popular shops for Customer Home Screen.
     */
    public function popular(Request $request)
    {
        $city = $request->input('city');
        $query = LaundryShop::where('is_active', 1)
            ->whereIn('verification_status', ['approved', 'APPROVED']);

        if ($city) {
            $query->where('city', 'like', "%{$city}%");
        }

        $shops = $query->orderBy('rating', 'desc')
            ->orderBy('total_orders', 'desc')
            ->limit(10)
            ->get();

        $formatted = $shops->map(function ($shop) {
            return $this->formatShopForCustomer($shop);
        });

        return response()->json([
            'success' => true,
            'message' => 'Popular shops retrieved successfully',
            'data'    => $formatted,
        ]);
    }

    /**
     * Get global reels for the Customer App.
     */
    public function getReels(Request $request)
    {
        $presetVideos = [
            'https://assets.mixkit.co/videos/preview/mixkit-washing-machine-washing-clothes-41551-large.mp4',
            'https://assets.mixkit.co/videos/preview/mixkit-steam-iron-ironing-a-shirt-41552-large.mp4',
            'https://assets.mixkit.co/videos/preview/mixkit-folding-clothes-in-a-laundry-41553-large.mp4',
            'https://assets.mixkit.co/videos/preview/mixkit-laundry-turned-in-a-washing-machine-41550-large.mp4',
        ];

        $shops = LaundryShop::where('is_active', 1)->get();
        $reels = [];
        $presetIndex = 0;

        foreach ($shops as $shop) {
            $photos = !empty($shop->shop_photos) ? (is_string($shop->shop_photos) ? json_decode($shop->shop_photos, true) : $shop->shop_photos) : [];
            $photos = is_array($photos) ? $photos : [];

            // Find if shop has explicit uploaded video files
            $videosFound = [];
            $imagePhotos = [];
            foreach ($photos as $item) {
                $url = is_array($item) ? ($item['url'] ?? $item['image'] ?? '') : (string) $item;
                $clean = strtolower(explode('?', $url)[0]);
                if (str_ends_with($clean, '.mp4') || str_ends_with($clean, '.mov') || str_ends_with($clean, '.webm') || str_contains($clean, '/videos/')) {
                    $videosFound[] = $url;
                } else if (!empty($url)) {
                    $imagePhotos[] = $url;
                }
            }

            if (!empty($videosFound)) {
                foreach ($videosFound as $vIdx => $vUrl) {
                    $reels[] = [
                        'id' => $shop->id . '-v-' . $vIdx,
                        'shopName' => $shop->name ?: $shop->shop_name ?: 'Laundry Shop',
                        'video_url' => $vUrl,
                        'thumbnail_url' => !empty($imagePhotos) ? $imagePhotos[0] : $shop->cover_image,
                        'caption' => 'Inside ' . ($shop->name ?: $shop->shop_name),
                        'offer' => $shop->offers_express_delivery ? 'EXPRESS DELIVERY AVAILABLE' : 'QUALITY LAUNDRY CARE',
                        'likes' => rand(15, 120),
                        'shares' => rand(5, 30),
                        'service' => 'Premium Wash & Iron',
                        'bg' => '#000000',
                        'isLiked' => false,
                        'isSaved' => false,
                        'isFollowing' => false,
                    ];
                }
            } else {
                // Assign a quality laundry process video to the shop with their uploaded photo/cover as thumbnail
                $assignedVideo = $presetVideos[$presetIndex % count($presetVideos)];
                $presetIndex++;
                $thumb = !empty($imagePhotos) ? $imagePhotos[0] : ($shop->cover_image ?: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=600&auto=format&fit=crop&q=80');

                $reels[] = [
                    'id' => 'shop-reel-' . $shop->id,
                    'shopName' => $shop->name ?: $shop->shop_name ?: 'Laundry Shop',
                    'video_url' => $assignedVideo,
                    'thumbnail_url' => $thumb,
                    'caption' => 'Professional Laundry Process at ' . ($shop->name ?: $shop->shop_name),
                    'offer' => 'FREE PICKUP & DELIVERY',
                    'likes' => rand(20, 150),
                    'shares' => rand(8, 40),
                    'service' => 'Eco Wash & Iron',
                    'bg' => '#000000',
                    'isLiked' => false,
                    'isSaved' => false,
                    'isFollowing' => false,
                ];
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Reels retrieved successfully',
            'data'    => $reels,
        ]);
    }

    /**
     * Get nearby shops for Customer App.
     */
    public function nearby(Request $request)
    {
        $lat = (float) $request->input('lat', 18.5590);
        $lng = (float) $request->input('lng', 73.7868);
        $city = $request->input('city');

        $query = LaundryShop::query();

        if ($city) {
            $query->where('city', 'like', "%{$city}%");
        }

        $shops = $query->get();

        if ($shops->isEmpty()) {
            return response()->json([
                'success' => true,
                'message' => 'Nearby registered shops retrieved successfully',
                'data'    => $this->getDefaultShops($lat, $lng),
            ]);
        }

        $formatted = $shops->map(function ($shop) use ($lat, $lng) {
            $item = $this->formatShopForCustomer($shop);
            $shopLat = (float) ($shop->latitude ?: 18.5590);
            $shopLng = (float) ($shop->longitude ?: 73.7868);
            $distanceKm = $this->calculateDistance($lat, $lng, $shopLat, $shopLng);
            $item['distance_km'] = $distanceKm;
            $item['distance'] = round($distanceKm, 1) . ' km away (' . max(10, round($distanceKm * 3)) . ' mins)';
            return $item;
        })->sortBy('distance_km')->values();

        return response()->json([
            'success' => true,
            'message' => 'Nearby registered shops retrieved successfully',
            'data'    => $formatted,
        ]);
    }

    private function getDefaultShops($lat = 18.5590, $lng = 73.7868)
    {
        $defaultShops = [
            [
                'id' => 1, 'uuid' => 'uuid-1', 'name' => 'Pearl Power Laundry', 'slug' => 'pearl-power',
                'owner_name' => 'Rajesh Kumar', 'logo' => null, 'cover_image' => null,
                'address' => 'City Avenue Wakad, Pune', 'area' => 'Wakad', 'city' => 'Pune', 'state' => 'MH', 'pincode' => '411057',
                'latitude' => 18.59, 'longitude' => 73.76, 'rating' => 4.8, 'review_count' => 124, 'is_open' => true,
                'is_verified' => true, 'is_featured' => true, 'pickup_charge' => 0, 'delivery_charge' => 0,
                'min_order_amount' => 300, 'estimated_delivery_hours' => 24, 'offers_express_delivery' => true,
                'offers_same_day' => true, 'offers_free_pickup' => true, 'offers_free_delivery' => true, 'total_orders' => 380,
            ],
            [
                'id' => 2, 'uuid' => 'uuid-2', 'name' => 'Fresh & Clean Laundry', 'slug' => 'fresh-clean',
                'owner_name' => 'Amit Sharma', 'logo' => null, 'cover_image' => null,
                'address' => 'Koregaon Park, Pune', 'area' => 'Koregaon Park', 'city' => 'Pune', 'state' => 'MH', 'pincode' => '411001',
                'latitude' => 18.54, 'longitude' => 73.89, 'rating' => 4.6, 'review_count' => 89, 'is_open' => true,
                'is_verified' => true, 'is_featured' => false, 'pickup_charge' => 30, 'delivery_charge' => 30,
                'min_order_amount' => 200, 'estimated_delivery_hours' => 24, 'offers_express_delivery' => true,
                'offers_same_day' => false, 'offers_free_pickup' => false, 'offers_free_delivery' => false, 'total_orders' => 190,
            ],
            [
                'id' => 3, 'uuid' => 'uuid-3', 'name' => 'Quick Wash Laundry', 'slug' => 'quick-wash',
                'owner_name' => 'Suresh Patil', 'logo' => null, 'cover_image' => null,
                'address' => 'Baner Main Road, Pune', 'area' => 'Baner', 'city' => 'Pune', 'state' => 'MH', 'pincode' => '411045',
                'latitude' => 18.56, 'longitude' => 73.78, 'rating' => 4.7, 'review_count' => 210, 'is_open' => true,
                'is_verified' => true, 'is_featured' => true, 'pickup_charge' => 0, 'delivery_charge' => 20,
                'min_order_amount' => 199, 'estimated_delivery_hours' => 24, 'offers_express_delivery' => true,
                'offers_same_day' => true, 'offers_free_pickup' => true, 'offers_free_delivery' => false, 'total_orders' => 520,
            ],
            [
                'id' => 4, 'uuid' => 'uuid-4', 'name' => 'ExpressClean Hub', 'slug' => 'expressclean-hub',
                'owner_name' => 'Pooja Verma', 'logo' => null, 'cover_image' => null,
                'address' => 'Shop #4, Koregaon Park, Pune', 'area' => 'Koregaon Park', 'city' => 'Pune', 'state' => 'MH', 'pincode' => '411001',
                'latitude' => 18.53, 'longitude' => 73.88, 'rating' => 4.9, 'review_count' => 310, 'is_open' => true,
                'is_verified' => true, 'is_featured' => true, 'pickup_charge' => 0, 'delivery_charge' => 0,
                'min_order_amount' => 250, 'estimated_delivery_hours' => 24, 'offers_express_delivery' => true,
                'offers_same_day' => true, 'offers_free_pickup' => true, 'offers_free_delivery' => true, 'total_orders' => 640,
            ],
        ];

        return collect($defaultShops)->map(function ($shop) use ($lat, $lng) {
            $distanceKm = $this->calculateDistance($lat, $lng, $shop['latitude'], $shop['longitude']);
            $shop['distance_km'] = $distanceKm;
            $shop['distance'] = round($distanceKm, 1) . ' km away (' . max(10, round($distanceKm * 3)) . ' mins)';
            return $shop;
        })->sortBy('distance_km')->values()->all();
    }

    /**
     * Get full profile of a single shop including services & catalog items.
     */
    public function show($id)
    {
        $shop = LaundryShop::where('id', $id)
            ->orWhere('uuid', $id)
            ->orWhere('slug', $id)
            ->with(['owner', 'documents'])
            ->first();

        if (!$shop) {
            return response()->json([
                'success' => false,
                'message' => 'Laundry shop not found',
            ], 404);
        }

        $services = \App\Models\ShopService::where('shop_id', $shop->id)
            ->where('is_active', 1)
            ->with(['items' => function ($query) {
                $query->where('is_active', 1);
            }])
            ->get();

        $formattedServices = $services->map(function ($svc) {
            return [
                'id' => $svc->id,
                'name' => $svc->name,
                'description' => $svc->description ?: 'High quality laundry care',
                'icon' => $svc->icon ?: '🧺',
                'estimated_hours' => $svc->estimated_hours ?: 24,
                'items' => $svc->items->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'name' => $item->name,
                        'pricing_type' => $item->pricing_type,
                        'price_per_piece' => $item->price_per_piece,
                        'price_per_kg' => $item->price_per_kg,
                    ];
                })->toArray(),
            ];
        })->toArray();

        // We now use DB-driven services exclusively.


        return response()->json([
            'success' => true,
            'message' => 'Shop details retrieved',
            'data'    => [
                'shop' => $this->formatShopForCustomer($shop),
                'services' => $formattedServices,
                'reviews' => [],
                'rating_breakdown' => [
                    '5' => max(1, $shop->total_orders),
                    '4' => 0,
                    '3' => 0,
                    '2' => 0,
                    '1' => 0,
                ],
                'reels' => collect(!empty($shop->shop_photos) ? (is_string($shop->shop_photos) ? json_decode($shop->shop_photos, true) : $shop->shop_photos) : [])->map(function ($photo, $idx) {
                    $clean = strtolower(explode('?', (string)$photo)[0]);
                    $isVideo = str_ends_with($clean, '.mp4') || str_ends_with($clean, '.mov') || str_ends_with($clean, '.webm') || str_contains($clean, '/videos/');
                    return [
                        'id' => $idx + 1,
                        'uuid' => 'gallery-' . $idx,
                        'url' => $photo,
                        'video_url' => $isVideo ? $photo : null,
                        'thumbnail_url' => $photo,
                        'caption' => $isVideo ? 'Shop Video' : 'Shop Gallery Photo',
                        'offer_text' => null,
                        'type' => $isVideo ? 'video' : 'photo',
                    ];
                })->toArray(),
                'gallery' => collect(!empty($shop->shop_photos) ? (is_string($shop->shop_photos) ? json_decode($shop->shop_photos, true) : $shop->shop_photos) : [])->map(function ($photo, $idx) {
                    $clean = strtolower(explode('?', (string)$photo)[0]);
                    $isVideo = str_ends_with($clean, '.mp4') || str_ends_with($clean, '.mov') || str_ends_with($clean, '.webm') || str_contains($clean, '/videos/');
                    return [
                        'id' => $idx + 1,
                        'url' => $photo,
                        'video_url' => $isVideo ? $photo : null,
                        'thumbnail_url' => $photo,
                        'type' => $isVideo ? 'video' : 'photo',
                        'title' => ($isVideo ? 'Shop Video' : 'Shop Photo') . ' #' . ($idx + 1),
                    ];
                })->toArray(),
                'coupons' => [],
                'memberships' => [],
                'delivery_slots' => [
                    ['slot' => '08:00 AM - 11:00 AM', 'is_available' => true],
                    ['slot' => '11:00 AM - 02:00 PM', 'is_available' => true],
                    ['slot' => '02:00 PM - 05:00 PM', 'is_available' => true],
                    ['slot' => '05:00 PM - 08:00 PM', 'is_available' => true],
                ],
            ],
        ]);
    }

    private function formatShopForCustomer($shop)
    {
        $logo = $shop->logo_url ?: $shop->logo;
        $cover = $shop->cover_url ?: $shop->cover_image;

        return [
            'id'                       => (int) $shop->id,
            'uuid'                     => (string) $shop->uuid,
            'name'                     => (string) ($shop->name ?: $shop->shop_name ?: 'Laundry Shop'),
            'slug'                     => (string) ($shop->slug ?: 'shop-' . $shop->id),
            'owner_name'               => (string) ($shop->owner_name ?: 'Owner'),
            'logo'                     => $logo,
            'logo_url'                 => $logo,
            'cover_image'              => $cover,
            'cover_url'                => $cover,
            'address'                  => (string) ($shop->address ?: 'Address'),
            'area'                     => (string) ($shop->area ?: $shop->city ?: 'Pune'),
            'city'                     => (string) ($shop->city ?: 'Pune'),
            'state'                    => (string) ($shop->state ?: 'Maharashtra'),
            'pincode'                  => (string) ($shop->pincode ?: '411001'),
            'latitude'                 => (float) ($shop->latitude ?: 18.5590),
            'longitude'                => (float) ($shop->longitude ?: 73.7868),
            'rating'                   => (float) ($shop->rating ?: 4.8),
            'review_count'             => (int) ($shop->review_count ?: 45),
            'is_open'                  => (bool) ($shop->is_open ?? true),
            'is_verified'              => (bool) ($shop->is_verified || strtolower($shop->verification_status) === 'approved'),
            'is_featured'              => (bool) ($shop->is_featured ?? true),
            'pickup_charge'            => (float) ($shop->pickup_charge ?: 0),
            'delivery_charge'          => (float) ($shop->delivery_charge ?: 0),
            'min_order_amount'         => (float) ($shop->min_order_amount ?: 199),
            'estimated_delivery_hours' => (int) ($shop->estimated_delivery_hours ?: 24),
            'offers_express_delivery'  => (bool) ($shop->offers_express_delivery ?? true),
            'offers_same_day'          => (bool) ($shop->offers_same_day ?? false),
            'offers_free_pickup'       => true,
            'offers_free_delivery'     => true,
            'description'              => (string) ($shop->description ?: 'Premium wash & care services at your doorstep.'),
            'phone'                    => (string) ($shop->phone ?: ''),
            'email'                    => (string) ($shop->email ?: ''),
            'gst_number'               => $shop->gst_number,
            'working_hours'            => $shop->working_hours ?: '08:00 AM - 09:00 PM',
            'free_delivery_above'      => 399,
            'cod_available'            => true,
            'total_orders'             => (int) ($shop->total_orders ?: 0),
            'gallery'                  => !empty($shop->shop_photos) ? (is_string($shop->shop_photos) ? json_decode($shop->shop_photos, true) : $shop->shop_photos) : [],
        ];
    }

    private function calculateDistance($lat1, $lon1, $lat2, $lon2)
    {
        $earthRadius = 6371; // km
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return $earthRadius * $c;
    }
}
