<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LaundryShop extends Model
{
    use HasFactory;

    protected $table = 'laundry_shops';

    protected $fillable = [
        'uuid',
        'slug',
        'owner_id',
        'name',
        'shop_name',
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
        'bank_name',
        'bank_account',
        'ifsc_code',
        'account_holder',
        'upi_id',
        'verification_status',
        'is_verified',
        'is_active',
        'is_open',
        'account_status',
        'total_orders',
        'rating',
        'review_count',
        'min_order_amount',
        'pickup_charge',
        'delivery_charge',
        'free_delivery_above',
        'estimated_delivery_hours',
        'is_featured',
        'offers_express_delivery',
        'offers_same_day',
        'offers_free_pickup',
        'offers_free_delivery',
        'cod_available',
        'offers_subscription',
        'logo_url',
        'cover_url',
        'shop_photos',
        'id_proof_number',
        'id_proof_photo',
        'business_proof_number',
        'business_proof_photo',
        'pickup_radius_km',
        'working_hours',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function documents()
    {
        return $this->hasMany(LaundryDocument::class, 'laundry_id');
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'shop_id');
    }
}
