<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $req = \Illuminate\Http\Request::create('/api/v1/owner/orders', 'GET', ['shop_id' => 30]);
    $res = $app->handle($req);
    echo "STATUS CODE: " . $res->getStatusCode() . "\n";
    echo "CONTENT: " . $res->getContent() . "\n";
} catch (\Throwable $e) {
    echo "EXCEPTION: " . $e->getMessage() . "\n";
    echo "TRACE:\n" . $e->getTraceAsString() . "\n";
}
