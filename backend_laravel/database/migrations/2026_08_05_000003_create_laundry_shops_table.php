<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('laundry_shops', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->onDelete('cascade');
            $table->string('shop_name');
            $table->string('city');
            $table->text('address');
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('phone');
            $table->string('email')->nullable();
            $table->string('gst_number')->nullable();
            $table->string('bank_account')->nullable();
            $table->string('ifsc_code')->nullable();
            $table->text('logo_url')->nullable();
            $table->text('cover_url')->nullable();
            $table->text('shop_photos')->nullable();
            $table->string('id_proof_number')->nullable();
            $table->text('id_proof_photo')->nullable();
            $table->string('business_proof_number')->nullable();
            $table->text('business_proof_photo')->nullable();
            $table->string('pickup_radius_km')->default('5');
            $table->string('working_hours')->default('08:00 AM - 09:00 PM');
            $table->enum('verification_status', ['APPROVED', 'PENDING', 'DOCS_REQUIRED', 'REJECTED'])->default('PENDING');
            $table->enum('account_status', ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'])->default('ACTIVE');
            $table->string('subscription_plan')->default('Basic (Monthly)');
            $table->decimal('gross_revenue', 12, 2)->default(0.00);
            $table->decimal('commission_paid', 12, 2)->default(0.00);
            $table->integer('total_orders')->default(0);
            $table->decimal('rating', 3, 2)->default(5.00);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('laundry_shops');
    }
};
