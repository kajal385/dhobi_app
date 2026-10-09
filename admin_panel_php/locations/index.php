<?php
$pageTitle = 'Location & Coverage Management';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';
require_once __DIR__ . '/../includes/db.php';

$msg = null;

if (!function_exists('extractLocalityFromAddress')) {
    function extractLocalityFromAddress(?string $address, ?string $city = ''): string {
        $clean = trim($address ?? '');
        if (!$clean) return $city ?: 'Operational Hub';
        
        $known = [
            'Tathawade', 'Kalewadi', 'Wakad', 'Hinjawadi', 'Hinjewadi', 
            'Baner', 'Kothrud', 'Aundh', 'Pimpri', 'Chinchwad', 
            'Hadapsar', 'Viman Nagar', 'Kalyani Nagar', 'Bavdhan', 
            'Ravet', 'Pimple Saudagar', 'Pimple Nilakh', 'New City Center',
            'Dange Chowk', 'Bhumkar Chowk', 'Magarpatta', 'Koregaon Park'
        ];
        foreach ($known as $k) {
            if (stripos($clean, $k) !== false) {
                return $k;
            }
        }
        
        $parts = array_filter(array_map('trim', explode(',', $clean)));
        if (!empty($parts)) {
            $first = reset($parts);
            if (strlen($first) >= 3 && !preg_match('/^[0-9]+$/', $first)) {
                return $first;
            }
        }
        return $city ?: 'Operational Hub';
    }
}

// Fetch live shops from direct MySQL db for complete onboarding details (Address, Lat/Lng, Radius)
$shops = [];
$db = getDb();
if ($db) {
    try {
        $stmt = $db->query("SELECT s.*, u.name as owner_name, u.phone as owner_phone, u.email as owner_email FROM laundry_shops s LEFT JOIN users u ON s.owner_id = u.id ORDER BY s.id ASC");
        while ($r = $stmt->fetch()) {
            $shops[] = $r;
        }
    } catch (\Throwable $e) {}
}

if (empty($shops)) {
    $res = apiGet('/admin/laundries');
    $shops = apiExtractList($res);
}

// Merge session custom shops
if (!empty($_SESSION['custom_shops'])) {
    $existingIds = array_map(function($l) { return strval($l['id'] ?? ''); }, $shops);
    $existingEmails = array_map(function($l) { return strtolower(trim($l['email'] ?? '')); }, $shops);
    foreach (array_reverse($_SESSION['custom_shops']) as $cs) {
        $csEmail = strtolower(trim($cs['email'] ?? ''));
        $csId = strval($cs['id'] ?? '');
        if (!in_array($csId, $existingIds) && (!in_array($csEmail, $existingEmails) || empty($csEmail))) {
            array_unshift($shops, $cs);
        }
    }
}

// Dynamically extract unique onboarded areas and pincodes
$onboardedAreas = [];
$coveredPincodesList = [];
foreach ($shops as &$s) {
    $s['locality'] = extractLocalityFromAddress($s['address'] ?? '', $s['city'] ?? '');
    if (!in_array($s['locality'], $onboardedAreas)) {
        $onboardedAreas[] = $s['locality'];
    }
    $pin = trim($s['pincode'] ?? '');
    if ($pin && !in_array($pin, $coveredPincodesList)) {
        $coveredPincodesList[] = $pin;
    }
}
unset($s);

if (!isset($_SESSION['locations'])) {
    $punePincodes = '411033, 411017, 411001, 411004, 411007, 411014, 411038, 411045, 411057';
    $_SESSION['locations'] = [
        [
            'id' => 'CT-PUNE-101',
            'name' => 'Pune',
            'state' => 'Maharashtra',
            'pincodes' => $punePincodes,
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

$cities = $_SESSION['locations'];
?>

<div style="color: var(--text-primary);">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary); margin: 0;">
        <i data-lucide="map-pin" style="width: 28px; height: 28px; color: #8162EE;"></i> Location & Coverage Management ⭐
      </h1>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.2rem; margin-bottom: 0;">
        Monitor onboarded laundry shop locations, active service areas, GPS hubs, and regional delivery policies.
      </p>
    </div>

    <button
      onclick="openModal('addCityModal')"
      class="btn btn-primary"
      style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #E18C8E 67.34%, #FE9A5D 98.26%); color: #FFF; padding: 0.65rem 1.25rem; border-radius: 8px; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 12px rgba(129,98,238,0.3);"
    >
      <i data-lucide="plus" style="width: 18px; height: 18px;"></i> Add New City
    </button>
  </div>

  <?php if ($msg): ?>
    <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #059669; padding: 0.75rem 1rem; border-radius: 8px; font-weight: 700; font-size: 0.85rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
      <i data-lucide="check-circle" style="width: 18px; height: 18px;"></i> <?= htmlspecialchars($msg) ?>
    </div>
  <?php endif; ?>

  <!-- Real-Time Coverage KPI Metrics -->
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
    <div class="card" style="padding: 1.1rem 1.25rem; border-radius: 12px; display: flex; align-items: center; gap: 1rem; border-left: 4px solid #8162EE;">
      <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(129,98,238,0.12); color: #8162EE; display: flex; align-items: center; justify-content: center;">
        <i data-lucide="navigation" style="width: 22px; height: 22px;"></i>
      </div>
      <div>
        <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Active Localities / Areas</div>
        <div style="font-size: 1.35rem; font-weight: 800; color: var(--text-primary);"><?= count($onboardedAreas) ?> Live Hubs</div>
        <div style="font-size: 0.72rem; color: #8162EE; font-weight: 700;"><?= htmlspecialchars(implode(', ', array_slice($onboardedAreas, 0, 2))) ?></div>
      </div>
    </div>

    <div class="card" style="padding: 1.1rem 1.25rem; border-radius: 12px; display: flex; align-items: center; gap: 1rem; border-left: 4px solid #10B981;">
      <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(16,185,129,0.12); color: #10B981; display: flex; align-items: center; justify-content: center;">
        <i data-lucide="store" style="width: 22px; height: 22px;"></i>
      </div>
      <div>
        <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Onboarded Laundry Shops</div>
        <div style="font-size: 1.35rem; font-weight: 800; color: var(--text-primary);"><?= count($shops) ?> Stores</div>
        <div style="font-size: 0.72rem; color: #10B981; font-weight: 700;">100% Locations Active</div>
      </div>
    </div>

    <div class="card" style="padding: 1.1rem 1.25rem; border-radius: 12px; display: flex; align-items: center; gap: 1rem; border-left: 4px solid #0284C7;">
      <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(2,132,199,0.12); color: #0284C7; display: flex; align-items: center; justify-content: center;">
        <i data-lucide="map" style="width: 22px; height: 22px;"></i>
      </div>
      <div>
        <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Doorstep Service Radius</div>
        <div style="font-size: 1.35rem; font-weight: 800; color: var(--text-primary);">8 - 10 km Reach</div>
        <div style="font-size: 0.72rem; color: #0284C7; font-weight: 700;">Hyper-local Fulfillment</div>
      </div>
    </div>

    <div class="card" style="padding: 1.1rem 1.25rem; border-radius: 12px; display: flex; align-items: center; gap: 1rem; border-left: 4px solid #F59E0B;">
      <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(245,158,11,0.12); color: #F59E0B; display: flex; align-items: center; justify-content: center;">
        <i data-lucide="layers" style="width: 22px; height: 22px;"></i>
      </div>
      <div>
        <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Covered Pincodes</div>
        <div style="font-size: 1.35rem; font-weight: 800; color: var(--text-primary);"><?= count($coveredPincodesList) ?> Primary PINs</div>
        <div style="font-size: 0.72rem; color: #F59E0B; font-weight: 700;"><?= htmlspecialchars(implode(', ', array_slice($coveredPincodesList, 0, 3))) ?></div>
      </div>
    </div>
  </div>

  <!-- TABLE 1: Onboarded Laundry Shops & Captured Onboarding Locations -->
  <div class="card" style="padding: 1.5rem; margin-bottom: 2rem;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
      <div>
        <h2 style="font-size: 1.2rem; font-weight: 800; margin: 0; color: var(--brand-purple); display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="map-pinned" style="width: 20px; height: 20px; color: #8162EE;"></i> Onboarded Laundry Shop Areas &amp; Locations
        </h2>
        <p style="margin: 0.25rem 0 0 0; font-size: 0.8rem; color: var(--text-secondary);">
          Displays which areas currently have laundry shops, with exact street addresses and GPS coordinates captured at onboarding time.
        </p>
      </div>
      <span class="badge badge-success" style="font-size: 0.76rem; font-weight: 800; padding: 0.35rem 0.75rem; border-radius: 20px;">
        ✓ Live GPS Mapped
      </span>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Laundry Shop &amp; Partner</th>
            <th>Onboarded Area / Locality</th>
            <th>Full Street Address (Captured at Onboarding)</th>
            <th>City &amp; Pincode</th>
            <th>Service Radius</th>
            <th>GPS Coordinates &amp; Map</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($shops)): ?>
            <tr>
              <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                No laundry shops onboarded yet.
              </td>
            </tr>
          <?php endif; ?>
          <?php foreach ($shops as $s): 
              $sId = $s['id'] ?? $s['shop_id'] ?? '';
              $sName = $s['name'] ?? $s['shop_name'] ?? $s['shopName'] ?? "Shop #{$sId}";
              $oName = $s['owner_name'] ?? $s['ownerName'] ?? 'Owner';
              $phone = $s['phone'] ?? $s['owner_phone'] ?? 'N/A';
              $address = trim($s['address'] ?? 'Tathawade, Pune');
              $city = trim($s['city'] ?? 'Pune');
              $pincode = trim($s['pincode'] ?? '411033');
              $radius = floatval($s['pickup_radius_km'] ?? $s['pickupRadiusKm'] ?? 10);
              $lat = $s['latitude'] ?? null;
              $lng = $s['longitude'] ?? null;
              $locality = $s['locality'] ?? extractLocalityFromAddress($address, $city);
              $mapUrl = ($lat && $lng) ? "https://www.google.com/maps?q={$lat},{$lng}" : "https://www.google.com/maps/search/" . urlencode("{$address}, {$city}");
          ?>
            <tr>
              <td>
                <div style="font-weight: 800; font-size: 0.95rem; color: var(--brand-purple);">
                  <?= htmlspecialchars($sName) ?>
                </div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">Shop ID: #<?= htmlspecialchars($sId) ?></div>
                <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.2rem;">
                  👤 <?= htmlspecialchars($oName) ?> • 📞 <?= htmlspecialchars($phone) ?>
                </div>
              </td>
              <td>
                <div style="display: inline-flex; align-items: center; gap: 0.35rem; background: rgba(129,98,238,0.1); color: var(--brand-purple); padding: 0.35rem 0.7rem; border-radius: 8px; font-weight: 800; font-size: 0.85rem; border: 1px solid rgba(129,98,238,0.25);">
                  <i data-lucide="map-pin" style="width: 14px; height: 14px; color: #8162EE;"></i>
                  <?= htmlspecialchars($locality) ?>
                </div>
              </td>
              <td style="max-width: 280px; font-size: 0.82rem; color: var(--text-secondary); line-height: 1.4;">
                <span title="<?= htmlspecialchars($address) ?>">
                  <?= htmlspecialchars($address) ?>
                </span>
              </td>
              <td>
                <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);"><?= htmlspecialchars($city) ?></div>
                <div style="display: inline-block; font-size: 0.72rem; background: var(--bg-input); padding: 0.15rem 0.45rem; border-radius: 4px; border: 1px solid var(--border-color); color: var(--text-muted); font-weight: 700; margin-top: 0.2rem;">
                  PIN: <?= htmlspecialchars($pincode) ?>
                </div>
              </td>
              <td>
                <span class="badge" style="background: rgba(16,185,129,0.12); color: #059669; font-weight: 800; font-size: 0.78rem; padding: 0.3rem 0.6rem; border-radius: 6px;">
                  🛵 <?= $radius ?> km Radius
                </span>
              </td>
              <td>
                <?php if ($lat && $lng): ?>
                  <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">
                    <?= number_format(floatval($lat), 4) ?>°N, <?= number_format(floatval($lng), 4) ?>°E
                  </div>
                <?php endif; ?>
                <a
                  href="<?= htmlspecialchars($mapUrl) ?>"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-secondary btn-sm"
                  style="font-size: 0.72rem; padding: 0.28rem 0.55rem; display: inline-flex; align-items: center; gap: 0.3rem; border-radius: 6px; color: #0284C7; font-weight: 700;"
                  title="View on Google Maps"
                >
                  <i data-lucide="map" style="width: 13px; height: 13px;"></i> Open Maps ↗
                </a>
              </td>
              <td>
                <a
                  href="../laundries/index.php"
                  class="btn btn-secondary btn-sm"
                  style="font-size: 0.75rem; padding: 0.35rem 0.65rem; border-radius: 6px; font-weight: 700; display: inline-flex; align-items: center; gap: 0.3rem;"
                >
                  <i data-lucide="external-link" style="width: 13px; height: 13px;"></i> View Shop
                </a>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>

  <!-- TABLE 2: Active Serviceable Cities (City Level Policy) -->
  <div class="card" style="padding: 1.5rem;">
    <h2 style="font-size: 1.15rem; font-weight: 800; margin-top: 0; margin-bottom: 1.25rem; color: var(--brand-purple); display: flex; align-items: center; gap: 0.5rem;">
      <i data-lucide="building-2" style="width: 20px; height: 20px;"></i> Active Serviceable Cities &amp; Regional Policies
    </h2>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>City &amp; State</th>
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
                    $shopAddr = $s['address'] ?? '';
                    return stripos($shopCity, $cName) !== false || stripos($shopAddr, $cName) !== false;
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
    <h3 style="margin-top: 0; font-size: 1.2rem; font-weight: 800; color: var(--brand-purple);">Edit Location &amp; Coverage</h3>
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

<!-- Modal: View City Shops with Onboarded Location Details -->
<div id="viewShopsModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(6px); align-items: center; justify-content: center; z-index: 99999; padding: 1rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 640px; padding: 1.5rem; color: var(--text-primary); max-height: 85vh; overflow-y: auto;">
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
    document.getElementById('viewShopsTitle').innerText = 'Onboarded Laundry Shops in ' + cityName;
    const list = document.getElementById('viewShopsList');
    list.innerHTML = '';
    
    if (!shops || shops.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">No active shops in this city yet.</div>';
    } else {
        let html = '<div style="display: grid; gap: 1rem;">';
        shops.forEach(s => {
            let sName = s.shopName || s.name || s.shop_name || 'Laundry Outlet';
            let sOwner = s.ownerName || s.owner_name || 'Owner';
            let sPhone = s.phone || s.owner_phone || s.mobile_number || 'N/A';
            let sAddr = s.address || 'Address on file';
            let sLocality = s.locality || (sAddr.split(',')[0] || 'Central Area');
            let sPin = s.pincode || '411033';
            let sRadius = s.pickup_radius_km || s.pickupRadiusKm || 10;
            let sLat = s.latitude;
            let sLng = s.longitude;
            let mapHref = (sLat && sLng) 
                ? `https://www.google.com/maps?q=${sLat},${sLng}` 
                : `https://www.google.com/maps/search/${encodeURIComponent(sAddr)}`;
            
            html += `
            <div style="border: 1px solid var(--border-color); border-radius: 12px; padding: 1.1rem; background: rgba(129,98,238,0.03);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <div>
                        <div style="font-weight: 800; color: var(--brand-purple); font-size: 1.05rem;">${sName}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.15rem;">👤 ${sOwner} • 📞 ${sPhone}</div>
                    </div>
                    <span style="background: rgba(129,98,238,0.12); color: #8162EE; font-weight: 800; font-size: 0.75rem; padding: 0.25rem 0.55rem; border-radius: 6px;">
                        📍 ${sLocality}
                    </span>
                </div>
                
                <div style="background: var(--bg-card); padding: 0.65rem 0.85rem; border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
                    <strong>Captured Onboarding Address:</strong><br>
                    <span>${sAddr}</span>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                    <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; font-size: 0.75rem;">
                        <span style="background: var(--bg-input); padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700;">PIN: ${sPin}</span>
                        <span style="background: rgba(16,185,129,0.1); color: #059669; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700;">Radius: ${sRadius} km</span>
                    </div>
                    <a href="${mapHref}" target="_blank" rel="noopener noreferrer" style="font-size: 0.75rem; color: #0284C7; font-weight: 700; text-decoration: none; padding: 0.25rem 0.6rem; border-radius: 6px; background: rgba(2,132,199,0.1); display: inline-flex; align-items: center; gap: 0.25rem;">
                        🗺️ Google Maps ↗
                    </a>
                </div>
            </div>`;
        });
        html += '</div>';
        list.innerHTML = html;
    }
    
    openModal('viewShopsModal');
    if (window.lucide) { lucide.createIcons(); }
  }
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
