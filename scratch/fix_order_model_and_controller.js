const fs = require('fs');
const path = require('path');

const targetDir1 = 'C:\\xampp\\htdocs\\dhobi_backend';
const targetDir2 = 'c:\\CODEXXA_PROJECT\\Dhobi_app\\backend_laravel';

// 1. Order.php model
const orderModelCode = `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\SoftDeletes;

class Order extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'order_number',
        'user_id',
        'shop_id',
        'delivery_boy_id',
        'address_id',
        'subtotal',
        'pickup_charge',
        'delivery_charge',
        'discount_amount',
        'wallet_used',
        'total_amount',
        'tax_amount',
        'commission_amount',
        'laundry_earnings',
        'status',
        'payment_method',
        'payment_status',
        'pickup_address',
        'pickup_date',
        'notes',
        'pickup_photo_url',
        'delivery_photo_url',
        'digital_signature_url',
    ];

    public function customer()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function laundryShop()
    {
        return $this->belongsTo(LaundryShop::class, 'shop_id');
    }

    public function deliveryPartner()
    {
        return $this->belongsTo(DeliveryBoy::class, 'delivery_boy_id');
    }
}
`;

// 2. OrderController.php
const orderControllerCode = `<?php

namespace App\\Http\\Controllers\\Api\\V1;

use App\\Http\\Controllers\\Controller;
use App\\Models\\Order;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\DB;
use Illuminate\\Support\\Str;

class OrderController extends Controller
{
    /**
     * Get orders list for customer / admin with filters.
     */
    public function index(Request $request)
    {
        $query = Order::with(['customer', 'laundryShop', 'deliveryPartner']);

        if ($request->has('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        if ($request->has('status')) {
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
            'shop_id'      => 'required|integer',
            'user_id'      => 'nullable|integer',
            'total_amount' => 'required|numeric',
            'items'        => 'nullable|array',
        ]);

        DB::beginTransaction();
        try {
            $order = new Order();
            $order->uuid = (string) Str::uuid();
            $order->order_number = 'ORD-' . strtoupper(Str::random(6));
            $order->user_id = $request->input('user_id') ?? auth()->id() ?? 1;
            $order->shop_id = $request->input('shop_id');
            $order->status = 'PLACED';
            $order->payment_status = 'pending';
            $order->payment_method = 'cod';
            $order->subtotal = $request->input('subtotal', $request->input('total_amount'));
            $order->pickup_charge = $request->input('pickup_charge', 0);
            $order->delivery_charge = $request->input('delivery_charge', 0);
            $order->tax_amount = $request->input('tax_amount', 0);
            $order->discount_amount = $request->input('discount_amount', 0);
            $order->total_amount = $request->input('total_amount');
            $order->pickup_address = $request->input('pickup_address', 'Customer Address');
            $order->pickup_date = $request->input('pickup_date', now()->format('Y-m-d'));
            $order->notes = $request->input('notes');
            $order->save();

            // Store items if provided
            if ($request->has('items') && is_array($request->input('items'))) {
                foreach ($request->input('items') as $item) {
                    DB::table('order_items')->insert([
                        'order_id'     => $order->id,
                        'service_name' => $item['service_name'] ?? 'Laundry Service',
                        'item_name'    => $item['name'] ?? 'Laundry Item',
                        'quantity'     => $item['quantity'] ?? 1,
                        'unit_price'   => $item['unit_price'] ?? 50,
                        'total_price'  => $item['total_price'] ?? 50,
                        'created_at'   => now(),
                        'updated_at'   => now(),
                    ]);
                }
            }

            // Record status log
            DB::table('order_status_logs')->insert([
                'order_id'    => $order->id,
                'status'      => 'PLACED',
                'title'       => 'Order Booked',
                'description' => 'Order booked by customer',
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Order booked successfully!',
                'data'    => $order->load(['customer', 'laundryShop']),
            ], 201);
        } catch (\\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to book order: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Show single order details.
     */
    public function show($id)
    {
        $order = Order::with(['customer', 'laundryShop', 'deliveryPartner'])->find($id);

        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Order not found'], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Order details retrieved',
            'data'    => $order,
        ]);
    }

    /**
     * Cancel an order.
     */
    public function cancel(Request $request, $id)
    {
        $order = Order::findOrFail($id);
        $order->status = 'CANCELLED';
        $order->cancellation_reason = $request->input('reason', 'Cancelled by user');
        $order->save();

        DB::table('order_status_logs')->insert([
            'order_id'   => $order->id,
            'status'     => 'CANCELLED',
            'notes'      => $order->cancellation_reason,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Order cancelled successfully',
            'data'    => $order,
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
            'laundry_shop_id'  => $order->shop_id,
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
}
`;

function writeFiles(dir) {
    fs.mkdirSync(path.join(dir, 'app', 'Models'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'app', 'Models', 'Order.php'), orderModelCode);

    const v1Path = path.join(dir, 'app', 'Http', 'Controllers', 'Api', 'V1');
    fs.mkdirSync(v1Path, { recursive: true });
    fs.writeFileSync(path.join(v1Path, 'OrderController.php'), orderControllerCode);
}

writeFiles(targetDir1);
writeFiles(targetDir2);
console.log('Fixed Order model & controller written to target1 & target2');
