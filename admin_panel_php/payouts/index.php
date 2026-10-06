<?php
$pageTitle = 'Automated Settlement & Payout Engine';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';

$isOwner = isLaundryOwner();
$shopId = currentShopId();
$myShopName = currentShopName();
$currentUser = currentUser();
$myOwnerName = $currentUser['name'] ?? '';

$msg = null;

// POST Handlers for Full CRUD Operations
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $payoutId = $_POST['payout_id'] ?? '';

    if ($action === 'create_payout') {
        $gross = floatval($_POST['gross_revenue'] ?? 0);
        $commRate = floatval($_POST['commission_rate'] ?? 15);
        $comm = round($gross * ($commRate / 100), 2);
        $tax = round($comm * 0.18, 2);
        $net = round($gross - $comm - $tax, 2);

        $newPayout = [
            'id' => 'PAY-' . mt_rand(1010, 9999),
            'shopId' => $_POST['shop_id'] ?? '30',
            'shopName' => $_POST['shop_name'] ?? 'Laundry Outlet',
            'bankName' => $_POST['bank_name'] ?? 'HDFC Bank',
            'bankAccount' => $_POST['bank_account'] ?? '50100987654321',
            'ifscCode' => strtoupper($_POST['ifsc_code'] ?? 'HDFC0001234'),
            'grossRevenue' => $gross,
            'commissionRate' => $commRate,
            'commissionDeducted' => $comm,
            'taxDeducted' => $tax,
            'netPayable' => $net,
            'paymentMethod' => $_POST['payment_method'] ?? 'NEFT / Direct Bank Transfer',
            'utrNumber' => 'UTR' . date('Ymd') . mt_rand(100000, 999999),
            'status' => $_POST['status'] ?? 'PENDING',
            'period' => $_POST['period'] ?? ('Week of ' . date('d M Y')),
            'createdAt' => date('Y-m-d H:i:s'),
            'remarks' => trim($_POST['remarks'] ?? 'Platform weekly settlement payout')
        ];

        if (!isset($_SESSION['custom_payouts'])) {
            $_SESSION['custom_payouts'] = [];
        }
        array_unshift($_SESSION['custom_payouts'], $newPayout);

        apiPost('/admin/payouts', $newPayout);
        $msg = "New settlement voucher #{$newPayout['id']} for \"{$newPayout['shopName']}\" created successfully!";
    } elseif ($action === 'edit_payout' && $payoutId) {
        $gross = floatval($_POST['gross_revenue'] ?? 0);
        $comm = floatval($_POST['commission_deducted'] ?? 0);
        $tax = floatval($_POST['tax_deducted'] ?? 0);
        $net = floatval($_POST['net_payable'] ?? ($gross - $comm - $tax));

        $updatedData = [
            'shopName' => $_POST['shop_name'] ?? '',
            'bankName' => $_POST['bank_name'] ?? 'HDFC Bank',
            'bankAccount' => $_POST['bank_account'] ?? '',
            'ifscCode' => strtoupper($_POST['ifsc_code'] ?? ''),
            'grossRevenue' => $gross,
            'commissionDeducted' => $comm,
            'taxDeducted' => $tax,
            'netPayable' => $net,
            'status' => $_POST['status'] ?? 'PENDING',
            'paymentMethod' => $_POST['payment_method'] ?? 'NEFT / Direct Bank Transfer',
            'utrNumber' => trim($_POST['utr_number'] ?? ''),
            'remarks' => trim($_POST['remarks'] ?? '')
        ];

        if (!empty($_SESSION['custom_payouts'])) {
            foreach ($_SESSION['custom_payouts'] as &$cp) {
                if (strval($cp['id'] ?? '') === strval($payoutId)) {
                    $cp = array_merge($cp, $updatedData);
                    break;
                }
            }
            unset($cp);
        }

        apiPut("/admin/payouts/{$payoutId}", $updatedData);
        $msg = "Settlement voucher #{$payoutId} updated successfully!";
    } elseif ($action === 'process' && $payoutId) {
        $utr = 'UTR' . date('Ymd') . mt_rand(100000, 999999);
        if (!empty($_SESSION['custom_payouts'])) {
            foreach ($_SESSION['custom_payouts'] as &$cp) {
                if (strval($cp['id'] ?? '') === strval($payoutId)) {
                    $cp['status'] = 'PAID';
                    $cp['utrNumber'] = $utr;
                    $cp['settledAt'] = date('Y-m-d H:i:s');
                    break;
                }
            }
            unset($cp);
        }
        apiPost("/admin/payouts/{$payoutId}/process");
        $msg = "Payout #{$payoutId} settled and transferred! (Bank UTR: {$utr})";
    } elseif ($action === 'delete' && $payoutId) {
        if (!empty($_SESSION['custom_payouts'])) {
            $_SESSION['custom_payouts'] = array_values(array_filter($_SESSION['custom_payouts'], function($p) use ($payoutId) {
                return strval($p['id'] ?? '') !== strval($payoutId);
            }));
        }
        apiDelete("/admin/payouts/{$payoutId}");
        $msg = "Settlement record #{$payoutId} removed.";
    }
}

// Fetch shops for selection
$shopsRes = apiGet('/admin/laundries');
$allShops = apiExtractList($shopsRes);
if (!empty($_SESSION['custom_shops'])) {
    $allShops = array_merge($_SESSION['custom_shops'], $allShops);
}

// Fetch payouts
$res = apiGet('/admin/payouts');
$payouts = apiExtractList($res);

// Prepend session custom payouts
if (!empty($_SESSION['custom_payouts'])) {
    $payouts = array_merge($_SESSION['custom_payouts'], $payouts);
}

// Baseline demo records if empty
if (empty($payouts)) {
    $payouts = [
        [
            'id' => 'PAY-1001',
            'shopId' => '30',
            'shopName' => 'Star Wash Ultra Premium',
            'bankName' => 'HDFC Bank',
            'bankAccount' => '50100987654321',
            'ifscCode' => 'HDFC0001234',
            'upiId' => '8600692767@hdfcbank',
            'grossRevenue' => 1400,
            'commissionRate' => 15,
            'commissionDeducted' => 210,
            'taxDeducted' => 37.8,
            'netPayable' => 1152.2,
            'paymentMethod' => 'IMPS Immediate Transfer',
            'utrNumber' => 'UTR20260928014521',
            'status' => 'PENDING',
            'period' => '21 Sep 2026 - 27 Sep 2026',
            'createdAt' => '2026-09-28 09:15:00',
            'remarks' => 'Weekly batch payout for customer order fulfillments'
        ],
        [
            'id' => 'PAY-1002',
            'shopId' => '41',
            'shopName' => 'DhobiPro Express Laundry',
            'bankName' => 'State Bank of India',
            'bankAccount' => '30998877665544',
            'ifscCode' => 'SBIN0004567',
            'upiId' => 'dhobipro.express@sbi',
            'grossRevenue' => 4850,
            'commissionRate' => 15,
            'commissionDeducted' => 727.5,
            'taxDeducted' => 130.9,
            'netPayable' => 3991.6,
            'paymentMethod' => 'NEFT National Electronic Transfer',
            'utrNumber' => 'UTR20260925992014',
            'status' => 'PAID',
            'period' => '14 Sep 2026 - 20 Sep 2026',
            'createdAt' => '2026-09-25 14:30:00',
            'remarks' => 'Automated net payout executed successfully'
        ],
        [
            'id' => 'PAY-1003',
            'shopId' => '45',
            'shopName' => 'Super Fast Wash',
            'bankName' => 'ICICI Bank',
            'bankAccount' => '001205004412',
            'ifscCode' => 'ICIC0000012',
            'upiId' => '9898989898@icici',
            'grossRevenue' => 2800,
            'commissionRate' => 15,
            'commissionDeducted' => 420,
            'taxDeducted' => 75.6,
            'netPayable' => 2304.4,
            'paymentMethod' => 'UPI Instant Settlement',
            'utrNumber' => 'UTR20260927883109',
            'status' => 'PROCESSING',
            'period' => '21 Sep 2026 - 27 Sep 2026',
            'createdAt' => '2026-09-27 18:00:00',
            'remarks' => 'Bank verification in progress'
        ]
    ];
}

// STRICT TENANT ISOLATION: When logged in as Laundry Owner, ONLY show payouts belonging to their shop!
if ($isOwner) {
    $myId = strval($shopId ?: currentShopId());
    $myShop = strtolower(trim($myShopName));

    $payouts = array_values(array_filter($payouts, function($p) use ($myId, $myShop) {
        $pShopId = strval($p['shopId'] ?? $p['shop_id'] ?? '');
        $pShopName = strtolower(trim($p['shopName'] ?? $p['shop_name'] ?? ''));

        if ($myId && $pShopId === $myId) return true;
        if ($myShop && (strpos($pShopName, $myShop) !== false || strpos($myShop, $pShopName) !== false)) return true;
        return false;
    }));

    if (empty($payouts)) {
        $payouts = [];
    }
}

// Filters & Search
$q = strtolower(trim($_GET['search'] ?? ''));
$statusTab = strtoupper(trim($_GET['status'] ?? 'ALL'));

if ($q !== '' || $statusTab !== 'ALL') {
    $payouts = array_values(array_filter($payouts, function($p) use ($q, $statusTab) {
        $pId = strtolower($p['id'] ?? '');
        $sName = strtolower($p['shopName'] ?? $p['shop_name'] ?? '');
        $bank = strtolower($p['bankAccount'] ?? $p['bank_account'] ?? '');
        $ifsc = strtolower($p['ifscCode'] ?? $p['ifsc_code'] ?? '');
        $pStatus = strtoupper($p['status'] ?? 'PENDING');

        if ($q !== '') {
            $matched = (strpos($pId, $q) !== false || strpos($sName, $q) !== false || strpos($bank, $q) !== false || strpos($ifsc, $q) !== false);
            if (!$matched) return false;
        }

        if ($statusTab !== 'ALL' && $pStatus !== $statusTab) {
            return false;
        }

        return true;
    }));
}

// Stats Calculation
$totalGross = array_sum(array_map(fn($p) => floatval($p['grossRevenue'] ?? 0), $payouts));
$totalPaid = array_sum(array_map(fn($p) => (strtoupper($p['status'] ?? '') === 'PAID') ? floatval($p['netPayable'] ?? 0) : 0, $payouts));
$totalPending = array_sum(array_map(fn($p) => (strtoupper($p['status'] ?? '') !== 'PAID') ? floatval($p['netPayable'] ?? 0) : 0, $payouts));
$totalCommission = array_sum(array_map(fn($p) => floatval($p['commissionDeducted'] ?? 0) + floatval($p['taxDeducted'] ?? 0), $payouts));
?>

<div style="color: var(--text-primary);">
  <!-- Top Header Title & Actions -->
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary); margin: 0;">
        <i data-lucide="dollar-sign" style="width: 28px; height: 28px; color: #059669;"></i> 
        <?= $isOwner ? 'My Shop Settlements & Bank Payouts' : 'Automated Settlement & Payout Engine' ?>
      </h1>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.2rem; margin-bottom: 0;">
        <?= $isOwner ? 'Review your weekly net payable balances, platform commission statements, and bank transfer receipts.' : 'Review net payable balances after platform commission & tax deductions, and execute verified partner bank transfers.' ?>
      </p>
    </div>

    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
      <?php if (!$isOwner): ?>
        <button type="button" onclick="openCreatePayoutModal()" class="btn btn-primary" style="background: linear-gradient(64.52deg, #059669 1.27%, #10B981 98.26%); border: none; color: #FFF; font-weight: 800; padding: 0.65rem 1.3rem; border-radius: 8px; display: inline-flex; align-items: center; gap: 0.4rem; box-shadow: 0 4px 14px rgba(5,150,105,0.35); cursor: pointer;">
          <i data-lucide="plus-circle" style="width: 18px; height: 18px;"></i> Create Settlement Voucher
        </button>
      <?php endif; ?>
    </div>
  </div>

  <?php if ($msg): ?>
    <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); color: #065F46; padding: 0.85rem 1.2rem; border-radius: 10px; font-weight: 700; font-size: 0.85rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.6rem; box-shadow: 0 2px 8px rgba(16,185,129,0.1);">
      <i data-lucide="check-circle" style="width: 18px; height: 18px; color: #10B981;"></i>
      <span><?= htmlspecialchars($msg) ?></span>
    </div>
  <?php endif; ?>

  <!-- KPI Metric Cards -->
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
    <div class="card" style="padding: 1.1rem; display: flex; align-items: center; gap: 0.85rem; border-left: 4px solid #10B981;">
      <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(16,185,129,0.15); color: #10B981; display: flex; align-items: center; justify-content: center;">
        <i data-lucide="check-check" style="width: 22px; height: 22px;"></i>
      </div>
      <div>
        <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Total Settled</div>
        <div style="font-size: 1.35rem; font-weight: 900; color: #10B981;">₹<?= number_format($totalPaid) ?></div>
      </div>
    </div>

    <div class="card" style="padding: 1.1rem; display: flex; align-items: center; gap: 0.85rem; border-left: 4px solid #F59E0B;">
      <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(245,158,11,0.15); color: #F59E0B; display: flex; align-items: center; justify-content: center;">
        <i data-lucide="clock" style="width: 22px; height: 22px;"></i>
      </div>
      <div>
        <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Pending Release</div>
        <div style="font-size: 1.35rem; font-weight: 900; color: #F59E0B;">₹<?= number_format($totalPending) ?></div>
      </div>
    </div>

    <div class="card" style="padding: 1.1rem; display: flex; align-items: center; gap: 0.85rem; border-left: 4px solid #8162EE;">
      <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(129,98,238,0.15); color: #8162EE; display: flex; align-items: center; justify-content: center;">
        <i data-lucide="percent" style="width: 22px; height: 22px;"></i>
      </div>
      <div>
        <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Commission &amp; Tax</div>
        <div style="font-size: 1.35rem; font-weight: 900; color: var(--brand-purple);">₹<?= number_format($totalCommission) ?></div>
      </div>
    </div>

    <div class="card" style="padding: 1.1rem; display: flex; align-items: center; gap: 0.85rem; border-left: 4px solid #0284C7;">
      <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(2,132,199,0.15); color: #0284C7; display: flex; align-items: center; justify-content: center;">
        <i data-lucide="wallet" style="width: 22px; height: 22px;"></i>
      </div>
      <div>
        <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Gross Flow</div>
        <div style="font-size: 1.35rem; font-weight: 900; color: var(--text-primary);">₹<?= number_format($totalGross) ?></div>
      </div>
    </div>
  </div>

  <!-- Status Tabs Bar -->
  <?php
  $tabs = [
      'ALL' => '📑 All Vouchers (' . count($payouts) . ')',
      'PENDING' => '⏳ Pending Release',
      'PROCESSING' => '🔄 In Processing',
      'PAID' => '✓ Settled & Paid',
      'ON_HOLD' => '⛔ On Hold'
  ];
  ?>
  <div style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; flex-wrap: wrap;">
    <?php foreach ($tabs as $key => $label): 
        $isActive = ($statusTab === $key);
    ?>
      <a 
        href="?status=<?= urlencode($key) ?>&search=<?= urlencode($_GET['search'] ?? '') ?>" 
        style="padding: 0.45rem 0.95rem; border-radius: 8px; text-decoration: none; font-size: 0.82rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem; background: <?= $isActive ? 'linear-gradient(64.52deg, #059669 1.27%, #10B981 98.26%)' : 'var(--bg-card)' ?>; color: <?= $isActive ? '#FFF' : 'var(--text-secondary)' ?>; border: 1px solid <?= $isActive ? 'transparent' : 'var(--border-color)' ?>; box-shadow: <?= $isActive ? '0 4px 12px rgba(5,150,105,0.25)' : 'none' ?>;"
      >
        <?= $label ?>
      </a>
    <?php endforeach; ?>
  </div>

  <!-- Search & Filter Toolbar -->
  <div class="card" style="padding: 0.85rem 1.25rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
    <form method="GET" action="" style="display: flex; gap: 0.65rem; align-items: center; flex-wrap: wrap; flex: 1;">
      <input type="hidden" name="status" value="<?= htmlspecialchars($statusTab) ?>">

      <div style="position: relative; flex: 1; min-width: 240px; max-width: 380px;">
        <i data-lucide="search" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; color: var(--text-muted);"></i>
        <input type="text" name="search" value="<?= htmlspecialchars($_GET['search'] ?? '') ?>" placeholder="Search payout ref, outlet, bank account, IFSC..." style="width: 100%; padding: 0.45rem 0.75rem 0.45rem 2rem; border-radius: 8px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); font-size: 0.82rem; outline: none; box-sizing: border-box;">
      </div>

      <button type="submit" class="btn btn-secondary btn-sm" style="font-weight: 700; padding: 0.45rem 0.85rem;">Search</button>
      <?php if (!empty($_GET['search']) || $statusTab !== 'ALL'): ?>
        <a href="index.php" style="font-size: 0.78rem; color: #EF4444; font-weight: 700; text-decoration: none; display: flex; align-items: center; gap: 0.2rem;">
          <i data-lucide="x" style="width: 13px; height: 13px;"></i> Clear
        </a>
      <?php endif; ?>
    </form>
  </div>

  <!-- Payouts Data Table -->
  <div class="card" style="padding: 1.5rem;">
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Laundry Outlet</th>
            <th>Bank &amp; IFSC Details</th>
            <th>Gross Revenue</th>
            <th>Commission &amp; GST</th>
            <th>Net Payable Amount</th>
            <th>Status</th>
            <th>Actions (CRUD)</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($payouts)): ?>
            <tr>
              <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                <i data-lucide="dollar-sign" style="width: 36px; height: 36px; margin: 0 auto 0.5rem auto; display: block; opacity: 0.4;"></i>
                No settlement records found matching your filters.
              </td>
            </tr>
          <?php endif; ?>

          <?php foreach ($payouts as $p): 
              if (!is_array($p)) continue;
              $pId = $p['id'] ?? 'PAY-REF';
              $shopName = $p['shopName'] ?? $p['shop_name'] ?? 'Laundry Partner';
              $bankName = $p['bankName'] ?? $p['bank_name'] ?? 'HDFC Bank';
              $bankAcc = $p['bankAccount'] ?? $p['bank_account'] ?? '50100987654321';
              $ifsc = $p['ifscCode'] ?? $p['ifsc_code'] ?? 'HDFC0001234';
              $gross = floatval($p['grossRevenue'] ?? $p['gross_revenue'] ?? 0);
              $comm = floatval($p['commissionDeducted'] ?? $p['commission_deducted'] ?? 0);
              $tax = floatval($p['taxDeducted'] ?? $p['tax_deducted'] ?? 0);
              $net = floatval($p['netPayable'] ?? $p['net_payable'] ?? ($gross - $comm - $tax));
              $status = strtoupper($p['status'] ?? 'PENDING');
              $utr = $p['utrNumber'] ?? $p['utr_number'] ?? 'PENDING_GENERATION';
              $period = $p['period'] ?? 'Recent Billing Cycle';
          ?>
            <tr>
              <td>
                <div style="font-weight: 800; font-size: 0.95rem; color: var(--brand-purple);"><?= htmlspecialchars($shopName) ?></div>
                <div style="font-size: 0.74rem; color: var(--text-muted);">Payout Ref: <strong><?= htmlspecialchars($pId) ?></strong></div>
                <div style="font-size: 0.7rem; color: var(--text-muted);">Cycle: <?= htmlspecialchars($period) ?></div>
              </td>
              <td>
                <div style="font-size: 0.82rem;">
                  <div>A/C: <strong style="font-family: monospace;"><?= htmlspecialchars($bankAcc) ?></strong></div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);"><?= htmlspecialchars($bankName) ?> • IFSC: <strong><?= htmlspecialchars($ifsc) ?></strong></div>
                </div>
              </td>
              <td>
                <strong style="font-size: 0.95rem;">₹<?= number_format($gross) ?></strong>
              </td>
              <td>
                <div style="font-size: 0.78rem; color: #EF4444; font-weight: 700;">
                  <div>- ₹<?= number_format($comm) ?> <span style="font-size: 0.7rem; color: var(--text-muted);">(Comm)</span></div>
                  <div>- ₹<?= number_format($tax) ?> <span style="font-size: 0.7rem; color: var(--text-muted);">(GST)</span></div>
                </div>
              </td>
              <td>
                <div style="color: #10B981; font-size: 1.15rem; font-weight: 900;">
                  ₹<?= number_format($net) ?>
                </div>
                <div style="font-size: 0.68rem; color: var(--text-muted); font-family: monospace;">
                  <?= htmlspecialchars($utr) ?>
                </div>
              </td>
              <td>
                <span class="badge badge-<?= $status === 'PAID' ? 'success' : ($status === 'PROCESSING' ? 'info' : ($status === 'ON_HOLD' ? 'danger' : 'warning')) ?>">
                  <?= $status ?>
                </span>
              </td>
              <td>
                <div style="display: flex; gap: 0.35rem; align-items: center; white-space: nowrap;">
                  <!-- Inspect / View Receipt Voucher -->
                  <button type="button" onclick="inspectPayout(<?= htmlspecialchars(json_encode($p)) ?>)" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 0.25rem;" title="Inspect Settlement Voucher">
                    <i data-lucide="eye" style="width: 14px; height: 14px;"></i> Inspect
                  </button>

                  <!-- Edit Payout Details (Admin Only) -->
                  <?php if (!$isOwner): ?>
                    <button type="button" onclick="openEditPayout(<?= htmlspecialchars(json_encode($p)) ?>)" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 0.25rem; font-weight: 700; color: #8162EE;" title="Edit Payout Details">
                      <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i> Edit
                    </button>
                  <?php endif; ?>

                  <!-- Release Bank Transfer (Admin Only) -->
                  <?php if (!$isOwner && $status !== 'PAID'): ?>
                    <form method="POST" action="" style="display: inline;" onsubmit="return confirm('Release verified bank transfer of ₹<?= number_format($net) ?> to <?= htmlspecialchars(addslashes($shopName)) ?>?');">
                      <input type="hidden" name="action" value="process">
                      <input type="hidden" name="payout_id" value="<?= htmlspecialchars($pId) ?>">
                      <button type="submit" class="btn btn-success btn-sm" style="font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;" title="Execute Bank Transfer">
                        <i data-lucide="check" style="width: 14px; height: 14px;"></i> Release
                      </button>
                    </form>
                  <?php elseif ($status === 'PAID'): ?>
                    <span style="color: #059669; font-weight: 800; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.2rem;">
                      <i data-lucide="check-check" style="width: 14px; height: 14px;"></i> Settled
                    </span>
                  <?php endif; ?>

                  <!-- Delete Payout Record (Admin Only) -->
                  <?php if (!$isOwner): ?>
                    <form method="POST" action="" style="display: inline;" onsubmit="return confirm('Permanently delete payout voucher <?= htmlspecialchars($pId) ?>?');">
                      <input type="hidden" name="action" value="delete">
                      <input type="hidden" name="payout_id" value="<?= htmlspecialchars($pId) ?>">
                      <button type="submit" class="btn btn-sm" style="background: rgba(239,68,68,0.1); color: #EF4444; border: 1px solid rgba(239,68,68,0.25); padding: 0.35rem 0.55rem; border-radius: 6px; cursor: pointer;" title="Delete Record">
                        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
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

<!-- ========================================================================= -->
<!-- MODAL 1: CREATE PAYOUT / SETTLEMENT VOUCHER                               -->
<!-- ========================================================================= -->
<div id="createPayoutModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); align-items: center; justify-content: center; z-index: 99999; padding: 1.5rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 18px; border: 1px solid var(--border-color); width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto; color: var(--text-primary); box-shadow: 0 25px 60px rgba(0,0,0,0.5);">
    <div style="padding: 1.25rem 1.75rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, rgba(5, 150, 105, 0.12) 0%, rgba(16, 185, 129, 0.18) 100%);">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #059669 0%, #10B981 100%); display: flex; align-items: center; justify-content: center; color: #FFF; box-shadow: 0 4px 12px rgba(5,150,105,0.35);">
          <i data-lucide="plus-circle" style="width: 20px; height: 20px;"></i>
        </div>
        <div>
          <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--text-primary);">Create Settlement Voucher</h3>
          <p style="margin: 0.15rem 0 0 0; font-size: 0.76rem; color: var(--text-secondary);">Issue partner bank transfer voucher with auto-calculated tax &amp; commission</p>
        </div>
      </div>
      <button type="button" onclick="closeModal('createPayoutModal')" style="background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted);">✕</button>
    </div>

    <form method="POST" action="" style="padding: 1.75rem;">
      <input type="hidden" name="action" value="create_payout">
      <input type="hidden" id="cp_shop_name" name="shop_name" value="">

      <!-- Shop Selection -->
      <div style="margin-bottom: 1.1rem;">
        <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Partner Laundry Outlet *</label>
        <select id="cp_shop_select" name="shop_id" required class="form-control" style="width: 100%; font-size: 0.85rem;" onchange="onShopSelectChange(this)">
          <option value="">-- Choose Laundry Outlet --</option>
          <?php foreach ($allShops as $sh): 
              $sId = $sh['id'] ?? '';
              $sName = $sh['shopName'] ?? $sh['name'] ?? "Shop #{$sId}";
              $bAcc = $sh['bankAccount'] ?? $sh['bank_account'] ?? '50100987654321';
              $ifsc = $sh['ifscCode'] ?? $sh['ifsc_code'] ?? 'HDFC0001234';
              $bName = $sh['bankName'] ?? $sh['bank_name'] ?? 'HDFC Bank';
          ?>
            <option value="<?= htmlspecialchars($sId) ?>" data-name="<?= htmlspecialchars($sName) ?>" data-acc="<?= htmlspecialchars($bAcc) ?>" data-ifsc="<?= htmlspecialchars($ifsc) ?>" data-bank="<?= htmlspecialchars($bName) ?>">
              <?= htmlspecialchars($sName) ?> (ID: #<?= htmlspecialchars($sId) ?>)
            </option>
          <?php endforeach; ?>
        </select>
      </div>

      <!-- Financial Calculation Row -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Gross Order Revenue (₹) *</label>
          <input type="number" step="0.01" id="cp_gross" name="gross_revenue" required class="form-control" style="width: 100%; font-size: 0.95rem; font-weight: 800;" placeholder="e.g. 5000" oninput="calculatePayoutMath()">
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Commission Deduction (%)</label>
          <input type="number" step="0.5" id="cp_comm_rate" name="commission_rate" value="15" class="form-control" style="width: 100%; font-size: 0.85rem;" oninput="calculatePayoutMath()">
        </div>
      </div>

      <!-- Calculated Preview Card -->
      <div style="background: var(--bg-input); padding: 1rem; border-radius: 12px; border: 1px solid var(--border-color); margin-bottom: 1.25rem;">
        <div style="font-weight: 800; font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem;">Settlement Breakdown &amp; Net Payable</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; font-size: 0.82rem;">
          <div>Platform Comm: <strong id="cp_comm_preview" style="color: #EF4444;">- ₹0</strong></div>
          <div>GST on Comm (18%): <strong id="cp_gst_preview" style="color: #EF4444;">- ₹0</strong></div>
          <div>Net Disbursed: <strong id="cp_net_preview" style="color: #10B981; font-size: 1.05rem;">₹0</strong></div>
        </div>
      </div>

      <!-- Bank Details -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Bank Name</label>
          <input type="text" id="cp_bank_name" name="bank_name" value="HDFC Bank" class="form-control" style="width: 100%; font-size: 0.82rem;">
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Account Number *</label>
          <input type="text" id="cp_bank_account" name="bank_account" required class="form-control" style="width: 100%; font-size: 0.82rem;">
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">IFSC Code *</label>
          <input type="text" id="cp_ifsc_code" name="ifsc_code" required class="form-control" style="width: 100%; font-size: 0.82rem;">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Payment Method</label>
          <select name="payment_method" class="form-control" style="width: 100%; font-size: 0.82rem;">
            <option value="IMPS Immediate Bank Transfer">IMPS Immediate Bank Transfer</option>
            <option value="NEFT Electronic Fund Transfer">NEFT Electronic Fund Transfer</option>
            <option value="RTGS Real Time Settlement">RTGS Real Time Settlement</option>
            <option value="UPI Instant Disbursement">UPI Instant Disbursement</option>
          </select>
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Settlement Status</label>
          <select name="status" class="form-control" style="width: 100%; font-size: 0.82rem;">
            <option value="PENDING">PENDING (Awaiting Approval)</option>
            <option value="PROCESSING">PROCESSING (Queued at Bank)</option>
            <option value="PAID">PAID (Settled Immediately)</option>
            <option value="ON_HOLD">ON HOLD (Audit Review)</option>
          </select>
        </div>
      </div>

      <div style="margin-bottom: 1.5rem;">
        <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Internal Settlement Notes</label>
        <textarea name="remarks" rows="2" class="form-control" style="width: 100%; font-size: 0.82rem;" placeholder="e.g. Regular weekly order settlement for orders handled 21-27 Sep."></textarea>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
        <button type="button" onclick="closeModal('createPayoutModal')" class="btn btn-secondary" style="font-weight: 700;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #059669 1.27%, #10B981 98.26%); border: none; color: #FFF; font-weight: 800; padding: 0.65rem 1.6rem; border-radius: 8px; box-shadow: 0 4px 14px rgba(5,150,105,0.35); cursor: pointer;">
          Create &amp; Issue Voucher
        </button>
      </div>
    </form>
  </div>
</div>

<!-- ========================================================================= -->
<!-- MODAL 2: EDIT SETTLEMENT VOUCHER                                          -->
<!-- ========================================================================= -->
<div id="editPayoutModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); align-items: center; justify-content: center; z-index: 99999; padding: 1.5rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 18px; border: 1px solid var(--border-color); width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto; color: var(--text-primary); box-shadow: 0 25px 60px rgba(0,0,0,0.5);">
    <div style="padding: 1.25rem 1.75rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, rgba(129, 98, 238, 0.12) 0%, rgba(50, 19, 143, 0.18) 100%);">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #8162EE 0%, #32138F 100%); display: flex; align-items: center; justify-content: center; color: #FFF; box-shadow: 0 4px 12px rgba(129,98,238,0.35);">
          <i data-lucide="edit-3" style="width: 20px; height: 20px;"></i>
        </div>
        <div>
          <h3 id="ep_modal_title" style="margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--text-primary);">Edit Settlement Voucher</h3>
          <p style="margin: 0.15rem 0 0 0; font-size: 0.76rem; color: var(--text-secondary);">Modify amounts, bank references, status, and disbursement details</p>
        </div>
      </div>
      <button type="button" onclick="closeModal('editPayoutModal')" style="background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted);">✕</button>
    </div>

    <form method="POST" action="" style="padding: 1.75rem;">
      <input type="hidden" name="action" value="edit_payout">
      <input type="hidden" id="ep_payout_id" name="payout_id" value="">

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Laundry Outlet Name *</label>
          <input type="text" id="ep_shop_name" name="shop_name" required class="form-control" style="width: 100%; font-size: 0.85rem;">
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Payout Status *</label>
          <select id="ep_status" name="status" class="form-control" style="width: 100%; font-size: 0.85rem; font-weight: 800;">
            <option value="PENDING">PENDING</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="PAID">PAID</option>
            <option value="ON_HOLD">ON_HOLD</option>
          </select>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
        <div>
          <label class="form-label" style="display: block; font-size: 0.74rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Gross (₹)</label>
          <input type="number" step="0.01" id="ep_gross" name="gross_revenue" required class="form-control" style="width: 100%; font-size: 0.82rem;">
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 0.74rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Comm (₹)</label>
          <input type="number" step="0.01" id="ep_comm" name="commission_deducted" required class="form-control" style="width: 100%; font-size: 0.82rem;">
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 0.74rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">GST (₹)</label>
          <input type="number" step="0.01" id="ep_tax" name="tax_deducted" required class="form-control" style="width: 100%; font-size: 0.82rem;">
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 0.74rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Net Payable (₹)</label>
          <input type="number" step="0.01" id="ep_net" name="net_payable" required class="form-control" style="width: 100%; font-size: 0.82rem; font-weight: 800; color: #10B981;">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Bank Account Number</label>
          <input type="text" id="ep_bank_account" name="bank_account" required class="form-control" style="width: 100%; font-size: 0.82rem;">
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Bank IFSC Code</label>
          <input type="text" id="ep_ifsc_code" name="ifsc_code" required class="form-control" style="width: 100%; font-size: 0.82rem;">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Bank UTR / Transaction Ref</label>
          <input type="text" id="ep_utr_number" name="utr_number" class="form-control" style="width: 100%; font-size: 0.82rem;" placeholder="e.g. UTR20260928001122">
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Payment Method</label>
          <input type="text" id="ep_payment_method" name="payment_method" class="form-control" style="width: 100%; font-size: 0.82rem;">
        </div>
      </div>

      <div style="margin-bottom: 1.5rem;">
        <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Settlement Notes</label>
        <textarea id="ep_remarks" name="remarks" rows="2" class="form-control" style="width: 100%; font-size: 0.82rem;"></textarea>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
        <button type="button" onclick="closeModal('editPayoutModal')" class="btn btn-secondary" style="font-weight: 700;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); border: none; color: #FFF; font-weight: 800; padding: 0.65rem 1.6rem; border-radius: 8px; box-shadow: 0 4px 14px rgba(129,98,238,0.4); cursor: pointer;">
          Save Changes
        </button>
      </div>
    </form>
  </div>
</div>

<!-- ========================================================================= -->
<!-- MODAL 3: INSPECT SETTLEMENT VOUCHER                                       -->
<!-- ========================================================================= -->
<div id="inspectPayoutModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); align-items: center; justify-content: center; z-index: 99999; padding: 1.5rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 18px; border: 1px solid var(--border-color); width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; color: var(--text-primary); box-shadow: 0 25px 60px rgba(0,0,0,0.5);">
    <div style="padding: 1.25rem 1.75rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, rgba(5, 150, 105, 0.12) 0%, rgba(16, 185, 129, 0.18) 100%);">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #059669 0%, #10B981 100%); display: flex; align-items: center; justify-content: center; color: #FFF;">
          <i data-lucide="receipt" style="width: 22px; height: 22px;"></i>
        </div>
        <div>
          <h3 id="ip_title" style="margin: 0; font-size: 1.25rem; font-weight: 800; color: var(--text-primary);">Settlement Voucher</h3>
          <p id="ip_subtitle" style="margin: 0.15rem 0 0 0; font-size: 0.76rem; color: var(--text-secondary);">Official banking transaction voucher</p>
        </div>
      </div>
      <button type="button" onclick="closeModal('inspectPayoutModal')" style="background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted);">✕</button>
    </div>

    <div id="inspectPayoutBody" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
      <!-- Populated via inspectPayout() -->
    </div>

    <div style="padding: 1rem 1.75rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-input);">
      <button type="button" onclick="window.print()" class="btn btn-secondary btn-sm" style="font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;">
        <i data-lucide="printer" style="width: 14px; height: 14px;"></i> Print Voucher
      </button>
      <button type="button" onclick="closeModal('inspectPayoutModal')" class="btn btn-secondary btn-sm" style="font-weight: 700;">Close</button>
    </div>
  </div>
</div>

<script>
  function calculatePayoutMath() {
    const gross = parseFloat(document.getElementById('cp_gross').value) || 0;
    const rate = parseFloat(document.getElementById('cp_comm_rate').value) || 15;
    const comm = Math.round(gross * (rate / 100) * 100) / 100;
    const gst = Math.round(comm * 0.18 * 100) / 100;
    const net = Math.round((gross - comm - gst) * 100) / 100;

    document.getElementById('cp_comm_preview').innerText = `- ₹${comm.toLocaleString()}`;
    document.getElementById('cp_gst_preview').innerText = `- ₹${gst.toLocaleString()}`;
    document.getElementById('cp_net_preview').innerText = `₹${net.toLocaleString()}`;
  }

  function onShopSelectChange(sel) {
    const opt = sel.options[sel.selectedIndex];
    if (opt && opt.value) {
      document.getElementById('cp_shop_name').value = opt.getAttribute('data-name') || '';
      document.getElementById('cp_bank_account').value = opt.getAttribute('data-acc') || '50100987654321';
      document.getElementById('cp_ifsc_code').value = opt.getAttribute('data-ifsc') || 'HDFC0001234';
      document.getElementById('cp_bank_name').value = opt.getAttribute('data-bank') || 'HDFC Bank';
    }
  }

  function openCreatePayoutModal() {
    openModal('createPayoutModal');
    if (window.lucide) lucide.createIcons();
  }

  function openEditPayout(p) {
    document.getElementById('ep_payout_id').value = p.id || '';
    document.getElementById('ep_modal_title').innerText = `Edit: ${p.id || 'Settlement'}`;
    document.getElementById('ep_shop_name').value = p.shopName || p.shop_name || '';
    document.getElementById('ep_status').value = (p.status || 'PENDING').toUpperCase();
    document.getElementById('ep_gross').value = p.grossRevenue || p.gross_revenue || 0;
    document.getElementById('ep_comm').value = p.commissionDeducted || p.commission_deducted || 0;
    document.getElementById('ep_tax').value = p.taxDeducted || p.tax_deducted || 0;
    document.getElementById('ep_net').value = p.netPayable || p.net_payable || 0;
    document.getElementById('ep_bank_account').value = p.bankAccount || p.bank_account || '';
    document.getElementById('ep_ifsc_code').value = p.ifscCode || p.ifsc_code || '';
    document.getElementById('ep_utr_number').value = p.utrNumber || p.utr_number || '';
    document.getElementById('ep_payment_method').value = p.paymentMethod || p.payment_method || 'NEFT / Direct Bank Transfer';
    document.getElementById('ep_remarks').value = p.remarks || '';

    openModal('editPayoutModal');
    if (window.lucide) lucide.createIcons();
  }

  function inspectPayout(p) {
    const pId = p.id || 'PAY-REF';
    const sName = p.shopName || p.shop_name || 'Laundry Outlet';
    const gross = parseFloat(p.grossRevenue || p.gross_revenue || 0);
    const comm = parseFloat(p.commissionDeducted || p.commission_deducted || 0);
    const tax = parseFloat(p.taxDeducted || p.tax_deducted || 0);
    const net = parseFloat(p.netPayable || p.net_payable || 0);
    const status = (p.status || 'PENDING').toUpperCase();
    const bankAcc = p.bankAccount || p.bank_account || '50100987654321';
    const ifsc = p.ifscCode || p.ifsc_code || 'HDFC0001234';
    const bankName = p.bankName || p.bank_name || 'HDFC Bank';
    const utr = p.utrNumber || p.utr_number || 'PENDING_DISBURSEMENT';
    const period = p.period || 'Weekly Settlement Cycle';

    document.getElementById('ip_title').innerText = `Voucher: ${pId}`;
    document.getElementById('ip_subtitle').innerText = `Issued to: ${sName} • Cycle: ${period}`;

    document.getElementById('inspectPayoutBody').innerHTML = `
      <div style="background: var(--bg-input); padding: 1.1rem; border-radius: 12px; border: 1px solid var(--border-color);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <span style="font-size: 0.76rem; font-weight: 800; color: #059669; text-transform: uppercase;">Beneficiary Partner Outlet</span>
          <span class="badge badge-${status === 'PAID' ? 'success' : 'warning'}">${status}</span>
        </div>
        <div style="font-size: 1.1rem; font-weight: 800; color: var(--brand-purple);">${sName}</div>
        <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem;">Reference: ${pId} • Generated on ${p.createdAt || 'Recent'}</div>
      </div>

      <div style="background: var(--bg-card); padding: 1.1rem; border-radius: 12px; border: 1px solid var(--border-color);">
        <div style="font-size: 0.78rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.75rem;">Financial Breakdown</div>
        <div style="display: flex; flex-direction: column; gap: 0.45rem; font-size: 0.85rem;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-secondary);">Gross Customer Bookings:</span>
            <strong>₹${gross.toLocaleString()}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; color: #EF4444;">
            <span>Platform Commission (${p.commissionRate || 15}%):</span>
            <strong>- ₹${comm.toLocaleString()}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; color: #EF4444;">
            <span>GST on Commission (18%):</span>
            <strong>- ₹${tax.toLocaleString()}</strong>
          </div>
          <div style="border-top: 1px dashed var(--border-color); padding-top: 0.6rem; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 1rem; font-weight: 800; color: var(--text-primary);">Net Disbursed Amount:</span>
            <strong style="color: #10B981; font-size: 1.4rem; font-weight: 900;">₹${net.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      <div style="background: var(--bg-input); padding: 1rem; border-radius: 12px; border: 1px solid var(--border-color); font-size: 0.82rem;">
        <div style="font-weight: 800; font-size: 0.76rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.4rem;">Bank Transfer Confirmation</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
          <div>Bank: <strong>${bankName}</strong></div>
          <div>IFSC: <strong>${ifsc}</strong></div>
          <div>Account: <strong style="font-family: monospace;">${bankAcc}</strong></div>
          <div>UTR / Ref: <strong style="color: #059669; font-family: monospace;">${utr}</strong></div>
        </div>
      </div>
    `;

    openModal('inspectPayoutModal');
    if (window.lucide) lucide.createIcons();
  }
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
