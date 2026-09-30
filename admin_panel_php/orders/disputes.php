<?php
$pageTitle = 'Garment Disputes & Claims';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';

$msg = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $claimId = $_POST['claim_id'] ?? '';
    $action = $_POST['action'] ?? '';
    if ($claimId) {
        $msg = "Claim #{$claimId} marked as {$action}.";
    }
}

$disputes = [
    [
        'id' => 'DISP-101',
        'claimId' => 'DISP-101',
        'orderNumber' => 'ORD-9810',
        'customerName' => 'Neha Gupta',
        'shopName' => 'Star Wash Ultra Premium',
        'claimType' => 'Damaged Silk Saree',
        'claimAmount' => 1200,
        'status' => 'PENDING',
        'createdAt' => '2026-09-27 11:30',
    ],
    [
        'id' => 'DISP-102',
        'claimId' => 'DISP-102',
        'orderNumber' => 'ORD-9780',
        'customerName' => 'Amitabh Sharma',
        'shopName' => 'DhobiPro Express Laundry',
        'claimType' => 'Missing Jacket (1 Item)',
        'claimAmount' => 850,
        'status' => 'RESOLVED',
        'createdAt' => '2026-09-25 16:15',
    ],
];
?>

<div style="color: var(--text-primary);">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary); margin: 0;">
        <i data-lucide="shield-alert" style="width: 28px; height: 28px; color: #EF4444;"></i> Disputes & Garment Claims Management
      </h1>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.2rem; margin-bottom: 0;">
        Investigate lost or damaged garment claims, assign shop liability, and approve compensation.
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
            <th>Claim ID</th>
            <th>Order Number</th>
            <th>Customer</th>
            <th>Laundry Shop</th>
            <th>Dispute Type</th>
            <th>Claim Amount</th>
            <th>Status</th>
            <th>Reported Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($disputes as $d): 
              $status = strtoupper($d['status'] ?? 'PENDING');
          ?>
            <tr>
              <td><strong style="color: var(--brand-purple);"><?= htmlspecialchars($d['claimId']) ?></strong></td>
              <td><?= htmlspecialchars($d['orderNumber']) ?></td>
              <td><?= htmlspecialchars($d['customerName']) ?></td>
              <td><?= htmlspecialchars($d['shopName']) ?></td>
              <td><span style="font-weight: 600;"><?= htmlspecialchars($d['claimType']) ?></span></td>
              <td><strong style="color: #EF4444; font-size: 0.95rem;">₹<?= number_format($d['claimAmount']) ?></strong></td>
              <td><span class="badge badge-<?= $status === 'RESOLVED' ? 'success' : 'warning' ?>"><?= $status ?></span></td>
              <td><span style="font-size: 0.78rem; color: var(--text-muted);"><?= htmlspecialchars($d['createdAt']) ?></span></td>
              <td>
                <?php if ($status === 'PENDING'): ?>
                  <form method="POST" action="" style="display: inline;">
                    <input type="hidden" name="claim_id" value="<?= htmlspecialchars($d['claimId']) ?>">
                    <input type="hidden" name="action" value="RESOLVED">
                    <button type="submit" class="btn btn-success btn-sm">Approve Claim</button>
                  </form>
                <?php else: ?>
                  <span style="color: #059669; font-weight: 700; font-size: 0.85rem;">Resolved</span>
                <?php endif; ?>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
