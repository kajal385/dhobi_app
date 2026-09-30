<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('order_number', 20)->unique(); // e.g. DHP-2024-001234
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('shop_id')->constrained('laundry_shops')->cascadeOnDelete();
            $table->foreignId('address_id')->nullable()->constrained('user_addresses')->nullOnDelete();

            // Pricing
            $table->decimal('subtotal', 10, 2)->default(0.00);
            $table->decimal('pickup_charge', 10, 2)->default(0.00);
            $table->decimal('delivery_charge', 10, 2)->default(0.00);
            $table->decimal('discount_amount', 10, 2)->default(0.00);
            $table->decimal('wallet_used', 10, 2)->default(0.00);
            $table->decimal('total_amount', 10, 2)->default(0.00);
            $table->decimal('tax_amount', 10, 2)->default(0.00);

            // Coupon
            $table->foreignId('coupon_id')->nullable()->constrained('coupons')->nullOnDelete();
            $table->string('coupon_code')->nullable();

            // Status
            $table->string('status', 50)->default('pending');
            // pending | confirmed | pickup_scheduled | pickup_assigned | on_the_way_pickup
            // picked_up | received | washing | dry_cleaning | ironing | quality_check
            // packing | ready_for_delivery | delivery_scheduled | out_for_delivery
            // delivered | completed | cancelled | refunded

            // Pickup
            $table->string('pickup_address')->nullable();
            $table->decimal('pickup_lat', 10, 7)->nullable();
            $table->decimal('pickup_lng', 10, 7)->nullable();
            $table->date('pickup_date')->nullable();
            $table->foreignId('pickup_slot_id')->nullable()->constrained('delivery_slots')->nullOnDelete();
            $table->string('pickup_time_label')->nullable();
            $table->timestamp('pickup_scheduled_at')->nullable();
            $table->timestamp('picked_up_at')->nullable();

            // Delivery
            $table->date('delivery_date')->nullable();
            $table->foreignId('delivery_slot_id')->nullable()->constrained('delivery_slots')->nullOnDelete();
            $table->string('delivery_time_label')->nullable();
            $table->timestamp('delivery_scheduled_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->string('delivery_otp', 10)->nullable();
            $table->boolean('delivery_otp_verified')->default(false);

            // Payment
            $table->enum('payment_method', ['cod', 'wallet', 'razorpay', 'upi', 'card', 'netbanking'])->default('cod');
            $table->enum('payment_status', ['pending', 'paid', 'failed', 'refunded'])->default('pending');

            // Instructions
            $table->text('special_instructions')->nullable();
            $table->json('garment_photos')->nullable(); // array of photo URLs

            // Express
            $table->boolean('is_express')->default(false);
            $table->decimal('express_charge', 10, 2)->default(0.00);

            // Estimated
            $table->timestamp('estimated_ready_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->string('cancelled_by')->nullable(); // user | shop | system

            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status']);
            $table->index(['shop_id', 'status']);
            $table->index('order_number');
            $table->index(['status', 'created_at']);
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('shop_service_id')->constrained('shop_services')->cascadeOnDelete();
            $table->foreignId('service_item_id')->constrained('service_items')->cascadeOnDelete();
            $table->string('service_name', 100);
            $table->string('item_name', 100);
            $table->enum('pricing_type', ['per_piece', 'per_kg'])->default('per_piece');
            $table->decimal('unit_price', 10, 2);
            $table->decimal('quantity', 8, 2)->default(1); // decimal for KG
            $table->decimal('total_price', 10, 2);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('order_id');
        });

        Schema::create('order_status_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('status', 50);
            $table->string('title', 100); // Human-readable status title
            $table->text('description')->nullable();
            $table->string('actor_type')->nullable(); // user | shop | system | delivery_agent
            $table->unsignedBigInteger('actor_id')->nullable();
            $table->json('meta')->nullable(); // extra data
            $table->timestamps();

            $table->index(['order_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_status_logs');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
