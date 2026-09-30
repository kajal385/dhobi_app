<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Shop-Category pivot
        Schema::create('shop_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained('laundry_shops')->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['shop_id', 'category_id']);
        });

        // Services (types of laundry services each shop offers)
        Schema::create('shop_services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained('laundry_shops')->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
            $table->string('name', 100); // e.g. "Wash & Fold", "Dry Cleaning"
            $table->text('description')->nullable();
            $table->string('icon')->nullable();
            $table->string('image')->nullable();
            $table->integer('estimated_hours')->default(24);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['shop_id', 'is_active']);
        });

        // Individual items within a service (e.g., T-Shirt, Trouser)
        Schema::create('service_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_service_id')->constrained('shop_services')->cascadeOnDelete();
            $table->string('name', 100); // e.g. "T-Shirt", "Jeans"
            $table->string('icon')->nullable();
            $table->string('image')->nullable();
            $table->enum('pricing_type', ['per_piece', 'per_kg', 'both'])->default('per_piece');
            $table->decimal('price_per_piece', 10, 2)->nullable();
            $table->decimal('price_per_kg', 10, 2)->nullable();
            $table->integer('min_quantity')->default(1);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['shop_service_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_items');
        Schema::dropIfExists('shop_services');
        Schema::dropIfExists('shop_categories');
    }
};
