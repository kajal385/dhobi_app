<?php
$pageTitle = 'Commission Rates Management';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';

$msg = null;

// Initialize session state for Pune zones
if (!isset($_SESSION['pune_commission_zones'])) {
    $_SESSION['pune_commission_zones'] = [
        'PUN-01' => ['id' => 'PUN-01', 'zone' => 'Pune Central (Shivajinagar, Camp, Swargate)', 'commissionPercentage' => 10, 'status' => 'ACTIVE', 'hub' => 'PMC Central'],
        'PUN-02' => ['id' => 'PUN-02', 'zone' => 'Hinjewadi Tech Corridor (Phase 1, 2, 3)', 'commissionPercentage' => 10, 'status' => 'ACTIVE', 'hub' => 'IT Cluster Hub'],
        'PUN-03' => ['id' => 'PUN-03', 'zone' => 'Wakad, Tathawade & Pimple Saudagar', 'commissionPercentage' => 10, 'status' => 'ACTIVE', 'hub' => 'West Zone'],
        'PUN-04' => ['id' => 'PUN-04', 'zone' => 'Baner, Balewadi High Street & Aundh', 'commissionPercentage' => 10, 'status' => 'ACTIVE', 'hub' => 'West Zone'],
        'PUN-05' => ['id' => 'PUN-05', 'zone' => 'Kothrud, Karve Nagar & Bavdhan', 'commissionPercentage' => 10, 'status' => 'ACTIVE', 'hub' => 'South-West Hub'],
        'PUN-06' => ['id' => 'PUN-06', 'zone' => 'Viman Nagar, Kalyani Nagar & Airport Rd', 'commissionPercentage' => 10, 'status' => 'ACTIVE', 'hub' => 'East Zone'],
        'PUN-07' => ['id' => 'PUN-07', 'zone' => 'Hadapsar, Magarpatta City & Kharadi', 'commissionPercentage' => 10, 'status' => 'ACTIVE', 'hub' => 'IT Cybercity'],
        'PUN-08' => ['id' => 'PUN-08', 'zone' => 'Pimpri-Chinchwad & Nigdi (PCMC)', 'commissionPercentage' => 10, 'status' => 'ACTIVE', 'hub' => 'PCMC Metro'],
    ];
}

if (!isset($_SESSION['category_commission'])) {
    $_SESSION['category_commission'] = [
        'CAT-1' => ['id' => 'CAT-1', 'category' => 'Wash & Fold', 'commissionPercentage' => 10, 'status' => 'ACTIVE', 'sla' => '24h'],
        'CAT-2' => ['id' => 'CAT-2', 'category' => 'Wash & Iron', 'commissionPercentage' => 12, 'status' => 'ACTIVE', 'sla' => '24h'],
        'CAT-3' => ['id' => 'CAT-3', 'category' => 'Dry Cleaning', 'commissionPercentage' => 15, 'status' => 'ACTIVE', 'sla' => '48h'],
        'CAT-4' => ['id' => 'CAT-4', 'category' => 'Shoe & Suit Care', 'commissionPercentage' => 18, 'status' => 'ACTIVE', 'sla' => '48h'],
        'CAT-5' => ['id' => 'CAT-5', 'category' => 'Curtains & Blankets', 'commissionPercentage' => 15, 'status' => 'ACTIVE', 'sla' => '48h'],
    ];
}

// POST Handlers for Commission updates
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'update_zone_commission') {
        $zoneId = $_POST['zone_id'] ?? '';
        $rate = floatval($_POST['rate'] ?? 10);
        if ($zoneId && isset($_SESSION['pune_commission_zones'][$zoneId])) {
            $_SESSION['pune_commission_zones'][$zoneId]['commissionPercentage'] = $rate;
            $zoneName = $_SESSION['pune_commission_zones'][$zoneId]['zone'];
            apiPut("/admin/commission/cities/{$zoneId}", ['commissionPercentage' => $rate]);
            $msg = "Commission rate for {$zoneName} updated to {$rate}%.";
        }
    } elseif ($action === 'update_cat_commission') {
        $catId = $_POST['cat_id'] ?? '';
        $rate = floatval($_POST['rate'] ?? 12);
        if ($catId && isset($_SESSION['category_commission'][$catId])) {
            $_SESSION['category_commission'][$catId]['commissionPercentage'] = $rate;
            $catName = $_SESSION['category_commission'][$catId]['category'];
            apiPut("/admin/commission/categories/{$catId}", ['commissionPercentage' => $rate]);
            $msg = "Commission rate for {$catName} updated to {$rate}%.";
        }
    }
}

$puneZones = array_values($_SESSION['pune_commission_zones']);
$categories = array_values($_SESSION['category_commission']);
?>

<div style="color: var(--text-primary);">
  <!-- Header Title -->
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <div style="display: flex; align-items: center; gap: 0.6rem;">
        <h1 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="percent" style="width: 28px; height: 28px; color: #10B981;"></i> Platform Commission Management
        </h1>
        <span style="font-size: 0.72rem; padding: 0.2rem 0.65rem; border-radius: 20px; background: rgba(16, 185, 129, 0.15); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3); font-weight: 800;">
          📍 Pune Metro Cluster Only
        </span>
      </div>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.25rem; margin-bottom: 0;">
        Configure localized platform revenue share percentages across Pune operational delivery zones and wash categories.
      </p>
    </div>
  </div>

  <?php if ($msg): ?>
    <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #059669; padding: 0.75rem 1rem; border-radius: 8px; font-weight: 700; font-size: 0.85rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
      <i data-lucide="check-circle" style="width: 18px; height: 18px;"></i> <?= htmlspecialchars($msg) ?>
    </div>
  <?php endif; ?>

  <!-- Highlight Banner for Pune Region Exclusivity -->
  <div style="background: linear-gradient(135deg, rgba(129, 98, 238, 0.12) 0%, rgba(50, 19, 143, 0.18) 100%); border: 1px solid rgba(129, 98, 238, 0.25); border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
    <div style="display: flex; align-items: center; gap: 0.75rem;">
      <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #8162EE 0%, #32138F 100%); display: flex; align-items: center; justify-content: center; color: #FFF; font-weight: 900; box-shadow: 0 4px 12px rgba(129,98,238,0.35);">
        📍
      </div>
      <div>
        <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-primary);">
          DhobiPro Pune Regional Commission Policy
        </div>
        <div style="font-size: 0.78rem; color: var(--text-secondary);">
          Platform operations and rates are strictly bound to Pune City &amp; PCMC metropolitan areas.
        </div>
      </div>
    </div>
    <div style="display: flex; gap: 0.75rem;">
      <span style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 0.35rem 0.75rem; border-radius: 8px; font-size: 0.78rem; font-weight: 700; color: #8162EE;">
        🏢 8 Operational Zones
      </span>
      <span style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 0.35rem 0.75rem; border-radius: 8px; font-size: 0.78rem; font-weight: 700; color: #10B981;">
        ⚡ Base Commission: 10%
      </span>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 1.5rem;">
    <!-- Pune City Operational Zones Commission Table -->
    <div class="card" style="padding: 1.5rem; border-radius: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <div>
          <h3 style="font-size: 1.15rem; font-weight: 800; margin: 0; color: var(--brand-purple);">
            Pune City &amp; Zonal Commission Rates
          </h3>
          <p style="margin: 0.15rem 0 0 0; font-size: 0.78rem; color: var(--text-secondary);">
            Specific revenue share percentage by Pune suburban clusters
          </p>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Pune Local Zone</th>
              <th>Hub Classification</th>
              <th>Commission %</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($puneZones as $pz): 
                $zId = $pz['id'];
                $zName = $pz['zone'];
                $zRate = floatval($pz['commissionPercentage']);
                $zHub = $pz['hub'];
                $zStatus = $pz['status'] ?? 'ACTIVE';
            ?>
              <tr>
                <td>
                  <div style="font-weight: 800; font-size: 0.9rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem;">
                    <span style="color: #EF4444;">📍</span> <?= htmlspecialchars($zName) ?>
                  </div>
                  <div style="font-size: 0.72rem; color: var(--text-muted); margin-left: 1.2rem;">Zone Code: <?= htmlspecialchars($zId) ?></div>
                </td>
                <td>
                  <span style="font-size: 0.75rem; font-weight: 700; color: #8162EE; background: rgba(129,98,238,0.1); padding: 0.2rem 0.5rem; border-radius: 6px;">
                    <?= htmlspecialchars($zHub) ?>
                  </span>
                </td>
                <td>
                  <strong style="color: #8162EE; font-size: 1.1rem; font-weight: 900;"><?= $zRate ?>%</strong>
                </td>
                <td>
                  <span class="badge badge-success" style="font-size: 0.72rem; font-weight: 800;">
                    <?= $zStatus ?>
                  </span>
                </td>
                <td>
                  <button 
                    type="button" 
                    onclick="openPuneZoneModal('<?= htmlspecialchars($zId) ?>', '<?= htmlspecialchars(addslashes($zName)) ?>', <?= $zRate ?>)" 
                    class="btn btn-secondary btn-sm"
                    style="font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;"
                  >
                    <i data-lucide="sliders" style="width: 12px; height: 12px;"></i> Configure
                  </button>
                </td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Category-Wise Commission Rates -->
    <div class="card" style="padding: 1.5rem; border-radius: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <div>
          <h3 style="font-size: 1.15rem; font-weight: 800; margin: 0; color: var(--brand-purple);">
            Category-Wise Commission Rates
          </h3>
          <p style="margin: 0.15rem 0 0 0; font-size: 0.78rem; color: var(--text-secondary);">
            Default platform cut based on wash treatment complexity
          </p>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Service Category</th>
              <th>SLA Target</th>
              <th>Commission %</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($categories as $cat): 
                $catId = $cat['id'];
                $catName = $cat['category'];
                $catRate = floatval($cat['commissionPercentage']);
                $catSla = $cat['sla'] ?? '24h';
            ?>
              <tr>
                <td>
                  <strong style="font-size: 0.9rem; color: var(--text-primary);">
                    🧺 <?= htmlspecialchars($catName) ?>
                  </strong>
                </td>
                <td>
                  <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">
                    ⏱ <?= htmlspecialchars($catSla) ?>
                  </span>
                </td>
                <td>
                  <strong style="color: #10B981; font-size: 1.1rem; font-weight: 900;"><?= $catRate ?>%</strong>
                </td>
                <td>
                  <button 
                    type="button" 
                    onclick="openCatCommModal('<?= htmlspecialchars($catId) ?>', '<?= htmlspecialchars(addslashes($catName)) ?>', <?= $catRate ?>)" 
                    class="btn btn-secondary btn-sm"
                    style="font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;"
                  >
                    <i data-lucide="sliders" style="width: 12px; height: 12px;"></i> Set Rate
                  </button>
                </td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<!-- Modal: Configure Pune Zone Commission Rate -->
<div id="puneZoneModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); align-items: center; justify-content: center; z-index: 99999; padding: 1.5rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 460px; padding: 1.75rem; color: var(--text-primary); box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
      <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--brand-purple);">Configure Pune Zone Rate</h3>
      <button onclick="closeModal('puneZoneModal')" style="background: var(--bg-input); border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer;">✕</button>
    </div>
    <form method="POST" action="">
      <input type="hidden" name="action" value="update_zone_commission">
      <input type="hidden" id="puneZoneId" name="zone_id" value="">
      
      <div style="background: var(--bg-input); padding: 0.85rem; border-radius: 10px; border: 1px solid var(--border-color); margin-bottom: 1.25rem;">
        <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 800;">Selected Pune Zone:</span>
        <div id="puneZoneName" style="font-weight: 800; font-size: 0.95rem; color: var(--text-primary); margin-top: 0.2rem;"></div>
      </div>

      <div class="form-group" style="margin-bottom: 1.5rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.4rem; font-weight: 700;">Platform Revenue Share Percentage (%) *</label>
        <div style="position: relative;">
          <input type="number" id="puneZoneRate" name="rate" class="form-control" min="1" max="50" step="0.5" required style="width: 100%; font-size: 1.1rem; font-weight: 800; color: #8162EE; padding-right: 2rem;">
          <span style="position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); font-weight: 800; color: var(--text-muted);">%</span>
        </div>
        <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.35rem; display: block;">Standard Pune city range: 8% to 15%</span>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('puneZoneModal')" class="btn btn-secondary" style="font-weight: 700;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.65rem 1.5rem; border-radius: 8px; font-weight: 800;">
          Save Commission
        </button>
      </div>
    </form>
  </div>
</div>

<!-- Modal: Configure Category Commission Rate -->
<div id="catCommModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); align-items: center; justify-content: center; z-index: 99999; padding: 1.5rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 460px; padding: 1.75rem; color: var(--text-primary); box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
      <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--brand-purple);">Set Category Commission</h3>
      <button onclick="closeModal('catCommModal')" style="background: var(--bg-input); border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer;">✕</button>
    </div>
    <form method="POST" action="">
      <input type="hidden" name="action" value="update_cat_commission">
      <input type="hidden" id="catCommId" name="cat_id" value="">
      
      <div style="background: var(--bg-input); padding: 0.85rem; border-radius: 10px; border: 1px solid var(--border-color); margin-bottom: 1.25rem;">
        <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 800;">Wash Category:</span>
        <div id="catCommName" style="font-weight: 800; font-size: 0.95rem; color: var(--text-primary); margin-top: 0.2rem;"></div>
      </div>

      <div class="form-group" style="margin-bottom: 1.5rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.4rem; font-weight: 700;">Category Commission Rate (%) *</label>
        <div style="position: relative;">
          <input type="number" id="catCommRate" name="rate" class="form-control" min="1" max="50" step="0.5" required style="width: 100%; font-size: 1.1rem; font-weight: 800; color: #10B981; padding-right: 2rem;">
          <span style="position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); font-weight: 800; color: var(--text-muted);">%</span>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('catCommModal')" class="btn btn-secondary" style="font-weight: 700;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.65rem 1.5rem; border-radius: 8px; font-weight: 800;">
          Save Rate
        </button>
      </div>
    </form>
  </div>
</div>

<script>
  function openPuneZoneModal(id, name, rate) {
    document.getElementById('puneZoneId').value = id;
    document.getElementById('puneZoneName').innerText = name;
    document.getElementById('puneZoneRate').value = rate;
    openModal('puneZoneModal');
  }

  function openCatCommModal(id, name, rate) {
    document.getElementById('catCommId').value = id;
    document.getElementById('catCommName').innerText = name;
    document.getElementById('catCommRate').value = rate;
    openModal('catCommModal');
  }
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
