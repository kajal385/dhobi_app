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
        Schema::table('orders', function (Blueprint $table) {
            $table->string('service_type')->nullable();
            $table->unsignedBigInteger('pickup_address_id')->nullable();
            $table->unsignedBigInteger('delivery_address_id')->nullable();
            $table->text('notes')->nullable();
            $table->decimal('delivery_fee', 10, 2)->nullable();
            $table->decimal('discount', 10, 2)->nullable();
            $table->decimal('total', 10, 2)->nullable();
            $table->text('cancel_reason')->nullable();
            $table->integer('rating')->nullable();
            $table->text('review')->nullable();
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->string('name')->nullable();
            $table->decimal('price', 10, 2)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('models', function (Blueprint $table) {
            //
        });
    }
};
