<?php
$p = new PDO('mysql:host=127.0.0.1;dbname=dhobi_db', 'root', '');
echo "=== ALL delivery_boys ===\n";
foreach ($p->query("SELECT d.id, d.user_id, d.shop_id, u.name, u.phone FROM delivery_boys d JOIN users u ON d.user_id = u.id") as $r) {
    print_r($r);
}
