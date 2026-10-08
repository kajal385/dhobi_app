<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    // ── Public: List all active categories ──────────────────

    /**
     * GET /api/v1/categories
     *
     * Returns all active categories ordered by sort_order.
     * No authentication required – used by the mobile app home screen.
     */
    public function index(): JsonResponse
    {
        $categories = Category::where('is_active', 1)->orderBy('sort_order')->get();

        $formatted = $categories->map(function ($c) {
            $key = $c->slug ?: Str::slug($c->name, '_');
            return [
                'id'          => (int) $c->id,
                'name'        => (string) $c->name,
                'key'         => (string) $key,
                'slug'        => (string) ($c->slug ?: $key),
                'icon'        => (string) ($c->icon ?: '🧺'),
                'image'       => $c->image,
                'color'       => (string) ($c->color ?: '#D7D9FC'),
                'description' => (string) ($c->description ?: ''),
                'sort_order'  => (int) $c->sort_order,
                'is_active'   => (bool) $c->is_active,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Categories retrieved successfully',
            'data'    => $formatted,
        ]);
    }

    /**
     * GET /api/v1/banners
     */
    public function banners(Request $request): JsonResponse
    {
        try {
            $banners = collect();
            if (\Illuminate\Support\Facades\Schema::hasTable('banners')) {
                $query = \Illuminate\Support\Facades\DB::table('banners')->where('is_active', 1);
                if (\Illuminate\Support\Facades\Schema::hasColumn('banners', 'sort_order')) {
                    $query->orderBy('sort_order');
                }
                $banners = $query->orderBy('id', 'desc')->limit(15)->get();
            }

            if ($banners->isEmpty()) {
                $banners = collect([
                    [
                        'id' => '1',
                        'title' => 'Super Clean Wash',
                        'subtitle' => 'Special festive laundry & dry clean offer',
                        'image' => '/uploads/banners/banner_30_1791351874.png',
                        'link' => 'booking',
                        'tag' => 'ACTIVE',
                        'tagColor' => '#10B981',
                        'is_active' => 1,
                    ],
                    [
                        'id' => '2',
                        'title' => 'Flat 30% OFF on First Dry Clean Order',
                        'subtitle' => 'Use code FIRST30 on your order',
                        'image' => 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80',
                        'link' => 'booking',
                        'tag' => 'LIMITED OFFER',
                        'tagColor' => '#10B981',
                        'is_active' => 1,
                    ],
                    [
                        'id' => '3',
                        'title' => 'Express 24-Hour Wash & Fold Service',
                        'subtitle' => 'Doorstep pickup & next-day delivery',
                        'image' => 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=800&q=80',
                        'link' => 'booking',
                        'tag' => 'EXPRESS',
                        'tagColor' => '#10B981',
                        'is_active' => 1,
                    ],
                ]);
            }

            $formatted = $banners->map(function ($b) {
                $bObj = (object) $b;
                $img = (string) ($bObj->image ?? '');
                if ($img && !str_starts_with($img, 'http://') && !str_starts_with($img, 'https://')) {
                    $cleanImg = ltrim($img, '/');
                    if (file_exists(public_path($cleanImg))) {
                        $img = url($cleanImg);
                    } else {
                        $img = 'https://dhobi-admin.bizz-manager.com/' . $cleanImg;
                    }
                }
                return [
                    'id' => (string) ($bObj->id ?? '1'),
                    'shop_id' => $bObj->shop_id ?? null,
                    'title' => $bObj->title ?: 'Special Laundry Offer',
                    'subtitle' => $bObj->subtitle ?? ($bObj->description ?? 'Doorstep pickup & next-day delivery'),
                    'tag' => $bObj->tag ?? 'ACTIVE',
                    'tagColor' => $bObj->tagColor ?? ($bObj->tag_color ?? '#10B981'),
                    'image' => $img,
                    'url' => $bObj->link ?? $img,
                    'is_active' => (int) ($bObj->is_active ?? 1),
                ];
            });

            // Merge from banners.json if present
            $jsonFile = base_path('../customer_app/src/constants/banners.json');
            if (file_exists($jsonFile)) {
                $custom = json_decode(file_get_contents($jsonFile), true);
                if (is_array($custom)) {
                    foreach ($custom as $cb) {
                        if (!$formatted->contains('id', (string) ($cb['id'] ?? ''))) {
                            $cbImg = (string) ($cb['image'] ?? ($cb['url'] ?? ''));
                            if ($cbImg && !str_starts_with($cbImg, 'http://') && !str_starts_with($cbImg, 'https://')) {
                                $cleanCbImg = ltrim($cbImg, '/');
                                if (file_exists(public_path($cleanCbImg))) {
                                    $cbImg = url($cleanCbImg);
                                } else {
                                    $cbImg = 'https://dhobi-admin.bizz-manager.com/' . $cleanCbImg;
                                }
                            }
                            $formatted->push([
                                'id' => (string) ($cb['id'] ?? uniqid()),
                                'shop_id' => $cb['shopId'] ?? null,
                                'title' => $cb['title'] ?? 'Special Laundry Offer',
                                'subtitle' => $cb['subtitle'] ?? 'Doorstep pickup & next-day delivery',
                                'tag' => $cb['tag'] ?? 'ACTIVE',
                                'tagColor' => $cb['tagColor'] ?? '#10B981',
                                'image' => $cbImg,
                                'url' => $cb['url'] ?? $cbImg,
                                'is_active' => 1,
                            ]);
                        }
                    }
                }
            }

            return response()->json([
                'success' => true,
                'data' => $formatted->values()
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => true,
                'data' => [
                    [
                        'id' => 1,
                        'title' => 'Flat 20% OFF First Order',
                        'subtitle' => 'Use code: DHOBI20 at checkout',
                        'image' => 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80',
                        'link' => 'booking',
                        'tag' => 'SPECIAL OFFER',
                        'is_active' => 1,
                    ]
                ]
            ]);
        }
    }

    /**
     * POST /api/v1/banners
     * Allow admin / laundry owner to upload and store banners
     */
    public function storeBanner(Request $request): JsonResponse
    {
        try {
            $imageUrl = '';
            if ($request->hasFile('banner_image') || $request->hasFile('image')) {
                $file = $request->file('banner_image') ?: $request->file('image');
                $filename = 'banner_' . time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
                $dest = public_path('uploads/banners');
                if (!file_exists($dest)) {
                    @mkdir($dest, 0777, true);
                }
                $file->move($dest, $filename);
                $imageUrl = '/uploads/banners/' . $filename;
            } elseif ($request->filled('image')) {
                $imageUrl = $request->input('image');
            } elseif ($request->filled('image_url')) {
                $imageUrl = $request->input('image_url');
            } elseif ($request->filled('url')) {
                $imageUrl = $request->input('url');
            }

            if (empty($imageUrl)) {
                return response()->json(['success' => false, 'message' => 'Image file or URL is required'], 422);
            }

            $title = $request->input('title', $request->input('banner_title', 'Promotional Offer'));
            $subtitle = $request->input('subtitle', $request->input('banner_subtitle', 'Special festive laundry offer'));
            $tag = $request->input('tag', $request->input('banner_tag', 'ACTIVE'));
            $tagColor = $request->input('tagColor', $request->input('banner_tag_color', '#10B981'));
            $shopId = $request->input('shop_id');
            $link = $request->input('link', 'booking');

            $data = [
                'title' => $title,
                'image' => $imageUrl,
                'link' => $link,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            if (\Illuminate\Support\Facades\Schema::hasColumn('banners', 'subtitle') && $subtitle) {
                $data['subtitle'] = $subtitle;
            }
            if (\Illuminate\Support\Facades\Schema::hasColumn('banners', 'tag') && $tag) {
                $data['tag'] = $tag;
            }
            if (\Illuminate\Support\Facades\Schema::hasColumn('banners', 'tag_color') && $tagColor) {
                $data['tag_color'] = $tagColor;
            }
            if (\Illuminate\Support\Facades\Schema::hasColumn('banners', 'shop_id') && $shopId) {
                $data['shop_id'] = $shopId;
            }
            if (\Illuminate\Support\Facades\Schema::hasColumn('banners', 'sort_order')) {
                $data['sort_order'] = (int)$request->input('sort_order', 0);
            }

            $id = \Illuminate\Support\Facades\DB::table('banners')->insertGetId($data);

            return response()->json([
                'success' => true,
                'message' => 'Banner added successfully',
                'data' => array_merge(['id' => $id], $data)
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /api/v1/banners/{id}
     */
    public function deleteBanner(Request $request, $id): JsonResponse
    {
        try {
            \Illuminate\Support\Facades\DB::table('banners')->where('id', $id)->delete();
            return response()->json(['success' => true, 'message' => 'Banner deleted']);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/v1/banners/{id}/status
     */
    public function toggleBannerStatus(Request $request, $id): JsonResponse
    {
        try {
            $banner = \Illuminate\Support\Facades\DB::table('banners')->where('id', $id)->first();
            if ($banner) {
                $newStatus = $banner->is_active ? 0 : 1;
                \Illuminate\Support\Facades\DB::table('banners')->where('id', $id)->update(['is_active' => $newStatus, 'updated_at' => now()]);
            }
            return response()->json(['success' => true, 'message' => 'Banner status updated']);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/v1/categories/{id}
     *
     * Returns a single category by ID.
     */
    public function show(Category $category): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $category,
        ]);
    }

    // ── Admin: Create ────────────────────────────────────────

    /**
     * POST /api/v1/categories   (requires auth:sanctum)
     */
    /**
     * POST /api/v1/categories
     */
    public function store(Request $request): JsonResponse
    {
        $name = $request->input('name', 'New Category');
        $key  = $request->input('key') ?: Str::slug($name, '_');
        $icon = $request->input('icon', '🧺');
        $color = $request->input('color', '#8162EE');
        $description = $request->input('description', '');

        $category = Category::create([
            'name'        => $name,
            'key'         => $key,
            'icon'        => $icon,
            'color'       => $color,
            'description' => $description,
            'is_active'   => $request->input('status') === 'INACTIVE' ? 0 : 1,
            'sort_order'  => (int) $request->input('sort_order', 0),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Category created successfully.',
            'data'    => $category,
        ], 201);
    }

    /**
     * PUT/PATCH /api/v1/categories/{id}
     */
    public function update(Request $request, $id): JsonResponse
    {
        $category = Category::find($id);
        if (!$category) {
            return response()->json(['success' => false, 'message' => 'Category not found'], 404);
        }

        $updates = [];
        if ($request->filled('name')) {
            $updates['name'] = $request->input('name');
            $updates['key']  = Str::slug($request->input('name'), '_');
        }
        if ($request->filled('icon')) {
            $updates['icon'] = $request->input('icon');
        }
        if ($request->filled('color')) {
            $updates['color'] = $request->input('color');
        }
        if ($request->has('description')) {
            $updates['description'] = $request->input('description');
        }
        if ($request->has('status')) {
            $updates['is_active'] = $request->input('status') === 'ACTIVE' ? 1 : 0;
        }

        $category->update($updates);

        return response()->json([
            'success' => true,
            'message' => 'Category updated successfully.',
            'data'    => $category->fresh(),
        ]);
    }

    /**
     * DELETE /api/v1/categories/{id}
     */
    public function destroy($id): JsonResponse
    {
        $category = Category::find($id);
        if ($category) {
            $category->update(['is_active' => false]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Category deactivated successfully.',
        ]);
    }

    // ── Master Services Catalog ──────────────────────────────

    /**
     * GET /api/v1/services/master
     */
    public function masterServices(): JsonResponse
    {
        $services = \Illuminate\Support\Facades\DB::table('shop_services')
            ->leftJoin('categories', 'shop_services.category_id', '=', 'categories.id')
            ->select(
                'shop_services.id',
                'shop_services.name',
                'shop_services.description',
                'shop_services.estimated_hours',
                'shop_services.is_active',
                'categories.id as category_id',
                'categories.name as category_name'
            )
            ->get()
            ->map(function ($s) {
                return [
                    'id'                     => (string) $s->id,
                    'name'                   => (string) $s->name,
                    'categoryId'             => (string) ($s->category_id ?: 'CAT-1'),
                    'categoryName'           => (string) ($s->category_name ?: 'General'),
                    'unit'                   => 'per piece',
                    'basePrice'              => 50,
                    'expressPriceMultiplier' => 1.5,
                    'status'                 => $s->is_active ? 'ACTIVE' : 'INACTIVE',
                    'approvalStatus'         => 'APPROVED',
                ];
            });

        return response()->json([
            'success' => true,
            'message' => 'Master services retrieved successfully',
            'data'    => $services,
        ]);
    }

    /**
     * POST /api/v1/services/master
     */
    public function storeMasterService(Request $request): JsonResponse
    {
        $catId = $request->input('categoryId');
        if (!$catId || !is_numeric($catId)) {
            $catId = \Illuminate\Support\Facades\DB::table('categories')->value('id') ?: 1;
        }

        $id = \Illuminate\Support\Facades\DB::table('shop_services')->insertGetId([
            'shop_id'         => 1,
            'category_id'     => $catId,
            'name'            => $request->input('name', 'New Service'),
            'description'     => $request->input('description', 'Laundry Service'),
            'estimated_hours' => 24,
            'is_active'       => $request->input('status') === 'INACTIVE' ? 0 : 1,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Master service added successfully.',
            'id'      => $id,
        ], 201);
    }
}

