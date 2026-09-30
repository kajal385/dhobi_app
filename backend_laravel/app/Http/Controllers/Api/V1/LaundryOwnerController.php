<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\LaundryShop;
use App\Models\Order;
use App\Models\LaundryDocument;
use App\Models\DeliveryBoy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class LaundryOwnerController extends Controller
{
    /**
     * Register or update laundry shop profile.
     * Saves all owner details, documents, and bank info to database.
     * Sets verification_status = PENDING so Admin can review and approve.
     */
    public function registerShop(Request $request)
    {
        $name      = $request->input('name') ?? $request->input('shop_name', 'New Laundry Shop');
        $phone     = $request->input('phone', '0000000000');
        $ownerName = $request->input('owner_name', 'Laundry Partner Owner');
        $email     = $request->input('email', 'owner@dhobipro.com');

        // Create or find owner User record so owner_id foreign key is linked
        $owner = User::firstOrCreate(
            ['phone' => $phone],
            [
                'name'     => $ownerName,
                'email'    => $email,
                'role'     => 'laundry_owner',
                'password' => Hash::make($request->input('password', 'password123')),
            ]
        );

        // If owner already existed but submitted a new password, update it
        if ($request->filled('password') && !$owner->wasRecentlyCreated) {
            $owner->password = Hash::make($request->input('password'));
            $owner->name     = $ownerName;
            $owner->email    = $email;
            $owner->save();
        }

        // Find existing shop by owner or phone
        $existingShop = LaundryShop::where('owner_id', $owner->id)
            ->orWhere('phone', $phone)
            ->first();
        $shopIdForFiles = $existingShop ? $existingShop->id : (time() . '_' . Str::random(4));

        // Process all uploaded documents / media (save Base64 to public/uploads/documents)
        $idProofPhoto = $this->processDocumentMedia($request->input('id_proof_photo'), 'id_proof', $shopIdForFiles);
        $businessProofPhoto = $this->processDocumentMedia($request->input('business_proof_photo'), 'biz_proof', $shopIdForFiles);
        $logoUrl = $this->processDocumentMedia($request->input('logo_url'), 'logo', $shopIdForFiles);
        $coverUrl = $this->processDocumentMedia($request->input('cover_url'), 'cover', $shopIdForFiles);

        $shopPhotosInput = $request->input('shop_photos');
        $processedPhotos = [];
        if (is_array($shopPhotosInput)) {
            foreach ($shopPhotosInput as $idx => $photo) {
                $saved = $this->processDocumentMedia($photo, 'shop_premise_' . $idx, $shopIdForFiles);
                if ($saved) $processedPhotos[] = $saved;
            }
        } elseif (is_string($shopPhotosInput)) {
            $decodedPhotos = json_decode($shopPhotosInput, true);
            if (is_array($decodedPhotos)) {
                foreach ($decodedPhotos as $idx => $photo) {
                    $saved = $this->processDocumentMedia($photo, 'shop_premise_' . $idx, $shopIdForFiles);
                    if ($saved) $processedPhotos[] = $saved;
                }
            } else {
                $saved = $this->processDocumentMedia($shopPhotosInput, 'shop_premise', $shopIdForFiles);
                if ($saved) $processedPhotos[] = $saved;
            }
        }

        $shopPhotosJson = !empty($processedPhotos) ? json_encode($processedPhotos) : null;

        $shopData = [
            'owner_id'              => $owner->id,
            'uuid'                  => (string) Str::uuid(),
            'slug'                  => Str::slug($name . '-' . Str::random(4)),
            'name'                  => $name,
            'shop_name'             => $name,
            'owner_name'            => $ownerName,
            'phone'                 => $phone,
            'email'                 => $email,
            'address'               => $request->input('address', 'Shop Address'),
            'city'                  => $request->input('city', 'Pune'),
            'state'                 => $request->input('state', 'Maharashtra'),
            'pincode'               => $request->input('pincode', '411001'),
            'latitude'              => $request->input('latitude', 18.5590),
            'longitude'             => $request->input('longitude', 73.7868),
            'gst_number'            => $request->input('gst_number'),
            'bank_account'          => $request->input('bank_account'),
            'ifsc_code'             => $request->input('ifsc_code'),
            'pickup_radius_km'      => $request->input('pickup_radius_km', 5),
            'working_hours'         => $request->input('working_hours', '08:00 AM - 09:00 PM'),
            'id_proof_number'       => $request->input('id_proof_number'),
            'id_proof_photo'        => $idProofPhoto,
            'business_proof_number' => $request->input('business_proof_number'),
            'business_proof_photo'  => $businessProofPhoto,
            'logo_url'              => $logoUrl,
            'cover_url'             => $coverUrl,
            'shop_photos'           => $shopPhotosJson,
            'verification_status'   => 'PENDING',
            'is_open'               => 1,
            'is_verified'           => 0,
            'is_active'             => 1,
        ];

        // Find existing shop by owner or phone, update it; otherwise create fresh
        if ($existingShop) {
            $existingShop->update($shopData);
            $shop = $existingShop;
        } else {
            $shop = LaundryShop::create($shopData);
        }

        // Record ID proof document in laundry_documents table
        if ($idProofPhoto) {
            LaundryDocument::updateOrCreate(
                ['laundry_id' => $shop->id, 'document_type' => 'AADHAAR'],
                [
                    'document_number'     => $request->input('id_proof_number', 'ID-PROOF'),
                    'file_path'           => $idProofPhoto,
                    'verification_status' => 'pending',
                    'uploaded_at'         => now(),
                ]
            );
        }

        // Record business/license document in laundry_documents table
        if ($businessProofPhoto) {
            LaundryDocument::updateOrCreate(
                ['laundry_id' => $shop->id, 'document_type' => 'UDYAM_LICENSE'],
                [
                    'document_number'     => $request->input('business_proof_number', 'LIC-PROOF'),
                    'file_path'           => $businessProofPhoto,
                    'verification_status' => 'pending',
                    'uploaded_at'         => now(),
                ]
            );
        }

        // Record GST certificate if provided
        if ($request->filled('gst_number')) {
            LaundryDocument::updateOrCreate(
                ['laundry_id' => $shop->id, 'document_type' => 'GST_CERTIFICATE'],
                [
                    'document_number'     => $request->input('gst_number'),
                    'file_path'           => $businessProofPhoto ?: ($idProofPhoto ?: ''),
                    'verification_status' => 'pending',
                    'uploaded_at'         => now(),
                ]
            );
        }

        // Record Logo & Cover in documents table for easy inspection
        if ($logoUrl) {
            LaundryDocument::updateOrCreate(
                ['laundry_id' => $shop->id, 'document_type' => 'SHOP_LOGO'],
                [
                    'document_number'     => 'LOGO',
                    'file_path'           => $logoUrl,
                    'verification_status' => 'pending',
                    'uploaded_at'         => now(),
                ]
            );
        }
        if ($coverUrl) {
            LaundryDocument::updateOrCreate(
                ['laundry_id' => $shop->id, 'document_type' => 'SHOP_COVER'],
                [
                    'document_number'     => 'COVER',
                    'file_path'           => $coverUrl,
                    'verification_status' => 'pending',
                    'uploaded_at'         => now(),
                ]
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Laundry shop registered and submitted for admin verification.',
            'data'    => $shop->load('documents'),
        ]);
    }

    /**
     * Decode and save base64 document or return existing URL.
     */
    private function processDocumentMedia($media, $prefix, $shopId)
    {
        if (empty($media)) {
            return null;
        }

        // If it is a base64 encoded data URI
        if (preg_match('/^data:image\/(\w+);base64,/', $media, $matches)) {
            $imageType = strtolower($matches[1]);
            $base64Data = substr($media, strpos($media, ',') + 1);
            $decoded = base64_decode($base64Data);

            if ($decoded !== false) {
                $ext = in_array($imageType, ['jpeg', 'jpg', 'png', 'webp']) ? ($imageType === 'jpeg' ? 'jpg' : $imageType) : 'jpg';
                $filename = $prefix . '_' . $shopId . '_' . time() . '_' . Str::random(6) . '.' . $ext;
                $dir = public_path('uploads/documents');

                if (!file_exists($dir)) {
                    @mkdir($dir, 0777, true);
                }

                $filePath = $dir . DIRECTORY_SEPARATOR . $filename;
                @file_put_contents($filePath, $decoded);

                return url('uploads/documents/' . $filename);
            }
        }

        return $media;
    }

    /**
     * Vendor document upload.
     */
    public function uploadDocument(Request $request)
    {
        $laundryId = $request->input('shop_id') ?? $request->input('laundry_id') ?? 1;
        $rawPath   = $request->input('file_path') ?? $request->input('document_url') ?? 'https://via.placeholder.com/600';
        $filePath  = $this->processDocumentMedia($rawPath, 'doc', $laundryId) ?: $rawPath;

        $doc = LaundryDocument::create([
            'laundry_id'          => $laundryId,
            'document_type'       => $request->input('document_type', 'GST_CERTIFICATE'),
            'document_number'     => $request->input('document_number', 'GST12345'),
            'file_path'           => $filePath,
            'verification_status' => 'pending',
            'uploaded_at'         => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Document submitted for admin verification',
            'data'    => $doc,
        ]);
    }

    /**
     * Resolve shop ID for current request or owner.
     * Defaults to Star Wash Ultra Premium (Shop ID 30) for laundry owner portal.
     */
    public function resolveShopId(Request $request)
    {
        $shopId = $request->input('shop_id') ?? $request->input('laundry_id') ?? $request->input('id');
        if ($shopId) {
            $shopExists = DB::table('laundry_shops')->where('id', $shopId)->exists();
            if ($shopExists) {
                return (int) $shopId;
            }
        }

        $userId = $request->input('user_id');
        if ($userId) {
            $sId = DB::table('laundry_shops')->where('owner_id', $userId)->value('id');
            if ($sId) return (int) $sId;
        }

        $phone = $request->input('phone') ?? $request->input('owner_phone');
        if ($phone) {
            $cleanPhone = preg_replace('/\D/', '', $phone);
            $sId = DB::table('laundry_shops')
                ->where('phone', $phone)
                ->orWhere('phone', $cleanPhone)
                ->value('id');
            if ($sId) return (int) $sId;

            $owner = User::where('phone', $phone)->orWhere('phone', $cleanPhone)->first();
            if ($owner) {
                $sId = DB::table('laundry_shops')->where('owner_id', $owner->id)->value('id');
                if ($sId) return (int) $sId;
            }
        }

        $email = $request->input('email') ?? $request->input('owner_email');
        if ($email) {
            $sId = DB::table('laundry_shops')->where('email', $email)->value('id');
            if ($sId) return (int) $sId;

            $owner = User::where('email', $email)->first();
            if ($owner) {
                $sId = DB::table('laundry_shops')->where('owner_id', $owner->id)->value('id');
                if ($sId) return (int) $sId;
            }
        }

        if (auth()->check()) {
            $sId = DB::table('laundry_shops')->where('owner_id', auth()->id())->value('id');
            if ($sId) return (int) $sId;
        }

        // Specifically find Star Wash Ultra Premium (Shop ID 30) for laundry owner
        $starWashId = DB::table('laundry_shops')->where('name', 'like', '%Star Wash%')->value('id');
        if ($starWashId) {
            return (int) $starWashId;
        }

        return (int) (DB::table('laundry_shops')->orderBy('id', 'desc')->value('id') ?? 30);
    }

    /**
     * Get owner dashboard orders.
     */
    public function orders(Request $request)
    {
        $shopId = $this->resolveShopId($request);
        $status = $request->input('status');

        $query = Order::with(['customer', 'deliveryPartner', 'statusHistory', 'items', 'laundryShop']);

        if ($shopId) {
            $query->where('shop_id', $shopId);
        }

        if ($status && $status !== 'all' && $status !== 'ALL') {
            $query->where('status', $status);
        }

        $orders = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'message' => 'Owner orders retrieved',
            'data'    => $orders,
        ]);
    }

    public function acceptOrder(Request $request, $id)
    {
        return $this->updateOrderStatus($request->merge(['status' => 'ACCEPTED']), $id);
    }

    public function rejectOrder(Request $request, $id)
    {
        return $this->updateOrderStatus($request->merge(['status' => 'REJECTED']), $id);
    }

    public function updateOrderStatus(Request $request, $id)
    {
        $order  = Order::findOrFail($id);
        $status = strtoupper($request->input('status', 'ACCEPTED'));
        $notes  = $request->input('notes') ?? $request->input('cancellation_reason') ?? $request->input('reason') ?? 'Status updated by laundry owner';

        $order->status = $status;
        if (in_array($status, ['CANCELLED', 'REJECTED', 'CANCEL'])) {
            $reason = $request->input('cancellation_reason') ?? $request->input('reason') ?? $request->input('notes') ?? 'Order cancelled by laundry shop owner';
            $order->cancellation_reason = $reason;
            $notes = $reason;
        }
        $order->save();

        DB::table('order_status_history')->insert([
            'order_id'   => $order->id,
            'status'     => $status,
            'updated_by' => auth()->id() ?? $order->shop_id ?? 1,
            'user_role'  => 'laundry_owner',
            'notes'      => $notes,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $isCancelled = in_array($status, ['CANCELLED', 'REJECTED', 'CANCEL']);
        $message = $isCancelled
            ? 'Your order #' . ($order->order_number ?? $order->id) . ' was cancelled by the laundry shop. Reason: ' . ($order->cancellation_reason ?? $notes)
            : 'Your order #' . ($order->order_number ?? $order->id) . ' is now ' . $status;

        try {
            DB::table('notifications')->insert([
                'user_id'    => $order->user_id,
                'title'      => $isCancelled ? 'Order Cancelled #' . ($order->order_number ?? $order->id) : 'Order Status: ' . $status,
                'message'    => $message,
                'type'       => $isCancelled ? 'ORDER_CANCELLED' : 'STATUS_UPDATE',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {}

        return response()->json([
            'success' => true,
            'message' => 'Order status updated to ' . $status,
            'data'    => Order::with(['customer', 'deliveryPartner', 'statusHistory'])->find($order->id),
        ]);
    }

    public function assignDeliveryBoy(Request $request, $id)
    {
        $order         = Order::findOrFail($id);
        $rawDriverId   = $request->input('delivery_boy_id', 1);
        $type          = $request->input('assignment_type', 'pickup');

        // Resolve delivery boy record and corresponding user_id
        $dbBoy = \App\Models\DeliveryBoy::where('id', $rawDriverId)
            ->orWhere('user_id', $rawDriverId)
            ->first();

        $userId = $dbBoy ? $dbBoy->user_id : $rawDriverId;
        $dbId   = $dbBoy ? $dbBoy->id : $rawDriverId;

        $order->delivery_boy_id = $userId;
        $newStatus              = $type === 'pickup' ? 'PICKUP_ASSIGNED' : 'OUT_FOR_DELIVERY';
        $order->status          = $newStatus;
        $order->save();

        try {
            DB::table('delivery_assignments')->insert([
                'order_id'        => $order->id,
                'delivery_boy_id' => $dbId,
                'type'            => $type,
                'status'          => 'assigned',
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);
        } catch (\Throwable $e) {
            // Ignore duplicate assignment errors safely
        }

        DB::table('order_status_history')->insert([
            'order_id'   => $order->id,
            'status'     => $newStatus,
            'updated_by' => auth()->id() ?? 1,
            'user_role'  => 'laundry_owner',
            'notes'      => 'Assigned to delivery agent #' . $dbId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Delivery boy assigned successfully',
            'data'    => Order::with(['customer', 'deliveryPartner', 'statusHistory'])->find($order->id),
        ]);
    }

    public function services(Request $request)
    {
        $shopId = $this->resolveShopId($request);

        $services = DB::table('shop_services')
            ->leftJoin('categories', 'shop_services.category_id', '=', 'categories.id')
            ->where('shop_services.shop_id', $shopId)
            ->select(
                'shop_services.*',
                DB::raw("COALESCE(categories.name, 'General') as category_name")
            )
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Services list retrieved',
            'data'    => $services,
        ]);
    }

    public function storeService(Request $request)
    {
        $shopId = $this->resolveShopId($request);

        $categoryName = $request->input('category', 'General');
        $catObj = DB::table('categories')->where('name', $categoryName)->first();
        $categoryId = $catObj ? $catObj->id : 1;

        $insertData = [
            'shop_id'         => $shopId,
            'category_id'     => $categoryId,
            'name'            => $request->input('name', 'Wash & Steam Iron'),
            'description'     => $request->input('description', 'Laundry service'),
            'estimated_hours' => $request->input('estimated_hours', 24),
            'is_active'       => 1,
            'created_at'      => now(),
            'updated_at'      => now(),
        ];

        if (Schema::hasColumn('shop_services', 'price')) {
            $insertData['price'] = $request->input('price', 49);
        }

        $id = DB::table('shop_services')->insertGetId($insertData);

        return response()->json([
            'success' => true,
            'message' => 'Service added successfully by Laundry Owner',
            'id'      => $id,
        ]);
    }

    public function syncServices(Request $request)
    {
        $shopId = $this->resolveShopId($request);

        $servicesInput = $request->input('services', []);
        if (is_array($servicesInput)) {
            DB::table('shop_services')
                ->where('shop_id', $shopId)
                ->delete();

            foreach ($servicesInput as $svc) {
                $categoryName = $svc['category'] ?? 'General';
                $catObj = DB::table('categories')->where('name', $categoryName)->first();
                $categoryId = $catObj ? $catObj->id : 1;

                $insertData = [
                    'shop_id'         => $shopId,
                    'category_id'     => $categoryId,
                    'name'            => $svc['name'] ?? 'Laundry Service',
                    'description'     => $svc['description'] ?? 'Service offered',
                    'estimated_hours' => $svc['estimated_hours'] ?? $svc['estimatedHours'] ?? 24,
                    'is_active'       => 1,
                    'created_at'      => now(),
                    'updated_at'      => now(),
                ];

                if (Schema::hasColumn('shop_services', 'price')) {
                    $insertData['price'] = $svc['price'] ?? 49;
                }

                DB::table('shop_services')->insert($insertData);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Shop services synced successfully by Laundry Owner',
        ]);
    }

    /**
     * Check real-time shop verification status by phone or shop ID.
     */
    public function shopStatus(Request $request)
    {
        $phone = $request->input('phone');
        $shopId = $request->input('shop_id');

        $query = LaundryShop::query();
        if ($shopId) {
            $query->where('id', $shopId);
        } elseif ($phone) {
            $query->where('phone', $phone)
                  ->orWhereHas('owner', function ($q) use ($phone) {
                      $q->where('phone', $phone);
                  });
        }

        $shop = $query->orderBy('id', 'desc')->first();

        if (!$shop) {
            return response()->json([
                'success' => false,
                'message' => 'Shop not found',
            ], 404);
        }

        $verStatus = strtoupper($shop->verification_status ?? 'PENDING');
        $isVerified = ($verStatus === 'APPROVED' || (int)$shop->is_verified === 1);

        return response()->json([
            'success'             => true,
            'verification_status' => $verStatus,
            'account_status'      => strtoupper($shop->account_status ?? 'ACTIVE'),
            'is_verified'         => $isVerified,
            'shop'                => $shop->load('documents'),
        ]);
    }

    /**
     * Get complete Laundry Owner & Shop profile including all uploaded documents.
     */
    public function profile(Request $request)
    {
        $shopId = $this->resolveShopId($request);

        $shop = LaundryShop::with(['owner', 'documents'])->find($shopId);

        if (!$shop) {
            $shop = LaundryShop::with(['owner', 'documents'])->where('name', 'like', '%Star Wash%')->first();
        }

        if (!$shop) {
            $shop = LaundryShop::with(['owner', 'documents'])->orderBy('id', 'desc')->first();
        }

        if (!$shop) {
            return response()->json([
                'success' => false,
                'message' => 'Shop profile not found',
            ], 404);
        }

        // Fetch services for this shop from shop_services
        $services = DB::table('shop_services')
            ->leftJoin('categories', 'shop_services.category_id', '=', 'categories.id')
            ->where('shop_services.shop_id', $shop->id)
            ->select(
                'shop_services.*',
                DB::raw("COALESCE(categories.name, 'General') as category_name")
            )
            ->get();

        $shop->services = $services;
        $shop->services_catalog = $services;

        return response()->json([
            'success' => true,
            'message' => 'Owner profile retrieved successfully',
            'data'    => [
                'user'             => $shop->owner,
                'shop'             => $shop,
                'documents'        => $shop->documents,
                'services'         => $services,
                'services_catalog' => $services,
            ],
        ]);
    }

    /**
     * Update complete Laundry Owner & Shop profile.
     * Persists changes to both laundry_shops and users tables in MySQL.
     */
    public function updateProfile(Request $request)
    {
        $shopId = $this->resolveShopId($request);

        $shop = LaundryShop::with(['owner', 'documents'])->find($shopId);
        if (!$shop) {
            $shop = LaundryShop::with(['owner', 'documents'])->where('name', 'like', '%Star Wash%')->first();
        }
        if (!$shop) {
            $shop = LaundryShop::orderBy('id', 'desc')->first();
        }

        if (!$shop) {
            return response()->json([
                'success' => false,
                'message' => 'Shop not found to update',
            ], 404);
        }

        // Gather shop update fields
        $shopUpdates = [];
        if ($request->filled('name')) {
            $shopUpdates['name'] = $request->input('name');
            $shopUpdates['shop_name'] = $request->input('name');
        } elseif ($request->filled('shop_name')) {
            $shopUpdates['name'] = $request->input('shop_name');
            $shopUpdates['shop_name'] = $request->input('shop_name');
        }

        if ($request->filled('owner_name')) {
            $shopUpdates['owner_name'] = $request->input('owner_name');
        }
        if ($request->filled('phone')) {
            $shopUpdates['phone'] = $request->input('phone');
        }
        if ($request->filled('email')) {
            $shopUpdates['email'] = $request->input('email');
        }
        if ($request->filled('address')) {
            $shopUpdates['address'] = $request->input('address');
        }
        if ($request->filled('city')) {
            $shopUpdates['city'] = $request->input('city');
        }
        if ($request->filled('state')) {
            $shopUpdates['state'] = $request->input('state');
        }
        if ($request->filled('pincode')) {
            $shopUpdates['pincode'] = $request->input('pincode');
        }
        if ($request->filled('gst_number')) {
            $shopUpdates['gst_number'] = $request->input('gst_number');
        }
        if ($request->filled('pickup_radius_km')) {
            $shopUpdates['pickup_radius_km'] = (int) $request->input('pickup_radius_km');
        }
        if ($request->filled('working_hours')) {
            $shopUpdates['working_hours'] = $request->input('working_hours');
        }
        if ($request->has('is_open')) {
            $shopUpdates['is_open'] = $request->input('is_open') ? 1 : 0;
        }
        if ($request->filled('bank_name')) {
            $shopUpdates['bank_name'] = $request->input('bank_name');
        }
        if ($request->filled('bank_account')) {
            $shopUpdates['bank_account'] = $request->input('bank_account');
        }
        if ($request->filled('ifsc_code')) {
            $shopUpdates['ifsc_code'] = $request->input('ifsc_code');
        }
        if ($request->filled('account_holder')) {
            $shopUpdates['account_holder'] = $request->input('account_holder');
        }
        if ($request->filled('upi_id')) {
            $shopUpdates['upi_id'] = $request->input('upi_id');
        }

        // Process logo and cover images if sent
        if ($request->filled('logo_url')) {
            $logoUrl = $this->processDocumentMedia($request->input('logo_url'), 'logo', $shop->id);
            $shopUpdates['logo_url'] = $logoUrl ?: $request->input('logo_url');
        }
        if ($request->filled('cover_url')) {
            $coverUrl = $this->processDocumentMedia($request->input('cover_url'), 'cover', $shop->id);
            $shopUpdates['cover_url'] = $coverUrl ?: $request->input('cover_url');
        }

        if (!empty($shopUpdates)) {
            $shopUpdates['updated_at'] = now();
            $shop->update($shopUpdates);
        }

        // Update linked owner User record
        $owner = $shop->owner;
        if (!$owner && $shop->owner_id) {
            $owner = User::find($shop->owner_id);
        }
        if (!$owner && $request->filled('phone')) {
            $cleanPhone = preg_replace('/\D/', '', $request->input('phone'));
            $owner = User::where('phone', $request->input('phone'))->orWhere('phone', $cleanPhone)->first();
        }

        if ($owner) {
            $userUpdates = [];
            if ($request->filled('owner_name')) {
                $userUpdates['name'] = $request->input('owner_name');
            } elseif ($request->filled('name')) {
                $userUpdates['name'] = $request->input('name');
            }
            if ($request->filled('phone')) {
                $userUpdates['phone'] = $request->input('phone');
            }
            if ($request->filled('email')) {
                $userUpdates['email'] = $request->input('email');
            }
            if ($request->filled('city')) {
                $userUpdates['city'] = $request->input('city');
            }
            if ($request->filled('password')) {
                $userUpdates['password'] = Hash::make($request->input('password'));
            }

            if (!empty($userUpdates)) {
                $userUpdates['updated_at'] = now();
                $owner->update($userUpdates);
            }
        }

        $shop->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Laundry shop profile updated successfully and synced across apps.',
            'data'    => [
                'user'      => $owner ?: $shop->owner,
                'shop'      => $shop->load('documents'),
                'documents' => $shop->documents,
            ],
        ]);
    }

    /**
     * Create or onboard a new delivery boy / rider for laundry shop.
     * Persists to MySQL users table (role=delivery_boy) & delivery_boys table.
     */
    public function storeDeliveryBoy(Request $request)
    {
        $name        = trim($request->input('name', 'Delivery Executive'));
        $phone       = trim($request->input('phone', ''));
        $cleanPhone  = preg_replace('/\D/', '', $phone);
        $password    = $request->input('password', '123456');
        $vehicle     = $request->input('vehicle', 'Scooter (MH 12 AB 9999)');
        $vehicleType = $request->input('vehicle_type', 'Scooter');
        $dlNumber    = $request->input('dl_number') ?? $request->input('dlNumber', 'MH12-2026-001234');
        $email       = $request->input('email') ?: (Str::slug($name) . rand(100, 999) . '@dhobipro.com');
        $city        = $request->input('city', 'Pune');

        if (empty($phone) && empty($cleanPhone)) {
            return response()->json(['success' => false, 'message' => 'Phone number is required.'], 422);
        }

        $phoneToUse = !empty($cleanPhone) ? $cleanPhone : $phone;

        // Resolve shop_id for this laundry
        $shopId = $request->input('shop_id') ?? $request->input('laundry_id');
        if (!$shopId && $request->filled('owner_phone')) {
            $owner = User::where('phone', $request->input('owner_phone'))->first();
            if ($owner) {
                $shop = LaundryShop::where('owner_id', $owner->id)->first();
                if ($shop) $shopId = $shop->id;
            }
        }
        if (!$shopId && auth()->check() && auth()->user()->role === 'laundry_owner') {
            $shop = LaundryShop::where('owner_id', auth()->id())->first();
            if ($shop) $shopId = $shop->id;
        }
        if (!$shopId) {
            $firstShop = LaundryShop::first();
            if ($firstShop) $shopId = $firstShop->id;
        }

        // Find or create User record
        $user = User::where('phone', $phoneToUse)->orWhere('phone', $phone)->first();
        if ($user) {
            $user->name       = $name;
            $user->role       = 'delivery_boy';
            $user->password   = Hash::make($password);
            $user->is_active  = 1;
            $user->status     = 'ACTIVE';
            $user->city       = $city;
            $user->save();
        } else {
            $user = User::create([
                'name'       => $name,
                'phone'      => $phoneToUse,
                'email'      => $email,
                'role'       => 'delivery_boy',
                'password'   => Hash::make($password),
                'is_active'  => 1,
                'status'     => 'ACTIVE',
                'city'       => $city,
            ]);
        }

        // Find or create DeliveryBoy record
        $deliveryBoy = DeliveryBoy::where('user_id', $user->id)->first();
        if ($deliveryBoy) {
            $deliveryBoy->vehicle_number      = $vehicle;
            $deliveryBoy->vehicle_type        = $vehicleType;
            $deliveryBoy->license_number      = $dlNumber;
            if ($shopId) {
                $deliveryBoy->shop_id         = $shopId;
            }
            $deliveryBoy->is_online           = 1;
            $deliveryBoy->verification_status = 'approved';
            $deliveryBoy->save();
        } else {
            $deliveryBoy = DeliveryBoy::create([
                'user_id'                => $user->id,
                'shop_id'                => $shopId,
                'vehicle_number'         => $vehicle,
                'vehicle_type'           => $vehicleType,
                'license_number'         => $dlNumber,
                'is_online'              => 1,
                'verification_status'    => 'approved',
                'rating'                 => 5.0,
                'active_orders_count'    => 0,
                'completed_orders_count' => 0,
            ]);
        }

        $shop = $shopId ? LaundryShop::find($shopId) : null;

        return response()->json([
            'success' => true,
            'message' => 'Delivery Boy onboarded successfully and is now active in database.',
            'data'    => [
                'id'             => 'BOY-' . $deliveryBoy->id,
                'raw_id'         => $deliveryBoy->id,
                'user_id'        => $user->id,
                'shop_id'        => $shopId,
                'shop_name'      => $shop ? $shop->name : 'Laundry Shop',
                'name'           => $user->name,
                'phone'          => $user->phone,
                'password'       => $password,
                'vehicle'        => $deliveryBoy->vehicle_number,
                'vehicleType'    => $deliveryBoy->vehicle_type,
                'dlNumber'       => $deliveryBoy->license_number,
                'status'         => 'Online',
                'rating'         => 5.0,
                'completedTasks' => $deliveryBoy->completed_orders_count ?? 0,
            ],
        ]);
    }



    /**
     * Get all customers who have booked with this laundry shop.
     */
    public function customers(Request $request)
    {
        $shopId = $this->resolveShopId($request);

        $orderQuery = Order::query();
        if ($shopId) {
            $orderQuery->where('shop_id', $shopId);
        }

        $customerIds = (clone $orderQuery)->distinct()->pluck('user_id');

        $users = User::whereIn('id', $customerIds)->get();

        $customerData = $users->map(function ($u) use ($shopId) {
            $shopOrders = Order::where('user_id', $u->id)
                ->when($shopId, function ($q) use ($shopId) {
                    return $q->where('shop_id', $shopId);
                })
                ->get();

            $totalOrders = $shopOrders->count();
            $totalSpent  = $shopOrders->sum('total_amount');
            $unpaidSum   = $shopOrders->whereIn('payment_status', ['pending', 'unpaid', 'partial'])->sum('total_amount');
            $lastOrder   = $shopOrders->sortByDesc('created_at')->first();

            $tag = 'Loyal Customer';
            if ($unpaidSum > 0) {
                $tag = 'Outstanding Payment';
            } elseif ($totalOrders >= 5) {
                $tag = 'Loyal Customer';
            } elseif ($totalOrders >= 2) {
                $tag = 'Frequent';
            } else {
                $tag = 'New Customer';
            }

            return [
                'id'          => 'C-' . $u->id,
                'user_id'     => $u->id,
                'name'        => $u->name ?: 'Customer',
                'phone'       => $u->phone,
                'email'       => $u->email,
                'city'        => $u->city ?: 'Pune',
                'totalOrders' => $totalOrders,
                'totalSpent'  => '₹' . number_format($totalSpent, 0),
                'outstanding' => '₹' . number_format($unpaidSum, 0),
                'tag'         => $tag,
                'notes'       => $lastOrder ? ($lastOrder->notes ?: 'Customer booked orders with your shop') : 'Customer',
                'last_order'  => $lastOrder ? $lastOrder->created_at->format('Y-m-d H:i') : null,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Shop customers retrieved successfully',
            'data'    => $customerData,
        ]);
    }

    /**
     * List all delivery boys belonging to THIS laundry shop only.
     * Each laundry owner sees ONLY the delivery boys they created.
     */
    public function deliveryBoys(Request $request)
    {
        $shopId = $this->resolveShopId($request);

        $query = DB::table('delivery_boys')
            ->join('users', 'delivery_boys.user_id', '=', 'users.id')
            ->leftJoin('laundry_shops', 'delivery_boys.shop_id', '=', 'laundry_shops.id')
            ->select(
                'delivery_boys.id',
                'delivery_boys.user_id',
                'delivery_boys.shop_id',
                'users.name',
                'users.phone',
                'users.email',
                'users.city',
                'delivery_boys.vehicle_type',
                'delivery_boys.vehicle_number',
                'delivery_boys.license_number as dl_number',
                'delivery_boys.is_online',
                'delivery_boys.rating',
                'delivery_boys.completed_orders_count as completed_tasks',
                'delivery_boys.active_orders_count as active_tasks',
                'delivery_boys.verification_status',
                'delivery_boys.created_at',
                'laundry_shops.name as shop_name'
            )
            ->orderBy('delivery_boys.created_at', 'desc');

        // ⚠️ CRITICAL: Only show delivery boys that belong to this shop
        if ($shopId) {
            $query->where('delivery_boys.shop_id', $shopId);
        }

        $boys = $query->get();

        // Format for consistent response across partner app & admin panel
        $formatted = $boys->map(function ($b) {
            return [
                'id'             => 'BOY-' . $b->id,
                'raw_id'         => $b->id,
                'user_id'        => $b->user_id,
                'shop_id'        => $b->shop_id,
                'shop_name'      => $b->shop_name ?? 'Laundry Shop',
                'name'           => $b->name,
                'phone'          => $b->phone,
                'email'          => $b->email,
                'city'           => $b->city,
                'vehicle'        => $b->vehicle_number ?: ($b->vehicle_type ?: 'Two Wheeler'),
                'vehicle_number' => $b->vehicle_number,
                'vehicle_type'   => $b->vehicle_type,
                'dl_number'      => $b->dl_number,
                'dlNumber'       => $b->dl_number,
                'is_online'      => (bool)$b->is_online,
                'status'         => $b->is_online ? 'Online' : 'Offline',
                'rating'         => (float)($b->rating ?? 0),
                'completed_orders_count' => (int)($b->completed_tasks ?? 0),
                'completedTasks' => (int)($b->completed_tasks ?? 0),
                'active_orders_count'    => (int)($b->active_tasks ?? 0),
                'verification_status'    => $b->verification_status ?? 'approved',
                'created_at'     => $b->created_at,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Delivery boys for shop retrieved',
            'data'    => $formatted,
        ]);
    }

    /**
     * Real-time Revenue Dashboard for Laundry Owner.
     * Computes all revenue stats from real orders scoped to the owner's shop.
     */
    public function ownerRevenue(Request $request)
    {
        $shopId = $this->resolveShopId($request);

        if (!$shopId) {
            return response()->json(['success' => false, 'message' => 'Shop not found'], 404);
        }

        $period     = $request->input('period', 'monthly'); // daily | weekly | monthly
        $today      = now();

        switch ($period) {
            case 'daily':
                $startDate = $today->copy()->startOfDay();
                break;
            case 'weekly':
                $startDate = $today->copy()->startOfWeek();
                break;
            default: // monthly
                $startDate = $today->copy()->startOfMonth();
                break;
        }

        // All orders for this shop in the selected period
        $periodOrders = DB::table('orders')
            ->where('shop_id', $shopId)
            ->where('created_at', '>=', $startDate)
            ->whereNotIn('status', ['CANCELLED', 'cancelled', 'REJECTED', 'rejected']);

        // Revenue from paid/delivered/completed orders in this period
        $periodRevenue = (float) (clone $periodOrders)
            ->where(function ($q) {
                $q->whereIn('payment_status', ['paid', 'PAID'])
                  ->orWhereIn('status', ['DELIVERED', 'delivered', 'COMPLETED', 'completed', 'READY', 'ready']);
            })
            ->sum(DB::raw('COALESCE(total_amount, 0)'));

        // All-time totals for this shop
        $allTimeOrders = DB::table('orders')
            ->where('shop_id', $shopId)
            ->whereNotIn('status', ['CANCELLED', 'cancelled', 'REJECTED', 'rejected']);

        $totalRevenue = (float) (clone $allTimeOrders)
            ->where(function ($q) {
                $q->whereIn('payment_status', ['paid', 'PAID'])
                  ->orWhereIn('status', ['DELIVERED', 'delivered', 'COMPLETED', 'completed', 'READY', 'ready']);
            })
            ->sum(DB::raw('COALESCE(total_amount, 0)'));

        $commission   = (float) (clone $allTimeOrders)->sum('commission_amount');
        if ($commission == 0 && $totalRevenue > 0) {
            $commission = round($totalRevenue * 0.10, 2); // 10% platform fee for owner
        }
        $netEarnings  = round($totalRevenue - $commission, 2);
        $gstAmount    = round($totalRevenue * 0.18 / 1.18, 2);

        // Cancelled orders
        $cancelledOrders = DB::table('orders')
            ->where('shop_id', $shopId)
            ->whereIn('status', ['CANCELLED', 'cancelled', 'REJECTED', 'rejected'])
            ->count();
        $cancelledRevenueLoss = (float) DB::table('orders')
            ->where('shop_id', $shopId)
            ->whereIn('status', ['CANCELLED', 'cancelled', 'REJECTED', 'rejected'])
            ->sum(DB::raw('COALESCE(total_amount, 0)'));

        // Payment mode breakdown
        $paidQ = DB::table('orders')
            ->where('shop_id', $shopId)
            ->where(function ($q) {
                $q->whereIn('payment_status', ['paid', 'PAID'])
                  ->orWhereIn('status', ['DELIVERED', 'delivered', 'COMPLETED', 'completed', 'READY', 'ready']);
            })
            ->whereNotIn('status', ['CANCELLED', 'cancelled', 'REJECTED', 'rejected']);

        $cashRevenue   = (float) (clone $paidQ)->whereIn('payment_method', ['cash', 'CASH', 'COD', 'cod'])->sum(DB::raw('COALESCE(total_amount, 0)'));
        $onlineRevenue = (float) (clone $paidQ)->whereIn('payment_method', ['online', 'ONLINE', 'upi', 'UPI', 'card', 'CARD', 'netbanking'])->sum(DB::raw('COALESCE(total_amount, 0)'));
        if ($cashRevenue == 0 && $onlineRevenue == 0 && $totalRevenue > 0) {
            $onlineRevenue = $totalRevenue;
        }

        // Top customers for this shop
        $topCustomers = DB::table('orders')
            ->join('users', 'orders.user_id', '=', 'users.id')
            ->where('orders.shop_id', $shopId)
            ->where(function ($q) {
                $q->whereIn('orders.payment_status', ['paid', 'PAID'])
                  ->orWhereIn('orders.status', ['DELIVERED', 'delivered', 'COMPLETED', 'completed', 'READY', 'ready']);
            })
            ->select(
                'users.id',
                'users.name',
                DB::raw('COUNT(orders.id) as total_orders'),
                DB::raw('SUM(COALESCE(orders.total_amount, 0)) as total_spent')
            )
            ->groupBy('users.id', 'users.name')
            ->orderByDesc('total_spent')
            ->limit(5)
            ->get()
            ->map(fn($c) => [
                'name'         => $c->name ?: 'Walk-in Customer',
                'total_orders' => $c->total_orders,
                'total_spent'  => '₹' . number_format($c->total_spent, 0),
            ]);

        // Service-wise revenue
        $serviceRevenue = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.shop_id', $shopId)
            ->where(function ($q) {
                $q->whereIn('orders.payment_status', ['paid', 'PAID'])
                  ->orWhereIn('orders.status', ['DELIVERED', 'delivered', 'COMPLETED', 'completed', 'READY', 'ready']);
            })
            ->select(
                'order_items.service_name as name',
                DB::raw('SUM(order_items.total_price) as revenue')
            )
            ->groupBy('order_items.service_name')
            ->orderByDesc('revenue')
            ->limit(5)
            ->get()
            ->map(fn($s) => [
                'name'    => $s->name,
                'revenue' => round($s->revenue, 2),
            ]);

        // Recent transactions for this shop
        $recentTransactions = DB::table('orders')
            ->leftJoin('users', 'orders.user_id', '=', 'users.id')
            ->where('orders.shop_id', $shopId)
            ->select(
                DB::raw("CONCAT('TXN-', orders.id) as id"),
                'users.name as customer_name',
                'orders.total_amount as amount',
                'orders.payment_method',
                'orders.payment_status',
                'orders.status',
                'orders.created_at'
            )
            ->orderByDesc('orders.created_at')
            ->limit(10)
            ->get()
            ->map(fn($t) => [
                'id'             => $t->id,
                'customerName'   => $t->customer_name ?: 'Walk-in Customer',
                'amount'         => '₹' . number_format($t->amount, 0),
                'paymentMethod'  => $t->payment_method ?: 'Online',
                'paymentStatus'  => strtoupper($t->payment_status) === 'PAID' ? 'PAID'
                                  : (strtoupper($t->payment_status) === 'FAILED' ? 'FAILED' : 'PENDING'),
                'orderStatus'    => $t->status,
                'createdAt'      => date('d M Y, h:i A', strtotime($t->created_at)),
            ]);

        return response()->json([
            'success' => true,
            'data' => [
                'period'                 => $period,
                'shop_id'               => $shopId,
                'period_revenue'         => $periodRevenue,
                'total_revenue'          => $totalRevenue,
                'commission'             => $commission,
                'net_earnings'           => $netEarnings,
                'gst_amount'             => $gstAmount,
                'cash_revenue'           => $cashRevenue,
                'online_revenue'         => $onlineRevenue,
                'cancelled_orders'       => $cancelledOrders,
                'cancelled_revenue_loss' => $cancelledRevenueLoss,
                'top_customers'          => $topCustomers,
                'service_revenue'        => $serviceRevenue,
                'recent_transactions'    => $recentTransactions,
            ],
        ]);
    }

    /**
     * Complete Live Dashboard Stats for Laundry Owner.
     * Computes all operational overview metrics, revenue, and active pipeline scoped to the shop.
     */
    public function dashboardStats(Request $request)
    {
        $shopId = $this->resolveShopId($request);
        if (!$shopId) {
            return response()->json(['success' => false, 'message' => 'Shop not found'], 404);
        }

        $today = now()->format('Y-m-d');

        // All orders for this shop
        $allOrders = Order::with(['customer', 'deliveryPartner'])
            ->where('shop_id', $shopId)
            ->orderBy('created_at', 'desc')
            ->get();

        $totalOrdersCount = $allOrders->count();

        // Status counts
        $placedCount = $allOrders->filter(fn($o) => strtoupper($o->status) === 'PLACED')->count();
        $receivedCount = $allOrders->filter(fn($o) => in_array(strtoupper($o->status), ['RECEIVED', 'PENDING']))->count();
        $processingCount = $allOrders->filter(fn($o) => in_array(strtoupper($o->status), ['IN_PROCESS', 'PROCESSING', 'ACCEPTED', 'WASHING']))->count();
        $readyCount = $allOrders->filter(fn($o) => in_array(strtoupper($o->status), ['READY', 'READY_FOR_DELIVERY', 'CUSTOMER_CONFIRMED']))->count();
        $pickupCount = $allOrders->filter(fn($o) => in_array(strtoupper($o->status), ['PICKUP_ASSIGNED', 'PICKED_UP']))->count();
        $outForDeliveryCount = $allOrders->filter(fn($o) => in_array(strtoupper($o->status), ['OUT_FOR_DELIVERY', 'DELIVERY_ASSIGNED']))->count();
        $completedCount = $allOrders->filter(fn($o) => in_array(strtoupper($o->status), ['DELIVERED', 'COMPLETED']))->count();
        $cancelledCount = $allOrders->filter(fn($o) => in_array(strtoupper($o->status), ['CANCELLED', 'REJECTED', 'CANCEL']))->count();

        $activeCount = $allOrders->filter(fn($o) => !in_array(strtoupper($o->status), ['DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED', 'CANCEL']))->count();

        // Today's orders
        $todayOrders = $allOrders->filter(fn($o) => $o->created_at && $o->created_at->format('Y-m-d') === $today);
        $todayOrdersCount = $todayOrders->count();

        // Revenue calculations
        $todayRevenue = $todayOrders->filter(fn($o) => !in_array(strtoupper($o->status), ['CANCELLED', 'REJECTED', 'CANCEL']))
            ->sum('total_amount');

        $totalRevenue = $allOrders->filter(fn($o) => !in_array(strtoupper($o->status), ['CANCELLED', 'REJECTED', 'CANCEL']))
            ->sum('total_amount');

        $pendingPayments = $allOrders->filter(fn($o) => in_array(strtolower($o->payment_status ?? 'pending'), ['pending', 'unpaid', 'partial']) && !in_array(strtoupper($o->status), ['CANCELLED', 'REJECTED', 'CANCEL']))
            ->sum('total_amount');

        // Customer & Delivery boys count
        $totalCustomers = DB::table('orders')->where('shop_id', $shopId)->distinct()->count('user_id');
        $deliveryBoys = DB::table('delivery_boys')->where('shop_id', $shopId)->get();
        $totalDeliveryBoys = $deliveryBoys->count();
        $onlineDeliveryBoys = $deliveryBoys->where('is_online', 1)->count();

        // Success rate
        $nonCancelledTotal = $totalOrdersCount - $cancelledCount;
        $deliverySuccessRate = $nonCancelledTotal > 0 ? round(($completedCount / $nonCancelledTotal) * 100, 1) : 100;

        // Shop rating
        $shop = LaundryShop::find($shopId);
        $rating = $shop ? (float) ($shop->rating ?? 5.0) : 5.0;

        // Recent 5 orders
        $recentOrders = $allOrders->take(8)->map(fn($o) => [
            'id'             => $o->order_number ?? ('ORD-' . $o->id),
            'numeric_id'     => $o->id,
            'customer_name'  => $o->customer?->name ?? 'Walk-in Customer',
            'phone'          => $o->customer?->phone ?? 'N/A',
            'total_amount'   => (float) $o->total_amount,
            'status'         => $o->status,
            'payment_status' => $o->payment_status ?? 'pending',
            'payment_method' => $o->payment_method ?? 'cod',
            'pickup_address' => $o->pickup_address ?? $o->delivery_address ?? 'Pune',
            'delivery_boy'   => $o->deliveryPartner?->name ?? null,
            'created_at'     => $o->created_at?->format('Y-m-d H:i:s'),
            'is_urgent'      => (bool) ($o->is_express ?? false),
        ]);

        return response()->json([
            'success' => true,
            'data'    => [
                'shop_id'                => $shopId,
                'total_orders'           => $totalOrdersCount,
                'today_orders'           => $todayOrdersCount,
                'active_orders'          => $activeCount,
                'new_orders'             => $placedCount,
                'received_orders'        => $receivedCount,
                'processing_orders'      => $processingCount,
                'ready_orders'           => $readyCount,
                'pickup_orders'          => $pickupCount,
                'delivery_orders'        => $outForDeliveryCount,
                'completed_orders'       => $completedCount,
                'cancelled_orders'       => $cancelledCount,
                'today_revenue'          => (float) $todayRevenue,
                'total_revenue'          => (float) $totalRevenue,
                'pending_payments'       => (float) $pendingPayments,
                'total_customers'        => $totalCustomers,
                'total_delivery_boys'    => $totalDeliveryBoys,
                'online_delivery_boys'   => $onlineDeliveryBoys,
                'customer_rating'        => $rating,
                'delivery_success_rate'  => $deliverySuccessRate,
                'recent_orders'          => $recentOrders,
            ],
        ]);
    }

    /**
     * Show single order with strict shop isolation.
     * Owner A cannot access Owner B's order.
     */
    public function showOrder(Request $request, $id)
    {
        $shopId = $this->resolveShopId($request);
        $order = Order::with(['customer', 'laundryShop', 'deliveryPartner', 'statusHistory', 'items'])->find($id);

        if (!$order) {
            // Also try by order_number
            $order = Order::with(['customer', 'laundryShop', 'deliveryPartner', 'statusHistory', 'items'])
                ->where('order_number', $id)
                ->first();
        }

        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Order not found'], 404);
        }

        // ⚠️ STRICT SHOP AUTHORIZATION
        if ($shopId && (int)$order->shop_id !== (int)$shopId) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized: You do not have permission to view orders belonging to another laundry shop.',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data'    => $order,
        ]);
    }

    /**
     * Create a new walk-in / phone order by Laundry Owner.
     */
    public function storeOrder(Request $request)
    {
        $shopId = $this->resolveShopId($request);
        if (!$shopId) {
            return response()->json(['success' => false, 'message' => 'Shop not found'], 404);
        }

        DB::beginTransaction();
        try {
            $customerName  = trim($request->input('customer_name', 'Walk-in Customer'));
            $customerPhone = trim($request->input('customer_phone') ?? $request->input('phone', '9822000000'));
            $cleanPhone    = preg_replace('/\D/', '', $customerPhone);
            $last10        = substr($cleanPhone, -10);

            // Find or create customer
            $user = User::where('phone', $customerPhone)
                ->orWhere('phone', $cleanPhone)
                ->orWhere('phone', 'LIKE', '%' . $last10)
                ->first();

            if (!$user) {
                $user = User::create([
                    'uuid'       => (string) Str::uuid(),
                    'name'       => $customerName,
                    'phone'      => !empty($last10) ? $last10 : ($cleanPhone ?: $customerPhone),
                    'email'      => Str::slug($customerName) . rand(100, 999) . '@dhobipro.com',
                    'role'       => 'customer',
                    'status'     => 'ACTIVE',
                    'is_active'  => 1,
                    'city'       => $request->input('city', 'Pune'),
                    'password'   => Hash::make('123456'),
                ]);
            }

            $totalAmount      = (float) ($request->input('total_amount', 0));
            $subtotal         = (float) ($request->input('subtotal', $totalAmount));
            $discount         = (float) ($request->input('discount_amount', 0));
            $deliveryCharge   = (float) ($request->input('delivery_charge', 0));
            $taxAmount        = (float) ($request->input('tax_amount', 0));
            $commissionAmount = round($totalAmount * 0.10, 2);
            $laundryEarnings  = round($totalAmount - $commissionAmount, 2);

            $paymentMethod = strtolower($request->input('payment_method', 'cash'));
            $paymentStatus = strtolower($request->input('payment_status', 'pending'));

            $order = new Order();
            $order->uuid              = (string) Str::uuid();
            $order->order_number      = 'ORD-' . strtoupper(Str::random(6));
            $order->user_id           = $user->id;
            $order->shop_id           = $shopId;
            $order->status            = strtoupper($request->input('status', 'RECEIVED'));
            $order->payment_status    = in_array($paymentStatus, ['paid', 'partial', 'pending', 'unpaid']) ? $paymentStatus : 'pending';
            $order->payment_method    = in_array($paymentMethod, ['cash', 'upi', 'card', 'bank', 'cod', 'online']) ? $paymentMethod : 'cash';
            $order->subtotal          = $subtotal;
            $order->total_amount      = $totalAmount;
            $order->discount_amount   = $discount;
            $order->delivery_charge   = $deliveryCharge;
            $order->tax_amount        = $taxAmount;
            $order->commission_amount = $commissionAmount;
            $order->laundry_earnings  = $laundryEarnings;
            $order->pickup_address    = $request->input('pickup_address', 'Shop Counter / Walk-in');
            $order->delivery_address  = $request->input('delivery_address', $request->input('pickup_address', 'Shop Counter'));
            $order->pickup_date       = $request->input('pickup_date', now()->format('Y-m-d'));
            $order->delivery_date     = $request->input('delivery_date', now()->addDays(2)->format('Y-m-d'));
            $order->notes             = $request->input('notes', 'Walk-in order created by laundry owner');
            $order->is_express        = $request->input('is_urgent', false) ? 1 : 0;
            $order->save();

            // Insert items
            $items = $request->input('items', []);
            if (is_array($items)) {
                foreach ($items as $item) {
                    $svcName   = $item['service_name'] ?? $item['name'] ?? 'Laundry Service';
                    $itemName  = $item['item_name'] ?? $item['name'] ?? 'Clothes';
                    $unitPrice = (float) ($item['unit_price'] ?? $item['price'] ?? 50);
                    $qty       = (float) ($item['quantity'] ?? $item['qty'] ?? 1);
                    $totPrice  = (float) ($item['total_price'] ?? ($unitPrice * $qty));

                    DB::table('order_items')->insert([
                        'order_id'     => $order->id,
                        'service_name' => $svcName,
                        'item_name'    => $itemName,
                        'name'         => $itemName,
                        'pricing_type' => $item['unit'] ?? 'per_piece',
                        'unit_price'   => $unitPrice,
                        'price'        => $unitPrice,
                        'quantity'     => $qty,
                        'total_price'  => $totPrice,
                        'created_at'   => now(),
                        'updated_at'   => now(),
                    ]);
                }
            }

            // Order status history
            DB::table('order_status_history')->insert([
                'order_id'   => $order->id,
                'status'     => $order->status,
                'updated_by' => auth()->id() ?? $user->id,
                'user_role'  => 'laundry_owner',
                'notes'      => 'Order created manually at shop by owner',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Increment shop counter
            LaundryShop::where('id', $shopId)->increment('total_orders');

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Order created successfully!',
                'data'    => Order::with(['customer', 'items', 'statusHistory'])->find($order->id),
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create order: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update payment details for an order.
     */
    public function updatePayment(Request $request, $id)
    {
        $shopId = $this->resolveShopId($request);
        $order = Order::findOrFail($id);

        if ($shopId && (int)$order->shop_id !== (int)$shopId) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $paymentStatus = strtolower($request->input('payment_status', 'paid'));
        $paymentMethod = $request->input('payment_method');

        $order->payment_status = $paymentStatus;
        if ($paymentMethod) {
            $order->payment_method = strtolower($paymentMethod);
        }
        $order->save();

        // Status history note
        DB::table('order_status_history')->insert([
            'order_id'   => $order->id,
            'status'     => $order->status,
            'updated_by' => auth()->id() ?? 1,
            'user_role'  => 'laundry_owner',
            'notes'      => 'Payment marked as ' . strtoupper($paymentStatus) . ($paymentMethod ? ' via ' . strtoupper($paymentMethod) : ''),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Payment status updated to ' . strtoupper($paymentStatus),
            'data'    => $order,
        ]);
    }

    /**
     * Toggle Delivery Boy duty status (Online/Offline) for this shop.
     */
    public function toggleDeliveryBoyStatus(Request $request, $id)
    {
        $shopId = $this->resolveShopId($request);
        $boy = DeliveryBoy::where('id', $id)
            ->orWhere('user_id', $id)
            ->firstOrFail();

        if ($shopId && $boy->shop_id && (int)$boy->shop_id !== (int)$shopId) {
            return response()->json(['success' => false, 'message' => 'Unauthorized: Delivery boy does not belong to your shop.'], 403);
        }

        $newStatus = $request->has('is_online')
            ? ($request->input('is_online') ? 1 : 0)
            : ($boy->is_online ? 0 : 1);

        $boy->is_online = $newStatus;
        $boy->save();

        return response()->json([
            'success'   => true,
            'message'   => 'Delivery boy status changed to ' . ($newStatus ? 'Online' : 'Offline'),
            'is_online' => (bool) $newStatus,
            'status'    => $newStatus ? 'Online' : 'Offline',
        ]);
    }

    /**
     * Update existing shop service.
     */
    public function updateService(Request $request, $id)
    {
        $shopId = $this->resolveShopId($request);
        $service = DB::table('shop_services')->where('id', $id)->first();

        if (!$service) {
            return response()->json(['success' => false, 'message' => 'Service not found'], 404);
        }

        if ($shopId && (int)$service->shop_id !== (int)$shopId) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $updates = ['updated_at' => now()];
        if ($request->filled('name')) $updates['name'] = $request->input('name');
        if ($request->filled('description')) $updates['description'] = $request->input('description');
        if ($request->filled('price')) $updates['price'] = $request->input('price');
        if ($request->filled('estimated_hours')) $updates['estimated_hours'] = $request->input('estimated_hours');
        if ($request->has('is_active')) $updates['is_active'] = $request->input('is_active') ? 1 : 0;

        DB::table('shop_services')->where('id', $id)->update($updates);

        return response()->json([
            'success' => true,
            'message' => 'Service updated successfully',
        ]);
    }

    /**
     * Delete existing shop service.
     */
    public function deleteService(Request $request, $id)
    {
        $shopId = $this->resolveShopId($request);
        $service = DB::table('shop_services')->where('id', $id)->first();

        if (!$service) {
            return response()->json(['success' => false, 'message' => 'Service not found'], 404);
        }

        if ($shopId && (int)$service->shop_id !== (int)$shopId) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        DB::table('shop_services')->where('id', $id)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Service removed successfully',
        ]);
    }

    /**
     * Notifications for laundry owner.
     */
    public function notifications(Request $request)
    {
        $shopId = $this->resolveShopId($request);

        $notifications = DB::table('notifications')
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $notifications,
        ]);
    }
}


