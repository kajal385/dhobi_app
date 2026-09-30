<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->string('title', 100);
            $table->text('description')->nullable();
            $table->enum('discount_type', ['flat', 'percentage'])->default('flat');
            $table->decimal('discount_value', 10, 2);
            $table->decimal('max_discount', 10, 2)->nullable(); // cap for percentage discounts
            $table->decimal('min_order_amount', 10, 2)->default(0.00);
            $table->foreignId('shop_id')->nullable()->constrained('laundry_shops')->nullOnDelete();
            $table->boolean('is_global')->default(true); // valid for all shops
            $table->integer('usage_limit')->nullable(); // null = unlimited
            $table->integer('usage_per_user')->default(1);
            $table->integer('used_count')->default(0);
            $table->timestamp('valid_from')->nullable();
            $table->timestamp('valid_until')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['code', 'is_active']);
        });

        Schema::create('delivery_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained('laundry_shops')->cascadeOnDelete();
            $table->string('label', 50); // e.g. "Morning (8AM - 12PM)"
            $table->time('start_time');
            $table->time('end_time');
            $table->json('available_days')->nullable(); // [0,1,2,3,4,5,6] (0=Sun)
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('banners', function (Blueprint $table) {
            $table->id();
            $table->string('title', 150)->nullable();
            $table->string('image');
            $table->string('link')->nullable(); // deep link or URL
            $table->enum('target_type', ['shop', 'category', 'coupon', 'url', 'none'])->default('none');
            $table->unsignedBigInteger('target_id')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('banners');
        Schema::dropIfExists('delivery_slots');
        Schema::dropIfExists('coupons');
    }
};
