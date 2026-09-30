<?php
$pageTitle = 'Coupon & Promotion Center';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';

$isOwner = isLaundryOwner();
$shopName = currentShopName();

$msg = null;

// Initialize session state for Coupons
if (!isset($_SESSION['coupons_store'])) {
    $_SESSION['coupons_store'] = [
        'CPN-1' => [
            'id' => 'CPN-1',
            'code' => 'WELCOME50',
            'title' => '50% Off First Laundry Order',
            'type' => 'PERCENTAGE',
            'discountValue' => 50,
            'minOrderAmount' => 200,
            'maxDiscountAmount' => 150,
            'usedCount' => 342,
            'status' => 'ACTIVE',
        ],
        'CPN-2' => [
            'id' => 'CPN-2',
            'code' => 'FESTIVE100',
            'title' => 'Diwali Festive Flat ₹100 Discount',
            'type' => 'FLAT',
            'discountValue' => 100,
            'minOrderAmount' => 499,
            'maxDiscountAmount' => 100,
            'usedCount' => 84,
            'status' => 'ACTIVE',
        ],
        'CPN-3' => [
            'id' => 'CPN-3',
            'code' => 'PUNEWASH20',
            'title' => 'Pune Monsoon Special 20% Off',
            'type' => 'PERCENTAGE',
            'discountValue' => 20,
            'minOrderAmount' => 250,
            'maxDiscountAmount' => 80,
            'usedCount' => 512,
            'status' => 'ACTIVE',
        ],
        'CPN-4' => [
            'id' => 'CPN-4',
            'code' => 'REF50',
            'title' => 'Referral Bonus ₹50 Cashback',
            'type' => 'FLAT',
            'discountValue' => 50,
            'minOrderAmount' => 150,
            'maxDiscountAmount' => 50,
            'usedCount' => 1204,
            'status' => 'ACTIVE',
        ],
    ];
}

// POST Handlers for Coupons
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'create_coupon') {
        $code = strtoupper(trim($_POST['code'] ?? ''));
        $title = trim($_POST['title'] ?? '');
        $disc = floatval($_POST['discount'] ?? 20);
        $min = floatval($_POST['min_order'] ?? 200);
        $type = $_POST['type'] ?? 'PERCENTAGE';
        $newId = 'CPN-' . (count($_SESSION['coupons_store']) + 1);

        if ($code && $title) {
            $_SESSION['coupons_store'][$newId] = [
                'id' => $newId,
                'code' => $code,
                'title' => $title,
                'type' => $type,
                'discountValue' => $disc,
                'minOrderAmount' => $min,
                'maxDiscountAmount' => 150,
                'usedCount' => 0,
                'status' => 'ACTIVE',
            ];
            $msg = "Promo coupon code '{$code}' created successfully!";
        }
    } elseif ($action === 'edit_coupon') {
        $cId = $_POST['coupon_id'] ?? '';
        $code = strtoupper(trim($_POST['code'] ?? ''));
        $title = trim($_POST['title'] ?? '');
        $disc = floatval($_POST['discount'] ?? 20);
        $min = floatval($_POST['min_order'] ?? 200);
        $type = $_POST['type'] ?? 'PERCENTAGE';
        $status = $_POST['status'] ?? 'ACTIVE';

        if ($cId && isset($_SESSION['coupons_store'][$cId])) {
            $_SESSION['coupons_store'][$cId]['code'] = $code;
            $_SESSION['coupons_store'][$cId]['title'] = $title;
            $_SESSION['coupons_store'][$cId]['type'] = $type;
            $_SESSION['coupons_store'][$cId]['discountValue'] = $disc;
            $_SESSION['coupons_store'][$cId]['minOrderAmount'] = $min;
            $_SESSION['coupons_store'][$cId]['status'] = $status;
            $msg = "Promo coupon '{$code}' updated successfully!";
        }
    } elseif ($action === 'delete_coupon') {
        $cId = $_POST['coupon_id'] ?? '';
        if ($cId && isset($_SESSION['coupons_store'][$cId])) {
            $delCode = $_SESSION['coupons_store'][$cId]['code'];
            unset($_SESSION['coupons_store'][$cId]);
            $msg = "Promo coupon '{$delCode}' removed.";
        }
    }
}

$coupons = array_values($_SESSION['coupons_store']);
?>

<div style="color: var(--text-primary);">
  <!-- Header Title -->
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <div style="display: flex; align-items: center; gap: 0.6rem;">
        <h1 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="gift" style="width: 28px; height: 28px; color: #E8643A;"></i> 
          <?= $isOwner ? 'My Shop Coupons &amp; Customer Promos' : 'Coupon &amp; Promotion Center' ?>
        </h1>
        <?php if ($isOwner): ?>
          <span style="font-size: 0.72rem; padding: 0.2rem 0.65rem; border-radius: 20px; background: rgba(16, 185, 129, 0.15); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3); font-weight: 800;">
            🏬 <?= htmlspecialchars($shopName) ?>
          </span>
        <?php endif; ?>
      </div>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.25rem; margin-bottom: 0;">
        <?= $isOwner 
          ? 'Create and manage promotional discount codes to attract more orders for your laundry outlet in Pune.' 
          : 'Manage global promo codes, seasonal discounts, referral bonuses, and customer campaign usage caps.' ?>
      </p>
    </div>

    <button
      onclick="openModal('addCouponModal')"
      class="btn btn-primary"
      style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; padding: 0.65rem 1.25rem; border-radius: 8px; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 14px rgba(129,98,238,0.35);"
    >
      <i data-lucide="plus" style="width: 18px; height: 18px;"></i> <?= $isOwner ? 'Create Shop Promo Code' : 'Create Promo Code' ?>
    </button>
  </div>

  <?php if ($msg): ?>
    <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #059669; padding: 0.75rem 1rem; border-radius: 8px; font-weight: 700; font-size: 0.85rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
      <i data-lucide="check-circle" style="width: 18px; height: 18px;"></i> <?= htmlspecialchars($msg) ?>
    </div>
  <?php endif; ?>

  <!-- Coupons List Table -->
  <div class="card" style="padding: 1.5rem; border-radius: 16px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
      <h3 style="font-size: 1.15rem; font-weight: 800; margin: 0; color: var(--brand-purple);">
        Active Promotional Discount Vouchers
      </h3>
      <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">
        <?= count($coupons) ?> Promo Campaigns Configured
      </span>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Coupon Code</th>
            <th>Campaign Title</th>
            <th>Type</th>
            <th>Discount Value</th>
            <th>Min Order Amount</th>
            <th>Usage Count</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($coupons as $c): 
              $cId = $c['id'];
              $code = $c['code'];
              $title = $c['title'];
              $type = $c['type'];
              $val = $c['discountValue'];
              $min = $c['minOrderAmount'];
              $used = $c['usedCount'] ?? 0;
              $status = strtoupper($c['status'] ?? 'ACTIVE');
          ?>
            <tr>
              <td>
                <span class="badge" style="background: rgba(129,98,238,0.18); color: #8162EE; font-family: monospace; font-size: 0.95rem; font-weight: 900; letter-spacing: 0.8px; padding: 0.35rem 0.65rem; border: 1px dashed rgba(129,98,238,0.4);">
                  🎟️ <?= htmlspecialchars($code) ?>
                </span>
              </td>
              <td>
                <strong style="color: var(--text-primary); font-size: 0.92rem;"><?= htmlspecialchars($title) ?></strong>
                <div style="font-size: 0.72rem; color: var(--text-muted);">Promo ID: <?= htmlspecialchars($cId) ?></div>
              </td>
              <td>
                <span class="badge badge-info" style="font-size: 0.72rem; font-weight: 800;">
                  <?= htmlspecialchars($type) ?>
                </span>
              </td>
              <td>
                <strong style="color: #10B981; font-size: 1.05rem; font-weight: 900;">
                  <?= $type === 'PERCENTAGE' ? $val . '%' : '₹' . number_format($val) ?> OFF
                </strong>
              </td>
              <td>
                <span style="font-weight: 700; color: var(--text-secondary);">₹<?= number_format($min) ?></span>
              </td>
              <td>
                <strong style="color: var(--text-primary);"><?= number_format($used) ?></strong>
                <span style="font-size: 0.72rem; color: var(--text-muted);">redemptions</span>
              </td>
              <td>
                <span class="badge badge-<?= $status === 'ACTIVE' ? 'success' : 'danger' ?>" style="font-size: 0.72rem; font-weight: 800;">
                  <?= $status ?>
                </span>
              </td>
              <td>
                <div style="display: flex; gap: 0.4rem; align-items: center; white-space: nowrap;">
                  <button 
                    type="button" 
                    onclick="openEditCouponModal(<?= htmlspecialchars(json_encode($c)) ?>)" 
                    class="btn btn-secondary btn-sm"
                    style="display: inline-flex; align-items: center; gap: 0.25rem; font-weight: 700;"
                    title="Edit Promo Campaign"
                  >
                    <i data-lucide="edit-3" style="width: 13px; height: 13px;"></i> Edit
                  </button>

                  <form method="POST" action="" onsubmit="return confirm('Delete coupon <?= htmlspecialchars($code) ?>?');" style="display: inline;">
                    <input type="hidden" name="action" value="delete_coupon">
                    <input type="hidden" name="coupon_id" value="<?= htmlspecialchars($cId) ?>">
                    <button type="submit" class="btn btn-secondary btn-sm" style="color: #EF4444; padding: 0.4rem 0.6rem;" title="Delete Coupon">
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

<!-- Modal: Add Coupon -->
<div id="addCouponModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(6px); align-items: center; justify-content: center; z-index: 99999; padding: 1rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 480px; padding: 1.75rem; color: var(--text-primary); box-shadow: 0 25px 50px rgba(0,0,0,0.4);">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
      <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--brand-purple);">Create Promo Coupon</h3>
      <button onclick="closeModal('addCouponModal')" style="background: var(--bg-input); border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer;">✕</button>
    </div>
    <form method="POST" action="">
      <input type="hidden" name="action" value="create_coupon">
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Coupon Code (UPPERCASE) *</label>
        <input type="text" name="code" class="form-control" placeholder="e.g. DHOBI25" required style="width: 100%; text-transform: uppercase; font-family: monospace; font-weight: 800;">
      </div>
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Campaign Title *</label>
        <input type="text" name="title" class="form-control" placeholder="e.g. Flat 25% Off First 3 Washes" required style="width: 100%;">
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Discount Type</label>
          <select name="type" class="form-control" style="width: 100%;">
            <option value="PERCENTAGE">Percentage (%)</option>
            <option value="FLAT">Flat Amount (₹)</option>
          </select>
        </div>
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Discount Value *</label>
          <input type="number" name="discount" class="form-control" value="25" required style="width: 100%;">
        </div>
      </div>
      <div class="form-group" style="margin-bottom: 1.5rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Min Order Amount (₹)</label>
        <input type="number" name="min_order" class="form-control" value="200" required style="width: 100%;">
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('addCouponModal')" class="btn btn-secondary" style="font-weight: 700;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.65rem 1.4rem; border-radius: 8px; font-weight: 800;">Save Coupon</button>
      </div>
    </form>
  </div>
</div>

<!-- Modal: Edit Coupon -->
<div id="editCouponModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); align-items: center; justify-content: center; z-index: 99999; padding: 1.5rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 480px; padding: 1.75rem; color: var(--text-primary); box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
      <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--brand-purple);">Edit Promo Coupon</h3>
      <button onclick="closeModal('editCouponModal')" style="background: var(--bg-input); border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer;">✕</button>
    </div>
    <form method="POST" action="">
      <input type="hidden" name="action" value="edit_coupon">
      <input type="hidden" id="editCouponId" name="coupon_id" value="">

      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Coupon Code *</label>
        <input type="text" id="editCouponCode" name="code" class="form-control" required style="width: 100%; text-transform: uppercase; font-family: monospace; font-weight: 800;">
      </div>

      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Campaign Title *</label>
        <input type="text" id="editCouponTitle" name="title" class="form-control" required style="width: 100%;">
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Discount Type</label>
          <select id="editCouponType" name="type" class="form-control" style="width: 100%;">
            <option value="PERCENTAGE">Percentage (%)</option>
            <option value="FLAT">Flat Amount (₹)</option>
          </select>
        </div>
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Discount Value *</label>
          <input type="number" id="editCouponDiscount" name="discount" class="form-control" required style="width: 100%;">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Min Order (₹)</label>
          <input type="number" id="editCouponMin" name="min_order" class="form-control" required style="width: 100%;">
        </div>
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Status</label>
          <select id="editCouponStatus" name="status" class="form-control" style="width: 100%;">
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('editCouponModal')" class="btn btn-secondary" style="font-weight: 700;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.65rem 1.5rem; border-radius: 8px; font-weight: 800;">
          Save Changes
        </button>
      </div>
    </form>
  </div>
</div>

<script>
  function openEditCouponModal(coupon) {
    document.getElementById('editCouponId').value = coupon.id || '';
    document.getElementById('editCouponCode').value = coupon.code || '';
    document.getElementById('editCouponTitle').value = coupon.title || '';
    document.getElementById('editCouponType').value = coupon.type || 'PERCENTAGE';
    document.getElementById('editCouponDiscount').value = coupon.discountValue || 20;
    document.getElementById('editCouponMin').value = coupon.minOrderAmount || 200;
    document.getElementById('editCouponStatus').value = coupon.status || 'ACTIVE';
    openModal('editCouponModal');
  }
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
