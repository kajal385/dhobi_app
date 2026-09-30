<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('laundry_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('laundry_id')->constrained('laundry_shops')->onDelete('cascade');
            $table->string('document_type');
            $table->string('document_number')->nullable();
            $table->text('file_path');
            $table->enum('verification_status', ['pending', 'approved', 'rejected', 'docs_required'])->default('pending');
            $table->text('rejection_reason')->nullable();
            $table->timestamp('uploaded_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('laundry_documents');
    }
};
