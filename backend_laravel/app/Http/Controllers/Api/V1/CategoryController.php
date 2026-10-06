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
        // For customer app home screen, return active banners
        // Ideally filter by distance if lat/lng provided, but for now just global or any active
        $banners = \Illuminate\Support\Facades\DB::table('banners')
                    ->where('is_active', 1)
                    ->orderBy('sort_order')
                    ->limit(10)
                    ->get();
                    
        return response()->json([
            'success' => true,
            'data' => $banners
        ]);
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

