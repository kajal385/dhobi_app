<?php
    require 'C:/xampp/htdocs/dhobi_backend/vendor/autoload.php';
    $app = require_once 'C:/xampp/htdocs/dhobi_backend/bootstrap/app.php';
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();
    
    if (!Schema::hasTable('notifications')) {
        Schema::create('notifications', function (Illuminate\Database\Schema\Blueprint $table) {
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
  