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
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
        ];

        $reels = [];
        $adminBase = 'https://dhobi-admin.bizz-manager.com';

        // Helper to format accessible URL
        $formatMediaUrl = function ($url) use ($adminBase) {
            $u = (string) $url;
            if (empty($u)) return '';
            if (str_starts_with($u, 'http://') || str_starts_with($u, 'https://')) return $u;
            $clean = ltrim($u, '/');
            if (file_exists(public_path($clean))) {
                return url($clean);
            }
            return rtrim($adminBase, '/') . '/' . $clean;
        };

        // 1. First, check custom uploaded reels from customer_app reels.json
        $jsonPath = base_path('../customer_app/src/constants/reels.json');
        if (file_exists($jsonPath)) {
            $custom = json_decode(file_get_contents($jsonPath), true);
            if (is_array($custom)) {
                foreach ($custom as $cr) {
                    $vUrl = $formatMediaUrl($cr['video_url'] ?? '');
                    if (!empty($vUrl)) {
                        $tUrl = $formatMediaUrl($cr['thumbnail_url'] ?? '');
                        $reels[] = [
                            'id'            => (string) ($cr['id'] ?? uniqid('vid_')),
                            'shopId'        => (string) ($cr['shopId'] ?? '44'),
                            'shopName'      => $cr['shopName'] ?? 'Laundry Shop',
                            'ownerName'     => $cr['ownerName'] ?? 'Shop Owner',
                            'location'      => $cr['location'] ?? 'Pune',
                            'video_url'     => $vUrl,
                            'thumbnail_url' => $tUrl ?: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=600&auto=format&fit=crop&q=80',
                            'caption'       => $cr['caption'] ?? $cr['shopName'] ?? 'Laundry Care Process',
                            'offer'         => $cr['offer'] ?? 'EXPRESS DELIVERY AVAILABLE',
                            'likes'         => (int) ($cr['likes'] ?? 95),
                            'shares'        => (int) ($cr['shares'] ?? 24),
                            'service'       => $cr['service'] ?? 'Premium Wash & Iron',
                            'bg'            => '#000000',
                            'isLiked'       => false,
                            'isSaved'       => false,
                            'isFollowing'   => false,
                        ];
                    }
                }
            }
        }

        // 2. Next, check active shops and their shop_photos from database
        $shops = LaundryShop::where('is_active', 1)->get();
        $presetIndex = 0;

        foreach ($shops as $shop) {
            $photos = !empty($shop->shop_photos) ? (is_string($shop->shop_photos) ? json_decode($shop->shop_photos, true) : $shop->shop_photos) : [];
            $photos = is_array($photos) ? $photos : [];

            // Find if shop has explicit uploaded video files
            $videosFound = [];
            $imagePhotos = [];
            foreach ($photos as $item) {
                $rawUrl = is_array($item) ? ($item['url'] ?? $item['video_url'] ?? $item['image'] ?? '') : (string) $item;
                $url = $formatMediaUrl($rawUrl);
                $clean = strtolower(explode('?', $rawUrl)[0]);
                if (str_ends_with($clean, '.mp4') || str_ends_with($clean, '.mov') || str_ends_with($clean, '.webm') || str_contains($clean, '/videos/') || (is_array($item) && ($item['type'] ?? '') === 'video')) {
                    $thumbRaw = is_array($item) ? ($item['thumbnail_url'] ?? $item['thumbnail'] ?? '') : '';
                    $videosFound[] = [
                        'video_url'     => $url,
                        'thumbnail_url' => $formatMediaUrl($thumbRaw),
                        'caption'       => is_array($item) ? ($item['caption'] ?? '') : '',
                    ];
                } else if (!empty($url)) {
                    $imagePhotos[] = $url;
                }
            }

            if (!empty($videosFound)) {
                foreach ($videosFound as $vIdx => $vItem) {
                    $vUrl = $vItem['video_url'];
                    if (!array_filter($reels, fn($r) => $r['video_url'] === $vUrl)) {
                        $reels[] = [
                            'id' => $shop->id . '-v-' . $vIdx,
                            'shopId' => (string) $shop->id,
                            'shopName' => $shop->name ?: $shop->shop_name ?: 'Laundry Shop',
                            'ownerName' => $shop->owner_name ?: 'Shop Owner',
                            'location' => $shop->address ?: ($shop->city ?: 'Pune'),
                            'video_url' => $vUrl,
                            'thumbnail_url' => $vItem['thumbnail_url'] ?: (!empty($imagePhotos) ? $imagePhotos[0] : ($shop->cover_image ? $formatMediaUrl($shop->cover_image) : 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=600&auto=format&fit=crop&q=80')),
                            'caption' => $vItem['caption'] ?: ('Inside ' . ($shop->name ?: $shop->shop_name)),
                            'offer' => $shop->offers_express_delivery ? 'EXPRESS DELIVERY AVAILABLE' : 'QUALITY LAUNDRY CARE',
                            'likes' => rand(25, 150),
                            'shares' => rand(10, 45),
                            'service' => 'Premium Wash & Iron',
                            'bg' => '#000000',
                            'isLiked' => false,
                            'isSaved' => false,
                            'isFollowing' => false,
                        ];
                    }
                }
            }
        }

        // If no videos exist at all, provide a high-quality preset reel
        if (empty($reels)) {
            foreach ($shops->take(3) as $shop) {
                $assignedVideo = $presetVideos[$presetIndex % count($presetVideos)];
                $presetIndex++;
                $reels[] = [
                    'id' => 'shop-reel-' . $shop->id,
                    'shopId' => (string) $shop->id,
                    'shopName' => $shop->name ?: $shop->shop_name ?: 'Laundry Shop',
                    'ownerName' => $shop->owner_name ?: 'Shop Owner',
                    'location' => $shop->address ?: ($shop->city ?: 'Pune'),
                    'video_url' => $assignedVideo,
                    'thumbnail_url' => 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=600&auto=format&fit=crop&q=80',
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
     * Store new reel from Admin / Laundry Owner.
     */
    public function storeReel(Request $request)
    {
        try {
            $shopId = $request->input('shop_id');
            $videoUrl = $request->input('video_url', '');
            $thumbUrl = $request->input('thumbnail_url', '');
            $caption = $request->input('caption', '');

            if ($request->hasFile('video_file')) {
                $file = $request->file('video_file');
                $fname = 'vid_' . ($shopId ?: '0') . '_' . time() . '.' . $file->getClientOriginalExtension();
                $dest = public_path('uploads/shop-media');
                if (!file_exists($dest)) @mkdir($dest, 0777, true);
                $file->move($dest, $fname);
                $videoUrl = url('/uploads/shop-media/' . $fname);
            }

            if ($request->hasFile('thumbnail_file')) {
                $tfile = $request->file('thumbnail_file');
                $tfname = 'thumb_' . ($shopId ?: '0') . '_' . time() . '.' . $tfile->getClientOriginalExtension();
                $dest = public_path('uploads/shop-media');
                if (!file_exists($dest)) @mkdir($dest, 0777, true);
                $tfile->move($dest, $tfname);
                $thumbUrl = url('/uploads/shop-media/' . $tfname);
            }

            if (empty($videoUrl)) {
                return response()->json(['success' => false, 'message' => 'Video file or video URL is required'], 422);
            }

            // Sync into shop_photos for that shop
            if ($shopId) {
                $shop = LaundryShop::find($shopId);
                if ($shop) {
                    $photos = !empty($shop->shop_photos) ? (is_string($shop->shop_photos) ? json_decode($shop->shop_photos, true) : $shop->shop_photos) : [];
                    $photos = is_array($photos) ? $photos : [];
                    array_unshift($photos, [
                        'url' => $videoUrl,
                        'thumbnail_url' => $thumbUrl,
                        'caption' => $caption ?: ($shop->name . ' Reel'),
                        'type' => 'video',
                    ]);
                    $shop->shop_photos = json_encode($photos);
                    $shop->save();
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Reel uploaded successfully',
                'data' => [
                    'id' => uniqid('vid_'),
                    'shopId' => $shopId,
                    'video_url' => $videoUrl,
                    'thumbnail_url' => $thumbUrl,
                    'caption' => $caption,
                ]
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Delete reel by ID or URL.
     */
    public function deleteReel(Request $request, $id)
    {
        try {
            $shops = LaundryShop::whereNotNull('shop_photos')->get();
            foreach ($shops as $shop) {
                $photos = json_decode($shop->shop_photos, true);
                if (is_array($photos)) {
                    $filtered = array_values(array_filter($photos, function($p) use ($id) {
                        $pUrl = is_array($p) ? ($p['url'] ?? '') : (string)$p;
                        return !str_contains($pUrl, (string)$id);
                    }));
                    if (count($filtered) !== count($photos)) {
                        $shop->shop_photos = json_encode($filtered);
                        $shop->save();
                    }
                }
            }
            return response()->json(['success' => true, 'message' => 'Reel deleted successfully']);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
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
            'working_hours'            => $shop->working_hours ?: '08:00 AM - 09:30 PM',
            'closed_days'              => $this->extractClosedDays($shop->working_hours),
            'is_sunday_off'            => in_array('Sunday', $this->extractClosedDays($shop->working_hours)),
            'operating_days'           => $this->extractOperatingDays($shop->working_hours),
            'free_delivery_above'      => 399,
            'cod_available'            => true,
            'total_orders'             => (int) ($shop->total_orders ?: 0),
            'gallery'                  => !empty($shop->shop_photos) ? (is_string($shop->shop_photos) ? json_decode($shop->shop_photos, true) : $shop->shop_photos) : [],
        ];
    }

    private function extractClosedDays($workingHours)
    {
        if (empty($workingHours)) {
            return [];
        }
        if (is_array($workingHours)) {
            return $workingHours['closed_days'] ?? [];
        }
        $str = strtolower((string) $workingHours);
        $closed = [];
        if (preg_match('/sun(day)?\s*(is\s*)?(off|closed|close)/i', $str) ||
            preg_match('/mon(day)?\s*(-|to)\s*sat(urday)?/i', $str)) {
            $closed[] = 'Sunday';
        }
        if (preg_match('/sat(urday)?\s*(is\s*)?(off|closed|close)/i', $str) && !str_contains($str, 'mon-sat')) {
            $closed[] = 'Saturday';
        }
        return $closed;
    }

    private function extractOperatingDays($workingHours)
    {
        $closed = $this->extractClosedDays($workingHours);
        $all = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return array_values(array_diff($all, $closed));
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
