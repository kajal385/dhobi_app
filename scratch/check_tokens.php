<?php
require __DIR__ . '/../backend_laravel/vendor/autoload.php';
$app = require_once __DIR__ . '/../backend_laravel/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $tokens = Illuminate\Support\Facades\DB::table('fcm_device_tokens')->get();
    echo "COUNT:" . count($tokens) . "\n";
    foreach ($tokens as $t) {
        echo "ID: {$t->id} | User: {$t->user_id} | App: {$t->app_type} | Device: {$t->device_type} | Token: " . substr($t->token, 0, 25) . "...\n";
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
