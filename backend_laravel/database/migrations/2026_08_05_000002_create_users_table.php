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
            $table->string('name');
            $table->string('email')->unique();
            $table->string('phone')->unique();
            $table->string('password');
            $table->enum('role', ['customer', 'laundry_owner', 'delivery_boy', 'super_admin'])->default('customer');
            $table->enum('status', ['ACTIVE', 'PENDING', 'SUSPENDED'])->default('ACTIVE');
            $table->string('avatar')->nullable();
            $table->string('city')->nullable();
            $table->decimal('wallet_balance', 10, 2)->default(0.00);
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
