const fs = require('fs');

try {
  const content = fs.readFileSync('C:\\xampp\\htdocs\\dhobi_backend\\storage\\logs\\laravel.log', 'utf8');
  const lines = content.trim().split('\n');
  console.log('--- RECENT 30 LINES OF LARAVEL LOG ---');
  console.log(lines.slice(-30).join('\n'));
} catch (err) {
  console.error('Log read error:', err.message);
}
