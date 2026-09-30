<?php
$pageTitle = 'Global Platform Settings';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';

$msg = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $settings = [
        'appName' => $_POST['appName'] ?? 'DhobiPro Platform',
        'supportEmail' => $_POST['supportEmail'] ?? 'support@dhobipro.com',
        'contactNumber' => $_POST['contactNumber'] ?? '+91 1800 123 4567',
        'taxGstPercentage' => floatval($_POST['taxGstPercentage'] ?? 18),
        'defaultCommissionPct' => floatval($_POST['defaultCommissionPct'] ?? 15),
        'pickupCharge' => floatval($_POST['pickupCharge'] ?? 29),
        'deliveryCharge' => floatval($_POST['deliveryCharge'] ?? 39),
    ];
    apiPost('/admin/settings', $settings);
    $msg = 'Platform master configurations updated and saved!';
}

$res = apiGet('/admin/settings');
$cfg = $res['data'] ?? [];

$appName = $cfg['appName'] ?? 'DhobiPro Platform';
$supportEmail = $cfg['supportEmail'] ?? 'support@dhobipro.com';
$contactNumber = $cfg['contactNumber'] ?? '+91 1800 123 4567';
$gst = $cfg['taxGstPercentage'] ?? 18;
$comm = $cfg['defaultCommissionPct'] ?? 15;
$pickup = $cfg['pickupCharge'] ?? 29;
$delivery = $cfg['deliveryCharge'] ?? 39;
?>

<div style="color: var(--text-primary);">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary); margin: 0;">
        <i data-lucide="settings" style="width: 28px; height: 28px; color: #8162EE;"></i> Global Platform Settings ⭐
      </h1>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.2rem; margin-bottom: 0;">
        Master platform configuration: app credentials, default commission, GST rates, delivery fees, cancellation & refund policies.
      </p>
    </div>
  </div>

  <?php if ($msg): ?>
    <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #059669; padding: 0.75rem 1rem; border-radius: 8px; font-weight: 700; font-size: 0.85rem; margin-bottom: 1.25rem;">
      <i data-lucide="check-circle-2" style="width: 16px; height: 16px; vertical-align: middle;"></i> <?= htmlspecialchars($msg) ?>
    </div>
  <?php endif; ?>

  <form method="POST" action="" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.5rem;">
    <!-- Basic App Identity & Contact Details -->
    <div class="card" style="padding: 1.5rem;">
      <h3 style="margin-top: 0; font-size: 1.15rem; font-weight: 800; color: var(--brand-purple); margin-bottom: 1rem;">
        📱 App Identity & Support Contact
      </h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Platform Brand Name</label>
          <input type="text" name="appName" class="form-control" value="<?= htmlspecialchars($appName) ?>" style="width: 100%;">
        </div>
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Support Phone Number</label>
          <input type="text" name="contactNumber" class="form-control" value="<?= htmlspecialchars($contactNumber) ?>" style="width: 100%;">
        </div>
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Support Email Address</label>
          <input type="email" name="supportEmail" class="form-control" value="<?= htmlspecialchars($supportEmail) ?>" style="width: 100%;">
        </div>
      </div>
    </div>

    <!-- Financials, Commission & Charges Rules -->
    <div class="card" style="padding: 1.5rem;">
      <h3 style="margin-top: 0; font-size: 1.15rem; font-weight: 800; color: var(--brand-purple); margin-bottom: 1rem;">
        💳 Financials, Commission & Charges
      </h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div>
            <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">GST / Tax Rate (%)</label>
            <input type="number" name="taxGstPercentage" class="form-control" value="<?= $gst ?>" style="width: 100%;">
          </div>
          <div>
            <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Default Commission (%)</label>
            <input type="number" name="defaultCommissionPct" class="form-control" value="<?= $comm ?>" style="width: 100%;">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div>
            <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Pickup Fee (₹)</label>
            <input type="number" name="pickupCharge" class="form-control" value="<?= $pickup ?>" style="width: 100%;">
          </div>
          <div>
            <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Delivery Fee (₹)</label>
            <input type="number" name="deliveryCharge" class="form-control" value="<?= $delivery ?>" style="width: 100%;">
          </div>
        </div>

        <div style="margin-top: 1rem;">
          <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
            <i data-lucide="save" style="width: 18px; height: 18px;"></i> Save Platform Settings
          </button>
        </div>
      </div>
    </div>
  </form>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
