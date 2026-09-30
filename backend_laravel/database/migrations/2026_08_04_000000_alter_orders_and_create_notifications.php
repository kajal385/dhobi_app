<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Alter orders table to make shop_id nullable for testing
        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedBigInteger('shop_id')->nullable()->change();
            // Drop constraint if needed: $table->dropForeign(['shop_id']); 
            // Wait, doctrine/dbal might be needed to change columns.
        });

        // Alter order_items table to make service IDs nullable
        Schema::table('order_items', function (Blueprint $table) {
            $table->unsignedBigInteger('shop_service_id')->nullable()->change();
            $table->unsignedBigInteger('service_item_id')->nullable()->change();
        });

        // Create user_notifications table
        Schema::create('user_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('body');
            $table->string('type')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->json('data')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_notifications');
    }
};
