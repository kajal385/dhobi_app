<?php
require_once __DIR__ . '/../config/api.php';
require_once __DIR__ . '/auth.php';

$isOwner = isLaundryOwner();
$currentUri = $_SERVER['REQUEST_URI'] ?? '';

function isSidebarActive($pattern, $uri) {
    return (strpos($uri, $pattern) !== false);
}

$isUsersActive = isSidebarActive('/customers/', $currentUri) || isSidebarActive('/owners/', $currentUri) || isSidebarActive('/delivery/', $currentUri) || isSidebarActive('/users/', $currentUri);
$isLaundryActive = isSidebarActive('/laundries/', $currentUri);
?>
<aside id="adminSidebar" class="sidebar">
  <!-- Brand Header -->
  <div class="sidebar-brand-header" style="height: var(--header-height, 65px); display: flex; align-items: center; justify-content: space-between; padding: 0 1rem; border-bottom: 1px solid rgba(129, 98, 238, 0.15); background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(8px); flex-shrink: 0;">
    <div style="display: flex; align-items: center; gap: 0.75rem;" class="sidebar-brand-content">
      <div style="display: flex; align-items: center; justify-content: center;">
        <img src="<?= ADMIN_BASE_URL ?>/assets/images/logo.png" alt="Logo" style="width: 34px; height: 34px; object-fit: contain;">
      </div>
      <div style="overflow: hidden;">
        <h1 style="font-size: 1.15rem; font-weight: 900; color: #1E1B4B; line-height: 1.1; letter-spacing: -0.2px; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">
          <?= $isOwner ? htmlspecialchars($shopName ?? 'My Laundry') : 'DhobiPro' ?>
        </h1>
        <span style="font-size: 0.65rem; color: <?= $isOwner ? '#10B981' : '#FFFFFF' ?>; background: <?= $isOwner ? 'transparent' : 'linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #E18C8E 67.34%, #FE9A5D 98.26%)' ?>; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; display: inline-block; margin-top: 0.15rem; <?= $isOwner ? '' : 'padding: 0.12rem 0.45rem; border-radius: 6px; box-shadow: 0 2px 6px rgba(129, 98, 238, 0.25);' ?>">
          <?= $isOwner ? 'Owner Panel' : 'ADMIN PLATFORM' ?>
        </span>
      </div>
    </div>

    <button id="sidebarToggleBtn" type="button" style="background: transparent; border: none; display: flex; align-items: center; justify-content: center; color: #1E1B4B; cursor: pointer; padding: 0.25rem;" title="Collapse/Expand Navigation Sidebar">
      <i data-lucide="menu" style="width: 24px; height: 24px;"></i>
    </button>
  </div>

  <!-- Navigation Scroll Container -->
  <div class="sidebar-scroll-container">
    <!-- Main Dashboard -->
    <?php $active = isSidebarActive('/dashboard/', $currentUri); ?>
    <a href="<?= ADMIN_BASE_URL ?>/dashboard/index.php" class="nav-item <?= $active ? 'active' : '' ?>" title="<?= $isOwner ? 'Shop Overview' : 'Dashboard' ?>">
      <i data-lucide="layout-dashboard" style="width: 18px; height: 18px; color: <?= $active ? '#FFF' : '#4338CA' ?>;"></i>
      <span class="nav-text"><?= $isOwner ? 'Shop Overview' : 'Dashboard' ?></span>
    </a>

    <!-- Super Admin Only: Location Management -->
    <?php if (!$isOwner): ?>
      <?php $active = isSidebarActive('/locations/', $currentUri); ?>
      <a href="<?= ADMIN_BASE_URL ?>/locations/index.php" class="nav-item <?= $active ? 'active' : '' ?>" title="Location Management">
        <i data-lucide="map-pin" style="width: 18px; height: 18px; color: <?= $active ? '#FFF' : '#D97706' ?>;"></i>
        <span class="nav-text">Location Management</span>
      </a>
    <?php endif; ?>

    <!-- Super Admin Only: User Management Dropdown -->
    <?php if (!$isOwner): ?>
      <div style="margin-bottom: 0.35rem;">
        <button type="button" id="usersMenuBtn" class="nav-item-btn <?= $isUsersActive ? 'active' : '' ?>" style="width: 100%; display: flex; align-items: center; justify-content: space-between; border: none; cursor: pointer;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <i data-lucide="users" style="width: 18px; height: 18px; color: <?= $isUsersActive ? '#FFF' : '#4338CA' ?>;"></i>
            <span class="nav-text">User Management</span>
          </div>
          <i data-lucide="<?= $isUsersActive ? 'chevron-down' : 'chevron-right' ?>" id="usersMenuChevron" style="width: 15px; height: 15px;"></i>
        </button>
        <div id="usersSubmenu" style="border-left: 2px solid rgba(99, 102, 241, 0.25); margin-left: 1.25rem; padding-left: 0.65rem; display: <?= $isUsersActive ? 'flex' : 'none' ?>; flex-direction: column; gap: 0.2rem; margin-top: 0.25rem; margin-bottom: 0.35rem;">
          <a href="<?= ADMIN_BASE_URL ?>/customers/index.php" class="sub-nav-item <?= isSidebarActive('/customers/', $currentUri) ? 'active' : '' ?>">Customers</a>
          <a href="<?= ADMIN_BASE_URL ?>/owners/index.php" class="sub-nav-item <?= isSidebarActive('/owners/', $currentUri) ? 'active' : '' ?>">Laundry Owners</a>
          <a href="<?= ADMIN_BASE_URL ?>/delivery/index.php" class="sub-nav-item <?= isSidebarActive('/delivery/', $currentUri) ? 'active' : '' ?>">Delivery Partners</a>
          <a href="<?= ADMIN_BASE_URL ?>/users/roles.php" class="sub-nav-item <?= isSidebarActive('/users/roles', $currentUri) ? 'active' : '' ?>">Admin Roles & RBAC</a>
        </div>
      </div>
    <?php endif; ?>

    <!-- Laundry Management -->
    <?php if (!$isOwner): ?>
      <div style="margin-bottom: 0.35rem;">
        <button type="button" id="laundryMenuBtn" class="nav-item-btn <?= $isLaundryActive ? 'active' : '' ?>" style="width: 100%; display: flex; align-items: center; justify-content: space-between; border: none; cursor: pointer;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <i data-lucide="store" style="width: 18px; height: 18px; color: <?= $isLaundryActive ? '#FFF' : '#4338CA' ?>;"></i>
            <span class="nav-text">Laundry Shops</span>
          </div>
          <i data-lucide="<?= $isLaundryActive ? 'chevron-down' : 'chevron-right' ?>" id="laundryMenuChevron" style="width: 15px; height: 15px;"></i>
        </button>
        <div id="laundrySubmenu" style="border-left: 2px solid rgba(99, 102, 241, 0.25); margin-left: 1.25rem; padding-left: 0.65rem; display: <?= $isLaundryActive ? 'flex' : 'none' ?>; flex-direction: column; gap: 0.2rem; margin-top: 0.25rem; margin-bottom: 0.35rem;">
          <a href="<?= ADMIN_BASE_URL ?>/laundries/index.php" class="sub-nav-item <?= isSidebarActive('/laundries/index', $currentUri) && !isset($_GET['tab']) && !isset($_GET['action']) || $currentUri === ADMIN_BASE_URL . '/laundries/' ? 'active' : '' ?>">All Laundry Shops</a>
          <a href="<?= ADMIN_BASE_URL ?>/laundries/verifications.php" class="sub-nav-item <?= isSidebarActive('/laundries/verifications', $currentUri) ? 'active' : '' ?>">Verification Queue</a>
          <a href="<?= ADMIN_BASE_URL ?>/laundries/index.php?action=onboard" class="sub-nav-item <?= (isset($_GET['action']) && $_GET['action'] === 'onboard') ? 'active' : '' ?>">Onboard New Shop</a>
        </div>
      </div>
    <?php else: ?>
      <?php $active = isSidebarActive('/laundries/index', $currentUri) || $currentUri === ADMIN_BASE_URL . '/laundries/'; ?>
      <a href="<?= ADMIN_BASE_URL ?>/laundries/index.php" class="nav-item <?= $active ? 'active' : '' ?>">
        <i data-lucide="store" style="width: 18px; height: 18px; color: <?= $active ? '#FFF' : '#4338CA' ?>;"></i>
        <span class="nav-text">My Shop Profile</span>
      </a>
      <?php $vActive = isSidebarActive('/laundries/verifications', $currentUri); ?>
      <a href="<?= ADMIN_BASE_URL ?>/laundries/verifications.php" class="nav-item <?= $vActive ? 'active' : '' ?>" title="Verification & Compliance">
        <i data-lucide="shield-check" style="width: 18px; height: 18px; color: <?= $vActive ? '#FFF' : '#10B981' ?>;"></i>
        <span class="nav-text">Verification &amp; KYC</span>
      </a>
    <?php endif; ?>

    <!-- Order Control Center -->
    <?php $active = isSidebarActive('/orders/', $currentUri); ?>
    <a href="<?= ADMIN_BASE_URL ?>/orders/index.php" class="nav-item <?= $active ? 'active' : '' ?>">
      <i data-lucide="shopping-bag" style="width: 18px; height: 18px; color: <?= $active ? '#FFF' : '#D946EF' ?>;"></i>
      <span class="nav-text"><?= $isOwner ? 'My Live Orders' : 'Order Control Center' ?></span>
    </a>

    <!-- Delivery Fleet (For Laundry Owners) -->
    <?php if ($isOwner): ?>
      <?php $active = isSidebarActive('/delivery/', $currentUri); ?>
      <a href="<?= ADMIN_BASE_URL ?>/delivery/index.php" class="nav-item <?= $active ? 'active' : '' ?>" title="My Delivery Fleet">
        <i data-lucide="truck" style="width: 18px; height: 18px; color: <?= $active ? '#FFF' : '#F59E0B' ?>;"></i>
        <span class="nav-text">Delivery Partners</span>
      </a>

      <?php $active = isSidebarActive('/customers/', $currentUri); ?>
      <a href="<?= ADMIN_BASE_URL ?>/customers/index.php" class="nav-item <?= $active ? 'active' : '' ?>" title="My Customers">
        <i data-lucide="users" style="width: 18px; height: 18px; color: <?= $active ? '#FFF' : '#10B981' ?>;"></i>
        <span class="nav-text">My Customers</span>
      </a>
    <?php endif; ?>

    <!-- Service & Category Management -->
    <?php $active = isSidebarActive('/services/', $currentUri); ?>
    <a href="<?= ADMIN_BASE_URL ?>/services/index.php" class="nav-item <?= $active ? 'active' : '' ?>">
      <i data-lucide="layers" style="width: 18px; height: 18px; color: <?= $active ? '#FFF' : '#2563EB' ?>;"></i>
      <span class="nav-text"><?= $isOwner ? 'My Services & Prices' : 'Services & Categories' ?></span>
    </a>

    <!-- Payment & Finance Ledger -->
    <?php $active = isSidebarActive('/finance/', $currentUri); ?>
    <a href="<?= ADMIN_BASE_URL ?>/finance/index.php" class="nav-item <?= $active ? 'active' : '' ?>">
      <i data-lucide="credit-card" style="width: 18px; height: 18px; color: <?= $active ? '#FFF' : '#059669' ?>;"></i>
      <span class="nav-text"><?= $isOwner ? 'Earnings Ledger' : 'Payment & Finance' ?></span>
    </a>

    <!-- Super Admin Only: Commission Management -->
    <?php if (!$isOwner): ?>
      <?php $active = isSidebarActive('/commission/', $currentUri); ?>
      <a href="<?= ADMIN_BASE_URL ?>/commission/index.php" class="nav-item <?= $active ? 'active' : '' ?>">
        <i data-lucide="percent" style="width: 18px; height: 18px; color: <?= $active ? '#FFF' : '#10B981' ?>;"></i>
        <span class="nav-text">Commission Rates</span>
      </a>
    <?php endif; ?>

    <!-- Super Admin Only: Subscription Plans -->
    <?php if (!$isOwner): ?>
      <?php $active = isSidebarActive('/subscriptions/', $currentUri); ?>
      <a href="<?= ADMIN_BASE_URL ?>/subscriptions/index.php" class="nav-item <?= $active ? 'active' : '' ?>">
        <i data-lucide="crown" style="width: 18px; height: 18px; color: <?= $active ? '#FFF' : '#4338CA' ?>;"></i>
        <span class="nav-text">Subscription Plans</span>
      </a>
    <?php endif; ?>

    <!-- Settlements & Payouts -->
    <?php $active = isSidebarActive('/payouts/', $currentUri); ?>
    <a href="<?= ADMIN_BASE_URL ?>/payouts/index.php" class="nav-item <?= $active ? 'active' : '' ?>">
      <i data-lucide="dollar-sign" style="width: 18px; height: 18px; color: <?= $active ? '#FFF' : '#059669' ?>;"></i>
      <span class="nav-text"><?= $isOwner ? 'Settlements & Payouts' : 'Settlement & Payouts' ?></span>
    </a>

    <!-- Refunds & Disputes -->
    <?php $active = isSidebarActive('/refunds/', $currentUri) || isSidebarActive('/disputes/', $currentUri); ?>
    <a href="<?= ADMIN_BASE_URL ?>/refunds/index.php" class="nav-item <?= $active ? 'active' : '' ?>">
      <i data-lucide="alert-circle" style="width: 18px; height: 18px; color: <?= $active ? '#FFF' : '#DC2626' ?>;"></i>
      <span class="nav-text">Refunds & Disputes</span>
    </a>

    <!-- Reviews & Ratings -->
    <?php $active = isSidebarActive('/reviews/', $currentUri); ?>
    <a href="<?= ADMIN_BASE_URL ?>/reviews/index.php" class="nav-item <?= $active ? 'active' : '' ?>">
      <i data-lucide="star" style="width: 18px; height: 18px; color: <?= $active ? '#FFF' : '#D97706' ?>;"></i>
      <span class="nav-text">Customer Reviews</span>
    </a>

    <!-- Super Admin Only: Push Notifications -->
    <?php if (!$isOwner): ?>
      <?php $active = isSidebarActive('/notifications/', $currentUri); ?>
      <a href="<?= ADMIN_BASE_URL ?>/notifications/index.php" class="nav-item <?= $active ? 'active' : '' ?>">
        <i data-lucide="bell" style="width: 18px; height: 18px; color: <?= $active ? '#FFF' : '#4338CA' ?>;"></i>
        <span class="nav-text">Push Notifications</span>
      </a>
    <?php endif; ?>

    <!-- Promotions, Coupons & Customer App: Laundry Owner Only -->
    <?php if ($isOwner): ?>
      <?php $active = isSidebarActive('/promotions/', $currentUri); ?>
      <a href="<?= ADMIN_BASE_URL ?>/promotions/index.php" class="nav-item <?= $active ? 'active' : '' ?>" title="My Shop Coupons">
        <i data-lucide="gift" style="width: 18px; height: 18px; color: <?= $active ? '#FFF' : '#E8643A' ?>;"></i>
        <span class="nav-text">My Shop Coupons &amp; Promos</span>
      </a>
      <?php $active = isSidebarActive('/shop-app/', $currentUri); ?>
      <a href="<?= ADMIN_BASE_URL ?>/shop-app/index.php" class="nav-item <?= $active ? 'active' : '' ?>" title="Customer App">
        <i data-lucide="smartphone" style="width: 18px; height: 18px; color: <?= $active ? '#FFF' : '#0EA5E9' ?>;"></i>
        <span class="nav-text">Customer App</span>
      </a>
    <?php endif; ?>

    <!-- Super Admin Only: Reports & Analytics -->
    <?php if (!$isOwner): ?>
      <?php $active = isSidebarActive('/reports/', $currentUri); ?>
      <a href="<?= ADMIN_BASE_URL ?>/reports/index.php" class="nav-item <?= $active ? 'active' : '' ?>">
        <i data-lucide="bar-chart-3" style="width: 18px; height: 18px; color: <?= $active ? '#FFF' : '#4338CA' ?>;"></i>
        <span class="nav-text">Reports & Analytics</span>
      </a>
    <?php endif; ?>

    <!-- Super Admin Only: Activity & Audit Logs -->
    <?php if (!$isOwner): ?>
      <?php $active = isSidebarActive('/audit/', $currentUri); ?>
      <a href="<?= ADMIN_BASE_URL ?>/audit/index.php" class="nav-item <?= $active ? 'active' : '' ?>">
        <i data-lucide="history" style="width: 18px; height: 18px; color: <?= $active ? '#FFF' : '#4B5563' ?>;"></i>
        <span class="nav-text">Activity & Audit Logs</span>
      </a>
    <?php endif; ?>

    <!-- Super Admin Only: Platform Settings -->
    <?php if (!$isOwner): ?>
      <?php $active = isSidebarActive('/settings/', $currentUri); ?>
      <a href="<?= ADMIN_BASE_URL ?>/settings/index.php" class="nav-item <?= $active ? 'active' : '' ?>">
        <i data-lucide="settings" style="width: 18px; height: 18px; color: <?= $active ? '#FFF' : '#6366F1' ?>;"></i>
        <span class="nav-text">Settings</span>
      </a>
    <?php endif; ?>
  </div>
</aside>
