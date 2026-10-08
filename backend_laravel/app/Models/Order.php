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
        'shop_id',
        'delivery_boy_id',
        'address_id',
        'pickup_address_id',
        'delivery_address_id',
        
        // Pricing & Charges
        'subtotal',
        'amount',
        'pickup_charge',
        'delivery_charge',
        'delivery_fee',
        'discount_amount',
        'discount',
        'wallet_used',
        'total_amount',
        'total',
        'tax_amount',
        'commission_amount',
        'laundry_earnings',
        
        // Status & Payment
        'status',
        'payment_method',
        'payment_status',
        
        // Logistics & Scheduling
        'service_type',
        'pickup_address',
        'delivery_address',
        'pickup_date',
        'pickup_time_label',
        'pickup_scheduled_at',
        'picked_up_at',
        'delivery_date',
        'delivery_time_label',
        'delivery_scheduled_at',
        'delivered_at',
        
        // OTPs & Tracking
        'pickup_otp',
        'delivery_otp',
        'delivery_otp_verified',
        
        // Miscellaneous
        'city',
        'notes',
        'special_instructions',
        'pickup_photo_url',
        'delivery_photo_url',
        'digital_signature_url',
        'customer_available',
        'customer_availability_notes',
        'is_express',
        'express_charge',
        'estimated_ready_at',
        
        // Cancellations & Reviews
        'cancelled_at',
        'cancellation_reason',
        'cancel_reason',
        'cancelled_by',
        'rating',
        'review'
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
        return $this->belongsTo(DeliveryBoy::class, 'delivery_boy_id', 'user_id');
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

    protected $appends = ['delivery_boy_name', 'deliveryBoyName', 'customer_name', 'shop_name'];

    public function getDeliveryBoyNameAttribute()
    {
        if ($this->relationLoaded('deliveryBoyUser') && $this->deliveryBoyUser) {
            return $this->deliveryBoyUser->name;
        }
        if ($this->relationLoaded('deliveryPartner') && $this->deliveryPartner) {
            $partner = $this->deliveryPartner;
            if ($partner->relationLoaded('user') && $partner->user) {
                return $partner->user->name;
            }
            if (!empty($partner->name)) {
                return $partner->name;
            }
        }
        if (!empty($this->delivery_boy_id)) {
            $user = User::find($this->delivery_boy_id);
            if ($user) return $user->name;
            $dbBoy = DeliveryBoy::with('user')->find($this->delivery_boy_id);
            if ($dbBoy && $dbBoy->user) return $dbBoy->user->name;
        }
        return 'Unassigned';
    }

    public function getDeliveryBoyNameCamelAttribute()
    {
        return $this->getDeliveryBoyNameAttribute();
    }

    public function getCustomerNameAttribute()
    {
        if ($this->relationLoaded('customer') && $this->customer) {
            return $this->customer->name;
        }
        return 'Customer';
    }

    public function getShopNameAttribute()
    {
        if ($this->relationLoaded('laundryShop') && $this->laundryShop) {
            return $this->laundryShop->name;
        }
        return 'Laundry Shop';
    }
}
