<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->enum('method', ['cod', 'wallet', 'razorpay', 'upi', 'card', 'netbanking']);
            $table->enum('status', ['pending', 'success', 'failed', 'refunded'])->default('pending');
            $table->string('transaction_id')->nullable();     // Razorpay payment ID
            $table->string('razorpay_order_id')->nullable(); // Razorpay order ID
            $table->string('razorpay_signature')->nullable(); // Razorpay signature
            $table->json('gateway_response')->nullable();     // full raw response
            $table->string('refund_id')->nullable();
            $table->decimal('refund_amount', 10, 2)->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->text('failure_reason')->nullable();
            $table->timestamps();

            $table->index(['order_id', 'status']);
            $table->index('transaction_id');
        });

        Schema::create('wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->decimal('balance', 10, 2)->default(0.00);
            $table->decimal('cashback_balance', 10, 2)->default(0.00);
            $table->decimal('promo_balance', 10, 2)->default(0.00);
            $table->decimal('refund_balance', 10, 2)->default(0.00);
            $table->timestamps();
        });

        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('wallet_id')->constrained('wallets')->cascadeOnDelete();
            $table->enum('type', ['credit', 'debit']);
            $table->enum('category', [
                'add_money', 'order_payment', 'refund', 'cashback',
                'promo_credit', 'referral_bonus', 'loyalty_redemption', 'admin_credit'
            ]);
            $table->decimal('amount', 10, 2);
            $table->decimal('balance_after', 10, 2);
            $table->string('description');
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->string('reference_id')->nullable(); // Razorpay/UPI ref
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['wallet_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
        Schema::dropIfExists('wallets');
        Schema::dropIfExists('payments');
    }
};
