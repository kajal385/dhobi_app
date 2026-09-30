<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class CommissionController extends Controller
{
    /**
     * Get platform commission configuration rules.
     */
    public function index()
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'cityCommissions' => [
                    ['id' => 'CC-01', 'city' => 'Pune', 'commissionPercentage' => 12.0, 'status' => 'ACTIVE'],
                    ['id' => 'CC-02', 'city' => 'Mumbai', 'commissionPercentage' => 15.0, 'status' => 'ACTIVE'],
                    ['id' => 'CC-03', 'city' => 'Bengaluru', 'commissionPercentage' => 14.0, 'status' => 'ACTIVE'],
                    ['id' => 'CC-04', 'city' => 'Delhi NCR', 'commissionPercentage' => 12.5, 'status' => 'ACTIVE'],
                ],
                'categoryCommissions' => [
                    ['id' => 'CAT-01', 'category' => 'Wash & Fold', 'commissionPercentage' => 10.0],
                    ['id' => 'CAT-02', 'category' => 'Wash & Iron', 'commissionPercentage' => 12.0],
                    ['id' => 'CAT-03', 'category' => 'Dry Cleaning', 'commissionPercentage' => 18.0],
                    ['id' => 'CAT-04', 'category' => 'Steam Iron', 'commissionPercentage' => 15.0],
                ],
            ],
        ]);
    }

    /**
     * Update City Commission rate.
     */
    public function updateCityCommission(Request $request, $id)
    {
        return response()->json([
            'success' => true,
            'message' => 'City commission updated successfully',
            'rate'    => $request->input('commissionPercentage'),
        ]);
    }
}
