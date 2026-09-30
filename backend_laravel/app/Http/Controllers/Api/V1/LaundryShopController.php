<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\LaundryShop;
use Illuminate\Http\Request;

class LaundryShopController extends Controller
{
    /**
     * Get list of verified laundry shops.
     */
    public function index()
    {
        $shops = LaundryShop::with('owner')->get();

        return response()->json([
            'success' => true,
            'message' => 'Laundries retrieved successfully',
            'data'    => $shops,
        ]);
    }

    /**
     * Verification Queue
     */
    public function verificationQueue()
    {
        $queue = LaundryShop::where('verification_status', 'PENDING')
            ->orWhere('verification_status', 'DOCS_REQUIRED')
            ->with('owner')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Verification queue retrieved',
            'data'    => $queue,
        ]);
    }

    /**
     * Approve Laundry Verification
     */
    public function approve($id)
    {
        $shop = LaundryShop::findOrFail($id);
        $shop->verification_status = 'APPROVED';
        $shop->save();

        return response()->json([
            'success' => true,
            'message' => 'Laundry shop approved successfully',
            'data'    => $shop,
        ]);
    }

    /**
     * Reject Laundry Verification
     */
    public function reject(Request $request, $id)
    {
        $shop = LaundryShop::findOrFail($id);
        $shop->verification_status = 'REJECTED';
        $shop->save();

        return response()->json([
            'success' => true,
            'message' => 'Laundry shop registration rejected',
            'data'    => $shop,
            'reason'  => $request->input('reason', 'Verification rejected'),
        ]);
    }
}
