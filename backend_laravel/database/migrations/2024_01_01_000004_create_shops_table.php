<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('slug', 120)->unique();
            $table->string('icon')->nullable(); // icon URL or icon name
            $table->string('image')->nullable();
            $table->string('color', 20)->nullable(); // hex color for UI
            $table->text('description')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('laundry_shops', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('owner_name');
            $table->string('phone', 15);
            $table->string('email')->nullable();
            $table->string('logo')->nullable();
            $table->string('cover_image')->nullable();
            $table->text('description')->nullable();
            $table->string('address');
            $table->string('area')->nullable();
            $table->string('city', 100);
            $table->string('state', 100);
            $table->string('pincode', 10);
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->decimal('rating', 3, 2)->default(0.00);
            $table->integer('review_count')->default(0);
            $table->decimal('min_order_amount', 10, 2)->default(0.00);
            $table->decimal('pickup_charge', 10, 2)->default(0.00);
            $table->decimal('delivery_charge', 10, 2)->default(0.00);
            $table->decimal('free_delivery_above', 10, 2)->default(0.00);
            $table->integer('estimated_delivery_hours')->default(24); // hours
            $table->integer('express_delivery_hours')->nullable();
            $table->boolean('is_open')->default(true);
            $table->boolean('is_verified')->default(false);
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_active')->default(true);
            $table->boolean('offers_express_delivery')->default(false);
            $table->boolean('offers_same_day')->default(false);
            $table->boolean('offers_free_pickup')->default(false);
            $table->boolean('offers_free_delivery')->default(false);
            $table->boolean('cod_available')->default(true);
            $table->boolean('offers_subscription')->default(false);
            $table->json('working_hours')->nullable(); // {"mon":{"open":"09:00","close":"21:00","closed":false}, ...}
            $table->json('gallery')->nullable(); // array of image URLs
            $table->text('gst_number')->nullable();
            $table->integer('total_orders')->default(0);
            $table->timestamp('last_active_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['latitude', 'longitude']);
            $table->index(['city', 'is_active', 'is_verified']);
            $table->index(['is_featured', 'rating']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('laundry_shops');
        Schema::dropIfExists('categories');
    }
};
