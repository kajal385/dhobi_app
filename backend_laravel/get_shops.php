<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
$shops = DB::table('laundry_shops')->get(['id', 'name', 'shop_name', 'owner_name', 'verification_status', 'is_verified']);
echo json_encode($shops, JSON_PRETTY_PRINT);
