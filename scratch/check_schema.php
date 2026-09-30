<?php
    require 'C:/xampp/htdocs/dhobi_backend/vendor/autoload.php';
    $app = require_once 'C:/xampp/htdocs/dhobi_backend/bootstrap/app.php';
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();
    $columns = Schema::getColumnListing('orders');
    echo json_encode($columns);
  