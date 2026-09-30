<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\LaundryShop;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    /**
     * Get orders list for customer / admin with filters.
     */
    /**
     * Get orders list for customer / admin with filters.
     */
    public function index(Request $request)
    {
        $query = Order::with(['customer', 'laundryShop', 'deliveryPartner', 'statusHistory', 'items']);

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        if ($request->filled('customer_id')) {
            $query->where('user_id', $request->input('customer_id'));
        }

        if ($request->filled('shop_id') || $request->filled('laundry_id')) {
            $shopId = $request->input('shop_id') ?? $request->input('laundry_id');
            $query->where('shop_id', $shopId);
        }

        if ($request->filled('status') && $request->input('status') !== 'all' && $request->input('status') !== 'ALL') {
            $query->where('status', $request->input('status'));
        }

        $orders = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'message' => 'Orders retrieved successfully',
            'data'    => $orders,
        ]);
    }

    /**
     * Store new customer order booking in database (dhobi_db).
     */
    public function store(Request $request)
    {
        $request->validate([
            'shop_id'      => 'nullable|integer',
            'total_amount' => 'nullable|numeric',
            'items'        => 'nullable|array',
        ]);

        DB::beginTransaction();
        try {
            $userId = $request->input('user_id') ?? $request->input('customer_id');
            if ($userId && !DB::table('users')->where('id', $userId)->exists()) {
                $userId = null;
            }
            if (!$userId && auth()->check()) {
                $userId = auth()->id();
            }

            if (!$userId && ($request->input('customer_mobile') || $request->input('customer_name') || $request->input('mobile') || $request->input('phone'))) {
                $phone = $request->input('customer_mobile') ?? $request->input('mobile') ?? $request->input('phone') ?? '9822012345';
                $name = $request->input('customer_name') ?? $request->input('name') ?? 'Customer';
                $cleanPhone = preg_replace('/\D/', '', $phone);
                $last10 = substr($cleanPhone, -10);

                $user = DB::table('users')->where('phone', $phone)
                    ->orWhere('phone', $cleanPhone)
                    ->orWhere('phone', 'LIKE', '%' . $last10)
                    ->first();

                if (!$user) {
                    $userId = DB::table('users')->insertGetId([
                        'uuid'       => (string) Str::uuid(),
                        'name'       => $name,
                        'phone'      => !empty($last10) ? $last10 : ($cleanPhone ?: $phone),
                        'email'      => Str::slug($name) . rand(100, 999) . '@dhobipro.com',
                        'is_active'  => 1,
                        'status'     => 'ACTIVE',
                        'role'       => 'customer',
                        'city'       => $request->input('city', 'Pune'),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } else {
                    $userId = $user->id;
                    if (empty($user->role) || $user->role === 'user') {
                        DB::table('users')->where('id', $userId)->update(['role' => 'customer', 'status' => 'ACTIVE', 'is_active' => 1]);
                    }
                    if ($request->filled('customer_name') && ($user->name === 'Walk-in Customer' || $user->name === 'Customer')) {
                        DB::table('users')->where('id', $userId)->update(['name' => $name, 'updated_at' => now()]);
                    }
                }
            }

            if (!$userId) {
                $existingCust = DB::table('users')->where('role', 'customer')->first();
                if ($existingCust) {
                    $userId = $existingCust->id;
                } else {
                    $userId = DB::table('users')->insertGetId([
                        'uuid'       => (string) Str::uuid(),
                        'name'       => $request->input('customer_name', 'Rahul Patil'),
                        'phone'      => $request->input('customer_mobile', '9822012345'),
                        'email'      => 'customer_' . rand(100, 999) . '@dhobipro.com',
                        'is_active'  => 1,
                        'status'     => 'ACTIVE',
                        'role'       => 'customer',
                        'city'       => 'Pune',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            // Resolve Shop
            $shopId = $request->input('shop_id') ?? $request->input('laundry_id') ?? $request->input('laundry_shop_id');
            if (!$shopId || !LaundryShop::where('id', $shopId)->exists()) {
                $activeShop = LaundryShop::where('city', 'Pune')->first() ?? LaundryShop::where('is_active', 1)->first() ?? LaundryShop::first();
                $shopId = $activeShop ? $activeShop->id : 1;
            }

        $totalAmount = (float) ($request->input('total_amount') ?? $request->input('amount') ?? 299);
        $commissionAmount = round($totalAmount * 0.15, 2);
        $laundryEarnings = round($totalAmount - $commissionAmount, 2);

            $status = strtoupper($request->input('status', 'PENDING'));

            $order = new Order();
            $order->uuid = (string) Str::uuid();
            $order->order_number = 'ORD-' . strtoupper(Str::random(6));
            $order->user_id = $userId;
            $order->shop_id = $shopId;
            $order->status = $status;
            $order->payment_status = in_array(strtolower($request->input('payment_status', 'pending')), ['pending', 'paid', 'failed', 'refunded']) ? strtolower($request->input('payment_status', 'pending')) : 'pending';
            $order->payment_method = in_array(strtolower($request->input('payment_method', 'cod')), ['cod', 'wallet', 'razorpay', 'upi', 'card', 'netbanking']) ? strtolower($request->input('payment_method', 'cod')) : 'cod';
            $order->subtotal = (float) ($request->input('subtotal', $totalAmount));
            $order->total_amount = $totalAmount;
            $order->total = $totalAmount;
            $order->commission_amount = $commissionAmount;
            $order->laundry_earnings = $laundryEarnings;
            $order->pickup_charge = (float) ($request->input('pickup_charge', 0));
            $order->delivery_charge = (float) ($request->input('delivery_charge', 0));
            $order->delivery_fee = $order->delivery_charge;
            $order->tax_amount = (float) ($request->input('tax_amount', 0));
            $order->discount_amount = (float) ($request->input('discount_amount', 0));
            $order->discount = $order->discount_amount;
            $order->pickup_address = $request->input('pickup_address', $request->input('address', 'Customer Address, Pune'));
            $order->pickup_date = $request->input('pickup_date', now()->format('Y-m-d'));
            $order->delivery_date = $request->input('delivery_date', now()->addDays(2)->format('Y-m-d'));
            $order->notes = $request->input('notes', 'Laundry booking');
            $order->save();

            // Store items if provided
            if ($request->has('items') && is_array($request->input('items'))) {
                foreach ($request->input('items') as $item) {
                    $svcName = $item['name'] ?? $item['service_name'] ?? 'Laundry Service';
                    $itemName = $item['name'] ?? $item['item_name'] ?? 'Laundry Item';
                    $unitPrice = (float) ($item['unit_price'] ?? $item['price'] ?? 50);
                    $qty = (float) ($item['quantity'] ?? 1);
                    $totPrice = (float) ($item['total_price'] ?? ($unitPrice * $qty));

                    DB::table('order_items')->insert([
                        'order_id'       => $order->id,
                        'service_name'   => $svcName,
                        'item_name'      => $itemName,
                        'name'           => $itemName,
                        'pricing_type'   => 'per_piece',
                        'unit_price'     => $unitPrice,
                        'price'          => $unitPrice,
                        'quantity'       => $qty,
                        'total_price'    => $totPrice,
                        'created_at'     => now(),
                        'updated_at'     => now(),
                    ]);
                }
            }

            // Increment shop total_orders
            LaundryShop::where('id', $shopId)->increment('total_orders');

            // Record in order_status_history
            DB::table('order_status_history')->insert([
                'order_id'   => $order->id,
                'status'     => $status,
                'updated_by' => $userId,
                'user_role'  => 'customer',
                'notes'      => $request->input('notes', 'Order placed by customer'),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Notification
            DB::table('notifications')->insert([
                'user_id'    => $userId,
                'title'      => 'Order Placed #' . $order->order_number,
                'message'    => 'Your laundry order of ₹' . $order->total_amount . ' has been created successfully.',
                'type'       => 'ORDER_CREATED',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::commit();

            $fullOrder = Order::with(['customer', 'laundryShop', 'deliveryPartner', 'statusHistory', 'items'])->find($order->id);

            return response()->json([
                'success' => true,
                'message' => 'Order booked successfully!',
                'data'    => $fullOrder,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Order booking failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Show single order details with status timeline history.
     */
    public function show($id)
    {
        $order = Order::with(['customer', 'laundryShop', 'deliveryPartner', 'statusHistory'])->find($id);

        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Order not found'], 404);
        }

        $items = DB::table('order_items')->where('order_id', $order->id)->get();

        return response()->json([
            'success' => true,
            'message' => 'Order details retrieved',
            'data'    => array_merge($order->toArray(), ['items' => $items]),
        ]);
    }

    /**
     * Cancel an order.
     */
    public function cancel(Request $request, $id)
    {
        $order = Order::findOrFail($id);
        $order->status = 'CANCELLED';
        $reason = $request->input('reason') ?? $request->input('cancellation_reason') ?? 'Cancelled by laundry shop';
        $order->cancellation_reason = $reason;
        $order->save();

        DB::table('order_status_history')->insert([
            'order_id'   => $order->id,
            'status'     => 'CANCELLED',
            'updated_by' => auth()->id() ?? $order->user_id,
            'user_role'  => $request->input('role', 'customer'),
            'notes'      => $reason,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Create customer notification
        try {
            DB::table('notifications')->insert([
                'user_id'    => $order->user_id,
                'title'      => 'Order Cancelled #' . ($order->order_number ?? $order->id),
                'message'    => 'Your order was cancelled by the laundry shop. Reason: ' . $reason,
                'type'       => 'ORDER_CANCELLED',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {}

        return response()->json([
            'success' => true,
            'message' => 'Order cancelled successfully',
            'data'    => Order::with(['customer', 'laundryShop', 'statusHistory'])->find($order->id),
        ]);
    }

    /**
     * Rate an order.
     */
    public function rate(Request $request, $id)
    {
        $order = Order::findOrFail($id);
        
        DB::table('reviews')->insert([
            'user_id'          => $order->user_id,
            'laundry_shop_id'  => $order->shop_id ?? 1,
            'order_id'         => $order->id,
            'rating'           => $request->input('rating', 5),
            'comment'          => $request->input('comment', 'Great service'),
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Review submitted successfully',
        ]);
    }

    /**
     * Customer confirms delivery availability.
     */
    public function confirmAvailability(Request $request, $id)
    {
        $order = Order::findOrFail($id);
        $isAvailable = filter_var($request->input('is_available', true), FILTER_VALIDATE_BOOLEAN);
        $notes = $request->input('notes', '');

        if ($isAvailable) {
            $order->status = 'customer_confirmed';
            $order->customer_available = 1;
            $order->customer_availability_notes = $notes;
            $order->save();

            DB::table('order_status_history')->insert([
                'order_id'   => $order->id,
                'status'     => 'customer_confirmed',
                'updated_by' => auth()->id() ?? $order->user_id,
                'user_role'  => 'customer',
                'notes'      => $notes ?: 'Customer confirmed availability: Ready to receive delivery',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Delivery availability confirmed! Delivery partner will be assigned shortly.',
                'data'    => $order,
            ]);
        } else {
            // Customer requested reschedule / not available now
            DB::table('order_status_history')->insert([
                'order_id'   => $order->id,
                'status'     => $order->status,
                'updated_by' => auth()->id() ?? $order->user_id,
                'user_role'  => 'customer',
                'notes'      => $notes ?: 'Customer is not available now, requested reschedule',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Your delivery preference has been noted. We will check again before dispatching.',
                'data'    => $order,
            ]);
        }
    }
}
