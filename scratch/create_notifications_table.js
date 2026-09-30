const fs = require('fs');
const { execSync } = require('child_process');

try {
  const phpScript = `<?php
    require 'C:/xampp/htdocs/dhobi_backend/vendor/autoload.php';
    $app = require_once 'C:/xampp/htdocs/dhobi_backend/bootstrap/app.php';
    $kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);
    $kernel->bootstrap();
    
    if (!Schema::hasTable('notifications')) {
        Schema::create('notifications', function (Illuminate\\Database\\Schema\\Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('title');
            $table->text('message');
            $table->string('type')->default('GENERAL');
            $table->boolean('is_read')->default(false);
            $table->timestamps();
        });
        echo "Table notifications created successfully!";
    } else {
        echo "Table notifications already exists.";
    }
  `;
  fs.writeFileSync('c:\\CODEXXA_PROJECT\\Dhobi_app\\scratch\\create_notifications.php', phpScript, 'utf8');
  const out = execSync('php c:\\CODEXXA_PROJECT\\Dhobi_app\\scratch\\create_notifications.php').toString();
  console.log(out);
} catch (err) {
  console.error('Error creating notifications table:', err.message);
}
