<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'role')) {
                $table->enum('role', ['customer', 'laundry_owner', 'delivery_boy', 'admin', 'super_admin'])->default('customer')->after('id');
            }
            if (!Schema::hasColumn('users', 'alternate_phone')) {
                $table->string('alternate_phone')->nullable()->after('phone');
            }
        });

        Schema::table('laundry_shops', function (Blueprint $table) {
            if (!Schema::hasColumn('laundry_shops', 'owner_id')) {
                $table->unsignedBigInteger('owner_id')->nullable()->after('id');
                $table->foreign('owner_id')->references('id')->on('users')->onDelete('set null');
            }
            if (!Schema::hasColumn('laundry_shops', 'verification_status')) {
                $table->enum('verification_status', ['pending', 'approved', 'rejected', 'docs_required', 'suspended'])->default('pending')->after('is_verified');
            }
            if (!Schema::hasColumn('laundry_shops', 'suspension_reason')) {
                $table->text('suspension_reason')->nullable();
            }
            if (!Schema::hasColumn('laundry_shops', 'bank_name')) {
                $table->string('bank_name')->nullable();
                $table->string('bank_account')->nullable();
                $table->string('ifsc_code')->nullable();
                $table->string('account_holder')->nullable();
                $table->string('upi_id')->nullable();
            }
        });

        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'delivery_boy_id')) {
                $table->unsignedBigInteger('delivery_boy_id')->nullable()->after('shop_id');
                $table->foreign('delivery_boy_id')->references('id')->on('users')->onDelete('set null');
            }
            if (!Schema::hasColumn('orders', 'commission_amount')) {
                $table->decimal('commission_amount', 10, 2)->default(0.00)->after('tax_amount');
            }
            if (!Schema::hasColumn('orders', 'laundry_earnings')) {
                $table->decimal('laundry_earnings', 10, 2)->default(0.00)->after('commission_amount');
            }
            if (!Schema::hasColumn('orders', 'pickup_otp')) {
                $table->string('pickup_otp')->nullable();
            }
            if (!Schema::hasColumn('orders', 'pickup_photo_url')) {
                $table->string('pickup_photo_url')->nullable();
            }
            if (!Schema::hasColumn('orders', 'delivery_photo_url')) {
                $table->string('delivery_photo_url')->nullable();
            }
            if (!Schema::hasColumn('orders', 'digital_signature_url')) {
                $table->string('digital_signature_url')->nullable();
            }
        });

        if (!Schema::hasTable('laundry_documents')) {
            Schema::create('laundry_documents', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('laundry_id');
                $table->string('document_type');
                $table->string('document_number')->nullable();
                $table->string('file_path');
                $table->enum('verification_status', ['pending', 'approved', 'rejected', 'docs_required'])->default('pending');
                $table->text('rejection_reason')->nullable();
                $table->timestamp('uploaded_at')->useCurrent();
                $table->timestamp('verified_at')->nullable();
                $table->timestamps();
                $table->foreign('laundry_id')->references('id')->on('laundry_shops')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('laundry_verifications')) {
            Schema::create('laundry_verifications', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('laundry_id');
                $table->unsignedBigInteger('admin_id')->nullable();
                $table->string('action');
                $table->string('previous_status')->nullable();
                $table->string('new_status');
                $table->text('reason')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
                $table->foreign('laundry_id')->references('id')->on('laundry_shops')->onDelete('cascade');
                $table->foreign('admin_id')->references('id')->on('users')->onDelete('set null');
            });
        }

        if (!Schema::hasTable('delivery_boys')) {
            Schema::create('delivery_boys', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->string('vehicle_type')->nullable();
                $table->string('vehicle_number')->nullable();
                $table->string('license_number')->nullable();
                $table->boolean('is_online')->default(false);
                $table->enum('verification_status', ['pending', 'approved', 'rejected', 'suspended'])->default('pending');
                $table->decimal('current_lat', 10, 7)->nullable();
                $table->decimal('current_lng', 10, 7)->nullable();
                $table->integer('active_orders_count')->default(0);
                $table->integer('completed_orders_count')->default(0);
                $table->decimal('rating', 3, 2)->default(5.00);
                $table->timestamps();
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('delivery_assignments')) {
            Schema::create('delivery_assignments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('order_id');
                $table->unsignedBigInteger('delivery_boy_id');
                $table->enum('type', ['pickup', 'delivery', 'both'])->default('both');
                $table->enum('status', ['assigned', 'accepted', 'on_the_way', 'arrived', 'completed', 'cancelled', 'failed'])->default('assigned');
                $table->string('otp')->nullable();
                $table->boolean('otp_verified')->default(false);
                $table->string('proof_photo_url')->nullable();
                $table->string('digital_signature_url')->nullable();
                $table->text('notes')->nullable();
                $table->timestamp('assigned_at')->useCurrent();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();
                $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
                $table->foreign('delivery_boy_id')->references('id')->on('users')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('delivery_locations')) {
            Schema::create('delivery_locations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('delivery_boy_id');
                $table->unsignedBigInteger('order_id')->nullable();
                $table->decimal('latitude', 10, 7);
                $table->decimal('longitude', 10, 7);
                $table->timestamp('created_at')->useCurrent();
                $table->foreign('delivery_boy_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('order_id')->references('id')->on('orders')->onDelete('set null');
            });
        }

        if (!Schema::hasTable('refunds')) {
            Schema::create('refunds', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('order_id');
                $table->unsignedBigInteger('user_id');
                $table->decimal('amount', 10, 2);
                $table->string('reason');
                $table->enum('status', ['requested', 'approved', 'rejected', 'processed'])->default('requested');
                $table->text('admin_note')->nullable();
                $table->string('transaction_reference')->nullable();
                $table->timestamp('requested_at')->useCurrent();
                $table->timestamp('approved_at')->nullable();
                $table->timestamp('processed_at')->nullable();
                $table->timestamps();
                $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('commission_settings')) {
            Schema::create('commission_settings', function (Blueprint $table) {
                $table->id();
                $table->string('scope_type')->default('global');
                $table->string('scope_value')->nullable();
                $table->decimal('commission_percentage', 5, 2)->default(10.00);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('commissions')) {
            Schema::create('commissions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('order_id');
                $table->unsignedBigInteger('laundry_id');
                $table->decimal('gross_amount', 10, 2);
                $table->decimal('commission_percentage', 5, 2);
                $table->decimal('commission_amount', 10, 2);
                $table->decimal('laundry_earning', 10, 2);
                $table->enum('settlement_status', ['pending', 'processing', 'settled', 'failed'])->default('pending');
                $table->timestamps();
                $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
                $table->foreign('laundry_id')->references('id')->on('laundry_shops')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('settlements')) {
            Schema::create('settlements', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('laundry_id');
                $table->decimal('gross_revenue', 10, 2);
                $table->decimal('commission_deducted', 10, 2);
                $table->decimal('tax_deducted', 10, 2)->default(0.00);
                $table->decimal('net_payout', 10, 2);
                $table->string('payment_method')->default('bank_transfer');
                $table->string('reference_id')->nullable();
                $table->enum('status', ['pending', 'processing', 'paid', 'failed'])->default('pending');
                $table->timestamp('payout_date')->nullable();
                $table->timestamps();
                $table->foreign('laundry_id')->references('id')->on('laundry_shops')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('laundry_subscriptions')) {
            Schema::create('laundry_subscriptions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('laundry_id');
                $table->string('plan_name');
                $table->decimal('price', 10, 2);
                $table->string('billing_cycle')->default('monthly');
                $table->timestamp('start_date')->useCurrent();
                $table->timestamp('expiry_date')->nullable();
                $table->boolean('auto_renew')->default(true);
                $table->enum('status', ['active', 'expiring_soon', 'expired', 'cancelled'])->default('active');
                $table->string('payment_reference')->nullable();
                $table->timestamps();
                $table->foreign('laundry_id')->references('id')->on('laundry_shops')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('coupon_usages')) {
            Schema::create('coupon_usages', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('coupon_id');
                $table->unsignedBigInteger('user_id');
                $table->unsignedBigInteger('order_id');
                $table->decimal('discount_amount', 10, 2);
                $table->timestamp('used_at')->useCurrent();
                $table->foreign('coupon_id')->references('id')->on('coupons')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('complaints')) {
            Schema::create('complaints', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('order_id');
                $table->unsignedBigInteger('user_id');
                $table->unsignedBigInteger('laundry_id')->nullable();
                $table->unsignedBigInteger('assigned_admin_id')->nullable();
                $table->string('category');
                $table->string('priority')->default('medium');
                $table->text('description');
                $table->longText('attachments')->nullable();
                $table->enum('status', ['open', 'in_progress', 'resolved', 'closed'])->default('open');
                $table->text('admin_notes')->nullable();
                $table->text('resolution')->nullable();
                $table->timestamps();
                $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('laundry_id')->references('id')->on('laundry_shops')->onDelete('set null');
                $table->foreign('assigned_admin_id')->references('id')->on('users')->onDelete('set null');
            });
        }

        if (!Schema::hasTable('invoices')) {
            Schema::create('invoices', function (Blueprint $table) {
                $table->id();
                $table->string('invoice_number')->unique();
                $table->unsignedBigInteger('order_id');
                $table->unsignedBigInteger('user_id');
                $table->unsignedBigInteger('laundry_id');
                $table->decimal('subtotal', 10, 2);
                $table->decimal('tax_amount', 10, 2)->default(0.00);
                $table->decimal('discount_amount', 10, 2)->default(0.00);
                $table->decimal('final_amount', 10, 2);
                $table->string('gst_number')->nullable();
                $table->string('invoice_pdf_path')->nullable();
                $table->enum('payment_status', ['paid', 'pending', 'refunded'])->default('paid');
                $table->timestamps();
                $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('laundry_id')->references('id')->on('laundry_shops')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('activity_logs')) {
            Schema::create('activity_logs', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('admin_id')->nullable();
                $table->string('action');
                $table->string('module');
                $table->string('record_id')->nullable();
                $table->longText('old_value')->nullable();
                $table->longText('new_value')->nullable();
                $table->string('ip_address')->nullable();
                $table->timestamps();
                $table->foreign('admin_id')->references('id')->on('users')->onDelete('set null');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('complaints');
        Schema::dropIfExists('coupon_usages');
        Schema::dropIfExists('laundry_subscriptions');
        Schema::dropIfExists('settlements');
        Schema::dropIfExists('commissions');
        Schema::dropIfExists('commission_settings');
        Schema::dropIfExists('refunds');
        Schema::dropIfExists('delivery_locations');
        Schema::dropIfExists('delivery_assignments');
        Schema::dropIfExists('delivery_boys');
        Schema::dropIfExists('laundry_verifications');
        Schema::dropIfExists('laundry_documents');
    }
};
