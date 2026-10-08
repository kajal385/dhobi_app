<?php
$pageTitle = 'Service & Category Catalog';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';

$isOwner = isLaundryOwner();
$shopId = currentShopId();

$msg = null;

// Initialize session state storage if needed


// POST Handlers for Categories and Services
// Dynamic DB Fetching via API
$categories = [];
$services = [];
$shopIdQuery = $isOwner ? ['shop_id' => $shopId] : [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    // -- CATEGORY HANDLERS --
    if ($action === 'create_category') {
        $cName = trim($_POST['name'] ?? '');
        if ($cName) {
            $catItem = [
                'name' => $cName,
                'icon' => trim($_POST['icon'] ?? '🧺'),
                'description' => trim($_POST['description'] ?? ''),
                'shop_id' => $isOwner ? $shopId : null,
                'is_active' => 1
            ];
            $res = apiPost('/categories', $catItem);
            if ($res['success']) $msg = "New category '{$cName}' created successfully!";
            else $msg = "Error creating category: " . ($res['error'] ?? 'Unknown');
        }
    } elseif ($action === 'edit_category') {
        $catId = strval($_POST['category_id'] ?? '');
        $cName = trim($_POST['name'] ?? '');
        if ($catId && $cName) {
            $res = apiPut("/categories/{$catId}", [
                'name' => $cName,
                'icon' => trim($_POST['icon'] ?? '🧺'),
                'description' => trim($_POST['description'] ?? ''),
                'is_active' => ($_POST['status'] ?? 'ACTIVE') === 'ACTIVE' ? 1 : 0
            ]);
            if ($res['success']) $msg = "Category '{$cName}' updated successfully!";
            else $msg = "Error updating category.";
        }
    } elseif ($action === 'delete_category') {
        $catId = strval($_POST['category_id'] ?? '');
        if ($catId) {
            $res = apiDelete("/categories/{$catId}");
            if ($res['success']) $msg = "Category removed.";
        }
    } 
    // -- SERVICE HANDLERS --
    elseif ($action === 'create_service') {
        $sName = trim($_POST['name'] ?? '');
        if ($sName) {
            $srvItem = [
                'name' => $sName,
                'category_id' => trim($_POST['category'] ?? ''),
                'price' => floatval($_POST['price'] ?? 50),
                'unit' => trim($_POST['unit'] ?? 'piece'),
                'shop_id' => $isOwner ? $shopId : null,
                'is_active' => 1
            ];
            $res = apiPost('/admin/shop-services', $srvItem); // Using new API
            if ($res['success']) $msg = "Service '{$sName}' added!";
            else $msg = "Error adding service: " . ($res['error'] ?? 'Unknown');
        }
    } elseif ($action === 'edit_service') {
        $srvId = strval($_POST['service_id'] ?? '');
        $sName = trim($_POST['name'] ?? '');
        if ($srvId && $sName) {
            $payload = [
                'name' => $sName,
                'category_id' => trim($_POST['category'] ?? ''),
                'price' => floatval($_POST['price'] ?? 50),
                'unit' => trim($_POST['unit'] ?? 'piece'),
                'is_active' => ($_POST['status'] ?? 'ACTIVE') === 'ACTIVE' ? 1 : 0
            ];
            $res = apiPut("/admin/shop-services/{$srvId}", $payload);
            if ($res['success']) $msg = "Service updated!";
        }
    } elseif ($action === 'delete_service') {
        $srvId = strval($_POST['service_id'] ?? '');
        if ($srvId) {
            apiDelete("/admin/shop-services/{$srvId}");
            $msg = "Service removed.";
        }
    }
}

// Fetch Latest State
$db = getDb();

$catRes = apiGet('/categories', $shopIdQuery);
if (!empty($catRes['data'])) {
    $categories = $catRes['data'];
} elseif ($db) {
    try {
        $st = $db->prepare("SELECT * FROM categories" . ($isOwner && $shopId ? " WHERE shop_id = :sid OR shop_id IS NULL" : "") . " ORDER BY name ASC");
        if ($isOwner && $shopId) $st->execute([':sid' => $shopId]);
        else $st->execute();
        $categories = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (\Throwable $t) {}
}

$srvRes = apiGet('/admin/shop-services', $shopIdQuery);
if (!empty($srvRes['data'])) {
    $services = $srvRes['data'];
} elseif ($db) {
    try {
        $st = $db->prepare("SELECT s.*, COALESCE(c.name, 'General') as category_name, COALESCE(ls.name, 'Laundry Shop') as shopName 
                            FROM shop_services s 
                            LEFT JOIN categories c ON s.category_id = c.id 
                            LEFT JOIN laundry_shops ls ON s.shop_id = ls.id " . 
                            ($isOwner && $shopId ? " WHERE s.shop_id = :sid" : "") . 
                            " ORDER BY s.id DESC");
        if ($isOwner && $shopId) $st->execute([':sid' => $shopId]);
        else $st->execute();
        $services = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (\Throwable $t) {}
}

if ($isOwner && $shopId && !empty($services)) {
    $services = array_values(array_filter($services, fn($s) => strval($s['shop_id'] ?? '') === strval($shopId) || empty($s['shop_id'])));
}
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
            <?php if (!$isOwner): ?><th>Laundry Shop</th><?php endif; ?>
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
              $sShopName = $srv['shopName'] ?? ('Shop #' . ($srv['shop_id'] ?? '30'));
          ?>
            <tr>
              <?php if (!$isOwner): ?>
              <td>
                <span style="background: rgba(99,102,241,0.1); color: #4F46E5; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.74rem; font-weight: 800;">
                  🏪 <?= htmlspecialchars($sShopName) ?>
                </span>
              </td>
              <?php endif; ?>
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
