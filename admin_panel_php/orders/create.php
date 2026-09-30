<?php
$pageTitle = 'New Walk-in Order';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';

// Only Laundry Owners should typically book POS walk-in orders
$isOwner = isLaundryOwner();

$msg = '';
$error = '';

if (!isset($_SESSION['srv_store'])) {
    $_SESSION['srv_store'] = [
        '1' => ['id' => '1', 'name' => 'Wash & Fold - T-Shirt / Shirt', 'price' => 35, 'unit' => 'piece'],
        '2' => ['id' => '2', 'name' => 'Wash & Fold - Trousers / Jeans', 'price' => 50, 'unit' => 'piece'],
        '3' => ['id' => '3', 'name' => 'Wash & Steam Iron - Kurta / Pyjama', 'price' => 90, 'unit' => 'piece'],
        '4' => ['id' => '4', 'name' => 'Wash & Steam Iron - Formal Shirt', 'price' => 55, 'unit' => 'piece'],
        '5' => ['id' => '5', 'name' => 'Dry Clean - 2-Piece Business Suit', 'price' => 350, 'unit' => 'set'],
    ];
}
$availableServices = $_SESSION['srv_store'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Process form
    $customerName = $_POST['customer_name'] ?? '';
    $customerPhone = $_POST['customer_phone'] ?? '';
    $society = $_POST['society'] ?? '';
    $flat = $_POST['flat'] ?? '';
    $servicesJson = $_POST['services_json'] ?? '[]';
    $servicesItems = json_decode($servicesJson, true);
    $totalAmount = floatval($_POST['total_amount'] ?? 0);
    $paymentMethod = $_POST['payment_method'] ?? 'COD';

    // Validate
    if (empty($customerName) || empty($customerPhone)) {
        $error = 'Customer Name and Mobile Number are required.';
    } else {
        // Here we would call the API:
        // $res = ApiClient::post('/owner/orders', [...]);
        // For demonstration, we simply mock success.
        
        // Mocking a successful booking:
        $_SESSION['order_status_overrides']['NEW-WALKIN-' . time()] = 'RECEIVED';
        $msg = 'Walk-in order created successfully for ' . htmlspecialchars($customerName) . '!';
    }
}
?>

<div style="color: var(--text-primary);">
  <div style="margin-bottom: 1.5rem;">
    <a href="<?= ADMIN_BASE_URL ?>/orders/index.php" style="display: inline-flex; align-items: center; gap: 0.4rem; color: var(--text-secondary); text-decoration: none; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.75rem;">
      <i data-lucide="arrow-left" style="width: 14px; height: 14px;"></i> Back to Orders
    </a>
    <h1 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.6rem; margin: 0;">
      <i data-lucide="plus-circle" style="width: 28px; height: 28px; color: #10B981;"></i>
      Book Walk-in Order
    </h1>
    <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.2rem;">
      Quick Point-of-Sale (POS) order creation for customers visiting the shop.
    </p>
  </div>

  <?php if ($msg): ?>
    <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #059669; padding: 1rem; border-radius: 8px; font-weight: 700; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
      <i data-lucide="check-circle" style="width: 18px; height: 18px;"></i> <?= $msg ?>
    </div>
  <?php endif; ?>

  <?php if ($error): ?>
    <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #DC2626; padding: 1rem; border-radius: 8px; font-weight: 700; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
      <i data-lucide="alert-triangle" style="width: 18px; height: 18px;"></i> <?= htmlspecialchars($error) ?>
    </div>
  <?php endif; ?>

  <form method="POST" action="" class="card" style="max-width: 800px; padding: 1.5rem;">
    <!-- Step 1: Customer Details -->
    <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color); color: #1E1B4B;">
      1. Customer Details
    </h3>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
      <div>
        <label class="form-label" style="font-size: 0.85rem;">Mobile Number <span style="color: #EF4444;">*</span></label>
        <div style="position: relative;">
          <input type="text" name="customer_phone" class="form-control" placeholder="+91 9876543210" required />
          <i data-lucide="phone" style="position: absolute; right: 12px; top: 12px; width: 16px; color: var(--text-muted);"></i>
        </div>
      </div>
      <div>
        <label class="form-label" style="font-size: 0.85rem;">Customer Name <span style="color: #EF4444;">*</span></label>
        <div style="position: relative;">
          <input type="text" name="customer_name" class="form-control" placeholder="E.g. Rahul Sharma" required />
          <i data-lucide="user" style="position: absolute; right: 12px; top: 12px; width: 16px; color: var(--text-muted);"></i>
        </div>
      </div>
    </div>

    <!-- Step 2: Address (Optional for walk-in, but good to have) -->
    <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color); color: #1E1B4B;">
      2. Delivery Address (Optional)
    </h3>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
      <div>
        <label class="form-label" style="font-size: 0.85rem;">Society / Building Name</label>
        <input type="text" name="society" class="form-control" placeholder="E.g. Sunshine Apartments" />
      </div>
      <div>
        <label class="form-label" style="font-size: 0.85rem;">Tower / Flat No</label>
        <input type="text" name="flat" class="form-control" placeholder="E.g. A-102" />
      </div>
    </div>

    <!-- Step 3: Service Selection -->
    <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color); color: #1E1B4B;">
      3. Service Details
    </h3>

    <div style="background: rgba(129, 98, 238, 0.05); padding: 1rem; border-radius: 8px; border: 1px dashed rgba(129, 98, 238, 0.3); margin-bottom: 1.5rem;">
      <div style="display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 250px;">
          <label class="form-label" style="font-size: 0.85rem;">Select Service</label>
          <select id="serviceSelect" class="form-control">
            <option value="" data-price="0">-- Select a Service --</option>
            <?php foreach ($availableServices as $srv): ?>
              <option value="<?= htmlspecialchars($srv['name']) ?>" data-price="<?= $srv['price'] ?>">
                <?= htmlspecialchars($srv['name']) ?> - ₹<?= $srv['price'] ?>
              </option>
            <?php endforeach; ?>
          </select>
        </div>
        <div style="width: 100px;">
          <label class="form-label" style="font-size: 0.85rem;">Quantity</label>
          <input type="number" id="serviceQty" class="form-control" value="1" min="1" />
        </div>
        <div>
          <button type="button" id="addItemBtn" class="btn btn-secondary" style="height: 42px; display: flex; align-items: center; gap: 0.4rem;">
            <i data-lucide="plus" style="width: 16px;"></i> Add Item
          </button>
        </div>
      </div>

      <table class="table" style="margin-top: 1.25rem; font-size: 0.85rem; background: #FFF; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <thead style="background: var(--bg-card);">
          <tr>
            <th style="padding: 0.75rem;">Item / Service</th>
            <th style="padding: 0.75rem; text-align: center;">Qty</th>
            <th style="padding: 0.75rem; text-align: right;">Price (₹)</th>
            <th style="padding: 0.75rem; text-align: right;">Total (₹)</th>
            <th style="padding: 0.75rem; text-align: center; width: 50px;"></th>
          </tr>
        </thead>
        <tbody id="itemsList">
          <!-- JS Dynamic Items -->
          <tr id="emptyRow">
            <td colspan="5" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">No items added yet.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Hidden Input for passing JSON to backend -->
    <input type="hidden" name="services_json" id="servicesJson" value="[]" />

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
      <div>
        <label class="form-label" style="font-size: 0.85rem;">Total Amount (₹) <span style="color: #EF4444;">*</span></label>
        <input type="number" id="totalAmount" name="total_amount" class="form-control" placeholder="0.00" required step="0.01" />
      </div>
      <div>
        <label class="form-label" style="font-size: 0.85rem;">Payment Method</label>
        <select name="payment_method" class="form-control">
          <option value="COD">Cash (COD)</option>
          <option value="UPI">UPI / Online</option>
          <option value="CARD">Credit/Debit Card</option>
        </select>
      </div>
    </div>

    <div style="display: flex; gap: 1rem; justify-content: flex-end; border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
      <a href="<?= ADMIN_BASE_URL ?>/orders/index.php" class="btn btn-secondary" style="font-weight: 700;">Cancel</a>
      <button type="submit" class="btn btn-primary" style="display: flex; align-items: center; gap: 0.4rem; font-weight: 700;">
        <i data-lucide="check-circle" style="width: 16px; height: 16px;"></i> Confirm Booking
      </button>
    </div>
  </form>
</div>

<script>
  lucide.createIcons();

  let orderItems = [];

  const serviceSelect = document.getElementById('serviceSelect');
  const serviceQty = document.getElementById('serviceQty');
  const addItemBtn = document.getElementById('addItemBtn');
  const itemsList = document.getElementById('itemsList');
  const totalAmountInput = document.getElementById('totalAmount');
  const servicesJsonInput = document.getElementById('servicesJson');

  addItemBtn.addEventListener('click', () => {
    const option = serviceSelect.options[serviceSelect.selectedIndex];
    if (!option || !option.value) return;

    const name = option.value;
    const price = parseFloat(option.getAttribute('data-price'));
    const qty = parseInt(serviceQty.value) || 1;

    orderItems.push({ name, price, qty, total: price * qty });
    renderItems();

    // Reset inputs
    serviceSelect.value = '';
    serviceQty.value = '1';
  });

  function removeItem(index) {
    orderItems.splice(index, 1);
    renderItems();
  }

  function renderItems() {
    itemsList.innerHTML = '';
    let grandTotal = 0;

    if (orderItems.length === 0) {
      itemsList.innerHTML = `<tr id="emptyRow"><td colspan="5" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">No items added yet.</td></tr>`;
      totalAmountInput.value = '';
      servicesJsonInput.value = '[]';
      return;
    }

    orderItems.forEach((item, index) => {
      grandTotal += item.total;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding: 0.75rem; font-weight: 600;">${item.name}</td>
        <td style="padding: 0.75rem; text-align: center;">${item.qty}</td>
        <td style="padding: 0.75rem; text-align: right;">${item.price.toFixed(2)}</td>
        <td style="padding: 0.75rem; text-align: right; font-weight: 700; color: #10B981;">${item.total.toFixed(2)}</td>
        <td style="padding: 0.75rem; text-align: center;">
          <button type="button" onclick="removeItem(${index})" style="background: none; border: none; color: #EF4444; cursor: pointer;">
            <i data-lucide="trash-2" style="width: 14px;"></i>
          </button>
        </td>
      `;
      itemsList.appendChild(tr);
    });

    lucide.createIcons();
    totalAmountInput.value = grandTotal.toFixed(2);
    servicesJsonInput.value = JSON.stringify(orderItems);
  }
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
