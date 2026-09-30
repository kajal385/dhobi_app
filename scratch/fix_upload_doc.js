const fs = require('fs');

// 1. Fix LaundryOwnerController.php
const ownerPath = 'C:/xampp/htdocs/dhobi_backend/app/Http/Controllers/Api/V1/LaundryOwnerController.php';
let ownerCode = fs.readFileSync(ownerPath, 'utf8');

const oldOwnerDoc = /public function uploadDocument\(Request \$request\)[\s\S]*?return response\(\)->json\(\[\s*'success' => true,[\s\S]*?\}\);[\s\S]*?\}/;

const newOwnerDoc = `public function uploadDocument(Request $request)
    {
        $laundryId = $request->input('shop_id') ?? $request->input('laundry_id') ?? 1;
        $filePath = $request->input('file_path') ?? $request->input('document_url') ?? 'https://via.placeholder.com/600';
        
        $docId = DB::table('laundry_documents')->insertGetId([
            'laundry_id'          => $laundryId,
            'document_type'       => $request->input('document_type', 'GST_CERTIFICATE'),
            'document_number'     => $request->input('document_number', 'GST12345'),
            'file_path'           => $filePath,
            'verification_status' => 'pending',
            'uploaded_at'         => now(),
            'created_at'          => now(),
            'updated_at'          => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Document submitted for admin verification',
            'data'    => ['id' => $docId, 'laundry_id' => $laundryId, 'file_path' => $filePath],
        ]);
    }`;

ownerCode = ownerCode.replace(oldOwnerDoc, newOwnerDoc);
fs.writeFileSync(ownerPath, ownerCode, 'utf8');

// 2. Fix AdminDashboardController.php
const adminPath = 'C:/xampp/htdocs/dhobi_backend/app/Http/Controllers/Api/V1/AdminDashboardController.php';
let adminCode = fs.readFileSync(adminPath, 'utf8');

adminCode = adminCode.replace("where('laundry_id', $shop->id)->orWhere('laundry_shop_id', $shop->id)", "where('laundry_id', $shop->id)");
adminCode = adminCode.replace("'status'              => 'approved',", "");

fs.writeFileSync(adminPath, adminCode, 'utf8');
console.log('Successfully updated LaundryOwnerController and AdminDashboardController!');
