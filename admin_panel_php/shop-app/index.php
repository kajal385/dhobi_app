<?php
$pageTitle = 'Customer App Management';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';
require_once __DIR__ . '/../includes/db.php';

$isOwner     = isLaundryOwner();
$currentUser = currentUser();
$db          = getDb();

// 1. Resolve All Registered Shops
$allShopsList = [];
if ($db) {
    try {
        $st = $db->query("SELECT id, name, owner_name, city, address FROM laundry_shops ORDER BY name ASC");
        $allShopsList = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (\Throwable $e) {}
}
if (!empty($_SESSION['custom_shops'])) {
    foreach ($_SESSION['custom_shops'] as $cs) {
        $cid = strval($cs['id'] ?? '');
        if ($cid && !array_filter($allShopsList, fn($s) => strval($s['id']) === $cid)) {
            $allShopsList[] = [
                'id'         => $cid,
                'name'       => $cs['name'] ?? 'Laundry Shop #' . $cid,
                'owner_name' => $cs['owner_name'] ?? $cs['ownerName'] ?? 'Owner',
                'city'       => $cs['city'] ?? '',
                'address'    => $cs['address'] ?? ''
            ];
        }
    }
}
$reelsJsonPath = __DIR__ . '/../../customer_app/src/constants/reels.json';
if (file_exists($reelsJsonPath)) {
    $rj = json_decode(file_get_contents($reelsJsonPath), true);
    if (is_array($rj)) {
        foreach ($rj as $r) {
            $rid = strval($r['shopId'] ?? '');
            if ($rid && !array_filter($allShopsList, fn($s) => strval($s['id']) === $rid)) {
                $allShopsList[] = [
                    'id'         => $rid,
                    'name'       => $r['shopName'] ?? 'Laundry Shop #' . $rid,
                    'owner_name' => $r['ownerName'] ?? 'Owner',
                    'city'       => $r['location'] ?? '',
                    'address'    => $r['location'] ?? ''
                ];
            }
        }
    }
}
if (empty($allShopsList)) {
    $allShopsList = [
        ['id' => '30', 'name' => 'My Laundry Shop', 'owner_name' => 'Rajesh Sharma', 'city' => 'Delhi', 'address' => 'Main Market, Sector 14, Delhi'],
        ['id' => '44', 'name' => 'Star Wash Ultra Premium', 'owner_name' => 'Ashish Bhosale', 'city' => 'Pune', 'address' => 'Tathawade,pune']
    ];
}

// 2. Strict Role Scoping
// Laundry Owner: strictly locked to their self shop ID. Cannot view other shops.
// Super Admin: can view all shops overall, or filter by specific shop.
$currentOwnerShopId = strval(currentShopId() ?: ($currentUser['shopId'] ?? $currentUser['shop_id'] ?? '30'));
if ($isOwner) {
    $shopId = $currentOwnerShopId;
    $selectedShopFilter = $shopId;
} else {
    $selectedShopFilter = isset($_GET['shop_id']) ? strval($_GET['shop_id']) : 'all';
    $shopId = ($selectedShopFilter !== 'all') ? $selectedShopFilter : $currentOwnerShopId;
}

// Helper to find shop details by ID
function findShopById($sId, $list) {
    foreach ($list as $s) {
        if (strval($s['id']) === strval($sId)) return $s;
    }
    return [
        'id'         => strval($sId),
        'name'       => 'Laundry Shop #' . $sId,
        'owner_name' => 'Shop Owner',
        'address'    => 'Shop Location'
    ];
}

$currentShopInfo = findShopById($shopId, $allShopsList);
$shopName     = $currentShopInfo['name'] ?: (currentShopName() ?: 'My Laundry Shop');
$ownerName    = $currentShopInfo['owner_name'] ?: ($currentUser['name'] ?? 'Rajesh Sharma');
$shopLocation = $currentShopInfo['address'] ?: ($currentShopInfo['city'] ?: 'Main Market, Sector 14, Delhi');

$actionMsg  = null;
$actionType = 'success';

// 3. Handle Form Actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (empty($_POST) && empty($_FILES) && !empty($_SERVER['CONTENT_LENGTH'])) {
        $actionMsg = 'Uploaded file exceeds max limit (' . round(floatval($_SERVER['CONTENT_LENGTH']) / 1048576, 1) . 'MB). Max allowed: ' . ini_get('post_max_size') . '. Please choose a file under ' . ini_get('post_max_size') . ' or paste a video URL.';
        $actionType = 'error';
    }
    $act = $_POST['action'] ?? '';

    // Determine target shop for creation: locked to currentOwnerShopId if owner, else target_shop_id
    $targetShopId = $isOwner ? $currentOwnerShopId : strval($_POST['target_shop_id'] ?? $shopId);
    $targetInfo   = findShopById($targetShopId, $allShopsList);
    $targetShopName  = $targetInfo['name'];
    $targetOwnerName = $targetInfo['owner_name'];
    $targetShopLoc   = $targetInfo['address'] ?: ($targetInfo['city'] ?: 'Shop Location');

    // -- BANNER ACTIONS --
    if ($act === 'add_banner') {
        $uploadDir = __DIR__ . '/../uploads/banners/';
        if (!is_dir($uploadDir)) @mkdir($uploadDir, 0777, true);
        if (!empty($_FILES['banner_image']['name']) && $_FILES['banner_image']['error'] === UPLOAD_ERR_OK) {
            $ext = strtolower(pathinfo($_FILES['banner_image']['name'], PATHINFO_EXTENSION));
            $fname = 'banner_' . $targetShopId . '_' . time() . '.' . $ext;
            
            if (move_uploaded_file($_FILES['banner_image']['tmp_name'], $uploadDir . $fname)) {
                $bannerTitle = htmlspecialchars(trim($_POST['banner_title'] ?? 'Banner'));
                $bannerSubtitle = htmlspecialchars(trim($_POST['banner_subtitle'] ?? 'Special festive laundry & dry clean offer'));
                $bannerTag = htmlspecialchars(trim($_POST['banner_tag'] ?? 'ACTIVE'));
                $bannerTagColor = htmlspecialchars(trim($_POST['banner_tag_color'] ?? '#10B981'));
                $bannerPath = '/uploads/banners/' . $fname;
                $bannerUrl = (defined('ADMIN_BASE_URL') ? ADMIN_BASE_URL : '') . $bannerPath;
                $insertedId = null;

                // Sync with DB
                $db = getDb();
                if ($db) {
                    try {
                        $stmt = $db->prepare("INSERT INTO banners (shop_id, title, image, is_active) VALUES (?, ?, ?, ?)");
                        $stmt->execute([$targetShopId, $bannerTitle, $bannerPath, 1]);
                        $insertedId = $db->lastInsertId();
                    } catch (\Throwable $e) {}
                }

                $newBanner = [
                    'id'       => strval($insertedId ?: ('b_' . time())),
                    'shopId'   => strval($targetShopId),
                    'shopName' => $targetShopName,
                    'title'    => $bannerTitle,
                    'subtitle' => $bannerSubtitle,
                    'tag'      => $bannerTag,
                    'tagColor' => $bannerTagColor,
                    'url'      => $bannerUrl,
                    'image'    => $bannerPath,
                    'active'   => true,
                    'added'    => date('d M Y')
                ];

                // Auto-sync image to customer app assets
                $appAssetDir = __DIR__ . '/../../customer_app/assets/myimages/';
                if (is_dir($appAssetDir)) {
                    @copy($uploadDir . $fname, $appAssetDir . $fname);
                }

                // Update banners.json
                $jsonPath = __DIR__ . '/../../customer_app/src/constants/banners.json';
                $allBanners = [];
                if (file_exists($jsonPath)) {
                    $decoded = json_decode(file_get_contents($jsonPath), true);
                    if (is_array($decoded)) $allBanners = $decoded;
                }
                array_unshift($allBanners, $newBanner);
                @file_put_contents($jsonPath, json_encode(array_values($allBanners), JSON_PRETTY_PRINT));

                if (!isset($_SESSION['shop_banners'][$targetShopId])) $_SESSION['shop_banners'][$targetShopId] = [];
                array_unshift($_SESSION['shop_banners'][$targetShopId], $newBanner);

                $actionMsg = 'Banner card uploaded successfully for ' . htmlspecialchars($targetShopName) . '!';
            } else {
                $actionMsg = 'Could not save the uploaded image file.';
                $actionType = 'error';
            }
        } else {
            $actionMsg = 'Please select a valid image.';
            $actionType = 'error';
        }
    } elseif ($act === 'edit_banner') {
        $bid = strval($_POST['banner_id'] ?? '');
        $newTitle = htmlspecialchars(trim($_POST['banner_title'] ?? 'Banner'));
        $newSubtitle = htmlspecialchars(trim($_POST['banner_subtitle'] ?? 'Special Offer'));
        $newTag = htmlspecialchars(trim($_POST['banner_tag'] ?? 'ACTIVE'));
        $newTagColor = htmlspecialchars(trim($_POST['banner_tag_color'] ?? '#10B981'));

        $uploadDir = __DIR__ . '/../uploads/banners/';
        if (!is_dir($uploadDir)) @mkdir($uploadDir, 0777, true);

        $newFname = null;
        if (!empty($_FILES['banner_image']['name']) && $_FILES['banner_image']['error'] === UPLOAD_ERR_OK) {
            $ext = strtolower(pathinfo($_FILES['banner_image']['name'], PATHINFO_EXTENSION));
            $newFname = 'banner_' . time() . '.' . $ext;
            if (move_uploaded_file($_FILES['banner_image']['tmp_name'], $uploadDir . $newFname)) {
                $appAssetDir = __DIR__ . '/../../customer_app/assets/myimages/';
                if (is_dir($appAssetDir)) {
                    @copy($uploadDir . $newFname, $appAssetDir . $newFname);
                }
            } else {
                $newFname = null;
            }
        }

        // Update database if possible
        $db = getDb();
        if ($db && $bid) {
            try {
                if ($newFname) {
                    $bannerPath = '/uploads/banners/' . $newFname;
                    $stmt = $db->prepare("UPDATE banners SET title = ?, image = ? WHERE id = ?");
                    $stmt->execute([$newTitle, $bannerPath, $bid]);
                } else {
                    $stmt = $db->prepare("UPDATE banners SET title = ? WHERE id = ?");
                    $stmt->execute([$newTitle, $bid]);
                }
            } catch (\Throwable $e) {}
        }

        // Update banners.json
        $jsonPath = __DIR__ . '/../../customer_app/src/constants/banners.json';
        if (file_exists($jsonPath)) {
            $allBanners = json_decode(file_get_contents($jsonPath), true);
            if (is_array($allBanners)) {
                foreach ($allBanners as &$b) {
                    if (strval($b['id'] ?? '') === $bid) {
                        $b['title'] = $newTitle;
                        $b['subtitle'] = $newSubtitle;
                        $b['tag'] = $newTag;
                        $b['tagColor'] = $newTagColor;
                        if ($newFname) {
                            $bannerPath = '/uploads/banners/' . $newFname;
                            $b['image'] = $bannerPath;
                            $b['url'] = (defined('ADMIN_BASE_URL') ? ADMIN_BASE_URL : '') . $bannerPath;
                        }
                    }
                }
                unset($b);
                @file_put_contents($jsonPath, json_encode(array_values($allBanners), JSON_PRETTY_PRINT));
            }
        }

        $actionMsg = 'Banner card updated successfully!';
    } elseif ($act === 'delete_banner') {
        $bid = strval($_POST['banner_id'] ?? '');
        if ($bid) {
            $db = getDb();
            if ($db) {
                try {
                    $stmt = $db->prepare("DELETE FROM banners WHERE id = ?");
                    $stmt->execute([$bid]);
                } catch (\Throwable $e) {}
            }
            $jsonPath = __DIR__ . '/../../customer_app/src/constants/banners.json';
            if (file_exists($jsonPath)) {
                $allBanners = json_decode(file_get_contents($jsonPath), true);
                if (is_array($allBanners)) {
                    $allBanners = array_values(array_filter($allBanners, fn($b) => strval($b['id'] ?? '') !== $bid));
                    @file_put_contents($jsonPath, json_encode($allBanners, JSON_PRETTY_PRINT));
                }
            }
        }
        $actionMsg = 'Banner removed.';
    } elseif ($act === 'toggle_banner') {
        $bid = strval($_POST['banner_id'] ?? '');
        if ($bid) {
            $jsonPath = __DIR__ . '/../../customer_app/src/constants/banners.json';
            if (file_exists($jsonPath)) {
                $allBanners = json_decode(file_get_contents($jsonPath), true);
                if (is_array($allBanners)) {
                    foreach ($allBanners as &$b) {
                        if (strval($b['id'] ?? '') === $bid) {
                            $b['active'] = !($b['active'] ?? true);
                        }
                    }
                    unset($b);
                    @file_put_contents($jsonPath, json_encode(array_values($allBanners), JSON_PRETTY_PRINT));
                }
            }
        }
        $actionMsg = 'Banner visibility toggled.';

    // -- VIDEO ACTIONS --
    } elseif ($act === 'add_video') {
        $uploadShopName  = htmlspecialchars_decode(trim($_POST['shop_name'] ?? $targetShopName), ENT_QUOTES);
        $uploadOwnerName = htmlspecialchars_decode(trim($_POST['owner_name'] ?? $targetOwnerName), ENT_QUOTES);
        $uploadLocation  = htmlspecialchars_decode(trim($_POST['shop_location'] ?? $targetShopLoc), ENT_QUOTES);
        $videoUrlInput   = trim($_POST['video_url'] ?? '');
        $finalVideoUrl   = '';
        $finalThumbUrl   = trim($_POST['thumbnail_url'] ?? '');

        $uploadDir = __DIR__ . '/../uploads/shop-media/';
        if (!is_dir($uploadDir)) @mkdir($uploadDir, 0777, true);
        $appVideoDir = __DIR__ . '/../../customer_app/assets/myvideos/';
        if (!is_dir($appVideoDir)) @mkdir($appVideoDir, 0777, true);

        $backendBaseUrl = defined('BACKEND_BASE_URL') ? BACKEND_BASE_URL : 'https://dhobi-api.bizz-manager.com/public';

        // 1. Video upload
        if (!empty($_FILES['video_file']['name']) && $_FILES['video_file']['error'] === UPLOAD_ERR_OK) {
            $ext = strtolower(pathinfo($_FILES['video_file']['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, ['mp4','mov','webm','mkv'])) $ext = 'mp4';
            $vfname = 'vid_' . $targetShopId . '_' . time() . '.' . $ext;
            if (move_uploaded_file($_FILES['video_file']['tmp_name'], $uploadDir . $vfname)) {
                @copy($uploadDir . $vfname, $appVideoDir . $vfname);
                $finalVideoUrl = $backendBaseUrl . '/uploads/shop-media/' . $vfname;
            }
        } elseif (!empty($videoUrlInput)) {
            $finalVideoUrl = $videoUrlInput;
        }

        // 2. Thumbnail upload
        if (!empty($_FILES['thumbnail_file']['name']) && $_FILES['thumbnail_file']['error'] === UPLOAD_ERR_OK) {
            $text = strtolower(pathinfo($_FILES['thumbnail_file']['name'], PATHINFO_EXTENSION));
            $tfname = 'thumb_' . $targetShopId . '_' . time() . '.' . $text;
            if (move_uploaded_file($_FILES['thumbnail_file']['tmp_name'], $uploadDir . $tfname)) {
                $finalThumbUrl = $backendBaseUrl . '/uploads/shop-media/' . $tfname;
            }
        }
        if (empty($finalThumbUrl)) {
            $finalThumbUrl = 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=800&auto=format&fit=crop&q=80';
        }

        if (!empty($finalVideoUrl)) {
            $reelId = 'vid_' . time() . '_' . rand(100, 999);
            $newReel = [
                'id'            => $reelId,
                'shopId'        => strval($targetShopId),
                'shopName'      => $uploadShopName ?: $targetShopName,
                'ownerName'     => $uploadOwnerName ?: $targetOwnerName,
                'location'      => $uploadLocation ?: $targetShopLoc,
                'video_url'     => $finalVideoUrl,
                'thumbnail_url' => $finalThumbUrl,
                'caption'       => $uploadShopName ?: $targetShopName,
                'offer'         => '',
                'likes'         => rand(40, 160),
                'shares'        => rand(10, 45),
                'service'       => '',
                'bg'            => '#000000',
                'isLiked'       => false,
                'isSaved'       => false,
                'isFollowing'   => false,
                'added'         => date('d M Y')
            ];

            // Sync to reels.json
            $reelsJsonPath = __DIR__ . '/../../customer_app/src/constants/reels.json';
            $currentReels = [];
            if (file_exists($reelsJsonPath)) {
                $decoded = json_decode(file_get_contents($reelsJsonPath), true);
                if (is_array($decoded)) $currentReels = $decoded;
            }
            array_unshift($currentReels, $newReel);
            @file_put_contents($reelsJsonPath, json_encode(array_values($currentReels), JSON_PRETTY_PRINT));

            // Sync to session media for target shop
            if (!isset($_SESSION['shop_media'][$targetShopId])) $_SESSION['shop_media'][$targetShopId] = [];
            array_unshift($_SESSION['shop_media'][$targetShopId], [
                'id'            => $reelId,
                'shopId'        => strval($targetShopId),
                'shopName'      => $newReel['shopName'],
                'ownerName'     => $newReel['ownerName'],
                'location'      => $newReel['location'],
                'caption'       => $newReel['caption'],
                'url'           => $finalVideoUrl,
                'thumbnail_url' => $finalThumbUrl,
                'type'          => 'video',
                'added'         => date('d M Y')
            ]);

            $actionMsg = 'Video published successfully for ' . htmlspecialchars($newReel['shopName']) . '! LIVE on Customer App.';
        } else {
            $actionMsg = 'Please select an MP4 video file or provide a video URL.';
            $actionType = 'error';
        }
    } elseif ($act === 'edit_video') {
        $vid = strval($_POST['video_id'] ?? '');
        $newShopName  = htmlspecialchars_decode(trim($_POST['shop_name'] ?? ''), ENT_QUOTES);
        $newOwnerName = htmlspecialchars_decode(trim($_POST['owner_name'] ?? ''), ENT_QUOTES);
        $newLocation  = htmlspecialchars_decode(trim($_POST['shop_location'] ?? ''), ENT_QUOTES);
        $newVideoUrl  = trim($_POST['video_url'] ?? '');

        $uploadDir = __DIR__ . '/../uploads/shop-media/';
        if (!is_dir($uploadDir)) @mkdir($uploadDir, 0777, true);
        $appVideoDir = __DIR__ . '/../../customer_app/assets/myvideos/';
        if (!is_dir($appVideoDir)) @mkdir($appVideoDir, 0777, true);

        $backendBaseUrl = defined('BACKEND_BASE_URL') ? BACKEND_BASE_URL : 'https://dhobi-api.bizz-manager.com/public';
        $uploadedVideoUrl = null;
        if (!empty($_FILES['video_file']['name']) && $_FILES['video_file']['error'] === UPLOAD_ERR_OK) {
            $ext = strtolower(pathinfo($_FILES['video_file']['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, ['mp4','mov','webm','mkv'])) $ext = 'mp4';
            $vfname = 'vid_edit_' . time() . '.' . $ext;
            if (move_uploaded_file($_FILES['video_file']['tmp_name'], $uploadDir . $vfname)) {
                @copy($uploadDir . $vfname, $appVideoDir . $vfname);
                $uploadedVideoUrl = $backendBaseUrl . '/uploads/shop-media/' . $vfname;
            }
        }

        $uploadedThumbUrl = null;
        if (!empty($_FILES['thumbnail_file']['name']) && $_FILES['thumbnail_file']['error'] === UPLOAD_ERR_OK) {
            $text = strtolower(pathinfo($_FILES['thumbnail_file']['name'], PATHINFO_EXTENSION));
            $tfname = 'thumb_edit_' . time() . '.' . $text;
            if (move_uploaded_file($_FILES['thumbnail_file']['tmp_name'], $uploadDir . $tfname)) {
                $uploadedThumbUrl = $backendBaseUrl . '/uploads/shop-media/' . $tfname;
            }
        }

        // Update reels.json
        $reelsJsonPath = __DIR__ . '/../../customer_app/src/constants/reels.json';
        if (file_exists($reelsJsonPath)) {
            $currentReels = json_decode(file_get_contents($reelsJsonPath), true);
            if (is_array($currentReels)) {
                foreach ($currentReels as &$r) {
                    if (strval($r['id'] ?? '') === $vid) {
                        if ($newShopName) {
                            $r['shopName'] = $newShopName;
                            $r['caption']  = $newShopName;
                        }
                        if ($newOwnerName) $r['ownerName'] = $newOwnerName;
                        if ($newLocation)  $r['location']  = $newLocation;
                        if ($uploadedVideoUrl) $r['video_url'] = $uploadedVideoUrl;
                        elseif ($newVideoUrl)  $r['video_url'] = $newVideoUrl;
                        if ($uploadedThumbUrl) $r['thumbnail_url'] = $uploadedThumbUrl;
                    }
                }
                unset($r);
                @file_put_contents($reelsJsonPath, json_encode(array_values($currentReels), JSON_PRETTY_PRINT));
            }
        }

        // Update session media
        if (!empty($_SESSION['shop_media'])) {
            foreach ($_SESSION['shop_media'] as $sKey => &$mediaList) {
                if (is_array($mediaList)) {
                    foreach ($mediaList as &$m) {
                        if (strval($m['id'] ?? '') === $vid) {
                            if ($newShopName)  $m['shopName']  = $newShopName;
                            if ($newOwnerName) $m['ownerName'] = $newOwnerName;
                            if ($newLocation)  $m['location']  = $newLocation;
                            if ($uploadedVideoUrl) $m['url']   = $uploadedVideoUrl;
                            elseif ($newVideoUrl)  $m['url']   = $newVideoUrl;
                            if ($uploadedThumbUrl) $m['thumbnail_url'] = $uploadedThumbUrl;
                        }
                    }
                    unset($m);
                }
            }
            unset($mediaList);
        }

        $actionMsg = 'Video details updated successfully!';
    } elseif ($act === 'add_media') {
        // Still Photo upload
        $uploadDir = __DIR__ . '/../uploads/shop-media/';
        if (!is_dir($uploadDir)) @mkdir($uploadDir, 0777, true);
        if (!empty($_FILES['media_file']['name']) && $_FILES['media_file']['error'] === UPLOAD_ERR_OK) {
            $ext = strtolower(pathinfo($_FILES['media_file']['name'], PATHINFO_EXTENSION));
            $fname = 'photo_' . $targetShopId . '_' . time() . '.' . $ext;
            if (move_uploaded_file($_FILES['media_file']['tmp_name'], $uploadDir . $fname)) {
                $caption = htmlspecialchars(trim($_POST['media_caption'] ?? 'Facility Photo'));
                $mediaUrl = (defined('ADMIN_BASE_URL') ? ADMIN_BASE_URL : '') . '/uploads/shop-media/' . $fname;
                
                if (!isset($_SESSION['shop_media'][$targetShopId])) $_SESSION['shop_media'][$targetShopId] = [];
                array_unshift($_SESSION['shop_media'][$targetShopId], [
                    'id'       => 'p_' . time(),
                    'shopId'   => strval($targetShopId),
                    'shopName' => $targetShopName,
                    'caption'  => $caption,
                    'url'      => $mediaUrl,
                    'type'     => 'photo',
                    'added'    => date('d M Y')
                ]);
                $actionMsg = 'Facility photo uploaded successfully!';
            } else {
                $actionMsg = 'Could not save the uploaded photo.';
                $actionType = 'error';
            }
        }
    } elseif ($act === 'delete_media') {
        $mid  = strval($_POST['media_id'] ?? '');
        $mUrl = strval($_POST['media_url'] ?? '');

        // Remove from reels.json
        $reelsJsonPath = __DIR__ . '/../../customer_app/src/constants/reels.json';
        if (file_exists($reelsJsonPath)) {
            $currentReels = json_decode(file_get_contents($reelsJsonPath), true);
            if (is_array($currentReels)) {
                $filtered = array_values(array_filter(
                    $currentReels,
                    fn($r) => strval($r['id'] ?? '') !== $mid && (empty($mUrl) || strval($r['video_url'] ?? '') !== $mUrl)
                ));
                @file_put_contents($reelsJsonPath, json_encode($filtered, JSON_PRETTY_PRINT));
            }
        }

        // Remove from session
        if (!empty($_SESSION['shop_media'])) {
            foreach ($_SESSION['shop_media'] as $sKey => &$mediaList) {
                if (is_array($mediaList)) {
                    $mediaList = array_values(array_filter(
                        $mediaList,
                        fn($m) => strval($m['id'] ?? '') !== $mid && (empty($mUrl) || strval($m['url'] ?? '') !== $mUrl)
                    ));
                }
            }
            unset($mediaList);
        }
        $actionMsg = 'Media removed from admin panel and Customer App.';
    }
}

// 4. FETCH DATA ACCORDING TO USER ROLE & FILTER
// -------------------------------------------------------------

// A. BANNERS
$allBanners = [];
$jsonPath = __DIR__ . '/../../customer_app/src/constants/banners.json';
if (file_exists($jsonPath)) {
    $decoded = json_decode(file_get_contents($jsonPath), true);
    if (is_array($decoded)) $allBanners = $decoded;
}
if ($isOwner) {
    // Laundry Owner: ONLY see self-uploaded banners
    $banners = array_values(array_filter($allBanners, function($b) use ($shopId) {
        $bSid = strval($b['shopId'] ?? '');
        return ($bSid === strval($shopId)) || (empty($bSid) && strval($shopId) === '30');
    }));
} else {
    // Super Admin:
    if ($selectedShopFilter === 'all') {
        $banners = $allBanners; // Overall view of all shops' banners
    } else {
        $banners = array_values(array_filter($allBanners, function($b) use ($selectedShopFilter) {
            $bSid = strval($b['shopId'] ?? '');
            return ($bSid === strval($selectedShopFilter)) || (empty($bSid) && strval($selectedShopFilter) === '30');
        }));
    }
}

// B. VIDEOS (REELS)
$allReels = [];
if (file_exists($reelsJsonPath)) {
    $decoded = json_decode(file_get_contents($reelsJsonPath), true);
    if (is_array($decoded)) $allReels = $decoded;
}
if ($isOwner) {
    // Laundry Owner: ONLY see videos uploaded for their own shop! NEVER other shops' videos!
    $videos = array_values(array_filter($allReels, function($r) use ($shopId) {
        return strval($r['shopId'] ?? '') === strval($shopId);
    }));
} else {
    // Super Admin:
    if ($selectedShopFilter === 'all') {
        $videos = $allReels; // Overall view: every laundry owner's uploaded videos!
    } else {
        $videos = array_values(array_filter($allReels, function($r) use ($selectedShopFilter) {
            return strval($r['shopId'] ?? '') === strval($selectedShopFilter);
        }));
    }
}

// C. PHOTOS
// Initialize default shop photos if empty
if (!isset($_SESSION['shop_media']['30'])) {
    $_SESSION['shop_media']['30'] = [
        ['id' => 'm30_1', 'shopId' => '30', 'shopName' => 'My Laundry Shop', 'caption' => 'High-Capacity Industrial Washers', 'url' => 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=600&q=80', 'type' => 'photo', 'added' => date('d M Y')],
        ['id' => 'm30_2', 'shopId' => '30', 'shopName' => 'My Laundry Shop', 'caption' => 'Steam Pressing & Folding Counter', 'url' => 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=600&q=80', 'type' => 'photo', 'added' => date('d M Y')]
    ];
}
if (!isset($_SESSION['shop_media']['44'])) {
    $_SESSION['shop_media']['44'] = [
        ['id' => 'm44_1', 'shopId' => '44', 'shopName' => 'Star Wash Ultra Premium', 'caption' => 'Hydro-Cleaning Units & Ozone Sanitizer', 'url' => 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=600&q=80', 'type' => 'photo', 'added' => date('d M Y')]
    ];
}
$photos = [];
if ($isOwner) {
    // Laundry Owner: only photos uploaded for their shop
    $photos = array_values(array_filter($_SESSION['shop_media'][$shopId] ?? [], fn($m) => ($m['type'] ?? '') === 'photo'));
} else {
    // Super Admin:
    if ($selectedShopFilter === 'all') {
        foreach ($_SESSION['shop_media'] as $sId => $mList) {
            if (is_array($mList)) {
                foreach ($mList as $item) {
                    if (($item['type'] ?? '') === 'photo') {
                        $sInfo = findShopById($sId, $allShopsList);
                        $item['shopId']   = $sId;
                        $item['shopName'] = $item['shopName'] ?? $sInfo['name'];
                        $photos[] = $item;
                    }
                }
            }
        }
    } else {
        $photos = array_values(array_filter($_SESSION['shop_media'][$selectedShopFilter] ?? [], fn($m) => ($m['type'] ?? '') === 'photo'));
    }
}

// D. SERVICES & CATEGORIES
$rawServices = [];
$rawCategories = [];
try {
    $svcRes = apiGet('/services');
    $rawServices = apiExtractList($svcRes);
} catch (\Throwable $e) {}
try {
    $catRes = apiGet('/categories');
    $rawCategories = apiExtractList($catRes);
} catch (\Throwable $e) {}

if (empty($rawServices)) {
    $rawServices = [
        ['id'=>'1','shop_id'=>'30','shopName'=>'My Laundry Shop','name'=>'Wash & Fold','price'=>'80/kg','category'=>'Regular Wash','active'=>true],
        ['id'=>'2','shop_id'=>'30','shopName'=>'My Laundry Shop','name'=>'Dry Cleaning','price'=>'199/piece','category'=>'Dry Clean','active'=>true],
        ['id'=>'3','shop_id'=>'30','shopName'=>'My Laundry Shop','name'=>'Steam Press','price'=>'40/piece','category'=>'Ironing','active'=>true],
        ['id'=>'4','shop_id'=>'44','shopName'=>'Star Wash Ultra Premium','name'=>'Express Premium Silk Care','price'=>'299/piece','category'=>'Specialty','active'=>true],
        ['id'=>'5','shop_id'=>'44','shopName'=>'Star Wash Ultra Premium','name'=>'Designer Suit Dry Clean','price'=>'450/suit','category'=>'Dry Clean','active'=>true],
        ['id'=>'6','shop_id'=>'44','shopName'=>'Star Wash Ultra Premium','name'=>'Ozone Anti-Bacterial Wash','price'=>'120/kg','category'=>'Regular Wash','active'=>true]
    ];
}
if (empty($rawCategories)) {
    $rawCategories = [
        ['id'=>'1','name'=>'Regular Wash','icon'=>'droplets','color'=>'#3B82F6','count'=>2],
        ['id'=>'2','name'=>'Dry Clean','icon'=>'wind','color'=>'#8B5CF6','count'=>2],
        ['id'=>'3','name'=>'Ironing','icon'=>'zap','color'=>'#F59E0B','count'=>1],
        ['id'=>'4','name'=>'Specialty','icon'=>'sparkles','color'=>'#EC4899','count'=>1]
    ];
}

if ($isOwner) {
    // Laundry Owner: only services for their shop
    $services = array_values(array_filter($rawServices, fn($s) => strval($s['shop_id'] ?? $s['shopId'] ?? '') === strval($shopId) || empty($s['shop_id'])));
} else {
    // Super Admin:
    if ($selectedShopFilter === 'all') {
        $services = $rawServices;
    } else {
        $services = array_values(array_filter($rawServices, fn($s) => strval($s['shop_id'] ?? $s['shopId'] ?? '') === strval($selectedShopFilter) || empty($s['shop_id'])));
    }
}
$categories = $rawCategories;

// E. COUPONS
if (!isset($_SESSION['coupons_store']) || empty($_SESSION['coupons_store'])) {
    $_SESSION['coupons_store'] = [
        'CPN-1' => ['id'=>'CPN-1','shop_id'=>'30','shopName'=>'My Laundry Shop','code'=>'WASH20','discount'=>'20% OFF','minOrder'=>'500','expiry'=>'30 Oct 2026','active'=>true],
        'CPN-2' => ['id'=>'CPN-2','shop_id'=>'30','shopName'=>'My Laundry Shop','code'=>'FIRST50','discount'=>'₹50 OFF','minOrder'=>'300','expiry'=>'31 Dec 2026','active'=>true],
        'CPN-3' => ['id'=>'CPN-3','shop_id'=>'44','shopName'=>'Star Wash Ultra Premium','code'=>'STAR30','discount'=>'30% OFF','minOrder'=>'600','expiry'=>'15 Nov 2026','active'=>true],
        'CPN-4' => ['id'=>'CPN-4','shop_id'=>'44','shopName'=>'Star Wash Ultra Premium','code'=>'PUNEWASH','discount'=>'₹100 OFF','minOrder'=>'499','expiry'=>'31 Dec 2026','active'=>true]
    ];
}
$rawCoupons = array_values($_SESSION['coupons_store']);
if ($isOwner) {
    // Laundry Owner: only self-uploaded coupons
    $coupons = array_values(array_filter($rawCoupons, fn($c) => strval($c['shop_id'] ?? $c['shopId'] ?? '') === strval($shopId)));
} else {
    // Super Admin:
    if ($selectedShopFilter === 'all') {
        $coupons = $rawCoupons;
    } else {
        $coupons = array_values(array_filter($rawCoupons, fn($c) => strval($c['shop_id'] ?? $c['shopId'] ?? '') === strval($selectedShopFilter)));
    }
}

$activeTab = $_GET['tab'] ?? 'banners';
?>
<div style="color: var(--text-primary);">
  <!-- TOP BANNER & SHOP SWITCHER -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
    <div>
      <h1 style="font-size:1.55rem;font-weight:900;display:flex;align-items:center;gap:0.65rem;color:var(--text-primary);margin:0;letter-spacing:-0.5px;">
        <i data-lucide="smartphone" style="width:28px;height:28px;color:#0EA5E9;"></i>
        Customer App Management
      </h1>
      <p style="color:var(--text-secondary);font-size:0.875rem;margin-top:0.35rem;margin-bottom:0;">
        <?php if ($isOwner): ?>
          Viewing <strong>self-uploaded</strong> content for <strong><?= htmlspecialchars($shopName) ?></strong> (Shop #<?= htmlspecialchars($shopId) ?>).
        <?php else: ?>
          Platform-wide control panel: oversee videos, photos, banners, services &amp; coupons uploaded across all laundry shops.
        <?php endif; ?>
      </p>
    </div>

    <!-- Live indicator badge -->
    <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
      <?php if ($isOwner): ?>
        <div style="background:rgba(16,185,129,0.12);color:#059669;border:1px solid rgba(16,185,129,0.3);padding:0.45rem 0.9rem;border-radius:10px;font-size:0.78rem;font-weight:800;display:flex;align-items:center;gap:0.4rem;">
          <i data-lucide="lock" style="width:14px;height:14px;"></i>Your Self-Service Dashboard Only
        </div>
      <?php else: ?>
        <div style="background:rgba(99,102,241,0.12);color:#4F46E5;border:1px solid rgba(99,102,241,0.3);padding:0.45rem 0.9rem;border-radius:10px;font-size:0.78rem;font-weight:800;display:flex;align-items:center;gap:0.4rem;">
          <i data-lucide="shield-check" style="width:14px;height:14px;"></i>Super Admin Overall View
        </div>
      <?php endif; ?>
      <div style="background:linear-gradient(135deg,#0EA5E9 0%,#6366F1 100%);color:#FFF;padding:0.5rem 1.1rem;border-radius:10px;font-size:0.8rem;font-weight:800;display:flex;align-items:center;gap:0.45rem;box-shadow:0 4px 14px rgba(14,165,233,0.35);">
        <i data-lucide="eye" style="width:15px;height:15px;"></i>Live on Customer App
      </div>
    </div>
  </div>

  <!-- SUPER ADMIN ONLY: GLOBAL FILTER BAR -->
  <?php if (!$isOwner): ?>
  <div style="background:var(--bg-card);border:1.5px solid rgba(99,102,241,0.25);border-radius:14px;padding:0.9rem 1.25rem;margin-bottom:1.5rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
    <div style="display:flex;align-items:center;gap:0.75rem;">
      <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#6366F1 0%,#8B5CF6 100%);color:#FFF;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(99,102,241,0.35);">
        <i data-lucide="filter" style="width:20px;height:20px;"></i>
      </div>
      <div>
        <div style="font-size:0.92rem;font-weight:900;color:var(--text-primary);">Laundry Shop Display Filter</div>
        <div style="font-size:0.76rem;color:var(--text-secondary);">
          <?= $selectedShopFilter === 'all' ? 'Showing <strong>Overall Info</strong> across every laundry owner in the system' : ('Filtered to shop: <strong>' . htmlspecialchars($shopName) . '</strong>') ?>
        </div>
      </div>
    </div>

    <form method="GET" style="display:flex;align-items:center;gap:0.6rem;margin:0;flex-wrap:wrap;">
      <input type="hidden" name="tab" value="<?= htmlspecialchars($activeTab) ?>">
      <label style="font-size:0.78rem;font-weight:800;color:var(--text-secondary);text-transform:uppercase;">View Outlet:</label>
      <select name="shop_id" onchange="this.form.submit()" class="form-control" style="font-weight:700;padding:0.5rem 0.9rem;border-radius:10px;font-size:0.84rem;min-width:280px;border:1.5px solid #6366F1;">
        <option value="all" <?= $selectedShopFilter === 'all' ? 'selected' : '' ?>>🌐 All Laundry Shops (Overall Platform Info)</option>
        <?php foreach($allShopsList as $sItem): ?>
          <option value="<?= htmlspecialchars($sItem['id']) ?>" <?= strval($selectedShopFilter) === strval($sItem['id']) ? 'selected' : '' ?>>
            🏪 <?= htmlspecialchars($sItem['name']) ?> (Owner: <?= htmlspecialchars($sItem['owner_name']) ?> - #<?= htmlspecialchars($sItem['id']) ?>)
          </option>
        <?php endforeach; ?>
      </select>
      <?php if ($selectedShopFilter !== 'all'): ?>
        <a href="?tab=<?= htmlspecialchars($activeTab) ?>&shop_id=all" class="btn btn-secondary btn-sm" style="font-size:0.78rem;font-weight:700;padding:0.45rem 0.8rem;">
          Reset to All
        </a>
      <?php endif; ?>
    </form>
  </div>
  <?php endif; ?>

  <?php if ($actionMsg): ?>
  <div style="background:<?= $actionType==='error'?'rgba(239,68,68,0.12)':'rgba(16,185,129,0.12)' ?>;border:1px solid <?= $actionType==='error'?'rgba(239,68,68,0.3)':'rgba(16,185,129,0.3)' ?>;color:<?= $actionType==='error'?'#DC2626':'#059669' ?>;padding:0.75rem 1rem;border-radius:10px;font-weight:700;font-size:0.85rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:0.5rem;">
    <i data-lucide="<?= $actionType==='error'?'alert-circle':'check-circle' ?>" style="width:18px;height:18px;"></i> <?= htmlspecialchars($actionMsg) ?>
  </div>
  <?php endif; ?>

  <!-- TABS -->
  <div style="display:flex;gap:0.4rem;margin-bottom:1.75rem;background:var(--bg-card);border:1px solid var(--border-color);border-radius:14px;padding:0.4rem;flex-wrap:wrap;">
    <?php
    $tabParamShop = (!$isOwner && $selectedShopFilter !== 'all') ? ('&shop_id=' . urlencode($selectedShopFilter)) : '';
    $tabs = [
      'banners'  => ['Banners', 'image', '#0EA5E9', count($banners)],
      'media'    => ['Photos & Videos', 'camera', '#8B5CF6', (count($videos) + count($photos))],
      'services' => ['Services & Prices', 'layers', '#10B981', count($services)],
      'coupons'  => ['Coupons', 'ticket', '#F59E0B', count($coupons)]
    ];
    foreach($tabs as $key => [$label, $icon, $color, $badgeCount]):
      $isSelected = ($activeTab === $key);
    ?>
      <a href="?tab=<?= $key ?><?= $tabParamShop ?>" style="flex:1;min-width:130px;display:flex;align-items:center;justify-content:center;gap:0.5rem;padding:0.65rem 0.85rem;border-radius:10px;font-size:0.83rem;font-weight:800;text-decoration:none;transition:all 0.2s;<?= $isSelected ? "background:{$color};color:#FFF;box-shadow:0 4px 14px {$color}40;" : 'color:var(--text-secondary);background:transparent;' ?>">
        <i data-lucide="<?= $icon ?>" style="width:16px;height:16px;"></i>
        <span><?= $label ?></span>
        <span style="font-size:0.7rem;padding:0.1rem 0.45rem;border-radius:12px;background:<?= $isSelected ? 'rgba(255,255,255,0.25)' : 'var(--bg-body, rgba(0,0,0,0.06))' ?>;color:<?= $isSelected ? '#FFF' : 'var(--text-secondary)' ?>;font-weight:900;">
          <?= $badgeCount ?>
        </span>
      </a>
    <?php endforeach; ?>
  </div>

  <!-- ========================================== -->
  <!-- TAB 1: BANNERS                             -->
  <!-- ========================================== -->
  <?php if($activeTab === 'banners'): ?>
  <div>
    <div class="card" style="padding:1.5rem;margin-bottom:1.75rem;border:1.5px solid rgba(14,165,233,0.2);border-radius:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
        <h3 style="font-size:1.05rem;font-weight:800;margin:0;display:flex;align-items:center;gap:0.5rem;">
          <i data-lucide="plus-circle" style="width:20px;height:20px;color:#0EA5E9;"></i>
          Add New Promotional Banner Card
        </h3>
        <span style="font-size:0.75rem;color:var(--text-secondary);">
          Displays in customer home screen slider cards
        </span>
      </div>

      <form method="POST" action="" enctype="multipart/form-data">
        <input type="hidden" name="action" value="add_banner">
        
        <?php if (!$isOwner): ?>
        <div style="margin-bottom:1rem;background:rgba(99,102,241,0.06);padding:0.85rem 1rem;border-radius:10px;border:1px solid rgba(99,102,241,0.2);">
          <label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:#4F46E5;margin-bottom:0.35rem;">
            Assign Banner to Laundry Shop <span style="color:#EF4444;">*</span>
          </label>
          <select name="target_shop_id" class="form-control" style="width:100%;font-weight:700;">
            <?php foreach($allShopsList as $sItem): ?>
              <option value="<?= htmlspecialchars($sItem['id']) ?>" <?= strval($shopId) === strval($sItem['id']) ? 'selected' : '' ?>>
                🏪 <?= htmlspecialchars($sItem['name']) ?> (Owner: <?= htmlspecialchars($sItem['owner_name']) ?> - Shop #<?= htmlspecialchars($sItem['id']) ?>)
              </option>
            <?php endforeach; ?>
          </select>
        </div>
        <?php else: ?>
        <input type="hidden" name="target_shop_id" value="<?= htmlspecialchars($shopId) ?>">
        <?php endif; ?>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
          <div>
            <label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">Banner Title (Main Heading)</label>
            <input type="text" name="banner_title" placeholder="e.g. Super Clean Wash" class="form-control" style="width:100%;" required>
          </div>
          <div>
            <label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">Subtitle / Offer Details</label>
            <input type="text" name="banner_subtitle" placeholder="e.g. Special festive laundry & dry clean offer" class="form-control" style="width:100%;" required>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1.6fr auto;gap:1rem;align-items:end;flex-wrap:wrap;">
          <div>
            <label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">Badge / Tag Text</label>
            <input type="text" name="banner_tag" placeholder="e.g. 30% OFF / ACTIVE" value="ACTIVE" class="form-control" style="width:100%;">
          </div>
          <div>
            <label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">Badge Color</label>
            <select name="banner_tag_color" class="form-control" style="width:100%;">
              <option value="#10B981" selected>🟢 Green (#10B981)</option>
              <option value="#8B5CF6">🟣 Purple (#8B5CF6)</option>
              <option value="#3B82F6">🔵 Blue (#3B82F6)</option>
              <option value="#F59E0B">🟠 Amber (#F59E0B)</option>
              <option value="#EF4444">🔴 Red (#EF4444)</option>
            </select>
          </div>
          <div>
            <label style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;flex-wrap:wrap;gap:0.3rem;">
              <span>Banner Image</span>
              <span style="color:#0EA5E9;background:rgba(14,165,233,0.1);padding:0.15rem 0.5rem;border-radius:6px;font-size:0.7rem;text-transform:none;font-weight:700;">📐 1080 &times; 540 px (2:1)</span>
            </label>
            <input type="file" name="banner_image" accept="image/*" class="form-control" style="width:100%;" required>
          </div>
          <div>
            <button type="submit" class="btn btn-primary" style="background:linear-gradient(135deg,#0EA5E9 0%,#6366F1 100%);border:none;color:#FFF;font-weight:800;padding:0.6rem 1.4rem;white-space:nowrap;display:inline-flex;align-items:center;gap:0.4rem;box-shadow:0 4px 12px rgba(14,165,233,0.35);border-radius:10px;">
              <i data-lucide="upload-cloud" style="width:16px;height:16px;"></i>Add Banner
            </button>
          </div>
        </div>
      </form>
    </div>

    <?php if(empty($banners)): ?>
    <div style="text-align:center;padding:3.5rem 2rem;background:var(--bg-card);border:2px dashed var(--border-color);border-radius:16px;">
      <div style="width:64px;height:64px;background:rgba(14,165,233,0.1);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem auto;"><i data-lucide="image" style="width:30px;height:30px;color:#0EA5E9;"></i></div>
      <h3 style="font-size:1.1rem;font-weight:800;margin:0 0 0.4rem 0;">No Banners for this View</h3>
      <p style="color:var(--text-secondary);font-size:0.875rem;margin:0;">
        <?= $isOwner ? 'You have not uploaded any promotional banners for your laundry shop yet.' : 'No banners found for the selected shop filter.' ?>
      </p>
    </div>
    <?php else: ?>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:1.25rem;">
      <?php foreach($banners as $bn):
        $bImg = $bn['url'] ?? $bn['image'] ?? '';
        if ($bImg && !str_starts_with($bImg, 'http') && !str_starts_with($bImg, '//')) {
            $bImg = (defined('ADMIN_BASE_URL') ? ADMIN_BASE_URL : '') . '/' . ltrim($bImg, '/');
        }
        $bTitle = $bn['title'] ?? 'Banner';
        $bSubtitle = $bn['subtitle'] ?? 'Special festive laundry & dry clean offer';
        $bTag = $bn['tag'] ?? 'ACTIVE';
        $bTagColor = $bn['tagColor'] ?? '#10B981';
        $bShopName = $bn['shopName'] ?? ('Shop #' . ($bn['shopId'] ?? '30'));
      ?>
      <div class="card" style="padding:0;overflow:hidden;border-radius:14px;border:1px solid var(--border-color);position:relative;">
        <div style="position:relative;height:160px;background:#1E1B4B;">
          <img src="<?= htmlspecialchars($bImg) ?>" alt="" style="width:100%;height:100%;object-fit:cover;display:block;">
          <div style="position:absolute;top:0.6rem;left:0.6rem;background:<?= htmlspecialchars($bTagColor) ?>;color:#FFF;font-size:0.68rem;font-weight:800;padding:0.2rem 0.6rem;border-radius:8px;text-transform:uppercase;box-shadow:0 2px 6px rgba(0,0,0,0.3);">
            <?= htmlspecialchars($bTag) ?>
          </div>
          <div style="position:absolute;top:0.6rem;right:0.6rem;background:<?= ($bn['active']??true)?'#10B981':'#6B7280' ?>;color:#FFF;font-size:0.68rem;font-weight:800;padding:0.2rem 0.55rem;border-radius:20px;text-transform:uppercase;">
            <?= ($bn['active']??true)?'LIVE':'HIDDEN' ?>
          </div>
        </div>
        <div style="padding:0.85rem 1rem;">
          <?php if (!$isOwner): ?>
          <div style="margin-bottom:0.4rem;">
            <span style="background:rgba(99,102,241,0.12);color:#4F46E5;font-weight:800;font-size:0.72rem;padding:0.2rem 0.55rem;border-radius:6px;display:inline-flex;align-items:center;gap:0.3rem;">
              🏪 <?= htmlspecialchars($bShopName) ?> (Shop #<?= htmlspecialchars($bn['shopId'] ?? '30') ?>)
            </span>
          </div>
          <?php endif; ?>
          <div style="font-weight:800;font-size:0.95rem;margin-bottom:0.2rem;"><?= htmlspecialchars($bTitle) ?></div>
          <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.4rem;line-height:1.3;"><?= htmlspecialchars($bSubtitle) ?></div>
          <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:0.85rem;">Added: <?= htmlspecialchars($bn['added'] ?? date('d M Y')) ?></div>
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
            <button
              type="button"
              class="btn btn-primary btn-sm"
              style="font-size:0.75rem;font-weight:700;display:inline-flex;align-items:center;gap:0.25rem;background:#3B82F6;border-color:#3B82F6;"
              onclick='openEditBannerModal(<?= json_encode([
                'id' => strval($bn['id']),
                'title' => $bTitle,
                'subtitle' => $bSubtitle,
                'tag' => $bTag,
                'tagColor' => $bTagColor,
                'img' => $bImg
              ]) ?>)'
            >
              <i data-lucide="edit-3" style="width:13px;height:13px;"></i>Edit
            </button>
            <form method="POST" style="display:inline;">
              <input type="hidden" name="action" value="toggle_banner">
              <input type="hidden" name="banner_id" value="<?= htmlspecialchars($bn['id']) ?>">
              <button type="submit" class="btn btn-secondary btn-sm" style="font-size:0.75rem;font-weight:700;display:inline-flex;align-items:center;gap:0.25rem;">
                <i data-lucide="<?= ($bn['active']??true)?'eye-off':'eye' ?>" style="width:13px;height:13px;"></i><?= ($bn['active']??true)?'Hide':'Show' ?>
              </button>
            </form>
            <form method="POST" style="display:inline;" onsubmit="return confirm('Remove this banner card?')">
              <input type="hidden" name="action" value="delete_banner">
              <input type="hidden" name="banner_id" value="<?= htmlspecialchars($bn['id']) ?>">
              <button type="submit" class="btn btn-danger btn-sm" style="font-size:0.75rem;font-weight:700;display:inline-flex;align-items:center;gap:0.25rem;">
                <i data-lucide="trash-2" style="width:13px;height:13px;"></i>Delete
              </button>
            </form>
          </div>
        </div>
      </div>
      <?php endforeach; ?>
    </div>
    <?php endif; ?>

    <!-- EDIT BANNER MODAL -->
    <div id="editBannerModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:99999;backdrop-filter:blur(4px);align-items:center;justify-content:center;">
      <div style="background:var(--bg-card, #FFFFFF);width:90%;max-width:540px;border-radius:18px;padding:1.75rem;box-shadow:0 20px 40px rgba(0,0,0,0.3);border:1px solid var(--border-color);position:relative;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
          <h3 style="margin:0;font-size:1.15rem;font-weight:800;display:flex;align-items:center;gap:0.5rem;">
            <i data-lucide="edit" style="width:20px;height:20px;color:#3B82F6;"></i>Edit Slider Banner Card
          </h3>
          <button type="button" onclick="closeEditBannerModal()" style="background:none;border:none;cursor:pointer;font-size:1.3rem;color:var(--text-secondary);">&times;</button>
        </div>

        <form method="POST" action="" enctype="multipart/form-data">
          <input type="hidden" name="action" value="edit_banner">
          <input type="hidden" name="banner_id" id="edit_banner_id">

          <div style="margin-bottom:1rem;">
            <label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">Banner Title (Main Heading)</label>
            <input type="text" name="banner_title" id="edit_banner_title" class="form-control" style="width:100%;font-weight:700;" required>
          </div>

          <div style="margin-bottom:1rem;">
            <label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">Subtitle / Offer Details</label>
            <input type="text" name="banner_subtitle" id="edit_banner_subtitle" class="form-control" style="width:100%;" required>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
            <div>
              <label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">Badge / Tag Text</label>
              <input type="text" name="banner_tag" id="edit_banner_tag" class="form-control" style="width:100%;">
            </div>
            <div>
              <label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">Badge Color</label>
              <select name="banner_tag_color" id="edit_banner_tag_color" class="form-control" style="width:100%;">
                <option value="#10B981">🟢 Green (#10B981)</option>
                <option value="#8B5CF6">🟣 Purple (#8B5CF6)</option>
                <option value="#3B82F6">🔵 Blue (#3B82F6)</option>
                <option value="#F59E0B">🟠 Amber (#F59E0B)</option>
                <option value="#EF4444">🔴 Red (#EF4444)</option>
                <option value="#EC4899">🌸 Pink (#EC4899)</option>
              </select>
            </div>
          </div>

          <div style="margin-bottom:1.5rem;">
            <label style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">
              <span>Replace Banner Image (Optional)</span>
              <span style="color:#0EA5E9;font-size:0.7rem;text-transform:none;font-weight:700;">📐 1080 &times; 540 px</span>
            </label>
            <div style="display:flex;gap:0.75rem;align-items:center;">
              <img id="edit_banner_preview" src="" alt="" style="width:70px;height:40px;object-fit:cover;border-radius:6px;border:1px solid var(--border-color);display:none;">
              <input type="file" name="banner_image" accept="image/*" class="form-control" style="flex:1;">
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:0.75rem;">
            <button type="button" onclick="closeEditBannerModal()" class="btn btn-secondary" style="font-weight:700;padding:0.6rem 1.2rem;">Cancel</button>
            <button type="submit" class="btn btn-primary" style="background:linear-gradient(135deg,#3B82F6 0%,#1D4ED8 100%);border:none;color:#FFF;font-weight:800;padding:0.6rem 1.5rem;border-radius:10px;box-shadow:0 4px 12px rgba(59,130,246,0.35);">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>

    <script>
    function openEditBannerModal(data) {
      document.getElementById('edit_banner_id').value = data.id || '';
      document.getElementById('edit_banner_title').value = data.title || '';
      document.getElementById('edit_banner_subtitle').value = data.subtitle || '';
      document.getElementById('edit_banner_tag').value = data.tag || 'ACTIVE';
      if (document.getElementById('edit_banner_tag_color')) {
        document.getElementById('edit_banner_tag_color').value = data.tagColor || '#10B981';
      }
      const prev = document.getElementById('edit_banner_preview');
      if (data.img) {
        prev.src = data.img;
        prev.style.display = 'block';
      } else {
        prev.style.display = 'none';
      }
      const modal = document.getElementById('editBannerModal');
      modal.style.display = 'flex';
      if (window.lucide) lucide.createIcons();
    }
    function closeEditBannerModal() {
      document.getElementById('editBannerModal').style.display = 'none';
    }
    </script>
  </div>

  <!-- ========================================== -->
  <!-- TAB 2: PHOTOS & VIDEOS                     -->
  <!-- ========================================== -->
  <?php elseif($activeTab === 'media'): ?>
  <div>
    <!-- DEDICATED CUSTOMER APP VIDEO UPLOADER -->
    <div class="card" style="padding:1.6rem;margin-bottom:1.5rem;border:1.5px solid rgba(236,72,153,0.3);border-radius:16px;background:radial-gradient(ellipse at top left, rgba(236,72,153,0.05) 0%, var(--bg-card) 70%);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:0.75rem;">
        <div>
          <h3 style="font-size:1.15rem;font-weight:900;margin:0;display:flex;align-items:center;gap:0.5rem;color:var(--text-primary);">
            <i data-lucide="video" style="width:22px;height:22px;color:#EC4899;"></i>
            Upload Video to Customer App (Video Reels &amp; Stories)
          </h3>
          <p style="color:var(--text-secondary);font-size:0.82rem;margin:0.25rem 0 0 0;">
            Videos appear live on the Customer App's <strong>Video</strong> tab (🎬) with shop name, owner name, and location.
          </p>
        </div>
        <div style="background:rgba(236,72,153,0.12);color:#EC4899;font-weight:800;font-size:0.75rem;padding:0.35rem 0.8rem;border-radius:20px;display:flex;align-items:center;gap:0.35rem;">
          <span style="width:7px;height:7px;background:#EC4899;border-radius:50%;display:inline-block;animation:pulse 1.5s infinite;"></span>
          Auto-Syncs with Customer App
        </div>
      </div>

      <form method="POST" action="" enctype="multipart/form-data">
        <input type="hidden" name="action" value="add_video">

        <!-- SUPER ADMIN TARGET SHOP SELECTOR -->
        <?php if (!$isOwner): ?>
        <div style="margin-bottom:1rem;background:rgba(99,102,241,0.06);padding:0.85rem 1rem;border-radius:10px;border:1px solid rgba(99,102,241,0.2);">
          <label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:#4F46E5;margin-bottom:0.35rem;">
            Assign Video to Laundry Owner Shop <span style="color:#EF4444;">*</span>
          </label>
          <select name="target_shop_id" id="video_target_shop_id" onchange="onVideoTargetShopChange(this.value)" class="form-control" style="width:100%;font-weight:700;">
            <?php foreach($allShopsList as $sItem): ?>
              <option value="<?= htmlspecialchars($sItem['id']) ?>" <?= strval($shopId) === strval($sItem['id']) ? 'selected' : '' ?>
                data-name="<?= htmlspecialchars($sItem['name']) ?>"
                data-owner="<?= htmlspecialchars($sItem['owner_name']) ?>"
                data-loc="<?= htmlspecialchars($sItem['address'] ?: $sItem['city']) ?>">
                🏪 <?= htmlspecialchars($sItem['name']) ?> (Owner: <?= htmlspecialchars($sItem['owner_name']) ?> - Shop #<?= htmlspecialchars($sItem['id']) ?>)
              </option>
            <?php endforeach; ?>
          </select>
        </div>
        <?php else: ?>
        <input type="hidden" name="target_shop_id" value="<?= htmlspecialchars($shopId) ?>">
        <?php endif; ?>
        
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1rem;">
          <div>
            <label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">
              🏪 Laundry Shop Name <span style="color:#EF4444;">*</span>
            </label>
            <input type="text" name="shop_name" id="upload_shop_name" value="<?= htmlspecialchars($shopName) ?>" placeholder="e.g. My Laundry Shop" class="form-control" style="width:100%;font-weight:700;" required>
          </div>
          <div>
            <label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">
              👤 Owner Name at Laundry <span style="color:#EF4444;">*</span>
            </label>
            <input type="text" name="owner_name" id="upload_owner_name" value="<?= htmlspecialchars($ownerName) ?>" placeholder="e.g. Rajesh Sharma" class="form-control" style="width:100%;font-weight:700;" required>
          </div>
          <div>
            <label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">
              📍 Laundry Location <span style="color:#EF4444;">*</span>
            </label>
            <input type="text" name="shop_location" id="upload_shop_location" value="<?= htmlspecialchars($shopLocation) ?>" placeholder="e.g. Sector 14, Main Market, Delhi" class="form-control" style="width:100%;" required>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:1rem;align-items:end;margin-bottom:0.5rem;flex-wrap:wrap;">
          <div>
            <label style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">
              <span>MP4 Video File</span>
              <span style="color:#EC4899;font-size:0.7rem;text-transform:none;font-weight:700;">Max <?= ini_get('upload_max_filesize') ?></span>
            </label>
            <input type="file" name="video_file" accept="video/mp4,video/quicktime,video/webm" class="form-control" style="width:100%;">
          </div>
          <div>
            <label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">
              OR Video Link / URL
            </label>
            <input type="url" name="video_url" placeholder="https://..." class="form-control" style="width:100%;">
          </div>
          <div>
            <label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">
              Thumbnail / Poster (Optional)
            </label>
            <input type="file" name="thumbnail_file" accept="image/*" class="form-control" style="width:100%;">
          </div>
          <div>
            <button type="submit" class="btn btn-primary" style="background:linear-gradient(135deg,#EC4899 0%,#8B5CF6 100%);border:none;color:#FFF;font-weight:800;padding:0.65rem 1.4rem;white-space:nowrap;display:inline-flex;align-items:center;gap:0.4rem;box-shadow:0 4px 14px rgba(236,72,153,0.35);border-radius:10px;">
              <i data-lucide="play-circle" style="width:17px;height:17px;"></i>Upload Video
            </button>
          </div>
        </div>
      </form>
    </div>

    <!-- UPLOAD FACILITY PHOTO (COLLAPSIBLE CARD) -->
    <div class="card" style="padding:1.2rem 1.5rem;margin-bottom:1.75rem;border:1px solid var(--border-color);border-radius:14px;">
      <h3 style="font-size:0.98rem;font-weight:800;margin:0 0 0.85rem 0;display:flex;align-items:center;gap:0.5rem;"><i data-lucide="camera" style="width:18px;height:18px;color:#8B5CF6;"></i>Upload Shop Photo (Still Image)</h3>
      <form method="POST" action="" enctype="multipart/form-data">
        <input type="hidden" name="action" value="add_media">
        <?php if (!$isOwner): ?>
        <input type="hidden" name="target_shop_id" value="<?= htmlspecialchars($shopId) ?>">
        <?php else: ?>
        <input type="hidden" name="target_shop_id" value="<?= htmlspecialchars($currentOwnerShopId) ?>">
        <?php endif; ?>
        <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:1rem;align-items:end;">
          <div>
            <label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">Photo Caption</label>
            <input type="text" name="media_caption" placeholder="e.g. Modern washing machines & dry cleaning area" class="form-control" style="width:100%;">
          </div>
          <div>
            <label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">Image File (JPG, PNG)</label>
            <input type="file" name="media_file" accept="image/*" class="form-control" style="width:100%;" required>
          </div>
          <div>
            <button type="submit" class="btn btn-secondary" style="font-weight:800;padding:0.6rem 1.2rem;white-space:nowrap;display:inline-flex;align-items:center;gap:0.4rem;border-radius:10px;">
              <i data-lucide="upload" style="width:15px;height:15px;"></i>Upload Photo
            </button>
          </div>
        </div>
      </form>
    </div>

    <!-- COUNTERS -->
    <div style="display:flex;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap;">
      <div class="card" style="padding:0.75rem 1.25rem;display:flex;align-items:center;gap:0.6rem;border-radius:10px;min-width:160px;border-left:3px solid #EC4899;">
        <i data-lucide="video" style="width:20px;height:20px;color:#EC4899;"></i>
        <div>
          <div style="font-size:1.15rem;font-weight:900;"><?= count($videos) ?></div>
          <div style="font-size:0.72rem;color:var(--text-muted);">
            <?= $isOwner ? 'Self-Uploaded Videos' : 'Video Reels on App' ?>
          </div>
        </div>
      </div>
      <div class="card" style="padding:0.75rem 1.25rem;display:flex;align-items:center;gap:0.6rem;border-radius:10px;min-width:140px;border-left:3px solid #8B5CF6;">
        <i data-lucide="image" style="width:20px;height:20px;color:#8B5CF6;"></i>
        <div>
          <div style="font-size:1.15rem;font-weight:900;"><?= count($photos) ?></div>
          <div style="font-size:0.72rem;color:var(--text-muted);">Facility Photos</div>
        </div>
      </div>
    </div>

    <!-- SECTION 1: CUSTOMER APP VIDEOS -->
    <div style="margin-bottom:2.2rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.9rem;flex-wrap:wrap;gap:0.5rem;">
        <h3 style="font-size:1.05rem;font-weight:900;margin:0;display:flex;align-items:center;gap:0.5rem;color:var(--text-primary);">
          <i data-lucide="clapperboard" style="width:19px;height:19px;color:#EC4899;"></i>
          <?= $isOwner ? 'My Laundry Videos' : 'Customer App Videos (Overall Info)' ?> (<?= count($videos) ?>)
        </h3>
        <span style="font-size:0.75rem;color:var(--text-muted);">
          <?= $isOwner ? 'Only showing self-uploaded videos for your shop' : 'Showing video reels with laundry owner attribution' ?>
        </span>
      </div>

      <?php if(empty($videos)): ?>
      <div style="text-align:center;padding:2.5rem 1.5rem;background:var(--bg-card);border:2px dashed var(--border-color);border-radius:14px;">
        <div style="width:50px;height:50px;background:rgba(236,72,153,0.1);border-radius:12px;display:flex;align-items:center;justify-content:center;margin:0 auto 0.75rem auto;"><i data-lucide="video" style="width:24px;height:24px;color:#EC4899;"></i></div>
        <h4 style="font-size:0.95rem;font-weight:800;margin:0 0 0.25rem 0;">No Videos Uploaded Yet</h4>
        <p style="color:var(--text-secondary);font-size:0.8rem;margin:0;">
          <?= $isOwner ? 'You have not uploaded any videos for your laundry shop yet. Use the form above to add your first reel!' : 'No videos found for this filter.' ?>
        </p>
      </div>
      <?php else: ?>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:1.25rem;">
        <?php foreach($videos as $v):
          $vUrl = $v['video_url'] ?? $v['url'] ?? '';
          if ($vUrl && !str_starts_with($vUrl, 'http') && !str_starts_with($vUrl, '//')) {
              $vUrl = (defined('ADMIN_BASE_URL') ? ADMIN_BASE_URL : '') . '/' . ltrim($vUrl, '/');
          }
          $vPoster = $v['thumbnail_url'] ?? 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=600&auto=format&fit=crop&q=80';
          if ($vPoster && !str_starts_with($vPoster, 'http') && !str_starts_with($vPoster, '//')) {
              $vPoster = (defined('ADMIN_BASE_URL') ? ADMIN_BASE_URL : '') . '/' . ltrim($vPoster, '/');
          }
          $vShopName = $v['shopName'] ?? $v['caption'] ?: $shopName;
          $vOwnerName = $v['ownerName'] ?? $ownerName;
          $vLocation = $v['location'] ?? $shopLocation;
          $vShopId = $v['shopId'] ?? $shopId;
        ?>
        <div class="card" style="padding:0;overflow:hidden;border-radius:14px;border:1px solid var(--border-color);position:relative;background:var(--bg-card);">
          <div style="position:relative;height:180px;background:#000;">
            <video src="<?= htmlspecialchars($vUrl) ?>" poster="<?= htmlspecialchars($vPoster) ?>" style="width:100%;height:100%;object-fit:cover;display:block;" controls muted preload="metadata"></video>
            <div style="position:absolute;top:0.55rem;left:0.55rem;background:rgba(236,72,153,0.9);color:#FFF;font-size:0.65rem;font-weight:800;padding:0.2rem 0.55rem;border-radius:6px;text-transform:uppercase;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;gap:0.3rem;">
              <span>🎬 LIVE ON APP</span>
            </div>
            <?php if (!$isOwner): ?>
            <div style="position:absolute;top:0.55rem;right:0.55rem;background:rgba(15,23,42,0.85);color:#38BDF8;font-size:0.65rem;font-weight:800;padding:0.2rem 0.55rem;border-radius:6px;text-transform:uppercase;backdrop-filter:blur(4px);">
              SHOP #<?= htmlspecialchars($vShopId) ?>
            </div>
            <?php endif; ?>
          </div>
          <div style="padding:0.85rem 1rem;">
            <?php if (!$isOwner): ?>
            <div style="margin-bottom:0.4rem;">
              <span style="background:rgba(99,102,241,0.12);color:#4F46E5;font-weight:800;font-size:0.72rem;padding:0.2rem 0.55rem;border-radius:6px;display:inline-flex;align-items:center;gap:0.3rem;">
                🏪 <?= htmlspecialchars($vShopName) ?>
              </span>
            </div>
            <?php endif; ?>
            <div style="font-weight:800;font-size:0.95rem;margin-bottom:0.25rem;line-height:1.3;color:var(--text-primary);">
              <?= htmlspecialchars($vShopName) ?>
            </div>
            <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:0.25rem;">
              👤 Owner: <strong><?= htmlspecialchars($vOwnerName) ?></strong>
            </div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.6rem;">
              📍 <?= htmlspecialchars($vLocation) ?>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding-top:0.5rem;border-top:1px solid var(--border-color);gap:0.35rem;flex-wrap:wrap;">
              <div style="display:flex;gap:0.35rem;align-items:center;">
                <button
                  type="button"
                  class="btn btn-primary btn-sm"
                  style="font-size:0.72rem;padding:0.3rem 0.65rem;font-weight:700;display:inline-flex;align-items:center;gap:0.25rem;background:#3B82F6;border-color:#3B82F6;"
                  onclick='openEditVideoModal(<?= json_encode([
                    'id'        => strval($v['id']),
                    'shopName'  => htmlspecialchars_decode($vShopName, ENT_QUOTES),
                    'ownerName' => htmlspecialchars_decode($vOwnerName, ENT_QUOTES),
                    'location'  => htmlspecialchars_decode($vLocation, ENT_QUOTES),
                    'url'       => $vUrl,
                    'thumbnail' => $vPoster
                  ]) ?>)'
                >
                  <i data-lucide="edit-3" style="width:12px;height:12px;"></i>Edit
                </button>
                <a href="<?= htmlspecialchars($vUrl) ?>" target="_blank" class="btn btn-secondary btn-sm" style="font-size:0.72rem;padding:0.3rem 0.65rem;font-weight:700;display:inline-flex;align-items:center;gap:0.25rem;">
                  <i data-lucide="external-link" style="width:12px;height:12px;"></i>Watch Full
                </a>
              </div>
              <form method="POST" onsubmit="return confirm('Remove this video from the Customer App?')">
                <input type="hidden" name="action" value="delete_media">
                <input type="hidden" name="media_id" value="<?= htmlspecialchars($v['id']) ?>">
                <input type="hidden" name="media_url" value="<?= htmlspecialchars($vUrl) ?>">
                <button type="submit" class="btn btn-danger btn-sm" style="font-size:0.72rem;padding:0.3rem 0.65rem;display:inline-flex;align-items:center;gap:0.25rem;font-weight:700;">
                  <i data-lucide="trash-2" style="width:12px;height:12px;"></i>Delete
                </button>
              </form>
            </div>
          </div>
        </div>
        <?php endforeach; ?>
      </div>
      <?php endif; ?>
    </div>

    <!-- SECTION 2: FACILITY PHOTOS -->
    <div>
      <h3 style="font-size:1.05rem;font-weight:900;margin:0 0 0.9rem 0;display:flex;align-items:center;gap:0.5rem;color:var(--text-primary);">
        <i data-lucide="images" style="width:19px;height:19px;color:#8B5CF6;"></i>
        Facility Photos (<?= count($photos) ?>)
      </h3>
      <?php if(empty($photos)): ?>
      <div style="text-align:center;padding:2rem;background:var(--bg-card);border:1px dashed var(--border-color);border-radius:12px;">
        <p style="color:var(--text-secondary);font-size:0.82rem;margin:0;">No facility photos yet for this shop.</p>
      </div>
      <?php else: ?>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:1.1rem;">
        <?php foreach($photos as $p):
          $pUrl = $p['url'] ?? '';
          if ($pUrl && !str_starts_with($pUrl, 'http') && !str_starts_with($pUrl, '//')) {
              $pUrl = (defined('ADMIN_BASE_URL') ? ADMIN_BASE_URL : '') . '/' . ltrim($pUrl, '/');
          }
          $pShopName = $p['shopName'] ?? ('Shop #' . ($p['shopId'] ?? '30'));
        ?>
        <div class="card" style="padding:0;overflow:hidden;border-radius:12px;border:1px solid var(--border-color);">
          <img src="<?= htmlspecialchars($pUrl) ?>" alt="" style="width:100%;height:140px;object-fit:cover;display:block;">
          <div style="padding:0.7rem 0.85rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.4rem;">
            <div>
              <?php if (!$isOwner): ?>
              <div style="font-size:0.68rem;color:#4F46E5;font-weight:800;margin-bottom:0.15rem;">🏪 <?= htmlspecialchars($pShopName) ?></div>
              <?php endif; ?>
              <div style="font-size:0.78rem;font-weight:700;"><?= htmlspecialchars(htmlspecialchars_decode($p['caption'] ?: 'Shop Photo', ENT_QUOTES)) ?></div>
              <div style="font-size:0.68rem;color:var(--text-muted);"><?= htmlspecialchars($p['added'] ?? date('d M Y')) ?></div>
            </div>
            <form method="POST" onsubmit="return confirm('Remove this photo?')">
              <input type="hidden" name="action" value="delete_media">
              <input type="hidden" name="media_id" value="<?= htmlspecialchars($p['id']) ?>">
              <input type="hidden" name="media_url" value="<?= htmlspecialchars($p['url']) ?>">
              <button type="submit" class="btn btn-danger btn-sm" style="font-size:0.72rem;padding:0.3rem 0.65rem;display:inline-flex;align-items:center;gap:0.25rem;font-weight:700;">
                <i data-lucide="trash-2" style="width:12px;height:12px;"></i>Remove
              </button>
            </form>
          </div>
        </div>
        <?php endforeach; ?>
      </div>
      <?php endif; ?>
    </div>

    <!-- EDIT VIDEO MODAL -->
    <div id="editVideoModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.65);z-index:99999;backdrop-filter:blur(4px);align-items:center;justify-content:center;">
      <div style="background:var(--bg-card, #FFFFFF);width:92%;max-width:560px;max-height:90vh;overflow-y:auto;border-radius:18px;padding:1.75rem;box-shadow:0 20px 45px rgba(0,0,0,0.35);border:1px solid var(--border-color);position:relative;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
          <h3 style="margin:0;font-size:1.15rem;font-weight:800;display:flex;align-items:center;gap:0.5rem;color:var(--text-primary);">
            <i data-lucide="edit" style="width:20px;height:20px;color:#EC4899;"></i>Edit Customer App Video &amp; Text
          </h3>
          <button type="button" onclick="closeEditVideoModal()" style="background:none;border:none;cursor:pointer;font-size:1.4rem;color:var(--text-secondary);">&times;</button>
        </div>

        <form method="POST" action="" enctype="multipart/form-data">
          <input type="hidden" name="action" value="edit_video">
          <input type="hidden" name="video_id" id="edit_video_id">
          <div style="margin-bottom:1rem;">
            <label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">
              🏪 Laundry Shop Name <span style="color:#EF4444;">*</span>
            </label>
            <input type="text" name="shop_name" id="edit_video_shop_name" class="form-control" style="width:100%;font-weight:700;" required>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
            <div>
              <label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">
                👤 Owner Name at Laundry <span style="color:#EF4444;">*</span>
              </label>
              <input type="text" name="owner_name" id="edit_video_owner_name" class="form-control" style="width:100%;font-weight:700;" required>
            </div>
            <div>
              <label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">
                📍 Laundry Location <span style="color:#EF4444;">*</span>
              </label>
              <input type="text" name="shop_location" id="edit_video_shop_location" class="form-control" style="width:100%;" required>
            </div>
          </div>

          <div style="margin-bottom:1rem;background:rgba(0,0,0,0.03);padding:1rem;border-radius:12px;border:1px solid var(--border-color);">
            <label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">
              Replace Video (Optional)
            </label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
              <div>
                <label style="font-size:0.7rem;color:var(--text-muted);display:block;margin-bottom:0.25rem;">Upload New MP4 Video:</label>
                <input type="file" name="video_file" accept="video/mp4,video/quicktime,video/webm" class="form-control" style="width:100%;">
              </div>
              <div>
                <label style="font-size:0.7rem;color:var(--text-muted);display:block;margin-bottom:0.25rem;">Or Enter Video Link:</label>
                <input type="url" name="video_url" id="edit_video_url_input" placeholder="https://..." class="form-control" style="width:100%;">
              </div>
            </div>
          </div>

          <div style="margin-bottom:1.5rem;background:rgba(0,0,0,0.03);padding:1rem;border-radius:12px;border:1px solid var(--border-color);">
            <label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">
              Replace Thumbnail / Poster Image (Optional)
            </label>
            <div style="display:flex;gap:0.75rem;align-items:center;">
              <img id="edit_video_thumb_preview" src="" alt="" style="width:65px;height:50px;object-fit:cover;border-radius:8px;border:1px solid var(--border-color);display:none;">
              <input type="file" name="thumbnail_file" accept="image/*" class="form-control" style="flex:1;">
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:0.75rem;">
            <button type="button" onclick="closeEditVideoModal()" class="btn btn-secondary" style="font-weight:700;padding:0.6rem 1.2rem;">Cancel</button>
            <button type="submit" class="btn btn-primary" style="background:linear-gradient(135deg,#EC4899 0%,#8B5CF6 100%);border:none;color:#FFF;font-weight:800;padding:0.6rem 1.5rem;border-radius:10px;box-shadow:0 4px 14px rgba(236,72,153,0.35);">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>

    <script>
    function onVideoTargetShopChange(val) {
      const sel = document.getElementById('video_target_shop_id');
      if (!sel) return;
      const opt = sel.options[sel.selectedIndex];
      if (opt) {
        const sName = opt.getAttribute('data-name') || '';
        const oName = opt.getAttribute('data-owner') || '';
        const loc = opt.getAttribute('data-loc') || '';
        if (document.getElementById('upload_shop_name')) document.getElementById('upload_shop_name').value = sName;
        if (document.getElementById('upload_owner_name')) document.getElementById('upload_owner_name').value = oName;
        if (document.getElementById('upload_shop_location')) document.getElementById('upload_shop_location').value = loc;
      }
    }

    function openEditVideoModal(data) {
      document.getElementById('edit_video_id').value = data.id || '';
      document.getElementById('edit_video_shop_name').value = data.shopName || '';
      document.getElementById('edit_video_owner_name').value = data.ownerName || '';
      document.getElementById('edit_video_shop_location').value = data.location || '';
      if (document.getElementById('edit_video_url_input')) {
        document.getElementById('edit_video_url_input').value = (data.url && data.url.startsWith('http') && !data.url.includes('/uploads/shop-media/')) ? data.url : '';
      }
      const thumbPrev = document.getElementById('edit_video_thumb_preview');
      if (thumbPrev && data.thumbnail) {
        thumbPrev.src = data.thumbnail;
        thumbPrev.style.display = 'block';
      } else if (thumbPrev) {
        thumbPrev.style.display = 'none';
      }
      const modal = document.getElementById('editVideoModal');
      modal.style.display = 'flex';
      if (window.lucide) lucide.createIcons();
    }
    function closeEditVideoModal() {
      document.getElementById('editVideoModal').style.display = 'none';
    }
    </script>
  </div>

  <!-- ========================================== -->
  <!-- TAB 3: SERVICES & PRICES                   -->
  <!-- ========================================== -->
  <?php elseif($activeTab === 'services'): ?>
  <div>
    <div style="margin-bottom:1.75rem;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.85rem;">
        <h3 style="font-size:1.05rem;font-weight:800;margin:0;display:flex;align-items:center;gap:0.5rem;"><i data-lucide="grid-3x3" style="width:18px;height:18px;color:#10B981;"></i>Service Categories</h3>
        <a href="<?= ADMIN_BASE_URL ?>/services/index.php" class="btn btn-secondary btn-sm" style="font-weight:700;display:inline-flex;align-items:center;gap:0.3rem;font-size:0.78rem;"><i data-lucide="settings" style="width:13px;height:13px;"></i>Manage</a>
      </div>
      <div style="display:flex;gap:0.85rem;flex-wrap:wrap;">
        <?php foreach($categories as $cat): ?>
        <div class="card" style="padding:0.85rem 1.1rem;border-radius:12px;display:flex;align-items:center;gap:0.65rem;min-width:140px;border-left:3.5px solid <?= htmlspecialchars($cat['color']??'#6366F1') ?>;">
          <div style="width:36px;height:36px;border-radius:10px;background:<?= htmlspecialchars($cat['color']??'#6366F1') ?>20;display:flex;align-items:center;justify-content:center;"><i data-lucide="<?= htmlspecialchars($cat['icon']??'layers') ?>" style="width:18px;height:18px;color:<?= htmlspecialchars($cat['color']??'#6366F1') ?>;"></i></div>
          <div><div style="font-size:0.85rem;font-weight:800;"><?= htmlspecialchars($cat['name']) ?></div><div style="font-size:0.7rem;color:var(--text-muted);"><?= intval($cat['count']??0) ?> services</div></div>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
    <div class="card" style="padding:1.5rem;border-radius:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.1rem;flex-wrap:wrap;gap:0.75rem;">
        <div>
          <h3 style="font-size:1.05rem;font-weight:800;margin:0;display:flex;align-items:center;gap:0.5rem;"><i data-lucide="layers" style="width:18px;height:18px;color:#10B981;"></i><?= $isOwner ? 'My Laundry Services &amp; Pricing' : 'Overall Laundry Services &amp; Pricing' ?></h3>
          <p style="color:var(--text-secondary);font-size:0.8rem;margin:0.2rem 0 0 0;">
            <?= $isOwner ? 'Showing services offered by ' . htmlspecialchars($shopName) : 'Showing services catalog with laundry owner assignment' ?>
          </p>
        </div>
        <a href="<?= ADMIN_BASE_URL ?>/services/index.php" class="btn btn-primary btn-sm" style="background:linear-gradient(135deg,#10B981 0%,#059669 100%);border:none;color:#FFF;font-weight:800;display:inline-flex;align-items:center;gap:0.3rem;font-size:0.78rem;box-shadow:0 3px 10px rgba(16,185,129,0.35);"><i data-lucide="plus" style="width:13px;height:13px;"></i>Add / Edit Services</a>
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table" style="min-width:600px;">
          <thead>
            <tr>
              <?php if (!$isOwner): ?><th>Laundry Shop</th><?php endif; ?>
              <th>Service</th>
              <th>Category</th>
              <th style="text-align:right;">Price</th>
              <th style="text-align:center;">Status</th>
              <th style="text-align:center;">Action</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach($services as $svc):
              $sName   = $svc['name'] ?? 'Service';
              $sCat    = $svc['category'] ?? $svc['category_name'] ?? '-';
              $rawPrice = $svc['price'] ?? $svc['base_price'] ?? '-';
              $sPrice  = str_starts_with(strval($rawPrice), '₹') ? $rawPrice : ('₹' . $rawPrice);
              $sActive = (bool)($svc['active'] ?? $svc['is_active'] ?? true);
              $sShopName = $svc['shopName'] ?? ('Shop #' . ($svc['shop_id'] ?? '30'));
            ?>
            <tr>
              <?php if (!$isOwner): ?>
              <td>
                <span style="background:rgba(99,102,241,0.1);color:#4F46E5;padding:0.2rem 0.55rem;border-radius:6px;font-size:0.72rem;font-weight:800;">
                  🏪 <?= htmlspecialchars($sShopName) ?>
                </span>
              </td>
              <?php endif; ?>
              <td style="font-weight:700;font-size:0.9rem;"><?= htmlspecialchars($sName) ?></td>
              <td><span style="background:rgba(99,102,241,0.1);color:#4338CA;padding:0.2rem 0.6rem;border-radius:6px;font-size:0.75rem;font-weight:700;"><?= htmlspecialchars($sCat) ?></span></td>
              <td style="text-align:right;font-weight:800;font-size:0.95rem;color:#10B981;"><?= htmlspecialchars($sPrice) ?></td>
              <td style="text-align:center;"><span style="background:<?= $sActive?'rgba(16,185,129,0.12)':'rgba(107,114,128,0.12)' ?>;color:<?= $sActive?'#059669':'#6B7280' ?>;font-size:0.73rem;font-weight:800;padding:0.2rem 0.65rem;border-radius:20px;text-transform:uppercase;"><?= $sActive?'Active':'Inactive' ?></span></td>
              <td style="text-align:center;"><a href="<?= ADMIN_BASE_URL ?>/services/index.php?edit=<?= htmlspecialchars($svc['id']??'1') ?>" class="btn btn-secondary btn-sm" style="font-size:0.74rem;font-weight:700;display:inline-flex;align-items:center;gap:0.25rem;"><i data-lucide="edit-2" style="width:12px;height:12px;"></i>Edit</a></td>
            </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- TAB 4: COUPONS                             -->
  <!-- ========================================== -->
  <?php elseif($activeTab === 'coupons'): ?>
  <div>
    <div style="background:linear-gradient(135deg,rgba(245,158,11,0.1) 0%,rgba(251,191,36,0.08) 100%);border:1.5px solid rgba(245,158,11,0.25);border-radius:14px;padding:1.2rem 1.5rem;margin-bottom:1.75rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
      <div style="display:flex;align-items:center;gap:0.75rem;">
        <div style="width:42px;height:42px;background:linear-gradient(135deg,#F59E0B 0%,#D97706 100%);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#FFF;box-shadow:0 4px 12px rgba(245,158,11,0.35);"><i data-lucide="ticket" style="width:22px;height:22px;"></i></div>
        <div>
          <div style="font-size:1rem;font-weight:800;"><?= $isOwner ? 'My Laundry Coupons &amp; Offers' : 'Active Coupons &amp; Promotions (Overall Info)' ?></div>
          <div style="font-size:0.8rem;color:var(--text-secondary);"><?= count($coupons) ?> coupon(s) configured</div>
        </div>
      </div>
      <a href="<?= ADMIN_BASE_URL ?>/promotions/index.php" class="btn btn-primary" style="background:linear-gradient(135deg,#F59E0B 0%,#D97706 100%);border:none;color:#FFF;font-weight:800;padding:0.6rem 1.4rem;display:inline-flex;align-items:center;gap:0.5rem;box-shadow:0 4px 12px rgba(245,158,11,0.35);border-radius:10px;"><i data-lucide="plus-circle" style="width:16px;height:16px;"></i>Manage All Coupons</a>
    </div>
    <?php if(empty($coupons)): ?>
    <div style="text-align:center;padding:3.5rem 2rem;background:var(--bg-card);border:2px dashed var(--border-color);border-radius:16px;">
      <h3 style="font-size:1.1rem;font-weight:800;margin:0 0 0.4rem 0;">No Coupons for this View</h3>
      <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:1rem;">
        <?= $isOwner ? 'You have not created any promo codes for your laundry shop yet.' : 'No coupons found for the selected shop filter.' ?>
      </p>
      <a href="<?= ADMIN_BASE_URL ?>/promotions/index.php" class="btn btn-primary" style="background:linear-gradient(135deg,#F59E0B 0%,#D97706 100%);border:none;color:#FFF;font-weight:800;display:inline-flex;align-items:center;gap:0.4rem;border-radius:10px;"><i data-lucide="plus" style="width:16px;height:16px;"></i>Create First Coupon</a>
    </div>
    <?php else: ?>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem;">
      <?php foreach($coupons as $c):
        $cActive = (bool)($c['active'] ?? true);
        $cShopName = $c['shopName'] ?? ('Shop #' . ($c['shop_id'] ?? $c['shopId'] ?? '30'));
      ?>
      <div style="background:<?= $cActive?'linear-gradient(135deg,rgba(245,158,11,0.08) 0%,rgba(251,191,36,0.05) 100%)':'var(--bg-card)' ?>;border:1.5px solid <?= $cActive?'rgba(245,158,11,0.3)':'var(--border-color)' ?>;border-radius:14px;padding:1.25rem;position:relative;">
        <?php if (!$isOwner): ?>
        <div style="margin-bottom:0.6rem;">
          <span style="background:rgba(99,102,241,0.12);color:#4F46E5;font-weight:800;font-size:0.72rem;padding:0.2rem 0.55rem;border-radius:6px;display:inline-flex;align-items:center;gap:0.3rem;">
            🏪 <?= htmlspecialchars($cShopName) ?>
          </span>
        </div>
        <?php endif; ?>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.85rem;">
          <div>
            <div style="font-size:1.15rem;font-weight:900;letter-spacing:1px;color:<?= $cActive?'#D97706':'var(--text-muted)' ?>;font-family:monospace;"><?= htmlspecialchars($c['code']??'CODE') ?></div>
            <div style="font-size:1.4rem;font-weight:900;color:<?= $cActive?'#10B981':'var(--text-muted)' ?>;margin-top:0.15rem;"><?= htmlspecialchars($c['discount']??'-') ?></div>
          </div>
          <span style="background:<?= $cActive?'#D1FAE5':'#F3F4F6' ?>;color:<?= $cActive?'#059669':'#6B7280' ?>;font-size:0.7rem;font-weight:800;padding:0.25rem 0.6rem;border-radius:20px;text-transform:uppercase;"><?= $cActive?'Active':'Inactive' ?></span>
        </div>
        <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:0.3rem;">Min Order: <strong>&#8377;<?= htmlspecialchars($c['minOrder']??'-') ?></strong></div>
        <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem;">Expires: <strong><?= htmlspecialchars($c['expiry']??'-') ?></strong></div>
        <a href="<?= ADMIN_BASE_URL ?>/promotions/index.php" class="btn btn-secondary btn-sm" style="width:100%;text-align:center;justify-content:center;font-size:0.78rem;font-weight:700;display:flex;align-items:center;gap:0.3rem;"><i data-lucide="edit-2" style="width:12px;height:12px;"></i>Edit / Delete</a>
      </div>
      <?php endforeach; ?>
    </div>
    <?php endif; ?>
  </div>
  <?php endif; ?>

  <div style="margin-top:2.5rem;background:linear-gradient(135deg,rgba(14,165,233,0.08) 0%,rgba(99,102,241,0.06) 100%);border:1px solid rgba(14,165,233,0.2);border-radius:14px;padding:1rem 1.5rem;display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
    <div style="width:40px;height:40px;background:linear-gradient(135deg,#0EA5E9 0%,#6366F1 100%);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#FFF;box-shadow:0 4px 12px rgba(14,165,233,0.3);flex-shrink:0;"><i data-lucide="info" style="width:20px;height:20px;"></i></div>
    <div style="flex:1;min-width:200px;">
      <div style="font-size:0.85rem;font-weight:800;">Real-time Multi-Tenant Sync with DhobiPro Customer App</div>
      <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:0.15rem;">
        Laundry owners manage only their own self-uploaded videos, banners, photos, services, and coupons. Super Admin monitors overall platform uploads across all laundry shops.
      </div>
    </div>
  </div>
</div>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
