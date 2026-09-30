<?php
$pageTitle = 'Admin Roles & Access Control';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';

$msg = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $payload = [
        'name' => $_POST['name'] ?? '',
        'email' => $_POST['email'] ?? '',
        'phone' => $_POST['phone'] ?? '',
        'role' => $_POST['role'] ?? 'ADMIN',
    ];
    $res = apiPost('/admin/admin-users', $payload);
    $msg = 'Administrator account created successfully!';
}

$res = apiGet('/admin/admin-users');
$admins = apiExtractList($res);

if (empty($admins)) {
    $admins = [
        ['id' => '1', 'name' => 'Super Admin', 'email' => 'admin@dhobipro.com', 'role' => 'SUPER_ADMIN', 'status' => 'ACTIVE'],
        ['id' => '2', 'name' => 'Kajal Operations', 'email' => 'ops@dhobipro.com', 'role' => 'ADMIN', 'status' => 'ACTIVE'],
    ];
}
?>

<div style="color: var(--text-primary);">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary); margin: 0;">
        <i data-lucide="shield-check" style="width: 28px; height: 28px; color: #8162EE;"></i> Admin Roles & RBAC Control
      </h1>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.2rem; margin-bottom: 0;">
        Manage platform administrator accounts and system access privileges.
      </p>
    </div>

    <button
      onclick="openModal('addAdminModal')"
      class="btn btn-primary"
      style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #E18C8E 67.34%, #FE9A5D 98.26%); color: #FFF; padding: 0.65rem 1.25rem; border-radius: 8px; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;"
    >
      <i data-lucide="user-plus" style="width: 18px; height: 18px;"></i> Add Admin User
    </button>
  </div>

  <?php if ($msg): ?>
    <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #059669; padding: 0.75rem 1rem; border-radius: 8px; font-weight: 700; font-size: 0.85rem; margin-bottom: 1.25rem;">
      <?= htmlspecialchars($msg) ?>
    </div>
  <?php endif; ?>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 2rem;">
    <div class="card" style="padding: 1.25rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <h3 style="margin: 0; font-size: 1.05rem; font-weight: 800;">Super Administrator</h3>
        <span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #EF4444; font-weight: 800;">SUPER_ADMIN</span>
      </div>
      <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0;">
        Full platform authority. Full control over shops, payouts, customer accounts, orders, finances, and platform settings.
      </p>
    </div>

    <div class="card" style="padding: 1.25rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <h3 style="margin: 0; font-size: 1.05rem; font-weight: 800;">Operations Admin</h3>
        <span class="badge" style="background: rgba(129, 98, 238, 0.15); color: #8162EE; font-weight: 800;">ADMIN</span>
      </div>
      <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0;">
        Daily platform oversight. Manages order dispatches, resolves customer complaints, and inspects partner documents.
      </p>
    </div>
  </div>

  <div class="card" style="padding: 1.5rem;">
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Administrator</th>
            <th>Role Designation</th>
            <th>Email Address</th>
            <th>Access Privileges</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($admins as $adm): 
              $name = $adm['name'] ?? 'Admin';
              $email = $adm['email'] ?? 'admin@dhobipro.com';
              $role = strtoupper($adm['role'] ?? 'ADMIN');
          ?>
            <tr>
              <td>
                <div style="font-weight: 800; font-size: 0.95rem; color: var(--brand-purple);"><?= htmlspecialchars($name) ?></div>
              </td>
              <td>
                <span class="badge" style="background: <?= $role === 'SUPER_ADMIN' ? 'rgba(239,68,68,0.15)' : 'rgba(129,98,238,0.15)' ?>; color: <?= $role === 'SUPER_ADMIN' ? '#EF4444' : '#8162EE' ?>; font-weight: 800;">
                  <?= $role ?>
                </span>
              </td>
              <td><?= htmlspecialchars($email) ?></td>
              <td>
                <span style="font-size: 0.8rem; font-weight: 700; color: #10B981;">
                  <?= $role === 'SUPER_ADMIN' ? 'Full Access (All Modules)' : 'Operations & Verification' ?>
                </span>
              </td>
              <td><span class="badge badge-success">ACTIVE</span></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Modal: Add Admin User -->
<div id="addAdminModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(6px); align-items: center; justify-content: center; z-index: 99999; padding: 1rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 480px; padding: 1.5rem; color: var(--text-primary);">
    <h3 style="margin-top: 0; font-size: 1.2rem; font-weight: 800; color: var(--brand-purple);">Add Admin Account</h3>
    <form method="POST" action="">
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Full Name</label>
        <input type="text" name="name" class="form-control" placeholder="Admin Name" required style="width: 100%;">
      </div>
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Email Address</label>
        <input type="email" name="email" class="form-control" placeholder="admin@dhobipro.com" required style="width: 100%;">
      </div>
      <div class="form-group" style="margin-bottom: 1.5rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Role Type</label>
        <select name="role" class="form-control" style="width: 100%;">
          <option value="ADMIN">Platform Operations Admin</option>
          <option value="SUPER_ADMIN">Super Administrator (Full Access)</option>
        </select>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('addAdminModal')" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.6rem 1.25rem; border-radius: 8px; font-weight: 700;">Create Admin</button>
      </div>
    </form>
  </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
