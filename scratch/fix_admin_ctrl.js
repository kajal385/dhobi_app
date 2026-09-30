const fs = require('fs');

const adminPath = 'C:/xampp/htdocs/dhobi_backend/app/Http/Controllers/Api/V1/AdminDashboardController.php';
let adminCode = fs.readFileSync(adminPath, 'utf8');

adminCode = adminCode.replace(
  "DB::table('laundry_documents')\n            ->where('laundry_id', $shop->id)\n            ->orWhere('laundry_shop_id', $shop->id)",
  "DB::table('laundry_documents')\n            ->where('laundry_id', $shop->id)"
);

adminCode = adminCode.replace(
  "->where('laundry_id', $shop->id)\n            ->orWhere('laundry_shop_id', $shop->id)",
  "->where('laundry_id', $shop->id)"
);

fs.writeFileSync(adminPath, adminCode, 'utf8');
console.log('Successfully updated AdminDashboardController.php!');
