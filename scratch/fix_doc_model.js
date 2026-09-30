const fs = require('fs');

const docModelPath = 'C:/xampp/htdocs/dhobi_backend/app/Models/LaundryDocument.php';
const modelCode = `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Database\\Eloquent\\Model;

class LaundryDocument extends Model
{
    use HasFactory;

    protected $table = 'laundry_documents';

    protected $fillable = [
        'laundry_id',
        'document_type',
        'document_number',
        'file_path',
        'verification_status',
        'rejection_reason',
        'uploaded_at',
        'verified_at',
    ];
}
`;

fs.writeFileSync(docModelPath, modelCode, 'utf8');
console.log('Successfully updated LaundryDocument.php model!');
