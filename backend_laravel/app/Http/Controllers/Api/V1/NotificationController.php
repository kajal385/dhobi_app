<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    /**
     * Resolve the authenticated or target user ID
     */
    protected function resolveUserId(Request $request): ?int
    {
        // 1. Try sanctum / auth user
        if ($user = $request->user()) {
            return (int) $user->id;
        }

        // 2. Try Authorization Bearer Token
        $token = $request->bearerToken();
        if ($token) {
            try {
                // If token is format "id|plainToken" or pure hash
                $tokenModel = null;
                if (str_contains($token, '|')) {
                    [$tokenId, ] = explode('|', $token, 2);
                    $tokenModel = DB::table('personal_access_tokens')->where('id', $tokenId)->first();
                } else {
                    $tokenModel = DB::table('personal_access_tokens')->where('token', hash('sha256', $token))->first();
                }
                if ($tokenModel && !empty($tokenModel->tokenable_id)) {
                    return (int) $tokenModel->tokenable_id;
                }
            } catch (\Throwable $e) {}
        }

        // 3. Try request input or headers
        if ($reqId = $request->input('user_id') ?? $request->header('X-User-Id')) {
            return (int) $reqId;
        }

        // 4. Try resolving via phone if present
        if ($phone = $request->input('phone') ?? $request->header('X-User-Phone')) {
            $digits = preg_replace('/\D/', '', $phone);
            $u = DB::table('users')
                ->where('phone', 'like', "%{$digits}%")
                ->orWhere('email', $phone)
                ->first();
            if ($u) {
                return (int) $u->id;
            }
        }

        // Default to first customer or null
        $firstCustomer = DB::table('users')->where('role', 'customer')->orderBy('id', 'asc')->first();
        return $firstCustomer ? (int) $firstCustomer->id : 1;
    }

    /**
     * Get paginated customer/user notifications
     * GET /api/v1/notifications
     */
    public function index(Request $request)
    {
        $userId = $this->resolveUserId($request);
        $page = (int) $request->input('page', 1);
        $perPage = (int) $request->input('per_page', 20);

        // Ensure user_notifications table exists
        $this->ensureNotificationTablesExist();

        // Auto-seed order notifications for customer if empty
        $this->syncOrderNotificationsForUser($userId);

        $notifications = [];
        $total = 0;

        try {
            $query = DB::table('user_notifications')
                ->where(function ($q) use ($userId) {
                    $q->where('user_id', $userId)
                      ->orWhereNull('user_id');
                })
                ->orderBy('created_at', 'desc')
                ->orderBy('id', 'desc');

            $total = $query->count();
            $items = $query->forPage($page, $perPage)->get();

            foreach ($items as $item) {
                $parsedData = null;
                if (!empty($item->data)) {
                    $parsedData = is_string($item->data) ? json_decode($item->data, true) : (array) $item->data;
                }

                $notifications[] = [
                    'id'         => (int) $item->id,
                    'user_id'    => (int) $item->user_id,
                    'title'      => (string) $item->title,
                    'body'       => (string) ($item->body ?? ''),
                    'message'    => (string) ($item->body ?? ''),
                    'type'       => (string) ($item->type ?? 'ORDER_UPDATE'),
                    'is_read'    => (bool) $item->is_read,
                    'data'       => $parsedData ?? (object) [],
                    'created_at' => (string) $item->created_at,
                    'updated_at' => (string) $item->updated_at,
                ];
            }
        } catch (\Throwable $e) {
            Log::warning('Error querying user_notifications: ' . $e->getMessage());
        }

        // If user_notifications is empty, fallback to legacy notifications table
        if (empty($notifications) && Schema::hasTable('notifications')) {
            try {
                $legacyItems = DB::table('notifications')
                    ->where(function ($q) use ($userId) {
                        $q->where('user_id', $userId)
                          ->orWhereNull('user_id');
                    })
                    ->orderBy('created_at', 'desc')
                    ->forPage($page, $perPage)
                    ->get();

                foreach ($legacyItems as $item) {
                    $notifications[] = [
                        'id'         => (int) $item->id,
                        'user_id'    => (int) ($item->user_id ?? $userId),
                        'title'      => (string) ($item->title ?? 'Order Update'),
                        'body'       => (string) ($item->message ?? $item->body ?? 'Your laundry status was updated.'),
                        'message'    => (string) ($item->message ?? $item->body ?? 'Your laundry status was updated.'),
                        'type'       => (string) ($item->type ?? 'ORDER_UPDATE'),
                        'is_read'    => (bool) ($item->is_read ?? false),
                        'data'       => (object) [],
                        'created_at' => (string) ($item->created_at ?? now()->toDateTimeString()),
                        'updated_at' => (string) ($item->updated_at ?? now()->toDateTimeString()),
                    ];
                }
                $total = count($notifications);
            } catch (\Throwable $e) {}
        }

        // Standard paginated structure expected by Customer App and Web Panels
        return response()->json([
            'success'      => true,
            'data'         => $notifications,
            'current_page' => $page,
            'last_page'    => max(1, (int) ceil($total / max(1, $perPage))),
            'per_page'     => $perPage,
            'total'        => $total,
            'unread_count' => count(array_filter($notifications, fn($n) => !$n['is_read'])),
        ]);
    }

    /**
     * Mark single notification as read
     * POST /api/v1/notifications/{id}/read
     */
    public function markRead(Request $request, $id)
    {
        $userId = $this->resolveUserId($request);

        if (Schema::hasTable('user_notifications')) {
            DB::table('user_notifications')
                ->where('id', $id)
                ->when($userId, fn($q) => $q->where(fn($sq) => $sq->where('user_id', $userId)->orWhereNull('user_id')))
                ->update(['is_read' => true, 'read_at' => now(), 'updated_at' => now()]);
        }

        if (Schema::hasTable('notifications')) {
            try {
                DB::table('notifications')
                    ->where('id', $id)
                    ->update(['is_read' => true, 'updated_at' => now()]);
            } catch (\Throwable $e) {}
        }

        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read',
        ]);
    }

    /**
     * Mark all notifications as read
     * POST /api/v1/notifications/read-all
     */
    public function markAllRead(Request $request)
    {
        $userId = $this->resolveUserId($request);

        if (Schema::hasTable('user_notifications')) {
            DB::table('user_notifications')
                ->when($userId, fn($q) => $q->where(fn($sq) => $sq->where('user_id', $userId)->orWhereNull('user_id')))
                ->update(['is_read' => true, 'read_at' => now(), 'updated_at' => now()]);
        }

        if (Schema::hasTable('notifications')) {
            try {
                DB::table('notifications')
                    ->when($userId, fn($q) => $q->where(fn($sq) => $sq->where('user_id', $userId)->orWhereNull('user_id')))
                    ->update(['is_read' => true, 'updated_at' => now()]);
            } catch (\Throwable $e) {}
        }

        return response()->json([
            'success' => true,
            'message' => 'All notifications marked as read',
        ]);
    }

    /**
     * Delete notification
     * DELETE /api/v1/notifications/{id}
     */
    public function destroy(Request $request, $id)
    {
        $userId = $this->resolveUserId($request);

        if (Schema::hasTable('user_notifications')) {
            DB::table('user_notifications')
                ->where('id', $id)
                ->when($userId, fn($q) => $q->where(fn($sq) => $sq->where('user_id', $userId)->orWhereNull('user_id')))
                ->delete();
        }

        if (Schema::hasTable('notifications')) {
            try {
                DB::table('notifications')
                    ->where('id', $id)
                    ->delete();
            } catch (\Throwable $e) {}
        }

        return response()->json([
            'success' => true,
            'message' => 'Notification deleted successfully',
        ]);
    }

    /**
     * Auto-sync actual order timeline and actions from laundry owner/admin into user_notifications
     */
    protected function syncOrderNotificationsForUser(?int $userId): void
    {
        if (!$userId || !Schema::hasTable('orders')) {
            return;
        }

        try {
            $existingCount = DB::table('user_notifications')->where('user_id', $userId)->count();
            if ($existingCount >= 5) {
                return; // User already has sufficient notifications
            }

            // Fetch recent orders for this customer
            $orders = DB::table('orders')
                ->where('user_id', $userId)
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get();

            if ($orders->isEmpty()) {
                // If customer has no specific order, fetch latest 2 system orders as sample notifications
                $orders = DB::table('orders')->orderBy('created_at', 'desc')->limit(2)->get();
            }

            foreach ($orders as $order) {
                $orderNum = $order->order_number ?? ('#' . $order->id);
                $status = strtoupper($order->status ?? 'PENDING');

                // Check if notification already exists for this order & status
                $alreadyExists = DB::table('user_notifications')
                    ->where('user_id', $userId)
                    ->where('data', 'like', "%\"order_id\":{$order->id}%")
                    ->exists();

                if (!$alreadyExists) {
                    $statusTitles = [
                        'PENDING'            => ["📋 Order Placed {$orderNum}", "Your laundry order has been received by the shop and is awaiting confirmation."],
                        'ACCEPTED'           => ["✅ Order Confirmed {$orderNum}", "The laundry owner has accepted your order and assigned a pickup slot."],
                        'CONFIRMED'          => ["✅ Order Confirmed {$orderNum}", "The laundry owner has confirmed your booking."],
                        'PICKUP_ASSIGNED'    => ["🛵 Pickup Scheduled {$orderNum}", "A delivery executive has been assigned to pick up your laundry clothes."],
                        'PICKED_UP'          => ["🧺 Laundry Picked Up {$orderNum}", "Your clothes have been safely picked up and are headed to the laundry facility."],
                        'IN_PROGRESS'        => ["🧼 Washing & Ironing {$orderNum}", "Your garments are currently being washed, cleaned and steam ironed."],
                        'PROCESSING'         => ["🧼 Washing & Ironing {$orderNum}", "Your garments are currently being processed by the laundry care team."],
                        'READY_FOR_DELIVERY' => ["✨ Ready for Delivery {$orderNum}", "Your clothes are sparkling clean, packaged and ready for delivery."],
                        'OUT_FOR_DELIVERY'   => ["🚀 Out for Delivery {$orderNum}", "Our delivery rider is on the way to your doorstep with your fresh laundry!"],
                        'DELIVERED'          => ["🎉 Order Delivered {$orderNum}", "Your laundry order has been delivered successfully. Thank you for choosing DhobiPro!"],
                        'CANCELLED'          => ["⚠️ Order Cancelled {$orderNum}", "Your order was cancelled. Any prepaid amount will be refunded to your wallet."],
                    ];

                    [$title, $body] = $statusTitles[$status] ?? [
                        "📦 Order Update {$orderNum}",
                        "Your order status is now " . ucfirst(strtolower(str_replace('_', ' ', $status))) . "."
                    ];

                    DB::table('user_notifications')->insert([
                        'user_id'    => $userId,
                        'title'      => $title,
                        'body'       => $body,
                        'type'       => 'ORDER_STATUS_UPDATE',
                        'is_read'    => false,
                        'data'       => json_encode([
                            'order_id'     => $order->id,
                            'order_number' => $orderNum,
                            'status'       => $status,
                        ]),
                        'created_at' => $order->updated_at ?? now(),
                        'updated_at' => $order->updated_at ?? now(),
                    ]);
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Error syncing order notifications: ' . $e->getMessage());
        }
    }

    /**
     * Ensure notification tables exist with proper structure
     */
    protected function ensureNotificationTablesExist(): void
    {
        if (!Schema::hasTable('user_notifications')) {
            try {
                Schema::create('user_notifications', function ($table) {
                    $table->id();
                    $table->unsignedBigInteger('user_id')->nullable()->index();
                    $table->string('title');
                    $table->text('body')->nullable();
                    $table->string('type')->nullable();
                    $table->boolean('is_read')->default(false);
                    $table->timestamp('read_at')->nullable();
                    $table->json('data')->nullable();
                    $table->timestamps();
                });
            } catch (\Throwable $e) {}
        }
    }
}
