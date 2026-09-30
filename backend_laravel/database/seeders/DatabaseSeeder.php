<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\LaundryShop;
use App\Models\Order;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed Categories
        $this->call(CategoriesSeeder::class);

        // 2. Seed Super Admin
        $admin = User::firstOrCreate(
            ['email' => 'admin@dhobipro.com'],
            [
                'name'           => 'Super Admin',
                'phone'          => '+91 9876543210',
                'password'       => Hash::make('admin123'),
                'role'           => 'super_admin',
                'status'         => 'ACTIVE',
                'city'           => 'Pune',
                'wallet_balance' => 0.00,
            ]
        );

        // 3. Seed Sample Customer
        $customer = User::firstOrCreate(
            ['email' => 'pooja.v@gmail.com'],
            [
                'name'           => 'Pooja Verma',
                'phone'          => '+91 98112 00998',
                'password'       => Hash::make('password123'),
                'role'           => 'customer',
                'status'         => 'ACTIVE',
                'city'           => 'Pune',
                'wallet_balance' => 450.00,
            ]
        );

        // 4. Seed Sample Laundry Owner
        $owner = User::firstOrCreate(
            ['email' => 'contact@expressclean.com'],
            [
                'name'           => 'Rajesh Kumar',
                'phone'          => '+91 98220 12345',
                'password'       => Hash::make('owner123'),
                'role'           => 'laundry_owner',
                'status'         => 'ACTIVE',
                'city'           => 'Pune',
                'wallet_balance' => 0.00,
            ]
        );

        // 5. Seed Laundry Shop
        $shop = LaundryShop::firstOrCreate(
            ['owner_id' => $owner->id],
            [
                'shop_name'           => 'ExpressClean Hub',
                'city'                => 'Pune',
                'address'             => 'Shop #4, Koregaon Park, Pune 411001',
                'phone'               => '+91 98220 12345',
                'email'               => 'contact@expressclean.com',
                'gst_number'          => '27AAAAA0000A1Z5',
                'bank_account'        => 'HDFC000123498765',
                'ifsc_code'           => 'HDFC0001234',
                'verification_status' => 'APPROVED',
                'account_status'      => 'ACTIVE',
                'subscription_plan'   => 'Professional (Monthly)',
                'gross_revenue'       => 124500.00,
                'commission_paid'     => 14940.00,
                'total_orders'        => 380,
                'rating'              => 4.9,
            ]
        );

        // 6. Seed Sample Order
        Order::firstOrCreate(
            ['order_number' => 'ORD-9821'],
            [
                'customer_id'       => $customer->id,
                'laundry_shop_id'   => $shop->id,
                'city'              => 'Pune',
                'amount'            => 450.00,
                'commission_amount' => 54.00,
                'laundry_earnings'  => 396.00,
                'payment_status'    => 'PAID',
                'payment_method'    => 'UPI',
                'status'            => 'WASHING',
                'pickup_address'    => 'Flat 302, Green Acres, Koregaon Park, Pune',
                'delivery_address'  => 'Flat 302, Green Acres, Koregaon Park, Pune',
                'pickup_date'       => '2026-09-03 10:00:00',
                'delivery_date'     => '2026-09-04 18:00:00',
            ]
        );

        $this->command->info('✅ DhobiPro Database seeded successfully with Super Admin, Customer, Owner, Shop, and Orders.');
    }
}
