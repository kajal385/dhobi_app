<?php
$pdo = new PDO('mysql:host=127.0.0.1;dbname=dhobi_db','root','');
$stmt = $pdo->query('DESCRIBE orders');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
