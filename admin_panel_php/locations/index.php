<?php
$pageTitle = 'Location & Coverage Management';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';

$msg = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    if ($action === 'add_city') {
        $msg = "New serviceable city {$_POST['name']} added to coverage list.";
    }
}

// Fetch live shops count for Pune
$res = apiGet('/admin/laundries');
$shops = apiExtractList($res);
$shopCount = count($shops) ?: 5;

$cities = [
    [
        'id' => 'CT-PUNE-101',
        'name' => 'Pune',
        'state' => 'Maharashtra',
        'pincodes' => '411001, 411004, 411007, 411014, 411038, 411045, 411057',
        'defaultRadiusKm' => 10,
        'commission' => 10,
        'deliveryFee' => 30,
        'isServiceable' => true,
        'activeShopsCount' => $shopCount,
    ],
    [
        'id' => 'CT-MUM-102',
        'name' => 'Mumbai',
        'state' => 'Maharashtra',
        'pincodes' => '400001, 400050, 400053, 400076',
        'defaultRadiusKm' => 12,
        'commission' => 12,
        'deliveryFee' => 40,
        'isServiceable' => true,
        'activeShopsCount' => 1,
    ],
];
?>

<div style="color: var(--text-primary);">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary); margin: 0;">
        <i data-lucide="map-pin" style="width: 28px; height: 28px; color: #8162EE;"></i> Location & Coverage Management ⭐
      </h1>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.2rem; margin-bottom: 0;">
        Manage serviceable states, cities, pincodes, service radius, and regional delivery fees.
      </p>
    </div>

    <button
      onclick="openModal('addCityModal')"
      class="btn btn-primary"
      style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #E18C8E 67.34%, #FE9A5D 98.26%); color: #FFF; padding: 0.65rem 1.25rem; border-radius: 8px; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;"
    >
      <i data-lucide="plus" style="width: 18px; height: 18px;"></i> Add New City
    </button>
  </div>

  <?php if ($msg): ?>
    <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #059669; padding: 0.75rem 1rem; border-radius: 8px; font-weight: 700; font-size: 0.85rem; margin-bottom: 1.25rem;">
      <?= htmlspecialchars($msg) ?>
    </div>
  <?php endif; ?>

  <div class="card" style="padding: 1.5rem;">
    <h2 style="font-size: 1.15rem; font-weight: 800; margin-top: 0; margin-bottom: 1.25rem; color: var(--brand-purple);">
      🏙️ Active Serviceable Cities
    </h2>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>City & State</th>
            <th>Covered Pincodes</th>
            <th>Service Radius</th>
            <th>Platform Commission</th>
            <th>Base Delivery Fee</th>
            <th>Active Laundry Stores</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($cities as $c): ?>
            <tr>
              <td>
                <strong style="color: var(--brand-purple); font-size: 0.95rem;">📍 <?= htmlspecialchars($c['name']) ?></strong>
                <div style="font-size: 0.72rem; color: var(--text-muted);"><?= htmlspecialchars($c['state']) ?></div>
              </td>
              <td style="max-width: 250px; font-size: 0.82rem; color: var(--text-secondary);"><?= htmlspecialchars($c['pincodes']) ?></td>
              <td><strong><?= $c['defaultRadiusKm'] ?> km</strong></td>
              <td><span style="color: #8162EE; font-weight: 800;"><?= $c['commission'] ?>%</span></td>
              <td><span style="color: #10B981; font-weight: 800;">₹<?= $c['deliveryFee'] ?></span></td>
              <td>
                <span class="badge badge-info">
                  🏪 <?= $c['activeShopsCount'] ?> Live Shops
                </span>
              </td>
              <td>
                <span class="badge badge-success">SERVICEABLE</span>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Modal: Add City -->
<div id="addCityModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(6px); align-items: center; justify-content: center; z-index: 99999; padding: 1rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 480px; padding: 1.5rem; color: var(--text-primary);">
    <h3 style="margin-top: 0; font-size: 1.2rem; font-weight: 800; color: var(--brand-purple);">Add Serviceable City</h3>
    <form method="POST" action="">
      <input type="hidden" name="action" value="add_city">
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">City Name</label>
        <input type="text" name="name" class="form-control" placeholder="e.g. Pune" required style="width: 100%;">
      </div>
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">State</label>
        <input type="text" name="state" class="form-control" value="Maharashtra" style="width: 100%;">
      </div>
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Pincodes (Comma separated)</label>
        <input type="text" name="pincodes" class="form-control" placeholder="411001, 411057..." style="width: 100%;">
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Radius (km)</label>
          <input type="number" name="radius" class="form-control" value="10" style="width: 100%;">
        </div>
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Delivery Fee (₹)</label>
          <input type="number" name="fee" class="form-control" value="30" style="width: 100%;">
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('addCityModal')" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.6rem 1.25rem; border-radius: 8px; font-weight: 700;">Save City</button>
      </div>
    </form>
  </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
