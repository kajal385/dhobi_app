<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DeliveryBoy extends Model
{
    use HasFactory;

    protected $table = 'delivery_boys';

    protected $fillable = [
        'user_id',
        'shop_id',           // Which laundry shop created / owns this delivery boy
        'vehicle_number',
        'vehicle_type',
        'license_number',
        'is_online',
        'current_latitude',
        'current_longitude',
        'rating',
        'total_deliveries',
        'completed_orders_count',
        'active_orders_count',
        'verification_status',
        'status',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function laundryShop()
    {
        return $this->belongsTo(LaundryShop::class, 'shop_id');
    }
}
