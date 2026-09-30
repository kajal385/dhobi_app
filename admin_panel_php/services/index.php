<?php
$pageTitle = 'Service & Category Catalog';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';

$isOwner = isLaundryOwner();
$shopId = currentShopId();

$msg = null;

// Initialize session state storage if needed
if (!isset($_SESSION['cat_store'])) {
    $_SESSION['cat_store'] = [
        '1' => ['id' => '1', 'name' => 'Wash & Fold', 'icon' => '🧺', 'description' => 'Everyday casual wear and towels washing & fold', 'status' => 'ACTIVE', 'activeServicesCount' => 12],
        '2' => ['id' => '2', 'name' => 'Wash & Iron', 'icon' => '👔', 'description' => 'Clean wash with crisp crease steam ironing', 'status' => 'ACTIVE', 'activeServicesCount' => 18],
        '3' => ['id' => '3', 'name' => 'Dry Cleaning', 'icon' => '🧥', 'description' => 'Premium eco-friendly dry cleaning for suits & dresses', 'status' => 'ACTIVE', 'activeServicesCount' => 24],
        '4' => ['id' => '4', 'name' => 'Steam Press Only', 'icon' => '♨️', 'description' => 'Professional wrinkle-free steam ironing and crisp folding', 'status' => 'ACTIVE', 'activeServicesCount' => 14],
        '5' => ['id' => '5', 'name' => 'Shoe Cleaning', 'icon' => '👟', 'description' => 'Deep cleaning, sanitization & polish for sports/leather shoes', 'status' => 'ACTIVE', 'activeServicesCount' => 8],
        '6' => ['id' => '6', 'name' => 'Carpet Cleaning', 'icon' => '🧼', 'description' => 'Deep vacuum and shampoo wash for rugs & carpets', 'status' => 'ACTIVE', 'activeServicesCount' => 6],
        '7' => ['id' => '7', 'name' => 'Blanket Cleaning', 'icon' => '🛏️', 'description' => 'Blankets, quilts, winter jackets & heavy woolens care', 'status' => 'ACTIVE', 'activeServicesCount' => 15],
        '8' => ['id' => '8', 'name' => 'Curtain Cleaning', 'icon' => '🪟', 'description' => 'Dust removal, gentle wash and vertical steam ironing', 'status' => 'ACTIVE', 'activeServicesCount' => 9],
    ];
}

if (!isset($_SESSION['srv_store'])) {
    $_SESSION['srv_store'] = [
        '1' => ['id' => '1', 'name' => 'Wash & Fold - T-Shirt / Shirt', 'category' => 'Wash & Fold', 'price' => 35, 'unit' => 'piece', 'status' => 'ACTIVE'],
        '2' => ['id' => '2', 'name' => 'Wash & Fold - Trousers / Jeans', 'category' => 'Wash & Fold', 'price' => 50, 'unit' => 'piece', 'status' => 'ACTIVE'],
        '3' => ['id' => '3', 'name' => 'Wash & Steam Iron - Kurta / Pyjama', 'category' => 'Wash & Iron', 'price' => 90, 'unit' => 'piece', 'status' => 'ACTIVE'],
        '4' => ['id' => '4', 'name' => 'Wash & Steam Iron - Formal Shirt', 'category' => 'Wash & Iron', 'price' => 55, 'unit' => 'piece', 'status' => 'ACTIVE'],
        '5' => ['id' => '5', 'name' => 'Dry Clean - 2-Piece Business Suit', 'category' => 'Dry Cleaning', 'price' => 350, 'unit' => 'set', 'status' => 'ACTIVE'],
        '6' => ['id' => '6', 'name' => 'Dry Clean - Heavy Silk / Designer Saree', 'category' => 'Dry Cleaning', 'price' => 220, 'unit' => 'piece', 'status' => 'ACTIVE'],
        '7' => ['id' => '7', 'name' => 'Steam Press - Blazer / Coat', 'category' => 'Steam Press Only', 'price' => 80, 'unit' => 'piece', 'status' => 'ACTIVE'],
        '8' => ['id' => '8', 'name' => 'Shoe Care - Sneakers Deep Spa Clean', 'category' => 'Shoe Cleaning', 'price' => 299, 'unit' => 'pair', 'status' => 'ACTIVE'],
        '9' => ['id' => '9', 'name' => 'Home Care - Heavy Blanket & Quilt Wash', 'category' => 'Blanket Cleaning', 'price' => 350, 'unit' => 'piece', 'status' => 'ACTIVE'],
    ];
}

// POST Handlers for Categories and Services
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'create_category') {
        $cName = trim($_POST['name'] ?? '');
        $cIcon = trim($_POST['icon'] ?? '🧺');
        $cDesc = trim($_POST['description'] ?? '');
        if ($cName) {
            $newId = strval(count($_SESSION['cat_store']) + 1);
            $catItem = [
                'id' => $newId,
                'name' => $cName,
                'icon' => $cIcon,
                'description' => $cDesc,
                'status' => 'ACTIVE',
                'activeServicesCount' => 0
            ];
            $_SESSION['cat_store'][$newId] = $catItem;
            apiPost('/categories', $catItem);
            $msg = "New category '{$cName}' created successfully!";
        }
    } elseif ($action === 'edit_category') {
        $catId = strval($_POST['category_id'] ?? '');
        $cName = trim($_POST['name'] ?? '');
        $cIcon = trim($_POST['icon'] ?? '🧺');
        $cDesc = trim($_POST['description'] ?? '');
        $cStatus = $_POST['status'] ?? 'ACTIVE';

        if ($catId && isset($_SESSION['cat_store'][$catId])) {
            $_SESSION['cat_store'][$catId]['name'] = $cName;
            $_SESSION['cat_store'][$catId]['icon'] = $cIcon;
            $_SESSION['cat_store'][$catId]['description'] = $cDesc;
            $_SESSION['cat_store'][$catId]['status'] = $cStatus;

            apiPut("/categories/{$catId}", [
                'name' => $cName,
                'icon' => $cIcon,
                'description' => $cDesc,
                'status' => $cStatus,
            ]);
            $msg = "Category '{$cName}' updated and saved successfully!";
        }
    } elseif ($action === 'delete_category') {
        $catId = strval($_POST['category_id'] ?? '');
        if ($catId && isset($_SESSION['cat_store'][$catId])) {
            $deletedName = $_SESSION['cat_store'][$catId]['name'];
            unset($_SESSION['cat_store'][$catId]);
            apiDelete("/categories/{$catId}");
            $msg = "Category '{$deletedName}' removed from catalog.";
        }
    } elseif ($action === 'create_service') {
        $sName = trim($_POST['name'] ?? '');
        $sCat = trim($_POST['category'] ?? 'Wash & Fold');
        $sPrice = floatval($_POST['price'] ?? 50);
        $sUnit = trim($_POST['unit'] ?? 'piece');

        if ($sName) {
            $newId = strval(count($_SESSION['srv_store']) + 1);
            $srvItem = [
                'id' => $newId,
                'name' => $sName,
                'category' => $sCat,
                'price' => $sPrice,
                'unit' => $sUnit,
                'status' => 'ACTIVE'
            ];
            $_SESSION['srv_store'][$newId] = $srvItem;

            if ($isOwner && $shopId) {
                apiPost('/owner/services', array_merge($srvItem, ['shop_id' => $shopId]));
            } else {
                apiPost('/services/master', $srvItem);
            }
            $msg = "Service '{$sName}' added at ₹{$sPrice}/{$sUnit}!";
        }
    } elseif ($action === 'edit_service') {
        $srvId = strval($_POST['service_id'] ?? '');
        $sName = trim($_POST['name'] ?? '');
        $sCat = trim($_POST['category'] ?? 'Wash & Fold');
        $sPrice = floatval($_POST['price'] ?? 50);
        $sUnit = trim($_POST['unit'] ?? 'piece');
        $sStatus = $_POST['status'] ?? 'ACTIVE';

        if ($srvId && isset($_SESSION['srv_store'][$srvId])) {
            $_SESSION['srv_store'][$srvId]['name'] = $sName;
            $_SESSION['srv_store'][$srvId]['category'] = $sCat;
            $_SESSION['srv_store'][$srvId]['price'] = $sPrice;
            $_SESSION['srv_store'][$srvId]['unit'] = $sUnit;
            $_SESSION['srv_store'][$srvId]['status'] = $sStatus;

            $payload = [
                'name' => $sName,
                'category' => $sCat,
                'price' => $sPrice,
                'unit' => $sUnit,
                'status' => $sStatus
            ];
            if ($isOwner && $shopId) {
                apiPut("/owner/services/{$srvId}", $payload);
            } else {
                apiPut("/services/master/{$srvId}", $payload);
            }
            $msg = "Service '{$sName}' updated to ₹{$sPrice}/{$sUnit} ({$sStatus})!";
        }
    } elseif ($action === 'delete_service') {
        $srvId = strval($_POST['service_id'] ?? '');
        if ($srvId && isset($_SESSION['srv_store'][$srvId])) {
            $deletedName = $_SESSION['srv_store'][$srvId]['name'];
            unset($_SESSION['srv_store'][$srvId]);
            if ($isOwner && $shopId) {
                apiDelete("/owner/services/{$srvId}");
            } else {
                apiDelete("/services/master/{$srvId}");
            }
            $msg = "Service '{$deletedName}' removed from catalog.";
        }
    }
}

// Active categories & services list from session store
$categories = array_values($_SESSION['cat_store']);
$services = array_values($_SESSION['srv_store']);
?>

<div style="color: var(--text-primary);">
  <!-- Page Header -->
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary); margin: 0;">
        <i data-lucide="layers" style="width: 28px; height: 28px; color: #8162EE;"></i> 
        <?= $isOwner ? 'My Shop Services & Menu Prices' : 'Service & Master Category Management' ?>
      </h1>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.2rem; margin-bottom: 0;">
        Global catalog of wash categories, garment price points, express multipliers, and turnaround hours.
      </p>
    </div>

    <div style="display: flex; gap: 0.75rem;">
      <button onclick="openModal('addCategoryModal')" class="btn btn-secondary" style="font-weight: 700; display: flex; align-items: center; gap: 0.4rem; border-radius: 8px;">
        <i data-lucide="plus" style="width: 16px; height: 16px;"></i> Add Category
      </button>
      <button onclick="openModal('addServiceModal')" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; font-weight: 700; display: flex; align-items: center; gap: 0.4rem; padding: 0.65rem 1.25rem; border-radius: 8px; box-shadow: 0 4px 14px rgba(129,98,238,0.35);">
        <i data-lucide="plus" style="width: 16px; height: 16px;"></i> Add Service Item
      </button>
    </div>
  </div>

  <?php if ($msg): ?>
    <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #059669; padding: 0.75rem 1rem; border-radius: 8px; font-weight: 700; font-size: 0.85rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
      <i data-lucide="check-circle" style="width: 18px; height: 18px;"></i> <?= htmlspecialchars($msg) ?>
    </div>
  <?php endif; ?>

  <!-- Categories Card Grid with Edit & Delete Controls -->
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
    <h2 style="font-size: 1.15rem; font-weight: 800; margin: 0; color: var(--brand-purple);">
      Wash &amp; Care Categories (<?= count($categories) ?> Active)
    </h2>
    <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">Click "Edit" on any card to modify title, icon, or description</span>
  </div>

  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
    <?php foreach ($categories as $cat): 
        $cId = $cat['id'];
        $cName = $cat['name'] ?? 'Category';
        $cDesc = $cat['description'] ?? 'Wash care category';
        $cIcon = !empty($cat['icon']) ? $cat['icon'] : '🧺';
        $cStatus = strtoupper($cat['status'] ?? 'ACTIVE');
    ?>
      <div class="card" style="padding: 1.25rem; border-radius: 14px; border: 1px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)';" onmouseout="this.style.transform='none';">
        <div>
          <!-- Card Header with Icon & Action Buttons -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
            <div style="font-size: 2.2rem; line-height: 1;"><?= htmlspecialchars($cIcon) ?></div>
            
            <div style="display: flex; gap: 0.4rem; align-items: center;">
              <!-- Edit Category Button -->
              <button 
                type="button" 
                onclick="openEditCategoryModal(<?= htmlspecialchars(json_encode($cat)) ?>)" 
                class="btn btn-secondary btn-sm" 
                style="padding: 0.35rem 0.65rem; border-radius: 6px; font-weight: 700; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.25rem;"
                title="Edit Category Details"
              >
                <i data-lucide="edit-3" style="width: 13px; height: 13px;"></i> Edit
              </button>

              <!-- Delete Category Button -->
              <form method="POST" action="" onsubmit="return confirm('Delete category <?= htmlspecialchars($cName) ?>?');" style="display: inline;">
                <input type="hidden" name="action" value="delete_category">
                <input type="hidden" name="category_id" value="<?= htmlspecialchars($cId) ?>">
                <button type="submit" class="btn btn-secondary btn-sm" style="color: #EF4444; padding: 0.35rem 0.55rem; border-radius: 6px;" title="Delete Category">
                  <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
                </button>
              </form>
            </div>
          </div>

          <h3 style="margin: 0; font-size: 1.1rem; font-weight: 800; color: var(--text-primary);"><?= htmlspecialchars($cName) ?></h3>
          <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0.4rem 0 0.85rem 0; line-height: 1.4;"><?= htmlspecialchars($cDesc) ?></p>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.75rem; margin-top: 0.5rem;">
          <span class="badge badge-<?= $cStatus === 'ACTIVE' ? 'success' : 'danger' ?>" style="font-size: 0.72rem; font-weight: 800;">
            <?= $cStatus ?>
          </span>
          <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">
            ID: #CAT-<?= htmlspecialchars($cId) ?>
          </span>
        </div>
      </div>
    <?php endforeach; ?>
  </div>

  <!-- Master Services Items Table with Edit & Price Actions -->
  <div class="card" style="padding: 1.5rem; border-radius: 16px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
      <div>
        <h2 style="font-size: 1.15rem; font-weight: 800; margin: 0; color: var(--brand-purple);">
          Garment Service Items &amp; Price Catalog
        </h2>
        <p style="margin: 0.15rem 0 0 0; font-size: 0.8rem; color: var(--text-secondary);">
          Customer prices, billing units, and category classifications
        </p>
      </div>

      <button onclick="openModal('addServiceModal')" class="btn btn-secondary btn-sm" style="font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;">
        <i data-lucide="plus" style="width: 14px; height: 14px;"></i> Add New Item
      </button>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Service Item Name</th>
            <th>Category</th>
            <th>Customer Price</th>
            <th>Pricing Unit</th>
            <th>Catalog Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($services as $srv): 
              $sId = $srv['id'];
              $sName = $srv['name'] ?? 'Service Item';
              $sCat = $srv['category'] ?? 'Wash & Fold';
              $sPrice = floatval($srv['price'] ?? 50);
              $sUnit = $srv['unit'] ?? 'piece';
              $sStatus = strtoupper($srv['status'] ?? 'ACTIVE');
          ?>
            <tr>
              <td>
                <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-primary);"><?= htmlspecialchars($sName) ?></div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">Item Code: SVC-<?= htmlspecialchars($sId) ?></div>
              </td>
              <td>
                <span class="badge" style="background: rgba(129,98,238,0.12); color: #8162EE; font-weight: 800; font-size: 0.78rem;">
                  <?= htmlspecialchars($sCat) ?>
                </span>
              </td>
              <td>
                <strong style="color: #10B981; font-size: 1.1rem; font-weight: 900;">₹<?= number_format($sPrice, 2) ?></strong>
              </td>
              <td>
                <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 600;">per <?= htmlspecialchars($sUnit) ?></span>
              </td>
              <td>
                <span class="badge badge-<?= $sStatus === 'ACTIVE' ? 'success' : 'danger' ?>" style="font-size: 0.75rem; font-weight: 800;">
                  <?= $sStatus ?>
                </span>
              </td>
              <td>
                <div style="display: flex; gap: 0.4rem; align-items: center; white-space: nowrap;">
                  <button 
                    type="button" 
                    onclick="openEditServiceModal(<?= htmlspecialchars(json_encode($srv)) ?>)" 
                    class="btn btn-secondary btn-sm"
                    style="display: inline-flex; align-items: center; gap: 0.25rem; font-weight: 700;"
                    title="Edit Service & Price"
                  >
                    <i data-lucide="edit-3" style="width: 13px; height: 13px;"></i> Edit Price
                  </button>

                  <form method="POST" action="" onsubmit="return confirm('Remove service <?= htmlspecialchars($sName) ?>?');" style="display: inline;">
                    <input type="hidden" name="action" value="delete_service">
                    <input type="hidden" name="service_id" value="<?= htmlspecialchars($sId) ?>">
                    <button type="submit" class="btn btn-secondary btn-sm" style="color: #EF4444; padding: 0.4rem 0.6rem;" title="Delete Service">
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

<!-- Modal: Add Category -->
<div id="addCategoryModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(6px); align-items: center; justify-content: center; z-index: 99999; padding: 1rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 480px; padding: 1.75rem; color: var(--text-primary); box-shadow: 0 25px 50px rgba(0,0,0,0.4);">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
      <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--brand-purple);">Create New Wash Category</h3>
      <button onclick="closeModal('addCategoryModal')" style="background: var(--bg-input); border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer;">✕</button>
    </div>
    <form method="POST" action="">
      <input type="hidden" name="action" value="create_category">
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Category Name *</label>
        <input type="text" name="name" class="form-control" placeholder="e.g. Leather Care &amp; Spa" required style="width: 100%;">
      </div>
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Icon Emoji</label>
        <input type="text" name="icon" class="form-control" value="🧼" style="width: 100%;">
      </div>
      <div class="form-group" style="margin-bottom: 1.5rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Short Description</label>
        <textarea name="description" class="form-control" rows="2" placeholder="Brief explanation of items handled in this category..." style="width: 100%;"></textarea>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('addCategoryModal')" class="btn btn-secondary" style="font-weight: 700;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.6rem 1.4rem; border-radius: 8px; font-weight: 800;">Create Category</button>
      </div>
    </form>
  </div>
</div>

<!-- Modal: Edit Category (Allows editing & saving changes) -->
<div id="editCategoryModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); align-items: center; justify-content: center; z-index: 99999; padding: 1.5rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 500px; padding: 1.75rem; color: var(--text-primary); box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
      <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--brand-purple);">Edit Wash Category</h3>
      <button onclick="closeModal('editCategoryModal')" style="background: var(--bg-input); border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer;">✕</button>
    </div>
    <form method="POST" action="">
      <input type="hidden" name="action" value="edit_category">
      <input type="hidden" id="editCatId" name="category_id" value="">

      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Category Name *</label>
        <input type="text" id="editCatName" name="name" class="form-control" required style="width: 100%;">
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Icon Emoji</label>
          <input type="text" id="editCatIcon" name="icon" class="form-control" required style="width: 100%;">
        </div>
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Catalog Status</label>
          <select id="editCatStatus" name="status" class="form-control" style="width: 100%;">
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
      </div>

      <div class="form-group" style="margin-bottom: 1.5rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Short Description</label>
        <textarea id="editCatDesc" name="description" class="form-control" rows="2" style="width: 100%;"></textarea>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('editCategoryModal')" class="btn btn-secondary" style="font-weight: 700;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.65rem 1.5rem; border-radius: 8px; font-weight: 800;">
          Save Changes
        </button>
      </div>
    </form>
  </div>
</div>

<!-- Modal: Add Service Item -->
<div id="addServiceModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(6px); align-items: center; justify-content: center; z-index: 99999; padding: 1rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 480px; padding: 1.75rem; color: var(--text-primary); box-shadow: 0 25px 50px rgba(0,0,0,0.4);">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
      <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--brand-purple);">Add Service Item</h3>
      <button onclick="closeModal('addServiceModal')" style="background: var(--bg-input); border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer;">✕</button>
    </div>
    <form method="POST" action="">
      <input type="hidden" name="action" value="create_service">
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Service Item Name *</label>
        <input type="text" name="name" class="form-control" placeholder="e.g. Kurta Wash &amp; Steam Press" required style="width: 100%;">
      </div>
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Category</label>
        <select name="category" class="form-control" style="width: 100%;">
          <?php foreach ($categories as $cat): ?>
            <option value="<?= htmlspecialchars($cat['name']) ?>"><?= htmlspecialchars($cat['name']) ?></option>
          <?php endforeach; ?>
        </select>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Base Price (₹) *</label>
          <input type="number" name="price" class="form-control" value="79" step="0.5" required style="width: 100%;">
        </div>
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Pricing Unit</label>
          <select name="unit" class="form-control" style="width: 100%;">
            <option value="piece">per piece</option>
            <option value="pair">per pair</option>
            <option value="kg">per kg</option>
            <option value="set">per set</option>
          </select>
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('addServiceModal')" class="btn btn-secondary" style="font-weight: 700;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.6rem 1.4rem; border-radius: 8px; font-weight: 800;">Save Service</button>
      </div>
    </form>
  </div>
</div>

<!-- Modal: Edit Service Item & Price (Allows editing & saving changes) -->
<div id="editServiceModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); align-items: center; justify-content: center; z-index: 99999; padding: 1.5rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 500px; padding: 1.75rem; color: var(--text-primary); box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
      <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--brand-purple);">Edit Service Item &amp; Price</h3>
      <button onclick="closeModal('editServiceModal')" style="background: var(--bg-input); border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer;">✕</button>
    </div>
    <form method="POST" action="">
      <input type="hidden" name="action" value="edit_service">
      <input type="hidden" id="editSrvId" name="service_id" value="">

      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Service Item Name *</label>
        <input type="text" id="editSrvName" name="name" class="form-control" required style="width: 100%;">
      </div>

      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Category</label>
        <select id="editSrvCategory" name="category" class="form-control" style="width: 100%;">
          <?php foreach ($categories as $cat): ?>
            <option value="<?= htmlspecialchars($cat['name']) ?>"><?= htmlspecialchars($cat['name']) ?></option>
          <?php endforeach; ?>
        </select>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Customer Price (₹) *</label>
          <input type="number" id="editSrvPrice" name="price" class="form-control" step="0.5" required style="width: 100%;">
        </div>
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Pricing Unit</label>
          <select id="editSrvUnit" name="unit" class="form-control" style="width: 100%;">
            <option value="piece">per piece</option>
            <option value="pair">per pair</option>
            <option value="kg">per kg</option>
            <option value="set">per set</option>
          </select>
        </div>
      </div>

      <div class="form-group" style="margin-bottom: 1.5rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Status</label>
        <select id="editSrvStatus" name="status" class="form-control" style="width: 100%;">
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('editServiceModal')" class="btn btn-secondary" style="font-weight: 700;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.65rem 1.5rem; border-radius: 8px; font-weight: 800;">
          Save Changes
        </button>
      </div>
    </form>
  </div>
</div>

<script>
  function openEditCategoryModal(cat) {
    document.getElementById('editCatId').value = cat.id || '';
    document.getElementById('editCatName').value = cat.name || '';
    document.getElementById('editCatIcon').value = cat.icon || '🧺';
    document.getElementById('editCatDesc').value = cat.description || '';
    document.getElementById('editCatStatus').value = cat.status || 'ACTIVE';
    openModal('editCategoryModal');
  }

  function openEditServiceModal(srv) {
    document.getElementById('editSrvId').value = srv.id || '';
    document.getElementById('editSrvName').value = srv.name || '';
    document.getElementById('editSrvCategory').value = srv.category || 'Wash & Fold';
    document.getElementById('editSrvPrice').value = srv.price || 50;
    document.getElementById('editSrvUnit').value = srv.unit || 'piece';
    document.getElementById('editSrvStatus').value = srv.status || 'ACTIVE';
    openModal('editServiceModal');
  }
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
