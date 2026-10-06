<?php
require 'includes/db.php';
$db = getDb();
try {
    $db->exec("ALTER TABLE categories ADD COLUMN shop_id BIGINT UNSIGNED NULL AFTER id");
    echo "Added shop_id column.\n";
} catch (Exception $e) {
    echo "shop_id already exists or error: " . $e->getMessage() . "\n";
}
try {
    $db->exec("ALTER TABLE categories DROP INDEX categories_key_unique");
    echo "Dropped unique index.\n";
} catch (Exception $e) {
    echo "Index might not exist: " . $e->getMessage() . "\n";
}
