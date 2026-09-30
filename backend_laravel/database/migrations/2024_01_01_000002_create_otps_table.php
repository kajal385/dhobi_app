<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('otps', function (Blueprint $table) {
            $table->id();
            $table->string('phone', 15)->index();
            $table->string('otp', 10);
            $table->enum('purpose', ['login', 'register', 'delete_account'])->default('login');
            $table->tinyInteger('attempts')->default(0);
            $table->boolean('is_verified')->default(false);
            $table->timestamp('expires_at');
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->index(['phone', 'purpose', 'is_verified']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('otps');
    }
};
