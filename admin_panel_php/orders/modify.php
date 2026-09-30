<?php
$pageTitle = 'Modify Orders Management';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';

$msg = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $orderId = $_POST['order_id'] ?? '';
    $amt = $_POST['amount'] ?? '';
    $notes = $_POST['notes'] ?? '';

    if ($orderId) {
        apiPost("/admin/orders/{$orderId}/status", [
            'notes' => "Manually adjusted amount to ₹{$amt}. Notes: {$notes}"
        ]);
        $msg = "Order #{$orderId} price and details modified successfully.";
    }
}

$orders = [
    [
        'id' => '101',
        'orderNumber' => 'ORD-9821',
        'customerName' => 'Pooja Verma',
        'shopName' => 'Star Wash Ultra Premium',
        'items' => '4 Suits, 2 Jackets',
        'originalAmount' => 650,
        'modifiedAmount' => 650,
        'status' => 'WASHING',
        'lastModified' => '2026-09-28 10:15',
    ],
    [
        'id' => '102',
        'orderNumber' => 'ORD-9822',
        'customerName' => 'Amitabh Sharma',
        'shopName' => 'DhobiPro Express Laundry',
        'items' => '10 Shirts (Steam Iron)',
        'originalAmount' => 250,
        'modifiedAmount' => 300,
        'status' => 'PICKUP_ASSIGNED',
        'lastModified' => '2026-09-28 09:30',
    ],
];
?>

<div style="color: var(--text-primary);">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary); margin: 0;">
        <i data-lucide="edit-3" style="width: 28px; height: 28px; color: #8162EE;"></i> Modify Orders Management
      </h1>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.2rem; margin-bottom: 0;">
        Adjust item quantities, update prices, add manual discounts, and override order specifications.
      </p>
    </div>
  </div>

  <?php if ($msg): ?>
    <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #059669; padding: 0.75rem 1rem; border-radius: 8px; font-weight: 700; font-size: 0.85rem; margin-bottom: 1.25rem;">
      <?= htmlspecialchars($msg) ?>
    </div>
  <?php endif; ?>

  <div class="card" style="padding: 1.5rem;">
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Laundry Shop</th>
            <th>Current Items</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Last Adjusted</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($orders as $o): ?>
            <tr>
              <td><strong style="color: var(--brand-purple);"><?= htmlspecialchars($o['orderNumber']) ?></strong></td>
              <td><?= htmlspecialchars($o['customerName']) ?></td>
              <td><?= htmlspecialchars($o['shopName']) ?></td>
              <td><?= htmlspecialchars($o['items']) ?></td>
              <td>
                <strong style="color: #10B981; font-size: 0.95rem;">₹<?= number_format($o['modifiedAmount']) ?></strong>
              </td>
              <td><span class="badge badge-info"><?= htmlspecialchars($o['status']) ?></span></td>
              <td><span style="font-size: 0.78rem; color: var(--text-muted);"><?= htmlspecialchars($o['lastModified']) ?></span></td>
              <td>
                <button type="button" onclick="openModifyModal(<?= htmlspecialchars(json_encode($o)) ?>)" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                  <i data-lucide="edit" style="width: 14px; height: 14px;"></i> Modify
                </button>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Modify Modal -->
<div id="modifyModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(6px); align-items: center; justify-content: center; z-index: 99999; padding: 1rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 480px; padding: 1.5rem; color: var(--text-primary);">
    <h3 style="margin-top: 0; color: var(--brand-purple); font-size: 1.15rem; font-weight: 800;">Modify Order</h3>
    <form method="POST" action="">
      <input type="hidden" id="modOrderId" name="order_id" value="">
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Customer</label>
        <input type="text" id="modCustomer" class="form-control" disabled style="width: 100%;">
      </div>
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Adjusted Amount (₹)</label>
        <input type="number" id="modAmount" name="amount" class="form-control" required style="width: 100%;">
      </div>
      <div class="form-group" style="margin-bottom: 1.5rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Reason / Notes</label>
        <textarea name="notes" class="form-control" rows="2" placeholder="e.g. Added 1 extra delicate garment..." style="width: 100%;"></textarea>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('modifyModal')" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.6rem 1.25rem; border-radius: 8px; font-weight: 700;">Save Adjustments</button>
      </div>
    </form>
  </div>
</div>

<script>
  function openModifyModal(o) {
    document.getElementById('modOrderId').value = o.id || o.orderNumber;
    document.getElementById('modCustomer').value = o.customerName;
    document.getElementById('modAmount').value = o.modifiedAmount;
    openModal('modifyModal');
  }
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
