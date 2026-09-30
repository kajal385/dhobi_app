const fs = require('fs');

// 1. Update LaundryOwnerController.php orders method
const ownerCtrlPath = 'C:/xampp/htdocs/dhobi_backend/app/Http/Controllers/Api/V1/LaundryOwnerController.php';
let ownerCode = fs.readFileSync(ownerCtrlPath, 'utf8');

const oldOrders = /public function orders\(Request \$request\)[\s\S]*?return response\(\)->json\(\[\s*'success' => true,[\s\S]*?\}\);[\s\S]*?\}/;

const newOrders = `public function orders(Request $request)
    {
        $shopId = $request->input('shop_id', 1);
        $orders = Order::where(function($q) use ($shopId) {
            $q->where('shop_id', $shopId)->orWhereNull('shop_id');
        })
        ->with(['customer', 'laundryShop', 'deliveryPartner'])
        ->orderBy('created_at', 'desc')
        ->get()
        ->map(function($ord) {
            $ord->items = DB::table('order_items')->where('order_id', $ord->id)->get();
            return $ord;
        });

        return response()->json([
            'success' => true,
            'message' => 'Owner orders retrieved from MySQL database (dhobi_db)',
            'data'    => $orders,
        ]);
    }`;

ownerCode = ownerCode.replace(oldOrders, newOrders);
fs.writeFileSync(ownerCtrlPath, ownerCode, 'utf8');
console.log('Successfully updated LaundryOwnerController.php orders method!');
