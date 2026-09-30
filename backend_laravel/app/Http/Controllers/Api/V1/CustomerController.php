<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    /**
     * Get list of all registered customers.
     */
    public function index()
    {
        $customers = User::where('role', 'customer')
            ->select('id', 'name', 'phone', 'email', 'city', 'status', 'created_at')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Customers retrieved successfully',
            'data'    => $customers,
        ]);
    }

    /**
     * Toggle Customer Account Status (ACTIVE / SUSPENDED)
     */
    public function toggleStatus(Request $request, $id)
    {
        $user = User::where('role', 'customer')->findOrFail($id);
        $user->status = $request->input('status', 'ACTIVE');
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Customer status updated to ' . $user->status,
            'data'    => $user,
        ]);
    }
}
