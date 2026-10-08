<?php
require_once __DIR__ . '/includes/db.php';
$db = getDb();
if (!$db) {
    echo "Could not connect to database.\n";
    exit;
}

$backendBaseUrl = 'https://dhobi-api.bizz-manager.com/public';

// 1. Sync Banners from banners.json into DB
$bannersJsonPath = __DIR__ . '/../customer_app/src/constants/banners.json';
if (file_exists($bannersJsonPath)) {
    $banners = json_decode(file_get_contents($bannersJsonPath), true);
    if (is_array($banners)) {
        foreach ($banners as $b) {
            $bId = intval($b['id'] ?? 0);
            $sId = intval($b['shopId'] ?? 30);
            $title = $b['title'] ?? 'Banner';
            $image = $b['image'] ?? '';
            if ($bId > 0 && !empty($image)) {
                $check = $db->prepare("SELECT id FROM banners WHERE id = ?");
                $check->execute([$bId]);
                if ($check->fetch()) {
                    $up = $db->prepare("UPDATE banners SET shop_id = ?, title = ?, image = ?, is_active = 1 WHERE id = ?");
                    $up->execute([$sId, $title, $image, $bId]);
                } else {
                    $ins = $db->prepare("INSERT INTO banners (id, shop_id, title, image, is_active) VALUES (?, ?, ?, ?, 1)");
                    $ins->execute([$bId, $sId, $title, $image]);
                }
                echo "Synced banner #$bId ($title)\n";
            }
        }
    }
}

// 2. Sync Reels/Videos from reels.json into laundry_shops.shop_photos
$reelsJsonPath = __DIR__ . '/../customer_app/src/constants/reels.json';
if (file_exists($reelsJsonPath)) {
    $reels = json_decode(file_get_contents($reelsJsonPath), true);
    if (is_array($reels)) {
        $shopMediaMap = [];
        foreach ($reels as $r) {
            $sId = intval($r['shopId'] ?? 44);
            if (!isset($shopMediaMap[$sId])) $shopMediaMap[$sId] = [];
            $shopMediaMap[$sId][] = [
                'url' => $r['video_url'] ?? '',
                'thumbnail_url' => $r['thumbnail_url'] ?? '',
                'caption' => $r['caption'] ?? $r['shopName'] ?? 'Laundry Video',
                'type' => 'video'
            ];
        }

        // Add photos for shop 44
        if (isset($shopMediaMap[44])) {
            $shopMediaMap[44][] = [
                'url' => $backendBaseUrl . '/uploads/shop-media/photo_44_1791366470.jfif',
                'caption' => 'Star Wash Modern Facility',
                'type' => 'photo'
            ];
            $shopMediaMap[44][] = [
                'url' => $backendBaseUrl . '/uploads/shop-media/photo_44_1791366487.jfif',
                'caption' => 'Star Wash Cleaning Equipment',
                'type' => 'photo'
            ];
        }

        foreach ($shopMediaMap as $sId => $mediaList) {
            $stmt = $db->prepare("UPDATE laundry_shops SET shop_photos = ? WHERE id = ?");
            $stmt->execute([json_encode($mediaList), $sId]);
            echo "Synced shop #$sId with " . count($mediaList) . " media items in shop_photos\n";
        }
    }
}

echo "Sync completed successfully.\n";
