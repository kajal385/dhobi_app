<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$shops = DB::table('laundry_shops')
    ->select('id', 'name', 'phone', 'verification_status', 'is_verified', 'created_at')
    ->orderBy('id', 'desc')
    ->limit(10)
    ->get();

print_r($shops);
