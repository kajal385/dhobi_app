<?php
require __DIR__ . '/backend_laravel/vendor/autoload.php';
$app = require_once __DIR__ . '/backend_laravel/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = App\Models\User::where('phone', '8600692767')->first();
if ($user) {
    $user->email = 'ashish.laundry@dhobipro.com';
    $user->password = Illuminate\Support\Facades\Hash::make('owner123');
    $user->save();
    echo "UPDATED\n";
} else {
    echo "USER NOT FOUND\n";
}
