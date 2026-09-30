<?php
$p = new PDO('mysql:host=127.0.0.1;dbname=dhobi_db', 'root', '');
$stmt = $p->query("SELECT id, name, city, owner_name FROM laundry_shops");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
