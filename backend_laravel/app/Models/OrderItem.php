<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    use HasFactory;

    protected $table = 'order_items';

    protected $fillable = [
        'order_id',
        'service_name',
        'item_name',
        'unit_price',
        'quantity',
        'total_price',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }
}
