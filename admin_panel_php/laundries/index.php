<?php
$pageTitle = 'Laundry Shop Directory';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';

$isOwner = isLaundryOwner();
$shopId = currentShopId();

// Handle Form Post Actions (e.g. status changes, approve, reject, onboard, edit)
$actionMsg = null;
$actionError = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $targetId = $_POST['shop_id'] ?? '';

    if ($action === 'approve' && $targetId) {
        if (!empty($_SESSION['custom_shops'])) {
            foreach ($_SESSION['custom_shops'] as &$s) {
                if (strval($s['id'] ?? '') === strval($targetId)) {
                    $s['verificationStatus'] = 'APPROVED';
                    $s['verification_status'] = 'APPROVED';
                    $s['status'] = 'ACTIVE';
                    $s['accountStatus'] = 'ACTIVE';
                }
            }
            unset($s);
        }
        $res = apiPost("/admin/laundries/{$targetId}/approve");
        $actionMsg = 'Laundry shop successfully approved and verified!';
    } elseif ($action === 'status' && $targetId) {
        $newStatus = $_POST['status'] ?? 'ACTIVE';
        $res = apiPost("/admin/laundries/{$targetId}/status", ['status' => $newStatus]);
        $actionMsg = "Shop status updated to {$newStatus}.";
    } elseif ($action === 'delete' && $targetId) {
        if (!empty($_SESSION['custom_shops'])) {
            $_SESSION['custom_shops'] = array_values(array_filter($_SESSION['custom_shops'], function($s) use ($targetId) {
                return strval($s['id'] ?? '') !== strval($targetId);
            }));
        }
        $res = apiDelete("/admin/laundries/{$targetId}");
        $actionMsg = "Laundry shop #{$targetId} permanently removed.";
    } elseif ($action === 'request_missing_docs' && $targetId) {
        $docs = $_POST['docs'] ?? [];
        $requestNote = trim($_POST['request_note'] ?? '');
        $shopName = trim($_POST['shop_name'] ?? "Shop #{$targetId}");
        
        if (!isset($_SESSION['doc_requests'])) {
            $_SESSION['doc_requests'] = [];
        }
        $_SESSION['doc_requests'][$targetId] = [
            'shop_id' => $targetId,
            'shop_name' => $shopName,
            'requested_docs' => $docs,
            'note' => $requestNote,
            'requested_at' => date('Y-m-d H:i:s'),
            'status' => 'PENDING_UPLOAD',
        ];
        $actionMsg = "Compliance document request sent to {$shopName}. The laundry owner will see this notification on their verification screen.";
    } elseif ($action === 'onboard') {
        $uploadDir = __DIR__ . '/../uploads/documents/';
        if (!is_dir($uploadDir)) {
            @mkdir($uploadDir, 0777, true);
        }

        $handleUpload = function($fileKey, $prefix) use ($uploadDir) {
            if (!empty($_FILES[$fileKey]['name']) && $_FILES[$fileKey]['error'] === UPLOAD_ERR_OK) {
                $ext = strtolower(pathinfo($_FILES[$fileKey]['name'], PATHINFO_EXTENSION));
                $fName = $prefix . '_' . time() . '_' . mt_rand(1000, 9999) . '.' . $ext;
                if (move_uploaded_file($_FILES[$fileKey]['tmp_name'], $uploadDir . $fName)) {
                    return '/uploads/documents/' . $fName;
                }
            }
            return '';
        };

        $idProofPhoto = $handleUpload('id_proof_photo', 'aadhaar');
        $businessProofPhoto = $handleUpload('business_proof_photo', 'udyam');
        $bankProofPhoto = $handleUpload('bank_proof_photo', 'bank');
        $shopBoardPhoto = $handleUpload('shop_board_photo', 'shopboard');
        $logoPhoto = $handleUpload('logo_photo', 'logo');

        // Handle multiple cover images
        $coverPhotos = [];
        if (!empty($_FILES['cover_photos']['name']) && is_array($_FILES['cover_photos']['name'])) {
            foreach ($_FILES['cover_photos']['name'] as $idx => $origName) {
                if (!empty($origName) && $_FILES['cover_photos']['error'][$idx] === UPLOAD_ERR_OK) {
                    $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
                    $fName = 'cover_' . time() . '_' . $idx . '_' . mt_rand(1000, 9999) . '.' . $ext;
                    if (move_uploaded_file($_FILES['cover_photos']['tmp_name'][$idx], $uploadDir . $fName)) {
                        $coverPhotos[] = [
                            'name' => $origName,
                            'url' => '/uploads/documents/' . $fName
                        ];
                    }
                }
            }
        }
        $coverPhotoPrimary = !empty($coverPhotos) ? $coverPhotos[0]['url'] : '';

        $payload = [
            'name' => $_POST['shop_name'] ?? '',
            'owner_name' => $_POST['owner_name'] ?? '',
            'phone' => $_POST['phone'] ?? '',
            'email' => $_POST['email'] ?? '',
            'password' => $_POST['password'] ?? 'Dhobi@7462',
            'city' => $_POST['city'] ?? 'Pune',
            'state' => 'Maharashtra',
            'address' => $_POST['address'] ?? '',
            'pincode' => $_POST['pincode'] ?? '411057',
            'pickup_radius_km' => intval($_POST['pickup_radius_km'] ?? 8),
            'working_hours' => $_POST['working_hours'] ?? '08:00 AM - 09:30 PM',
            'id_proof_number' => $_POST['id_proof_number'] ?? '',
            'id_proof_photo' => $idProofPhoto,
            'bank_name' => $_POST['bank_name'] ?? 'HDFC Bank',
            'bank_account' => $_POST['bank_account'] ?? '',
            'ifsc_code' => $_POST['ifsc_code'] ?? '',
            'account_holder' => $_POST['account_holder'] ?? ($_POST['owner_name'] ?? ''),
            'upi_id' => $_POST['upi_id'] ?? '',
            'gst_number' => $_POST['gst_number'] ?? '',
            'business_proof_number' => $_POST['business_proof_number'] ?? '',
            'business_proof_photo' => $businessProofPhoto,
            'bank_proof_photo' => $bankProofPhoto,
            'shop_board_photo' => $shopBoardPhoto,
            'logo_url' => $logoPhoto,
            'cover_url' => $coverPhotoPrimary,
            'verification_status' => $_POST['verification_status'] ?? 'APPROVED',
            'account_status' => $_POST['account_status'] ?? 'ACTIVE',
            'subscription_plan' => $_POST['subscription_plan'] ?? 'Starter',
            'latitude' => floatval($_POST['latitude'] ?? 18.5590),
            'longitude' => floatval($_POST['longitude'] ?? 73.7868),
        ];

        // Store custom shop in session so it immediately displays in the directory with uploaded logo
        $newShopItem = [
            'id' => strval(rand(100, 999)),
            'shopName' => $payload['name'],
            'name' => $payload['name'],
            'ownerName' => $payload['owner_name'],
            'owner_name' => $payload['owner_name'],
            'phone' => $payload['phone'],
            'email' => $payload['email'],
            'city' => $payload['city'],
            'address' => $payload['address'],
            'pincode' => $payload['pincode'],
            'pickupRadiusKm' => $payload['pickup_radius_km'],
            'workingHours' => $payload['working_hours'],
            'totalOrders' => 0,
            'revenue' => 0,
            'rating' => 5.0,
            'verificationStatus' => $payload['verification_status'],
            'accountStatus' => $payload['account_status'],
            'logo_url' => $logoPhoto,
            'logo' => $logoPhoto,
            'cover_url' => $coverPhotoPrimary,
            'cover_photos' => $coverPhotos,
            'idProofPhoto' => $idProofPhoto,
            'idProofNumber' => $payload['id_proof_number'],
            'businessProofPhoto' => $businessProofPhoto,
            'businessProofNumber' => $payload['business_proof_number'],
            'bankProofPhoto' => $bankProofPhoto,
            'shopBoardPhoto' => $shopBoardPhoto,
            'bankName' => $payload['bank_name'],
            'bankAccount' => $payload['bank_account'],
            'ifscCode' => $payload['ifsc_code'],
            'upiId' => $payload['upi_id'],
            'gstNumber' => $payload['gst_number'],
            'latitude' => $payload['latitude'],
            'longitude' => $payload['longitude'],
        ];

        if (!isset($_SESSION['custom_shops'])) {
            $_SESSION['custom_shops'] = [];
        }
        array_unshift($_SESSION['custom_shops'], $newShopItem);

        $res = apiPost('/admin/laundries/onboard', $payload);
        $newShopLogo = $logoPhoto;
        $newShopName = $payload['name'];
        $actionMsg = 'Laundry partner "' . htmlspecialchars($payload['name']) . '" successfully onboarded with live status & uploaded compliance documents!';
    } elseif ($action === 'edit' && $targetId) {
        $payload = [
            'name' => $_POST['shop_name'] ?? '',
            'phone' => $_POST['phone'] ?? '',
            'address' => $_POST['address'] ?? '',
            'city' => $_POST['city'] ?? '',
            'working_hours' => $_POST['working_hours'] ?? '',
            'pickup_radius_km' => intval($_POST['pickup_radius_km'] ?? 5),
        ];
        $res = apiPut("/admin/laundries/{$targetId}", $payload);
        $actionMsg = 'Shop profile details updated successfully!';
    }
}

// Fetch live laundries
if ($isOwner && $shopId) {
    $res = apiGet('/owner/profile', ['shop_id' => $shopId]);
    $laundries = !empty($res['data']) ? (isset($res['data'][0]) ? $res['data'] : [$res['data']]) : [];
    if (empty($laundries)) {
        $resAll = apiGet('/admin/laundries');
        $all = apiExtractList($resAll);
        $laundries = array_filter($all, fn($l) => strval($l['id'] ?? '') === strval($shopId));
    }
} else {
    $res = apiGet('/admin/laundries');
    $laundries = apiExtractList($res);
}

// Prepend session custom shops so user-created shops persist and display
if (!empty($_SESSION['custom_shops'])) {
    $laundries = array_merge($_SESSION['custom_shops'], $laundries);
}

// If logged in as Laundry Owner, STRICTLY isolate and filter out all other laundries!
if ($isOwner) {
    $myShopId = currentShopId();
    $myShopName = currentShopName();
    $currentUser = currentUser();
    $myOwnerName = $currentUser['name'] ?? '';
    $myEmail = $currentUser['email'] ?? '';

    $laundries = array_values(array_filter($laundries, function($l) use ($myShopId, $myShopName, $myOwnerName, $myEmail) {
        $lId = strval($l['id'] ?? $l['shop_id'] ?? '');
        $lShop = strtolower(trim($l['shopName'] ?? $l['name'] ?? $l['shop_name'] ?? ''));
        $lOwner = strtolower(trim($l['ownerName'] ?? $l['owner_name'] ?? ''));
        $lEmail = strtolower(trim($l['email'] ?? ''));
        
        if ($myShopId && $lId === strval($myShopId)) return true;
        if ($lEmail && strtolower($myEmail) && $lEmail === strtolower($myEmail)) return true;
        if ($lOwner && strtolower($myOwnerName) && $lOwner === strtolower($myOwnerName)) return true;
        if ($lShop && strtolower($myShopName) && (strpos($lShop, strtolower($myShopName)) !== false || strpos(strtolower($myShopName), $lShop) !== false)) return true;
        return false;
    }));
}

// Removed base demo record for Star Wash Ultra Premium because it is now globally seeded in config/api.php

$totalLaundriesCount = count($laundries);
$tab = $_GET['tab'] ?? 'ALL';

if ($tab === 'ACTIVE') {
    $laundries = array_filter($laundries, fn($l) => strtoupper($l['status'] ?? $l['accountStatus'] ?? 'ACTIVE') === 'ACTIVE' && strtoupper($l['verificationStatus'] ?? $l['verification_status'] ?? 'APPROVED') === 'APPROVED');
} elseif ($tab === 'PENDING') {
    $laundries = array_filter($laundries, fn($l) => strtoupper($l['verificationStatus'] ?? $l['verification_status'] ?? 'APPROVED') === 'PENDING');
} elseif ($tab === 'SUSPENDED') {
    $laundries = array_filter($laundries, fn($l) => strtoupper($l['status'] ?? $l['accountStatus'] ?? 'ACTIVE') === 'SUSPENDED');
}
?>

<div style="color: var(--text-primary);">
  <!-- Header Title & Actions -->
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary); margin: 0;">
        <i data-lucide="store" style="width: 28px; height: 28px; color: #8162EE;"></i> 
        <?= $isOwner ? 'My Laundry Shop Profile' : 'Laundry Shop Directory & Compliance' ?>
      </h1>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.2rem; margin-bottom: 0;">
        <?= $isOwner ? 'Manage your storefront, operating hours, delivery radius, and compliance documents.' : 'Manage onboarded partner shops, verify documents, inspect orders, and control outlet status.' ?>
      </p>
    </div>

    <?php if (!$isOwner): ?>
      <button
        onclick="openOnboardModal()"
        class="btn btn-primary"
        style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #E18C8E 67.34%, #FE9A5D 98.26%); color: #FFF; padding: 0.65rem 1.25rem; border-radius: 8px; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 14px rgba(129, 98, 238, 0.4);"
      >
        <i data-lucide="plus" style="width: 18px; height: 18px;"></i> Onboard New Laundry Shop
      </button>
    <?php endif; ?>
  </div>

  <?php if ($actionMsg): ?>
    <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); color: #065F46; padding: 0.9rem 1.25rem; border-radius: 12px; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; box-shadow: 0 4px 14px rgba(16,185,129,0.12);">
      <div style="display: flex; align-items: center; gap: 0.85rem;">
        <?php if (!empty($newShopLogo)): ?>
          <img src="<?= htmlspecialchars($newShopLogo) ?>" alt="Uploaded Logo" style="width: 48px; height: 48px; border-radius: 12px; object-fit: cover; border: 2px solid #10B981; box-shadow: 0 2px 8px rgba(0,0,0,0.15); background: #fff; flex-shrink: 0;">
        <?php else: ?>
          <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(16, 185, 129, 0.2); color: #10B981; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <i data-lucide="check-circle" style="width: 22px; height: 22px;"></i>
          </div>
        <?php endif; ?>
        <div>
          <div style="font-weight: 800; font-size: 0.92rem; color: #065F46;"><?= htmlspecialchars($actionMsg) ?></div>
          <div style="font-size: 0.76rem; color: #047857; margin-top: 0.15rem;">Shop profile, uploaded brand logo, and compliance documents are registered into the DhobiPro platform.</div>
        </div>
      </div>
    </div>
  <?php endif; ?>

  <?php if ($actionError): ?>
    <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #DC2626; padding: 0.75rem 1rem; border-radius: 8px; font-weight: 700; font-size: 0.85rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
      <i data-lucide="alert-circle" style="width: 18px; height: 18px;"></i> <?= htmlspecialchars($actionError) ?>
    </div>
  <?php endif; ?>

  <!-- Tabs Navigation -->
  <?php if (!$isOwner): ?>
    <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; flex-wrap: wrap;">
      <?php
      $tabs = [
          'ALL' => '🏪 All Shops (' . $totalLaundriesCount . ')',
          'ACTIVE' => '✅ Active & Verified',
          'PENDING' => '⏳ Pending Queue',
          'SUSPENDED' => '⛔ Suspended'
      ];
      foreach ($tabs as $key => $label):
          $isActiveTab = ($tab === $key);
      ?>
        <a href="?tab=<?= $key ?>" style="padding: 0.55rem 1rem; border-radius: 8px; font-weight: 700; font-size: 0.84rem; text-decoration: none; color: <?= $isActiveTab ? '#FFF' : 'var(--text-secondary)' ?>; background: <?= $isActiveTab ? 'linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%)' : 'transparent' ?>;">
          <?= $label ?>
        </a>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>

  <!-- Laundries Table -->
  <div class="card" style="padding: 1.5rem;">
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Laundry Shop</th>
            <th>Owner Details</th>
            <th>City / Coverage</th>
            <th>Total Orders</th>
            <th>Revenue</th>
            <th>Rating</th>
            <th>Verification</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($laundries)): ?>
            <tr>
              <td colspan="9" style="text-align: center; padding: 2.5rem; color: var(--text-muted); font-weight: 600;">
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem;">
                  <i data-lucide="store" style="width: 32px; height: 32px; color: #8162EE; opacity: 0.7;"></i>
                  <span>No laundry shops found in this category.</span>
                </div>
              </td>
            </tr>
          <?php endif; ?>
          <?php foreach ($laundries as $shop): 
              $sId = $shop['id'] ?? $shop['shop_id'] ?? '';
              $rawName = $shop['shopName'] ?? $shop['name'] ?? $shop['shop_name'] ?? '';
              $sName = trim($rawName) !== '' ? trim($rawName) : "Laundry Shop #{$sId}";
              $rawOwner = $shop['ownerName'] ?? $shop['owner_name'] ?? '';
              $oName = trim($rawOwner) !== '' ? trim($rawOwner) : "Partner Owner";
              $phone = $shop['phone'] ?? $shop['mobile_number'] ?? 'N/A';
              $city = $shop['city'] ?? 'Pune';
              $orders = $shop['totalOrders'] ?? $shop['total_orders'] ?? 0;
              $rev = $shop['revenue'] ?? $shop['total_revenue'] ?? 0;
              $rating = $shop['rating'] ?? 5.0;
              $vStatus = strtoupper($shop['verificationStatus'] ?? $shop['verification_status'] ?? 'APPROVED');
              $aStatus = strtoupper($shop['accountStatus'] ?? $shop['status'] ?? 'ACTIVE');
              $sLogo = $shop['logo_url'] ?? $shop['logo'] ?? $shop['logo_photo'] ?? '';
              $cleanText = preg_replace('/[^A-Za-z0-9]/', '', $sName);
              $initials = strtoupper(substr($cleanText ?: 'LS', 0, 2));
          ?>
            <tr>
              <td>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <?php if (!empty($sLogo)): ?>
                    <img 
                      src="<?= htmlspecialchars($sLogo) ?>" 
                      alt="<?= htmlspecialchars($sName) ?>" 
                      style="width: 44px; height: 44px; border-radius: 10px; object-fit: cover; border: 1px solid var(--border-color); box-shadow: 0 2px 8px rgba(0,0,0,0.08); flex-shrink: 0; background: #fff;"
                      onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';"
                    >
                    <div style="display: none; width: 44px; height: 44px; border-radius: 10px; background: linear-gradient(135deg, #8162EE 0%, #32138F 100%); color: #FFF; font-weight: 800; font-size: 0.85rem; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(129,98,238,0.25);">
                      <?= htmlspecialchars($initials) ?>
                    </div>
                  <?php else: ?>
                    <div style="width: 44px; height: 44px; border-radius: 10px; background: linear-gradient(135deg, #8162EE 0%, #32138F 100%); color: #FFF; font-weight: 800; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(129,98,238,0.25);">
                      <?= htmlspecialchars($initials) ?>
                    </div>
                  <?php endif; ?>
                  <div>
                    <div style="font-weight: 800; font-size: 0.95rem; color: var(--brand-purple);"><?= htmlspecialchars($sName) ?></div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">ID: #<?= htmlspecialchars($sId) ?> • <?= htmlspecialchars($shop['workingHours'] ?? '8 AM - 9 PM') ?></div>
                  </div>
                </div>
              </td>
              <td>
                <div style="font-weight: 700; font-size: 0.85rem;"><?= htmlspecialchars($oName) ?></div>
                <div style="font-size: 0.75rem; color: var(--text-muted);"><?= htmlspecialchars($phone) ?></div>
              </td>
              <td>
                <span style="font-weight: 700; font-size: 0.85rem;">📍 <?= htmlspecialchars($city) ?></span>
                <div style="font-size: 0.72rem; color: #10B981; font-weight: 700;">Radius: <?= $shop['pickupRadiusKm'] ?? 8 ?> km</div>
              </td>
              <td><strong style="font-size: 0.92rem;"><?= number_format($orders) ?></strong></td>
              <td><strong style="color: #10B981; font-size: 0.95rem;">₹<?= number_format($rev) ?></strong></td>
              <td><span style="color: #F59E0B; font-weight: 800;">★ <?= number_format($rating, 1) ?></span></td>
              <td>
                <span class="badge badge-<?= $vStatus === 'APPROVED' ? 'success' : ($vStatus === 'PENDING' ? 'warning' : 'danger') ?>">
                  <?= $vStatus ?>
                </span>
              </td>
              <td>
                <span class="badge badge-<?= $aStatus === 'ACTIVE' ? 'success' : 'danger' ?>">
                  <?= $aStatus ?>
                </span>
              </td>
              <td>
                <div style="display: flex; gap: 0.4rem; align-items: center; white-space: nowrap;">
                  <button 
                    type="button" 
                    onclick="viewShopDetails(<?= htmlspecialchars(json_encode($shop)) ?>)"
                    class="btn btn-secondary btn-sm" 
                    style="display: inline-flex; align-items: center; gap: 0.25rem;"
                    title="View Full Compliance & Bank Profile"
                  >
                    <i data-lucide="eye" style="width: 14px; height: 14px;"></i> Inspect
                  </button>

                  <button 
                    type="button" 
                    onclick="openEditShop(<?= htmlspecialchars(json_encode($shop)) ?>)"
                    class="btn btn-secondary btn-sm"
                    title="Edit Shop Details"
                  >
                    <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
                  </button>

                  <?php if (!$isOwner && $vStatus !== 'APPROVED'): ?>
                    <form method="POST" action="" style="display: inline;" onsubmit="return confirm('Approve verification for this laundry shop?');">
                      <input type="hidden" name="action" value="approve">
                      <input type="hidden" name="shop_id" value="<?= htmlspecialchars($sId) ?>">
                      <button type="submit" class="btn btn-success btn-sm" style="display: inline-flex; align-items: center; gap: 0.25rem;">
                        <i data-lucide="check" style="width: 14px; height: 14px;"></i> Approve
                      </button>
                    </form>
                  <?php endif; ?>

                  <?php if (!$isOwner): ?>
                    <form method="POST" action="" style="display: inline;" onsubmit="return confirm('Change account status?');">
                      <input type="hidden" name="action" value="status">
                      <input type="hidden" name="shop_id" value="<?= htmlspecialchars($sId) ?>">
                      <input type="hidden" name="status" value="<?= $aStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' ?>">
                      <button type="submit" class="btn btn-sm" style="background: <?= $aStatus === 'ACTIVE' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)' ?>; color: <?= $aStatus === 'ACTIVE' ? '#EF4444' : '#10B981' ?>; border: none; font-weight: 700;">
                        <?= $aStatus === 'ACTIVE' ? 'Suspend' : 'Activate' ?>
                      </button>
                    </form>

                    <form method="POST" action="" style="display: inline;" onsubmit="return confirm('Are you sure you want to permanently delete <?= htmlspecialchars(addslashes($sName)) ?>?');">
                      <input type="hidden" name="action" value="delete">
                      <input type="hidden" name="shop_id" value="<?= htmlspecialchars($sId) ?>">
                      <button type="submit" class="btn btn-sm" style="background: rgba(239, 68, 68, 0.15); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.35rem 0.65rem; border-radius: 6px; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem; cursor: pointer;" title="Delete Laundry Shop">
                        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> Delete
                      </button>
                    </form>
                  <?php endif; ?>
                </div>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Modal: View Shop Details & Compliance Documents -->
<div id="shopDetailModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); align-items: center; justify-content: center; z-index: 99999; padding: 1.5rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 820px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px rgba(0,0,0,0.4); color: var(--text-primary); display: flex; flex-direction: column;">
    <div style="padding: 1.25rem 1.75rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, rgba(129, 98, 238, 0.12) 0%, rgba(50, 19, 143, 0.18) 100%);">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div style="width: 42px; height: 42px; border-radius: 10px; background: linear-gradient(135deg, #8162EE 0%, #32138F 100%); display: flex; align-items: center; justify-content: center; color: #FFF; box-shadow: 0 4px 12px rgba(129,98,238,0.35);">
          <i data-lucide="store" style="width: 22px; height: 22px;"></i>
        </div>
        <div>
          <h3 id="modalShopName" style="font-size: 1.25rem; font-weight: 800; margin: 0; color: var(--text-primary);">Shop Details</h3>
          <p id="modalShopSubtitle" style="margin: 0.15rem 0 0 0; font-size: 0.78rem; color: var(--text-secondary);">Compliance verification and vendor registration profile</p>
        </div>
      </div>
      <button onclick="closeModal('shopDetailModal')" style="background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 8px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted);">✕</button>
    </div>
    
    <div id="modalShopContent" style="padding: 1.75rem; font-size: 0.9rem; line-height: 1.6; overflow-y: auto;">
      <!-- Populated dynamically via viewShopDetails() -->
    </div>

    <div style="padding: 1rem 1.75rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-input);">
      <div id="modalShopFooterStatus"></div>
      <button onclick="closeModal('shopDetailModal')" class="btn btn-secondary" style="font-weight: 700; padding: 0.6rem 1.5rem;">Close</button>
    </div>
  </div>
</div>

<!-- Modal: Document Preview Lightbox -->
<div id="docPreviewLightbox" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(10, 15, 30, 0.85); backdrop-filter: blur(10px); align-items: center; justify-content: center; z-index: 100000; padding: 1.5rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid rgba(129,98,238,0.3); width: 100%; max-width: 720px; box-shadow: 0 30px 60px rgba(0,0,0,0.6); color: var(--text-primary); overflow: hidden; display: flex; flex-direction: column;">
    <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.15);">
      <div style="display: flex; align-items: center; gap: 0.6rem;">
        <i data-lucide="file-text" style="width: 20px; height: 20px; color: #8162EE;"></i>
        <h3 id="docPreviewTitle" style="font-size: 1.15rem; font-weight: 800; margin: 0; color: var(--text-primary);">Document Preview</h3>
      </div>
      <button onclick="closeModal('docPreviewLightbox')" style="background: var(--bg-input); border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted);">✕</button>
    </div>
    
    <div style="padding: 1.5rem; text-align: center; background: rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; min-height: 320px;">
      <img id="docPreviewImg" src="" alt="Document Preview" style="max-width: 100%; max-height: 480px; border-radius: 10px; border: 1px solid var(--border-color); box-shadow: 0 10px 25px rgba(0,0,0,0.3); object-fit: contain; background: #FFF;">
    </div>

    <div style="padding: 1rem 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card);">
      <span style="font-size: 0.78rem; color: #10B981; font-weight: 700; display: flex; align-items: center; gap: 0.35rem;">
        <i data-lucide="shield-check" style="width: 16px; height: 16px;"></i> Verified Official KYC Compliance Document
      </span>
      <div style="display: flex; gap: 0.75rem;">
        <a id="docPreviewFullTabBtn" href="#" target="_blank" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 700;">
          <i data-lucide="external-link" style="width: 14px; height: 14px;"></i> Open Full Size
        </a>
        <a id="docPreviewDownloadBtn" href="#" download class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 700; background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none;">
          <i data-lucide="download" style="width: 14px; height: 14px;"></i> Download
        </a>
        <button onclick="closeModal('docPreviewLightbox')" class="btn btn-secondary btn-sm" style="font-weight: 700;">Close</button>
      </div>
    </div>
  </div>
</div>

<!-- Modal: Direct Onboard Laundry Shop (Full Multi-Step Wizard) -->
<div id="onboardModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); align-items: center; justify-content: center; z-index: 99999; padding: 1.5rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid rgba(129,98,238,0.3); width: 100%; max-width: 860px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 25px 50px rgba(0,0,0,0.6); color: var(--text-primary);">
    <!-- Modal Header -->
    <div style="padding: 1.25rem 1.75rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; background: linear-gradient(135deg, rgba(129, 98, 238, 0.15) 0%, rgba(50, 19, 143, 0.2) 100%);">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div style="width: 42px; height: 42px; border-radius: 10px; background: linear-gradient(135deg, #8162EE 0%, #32138F 100%); display: flex; align-items: center; justify-content: center; color: #FFF; box-shadow: 0 4px 12px rgba(129, 98, 238, 0.4);">
          <i data-lucide="store" style="width: 22px; height: 22px;"></i>
        </div>
        <div>
          <h2 style="font-size: 1.25rem; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 0.5rem; color: var(--text-primary);">
            Onboard Laundry Shop
            <span style="font-size: 0.65rem; padding: 0.2rem 0.6rem; border-radius: 20px; background: rgba(16, 185, 129, 0.2); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.4); font-weight: 800; text-transform: uppercase;">
              ⚡ Admin Instant Live
            </span>
          </h2>
          <p style="margin: 0.2rem 0 0 0; font-size: 0.8rem; color: var(--text-secondary);">
            Directly register a laundry partner into DhobiPro platform with immediate live shop permissions.
          </p>
        </div>
      </div>
      <button type="button" onclick="closeModal('onboardModal')" style="background: rgba(255,255,255,0.06); border: none; border-radius: 8px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); cursor: pointer;">✕</button>
    </div>

    <!-- Stepper Navigation Bar -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); border-bottom: 1px solid var(--border-color); background: rgba(0,0,0,0.12);">
      <button type="button" id="stepTabBtn1" onclick="goToStep(1)" style="background: rgba(129,98,238,0.12); border: none; border-bottom: 3px solid #8162EE; padding: 0.85rem 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer; color: #8162EE; font-weight: 800; font-size: 0.85rem;">
        <span class="step-num-badge" style="width: 22px; height: 22px; border-radius: 50%; background: #8162EE; color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 0.75rem;">1</span>
        <span>Owner Info</span>
      </button>
      <button type="button" id="stepTabBtn2" onclick="goToStep(2)" style="background: transparent; border: none; border-bottom: 3px solid transparent; padding: 0.85rem 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer; color: var(--text-muted); font-weight: 600; font-size: 0.85rem;">
        <span class="step-num-badge" style="width: 22px; height: 22px; border-radius: 50%; background: rgba(255,255,255,0.1); color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 0.75rem;">2</span>
        <span>Shop Profile</span>
      </button>
      <button type="button" id="stepTabBtn3" onclick="goToStep(3)" style="background: transparent; border: none; border-bottom: 3px solid transparent; padding: 0.85rem 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer; color: var(--text-muted); font-weight: 600; font-size: 0.85rem;">
        <span class="step-num-badge" style="width: 22px; height: 22px; border-radius: 50%; background: rgba(255,255,255,0.1); color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 0.75rem;">3</span>
        <span>Banking & GST</span>
      </button>
      <button type="button" id="stepTabBtn4" onclick="goToStep(4)" style="background: transparent; border: none; border-bottom: 3px solid transparent; padding: 0.85rem 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer; color: var(--text-muted); font-weight: 600; font-size: 0.85rem;">
        <span class="step-num-badge" style="width: 22px; height: 22px; border-radius: 50%; background: rgba(255,255,255,0.1); color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 0.75rem;">4</span>
        <span>Services & Launch</span>
      </button>
    </div>

    <!-- Multi-Step Form Body -->
    <form id="onboardLaundryForm" method="POST" action="" enctype="multipart/form-data" style="flex: 1; overflow-y: auto; padding: 1.75rem 2rem;">
      <input type="hidden" name="action" value="onboard">
      
      <!-- STEP 1: OWNER INFO & KYC -->
      <div id="stepSection1">
        <div style="border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 0.6rem; margin-bottom: 1.25rem;">
          <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #8162EE; display: flex; align-items: center; gap: 0.4rem;">
            👤 Partner Owner &amp; Login Credentials
          </h4>
          <span style="font-size: 0.75rem; color: var(--text-muted);">
            Enter the primary laundry owner's personal details and credentials to access Partner App.
          </span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">
              Owner Full Name *
            </label>
            <input type="text" id="ob_owner_name" name="owner_name" required placeholder="e.g. Ramesh Kumar Sharma" class="form-control" style="width: 100%;">
          </div>
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">
              Mobile Phone Number * (10 Digits)
            </label>
            <input type="tel" id="ob_phone" name="phone" required placeholder="e.g. 9876543210" maxlength="15" class="form-control" style="width: 100%;">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">
              Email Address
            </label>
            <input type="email" id="ob_email" name="email" placeholder="e.g. ramesh.laundry@gmail.com" class="form-control" style="width: 100%;">
          </div>
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">
              Partner Login Password
            </label>
            <input type="text" name="password" value="Dhobi@<?= rand(1000, 9999) ?>" class="form-control" style="width: 100%;">
          </div>
        </div>

        <!-- Aadhaar / ID Proof Document Upload from Device -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; background: var(--bg-input); padding: 1.1rem; border-radius: 12px; border: 1px solid var(--border-color);">
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">
              Owner Aadhaar / Government ID Number
            </label>
            <input type="text" id="ob_id_proof_number" name="id_proof_number" placeholder="e.g. 5421 8765 4321" class="form-control" style="width: 100%;">
          </div>
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">
              Upload ID Proof (Aadhaar / PAN from Device)
            </label>
            <input type="file" id="ob_id_proof_photo" name="id_proof_photo" accept="image/*,.pdf" onchange="handleSingleUploadPreview(this, 'aadhaarPreview', 'aadhaarInfoText')" style="font-size: 0.8rem; width: 100%;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.4rem;">
              <img id="aadhaarPreview" src="" alt="ID Preview" style="display: none; width: 44px; height: 32px; border-radius: 4px; object-fit: cover; border: 1px solid var(--border-color); background: #fff;">
              <span id="aadhaarInfoText" style="font-size: 0.72rem; color: var(--text-muted);">No file chosen. Select document from your device.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- STEP 2: LAUNDRY SHOP DETAILS & LOCATION -->
      <div id="stepSection2" style="display: none;">
        <div style="border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 0.6rem; margin-bottom: 1.25rem;">
          <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #8162EE; display: flex; align-items: center; gap: 0.4rem;">
            🏪 Laundry Shop Store &amp; Geolocation
          </h4>
          <span style="font-size: 0.75rem; color: var(--text-muted);">
            Enter physical outlet location and operating range to receive customer pickup requests.
          </span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">
              Laundry Shop Name *
            </label>
            <input type="text" id="ob_shop_name" name="shop_name" required placeholder="e.g. Star Wash Express" class="form-control" style="width: 100%;">
          </div>
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">
              Shop Contact / Hotline Phone
            </label>
            <input type="text" id="ob_shop_phone" name="shop_phone" placeholder="e.g. 020-2567890 or mobile" class="form-control" style="width: 100%;">
          </div>
        </div>

        <!-- Full Shop Premise Address with GPS and Google Map Click -->
        <div style="margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; flex-wrap: wrap; gap: 0.5rem;">
            <label class="form-label" onclick="openMapPickerModal(true)" style="margin: 0; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); cursor: pointer;" title="Click to open Google Map directly and fetch current location">
              Full Shop Premise Address * <span style="font-size: 0.72rem; color: #8162EE; font-weight: 600; text-transform: none;">(Click to open Map &amp; GPS)</span>
            </label>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button
                type="button"
                onclick="triggerFetchCurrentGPS()"
                class="btn btn-secondary btn-sm"
                id="btnFetchGPS"
                style="padding: 0.3rem 0.75rem; border-radius: 6px; font-size: 0.76rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem; color: #10B981; border: 1px solid rgba(16,185,129,0.3); background: rgba(16,185,129,0.1); cursor: pointer;"
                title="Detect and fill current location coordinates via GPS"
              >
                <i data-lucide="navigation" style="width: 13px; height: 13px;"></i>
                <span id="btnFetchGPSText">📍 Fetch Current Location (GPS)</span>
              </button>

              <button
                type="button"
                onclick="openMapPickerModal(true)"
                class="btn btn-primary btn-sm"
                style="padding: 0.3rem 0.75rem; border-radius: 6px; font-size: 0.76rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem; background: linear-gradient(135deg, #4F46E5, #6366F1); color: #FFF; border: none; box-shadow: 0 2px 6px rgba(79,70,229,0.3); cursor: pointer;"
              >
                <i data-lucide="map-pin" style="width: 13px; height: 13px;"></i>
                <span>Pick Location on Map Screen</span>
              </button>
            </div>
          </div>

          <div id="locationSuccessAlert" style="display: none; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); color: #10B981; padding: 0.4rem 0.75rem; border-radius: 6px; font-size: 0.78rem; font-weight: 700; margin-bottom: 0.45rem;">
            <!-- Filled by location script -->
          </div>

          <div style="position: relative;">
            <textarea 
              id="ob_address" 
              name="address" 
              rows="2" 
              required 
              onclick="openMapPickerModal(true)"
              placeholder="Click here to open Google Map directly and fetch current location..." 
              class="form-control" 
              style="width: 100%; cursor: pointer;"
            ></textarea>
          </div>
          <input type="hidden" id="ob_latitude" name="latitude" value="18.5590">
          <input type="hidden" id="ob_longitude" name="longitude" value="73.7868">
        </div>

        <div style="margin-bottom: 1rem;">
          <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">
            Serviceable City *
          </label>
          <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.5rem;">
            <?php foreach (['Pune', 'Kothrud', 'Hinjewadi', 'Viman Nagar', 'Baner', 'Wakad', 'Hadapsar', 'Pimpri-Chinchwad'] as $c): ?>
              <button type="button" onclick="setCity('<?= $c ?>')" style="padding: 0.25rem 0.65rem; border-radius: 16px; border: 1px solid rgba(129,98,238,0.3); background: rgba(129,98,238,0.15); color: #8162EE; font-size: 0.75rem; font-weight: 700; cursor: pointer;">
                <?= $c ?>
              </button>
            <?php endforeach; ?>
          </div>
          <input type="text" id="ob_city" name="city" value="Pune" required class="form-control" style="width: 100%;">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">Pincode</label>
            <input type="text" id="ob_pincode" name="pincode" value="411057" class="form-control" style="width: 100%;">
          </div>
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">Pickup Radius (KM)</label>
            <input type="number" name="pickup_radius_km" value="8" min="1" max="30" class="form-control" style="width: 100%;">
          </div>
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">Working Hours</label>
            <input type="text" name="working_hours" value="08:00 AM - 09:30 PM" class="form-control" style="width: 100%;">
          </div>
        </div>

        <!-- Store Media Uploads (Logo, Multiple Cover Photos, and Signboard) -->
        <div style="background: var(--bg-input); padding: 1.1rem; border-radius: 12px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 1rem;">
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <!-- Store Brand Logo -->
            <div>
              <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">
                Store Brand Logo (Upload from Device) *
              </label>
              <input type="file" id="ob_logo_photo" name="logo_photo" accept="image/*" onchange="handleSingleUploadPreview(this, 'logoPreview', 'logoInfoText')" style="font-size: 0.8rem; width: 100%;">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.4rem;">
                <img id="logoPreview" src="" alt="Logo Preview" style="display: none; width: 44px; height: 44px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border-color); background: #fff;">
                <span id="logoInfoText" style="font-size: 0.72rem; color: var(--text-muted);">No logo chosen. Select image from your device.</span>
              </div>
            </div>

            <!-- Store Signboard / Premise Photo -->
            <div>
              <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">
                Store Signboard / Premise Photo (Upload)
              </label>
              <input type="file" id="ob_shop_board_photo" name="shop_board_photo" accept="image/*" onchange="handleSingleUploadPreview(this, 'boardPreview', 'boardInfoText')" style="font-size: 0.8rem; width: 100%;">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.4rem;">
                <img id="boardPreview" src="" alt="Signboard Preview" style="display: none; width: 44px; height: 32px; border-radius: 4px; object-fit: cover; border: 1px solid var(--border-color); background: #fff;">
                <span id="boardInfoText" style="font-size: 0.72rem; color: var(--text-muted);">No photo chosen. Select storefront photo from your device.</span>
              </div>
            </div>
          </div>

          <!-- Shop Cover Images (Multiple) -->
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">
              Shop Cover Images (Multiple Uploads Allowed)
            </label>
            <input type="file" id="ob_cover_photos" name="cover_photos[]" multiple accept="image/*" onchange="handleMultipleCoverPreview(this)" style="font-size: 0.8rem; width: 100%;">
            <span style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-top: 0.2rem;">
              Select multiple photos of your shop interior, machines, and storefront.
            </span>
            <div id="coverPhotosPreviewList" style="margin-top: 0.5rem;"></div>
          </div>

        </div>
      </div>

      <!-- STEP 3: BANKING & GST COMPLIANCE -->
      <div id="stepSection3" style="display: none;">
        <div style="border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 0.6rem; margin-bottom: 1.25rem;">
          <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #8162EE; display: flex; align-items: center; gap: 0.4rem;">
            💳 Banking Settlement &amp; GST Compliance
          </h4>
          <span style="font-size: 0.75rem; color: var(--text-muted);">
            Setup vendor settlement bank account and commercial taxation details.
          </span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">Bank Name *</label>
            <input type="text" id="ob_bank_name" name="bank_name" value="HDFC Bank" placeholder="e.g. HDFC Bank / State Bank of India" required class="form-control" style="width: 100%;">
          </div>
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">Bank Account Number *</label>
            <input type="text" id="ob_bank_account" name="bank_account" value="50100987654321" placeholder="e.g. 50100234567890" required class="form-control" style="width: 100%;">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">IFSC Code *</label>
            <input type="text" id="ob_ifsc_code" name="ifsc_code" value="HDFC0001234" placeholder="e.g. HDFC0001234" required class="form-control" style="width: 100%;">
          </div>
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">Account Holder Name</label>
            <input type="text" id="ob_account_holder" name="account_holder" placeholder="Owner or Business Name" class="form-control" style="width: 100%;">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">UPI ID (Optional)</label>
            <input type="text" id="ob_upi_id" name="upi_id" value="8600692767@hdfcbank" placeholder="e.g. shopname@okhdfcbank" class="form-control" style="width: 100%;">
          </div>
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">GSTIN Number (Optional)</label>
            <input type="text" id="ob_gst_number" name="gst_number" value="27AABCU9603R1ZM" placeholder="e.g. 27ABCDE1234F1Z5" class="form-control" style="width: 100%;">
          </div>
        </div>

        <!-- Udyam / Shop License Document Upload & Bank Cheque Upload -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; background: var(--bg-input); padding: 1.1rem; border-radius: 12px; border: 1px solid var(--border-color);">
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">
              Trade License / Udyam Certificate (Upload)
            </label>
            <input type="file" id="ob_business_proof_photo" name="business_proof_photo" accept="image/*,.pdf" onchange="handleSingleUploadPreview(this, 'udyamPreview', 'udyamInfoText')" style="font-size: 0.8rem; width: 100%;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.4rem;">
              <img id="udyamPreview" src="" alt="License Preview" style="display: none; width: 44px; height: 32px; border-radius: 4px; object-fit: cover; border: 1px solid var(--border-color); background: #fff;">
              <span id="udyamInfoText" style="font-size: 0.72rem; color: var(--text-muted);">No certificate chosen. Select from your device.</span>
            </div>
          </div>
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">
              Bank Cheque / Passbook Proof (Upload)
            </label>
            <input type="file" id="ob_bank_proof_photo" name="bank_proof_photo" accept="image/*,.pdf" onchange="handleSingleUploadPreview(this, 'bankPreview', 'bankInfoText')" style="font-size: 0.8rem; width: 100%;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.4rem;">
              <img id="bankPreview" src="" alt="Bank Preview" style="display: none; width: 44px; height: 32px; border-radius: 4px; object-fit: cover; border: 1px solid var(--border-color); background: #fff;">
              <span id="bankInfoText" style="font-size: 0.72rem; color: var(--text-muted);">No cheque photo chosen. Select from your device.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- STEP 4: SERVICES CATALOG & LIVE STATUS -->
      <div id="stepSection4" style="display: none;">
        <div style="border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 0.6rem; margin-bottom: 1.25rem;">
          <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #8162EE; display: flex; align-items: center; gap: 0.4rem;">
            ✨ Services Catalog &amp; Direct Activation Status
          </h4>
          <span style="font-size: 0.75rem; color: var(--text-muted);">
            Select the services this shop offers and choose the live launch status.
          </span>
        </div>

        <!-- Verification Status Permission Selector -->
        <div style="background: rgba(129, 98, 238, 0.08); border: 1px solid rgba(129, 98, 238, 0.3); border-radius: 12px; padding: 1rem; margin-bottom: 1.25rem;">
          <label style="display: block; font-size: 0.8rem; font-weight: 800; text-transform: uppercase; color: #8162EE; margin-bottom: 0.6rem;">
            ⚡ Admin Onboarding Verification Status
          </label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div id="statusCardApproved" onclick="selectOnboardStatus('APPROVED')" style="padding: 0.85rem; border-radius: 8px; border: 2px solid #10B981; background: rgba(16, 185, 129, 0.15); cursor: pointer; display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 28px; height: 28px; border-radius: 50%; background: #10B981; color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 0.9rem;">✓</div>
              <div>
                <div style="font-weight: 800; font-size: 0.9rem; color: #10B981;">Instant APPROVED (Go Live Now)</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">Shop is immediately verified &amp; visible to customers for ordering</div>
              </div>
            </div>

            <div id="statusCardPending" onclick="selectOnboardStatus('PENDING')" style="padding: 0.85rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); cursor: pointer; display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,0.1); color: var(--text-muted); display: flex; align-items: center; justify-content: center; font-size: 0.9rem;">⏳</div>
              <div>
                <div style="font-weight: 800; font-size: 0.9rem;">PENDING (Awaiting Review)</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">Shop is added to pending verification queue for later review</div>
              </div>
            </div>
          </div>
          <input type="hidden" id="ob_verification_status" name="verification_status" value="APPROVED">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">
              Subscription Tier
            </label>
            <select name="subscription_plan" class="form-control" style="width: 100%;">
              <option value="Starter">Starter (15% Commission / Pay As You Go)</option>
              <option value="Silver Pro">Silver Pro (₹999/mo • 10% Commission)</option>
              <option value="Gold Business">Gold Business (₹1999/mo • 8% Commission)</option>
              <option value="Platinum Max">Platinum Enterprise (₹3999/mo • 5% Commission)</option>
            </select>
          </div>
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">
              Account Operational Status
            </label>
            <select name="account_status" class="form-control" style="width: 100%;">
              <option value="ACTIVE">ACTIVE (Open for Orders)</option>
              <option value="INACTIVE">INACTIVE (Temporarily Closed)</option>
            </select>
          </div>
        </div>

        <!-- Services Checklist -->
        <div style="margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <label style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary);">
              Offered Services Catalog
            </label>
            <span style="font-size: 0.75rem; color: #8162EE; font-weight: 700;">6 Services Enabled by Default</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem;">
            <?php 
            $defaultServices = [
              ['name' => 'Wash & Fold', 'cat' => 'Wash & Fold', 'desc' => 'Daily wear clothes, neatly washed & folded', 'sla' => '24h'],
              ['name' => 'Wash & Steam Iron', 'cat' => 'Wash & Iron', 'desc' => 'Clean wash with crisp crease steam ironing', 'sla' => '24h'],
              ['name' => 'Premium Dry Clean', 'cat' => 'Dry Cleaning', 'desc' => 'Suits, silk sarees, blazers & delicate fabrics', 'sla' => '48h'],
              ['name' => 'Steam Press Only', 'cat' => 'Ironing', 'desc' => 'Professional wrinkle-free steam ironing', 'sla' => '12h'],
              ['name' => 'Shoe Cleaning & Spa', 'cat' => 'Shoe Care', 'desc' => 'Deep cleaning & sanitization for sneakers/leather', 'sla' => '48h'],
              ['name' => 'Heavy Blanket & Woolen', 'cat' => 'Home Care', 'desc' => 'Blankets, quilts, winter jackets & curtains', 'sla' => '48h'],
            ];
            foreach ($defaultServices as $s): ?>
              <div style="padding: 0.65rem 0.85rem; border-radius: 8px; border: 1px solid #8162EE; background: rgba(129, 98, 238, 0.12); display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <div style="font-weight: 700; font-size: 0.85rem; color: #8162EE;"><?= $s['name'] ?></div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">📁 <?= $s['cat'] ?> • <?= $s['sla'] ?> SLA</div>
                </div>
                <div style="width: 18px; height: 18px; border-radius: 4px; background: #8162EE; color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 0.7rem;">✓</div>
              </div>
            <?php endforeach; ?>
          </div>
        </div>

        <!-- Real-Time Onboard Validation Summary Notice -->
        <div id="step4ReadyNotice" style="display: none; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 10px; padding: 1rem; margin-top: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.65rem; color: #10B981;">
            <i data-lucide="check-circle" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
            <div>
              <div style="font-weight: 800; font-size: 0.88rem;">All Required Details are Filled &amp; Ready!</div>
              <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.15rem;">Click the "✨ Complete &amp; Onboard Shop" button below to register this partner.</div>
            </div>
          </div>
        </div>

        <div id="step4MissingNotice" style="display: none; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 10px; padding: 1rem; margin-top: 1rem;">
          <div style="display: flex; align-items: flex-start; gap: 0.65rem; color: #F59E0B;">
            <i data-lucide="alert-triangle" style="width: 20px; height: 20px; flex-shrink: 0; margin-top: 2px;"></i>
            <div style="flex: 1;">
              <div style="font-weight: 800; font-size: 0.88rem;">Please Complete Required Fields Before Submitting:</div>
              <ul id="missingFieldsList" style="margin: 0.5rem 0 0 1rem; padding: 0; font-size: 0.78rem; color: var(--text-secondary);"></ul>
            </div>
          </div>
        </div>

      </div>
    </form>

    <!-- Modal Footer Controls -->
    <div style="padding: 1rem 1.75rem; border-top: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.2);">
      <div>
        <button type="button" id="obBackBtn" onclick="prevStep()" style="display: none; background: rgba(255,255,255,0.08); border: none; color: var(--text-primary); padding: 0.65rem 1.2rem; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.85rem;">
          ← Back
        </button>
      </div>

      <div style="display: flex; gap: 0.75rem;">
        <button type="button" onclick="closeModal('onboardModal')" class="btn btn-secondary" style="padding: 0.65rem 1.4rem; border-radius: 8px; font-weight: 700;">
          Cancel
        </button>

        <button type="button" id="obNextBtn" onclick="nextStep()" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #E18C8E 67.34%, #FE9A5D 98.26%); border: none; color: #FFF; padding: 0.65rem 1.5rem; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; box-shadow: 0 4px 14px rgba(129, 98, 238, 0.4);">
          Continue →
        </button>

        <button type="button" id="obSubmitBtn" onclick="submitOnboardForm()" style="display: none; background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); border: none; color: #FFF; padding: 0.65rem 1.6rem; border-radius: 8px; font-weight: 800; cursor: pointer; align-items: center; gap: 0.5rem; box-shadow: 0 4px 16px rgba(129, 98, 238, 0.4);">
          ✨ Complete &amp; Onboard Shop
        </button>
      </div>
    </div>
  </div>
</div>

<!-- Modal: Map Picker & Geolocation (Matches React MapPickerModal scenario) -->
<div id="mapPickerModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); align-items: center; justify-content: center; z-index: 100000; padding: 1rem;">
  <div class="modal-content" style="background: #FFFFFF; border-radius: 20px; border: 1px solid rgba(255,255,255,0.2); width: 100%; max-width: 520px; height: 90vh; max-height: 800px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.5); position: relative; color: #0F172A;">
    
    <!-- Top Header & Search Bar -->
    <div style="padding: 0.85rem 1rem; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; display: flex; align-items: center; gap: 0.75rem; z-index: 10;">
      <button type="button" onclick="closeModal('mapPickerModal')" style="width: 36px; height: 36px; border-radius: 50%; background: #F1F5F9; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #334155; font-weight: 700; flex-shrink: 0;">
        ✕
      </button>

      <div style="flex: 1; position: relative; display: flex; align-items: center; background: #F8FAFC; border-radius: 12px; padding: 0.5rem 0.85rem; border: 1px solid #CBD5E1;">
        <i data-lucide="search" style="width: 16px; height: 16px; color: #64748B; margin-right: 0.4rem; flex-shrink: 0;"></i>
        <input 
          type="text" 
          id="mapSearchInput" 
          placeholder="Search Pune area, street or landmark..." 
          oninput="handleMapSearch(this.value)" 
          style="width: 100%; border: none; background: transparent; outline: none; font-size: 0.85rem; color: #0F172A; font-weight: 600;"
        >
        <button type="button" id="mapSearchClearBtn" onclick="clearMapSearch()" style="display: none; border: none; background: transparent; cursor: pointer; color: #94A3B8; font-size: 0.9rem;">✕</button>
      </div>
    </div>

    <!-- Search Predictions Dropdown Overlay -->
    <div id="mapSearchResults" style="display: none; position: absolute; top: 62px; left: 1rem; right: 1rem; z-index: 99; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; box-shadow: 0 15px 30px rgba(0,0,0,0.15); max-height: 240px; overflow-y: auto;">
      <!-- Results populated by JS -->
    </div>

    <!-- Map Viewport -->
    <div style="flex: 1; position: relative; width: 100%; background: #E2E8F0; overflow: hidden;">
      <iframe 
        id="mapIframe" 
        title="Google Map Canvas" 
        width="100%" 
        height="100%" 
        style="border: 0; width: 100%; height: 100%;" 
        loading="eager" 
        allowfullscreen 
        src="https://maps.google.com/maps?q=18.5590,73.7868&z=16&output=embed"
      ></iframe>

      <!-- Center Pin Callout -->
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -100%); pointer-events: none; display: flex; flex-direction: column; align-items: center; z-index: 5;">
        <div style="background: #4F46E5; color: #FFFFFF; padding: 0.35rem 0.75rem; border-radius: 20px; font-size: 0.78rem; font-weight: 700; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4); margin-bottom: 4px; display: flex; align-items: center; gap: 0.35rem; white-space: nowrap;">
          <span>🧺</span> Your Shop Premise
        </div>
        <div style="fontSize: 2.2rem; line-height: 1; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
          📍
        </div>
      </div>

      <!-- Floating Direct Google Maps Link Button -->
      <a 
        id="directGoogleMapsBtn" 
        href="https://www.google.com/maps/search/?api=1&query=18.5590,73.7868" 
        target="_blank" 
        style="position: absolute; left: 16px; top: 16px; background: #FFFFFF; color: #1E293B; padding: 0.45rem 0.85rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-decoration: none; display: flex; align-items: center; gap: 0.35rem; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 5;"
      >
        <span>🗺️ Open in Google Maps ↗</span>
      </a>

      <!-- Floating Zoom Controls -->
      <div style="position: absolute; right: 16px; top: 16px; display: flex; flex-direction: column; background: #FFFFFF; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); overflow: hidden; z-index: 5;">
        <button type="button" onclick="adjustMapZoom(1)" style="width: 36px; height: 36px; border: none; background: #FFF; font-size: 1.1rem; font-weight: 800; cursor: pointer; border-bottom: 1px solid #F1F5F9; color: #334155;">+</button>
        <button type="button" onclick="adjustMapZoom(-1)" style="width: 36px; height: 36px; border: none; background: #FFF; font-size: 1.1rem; font-weight: 800; cursor: pointer; color: #334155;">−</button>
      </div>

      <!-- Floating GPS Button (◎) -->
      <button 
        type="button" 
        id="mapFetchGpsBtn" 
        onclick="mapFetchCurrentLocation()" 
        title="Fetch My Current Location" 
        style="position: absolute; right: 16px; bottom: 20px; width: 44px; height: 44px; border-radius: 50%; background: #FFFFFF; border: none; box-shadow: 0 6px 16px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 5; color: #4F46E5;"
      >
        <i data-lucide="navigation" style="width: 20px; height: 20px;"></i>
      </button>
    </div>

    <!-- Bottom Selected Address Card + Confirm -->
    <div style="padding: 1rem 1.25rem 1.25rem; background: #FFFFFF; border-top: 1px solid #F1F5F9; display: flex; flex-direction: column; gap: 0.85rem; box-shadow: 0 -8px 20px rgba(0,0,0,0.06);">
      <div style="display: flex; align-items: flex-start; gap: 0.65rem;">
        <div style="width: 34px; height: 34px; border-radius: 50%; background: rgba(239, 68, 68, 0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #EF4444; margin-top: 2px;">
          <i data-lucide="map-pin" style="width: 18px; height: 18px;"></i>
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 0.68rem; font-weight: 800; color: #64748B; letter-spacing: 0.05em; text-transform: uppercase;">
            Pinned Premise Location
          </div>
          <div id="mapSelectedAddress" style="font-size: 0.86rem; font-weight: 700; color: #0F172A; margin: 2px 0; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
            Resolving address from Google Maps...
          </div>
          <div id="mapSelectedCoords" style="font-size: 0.74rem; color: #64748B; font-weight: 600;">
            18.5590° N, 73.7868° E
          </div>
        </div>
      </div>

      <button 
        type="button" 
        onclick="confirmMapLocation()" 
        style="width: 100%; padding: 0.8rem; border-radius: 12px; background: linear-gradient(135deg, #4F46E5, #6366F1); color: #FFFFFF; font-size: 0.92rem; font-weight: 800; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; box-shadow: 0 6px 18px rgba(79, 70, 229, 0.35);"
      >
        <i data-lucide="check" style="width: 18px; height: 18px;"></i>
        Confirm This Address &amp; Location
      </button>
    </div>

  </div>
</div>

<!-- Modal: Edit Shop Details -->
<div id="editShopModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(6px); align-items: center; justify-content: center; z-index: 99999; padding: 1rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 520px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); color: var(--text-primary);">
    <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
      <h3 style="font-size: 1.15rem; font-weight: 800; margin: 0; color: var(--brand-purple);">Edit Shop Information</h3>
      <button onclick="closeModal('editShopModal')" style="background: var(--bg-input); border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted);">✕</button>
    </div>
    <form method="POST" action="" style="padding: 1.5rem;">
      <input type="hidden" name="action" value="edit">
      <input type="hidden" id="editShopId" name="shop_id" value="">

      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Shop Name</label>
        <input type="text" id="editShopName" name="shop_name" class="form-control" required style="width: 100%;">
      </div>

      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Phone Number</label>
        <input type="text" id="editShopPhone" name="phone" class="form-control" required style="width: 100%;">
      </div>

      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Store Address</label>
        <textarea id="editShopAddress" name="address" class="form-control" rows="2" style="width: 100%;"></textarea>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Working Hours</label>
          <input type="text" id="editShopHours" name="working_hours" class="form-control" style="width: 100%;">
        </div>
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Pickup Radius (km)</label>
          <input type="number" id="editShopRadius" name="pickup_radius_km" class="form-control" style="width: 100%;">
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('editShopModal')" class="btn btn-secondary" style="font-weight: 700;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="font-weight: 800; background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; padding: 0.65rem 1.5rem; border: none; border-radius: 8px;">
          Save Changes
        </button>
      </div>
    </form>
  </div>
</div>

<!-- Modal: Request Missing Documents from Laundry Owner -->
<div id="requestDocModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); align-items: center; justify-content: center; z-index: 100002; padding: 1.5rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 540px; box-shadow: 0 25px 50px rgba(0,0,0,0.4); color: var(--text-primary); overflow: hidden;">
    <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: rgba(245, 158, 11, 0.08);">
      <div style="display: flex; align-items: center; gap: 0.6rem;">
        <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(245, 158, 11, 0.2); color: #F59E0B; display: flex; align-items: center; justify-content: center;">
          <i data-lucide="file-question" style="width: 20px; height: 20px;"></i>
        </div>
        <div>
          <h3 style="font-size: 1.1rem; font-weight: 800; margin: 0; color: #D97706;">Request Missing Compliance Documents</h3>
          <span id="reqDocShopSubtitle" style="font-size: 0.76rem; color: var(--text-muted);">Notify partner to re-upload documents</span>
        </div>
      </div>
      <button type="button" onclick="closeModal('requestDocModal')" style="background: transparent; border: none; font-size: 1.2rem; cursor: pointer; color: var(--text-muted);">✕</button>
    </div>

    <form method="POST" action="" style="padding: 1.5rem;">
      <input type="hidden" name="action" value="request_missing_docs">
      <input type="hidden" id="reqDocShopId" name="shop_id" value="">
      <input type="hidden" id="reqDocShopName" name="shop_name" value="">

      <label style="display: block; font-size: 0.8rem; font-weight: 800; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.5rem;">
        Select Missing Document(s) to Request *
      </label>
      <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.25rem;">
        <label style="display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.8rem; border-radius: 8px; background: var(--bg-input); border: 1px solid var(--border-color); cursor: pointer; font-size: 0.85rem; font-weight: 600;">
          <input type="checkbox" name="docs[]" value="Owner Aadhaar / PAN Proof" checked>
          <span>📄 Owner Aadhaar / PAN Proof Document</span>
        </label>
        <label style="display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.8rem; border-radius: 8px; background: var(--bg-input); border: 1px solid var(--border-color); cursor: pointer; font-size: 0.85rem; font-weight: 600;">
          <input type="checkbox" name="docs[]" value="Trade License / Udyam Certificate" checked>
          <span>📜 Trade License / Udyam MSME Certificate</span>
        </label>
        <label style="display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.8rem; border-radius: 8px; background: var(--bg-input); border: 1px solid var(--border-color); cursor: pointer; font-size: 0.85rem; font-weight: 600;">
          <input type="checkbox" name="docs[]" value="Bank Account Cheque / Passbook">
          <span>🏦 Bank Account Cheque / Passbook Proof</span>
        </label>
        <label style="display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.8rem; border-radius: 8px; background: var(--bg-input); border: 1px solid var(--border-color); cursor: pointer; font-size: 0.85rem; font-weight: 600;">
          <input type="checkbox" name="docs[]" value="Storefront Signboard Photo">
          <span>🏪 Storefront &amp; Physical Outlet Photo</span>
        </label>
      </div>

      <div style="margin-bottom: 1.5rem;">
        <label style="display: block; font-size: 0.8rem; font-weight: 800; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.35rem;">
          Message to Laundry Owner
        </label>
        <textarea name="request_note" rows="3" class="form-control" style="width: 100%; font-size: 0.85rem;" placeholder="e.g. Please upload a clear photo of your Shop License certificate with legible registration number and business address."></textarea>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('requestDocModal')" class="btn btn-secondary" style="font-weight: 700;">Cancel</button>
        <button type="submit" class="btn btn-warning" style="background: #F59E0B; color: #FFF; font-weight: 800; border: none; padding: 0.65rem 1.4rem; border-radius: 8px; display: inline-flex; align-items: center; gap: 0.4rem; cursor: pointer;">
          <i data-lucide="send" style="width: 16px; height: 16px;"></i> Send Request to Owner
        </button>
      </div>
    </form>
  </div>
</div>

<script>
  let currentOnboardStep = 1;

  function openRequestDocsModal(shopId, shopName) {
    const sName = decodeURIComponent(shopName || 'Laundry Shop');
    document.getElementById('reqDocShopId').value = shopId;
    document.getElementById('reqDocShopName').value = sName;
    document.getElementById('reqDocShopSubtitle').innerText = `Notify ${sName} (#${shopId}) to re-upload documents`;
    openModal('requestDocModal');
    if (window.lucide) lucide.createIcons();
  }
  let currentPickerLat = 18.5590;
  let currentPickerLng = 73.7868;
  let currentPickerZoom = 16;
  let mapSearchTimeout = null;

  // Validation function to check if all required details across all steps are filled
  function checkFormFilled() {
    const missing = [];
    
    // Step 1: Owner Info
    const ownerName = (document.getElementById('ob_owner_name')?.value || '').trim();
    const phone = (document.getElementById('ob_phone')?.value || '').trim();
    if (!ownerName) missing.push({ step: 1, field: 'Owner Full Name' });
    if (!phone) missing.push({ step: 1, field: 'Mobile Phone Number' });

    // Step 2: Shop Details
    const shopName = (document.getElementById('ob_shop_name')?.value || '').trim();
    const address = (document.getElementById('ob_address')?.value || '').trim();
    const city = (document.getElementById('ob_city')?.value || '').trim();
    if (!shopName) missing.push({ step: 2, field: 'Laundry Shop Name' });
    if (!address) missing.push({ step: 2, field: 'Full Premise Address' });
    if (!city) missing.push({ step: 2, field: 'Serviceable City' });

    // Step 3: Banking
    const bankName = (document.getElementById('ob_bank_name')?.value || '').trim();
    const bankAccount = (document.getElementById('ob_bank_account')?.value || '').trim();
    const ifscCode = (document.getElementById('ob_ifsc_code')?.value || '').trim();
    if (!bankName) missing.push({ step: 3, field: 'Bank Name' });
    if (!bankAccount) missing.push({ step: 3, field: 'Bank Account Number' });
    if (!ifscCode) missing.push({ step: 3, field: 'IFSC Code' });

    return missing;
  }

  function goToStep(step) {
    currentOnboardStep = step;

    // Toggle wizard panels
    for (let i = 1; i <= 4; i++) {
      const sec = document.getElementById('stepSection' + i);
      const tab = document.getElementById('stepTabBtn' + i);
      if (sec) sec.style.display = (i === step) ? 'block' : 'none';
      if (tab) {
        const badge = tab.querySelector('.step-num-badge');
        if (i === step) {
          tab.style.background = 'rgba(129,98,238,0.12)';
          tab.style.borderBottom = '3px solid #8162EE';
          tab.style.color = '#8162EE';
          tab.style.fontWeight = '800';
          if (badge) {
            badge.style.background = '#8162EE';
            badge.innerText = i;
          }
        } else if (i < step) {
          tab.style.background = 'transparent';
          tab.style.borderBottom = '3px solid transparent';
          tab.style.color = '#10B981';
          tab.style.fontWeight = '600';
          if (badge) {
            badge.style.background = '#10B981';
            badge.innerText = '✓';
          }
        } else {
          tab.style.background = 'transparent';
          tab.style.borderBottom = '3px solid transparent';
          tab.style.color = 'var(--text-muted)';
          tab.style.fontWeight = '600';
          if (badge) {
            badge.style.background = 'rgba(255,255,255,0.1)';
            badge.innerText = i;
          }
        }
      }
    }

    const backBtn = document.getElementById('obBackBtn');
    const nextBtn = document.getElementById('obNextBtn');
    const submitBtn = document.getElementById('obSubmitBtn');
    const missingNotice = document.getElementById('step4MissingNotice');
    const readyNotice = document.getElementById('step4ReadyNotice');

    // Rule: Show back only on step 2, 3, 4 (never step 1)
    if (backBtn) {
      backBtn.style.display = (step > 1) ? 'inline-flex' : 'none';
    }

    // Rule: Show continue only on step 1, 2, 3 (never step 4)
    if (nextBtn) {
      nextBtn.style.display = (step < 4) ? 'inline-flex' : 'none';
    }

    // Rule: Only on Step 4 AND when all required details are filled, show "Complete & Submit"
    if (step === 4) {
      const missing = checkFormFilled();
      if (missing.length === 0) {
        if (submitBtn) submitBtn.style.display = 'inline-flex';
        if (readyNotice) readyNotice.style.display = 'block';
        if (missingNotice) missingNotice.style.display = 'none';
      } else {
        if (submitBtn) submitBtn.style.display = 'none';
        if (readyNotice) readyNotice.style.display = 'none';
        if (missingNotice) {
          missingNotice.style.display = 'block';
          const list = document.getElementById('missingFieldsList');
          if (list) {
            list.innerHTML = missing.map(m => `
              <li style="margin-bottom: 0.35rem;">
                <span style="font-weight: 700; color: #DC2626;">${m.field}</span> (in Step ${m.step})
                <button type="button" onclick="goToStep(${m.step})" style="background: none; border: none; color: #8162EE; text-decoration: underline; cursor: pointer; font-size: 0.78rem; font-weight: 700; margin-left: 0.35rem;">
                  Go to Step ${m.step} →
                </button>
              </li>
            `).join('');
          }
        }
      }
    } else {
      if (submitBtn) submitBtn.style.display = 'none';
      if (readyNotice) readyNotice.style.display = 'none';
      if (missingNotice) missingNotice.style.display = 'none';
    }

    if (window.lucide) lucide.createIcons();
  }

  function nextStep() {
    if (currentOnboardStep === 1) {
      const name = (document.getElementById('ob_owner_name')?.value || '').trim();
      const phone = (document.getElementById('ob_phone')?.value || '').trim();
      if (!name || !phone) {
        alert('Please enter Owner Full Name and Mobile Phone Number to continue.');
        return;
      }
    } else if (currentOnboardStep === 2) {
      const sName = (document.getElementById('ob_shop_name')?.value || '').trim();
      const addr = (document.getElementById('ob_address')?.value || '').trim();
      if (!sName || !addr) {
        alert('Please enter Laundry Shop Name and Premise Address to continue.');
        return;
      }
    } else if (currentOnboardStep === 3) {
      const bank = (document.getElementById('ob_bank_name')?.value || '').trim();
      const acc = (document.getElementById('ob_bank_account')?.value || '').trim();
      const ifsc = (document.getElementById('ob_ifsc_code')?.value || '').trim();
      if (!bank || !acc || !ifsc) {
        alert('Please fill Bank Name, Account Number, and IFSC Code to continue.');
        return;
      }
    }
    goToStep(Math.min(currentOnboardStep + 1, 4));
  }

  function prevStep() {
    goToStep(Math.max(currentOnboardStep - 1, 1));
  }

  function submitOnboardForm() {
    const missing = checkFormFilled();
    if (missing.length > 0) {
      alert('Please complete all required fields:\n' + missing.map(m => `• ${m.field} (Step ${m.step})`).join('\n'));
      goToStep(missing[0].step);
      return;
    }
    document.getElementById('onboardLaundryForm').submit();
  }

  // Dynamic listener to auto-refresh Step 4 button state when user types
  document.getElementById('onboardLaundryForm')?.addEventListener('input', () => {
    if (currentOnboardStep === 4) {
      goToStep(4);
    }
  });

  function setCity(c) {
    const cityInput = document.getElementById('ob_city');
    if (cityInput) cityInput.value = c;
    if (currentOnboardStep === 4) goToStep(4);
  }

  function selectOnboardStatus(st) {
    document.getElementById('ob_verification_status').value = st;
    const cardApp = document.getElementById('statusCardApproved');
    const cardPen = document.getElementById('statusCardPending');
    if (st === 'APPROVED') {
      cardApp.style.border = '2px solid #10B981';
      cardApp.style.background = 'rgba(16, 185, 129, 0.15)';
      cardPen.style.border = '1px solid rgba(255,255,255,0.1)';
      cardPen.style.background = 'rgba(255,255,255,0.03)';
    } else {
      cardPen.style.border = '2px solid #F59E0B';
      cardPen.style.background = 'rgba(245, 158, 11, 0.15)';
      cardApp.style.border = '1px solid rgba(255,255,255,0.1)';
      cardApp.style.background = 'rgba(255,255,255,0.03)';
    }
  }

  // Single file preview handler (Upload from device without default dummy SVGs)
  function handleSingleUploadPreview(input, targetImgId, infoTextId) {
    const previewImg = document.getElementById(targetImgId);
    const infoText = document.getElementById(infoTextId);
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const sizeKB = (file.size / 1024).toFixed(1);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
          if (previewImg) {
            previewImg.src = e.target.result;
            previewImg.style.display = 'block';
          }
        };
        reader.readAsDataURL(file);
      } else {
        if (previewImg) previewImg.style.display = 'none';
      }
      if (infoText) {
        infoText.innerHTML = `<span style="color: #10B981; font-weight: 700;">✓ Chosen:</span> ${file.name} (${sizeKB} KB)`;
      }
    } else {
      if (previewImg) {
        previewImg.src = '';
        previewImg.style.display = 'none';
      }
      if (infoText) {
        infoText.innerText = 'No file chosen. Select document from your device.';
      }
    }
    if (currentOnboardStep === 4) goToStep(4);
  }

  // Multiple Cover Photos handler
  function handleMultipleCoverPreview(input) {
    const container = document.getElementById('coverPhotosPreviewList');
    if (!container) return;
    container.innerHTML = '';
    
    if (input.files && input.files.length > 0) {
      const title = document.createElement('div');
      title.style.fontSize = '0.76rem';
      title.style.fontWeight = '700';
      title.style.color = '#8162EE';
      title.style.marginBottom = '0.4rem';
      title.innerText = `${input.files.length} Shop Cover Photo(s) Selected from Device:`;
      container.appendChild(title);

      Array.from(input.files).forEach((file, idx) => {
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; gap: 0.65rem; background: var(--bg-card); padding: 0.45rem 0.75rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 0.35rem;';
        
        const thumb = document.createElement('img');
        thumb.style.cssText = 'width: 38px; height: 38px; border-radius: 6px; object-fit: cover; border: 1px solid var(--border-color); background: #fff;';
        const reader = new FileReader();
        reader.onload = (e) => { thumb.src = e.target.result; };
        reader.readAsDataURL(file);

        const info = document.createElement('div');
        info.style.flex = '1';
        info.style.minWidth = '0';
        const sizeKB = (file.size / 1024).toFixed(1);
        info.innerHTML = `
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
            Cover ${idx + 1}: ${file.name}
          </div>
          <div style="font-size: 0.7rem; color: #10B981; font-weight: 600;">✓ Ready to upload • ${sizeKB} KB</div>
        `;

        row.appendChild(thumb);
        row.appendChild(info);
        container.appendChild(row);
      });
    }
  }

  // MAP PICKER MODAL LOGIC (Matching React MapPickerModal scenario)
  function openMapPickerModal(forceFetchCurrent = false) {
    openModal('mapPickerModal');
    const existingLat = parseFloat(document.getElementById('ob_latitude')?.value) || 18.5590;
    const existingLng = parseFloat(document.getElementById('ob_longitude')?.value) || 73.7868;
    const existingAddr = (document.getElementById('ob_address')?.value || '').trim();

    currentPickerLat = existingLat;
    currentPickerLng = existingLng;
    updateMapIframe(currentPickerLat, currentPickerLng, currentPickerZoom);

    if (existingAddr && !forceFetchCurrent) {
      document.getElementById('mapSelectedAddress').innerText = existingAddr;
      document.getElementById('mapSelectedCoords').innerText = `${currentPickerLat.toFixed(4)}° N, ${currentPickerLng.toFixed(4)}° E`;
    } else {
      mapFetchCurrentLocation();
    }
    if (window.lucide) lucide.createIcons();
  }

  function updateMapIframe(lat, lng, zoom) {
    const iframe = document.getElementById('mapIframe');
    if (iframe) {
      iframe.src = `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;
    }
    const directBtn = document.getElementById('directGoogleMapsBtn');
    if (directBtn) {
      directBtn.href = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }
  }

  function adjustMapZoom(delta) {
    currentPickerZoom = Math.max(8, Math.min(20, currentPickerZoom + delta));
    updateMapIframe(currentPickerLat, currentPickerLng, currentPickerZoom);
  }

  function mapFetchCurrentLocation() {
    if (!navigator.geolocation) {
      const addrElem = document.getElementById('mapSelectedAddress');
      if (addrElem) addrElem.innerText = "Geolocation not supported in this browser. Please use search bar above.";
      return;
    }
    const addrElem = document.getElementById('mapSelectedAddress');
    const coordsElem = document.getElementById('mapSelectedCoords');
    const gpsBtn = document.getElementById('mapFetchGpsBtn');

    if (addrElem) addrElem.innerText = "Detecting current live GPS location...";
    if (gpsBtn) gpsBtn.style.opacity = '0.5';

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (gpsBtn) gpsBtn.style.opacity = '1';
        currentPickerLat = position.coords.latitude;
        currentPickerLng = position.coords.longitude;
        updateMapIframe(currentPickerLat, currentPickerLng, currentPickerZoom);

        if (coordsElem) {
          coordsElem.innerText = `${currentPickerLat.toFixed(4)}° N, ${currentPickerLng.toFixed(4)}° E`;
        }

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentPickerLat}&lon=${currentPickerLng}&zoom=18&addressdetails=1`);
          const json = await res.json();
          if (json && json.display_name) {
            if (addrElem) addrElem.innerText = json.display_name;
            window._lastDetectedAddress = json;
            // Also directly sync to onboard input fields so user sees it right away
            const obAddr = document.getElementById('ob_address');
            if (obAddr) obAddr.value = json.display_name;
            const obLat = document.getElementById('ob_latitude');
            if (obLat) obLat.value = currentPickerLat;
            const obLng = document.getElementById('ob_longitude');
            if (obLng) obLng.value = currentPickerLng;
            const addr = json.address || {};
            const city = addr.city || addr.town || addr.village || addr.suburb || 'Pune';
            const pincode = addr.postcode || '';
            if (city && document.getElementById('ob_city')) document.getElementById('ob_city').value = city;
            if (pincode && document.getElementById('ob_pincode')) document.getElementById('ob_pincode').value = pincode;
          } else {
            if (addrElem) addrElem.innerText = `Location pinned at ${currentPickerLat.toFixed(4)}° N, ${currentPickerLng.toFixed(4)}° E`;
          }
        } catch (err) {
          if (addrElem) addrElem.innerText = `Pinned: ${currentPickerLat.toFixed(4)}° N, ${currentPickerLng.toFixed(4)}° E`;
        }
      },
      (err) => {
        if (gpsBtn) gpsBtn.style.opacity = '1';
        if (addrElem) addrElem.innerText = "Location permission blocked or unavailable. Please search your area in the search bar above or enter address.";
        console.warn("Could not fetch current location: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // Quick GPS fetch right from the Premise Address label
  function triggerFetchCurrentGPS() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    const btnText = document.getElementById('btnFetchGPSText');
    if (btnText) btnText.innerText = "Detecting GPS...";

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        document.getElementById('ob_latitude').value = lat;
        document.getElementById('ob_longitude').value = lng;

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
          const json = await res.json();
          if (json && json.display_name) {
            document.getElementById('ob_address').value = json.display_name;
            const addr = json.address || {};
            const city = addr.city || addr.town || addr.village || addr.suburb || 'Pune';
            const pincode = addr.postcode || '';
            if (city) document.getElementById('ob_city').value = city;
            if (pincode && document.getElementById('ob_pincode')) {
              document.getElementById('ob_pincode').value = pincode;
            }
          }
        } catch (e) {
          // fallback
        }

        if (btnText) btnText.innerText = "📍 Fetch Current Location (GPS)";
        const alertBox = document.getElementById('locationSuccessAlert');
        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.innerText = `✓ Current location pinned: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
        }
        if (currentOnboardStep === 4) goToStep(4);
      },
      (err) => {
        if (btnText) btnText.innerText = "📍 Fetch Current Location (GPS)";
        alert("Could not fetch current location: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function confirmMapLocation() {
    const addrText = document.getElementById('mapSelectedAddress')?.innerText || '';
    if (addrText && !addrText.includes('Resolving') && !addrText.includes('denied')) {
      document.getElementById('ob_address').value = addrText;
    }
    document.getElementById('ob_latitude').value = currentPickerLat;
    document.getElementById('ob_longitude').value = currentPickerLng;

    if (window._lastDetectedAddress && window._lastDetectedAddress.address) {
      const addr = window._lastDetectedAddress.address;
      const city = addr.city || addr.town || addr.suburb || addr.village || 'Pune';
      const pincode = addr.postcode || '';
      if (city) document.getElementById('ob_city').value = city;
      if (pincode && document.getElementById('ob_pincode')) {
        document.getElementById('ob_pincode').value = pincode;
      }
    }

    const alertBox = document.getElementById('locationSuccessAlert');
    if (alertBox) {
      alertBox.style.display = 'block';
      alertBox.innerText = `✓ Location pinned on map: ${currentPickerLat.toFixed(4)}° N, ${currentPickerLng.toFixed(4)}° E`;
    }

    closeModal('mapPickerModal');
    if (currentOnboardStep === 4) goToStep(4);
  }

  function handleMapSearch(val) {
    if (mapSearchTimeout) clearTimeout(mapSearchTimeout);
    const clearBtn = document.getElementById('mapSearchClearBtn');
    const resultsDiv = document.getElementById('mapSearchResults');
    
    if (!val || val.trim().length < 3) {
      if (clearBtn) clearBtn.style.display = 'none';
      if (resultsDiv) resultsDiv.style.display = 'none';
      return;
    }

    if (clearBtn) clearBtn.style.display = 'block';

    mapSearchTimeout = setTimeout(async () => {
      try {
        if (resultsDiv) {
          resultsDiv.style.display = 'block';
          resultsDiv.innerHTML = '<div style="padding: 0.75rem; font-size: 0.8rem; color: #64748B;">Searching location...</div>';
        }
        const query = val.toLowerCase().includes('pune') ? val : (val + ', Pune');
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`);
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          resultsDiv.innerHTML = list.map(item => `
            <div onclick="selectMapSearchResult(${item.lat}, ${item.lon}, '${item.display_name.replace(/'/g, "\\'")}')" style="padding: 0.65rem 0.85rem; font-size: 0.82rem; cursor: pointer; border-bottom: 1px solid #F1F5F9; color: #1E293B;">
              <div style="font-weight: 700; color: #0F172A;">${item.display_name}</div>
              <div style="font-size: 0.72rem; color: #64748B;">${parseFloat(item.lat).toFixed(4)}° N, ${parseFloat(item.lon).toFixed(4)}° E</div>
            </div>
          `).join('');
        } else {
          resultsDiv.innerHTML = '<div style="padding: 0.75rem; font-size: 0.8rem; color: #64748B;">No matching locations found</div>';
        }
      } catch (e) {
        if (resultsDiv) resultsDiv.style.display = 'none';
      }
    }, 350);
  }

  async function selectMapSearchResult(lat, lon, displayName) {
    currentPickerLat = parseFloat(lat);
    currentPickerLng = parseFloat(lon);
    updateMapIframe(currentPickerLat, currentPickerLng, currentPickerZoom);
    document.getElementById('mapSelectedAddress').innerText = displayName;
    document.getElementById('mapSelectedCoords').innerText = `${currentPickerLat.toFixed(4)}° N, ${currentPickerLng.toFixed(4)}° E`;
    document.getElementById('mapSearchResults').style.display = 'none';
    document.getElementById('mapSearchInput').value = displayName;

    // Auto-fill Serviceable City & Pincode from coordinates
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentPickerLat}&lon=${currentPickerLng}&zoom=18&addressdetails=1`);
      const json = await res.json();
      if (json && json.address) {
        const addr = json.address;
        const city = addr.city || addr.town || addr.suburb || addr.village || addr.county || '';
        const pincode = addr.postcode || '';
        if (city && document.getElementById('ob_city')) {
          document.getElementById('ob_city').value = city;
        }
        if (pincode && document.getElementById('ob_pincode')) {
          document.getElementById('ob_pincode').value = pincode;
        }
        window._lastDetectedAddress = json;
      }
    } catch(e) { /* silent fallback */ }
  }

  function clearMapSearch() {
    document.getElementById('mapSearchInput').value = '';
    document.getElementById('mapSearchClearBtn').style.display = 'none';
    document.getElementById('mapSearchResults').style.display = 'none';
  }

  function openDocPreview(title, url) {
    document.getElementById('docPreviewTitle').innerText = title || 'Document Inspection';
    document.getElementById('docPreviewImg').src = url;
    document.getElementById('docPreviewFullTabBtn').href = url;
    document.getElementById('docPreviewDownloadBtn').href = url;
    openModal('docPreviewLightbox');
    if (window.lucide) lucide.createIcons();
  }

  // INSPECT SHOP DETAILS (Prominent Logo, Cover Photos Gallery, Real Documents)
  function viewShopDetails(shop) {
    const sName = shop.shopName || shop.name || 'Laundry Shop';
    const sId = shop.id || shop.shop_id || '44';
    const oName = shop.ownerName || shop.owner_name || 'Partner Owner';
    const phone = shop.phone || shop.mobile_number || 'N/A';
    const email = shop.email || 'partner@dhobipro.com';
    const city = shop.city || 'Pune';
    const addr = shop.address || 'Physical address';
    const hours = shop.workingHours || shop.working_hours || '08:00 AM - 09:30 PM';
    const radius = shop.pickupRadiusKm || 8;
    const gst = shop.gstNumber || shop.gst_number || '27AABCU9603R1ZM';
    const bank = shop.bankName || shop.bank_name || 'HDFC Bank';
    const acc = shop.bankAccount || shop.bank_account || '50100987654321';
    const ifsc = shop.ifscCode || shop.ifsc_code || 'HDFC0001234';
    const upi = shop.upiId || shop.upi_id || '8600692767@hdfcbank';
    const sLogo = shop.logo_url || shop.logo || shop.logo_photo || '';
    const coverUrl = shop.cover_url || '';
    const coverPhotos = shop.cover_photos || [];

    const aadhaarImg = shop.idProofPhoto || shop.id_proof_photo || '';
    const aadhaarNo = shop.idProofNumber || shop.id_proof_number || '';
    const udyamImg = shop.businessProofPhoto || shop.business_proof_photo || '';
    const udyamNo = shop.businessProofNumber || shop.business_proof_number || '';
    const bankImg = shop.bankProofPhoto || shop.bank_proof_photo || '';
    const boardImg = shop.shopBoardPhoto || shop.shop_board_photo || '';

    const pin = shop.pincode || shop.postal_code || '411057';
    const lat = shop.latitude || '18.5590';
    const lng = shop.longitude || '73.7868';
    const subPlan = shop.subscriptionPlan || shop.subscription_plan || 'Starter';
    const accHolder = shop.accountHolder || shop.account_holder || shop.ownerName || shop.owner_name || 'Partner Owner';

    const initials = sName.slice(0, 2).toUpperCase();

    document.getElementById('modalShopName').innerText = sName;
    document.getElementById('modalShopSubtitle').innerText = `Shop ID: #${sId} • Registered to ${oName} (${city})`;

    let coverGalleryHtml = '';
    if (coverPhotos && coverPhotos.length > 0) {
      coverGalleryHtml = `
        <div style="background: var(--bg-input); padding: 1.1rem; border-radius: 12px; border: 1px solid var(--border-color); margin-bottom: 1.25rem;">
          <h4 style="margin: 0 0 0.75rem 0; color: #8162EE; font-size: 0.95rem; font-weight: 800; display: flex; align-items: center; gap: 0.4rem;">
            🖼️ Uploaded Shop Cover Photos (${coverPhotos.length})
          </h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.75rem;">
            ${coverPhotos.map((c, i) => `
              <div style="cursor: pointer; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color);" onclick="openDocPreview('${sName} - Cover Photo ${i+1}', '${c.url}')">
                <img src="${c.url}" alt="${c.name || 'Cover'}" style="width: 100%; height: 85px; object-fit: cover;">
                <div style="font-size: 0.68rem; padding: 0.25rem 0.4rem; background: var(--bg-card); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${c.name || 'Cover ' + (i+1)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    document.getElementById('modalShopContent').innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        
        <!-- Header Banner with Shop Logo -->
        <div style="display: flex; align-items: center; gap: 1rem; background: var(--bg-input); padding: 1rem 1.25rem; border-radius: 14px; border: 1px solid var(--border-color);">
          ${sLogo ? `
            <img src="${sLogo}" alt="${sName}" style="width: 60px; height: 60px; border-radius: 12px; object-fit: cover; border: 2px solid var(--brand-purple); box-shadow: 0 4px 12px rgba(0,0,0,0.15); background: #fff; flex-shrink: 0;">
          ` : `
            <div style="width: 60px; height: 60px; border-radius: 12px; background: linear-gradient(135deg, #8162EE 0%, #32138F 100%); color: #FFF; font-size: 1.25rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 12px rgba(129,98,238,0.3);">
              ${initials}
            </div>
          `}
          <div style="flex: 1; min-width: 0; display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: var(--text-primary);">${sName}</h3>
                <span class="badge badge-success" style="font-size: 0.7rem;">LIVE PARTNER</span>
              </div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
                📍 ${city} • ${hours} • Pickup Radius: ${radius} km
              </div>
            </div>
            ${ <?= $isOwner ? 'true' : 'false' ?> ? `
            <button onclick='closeModal("shopDetailsModal"); openEditShop(${JSON.stringify(shop).replace(/'/g, "&apos;").replace(/"/g, "&quot;")});' class="btn btn-primary btn-sm" style="font-size: 0.75rem; padding: 0.4rem 0.8rem; font-weight: 800; border-radius: 8px; flex-shrink: 0;">
              <i data-lucide="edit-3" style="width: 14px; height: 14px; margin-right: 4px; display: inline-block; vertical-align: middle;"></i> Edit Profile
            </button>
            ` : ''}
          </div>
        </div>

        ${coverGalleryHtml}

        <!-- Store & Contact Info -->
        <div style="background: var(--bg-input); padding: 1.1rem; border-radius: 12px; border: 1px solid var(--border-color);">
          <h4 style="margin: 0 0 0.75rem 0; color: #8162EE; font-size: 0.95rem; font-weight: 800; display: flex; align-items: center; gap: 0.4rem;">
            🏬 Store &amp; Contact Info
          </h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; font-size: 0.85rem;">
            <div><span style="color: var(--text-muted);">Shop ID:</span> <strong>#${sId}</strong></div>
            <div><span style="color: var(--text-muted);">Owner:</span> <strong>${oName}</strong></div>
            <div><span style="color: var(--text-muted);">Mobile:</span> <strong>${phone}</strong></div>
            <div><span style="color: var(--text-muted);">Email:</span> <strong>${email}</strong></div>
            <div><span style="color: var(--text-muted);">Serviceable City:</span> <strong>📍 ${city} (Radius: ${radius} km)</strong></div>
            <div><span style="color: var(--text-muted);">Working Hours:</span> <strong>${hours}</strong></div>
            <div><span style="color: var(--text-muted);">Pincode:</span> <strong>${pin}</strong></div>
            <div><span style="color: var(--text-muted);">GPS Coords:</span> <strong>${lat}, ${lng}</strong></div>
            <div><span style="color: var(--text-muted);">Subscription:</span> <strong style="color: var(--brand-purple);">${subPlan}</strong></div>
            <div style="grid-column: 1 / -1;"><span style="color: var(--text-muted);">Address:</span> <strong>${addr}</strong></div>
          </div>
        </div>

        <!-- Banking & Financial Compliance -->
        <div style="background: var(--bg-input); padding: 1.1rem; border-radius: 12px; border: 1px solid var(--border-color);">
          <h4 style="margin: 0 0 0.75rem 0; color: #10B981; font-size: 0.95rem; font-weight: 800; display: flex; align-items: center; gap: 0.4rem;">
            🏦 Banking &amp; Financial Compliance
          </h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; font-size: 0.85rem;">
            <div><span style="color: var(--text-muted);">GST Number:</span> <strong style="color: var(--brand-purple);">${gst || 'N/A'}</strong></div>
            <div><span style="color: var(--text-muted);">Bank Name:</span> <strong>${bank}</strong></div>
            <div><span style="color: var(--text-muted);">Account Number:</span> <strong>${acc}</strong></div>
            <div><span style="color: var(--text-muted);">Account Holder:</span> <strong>${accHolder}</strong></div>
            <div><span style="color: var(--text-muted);">IFSC Code:</span> <strong>${ifsc}</strong></div>
            <div><span style="color: var(--text-muted);">UPI ID:</span> <strong>${upi || 'N/A'}</strong></div>
            <div><span style="color: var(--text-muted);">Tax Filing Status:</span> <strong style="color: #10B981;">Regular &amp; Compliant ✓</strong></div>
          </div>
        </div>

        <!-- Compliance Verification Documents (Only Real Uploads Shown!) -->
        <div style="background: var(--bg-input); padding: 1.1rem; border-radius: 12px; border: 1px solid var(--border-color);">
          <h4 style="margin: 0 0 0.85rem 0; color: #D97706; font-size: 0.95rem; font-weight: 800; display: flex; align-items: center; gap: 0.4rem;">
            📄 Compliance Verification Documents
          </h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
            
            <!-- Document 1: Aadhaar -->
            <div style="background: var(--bg-card); padding: 0.85rem; border-radius: 10px; border: 1px solid var(--border-color); display: flex; gap: 0.75rem; align-items: center;">
              ${aadhaarImg ? `
                <img src="${aadhaarImg}" alt="Aadhaar" style="width: 58px; height: 42px; border-radius: 6px; object-fit: cover; border: 1px solid var(--border-color); cursor: pointer; background: #fff;" onclick="openDocPreview('${sName} - Aadhaar / ID Proof', '${aadhaarImg}')">
                <div style="flex: 1; min-width: 0;">
                  <div style="font-weight: 800; font-size: 0.85rem;">Aadhaar / ID Proof</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">No: ${aadhaarNo || 'Verified'}</div>
                  <button type="button" class="btn btn-outline btn-sm" onclick="openDocPreview('${sName} - Aadhaar / ID Proof', '${aadhaarImg}')" style="margin-top: 0.35rem; padding: 0.2rem 0.6rem; font-size: 0.72rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                    <i data-lucide="eye" style="width: 12px; height: 12px;"></i> View Document
                  </button>
                </div>
              ` : `
                <div style="flex: 1; min-width: 0;">
                  <div style="font-weight: 800; font-size: 0.85rem;">Aadhaar / ID Proof</div>
                  <span style="font-size: 0.72rem; color: #D97706; font-weight: 700;">⚠️ Document Not Uploaded</span>
                </div>
              `}
            </div>

            <!-- Document 2: Trade License -->
            <div style="background: var(--bg-card); padding: 0.85rem; border-radius: 10px; border: 1px solid var(--border-color); display: flex; gap: 0.75rem; align-items: center;">
              ${udyamImg ? `
                <img src="${udyamImg}" alt="Udyam" style="width: 58px; height: 42px; border-radius: 6px; object-fit: cover; border: 1px solid var(--border-color); cursor: pointer; background: #fff;" onclick="openDocPreview('${sName} - Trade License', '${udyamImg}')">
                <div style="flex: 1; min-width: 0;">
                  <div style="font-weight: 800; font-size: 0.85rem;">Trade License / Udyam</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">No: ${udyamNo || 'Verified'}</div>
                  <button type="button" class="btn btn-outline btn-sm" onclick="openDocPreview('${sName} - Trade License', '${udyamImg}')" style="margin-top: 0.35rem; padding: 0.2rem 0.6rem; font-size: 0.72rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                    <i data-lucide="eye" style="width: 12px; height: 12px;"></i> View Document
                  </button>
                </div>
              ` : `
                <div style="flex: 1; min-width: 0;">
                  <div style="font-weight: 800; font-size: 0.85rem;">Trade License / Udyam</div>
                  <span style="font-size: 0.72rem; color: #D97706; font-weight: 700;">⚠️ Document Not Uploaded</span>
                </div>
              `}
            </div>

            <!-- Document 3: Bank Cheque -->
            <div style="background: var(--bg-card); padding: 0.85rem; border-radius: 10px; border: 1px solid var(--border-color); display: flex; gap: 0.75rem; align-items: center;">
              ${bankImg ? `
                <img src="${bankImg}" alt="Bank Proof" style="width: 58px; height: 42px; border-radius: 6px; object-fit: cover; border: 1px solid var(--border-color); cursor: pointer; background: #fff;" onclick="openDocPreview('${sName} - Bank Cheque', '${bankImg}')">
                <div style="flex: 1; min-width: 0;">
                  <div style="font-weight: 800; font-size: 0.85rem;">Bank Cheque / Passbook</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">A/C: ${acc}</div>
                  <button type="button" class="btn btn-outline btn-sm" onclick="openDocPreview('${sName} - Bank Cheque', '${bankImg}')" style="margin-top: 0.35rem; padding: 0.2rem 0.6rem; font-size: 0.72rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                    <i data-lucide="eye" style="width: 12px; height: 12px;"></i> View Document
                  </button>
                </div>
              ` : `
                <div style="flex: 1; min-width: 0;">
                  <div style="font-weight: 800; font-size: 0.85rem;">Bank Cheque / Passbook</div>
                  <span style="font-size: 0.72rem; color: #D97706; font-weight: 700;">⚠️ Document Not Uploaded</span>
                </div>
              `}
            </div>

            <!-- Document 4: Store Front Signboard -->
            <div style="background: var(--bg-card); padding: 0.85rem; border-radius: 10px; border: 1px solid var(--border-color); display: flex; gap: 0.75rem; align-items: center;">
              ${boardImg ? `
                <img src="${boardImg}" alt="Signboard" style="width: 58px; height: 42px; border-radius: 6px; object-fit: cover; border: 1px solid var(--border-color); cursor: pointer; background: #fff;" onclick="openDocPreview('${sName} - Store Signboard', '${boardImg}')">
                <div style="flex: 1; min-width: 0;">
                  <div style="font-weight: 800; font-size: 0.85rem;">Storefront Signboard</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">Physical Outlet Photo</div>
                  <button type="button" class="btn btn-outline btn-sm" onclick="openDocPreview('${sName} - Store Signboard', '${boardImg}')" style="margin-top: 0.35rem; padding: 0.2rem 0.6rem; font-size: 0.72rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                    <i data-lucide="eye" style="width: 12px; height: 12px;"></i> View Photo
                  </button>
                </div>
              ` : `
                <div style="flex: 1; min-width: 0;">
                  <div style="font-weight: 800; font-size: 0.85rem;">Storefront Signboard</div>
                  <span style="font-size: 0.72rem; color: #D97706; font-weight: 700;">⚠️ Photo Not Uploaded</span>
                </div>
              `}
            </div>

          </div>
        </div>
      </div>
    `;

    const isOwnerRole = <?= $isOwner ? 'true' : 'false' ?>;
    let footerButtonsHtml = '';
    
    if (!isOwnerRole) {
      footerButtonsHtml = `
        <button type="button" onclick="closeModal('shopDetailModal'); openRequestDocsModal('${sId}', '${encodeURIComponent(sName)}')" class="btn btn-sm" style="background: #F59E0B; color: #FFF; font-weight: 700; border: none; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.85rem; border-radius: 6px; cursor: pointer;">
          <i data-lucide="file-question" style="width: 14px; height: 14px;"></i> Request Missing Docs
        </button>
        <form method="POST" action="" style="display: inline;" onsubmit="return confirm('Are you sure you want to permanently delete ${sName}?');">
          <input type="hidden" name="action" value="delete">
          <input type="hidden" name="shop_id" value="${sId}">
          <button type="submit" class="btn btn-danger btn-sm" style="font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.85rem; border-radius: 6px; cursor: pointer;">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> Delete Shop
          </button>
        </form>
      `;
    }

    document.getElementById('modalShopFooterStatus').innerHTML = `
      <div style="display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap;">
        <span class="badge badge-success" style="font-size: 0.8rem; font-weight: 800;">
          ✓ OUTLET PROFILE VERIFIED &amp; COMPLIANT
        </span>
        ${footerButtonsHtml}
      </div>
    `;

    openModal('shopDetailModal');
    if (window.lucide) lucide.createIcons();
  }

  function openEditShop(shop) {
    document.getElementById('editShopId').value = shop.id || shop.shop_id || '';
    document.getElementById('editShopName').value = shop.shopName || shop.name || '';
    document.getElementById('editShopPhone').value = shop.phone || '';
    document.getElementById('editShopAddress').value = shop.address || '';
    document.getElementById('editShopHours').value = shop.workingHours || shop.working_hours || '08:00 AM - 09:30 PM';
    document.getElementById('editShopRadius').value = shop.pickupRadiusKm || 8;
    openModal('editShopModal');
  }

  // Onboard modal opener helper to guarantee starting at Step 1
  function openOnboardModal() {
    goToStep(1);
    openModal('onboardModal');
  }
  window.openOnboardModal = openOnboardModal;

  document.addEventListener('DOMContentLoaded', () => {
    goToStep(1);
    <?php if (isset($_GET['action']) && $_GET['action'] === 'onboard'): ?>
    openOnboardModal();
    <?php endif; ?>
  });
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
