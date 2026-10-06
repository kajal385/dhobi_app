const fs = require('fs');
const filePath = 'admin_panel_php/shop-app/index.php';
let content = fs.readFileSync(filePath, 'utf-8');

// Replace the session store for banners
const replaceLogic = `
            if (move_uploaded_file($_FILES['banner_image']['tmp_name'], $uploadDir . $fname)) {
                require_once __DIR__ . '/../includes/db.php';
                $db = getDb();
                $stmt = $db->prepare("INSERT INTO banners (shop_id, title, image, is_active) VALUES (?, ?, ?, ?)");
                $stmt->execute([$shopId, htmlspecialchars(trim($_POST['banner_title'] ?? 'Banner')), '/uploads/banners/' . $fname, 1]);
                $actionMsg = 'Banner added successfully!';
            }
`;
content = content.replace(/if \(move_uploaded_file\(\$_FILES\['banner_image'\]\['tmp_name'\], \$uploadDir \. \$fname\)\) \{[\s\S]*?\$actionMsg = 'Banner added successfully!';\n\s*\}/, replaceLogic);

const deleteLogic = `
        $bid = $_POST['banner_id'] ?? '';
        if ($bid) {
            require_once __DIR__ . '/../includes/db.php';
            $db = getDb();
            $db->prepare("DELETE FROM banners WHERE id = ? AND shop_id = ?")->execute([$bid, $shopId]);
        }
`;
content = content.replace(/\$bid = \$_POST\['banner_id'\] \?\? '';\n\s*if \(!empty\(\$_SESSION\['shop_banners'\]\[\$shopId\]\)\)[\s\S]*?\$actionMsg = 'Banner removed.';/, deleteLogic + "        $actionMsg = 'Banner removed.';");

const toggleLogic = `
        $bid = $_POST['banner_id'] ?? '';
        if ($bid) {
            require_once __DIR__ . '/../includes/db.php';
            $db = getDb();
            $db->prepare("UPDATE banners SET is_active = NOT is_active WHERE id = ? AND shop_id = ?")->execute([$bid, $shopId]);
        }
`;
content = content.replace(/\$bid = \$_POST\['banner_id'\] \?\? '';\n\s*if \(!empty\(\$_SESSION\['shop_banners'\]\[\$shopId\]\)\)[\s\S]*?\$actionMsg = 'Banner status updated.';/, toggleLogic + "        $actionMsg = 'Banner status updated.';");


// Replace the fetch logic for banners
const fetchLogic = `
require_once __DIR__ . '/../includes/db.php';
$db = getDb();
$stmt = $db->prepare("SELECT id, title, image as url, is_active as active, DATE_FORMAT(created_at, '%d %b %Y') as added FROM banners WHERE shop_id = ?");
$stmt->execute([$shopId]);
$banners = $stmt->fetchAll(PDO::FETCH_ASSOC);
`;
content = content.replace(/\$banners\s*=\s*\$_SESSION\['shop_banners'\]\[\$shopId\]\s*\?\?\s*\[\];/, fetchLogic);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Updated shop-app index.php');
