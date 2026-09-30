<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Order extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'orders';

    protected $fillable = [
        'uuid',
        'order_number',
        'user_id',
        'customer_id',
        'shop_id',
        'laundry_shop_id',
        'delivery_boy_id',
        'delivery_partner_id',
        'address_id',
        'subtotal',
        'amount',
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
        'delivery_address',
        'pickup_date',
        'delivery_date',
        'city',
        'notes',
        'pickup_photo_url',
        'delivery_photo_url',
        'digital_signature_url',
        'customer_available',
        'customer_availability_notes',
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

    public function deliveryBoyUser()
    {
        return $this->belongsTo(User::class, 'delivery_boy_id');
    }

    public function statusHistory()
    {
        return $this->hasMany(OrderStatusHistory::class, 'order_id')->orderBy('created_at', 'asc');
    }

    public function assignments()
    {
        return $this->hasMany(DeliveryAssignment::class, 'order_id');
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class, 'order_id');
    }
}
