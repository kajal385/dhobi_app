const fs = require('fs');

const filePath = 'C:/xampp/htdocs/dhobi_backend/app/Http/Controllers/Api/V1/OrderController.php';
let code = fs.readFileSync(filePath, 'utf8');

const oldStoreRegex = /public function store\(Request \$request\)[\s\S]*?return response\(\)->json\(\[\s*'success' => false,[\s\S]*?\}\n    \}/;

const newStoreCode = `public function store(Request $request)
    {
        $request->validate([
            'shop_id'      => 'nullable|integer',
            'total_amount' => 'required|numeric',
            'items'        => 'nullable|array',
        ]);

        DB::beginTransaction();
        try {
            // Find or create customer record for walk-in / manual booking
            $userId = $request->input('user_id');
            if (!$userId && ($request->input('customer_mobile') || $request->input('customer_name') || $request->input('mobile'))) {
                $phone = $request->input('customer_mobile') ?? $request->input('mobile') ?? '9876543210';
                $name = $request->input('customer_name') ?? 'Walk-in Customer';
                
                $user = DB::table('users')->where('phone', $phone)->first();
                if (!$user) {
                    $userId = DB::table('users')->insertGetId([
                        'uuid'       => (string) Str::uuid(),
                        'name'       => $name,
                        'phone'      => $phone,
                        'email'      => Str::slug($name) . rand(100,999) . '@dhobipro.com',
                        'is_active'  => 1,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } else {
                    $userId = $user->id;
                }
            }

            if (!$userId) {
                $userId = auth()->id() ?? 1;
            }

            $order = new Order();
            $order->uuid = (string) Str::uuid();
            $order->order_number = 'ORD-' . strtoupper(Str::random(6));
            $order->user_id = $userId;
            $order->shop_id = $request->input('shop_id', 1);
            $order->status = strtoupper($request->input('status', 'RECEIVED'));
            $order->payment_status = strtoupper($request->input('payment_status', 'PENDING'));
            $order->payment_method = strtolower($request->input('payment_method', 'cod'));
            $order->subtotal = $request->input('subtotal', $request->input('total_amount'));
            $order->pickup_charge = $request->input('pickup_charge', 0);
            $order->delivery_charge = $request->input('delivery_charge', 0);
            $order->tax_amount = $request->input('tax_amount', 0);
            $order->discount_amount = $request->input('discount_amount', 0);
            $order->total_amount = $request->input('total_amount');
            $order->pickup_address = $request->input('pickup_address', $request->input('address', 'Walk-in Customer Address'));
            $order->pickup_date = $request->input('pickup_date', now()->format('Y-m-d'));
            $order->pickup_time_label = $request->input('due_time', 'Evening');
            $order->special_instructions = $request->input('notes');
            $order->save();

            // Store items if provided
            if ($request->has('items') && is_array($request->input('items'))) {
                foreach ($request->input('items') as $item) {
                    DB::table('order_items')->insert([
                        'order_id'       => $order->id,
                        'service_name'   => $item['name'] ?? 'Laundry Service',
                        'item_name'      => $item['name'] ?? 'Laundry Item',
                        'unit_price'     => $item['unit_price'] ?? 50,
                        'quantity'       => $item['quantity'] ?? 1,
                        'total_price'    => $item['total_price'] ?? 50,
                        'created_at'     => now(),
                        'updated_at'     => now(),
                    ]);
                }
            }

            // Record status log
            DB::table('order_status_logs')->insert([
                'order_id'    => $order->id,
                'status'      => 'RECEIVED',
                'title'       => 'Walk-in Order Created',
                'description' => 'Walk-in / Manual order created by Laundry Partner',
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Walk-in Order saved successfully in MySQL database (dhobi_db)!',
                'data'    => $order,
            ], 201);
        } catch (\\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to store walk-in order: ' . $e->getMessage(),
            ], 500);
        }
    }`;

if (oldStoreRegex.test(code)) {
  code = code.replace(oldStoreRegex, newStoreCode);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Successfully updated OrderController.php store method!');
} else {
  console.log('Regex did not match OrderController.php store method.');
}
