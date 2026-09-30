<?php
$pageTitle = 'Verification Queue';
// Include API client and auth BEFORE processing forms (to avoid header already sent)
require_once __DIR__ . '/../includes/api-client.php';
require_once __DIR__ . '/../includes/auth.php';

// Form actions
$actionMsg = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $shopId = $_POST['shop_id'] ?? '';
    $reason = $_POST['reason'] ?? '';

    if ($action === 'approve' && $shopId) {
        if (!empty($_SESSION['custom_shops'])) {
            foreach ($_SESSION['custom_shops'] as &$cs) {
                if (strval($cs['id'] ?? '') === strval($shopId)) {
                    $cs['verificationStatus'] = 'APPROVED';
                    $cs['verification_status'] = 'APPROVED';
                    $cs['status'] = 'ACTIVE';
                    $cs['accountStatus'] = 'ACTIVE';
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
                    $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
                    $fName = 'resubmit_' . $docField . '_' . time() . '_' . mt_rand(1000, 9999) . '.' . $ext;
                    
                    if (move_uploaded_file($_FILES['doc_files']['tmp_name'][$docField], $uploadDir . $fName)) {
                        $fileUrl = ADMIN_BASE_URL . '/uploads/documents/' . $fName;
                        $uploadedCount++;
                        $apiUpdatePayload[$docField] = $fileUrl;
                        
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
                // Sync the newly uploaded document URLs to the Laravel database
                if (isLaundryOwner()) {
                    apiPut('/owner/profile', $apiUpdatePayload);
                } else {
                    apiPut("/admin/laundries/{$shopId}", $apiUpdatePayload);
                }

                if (isset($_SESSION['doc_requests'][$shopId])) {
                    $_SESSION['doc_requests'][$shopId]['status'] = 'SUBMITTED';
                    $_SESSION['doc_requests'][$shopId]['submitted_at'] = date('Y-m-d H:i:s');
                }
                
                // If it is the laundry owner uploading, redirect them back to their pending dashboard
                if (isLaundryOwner()) {
                    header('Location: ' . ADMIN_BASE_URL . '/dashboard/index.php');
                    exit;
                }
                
                $actionMsg = "{$uploadedCount} requested document(s) uploaded successfully! Submitted to Admin for compliance verification.";
            }
        }
    }
}

require_once __DIR__ . '/../includes/header.php';

// Fetch verification requests
$res = apiGet('/admin/verifications');
$queue = apiExtractList($res);

// Prepend session custom shops that are pending verification
if (!empty($_SESSION['custom_shops'])) {
    foreach ($_SESSION['custom_shops'] as $cs) {
        $vStatus = strtoupper($cs['verificationStatus'] ?? $cs['verification_status'] ?? 'APPROVED');
        if ($vStatus === 'PENDING') {
            $queue[] = $cs;
        }
    }
}

// Removed fallback injection because Neha is now seeded directly in api.php's global session array

// Keep genuine documents only - do not inject fake/system-generated sample SVGs
foreach ($queue as &$qItem) {
    $qItem['idProofPhoto'] = $qItem['idProofPhoto'] ?? ($qItem['id_proof_photo'] ?? '');
    $qItem['businessProofPhoto'] = $qItem['businessProofPhoto'] ?? ($qItem['business_proof_photo'] ?? '');
    $qItem['bankProofPhoto'] = $qItem['bankProofPhoto'] ?? ($qItem['bank_proof_photo'] ?? '');
    $qItem['shopBoardPhoto'] = $qItem['shopBoardPhoto'] ?? ($qItem['shop_board_photo'] ?? '');
}
unset($qItem);

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

    // If still empty, we don't inject a dummy record for owner either, just let it be empty
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
            <?php foreach ($dReq['requested_docs'] ?? [] as $item): ?>
              <span style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); color: #B45309; padding: 0.25rem 0.65rem; border-radius: 6px; font-size: 0.78rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;">
                📄 <?= htmlspecialchars($item) ?>
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
            <?php foreach ($dReq['requested_docs'] as $docKey): ?>
                <div style="margin-bottom: 0.75rem; display: flex; align-items: center; gap: 1rem; width: 100%;">
                    <label style="flex: 1; font-size: 0.74rem; font-weight: 800; text-transform: uppercase; color: var(--text-secondary);">
                        <?= ucwords(str_replace('_', ' ', $docKey)) ?>
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
              $sId = $req['id'] ?? '44';
              $sName = $req['shopName'] ?? $req['name'] ?? 'Laundry Shop';
              $oName = $req['ownerName'] ?? $req['owner_name'] ?? 'Owner';
              $phone = $req['phone'] ?? 'N/A';
              $city = $req['city'] ?? 'Pune';
              $status = strtoupper($req['status'] ?? $req['verificationStatus'] ?? 'PENDING');
              $aadhaar = $req['idProofPhoto'] ?? $req['id_proof_photo'] ?? '/assets/images/docs/aadhaar_sample.svg';
              $udyam = $req['businessProofPhoto'] ?? $req['business_proof_photo'] ?? '/assets/images/docs/udyam_sample.svg';
              $bank = $req['bankProofPhoto'] ?? $req['bank_proof_photo'] ?? '/assets/images/docs/bank_statement_sample.svg';
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
                  <div>GST: <strong><?= htmlspecialchars($req['gstNumber'] ?? '27AABCU9603R1ZM') ?></strong></div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">A/C: <?= htmlspecialchars($req['bankAccount'] ?? '50100987654321') ?></div>
                </div>
              </td>
              <td>
                <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                  <button type="button" onclick="openDocPreview('<?= htmlspecialchars($sName) ?> - Aadhaar Card Proof', '<?= $aadhaar ?>')" class="badge badge-success" style="cursor: pointer; border: none; padding: 0.3rem 0.6rem; font-size: 0.75rem;">
                    📄 Aadhaar
                  </button>
                  <button type="button" onclick="openDocPreview('<?= htmlspecialchars($sName) ?> - Udyam MSME License', '<?= $udyam ?>')" class="badge badge-success" style="cursor: pointer; border: none; padding: 0.3rem 0.6rem; font-size: 0.75rem;">
                    📜 Udyam MSME
                  </button>
                  <button type="button" onclick="openDocPreview('<?= htmlspecialchars($sName) ?> - Bank Statement / Cheque', '<?= $bank ?>')" class="badge badge-success" style="cursor: pointer; border: none; padding: 0.3rem 0.6rem; font-size: 0.75rem;">
                    🏦 Cheque
                  </button>
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

  function openDocPreview(title, url) {
    document.getElementById('docPreviewTitle').innerText = title || 'Document Inspection';
    document.getElementById('docPreviewImg').src = url;
    document.getElementById('docPreviewFullTabBtn').href = url;
    document.getElementById('docPreviewDownloadBtn').href = url;
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

    const renderDocCard = (title, docNumber, imgUrl, docTypeLabel) => {
      if (imgUrl) {
        return `
          <div style="background: var(--bg-card); padding: 0.85rem; border-radius: 10px; border: 1px solid var(--border-color); display: flex; gap: 0.75rem; align-items: center;">
            <img src="${imgUrl}" alt="${title}" style="width: 58px; height: 42px; border-radius: 6px; object-fit: cover; border: 1px solid var(--border-color); cursor: pointer; background: #fff;" onclick="openDocPreview('${sName} - ${title}', '${imgUrl}')">
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 800; font-size: 0.85rem;">${title}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${docNumber}</div>
              <button type="button" class="btn btn-outline btn-sm" onclick="openDocPreview('${sName} - ${title}', '${imgUrl}')" style="margin-top: 0.35rem; padding: 0.2rem 0.6rem; font-size: 0.72rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                <i data-lucide="eye" style="width: 12px; height: 12px;"></i> View Document
              </button>
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
            <span style="display: inline-block; margin-top: 0.35rem; font-size: 0.72rem; font-weight: 700; color: #EF4444; background: rgba(239, 68, 68, 0.1); padding: 0.15rem 0.5rem; border-radius: 4px;">
              ⚠️ Document Not Uploaded
            </span>
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
            ${renderDocCard('Aadhaar / ID Proof', `Doc: ${aadhaarNo}`, aadhaarImg)}
            ${renderDocCard('Udyam MSME License', `Doc: ${udyamNo}`, udyamImg)}
            ${renderDocCard('Bank Account Cheque', `A/C: ${acc}`, bankImg)}
            ${renderDocCard('Storefront Signboard', 'Physical Outlet Proof', boardImg)}
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

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
