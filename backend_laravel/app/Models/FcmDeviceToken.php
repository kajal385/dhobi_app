<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FcmDeviceToken extends Model
{
    use HasFactory;

    protected $table = 'fcm_device_tokens';

    protected $fillable = [
        'user_id',
        'token',
        'device_type',
        'app_type',
        'device_name',
        'is_active',
        'last_used_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_used_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
