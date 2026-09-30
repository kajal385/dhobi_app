<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Http\Request;
use App\Http\Controllers\Api\V1\AdminDashboardController;

$controller = new AdminDashboardController();
$req = Request::create('/api/v1/admin/delivery-boys', 'GET');
$res = $controller->deliveryBoys($req);
echo "Admin Delivery Boys Endpoint Response:\n" . $res->getContent() . "\n";
