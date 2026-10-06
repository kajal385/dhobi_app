<?php
session_start();
require_once __DIR__ . '/includes/db.php';
$db = getDb();
if ($db) {
    if (!empty($_SESSION['shop_media'])) {
        foreach ($_SESSION['shop_media'] as $shopId => $mediaArr) {
            $urls = array_column($mediaArr, 'url');
            $stmt = $db->prepare("UPDATE laundry_shops SET shop_photos = ? WHERE id = ?");
            $stmt->execute([json_encode($urls), $shopId]);
            echo "Updated shop $shopId with " . count($urls) . " photos.\n";
        }
    } else {
        echo "No shop media in session.\n";
    }
}
