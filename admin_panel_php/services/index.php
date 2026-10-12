<?php
$pageTitle = 'Service & Category Catalog';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';
require_once __DIR__ . '/../includes/db.php';

$isOwner = isLaundryOwner();
$ownerShopId = currentShopId();
$db = getDb();

$msg = null;
$msgType = 'success';

// Selected shop filter for Admin (defaults to null = all, or can filter by specific shop)
$selectedShopFilter = $isOwner ? $ownerShopId : (!empty($_GET['shop_id']) ? intval($_GET['shop_id']) : null);

// Fetch list of shops for dropdown filter and creation
$allShops = [];
if ($db) {
    try {
        $st = $db->query("SELECT id, name, owner_name FROM laundry_shops WHERE is_active=1 OR id IN (44, 47) ORDER BY name ASC");
        $allShops = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (\Throwable $t) {}
}

// POST Handlers for Categories and Services / Items
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    // -- CATEGORY HANDLERS --
    if ($action === 'create_category') {
        $cName = trim($_POST['name'] ?? '');
        $cIcon = trim($_POST['icon'] ?? '🧺');
        $cDesc = trim($_POST['description'] ?? '');
        if ($cName && $db) {
            try {
                $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '_', $cName));
                $st = $db->prepare("INSERT INTO categories (name, slug, icon, description, is_active, sort_order, created_at, updated_at) VALUES (:n, :s, :i, :d, 1, 99, NOW(), NOW())");
                $st->execute([':n' => $cName, ':s' => $slug, ':i' => $cIcon, ':d' => $cDesc]);
                $msg = "New category '{$cName}' created successfully!";
            } catch (\Throwable $t) {
                $msg = "Error creating category: " . $t->getMessage();
                $msgType = 'danger';
            }
        }
    } elseif ($action === 'edit_category') {
        $catId = intval($_POST['category_id'] ?? 0);
        $cName = trim($_POST['name'] ?? '');
        $cIcon = trim($_POST['icon'] ?? '🧺');
        $cDesc = trim($_POST['description'] ?? '');
        $cStatus = ($_POST['status'] ?? 'ACTIVE') === 'ACTIVE' ? 1 : 0;
        if ($catId && $cName && $db) {
            try {
                $st = $db->prepare("UPDATE categories SET name = :n, icon = :i, description = :d, is_active = :st, updated_at = NOW() WHERE id = :id");
                $st->execute([':n' => $cName, ':i' => $cIcon, ':d' => $cDesc, ':st' => $cStatus, ':id' => $catId]);
                $msg = "Category '{$cName}' updated successfully!";
            } catch (\Throwable $t) {
                $msg = "Error updating category: " . $t->getMessage();
                $msgType = 'danger';
            }
        }
    } elseif ($action === 'delete_category') {
        $catId = intval($_POST['category_id'] ?? 0);
        if ($catId && $db) {
            try {
                $db->prepare("DELETE FROM categories WHERE id = :id")->execute([':id' => $catId]);
                $msg = "Category removed successfully.";
            } catch (\Throwable $t) {
                $msg = "Error removing category: " . $t->getMessage();
                $msgType = 'danger';
            }
        }
    } 
    // -- SERVICE ITEM & PRICE HANDLERS --
    elseif ($action === 'create_service') {
        $targetShopId = $isOwner ? $ownerShopId : intval($_POST['shop_id'] ?? 47);
        $sName = trim($_POST['name'] ?? '');
        $catName = trim($_POST['category'] ?? 'Wash & Fold');
        $price = floatval($_POST['price'] ?? 50);
        $unit = trim($_POST['unit'] ?? 'piece');
        $pt = ($unit === 'kg') ? 'per_kg' : 'per_piece';
        $pricePerPiece = ($pt === 'per_piece') ? $price : null;
        $pricePerKg = ($pt === 'per_kg') ? $price : null;

        if ($sName && $targetShopId && $db) {
            try {
                // Find or match category
                $catStmt = $db->prepare("SELECT id FROM categories WHERE name = :n LIMIT 1");
                $catStmt->execute([':n' => $catName]);
                $catId = $catStmt->fetchColumn() ?: 1;

                // Find or create shop_services for this shop & category
                $ssStmt = $db->prepare("SELECT id FROM shop_services WHERE shop_id = :sid AND (category_id = :cid OR name = :sname) LIMIT 1");
                $ssStmt->execute([':sid' => $targetShopId, ':cid' => $catId, ':sname' => $catName]);
                $shopServiceId = $ssStmt->fetchColumn();

                if (!$shopServiceId) {
                    $insSS = $db->prepare("INSERT INTO shop_services (shop_id, category_id, name, description, icon, estimated_hours, is_active, sort_order, created_at, updated_at) 
                                           VALUES (:sid, :cid, :n, :d, '🧺', 24, 1, 1, NOW(), NOW())");
                    $insSS->execute([':sid' => $targetShopId, ':cid' => $catId, ':n' => $catName, ':d' => "High quality {$catName}"]);
                    $shopServiceId = $db->lastInsertId();
                }

                // Insert into service_items
                $insItem = $db->prepare("INSERT INTO service_items (shop_service_id, name, pricing_type, price_per_piece, price_per_kg, is_active, sort_order, created_at, updated_at) 
                                        VALUES (:ssid, :n, :pt, :ppp, :ppk, 1, 99, NOW(), NOW())");
                $insItem->execute([
                    ':ssid' => $shopServiceId,
                    ':n' => $sName,
                    ':pt' => $pt,
                    ':ppp' => $pricePerPiece,
                    ':ppk' => $pricePerKg
                ]);

                $msg = "Item '{$sName}' with price ₹{$price} added to {$catName} successfully!";
            } catch (\Throwable $t) {
                $msg = "Error adding service item: " . $t->getMessage();
                $msgType = 'danger';
            }
        }
    } elseif ($action === 'edit_service') {
        $itemId = intval($_POST['service_id'] ?? 0);
        $sName = trim($_POST['name'] ?? '');
        $price = floatval($_POST['price'] ?? 50);
        $unit = trim($_POST['unit'] ?? 'piece');
        $status = ($_POST['status'] ?? 'ACTIVE') === 'ACTIVE' ? 1 : 0;
        $pt = ($unit === 'kg') ? 'per_kg' : 'per_piece';
        $pricePerPiece = ($pt === 'per_piece') ? $price : null;
        $pricePerKg = ($pt === 'per_kg') ? $price : null;

        if ($itemId && $sName && $db) {
            try {
                $updStmt = $db->prepare("UPDATE service_items 
                                        SET name = :n, pricing_type = :pt, price_per_piece = :ppp, price_per_kg = :ppk, is_active = :st, updated_at = NOW() 
                                        WHERE id = :id");
                $updStmt->execute([
                    ':n' => $sName,
                    ':pt' => $pt,
                    ':ppp' => $pricePerPiece,
                    ':ppk' => $pricePerKg,
                    ':st' => $status,
                    ':id' => $itemId
                ]);
                $msg = "Item '{$sName}' price updated to ₹{$price} (" . ($status ? 'ACTIVE' : 'INACTIVE') . ")!";
            } catch (\Throwable $t) {
                $msg = "Error updating price: " . $t->getMessage();
                $msgType = 'danger';
            }
        }
    } elseif ($action === 'delete_service') {
        $itemId = intval($_POST['service_id'] ?? 0);
        if ($itemId && $db) {
            try {
                $db->prepare("DELETE FROM service_items WHERE id = :id")->execute([':id' => $itemId]);
                $msg = "Service item removed from catalog.";
            } catch (\Throwable $t) {
                $msg = "Error removing item: " . $t->getMessage();
                $msgType = 'danger';
            }
        }
    }
}

// Fetch Categories
$categories = [];
if ($db) {
    try {
        $st = $db->query("SELECT * FROM categories ORDER BY sort_order ASC, id ASC");
        $categories = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (\Throwable $t) {}
}

// Fetch Service Items with Prices, Shop Name, and Category
$serviceItems = [];
if ($db) {
    try {
        $sql = "SELECT 
                    si.id,
                    si.shop_service_id,
                    si.name as item_name,
                    si.pricing_type,
                    COALESCE(si.price_per_piece, si.price_per_kg, 50) as price,
                    si.price_per_piece,
                    si.price_per_kg,
                    si.is_active,
                    ss.id as service_id,
                    ss.name as service_name,
                    ss.shop_id,
                    COALESCE(c.name, ss.name, 'Wash & Care') as category_name,
                    COALESCE(c.icon, ss.icon, '🧺') as category_icon,
                    COALESCE(ls.name, CONCAT('Shop #', ss.shop_id)) as shop_name,
                    COALESCE(ls.owner_name, 'Owner') as owner_name
                FROM service_items si
                JOIN shop_services ss ON si.shop_service_id = ss.id
                LEFT JOIN categories c ON ss.category_id = c.id
                LEFT JOIN laundry_shops ls ON ss.shop_id = ls.id";

        if ($selectedShopFilter) {
            $sql .= " WHERE ss.shop_id = :sid";
        }
        $sql .= " ORDER BY ss.shop_id ASC, ss.sort_order ASC, si.sort_order ASC, si.id ASC";

        $st = $db->prepare($sql);
        if ($selectedShopFilter) {
            $st->execute([':sid' => $selectedShopFilter]);
        } else {
            $st->execute();
        }
        $serviceItems = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (\Throwable $t) {}
}
?>

<div style="color: var(--text-primary);">
  <!-- Page Header -->
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h1 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary); margin: 0;">
        <i data-lucide="layers" style="width: 28px; height: 28px; color: #8162EE;"></i> 
        <?= $isOwner ? 'My Shop Services & Menu Prices' : 'Laundry Shop Menu & Price Management' ?>
      </h1>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.2rem; margin-bottom: 0;">
        Set laundry categories, garment prices per piece/kg, and automatically sync them in real-time with the Customer App booking order screen.
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
    <div style="background: <?= $msgType === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)' ?>; border: 1px solid <?= $msgType === 'danger' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)' ?>; color: <?= $msgType === 'danger' ? '#EF4444' : '#059669' ?>; padding: 0.75rem 1rem; border-radius: 8px; font-weight: 700; font-size: 0.85rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
      <i data-lucide="<?= $msgType === 'danger' ? 'alert-circle' : 'check-circle' ?>" style="width: 18px; height: 18px;"></i> <?= htmlspecialchars($msg) ?>
    </div>
  <?php endif; ?>

  <!-- Categories Card Grid with Edit & Delete Controls -->
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
    <h2 style="font-size: 1.15rem; font-weight: 800; margin: 0; color: var(--brand-purple);">
      Wash &amp; Care Categories (<?= count($categories) ?> Active)
    </h2>
    <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">Displayed on Customer App homepage &amp; booking workflow</span>
  </div>

  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
    <?php foreach ($categories as $cat): 
        $cId = $cat['id'] ?? '';
        $cName = $cat['name'] ?? 'Category';
        $cDesc = $cat['description'] ?? 'Wash care category';
        $cIcon = !empty($cat['icon']) ? $cat['icon'] : '🧺';
        $cColor = $cat['color'] ?? '#8162EE';
        $cIsActive = !empty($cat['is_active']) || strtoupper($cat['status'] ?? '') === 'ACTIVE';
        $cStatus = $cIsActive ? 'ACTIVE' : 'INACTIVE';

        // Count linked items in this category
        $linkedCount = 0;
        foreach ($serviceItems as $srv) {
            if (strtolower($srv['category_name'] ?? '') === strtolower($cName)) {
                $linkedCount++;
            }
        }
    ?>
      <div class="card" style="padding: 1.25rem; border-radius: 16px; border: 1.5px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.2s, box-shadow 0.2s; background: var(--bg-card);" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 24px rgba(129,98,238,0.12)';" onmouseout="this.style.transform='none'; this.style.boxShadow='none';">
        <div>
          <!-- Card Header with Icon & Action Buttons -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.85rem;">
            <div style="width: 52px; height: 52px; border-radius: 14px; background: <?= $cColor ?>20; border: 1px solid <?= $cColor ?>40; display: flex; align-items: center; justify-content: center; font-size: 2rem; line-height: 1;">
              <?= htmlspecialchars($cIcon) ?>
            </div>
            
            <div style="display: flex; gap: 0.4rem; align-items: center;">
              <!-- Edit Category Button -->
              <button 
                type="button" 
                onclick="openEditCategoryModal(<?= htmlspecialchars(json_encode($cat)) ?>)" 
                class="btn btn-secondary btn-sm" 
                style="padding: 0.35rem 0.65rem; border-radius: 8px; font-weight: 700; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.3rem;"
                title="Edit Category Details"
              >
                <i data-lucide="edit-3" style="width: 13px; height: 13px;"></i> Edit
              </button>

              <!-- Delete Category Button -->
              <form method="POST" action="" onsubmit="return confirm('Delete category <?= htmlspecialchars($cName) ?>?');" style="display: inline;">
                <input type="hidden" name="action" value="delete_category">
                <input type="hidden" name="category_id" value="<?= htmlspecialchars($cId) ?>">
                <button type="submit" class="btn btn-secondary btn-sm" style="color: #EF4444; padding: 0.35rem 0.55rem; border-radius: 8px;" title="Delete Category">
                  <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
                </button>
              </form>
            </div>
          </div>

          <h3 style="margin: 0; font-size: 1.12rem; font-weight: 800; color: var(--text-primary); letter-spacing: -0.3px;"><?= htmlspecialchars($cName) ?></h3>
          <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0.4rem 0 0.85rem 0; line-height: 1.4; min-height: 2.4em;"><?= htmlspecialchars($cDesc) ?></p>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.75rem; margin-top: 0.5rem; flex-wrap: wrap; gap: 0.4rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="badge badge-<?= $cIsActive ? 'success' : 'danger' ?>" style="font-size: 0.72rem; font-weight: 800; padding: 0.2rem 0.55rem; border-radius: 12px;">
              <?= $cStatus ?>
            </span>
            <span style="font-size: 0.75rem; color: var(--brand-purple); font-weight: 700; background: rgba(129,98,238,0.08); padding: 0.15rem 0.5rem; border-radius: 6px;">
              👔 <?= $linkedCount ?> Garments
            </span>
          </div>
          <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">
            #CAT-<?= htmlspecialchars($cId) ?>
          </span>
        </div>
      </div>
    <?php endforeach; ?>
  </div>

  <!-- Master Services Items Table with Shop Filter & Edit Price Actions -->
  <div class="card" style="padding: 1.5rem; border-radius: 16px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
      <div>
        <h2 style="font-size: 1.15rem; font-weight: 800; margin: 0; color: var(--brand-purple);">
          Garment Service Items &amp; Owner Price Catalog (<?= count($serviceItems) ?> Items)
        </h2>
        <p style="margin: 0.15rem 0 0 0; font-size: 0.8rem; color: var(--text-secondary);">
          Prices set here appear directly when customers book orders with that laundry store.
        </p>
      </div>

      <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
        <?php if (!$isOwner): ?>
          <!-- Shop Filter Dropdown for Admin -->
          <form method="GET" action="" style="display: flex; align-items: center; gap: 0.4rem; margin: 0;">
            <label style="font-size: 0.82rem; font-weight: 700; color: var(--text-secondary);">Filter Store:</label>
            <select name="shop_id" onchange="this.form.submit()" class="form-control" style="padding: 0.4rem 0.75rem; font-size: 0.82rem; border-radius: 8px; font-weight: 700; background: var(--bg-card); color: var(--text-primary);">
              <option value="">All Laundry Stores</option>
              <?php foreach ($allShops as $s): ?>
                <option value="<?= $s['id'] ?>" <?= (strval($selectedShopFilter) === strval($s['id'])) ? 'selected' : '' ?>>
                  <?= htmlspecialchars($s['name']) ?> (Owner: <?= htmlspecialchars($s['owner_name']) ?>)
                </option>
              <?php endforeach; ?>
            </select>
          </form>
        <?php else: ?>
          <span style="background: rgba(129,98,238,0.12); color: #8162EE; padding: 0.35rem 0.75rem; border-radius: 8px; font-size: 0.82rem; font-weight: 800;">
            🏪 My Shop #<?= htmlspecialchars($ownerShopId) ?>
          </span>
        <?php endif; ?>

        <button onclick="openModal('addServiceModal')" class="btn btn-secondary btn-sm" style="font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;">
          <i data-lucide="plus" style="width: 14px; height: 14px;"></i> Add New Item
        </button>
      </div>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <?php if (!$isOwner): ?><th>Laundry Store &amp; Owner</th><?php endif; ?>
            <th>Garment Item Name</th>
            <th>Service Category</th>
            <th>Owner-Set Price</th>
            <th>Pricing Unit</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($serviceItems)): ?>
            <tr>
              <td colspan="<?= $isOwner ? 6 : 7 ?>" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                No service items found for the selected store. Click <strong>"Add Service Item"</strong> to configure garment pricing.
              </td>
            </tr>
          <?php else: ?>
            <?php foreach ($serviceItems as $srv): 
                $sId = $srv['id'];
                $sName = $srv['item_name'] ?? 'Garment';
                $sCat = $srv['category_name'] ?? 'Wash & Fold';
                $sCatIcon = $srv['category_icon'] ?? '🧺';
                $sPrice = floatval($srv['price'] ?? 50);
                $sUnit = ($srv['pricing_type'] === 'per_kg') ? 'kg' : 'piece';
                $sStatus = !empty($srv['is_active']) ? 'ACTIVE' : 'INACTIVE';
                $sShopName = $srv['shop_name'] ?? ('Shop #' . ($srv['shop_id'] ?? '47'));
                $sOwnerName = $srv['owner_name'] ?? 'Partner';
            ?>
              <tr>
                <?php if (!$isOwner): ?>
                <td>
                  <div style="font-weight: 800; font-size: 0.88rem; color: #4F46E5;">
                    🏪 <?= htmlspecialchars($sShopName) ?>
                  </div>
                  <div style="font-size: 0.73rem; color: var(--text-muted);">
                    👤 Owner: <?= htmlspecialchars($sOwnerName) ?>
                  </div>
                </td>
                <?php endif; ?>
                <td>
                  <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-primary);"><?= htmlspecialchars($sName) ?></div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">Item ID: #ITM-<?= htmlspecialchars($sId) ?></div>
                </td>
                <td>
                  <span class="badge" style="background: rgba(129,98,238,0.12); color: #8162EE; font-weight: 800; font-size: 0.78rem;">
                    <?= htmlspecialchars($sCatIcon) ?> <?= htmlspecialchars($sCat) ?>
                  </span>
                </td>
                <td>
                  <strong style="color: #10B981; font-size: 1.15rem; font-weight: 900;">₹<?= number_format($sPrice, 2) ?></strong>
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
                      onclick="openEditServiceModal(<?= htmlspecialchars(json_encode([
                        'id' => $sId,
                        'name' => $sName,
                        'category' => $sCat,
                        'price' => $sPrice,
                        'unit' => $sUnit,
                        'status' => $sStatus,
                        'shop_name' => $sShopName
                      ])) ?>)" 
                      class="btn btn-secondary btn-sm"
                      style="display: inline-flex; align-items: center; gap: 0.25rem; font-weight: 700;"
                      title="Edit Service & Price"
                    >
                      <i data-lucide="edit-3" style="width: 13px; height: 13px;"></i> Edit Price
                    </button>

                    <form method="POST" action="" onsubmit="return confirm('Remove garment item <?= htmlspecialchars($sName) ?>?');" style="display: inline;">
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
          <?php endif; ?>
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

<!-- Modal: Edit Category -->
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
      <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--brand-purple);">Add Garment Service Item</h3>
      <button onclick="closeModal('addServiceModal')" style="background: var(--bg-input); border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer;">✕</button>
    </div>
    <form method="POST" action="">
      <input type="hidden" name="action" value="create_service">

      <?php if (!$isOwner): ?>
      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Assign to Laundry Store *</label>
        <select name="shop_id" class="form-control" style="width: 100%;" required>
          <?php foreach ($allShops as $s): ?>
            <option value="<?= $s['id'] ?>" <?= ($selectedShopFilter == $s['id'] || $s['id'] == 47) ? 'selected' : '' ?>>
              <?= htmlspecialchars($s['name']) ?> (Owner: <?= htmlspecialchars($s['owner_name']) ?>)
            </option>
          <?php endforeach; ?>
        </select>
      </div>
      <?php endif; ?>

      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Garment Item Name *</label>
        <input type="text" name="name" class="form-control" placeholder="e.g. Formal Blazer or Silk Kurta" required style="width: 100%;">
      </div>

      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Service Category *</label>
        <select name="category" class="form-control" style="width: 100%;">
          <?php foreach ($categories as $cat): ?>
            <option value="<?= htmlspecialchars($cat['name']) ?>"><?= htmlspecialchars($cat['icon'] ?? '🧺') ?> <?= htmlspecialchars($cat['name']) ?></option>
          <?php endforeach; ?>
        </select>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Customer Price (₹) *</label>
          <input type="number" name="price" class="form-control" value="79" step="0.5" required style="width: 100%;">
        </div>
        <div>
          <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Pricing Unit</label>
          <select name="unit" class="form-control" style="width: 100%;">
            <option value="piece">per piece</option>
            <option value="kg">per kg</option>
          </select>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('addServiceModal')" class="btn btn-secondary" style="font-weight: 700;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.6rem 1.4rem; border-radius: 8px; font-weight: 800;">Save Item &amp; Price</button>
      </div>
    </form>
  </div>
</div>

<!-- Modal: Edit Service Item & Price -->
<div id="editServiceModal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); align-items: center; justify-content: center; z-index: 99999; padding: 1.5rem;">
  <div class="modal-content" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); width: 100%; max-width: 500px; padding: 1.75rem; color: var(--text-primary); box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
      <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--brand-purple);">Edit Item &amp; Owner Set Price</h3>
      <button onclick="closeModal('editServiceModal')" style="background: var(--bg-input); border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer;">✕</button>
    </div>
    <form method="POST" action="">
      <input type="hidden" name="action" value="edit_service">
      <input type="hidden" id="editSrvId" name="service_id" value="">

      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Garment Item Name *</label>
        <input type="text" id="editSrvName" name="name" class="form-control" required style="width: 100%;">
      </div>

      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Category</label>
        <input type="text" id="editSrvCategory" class="form-control" disabled style="width: 100%; opacity: 0.8;">
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
            <option value="kg">per kg</option>
          </select>
        </div>
      </div>

      <div class="form-group" style="margin-bottom: 1.5rem;">
        <label class="form-label" style="display: block; margin-bottom: 0.35rem; font-weight: 700;">Catalog Status</label>
        <select id="editSrvStatus" name="status" class="form-control" style="width: 100%;">
          <option value="ACTIVE">ACTIVE (Visible in Customer App)</option>
          <option value="INACTIVE">INACTIVE (Hidden in Customer App)</option>
        </select>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" onclick="closeModal('editServiceModal')" class="btn btn-secondary" style="font-weight: 700;">Cancel</button>
        <button type="submit" class="btn btn-primary" style="background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #FE9A5D 98.26%); color: #FFF; border: none; padding: 0.65rem 1.5rem; border-radius: 8px; font-weight: 800;">
          Save &amp; Sync Price
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
    document.getElementById('editCatStatus').value = (cat.is_active == 1 || cat.status === 'ACTIVE') ? 'ACTIVE' : 'INACTIVE';
    openModal('editCategoryModal');
  }

  function openEditServiceModal(srv) {
    document.getElementById('editSrvId').value = srv.id || '';
    document.getElementById('editSrvName').value = srv.name || '';
    document.getElementById('editSrvCategory').value = srv.category || 'Wash & Fold';
    document.getElementById('editSrvPrice').value = srv.price || 50;
    document.getElementById('editSrvUnit').value = srv.unit || 'piece';
    document.getElementById('editSrvStatus').value = (srv.status === 'INACTIVE' || srv.is_active == 0) ? 'INACTIVE' : 'ACTIVE';
    openModal('editServiceModal');
  }
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
