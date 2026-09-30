<?php
$pageTitle = 'Complaints & Support Tickets';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';

$msg = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $ticketId = $_POST['ticket_id'] ?? '';
    if ($ticketId) {
        $msg = "Ticket #{$ticketId} marked as resolved.";
    }
}

$complaints = [
    [
        'id' => 'TKT-201',
        'ticketId' => 'TKT-201',
        'orderNumber' => 'ORD-9821',
        'customerName' => 'Pooja Verma',
        'issueCategory' => 'Late Delivery Delay',
        'description' => 'Order was supposed to arrive by 6 PM yesterday.',
        'priority' => 'HIGH',
        'status' => 'PENDING',
        'createdAt' => '2026-09-28 09:15',
    ],
    [
        'id' => 'TKT-202',
        'ticketId' => 'TKT-202',
        'orderNumber' => 'ORD-9815',
        'customerName' => 'Rajesh Sharma',
        'issueCategory' => 'Delivery Driver Behavior',
        'description' => 'Driver was in polite rush during pickup verification.',
        'priority' => 'MEDIUM',
        'status' => 'RESOLVED',
        'createdAt' => '2026-09-26 14:00',
    ],
];
?>

<div style="color: var(--text-primary);">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary); margin: 0;">
        <i data-lucide="message-square" style="width: 28px; height: 28px; color: #2563EB;"></i> Customer Complaints & Support Tickets
      </h1>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.2rem; margin-bottom: 0;">
        Track pickup/delivery delays, partner behavior complaints, and support ticket resolution.
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
            <th>Ticket ID</th>
            <th>Order Ref</th>
            <th>Customer</th>
            <th>Issue Category</th>
            <th>Description</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($complaints as $c): 
              $status = strtoupper($c['status'] ?? 'PENDING');
          ?>
            <tr>
              <td><strong style="color: var(--brand-purple);"><?= htmlspecialchars($c['ticketId']) ?></strong></td>
              <td><?= htmlspecialchars($c['orderNumber']) ?></td>
              <td><?= htmlspecialchars($c['customerName']) ?></td>
              <td><strong><?= htmlspecialchars($c['issueCategory']) ?></strong></td>
              <td style="max-width: 240px; font-size: 0.82rem; color: var(--text-secondary);"><?= htmlspecialchars($c['description']) ?></td>
              <td>
                <span class="badge" style="background: <?= $c['priority'] === 'HIGH' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)' ?>; color: <?= $c['priority'] === 'HIGH' ? '#EF4444' : '#F59E0B' ?>; font-weight: 800;">
                  <?= htmlspecialchars($c['priority']) ?>
                </span>
              </td>
              <td><span class="badge badge-<?= $status === 'RESOLVED' ? 'success' : 'warning' ?>"><?= $status ?></span></td>
              <td>
                <?php if ($status === 'PENDING'): ?>
                  <form method="POST" action="" style="display: inline;">
                    <input type="hidden" name="ticket_id" value="<?= htmlspecialchars($c['ticketId']) ?>">
                    <button type="submit" class="btn btn-success btn-sm">Resolve Ticket</button>
                  </form>
                <?php else: ?>
                  <span style="color: #059669; font-weight: 700; font-size: 0.85rem;">Resolved ✅</span>
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
