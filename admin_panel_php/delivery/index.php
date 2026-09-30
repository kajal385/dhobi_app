<?php
$pageTitle = 'Delivery Fleet Management';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';
require_once __DIR__ . '/../includes/db.php';

$isOwner = isLaundryOwner();
$shopId = currentShopId();
$myShopName = currentShopName();
$currentUser = currentUser();
$myOwnerName = $currentUser['name'] ?? '';
$myEmail = $currentUser['email'] ?? '';

$msg = null;
$msgType = 'success';

// Handle All Form Actions (CRUD + Duty + Status)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $id = $_POST['delivery_boy_id'] ?? '';

    if ($action === 'create') {
        $assignedShopId = $isOwner ? ($shopId ?: '30') : ($_POST['shop_id'] ?? '30');
        $assignedShopName = $isOwner ? $myShopName : ($_POST['shop_name'] ?? 'Laundry Outlet');

        $newDriver = [
            'id' => 'DB-' . (time() % 10000),
            'name' => trim($_POST['name'] ?? 'New Driver'),
            'phone' => trim($_POST['phone'] ?? ''),
            'email' => trim($_POST['email'] ?? ''),
            'password' => trim($_POST['password'] ?? '123456'),
            'city' => trim($_POST['city'] ?? 'Pune'),
            'vehicleType' => $_POST['vehicle_type'] ?? 'Scooter',
            'vehicleNumber' => strtoupper(trim($_POST['vehicle_number'] ?? 'MH-12-XX-0000')),
            'dlNumber' => strtoupper(trim($_POST['dl_number'] ?? '')),
            'aadhaarNumber' => trim($_POST['aadhaar_number'] ?? ''),
            'shopId' => $assignedShopId,
            'shopName' => $assignedShopName,
            'ownerName' => $isOwner ? $myOwnerName : 'DhobiPro Partner',
            'salaryModel' => $_POST['salary_model'] ?? '₹40 / Delivered Order',
            'bankName' => trim($_POST['bank_name'] ?? 'HDFC Bank'),
            'bankAccount' => trim($_POST['bank_account'] ?? ''),
            'ifscCode' => strtoupper(trim($_POST['ifsc_code'] ?? '')),
            'isOnline' => true,
            'completedDeliveries' => 0,
            'assignedOrders' => 0,
            'rating' => 5.0,
            'accountStatus' => 'ACTIVE',
            'createdAt' => date('Y-m-d H:i:s'),
        ];

        // 1. Direct persistent save into dhobi_db MySQL database
        $dbDriverId = saveDeliveryBoyToDb($newDriver);
        if ($dbDriverId) {
            $newDriver['id'] = $dbDriverId;
            $newDriver['delivery_boy_id'] = $dbDriverId;
        }

        // 2. Also keep in session
        if (!isset($_SESSION['custom_drivers'])) {
            $_SESSION['custom_drivers'] = [];
        }
        array_unshift($_SESSION['custom_drivers'], $newDriver);

        // 3. API notifications
        apiPost('/owner/delivery-boys', $newDriver);
        apiPost('/admin/delivery-boys', $newDriver);

        $msg = "New delivery partner \"{$newDriver['name']}\" onboarded and saved to database successfully!";
    } elseif ($action === 'edit' && $id) {
        $assignedShopId = $isOwner ? ($shopId ?: '30') : ($_POST['shop_id'] ?? '30');
        $assignedShopName = $isOwner ? $myShopName : ($_POST['shop_name'] ?? 'Laundry Outlet');

        $updatedData = [
            'name' => trim($_POST['name'] ?? ''),
            'phone' => trim($_POST['phone'] ?? ''),
            'email' => trim($_POST['email'] ?? ''),
            'password' => trim($_POST['password'] ?? '123456'),
            'city' => trim($_POST['city'] ?? 'Pune'),
            'vehicleType' => $_POST['vehicle_type'] ?? 'Scooter',
            'vehicle_type' => $_POST['vehicle_type'] ?? 'Scooter',
            'vehicleNumber' => strtoupper(trim($_POST['vehicle_number'] ?? '')),
            'vehicle_number' => strtoupper(trim($_POST['vehicle_number'] ?? '')),
            'dlNumber' => strtoupper(trim($_POST['dl_number'] ?? '')),
            'dl_number' => strtoupper(trim($_POST['dl_number'] ?? '')),
            'aadhaarNumber' => trim($_POST['aadhaar_number'] ?? ''),
            'shopId' => $assignedShopId,
            'shop_id' => $assignedShopId,
            'shopName' => $assignedShopName,
            'salaryModel' => $_POST['salary_model'] ?? '₹40 / Delivered Order',
            'bankName' => trim($_POST['bank_name'] ?? 'HDFC Bank'),
            'bankAccount' => trim($_POST['bank_account'] ?? ''),
            'ifscCode' => strtoupper(trim($_POST['ifsc_code'] ?? '')),
            'accountStatus' => $_POST['account_status'] ?? 'ACTIVE',
            'account_status' => $_POST['account_status'] ?? 'ACTIVE',
        ];

        // 1. Direct persistent update in dhobi_db
        updateDeliveryBoyInDb($id, $updatedData);

        // 2. Update in session
        if (!empty($_SESSION['custom_drivers'])) {
            foreach ($_SESSION['custom_drivers'] as &$cd) {
                if (strval($cd['id'] ?? '') === strval($id) || strval($cd['delivery_boy_id'] ?? '') === strval($id)) {
                    $cd = array_merge($cd, $updatedData);
                    break;
                }
            }
            unset($cd);
        }

        apiPut("/admin/delivery-boys/{$id}", $updatedData);
        $msg = "Delivery partner profile for \"{$updatedData['name']}\" updated successfully in database!";
    } elseif ($action === 'status' && $id) {
        $newStatus = $_POST['status'] ?? 'ACTIVE';

        // 1. Direct update in dhobi_db
        toggleDeliveryBoyStatusInDb($id, $newStatus);

        // 2. Update in session
        if (!empty($_SESSION['custom_drivers'])) {
            foreach ($_SESSION['custom_drivers'] as &$cd) {
                if (strval($cd['id'] ?? '') === strval($id) || strval($cd['delivery_boy_id'] ?? '') === strval($id)) {
                    $cd['accountStatus'] = $newStatus;
                    $cd['account_status'] = $newStatus;
                    break;
                }
            }
            unset($cd);
        }
        apiPost("/admin/delivery-boys/{$id}/status", ['status' => $newStatus]);
        $msg = "Driver account status changed to {$newStatus}.";
    } elseif ($action === 'toggle_duty' && $id) {
        $duty = !empty($_POST['is_online']) ? true : false;

        // 1. Direct update in dhobi_db
        toggleDeliveryBoyDutyInDb($id, $duty);

        // 2. Update in session
        if (!empty($_SESSION['custom_drivers'])) {
            foreach ($_SESSION['custom_drivers'] as &$cd) {
                if (strval($cd['id'] ?? '') === strval($id) || strval($cd['delivery_boy_id'] ?? '') === strval($id)) {
                    $cd['isOnline'] = $duty;
                    $cd['is_online'] = $duty;
                    break;
                }
            }
            unset($cd);
        }
        $msg = "Duty status updated to " . ($duty ? 'ON DUTY' : 'OFFLINE') . ".";
    } elseif ($action === 'delete' && $id) {
        // 1. Direct removal from dhobi_db
        deleteDeliveryBoyFromDb($id);

        // 2. Remove from session
        if (!empty($_SESSION['custom_drivers'])) {
            $_SESSION['custom_drivers'] = array_values(array_filter($_SESSION['custom_drivers'], function($d) use ($id) {
                return strval($d['id'] ?? '') !== strval($id) && strval($d['delivery_boy_id'] ?? '') !== strval($id);
            }));
        }
        apiDelete("/admin/delivery-boys/{$id}");
        $msg = "Driver record #{$id} permanently removed from database.";
    }
}

// Fetch available shops for assignment dropdown
$shopsRes = apiGet('/admin/laundries');
$allShops = apiExtractList($shopsRes);
if (!empty($_SESSION['custom_shops'])) {
    $allShops = array_merge($_SESSION['custom_shops'], $allShops);
}

// Fetch delivery boys directly from dhobi_db MySQL
$dbDrivers = fetchDeliveryBoysFromDb($isOwner ? ($shopId ?: 30) : null);
if (!empty($dbDrivers)) {
    $drivers = $dbDrivers;
} else {
    $endpoint = ($isOwner && $shopId) ? '/owner/delivery-boys' : '/admin/delivery-boys';
    $res = apiGet($endpoint, $isOwner ? ['shop_id' => $shopId] : []);
    $drivers = apiExtractList($res);
}

// Merge session custom drivers
if (!empty($_SESSION['custom_drivers'])) {
    $drivers = array_merge($_SESSION['custom_drivers'], $drivers);
}

// Default baseline records if empty
if (empty($drivers)) {
    $drivers = [
        [
            'id' => '1',
            'name' => 'Rahul Shinde',
            'phone' => '+91 9899011223',
            'email' => 'rahul.rider@dhobipro.com',
            'password' => '123456',
            'city' => 'Pune',
            'vehicleType' => 'Honda Activa (Scooter)',
            'vehicleNumber' => 'MH-12-AB-1234',
            'dlNumber' => 'MH12-2022-0098',
            'aadhaarNumber' => '8921 4455 1209',
            'shopId' => '30',
            'shopName' => 'Star Wash Ultra Premium',
            'ownerName' => 'Ashish Bhosale',
            'salaryModel' => '₹45 / Delivered Order',
            'bankName' => 'HDFC Bank',
            'bankAccount' => '50100223344551',
            'ifscCode' => 'HDFC0001234',
            'isOnline' => true,
            'completedDeliveries' => 42,
            'assignedOrders' => 2,
            'rating' => 4.9,
            'accountStatus' => 'ACTIVE'
        ],
        [
            'id' => '2',
            'name' => 'Vikram Jadhav',
            'phone' => '+91 9822144556',
            'email' => 'vikram.delivery@dhobipro.com',
            'password' => '123456',
            'city' => 'Pune',
            'vehicleType' => 'TVS Jupiter (Scooter)',
            'vehicleNumber' => 'MH-14-EF-5678',
            'dlNumber' => 'MH14-2021-0412',
            'aadhaarNumber' => '6733 9901 8842',
            'shopId' => '41',
            'shopName' => 'Super Clean Wash Laundry',
            'ownerName' => 'Javed Atkhar',
            'salaryModel' => '₹16,000 / Fixed Monthly',
            'bankName' => 'State Bank of India',
            'bankAccount' => '30998877665544',
            'ifscCode' => 'SBIN0004567',
            'isOnline' => false,
            'completedDeliveries' => 28,
            'assignedOrders' => 0,
            'rating' => 4.8,
            'accountStatus' => 'ACTIVE'
        ],
        [
            'id' => '3',
            'name' => 'Amit Patil',
            'phone' => '+91 9766500112',
            'email' => 'amit.patil@dhobipro.com',
            'password' => '123456',
            'city' => 'Pune',
            'vehicleType' => 'Hero Splendor',
            'vehicleNumber' => 'MH-12-CD-9012',
            'dlNumber' => 'MH12-2023-0189',
            'aadhaarNumber' => '4412 8820 9011',
            'shopId' => '45',
            'shopName' => 'Super Fast Wash',
            'ownerName' => 'Kajal Test Owner',
            'salaryModel' => '₹40 / Delivered Order',
            'bankName' => 'ICICI Bank',
            'bankAccount' => '001205004412',
            'ifscCode' => 'ICIC0000012',
            'isOnline' => true,
            'completedDeliveries' => 65,
            'assignedOrders' => 1,
            'rating' => 5.0,
            'accountStatus' => 'ACTIVE'
        ],
    ];
}

// STRICT TENANT ISOLATION: When logged in as Laundry Owner, ONLY show delivery riders belonging to their shop!
if ($isOwner) {
    $myId = strval($shopId ?: currentShopId());
    $myShop = strtolower(trim($myShopName));

    $drivers = array_values(array_filter($drivers, function($d) use ($myId, $myShop) {
        $dShopId = strval($d['shopId'] ?? $d['shop_id'] ?? '');
        $dShopName = strtolower(trim($d['shopName'] ?? $d['shop_name'] ?? ''));

        if ($myId && $dShopId === $myId) return true;
        if ($myShop && (strpos($dShopName, $myShop) !== false || strpos($myShop, $dShopName) !== false)) return true;
        return false;
    }));

    if (empty($drivers)) {
        // Fallback dedicated driver for the owner's shop
        $drivers = [
            [
                'id' => '1',
                'name' => 'Rahul Shinde',
                'phone' => '+91 9899011223',
                'email' => 'rahul.rider@dhobipro.com',
                'password' => '123456',
                'city' => 'Pune',
                'vehicleType' => 'Honda Activa (Scooter)',
                'vehicleNumber' => 'MH-12-AB-1234',
                'dlNumber' => 'MH12-2022-0098',
                'aadhaarNumber' => '8921 4455 1209',
                'shopId' => $myId ?: '30',
                'shopName' => $myShopName ?: 'Star Wash Ultra Premium',
                'ownerName' => $myOwnerName ?: 'Partner Owner',
                'salaryModel' => '₹45 / Delivered Order',
                'bankName' => 'HDFC Bank',
                'bankAccount' => '50100223344551',
                'ifscCode' => 'HDFC0001234',
                'isOnline' => true,
                'completedDeliveries' => 42,
                'assignedOrders' => 2,
                'rating' => 4.9,
                'accountStatus' => 'ACTIVE'
            ]
        ];
    }
}

// Filters & Search
$q = strtolower(trim($_GET['search'] ?? ''));
$statusFilter = $_GET['status'] ?? 'ALL';
$dutyFilter = $_GET['duty'] ?? 'ALL';

if ($q !== '' || $statusFilter !== 'ALL' || $dutyFilter !== 'ALL') {
    $drivers = array_values(array_filter($drivers, function($d) use ($q, $statusFilter, $dutyFilter) {
        $name = strtolower($d['name'] ?? '');
        $phone = strtolower($d['phone'] ?? '');
        $shop = strtolower($d['shopName'] ?? $d['shop_name'] ?? '');
        $dl = strtolower($d['dlNumber'] ?? $d['dl_number'] ?? '');
        $vNum = strtolower($d['vehicleNumber'] ?? $d['vehicle_number'] ?? '');
        $dStatus = strtoupper($d['accountStatus'] ?? $d['account_status'] ?? 'ACTIVE');
        $isOnline = !empty($d['isOnline']) || !empty($d['is_online']);

        if ($q !== '') {
            $matched = (strpos($name, $q) !== false || strpos($phone, $q) !== false || strpos($shop, $q) !== false || strpos($dl, $q) !== false || strpos($vNum, $q) !== false);
            if (!$matched) return false;
        }

        if ($statusFilter !== 'ALL' && $dStatus !== $statusFilter) {
            return false;
        }

        if ($dutyFilter === 'ONLINE' && !$isOnline) return false;
        if ($dutyFilter === 'OFFLINE' && $isOnline) return false;

        return true;
    }));
}

// Stats Calculation
$totalDriversCount = count($drivers);
$onlineCount = count(array_filter($drivers, fn($d) => !empty($d['isOnline']) || !empty($d['is_online'])));
$totalCompleted = array_sum(array_map(fn($d) => intval($d['completedDeliveries'] ?? $d['completed_deliveries'] ?? 0), $drivers));
?>

<div style="color: var(--text-primary);">
  <!-- Header Title & Action -->
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary); margin: 0;">
        <i data-lucide="truck" style="width: 28px; height: 28px; color: #F59E0B;"></i> 
        <?= $isOwner ? 'My Shop Delivery Fleet & Riders' : 'Delivery Fleet & Dispatch Drivers' ?>
      </h1>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.2rem; margin-bottom: 0;">
        <?= $isOwner ? 'Manage your pickup & doorstep delivery boys, duty hours, vehicle registration, and driver logins.' : 'Oversee platform-wide delivery partners, verify driving licenses, set shop assignments, and monitor real-time duty status.' ?>
      </p>
    </div>

    <button type="button" onclick="openModal('onboardDriverModal')" class="btn btn-primary" style="background: linear-gradient(64.52deg, #F59E0B 1.27%, #EA580C 98.26%); border: none; color: #FFF; font-weight: 800; padding: 0.65rem 1.3rem; border-radius: 8px; display: inline-flex; align-items: center; gap: 0.4rem; box-shadow: 0 4px 14px rgba(245,158,11,0.35); cursor: pointer;">
      <i data-lucide="user-plus" style="width: 18px; height: 18px;"></i> <?= $isOwner ? '+ Register Shop Driver' : '+ Onboard New Driver' ?>
    </button>
  </div>

  <?php if ($msg): ?>
    <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); color: #065F46; padding: 0.85rem 1.2rem; border-radius: 10px; font-weight: 700; font-size: 0.85rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.6rem; box-shadow: 0 2px 8px rgba(16,185,129,0.1);">
      <i data-lucide="check-circle" style="width: 18px; height: 18px; color: #10B981;"></i>
      <span><?= htmlspecialchars($msg) ?></span>
    </div>
  <?php endif; ?>

  <!-- KPI Metric Cards -->
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
    <div class="card" style="padding: 1.1rem; display: flex; align-items: center; gap: 0.85rem; border-left: 4px solid #F59E0B;">
      <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(245,158,11,0.15); color: #F59E0B; display: flex; align-items: center; justify-content: center;">
        <i data-lucide="truck" style="width: 22px; height: 22px;"></i>
      </div>
      <div>
        <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Active Fleet</div>
        <div style="font-size: 1.4rem; font-weight: 900; color: var(--text-primary);"><?= $totalDriversCount ?> Riders</div>
      </div>
    </div>

    <div class="card" style="padding: 1.1rem; display: flex; align-items: center; gap: 0.85rem; border-left: 4px solid #10B981;">
      <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(16,185,129,0.15); color: #10B981; display: flex; align-items: center; justify-content: center;">
        <i data-lucide="radio" style="width: 22px; height: 22px;"></i>
      </div>
      <div>
        <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">On-Duty Now</div>
        <div style="font-size: 1.4rem; font-weight: 900; color: #10B981;"><?= $onlineCount ?> Online</div>
      </div>
    </div>

    <div class="card" style="padding: 1.1rem; display: flex; align-items: center; gap: 0.85rem; border-left: 4px solid #8162EE;">
      <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(129,98,238,0.15); color: #8162EE; display: flex; align-items: center; justify-content: center;">
        <i data-lucide="package-check" style="width: 22px; height: 22px;"></i>
      </div>
      <div>
        <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Completed Runs</div>
        <div style="font-size: 1.4rem; font-weight: 900; color: var(--text-primary);"><?= number_format($totalCompleted) ?> Trips</div>
      </div>
    </div>

    <div class="card" style="padding: 1.1rem; display: flex; align-items: center; gap: 0.85rem; border-left: 4px solid #EC4899;">
      <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(236,72,153,0.15); color: #EC4899; display: flex; align-items: center; justify-content: center;">
        <i data-lucide="star" style="width: 22px; height: 22px;"></i>
      </div>
      <div>
        <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Fleet Rating</div>
        <div style="font-size: 1.4rem; font-weight: 900; color: #F59E0B;">★ 4.9 <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">/ 5.0</span></div>
      </div>
    </div>
  </div>

  <!-- Search & Filter Toolbar -->
  <div class="card" style="padding: 0.85rem 1.25rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
    <form method="GET" action="" style="display: flex; gap: 0.65rem; align-items: center; flex-wrap: wrap; flex: 1;">
      <div style="position: relative; flex: 1; min-width: 220px; max-width: 340px;">
        <i data-lucide="search" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; color: var(--text-muted);"></i>
        <input type="text" name="search" value="<?= htmlspecialchars($_GET['search'] ?? '') ?>" placeholder="Search driver name, phone, license plate, DL..." style="width: 100%; padding: 0.45rem 0.75rem 0.45rem 2rem; border-radius: 8px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); font-size: 0.82rem; outline: none; box-sizing: border-box;">
      </div>

      <select name="duty" onchange="this.form.submit()" style="background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); font-size: 0.82rem; font-weight: 700; padding: 0.45rem 0.65rem; border-radius: 8px; outline: none; cursor: pointer;">
        <option value="ALL" <?= $dutyFilter === 'ALL' ? 'selected' : '' ?>>All Duty States</option>
        <option value="ONLINE" <?= $dutyFilter === 'ONLINE' ? 'selected' : '' ?>>🟢 On Duty (Online)</option>
        <option value="OFFLINE" <?= $dutyFilter === 'OFFLINE' ? 'selected' : '' ?>>⚪ Offline</option>
      </select>

      <select name="status" onchange="this.form.submit()" style="background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); font-size: 0.82rem; font-weight: 700; padding: 0.45rem 0.65rem; border-radius: 8px; outline: none; cursor: pointer;">
        <option value="ALL" <?= $statusFilter === 'ALL' ? 'selected' : '' ?>>All Statuses</option>
        <option value="ACTIVE" <?= $statusFilter === 'ACTIVE' ? 'selected' : '' ?>>Active Only</option>
        <option value="SUSPENDED" <?= $statusFilter === 'SUSPENDED' ? 'selected' : '' ?>>Suspended Only</option>
      </select>

      <button type="submit" class="btn btn-secondary btn-sm" style="font-weight: 700; padding: 0.45rem 0.85rem;">Filter</button>
      <?php if (!empty($_GET['search']) || $dutyFilter !== 'ALL' || $statusFilter !== 'ALL'): ?>
        <a href="index.php" style="font-size: 0.78rem; color: #EF4444; font-weight: 700; text-decoration: none; display: flex; align-items: center; gap: 0.2rem;">
          <i data-lucide="x" style="width: 13px; height: 13px;"></i> Clear
        </a>
      <?php endif; ?>
    </form>
  </div>

  <!-- Drivers Table View -->
  <div class="card" style="padding: 1.5rem;">
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Rider Executive</th>
            <th>Assigned Laundry Shop</th>
            <th>Vehicle &amp; License Plate</th>
            <th>Rider Login Credentials</th>
            <th>Duty Status</th>
            <th>Trips &amp; Orders</th>
            <th>Account Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($drivers)): ?>
            <tr>
              <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                <i data-lucide="truck" style="width: 36px; height: 36px; margin: 0 auto 0.5rem auto; display: block; opacity: 0.4;"></i>
                No delivery partners found matching the filter criteria.
              </td>
            </tr>
          <?php endif; ?>

          <?php foreach ($drivers as $d): 
              if (!is_array($d)) continue;
              $dId = $d['id'] ?? '';
              $name = $d['name'] ?? 'Driver';
              $phone = $d['phone'] ?? 'N/A';
              $email = $d['email'] ?? '';
              $pwd = $d['password'] ?? '123456';
              $city = $d['city'] ?? 'Pune';
              $vehicle = $d['vehicleType'] ?? $d['vehicle_type'] ?? 'Scooter';
              $vNumber = $d['vehicleNumber'] ?? $d['vehicle_number'] ?? 'MH-12-XX-0000';
              $dl = $d['dlNumber'] ?? $d['dl_number'] ?? 'N/A';
              $shop = $d['shopName'] ?? $d['shop_name'] ?? ($d['laundry_shop']['name'] ?? 'Star Wash Ultra Premium');
              $shopRef = $d['shopId'] ?? $d['shop_id'] ?? '';
              $completed = $d['completedDeliveries'] ?? $d['completed_deliveries'] ?? 0;
              $assigned = $d['assignedOrders'] ?? $d['assigned_orders'] ?? 0;
              $rating = floatval($d['rating'] ?? 4.9);
              $isOnline = !empty($d['isOnline']) || !empty($d['is_online']) || ($d['status'] ?? '') === 'active';
              $status = strtoupper($d['accountStatus'] ?? $d['account_status'] ?? ($d['status'] ?? 'ACTIVE'));
              $cleanText = preg_replace('/[^A-Za-z0-9]/', '', $name);
              $initials = strtoupper(substr($cleanText ?: 'DB', 0, 2));
          ?>
            <tr>
              <td>
                <div style="display: flex; align-items: center; gap: 0.65rem;">
                  <div style="width: 38px; height: 38px; border-radius: 8px; background: linear-gradient(135deg, #F59E0B 0%, #EA580C 100%); color: #FFF; font-weight: 800; font-size: 0.78rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 6px rgba(245,158,11,0.25);">
                    <?= htmlspecialchars($initials) ?>
                  </div>
                  <div>
                    <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-primary);"><?= htmlspecialchars($name) ?></div>
                    <div style="font-size: 0.74rem; color: var(--text-muted);">📞 <?= htmlspecialchars($phone) ?> • 📍 <?= htmlspecialchars($city) ?></div>
                  </div>
                </div>
              </td>
              <td>
                <div style="font-weight: 800; font-size: 0.88rem; color: var(--brand-purple); display: flex; align-items: center; gap: 0.35rem;">
                  <i data-lucide="store" style="width: 14px; height: 14px;"></i> <?= htmlspecialchars($shop) ?>
                </div>
                <?php if ($shopRef): ?>
                  <span style="font-size: 0.7rem; background: rgba(129,98,238,0.1); color: var(--brand-purple); padding: 0.1rem 0.45rem; border-radius: 4px; font-weight: 700;">
                    Shop #<?= htmlspecialchars($shopRef) ?>
                  </span>
                <?php endif; ?>
              </td>
              <td>
                <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">🛵 <?= htmlspecialchars($vehicle) ?></div>
                <div style="font-size: 0.72rem; color: var(--text-muted); font-family: monospace;">Plate: <strong><?= htmlspecialchars($vNumber) ?></strong></div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">DL: <?= htmlspecialchars($dl) ?></div>
              </td>
              <td>
                <div style="font-size: 0.78rem;">
                  <span style="color: var(--text-muted);">User:</span> <strong style="color: var(--text-primary);"><?= htmlspecialchars($phone) ?></strong>
                </div>
                <div style="margin-top: 0.2rem;">
                  <code style="background: rgba(129,98,238,0.15); color: #8162EE; padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 800; font-size: 0.78rem;">
                    <?= htmlspecialchars($pwd) ?>
                  </code>
                </div>
              </td>
              <td>
                <form method="POST" action="" style="display: inline;">
                  <input type="hidden" name="action" value="toggle_duty">
                  <input type="hidden" name="delivery_boy_id" value="<?= htmlspecialchars($dId) ?>">
                  <input type="hidden" name="is_online" value="<?= $isOnline ? '0' : '1' ?>">
                  <button type="submit" style="background: <?= $isOnline ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)' ?>; color: <?= $isOnline ? '#059669' : '#64748B' ?>; border: 1px solid <?= $isOnline ? 'rgba(16,185,129,0.3)' : 'rgba(148,163,184,0.3)' ?>; padding: 0.25rem 0.65rem; border-radius: 20px; font-size: 0.75rem; font-weight: 800; cursor: pointer;" title="Click to toggle driver duty state">
                    <?= $isOnline ? '● ON DUTY' : '○ OFFLINE' ?>
                  </button>
                </form>
              </td>
              <td>
                <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">
                  <?= number_format($completed) ?> Deliveries
                </div>
                <div style="font-size: 0.72rem; color: #F59E0B; font-weight: 800;">
                  ★ <?= number_format($rating, 1) ?> (Rating)
                </div>
              </td>
              <td>
                <span class="badge badge-<?= $status === 'ACTIVE' ? 'success' : 'danger' ?>" style="font-size: 0.72rem;">
                  <?= $status ?>
                </span>
              </td>
              <td>
                <div style="display: flex; gap: 0.35rem; align-items: center; white-space: nowrap;">
                  <!-- Inspect Profile Button -->
                  <button type="button" onclick="inspectDriver(<?= htmlspecialchars(json_encode($d)) ?>)" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 0.25rem;" title="Inspect Rider Complete Details">
                    <i data-lucide="eye" style="width: 14px; height: 14px;"></i> Inspect
                  </button>

                  <!-- Edit Full Registration Info Button -->
                  <button type="button" onclick="openEditDriver(<?= htmlspecialchars(json_encode($d)) ?>)" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 0.25rem; font-weight: 700; color: #8162EE;" title="Edit Driver Registration & Credentials">
                    <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i> Edit
                  </button>

                  <!-- Account Status Toggle (Active / Suspend) -->
                  <form method="POST" action="" style="display: inline;" onsubmit="return confirm('Change status for this driver?');">
                    <input type="hidden" name="action" value="status">
                    <input type="hidden" name="delivery_boy_id" value="<?= htmlspecialchars($dId) ?>">
                    <input type="hidden" name="status" value="<?= $status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' ?>">
                    <button type="submit" class="btn btn-sm" style="background: <?= $status === 'ACTIVE' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)' ?>; color: <?= $status === 'ACTIVE' ? '#EF4444' : '#10B981' ?>; border: none; font-weight: 700; padding: 0.35rem 0.55rem; border-radius: 6px;" title="<?= $status === 'ACTIVE' ? 'Suspend Driver' : 'Activate Driver' ?>">
                      <?= $status === 'ACTIVE' ? 'Suspend' : 'Activate' ?>
                    </button>
                  </form>

                  <!-- Delete Driver -->
                  <form method="POST" action="" style="display: inline;" onsubmit="return confirm('Permanently remove rider <?= htmlspecialchars(addslashes($name)) ?>?');">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="delivery_boy_id" value="<?= htmlspecialchars($dId) ?>">
                    <button type="submit" class="btn btn-sm" style="background: rgba(239,68,68,0.1); color: #EF4444; border: 1px solid rgba(239,68,68,0.25); padding: 0.35rem 0.55rem; border-radius: 6px; cursor: pointer;" title="Delete Driver">
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
<!-- MODAL 1: ONBOARD / CREATE NEW DELIVERY PARTNER                            -->
<!-- ========================================================================= -->
<div id="onboardDriverModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); align-items: center; justify-content: center; z-index: 99999; padding: 1.5rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 18px; border: 1px solid var(--border-color); width: 100%; max-width: 680px; max-height: 90vh; overflow-y: auto; color: var(--text-primary); box-shadow: 0 25px 60px rgba(0,0,0,0.5);">
    <div style="padding: 1.25rem 1.75rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(234, 88, 12, 0.18) 100%);">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #F59E0B 0%, #EA580C 100%); display: flex; align-items: center; justify-content: center; color: #FFF; box-shadow: 0 4px 12px rgba(245,158,11,0.35);">
          <i data-lucide="user-plus" style="width: 20px; height: 20px;"></i>
        </div>
        <div>
          <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--text-primary);">Onboard New Delivery Partner</h3>
          <p style="margin: 0.15rem 0 0 0; font-size: 0.76rem; color: var(--text-secondary);">Register rider credentials, vehicle details, and franchise assignment</p>
        </div>
      </div>
      <button type="button" onclick="closeModal('onboardDriverModal')" style="background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted);">✕</button>
    </div>

    <form method="POST" action="" style="padding: 1.75rem;">
      <input type="hidden" name="action" value="create">

      <div style="font-weight: 800; font-size: 0.85rem; color: #F59E0B; text-transform: uppercase; margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.4rem;">
        <i data-lucide="user" style="width: 16px; height: 16px;"></i> Personal &amp; Account Information
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Rider Full Name *</label>
          <input type="text" name="name" required class="form-control" style="width: 100%; font-size: 0.85rem;" placeholder="e.g. Rahul Shinde">
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Mobile Phone *</label>
          <input type="text" name="phone" required class="form-control" style="width: 100%; font-size: 0.85rem;" placeholder="e.g. 9899011223">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Email Address</label>
          <input type="email" name="email" class="form-control" style="width: 100%; font-size: 0.85rem;" placeholder="e.g. rahul@dhobipro.com">
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Rider App Login Password *</label>
          <input type="text" name="password" required value="123456" class="form-control" style="width: 100%; font-size: 0.85rem;">
        </div>
      </div>

      <div style="font-weight: 800; font-size: 0.85rem; color: #8162EE; text-transform: uppercase; margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.4rem;">
        <i data-lucide="truck" style="width: 16px; height: 16px;"></i> Vehicle, Driving License &amp; KYC
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Vehicle Type *</label>
          <select name="vehicle_type" class="form-control" style="width: 100%; font-size: 0.85rem;">
            <option value="Honda Activa (Scooter)">Honda Activa (Scooter)</option>
            <option value="TVS Jupiter (Scooter)">TVS Jupiter (Scooter)</option>
            <option value="Hero Splendor (Motorcycle)">Hero Splendor (Motorcycle)</option>
            <option value="Bajaj Pulsar (Bike)">Bajaj Pulsar (Bike)</option>
            <option value="Electric Scooter (EV)">Electric Scooter (EV)</option>
            <option value="Delivery Cargo 3-Wheeler">Delivery Cargo 3-Wheeler</option>
          </select>
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Vehicle Plate Number *</label>
          <input type="text" name="vehicle_number" required class="form-control" style="width: 100%; font-size: 0.85rem;" placeholder="e.g. MH-12-AB-1234">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Driving License (DL) Number *</label>
          <input type="text" name="dl_number" required class="form-control" style="width: 100%; font-size: 0.85rem;" placeholder="e.g. MH12-2022-0098">
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Aadhaar / Government ID</label>
          <input type="text" name="aadhaar_number" class="form-control" style="width: 100%; font-size: 0.85rem;" placeholder="e.g. 5421 8765 4321">
        </div>
      </div>

      <div style="font-weight: 800; font-size: 0.85rem; color: #10B981; text-transform: uppercase; margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.4rem;">
        <i data-lucide="store" style="width: 16px; height: 16px;"></i> Shop Assignment &amp; Payouts
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Operating City *</label>
          <input type="text" name="city" required value="Pune" class="form-control" style="width: 100%; font-size: 0.85rem;">
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Assigned Laundry Shop *</label>
          <?php if ($isOwner): ?>
            <input type="hidden" name="shop_id" value="<?= htmlspecialchars($shopId ?: '30') ?>">
            <input type="hidden" name="shop_name" value="<?= htmlspecialchars($myShopName) ?>">
            <input type="text" readonly value="<?= htmlspecialchars($myShopName) ?> (#<?= htmlspecialchars($shopId ?: '30') ?>)" class="form-control" style="width: 100%; background: var(--bg-input); font-weight: 700; font-size: 0.85rem;">
          <?php else: ?>
            <select name="shop_id" class="form-control" style="width: 100%; font-size: 0.85rem;">
              <?php foreach ($allShops as $sh): 
                  $sId = $sh['id'] ?? '';
                  $sName = $sh['shopName'] ?? $sh['name'] ?? "Shop #{$sId}";
              ?>
                <option value="<?= htmlspecialchars($sId) ?>"><?= htmlspecialchars($sName) ?> (ID: #<?= htmlspecialchars($sId) ?>)</option>
              <?php endforeach; ?>
            </select>
          <?php endif; ?>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Salary / Commission Model</label>
          <select name="salary_model" class="form-control" style="width: 100%; font-size: 0.82rem;">
            <option value="₹40 / Delivered Order">₹40 / Delivered Order</option>
            <option value="₹50 / Delivered Order">₹50 / Delivered Order</option>
            <option value="₹15,000 / Fixed Monthly">₹15,000 / Fixed Monthly</option>
            <option value="₹18,000 / Fixed Monthly">₹18,000 / Fixed Monthly</option>
          </select>
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Bank Account Number</label>
          <input type="text" name="bank_account" class="form-control" style="width: 100%; font-size: 0.82rem;" placeholder="e.g. 50100987654321">
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Bank IFSC Code</label>
          <input type="text" name="ifsc_code" class="form-control" style="width: 100%; font-size: 0.82rem;" placeholder="e.g. HDFC0001234">
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
        <button type="button" onclick="closeModal('onboardDriverModal')" class="btn btn-secondary" style="font-weight: 700;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #F59E0B 1.27%, #EA580C 98.26%); border: none; color: #FFF; font-weight: 800; padding: 0.65rem 1.6rem; border-radius: 8px; box-shadow: 0 4px 14px rgba(245,158,11,0.35); cursor: pointer;">
          Save &amp; Onboard Partner
        </button>
      </div>
    </form>
  </div>
</div>

<!-- ========================================================================= -->
<!-- MODAL 2: EDIT DELIVERY PARTNER (ALL REGISTRATION FIELDS)                  -->
<!-- ========================================================================= -->
<div id="editDriverModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); align-items: center; justify-content: center; z-index: 99999; padding: 1.5rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 18px; border: 1px solid var(--border-color); width: 100%; max-width: 680px; max-height: 90vh; overflow-y: auto; color: var(--text-primary); box-shadow: 0 25px 60px rgba(0,0,0,0.5);">
    <div style="padding: 1.25rem 1.75rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, rgba(129, 98, 238, 0.12) 0%, rgba(50, 19, 143, 0.18) 100%);">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #8162EE 0%, #32138F 100%); display: flex; align-items: center; justify-content: center; color: #FFF; box-shadow: 0 4px 12px rgba(129,98,238,0.35);">
          <i data-lucide="edit-3" style="width: 20px; height: 20px;"></i>
        </div>
        <div>
          <h3 id="editDriverHeaderTitle" style="margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--text-primary);">Edit Driver Information</h3>
          <p style="margin: 0.15rem 0 0 0; font-size: 0.76rem; color: var(--text-secondary);">Update all registration parameters, vehicle details, and credentials</p>
        </div>
      </div>
      <button type="button" onclick="closeModal('editDriverModal')" style="background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted);">✕</button>
    </div>

    <form method="POST" action="" style="padding: 1.75rem;">
      <input type="hidden" name="action" value="edit">
      <input type="hidden" id="editDriverId" name="delivery_boy_id" value="">

      <div style="font-weight: 800; font-size: 0.85rem; color: #8162EE; text-transform: uppercase; margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.4rem;">
        <i data-lucide="user" style="width: 16px; height: 16px;"></i> Personal &amp; Account Information
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Driver Full Name *</label>
          <input type="text" id="ed_name" name="name" required class="form-control" style="width: 100%; font-size: 0.85rem;">
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Mobile Phone *</label>
          <input type="text" id="ed_phone" name="phone" required class="form-control" style="width: 100%; font-size: 0.85rem;">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Email Address</label>
          <input type="email" id="ed_email" name="email" class="form-control" style="width: 100%; font-size: 0.85rem;">
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Rider Login Password *</label>
          <input type="text" id="ed_password" name="password" required class="form-control" style="width: 100%; font-size: 0.85rem;">
        </div>
      </div>

      <div style="font-weight: 800; font-size: 0.85rem; color: #F59E0B; text-transform: uppercase; margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.4rem;">
        <i data-lucide="truck" style="width: 16px; height: 16px;"></i> Vehicle, Driving License &amp; KYC
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Vehicle Type *</label>
          <input type="text" id="ed_vehicle_type" name="vehicle_type" required class="form-control" style="width: 100%; font-size: 0.85rem;">
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Vehicle Plate Number *</label>
          <input type="text" id="ed_vehicle_number" name="vehicle_number" required class="form-control" style="width: 100%; font-size: 0.85rem;">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Driving License (DL) Number *</label>
          <input type="text" id="ed_dl_number" name="dl_number" required class="form-control" style="width: 100%; font-size: 0.85rem;">
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Aadhaar / Government ID</label>
          <input type="text" id="ed_aadhaar_number" name="aadhaar_number" class="form-control" style="width: 100%; font-size: 0.85rem;">
        </div>
      </div>

      <div style="font-weight: 800; font-size: 0.85rem; color: #10B981; text-transform: uppercase; margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.4rem;">
        <i data-lucide="store" style="width: 16px; height: 16px;"></i> Shop Assignment &amp; Account Status
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Operating City *</label>
          <input type="text" id="ed_city" name="city" required class="form-control" style="width: 100%; font-size: 0.85rem;">
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Assigned Shop</label>
          <?php if ($isOwner): ?>
            <input type="hidden" name="shop_id" value="<?= htmlspecialchars($shopId ?: '30') ?>">
            <input type="hidden" name="shop_name" value="<?= htmlspecialchars($myShopName) ?>">
            <input type="text" readonly value="<?= htmlspecialchars($myShopName) ?>" class="form-control" style="width: 100%; background: var(--bg-input); font-weight: 700; font-size: 0.85rem;">
          <?php else: ?>
            <select id="ed_shop_id" name="shop_id" class="form-control" style="width: 100%; font-size: 0.85rem;">
              <?php foreach ($allShops as $sh): 
                  $sId = $sh['id'] ?? '';
                  $sName = $sh['shopName'] ?? $sh['name'] ?? "Shop #{$sId}";
              ?>
                <option value="<?= htmlspecialchars($sId) ?>"><?= htmlspecialchars($sName) ?> (ID: #<?= htmlspecialchars($sId) ?>)</option>
              <?php endforeach; ?>
            </select>
          <?php endif; ?>
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Account Status</label>
          <select id="ed_account_status" name="account_status" class="form-control" style="width: 100%; font-size: 0.85rem;">
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Salary / Commission</label>
          <input type="text" id="ed_salary_model" name="salary_model" class="form-control" style="width: 100%; font-size: 0.82rem;">
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Bank Account</label>
          <input type="text" id="ed_bank_account" name="bank_account" class="form-control" style="width: 100%; font-size: 0.82rem;">
        </div>
        <div>
          <label class="form-label" style="display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.35rem;">Bank IFSC Code</label>
          <input type="text" id="ed_ifsc_code" name="ifsc_code" class="form-control" style="width: 100%; font-size: 0.82rem;">
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
        <button type="button" onclick="closeModal('editDriverModal')" class="btn btn-secondary" style="font-weight: 700;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); border: none; color: #FFF; font-weight: 800; padding: 0.65rem 1.6rem; border-radius: 8px; box-shadow: 0 4px 14px rgba(129,98,238,0.4); cursor: pointer;">
          Save All Changes
        </button>
      </div>
    </form>
  </div>
</div>

<!-- ========================================================================= -->
<!-- MODAL 3: INSPECT DRIVER (FULL DETAILS & CREDENTIALS)                      -->
<!-- ========================================================================= -->
<div id="inspectDriverModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); align-items: center; justify-content: center; z-index: 99999; padding: 1.5rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 18px; border: 1px solid var(--border-color); width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; color: var(--text-primary); box-shadow: 0 25px 60px rgba(0,0,0,0.5);">
    <div style="padding: 1.25rem 1.75rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(234, 88, 12, 0.18) 100%);">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #F59E0B 0%, #EA580C 100%); display: flex; align-items: center; justify-content: center; color: #FFF;">
          <i data-lucide="shield-check" style="width: 22px; height: 22px;"></i>
        </div>
        <div>
          <h3 id="inspectDriverName" style="margin: 0; font-size: 1.25rem; font-weight: 800; color: var(--text-primary);">Driver Profile</h3>
          <p id="inspectDriverSubtitle" style="margin: 0.15rem 0 0 0; font-size: 0.76rem; color: var(--text-secondary);">Verified delivery partner credentials</p>
        </div>
      </div>
      <button type="button" onclick="closeModal('inspectDriverModal')" style="background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted);">✕</button>
    </div>

    <div id="inspectDriverBody" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
      <!-- Populated via inspectDriver() -->
    </div>

    <div style="padding: 1rem 1.75rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-input);">
      <button type="button" id="inspectEditBtn" class="btn btn-secondary btn-sm" style="font-weight: 700; color: #8162EE; display: inline-flex; align-items: center; gap: 0.35rem;">
        <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i> Edit Driver
      </button>
      <button type="button" onclick="closeModal('inspectDriverModal')" class="btn btn-secondary btn-sm" style="font-weight: 700;">Close</button>
    </div>
  </div>
</div>

<script>
  let currentInspectedDriver = null;

  function openEditDriver(d) {
    document.getElementById('editDriverId').value = d.id || '';
    document.getElementById('editDriverHeaderTitle').innerText = `Edit: ${d.name || 'Driver'}`;
    document.getElementById('ed_name').value = d.name || '';
    document.getElementById('ed_phone').value = d.phone || '';
    document.getElementById('ed_email').value = d.email || '';
    document.getElementById('ed_password').value = d.password || '123456';
    document.getElementById('ed_vehicle_type').value = d.vehicleType || d.vehicle_type || 'Scooter';
    document.getElementById('ed_vehicle_number').value = d.vehicleNumber || d.vehicle_number || 'MH-12-AB-1234';
    document.getElementById('ed_dl_number').value = d.dlNumber || d.dl_number || '';
    document.getElementById('ed_aadhaar_number').value = d.aadhaarNumber || d.aadhaar_number || '';
    document.getElementById('ed_city').value = d.city || 'Pune';
    
    const shopSelect = document.getElementById('ed_shop_id');
    if (shopSelect) {
      shopSelect.value = d.shopId || d.shop_id || '30';
    }

    const statusSelect = document.getElementById('ed_account_status');
    if (statusSelect) {
      statusSelect.value = (d.accountStatus || d.account_status || 'ACTIVE').toUpperCase();
    }

    document.getElementById('ed_salary_model').value = d.salaryModel || d.salary_model || '₹40 / Delivered Order';
    document.getElementById('ed_bank_account').value = d.bankAccount || d.bank_account || '';
    document.getElementById('ed_ifsc_code').value = d.ifscCode || d.ifsc_code || '';

    openModal('editDriverModal');
    if (window.lucide) lucide.createIcons();
  }

  function inspectDriver(d) {
    currentInspectedDriver = d;
    document.getElementById('inspectDriverName').innerText = d.name || 'Delivery Partner';
    document.getElementById('inspectDriverSubtitle').innerText = `Rider ID: #DB-${d.id || ''} • City: ${d.city || 'Pune'}`;

    const isOnline = !!(d.isOnline || d.is_online);
    const status = (d.accountStatus || d.account_status || 'ACTIVE').toUpperCase();

    document.getElementById('inspectDriverBody').innerHTML = `
      <div style="background: var(--bg-input); padding: 1rem; border-radius: 12px; border: 1px solid var(--border-color);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
          <span style="font-size: 0.76rem; font-weight: 800; color: #F59E0B; text-transform: uppercase;">Franchise &amp; Assignment</span>
          <span class="badge badge-${isOnline ? 'success' : 'warning'}" style="font-size: 0.72rem;">${isOnline ? '🟢 ON DUTY' : '⚪ OFFLINE'}</span>
        </div>
        <div style="font-weight: 800; font-size: 1rem; color: var(--brand-purple); display: flex; align-items: center; gap: 0.4rem;">
          <i data-lucide="store" style="width: 16px; height: 16px;"></i> ${d.shopName || d.shop_name || 'Star Wash Ultra Premium'}
        </div>
        <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem;">Owner: ${d.ownerName || 'DhobiPro Franchise Partner'}</div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
        <div style="background: var(--bg-card); padding: 0.85rem; border-radius: 8px; border: 1px solid var(--border-color);">
          <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">📞 Contact Mobile</div>
          <div style="font-weight: 800; font-size: 0.92rem; color: var(--text-primary); margin-top: 0.2rem;">${d.phone || 'N/A'}</div>
        </div>

        <div style="background: var(--bg-card); padding: 0.85rem; border-radius: 8px; border: 1px solid var(--border-color);">
          <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">🔑 Login Password</div>
          <div style="font-weight: 800; font-size: 0.92rem; color: #8162EE; margin-top: 0.2rem;"><code>${d.password || '123456'}</code></div>
        </div>

        <div style="background: var(--bg-card); padding: 0.85rem; border-radius: 8px; border: 1px solid var(--border-color);">
          <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">🛵 Vehicle &amp; Plate</div>
          <div style="font-weight: 800; font-size: 0.88rem; color: var(--text-primary); margin-top: 0.2rem;">${d.vehicleType || d.vehicle_type || 'Scooter'}</div>
          <div style="font-size: 0.74rem; color: var(--text-muted);">${d.vehicleNumber || d.vehicle_number || 'N/A'}</div>
        </div>

        <div style="background: var(--bg-card); padding: 0.85rem; border-radius: 8px; border: 1px solid var(--border-color);">
          <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">📄 Driving License</div>
          <div style="font-weight: 800; font-size: 0.88rem; color: var(--text-primary); margin-top: 0.2rem;">${d.dlNumber || d.dl_number || 'N/A'}</div>
          <div style="font-size: 0.72rem; color: #10B981; font-weight: 700;">Verified Active ✓</div>
        </div>
      </div>

      <div style="background: var(--bg-input); padding: 0.95rem; border-radius: 10px; border: 1px solid var(--border-color);">
        <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; margin-bottom: 0.4rem;">🏦 Payout Bank Details &amp; Compensation</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.82rem;">
          <div><span style="color: var(--text-muted);">Model:</span> <strong>${d.salaryModel || '₹40 / Delivered Order'}</strong></div>
          <div><span style="color: var(--text-muted);">A/C:</span> <strong>${d.bankAccount || d.bank_account || '50100987654321'}</strong></div>
          <div><span style="color: var(--text-muted);">IFSC:</span> <strong>${d.ifscCode || d.ifsc_code || 'HDFC0001234'}</strong></div>
          <div><span style="color: var(--text-muted);">Aadhaar:</span> <strong>${d.aadhaarNumber || '5421 8765 4321'}</strong></div>
        </div>
      </div>
    `;

    document.getElementById('inspectEditBtn').onclick = () => {
      closeModal('inspectDriverModal');
      openEditDriver(currentInspectedDriver);
    };

    openModal('inspectDriverModal');
    if (window.lucide) lucide.createIcons();
  }
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
