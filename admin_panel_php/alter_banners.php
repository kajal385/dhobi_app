<?php
require 'includes/db.php';
$db = getDb();
try {
    $db->exec("ALTER TABLE banners ADD COLUMN shop_id BIGINT UNSIGNED NULL AFTER id");
    echo "Added shop_id column to banners.\n";
} catch (Exception $e) {
    echo "shop_id already exists or error: " . $e->getMessage() . "\n";
}
