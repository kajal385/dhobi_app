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
        $services = $query->orderBy('id', 'desc')->get();

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
