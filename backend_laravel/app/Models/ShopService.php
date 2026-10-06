<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ShopService extends Model
{
    use HasFactory;

    protected $table = 'shop_services';

    protected $fillable = [
        'shop_id',
        'category_id',
        'name',
        'description',
        'icon',
        'image',
        'estimated_hours',
        'is_active',
        'sort_order'
    ];

    public function items()
    {
        return $this->hasMany(ServiceItem::class, 'shop_service_id');
    }

    public function shop()
    {
        return $this->belongsTo(LaundryShop::class, 'shop_id');
    }

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }
}
