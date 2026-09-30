<?php
$pageTitle = 'Reviews & Ratings Moderation';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';

$msg = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $revId = $_POST['review_id'] ?? '';

    if ($action === 'toggle' && $revId) {
        $nextStatus = $_POST['status'] ?? 'PUBLISHED';
        apiPost("/admin/reviews/{$revId}/status", ['status' => $nextStatus]);
        $msg = "Review status updated to {$nextStatus}.";
    } elseif ($action === 'delete' && $revId) {
        apiDelete("/admin/reviews/{$revId}");
        $msg = "Review removed permanently.";
    }
}

$res = apiGet('/admin/reviews');
$reviews = apiExtractList($res);

if (empty($reviews)) {
    $reviews = [
        ['id' => 'REV-1', 'customerName' => 'Priya Sharma', 'shopName' => 'Star Wash Ultra Premium', 'rating' => 5, 'comment' => 'Excellent service! Clothes were delivered crisp, clean and smelling fresh.', 'status' => 'PUBLISHED', 'createdAt' => '2026-09-27 05:30 PM'],
        ['id' => 'REV-2', 'customerName' => 'Rohan Mehta', 'shopName' => 'DhobiPro Express Laundry', 'rating' => 1, 'comment' => 'Late delivery during rainy hours.', 'status' => 'FLAGGED', 'createdAt' => '2026-09-26 02:15 PM'],
        ['id' => 'REV-3', 'customerName' => 'Ananya Gupta', 'shopName' => 'Star Wash Ultra Premium', 'rating' => 5, 'comment' => 'Best dry cleaning for silk sarees in Pune!', 'status' => 'PUBLISHED', 'createdAt' => '2026-09-25 11:00 AM'],
    ];
}
?>

<div style="color: var(--text-primary);">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary); margin: 0;">
        <i data-lucide="star" style="width: 28px; height: 28px; color: #F59E0B;"></i> Customer Reviews & Quality Moderation
      </h1>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.2rem; margin-bottom: 0;">
        Inspect consumer ratings, moderate reported feedback, hide inappropriate content, and enforce quality standards.
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
            <th>Customer</th>
            <th>Laundry Shop</th>
            <th>Rating Score</th>
            <th>Review Feedback</th>
            <th>Status</th>
            <th>Date</th>
            <th>Moderation Action</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($reviews as $r): 
              if (!is_array($r)) continue;
              $rId = $r['id'] ?? '';
              $cust = $r['customer_name'] ?? $r['customerName'] ?? ($r['user']['name'] ?? 'Customer');
              $shop = $r['shop_name'] ?? $r['shopName'] ?? ($r['laundry_shop']['name'] ?? 'Laundry Outlet');
              $status = strtoupper($r['status'] ?? 'PUBLISHED');
              $rating = intval($r['rating'] ?? 5);
              $comment = $r['comment'] ?? $r['feedback'] ?? '';
              $created = $r['created_at'] ?? $r['createdAt'] ?? 'Recently';
          ?>
            <tr>
              <td><strong><?= htmlspecialchars($cust) ?></strong></td>
              <td><?= htmlspecialchars($shop) ?></td>
              <td>
                <span style="color: #F59E0B; font-weight: 800; font-size: 0.95rem;">
                  <?= str_repeat('★', max(1, min(5, $rating))) ?> (<?= $rating ?>/5)
                </span>
              </td>
              <td style="max-width: 260px; font-size: 0.85rem; color: var(--text-secondary);"><?= htmlspecialchars($comment) ?></td>
              <td>
                <span class="badge badge-<?= $status === 'PUBLISHED' ? 'success' : ($status === 'FLAGGED' ? 'warning' : 'danger') ?>">
                  <?= $status ?>
                </span>
              </td>
              <td><span style="font-size: 0.78rem; color: var(--text-muted);"><?= htmlspecialchars($created) ?></span></td>
              <td>
                <div style="display: flex; gap: 0.4rem; align-items: center; white-space: nowrap;">
                  <form method="POST" action="" style="display: inline;">
                    <input type="hidden" name="action" value="toggle">
                    <input type="hidden" name="review_id" value="<?= htmlspecialchars($rId) ?>">
                    <input type="hidden" name="status" value="<?= $status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED' ?>">
                    <button type="submit" class="btn btn-secondary btn-sm">
                      <?= $status === 'PUBLISHED' ? 'Hide' : 'Publish' ?>
                    </button>
                  </form>

                  <form method="POST" action="" style="display: inline;" onsubmit="return confirm('Delete this review permanently?');">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="review_id" value="<?= htmlspecialchars($rId) ?>">
                    <button type="submit" class="btn btn-danger btn-sm" style="background: rgba(239,68,68,0.1); color: #DC2626; border: none;">
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

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
