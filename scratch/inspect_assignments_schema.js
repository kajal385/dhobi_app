const fs = require('fs');
const { execSync } = require('child_process');

try {
  const phpScript = `<?php
    require 'C:/xampp/htdocs/dhobi_backend/vendor/autoload.php';
    $app = require_once 'C:/xampp/htdocs/dhobi_backend/bootstrap/app.php';
    $kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);
    $kernel->bootstrap();
    $columns = Schema::getColumnListing('delivery_assignments');
    echo json_encode($columns);
  `;
  fs.writeFileSync('c:\\CODEXXA_PROJECT\\Dhobi_app\\scratch\\check_assignments.php', phpScript, 'utf8');
  const out = execSync('php c:\\CODEXXA_PROJECT\\Dhobi_app\\scratch\\check_assignments.php').toString();
  console.log('Delivery Assignments Columns:', out);
} catch (err) {
  console.error('Schema check error:', err.message, err.stdout ? err.stdout.toString() : '');
}
