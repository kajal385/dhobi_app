<?php
$pageTitle = 'Subscription Plans & Partners';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';
require_once __DIR__ . '/../includes/db.php';

$msg = null;
$msgType = 'success';
$db = getDb();
$isOwner = isLaundryOwner();
$currentUser = currentUser();
$ownerShopId = currentShopId() ?: ($currentUser['shopId'] ?? $currentUser['shop_id'] ?? null);

// ─────────────────────────────────────────────────────────────
// 1. Ensure MySQL Table Has Default Plans
// ─────────────────────────────────────────────────────────────
if ($db) {
    try {
        $pCount = $db->query("SELECT COUNT(*) FROM subscription_plans")->fetchColumn();
        if ($pCount == 0) {
            $db->exec("INSERT INTO subscription_plans (plan_id, name, price, billing_cycle, order_limit, features, featured_badge, status, created_at, updated_at) VALUES
                ('PLAN-01', 'Basic Starter Plan', 999.00, 'MONTHLY', 100, '[\"Up to 100 Orders / month\",\"Standard Laundry Listing\",\"Basic Performance Analytics\",\"Pickup & Delivery Dispatch System\"]', 0, 'ACTIVE', NOW(), NOW()),
                ('PLAN-02', 'Professional Growth', 2499.00, 'MONTHLY', 999999, '[\"Unlimited Order Processing\",\"Priority Top Featured Listing\",\"Advanced Business Analytics\",\"24/7 Priority Partner Support\"]', 1, 'ACTIVE', NOW(), NOW()),
                ('PLAN-03', 'Enterprise VIP Platinum', 19999.00, 'ANNUAL', 999999, '[\"Unlimited Order Processing (Annual)\",\"Top Banner City Sponsor Placement\",\"Multi-Branch Support\",\"Dedicated Account Manager\",\"0% Platform Surcharge\"]', 1, 'ACTIVE', NOW(), NOW())
            ");
        }
    } catch (\Throwable $e) {}
}

// ─────────────────────────────────────────────────────────────
// 2. Handle POST Actions (Create Plan, Edit Plan, Assign Plan, Renew Plan)
// ─────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    // -- CREATE PLAN TIER --
    if ($action === 'create_plan') {
        $pName = trim($_POST['name'] ?? '');
        $pPrice = floatval($_POST['price'] ?? 999);
        $pCycle = strtoupper(trim($_POST['billing_cycle'] ?? 'MONTHLY'));
        $pLimit = intval($_POST['order_limit'] ?? 100);
        $pId = 'PLAN-0' . (time() % 1000);

        if ($db && $pName) {
            try {
                $stmt = $db->prepare("INSERT INTO subscription_plans (plan_id, name, price, billing_cycle, order_limit, features, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', NOW(), NOW())");
                $defaultFeatures = json_encode(['Direct Laundry Listing', 'Driver Dispatch Tracking', 'Online Customer Bookings']);
                $stmt->execute([$pId, $pName, $pPrice, $pCycle, $pLimit, $defaultFeatures]);
            } catch (\Throwable $e) {}
        }

        // Also sync session fallback
        $_SESSION['subscription_plans_store'][$pId] = [
            'id' => $pId,
            'name' => $pName,
            'price' => $pPrice,
            'billingCycle' => $pCycle,
            'orderLimit' => $pLimit,
            'status' => 'ACTIVE',
            'features' => ['Direct Laundry Listing', 'Driver Dispatch Tracking', 'Online Customer Bookings']
        ];
        $msg = "Subscription tier '{$pName}' created successfully!";
    }

    // -- EDIT PLAN TIER --
    elseif ($action === 'edit_plan') {
        $pId = trim($_POST['plan_id'] ?? '');
        $pName = trim($_POST['name'] ?? '');
        $pPrice = floatval($_POST['price'] ?? 999);
        $pCycle = strtoupper(trim($_POST['billing_cycle'] ?? 'MONTHLY'));
        $pLimit = intval($_POST['order_limit'] ?? 100);
        $pStatus = strtoupper(trim($_POST['status'] ?? 'ACTIVE'));

        if ($db && $pId && $pName) {
            try {
                $stmt = $db->prepare("UPDATE subscription_plans SET name = ?, price = ?, billing_cycle = ?, order_limit = ?, status = ?, updated_at = NOW() WHERE plan_id = ? OR id = ?");
                $stmt->execute([$pName, $pPrice, $pCycle, $pLimit, $pStatus, $pId, $pId]);
            } catch (\Throwable $e) {}
        }

        if (isset($_SESSION['subscription_plans_store'][$pId])) {
            $_SESSION['subscription_plans_store'][$pId]['name'] = $pName;
            $_SESSION['subscription_plans_store'][$pId]['price'] = $pPrice;
            $_SESSION['subscription_plans_store'][$pId]['billingCycle'] = $pCycle;
            $_SESSION['subscription_plans_store'][$pId]['orderLimit'] = $pLimit;
            $_SESSION['subscription_plans_store'][$pId]['status'] = $pStatus;
        }
        $msg = "Subscription tier '{$pName}' updated and saved successfully!";
    }

    // -- DELETE PLAN TIER --
    elseif ($action === 'delete_plan') {
        $pId = trim($_POST['plan_id'] ?? '');
        if ($db && $pId) {
            try {
                $stmt = $db->prepare("DELETE FROM subscription_plans WHERE plan_id = ? OR id = ?");
                $stmt->execute([$pId, $pId]);
            } catch (\Throwable $e) {}
        }
        if (isset($_SESSION['subscription_plans_store'][$pId])) {
            $delName = $_SESSION['subscription_plans_store'][$pId]['name'];
            unset($_SESSION['subscription_plans_store'][$pId]);
            $msg = "Subscription tier '{$delName}' deleted.";
        }
    }

    // -- ASSIGN NEW PLAN / CHANGE PLAN FOR A LAUNDRY SHOP --
    elseif ($action === 'assign_plan') {
        $shopId = trim($_POST['shop_id'] ?? '');
        $planName = trim($_POST['plan_name'] ?? '');
        $planPrice = floatval($_POST['plan_price'] ?? 0);
        $billingCycle = strtolower(trim($_POST['billing_cycle'] ?? 'monthly'));
        $startDate = trim($_POST['start_date'] ?? date('Y-m-d'));
        $expiryDate = trim($_POST['expiry_date'] ?? '');
        $autoRenew = isset($_POST['auto_renew']) ? 1 : 0;
        $paymentRef = trim($_POST['payment_reference'] ?? ('PAY-' . strtoupper(substr(uniqid(), 7))));

        // Calculate auto expiry date if not explicitly given
        if (empty($expiryDate)) {
            $startTime = strtotime($startDate) ?: time();
            if ($billingCycle === 'annual') {
                $expiryDate = date('Y-m-d', strtotime('+1 year', $startTime));
            } elseif ($billingCycle === 'quarterly') {
                $expiryDate = date('Y-m-d', strtotime('+3 months', $startTime));
            } else {
                $expiryDate = date('Y-m-d', strtotime('+30 days', $startTime));
            }
        }

        $shopName = 'Laundry Shop #' . $shopId;

        if ($db && is_numeric($shopId)) {
            try {
                // Get shop name
                $sRow = $db->query("SELECT name FROM laundry_shops WHERE id = " . intval($shopId))->fetch(PDO::FETCH_ASSOC);
                if ($sRow) $shopName = $sRow['name'];

                // Check existing subscription
                $chk = $db->prepare("SELECT id FROM laundry_subscriptions WHERE laundry_id = ?");
                $chk->execute([$shopId]);
                $existingSubId = $chk->fetchColumn();

                if ($existingSubId) {
                    $upd = $db->prepare("UPDATE laundry_subscriptions SET plan_name = ?, price = ?, billing_cycle = ?, start_date = ?, expiry_date = ?, auto_renew = ?, status = 'active', payment_reference = ?, updated_at = NOW() WHERE laundry_id = ?");
                    $upd->execute([$planName, $planPrice, $billingCycle, $startDate . ' 00:00:00', $expiryDate . ' 23:59:59', $autoRenew, $paymentRef, $shopId]);
                } else {
                    $ins = $db->prepare("INSERT INTO laundry_subscriptions (laundry_id, plan_name, price, billing_cycle, start_date, expiry_date, auto_renew, status, payment_reference, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, NOW(), NOW())");
                    $ins->execute([$shopId, $planName, $planPrice, $billingCycle, $startDate . ' 00:00:00', $expiryDate . ' 23:59:59', $autoRenew, $paymentRef]);
                }

                // Activate subscription flag on laundry_shops
                $db->exec("UPDATE laundry_shops SET offers_subscription = 1 WHERE id = " . intval($shopId));
            } catch (\Throwable $e) {
                $msg = 'Database error: ' . $e->getMessage();
                $msgType = 'error';
            }
        }

        // Also update session subscribers store if demo shop
        if (isset($_SESSION['subscribers_store'])) {
            foreach ($_SESSION['subscribers_store'] as &$dSub) {
                if (($dSub['id'] ?? '') === $shopId || ($dSub['shopName'] ?? '') === $shopId) {
                    $dSub['planName'] = $planName;
                    $dSub['startDate'] = $startDate;
                    $dSub['expiryDate'] = $expiryDate;
                    $dSub['status'] = 'ACTIVE';
                    $shopName = $dSub['shopName'];
                }
            }
        }

        if (!$msg) {
            $msg = "Subscription tier '{$planName}' successfully assigned to {$shopName}! Valid until " . date('d M Y', strtotime($expiryDate)) . ".";
        }
    }

    // -- RENEW / EXTEND PLAN WHEN ENDED OR EXPIRING --
    elseif ($action === 'renew_plan') {
        $shopId = trim($_POST['shop_id'] ?? '');
        $subId = trim($_POST['sub_id'] ?? '');
        $renewDays = intval($_POST['renew_days'] ?? 30);
        $newExpiryDate = trim($_POST['new_expiry_date'] ?? '');

        if (empty($newExpiryDate)) {
            $newExpiryDate = date('Y-m-d', strtotime("+{$renewDays} days"));
        }

        $shopName = 'Laundry Shop';
        if ($db && is_numeric($shopId)) {
            try {
                $sRow = $db->query("SELECT name FROM laundry_shops WHERE id = " . intval($shopId))->fetch(PDO::FETCH_ASSOC);
                if ($sRow) $shopName = $sRow['name'];

                $upd = $db->prepare("UPDATE laundry_subscriptions SET expiry_date = ?, status = 'active', updated_at = NOW() WHERE laundry_id = ?");
                $upd->execute([$newExpiryDate . ' 23:59:59', $shopId]);
            } catch (\Throwable $e) {}
        }

        // Also sync session subscribers
        if (isset($_SESSION['subscribers_store'])) {
            foreach ($_SESSION['subscribers_store'] as &$dSub) {
                if (($dSub['id'] ?? '') === $subId || ($dSub['shopName'] ?? '') === $shopId) {
                    $dSub['expiryDate'] = $newExpiryDate;
                    $dSub['status'] = 'ACTIVE';
                    $shopName = $dSub['shopName'];
                }
            }
        }

        $msg = "Subscription for {$shopName} renewed successfully until " . date('d M Y', strtotime($newExpiryDate)) . "!";
    }

    // -- CANCEL SUBSCRIPTION --
    elseif ($action === 'cancel_subscription') {
        $shopId = trim($_POST['shop_id'] ?? '');
        if ($db && is_numeric($shopId)) {
            try {
                $db->exec("UPDATE laundry_subscriptions SET status = 'cancelled', updated_at = NOW() WHERE laundry_id = " . intval($shopId));
            } catch (\Throwable $e) {}
        }
        if (isset($_SESSION['subscribers_store'])) {
            foreach ($_SESSION['subscribers_store'] as &$dSub) {
                if (($dSub['id'] ?? '') === $shopId || ($dSub['shopName'] ?? '') === $shopId) {
                    $dSub['status'] = 'CANCELLED';
                }
            }
        }
        $msg = "Subscription plan has been cancelled.";
    }
}

// ─────────────────────────────────────────────────────────────
// 3. Load All Active Plans from Database / Session
// ─────────────────────────────────────────────────────────────
$plansList = [];
if ($db) {
    try {
        $pStmt = $db->query("SELECT id, plan_id, name, price, billing_cycle, order_limit, features, status FROM subscription_plans ORDER BY price ASC");
        $dbPlans = $pStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        foreach ($dbPlans as $dp) {
            $feats = is_string($dp['features']) ? json_decode($dp['features'], true) : $dp['features'];
            $plansList[] = [
                'id'           => $dp['plan_id'] ?: ('PLAN-' . $dp['id']),
                'db_id'        => $dp['id'],
                'name'         => $dp['name'],
                'price'        => floatval($dp['price']),
                'billingCycle' => strtoupper($dp['billing_cycle'] ?: 'MONTHLY'),
                'orderLimit'   => intval($dp['order_limit'] ?: 100),
                'status'       => strtoupper($dp['status'] ?: 'ACTIVE'),
                'features'     => is_array($feats) ? $feats : ['Direct Laundry Listing', 'Driver Dispatch Tracking', 'Online Customer Bookings']
            ];
        }
    } catch (\Throwable $e) {}
}

if (empty($plansList) && !empty($_SESSION['subscription_plans_store'])) {
    $plansList = array_values($_SESSION['subscription_plans_store']);
}

// ─────────────────────────────────────────────────────────────
// 4. Load Subscribed Laundry Outlets (Live Join from DB + Demo Outlets)
// ─────────────────────────────────────────────────────────────
$allSubscribers = [];
$nowTime = time();

if ($db) {
    try {
        $subStmt = $db->query("
            SELECT 
                ls.id as shop_id,
                ls.name as shop_name,
                ls.owner_name,
                ls.phone as owner_phone,
                ls.city,
                sub.id as sub_id,
                sub.plan_name,
                sub.price,
                sub.billing_cycle,
                sub.start_date,
                sub.expiry_date,
                sub.status as sub_status,
                sub.auto_renew,
                sub.payment_reference
            FROM laundry_shops ls
            LEFT JOIN laundry_subscriptions sub ON sub.laundry_id = ls.id
            WHERE ls.is_active = 1
            ORDER BY sub.expiry_date ASC, ls.name ASC
        ");
        $dbSubs = $subStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        foreach ($dbSubs as $row) {
            $hasSub = !empty($row['plan_name']);
            $expDate = !empty($row['expiry_date']) ? substr($row['expiry_date'], 0, 10) : null;
            $startDate = !empty($row['start_date']) ? substr($row['start_date'], 0, 10) : date('Y-m-d');
            
            $status = 'NO PLAN';
            $isExpired = false;
            $isExpiringSoon = false;
            $daysLeft = null;

            if ($hasSub && $expDate) {
                $expTs = strtotime($expDate);
                $daysLeft = round(($expTs - $nowTime) / 86400);

                if ($expTs < $nowTime) {
                    $status = 'EXPIRED';
                    $isExpired = true;
                } elseif ($daysLeft <= 7) {
                    $status = 'EXPIRING SOON';
                    $isExpiringSoon = true;
                } else {
                    $status = 'ACTIVE';
                }
            }

            $allSubscribers[] = [
                'shopId'         => strval($row['shop_id']),
                'subId'          => strval($row['sub_id'] ?? ''),
                'shopName'       => $row['shop_name'],
                'ownerName'      => $row['owner_name'] ?: 'Owner',
                'ownerPhone'     => $row['owner_phone'] ?: '—',
                'city'           => $row['city'] ?: 'Pune',
                'planName'       => $row['plan_name'] ?: 'No Active Plan',
                'price'          => floatval($row['price'] ?? 0),
                'billingCycle'   => strtolower($row['billing_cycle'] ?? 'monthly'),
                'startDate'      => $startDate,
                'expiryDate'     => $expDate ?: '—',
                'status'         => $status,
                'isExpired'      => $isExpired,
                'isExpiringSoon' => $isExpiringSoon,
                'daysLeft'       => $daysLeft,
                'autoRenew'      => boolval($row['auto_renew'] ?? 1)
            ];
        }
    } catch (\Throwable $e) {}
}

// Merge demo outlets from session so user doesn't lose previously viewed demo shops
if (!empty($_SESSION['subscribers_store'])) {
    foreach ($_SESSION['subscribers_store'] as $demo) {
        if (!array_filter($allSubscribers, fn($s) => $s['shopName'] === $demo['shopName'])) {
            $expDate = $demo['expiryDate'] ?? date('Y-m-d');
            $expTs = strtotime($expDate);
            $daysLeft = round(($expTs - $nowTime) / 86400);
            $isExpired = ($expTs < $nowTime);
            $isExpiringSoon = (!$isExpired && $daysLeft <= 7);
            $status = $isExpired ? 'EXPIRED' : ($isExpiringSoon ? 'EXPIRING SOON' : 'ACTIVE');

            $allSubscribers[] = [
                'shopId'         => $demo['id'] ?? ('DEMO-' . rand(100, 999)),
                'subId'          => $demo['id'] ?? '',
                'shopName'       => $demo['shopName'],
                'ownerName'      => $demo['ownerName'],
                'ownerPhone'     => '—',
                'city'           => 'Pune',
                'planName'       => $demo['planName'],
                'price'          => 999,
                'billingCycle'   => 'monthly',
                'startDate'      => $demo['startDate'] ?? '2026-09-01',
                'expiryDate'     => $expDate,
                'status'         => $status,
                'isExpired'      => $isExpired,
                'isExpiringSoon' => $isExpiringSoon,
                'daysLeft'       => $daysLeft,
                'autoRenew'      => 1
            ];
        }
    }
}

// Count expired outlets
$expiredCount = count(array_filter($allSubscribers, fn($s) => $s['status'] === 'EXPIRED'));
$activeCount  = count(array_filter($allSubscribers, fn($s) => $s['status'] === 'ACTIVE'));
$expiringSoonCount = count(array_filter($allSubscribers, fn($s) => $s['status'] === 'EXPIRING SOON'));
?>

<div style="color: var(--text-primary); max-width: 1400px; margin: 0 auto;">
  <!-- Header Title & Main Action Buttons -->
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.55rem; font-weight: 800; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary); margin: 0;">
        <i data-lucide="crown" style="width: 28px; height: 28px; color: #8162EE;"></i> Laundry Partner Subscription Plans
      </h1>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.25rem; margin-bottom: 0;">
        Manage subscription plan tiers, configure pricing, assign new plans when subscriptions end, and renew partner stores.
      </p>
    </div>

    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
      <!-- Assign New Plan Button -->
      <button
        onclick="openAssignPlanModal()"
        class="btn btn-secondary"
        style="background: #EDE8FF; color: #5B52E8; padding: 0.65rem 1.25rem; border-radius: 8px; font-weight: 700; border: 1px solid #D6CCFE; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;"
      >
        <i data-lucide="award" style="width: 18px; height: 18px;"></i> 👑 Assign Plan to Shop
      </button>

      <!-- Create Plan Tier Button -->
      <button
        onclick="openModal('addPlanModal')"
        class="btn btn-primary"
        style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; padding: 0.65rem 1.25rem; border-radius: 8px; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 14px rgba(129,98,238,0.35);"
      >
        <i data-lucide="plus" style="width: 18px; height: 18px;"></i> + Create Plan Tier
      </button>
    </div>
  </div>

  <!-- Action Status Toast Message -->
  <?php if ($msg): ?>
    <div style="background: <?= $msgType === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)' ?>; border: 1px solid <?= $msgType === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)' ?>; color: <?= $msgType === 'error' ? '#DC2626' : '#059669' ?>; padding: 0.85rem 1.25rem; border-radius: 10px; font-weight: 700; font-size: 0.9rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center; gap: 0.6rem;">
        <i data-lucide="<?= $msgType === 'error' ? 'alert-triangle' : 'check-circle' ?>" style="width: 20px; height: 20px;"></i>
        <span><?= htmlspecialchars($msg) ?></span>
      </div>
      <span style="cursor: pointer; opacity: 0.7;" onclick="this.parentElement.remove();">✕</span>
    </div>
  <?php endif; ?>

  <!-- Expired / Ended Plans Alert Banner -->
  <?php if ($expiredCount > 0): ?>
    <div style="background: linear-gradient(90deg, #FEF2F2 0%, #FFF5F5 100%); border: 1.5px solid #FCA5A5; border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1.75rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div style="width: 40px; height: 40px; border-radius: 20px; background: #FEE2E2; display: flex; align-items: center; justify-content: center; color: #DC2626; font-size: 1.25rem;">
          ⚠️
        </div>
        <div>
          <h4 style="margin: 0; color: #991B1B; font-size: 0.95rem; font-weight: 800;">
            Attention: <?= $expiredCount ?> Subscribed Laundry Outlet(s) Have Ended / Expired!
          </h4>
          <p style="margin: 0.15rem 0 0 0; color: #B91C1C; font-size: 0.825rem;">
            When a plan ends, laundry shops cannot process new online orders until renewed or assigned a new plan.
          </p>
        </div>
      </div>
      <button 
        onclick="openAssignPlanModal()" 
        class="btn btn-sm"
        style="background: #DC2626; color: #FFF; font-weight: 800; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;"
      >
        Renew / Assign Plan Now →
      </button>
    </div>
  <?php endif; ?>

  <!-- Laundry Owner Self-Service Hero Card (Shown if logged in as Laundry Owner) -->
  <?php if ($isOwner): 
    $mySub = array_filter($allSubscribers, fn($s) => $s['shopId'] == $ownerShopId) ?: [];
    $myShopSub = reset($mySub) ?: ($allSubscribers[0] ?? null);
  ?>
    <div class="card" style="padding: 1.5rem; border-radius: 16px; margin-bottom: 2rem; background: linear-gradient(135deg, #2E1065 0%, #3B0764 50%, #4C1D95 100%); color: #FFF; box-shadow: 0 10px 25px rgba(76,29,149,0.25);">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div>
          <span style="background: rgba(255,255,255,0.2); padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.5px;">
            MY LAUNDRY STORE SUBSCRIPTION
          </span>
          <h2 style="font-size: 1.45rem; font-weight: 900; margin: 0.5rem 0 0.25rem 0; color: #FFF;">
            <?= htmlspecialchars($myShopSub['shopName'] ?? 'My Laundry Store') ?>
          </h2>
          <p style="color: #E9D5FF; font-size: 0.875rem; margin: 0;">
            Current Active Plan: <strong style="color: #FDE047;"><?= htmlspecialchars($myShopSub['planName'] ?? 'Basic') ?></strong> 
            • Valid until: <strong><?= htmlspecialchars($myShopSub['expiryDate'] ?? '—') ?></strong>
          </p>
        </div>

        <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
          <?php if (($myShopSub['status'] ?? '') === 'EXPIRED'): ?>
            <div style="background: #EF4444; color: #FFF; padding: 0.4rem 0.85rem; border-radius: 8px; font-weight: 800; font-size: 0.8rem;">
              ⚠️ PLAN ENDED / DUE FOR RENEWAL
            </div>
          <?php else: ?>
            <div style="background: #10B981; color: #FFF; padding: 0.4rem 0.85rem; border-radius: 8px; font-weight: 800; font-size: 0.8rem;">
              ✓ ACTIVE (<?= $myShopSub['daysLeft'] ?? 30 ?> Days Remaining)
            </div>
          <?php endif; ?>

          <!-- Owner Quick Renew Button -->
          <button
            onclick="openRenewModal('<?= htmlspecialchars($myShopSub['shopId'] ?? '') ?>', '<?= htmlspecialchars($myShopSub['shopName'] ?? '') ?>', '<?= htmlspecialchars($myShopSub['planName'] ?? '') ?>', '<?= htmlspecialchars($myShopSub['expiryDate'] ?? '') ?>')"
            style="background: #10B981; color: #FFF; border: none; padding: 0.6rem 1.25rem; border-radius: 8px; font-weight: 800; cursor: pointer;"
          >
            ⚡ Renew My Plan (+30 Days)
          </button>

          <!-- Owner Change / Upgrade Plan Button -->
          <button
            onclick="openAssignPlanModal('<?= htmlspecialchars($myShopSub['shopId'] ?? '') ?>')"
            style="background: #FFF; color: #4C1D95; border: none; padding: 0.6rem 1.25rem; border-radius: 8px; font-weight: 800; cursor: pointer;"
          >
            🔄 Upgrade / Choose New Plan
          </button>
        </div>
      </div>
    </div>
  <?php endif; ?>

  <!-- Plan Tier Cards with Edit, Delete & Assign Controls -->
  <div style="margin-bottom: 2rem;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <h2 style="font-size: 1.15rem; font-weight: 800; margin: 0; color: var(--brand-purple);">
        Available Subscription Plan Tiers
      </h2>
      <span style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 600;">
        Click 'Configure Plan' to edit price, order limits, or quotas.
      </span>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 1.5rem;">
      <?php foreach ($plansList as $p): 
          $pId = $p['id'];
          $pName = $p['name'] ?? 'Plan Tier';
          $pPrice = floatval($p['price'] ?? 0);
          $pCycle = $p['billingCycle'] ?? 'MONTHLY';
          $pLimit = intval($p['orderLimit'] ?? 100);
          $pStatus = strtoupper($p['status'] ?? 'ACTIVE');
          $features = $p['features'] ?? ['Direct Laundry Listing', 'Driver Dispatch Tracking', 'Online Customer Bookings'];
      ?>
        <div class="card" style="padding: 1.5rem; border-radius: 16px; border: 1px solid var(--border-color); border-top: 4px solid #8162EE; display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)';" onmouseout="this.style.transform='none';">
          <div>
            <!-- Plan Header & Action Buttons -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
              <div style="flex: 1; min-width: 0; padding-right: 0.5rem;">
                <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: var(--brand-purple);"><?= htmlspecialchars($pName) ?></h3>
              </div>
              <div style="display: flex; gap: 0.35rem; align-items: center;">
                <span class="badge badge-<?= $pStatus === 'ACTIVE' ? 'success' : 'danger' ?>" style="font-size: 0.72rem; font-weight: 800;">
                  <?= $pStatus ?>
                </span>
                
                <!-- Edit Plan Button -->
                <button 
                  type="button" 
                  onclick="openEditPlanModal(<?= htmlspecialchars(json_encode($p)) ?>)" 
                  class="btn btn-secondary btn-sm" 
                  style="padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem;"
                  title="Edit Plan Tier Details"
                >
                  <i data-lucide="edit-3" style="width: 13px; height: 13px;"></i>
                </button>

                <!-- Delete Plan Button -->
                <form method="POST" action="" onsubmit="return confirm('Delete subscription plan tier <?= htmlspecialchars($pName) ?>?');" style="display: inline;">
                  <input type="hidden" name="action" value="delete_plan">
                  <input type="hidden" name="plan_id" value="<?= htmlspecialchars($pId) ?>">
                  <button type="submit" class="btn btn-secondary btn-sm" style="color: #EF4444; padding: 0.25rem 0.5rem; border-radius: 6px;" title="Delete Plan Tier">
                    <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
                  </button>
                </form>
              </div>
            </div>

            <div style="font-size: 1.85rem; font-weight: 900; color: #10B981; margin: 0.6rem 0;">
              ₹<?= number_format($pPrice) ?>
              <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">/ <?= strtolower($pCycle) ?></span>
            </div>

            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem; background: var(--bg-input); padding: 0.5rem 0.75rem; border-radius: 8px; border: 1px solid var(--border-color);">
              Order Quota: <strong style="color: var(--text-primary);"><?= $pLimit > 1000 ? 'Unlimited Orders' : $pLimit . ' Orders/mo' ?></strong>
            </div>

            <ul style="font-size: 0.82rem; color: var(--text-secondary); padding-left: 1.2rem; margin: 0; line-height: 1.7;">
              <?php foreach ($features as $f): ?>
                <li><?= htmlspecialchars($f) ?></li>
              <?php endforeach; ?>
            </ul>
          </div>

          <div style="margin-top: 1.25rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">Code: <?= htmlspecialchars($pId) ?></span>
            
            <div style="display: flex; gap: 0.5rem;">
              <button 
                type="button" 
                onclick="openEditPlanModal(<?= htmlspecialchars(json_encode($p)) ?>)" 
                class="btn btn-outline btn-sm"
                style="font-size: 0.75rem; padding: 0.25rem 0.65rem;"
              >
                Configure Plan
              </button>
              
              <button 
                type="button" 
                onclick="openAssignPlanModal('', '<?= htmlspecialchars($pName) ?>', <?= $pPrice ?>, '<?= strtolower($pCycle) ?>')" 
                class="btn btn-primary btn-sm"
                style="font-size: 0.75rem; padding: 0.25rem 0.65rem; background: #5B52E8; color: #FFF; border: none; font-weight: 700;"
              >
                Assign This Plan
              </button>
            </div>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
  </div>

  <!-- Active & Expired Subscribed Laundry Outlets Table -->
  <div class="card" style="padding: 1.5rem; border-radius: 16px; margin-bottom: 2.5rem;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
      <div>
        <h2 style="font-size: 1.2rem; font-weight: 800; margin: 0; color: var(--brand-purple);">
          Active & Subscribed Laundry Outlets
        </h2>
        <p style="color: var(--text-secondary); font-size: 0.825rem; margin: 0.2rem 0 0 0;">
          All laundry partner shops with real-time subscription status, expiry dates, and quick renewal controls.
        </p>
      </div>

      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <span class="badge badge-success" style="font-weight: 700;">Active: <?= $activeCount ?></span>
        <?php if ($expiringSoonCount > 0): ?>
          <span class="badge badge-warning" style="font-weight: 700;">Expiring Soon: <?= $expiringSoonCount ?></span>
        <?php endif; ?>
        <?php if ($expiredCount > 0): ?>
          <span class="badge badge-danger" style="font-weight: 700;">Expired / Ended: <?= $expiredCount ?></span>
        <?php endif; ?>
      </div>
    </div>

    <div class="table-container" style="overflow-x: auto;">
      <table class="data-table" style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid var(--border-color); text-align: left;">
            <th style="padding: 0.85rem 0.75rem; font-size: 0.8rem; font-weight: 800; color: var(--text-secondary);">LAUNDRY SHOP</th>
            <th style="padding: 0.85rem 0.75rem; font-size: 0.8rem; font-weight: 800; color: var(--text-secondary);">OWNER</th>
            <th style="padding: 0.85rem 0.75rem; font-size: 0.8rem; font-weight: 800; color: var(--text-secondary);">CURRENT ACTIVE PLAN</th>
            <th style="padding: 0.85rem 0.75rem; font-size: 0.8rem; font-weight: 800; color: var(--text-secondary);">START DATE</th>
            <th style="padding: 0.85rem 0.75rem; font-size: 0.8rem; font-weight: 800; color: var(--text-secondary);">RENEWAL / EXPIRY DATE</th>
            <th style="padding: 0.85rem 0.75rem; font-size: 0.8rem; font-weight: 800; color: var(--text-secondary);">STATUS</th>
            <th style="padding: 0.85rem 0.75rem; font-size: 0.8rem; font-weight: 800; color: var(--text-secondary); text-align: right;">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($allSubscribers)): ?>
            <tr>
              <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                No laundry outlet subscriptions recorded yet. Click '+ Assign Plan' to subscribe an outlet.
              </td>
            </tr>
          <?php else: ?>
            <?php foreach ($allSubscribers as $s): 
                $isExp = ($s['status'] === 'EXPIRED');
                $isSoon = ($s['status'] === 'EXPIRING SOON');
            ?>
              <tr style="border-bottom: 1px solid var(--border-color); background: <?= $isExp ? 'rgba(239, 68, 68, 0.04)' : 'transparent' ?>;">
                <td style="padding: 0.85rem 0.75rem;">
                  <strong style="color: var(--brand-purple); font-size: 0.95rem; display: block;">
                    <?= htmlspecialchars($s['shopName']) ?>
                  </strong>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">
                    📍 <?= htmlspecialchars($s['city']) ?> (ID: #<?= htmlspecialchars($s['shopId']) ?>)
                  </span>
                </td>
                <td style="padding: 0.85rem 0.75rem; font-size: 0.85rem;">
                  <strong><?= htmlspecialchars($s['ownerName']) ?></strong>
                  <div style="font-size: 0.75rem; color: var(--text-muted);"><?= htmlspecialchars($s['ownerPhone']) ?></div>
                </td>
                <td style="padding: 0.85rem 0.75rem;">
                  <?php if ($s['status'] === 'NO PLAN'): ?>
                    <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">No Plan Assigned</span>
                  <?php else: ?>
                    <span class="badge" style="background: rgba(129,98,238,0.15); color: #8162EE; font-weight: 800; font-size: 0.8rem; padding: 0.35rem 0.65rem; border-radius: 6px;">
                      👑 <?= htmlspecialchars($s['planName']) ?>
                    </span>
                    <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
                      <?= ucfirst($s['billingCycle']) ?> (₹<?= number_format($s['price']) ?>)
                    </div>
                  <?php endif; ?>
                </td>
                <td style="padding: 0.85rem 0.75rem; font-size: 0.85rem; color: var(--text-secondary);">
                  <?= htmlspecialchars($s['startDate']) ?>
                </td>
                <td style="padding: 0.85rem 0.75rem; font-size: 0.85rem;">
                  <strong style="color: <?= $isExp ? '#DC2626' : ($isSoon ? '#D97706' : 'var(--text-primary)') ?>;">
                    <?= htmlspecialchars($s['expiryDate']) ?>
                  </strong>
                  <?php if ($isExp): ?>
                    <div style="font-size: 0.72rem; color: #DC2626; font-weight: 700;">Ended <?= abs($s['daysLeft'] ?? 0) ?> days ago</div>
                  <?php elseif ($isSoon): ?>
                    <div style="font-size: 0.72rem; color: #D97706; font-weight: 700;">Expires in <?= $s['daysLeft'] ?> days</div>
                  <?php endif; ?>
                </td>
                <td style="padding: 0.85rem 0.75rem;">
                  <?php if ($isExp): ?>
                    <span class="badge badge-danger" style="font-size: 0.75rem; font-weight: 800; padding: 0.3rem 0.6rem; background: #FEE2E2; color: #DC2626; border: 1px solid #FCA5A5;">
                      ⚠️ PLAN ENDED
                    </span>
                  <?php elseif ($isSoon): ?>
                    <span class="badge badge-warning" style="font-size: 0.75rem; font-weight: 800; padding: 0.3rem 0.6rem; background: #FEF3C7; color: #D97706; border: 1px solid #FCD34D;">
                      ⏰ EXPIRING SOON
                    </span>
                  <?php elseif ($s['status'] === 'ACTIVE'): ?>
                    <span class="badge badge-success" style="font-size: 0.75rem; font-weight: 800; padding: 0.3rem 0.6rem; background: #D1FAE5; color: #059669; border: 1px solid #A7F3D0;">
                      ✓ ACTIVE
                    </span>
                  <?php else: ?>
                    <span class="badge" style="font-size: 0.75rem; font-weight: 700; background: #F3F4F6; color: #6B7280;">
                      NO PLAN
                    </span>
                  <?php endif; ?>
                </td>
                <td style="padding: 0.85rem 0.75rem; text-align: right;">
                  <div style="display: flex; gap: 0.4rem; justify-content: flex-end; align-items: center; flex-wrap: wrap;">
                    
                    <!-- Quick Renew Button (Active on any shop to extend, highly highlighted on expired) -->
                    <button
                      type="button"
                      onclick="openRenewModal('<?= htmlspecialchars($s['shopId']) ?>', '<?= htmlspecialchars($s['shopName']) ?>', '<?= htmlspecialchars($s['planName']) ?>', '<?= htmlspecialchars($s['expiryDate']) ?>')"
                      class="btn btn-sm"
                      style="background: <?= $isExp ? '#10B981' : '#F3F4F6' ?>; color: <?= $isExp ? '#FFF' : '#374151' ?>; border: 1px solid <?= $isExp ? '#10B981' : '#D1D5DB' ?>; padding: 0.3rem 0.65rem; border-radius: 6px; font-weight: 800; font-size: 0.75rem; cursor: pointer;"
                      title="Quick Renew Plan"
                    >
                      ⚡ Renew Plan
                    </button>

                    <!-- Assign / Change Plan Button -->
                    <button
                      type="button"
                      onclick="openAssignPlanModal('<?= htmlspecialchars($s['shopId']) ?>', '<?= htmlspecialchars($s['planName'] !== 'No Active Plan' ? $s['planName'] : '') ?>', <?= $s['price'] ?>, '<?= $s['billingCycle'] ?>')"
                      class="btn btn-sm"
                      style="background: #EDE8FF; color: #5B52E8; border: 1px solid #D6CCFE; padding: 0.3rem 0.65rem; border-radius: 6px; font-weight: 800; font-size: 0.75rem; cursor: pointer;"
                      title="Assign or Change Subscription Plan"
                    >
                      👑 Assign / Change Plan
                    </button>

                    <!-- Cancel Plan Form (if active) -->
                    <?php if ($s['status'] === 'ACTIVE' || $s['status'] === 'EXPIRING SOON'): ?>
                      <form method="POST" action="" onsubmit="return confirm('Cancel subscription for <?= htmlspecialchars($s['shopName']) ?>?');" style="display: inline;">
                        <input type="hidden" name="action" value="cancel_subscription">
                        <input type="hidden" name="shop_id" value="<?= htmlspecialchars($s['shopId']) ?>">
                        <button type="submit" class="btn btn-sm" style="color: #9CA3AF; background: transparent; border: none; padding: 0.2rem;" title="Cancel Subscription">
                          ✕
                        </button>
                      </form>
                    <?php endif; ?>
                  </div>
                </td>
              </tr>
            <?php endforeach; ?>
          <?php endif; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- ============================================================= -->
<!-- MODAL 1: Create Plan Tier                                      -->
<!-- ============================================================= -->
<div id="addPlanModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(6px); align-items: center; justify-content: center; z-index: 99999; padding: 1rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 480px; padding: 1.75rem; color: var(--text-primary); box-shadow: 0 25px 50px rgba(0,0,0,0.4);">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
      <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--brand-purple);">Create Subscription Tier</h3>
      <button onclick="closeModal('addPlanModal')" style="background: var(--bg-input); border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer;">✕</button>
    </div>
    <form method="POST" action="">
      <input type="hidden" name="action" value="create_plan">
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Plan Title *</label>
        <input type="text" name="name" class="form-control" placeholder="e.g. VIP Diamond Store" required style="width: 100%;">
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Price (₹) *</label>
          <input type="number" name="price" class="form-control" value="2999" required style="width: 100%;">
        </div>
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Billing Cycle</label>
          <select name="billing_cycle" class="form-control" style="width: 100%;">
            <option value="MONTHLY">Monthly</option>
            <option value="ANNUAL">Annual</option>
            <option value="QUARTERLY">Quarterly</option>
          </select>
        </div>
      </div>
      <div class="form-group" style="margin-bottom: 1.5rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Monthly Order Limit</label>
        <input type="number" name="order_limit" class="form-control" value="500" placeholder="Use 999999 for unlimited" style="width: 100%;">
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('addPlanModal')" class="btn btn-secondary" style="font-weight: 700;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.65rem 1.4rem; border-radius: 8px; font-weight: 800;">Create Plan Tier</button>
      </div>
    </form>
  </div>
</div>

<!-- ============================================================= -->
<!-- MODAL 2: Edit Plan Tier                                        -->
<!-- ============================================================= -->
<div id="editPlanModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); align-items: center; justify-content: center; z-index: 99999; padding: 1.5rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 480px; padding: 1.75rem; color: var(--text-primary); box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
      <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--brand-purple);">Edit Subscription Tier</h3>
      <button onclick="closeModal('editPlanModal')" style="background: var(--bg-input); border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer;">✕</button>
    </div>
    <form method="POST" action="">
      <input type="hidden" name="action" value="edit_plan">
      <input type="hidden" id="editPlanId" name="plan_id" value="">

      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Plan Title *</label>
        <input type="text" id="editPlanName" name="name" class="form-control" required style="width: 100%;">
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Price (₹) *</label>
          <input type="number" id="editPlanPrice" name="price" class="form-control" required style="width: 100%;">
        </div>
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Billing Cycle</label>
          <select id="editPlanCycle" name="billing_cycle" class="form-control" style="width: 100%;">
            <option value="MONTHLY">Monthly</option>
            <option value="ANNUAL">Annual</option>
            <option value="QUARTERLY">Quarterly</option>
          </select>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Monthly Order Limit</label>
          <input type="number" id="editPlanLimit" name="order_limit" class="form-control" style="width: 100%;">
        </div>
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Status</label>
          <select id="editPlanStatus" name="status" class="form-control" style="width: 100%;">
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('editPlanModal')" class="btn btn-secondary" style="font-weight: 700;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.65rem 1.5rem; border-radius: 8px; font-weight: 800;">
          Save Changes
        </button>
      </div>
    </form>
  </div>
</div>

<!-- ============================================================= -->
<!-- MODAL 3: Assign / Change Subscription Plan to Laundry Shop    -->
<!-- ============================================================= -->
<div id="assignPlanModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); align-items: center; justify-content: center; z-index: 99999; padding: 1.5rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 520px; padding: 1.75rem; color: var(--text-primary); box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
      <div>
        <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--brand-purple);">👑 Assign / Change Plan Tier</h3>
        <p style="margin: 0.2rem 0 0 0; font-size: 0.8rem; color: var(--text-secondary);">Assign or upgrade subscription plan for a laundry store</p>
      </div>
      <button onclick="closeModal('assignPlanModal')" style="background: var(--bg-input); border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer;">✕</button>
    </div>

    <form method="POST" action="">
      <input type="hidden" name="action" value="assign_plan">

      <!-- Target Laundry Shop Dropdown -->
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Select Laundry Shop *</label>
        <select id="assignShopSelect" name="shop_id" class="form-control" required style="width: 100%; font-weight: 600;">
          <?php foreach ($allSubscribers as $sub): ?>
            <option value="<?= htmlspecialchars($sub['shopId']) ?>">
              <?= htmlspecialchars($sub['shopName']) ?> (<?= htmlspecialchars($sub['city']) ?>) - Current: <?= htmlspecialchars($sub['planName']) ?>
            </option>
          <?php endforeach; ?>
        </select>
      </div>

      <!-- Plan Tier Dropdown -->
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Select Subscription Plan *</label>
        <select id="assignPlanSelect" name="plan_name" class="form-control" onchange="handlePlanSelectionChange(this)" required style="width: 100%; font-weight: 700; color: #5B52E8;">
          <?php foreach ($plansList as $pl): ?>
            <option 
              value="<?= htmlspecialchars($pl['name']) ?>"
              data-price="<?= $pl['price'] ?>"
              data-cycle="<?= strtolower($pl['billingCycle']) ?>"
            >
              <?= htmlspecialchars($pl['name']) ?> — ₹<?= number_format($pl['price']) ?> / <?= strtolower($pl['billingCycle']) ?>
            </option>
          <?php endforeach; ?>
        </select>
      </div>

      <!-- Hidden Price & Cycle -->
      <input type="hidden" id="assignPlanPrice" name="plan_price" value="<?= $plansList[0]['price'] ?? 999 ?>">
      <input type="hidden" id="assignPlanCycle" name="billing_cycle" value="<?= strtolower($plansList[0]['billingCycle'] ?? 'monthly') ?>">

      <!-- Start Date & Expiry Date Row -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Start Date *</label>
          <input type="date" id="assignStartDate" name="start_date" class="form-control" value="<?= date('Y-m-d') ?>" required style="width: 100%;" onchange="recalcExpiryDate()">
        </div>
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Renewal / Expiry Date *</label>
          <input type="date" id="assignExpiryDate" name="expiry_date" class="form-control" value="<?= date('Y-m-d', strtotime('+30 days')) ?>" required style="width: 100%;">
        </div>
      </div>

      <!-- Payment Ref -->
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Payment Ref / Invoice #</label>
        <input type="text" name="payment_reference" class="form-control" placeholder="e.g. UPI-9021991344 / CASH-RENEWAL" value="SUB-<?= strtoupper(substr(uniqid(), 8)) ?>" style="width: 100%;">
      </div>

      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem;">
        <input type="checkbox" id="assignAutoRenew" name="auto_renew" value="1" checked style="width: 18px; height: 18px;">
        <label for="assignAutoRenew" style="font-size: 0.85rem; font-weight: 600; cursor: pointer;">Enable Auto-Renewal & Keep Shop Active in App</label>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('assignPlanModal')" class="btn btn-secondary" style="font-weight: 700;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.65rem 1.5rem; border-radius: 8px; font-weight: 800;">
          Confirm & Assign Plan
        </button>
      </div>
    </form>
  </div>
</div>

<!-- ============================================================= -->
<!-- MODAL 4: Quick Renew Subscription Modal                       -->
<!-- ============================================================= -->
<div id="renewPlanModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); align-items: center; justify-content: center; z-index: 99999; padding: 1.5rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 460px; padding: 1.75rem; color: var(--text-primary); box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
      <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: #10B981;">⚡ Renew Store Subscription</h3>
      <button onclick="closeModal('renewPlanModal')" style="background: var(--bg-input); border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer;">✕</button>
    </div>

    <form method="POST" action="">
      <input type="hidden" name="action" value="renew_plan">
      <input type="hidden" id="renewShopId" name="shop_id" value="">

      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; padding: 1rem; border-radius: 10px; margin-bottom: 1.25rem;">
        <h4 id="renewShopTitle" style="margin: 0 0 0.25rem 0; color: #166534; font-size: 1rem; font-weight: 800;">Renew Plan</h4>
        <p id="renewPlanSubtitle" style="margin: 0; color: #15803D; font-size: 0.85rem;">Current Plan: Professional Growth</p>
      </div>

      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Extension Duration</label>
        <select id="renewDaysSelect" name="renew_days" class="form-control" onchange="handleRenewDaysChange(this.value)" style="width: 100%; font-weight: 700;">
          <option value="30">Extend by +30 Days (1 Month)</option>
          <option value="90">Extend by +90 Days (1 Quarter)</option>
          <option value="180">Extend by +180 Days (Half Year)</option>
          <option value="365">Extend by +365 Days (1 Full Year)</option>
        </select>
      </div>

      <div class="form-group" style="margin-bottom: 1.5rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">New Expiry Date</label>
        <input type="date" id="renewExpiryInput" name="new_expiry_date" class="form-control" value="<?= date('Y-m-d', strtotime('+30 days')) ?>" required style="width: 100%; font-weight: 700; color: #059669;">
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('renewPlanModal')" class="btn btn-secondary" style="font-weight: 700;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: #10B981; color: #FFF; border: none; padding: 0.65rem 1.5rem; border-radius: 8px; font-weight: 800;">
          ⚡ Confirm Renewal
        </button>
      </div>
    </form>
  </div>
</div>

<script>
  function openEditPlanModal(plan) {
    document.getElementById('editPlanId').value = plan.id || '';
    document.getElementById('editPlanName').value = plan.name || '';
    document.getElementById('editPlanPrice').value = plan.price || 0;
    document.getElementById('editPlanCycle').value = (plan.billingCycle || 'MONTHLY').toUpperCase();
    document.getElementById('editPlanLimit').value = plan.orderLimit || 100;
    document.getElementById('editPlanStatus').value = (plan.status || 'ACTIVE').toUpperCase();
    openModal('editPlanModal');
  }

  function openAssignPlanModal(targetShopId = '', targetPlanName = '', price = 0, cycle = 'monthly') {
    if (targetShopId) {
      document.getElementById('assignShopSelect').value = targetShopId;
    }
    if (targetPlanName) {
      const planSel = document.getElementById('assignPlanSelect');
      for (let i = 0; i < planSel.options.length; i++) {
        if (planSel.options[i].value === targetPlanName) {
          planSel.selectedIndex = i;
          handlePlanSelectionChange(planSel);
          break;
        }
      }
    } else {
      handlePlanSelectionChange(document.getElementById('assignPlanSelect'));
    }
    openModal('assignPlanModal');
  }

  function handlePlanSelectionChange(sel) {
    const opt = sel.options[sel.selectedIndex];
    if (!opt) return;
    const price = opt.getAttribute('data-price') || 999;
    const cycle = opt.getAttribute('data-cycle') || 'monthly';
    document.getElementById('assignPlanPrice').value = price;
    document.getElementById('assignPlanCycle').value = cycle;
    recalcExpiryDate();
  }

  function recalcExpiryDate() {
    const startVal = document.getElementById('assignStartDate').value;
    const cycle = (document.getElementById('assignPlanCycle').value || 'monthly').toLowerCase();
    const d = startVal ? new Date(startVal) : new Date();

    if (cycle === 'annual') {
      d.setFullYear(d.getFullYear() + 1);
    } else if (cycle === 'quarterly') {
      d.setMonth(d.getMonth() + 3);
    } else {
      d.setDate(d.getDate() + 30);
    }

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    document.getElementById('assignExpiryDate').value = `${y}-${m}-${day}`;
  }

  function openRenewModal(shopId, shopName, planName, expiryDate) {
    document.getElementById('renewShopId').value = shopId;
    document.getElementById('renewShopTitle').innerText = 'Renew: ' + shopName;
    document.getElementById('renewPlanSubtitle').innerText = 'Current Plan: ' + planName + ' (Expiry: ' + (expiryDate || 'Ended') + ')';
    
    // Default extend from today
    handleRenewDaysChange(30);
    openModal('renewPlanModal');
  }

  function handleRenewDaysChange(days) {
    const d = new Date();
    d.setDate(d.getDate() + parseInt(days || 30));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    document.getElementById('renewExpiryInput').value = `${y}-${m}-${day}`;
  }
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
