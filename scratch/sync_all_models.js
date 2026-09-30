const fs = require('fs');
const path = require('path');

const target1 = 'C:\\xampp\\htdocs\\dhobi_backend\\app\\Models';
const target2 = 'c:\\CODEXXA_PROJECT\\Dhobi_app\\backend_laravel\\app\\Models';

const models = {
  'LaundryShop.php': `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Database\\Eloquent\\Model;

class LaundryShop extends Model
{
    use HasFactory;

    protected $table = 'laundry_shops';

    protected $fillable = [
        'uuid',
        'slug',
        'owner_id',
        'name',
        'owner_name',
        'city',
        'state',
        'pincode',
        'address',
        'latitude',
        'longitude',
        'phone',
        'email',
        'gst_number',
        'bank_account',
        'ifsc_code',
        'verification_status',
        'is_verified',
        'is_active',
        'subscription_plan',
        'gross_revenue',
        'commission_paid',
        'total_orders',
        'rating',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'shop_id');
    }
}
`,

  'Order.php': `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\SoftDeletes;

class Order extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'orders';

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
`,

  'DeliveryBoy.php': `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Database\\Eloquent\\Model;

class DeliveryBoy extends Model
{
    use HasFactory;

    protected $table = 'delivery_boys';

    protected $fillable = [
        'user_id',
        'vehicle_number',
        'vehicle_type',
        'license_number',
        'is_online',
        'current_latitude',
        'current_longitude',
        'rating',
        'total_deliveries',
        'status',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
`,

  'DeliveryAssignment.php': `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Database\\Eloquent\\Model;

class DeliveryAssignment extends Model
{
    use HasFactory;

    protected $table = 'delivery_assignments';

    protected $fillable = [
        'order_id',
        'delivery_boy_id',
        'assignment_type',
        'status',
        'assigned_at',
        'accepted_at',
        'completed_at',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function deliveryBoy()
    {
        return $this->belongsTo(DeliveryBoy::class);
    }
}
`,

  'DeliveryLocation.php': `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Database\\Eloquent\\Model;

class DeliveryLocation extends Model
{
    use HasFactory;

    protected $table = 'delivery_locations';

    protected $fillable = [
        'delivery_boy_id',
        'latitude',
        'longitude',
        'recorded_at',
    ];
}
`,

  'LaundryDocument.php': `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Database\\Eloquent\\Model;

class LaundryDocument extends Model
{
    use HasFactory;

    protected $table = 'laundry_documents';

    protected $fillable = [
        'laundry_shop_id',
        'document_type',
        'document_number',
        'document_url',
        'status',
        'rejection_reason',
    ];
}
`,

  'Refund.php': `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Database\\Eloquent\\Model;

class Refund extends Model
{
    use HasFactory;

    protected $table = 'refunds';

    protected $fillable = [
        'order_id',
        'user_id',
        'amount',
        'reason',
        'status',
        'processed_by',
        'processed_at',
        'transaction_ref',
    ];
}
`,

  'Complaint.php': `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Database\\Eloquent\\Model;

class Complaint extends Model
{
    use HasFactory;

    protected $table = 'complaints';

    protected $fillable = [
        'ticket_number',
        'user_id',
        'order_id',
        'laundry_shop_id',
        'subject',
        'description',
        'priority',
        'status',
        'resolution_notes',
    ];
}
`
};

function saveModels(dir) {
    fs.mkdirSync(dir, { recursive: true });
    for (const [filename, content] of Object.entries(models)) {
        fs.writeFileSync(path.join(dir, filename), content);
    }
}

saveModels(target1);
saveModels(target2);
console.log('Synced all models to target1 and target2');
