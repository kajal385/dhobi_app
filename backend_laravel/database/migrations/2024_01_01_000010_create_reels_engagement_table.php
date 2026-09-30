<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reels', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('shop_id')->constrained('laundry_shops')->cascadeOnDelete();
            $table->string('video_url');
            $table->string('thumbnail_url')->nullable();
            $table->string('caption')->nullable();
            $table->string('offer_text')->nullable(); // Promotional text on reel e.g. "20% OFF"
            $table->foreignId('coupon_id')->nullable()->constrained('coupons')->nullOnDelete();
            $table->integer('likes_count')->default(0);
            $table->integer('shares_count')->default(0);
            $table->integer('views_count')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['shop_id', 'is_active']);
        });

        Schema::create('favourites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('shop_id')->constrained('laundry_shops')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'shop_id']);
        });

        Schema::create('referrals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('referrer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('referred_user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->decimal('reward_amount', 10, 2)->default(0.00);
            $table->boolean('is_rewarded')->default(false);
            $table->timestamps();

            $table->index(['referrer_id', 'is_rewarded']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('referrals');
        Schema::dropIfExists('favourites');
        Schema::dropIfExists('reels');
    }
};
