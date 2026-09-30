<?php
$c = file_get_contents('c:/CODEXXA_PROJECT/Dhobi_app/admin_panel_php/laundries/index.php');
$htmlStart = strpos($c, '<div id="onboardModal"');
$htmlEnd = strpos($c, '<!-- Modal: Edit Shop Details -->', $htmlStart);
$html = substr($c, $htmlStart, $htmlEnd - $htmlStart);

$jsStart = strpos($c, 'let currentOnboardStep = 1;');
$jsEnd = strpos($c, 'function openDocPreview', $jsStart); // This is where modal JS ends
$js = substr($c, $jsStart, $jsEnd - $jsStart);

$html = preg_replace('/style="display: none;/', 'style="display: flex;', $html, 1);
$html = str_replace("onclick=\"closeModal('onboardModal')\"", "onclick=\"window.location.href='login.php'\"", $html);

// We also need the openModal and closeModal functions
$modalFunctions = "
function openModal(id) {
  const el = document.getElementById(id);
  if(el) el.style.display = 'flex';
}
function closeModal(id) {
  const el = document.getElementById(id);
  if(el) el.style.display = 'none';
}
";
$js = $modalFunctions . "\n" . $js;

$html = preg_replace('/style="display: flex; position: fixed; inset: 0; background: rgba\(15, 23, 42, 0\.75\); backdrop-filter: blur\(8px\); align-items: center; justify-content: center; z-index: 99999; padding: 1\.5rem;"/', 'style="display: flex; position: fixed; inset: 0; background: transparent; align-items: center; justify-content: center; z-index: 99999; padding: 1.5rem;"', $html);

// Ensure new registrations default to PENDING status
$html = str_replace('<input type="hidden" id="ob_verification_status" name="verification_status" value="APPROVED">', '<input type="hidden" id="ob_verification_status" name="verification_status" value="PENDING">', $html);


$top = <<<'EOT'
<?php
require_once __DIR__ . '/../config/api.php';
require_once __DIR__ . '/../includes/auth.php';

if (isLoggedIn()) {
    header('Location: ' . ADMIN_BASE_URL . '/dashboard/index.php');
    exit;
}

$error = null;
$success = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_SESSION['custom_shops'])) {
        $_SESSION['custom_shops'] = [];
    }
    
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
    $logoPhoto = $handleUpload('logo_photo', 'logo');
    $udyamPhoto = $handleUpload('business_proof_photo', 'udyam');
    $bankPhoto = $handleUpload('bank_proof_photo', 'bank');
    $signboardPhoto = $handleUpload('shop_board_photo', 'signboard');

    $newId = strval(mt_rand(100, 999));
    $newShop = [
        'id' => $newId,
        'shopName' => $_POST['shop_name'] ?? 'New Laundry Shop',
        'name' => $_POST['shop_name'] ?? 'New Laundry Shop',
        'ownerName' => $_POST['owner_name'] ?? 'Owner Name',
        'owner_name' => $_POST['owner_name'] ?? 'Owner Name',
        'phone' => $_POST['phone'] ?? '',
        'email' => $_POST['email'] ?? '',
        'password' => $_POST['password'] ?? '',
        'city' => $_POST['city'] ?? 'City',
        'address' => $_POST['address'] ?? '',
        'verificationStatus' => $_POST['verification_status'] ?? 'PENDING',
        'verification_status' => $_POST['verification_status'] ?? 'PENDING',
        'accountStatus' => $_POST['account_status'] ?? 'ACTIVE',
        'status' => $_POST['account_status'] ?? 'ACTIVE',
        'pickupRadiusKm' => $_POST['pickup_radius_km'] ?? 5,
        'workingHours' => $_POST['working_hours'] ?? '08:00 AM - 09:30 PM',
        'totalOrders' => 0,
        'revenue' => 0,
        'rating' => 0,
        'joined_at' => date('Y-m-d H:i:s'),
        'logo_url' => $logoPhoto,
        'logo' => $logoPhoto,
        'cover_url' => '',
        'idProofPhoto' => $idProofPhoto,
        'idProofNumber' => $_POST['id_proof_number'] ?? '',
        'businessProofNumber' => '',
        'businessProofPhoto' => $udyamPhoto,
        'bankProofPhoto' => $bankPhoto,
        'shopBoardPhoto' => $signboardPhoto,
        'bankName' => $_POST['bank_name'] ?? '',
        'bankAccount' => $_POST['bank_account'] ?? '',
        'ifscCode' => $_POST['ifsc_code'] ?? '',
        'upiId' => $_POST['upi_id'] ?? '',
        'gstNumber' => $_POST['gst_number'] ?? '',
        'latitude' => $_POST['latitude'] ?? 18.5590,
        'longitude' => $_POST['longitude'] ?? 73.7868,
    ];
    
    array_unshift($_SESSION['custom_shops'], $newShop);
    $success = true;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Partner Registration | DhobiPro</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="<?= ADMIN_BASE_URL ?>/assets/css/style.css">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body {
        margin: 0;
        font-family: 'Plus Jakarta Sans', sans-serif;
        background: url('https://images.unsplash.com/photo-1545173168-9f1947eebb7f?q=80&w=2071&auto=format&fit=crop') center/cover no-repeat;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    body::before {
        content: '';
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.75);
        backdrop-filter: blur(8px);
        z-index: 0;
    }
    :root {
        --bg-card: #FFFFFF;
        --border-color: #E2E8F0;
        --text-primary: #0F172A;
        --text-secondary: #334155;
        --text-muted: #64748B;
        --bg-input: #F8FAFC;
    }
    .form-control {
        width: 100%; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-input); font-size: 0.9rem; font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box;
    }
    .form-control:focus { outline: none; border-color: #8162EE; box-shadow: 0 0 0 3px rgba(129, 98, 238, 0.2); }
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      padding: 1.5rem;
    }
  </style>
</head>
<body>
<div style="position: relative; z-index: 1; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
      <?php if ($success): ?>
        <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid rgba(129,98,238,0.3); width: 100%; max-width: 600px; padding: 3rem; text-align: center; box-shadow: 0 25px 50px rgba(0,0,0,0.6);">
            <div style="background: rgba(16, 185, 129, 0.1); width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                <i data-lucide="check" style="color:#10B981; width:40px; height:40px; stroke-width: 3px;"></i>
            </div>
            <h2 style="margin-bottom:0.5rem; color:#0F172A; font-weight: 900; font-size: 1.8rem;">Application Submitted!</h2>
            <p style="color:#64748B; font-size: 0.95rem; line-height: 1.5; margin-bottom: 2rem;">Thank you for partnering with DhobiPro. Your application is under review. You will be notified via email once approved by the Admin.</p>
            <a href="login.php" style="background: #8162EE; color: #FFF; padding: 0.8rem 2rem; border-radius: 8px; font-weight: 800; text-decoration: none; display: inline-block;">Go back to Login</a>
        </div>
      <?php else: ?>
EOT;

$bottom = <<<'EOT'
      <?php endif; ?>
</div>
<script>
EOT;

$end = <<<'EOT'
if (window.lucide) window.lucide.createIcons();
</script>
</body>
</html>
EOT;

$final = $top . "\n" . $html . "\n" . $bottom . "\n" . $js . "\n" . $end;
file_put_contents('c:/CODEXXA_PROJECT/Dhobi_app/admin_panel_php/auth/register.php', $final);
