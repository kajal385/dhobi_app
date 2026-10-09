<?php
$pageTitle = 'Verification Queue';
// Include API client and auth BEFORE processing forms (to avoid header already sent)
require_once __DIR__ . '/../includes/api-client.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/db.php';

// Form actions
$actionMsg = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $shopId = $_POST['shop_id'] ?? '';
    $reason = $_POST['reason'] ?? '';

    if ($action === 'approve' && $shopId) {
        if (!isset($_SESSION['approved_shop_ids'])) {
            $_SESSION['approved_shop_ids'] = [];
        }
        $_SESSION['approved_shop_ids'][strval($shopId)] = true;

        if (!empty($_SESSION['custom_shops'])) {
            foreach ($_SESSION['custom_shops'] as &$cs) {
                if (strval($cs['id'] ?? '') === strval($shopId)) {
                    $cs['verificationStatus'] = 'APPROVED';
                    $cs['verification_status'] = 'APPROVED';
                    $cs['status'] = 'ACTIVE';
                    $cs['accountStatus'] = 'ACTIVE';
                    $cs['is_verified'] = 1;
                    break;
                }
            }
            unset($cs);
        }
        apiPost("/admin/laundries/{$shopId}/approve");
        $actionMsg = "Shop #{$shopId} has been successfully approved and marked verified!";
    } elseif ($action === 'reject' && $shopId) {
        apiPost("/admin/laundries/{$shopId}/reject", ['reason' => $reason]);
        $actionMsg = "Shop #{$shopId} verification was rejected.";
    } elseif ($action === 'request_missing_docs' && $shopId) {
        $docs = $_POST['docs'] ?? [];
        $requestNote = trim($_POST['request_note'] ?? '');
        $shopName = trim($_POST['shop_name'] ?? "Shop #{$shopId}");
        
        if (!isset($_SESSION['doc_requests'])) {
            $_SESSION['doc_requests'] = [];
        }
        $_SESSION['doc_requests'][$shopId] = [
            'shop_id' => $shopId,
            'shop_name' => $shopName,
            'requested_docs' => $docs,
            'note' => $requestNote,
            'requested_at' => date('Y-m-d H:i:s'),
            'status' => 'PENDING_UPLOAD',
        ];
        $actionMsg = "Compliance document request sent to {$shopName}. The laundry owner will see this notification on their verification screen.";
    } elseif ($action === 'upload_missing_doc' && $shopId) {
        $uploadDir = __DIR__ . '/../uploads/documents/';
        if (!is_dir($uploadDir)) {
            @mkdir($uploadDir, 0777, true);
        }
        
        $uploadedCount = 0;
        $apiUpdatePayload = [];
        
        if (!empty($_FILES['doc_files']['name']) && is_array($_FILES['doc_files']['name'])) {
            foreach ($_FILES['doc_files']['name'] as $docField => $origName) {
                if ($_FILES['doc_files']['error'][$docField] === UPLOAD_ERR_OK) {
                    $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION)) ?: 'jpg';
                    $fName = 'resubmit_' . $docField . '_' . time() . '_' . mt_rand(1000, 9999) . '.' . $ext;
                    
                    if (move_uploaded_file($_FILES['doc_files']['tmp_name'][$docField], $uploadDir . $fName)) {
                        $fileUrl = ADMIN_BASE_URL . '/uploads/documents/' . $fName;
                        $uploadedCount++;
                        $apiUpdatePayload[$docField] = $fileUrl;

                        // Sync to Laravel public upload directory
                        $laravelUploadDir = dirname(__DIR__, 2) . '/backend_laravel/public/uploads/documents/';
                        if (is_dir($laravelUploadDir)) {
                            @copy($uploadDir . $fName, $laravelUploadDir . $fName);
                        }

                        // Direct update to dhobi_db
                        try {
                            $db = getDb();
                            if ($db) {
                                $st = $db->prepare("UPDATE laundry_shops SET {$docField} = :url, updated_at = NOW() WHERE id = :id");
                                $st->execute([':url' => $fileUrl, ':id' => $shopId]);

                                $docTypeMap = [
                                    'id_proof_photo'       => 'AADHAAR',
                                    'business_proof_photo' => 'UDYAM_LICENSE',
                                    'bank_proof_photo'     => 'BANK_PROOF',
                                    'shop_board_photo'     => 'STORE_SIGNBOARD',
                                    'logo_url'             => 'SHOP_LOGO',
                                    'cover_url'            => 'SHOP_COVER',
                                ];
                                $docType = $docTypeMap[$docField] ?? strtoupper($docField);

                                $checkDoc = $db->prepare("SELECT id FROM laundry_documents WHERE laundry_id = :lid AND document_type = :dtype LIMIT 1");
                                $checkDoc->execute([':lid' => $shopId, ':dtype' => $docType]);
                                $existingDocId = $checkDoc->fetchColumn();

                                if ($existingDocId) {
                                    $upDoc = $db->prepare("UPDATE laundry_documents SET file_path = :path, verification_status = 'PENDING', uploaded_at = NOW(), updated_at = NOW() WHERE id = :id");
                                    $upDoc->execute([':path' => $fileUrl, ':id' => $existingDocId]);
                                } else {
                                    $inDoc = $db->prepare("INSERT INTO laundry_documents (laundry_id, document_type, document_number, file_path, verification_status, uploaded_at, created_at, updated_at) VALUES (:lid, :dtype, 'REPLACED_DOC', :path, 'PENDING', NOW(), NOW(), NOW())");
                                    $inDoc->execute([':lid' => $shopId, ':dtype' => $docType, ':path' => $fileUrl]);
                                }
                            }
                        } catch (\Throwable $e) {
                            error_log("DB update error on upload_missing_doc: " . $e->getMessage());
                        }
                        
                        if (!empty($_SESSION['custom_shops'])) {
                            foreach ($_SESSION['custom_shops'] as &$cs) {
                                if (strval($cs['id'] ?? '') === strval($shopId)) {
                                    $cs[$docField] = $fileUrl;
                                    if ($docField === 'id_proof_photo') $cs['idProofPhoto'] = $fileUrl;
                                    if ($docField === 'business_proof_photo') $cs['businessProofPhoto'] = $fileUrl;
                                    if ($docField === 'bank_proof_photo') $cs['bankProofPhoto'] = $fileUrl;
                                    if ($docField === 'shop_board_photo') $cs['shopBoardPhoto'] = $fileUrl;
                                    if ($docField === 'logo_url') $cs['logo_url'] = $fileUrl;
                                    if ($docField === 'cover_url') $cs['cover_url'] = $fileUrl;
                                    break;
                                }
                            }
                            unset($cs);
                        }
                        
                        if (isset($_SESSION['doc_requests'][$shopId])) {
                            if (!isset($_SESSION['doc_requests'][$shopId]['uploaded_files'])) {
                                $_SESSION['doc_requests'][$shopId]['uploaded_files'] = [];
                            }
                            $_SESSION['doc_requests'][$shopId]['uploaded_files'][$docField] = $fileUrl;
                        }
                    }
                }
            }
            
            if ($uploadedCount > 0) {
                // Sync newly uploaded document URLs to the Laravel database
                if (isLaundryOwner()) {
                    apiPut('/owner/profile', $apiUpdatePayload);
                } else {
                    apiPut("/admin/laundries/{$shopId}", $apiUpdatePayload);
                }

                if (isset($_SESSION['doc_requests'][$shopId])) {
                    $_SESSION['doc_requests'][$shopId]['status'] = 'SUBMITTED';
                    $_SESSION['doc_requests'][$shopId]['submitted_at'] = date('Y-m-d H:i:s');
                }
                
                // Stay on verifications.php for laundry owners after upload
                if (isLaundryOwner()) {
                    header('Location: ' . ADMIN_BASE_URL . '/laundries/verifications.php');
                    exit;
                }
                
                $actionMsg = "{$uploadedCount} requested document(s) uploaded successfully! Submitted to Admin for compliance verification.";
            }
        }
    } elseif ($action === 'replace_document' && $shopId) {
        $docField = trim($_POST['doc_field'] ?? '');
        $allowedFields = [
            'id_proof_photo',
            'business_proof_photo',
            'bank_proof_photo',
            'shop_board_photo',
            'logo_url',
            'cover_url',
        ];

        if (in_array($docField, $allowedFields, true) && !empty($_FILES['new_document_file']['name']) && $_FILES['new_document_file']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../uploads/documents/';
            if (!is_dir($uploadDir)) {
                @mkdir($uploadDir, 0777, true);
            }

            $origName = $_FILES['new_document_file']['name'];
            $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION)) ?: 'jpg';
            $fName = 'replaced_' . $docField . '_shop_' . $shopId . '_' . time() . '.' . $ext;
            $destPath = $uploadDir . $fName;

            if (move_uploaded_file($_FILES['new_document_file']['tmp_name'], $destPath)) {
                $fileUrl = ADMIN_BASE_URL . '/uploads/documents/' . $fName;

                // Sync file to Laravel public directory
                $laravelUploadDir = dirname(__DIR__, 2) . '/backend_laravel/public/uploads/documents/';
                if (is_dir($laravelUploadDir)) {
                    @copy($destPath, $laravelUploadDir . $fName);
                }

                // 1. Direct MySQL update in dhobi_db
                try {
                    $db = getDb();
                    if ($db) {
                        $st = $db->prepare("UPDATE laundry_shops SET {$docField} = :url, updated_at = NOW() WHERE id = :id");
                        $st->execute([':url' => $fileUrl, ':id' => $shopId]);

                        $docTypeMap = [
                            'id_proof_photo'       => 'AADHAAR',
                            'business_proof_photo' => 'UDYAM_LICENSE',
                            'bank_proof_photo'     => 'BANK_PROOF',
                            'shop_board_photo'     => 'STORE_SIGNBOARD',
                            'logo_url'             => 'SHOP_LOGO',
                            'cover_url'            => 'SHOP_COVER',
                        ];
                        $docType = $docTypeMap[$docField] ?? strtoupper($docField);

                        // Upsert in laundry_documents
                        $checkDoc = $db->prepare("SELECT id FROM laundry_documents WHERE laundry_id = :lid AND document_type = :dtype LIMIT 1");
                        $checkDoc->execute([':lid' => $shopId, ':dtype' => $docType]);
                        $existingDocId = $checkDoc->fetchColumn();

                        if ($existingDocId) {
                            $upDoc = $db->prepare("UPDATE laundry_documents SET file_path = :path, verification_status = 'PENDING', uploaded_at = NOW(), updated_at = NOW() WHERE id = :id");
                            $upDoc->execute([':path' => $fileUrl, ':id' => $existingDocId]);
                        } else {
                            $inDoc = $db->prepare("INSERT INTO laundry_documents (laundry_id, document_type, document_number, file_path, verification_status, uploaded_at, created_at, updated_at) VALUES (:lid, :dtype, 'REPLACED_DOC', :path, 'PENDING', NOW(), NOW(), NOW())");
                            $inDoc->execute([':lid' => $shopId, ':dtype' => $docType, ':path' => $fileUrl]);
                        }
                    }
                } catch (\Throwable $e) {
                    error_log("DB update error on replace_document: " . $e->getMessage());
                }

                // 2. Sync to Laravel REST API
                try {
                    apiPut("/admin/laundries/{$shopId}", [$docField => $fileUrl]);
                } catch (\Throwable $e) {}

                // 3. Update session storage
                if (!empty($_SESSION['custom_shops'])) {
                    foreach ($_SESSION['custom_shops'] as &$cs) {
                        if (strval($cs['id'] ?? '') === strval($shopId)) {
                            $cs[$docField] = $fileUrl;
                            if ($docField === 'id_proof_photo') $cs['idProofPhoto'] = $fileUrl;
                            if ($docField === 'business_proof_photo') $cs['businessProofPhoto'] = $fileUrl;
                            if ($docField === 'bank_proof_photo') $cs['bankProofPhoto'] = $fileUrl;
                            if ($docField === 'shop_board_photo') $cs['shopBoardPhoto'] = $fileUrl;
                            if ($docField === 'logo_url') $cs['logo_url'] = $fileUrl;
                            if ($docField === 'cover_url') $cs['cover_url'] = $fileUrl;
                            break;
                        }
                    }
                    unset($cs);
                }

                $niceName = ucwords(str_replace('_', ' ', $docField));
                $actionMsg = "Successfully replaced {$niceName} for Shop #{$shopId}! New document stored in database.";
            } else {
                $actionMsg = "Failed to upload replacement document. Please try again.";
            }
        }
    }
}

require_once __DIR__ . '/../includes/header.php';

// Fetch verification requests
$res = apiGet('/admin/verifications');
$queue = apiExtractList($res);

// Prepend session custom shops safely to prevent duplicates
if (!empty($_SESSION['custom_shops'])) {
    $existingEmails = array_map(function($l) { return strtolower(trim($l['email'] ?? '')); }, $queue);
    $existingPhones = array_map(function($l) { return trim($l['phone'] ?? ''); }, $queue);

    foreach ($_SESSION['custom_shops'] as $cs) {
        $vStatus = strtoupper($cs['verificationStatus'] ?? $cs['verification_status'] ?? 'APPROVED');
        if ($vStatus === 'PENDING') {
            $csEmail = strtolower(trim($cs['email'] ?? ''));
            $csPhone = trim($cs['phone'] ?? '');

            $foundIndex = -1;
            foreach ($queue as $idx => $q) {
                $qEmail = strtolower(trim($q['email'] ?? ''));
                $qPhone = trim($q['phone'] ?? '');
                if (($csEmail && $qEmail === $csEmail) || ($csPhone && $qPhone === $csPhone)) {
                    $foundIndex = $idx;
                    break;
                }
            }

            if ($foundIndex !== -1) {
                // Merge session fields into API record
                $queue[$foundIndex]['logo_url'] = !empty($cs['logo_url']) ? $cs['logo_url'] : ($queue[$foundIndex]['logo_url'] ?? '');
                $queue[$foundIndex]['cover_url'] = !empty($cs['cover_url']) ? $cs['cover_url'] : ($queue[$foundIndex]['cover_url'] ?? '');
                $queue[$foundIndex]['idProofPhoto'] = !empty($cs['idProofPhoto']) ? $cs['idProofPhoto'] : ($queue[$foundIndex]['idProofPhoto'] ?? '');
                $queue[$foundIndex]['businessProofPhoto'] = !empty($cs['businessProofPhoto']) ? $cs['businessProofPhoto'] : ($queue[$foundIndex]['businessProofPhoto'] ?? '');
                $queue[$foundIndex]['bankProofPhoto'] = !empty($cs['bankProofPhoto']) ? $cs['bankProofPhoto'] : ($queue[$foundIndex]['bankProofPhoto'] ?? '');
                $queue[$foundIndex]['shopBoardPhoto'] = !empty($cs['shopBoardPhoto']) ? $cs['shopBoardPhoto'] : ($queue[$foundIndex]['shopBoardPhoto'] ?? '');
            } else {
                $queue[] = $cs;
            }
        }
    }
}

// Removed fallback injection because Neha is now seeded directly in api.php's global session array

// Keep genuine documents only - synchronizing directly with dhobi_db
try {
    $db = getDb();
    if ($db) {
        foreach ($queue as &$qItem) {
            $qId = $qItem['id'] ?? $qItem['shop_id'] ?? null;
            if ($qId) {
                $dbShop = $db->query("SELECT id_proof_photo, business_proof_photo, bank_proof_photo, shop_board_photo, logo_url, cover_url FROM laundry_shops WHERE id = " . intval($qId))->fetch();
                if ($dbShop) {
                    if (!empty($dbShop['id_proof_photo'])) $qItem['idProofPhoto'] = $qItem['id_proof_photo'] = $dbShop['id_proof_photo'];
                    if (!empty($dbShop['business_proof_photo'])) $qItem['businessProofPhoto'] = $qItem['business_proof_photo'] = $dbShop['business_proof_photo'];
                    if (!empty($dbShop['bank_proof_photo'])) $qItem['bankProofPhoto'] = $qItem['bank_proof_photo'] = $dbShop['bank_proof_photo'];
                    if (!empty($dbShop['shop_board_photo'])) $qItem['shopBoardPhoto'] = $qItem['shop_board_photo'] = $dbShop['shop_board_photo'];
                    if (!empty($dbShop['logo_url'])) $qItem['logo_url'] = $dbShop['logo_url'];
                    if (!empty($dbShop['cover_url'])) $qItem['cover_url'] = $dbShop['cover_url'];
                }
                $docRows = $db->query("SELECT document_type, file_path FROM laundry_documents WHERE laundry_id = " . intval($qId))->fetchAll();
                foreach ($docRows as $dr) {
                    $dt = strtoupper($dr['document_type']);
                    if (in_array($dt, ['AADHAAR', 'ID_PROOF']) && empty($qItem['idProofPhoto'])) {
                        $qItem['idProofPhoto'] = $qItem['id_proof_photo'] = $dr['file_path'];
                    } elseif (in_array($dt, ['UDYAM_LICENSE', 'BUSINESS_PROOF', 'TRADE_LICENSE']) && empty($qItem['businessProofPhoto'])) {
                        $qItem['businessProofPhoto'] = $qItem['business_proof_photo'] = $dr['file_path'];
                    } elseif (in_array($dt, ['BANK_PROOF', 'BANK_CHEQUE']) && empty($qItem['bankProofPhoto'])) {
                        $qItem['bankProofPhoto'] = $qItem['bank_proof_photo'] = $dr['file_path'];
                    } elseif (in_array($dt, ['STORE_SIGNBOARD', 'SHOP_BOARD']) && empty($qItem['shopBoardPhoto'])) {
                        $qItem['shopBoardPhoto'] = $qItem['shop_board_photo'] = $dr['file_path'];
                    }
                }
            }
        }
        unset($qItem);
    }
} catch (\Throwable $e) {}

foreach ($queue as &$qItem) {
    $qItem['idProofPhoto'] = $qItem['idProofPhoto'] ?? ($qItem['id_proof_photo'] ?? '');
    $qItem['businessProofPhoto'] = $qItem['businessProofPhoto'] ?? ($qItem['business_proof_photo'] ?? '');
    $qItem['bankProofPhoto'] = $qItem['bankProofPhoto'] ?? ($qItem['bank_proof_photo'] ?? '');
    $qItem['shopBoardPhoto'] = $qItem['shopBoardPhoto'] ?? ($qItem['shop_board_photo'] ?? '');
}
unset($qItem);

// STRICT RULE: Verification Queue ONLY shows unverified / pending laundry shops.
// Approved laundry shops MUST NEVER be shown in the verification queue!
$queue = array_values(array_filter($queue, function($item) {
    $sId = strval($item['id'] ?? $item['shop_id'] ?? '');

    // 1. Check session approved records
    if (!empty($_SESSION['approved_shop_ids'][$sId])) {
        return false;
    }

    // 2. Check explicit verification status
    $vStatus = strtoupper(trim($item['verification_status'] ?? $item['verificationStatus'] ?? ''));
    if ($vStatus === 'APPROVED' || $vStatus === 'VERIFIED') {
        return false;
    }

    // 3. Check boolean/integer is_verified flag
    $isVerified = $item['is_verified'] ?? null;
    if ($isVerified === 1 || $isVerified === '1' || $isVerified === true) {
        return false;
    }

    // 4. Check account status
    $accStatus = strtoupper(trim($item['status'] ?? $item['accountStatus'] ?? ''));
    if ($accStatus === 'APPROVED') {
        return false;
    }

    // 5. Cross-check against custom_shops session storage
    if (!empty($_SESSION['custom_shops'])) {
        foreach ($_SESSION['custom_shops'] as $cs) {
            $csId = strval($cs['id'] ?? $cs['shop_id'] ?? '');
            $csEmail = strtolower(trim($cs['email'] ?? ''));
            $itemEmail = strtolower(trim($item['email'] ?? ''));
            $csPhone = trim($cs['phone'] ?? '');
            $itemPhone = trim($item['phone'] ?? '');

            if (($csId && $csId === $sId) || ($csEmail && $itemEmail && $csEmail === $itemEmail) || ($csPhone && $itemPhone && $csPhone === $itemPhone)) {
                $csVStatus = strtoupper(trim($cs['verificationStatus'] ?? $cs['verification_status'] ?? ''));
                if ($csVStatus === 'APPROVED' || $csVStatus === 'VERIFIED' || (!empty($cs['is_verified']) && $cs['is_verified'] == 1)) {
                    return false;
                }
            }
        }
    }

    return true;
}));

// --- ROLE DETECTION ---
$isOwner = isLaundryOwner();
$myShopId   = strval(currentShopId() ?: '30');
$myShopName = strtolower(trim(currentShopName() ?: 'star wash ultra premium'));
$currentUser = currentUser();
$myOwnerEmail = strtolower(trim($currentUser['email'] ?? ''));

// STRICT TENANT ISOLATION: Owner sees ONLY their own shop verification record
if ($isOwner) {
    $queue = array_values(array_filter($queue, function($q) use ($myShopId, $myShopName, $myOwnerEmail) {
        $qId     = strval($q['id'] ?? $q['shop_id'] ?? '');
        $qShop   = strtolower(trim($q['shopName'] ?? $q['name'] ?? $q['shop_name'] ?? ''));
        $qEmail  = strtolower(trim($q['email'] ?? ''));
        if ($myShopId && $qId === $myShopId) return true;
        if ($myOwnerEmail && $qEmail && $qEmail === $myOwnerEmail) return true;
        if ($myShopName !== '' && $qShop !== '' && strpos($qShop, $myShopName) !== false) return true;
        if ($myShopName !== '' && $qShop !== '' && strpos($myShopName, $qShop) !== false) return true;
        return false;
    }));
}
?>

<div style="color: var(--text-primary);">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary); margin: 0;">
        <i data-lucide="shield-check" style="width: 28px; height: 28px; color: #8162EE;"></i>
        <?= $isOwner ? 'My Shop Verification &amp; KYC Status' : 'Laundry Verification Queue' ?>
      </h1>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.2rem; margin-bottom: 0;">
        <?= $isOwner
            ? 'Track your shop\'s compliance status, uploaded KYC documents, and verification progress.'
            : 'Review onboarding compliance, GST certificates, banking proofs, and approve shop listings.' ?>
      </p>
    </div>
  </div>

  <?php if ($actionMsg): ?>
    <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #059669; padding: 0.75rem 1rem; border-radius: 8px; font-weight: 700; font-size: 0.85rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
      <i data-lucide="check-circle" style="width: 18px; height: 18px;"></i> <?= htmlspecialchars($actionMsg) ?>
    </div>
  <?php endif; ?>

  <!-- Missing Compliance Documents Request & Direct Upload Notification (Visible to Owner & Admin) -->
  <?php if (!empty($_SESSION['doc_requests'])): ?>
    <?php foreach ($_SESSION['doc_requests'] as $reqShopId => $dReq): 
        $reqStatus = $dReq['status'] ?? 'PENDING_UPLOAD';
        $isSubmitted = ($reqStatus === 'SUBMITTED');
    ?>
      <div style="background: <?= $isSubmitted ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)' ?>; border: 1.5px solid <?= $isSubmitted ? '#10B981' : '#F59E0B' ?>; border-radius: 14px; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 16px rgba(0,0,0,0.05);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 0.85rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 40px; height: 40px; border-radius: 10px; background: <?= $isSubmitted ? '#10B981' : '#F59E0B' ?>; color: #FFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(245,158,11,0.3);">
              <i data-lucide="<?= $isSubmitted ? 'check-check' : 'alert-triangle' ?>" style="width: 22px; height: 22px;"></i>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <h3 style="font-size: 1.05rem; font-weight: 800; margin: 0; color: <?= $isSubmitted ? '#065F46' : '#92400E' ?>;">
                  <?= $isSubmitted ? 'Document Resubmitted - Awaiting Admin Review' : 'Action Required: Missing Compliance Documents Requested' ?>
                </h3>
                <span class="badge badge-<?= $isSubmitted ? 'success' : 'warning' ?>" style="font-size: 0.72rem; font-weight: 800;">
                  <?= $isSubmitted ? 'SUBMITTED FOR VERIFICATION' : 'PENDING UPLOAD' ?>
                </span>
              </div>
              <p style="margin: 0.2rem 0 0 0; font-size: 0.82rem; color: var(--text-secondary);">
                Shop: <strong><?= htmlspecialchars($dReq['shop_name'] ?? "Shop #{$reqShopId}") ?></strong> (Shop ID: #<?= htmlspecialchars($reqShopId) ?>) • Requested on <?= htmlspecialchars($dReq['requested_at'] ?? date('Y-m-d')) ?>
              </p>
            </div>
          </div>
        </div>

        <!-- Requested Documents List -->
        <div style="margin-bottom: 0.85rem;">
          <div style="font-size: 0.76rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.4rem;">Requested Compliance Items:</div>
          <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
            <?php foreach ($dReq['requested_docs'] ?? [] as $item): 
                $label = 'Document';
                if ($item === 'id_proof_photo') $label = 'Owner Aadhaar / PAN Proof';
                if ($item === 'business_proof_photo') $label = 'Trade License / Udyam Certificate';
                if ($item === 'bank_proof_photo') $label = 'Bank Account Cheque / Passbook';
                if ($item === 'shop_board_photo') $label = 'Storefront Signboard Photo';
            ?>
              <span style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); color: #B45309; padding: 0.25rem 0.65rem; border-radius: 6px; font-size: 0.78rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;">
                📄 <?= htmlspecialchars($label) ?>
              </span>
            <?php endforeach; ?>
          </div>
        </div>

        <?php if (!empty($dReq['note'])): ?>
          <div style="background: var(--bg-card); padding: 0.75rem 1rem; border-radius: 8px; border-left: 3px solid <?= $isSubmitted ? '#10B981' : '#F59E0B' ?>; margin-bottom: 1rem; font-size: 0.85rem; color: var(--text-primary);">
            <strong style="color: <?= $isSubmitted ? '#059669' : '#D97706' ?>;">Admin Compliance Note:</strong> <?= nl2br(htmlspecialchars($dReq['note'])) ?>
          </div>
        <?php endif; ?>

        <?php if (!empty($dReq['uploaded_files'])): ?>
            <?php foreach ($dReq['uploaded_files'] as $dfield => $fileUrl): ?>
              <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.6rem;">
                  <img src="<?= htmlspecialchars($fileUrl) ?>" alt="Uploaded Document" style="width: 46px; height: 34px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color); background: #FFF; cursor: pointer;" onclick="openDocPreview('<?= htmlspecialchars(ucwords(str_replace('_', ' ', $dfield))) ?>', '<?= htmlspecialchars($fileUrl) ?>')">
                  <div>
                    <div style="font-size: 0.82rem; font-weight: 800; color: #065F46;">Resubmitted: <?= htmlspecialchars(ucwords(str_replace('_', ' ', $dfield))) ?></div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">Submitted: <?= htmlspecialchars($dReq['submitted_at'] ?? 'Recently') ?></div>
                  </div>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" onclick="openDocPreview('<?= htmlspecialchars(ucwords(str_replace('_', ' ', $dfield))) ?>', '<?= htmlspecialchars($fileUrl) ?>')" style="font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;">
                  <i data-lucide="eye" style="width: 14px; height: 14px;"></i> View
                </button>
              </div>
            <?php endforeach; ?>
        <?php endif; ?>

        <?php if ($isOwner && !$isSubmitted): ?>
        <!-- Direct Upload Form for Laundry Owner to Send Document Image -->
        <form method="POST" action="" enctype="multipart/form-data" style="background: var(--bg-card); padding: 1rem 1.25rem; border-radius: 10px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
          <input type="hidden" name="action" value="upload_missing_doc">
          <input type="hidden" name="shop_id" value="<?= htmlspecialchars($reqShopId) ?>">
          
          <div style="flex: 1; min-width: 100%;">
            <?php foreach ($dReq['requested_docs'] as $docKey): 
                $label = ucwords(str_replace('_', ' ', $docKey));
                if ($docKey === 'id_proof_photo') $label = 'Owner Aadhaar / PAN Proof';
                if ($docKey === 'business_proof_photo') $label = 'Trade License / Udyam Certificate';
                if ($docKey === 'bank_proof_photo') $label = 'Bank Account Cheque / Passbook';
                if ($docKey === 'shop_board_photo') $label = 'Storefront Signboard Photo';
            ?>
                <div style="margin-bottom: 0.75rem; display: flex; align-items: center; gap: 1rem; width: 100%;">
                    <label style="flex: 1; font-size: 0.74rem; font-weight: 800; text-transform: uppercase; color: var(--text-secondary);">
                        <?= htmlspecialchars($label) ?>
                    </label>
                    <input type="file" name="doc_files[<?= htmlspecialchars($docKey) ?>]" accept="image/*,.pdf" class="form-control" style="flex: 2; font-size: 0.82rem; padding: 0.35rem 0.65rem;">
                </div>
            <?php endforeach; ?>
          </div>

          <div style="padding-top: 1.1rem;">
            <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); border: none; color: #FFF; font-weight: 800; padding: 0.55rem 1.25rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.4rem; box-shadow: 0 4px 12px rgba(129,98,238,0.35);">
              <i data-lucide="upload-cloud" style="width: 16px; height: 16px;"></i> Send Document Image
            </button>
          </div>
        </form>
        <?php endif; ?>
      </div>
    <?php endforeach; ?>
  <?php endif; ?>

  <div class="card" style="padding: 1.5rem;">
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Laundry Shop</th>
            <th>Owner Details</th>
            <th>City</th>
            <th>GST &amp; Bank Details</th>
            <th>Uploaded Proofs (Click to View)</th>
            <th>Status</th>
            <th>Compliance Decision</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($queue)): ?>
            <tr>
              <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted); font-weight: 600;">
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem;">
                  <i data-lucide="check-circle" style="width: 32px; height: 32px; color: #10B981;"></i>
                  <span>No laundry shops are currently pending verification.</span>
                </div>
              </td>
            </tr>
          <?php endif; ?>
          <?php foreach ($queue as $req): 
              $sId = $req['id'] ?? $req['shop_id'] ?? '';
              $sName = $req['shopName'] ?? $req['name'] ?? $req['shop_name'] ?? "Shop #{$sId}";
              $oName = $req['ownerName'] ?? $req['owner_name'] ?? ($req['owner']['name'] ?? 'Owner');
              $phone = $req['phone'] ?? ($req['owner']['phone'] ?? 'N/A');
              $city = $req['city'] ?? 'Pune';
              $status = strtoupper($req['verification_status'] ?? $req['verificationStatus'] ?? ($req['status'] ?? 'PENDING'));

              // Guard: Skip if approved
              if ($status === 'APPROVED' || $status === 'VERIFIED' || (!empty($req['is_verified']) && $req['is_verified'] == 1) || !empty($_SESSION['approved_shop_ids'][$sId])) {
                  continue;
              }

              $aadhaar = $req['idProofPhoto'] ?? $req['id_proof_photo'] ?? '';
              $udyam = $req['businessProofPhoto'] ?? $req['business_proof_photo'] ?? '';
              $bank = $req['bankProofPhoto'] ?? $req['bank_proof_photo'] ?? '';
              $board = $req['shopBoardPhoto'] ?? $req['shop_board_photo'] ?? '';
              $gstVal = $req['gstNumber'] ?? $req['gst_number'] ?? 'PENDING';
              $bankAccVal = $req['bankAccount'] ?? $req['bank_account'] ?? ($req['bank_account_number'] ?? 'PENDING');
          ?>
            <tr>
              <td>
                <div style="font-weight: 800; font-size: 0.95rem; color: var(--brand-purple);"><?= htmlspecialchars($sName) ?></div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">Shop ID: #<?= htmlspecialchars($sId) ?></div>
              </td>
              <td>
                <div style="font-weight: 700; font-size: 0.85rem;"><?= htmlspecialchars($oName) ?></div>
                <div style="font-size: 0.75rem; color: var(--text-muted);"><?= htmlspecialchars($phone) ?></div>
              </td>
              <td><span style="font-weight: 700; font-size: 0.85rem;">📍 <?= htmlspecialchars($city) ?></span></td>
              <td>
                <div style="font-size: 0.8rem;">
                  <div>GST: <strong><?= htmlspecialchars($gstVal) ?></strong></div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">A/C: <?= htmlspecialchars($bankAccVal) ?></div>
                </div>
              </td>
              <td>
                <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                  <?php if (!empty($aadhaar)): ?>
                    <button type="button" onclick="openDocPreview('<?= htmlspecialchars($sName) ?> - Aadhaar Card Proof', '<?= htmlspecialchars($aadhaar) ?>', '<?= htmlspecialchars($sId) ?>', 'id_proof_photo')" class="badge badge-success" style="cursor: pointer; border: none; padding: 0.3rem 0.6rem; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.2rem;">
                      📄 Aadhaar
                    </button>
                  <?php else: ?>
                    <button type="button" onclick="openDocPreview('<?= htmlspecialchars($sName) ?> - Upload Aadhaar Card Proof', '', '<?= htmlspecialchars($sId) ?>', 'id_proof_photo'); toggleReplaceDocPanel(true);" class="badge" style="background: rgba(148, 163, 184, 0.15); color: #64748B; font-size: 0.72rem; padding: 0.25rem 0.5rem; cursor: pointer; border: none;">
                      📄 Aadhaar (Upload)
                    </button>
                  <?php endif; ?>

                  <?php if (!empty($udyam)): ?>
                    <button type="button" onclick="openDocPreview('<?= htmlspecialchars($sName) ?> - Udyam MSME License', '<?= htmlspecialchars($udyam) ?>', '<?= htmlspecialchars($sId) ?>', 'business_proof_photo')" class="badge badge-success" style="cursor: pointer; border: none; padding: 0.3rem 0.6rem; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.2rem;">
                      📜 Udyam MSME
                    </button>
                  <?php else: ?>
                    <button type="button" onclick="openDocPreview('<?= htmlspecialchars($sName) ?> - Upload Udyam MSME License', '', '<?= htmlspecialchars($sId) ?>', 'business_proof_photo'); toggleReplaceDocPanel(true);" class="badge" style="background: rgba(148, 163, 184, 0.15); color: #64748B; font-size: 0.72rem; padding: 0.25rem 0.5rem; cursor: pointer; border: none;">
                      📜 Udyam (Upload)
                    </button>
                  <?php endif; ?>

                  <?php if (!empty($bank)): ?>
                    <button type="button" onclick="openDocPreview('<?= htmlspecialchars($sName) ?> - Bank Statement / Cheque', '<?= htmlspecialchars($bank) ?>', '<?= htmlspecialchars($sId) ?>', 'bank_proof_photo')" class="badge badge-success" style="cursor: pointer; border: none; padding: 0.3rem 0.6rem; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.2rem;">
                      🏦 Cheque
                    </button>
                  <?php else: ?>
                    <button type="button" onclick="openDocPreview('<?= htmlspecialchars($sName) ?> - Upload Bank Statement / Cheque', '', '<?= htmlspecialchars($sId) ?>', 'bank_proof_photo'); toggleReplaceDocPanel(true);" class="badge" style="background: rgba(148, 163, 184, 0.15); color: #64748B; font-size: 0.72rem; padding: 0.25rem 0.5rem; cursor: pointer; border: none;">
                      🏦 Cheque (Upload)
                    </button>
                  <?php endif; ?>

                  <?php if (!empty($board)): ?>
                    <button type="button" onclick="openDocPreview('<?= htmlspecialchars($sName) ?> - Storefront Signboard', '<?= htmlspecialchars($board) ?>', '<?= htmlspecialchars($sId) ?>', 'shop_board_photo')" class="badge badge-success" style="cursor: pointer; border: none; padding: 0.3rem 0.6rem; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.2rem;">
                      🏬 Signboard
                    </button>
                  <?php else: ?>
                    <button type="button" onclick="openDocPreview('<?= htmlspecialchars($sName) ?> - Upload Storefront Signboard', '', '<?= htmlspecialchars($sId) ?>', 'shop_board_photo'); toggleReplaceDocPanel(true);" class="badge" style="background: rgba(148, 163, 184, 0.15); color: #64748B; font-size: 0.72rem; padding: 0.25rem 0.5rem; cursor: pointer; border: none;">
                      🏬 Signboard (Upload)
                    </button>
                  <?php endif; ?>
                </div>
              </td>
              <td>
                <span class="badge badge-<?= $status === 'APPROVED' ? 'success' : 'warning' ?>">
                  <?= $status ?>
                </span>
              </td>
              <td>
                <div style="display: flex; gap: 0.4rem; align-items: center; white-space: nowrap;">
                  <button 
                    type="button" 
                    onclick="viewVerificationShop(<?= htmlspecialchars(json_encode($req)) ?>)"
                    class="btn btn-primary btn-sm"
                    style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.45rem 0.85rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;"
                    title="Inspect All Registration & Uploaded Documents"
                  >
                    <i data-lucide="eye" style="width: 14px; height: 14px;"></i> Inspect Docs
                  </button>

                  <?php if (!$isOwner && $status !== 'APPROVED'): ?>
                    <form method="POST" action="" style="display: inline;" onsubmit="return confirm('Approve verification for this laundry shop?');">
                      <input type="hidden" name="action" value="approve">
                      <input type="hidden" name="shop_id" value="<?= htmlspecialchars($sId) ?>">
                      <button type="submit" class="btn btn-success btn-sm" style="display: inline-flex; align-items: center; gap: 0.25rem; font-weight: 700;">
                        <i data-lucide="check" style="width: 14px; height: 14px;"></i> Approve
                      </button>
                    </form>
                    <button type="button" onclick="openRejectModal('<?= htmlspecialchars($sId) ?>')" class="btn btn-danger btn-sm" style="font-weight: 700;">
                      Reject
                    </button>
                  <?php elseif (!$isOwner && $status === 'APPROVED'): ?>
                    <span style="color: #059669; font-weight: 800; font-size: 0.85rem;">✓ Approved Live</span>
                  <?php elseif ($isOwner): ?>
                    <a href="../shop-app/index.php" class="btn btn-secondary btn-sm" style="font-weight: 700; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.3rem;">
                      <i data-lucide="smartphone" style="width: 13px; height: 13px;"></i> Manage App
                    </a>
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

<!-- Modal: Inspect All Registration & Uploaded Documents -->
<div id="shopDetailModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); align-items: center; justify-content: center; z-index: 99999; padding: 1.5rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 820px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px rgba(0,0,0,0.4); color: var(--text-primary); display: flex; flex-direction: column;">
    <div style="padding: 1.25rem 1.75rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, rgba(129, 98, 238, 0.12) 0%, rgba(50, 19, 143, 0.18) 100%);">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div style="width: 42px; height: 42px; border-radius: 10px; background: linear-gradient(135deg, #8162EE 0%, #32138F 100%); display: flex; align-items: center; justify-content: center; color: #FFF; box-shadow: 0 4px 12px rgba(129,98,238,0.35);">
          <i data-lucide="shield-check" style="width: 22px; height: 22px;"></i>
        </div>
        <div>
          <h3 id="modalShopName" style="font-size: 1.25rem; font-weight: 800; margin: 0; color: var(--text-primary);">Verification Details</h3>
          <p id="modalShopSubtitle" style="margin: 0.15rem 0 0 0; font-size: 0.78rem; color: var(--text-secondary);">Compliance verification and vendor registration profile</p>
        </div>
      </div>
      <button onclick="closeModal('shopDetailModal')" style="background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 8px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted);">✕</button>
    </div>
    
    <div id="modalShopContent" style="padding: 1.75rem; font-size: 0.9rem; line-height: 1.6; overflow-y: auto;">
      <!-- Populated dynamically via viewVerificationShop() -->
    </div>

    <div style="padding: 1rem 1.75rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-input);">
      <div id="modalShopFooterStatus"></div>
      <button onclick="closeModal('shopDetailModal')" class="btn btn-secondary" style="font-weight: 700; padding: 0.6rem 1.5rem;">Close</button>
    </div>
  </div>
</div>

<!-- Modal: Document Preview Lightbox -->
<div id="docPreviewLightbox" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(10, 15, 30, 0.85); backdrop-filter: blur(10px); align-items: center; justify-content: center; z-index: 100000; padding: 1.5rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid rgba(129,98,238,0.3); width: 100%; max-width: 740px; box-shadow: 0 30px 60px rgba(0,0,0,0.6); color: var(--text-primary); overflow: hidden; display: flex; flex-direction: column;">
    <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.15);">
      <div style="display: flex; align-items: center; gap: 0.6rem;">
        <i data-lucide="file-text" style="width: 20px; height: 20px; color: #8162EE;"></i>
        <h3 id="docPreviewTitle" style="font-size: 1.15rem; font-weight: 800; margin: 0; color: var(--text-primary);">Document Preview</h3>
      </div>
      <button onclick="closeModal('docPreviewLightbox')" style="background: var(--bg-input); border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted);">✕</button>
    </div>
    
    <div style="padding: 1.5rem; text-align: center; background: rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; min-height: 320px; max-height: 480px; overflow: hidden;">
      <img id="docPreviewImg" src="" alt="Document Preview" style="max-width: 100%; max-height: 460px; border-radius: 10px; border: 1px solid var(--border-color); box-shadow: 0 10px 25px rgba(0,0,0,0.3); object-fit: contain; background: #FFF;">
    </div>

    <!-- Inline Replace Document Panel (Direct DB Update) -->
    <div id="replaceDocPanel" style="display: none; padding: 1.15rem 1.5rem; background: rgba(245, 158, 11, 0.08); border-top: 1px solid rgba(245, 158, 11, 0.25);">
      <form id="replaceDocForm" method="POST" action="" enctype="multipart/form-data" style="display: flex; flex-direction: column; gap: 0.75rem;">
        <input type="hidden" name="action" value="replace_document">
        <input type="hidden" id="replaceShopId" name="shop_id" value="">
        <input type="hidden" id="replaceDocField" name="doc_field" value="">

        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
          <span style="font-size: 0.88rem; font-weight: 800; color: #D97706; display: flex; align-items: center; gap: 0.4rem;">
            <i data-lucide="refresh-cw" style="width: 16px; height: 16px;"></i> Replace Document (Permanently Saved to Database)
          </span>
          <span id="replaceFieldLabel" style="font-size: 0.75rem; font-weight: 700; background: rgba(245,158,11,0.2); color: #B45309; padding: 0.2rem 0.5rem; border-radius: 4px;"></span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div>
            <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.25rem; display: block;">Document Slot to Replace:</label>
            <select id="replaceFieldSelect" class="form-control" style="font-size: 0.82rem; padding: 0.45rem;" onchange="document.getElementById('replaceDocField').value = this.value; document.getElementById('replaceFieldLabel').innerText = 'Slot: ' + this.options[this.selectedIndex].text;">
              <option value="id_proof_photo">Aadhaar / ID Proof (id_proof_photo)</option>
              <option value="business_proof_photo">Udyam / Trade License (business_proof_photo)</option>
              <option value="bank_proof_photo">Bank Cheque / Passbook (bank_proof_photo)</option>
              <option value="shop_board_photo">Storefront Signboard (shop_board_photo)</option>
              <option value="logo_url">Shop Logo (logo_url)</option>
              <option value="cover_url">Shop Cover Banner (cover_url)</option>
            </select>
          </div>

          <div>
            <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.25rem; display: block;">Choose New Document File:</label>
            <input type="file" id="replaceFileInput" name="new_document_file" accept="image/*,.pdf" required class="form-control" style="font-size: 0.82rem; padding: 0.35rem 0.5rem;">
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.6rem; margin-top: 0.25rem;">
          <button type="button" onclick="toggleReplaceDocPanel(false)" class="btn btn-secondary btn-sm" style="font-weight: 700;">Cancel</button>
          <button type="submit" class="btn btn-primary btn-sm" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); border: none; color: #FFF; font-weight: 800; padding: 0.45rem 1.2rem; display: inline-flex; align-items: center; gap: 0.35rem; box-shadow: 0 4px 12px rgba(129,98,238,0.35);">
            <i data-lucide="check" style="width: 14px; height: 14px;"></i> Upload &amp; Replace in DB
          </button>
        </div>
      </form>
    </div>

    <div style="padding: 1rem 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); flex-wrap: wrap; gap: 0.75rem;">
      <span style="font-size: 0.78rem; color: #10B981; font-weight: 700; display: flex; align-items: center; gap: 0.35rem;">
        <i data-lucide="shield-check" style="width: 16px; height: 16px;"></i> Verified Official KYC Compliance Document
      </span>
      <div style="display: flex; gap: 0.6rem; align-items: center;">
        <button type="button" id="docPreviewReplaceBtn" onclick="toggleReplaceDocPanel()" class="btn btn-warning btn-sm" style="display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 700; background: #F59E0B; color: #FFF; border: none;">
          <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i> Replace Document
        </button>
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

<!-- Modal: Rejection Reason -->
<div id="rejectModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(6px); align-items: center; justify-content: center; z-index: 99999; padding: 1rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 450px; padding: 1.5rem; color: var(--text-primary);">
    <h3 style="margin-top: 0; color: #DC2626; font-size: 1.15rem; font-weight: 800;">Reject Verification</h3>
    <form method="POST" action="">
      <input type="hidden" name="action" value="reject">
      <input type="hidden" id="rejectShopId" name="shop_id" value="">
      <div class="form-group" style="margin-bottom: 1.25rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.4rem; font-weight: 700;">Rejection Reason</label>
        <textarea name="reason" class="form-control" rows="3" placeholder="Explain missing or invalid documents..." required style="width: 100%;"></textarea>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('rejectModal')" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-danger" style="background: #EF4444; color: #FFF; border: none; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 700;">Confirm Rejection</button>
      </div>
    </form>
  </div>
</div>

<script>
  function openRejectModal(id) {
    document.getElementById('rejectShopId').value = id;
    openModal('rejectModal');
  }

  function toggleReplaceDocPanel(force) {
    const p = document.getElementById('replaceDocPanel');
    if (!p) return;
    const shouldShow = force !== undefined ? force : (p.style.display === 'none' || !p.style.display);
    p.style.display = shouldShow ? 'block' : 'none';
    if (window.lucide) lucide.createIcons();
  }

  function openDocPreview(title, url, shopId = '', docField = '') {
    document.getElementById('docPreviewTitle').innerText = title || 'Document Inspection';
    const imgEl = document.getElementById('docPreviewImg');
    if (url) {
      imgEl.src = url;
      imgEl.style.display = 'block';
    } else {
      imgEl.src = '';
      imgEl.style.display = 'none';
    }
    document.getElementById('docPreviewFullTabBtn').href = url || '#';
    document.getElementById('docPreviewDownloadBtn').href = url || '#';
    document.getElementById('docPreviewFullTabBtn').style.display = url ? 'inline-flex' : 'none';
    document.getElementById('docPreviewDownloadBtn').style.display = url ? 'inline-flex' : 'none';

    // Populate replace panel
    const shopInput = document.getElementById('replaceShopId');
    if (shopInput) shopInput.value = shopId || '';

    const fieldInput = document.getElementById('replaceDocField');
    if (fieldInput) fieldInput.value = docField || 'id_proof_photo';

    const selectField = document.getElementById('replaceFieldSelect');
    if (selectField && docField) {
      selectField.value = docField;
      const lbl = document.getElementById('replaceFieldLabel');
      if (lbl) {
        lbl.innerText = 'Slot: ' + selectField.options[selectField.selectedIndex].text;
      }
    }

    const panel = document.getElementById('replaceDocPanel');
    if (panel) panel.style.display = 'none';

    openModal('docPreviewLightbox');
    if (window.lucide) lucide.createIcons();
  }

  function viewVerificationShop(shop) {
    const sName = shop.shopName || shop.name || 'Laundry Shop';
    const sId = shop.id || '44';
    const oName = shop.ownerName || shop.owner_name || 'Partner Owner';
    const phone = shop.phone || 'N/A';
    const email = shop.email || 'partner@dhobipro.com';
    const city = shop.city || 'Pune';
    const addr = shop.address || 'Address details';
    const hours = shop.workingHours || '08:00 AM - 09:30 PM';
    const pin = shop.pincode || shop.postal_code || '411057';
    const lat = shop.latitude || '18.5590';
    const lng = shop.longitude || '73.7868';
    const subPlan = shop.subscriptionPlan || shop.subscription_plan || 'Starter';
    const accHolder = shop.accountHolder || shop.account_holder || shop.ownerName || shop.owner_name || 'Partner Owner';
    const gst = shop.gstNumber || '27AABCU9603R1ZM';
    const bank = shop.bankName || 'HDFC Bank';
    const acc = shop.bankAccount || '50100987654321';
    const ifsc = shop.ifscCode || 'HDFC0001234';
    const upi = shop.upiId || '8600692767@hdfcbank';

    const aadhaarImg = shop.idProofPhoto || '';
    const aadhaarNo = shop.idProofNumber || 'Not Provided';
    const udyamImg = shop.businessProofPhoto || '';
    const udyamNo = shop.businessProofNumber || 'Not Provided';
    const bankImg = shop.bankProofPhoto || '';
    const boardImg = shop.shopBoardPhoto || '';

    const renderDocCard = (title, docNumber, imgUrl, docField) => {
      if (imgUrl) {
        return `
          <div style="background: var(--bg-card); padding: 0.85rem; border-radius: 10px; border: 1px solid var(--border-color); display: flex; gap: 0.75rem; align-items: center;">
            <img src="${imgUrl}" alt="${title}" style="width: 58px; height: 42px; border-radius: 6px; object-fit: cover; border: 1px solid var(--border-color); cursor: pointer; background: #fff;" onclick="openDocPreview('${sName} - ${title}', '${imgUrl}', '${sId}', '${docField}')">
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 800; font-size: 0.85rem;">${title}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${docNumber}</div>
              <div style="display: flex; gap: 0.4rem; margin-top: 0.35rem; flex-wrap: wrap;">
                <button type="button" class="btn btn-outline btn-sm" onclick="openDocPreview('${sName} - ${title}', '${imgUrl}', '${sId}', '${docField}')" style="padding: 0.2rem 0.6rem; font-size: 0.72rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                  <i data-lucide="eye" style="width: 12px; height: 12px;"></i> View
                </button>
                <button type="button" class="btn btn-secondary btn-sm" onclick="openDocPreview('${sName} - ${title}', '${imgUrl}', '${sId}', '${docField}'); toggleReplaceDocPanel(true);" style="padding: 0.2rem 0.6rem; font-size: 0.72rem; display: inline-flex; align-items: center; gap: 0.25rem; color: #D97706; border-color: rgba(217,119,6,0.3); font-weight: 700;">
                  <i data-lucide="refresh-cw" style="width: 12px; height: 12px;"></i> Replace
                </button>
              </div>
            </div>
          </div>
        `;
      }
      return `
        <div style="background: var(--bg-card); padding: 0.85rem; border-radius: 10px; border: 1px dashed rgba(239, 68, 68, 0.4); display: flex; gap: 0.75rem; align-items: center;">
          <div style="width: 58px; height: 42px; border-radius: 6px; background: rgba(239, 68, 68, 0.08); display: flex; align-items: center; justify-content: center; color: #EF4444; font-size: 1.2rem;">
            📄
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 800; font-size: 0.85rem;">${title}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${docNumber}</div>
            <div style="display: flex; gap: 0.4rem; align-items: center; margin-top: 0.35rem;">
              <span style="font-size: 0.72rem; font-weight: 700; color: #EF4444; background: rgba(239, 68, 68, 0.1); padding: 0.15rem 0.5rem; border-radius: 4px;">
                ⚠️ Not Uploaded
              </span>
              <button type="button" class="btn btn-primary btn-sm" onclick="openDocPreview('${sName} - Upload ${title}', '', '${sId}', '${docField}'); toggleReplaceDocPanel(true);" style="padding: 0.15rem 0.55rem; font-size: 0.72rem; display: inline-flex; align-items: center; gap: 0.2rem; font-weight: 700;">
                <i data-lucide="upload" style="width: 11px; height: 11px;"></i> Upload
              </button>
            </div>
          </div>
        </div>
      `;
    };

    document.getElementById('modalShopName').innerText = `Verification: ${sName}`;
    document.getElementById('modalShopSubtitle').innerText = `Shop ID: #${sId} • Owner: ${oName} (${city})`;

    document.getElementById('modalShopContent').innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        <!-- Store & Contact Info -->
        <div style="background: var(--bg-input); padding: 1.1rem; border-radius: 12px; border: 1px solid var(--border-color);">
          <h4 style="margin: 0 0 0.75rem 0; color: #8162EE; font-size: 0.95rem; font-weight: 800; display: flex; align-items: center; gap: 0.4rem;">
            🏬 Business &amp; Owner Profile
          </h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; font-size: 0.85rem;">
            <div><span style="color: var(--text-muted);">Shop Name:</span> <strong>${sName}</strong></div>
            <div><span style="color: var(--text-muted);">Owner:</span> <strong>${oName}</strong></div>
            <div><span style="color: var(--text-muted);">Mobile:</span> <strong>${phone}</strong></div>
            <div><span style="color: var(--text-muted);">Email:</span> <strong>${email}</strong></div>
            <div><span style="color: var(--text-muted);">City / District:</span> <strong>📍 ${city}</strong></div>
            <div><span style="color: var(--text-muted);">Working Hours:</span> <strong>${hours}</strong></div>
            <div><span style="color: var(--text-muted);">Pincode:</span> <strong>${pin}</strong></div>
            <div><span style="color: var(--text-muted);">GPS Coords:</span> <strong>${lat}, ${lng}</strong></div>
            <div><span style="color: var(--text-muted);">Subscription:</span> <strong style="color: var(--brand-purple);">${subPlan}</strong></div>
            <div style="grid-column: 1 / -1;"><span style="color: var(--text-muted);">Premise Address:</span> <strong>${addr}</strong></div>
          </div>
        </div>

        <!-- Banking & Financial Credentials -->
        <div style="background: var(--bg-input); padding: 1.1rem; border-radius: 12px; border: 1px solid var(--border-color);">
          <h4 style="margin: 0 0 0.75rem 0; color: #10B981; font-size: 0.95rem; font-weight: 800; display: flex; align-items: center; gap: 0.4rem;">
            🏦 Bank &amp; Commercial Taxation Credentials
          </h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; font-size: 0.85rem;">
            <div><span style="color: var(--text-muted);">GSTIN:</span> <strong style="color: var(--brand-purple);">${gst}</strong></div>
            <div><span style="color: var(--text-muted);">Bank Name:</span> <strong>${bank}</strong></div>
            <div><span style="color: var(--text-muted);">Account Number:</span> <strong>${acc}</strong></div>
            <div><span style="color: var(--text-muted);">Account Holder:</span> <strong>${accHolder}</strong></div>
            <div><span style="color: var(--text-muted);">IFSC Code:</span> <strong>${ifsc}</strong></div>
            <div><span style="color: var(--text-muted);">UPI ID:</span> <strong>${upi}</strong></div>
            <div><span style="color: var(--text-muted);">Compliance Status:</span> <strong style="color: #10B981;">Commercial Active ✓</strong></div>
          </div>
        </div>

        <!-- Uploaded Proofs Inspection Cards -->
        <div style="background: var(--bg-input); padding: 1.1rem; border-radius: 12px; border: 1px solid var(--border-color);">
          <h4 style="margin: 0 0 0.85rem 0; color: #D97706; font-size: 0.95rem; font-weight: 800; display: flex; align-items: center; gap: 0.4rem;">
            📄 Uploaded KYC Documents &amp; Business Proofs
          </h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
            ${renderDocCard('Aadhaar / ID Proof', `Doc: ${aadhaarNo}`, aadhaarImg, 'id_proof_photo')}
            ${renderDocCard('Udyam MSME License', `Doc: ${udyamNo}`, udyamImg, 'business_proof_photo')}
            ${renderDocCard('Bank Account Cheque', `A/C: ${acc}`, bankImg, 'bank_proof_photo')}
            ${renderDocCard('Storefront Signboard', 'Physical Outlet Proof', boardImg, 'shop_board_photo')}
          </div>
        </div>
      </div>
    `;

    document.getElementById('modalShopFooterStatus').innerHTML = `
      <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
        <form method="POST" action="" style="display: inline;" onsubmit="return confirm('Approve verification for this laundry shop?');">
          <input type="hidden" name="action" value="approve">
          <input type="hidden" name="shop_id" value="${sId}">
          <button type="submit" class="btn btn-success" style="font-weight: 800; display: inline-flex; align-items: center; gap: 0.35rem;">
            <i data-lucide="check-circle" style="width: 16px; height: 16px;"></i> Approve Laundry Shop
          </button>
        </form>
        <button type="button" onclick="closeModal('shopDetailModal'); openRequestDocsModal('${sId}', '${sName.replace(/'/g, "\\'")}')" class="btn btn-warning" style="font-weight: 800; background: #F59E0B; color: #FFF; border: none; display: inline-flex; align-items: center; gap: 0.35rem;">
          <i data-lucide="file-question" style="width: 16px; height: 16px;"></i> Request Missing Docs
        </button>
        <button type="button" onclick="closeModal('shopDetailModal'); openRejectModal('${sId}')" class="btn btn-danger" style="font-weight: 700;">
          Reject
        </button>
      </div>
    `;

    openModal('shopDetailModal');
    if (window.lucide) lucide.createIcons();
  }

  function openRequestDocsModal(shopId, shopName) {
    document.getElementById('reqDocShopId').value = shopId;
    document.getElementById('reqDocShopName').value = shopName;
    document.getElementById('reqDocShopSubtitle').innerText = `Send Missing Document Request to: ${shopName} (ID: #${shopId})`;
    openModal('requestDocModal');
    if (window.lucide) lucide.createIcons();
  }
</script>

<!-- Modal: Request Missing Compliance Documents -->
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
          <input type="checkbox" name="docs[]" value="id_proof_photo" checked>
          <span>📄 Owner Aadhaar / PAN Proof Document</span>
        </label>
        <label style="display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.8rem; border-radius: 8px; background: var(--bg-input); border: 1px solid var(--border-color); cursor: pointer; font-size: 0.85rem; font-weight: 600;">
          <input type="checkbox" name="docs[]" value="business_proof_photo" checked>
          <span>📜 Trade License / Udyam MSME Certificate</span>
        </label>
        <label style="display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.8rem; border-radius: 8px; background: var(--bg-input); border: 1px solid var(--border-color); cursor: pointer; font-size: 0.85rem; font-weight: 600;">
          <input type="checkbox" name="docs[]" value="bank_proof_photo">
          <span>🏦 Bank Account Cheque / Passbook Proof</span>
        </label>
        <label style="display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.8rem; border-radius: 8px; background: var(--bg-input); border: 1px solid var(--border-color); cursor: pointer; font-size: 0.85rem; font-weight: 600;">
          <input type="checkbox" name="docs[]" value="shop_board_photo">
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

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
