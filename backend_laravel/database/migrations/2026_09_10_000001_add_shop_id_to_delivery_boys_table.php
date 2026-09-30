<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add shop_id to delivery_boys table so each delivery boy belongs to a specific laundry shop.
 * This ensures laundry owners only see their OWN delivery staff.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('delivery_boys', function (Blueprint $table) {
            // Only add if the column does not already exist
            if (!Schema::hasColumn('delivery_boys', 'shop_id')) {
                $table->unsignedBigInteger('shop_id')->nullable()->after('user_id');
                $table->index('shop_id', 'delivery_boys_shop_id_index');
            }
        });
    }

    public function down(): void
    {
        Schema::table('delivery_boys', function (Blueprint $table) {
            if (Schema::hasColumn('delivery_boys', 'shop_id')) {
                $table->dropIndex('delivery_boys_shop_id_index');
                $table->dropColumn('shop_id');
            }
        });
    }
};
