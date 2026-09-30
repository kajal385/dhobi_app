<?php
$pageTitle = 'Live GPS Order Tracking';
require_once __DIR__ . '/../includes/header.php';

$activeDeliveries = [
    [
        'id' => 'ORD-8801',
        'driver' => 'Rahul Shinde',
        'driverPhone' => '+91 98990 11223',
        'customer' => 'Pooja Verma',
        'shop' => 'Star Wash Ultra Premium',
        'city' => 'Pune',
        'status' => 'Out for Delivery',
        'eta' => '12 mins',
        'progress' => 75,
        'driverCoords' => '18.5204° N, 73.8567° E',
    ],
    [
        'id' => 'ORD-8802',
        'driver' => 'Vikram Jadhav',
        'driverPhone' => '+91 98221 44556',
        'customer' => 'Amitabh Sharma',
        'shop' => 'DhobiPro Express Laundry',
        'city' => 'Pune',
        'status' => 'Pickup En Route',
        'eta' => '8 mins',
        'progress' => 35,
        'driverCoords' => '18.5793° N, 73.7388° E',
    ],
];
?>

<div style="color: var(--text-primary);">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary); margin: 0;">
        <i data-lucide="map-pin" style="width: 28px; height: 28px; color: #D97706;"></i> Live GPS Order & Driver Telemetry
      </h1>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.2rem; margin-bottom: 0;">
        Real-time telemetry tracking of active pickup & delivery drivers across Pune.
      </p>
    </div>

    <button onclick="window.location.reload();" class="btn btn-secondary btn-sm" style="display: flex; align-items: center; gap: 0.4rem; font-weight: 700;">
      <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i> Refresh Telemetry
    </button>
  </div>

  <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem;">
    <!-- Map Simulator Visual Box -->
    <div class="card" style="min-height: 420px; background-color: #0A061C; background-image: radial-gradient(#2D1F66 1.5px, transparent 1.5px); background-size: 24px 24px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; border: 1px solid #2D1F66; padding: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="badge badge-success" style="font-weight: 800; background: rgba(16, 185, 129, 0.2); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.4);">● LIVE TELEMETRY</span>
        <span style="font-size: 0.75rem; color: #94A3B8; font-weight: 700;">Active Area: Pune City (Wakad & Kothrud)</span>
      </div>

      <!-- Telemetry Route Track -->
      <div style="padding: 2.5rem 1rem; display: flex; flex-direction: column; gap: 2rem; align-items: center;">
        <div style="display: flex; gap: 2rem; align-items: center; width: 100%; justify-content: center;">
          <!-- Store Origin -->
          <div style="text-align: center; min-width: 130px;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background-color: rgba(129, 98, 238, 0.25); display: flex; align-items: center; justify-content: center; margin: 0 auto 0.5rem auto; color: #8162EE; border: 2px solid #8162EE; box-shadow: 0 0 15px rgba(129, 98, 238, 0.4);">
              <i data-lucide="store" style="width: 22px; height: 22px;"></i>
            </div>
            <div style="font-size: 0.85rem; font-weight: 800; color: #FFF;">Star Wash Ultra Premium</div>
            <div style="font-size: 0.7rem; color: #CBD5E1; font-weight: 600;">Store Origin</div>
          </div>

          <!-- Progress Line -->
          <div style="flex: 1; height: 6px; background-color: #2D1F66; position: relative; min-width: 140px; border-radius: 3px;">
            <div style="width: 75%; height: 100%; background-color: #10B981; border-radius: 3px; box-shadow: 0 0 10px rgba(16, 185, 129, 0.6);"></div>
            <div style="position: absolute; top: -14px; left: 65%; background-color: #10B981; color: #FFFFFF; padding: 2px 10px; border-radius: 12px; font-size: 0.72rem; font-weight: 800; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.4); white-space: nowrap;">
              🛵 Rahul Shinde (ETA 12m)
            </div>
          </div>

          <!-- Customer Destination -->
          <div style="text-align: center; min-width: 130px;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background-color: rgba(16, 185, 129, 0.25); display: flex; align-items: center; justify-content: center; margin: 0 auto 0.5rem auto; color: #10B981; border: 2px solid #10B981; box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);">
              <i data-lucide="user" style="width: 22px; height: 22px;"></i>
            </div>
            <div style="font-size: 0.85rem; font-weight: 800; color: #FFF;">Pooja Verma</div>
            <div style="font-size: 0.7rem; color: #CBD5E1; font-weight: 600;">Kothrud Drop</div>
          </div>
        </div>
      </div>

      <div style="background-color: rgba(23, 14, 59, 0.95); padding: 0.85rem 1.15rem; border-radius: var(--radius-sm); border: 1px solid #2D1F66; display: flex; justify-content: space-between; font-size: 0.825rem; color: #FFFFFF;">
        <div>GPS Coordinates: <strong style="color: #8162EE;">18.5204° N, 73.8567° E</strong></div>
        <div>Estimated Arrival (ETA): <strong style="color: #10B981;">12 mins</strong></div>
      </div>
    </div>

    <!-- Active Runs List -->
    <div class="card" style="padding: 1.5rem;">
      <h3 style="font-size: 1.1rem; font-weight: 800; margin: 0 0 1rem 0; color: var(--brand-purple);">En-Route Deliveries</h3>
      <div style="display: flex; flex-direction: column; gap: 0.85rem;">
        <?php foreach ($activeDeliveries as $del): ?>
          <div style="padding: 1rem; border-radius: 10px; background: var(--bg-input); border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
              <strong style="color: var(--brand-purple); font-size: 0.9rem;"><?= htmlspecialchars($del['id']) ?></strong>
              <span class="badge badge-info"><?= htmlspecialchars($del['status']) ?></span>
            </div>
            <div style="font-size: 0.82rem;">Driver: <strong><?= htmlspecialchars($del['driver']) ?></strong> (<?= htmlspecialchars($del['driverPhone']) ?>)</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">Shop: <?= htmlspecialchars($del['shop']) ?></div>
            <div style="font-size: 0.78rem; color: #10B981; font-weight: 700; margin-top: 0.35rem;">ETA: <?= htmlspecialchars($del['eta']) ?></div>
          </div>
        <?php endforeach; ?>
      </div>
    </div>
  </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
