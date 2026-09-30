const fs = require('fs');

// 1. Update LaundryShop.php model
const shopModelPath = 'C:/xampp/htdocs/dhobi_backend/app/Models/LaundryShop.php';
let shopModelCode = fs.readFileSync(shopModelPath, 'utf8');

if (!shopModelCode.includes('public function documents()')) {
  const relCode = `
    public function documents()
    {
        return $this->hasMany(LaundryDocument::class, 'laundry_id');
    }
`;
  shopModelCode = shopModelCode.replace(/public function owner\(\)[\s\S]*?\}\n/, (m) => m + relCode);
  fs.writeFileSync(shopModelPath, shopModelCode, 'utf8');
  console.log('Updated LaundryShop model with documents relationship!');
}

// 2. Update AdminDashboardController.php
const adminCtrlPath = 'C:/xampp/htdocs/dhobi_backend/app/Http/Controllers/Api/V1/AdminDashboardController.php';
let adminCode = fs.readFileSync(adminCtrlPath, 'utf8');

// Update laundries query
adminCode = adminCode.replace(
  "LaundryShop::with('owner')",
  "LaundryShop::with(['owner', 'documents'])"
);

// Update approveLaundry
const approveOld = /public function approveLaundry\(\$id\)[\s\S]*?return response\(\)->json\(\['success' => true, 'message' => 'Laundry shop approved successfully'\]\);[\s\S]*?\}/;
const approveNew = `public function approveLaundry(Request $request, $id)
    {
        $shop = LaundryShop::findOrFail($id);
        $shop->verification_status = 'approved';
        $shop->is_verified = 1;
        $shop->is_active = 1;
        $shop->save();

        // Update document status and verification timestamp
        DB::table('laundry_documents')
            ->where('laundry_id', $shop->id)
            ->orWhere('laundry_shop_id', $shop->id)
            ->update([
                'verification_status' => 'approved',
                'status'              => 'approved',
                'verified_at'         => now(),
            ]);

        // Insert audit verification record
        DB::table('laundry_verifications')->insert([
            'laundry_id'      => $shop->id,
            'admin_id'        => auth()->id() ?? 1,
            'action'          => 'APPROVE',
            'previous_status' => 'pending',
            'new_status'      => 'approved',
            'notes'           => $request->input('notes', 'Approved by Admin Web Panel'),
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Laundry shop approved successfully! It is now live in Customer App.',
            'data'    => $shop,
        ]);
    }`;

if (approveOld.test(adminCode)) {
  adminCode = adminCode.replace(approveOld, approveNew);
  console.log('Updated approveLaundry method in AdminDashboardController.php!');
}

fs.writeFileSync(adminCtrlPath, adminCode, 'utf8');
console.log('Saved AdminDashboardController.php!');
