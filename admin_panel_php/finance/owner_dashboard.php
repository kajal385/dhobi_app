<?php
// owner_dashboard.php - Included from finance/index.php when $isOwner is true
$shopName = currentShopName();

// Mock Data for Owner Dashboard
$activeTab = $_GET['tab'] ?? 'Daily';
$isDaily = $activeTab === 'Daily';
$isWeekly = $activeTab === 'Weekly';
$isMonthly = $activeTab === 'Monthly';

$revenue = $isDaily ? 1400 : ($isWeekly ? 8400 : 32500);
$allTime = 32500;
$commissionRate = 0.10;
$platformFee = $revenue * $commissionRate;
$netEarnings = $revenue - $platformFee;

$cashPct = $isDaily ? 100 : 65;
$onlinePct = 100 - $cashPct;
$cashAmt = $revenue * ($cashPct / 100);
$onlineAmt = $revenue * ($onlinePct / 100);

$services = [
    ['name' => 'Dry Cleaning (Suits / Blazers)', 'amount' => $revenue * 0.35],
    ['name' => 'Shoe Deep Cleaning', 'amount' => $revenue * 0.27],
    ['name' => 'Wash & Iron', 'amount' => $revenue * 0.20],
    ['name' => 'Wash & Fold', 'amount' => $revenue * 0.18],
];
?>

<div style="color: var(--text-primary);">
  
  <div style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.5rem; font-weight: 800; color: #1E1B4B; margin: 0; display: flex; align-items: center; gap: 0.6rem;">
        <i data-lucide="bar-chart-2" style="width: 28px; height: 28px; color: #32138F;"></i> Revenue Dashboard
      </h1>
      <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.2rem; margin-bottom: 0;">
        <?= htmlspecialchars($shopName) ?> — Live financial overview
      </p>
    </div>

    <!-- Tabs -->
    <div style="display: flex; gap: 0.5rem; background: var(--bg-card); padding: 0.35rem; border-radius: 12px; border: 1px solid var(--border-color); box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
      <a href="?tab=Daily" style="padding: 0.5rem 1.25rem; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 0.85rem; transition: all 0.2s ease; <?= $isDaily ? 'background: #32138F; color: #FFF; box-shadow: 0 4px 10px rgba(50, 19, 143, 0.2);' : 'color: var(--text-secondary);' ?>">Daily</a>
      <a href="?tab=Weekly" style="padding: 0.5rem 1.25rem; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 0.85rem; transition: all 0.2s ease; <?= $isWeekly ? 'background: #32138F; color: #FFF; box-shadow: 0 4px 10px rgba(50, 19, 143, 0.2);' : 'color: var(--text-secondary);' ?>">Weekly</a>
      <a href="?tab=Monthly" style="padding: 0.5rem 1.25rem; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 0.85rem; transition: all 0.2s ease; <?= $isMonthly ? 'background: #32138F; color: #FFF; box-shadow: 0 4px 10px rgba(50, 19, 143, 0.2);' : 'color: var(--text-secondary);' ?>">Monthly</a>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
    <!-- Main Revenue Card -->
    <div style="background: linear-gradient(135deg, #32138F 0%, #4C1D95 100%); border-radius: 16px; padding: 1.75rem; color: #FFF; box-shadow: 0 10px 25px rgba(50, 19, 143, 0.25); display: flex; flex-direction: column; justify-content: center;">
      <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.5rem; font-weight: 600;"><?= $isDaily ? 'Today\'s' : ($isWeekly ? 'This Week\'s' : 'This Month\'s') ?> Revenue</div>
      <div style="font-size: 2.8rem; font-weight: 900; line-height: 1; letter-spacing: -1px;">₹<?= number_format($revenue) ?></div>
      <div style="font-size: 0.8rem; opacity: 0.8; margin-top: 1.25rem; display: flex; align-items: center; gap: 0.4rem;">
        <i data-lucide="trending-up" style="width: 14px;"></i> All-time Total: ₹<?= number_format($allTime) ?>
      </div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <h3 style="font-size: 1.05rem; font-weight: 800; margin: 0;">Earnings Breakdown</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; flex: 1;">
        <div style="background: #FFF; border-radius: 12px; padding: 1.25rem; border: 1px solid var(--border-color); box-shadow: 0 2px 8px rgba(0,0,0,0.04); display: flex; flex-direction: column; justify-content: center;">
          <div style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--text-secondary); font-weight: 700; margin-bottom: 0.5rem;">
            <i data-lucide="building" style="width: 14px; color: #10B981;"></i> Net Earnings
          </div>
          <div style="font-size: 1.6rem; font-weight: 900; color: #10B981;">₹<?= number_format($netEarnings, 2) ?></div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem;">After <?= $commissionRate * 100 ?>% commission</div>
        </div>
        <div style="background: #FFF; border-radius: 12px; padding: 1.25rem; border: 1px solid var(--border-color); box-shadow: 0 2px 8px rgba(0,0,0,0.04); display: flex; flex-direction: column; justify-content: center;">
          <div style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--text-secondary); font-weight: 700; margin-bottom: 0.5rem;">
            <i data-lucide="tag" style="width: 14px; color: #EF4444;"></i> Platform Fee
          </div>
          <div style="font-size: 1.6rem; font-weight: 900; color: #EF4444;">₹<?= number_format($platformFee, 2) ?></div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem;"><?= $commissionRate * 100 ?>% of revenue</div>
        </div>
      </div>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
    <!-- Payment Mode Breakdown -->
    <div>
      <h3 style="font-size: 1.05rem; font-weight: 800; margin: 0 0 0.75rem 0;">Payment Mode</h3>
      <div style="background: #FFF; border-radius: 12px; padding: 1.25rem; border: 1px solid var(--border-color); box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
        <div style="margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.5rem;">
            <span style="display: flex; align-items: center; gap: 0.4rem;"><i data-lucide="banknote" style="width: 14px; color: #10B981;"></i> Cash / COD</span>
            <span style="display: flex; align-items: center; gap: 0.5rem;"><span>₹<?= number_format($cashAmt) ?></span> <span style="color: var(--text-muted); font-size: 0.75rem; width: 35px; text-align: right;"><?= $cashPct ?>%</span></span>
          </div>
          <div style="height: 8px; background: var(--bg-input); border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: <?= $cashPct ?>%; background: #F59E0B; border-radius: 4px;"></div>
          </div>
        </div>
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.5rem;">
            <span style="display: flex; align-items: center; gap: 0.4rem;"><i data-lucide="credit-card" style="width: 14px; color: #3B82F6;"></i> Online / UPI</span>
            <span style="display: flex; align-items: center; gap: 0.5rem;"><span style="color: #3B82F6;">₹<?= number_format($onlineAmt) ?></span> <span style="color: var(--text-muted); font-size: 0.75rem; width: 35px; text-align: right;"><?= $onlinePct ?>%</span></span>
          </div>
          <div style="height: 8px; background: var(--bg-input); border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: <?= $onlinePct ?>%; background: #3B82F6; border-radius: 4px;"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Service-Wise Revenue -->
    <div>
      <h3 style="font-size: 1.05rem; font-weight: 800; margin: 0 0 0.75rem 0;">Service-Wise Revenue</h3>
      <div style="background: #FFF; border-radius: 12px; padding: 1.25rem; border: 1px solid var(--border-color); box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
        <?php foreach ($services as $srv): 
          $pct = ($srv['amount'] / $revenue) * 100;
        ?>
          <div style="margin-bottom: 1.25rem;">
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.5rem; color: #1E1B4B;">
              <span><?= htmlspecialchars($srv['name']) ?></span>
              <span style="color: #32138F;">₹<?= number_format($srv['amount']) ?></span>
            </div>
            <div style="height: 8px; background: var(--bg-input); border-radius: 4px; overflow: hidden;">
              <div style="height: 100%; width: <?= $pct ?>%; background: #32138F; border-radius: 4px;"></div>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
    <!-- Top Customers & Recent Transactions -->
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div>
        <h3 style="font-size: 1.05rem; font-weight: 800; margin: 0 0 0.75rem 0;">Top Customers</h3>
        <div style="background: #FFF; border-radius: 12px; padding: 1.25rem; border: 1px solid var(--border-color); box-shadow: 0 2px 8px rgba(0,0,0,0.04); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 0.95rem; font-weight: 800; color: #1E1B4B;">1. Kajal Gajare</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;"><?= $isDaily ? 2 : 5 ?> orders completed</div>
          </div>
          <div style="font-size: 1.1rem; font-weight: 800; color: #10B981;">₹<?= number_format($revenue) ?></div>
        </div>
      </div>

      <div>
        <h3 style="font-size: 1.05rem; font-weight: 800; margin: 0 0 0.75rem 0;">Recent Transactions</h3>
        <div style="background: #FFF; border-radius: 12px; padding: 0.5rem 1.25rem; border: 1px solid var(--border-color); box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
          <?php
          $txns = [
              ['id' => 'TXN-30', 'name' => 'Kajal Gajare', 'date' => '23 Sep 2026, 09:19 AM', 'amt' => 1475, 'status' => 'PENDING', 'color' => '#F59E0B', 'bg' => 'rgba(245, 158, 11, 0.1)'],
              ['id' => 'TXN-29', 'name' => 'Kajal Gajare', 'date' => '18 Sep 2026, 11:56 AM', 'amt' => 1130, 'status' => 'PAID', 'color' => '#10B981', 'bg' => 'rgba(16, 185, 129, 0.1)'],
              ['id' => 'TXN-27', 'name' => 'Kajal Gajare', 'date' => '17 Sep 2026, 10:20 AM', 'amt' => 270, 'status' => 'PENDING', 'color' => '#F59E0B', 'bg' => 'rgba(245, 158, 11, 0.1)'],
          ];
          foreach ($txns as $index => $t):
          ?>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 0; <?= $index < count($txns) - 1 ? 'border-bottom: 1px solid var(--border-color);' : '' ?>">
              <div>
                <div style="font-size: 0.75rem; color: #32138F; font-weight: 700; margin-bottom: 0.2rem;"><?= $t['id'] ?></div>
                <div style="font-size: 0.95rem; font-weight: 800; color: #1E1B4B;"><?= $t['name'] ?></div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;"><?= $t['date'] ?></div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 1.05rem; font-weight: 800; color: #E11D48; margin-bottom: 0.3rem;">₹<?= number_format($t['amt']) ?></div>
                <span style="font-size: 0.65rem; font-weight: 800; background: <?= $t['bg'] ?>; color: <?= $t['color'] ?>; padding: 0.2rem 0.5rem; border-radius: 10px; display: inline-block;"><?= $t['status'] ?></span>
              </div>
            </div>
          <?php endforeach; ?>
        </div>
      </div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Cancelled Orders -->
      <div>
        <h3 style="font-size: 1.05rem; font-weight: 800; margin: 0 0 0.75rem 0;">Cancelled Orders & Revenue Loss</h3>
        <div style="background: #FFF; border-radius: 12px; padding: 1.25rem; border: 1px solid var(--border-color); box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; padding-bottom: 0.85rem; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-secondary); font-weight: 600;">Total Cancelled Orders</span>
            <span style="color: #E11D48; font-weight: 800;">0 Orders</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; padding-top: 0.85rem;">
            <span style="color: var(--text-secondary); font-weight: 600;">Lost Revenue Value</span>
            <span style="color: #E11D48; font-weight: 800;">₹0</span>
          </div>
        </div>
      </div>

      <!-- Commission & Net Settlement -->
      <div>
        <h3 style="font-size: 1.05rem; font-weight: 800; margin: 0 0 0.75rem 0;">Commission & Net Settlement</h3>
        <div style="background: #FFF; border-radius: 12px; padding: 1.25rem; border: 1px solid var(--border-color); box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; padding-bottom: 0.85rem; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-secondary); font-weight: 600;">Gross Business Volume</span>
            <span style="color: #1E1B4B; font-weight: 800;">₹<?= number_format($revenue) ?></span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; padding: 0.85rem 0; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-secondary); font-weight: 600;">Platform Commission (<?= $commissionRate * 100 ?>%)</span>
            <span style="color: #E11D48; font-weight: 800;">-₹<?= number_format($platformFee, 2) ?></span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 1.05rem; padding-top: 0.85rem;">
            <span style="color: #1E1B4B; font-weight: 800;">Net Bank Settlement</span>
            <span style="color: #32138F; font-weight: 900;">₹<?= number_format($netEarnings, 2) ?></span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 3rem;">
    <!-- GST Reports & Tax -->
    <div>
      <h3 style="font-size: 1.05rem; font-weight: 800; margin: 0 0 0.75rem 0;">GST Reports & Tax</h3>
      <div style="background: #FFF; border-radius: 12px; padding: 1.25rem; border: 1px solid var(--border-color); box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; padding-bottom: 0.85rem; border-bottom: 1px dashed var(--border-color);">
          <span style="color: var(--text-secondary); font-weight: 600;">CGST (9%)</span>
          <span style="color: #1E1B4B; font-weight: 800;">₹<?= number_format($revenue * 0.09, 2) ?></span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; padding: 0.85rem 0; border-bottom: 1px dashed var(--border-color);">
          <span style="color: var(--text-secondary); font-weight: 600;">SGST (9%)</span>
          <span style="color: #1E1B4B; font-weight: 800;">₹<?= number_format($revenue * 0.09, 2) ?></span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.95rem; padding-top: 0.85rem; margin-bottom: 1.25rem;">
          <span style="color: #32138F; font-weight: 800;">Total GST Liability</span>
          <span style="color: #32138F; font-weight: 900;">₹<?= number_format($revenue * 0.18, 2) ?></span>
        </div>
        
        <button type="button" onclick="alert('Downloading GST Summary...')" style="width: 100%; background: #E0E7FF; color: #4338CA; border: none; padding: 0.85rem; border-radius: 10px; font-weight: 800; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer;">
          <i data-lucide="download" style="width: 16px;"></i> Download GST Summary Report
        </button>
      </div>
    </div>
  </div>
</div>

<script>
  if (window.lucide) {
    lucide.createIcons();
  }
</script>
