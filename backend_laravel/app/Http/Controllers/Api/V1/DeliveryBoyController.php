<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\DeliveryBoy;
use App\Models\DeliveryAssignment;
use App\Models\DeliveryLocation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DeliveryBoyController extends Controller
{
    /**
     * Toggle duty online / offline status.
     */
    public function toggleDuty(Request $request)
    {
        $driverId = $request->input('driver_id', 1);
        $driver = DeliveryBoy::find($driverId);

        if ($driver) {
            $driver->is_online = !$driver->is_online;
            $driver->save();
        }

        return response()->json([
            'success'   => true,
            'message'   => 'Duty status toggled successfully',
            'is_online' => $driver ? $driver->is_online : true,
        ]);
    }

    /**
     * Get active task assignments for delivery boy.
     */
    public function tasks(Request $request)
    {
        $inputDriverId = $request->input('driver_id') ?? $request->input('delivery_boy_id');
        
        $dbBoy = null;
        if ($inputDriverId) {
            $dbBoy = DeliveryBoy::where('id', $inputDriverId)
                ->orWhere('user_id', $inputDriverId)
                ->first();
        }

        $boyIds = array_values(array_unique(array_filter([
            $inputDriverId,
            $dbBoy ? $dbBoy->id : null,
            $dbBoy ? $dbBoy->user_id : null,
        ])));

        // Get orders assigned to this delivery boy directly via orders.delivery_boy_id
        $orders = Order::with(['customer', 'laundryShop', 'items', 'statusHistory'])
            ->whereIn('delivery_boy_id', $boyIds)
            ->orderBy('created_at', 'desc')
            ->get();

        // Also check delivery_assignments table
        $assignmentOrderIds = DeliveryAssignment::whereIn('delivery_boy_id', $boyIds)
            ->pluck('order_id')
            ->toArray();

        if (!empty($assignmentOrderIds)) {
            $extraOrders = Order::with(['customer', 'laundryShop', 'items', 'statusHistory'])
                ->whereIn('id', $assignmentOrderIds)
                ->whereNotIn('id', $orders->pluck('id')->toArray())
                ->get();
            $orders = $orders->concat($extraOrders);
        }

        return response()->json([
            'success' => true,
            'message' => 'Delivery tasks retrieved',
            'data'    => $orders->values(),
        ]);
    }

    /**
     * Accept assigned delivery task.
     */
    public function acceptTask(Request $request, $id)
    {
        $order = Order::findOrFail($id);
        
        DB::table('delivery_assignments')
            ->where('order_id', $order->id)
            ->update(['status' => 'accepted']);

        DB::table('order_status_history')->insert([
            'order_id'   => $order->id,
            'status'     => $order->status,
            'updated_by' => auth()->id() ?? 1,
            'user_role'  => 'delivery_boy',
            'notes'      => 'Delivery boy accepted task',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Delivery task accepted',
            'data'    => $order,
        ]);
    }

    /**
     * Update live GPS location ping.
     */
    public function updateLocation(Request $request)
    {
        $location = DeliveryLocation::create([
            'delivery_boy_id' => $request->input('driver_id', 1),
            'latitude'        => $request->input('latitude', 18.5590),
            'longitude'       => $request->input('longitude', 73.7868),
            'recorded_at'     => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Location recorded',
            'data'    => $location,
        ]);
    }

    /**
     * Verify pickup with photo.
     */
    public function verifyPickup(Request $request, $id)
    {
        $order = Order::findOrFail($id);
        $order->status = 'PICKED_UP';
        $order->pickup_photo_url = $request->input('photo_url', 'https://via.placeholder.com/300');
        $order->save();

        DB::table('order_status_history')->insert([
            'order_id'   => $order->id,
            'status'     => 'PICKED_UP',
            'updated_by' => auth()->id() ?? 1,
            'user_role'  => 'delivery_boy',
            'notes'      => 'Clothes picked up from customer',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('notifications')->insert([
            'user_id'    => $order->user_id,
            'title'      => 'Order Picked Up 🧺',
            'message'    => 'Your clothes for order #' . $order->order_number . ' have been picked up.',
            'type'       => 'PICKED_UP',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pickup verified successfully',
            'data'    => Order::with(['customer', 'statusHistory'])->find($order->id),
        ]);
    }

    /**
     * Verify delivery with digital signature.
     */
    public function verifyDelivery(Request $request, $id)
    {
        $order = Order::findOrFail($id);
        $order->status = 'DELIVERED';
        $order->payment_status = 'PAID';
        $order->delivery_photo_url = $request->input('photo_url', 'https://via.placeholder.com/300');
        $order->digital_signature_url = $request->input('signature_url', 'https://via.placeholder.com/300');
        $order->delivered_at = now();
        $order->save();

        DB::table('order_status_history')->insert([
            'order_id'   => $order->id,
            'status'     => 'DELIVERED',
            'updated_by' => auth()->id() ?? 1,
            'user_role'  => 'delivery_boy',
            'notes'      => 'Clothes delivered successfully to customer',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('notifications')->insert([
            'user_id'    => $order->user_id,
            'title'      => 'Order Delivered ✨',
            'message'    => 'Your order #' . $order->order_number . ' has been delivered.',
            'type'       => 'DELIVERED',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Delivery completed and verified successfully',
            'data'    => Order::with(['customer', 'statusHistory'])->find($order->id),
        ]);
    }
}
