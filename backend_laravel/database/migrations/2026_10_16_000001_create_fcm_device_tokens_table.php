<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('fcm_device_tokens')) {
            Schema::create('fcm_device_tokens', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete();
                $table->string('token', 500)->unique();
                $table->enum('device_type', ['android', 'ios', 'web'])->default('android');
                $table->enum('app_type', ['customer', 'owner', 'delivery', 'admin'])->default('customer');
                $table->string('device_name')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamp('last_used_at')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'is_active']);
                $table->index(['app_type', 'is_active']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fcm_device_tokens');
    }
};
