<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('shop_id')->constrained('laundry_shops')->cascadeOnDelete();
            
            // Detailed Ratings
            $table->tinyInteger('rating')->unsigned(); // overall star rating (1-5)
            $table->tinyInteger('pickup_rating')->unsigned()->nullable();
            $table->tinyInteger('delivery_rating')->unsigned()->nullable();
            $table->tinyInteger('service_rating')->unsigned()->nullable();
            
            $table->text('comment')->nullable();
            $table->json('photos')->nullable(); // Photo URLs
            $table->json('videos')->nullable(); // Video URLs
            
            $table->boolean('is_approved')->default(true);
            $table->text('reply_from_shop')->nullable();
            $table->timestamp('replied_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['shop_id', 'is_approved']);
            $table->index(['user_id', 'shop_id']);
        });

        Schema::create('loyalty_points', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('type', ['earn', 'redeem']);
            $table->integer('points');
            $table->decimal('equivalent_amount', 10, 2)->default(0.00);
            $table->string('description');
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });

        Schema::create('memberships', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50); // e.g. "Dhobi Gold", "Dhobi Platinum"
            $table->string('slug', 60)->unique();
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2);
            $table->integer('duration_days')->default(30);
            $table->json('benefits')->nullable(); // E.g. {"free_delivery": true, "discount_percentage": 10}
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('user_memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('membership_id')->constrained('memberships')->cascadeOnDelete();
            $table->timestamp('expires_at');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['user_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_memberships');
        Schema::dropIfExists('memberships');
        Schema::dropIfExists('loyalty_points');
        Schema::dropIfExists('reviews');
    }
};
