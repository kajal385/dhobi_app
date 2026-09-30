<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
