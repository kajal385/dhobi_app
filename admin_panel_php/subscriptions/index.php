<?php
$pageTitle = 'Subscription Plans & Partners';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';

$msg = null;

// Initialize session state for Subscription Plans if needed
if (!isset($_SESSION['subscription_plans_store'])) {
    $_SESSION['subscription_plans_store'] = [
        'PLAN-01' => [
            'id' => 'PLAN-01',
            'name' => 'Basic Starter Plan',
            'price' => 999,
            'billingCycle' => 'MONTHLY',
            'orderLimit' => 100,
            'status' => 'ACTIVE',
            'features' => ['Direct Laundry Listing', 'Driver Dispatch Tracking', 'Online Customer Bookings', 'Standard Support']
        ],
        'PLAN-02' => [
            'id' => 'PLAN-02',
            'name' => 'Professional Growth',
            'price' => 2499,
            'billingCycle' => 'MONTHLY',
            'orderLimit' => 999999,
            'status' => 'ACTIVE',
            'features' => ['Direct Laundry Listing', 'Driver Dispatch Tracking', 'Online Customer Bookings', 'Priority Search Ranking', 'Custom Shop Banner']
        ],
        'PLAN-03' => [
            'id' => 'PLAN-03',
            'name' => 'Enterprise VIP Platinum',
            'price' => 19999,
            'billingCycle' => 'ANNUAL',
            'orderLimit' => 999999,
            'status' => 'ACTIVE',
            'features' => ['All Professional Features', 'Featured Homepage Spotlight', 'Dedicated Account Manager', '0% Processing Surcharge', 'Unlimited Pickup Radius']
        ],
    ];
}

if (!isset($_SESSION['subscribers_store'])) {
    $_SESSION['subscribers_store'] = [
        ['id' => 'SUB-101', 'shopName' => 'Star Wash Ultra Premium', 'ownerName' => 'Ashish Bhosale', 'planName' => 'Professional Growth', 'startDate' => '2026-09-10', 'expiryDate' => '2026-10-10', 'status' => 'ACTIVE'],
        ['id' => 'SUB-102', 'shopName' => 'SuperClean Express Laundromat', 'ownerName' => 'Kajal Gajare', 'planName' => 'Basic Starter Plan', 'startDate' => '2026-09-01', 'expiryDate' => '2026-10-01', 'status' => 'ACTIVE'],
        ['id' => 'SUB-103', 'shopName' => 'Royal Wash Hinjewadi', 'ownerName' => 'Ramesh Sharma', 'planName' => 'Enterprise VIP Platinum', 'startDate' => '2026-01-15', 'expiryDate' => '2027-01-15', 'status' => 'ACTIVE'],
    ];
}

// POST Handlers for Subscription Plans (Create, Edit, Delete)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'create_plan') {
        $pName = trim($_POST['name'] ?? '');
        $pPrice = floatval($_POST['price'] ?? 999);
        $pCycle = $_POST['billing_cycle'] ?? 'MONTHLY';
        $pLimit = intval($_POST['order_limit'] ?? 100);
        $pId = 'PLAN-0' . (count($_SESSION['subscription_plans_store']) + 1);

        $newPlan = [
            'id' => $pId,
            'name' => $pName,
            'price' => $pPrice,
            'billingCycle' => $pCycle,
            'orderLimit' => $pLimit,
            'status' => 'ACTIVE',
            'features' => ['Direct Laundry Listing', 'Driver Dispatch Tracking', 'Online Customer Bookings']
        ];
        $_SESSION['subscription_plans_store'][$pId] = $newPlan;
        apiPost('/admin/subscriptions/plans', $newPlan);
        $msg = "Subscription tier plan '{$pName}' created successfully!";
    } elseif ($action === 'edit_plan') {
        $pId = $_POST['plan_id'] ?? '';
        $pName = trim($_POST['name'] ?? '');
        $pPrice = floatval($_POST['price'] ?? 999);
        $pCycle = $_POST['billing_cycle'] ?? 'MONTHLY';
        $pLimit = intval($_POST['order_limit'] ?? 100);
        $pStatus = $_POST['status'] ?? 'ACTIVE';

        if ($pId && isset($_SESSION['subscription_plans_store'][$pId])) {
            $_SESSION['subscription_plans_store'][$pId]['name'] = $pName;
            $_SESSION['subscription_plans_store'][$pId]['price'] = $pPrice;
            $_SESSION['subscription_plans_store'][$pId]['billingCycle'] = $pCycle;
            $_SESSION['subscription_plans_store'][$pId]['orderLimit'] = $pLimit;
            $_SESSION['subscription_plans_store'][$pId]['status'] = $pStatus;

            apiPut("/admin/subscriptions/plans/{$pId}", [
                'name' => $pName,
                'price' => $pPrice,
                'billingCycle' => $pCycle,
                'orderLimit' => $pLimit,
                'status' => $pStatus
            ]);
            $msg = "Subscription tier '{$pName}' updated and saved successfully!";
        }
    } elseif ($action === 'delete_plan') {
        $pId = $_POST['plan_id'] ?? '';
        if ($pId && isset($_SESSION['subscription_plans_store'][$pId])) {
            $delName = $_SESSION['subscription_plans_store'][$pId]['name'];
            unset($_SESSION['subscription_plans_store'][$pId]);
            apiDelete("/admin/subscriptions/plans/{$pId}");
            $msg = "Subscription tier '{$delName}' deleted.";
        }
    }
}

$plans = array_values($_SESSION['subscription_plans_store']);
$subscribers = array_values($_SESSION['subscribers_store']);
?>

<div style="color: var(--text-primary);">
  <!-- Header Title & Action -->
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary); margin: 0;">
        <i data-lucide="crown" style="width: 28px; height: 28px; color: #8162EE;"></i> Laundry Partner Subscription Plans
      </h1>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.2rem; margin-bottom: 0;">
        Recurring membership tiers, monthly order quotas, featured store badges, and active store subscribers.
      </p>
    </div>

    <button
      onclick="openModal('addPlanModal')"
      class="btn btn-primary"
      style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; padding: 0.65rem 1.25rem; border-radius: 8px; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 14px rgba(129,98,238,0.35);"
    >
      <i data-lucide="plus" style="width: 18px; height: 18px;"></i> Create Plan Tier
    </button>
  </div>

  <?php if ($msg): ?>
    <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #059669; padding: 0.75rem 1rem; border-radius: 8px; font-weight: 700; font-size: 0.85rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
      <i data-lucide="check-circle" style="width: 18px; height: 18px;"></i> <?= htmlspecialchars($msg) ?>
    </div>
  <?php endif; ?>

  <!-- Plan Tier Cards with Edit & Delete Controls -->
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
    <?php foreach ($plans as $p): 
        $pId = $p['id'];
        $pName = $p['name'] ?? 'Plan Tier';
        $pPrice = floatval($p['price'] ?? 0);
        $pCycle = $p['billingCycle'] ?? 'MONTHLY';
        $pLimit = intval($p['orderLimit'] ?? 100);
        $pStatus = strtoupper($p['status'] ?? 'ACTIVE');
        $features = $p['features'] ?? ['Direct Laundry Listing', 'Driver Dispatch Tracking', 'Online Customer Bookings'];
    ?>
      <div class="card" style="padding: 1.5rem; border-radius: 16px; border: 1px solid var(--border-color); border-top: 4px solid #8162EE; display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)';" onmouseout="this.style.transform='none';">
        <div>
          <!-- Plan Header & Action Buttons -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
            <div style="flex: 1; min-width: 0; padding-right: 0.5rem;">
              <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: var(--brand-purple);"><?= htmlspecialchars($pName) ?></h3>
            </div>
            <div style="display: flex; gap: 0.35rem; align-items: center;">
              <span class="badge badge-<?= $pStatus === 'ACTIVE' ? 'success' : 'danger' ?>" style="font-size: 0.72rem; font-weight: 800;">
                <?= $pStatus ?>
              </span>
              
              <!-- Edit Plan Button -->
              <button 
                type="button" 
                onclick="openEditPlanModal(<?= htmlspecialchars(json_encode($p)) ?>)" 
                class="btn btn-secondary btn-sm" 
                style="padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem;"
                title="Edit Plan Tier"
              >
                <i data-lucide="edit-3" style="width: 13px; height: 13px;"></i>
              </button>

              <!-- Delete Plan Button -->
              <form method="POST" action="" onsubmit="return confirm('Delete subscription plan tier <?= htmlspecialchars($pName) ?>?');" style="display: inline;">
                <input type="hidden" name="action" value="delete_plan">
                <input type="hidden" name="plan_id" value="<?= htmlspecialchars($pId) ?>">
                <button type="submit" class="btn btn-secondary btn-sm" style="color: #EF4444; padding: 0.25rem 0.5rem; border-radius: 6px;" title="Delete Plan Tier">
                  <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
                </button>
              </form>
            </div>
          </div>

          <div style="font-size: 1.85rem; font-weight: 900; color: #10B981; margin: 0.6rem 0;">
            ₹<?= number_format($pPrice) ?>
            <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">/ <?= strtolower($pCycle) ?></span>
          </div>

          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem; background: var(--bg-input); padding: 0.5rem 0.75rem; border-radius: 8px; border: 1px solid var(--border-color);">
            Order Quota: <strong style="color: var(--text-primary);"><?= $pLimit > 1000 ? 'Unlimited Orders' : $pLimit . ' Orders/mo' ?></strong>
          </div>

          <ul style="font-size: 0.82rem; color: var(--text-secondary); padding-left: 1.2rem; margin: 0; line-height: 1.7;">
            <?php foreach ($features as $f): ?>
              <li><?= htmlspecialchars($f) ?></li>
            <?php endforeach; ?>
          </ul>
        </div>

        <div style="margin-top: 1.25rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">Code: <?= htmlspecialchars($pId) ?></span>
          <button 
            type="button" 
            onclick="openEditPlanModal(<?= htmlspecialchars(json_encode($p)) ?>)" 
            class="btn btn-outline btn-sm"
            style="font-size: 0.75rem; padding: 0.25rem 0.65rem;"
          >
            Configure Plan
          </button>
        </div>
      </div>
    <?php endforeach; ?>
  </div>

  <!-- Active Subscribers Table -->
  <div class="card" style="padding: 1.5rem; border-radius: 16px;">
    <h2 style="font-size: 1.15rem; font-weight: 800; margin-top: 0; margin-bottom: 1.25rem; color: var(--brand-purple);">
      Active Subscribed Laundry Outlets
    </h2>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Laundry Shop</th>
            <th>Owner</th>
            <th>Current Active Plan</th>
            <th>Start Date</th>
            <th>Renewal / Expiry Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($subscribers as $s): ?>
            <tr>
              <td><strong style="color: var(--brand-purple); font-size: 0.95rem;"><?= htmlspecialchars($s['shopName']) ?></strong></td>
              <td><?= htmlspecialchars($s['ownerName']) ?></td>
              <td><span class="badge" style="background: rgba(129,98,238,0.15); color: #8162EE; font-weight: 800;">👑 <?= htmlspecialchars($s['planName']) ?></span></td>
              <td><?= htmlspecialchars($s['startDate']) ?></td>
              <td><strong><?= htmlspecialchars($s['expiryDate']) ?></strong></td>
              <td><span class="badge badge-success"><?= htmlspecialchars($s['status']) ?></span></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Modal: Add Plan Tier -->
<div id="addPlanModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(6px); align-items: center; justify-content: center; z-index: 99999; padding: 1rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 480px; padding: 1.75rem; color: var(--text-primary); box-shadow: 0 25px 50px rgba(0,0,0,0.4);">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
      <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--brand-purple);">Create Subscription Tier</h3>
      <button onclick="closeModal('addPlanModal')" style="background: var(--bg-input); border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer;">✕</button>
    </div>
    <form method="POST" action="">
      <input type="hidden" name="action" value="create_plan">
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Plan Title *</label>
        <input type="text" name="name" class="form-control" placeholder="e.g. Diamond Partner" required style="width: 100%;">
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Price (₹) *</label>
          <input type="number" name="price" class="form-control" value="2999" required style="width: 100%;">
        </div>
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Billing Cycle</label>
          <select name="billing_cycle" class="form-control" style="width: 100%;">
            <option value="MONTHLY">Monthly</option>
            <option value="ANNUAL">Annual</option>
            <option value="QUARTERLY">Quarterly</option>
          </select>
        </div>
      </div>
      <div class="form-group" style="margin-bottom: 1.5rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Monthly Order Limit</label>
        <input type="number" name="order_limit" class="form-control" value="500" placeholder="Use 999999 for unlimited" style="width: 100%;">
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('addPlanModal')" class="btn btn-secondary" style="font-weight: 700;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.65rem 1.4rem; border-radius: 8px; font-weight: 800;">Create Plan Tier</button>
      </div>
    </form>
  </div>
</div>

<!-- Modal: Edit Subscription Plan (Allows editing & saving changes) -->
<div id="editPlanModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); align-items: center; justify-content: center; z-index: 99999; padding: 1.5rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 480px; padding: 1.75rem; color: var(--text-primary); box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
      <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--brand-purple);">Edit Subscription Tier</h3>
      <button onclick="closeModal('editPlanModal')" style="background: var(--bg-input); border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer;">✕</button>
    </div>
    <form method="POST" action="">
      <input type="hidden" name="action" value="edit_plan">
      <input type="hidden" id="editPlanId" name="plan_id" value="">

      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Plan Title *</label>
        <input type="text" id="editPlanName" name="name" class="form-control" required style="width: 100%;">
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Price (₹) *</label>
          <input type="number" id="editPlanPrice" name="price" class="form-control" required style="width: 100%;">
        </div>
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Billing Cycle</label>
          <select id="editPlanCycle" name="billing_cycle" class="form-control" style="width: 100%;">
            <option value="MONTHLY">Monthly</option>
            <option value="ANNUAL">Annual</option>
            <option value="QUARTERLY">Quarterly</option>
          </select>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Monthly Order Limit</label>
          <input type="number" id="editPlanLimit" name="order_limit" class="form-control" style="width: 100%;">
        </div>
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Status</label>
          <select id="editPlanStatus" name="status" class="form-control" style="width: 100%;">
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('editPlanModal')" class="btn btn-secondary" style="font-weight: 700;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.65rem 1.5rem; border-radius: 8px; font-weight: 800;">
          Save Changes
        </button>
      </div>
    </form>
  </div>
</div>

<script>
  function openEditPlanModal(plan) {
    document.getElementById('editPlanId').value = plan.id || '';
    document.getElementById('editPlanName').value = plan.name || '';
    document.getElementById('editPlanPrice').value = plan.price || 0;
    document.getElementById('editPlanCycle').value = plan.billingCycle || 'MONTHLY';
    document.getElementById('editPlanLimit').value = plan.orderLimit || 100;
    document.getElementById('editPlanStatus').value = plan.status || 'ACTIVE';
    openModal('editPlanModal');
  }
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
