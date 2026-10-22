<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\FcmDeviceToken;
use Illuminate\Http\Request;

class FcmTokenController extends Controller
{
    /**
     * Register or update an FCM device token
     */
    public function register(Request $request)
    {
        $request->validate([
            'token'       => 'required|string',
            'device_type' => 'nullable|string|in:android,ios,web',
            'app_type'    => 'nullable|string|in:customer,owner,delivery,admin',
            'device_name' => 'nullable|string|max:255',
            'user_id'     => 'nullable|integer',
        ]);

        $tokenStr = trim($request->input('token'));
        $userId   = $request->input('user_id') ?? auth()->id();
        $device   = strtolower($request->input('device_type', 'android'));
        $appType  = strtolower($request->input('app_type', 'customer'));
        $devName  = $request->input('device_name', null);

        // Update or insert device token record
        $deviceToken = FcmDeviceToken::updateOrCreate(
            ['token' => $tokenStr],
            [
                'user_id'      => $userId,
                'device_type'  => $device,
                'app_type'     => $appType,
                'device_name'  => $devName,
                'is_active'    => true,
                'last_used_at' => now(),
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'FCM device token registered successfully',
            'data'    => [
                'token_id'    => $deviceToken->id,
                'user_id'     => $deviceToken->user_id,
                'device_type' => $deviceToken->device_type,
                'app_type'    => $deviceToken->app_type,
            ],
        ]);
    }

    /**
     * De-register an FCM device token on user logout
     */
    public function remove(Request $request)
    {
        $tokenStr = trim($request->input('token', ''));
        $userId   = $request->input('user_id') ?? auth()->id();

        if ($tokenStr) {
            FcmDeviceToken::where('token', $tokenStr)->update(['is_active' => false]);
        } elseif ($userId) {
            FcmDeviceToken::where('user_id', $userId)->update(['is_active' => false]);
        }

        return response()->json([
            'success' => true,
            'message' => 'FCM device token de-registered successfully',
        ]);
    }
}
