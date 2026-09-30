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
            $table->string('order_number')->unique();
            $table->foreignId('customer_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('laundry_shop_id')->constrained('laundry_shops')->onDelete('cascade');
            $table->foreignId('delivery_partner_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('city');
            $table->decimal('amount', 10, 2);
            $table->decimal('commission_amount', 10, 2)->default(0.00);
            $table->decimal('laundry_earnings', 10, 2)->default(0.00);
            $table->enum('payment_status', ['PAID', 'PENDING', 'FAILED', 'REFUNDED'])->default('PENDING');
            $table->string('payment_method')->default('ONLINE');
            $table->enum('status', [
                'PENDING',
                'CONFIRMED',
                'PICKUP_ASSIGNED',
                'PICKED_UP',
                'WASHING',
                'READY',
                'OUT_FOR_DELIVERY',
                'DELIVERED',
                'CANCELLED'
            ])->default('PENDING');
            $table->text('pickup_address');
            $table->text('delivery_address');
            $table->string('pickup_date')->nullable();
            $table->string('delivery_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
