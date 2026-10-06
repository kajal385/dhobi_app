<?php
require 'includes/db.php';
$db = getDb();
if ($db) {
    $dummyData = json_encode(['/uploads/shop-media/dummy1.jpg', '/uploads/shop-media/dummy2.mp4']);
    $stmt = $db->query("UPDATE laundry_shops SET shop_photos = '$dummyData' WHERE shop_photos IS NULL OR shop_photos = '' OR shop_photos = '[]'");
    echo "Updated shops with dummy media.\n";
}
