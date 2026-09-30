<?php
$pageTitle = 'Laundry Owners & Shop Operators';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';

$actionMsg = null;
$actionError = null;

// Handle Form Post Actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $targetId = $_POST['shop_id'] ?? '';

    if ($action === 'delete' && $targetId) {
        if (!empty($_SESSION['custom_shops'])) {
            $_SESSION['custom_shops'] = array_values(array_filter($_SESSION['custom_shops'], function($s) use ($targetId) {
                return strval($s['id'] ?? '') !== strval($targetId);
            }));
        }
        $res = apiDelete("/admin/laundries/{$targetId}");
        $actionMsg = "Laundry owner & shop #{$targetId} permanently removed.";
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
        $actionMsg = "Compliance document request successfully sent to {$shopName}. The owner will see this notification on their verification screen.";
    } elseif ($action === 'edit_owner' && $targetId) {
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

        $newIdProof = $handleUpload('edit_id_proof_photo', 'aadhaar');
        $newBusinessProof = $handleUpload('edit_business_proof_photo', 'udyam');
        $newBankProof = $handleUpload('edit_bank_proof_photo', 'bank');
        $newShopBoard = $handleUpload('edit_shop_board_photo', 'shopboard');
        $newLogo = $handleUpload('edit_logo_photo', 'logo');

        $payload = [
            'name' => $_POST['shop_name'] ?? '',
            'owner_name' => $_POST['owner_name'] ?? '',
            'phone' => $_POST['phone'] ?? '',
            'email' => $_POST['email'] ?? '',
            'password' => $_POST['password'] ?? '',
            'city' => $_POST['city'] ?? 'Pune',
            'state' => 'Maharashtra',
            'address' => $_POST['address'] ?? '',
            'pincode' => $_POST['pincode'] ?? '411057',
            'pickup_radius_km' => intval($_POST['pickup_radius_km'] ?? 8),
            'working_hours' => $_POST['working_hours'] ?? '08:00 AM - 09:30 PM',
            'id_proof_number' => $_POST['id_proof_number'] ?? '',
            'bank_name' => $_POST['bank_name'] ?? 'HDFC Bank',
            'bank_account' => $_POST['bank_account'] ?? '',
            'ifsc_code' => $_POST['ifsc_code'] ?? '',
            'account_holder' => $_POST['account_holder'] ?? '',
            'upi_id' => $_POST['upi_id'] ?? '',
            'gst_number' => $_POST['gst_number'] ?? '',
            'business_proof_number' => $_POST['business_proof_number'] ?? '',
            'verification_status' => $_POST['verification_status'] ?? 'APPROVED',
            'account_status' => $_POST['account_status'] ?? 'ACTIVE',
            'subscription_plan' => $_POST['subscription_plan'] ?? 'Starter',
        ];

        if ($newIdProof) $payload['id_proof_photo'] = $newIdProof;
        if ($newBusinessProof) $payload['business_proof_photo'] = $newBusinessProof;
        if ($newBankProof) $payload['bank_proof_photo'] = $newBankProof;
        if ($newShopBoard) $payload['shop_board_photo'] = $newShopBoard;
        if ($newLogo) $payload['logo_url'] = $newLogo;

        // Update in session if custom shop
        if (!empty($_SESSION['custom_shops'])) {
            foreach ($_SESSION['custom_shops'] as &$cs) {
                if (strval($cs['id'] ?? '') === strval($targetId)) {
                    $cs['shopName'] = $payload['name'];
                    $cs['name'] = $payload['name'];
                    $cs['ownerName'] = $payload['owner_name'];
                    $cs['owner_name'] = $payload['owner_name'];
                    $cs['phone'] = $payload['phone'];
                    $cs['email'] = $payload['email'];
                    $cs['city'] = $payload['city'];
                    $cs['address'] = $payload['address'];
                    $cs['pincode'] = $payload['pincode'];
                    $cs['pickupRadiusKm'] = $payload['pickup_radius_km'];
                    $cs['workingHours'] = $payload['working_hours'];
                    $cs['gstNumber'] = $payload['gst_number'];
                    $cs['bankName'] = $payload['bank_name'];
                    $cs['bankAccount'] = $payload['bank_account'];
                    $cs['ifscCode'] = $payload['ifsc_code'];
                    $cs['upiId'] = $payload['upi_id'];
                    $cs['verificationStatus'] = $payload['verification_status'];
                    $cs['accountStatus'] = $payload['account_status'];
                    if ($newLogo) $cs['logo_url'] = $newLogo;
                    if ($newIdProof) $cs['idProofPhoto'] = $newIdProof;
                    if ($newBusinessProof) $cs['businessProofPhoto'] = $newBusinessProof;
                    if ($newBankProof) $cs['bankProofPhoto'] = $newBankProof;
                    if ($newShopBoard) $cs['shopBoardPhoto'] = $newShopBoard;
                    break;
                }
            }
            unset($cs);
        }

        $res = apiPut("/admin/laundries/{$targetId}", $payload);
        $actionMsg = "All onboarding & profile details for \"{$payload['name']}\" updated successfully!";
    }
}

// Fetch live laundries
$res = apiGet('/admin/laundries');
$owners = apiExtractList($res);

// Prepend session custom shops so newly onboarded partners show up
if (!empty($_SESSION['custom_shops'])) {
    $owners = array_merge($_SESSION['custom_shops'], $owners);
}

$isOwner = isLaundryOwner();
$myShopId = currentShopId();
$myShopName = currentShopName();
$currentUser = currentUser();
$myOwnerName = $currentUser['name'] ?? '';
$myEmail = $currentUser['email'] ?? '';

// If logged in as Laundry Owner, STRICTLY isolate and filter out all other laundries!
if ($isOwner) {
    $owners = array_values(array_filter($owners, function($o) use ($myShopId, $myShopName, $myOwnerName, $myEmail) {
        $oId = strval($o['id'] ?? $o['shop_id'] ?? '');
        $oShop = strtolower(trim($o['shopName'] ?? $o['name'] ?? $o['shop_name'] ?? ''));
        $oOwner = strtolower(trim($o['ownerName'] ?? $o['owner_name'] ?? ''));
        $oEmail = strtolower(trim($o['email'] ?? ''));
        
        if ($myShopId && $oId === strval($myShopId)) return true;
        if ($oEmail && strtolower($myEmail) && $oEmail === strtolower($myEmail)) return true;
        if ($oOwner && strtolower($myOwnerName) && $oOwner === strtolower($myOwnerName)) return true;
        if ($oShop && strtolower($myShopName) && (strpos($oShop, strtolower($myShopName)) !== false || strpos(strtolower($myShopName), $oShop) !== false)) return true;
        return false;
    }));

    if (empty($owners)) {
        $owners = [
            [
                'id' => $myShopId ?: '30',
                'shopName' => $myShopName ?: 'Star Wash Ultra Premium',
                'ownerName' => $myOwnerName ?: 'Partner Owner',
                'phone' => '8600692767',
                'email' => $myEmail ?: 'partner@dhobipro.com',
                'city' => 'Pune',
                'address' => 'Shop Premise, Tathawade, Pune - 411057',
                'totalOrders' => 4,
                'revenue' => 1400,
                'rating' => 5.0,
                'accountStatus' => 'ACTIVE',
                'verificationStatus' => 'APPROVED',
                'gstNumber' => '27AABCU9603R1ZM',
                'bankName' => 'HDFC Bank',
                'bankAccount' => '50100987654321',
                'ifscCode' => 'HDFC0001234',
                'upiId' => '8600692767@hdfcbank',
                'idProofNumber' => '5421 8765 4321',
                'businessProofNumber' => 'UDYAM-MH-12-0044892',
                'workingHours' => '08:00 AM - 09:30 PM',
                'pickupRadiusKm' => 8,
                'subscriptionPlan' => 'Gold Business',
            ]
        ];
    }
} elseif (empty($owners)) {
    // Default demo records if empty for admin
    $owners = [
        [
            'id' => '30',
            'shopName' => 'Star Wash Ultra Premium',
            'ownerName' => 'Ashish Bhosale',
            'phone' => '8600692767',
            'email' => 'ashish.laundry@dhobipro.com',
            'city' => 'Tathawade, Pune',
            'address' => 'Shop 12, Bhujbal Chowk, Tathawade, Pune - 411057',
            'totalOrders' => 4,
            'revenue' => 1400,
            'rating' => 5.0,
            'accountStatus' => 'ACTIVE',
            'verificationStatus' => 'APPROVED',
            'gstNumber' => '27AABCU9603R1ZM',
            'bankName' => 'HDFC Bank',
            'bankAccount' => '50100987654321',
            'ifscCode' => 'HDFC0001234',
            'upiId' => '8600692767@hdfcbank',
            'idProofNumber' => '5421 8765 4321',
            'businessProofNumber' => 'UDYAM-MH-12-0044892',
            'workingHours' => '08:00 AM - 09:30 PM',
            'pickupRadiusKm' => 8,
            'subscriptionPlan' => 'Gold Business',
        ]
    ];
}
?>

<div style="color: var(--text-primary);">
  <!-- Page Header -->
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary); margin: 0;">
        <i data-lucide="store" style="width: 28px; height: 28px; color: #8162EE;"></i> 
        <?= $isOwner ? 'My Laundry Franchise & Owner Profile' : 'Laundry Owners & Franchise Operators' ?>
      </h1>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.2rem; margin-bottom: 0;">
        <?= $isOwner ? 'View and update your registered shop profile, banking credentials, premise address, and compliance documents.' : 'Directly onboard partner laundry shops, view shop-wise customer bookings, edit onboarding profiles, inspect documents & request compliance uploads.' ?>
      </p>
    </div>

    <?php if (!$isOwner): ?>
      <a href="<?= ADMIN_BASE_URL ?>/laundries/index.php" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; padding: 0.65rem 1.25rem; border-radius: 8px; font-weight: 700; text-decoration: none; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 14px rgba(129, 98, 238, 0.4);">
        <i data-lucide="plus" style="width: 18px; height: 18px;"></i> Onboard New Shop
      </a>
    <?php endif; ?>
  </div>

  <?php if ($actionMsg): ?>
    <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); color: #065F46; padding: 0.85rem 1.2rem; border-radius: 10px; font-weight: 700; font-size: 0.86rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.6rem; box-shadow: 0 2px 8px rgba(16,185,129,0.1);">
      <i data-lucide="check-circle" style="width: 20px; height: 20px; color: #10B981; flex-shrink: 0;"></i> 
      <span><?= htmlspecialchars($actionMsg) ?></span>
    </div>
  <?php endif; ?>

  <?php if ($actionError): ?>
    <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); color: #991B1B; padding: 0.85rem 1.2rem; border-radius: 10px; font-weight: 700; font-size: 0.86rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.6rem;">
      <i data-lucide="alert-circle" style="width: 20px; height: 20px; color: #EF4444; flex-shrink: 0;"></i> 
      <span><?= htmlspecialchars($actionError) ?></span>
    </div>
  <?php endif; ?>

  <div class="card" style="padding: 1.5rem;">
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Laundry Owner</th>
            <th>Associated Shop</th>
            <th>Location</th>
            <th>GST / Tax ID</th>
            <th>Orders Handled</th>
            <th>Gross Revenue</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($owners as $o): 
              $sId = $o['id'] ?? $o['shop_id'] ?? '30';
              $rawOwner = $o['ownerName'] ?? $o['owner_name'] ?? '';
              $owner = trim($rawOwner) !== '' ? trim($rawOwner) : "Owner #{$sId}";
              $rawShop = $o['shopName'] ?? $o['name'] ?? $o['shop_name'] ?? '';
              $shop = trim($rawShop) !== '' ? trim($rawShop) : "Laundry Shop #{$sId}";
              $phone = $o['phone'] ?? $o['mobile_number'] ?? 'N/A';
              $city = $o['city'] ?? 'Pune';
              $orders = $o['totalOrders'] ?? $o['total_orders'] ?? 0;
              $rev = $o['revenue'] ?? $o['total_revenue'] ?? 0;
              $status = strtoupper($o['accountStatus'] ?? $o['status'] ?? 'ACTIVE');
              $vStatus = strtoupper($o['verificationStatus'] ?? $o['verification_status'] ?? 'APPROVED');
              $logo = $o['logo_url'] ?? $o['logo'] ?? '';
              $cleanText = preg_replace('/[^A-Za-z0-9]/', '', $shop);
              $initials = strtoupper(substr($cleanText ?: 'LS', 0, 2));
          ?>
            <tr>
              <td>
                <div style="font-weight: 800; font-size: 0.95rem; color: var(--brand-purple);"><?= htmlspecialchars($owner) ?></div>
                <div style="font-size: 0.75rem; color: var(--text-muted);"><?= htmlspecialchars($phone) ?></div>
                <?php if (!empty($o['email'])): ?>
                  <div style="font-size: 0.72rem; color: var(--text-muted);"><?= htmlspecialchars($o['email']) ?></div>
                <?php endif; ?>
              </td>
              <td>
                <div style="display: flex; align-items: center; gap: 0.65rem;">
                  <?php if (!empty($logo)): ?>
                    <img src="<?= htmlspecialchars($logo) ?>" alt="<?= htmlspecialchars($shop) ?>" style="width: 38px; height: 38px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border-color); background: #fff;" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div style="display: none; width: 38px; height: 38px; border-radius: 8px; background: linear-gradient(135deg, #8162EE 0%, #32138F 100%); color: #FFF; font-weight: 800; font-size: 0.75rem; align-items: center; justify-content: center;">
                      <?= htmlspecialchars($initials) ?>
                    </div>
                  <?php else: ?>
                    <div style="width: 38px; height: 38px; border-radius: 8px; background: linear-gradient(135deg, #8162EE 0%, #32138F 100%); color: #FFF; font-weight: 800; font-size: 0.75rem; display: flex; align-items: center; justify-content: center;">
                      <?= htmlspecialchars($initials) ?>
                    </div>
                  <?php endif; ?>
                  <div>
                    <strong style="font-size: 0.9rem;"><?= htmlspecialchars($shop) ?></strong>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">Shop ID: #<?= htmlspecialchars($sId) ?> • <?= htmlspecialchars($o['workingHours'] ?? '8 AM - 9 PM') ?></div>
                  </div>
                </div>
              </td>
              <td>
                <span style="font-weight: 700; font-size: 0.85rem;">📍 <?= htmlspecialchars($city) ?></span>
                <div style="font-size: 0.72rem; color: #10B981; font-weight: 700;">Radius: <?= $o['pickupRadiusKm'] ?? 8 ?> km</div>
              </td>
              <td>
                <span style="font-family: monospace; font-weight: 700; font-size: 0.82rem; color: var(--brand-purple);">
                  <?= htmlspecialchars($o['gstNumber'] ?? $o['gst_number'] ?? '27AABCU9603R1ZM') ?>
                </span>
              </td>
              <td><strong style="font-size: 0.92rem;"><?= number_format($orders) ?> Orders</strong></td>
              <td><strong style="color: #10B981; font-size: 0.95rem;">₹<?= number_format($rev) ?></strong></td>
              <td>
                <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                  <span class="badge badge-<?= $status === 'ACTIVE' ? 'success' : 'danger' ?>" style="font-size: 0.72rem;">
                    <?= $status ?>
                  </span>
                  <span class="badge badge-<?= $vStatus === 'APPROVED' ? 'success' : 'warning' ?>" style="font-size: 0.7rem;">
                    <?= $vStatus ?>
                  </span>
                </div>
              </td>
              <td>
                <div style="display: flex; gap: 0.35rem; align-items: center; white-space: nowrap;">
                  <!-- Inspect Button -->
                  <button 
                    type="button" 
                    onclick="viewOwnerDetails(<?= htmlspecialchars(json_encode($o)) ?>)" 
                    class="btn btn-secondary btn-sm" 
                    style="display: inline-flex; align-items: center; gap: 0.25rem;"
                    title="Inspect Owner &amp; KYC Proofs"
                  >
                    <i data-lucide="eye" style="width: 14px; height: 14px;"></i> Inspect
                  </button>

                  <!-- Edit Button: Edits ALL Onboarding Info -->
                  <button 
                    type="button" 
                    onclick="openEditOwnerModal(<?= htmlspecialchars(json_encode($o)) ?>)" 
                    class="btn btn-secondary btn-sm"
                    style="display: inline-flex; align-items: center; gap: 0.25rem; font-weight: 700; color: #8162EE;"
                    title="Edit All Onboarding Details"
                  >
                    <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i> Edit
                  </button>

                  <!-- View Orders Link -->
                  <a href="<?= ADMIN_BASE_URL ?>/orders/index.php?shop_id=<?= urlencode($sId) ?>" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 0.25rem;" title="View Live Orders">
                    <i data-lucide="shopping-bag" style="width: 14px; height: 14px;"></i> Orders
                  </a>

                  <!-- Delete Owner / Shop -->
                  <form method="POST" action="" style="display: inline;" onsubmit="return confirm('Are you sure you want to permanently delete <?= htmlspecialchars(addslashes($shop)) ?> (<?= htmlspecialchars(addslashes($owner)) ?>)?');">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="shop_id" value="<?= htmlspecialchars($sId) ?>">
                    <button type="submit" class="btn btn-sm" style="background: rgba(239, 68, 68, 0.15); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.35rem 0.65rem; border-radius: 6px; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem; cursor: pointer;" title="Delete Laundry Owner &amp; Shop">
                      <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- ========================================================================= -->
<!-- MODAL 1: EDIT LAUNDRY OWNER (ALL ONBOARDING INFO)                        -->
<!-- ========================================================================= -->
<div id="editOwnerModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); align-items: center; justify-content: center; z-index: 99999; padding: 1.5rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 780px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.4); color: var(--text-primary);">
    
    <!-- Modal Header -->
    <div style="padding: 1.25rem 1.75rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.15);">
      <div>
        <h3 id="editOwnerModalTitle" style="font-size: 1.2rem; font-weight: 800; margin: 0; color: var(--brand-purple);">
          Edit Laundry Partner &amp; Onboarding Profile
        </h3>
        <p style="font-size: 0.76rem; color: var(--text-muted); margin: 0.2rem 0 0 0;">
          Modify owner credentials, physical shop location, bank accounts, and subscription tier.
        </p>
      </div>
      <button type="button" onclick="closeModal('editOwnerModal')" style="background: var(--bg-input); border: none; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted);">✕</button>
    </div>

    <!-- Navigation Tabs for Editing -->
    <div style="display: flex; border-bottom: 1px solid var(--border-color); background: var(--bg-input);">
      <button type="button" onclick="switchEditTab(1)" id="editTabBtn1" style="flex: 1; padding: 0.75rem 1rem; border: none; background: rgba(129,98,238,0.12); border-bottom: 3px solid #8162EE; color: #8162EE; font-weight: 800; font-size: 0.82rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
        👤 1. Owner Info
      </button>
      <button type="button" onclick="switchEditTab(2)" id="editTabBtn2" style="flex: 1; padding: 0.75rem 1rem; border: none; background: transparent; border-bottom: 3px solid transparent; color: var(--text-muted); font-weight: 600; font-size: 0.82rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
        🏪 2. Shop Profile
      </button>
      <button type="button" onclick="switchEditTab(3)" id="editTabBtn3" style="flex: 1; padding: 0.75rem 1rem; border: none; background: transparent; border-bottom: 3px solid transparent; color: var(--text-muted); font-weight: 600; font-size: 0.82rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
        💳 3. Banking &amp; GST
      </button>
      <button type="button" onclick="switchEditTab(4)" id="editTabBtn4" style="flex: 1; padding: 0.75rem 1rem; border: none; background: transparent; border-bottom: 3px solid transparent; color: var(--text-muted); font-weight: 600; font-size: 0.82rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
        ⚡ 4. Status &amp; Tier
      </button>
    </div>

    <!-- Edit Form with Multi-Part Sections -->
    <form id="editOwnerForm" method="POST" action="" enctype="multipart/form-data" style="flex: 1; overflow-y: auto; padding: 1.5rem 1.75rem;">
      <input type="hidden" name="action" value="edit_owner">
      <input type="hidden" id="edit_shop_id" name="shop_id" value="">

      <!-- TAB 1: OWNER INFO -->
      <div id="editTabSec1">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Owner Full Name *</label>
            <input type="text" id="eo_owner_name" name="owner_name" required class="form-control" style="width: 100%;">
          </div>
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Mobile Phone Number *</label>
            <input type="text" id="eo_phone" name="phone" required class="form-control" style="width: 100%;">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Email Address</label>
            <input type="email" id="eo_email" name="email" class="form-control" style="width: 100%;">
          </div>
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Partner Login Password</label>
            <input type="text" id="eo_password" name="password" class="form-control" style="width: 100%;">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; background: var(--bg-input); padding: 1rem; border-radius: 10px; border: 1px solid var(--border-color);">
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Aadhaar / Government ID Number</label>
            <input type="text" id="eo_id_proof_number" name="id_proof_number" class="form-control" style="width: 100%;">
          </div>
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Re-upload ID Proof Document</label>
            <input type="file" name="edit_id_proof_photo" accept="image/*,.pdf" style="width: 100%; font-size: 0.8rem;">
            <div id="eo_id_proof_current" style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.3rem;"></div>
          </div>
        </div>
      </div>

      <!-- TAB 2: SHOP PROFILE & LOCATION -->
      <div id="editTabSec2" style="display: none;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Laundry Shop Name *</label>
            <input type="text" id="eo_shop_name" name="shop_name" required class="form-control" style="width: 100%;">
          </div>
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Shop Contact / Hotline Phone</label>
            <input type="text" id="eo_shop_phone" name="shop_phone" class="form-control" style="width: 100%;">
          </div>
        </div>

        <div style="margin-bottom: 1rem;">
          <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Full Shop Premise Address *</label>
          <textarea id="eo_address" name="address" rows="2" required class="form-control" style="width: 100%;"></textarea>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Serviceable City *</label>
            <input type="text" id="eo_city" name="city" required class="form-control" style="width: 100%;">
          </div>
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Pincode</label>
            <input type="text" id="eo_pincode" name="pincode" class="form-control" style="width: 100%;">
          </div>
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Pickup Radius (km)</label>
            <input type="number" id="eo_pickup_radius_km" name="pickup_radius_km" min="1" max="30" class="form-control" style="width: 100%;">
          </div>
        </div>

        <div style="margin-bottom: 1rem;">
          <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Working Hours</label>
          <input type="text" id="eo_working_hours" name="working_hours" class="form-control" style="width: 100%;">
        </div>

        <!-- Media Uploads for Shop -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; background: var(--bg-input); padding: 1rem; border-radius: 10px; border: 1px solid var(--border-color);">
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Update Brand Logo</label>
            <input type="file" name="edit_logo_photo" accept="image/*" style="width: 100%; font-size: 0.8rem;">
            <div id="eo_logo_current" style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.3rem;"></div>
          </div>
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Update Signboard Photo</label>
            <input type="file" name="edit_shop_board_photo" accept="image/*" style="width: 100%; font-size: 0.8rem;">
            <div id="eo_board_current" style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.3rem;"></div>
          </div>
        </div>
      </div>

      <!-- TAB 3: BANKING & GST -->
      <div id="editTabSec3" style="display: none;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Bank Name *</label>
            <input type="text" id="eo_bank_name" name="bank_name" required class="form-control" style="width: 100%;">
          </div>
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Account Number *</label>
            <input type="text" id="eo_bank_account" name="bank_account" required class="form-control" style="width: 100%;">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">IFSC Code *</label>
            <input type="text" id="eo_ifsc_code" name="ifsc_code" required class="form-control" style="width: 100%;">
          </div>
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Account Holder Name</label>
            <input type="text" id="eo_account_holder" name="account_holder" class="form-control" style="width: 100%;">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">UPI ID</label>
            <input type="text" id="eo_upi_id" name="upi_id" class="form-control" style="width: 100%;">
          </div>
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">GSTIN Number</label>
            <input type="text" id="eo_gst_number" name="gst_number" class="form-control" style="width: 100%;">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; background: var(--bg-input); padding: 1rem; border-radius: 10px; border: 1px solid var(--border-color);">
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Trade License / Udyam Number</label>
            <input type="text" id="eo_business_proof_number" name="business_proof_number" class="form-control" style="width: 100%; margin-bottom: 0.5rem;">
            <label class="form-label" style="display: block; font-size: 0.75rem; color: var(--text-secondary);">Re-upload Certificate</label>
            <input type="file" name="edit_business_proof_photo" accept="image/*,.pdf" style="width: 100%; font-size: 0.8rem;">
          </div>
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Re-upload Bank Cheque / Passbook</label>
            <input type="file" name="edit_bank_proof_photo" accept="image/*,.pdf" style="width: 100%; font-size: 0.8rem; margin-top: 0.3rem;">
            <div id="eo_bank_proof_current" style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.3rem;"></div>
          </div>
        </div>
      </div>

      <!-- TAB 4: STATUS & SUBSCRIPTION -->
      <div id="editTabSec4" style="display: none;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.25rem;">
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Admin Verification Status</label>
            <select id="eo_verification_status" name="verification_status" class="form-control" style="width: 100%;">
              <option value="APPROVED">APPROVED (Live on DhobiPro)</option>
              <option value="PENDING">PENDING (Verification Queue)</option>
              <option value="REJECTED">REJECTED (Application Denied)</option>
            </select>
          </div>
          <div>
            <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Account Operational Status</label>
            <select id="eo_account_status" name="account_status" class="form-control" style="width: 100%;">
              <option value="ACTIVE">ACTIVE (Open for Customer Orders)</option>
              <option value="INACTIVE">INACTIVE (Temporarily Closed)</option>
              <option value="SUSPENDED">SUSPENDED (Admin Restricted)</option>
            </select>
          </div>
        </div>

        <div>
          <label class="form-label" style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Subscription Plan Tier</label>
          <select id="eo_subscription_plan" name="subscription_plan" class="form-control" style="width: 100%;">
            <option value="Starter">Starter (15% Commission / Pay As You Go)</option>
            <option value="Silver Pro">Silver Pro (₹999/mo • 10% Commission)</option>
            <option value="Gold Business">Gold Business (₹1999/mo • 8% Commission)</option>
            <option value="Platinum Max">Platinum Enterprise (₹3999/mo • 5% Commission)</option>
          </select>
        </div>
      </div>

      <!-- Modal Footer inside Form -->
      <div style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('editOwnerModal')" class="btn btn-secondary" style="font-weight: 700;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); border: none; color: #FFF; font-weight: 800; padding: 0.65rem 1.6rem; border-radius: 8px; box-shadow: 0 4px 14px rgba(129,98,238,0.4);">
          Save All Changes
        </button>
      </div>
    </form>
  </div>
</div>

<!-- ========================================================================= -->
<!-- MODAL 2: INSPECT LAUNDRY & REQUEST MISSING DOCUMENTS                     -->
<!-- ========================================================================= -->
<div id="inspectOwnerModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); align-items: center; justify-content: center; z-index: 99999; padding: 1.5rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 740px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.4); color: var(--text-primary);">
    <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.15);">
      <div>
        <h3 id="inspectOwnerTitle" style="font-size: 1.2rem; font-weight: 800; margin: 0; color: var(--brand-purple);">
          Laundry Shop Inspection
        </h3>
        <p id="inspectOwnerSubtitle" style="font-size: 0.76rem; color: var(--text-muted); margin: 0.2rem 0 0 0;">
          Inspection details
        </p>
      </div>
      <button type="button" onclick="closeModal('inspectOwnerModal')" style="background: var(--bg-input); border: none; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted);">✕</button>
    </div>

    <div id="inspectOwnerBody" style="flex: 1; overflow-y: auto; padding: 1.5rem;">
      <!-- Filled dynamically by JavaScript -->
    </div>

    <div style="padding: 1rem 1.5rem; border-top: 1px solid var(--border-color); background: rgba(0,0,0,0.15); display: flex; justify-content: space-between; align-items: center;">
      <button type="button" onclick="closeModal('inspectOwnerModal')" class="btn btn-secondary" style="font-weight: 700;">Close</button>
      <div id="inspectOwnerActions" style="display: flex; gap: 0.6rem; align-items: center;">
        <!-- Filled dynamically -->
      </div>
    </div>
  </div>
</div>

<!-- ========================================================================= -->
<!-- MODAL 3: REQUEST MISSING DOCUMENTS POPUP                                  -->
<!-- ========================================================================= -->
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
  let currentEditTab = 1;

  function switchEditTab(tab) {
    currentEditTab = tab;
    for (let i = 1; i <= 4; i++) {
      const sec = document.getElementById('editTabSec' + i);
      const btn = document.getElementById('editTabBtn' + i);
      if (sec) sec.style.display = (i === tab) ? 'block' : 'none';
      if (btn) {
        if (i === tab) {
          btn.style.background = 'rgba(129,98,238,0.12)';
          btn.style.borderBottom = '3px solid #8162EE';
          btn.style.color = '#8162EE';
          btn.style.fontWeight = '800';
        } else {
          btn.style.background = 'transparent';
          btn.style.borderBottom = '3px solid transparent';
          btn.style.color = 'var(--text-muted)';
          btn.style.fontWeight = '600';
        }
      }
    }
  }

  function openEditOwnerModal(o) {
    const sId = o.id || o.shop_id || '';
    const sName = o.shopName || o.name || o.shop_name || '';
    const oName = o.ownerName || o.owner_name || '';

    document.getElementById('editOwnerModalTitle').innerText = `Edit: ${sName} (${oName})`;
    document.getElementById('edit_shop_id').value = sId;

    // Tab 1: Owner Info
    document.getElementById('eo_owner_name').value = oName;
    document.getElementById('eo_phone').value = o.phone || o.mobile_number || '';
    document.getElementById('eo_email').value = o.email || '';
    document.getElementById('eo_password').value = o.password || 'Dhobi@4736';
    document.getElementById('eo_id_proof_number').value = o.idProofNumber || o.id_proof_number || '';

    // Tab 2: Shop Details
    document.getElementById('eo_shop_name').value = sName;
    document.getElementById('eo_shop_phone').value = o.shop_phone || o.phone || '';
    document.getElementById('eo_address').value = o.address || '';
    document.getElementById('eo_city').value = o.city || 'Pune';
    document.getElementById('eo_pincode').value = o.pincode || '411057';
    document.getElementById('eo_pickup_radius_km').value = o.pickupRadiusKm || o.pickup_radius_km || 8;
    document.getElementById('eo_working_hours').value = o.workingHours || o.working_hours || '08:00 AM - 09:30 PM';

    // Tab 3: Banking & GST
    document.getElementById('eo_bank_name').value = o.bankName || o.bank_name || 'HDFC Bank';
    document.getElementById('eo_bank_account').value = o.bankAccount || o.bank_account || '';
    document.getElementById('eo_ifsc_code').value = o.ifscCode || o.ifsc_code || 'HDFC0001234';
    document.getElementById('eo_account_holder').value = o.accountHolder || o.account_holder || oName;
    document.getElementById('eo_upi_id').value = o.upiId || o.upi_id || '';
    document.getElementById('eo_gst_number').value = o.gstNumber || o.gst_number || '';
    document.getElementById('eo_business_proof_number').value = o.businessProofNumber || o.business_proof_number || '';

    // Tab 4: Status
    document.getElementById('eo_verification_status').value = o.verificationStatus || o.verification_status || 'APPROVED';
    document.getElementById('eo_account_status').value = o.accountStatus || o.status || 'ACTIVE';
    document.getElementById('eo_subscription_plan').value = o.subscriptionPlan || o.subscription_plan || 'Starter';

    switchEditTab(1);
    openModal('editOwnerModal');
  }

  function viewOwnerDetails(o) {
    const sId = o.id || o.shop_id || '';
    const sName = o.shopName || o.name || o.shop_name || 'Laundry Shop';
    const oName = o.ownerName || o.owner_name || 'Partner Owner';
    const phone = o.phone || 'N/A';
    const email = o.email || 'partner@dhobipro.com';
    const city = o.city || 'Pune';
    const addr = o.address || 'Pune, Maharashtra';
    const gst = o.gstNumber || o.gst_number || '27AABCU9603R1ZM';
    const bank = o.bankName || o.bank_name || 'HDFC Bank';
    const acc = o.bankAccount || o.bank_account || '50100987654321';
    const ifsc = o.ifscCode || o.ifsc_code || 'HDFC0001234';
    const upi = o.upiId || o.upi_id || '8600692767@hdfcbank';

    const aadhaarImg = o.idProofPhoto || o.id_proof_photo || '';
    const udyamImg = o.businessProofPhoto || o.business_proof_photo || '';
    const bankImg = o.bankProofPhoto || o.bank_proof_photo || '';
    const boardImg = o.shopBoardPhoto || o.shop_board_photo || '';

    document.getElementById('inspectOwnerTitle').innerText = `${sName} • Inspection`;
    document.getElementById('inspectOwnerSubtitle').innerText = `Owner: ${oName} • Shop ID: #${sId}`;

    document.getElementById('inspectOwnerBody').innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        <!-- Contact & Business Profile -->
        <div style="background: var(--bg-input); padding: 1.1rem; border-radius: 12px; border: 1px solid var(--border-color);">
          <h4 style="margin: 0 0 0.75rem 0; color: #8162EE; font-size: 0.95rem; font-weight: 800;">
            🏬 Business &amp; Owner Profile
          </h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; font-size: 0.85rem;">
            <div><span style="color: var(--text-muted);">Owner:</span> <strong>${oName}</strong></div>
            <div><span style="color: var(--text-muted);">Mobile:</span> <strong>${phone}</strong></div>
            <div><span style="color: var(--text-muted);">Email:</span> <strong>${email}</strong></div>
            <div><span style="color: var(--text-muted);">Serviceable City:</span> <strong>📍 ${city}</strong></div>
            <div style="grid-column: 1 / -1;"><span style="color: var(--text-muted);">Premise Address:</span> <strong>${addr}</strong></div>
          </div>
        </div>

        <!-- Banking & GST Credentials -->
        <div style="background: var(--bg-input); padding: 1.1rem; border-radius: 12px; border: 1px solid var(--border-color);">
          <h4 style="margin: 0 0 0.75rem 0; color: #10B981; font-size: 0.95rem; font-weight: 800;">
            🏦 Commercial Taxation &amp; Banking Credentials
          </h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; font-size: 0.85rem;">
            <div><span style="color: var(--text-muted);">GSTIN:</span> <strong style="color: var(--brand-purple);">${gst}</strong></div>
            <div><span style="color: var(--text-muted);">Bank Name:</span> <strong>${bank}</strong></div>
            <div><span style="color: var(--text-muted);">Account Number:</span> <strong>${acc}</strong></div>
            <div><span style="color: var(--text-muted);">IFSC Code:</span> <strong>${ifsc}</strong></div>
            <div><span style="color: var(--text-muted);">UPI ID:</span> <strong>${upi}</strong></div>
            <div><span style="color: var(--text-muted);">Status:</span> <strong style="color: #10B981;">Active ✓</strong></div>
          </div>
        </div>

        <!-- Uploaded KYC Proofs -->
        <div style="background: var(--bg-input); padding: 1.1rem; border-radius: 12px; border: 1px solid var(--border-color);">
          <h4 style="margin: 0 0 0.85rem 0; color: #D97706; font-size: 0.95rem; font-weight: 800;">
            📄 Uploaded KYC &amp; Outlet Compliance Proofs
          </h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
            <div style="background: var(--bg-card); padding: 0.85rem; border-radius: 10px; border: 1px solid var(--border-color);">
              <div style="font-weight: 800; font-size: 0.85rem;">Aadhaar / ID Proof</div>
              ${aadhaarImg ? `<img src="${aadhaarImg}" style="width: 100%; height: 90px; object-fit: cover; border-radius: 6px; margin-top: 0.5rem; background: #fff;">` : `<span style="display: block; margin-top: 0.5rem; font-size: 0.75rem; color: #EF4444; font-weight: 700;">⚠️ Document Not Uploaded</span>`}
            </div>

            <div style="background: var(--bg-card); padding: 0.85rem; border-radius: 10px; border: 1px solid var(--border-color);">
              <div style="font-weight: 800; font-size: 0.85rem;">Trade License / MSME</div>
              ${udyamImg ? `<img src="${udyamImg}" style="width: 100%; height: 90px; object-fit: cover; border-radius: 6px; margin-top: 0.5rem; background: #fff;">` : `<span style="display: block; margin-top: 0.5rem; font-size: 0.75rem; color: #EF4444; font-weight: 700;">⚠️ Document Not Uploaded</span>`}
            </div>

            <div style="background: var(--bg-card); padding: 0.85rem; border-radius: 10px; border: 1px solid var(--border-color);">
              <div style="font-weight: 800; font-size: 0.85rem;">Bank Passbook / Cheque</div>
              ${bankImg ? `<img src="${bankImg}" style="width: 100%; height: 90px; object-fit: cover; border-radius: 6px; margin-top: 0.5rem; background: #fff;">` : `<span style="display: block; margin-top: 0.5rem; font-size: 0.75rem; color: #EF4444; font-weight: 700;">⚠️ Document Not Uploaded</span>`}
            </div>

            <div style="background: var(--bg-card); padding: 0.85rem; border-radius: 10px; border: 1px solid var(--border-color);">
              <div style="font-weight: 800; font-size: 0.85rem;">Storefront Signboard</div>
              ${boardImg ? `<img src="${boardImg}" style="width: 100%; height: 90px; object-fit: cover; border-radius: 6px; margin-top: 0.5rem; background: #fff;">` : `<span style="display: block; margin-top: 0.5rem; font-size: 0.75rem; color: #EF4444; font-weight: 700;">⚠️ Photo Not Uploaded</span>`}
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('inspectOwnerActions').innerHTML = `
      <button type="button" onclick="closeModal('inspectOwnerModal'); openRequestDocsModal('${sId}', '${encodeURIComponent(sName)}')" class="btn btn-warning" style="background: #F59E0B; color: #FFF; font-weight: 700; border: none; display: inline-flex; align-items: center; gap: 0.35rem;">
        <i data-lucide="file-question" style="width: 15px; height: 15px;"></i> Request Missing Docs
      </button>
      <button type="button" onclick="closeModal('inspectOwnerModal'); openEditOwnerModal(${JSON.stringify(o).replace(/"/g, '&quot;')})" class="btn btn-primary" style="font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;">
        <i data-lucide="edit-3" style="width: 15px; height: 15px;"></i> Edit Info
      </button>
    `;

    openModal('inspectOwnerModal');
    if (window.lucide) lucide.createIcons();
  }

  function openRequestDocsModal(shopId, shopName) {
    const sName = decodeURIComponent(shopName || 'Laundry Shop');
    document.getElementById('reqDocShopId').value = shopId;
    document.getElementById('reqDocShopName').value = sName;
    document.getElementById('reqDocShopSubtitle').innerText = `Notify ${sName} (#${shopId}) to re-upload documents`;
    openModal('requestDocModal');
    if (window.lucide) lucide.createIcons();
  }
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
