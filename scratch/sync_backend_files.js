const fs = require('fs');
const path = require('path');

const srcDir = 'c:\\CODEXXA_PROJECT\\Dhobi_app\\backend_laravel';
const destDir = 'C:\\xampp\\htdocs\\dhobi_backend';

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

// Copy key files & directories
copyRecursiveSync(path.join(srcDir, 'app', 'Models'), path.join(destDir, 'app', 'Models'));
copyRecursiveSync(path.join(srcDir, 'app', 'Http', 'Controllers', 'Api', 'V1'), path.join(destDir, 'app', 'Http', 'Controllers', 'Api', 'V1'));
copyRecursiveSync(path.join(srcDir, 'routes', 'api.php'), path.join(destDir, 'routes', 'api.php'));

console.log('Backend files synced successfully to XAMPP!');
