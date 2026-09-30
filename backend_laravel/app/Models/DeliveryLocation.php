<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
