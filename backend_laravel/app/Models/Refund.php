<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Refund extends Model
{
    use HasFactory;

    protected $table = 'refunds';

    protected $fillable = [
        'order_id',
        'user_id',
        'amount',
        'reason',
        'status',
        'processed_by',
        'processed_at',
        'transaction_ref',
    ];
}
