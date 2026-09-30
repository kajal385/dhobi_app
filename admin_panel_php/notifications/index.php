<?php
$pageTitle = 'Broadcast & Notifications';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';

$msg = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $title = $_POST['title'] ?? '';
    $body = $_POST['body'] ?? '';
    $audience = $_POST['audience'] ?? 'ALL_CUSTOMERS';
    $city = $_POST['city'] ?? 'ALL';

    if ($title && $body) {
        $msg = "🚀 Push notification broadcast '{$title}' queued and dispatched to {$audience} in {$city}!";
    }
}
?>

<div style="color: var(--text-primary);">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary); margin: 0;">
        <i data-lucide="bell" style="width: 28px; height: 28px; color: #8162EE;"></i> Notification & Broadcast Center
      </h1>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.2rem; margin-bottom: 0;">
        Send targeted Push Notifications, SMS, WhatsApp alerts, and promotional broadcasts.
      </p>
    </div>
  </div>

  <?php if ($msg): ?>
    <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #059669; padding: 0.75rem 1rem; border-radius: 8px; font-weight: 700; font-size: 0.85rem; margin-bottom: 1.25rem;">
      <?= htmlspecialchars($msg) ?>
    </div>
  <?php endif; ?>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
    <!-- Compose Form -->
    <div class="card" style="padding: 1.5rem;">
      <h3 style="margin-top: 0; font-size: 1.15rem; font-weight: 800; color: var(--brand-purple); margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
        <i data-lucide="send" style="width: 18px; color: #8162EE;"></i> Compose Broadcast Message
      </h3>

      <form method="POST" action="">
        <div class="form-group" style="margin-bottom: 1rem;">
          <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Target Audience *</label>
          <select name="audience" class="form-control" style="width: 100%;">
            <option value="ALL_CUSTOMERS">All Customers</option>
            <option value="LAUNDRY_OWNERS">Laundry Shop Owners</option>
            <option value="DELIVERY_PARTNERS">Delivery Drivers & Riders</option>
            <option value="INACTIVE_USERS">Inactive Customers (30+ days)</option>
          </select>
        </div>

        <div class="form-group" style="margin-bottom: 1rem;">
          <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">City Filter *</label>
          <select name="city" class="form-control" style="width: 100%;">
            <option value="ALL">All Serviceable Cities</option>
            <option value="Pune" selected>Pune</option>
            <option value="Mumbai">Mumbai</option>
          </select>
        </div>

        <div class="form-group" style="margin-bottom: 1rem;">
          <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Notification Title *</label>
          <input type="text" name="title" class="form-control" placeholder="e.g. Weekend Special 20% Off Dry Clean 🧺" required style="width: 100%;">
        </div>

        <div class="form-group" style="margin-bottom: 1.5rem;">
          <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Message Body / Content *</label>
          <textarea name="body" class="form-control" rows="4" placeholder="Type your broadcast alert here..." required style="width: 100%;"></textarea>
        </div>

        <button type="submit" class="btn btn-primary" style="width: 100%; background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.75rem; border-radius: 8px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
          <i data-lucide="send" style="width: 18px; height: 18px;"></i> Send Push Notification Now
        </button>
      </form>
    </div>

    <!-- History Logs -->
    <div class="card" style="padding: 1.5rem;">
      <h3 style="margin-top: 0; font-size: 1.15rem; font-weight: 800; color: var(--brand-purple); margin-bottom: 1.25rem;">
        Recent Broadcast Dispatches
      </h3>

      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div style="padding: 1rem; border-radius: 10px; background: var(--bg-input); border: 1px solid var(--border-color);">
          <div style="font-weight: 800; font-size: 0.95rem; color: var(--brand-purple);">Monsoon Special 30% Off Dry Clean 🎉</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Target: All Customers (Pune) • Channel: FCM Push Notification</div>
          <div style="font-size: 0.8rem; color: #10B981; font-weight: 700; margin-top: 0.4rem;">🚀 Reached 12,450 Recipients</div>
        </div>

        <div style="padding: 1rem; border-radius: 10px; background: var(--bg-input); border: 1px solid var(--border-color);">
          <div style="font-weight: 800; font-size: 0.95rem; color: var(--brand-purple);">Delivery Partner Incentive Surge 🛵</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Target: Delivery Partners (Pune) • Channel: App Push</div>
          <div style="font-size: 0.8rem; color: #10B981; font-weight: 700; margin-top: 0.4rem;">🚀 Reached 18 Partners</div>
        </div>
      </div>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
