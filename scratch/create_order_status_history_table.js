const fs = require('fs');
const path = require('path');

// 1. Copy migration file to C:\xampp\htdocs\dhobi_backend\database\migrations
const migrationContent = `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('order_status_history')) {
            Schema::create('order_status_history', function (Blueprint $table) {
                $table->id();
                $table->foreignId('order_id')->constrained('orders')->onDelete('cascade');
                $table->string('status', 50);
                $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
                $table->enum('user_role', ['customer', 'laundry_owner', 'delivery_boy', 'admin'])->default('admin');
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('order_status_history');
    }
};
`;

const destPath = 'C:\\xampp\\htdocs\\dhobi_backend\\database\\migrations\\2026_09_08_000001_create_order_status_history_table.php';
fs.writeFileSync(destPath, migrationContent, 'utf8');
console.log('Migration file created at:', destPath);
