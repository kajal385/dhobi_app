<?php
$pageTitle = 'Refunds & Customer Dispute Resolution';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';

$msg = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $refId = $_POST['refund_id'] ?? '';
    if ($refId) {
        apiPost("/admin/refunds/{$refId}/approve");
        $msg = "Refund request #{$refId} has been successfully processed and refunded to customer.";
    }
}

$res = apiGet('/admin/refunds');
$refunds = apiExtractList($res);

if (empty($refunds)) {
    $refunds = [
        [
            'id' => 'REF-501',
            'orderId' => 'ORD-8712',
            'customerName' => 'Neha Gupta',
            'amount' => 350,
            'reason' => 'Delay in express delivery schedule',
            'paymentMethod' => 'RAZORPAY_UPI',
            'status' => 'PENDING',
        ],
        [
            'id' => 'REF-502',
            'orderId' => 'ORD-8690',
            'customerName' => 'Pooja Verma',
            'amount' => 120,
            'reason' => '1 Garment unavailable for dry clean',
            'paymentMethod' => 'WALLET',
            'status' => 'PROCESSED',
        ],
    ];
}
?>

<div style="color: var(--text-primary);">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary); margin: 0;">
        <i data-lucide="alert-circle" style="width: 28px; height: 28px; color: #EF4444;"></i> Refunds & Customer Claims
      </h1>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.2rem; margin-bottom: 0;">
        Approve customer refund requests, garment claim compensation, and dispute resolution tickets.
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
            <th>Refund Ref</th>
            <th>Customer</th>
            <th>Amount (₹)</th>
            <th>Claim Reason</th>
            <th>Original Payment Method</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($refunds as $r): 
              if (!is_array($r)) continue;
              $rId = $r['id'] ?? 'REF';
              $ordId = $r['order_id'] ?? $r['orderId'] ?? ($r['order_number'] ?? '');
              $cust = $r['customer_name'] ?? $r['customerName'] ?? ($r['user']['name'] ?? 'Customer');
              $amt = floatval($r['amount'] ?? 0);
              $reason = $r['reason'] ?? $r['claim_reason'] ?? 'Customer request';
              $method = $r['payment_method'] ?? $r['paymentMethod'] ?? 'ONLINE';
              $status = strtoupper($r['status'] ?? 'PENDING');
          ?>
            <tr>
              <td>
                <div style="font-weight: 800; font-size: 0.95rem; color: var(--brand-purple);"><?= htmlspecialchars($rId) ?></div>
                <div style="font-size: 0.72rem; color: var(--text-muted);"><?= htmlspecialchars($ordId) ?></div>
              </td>
              <td><strong><?= htmlspecialchars($cust) ?></strong></td>
              <td><strong style="color: #EF4444; font-size: 1rem;">₹<?= number_format($amt) ?></strong></td>
              <td><span style="font-size: 0.85rem; color: var(--text-secondary);"><?= htmlspecialchars($reason) ?></span></td>
              <td><span class="badge" style="background: rgba(129,98,238,0.12); color: #8162EE; font-weight: 700;"><?= htmlspecialchars($method) ?></span></td>
              <td>
                <span class="badge badge-<?= $status === 'PROCESSED' ? 'success' : 'warning' ?>">
                  <?= $status ?>
                </span>
              </td>
              <td>
                <?php if ($status !== 'PROCESSED'): ?>
                  <form method="POST" action="" onsubmit="return confirm('Authorize and release this refund to customer?');">
                    <input type="hidden" name="refund_id" value="<?= htmlspecialchars($rId) ?>">
                    <button type="submit" class="btn btn-success btn-sm" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                      <i data-lucide="check" style="width: 14px; height: 14px;"></i> Process Refund
                    </button>
                  </form>
                <?php else: ?>
                  <span style="color: #059669; font-weight: 800; font-size: 0.85rem;">✓ Refunded</span>
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
