<?php
$pageTitle = 'Location & Coverage Management';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';

$msg = null;

if (!isset($_SESSION['locations'])) {
    $_SESSION['locations'] = [
        [
            'id' => 'CT-PUNE-101',
            'name' => 'Pune',
            'state' => 'Maharashtra',
            'pincodes' => '411001, 411004, 411007, 411014, 411038, 411045, 411057',
            'defaultRadiusKm' => 10,
            'commission' => 10,
            'deliveryFee' => 30,
            'isServiceable' => true,
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
        ],
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'add_city') {
        $newCity = [
            'id' => 'CT-' . strtoupper(substr($_POST['name'], 0, 3)) . '-' . rand(100, 999),
            'name' => $_POST['name'],
            'state' => $_POST['state'],
            'pincodes' => $_POST['pincodes'],
            'defaultRadiusKm' => floatval($_POST['radius']),
            'commission' => floatval($_POST['commission']),
            'deliveryFee' => floatval($_POST['fee']),
            'isServiceable' => true,
        ];
        $_SESSION['locations'][] = $newCity;
        $msg = "New serviceable city {$_POST['name']} added successfully.";
    } elseif ($action === 'edit_city') {
        $id = $_POST['id'];
        foreach ($_SESSION['locations'] as &$loc) {
            if ($loc['id'] === $id) {
                $loc['name'] = $_POST['name'];
                $loc['state'] = $_POST['state'];
                $loc['pincodes'] = $_POST['pincodes'];
                $loc['defaultRadiusKm'] = floatval($_POST['radius']);
                $loc['commission'] = floatval($_POST['commission']);
                $loc['deliveryFee'] = floatval($_POST['fee']);
                break;
            }
        }
        unset($loc);
        $msg = "City details updated successfully.";
    } elseif ($action === 'delete_city') {
        $id = $_POST['id'];
        $_SESSION['locations'] = array_values(array_filter($_SESSION['locations'], fn($loc) => $loc['id'] !== $id));
        $msg = "City removed from coverage list.";
    }
}

// Fetch live shops count
$res = apiGet('/admin/laundries');
$shops = apiExtractList($res);

if (!empty($_SESSION['custom_shops'])) {
    $existingEmails = array_map(function($l) { return strtolower(trim($l['email'] ?? '')); }, $shops);
    foreach (array_reverse($_SESSION['custom_shops']) as $cs) {
        $csEmail = strtolower(trim($cs['email'] ?? ''));
        if (!in_array($csEmail, $existingEmails) || empty($csEmail)) {
            array_unshift($shops, $cs);
        }
    }
}
$cities = $_SESSION['locations'];
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
            <th>Actions</th>
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
              <?php
                $cName = $c['name'];
                $cityShops = array_filter($shops, function($s) use ($cName) {
                    $shopCity = $s['city'] ?? '';
                    // Allow partial match (e.g. 'Tathawade, Pune' matches 'Pune')
                    return stripos($shopCity, $cName) !== false;
                });
                $cityShops = array_values($cityShops);
                $realShopCount = count($cityShops);
              ?>
              <td>
                <span class="badge badge-info" style="cursor: pointer; transition: 0.2s;" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1" onclick='openShopsModal(<?= htmlspecialchars(json_encode($cityShops), ENT_QUOTES, "UTF-8") ?>, <?= htmlspecialchars(json_encode($cName), ENT_QUOTES, "UTF-8") ?>)'>
                  🏪 <?= $realShopCount ?> Live Shops
                </span>
              </td>
              <td>
                <div style="display: flex; gap: 0.5rem;">
                  <button type="button" onclick='openEditModal(<?= json_encode($c) ?>)' class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 0.25rem;" title="Edit Location">
                    <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i> Edit
                  </button>
                  <form method="POST" action="" style="margin: 0;" onsubmit="return confirm('Are you sure you want to delete this city?');">
                    <input type="hidden" name="action" value="delete_city">
                    <input type="hidden" name="id" value="<?= htmlspecialchars($c['id']) ?>">
                    <button type="submit" class="btn btn-sm" style="background: rgba(239, 68, 68, 0.15); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.35rem 0.65rem; border-radius: 6px; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem; cursor: pointer;">
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

<!-- Modal: Add City -->
<div id="addCityModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(6px); align-items: center; justify-content: center; z-index: 99999; padding: 1rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 520px; padding: 1.5rem; color: var(--text-primary);">
    <h3 style="margin-top: 0; font-size: 1.2rem; font-weight: 800; color: var(--brand-purple);">Add Serviceable City</h3>
    <form method="POST" action="">
      <input type="hidden" name="action" value="add_city">
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">City Name</label>
        <input type="text" name="name" class="form-control" placeholder="e.g. Pune" required style="width: 100%;">
      </div>
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">State</label>
        <input type="text" name="state" class="form-control" value="Maharashtra" required style="width: 100%;">
      </div>
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Pincodes (Comma separated)</label>
        <input type="text" name="pincodes" class="form-control" placeholder="411001, 411057..." required style="width: 100%;">
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Radius (km)</label>
          <input type="number" name="radius" class="form-control" value="10" required style="width: 100%;">
        </div>
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Platform Comm (%)</label>
          <input type="number" step="0.1" name="commission" class="form-control" value="10" required style="width: 100%;">
        </div>
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Delivery Fee (₹)</label>
          <input type="number" name="fee" class="form-control" value="30" required style="width: 100%;">
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('addCityModal')" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.6rem 1.25rem; border-radius: 8px; font-weight: 700;">Save City</button>
      </div>
    </form>
  </div>
</div>

<!-- Modal: Edit City -->
<div id="editCityModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(6px); align-items: center; justify-content: center; z-index: 99999; padding: 1rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 520px; padding: 1.5rem; color: var(--text-primary);">
    <h3 style="margin-top: 0; font-size: 1.2rem; font-weight: 800; color: var(--brand-purple);">Edit Location & Coverage</h3>
    <form method="POST" action="">
      <input type="hidden" name="action" value="edit_city">
      <input type="hidden" name="id" id="edit_city_id">
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">City Name</label>
        <input type="text" name="name" id="edit_city_name" class="form-control" required style="width: 100%;">
      </div>
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">State</label>
        <input type="text" name="state" id="edit_city_state" class="form-control" required style="width: 100%;">
      </div>
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Pincodes (Comma separated)</label>
        <input type="text" name="pincodes" id="edit_city_pincodes" class="form-control" required style="width: 100%;">
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Radius (km)</label>
          <input type="number" name="radius" id="edit_city_radius" class="form-control" required style="width: 100%;">
        </div>
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Platform Comm (%)</label>
          <input type="number" step="0.1" name="commission" id="edit_city_commission" class="form-control" required style="width: 100%;">
        </div>
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.3rem; font-weight: 700;">Delivery Fee (₹)</label>
          <input type="number" name="fee" id="edit_city_fee" class="form-control" required style="width: 100%;">
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('editCityModal')" class="btn btn-secondary">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.6rem 1.25rem; border-radius: 8px; font-weight: 700;">Update Location</button>
      </div>
    </form>
  </div>
</div>

<!-- Modal: View City Shops -->
<div id="viewShopsModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(6px); align-items: center; justify-content: center; z-index: 99999; padding: 1rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 600px; padding: 1.5rem; color: var(--text-primary); max-height: 80vh; overflow-y: auto;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h3 style="margin-top: 0; font-size: 1.2rem; font-weight: 800; color: var(--brand-purple);" id="viewShopsTitle">Shops in City</h3>
        <button onclick="closeModal('viewShopsModal')" style="background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 1.2rem; font-weight: 800;">✕</button>
    </div>
    
    <div id="viewShopsList">
        <!-- JS populated -->
    </div>
  </div>
</div>

<script>
  function openEditModal(city) {
    document.getElementById('edit_city_id').value = city.id;
    document.getElementById('edit_city_name').value = city.name;
    document.getElementById('edit_city_state').value = city.state;
    document.getElementById('edit_city_pincodes').value = city.pincodes;
    document.getElementById('edit_city_radius').value = city.defaultRadiusKm;
    document.getElementById('edit_city_commission').value = city.commission;
    document.getElementById('edit_city_fee').value = city.deliveryFee;
    
    openModal('editCityModal');
    if (window.lucide) { lucide.createIcons(); }
  }

  function openShopsModal(shops, cityName) {
    document.getElementById('viewShopsTitle').innerText = 'Laundry Shops in ' + cityName;
    const list = document.getElementById('viewShopsList');
    list.innerHTML = '';
    
    if (shops.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">No active shops in this city yet.</div>';
    } else {
        let html = '<div style="display: grid; gap: 1rem;">';
        shops.forEach(s => {
            let sName = s.shopName || s.name || s.shop_name || 'Laundry Outlet';
            let sOwner = s.ownerName || s.owner_name || 'Owner';
            let sPhone = s.phone || s.mobile_number || 'N/A';
            let sRating = s.rating || '5.0';
            
            html += `
            <div style="border: 1px solid var(--border-color); border-radius: 12px; padding: 1rem; display: flex; justify-content: space-between; align-items: center; background: rgba(129,98,238,0.03);">
                <div>
                    <div style="font-weight: 800; color: var(--text-primary); font-size: 1.05rem;">${sName}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.2rem;">👤 ${sOwner} | 📞 ${sPhone}</div>
                </div>
                <div style="text-align: right;">
                    <div style="color: #F59E0B; font-weight: 800; margin-bottom: 0.2rem;">★ ${sRating}</div>
                    <a href="../laundries/index.php" style="font-size: 0.75rem; color: #8162EE; font-weight: 700; text-decoration: none; padding: 0.2rem 0.5rem; border-radius: 4px; background: rgba(129,98,238,0.1);">View Profile →</a>
                </div>
            </div>`;
        });
        html += '</div>';
        list.innerHTML = html;
    }
    
    openModal('viewShopsModal');
  }
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
