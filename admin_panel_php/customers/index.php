<?php
$pageTitle = 'Customer Accounts';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';

$isOwner = isLaundryOwner();
$shopId = currentShopId();

$msg = null;
$error = null;

// Handle CRUD POST actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $id = $_POST['customer_id'] ?? '';

    if ($action === 'create') {
        $payload = [
            'name' => $_POST['name'] ?? '',
            'phone' => $_POST['phone'] ?? '',
            'email' => $_POST['email'] ?? '',
            'city' => $_POST['city'] ?? 'Pune',
        ];
        $res = apiPost('/admin/customers', $payload);
        if ($res['success']) {
            $msg = 'New customer profile created successfully!';
        } else {
            $error = $res['error'] ?? 'Could not create customer.';
        }
    } elseif ($action === 'update' && $id) {
        $payload = [
            'name' => $_POST['name'] ?? '',
            'phone' => $_POST['phone'] ?? '',
            'email' => $_POST['email'] ?? '',
            'city' => $_POST['city'] ?? '',
        ];
        $res = apiPut("/admin/customers/{$id}", $payload);
        $msg = 'Customer details updated successfully!';
    } elseif ($action === 'delete' && $id) {
        $res = apiDelete("/admin/customers/{$id}");
        $msg = 'Customer account removed.';
    } elseif ($action === 'status' && $id) {
        $newStatus = $_POST['status'] ?? 'ACTIVE';
        $res = apiPost("/admin/customers/{$id}/status", ['status' => $newStatus]);
        $msg = "Customer status set to {$newStatus}.";
    }
}

// Fetch customers
$endpoint = ($isOwner && $shopId) ? '/owner/customers' : '/admin/customers';
$res = apiGet($endpoint, $isOwner ? ['shop_id' => $shopId] : []);
$customers = apiExtractList($res);

// Default demo records if empty
if (empty($customers)) {
    $customers = [
        ['id' => '1', 'name' => 'Kajal Gajare', 'phone' => '+91 9309386003', 'email' => 'kajal@gmail.com', 'city' => 'Pune', 'totalOrders' => 6, 'totalSpent' => 2450, 'walletBalance' => 150, 'status' => 'ACTIVE', 'createdAt' => '2026-09-01'],
        ['id' => '2', 'name' => 'Pooja Verma', 'phone' => '+91 9811200998', 'email' => 'pooja.v@gmail.com', 'city' => 'Pune', 'totalOrders' => 18, 'totalSpent' => 14500, 'walletBalance' => 320, 'status' => 'ACTIVE', 'createdAt' => '2026-08-15'],
        ['id' => '3', 'name' => 'Amitabh Sharma', 'phone' => '+91 9766544332', 'email' => 'amitabh.s@yahoo.com', 'city' => 'Pune', 'totalOrders' => 12, 'totalSpent' => 9800, 'walletBalance' => 0, 'status' => 'ACTIVE', 'createdAt' => '2026-08-20'],
        ['id' => '4', 'name' => 'Neha Gupta', 'phone' => '+91 9900122334', 'email' => 'neha.g@outlook.com', 'city' => 'Pune', 'totalOrders' => 24, 'totalSpent' => 22400, 'walletBalance' => 500, 'status' => 'ACTIVE', 'createdAt' => '2026-07-10'],
    ];
}

$search = strtolower(trim($_GET['q'] ?? ''));
if ($search) {
    $customers = array_filter($customers, function ($c) use ($search) {
        return (strpos(strtolower($c['name'] ?? ''), $search) !== false) ||
               (strpos(strtolower($c['phone'] ?? ''), $search) !== false) ||
               (strpos(strtolower($c['email'] ?? ''), $search) !== false);
    });
}
?>

<div style="color: var(--text-primary);">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary); margin: 0;">
        <i data-lucide="users" style="width: 28px; height: 28px; color: #10B981;"></i> Customer Management
      </h1>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.2rem; margin-bottom: 0;">
        Registered consumer accounts, total wash orders, loyalty wallet balance, and order history.
      </p>
    </div>

    <button
      onclick="openModal('addCustomerModal')"
      class="btn btn-primary"
      style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #E18C8E 67.34%, #FE9A5D 98.26%); color: #FFF; padding: 0.65rem 1.25rem; border-radius: 8px; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;"
    >
      <i data-lucide="user-plus" style="width: 18px; height: 18px;"></i> Add New Customer
    </button>
  </div>

  <?php if ($msg): ?>
    <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #059669; padding: 0.75rem 1rem; border-radius: 8px; font-weight: 700; font-size: 0.85rem; margin-bottom: 1.25rem;">
      <?= htmlspecialchars($msg) ?>
    </div>
  <?php endif; ?>

  <!-- Search and Table Container -->
  <div class="card" style="padding: 1.5rem;">
    <form method="GET" action="" style="margin-bottom: 1.25rem; display: flex; gap: 0.75rem; max-width: 450px;">
      <input type="text" name="q" class="form-control" placeholder="Search by name, phone, or email..." value="<?= htmlspecialchars($_GET['q'] ?? '') ?>" style="flex: 1;">
      <button type="submit" class="btn btn-secondary" style="font-weight: 700;">Filter</button>
      <?php if (!empty($_GET['q'])): ?>
        <a href="index.php" class="btn btn-secondary">Clear</a>
      <?php endif; ?>
    </form>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Customer Profile</th>
            <th>Contact Details</th>
            <th>Location</th>
            <th>Total Orders</th>
            <th>Total Spent</th>
            <th>Wallet Balance</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($customers as $c): 
              $cId = $c['id'] ?? '';
              $name = $c['name'] ?? 'Customer';
              $phone = $c['phone'] ?? 'N/A';
              $email = $c['email'] ?? '—';
              $city = $c['city'] ?? 'Pune';
              $orders = intval($c['totalOrders'] ?? $c['total_orders'] ?? 0);
              $spent = floatval($c['totalSpent'] ?? $c['total_spent'] ?? 0);
              $wallet = floatval($c['walletBalance'] ?? $c['wallet_balance'] ?? 0);
              $status = strtoupper($c['status'] ?? 'ACTIVE');
          ?>
            <tr>
              <td>
                <div style="font-weight: 800; font-size: 0.95rem; color: var(--brand-purple);"><?= htmlspecialchars($name) ?></div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">ID: #CUST-<?= htmlspecialchars($cId) ?></div>
              </td>
              <td>
                <div style="font-weight: 700; font-size: 0.85rem;"><?= htmlspecialchars($phone) ?></div>
                <div style="font-size: 0.75rem; color: var(--text-muted);"><?= htmlspecialchars($email) ?></div>
              </td>
              <td>📍 <?= htmlspecialchars($city) ?></td>
              <td><strong style="font-size: 0.92rem;"><?= number_format($orders) ?> Orders</strong></td>
              <td><strong style="color: #10B981; font-size: 0.95rem;">₹<?= number_format($spent) ?></strong></td>
              <td><span class="badge" style="background: rgba(129,98,238,0.15); color: #8162EE; font-weight: 800;">₹<?= number_format($wallet) ?></span></td>
              <td>
                <span class="badge badge-<?= $status === 'ACTIVE' ? 'success' : 'danger' ?>">
                  <?= $status ?>
                </span>
              </td>
              <td>
                <div style="display: flex; gap: 0.4rem; align-items: center; white-space: nowrap;">
                  <button 
                    type="button" 
                    onclick="openEditCustomer(<?= htmlspecialchars(json_encode($c)) ?>)"
                    class="btn btn-secondary btn-sm"
                    title="Edit Customer"
                  >
                    <i data-lucide="edit" style="width: 14px; height: 14px;"></i>
                  </button>

                  <form method="POST" action="" style="display: inline;" onsubmit="return confirm('Toggle status for this customer?');">
                    <input type="hidden" name="action" value="status">
                    <input type="hidden" name="customer_id" value="<?= htmlspecialchars($cId) ?>">
                    <input type="hidden" name="status" value="<?= $status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' ?>">
                    <button type="submit" class="btn btn-sm" style="background: <?= $status === 'ACTIVE' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)' ?>; color: <?= $status === 'ACTIVE' ? '#EF4444' : '#10B981' ?>; border: none; font-weight: 700;">
                      <?= $status === 'ACTIVE' ? 'Suspend' : 'Activate' ?>
                    </button>
                  </form>

                  <form method="POST" action="" style="display: inline;" onsubmit="return confirm('Are you sure you want to delete this customer record?');">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="customer_id" value="<?= htmlspecialchars($cId) ?>">
                    <button type="submit" class="btn btn-sm" style="background: rgba(239,68,68,0.1); color: #DC2626; border: none;" title="Delete Customer">
                      <i data-lucide="trash" style="width: 14px; height: 14px;"></i>
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

<!-- Modal: Add New Customer -->
<div id="addCustomerModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(6px); align-items: center; justify-content: center; z-index: 99999; padding: 1rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 480px; padding: 1.5rem; color: var(--text-primary);">
    <h3 style="margin-top: 0; font-size: 1.2rem; font-weight: 800; color: var(--brand-purple);">Add New Customer</h3>
    <form method="POST" action="">
      <input type="hidden" name="action" value="create">
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Full Name *</label>
        <input type="text" name="name" class="form-control" placeholder="Customer Name" required style="width: 100%;">
      </div>
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Phone Number *</label>
        <input type="text" name="phone" class="form-control" placeholder="10-digit mobile" required style="width: 100%;">
      </div>
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Email Address</label>
        <input type="email" name="email" class="form-control" placeholder="email@gmail.com" style="width: 100%;">
      </div>
      <div class="form-group" style="margin-bottom: 1.5rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">City</label>
        <input type="text" name="city" class="form-control" value="Pune" style="width: 100%;">
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('addCustomerModal')" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.6rem 1.25rem; border-radius: 8px; font-weight: 700;">Create Account</button>
      </div>
    </form>
  </div>
</div>

<!-- Modal: Edit Customer -->
<div id="editCustomerModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(6px); align-items: center; justify-content: center; z-index: 99999; padding: 1rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 480px; padding: 1.5rem; color: var(--text-primary);">
    <h3 style="margin-top: 0; font-size: 1.2rem; font-weight: 800; color: var(--brand-purple);">Edit Customer Details</h3>
    <form method="POST" action="">
      <input type="hidden" name="action" value="update">
      <input type="hidden" id="editCustomerId" name="customer_id" value="">
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Full Name</label>
        <input type="text" id="editCustomerName" name="name" class="form-control" required style="width: 100%;">
      </div>
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Phone Number</label>
        <input type="text" id="editCustomerPhone" name="phone" class="form-control" required style="width: 100%;">
      </div>
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Email Address</label>
        <input type="email" id="editCustomerEmail" name="email" class="form-control" style="width: 100%;">
      </div>
      <div class="form-group" style="margin-bottom: 1.5rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">City</label>
        <input type="text" id="editCustomerCity" name="city" class="form-control" style="width: 100%;">
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('editCustomerModal')" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.6rem 1.25rem; border-radius: 8px; font-weight: 700;">Update Customer</button>
      </div>
    </form>
  </div>
</div>

<script>
  function openEditCustomer(cust) {
    document.getElementById('editCustomerId').value = cust.id || '';
    document.getElementById('editCustomerName').value = cust.name || '';
    document.getElementById('editCustomerPhone').value = cust.phone || '';
    document.getElementById('editCustomerEmail').value = cust.email || '';
    document.getElementById('editCustomerCity').value = cust.city || 'Pune';
    openModal('editCustomerModal');
  }
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
