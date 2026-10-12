<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ShopService;
use App\Models\ServiceItem;
use Illuminate\Http\Request;

class ShopServiceController extends Controller
{
    public function getServices(Request $request)
    {
        $shopId = $request->input('shop_id') ?? ($request->user() ? $request->user()->shop_id : null);
        $query = ShopService::with('items');
        if ($shopId) {
            $query->where('shop_id', $shopId);
        }
        $services = $query->orderBy('id', 'desc')->get()->map(function ($s) {
            $firstItem = $s->items->first();
            $s->price = $firstItem ? ($firstItem->price_per_piece ?: $firstItem->price_per_kg) : 50;
            $s->unit = $firstItem ? ($firstItem->pricing_type === 'per_kg' ? 'kg' : 'piece') : 'piece';
            return $s;
        });

        return response()->json([
            'success' => true,
            'data' => $services
        ]);
    }

    public function createService(Request $request)
    {
        $request->validate([
            'shop_id' => 'required',
            'name' => 'required|string',
            'category_id' => 'required',
        ]);

        $service = ShopService::create($request->all());

        if ($request->has('price') && floatval($request->input('price')) > 0) {
            $unit = strtolower($request->input('unit', 'piece'));
            $pt = ($unit === 'kg' || $request->input('pricing_type') === 'per_kg') ? 'per_kg' : 'per_piece';
            ServiceItem::create([
                'shop_service_id' => $service->id,
                'name' => $service->name,
                'pricing_type' => $pt,
                'price_per_piece' => ($pt === 'per_piece') ? floatval($request->input('price')) : null,
                'price_per_kg' => ($pt === 'per_kg') ? floatval($request->input('price')) : null,
                'is_active' => 1,
                'sort_order' => 1,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Service created successfully',
            'data' => $service
        ]);
    }

    public function updateService(Request $request, $id)
    {
        $service = ShopService::find($id);
        if (!$service) {
            return response()->json(['success' => false, 'message' => 'Not found'], 404);
        }
        $service->update($request->all());

        if ($request->has('price')) {
            $unit = strtolower($request->input('unit', 'piece'));
            $pt = ($unit === 'kg' || $request->input('pricing_type') === 'per_kg') ? 'per_kg' : 'per_piece';
            $firstItem = $service->items()->first();
            if ($firstItem) {
                $firstItem->update([
                    'price_per_piece' => ($pt === 'per_piece') ? floatval($request->input('price')) : null,
                    'price_per_kg' => ($pt === 'per_kg') ? floatval($request->input('price')) : null,
                    'pricing_type' => $pt,
                ]);
            } else {
                ServiceItem::create([
                    'shop_service_id' => $service->id,
                    'name' => $service->name,
                    'pricing_type' => $pt,
                    'price_per_piece' => ($pt === 'per_piece') ? floatval($request->input('price')) : null,
                    'price_per_kg' => ($pt === 'per_kg') ? floatval($request->input('price')) : null,
                    'is_active' => 1,
                    'sort_order' => 1,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Service updated successfully',
            'data' => $service
        ]);
    }

    public function deleteService($id)
    {
        $service = ShopService::find($id);
        if ($service) {
            $service->items()->delete();
            $service->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Service deleted successfully'
        ]);
    }

    public function createItem(Request $request)
    {
        $request->validate([
            'shop_service_id' => 'required',
            'name' => 'required|string',
        ]);

        $item = ServiceItem::create($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Item created successfully',
            'data' => $item
        ]);
    }

    public function updateItem(Request $request, $id)
    {
        $item = ServiceItem::find($id);
        if (!$item) {
            return response()->json(['success' => false, 'message' => 'Not found'], 404);
        }
        $item->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Item updated successfully',
            'data' => $item
        ]);
    }

    public function deleteItem($id)
    {
        $item = ServiceItem::find($id);
        if ($item) {
            $item->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Item deleted successfully'
        ]);
    }
}
