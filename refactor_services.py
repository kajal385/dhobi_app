import re

file_path = 'admin_panel_php/services/index.php'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the default $_SESSION populators
content = re.sub(r'if \(!isset\(\$_SESSION\[\'cat_store\'\]\)\) \{.*?\n\}\n', '', content, flags=re.DOTALL)
content = re.sub(r'if \(!isset\(\$_SESSION\[\'srv_store\'\]\)\) \{.*?\n\}\n', '', content, flags=re.DOTALL)

# Replace the POST block and fetching block
new_php_logic = """// Dynamic DB Fetching via API
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
$catRes = apiGet('/categories', $shopIdQuery);
if ($catRes['success'] && !empty($catRes['data'])) {
    $categories = $catRes['data'];
}

$srvRes = apiGet('/admin/shop-services', $shopIdQuery);
if ($srvRes['success'] && !empty($srvRes['data'])) {
    $services = $srvRes['data'];
}

"""

# Replace the block from $_SERVER['REQUEST_METHOD'] === 'POST' up to the $categories / $services assignment
content = re.sub(r"if \(\$_SERVER\['REQUEST_METHOD'\] === 'POST'\) \{.*?\$services = array_values\(\$_SESSION\['srv_store'\]\);\n\?>", new_php_logic + "?>", content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated services index.php")
