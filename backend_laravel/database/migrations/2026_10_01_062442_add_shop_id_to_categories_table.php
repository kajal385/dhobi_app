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
        Schema::table('categories', function (Blueprint $table) {
            $table->unsignedBigInteger('shop_id')->nullable()->after('id');
            // We can't easily add a foreign key constraint without verifying laundry_shops exists, but it does.
            // Wait, we can just do a foreignId constraint.
            // But what if data exists? nullable is fine.
        });
        
        // Also remove unique constraint on 'key' since keys might be duplicated across shops.
        Schema::table('categories', function (Blueprint $table) {
            $table->dropUnique(['key']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->unique('key');
            $table->dropColumn('shop_id');
        });
    }
};
