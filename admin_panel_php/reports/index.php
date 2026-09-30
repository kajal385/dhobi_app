<?php
$pageTitle = 'Advanced Platform Reports & Analytics';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';
?>

<div style="color: var(--text-primary);">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary); margin: 0;">
        <i data-lucide="bar-chart-3" style="width: 28px; height: 28px; color: #8162EE;"></i> Advanced Platform Analytics & Retention Reports
      </h1>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.2rem; margin-bottom: 0;">
        Customer acquisition vs repeat customer retention, cancellation analysis, and order volume growth.
      </p>
    </div>

    <button onclick="alert('Exporting Analytics to CSV report...');" class="btn btn-secondary btn-sm" style="display: flex; align-items: center; gap: 0.4rem; font-weight: 700;">
      <i data-lucide="download" style="width: 14px; height: 14px;"></i> Export Reports (CSV)
    </button>
  </div>

  <!-- KPI Metrics Grid -->
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
    <div class="card" style="padding: 1.25rem;">
      <div style="font-size: 0.8125rem; color: var(--text-muted); font-weight: 700;">Customer Retention Rate</div>
      <div style="font-size: 1.75rem; font-weight: 900; color: #10B981; margin-top: 0.25rem;">78.4%</div>
      <div style="font-size: 0.75rem; color: #10B981; margin-top: 0.25rem; font-weight: 700;">+5.2% vs last month</div>
    </div>

    <div class="card" style="padding: 1.25rem;">
      <div style="font-size: 0.8125rem; color: var(--text-muted); font-weight: 700;">Repeat Order Rate</div>
      <div style="font-size: 1.75rem; font-weight: 900; color: var(--brand-purple); margin-top: 0.25rem;">64.2%</div>
      <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem; font-weight: 600;">High customer loyalty</div>
    </div>

    <div class="card" style="padding: 1.25rem;">
      <div style="font-size: 0.8125rem; color: var(--text-muted); font-weight: 700;">Avg Orders Per Customer</div>
      <div style="font-size: 1.75rem; font-weight: 900; color: #3B82F6; margin-top: 0.25rem;">3.8 / mo</div>
      <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem; font-weight: 600;">High frequency metric</div>
    </div>

    <div class="card" style="padding: 1.25rem;">
      <div style="font-size: 0.8125rem; color: var(--text-muted); font-weight: 700;">Order Cancellation Rate</div>
      <div style="font-size: 1.75rem; font-weight: 900; color: #EF4444; margin-top: 0.25rem;">2.08%</div>
      <div style="font-size: 0.75rem; color: #10B981; margin-top: 0.25rem; font-weight: 700;">-0.4% improvement</div>
    </div>
  </div>

  <!-- Interactive Growth & Retention Chart -->
  <div class="card" style="padding: 1.5rem;">
    <h3 style="font-size: 1.15rem; font-weight: 800; margin-top: 0; margin-bottom: 1.25rem; color: var(--brand-purple);">
      Customer Acquisition vs Repeat Retention Growth (Monthly)
    </h3>
    <div style="height: 320px; width: 100%;">
      <canvas id="retentionChart"></canvas>
    </div>
  </div>
</div>

<script>
  document.addEventListener('DOMContentLoaded', () => {
    const ctx = document.getElementById('retentionChart');
    if (ctx && window.Chart) {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
          datasets: [
            {
              label: 'New Customers',
              data: [1200, 1450, 1800, 2100, 2400, 2900, 3100, 3400, 3800],
              backgroundColor: '#8162EE',
              borderRadius: 6,
            },
            {
              label: 'Repeat Orders',
              data: [850, 1100, 1550, 1900, 2300, 2850, 3200, 3600, 4100],
              backgroundColor: '#10B981',
              borderRadius: 6,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                font: { family: 'Plus Jakarta Sans', weight: '700' }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false }
            },
            y: {
              grid: { color: 'rgba(0,0,0,0.05)' }
            }
          }
        }
      });
    }
  });
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
