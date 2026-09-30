<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('phone', 15)->unique();
            $table->string('name')->nullable();
            $table->string('email')->nullable()->unique();
            $table->string('avatar')->nullable();
            $table->date('dob')->nullable();
            $table->enum('gender', ['male', 'female', 'other'])->nullable();
            $table->string('referral_code', 20)->unique()->nullable();
            $table->string('referred_by', 20)->nullable();
            $table->string('fcm_token')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_phone_verified')->default(false);
            $table->boolean('notifications_enabled')->default(true);
            $table->boolean('location_enabled')->default(false);
            $table->decimal('wallet_balance', 10, 2)->default(0.00);
            $table->integer('loyalty_points')->default(0);
            $table->string('membership_level')->default('bronze'); // bronze, silver, gold, platinum
            $table->timestamp('phone_verified_at')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['phone', 'is_active']);
            $table->index('referral_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
