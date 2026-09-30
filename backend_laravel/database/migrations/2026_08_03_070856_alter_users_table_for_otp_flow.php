<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds OTP-flow columns to the users table.
     * Existing columns:  phone, is_phone_verified, fcm_token are kept;
     * new alias / helper columns are added.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // mobile is a readable alias column (phone already exists — we add mobile as a virtual alias)
            if (!Schema::hasColumn('users', 'mobile')) {
                $table->string('mobile', 20)->nullable()->after('phone');
            }
            if (!Schema::hasColumn('users', 'country_code')) {
                $table->string('country_code', 10)->default('91')->after('mobile');
            }
            if (!Schema::hasColumn('users', 'otp')) {
                $table->string('otp', 10)->nullable()->after('country_code');
            }
            if (!Schema::hasColumn('users', 'otp_expiry')) {
                $table->timestamp('otp_expiry')->nullable()->after('otp');
            }
            if (!Schema::hasColumn('users', 'is_verified')) {
                $table->boolean('is_verified')->default(false)->after('otp_expiry');
            }
            if (!Schema::hasColumn('users', 'device_token')) {
                $table->string('device_token')->nullable()->after('is_verified');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumnIfExists('mobile');
            $table->dropColumnIfExists('country_code');
            $table->dropColumnIfExists('otp');
            $table->dropColumnIfExists('otp_expiry');
            $table->dropColumnIfExists('is_verified');
            $table->dropColumnIfExists('device_token');
        });
    }
};
