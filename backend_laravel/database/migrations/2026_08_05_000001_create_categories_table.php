<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Creates the `categories` table for laundry service categories.
     *
     * Usage:
     *   php artisan migrate
     */
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();

            // Display name – e.g. "Wash & Fold"
            $table->string('name', 100);

            // Unique machine-readable key – e.g. "wash_fold"
            $table->string('key', 50)->unique();

            // Emoji or icon identifier – e.g. "🧺" or "wash_fold_icon"
            $table->string('icon', 20)->default('🧺');

            // Background colour (hex) shown behind the icon circle
            $table->string('color', 10)->default('#D7D9FC');

            // Optional longer description shown on detail pages
            $table->text('description')->nullable();

            // Whether this category is visible in the app
            $table->boolean('is_active')->default(true);

            // Controls display order (lower = first)
            $table->unsignedSmallInteger('sort_order')->default(0);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
