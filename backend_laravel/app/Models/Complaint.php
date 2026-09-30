<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
