<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceItem extends Model
{
    use HasFactory;

    protected $table = 'service_items';

    protected $fillable = [
        'shop_service_id',
        'name',
        'icon',
        'image',
        'pricing_type',
        'price_per_piece',
        'price_per_kg',
        'min_quantity',
        'description',
        'is_active',
        'sort_order'
    ];

    public function shopService()
    {
        return $this->belongsTo(ShopService::class, 'shop_service_id');
    }
}
