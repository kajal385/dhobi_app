<?php
$p = new PDO('mysql:host=127.0.0.1;dbname=dhobi_db', 'root', '');
echo "=== DESCRIBE reels ===\n";
foreach ($p->query("DESCRIBE reels") as $c) {
    echo "{$c['Field']} ({$c['Type']})\n";
}

echo "\n=== ALL ROWS IN reels ===\n";
$stmt = $p->query("SELECT * FROM reels");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Total reels: " . count($rows) . "\n";
foreach ($rows as $r) {
    print_r($r);
}
