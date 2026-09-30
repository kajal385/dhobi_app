<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class DeliveryPartnerController extends Controller
{
    /**
     * Get list of all delivery partners.
     */
    public function index()
    {
        $drivers = User::where('role', 'delivery_boy')
            ->select('id', 'name', 'phone', 'email', 'city', 'status', 'created_at')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Delivery partners retrieved successfully',
            'data'    => $drivers,
        ]);
    }

    /**
     * Toggle Delivery Partner Status
     */
    public function toggleStatus(Request $request, $id)
    {
        $driver = User::where('role', 'delivery_boy')->findOrFail($id);
        $driver->status = $request->input('status', 'ACTIVE');
        $driver->save();

        return response()->json([
            'success' => true,
            'message' => 'Delivery partner status updated to ' . $driver->status,
            'data'    => $driver,
        ]);
    }
}
