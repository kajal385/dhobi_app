<?php
$pdo = new PDO('mysql:host=127.0.0.1;dbname=dhobi_db','root','');
$stmt = $pdo->query('DESCRIBE orders');
$cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach($cols as $col) {
    echo $col['Field'] . "\n";
}
