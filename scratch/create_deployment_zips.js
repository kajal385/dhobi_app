const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = 'c:\\CODEXXA_PROJECT\\Dhobi_app';
const STAGING_DIR = path.join(PROJECT_ROOT, '_deploy_staging');

// Clean up any previous staging
if (fs.existsSync(STAGING_DIR)) {
  fs.rmSync(STAGING_DIR, { recursive: true, force: true });
}
fs.mkdirSync(STAGING_DIR, { recursive: true });

// Helper to copy recursively with excludes
function copyRecursive(src, dest, excludeNames = new Set(), excludeExtensions = new Set()) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (excludeNames.has(path.basename(src))) return;
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      if (excludeNames.has(child)) continue;
      copyRecursive(path.join(src, child), path.join(dest, child), excludeNames, excludeExtensions);
    }
  } else {
    const ext = path.extname(src).toLowerCase();
    if (excludeExtensions.has(ext)) return;
    if (excludeNames.has(path.basename(src))) return;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

// ----------------------------------------------------
// 1. PREPARE LIVE SERVER DEPLOYMENT FOLDER
// ----------------------------------------------------
console.log('--- Preparing Live Server Package ---');
const liveServerDir = path.join(STAGING_DIR, 'dhobi_live_server_deployment');
const liveBackendDir = path.join(liveServerDir, 'backend');
const liveAdminDistDir = path.join(liveServerDir, 'admin_panel_dist');
const liveAdminSrcDir = path.join(liveServerDir, 'admin_panel_source');

// 1A. Copy Backend Laravel
console.log('Copying backend files...');
copyRecursive(
  path.join(PROJECT_ROOT, 'backend_laravel'),
  liveBackendDir,
  new Set(['node_modules', 'vendor', '.git', '.idea', '.vscode', 'cache', '.phpunit.result.cache'])
);

// Ensure storage subdirectories exist with .gitignore
const storageDirs = [
  'app/public',
  'framework/cache/data',
  'framework/sessions',
  'framework/views',
  'logs'
];
for (const sDir of storageDirs) {
  const full = path.join(liveBackendDir, 'storage', sDir);
  fs.mkdirSync(full, { recursive: true });
  fs.writeFileSync(path.join(full, '.gitignore'), "*\n!.gitignore\n");
}

// 1B. Copy Admin Panel Dist
console.log('Copying admin panel built dist...');
copyRecursive(
  path.join(PROJECT_ROOT, 'admin_panel', 'dist'),
  liveAdminDistDir
);

// Add SPA .htaccess for Apache / cPanel support
const spaHtaccess = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
`;
fs.writeFileSync(path.join(liveAdminDistDir, '.htaccess'), spaHtaccess);

// 1C. Copy Admin Panel Source (clean without node_modules)
console.log('Copying admin panel clean source...');
copyRecursive(
  path.join(PROJECT_ROOT, 'admin_panel'),
  liveAdminSrcDir,
  new Set(['node_modules', 'dist', '.git', '.idea', '.vscode'])
);

// 1D. Create Deployment Guide inside the package
const deployGuide = `# DhobiPro - Live Server Deployment Guide

This package contains everything required to deploy the **DhobiPro Backend API** and **Admin Panel** to your live server (cPanel, DirectAdmin, or VPS/Ubuntu).

---

## 📁 Package Structure

\`\`\`
dhobi_live_server_deployment/
├── backend/                  --> Laravel Backend API
│   ├── app/
│   ├── bootstrap/
│   ├── config/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── public/               --> Web Root (index.php, .htaccess, uploads/)
│   ├── routes/
│   ├── storage/
│   ├── artisan
│   ├── composer.json
│   └── .env.example
├── admin_panel_dist/         --> Built Production Web Dashboard (Ready to upload!)
│   ├── assets/
│   ├── index.html
│   └── .htaccess             --> SPA URL Rewrite rule for Apache/cPanel
└── admin_panel_source/       --> React/Vite Source Code (Clean without node_modules)
\`\`\`

---

## 🚀 Step-by-Step Deployment Instructions

### Option A: Deployment on cPanel / Shared Hosting

#### 1. Backend API Deployment
1. Upload the contents of the \`backend\` folder to your server (recommended: place outside \`public_html\` in a folder named \`dhobi_backend\`, e.g., \`/home/username/dhobi_backend\`).
2. Move or symlink the contents of \`backend/public/\` into your domain's web directory (or a subdomain folder like \`public_html/api\`).
3. If placing inside a subdomain \`api.yourdomain.com\`:
   - Point the subdomain's document root directly to \`/home/username/dhobi_backend/public\`.
4. In cPanel **MySQL Databases**:
   - Create a new MySQL database (e.g., \`username_dhobidb\`).
   - Create a new database user and strong password.
   - Assign user to database with **ALL PRIVILEGES**.
5. In \`/home/username/dhobi_backend\`:
   - Copy \`.env.example\` to \`.env\`.
   - Update database credentials:
     \`\`\`env
     APP_ENV=production
     APP_DEBUG=false
     APP_URL=https://api.yourdomain.com

     DB_CONNECTION=mysql
     DB_HOST=127.0.0.1
     DB_PORT=3306
     DB_DATABASE=your_database_name
     DB_USERNAME=your_database_user
     DB_PASSWORD=your_database_password
     \`\`\`
6. Install PHP dependencies:
   - Via cPanel Terminal or SSH in the backend directory:
     \`\`\`bash
     composer install --no-dev --optimize-autoloader
     php artisan key:generate
     php artisan migrate --force
     php artisan db:seed --force
     php artisan storage:link
     \`\`\`
7. Set directory permissions:
   - \`storage\` and \`bootstrap/cache\` must be writable (chmod 775 or 777).

#### 2. Admin Panel Web Dashboard Deployment
1. You can upload the contents of \`admin_panel_dist/\` directly to:
   - Your primary domain: \`public_html/\`
   - OR an admin subdomain: \`public_html/admin/\` or document root for \`admin.yourdomain.com\`.
2. The included \`.htaccess\` automatically handles SPA routing so refreshing pages like \`/orders\` or \`/customers\` works seamlessly!

---

### Option B: Deployment on VPS (Ubuntu / Nginx / Apache)

1. Clone or extract \`backend\` to \`/var/www/dhobi_backend\`.
2. Run:
   \`\`\`bash
   cd /var/www/dhobi_backend
   cp .env.example .env
   # Edit .env with your DB credentials
   nano .env
   composer install --no-dev --optimize-autoloader
   php artisan key:generate
   php artisan migrate --force
   php artisan db:seed --force
   php artisan storage:link
   sudo chown -R www-data:www-data /var/www/dhobi_backend/storage /var/www/dhobi_backend/bootstrap/cache
   sudo chmod -R 775 /var/www/dhobi_backend/storage /var/www/dhobi_backend/bootstrap/cache
   \`\`\`
3. Point Nginx / Apache root for the API to \`/var/www/dhobi_backend/public\`.
4. Copy \`admin_panel_dist\` to \`/var/www/dhobi_admin\` and point your admin domain/subdomain root there.

---

## 📱 Mobile Apps API URL Setup
When your live server backend is deployed at \`https://api.yourdomain.com\` or \`https://yourdomain.com/api\`:
- In **Customer App**: Update API endpoint in \`customer_app/src/services/\`
- In **Partner Delivery App**: In \`partner_delivery_app/src/services/apiClient.ts\`, change:
  \`\`\`ts
  const BASE_URL = 'https://api.yourdomain.com/api/v1';
  \`\`\`
`;
fs.writeFileSync(path.join(liveServerDir, 'DEPLOYMENT_GUIDE.md'), deployGuide);

// ----------------------------------------------------
// 2. PREPARE CLEAN FULL PROJECT REPO (ALL 4 APPS)
// ----------------------------------------------------
console.log('--- Preparing Clean Full Project Source (All 4 Apps) ---');
const fullRepoDir = path.join(STAGING_DIR, 'dhobi_project_clean_all');
fs.mkdirSync(fullRepoDir, { recursive: true });

const excludeGlobal = new Set([
  'node_modules',
  'vendor',
  '.git',
  '.idea',
  '.vscode',
  '.gradle',
  'build',
  '.cxx',
  'Pods',
  'DerivedData',
  'scratch',
  '_deploy_staging',
  'dist_zip',
  'test.zip'
]);

const excludeExts = new Set(['.o', '.obj', '.log', '.tmp']);

console.log('Copying backend_laravel...');
copyRecursive(
  path.join(PROJECT_ROOT, 'backend_laravel'),
  path.join(fullRepoDir, 'backend_laravel'),
  excludeGlobal,
  excludeExts
);

console.log('Copying admin_panel...');
copyRecursive(
  path.join(PROJECT_ROOT, 'admin_panel'),
  path.join(fullRepoDir, 'admin_panel'),
  excludeGlobal,
  excludeExts
);

console.log('Copying customer_app...');
copyRecursive(
  path.join(PROJECT_ROOT, 'customer_app'),
  path.join(fullRepoDir, 'customer_app'),
  excludeGlobal,
  excludeExts
);

console.log('Copying partner_delivery_app...');
copyRecursive(
  path.join(PROJECT_ROOT, 'partner_delivery_app'),
  path.join(fullRepoDir, 'partner_delivery_app'),
  excludeGlobal,
  excludeExts
);

// Copy root files
const rootFiles = ['README.md', '.gitignore'];
for (const rf of rootFiles) {
  const s = path.join(PROJECT_ROOT, rf);
  if (fs.existsSync(s)) fs.copyFileSync(s, path.join(fullRepoDir, rf));
}

// ----------------------------------------------------
// 3. CREATE ZIP ARCHIVES USING TAR.EXE
// ----------------------------------------------------
const OUTPUT_DIR = PROJECT_ROOT;
const liveServerZip = path.join(OUTPUT_DIR, 'dhobi_live_server_deploy.zip');
const backendZip = path.join(OUTPUT_DIR, 'dhobi_backend_laravel.zip');
const adminDistZip = path.join(OUTPUT_DIR, 'dhobi_admin_panel_dist.zip');
const fullProjectZip = path.join(OUTPUT_DIR, 'dhobi_project_clean_all.zip');

console.log('Creating dhobi_live_server_deploy.zip...');
if (fs.existsSync(liveServerZip)) fs.unlinkSync(liveServerZip);
execSync(`tar.exe -a -c -f "${liveServerZip}" -C "${STAGING_DIR}" dhobi_live_server_deployment`);

console.log('Creating dhobi_backend_laravel.zip...');
if (fs.existsSync(backendZip)) fs.unlinkSync(backendZip);
execSync(`tar.exe -a -c -f "${backendZip}" -C "${liveServerDir}" backend`);

console.log('Creating dhobi_admin_panel_dist.zip...');
if (fs.existsSync(adminDistZip)) fs.unlinkSync(adminDistZip);
execSync(`tar.exe -a -c -f "${adminDistZip}" -C "${liveServerDir}" admin_panel_dist`);

console.log('Creating dhobi_project_clean_all.zip...');
if (fs.existsSync(fullProjectZip)) fs.unlinkSync(fullProjectZip);
execSync(`tar.exe -a -c -f "${fullProjectZip}" -C "${STAGING_DIR}" dhobi_project_clean_all`);

// Print sizes
const stat1 = fs.statSync(liveServerZip);
const stat2 = fs.statSync(backendZip);
const stat3 = fs.statSync(adminDistZip);
const stat4 = fs.statSync(fullProjectZip);

console.log('=============================================');
console.log('SUCCESSFULLY CREATED COMPACT ZIP ARCHIVES:');
console.log('1. Live Server Bundle (Backend + Admin + Guide):', (stat1.size / (1024*1024)).toFixed(2), 'MB');
console.log('   Location:', liveServerZip);
console.log('2. Backend Laravel Only Zip:', (stat2.size / (1024*1024)).toFixed(2), 'MB');
console.log('   Location:', backendZip);
console.log('3. Admin Panel Web Dist Only Zip:', (stat3.size / (1024*1024)).toFixed(2), 'MB');
console.log('   Location:', adminDistZip);
console.log('4. Full Project Clean Source Zip (All 4 Apps):', (stat4.size / (1024*1024)).toFixed(2), 'MB');
console.log('   Location:', fullProjectZip);
console.log('=============================================');

// Clean up staging directory to save disk space
fs.rmSync(STAGING_DIR, { recursive: true, force: true });
console.log('Staging directory cleaned up.');
