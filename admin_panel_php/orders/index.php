<?php
$pageTitle = 'Order Control Center';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';
require_once __DIR__ . '/../includes/db.php';

$isOwner = isLaundryOwner();
$shopId = currentShopId();

$msg = null;

// Handle status updates and driver assignments
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $orderId = $_POST['order_id'] ?? '';
    $orderNumber = trim($_POST['order_number'] ?? '');
    $newStatus = $_POST['status'] ?? '';
    $driverName = $_POST['driver_name'] ?? '';

    if ($action === 'status' && $orderId && $newStatus) {
        $endpoint = $isOwner ? "/owner/orders/{$orderId}/status" : "/admin/orders/{$orderId}/status";
        $apiRes = apiPost($endpoint, ['status' => $newStatus]);
        if (empty($apiRes['success']) && ($apiRes['status'] ?? 0) === 404) {
            apiPost("/owner/orders/{$orderId}/status", ['status' => $newStatus]);
        }
        updateOrderStatusInDb($orderId, $newStatus);

        if (!isset($_SESSION['order_status_overrides'])) {
            $_SESSION['order_status_overrides'] = [];
        }
        $_SESSION['order_status_overrides'][$orderId] = $newStatus;
        if ($orderNumber) {
            $_SESSION['order_status_overrides'][$orderNumber] = $newStatus;
        }
        $msg = "Order #" . ($orderNumber ?: $orderId) . " status changed to {$newStatus}.";
    } elseif ($action === 'assign_driver' && $orderId && !empty($_POST['delivery_boy_id'])) {
        $driverId = $_POST['delivery_boy_id'];
        $driverName = trim($_POST['driver_name'] ?? '');
        $endpoint = $isOwner ? "/owner/orders/{$orderId}/assign-delivery" : "/admin/orders/{$orderId}/assign-delivery";
        $apiRes = apiPost($endpoint, [
            'delivery_boy_id' => $driverId,
            'assignment_type' => 'delivery'
        ]);
        if (empty($apiRes['success']) && ($apiRes['status'] ?? 0) === 404) {
            apiPost("/owner/orders/{$orderId}/assign-delivery", [
                'delivery_boy_id' => $driverId,
                'assignment_type' => 'delivery'
            ]);
        }
        assignDriverToOrderInDb($orderId, $driverId, $driverName);

        if (!isset($_SESSION['order_status_overrides'])) {
            $_SESSION['order_status_overrides'] = [];
        }
        $_SESSION['order_status_overrides'][$orderId] = 'OUT_FOR_DELIVERY';
        if ($orderNumber) {
            $_SESSION['order_status_overrides'][$orderNumber] = 'OUT_FOR_DELIVERY';
        }

        if (!isset($_SESSION['order_driver_overrides'])) {
            $_SESSION['order_driver_overrides'] = [];
        }
        $assignedDisplayName = $driverName ?: "Driver #{$driverId}";
        $_SESSION['order_driver_overrides'][$orderId] = $assignedDisplayName;
        if ($orderNumber) {
            $_SESSION['order_driver_overrides'][$orderNumber] = $assignedDisplayName;
        }
        $msg = "Order #" . ($orderNumber ?: $orderId) . " assigned to {$assignedDisplayName} and dispatched.";
    }
}

// Fetch orders with shop filter
$filterShop = $isOwner ? ($shopId ?: currentShopId()) : ($_GET['shop_id'] ?? 'ALL');
$filterStatus = $_GET['status'] ?? 'ALL';

$params = [];
if ($filterShop !== 'ALL' && $filterShop) $params['shop_id'] = $filterShop;
if ($filterStatus !== 'ALL' && $filterStatus) $params['status'] = $filterStatus;

$orderEndpoint = $isOwner ? '/owner/orders' : '/admin/orders';
$res = apiGet($orderEndpoint, $params);
$orders = apiExtractList($res);

// Fetch shops
$shopsRes = apiGet('/admin/laundries');
$shops = apiExtractList($shopsRes);

// Fetch delivery drivers directly from dhobi_db database for real-time accuracy
$dbDrivers = fetchDeliveryBoysFromDb($isOwner ? ($shopId ?: 30) : null);
if (!empty($dbDrivers)) {
    $drivers = $dbDrivers;
} else {
    $driversRes = apiGet($isOwner ? '/owner/delivery-boys' : '/admin/delivery-boys', $isOwner ? ['shop_id' => $shopId] : []);
    $drivers = apiExtractList($driversRes);
}

// Merge session custom drivers if any
if (!empty($_SESSION['custom_drivers'])) {
    $drivers = array_merge($_SESSION['custom_drivers'], $drivers);
}

// Deduplicate and filter by shop for laundry owner
$uniqueDrivers = [];
$seenDKeys = [];
foreach ($drivers as $dr) {
    $drName = trim($dr['name'] ?? '');
    if (!$drName) continue;

    if ($isOwner && !empty($shopId)) {
        $drShop = strval($dr['shop_id'] ?? $dr['shopId'] ?? '');
        if ($drShop !== '' && $drShop !== strval($shopId)) {
            continue;
        }
    }

    $dKey = strtolower($drName) . '_' . trim($dr['phone'] ?? '');
    if (!isset($seenDKeys[$dKey])) {
        $seenDKeys[$dKey] = true;
        $uniqueDrivers[] = $dr;
    }
}
$drivers = $uniqueDrivers;

// Fetch live orders directly from dhobi_db database if API returned empty
if (empty($orders)) {
    $orders = fetchOrdersFromDb($filterShop !== 'ALL' ? $filterShop : null, $filterStatus !== 'ALL' ? $filterStatus : null);
}


// Apply session order status & driver overrides and resolve driver names
foreach ($orders as &$oItem) {
    $oid = strval($oItem['id'] ?? '');
    $num = strval($oItem['order_number'] ?? $oItem['orderNumber'] ?? '');
    if (!empty($_SESSION['order_status_overrides'][$oid])) {
        $oItem['status'] = $_SESSION['order_status_overrides'][$oid];
    } elseif (!empty($_SESSION['order_status_overrides'][$num])) {
        $oItem['status'] = $_SESSION['order_status_overrides'][$num];
    }

    if (!empty($_SESSION['order_driver_overrides'][$oid])) {
        $oItem['delivery_boy_name'] = $_SESSION['order_driver_overrides'][$oid];
    } elseif (!empty($_SESSION['order_driver_overrides'][$num])) {
        $oItem['delivery_boy_name'] = $_SESSION['order_driver_overrides'][$num];
    }

    // If still missing delivery boy name but delivery_boy_id is present, look up in $drivers list or database
    $curDriver = $oItem['delivery_boy_name'] ?? $oItem['deliveryBoyName'] ?? null;
    $dbId = $oItem['delivery_boy_id'] ?? $oItem['deliveryBoyId'] ?? null;
    if ((empty($curDriver) || $curDriver === 'Unassigned') && !empty($dbId)) {
        foreach ($drivers as $drItem) {
            if (($drItem['user_id'] ?? null) == $dbId || ($drItem['id'] ?? null) == $dbId) {
                $oItem['delivery_boy_name'] = $drItem['name'];
                $oItem['deliveryBoyName'] = $drItem['name'];
                break;
            }
        }
        if (empty($oItem['delivery_boy_name']) || $oItem['delivery_boy_name'] === 'Unassigned') {
            $lookedUp = getDriverNameById($dbId);
            if ($lookedUp) {
                $oItem['delivery_boy_name'] = $lookedUp;
                $oItem['deliveryBoyName'] = $lookedUp;
            }
        }
    }
}
unset($oItem);

// STRICT TENANT ISOLATION: When logged in as Laundry Owner, never show other shops' orders!
if ($isOwner) {
    $myShop = strtolower(trim(currentShopName()));
    $myId = strval(currentShopId());

    $orders = array_values(array_filter($orders, function($o) use ($myShop, $myId) {
        $oShop = strtolower(trim($o['shop_name'] ?? $o['laundryName'] ?? ($o['laundry_shop']['name'] ?? '')));
        $oShopId = strval($o['shop_id'] ?? $o['shopId'] ?? ($o['laundry_shop']['id'] ?? ''));
        // Match by Shop ID (most precise)
        if ($myId && $oShopId && $oShopId === $myId) return true;
        // Match by Shop Name (requires non-empty string on both sides)
        if ($myShop !== '' && $oShop !== '' && strpos($oShop, $myShop) !== false) return true;
        if ($myShop !== '' && $oShop !== '' && strpos($myShop, $oShop) !== false) return true;
        return false;
    }));
}

// Merge session custom shops into shops filter list
if (!empty($_SESSION['custom_shops'])) {
    $shops = array_merge($_SESSION['custom_shops'], $shops);
}

$searchQuery = trim($_GET['search'] ?? '');
if ($searchQuery !== '') {
    $orders = array_values(array_filter($orders, function($o) use ($searchQuery) {
        $q = strtolower($searchQuery);
        $num = strtolower($o['order_number'] ?? $o['orderNumber'] ?? '');
        $cust = strtolower($o['customer_name'] ?? $o['customerName'] ?? ($o['customer']['name'] ?? ''));
        $phone = strtolower($o['customer_phone'] ?? $o['customerPhone'] ?? ($o['customer']['phone'] ?? ''));
        $shop = strtolower($o['shop_name'] ?? $o['laundryName'] ?? ($o['laundry_shop']['name'] ?? ''));
        $city = strtolower($o['city'] ?? '');
        return strpos($num, $q) !== false || strpos($cust, $q) !== false || strpos($phone, $q) !== false || strpos($shop, $q) !== false || strpos($city, $q) !== false;
    }));
}

if ($filterStatus !== 'ALL' && $filterStatus !== '') {
    $statusArray = array_map('trim', explode(',', strtoupper($filterStatus)));
    $orders = array_values(array_filter($orders, function($o) use ($statusArray) {
        $st = strtoupper($o['status'] ?? 'PENDING');
        return in_array($st, $statusArray);
    }));
}

$viewMode = $_GET['view'] ?? 'table';
?>

<div style="color: var(--text-primary);">
  <!-- Top Navigation & Controls -->
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary); margin: 0;">
        <i data-lucide="shopping-bag" style="width: 28px; height: 28px; color: #D946EF;"></i>
        <?= $isOwner ? 'My Shop Live Orders' : 'Live Order Control Center' ?>
        <span style="font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: 20px; background: rgba(217, 70, 239, 0.15); color: #D946EF; font-weight: 800;">
          <?= count($orders) ?> Orders
        </span>
      </h1>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.2rem; margin-bottom: 0;">
        Full operational pipeline: incoming bookings, washing status, delivery dispatch, payments, and overrides.
      </p>
    </div>

    <!-- Quick Navigation to Child Modules -->
    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
      <?php if ($isOwner): ?>
      <a href="<?= ADMIN_BASE_URL ?>/orders/create.php" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 700;">
        <i data-lucide="plus" style="width: 14px; height: 14px; color: #FFF;"></i> New Walk-in Order
      </a>
      <?php endif; ?>
      <a href="<?= ADMIN_BASE_URL ?>/orders/live-tracking.php" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 700;">
        <i data-lucide="map-pin" style="width: 14px; height: 14px; color: #D97706;"></i> Live GPS
      </a>
      <a href="<?= ADMIN_BASE_URL ?>/orders/modify.php" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 700;">
        <i data-lucide="edit-3" style="width: 14px; height: 14px; color: #8162EE;"></i> Modify Orders
      </a>
      <a href="<?= ADMIN_BASE_URL ?>/orders/disputes.php" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 700;">
        <i data-lucide="alert-circle" style="width: 14px; height: 14px; color: #EF4444;"></i> Disputes
      </a>
      <a href="<?= ADMIN_BASE_URL ?>/orders/complaints.php" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 700;">
        <i data-lucide="message-square" style="width: 14px; height: 14px; color: #2563EB;"></i> Tickets
      </a>
    </div>
  </div>

  <?php if ($msg): ?>
    <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #059669; padding: 0.75rem 1rem; border-radius: 8px; font-weight: 700; font-size: 0.85rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
      <i data-lucide="check-circle" style="width: 16px; height: 16px;"></i> <?= htmlspecialchars($msg) ?>
    </div>
  <?php endif; ?>

  <!-- Status Tabs Bar -->
  <?php
  $statusTabs = [
      'ALL' => '📦 All Orders',
      'PENDING' => '⏳ Pending',
      'CONFIRMED' => '✓ Confirmed',
      'WASHING' => '🔄 Washing',
      'READY' => '✨ Ready',
      'OUT_FOR_DELIVERY' => '🛵 Dispatched',
      'DELIVERED' => '🎉 Delivered',
  ];
  ?>
  <div style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; flex-wrap: wrap;">
    <?php foreach ($statusTabs as $tabKey => $tabLabel): 
        $isActive = ($filterStatus === $tabKey);
    ?>
      <a 
        href="?status=<?= urlencode($tabKey) ?>&shop_id=<?= urlencode($filterShop) ?>&view=<?= urlencode($viewMode) ?>&search=<?= urlencode($searchQuery) ?>" 
        style="padding: 0.45rem 0.95rem; border-radius: 8px; text-decoration: none; font-size: 0.82rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem; background: <?= $isActive ? 'linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%)' : 'var(--bg-card)' ?>; color: <?= $isActive ? '#FFF' : 'var(--text-secondary)' ?>; border: 1px solid <?= $isActive ? 'transparent' : 'var(--border-color)' ?>; box-shadow: <?= $isActive ? '0 4px 12px rgba(129,98,238,0.25)' : 'none' ?>;"
      >
        <?= $tabLabel ?>
      </a>
    <?php endforeach; ?>
  </div>

  <!-- Sleek Single-Row Toolbar (Search + Shop Select + View Toggle) -->
  <div class="card" style="padding: 0.85rem 1.25rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.85rem;">
    <form method="GET" action="" style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; flex: 1; min-width: 280px;">
      <input type="hidden" name="status" value="<?= htmlspecialchars($filterStatus) ?>">
      <input type="hidden" name="view" value="<?= htmlspecialchars($viewMode) ?>">

      <!-- Search Box -->
      <div style="position: relative; flex: 1; min-width: 180px; max-width: 320px;">
        <i data-lucide="search" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; color: var(--text-muted);"></i>
        <input 
          type="text" 
          name="search" 
          value="<?= htmlspecialchars($searchQuery) ?>" 
          placeholder="Search order #, customer, phone..." 
          style="width: 100%; padding: 0.45rem 0.75rem 0.45rem 2rem; border-radius: 8px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); font-size: 0.82rem; outline: none; box-sizing: border-box;"
        >
      </div>

      <?php if (!$isOwner): ?>
        <!-- Shop Filter -->
        <div style="display: flex; align-items: center; gap: 0.35rem; background: var(--bg-input); padding: 0 0.6rem; border-radius: 8px; border: 1px solid var(--border-color);">
          <i data-lucide="store" style="width: 15px; height: 15px; color: #8162EE;"></i>
          <select name="shop_id" onchange="this.form.submit()" style="background: transparent; border: none; font-weight: 600; font-size: 0.82rem; padding: 0.45rem 0.4rem; color: var(--text-primary); outline: none; cursor: pointer; min-width: 180px;">
            <option value="ALL" <?= $filterShop === 'ALL' ? 'selected' : '' ?>>All Laundry Outlets</option>
            <?php foreach ($shops as $s): 
                $sId = $s['id'] ?? '';
                $rawName = $s['shopName'] ?? $s['name'] ?? "Shop #{$sId}";
                $sName = trim($rawName) !== '' ? trim($rawName) : "Laundry Shop #{$sId}";
            ?>
              <option value="<?= htmlspecialchars($sId) ?>" <?= strval($filterShop) === strval($sId) ? 'selected' : '' ?>>
                <?= htmlspecialchars($sName) ?>
              </option>
            <?php endforeach; ?>
          </select>
        </div>
      <?php endif; ?>

      <button type="submit" class="btn btn-secondary btn-sm" style="font-weight: 700; padding: 0.45rem 0.85rem;">Filter</button>
      <?php if ($filterStatus !== 'ALL' || $filterShop !== 'ALL' || $searchQuery !== ''): ?>
        <a href="index.php" style="font-size: 0.78rem; color: #EF4444; font-weight: 700; text-decoration: none; display: flex; align-items: center; gap: 0.2rem;">
          <i data-lucide="x" style="width: 13px; height: 13px;"></i> Clear Filters
        </a>
      <?php endif; ?>
    </form>

    <!-- View Mode Switch -->
    <div style="display: flex; gap: 0.25rem; background: var(--bg-input); padding: 3px; border-radius: 8px; border: 1px solid var(--border-color);">
      <a href="?view=table&status=<?= urlencode($filterStatus) ?>&shop_id=<?= urlencode($filterShop) ?>&search=<?= urlencode($searchQuery) ?>" class="btn btn-sm" style="background: <?= $viewMode === 'table' ? '#8162EE' : 'transparent' ?>; color: <?= $viewMode === 'table' ? '#FFF' : 'var(--text-secondary)' ?>; border: none; font-weight: 700; border-radius: 6px; padding: 0.4rem 0.85rem; display: inline-flex; align-items: center; gap: 0.35rem;">
        <i data-lucide="table" style="width: 14px; height: 14px;"></i> Table
      </a>
      <a href="?view=card&status=<?= urlencode($filterStatus) ?>&shop_id=<?= urlencode($filterShop) ?>&search=<?= urlencode($searchQuery) ?>" class="btn btn-sm" style="background: <?= $viewMode === 'card' ? '#8162EE' : 'transparent' ?>; color: <?= $viewMode === 'card' ? '#FFF' : 'var(--text-secondary)' ?>; border: none; font-weight: 700; border-radius: 6px; padding: 0.4rem 0.85rem; display: inline-flex; align-items: center; gap: 0.35rem;">
        <i data-lucide="layout-grid" style="width: 14px; height: 14px;"></i> Cards
      </a>
    </div>
  </div>

  <?php if ($viewMode === 'table'): ?>
    <!-- Orders Table View -->
    <div class="card" style="padding: 1.5rem;">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer Details</th>
              <th>Laundry Outlet</th>
              <th>Amount & Payment</th>
              <th>Assigned Driver</th>
              <th>Status</th>
              <th>Actions & Flow</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($orders as $o): 
                if (!is_array($o)) continue;
                $ordId = $o['id'] ?? '';
                $num = $o['order_number'] ?? $o['orderNumber'] ?? "ORD-{$ordId}";
                $cust = $o['customer_name'] ?? $o['customerName'] ?? ($o['customer']['name'] ?? 'Customer');
                $phone = $o['customer_phone'] ?? $o['customerPhone'] ?? ($o['customer']['phone'] ?? 'N/A');
                $shop = $o['shop_name'] ?? $o['laundryName'] ?? ($o['laundry_shop']['name'] ?? 'Star Wash Ultra Premium');
                $amt = floatval($o['total_amount'] ?? $o['amount'] ?? 0);
                $payMethod = $o['payment_method'] ?? $o['paymentMethod'] ?? 'COD';
                $payStatus = $o['payment_status'] ?? $o['paymentStatus'] ?? 'PAID';
                $driver = !empty($o['delivery_boy_name']) && $o['delivery_boy_name'] !== 'Unassigned' 
                    ? $o['delivery_boy_name'] 
                    : (!empty($o['deliveryBoyName']) && $o['deliveryBoyName'] !== 'Unassigned' 
                        ? $o['deliveryBoyName'] 
                        : ($o['delivery_boy']['name'] ?? ($o['delivery_partner']['user']['name'] ?? 'Unassigned')));
                if (($driver === 'Unassigned' || empty($driver)) && !empty($o['delivery_boy_id'])) {
                    $foundDriver = getDriverNameById($o['delivery_boy_id']);
                    if ($foundDriver) $driver = $foundDriver;
                }
                $status = strtoupper($o['status'] ?? 'PENDING');
                $created = $o['created_at'] ?? $o['createdAt'] ?? 'Today';
            ?>
              <tr>
                <td>
                  <div style="font-weight: 800; font-size: 0.95rem; color: var(--brand-purple);"><?= htmlspecialchars($num) ?></div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);"><?= htmlspecialchars($created) ?></div>
                </td>
                <td>
                  <div style="font-weight: 700; font-size: 0.85rem;"><?= htmlspecialchars($cust) ?></div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);"><?= htmlspecialchars($phone) ?></div>
                </td>
                <td>
                  <strong style="font-size: 0.85rem;"><?= htmlspecialchars($shop) ?></strong>
                </td>
                <td>
                  <strong style="color: #10B981; font-size: 0.95rem;">₹<?= number_format($amt) ?></strong>
                  <div style="font-size: 0.72rem; color: var(--text-muted);"><?= htmlspecialchars($payMethod) ?> (<?= htmlspecialchars($payStatus) ?>)</div>
                </td>
                <td>
                  <?php if (!empty($driver) && $driver !== 'Unassigned'): ?>
                    <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
                      <span style="font-weight: 700; font-size: 0.82rem; color: #0284C7; background: rgba(2, 132, 199, 0.08); padding: 0.25rem 0.55rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.3rem;">
                        🛵 <?= htmlspecialchars($driver) ?>
                      </span>
                      <button type="button" onclick="openAssignModal('<?= htmlspecialchars($ordId) ?>', '<?= htmlspecialchars($num) ?>')" title="Change Driver" class="btn btn-secondary btn-sm" style="padding: 0.2rem 0.45rem; font-size: 0.7rem; color: var(--text-muted); border-radius: 5px;">
                        Change
                      </button>
                    </div>
                  <?php else: ?>
                    <button type="button" onclick="openAssignModal('<?= htmlspecialchars($ordId) ?>', '<?= htmlspecialchars($num) ?>')" class="btn btn-secondary btn-sm" style="color: #F59E0B; border: 1px dashed rgba(245, 158, 11, 0.5); font-size: 0.75rem; font-weight: 700; background: rgba(245, 158, 11, 0.05); padding: 0.35rem 0.65rem;">
                      + Assign Driver
                    </button>
                  <?php endif; ?>
                </td>
                <td>
                  <span class="badge" style="background: <?= $status === 'DELIVERED' ? '#D1FAE5' : ($status === 'OUT_FOR_DELIVERY' ? '#E0F2FE' : ($status === 'CANCELLED' ? '#FEE2E2' : '#FEF3C7')) ?>; color: <?= $status === 'DELIVERED' ? '#059669' : ($status === 'OUT_FOR_DELIVERY' ? '#0284C7' : ($status === 'CANCELLED' ? '#DC2626' : '#D97706')) ?>; font-weight: 800;">
                    <?= $status ?>
                  </span>
                </td>
                <td>
                  <div style="display: flex; gap: 0.35rem; align-items: center; white-space: nowrap;">
                    <button type="button" onclick="viewOrderDetails(<?= htmlspecialchars(json_encode($o)) ?>)" class="btn btn-secondary btn-sm" title="Inspect Order Details" style="padding: 0.3rem 0.5rem;">
                      <i data-lucide="eye" style="width: 14px; height: 14px;"></i>
                    </button>

                    <!-- Direct Action Status Selector (Change directly from row) -->
                    <form method="POST" action="" style="display: inline-block; margin: 0;">
                      <input type="hidden" name="action" value="status">
                      <input type="hidden" name="order_id" value="<?= htmlspecialchars($ordId) ?>">
                      <input type="hidden" name="order_number" value="<?= htmlspecialchars($num) ?>">
                      <select name="status" data-original="<?= $status ?>" onchange="handleDirectStatusChange(this, '<?= htmlspecialchars($ordId) ?>', '<?= htmlspecialchars($num) ?>', '<?= htmlspecialchars($driver) ?>')" class="form-control form-control-sm" style="font-size: 0.75rem; font-weight: 700; padding: 0.28rem 0.5rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); cursor: pointer;" title="Change Order Status Directly">
                        <option value="PENDING" <?= $status === 'PENDING' ? 'selected' : '' ?>>⏳ Pending</option>
                        <option value="CONFIRMED" <?= $status === 'CONFIRMED' ? 'selected' : '' ?>>✓ Confirmed</option>
                        <option value="WASHING" <?= ($status === 'WASHING' || $status === 'PROCESSING') ? 'selected' : '' ?>>🔄 Washing</option>
                        <option value="READY" <?= $status === 'READY' ? 'selected' : '' ?>>✨ Ready</option>
                        <option value="OUT_FOR_DELIVERY" <?= $status === 'OUT_FOR_DELIVERY' ? 'selected' : '' ?>>🛵 Dispatched</option>
                        <option value="DELIVERED" <?= $status === 'DELIVERED' ? 'selected' : '' ?>>🎉 Delivered</option>
                        <option value="CANCELLED" <?= $status === 'CANCELLED' ? 'selected' : '' ?>>❌ Cancel</option>
                      </select>
                    </form>

                    <!-- Contextual Flow Shortcut Button -->
                    <?php if ($status === 'PENDING' || $status === 'CONFIRMED'): ?>
                      <form method="POST" action="" style="display: inline;">
                        <input type="hidden" name="action" value="status">
                        <input type="hidden" name="order_id" value="<?= htmlspecialchars($ordId) ?>">
                        <input type="hidden" name="status" value="WASHING">
                        <button type="submit" class="btn btn-primary btn-sm" style="background: #2563EB; border: none; font-size: 0.72rem; padding: 0.28rem 0.55rem;">Start Wash</button>
                      </form>
                    <?php elseif ($status === 'WASHING' || $status === 'PROCESSING'): ?>
                      <form method="POST" action="" style="display: inline;">
                        <input type="hidden" name="action" value="status">
                        <input type="hidden" name="order_id" value="<?= htmlspecialchars($ordId) ?>">
                        <input type="hidden" name="status" value="READY">
                        <button type="submit" class="btn btn-primary btn-sm" style="background: #10B981; border: none; font-size: 0.72rem; padding: 0.28rem 0.55rem;">Mark Ready</button>
                      </form>
                    <?php elseif ($status === 'READY'): ?>
                      <button type="button" onclick="openAssignModal('<?= htmlspecialchars($ordId) ?>', '<?= htmlspecialchars($num) ?>')" class="btn btn-primary btn-sm" style="background: #0284C7; border: none; font-size: 0.72rem; padding: 0.28rem 0.55rem;">
                        Dispatch 🛵
                      </button>
                    <?php elseif ($status === 'OUT_FOR_DELIVERY'): ?>
                      <form method="POST" action="" style="display: inline;" onsubmit="return confirm('Confirm delivery of order #<?= htmlspecialchars($num) ?>?');">
                        <input type="hidden" name="action" value="status">
                        <input type="hidden" name="order_id" value="<?= htmlspecialchars($ordId) ?>">
                        <input type="hidden" name="status" value="DELIVERED">
                        <button type="submit" class="btn btn-success btn-sm" style="font-size: 0.72rem; padding: 0.28rem 0.55rem;">Mark Delivered</button>
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
  <?php else: ?>
    <!-- Orders Card View (Modern Grid) -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); gap: 1.25rem;">
      <?php foreach ($orders as $o): 
          if (!is_array($o)) continue;
          $ordId = $o['id'] ?? '';
          $num = $o['order_number'] ?? $o['orderNumber'] ?? "ORD-{$ordId}";
          $status = strtoupper($o['status'] ?? 'PENDING');
          $custName = $o['customer_name'] ?? $o['customerName'] ?? ($o['customer']['name'] ?? 'Customer');
          $custPhone = $o['customer_phone'] ?? $o['customerPhone'] ?? ($o['customer']['phone'] ?? '');
          $pickup = $o['pickup_address'] ?? $o['pickupAddress'] ?? 'Pune Address';
          $cardAmt = floatval($o['total_amount'] ?? $o['amount'] ?? 0);
          $payMethod = $o['payment_method'] ?? $o['paymentMethod'] ?? 'Online (UPI)';
          $payStatus = strtoupper($o['payment_status'] ?? $o['paymentStatus'] ?? 'PAID');
          $driver = !empty($o['delivery_boy_name']) && $o['delivery_boy_name'] !== 'Unassigned' 
              ? $o['delivery_boy_name'] 
              : (!empty($o['deliveryBoyName']) && $o['deliveryBoyName'] !== 'Unassigned' 
                  ? $o['deliveryBoyName'] 
                  : ($o['delivery_boy']['name'] ?? ($o['delivery_partner']['user']['name'] ?? 'Unassigned')));
          if (($driver === 'Unassigned' || empty($driver)) && !empty($o['delivery_boy_id'])) {
              $foundDriver = getDriverNameById($o['delivery_boy_id']);
              if ($foundDriver) $driver = $foundDriver;
          }
          $itemsCount = !empty($o['items']) ? count($o['items']) : 1;

          // Status colors & icons
          $statusBg = 'rgba(129, 98, 238, 0.12)';
          $statusColor = '#8162EE';
          if ($status === 'DELIVERED') {
              $statusBg = 'rgba(16, 185, 129, 0.15)';
              $statusColor = '#10B981';
          } elseif ($status === 'WASHING' || $status === 'PROCESSING') {
              $statusBg = 'rgba(37, 99, 235, 0.15)';
              $statusColor = '#2563EB';
          } elseif ($status === 'CANCELLED') {
              $statusBg = 'rgba(239, 68, 68, 0.15)';
              $statusColor = '#EF4444';
          } elseif ($status === 'OUT_FOR_DELIVERY') {
              $statusBg = 'rgba(2, 132, 199, 0.15)';
              $statusColor = '#0284C7';
          } elseif ($status === 'PENDING') {
              $statusBg = 'rgba(245, 158, 11, 0.15)';
              $statusColor = '#D97706';
          }
      ?>
        <div class="card" style="padding: 1.25rem; border-radius: 14px; border: 1px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 15px rgba(0,0,0,0.03);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 24px rgba(129,98,238,0.12)';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.03)';">
          <div>
            <!-- Card Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(129, 98, 238, 0.12); display: flex; align-items: center; justify-content: center; color: var(--brand-purple);">
                  <i data-lucide="package" style="width: 16px; height: 16px;"></i>
                </div>
                <strong style="color: var(--brand-purple); font-size: 1rem; letter-spacing: -0.3px;"><?= htmlspecialchars($num) ?></strong>
              </div>
              <form method="POST" action="" style="display: inline-block; margin: 0; position: relative;">
                <input type="hidden" name="action" value="status">
                <input type="hidden" name="order_id" value="<?= htmlspecialchars($ordId) ?>">
                <input type="hidden" name="order_number" value="<?= htmlspecialchars($num) ?>">
                <select name="status" data-original="<?= $status ?>" onchange="handleStatusChange(this, '<?= htmlspecialchars($ordId) ?>', '<?= htmlspecialchars($num) ?>', '<?= htmlspecialchars($driver) ?>')" style="background: <?= $statusBg ?>; color: <?= $statusColor ?>; padding: 0.25rem 1.4rem 0.25rem 0.65rem; border-radius: 20px; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; border: none; appearance: none; -webkit-appearance: none; cursor: pointer; outline: none; position: relative; z-index: 2;" title="Change Order Status">
                  <option value="PENDING" <?= $status === 'PENDING' ? 'selected' : '' ?>>Pending</option>
                  <option value="CONFIRMED" <?= $status === 'CONFIRMED' ? 'selected' : '' ?>>Confirmed</option>
                  <option value="WASHING" <?= $status === 'WASHING' || $status === 'PROCESSING' ? 'selected' : '' ?>>Washing</option>
                  <option value="READY" <?= $status === 'READY' ? 'selected' : '' ?>>Ready</option>
                  <option value="OUT_FOR_DELIVERY" <?= $status === 'OUT_FOR_DELIVERY' ? 'selected' : '' ?>>Dispatched</option>
                  <option value="DELIVERED" <?= $status === 'DELIVERED' ? 'selected' : '' ?>>Delivered</option>
                  <option value="CANCELLED" <?= $status === 'CANCELLED' ? 'selected' : '' ?>>Cancelled</option>
                </select>
                <div style="position: absolute; right: 6px; top: 50%; transform: translateY(-50%); pointer-events: none; z-index: 3;">
                  <i data-lucide="chevron-down" style="width: 12px; height: 12px; color: <?= $statusColor ?>;"></i>
                </div>
              </form>
            </div>

            <!-- Customer & Mobile Row -->
            <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.6rem; background: var(--bg-input); padding: 0.6rem 0.8rem; border-radius: 8px; border: 1px solid var(--border-color);">
              <div style="width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #8162EE 0%, #32138F 100%); color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; flex-shrink: 0;">
                <?= strtoupper(substr($custName, 0, 1)) ?>
              </div>
              <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 800; font-size: 0.88rem; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                  <?= htmlspecialchars($custName) ?>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">
                  📞 <?= htmlspecialchars($custPhone ?: '9309386003') ?>
                </div>
              </div>
            </div>

            <!-- Pickup Address -->
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.75rem; display: flex; align-items: flex-start; gap: 0.4rem; line-height: 1.4;">
              <i data-lucide="map-pin" style="width: 15px; height: 15px; color: #EF4444; flex-shrink: 0; margin-top: 2px;"></i>
              <span title="<?= htmlspecialchars($pickup) ?>">
                <?= strlen($pickup) > 65 ? htmlspecialchars(substr($pickup, 0, 65)) . '…' : htmlspecialchars($pickup) ?>
              </span>
            </div>

            <!-- Meta Badges: Items count & Driver -->
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem;">
              <span style="font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 6px; background: rgba(129, 98, 238, 0.08); color: var(--brand-purple); font-weight: 700;">
                🧺 <?= $itemsCount ?> Garments
              </span>
              <?php if (!empty($driver) && $driver !== 'Unassigned'): ?>
                <span style="font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 6px; background: rgba(2, 132, 199, 0.08); color: #0284C7; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;">
                  🛵 <?= htmlspecialchars($driver) ?>
                  <button type="button" onclick="openAssignModal('<?= htmlspecialchars($ordId) ?>', '<?= htmlspecialchars($num) ?>')" style="background: none; border: none; padding: 0; cursor: pointer; color: var(--text-muted); display: inline-flex; align-items: center; margin-left: 2px;" title="Change Driver">
                    <i data-lucide="edit-3" style="width: 11px; height: 11px;"></i>
                  </button>
                </span>
              <?php else: ?>
                <button type="button" onclick="openAssignModal('<?= htmlspecialchars($ordId) ?>', '<?= htmlspecialchars($num) ?>')" style="font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 6px; background: rgba(245, 158, 11, 0.08); color: #D97706; font-weight: 700; border: 1px dashed rgba(245, 158, 11, 0.4); cursor: pointer;">
                  + Assign Driver
                </button>
              <?php endif; ?>
            </div>
          </div>

          <!-- Card Footer (Amount & Quick Status Update & Inspect CTA) -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.75rem; margin-top: 0.25rem; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Total Bill</div>
              <strong style="color: #10B981; font-size: 1.2rem; font-weight: 900;">₹<?= number_format($cardAmt) ?></strong>
            </div>

            <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
              <!-- (Status dropdown moved to top-right badge to match mobile app) -->              <button 
                type="button" 
                onclick="viewOrderDetails(<?= htmlspecialchars(json_encode($o)) ?>)" 
                class="btn btn-primary btn-sm"
                style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.4rem 0.85rem; border-radius: 8px; font-weight: 800; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.35rem; box-shadow: 0 3px 10px rgba(129,98,238,0.3); cursor: pointer;"
              >
                <i data-lucide="eye" style="width: 14px; height: 14px;"></i> Inspect Order
              </button>
            </div>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>
</div>

<!-- Modal: Modern High-Fidelity Order Details Inspection -->
<div id="orderDetailsModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); align-items: center; justify-content: center; z-index: 99999; padding: 1.5rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 18px; border: 1px solid var(--border-color); width: 100%; max-width: 680px; max-height: 90vh; overflow-y: auto; color: var(--text-primary); box-shadow: 0 25px 50px rgba(0,0,0,0.5); display: flex; flex-direction: column;">
    
    <!-- Modal Header -->
    <div style="padding: 1.25rem 1.75rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, rgba(129, 98, 238, 0.15) 0%, rgba(50, 19, 143, 0.22) 100%);">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div style="width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #8162EE 0%, #32138F 100%); display: flex; align-items: center; justify-content: center; color: #FFF; box-shadow: 0 4px 14px rgba(129,98,238,0.4);">
          <i data-lucide="shopping-bag" style="width: 22px; height: 22px;"></i>
        </div>
        <div>
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <h3 id="modalOrderNumber" style="margin: 0; font-size: 1.3rem; font-weight: 900; color: var(--text-primary); letter-spacing: -0.4px;">
              Order #
            </h3>
            <span id="modalOrderStatusBadge" class="badge"></span>
          </div>
          <p style="margin: 0.15rem 0 0 0; font-size: 0.8rem; color: var(--text-secondary);">
            Complete order breakdown, customer doorstep address, partner store & items summary
          </p>
        </div>
      </div>
      <button onclick="closeModal('orderDetailsModal')" style="background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 8px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); font-size: 1rem;">✕</button>
    </div>

    <!-- Modal Content Body -->
    <div id="modalOrderContent" style="padding: 1.5rem 1.75rem; font-size: 0.88rem; line-height: 1.5; overflow-y: auto;">
      <!-- Dynamically filled via viewOrderDetails() -->
    </div>

    <!-- Modal Footer Actions -->
    <div style="padding: 1rem 1.75rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-input);">
      <button type="button" onclick="window.print()" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 700;">
        <i data-lucide="printer" style="width: 14px; height: 14px;"></i> Print Receipt
      </button>
      <div style="display: flex; gap: 0.75rem;">
        <button onclick="closeModal('orderDetailsModal')" class="btn btn-secondary" style="font-weight: 700; padding: 0.55rem 1.4rem;">
          Close
        </button>
      </div>
    </div>
  </div>
</div>

<!-- Modal: Assign Delivery Boy -->
<div id="assignDriverModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(6px); align-items: center; justify-content: center; z-index: 99999; padding: 1rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 440px; padding: 1.5rem; color: var(--text-primary);">
    <h3 style="margin-top: 0; color: var(--brand-purple); font-size: 1.15rem; font-weight: 800;">Assign Delivery Driver</h3>
    <form method="POST" action="">
      <input type="hidden" name="action" value="assign_driver">
      <input type="hidden" id="assignOrderId" name="order_id" value="">
      <input type="hidden" id="assignOrderNumHidden" name="order_number" value="">
      
      <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">
        Dispatching Order <strong id="assignOrderNumText"></strong> for doorstep customer delivery.
      </p>

      <div class="form-group" style="margin-bottom: 1.25rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Select Delivery Partner *</label>
        <input type="hidden" name="driver_name" id="hiddenDriverName" value="">
        <select name="delivery_boy_id" id="driverSelect" class="form-control" required style="width: 100%;">
          <?php if (!empty($drivers)): ?>
            <?php foreach ($drivers as $dr): ?>
              <?php 
                $drId = htmlspecialchars($dr['user_id'] ?? $dr['id'] ?? '');
                $drName = htmlspecialchars($dr['name'] ?? '');
                $drVeh = htmlspecialchars($dr['vehicle_number'] ?? $dr['vehicleNumber'] ?? $dr['vehicle_type'] ?? $dr['vehicleType'] ?? 'Scooter');
              ?>
              <option value="<?= $drId ?>" data-name="<?= $drName ?>">
                🛵 <?= $drName ?> (<?= $drVeh ?>)
              </option>
            <?php endforeach; ?>
          <?php else: ?>
            <option value="" disabled selected>No delivery boy registered for this shop</option>
          <?php endif; ?>
        </select>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('assignDriverModal')" class="btn btn-secondary">Cancel</button>
        <button type="submit" onclick="document.getElementById('hiddenDriverName').value = document.getElementById('driverSelect').options[document.getElementById('driverSelect').selectedIndex].getAttribute('data-name');" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.6rem 1.25rem; border-radius: 8px; font-weight: 700;">Confirm Dispatch</button>
      </div>
    </form>
  </div>
</div>

<script>
  function viewOrderDetails(ord) {
    const num = ord.order_number || ord.orderNumber || `Order #${ord.id || ''}`;
    document.getElementById('modalOrderNumber').innerText = num;
    
    const custName = ord.customer_name || ord.customerName || (ord.customer && ord.customer.name) || (ord.user && ord.user.name) || 'Valued Customer';
    const custPhone = ord.customer_phone || ord.customerPhone || (ord.customer && ord.customer.phone) || (ord.user && ord.user.phone) || 'N/A';
    const address = ord.pickup_address || ord.pickupAddress || ord.delivery_address || ord.deliveryAddress || ord.address || (ord.customer && ord.customer.address) || 'Highway bypass, Tathawade, Pune';
    const shopName = ord.shop_name || ord.shopName || ord.laundryName || ord.laundry_name || (ord.laundry_shop && ord.laundry_shop.name) || 'Star Wash Ultra Premium';
    const amount = ord.total_amount || ord.amount || ord.grand_total || ord.total || (ord.items && ord.items.reduce((acc, it) => acc + (it.total_price || (it.unit_price ? it.unit_price * (it.quantity || 1) : 0)), 0)) || 0;
    const payMethod = (ord.payment_method || ord.paymentMethod || 'Online UPI').toUpperCase();
    const payStatus = (ord.payment_status || ord.paymentStatus || 'PAID').toUpperCase();
    const driver = ord.delivery_boy_name || ord.deliveryBoyName || (ord.delivery_boy && ord.delivery_boy.name) || (ord.delivery_partner && ord.delivery_partner.user && ord.delivery_partner.user.name) || 'Unassigned';
    const status = (ord.status || 'PENDING').toUpperCase();

    // Render Status Badge
    let badgeClass = 'badge-info';
    let statusBg = 'rgba(129,98,238,0.15)';
    let statusColor = '#8162EE';
    if (status === 'DELIVERED') {
      statusBg = 'rgba(16,185,129,0.15)';
      statusColor = '#10B981';
    } else if (status === 'WASHING' || status === 'PROCESSING') {
      statusBg = 'rgba(37,99,235,0.15)';
      statusColor = '#2563EB';
    } else if (status === 'CANCELLED') {
      statusBg = 'rgba(239,68,68,0.15)';
      statusColor = '#EF4444';
    } else if (status === 'OUT_FOR_DELIVERY') {
      statusBg = 'rgba(2,132,199,0.15)';
      statusColor = '#0284C7';
    }
    const badgeEl = document.getElementById('modalOrderStatusBadge');
    badgeEl.innerText = status;
    badgeEl.style.background = statusBg;
    badgeEl.style.color = statusColor;
    badgeEl.style.fontSize = '0.75rem';
    badgeEl.style.fontWeight = '800';
    badgeEl.style.padding = '0.25rem 0.65rem';
    badgeEl.style.borderRadius = '20px';

    // Garments Breakdown Table
    let itemsTable = '';
    if (ord.items && ord.items.length) {
      itemsTable = `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 1rem; margin-top: 1rem;">
          <div style="font-weight: 800; font-size: 0.9rem; color: var(--brand-purple); margin-bottom: 0.65rem; display: flex; align-items: center; gap: 0.4rem;">
            🧺 Ordered Garments &amp; Wash Services (${ord.items.length} Items)
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted); text-transform: uppercase; font-size: 0.72rem; text-align: left;">
                <th style="padding: 0.4rem 0;">Item &amp; Service</th>
                <th style="padding: 0.4rem 0.5rem; text-align: center;">Qty</th>
                <th style="padding: 0.4rem 0.5rem; text-align: right;">Rate</th>
                <th style="padding: 0.4rem 0; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
      `;
      ord.items.forEach(it => {
        const iName = it.item_name || it.name || it.service_name || 'Garment Item';
        const iQty = it.quantity || 1;
        const iPrice = it.total_price || (it.unit_price ? it.unit_price * iQty : (it.price ? it.price * iQty : 0));
        const unitRate = it.unit_price || (it.price || (iPrice / iQty));
        itemsTable += `
          <tr style="border-bottom: 1px dashed var(--border-color);">
            <td style="padding: 0.55rem 0; font-weight: 700; color: var(--text-primary);">${iName}</td>
            <td style="padding: 0.55rem 0.5rem; text-align: center;"><span style="background: var(--bg-input); padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 800;">${iQty}</span></td>
            <td style="padding: 0.55rem 0.5rem; text-align: right; color: var(--text-muted);">₹${Number(unitRate).toFixed(2)}</td>
            <td style="padding: 0.55rem 0; text-align: right; font-weight: 800; color: #10B981;">₹${Number(iPrice).toFixed(2)}</td>
          </tr>
        `;
      });
      itemsTable += `
            </tbody>
          </table>
        </div>
      `;
    }

    document.getElementById('modalOrderContent').innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <!-- Two Column Cards: Customer & Shop -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          
          <!-- Customer & Delivery Pin Card -->
          <div style="background: var(--bg-input); padding: 1rem; border-radius: 12px; border: 1px solid var(--border-color);">
            <div style="font-weight: 800; font-size: 0.85rem; color: #8162EE; margin-bottom: 0.6rem; display: flex; align-items: center; gap: 0.4rem;">
              👤 Customer &amp; Location
            </div>
            <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-primary);">${custName}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin: 0.2rem 0 0.5rem 0;">📞 <a href="tel:${custPhone}" style="color: var(--brand-purple); text-decoration: none; font-weight: 700;">${custPhone}</a></div>
            <div style="font-size: 0.8rem; color: var(--text-secondary); display: flex; align-items: flex-start; gap: 0.35rem; line-height: 1.4; border-top: 1px dashed var(--border-color); padding-top: 0.5rem;">
              <span style="color: #EF4444; flex-shrink: 0;">📍</span> <span>${address}</span>
            </div>
          </div>

          <!-- Outlet & Driver Card -->
          <div style="background: var(--bg-input); padding: 1rem; border-radius: 12px; border: 1px solid var(--border-color);">
            <div style="font-weight: 800; font-size: 0.85rem; color: #0284C7; margin-bottom: 0.6rem; display: flex; align-items: center; gap: 0.4rem;">
              🏪 Outlet &amp; Dispatch Partner
            </div>
            <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-primary);">${shopName}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin: 0.2rem 0 0.5rem 0;">Service Hub: Pune Cluster</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.4rem; border-top: 1px dashed var(--border-color); padding-top: 0.5rem;">
              <span>🛵</span> <strong>Driver:</strong> <span style="color: ${driver !== 'Unassigned' ? '#0284C7' : '#D97706'}; font-weight: 700;">${driver}</span>
            </div>
          </div>
        </div>

        <!-- Garments Breakdown Table -->
        ${itemsTable}

        <!-- Billing & Settlement Summary -->
        <div style="background: var(--bg-input); padding: 1rem 1.25rem; border-radius: 12px; border: 1px solid var(--border-color);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; font-size: 0.82rem; color: var(--text-muted);">
            <span>Payment Mode:</span>
            <strong style="color: var(--text-primary);">${payMethod}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; font-size: 0.82rem; color: var(--text-muted);">
            <span>Payment Status:</span>
            <span class="badge badge-${payStatus === 'PAID' ? 'success' : 'warning'}" style="font-size: 0.72rem;">${payStatus}</span>
          </div>
          <div style="border-top: 1px solid var(--border-color); padding-top: 0.6rem; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 1rem; font-weight: 800; color: var(--text-primary);">Grand Total Bill:</span>
            <strong style="color: #10B981; font-size: 1.4rem; font-weight: 900;">₹${Number(amount).toLocaleString()}</strong>
          </div>
        </div>

        <!-- Change Order Status Workflow (Available to Laundry Owner & Admin) -->
        <div style="background: var(--bg-card); padding: 1.1rem; border-radius: 12px; border: 1.5px solid rgba(129,98,238,0.35); box-shadow: 0 4px 15px rgba(129,98,238,0.08);">
          <div style="font-weight: 800; font-size: 0.9rem; color: var(--brand-purple); margin-bottom: 0.65rem; display: flex; align-items: center; gap: 0.45rem;">
            <i data-lucide="refresh-cw" style="width: 17px; height: 17px;"></i> Change Order Workflow Status
          </div>
          <form method="POST" action="" style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
            <input type="hidden" name="action" value="status">
            <input type="hidden" id="modalStatusOrderId" name="order_id" value="">
            <div style="flex: 1; min-width: 200px;">
              <select id="modalStatusSelect" name="status" class="form-control" onchange="checkModalStatus(this, '${driver}', '${ord.id || ''}', '${num}')" style="width: 100%; font-weight: 700; font-size: 0.85rem; padding: 0.45rem 0.65rem;">
                <option value="PENDING">⏳ Pending Confirmation</option>
                <option value="CONFIRMED">✓ Confirmed &amp; Queued</option>
                <option value="WASHING">🔄 Washing in Progress</option>
                <option value="READY">✨ Ready for Dispatch</option>
                <option value="OUT_FOR_DELIVERY">🛵 Dispatched with Driver</option>
                <option value="DELIVERED">🎉 Successfully Delivered</option>
                <option value="CANCELLED">❌ Cancel Order</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); border: none; color: #FFF; font-weight: 800; padding: 0.55rem 1.25rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(129,98,238,0.35); cursor: pointer;">
              Update Status
            </button>
          </form>
        </div>
      </div>
    `;

    // Populate the status update inputs
    setTimeout(() => {
      const idInput = document.getElementById('modalStatusOrderId');
      const selInput = document.getElementById('modalStatusSelect');
      if (idInput) idInput.value = ord.id || ord.order_number || ord.orderNumber || '';
      if (selInput) {
        const currentStatus = (ord.status || 'PENDING').toUpperCase();
        selInput.value = currentStatus;
        
        // Disable backward status changes
        const statusOrder = ['PENDING', 'CONFIRMED', 'WASHING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];
        const currentIndex = statusOrder.indexOf(currentStatus);
        
        Array.from(selInput.options).forEach(opt => {
          const optIndex = statusOrder.indexOf(opt.value);
          if (optIndex !== -1 && optIndex < currentIndex) {
            opt.disabled = true;
          } else {
            opt.disabled = false;
          }
        });
      }
    }, 50);

    openModal('orderDetailsModal');
    if (window.lucide) lucide.createIcons();
  }

  function openAssignModal(orderId, orderNum) {
    document.getElementById('assignOrderId').value = orderId;
    const numEl = document.getElementById('assignOrderNumHidden');
    if (numEl) numEl.value = orderNum;
    document.getElementById('assignOrderNumText').innerText = orderNum;
    openModal('assignDriverModal');
  }

  function handleStatusChange(selectEl, orderId, orderNum, driver) {
    if (selectEl.value === 'OUT_FOR_DELIVERY' && (driver === 'Unassigned' || driver.trim() === '')) {
      alert("⚠️ You must assign a delivery partner before dispatching this order.");
      selectEl.value = selectEl.getAttribute('data-original') || 'READY';
      openAssignModal(orderId, orderNum);
      return false;
    }
    selectEl.form.submit();
  }

  function handleDirectStatusChange(selectEl, orderId, orderNum, driver) {
    const val = selectEl.value;
    if (val === 'OUT_FOR_DELIVERY' && (!driver || driver === 'Unassigned' || driver.trim() === '')) {
      alert("⚠️ Please assign a delivery partner before marking this order as Dispatched.");
      selectEl.value = selectEl.getAttribute('data-original') || 'READY';
      openAssignModal(orderId, orderNum);
      return false;
    }
    if (val === 'CANCELLED') {
      if (!confirm("Are you sure you want to cancel order #" + orderNum + "?")) {
        selectEl.value = selectEl.getAttribute('data-original') || 'PENDING';
        return false;
      }
    }
    selectEl.form.submit();
  }

  function checkModalStatus(selectEl, driver, orderId, orderNum) {
    if (selectEl.value === 'OUT_FOR_DELIVERY' && (driver === 'Unassigned' || driver.trim() === '')) {
      alert("⚠️ You must assign a delivery partner before dispatching this order.");
      selectEl.value = 'READY';
      closeModal('orderDetailsModal');
      openAssignModal(orderId, orderNum);
    }
  }

  // Auto-open specific order if requested
  <?php if (!empty($_GET['view_order'])): ?>
  window.addEventListener('DOMContentLoaded', () => {
    const targetOrderId = <?= json_encode($_GET['view_order']) ?>;
    const allOrdersJson = <?= json_encode($orders) ?>;
    const targetOrder = allOrdersJson.find(o => String(o.id) === String(targetOrderId) || String(o.order_number) === String(targetOrderId));
    if (targetOrder) {
      setTimeout(() => {
        viewOrderDetails(targetOrder);
      }, 500);
    }
  });
  <?php endif; ?>
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
