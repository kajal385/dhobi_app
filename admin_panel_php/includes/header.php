<?php
require_once __DIR__ . '/../config/api.php';
require_once __DIR__ . '/auth.php';

// Protect pages that include header
requireAuth();

$user = currentUser();
$isOwner = isLaundryOwner();
$userName = htmlspecialchars($user['name'] ?? 'Admin User');
if (!$isOwner && strtolower(trim($userName)) === 'customer user') {
    $userName = 'Super Admin';
}
$userEmail = htmlspecialchars($user['email'] ?? 'admin@dhobipro.com');
$userRole = htmlspecialchars($user['role'] ?? 'SUPER_ADMIN');
$shopName = htmlspecialchars(currentShopName());
$pageTitle = $pageTitle ?? 'DhobiPro - Admin Platform';
?>
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= $pageTitle ?> | DhobiPro</title>
  
  <!-- Modern Font: Plus Jakarta Sans -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  
  <!-- DhobiPro Master Design System Stylesheet -->
  <link rel="stylesheet" href="<?= ADMIN_BASE_URL ?>/assets/css/style.css?v=<?= @filemtime(__DIR__ . '/../assets/css/style.css') ?: time() ?>">
  
  <!-- Lucide Icons & Chart.js CDNs -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

  <script>
    window.DHOBI_CONFIG = {
      baseUrl: '<?= ADMIN_BASE_URL ?>',
      apiBaseUrl: '<?= API_BASE_URL ?>',
      user: <?= json_encode($user) ?>,
      isLaundryOwner: <?= $isOwner ? 'true' : 'false' ?>
    };
  </script>
</head>
<body>
    <?php
    $isPendingVerification = ($isOwner && ($user['verificationStatus'] ?? 'APPROVED') === 'PENDING');
    ?>
  <div class="admin-layout" id="adminLayout" <?php if($isPendingVerification) echo 'style="grid-template-columns: 1fr;"'; ?>>
    <!-- Sidebar component is included right after -->
    <?php if (!$isPendingVerification) require_once __DIR__ . '/sidebar.php'; ?>

    <div class="main-content">
      <!-- Top Navigation Header -->
      <?php if (!$isPendingVerification): ?>
      <header style="height: var(--header-height); background-color: var(--bg-card); border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; padding: 0 2rem; position: sticky; top: 0; z-index: 90; box-shadow: var(--shadow-sm); backdrop-filter: blur(8px);">
        <!-- Quick Search Bar -->
        <div style="display: flex; align-items: center; gap: 1.25rem; flex: 1; maxWidth: 650px;">
          <div class="search-input-wrap" style="flex: 1; max-width: 560px; position: relative;">
            <i data-lucide="search" class="search-icon-left" style="width: 17px; height: 17px;"></i>
            <input
              id="globalQuickSearch"
              type="text"
              class="form-control"
              placeholder="Search orders, laundries, users, settlements... (Ctrl + K)"
              autocomplete="off"
            />
            <span class="search-shortcut-badge">Ctrl K</span>

            <!-- Dropdown results -->
            <div id="quickSearchResults" class="search-results-dropdown" style="display: none;">
              <div class="search-result-group-header">⚡ Quick Shortcuts</div>
              <a href="<?= ADMIN_BASE_URL ?>/orders/index.php" class="search-result-item">
                <i data-lucide="shopping-bag" style="width: 16px; color: #764BD6;"></i>
                <div>
                  <div style="font-weight: 700; font-size: 0.85rem;">Order Control Center</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">View, filter & update live orders</div>
                </div>
              </a>
              <a href="<?= ADMIN_BASE_URL ?>/laundries/index.php" class="search-result-item">
                <i data-lucide="store" style="width: 16px; color: #3B82F6;"></i>
                <div>
                  <div style="font-weight: 700; font-size: 0.85rem;">Laundry Shop Directory</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">Manage active, pending & suspended shops</div>
                </div>
              </a>
              <a href="<?= ADMIN_BASE_URL ?>/customers/index.php" class="search-result-item">
                <i data-lucide="users" style="width: 16px; color: #10B981;"></i>
                <div>
                  <div style="font-weight: 700; font-size: 0.85rem;">Customer Accounts</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">Customer list, wallet balances & history</div>
                </div>
              </a>
              <a href="<?= ADMIN_BASE_URL ?>/finance/index.php" class="search-result-item">
                <i data-lucide="credit-card" style="width: 16px; color: #059669;"></i>
                <div>
                  <div style="font-weight: 700; font-size: 0.85rem;">Payment & Finance Ledger</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">Revenue, payouts, and commissions</div>
                </div>
              </a>
              <a href="<?= ADMIN_BASE_URL ?>/locations/index.php" class="search-result-item">
                <i data-lucide="map-pin" style="width: 16px; color: #D97706;"></i>
                <div>
                  <div style="font-weight: 700; font-size: 0.85rem;">Location & Coverage Management</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">Cities, pincodes, and coverage radius</div>
                </div>
              </a>
            </div>
          </div>
        </div>

        <!-- Right Controls: Theme Toggle, Notifications, User Profile -->
        <div style="display: flex; align-items: center; gap: 1rem;">
          <!-- Theme Mode Toggle -->
          <button id="themeToggleBtn" type="button" class="btn btn-secondary" style="width: 40px; height: 40px; padding: 0; border-radius: 12px; display: flex; align-items: center; justify-content: center;" title="Toggle Light/Dark Theme">
            <i data-lucide="moon" id="themeIcon" style="width: 18px; height: 18px;"></i>
          </button>

          <!-- Notification Bell -->
          <a href="<?= ADMIN_BASE_URL ?>/notifications/index.php" class="btn btn-secondary" style="width: 40px; height: 40px; padding: 0; border-radius: 12px; display: flex; align-items: center; justify-content: center; position: relative;" title="Broadcast & Notifications">
            <i data-lucide="bell" style="width: 18px; height: 18px;"></i>
            <span style="position: absolute; top: 7px; right: 7px; width: 8px; height: 8px; background: #EF4444; border-radius: 50%;"></span>
          </a>

          <!-- User Menu Dropdown Trigger -->
          <div style="position: relative;">
            <div id="userProfileBtn" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.35rem 0.75rem; border-radius: 12px; background: rgba(129, 98, 238, 0.08); border: 1px solid var(--border-color); cursor: pointer;">
              <div style="width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); display: flex; align-items: center; justify-content: center; color: #FFF; font-weight: 800; font-size: 0.9rem;">
                <?= strtoupper(substr($userName, 0, 1)) ?>
              </div>
              <div style="text-align: left; display: none; line-height: 1.2;" class="d-md-block">
                <div style="font-weight: 800; font-size: 0.85rem; color: var(--text-primary);"><?= $userName ?></div>
                <div style="font-size: 0.68rem; font-weight: 700; color: <?= $isOwner ? '#10B981' : '#8162EE' ?>; text-transform: uppercase;">
                  <?= $isOwner ? 'Laundry Owner' : 'Super Admin' ?>
                </div>
              </div>
              <i data-lucide="chevron-down" style="width: 14px; height: 14px; color: var(--text-muted);"></i>
            </div>

            <!-- Profile Dropdown Content -->
            <div id="userProfileDropdown" style="display: none; position: absolute; right: 0; top: calc(100% + 8px); width: 240px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; box-shadow: var(--shadow-lg); padding: 0.5rem; z-index: 1000;">
              <div style="padding: 0.75rem; border-bottom: 1px solid var(--border-color); margin-bottom: 0.35rem;">
                <div style="font-weight: 800; font-size: 0.9rem; color: var(--text-primary);"><?= $userName ?></div>
                <div style="font-size: 0.75rem; color: var(--text-muted);"><?= $userEmail ?></div>
                <?php if ($isOwner): ?>
                  <div style="margin-top: 0.35rem; font-size: 0.72rem; background: rgba(16, 185, 129, 0.15); color: #059669; padding: 0.2rem 0.5rem; border-radius: 6px; font-weight: 700;">
                    🏪 <?= $shopName ?>
                  </div>
                <?php endif; ?>
              </div>

              <a href="<?= ADMIN_BASE_URL ?>/settings/index.php" style="display: flex; align-items: center; gap: 0.6rem; padding: 0.55rem 0.75rem; border-radius: 8px; font-size: 0.83rem; font-weight: 600; color: var(--text-primary); transition: background 0.15s ease;">
                <i data-lucide="settings" style="width: 16px;"></i> Platform Settings
              </a>
              <a href="<?= ADMIN_BASE_URL ?>/audit/index.php" style="display: flex; align-items: center; gap: 0.6rem; padding: 0.55rem 0.75rem; border-radius: 8px; font-size: 0.83rem; font-weight: 600; color: var(--text-primary); transition: background 0.15s ease;">
                <i data-lucide="history" style="width: 16px;"></i> Activity Logs
              </a>
              <div style="height: 1px; background: var(--border-color); margin: 0.35rem 0;"></div>
              <a href="<?= ADMIN_BASE_URL ?>/auth/logout.php" style="display: flex; align-items: center; gap: 0.6rem; padding: 0.55rem 0.75rem; border-radius: 8px; font-size: 0.83rem; font-weight: 700; color: #EF4444; transition: background 0.15s ease;">
                <i data-lucide="log-out" style="width: 16px;"></i> Sign Out
              </a>
            </div>
          </div>
        </div>
      </header>
      <?php endif; ?>

      <!-- Main Page Body -->
      <main class="page-body">
