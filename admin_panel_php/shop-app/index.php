<?php
$pageTitle = 'Customer App Management';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/api-client.php';

$isOwner   = isLaundryOwner();
$shopId    = strval(currentShopId() ?: '30');
$shopName  = currentShopName() ?: 'My Laundry Shop';
$currentUser = currentUser();

$actionMsg  = null;
$actionType = 'success';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $act = $_POST['action'] ?? '';
    if ($act === 'add_banner') {
        $uploadDir = __DIR__ . '/../uploads/banners/';
        if (!is_dir($uploadDir)) @mkdir($uploadDir, 0777, true);
        if (!empty($_FILES['banner_image']['name']) && $_FILES['banner_image']['error'] === UPLOAD_ERR_OK) {
            $ext = strtolower(pathinfo($_FILES['banner_image']['name'], PATHINFO_EXTENSION));
            $fname = 'banner_' . $shopId . '_' . time() . '.' . $ext;
            
            if (move_uploaded_file($_FILES['banner_image']['tmp_name'], $uploadDir . $fname)) {
                require_once __DIR__ . '/../includes/db.php';
                $db = getDb();
                $stmt = $db->prepare("INSERT INTO banners (shop_id, title, image, is_active) VALUES (?, ?, ?, ?)");
                $stmt->execute([$shopId, htmlspecialchars(trim($_POST['banner_title'] ?? 'Banner')), '/uploads/banners/' . $fname, 1]);
                $actionMsg = 'Banner added successfully!';
            }

        } else { $actionMsg='Please select a valid image.'; $actionType='error'; }
    } elseif ($act === 'delete_banner') {
        
        $bid = $_POST['banner_id'] ?? '';
        if ($bid) {
            require_once __DIR__ . '/../includes/db.php';
            $db = getDb();
            $db->prepare("DELETE FROM banners WHERE id = ? AND shop_id = ?")->execute([$bid, $shopId]);
        }
        $actionMsg = 'Banner removed.';
    } elseif ($act === 'toggle_banner') {
        
        $bid = $_POST['banner_id'] ?? '';
        if ($bid) {
            require_once __DIR__ . '/../includes/db.php';
            $db = getDb();
            $db->prepare("UPDATE banners SET is_active = NOT is_active WHERE id = ? AND shop_id = ?")->execute([$bid, $shopId]);
        }
        $actionMsg = 'Banner status updated.';
    } elseif ($act === 'add_media') {
        $uploadDir = __DIR__ . '/../uploads/shop-media/';
        if (!is_dir($uploadDir)) @mkdir($uploadDir, 0777, true);
        if (!empty($_FILES['media_file']['name']) && $_FILES['media_file']['error'] === UPLOAD_ERR_OK) {
            $ext = strtolower(pathinfo($_FILES['media_file']['name'], PATHINFO_EXTENSION));
            $isVid = in_array($ext, ['mp4','mov','webm']);
            $fname = ($isVid?'vid_':'img_').$shopId.'_'.time().'.'.$ext;
            if (move_uploaded_file($_FILES['media_file']['tmp_name'], $uploadDir . $fname)) {
                if (!isset($_SESSION['shop_media'][$shopId])) $_SESSION['shop_media'][$shopId] = [];
                $_SESSION['shop_media'][$shopId][] = ['id'=>uniqid(),'caption'=>htmlspecialchars(trim($_POST['media_caption']??'')),'url'=>'/uploads/shop-media/'.$fname,'type'=>$isVid?'video':'photo','added'=>date('d M Y')];
                $actionMsg = 'Media uploaded!';
            }
        } else { $actionMsg='Please select a valid image or video.'; $actionType='error'; }
    } elseif ($act === 'delete_media') {
        $mid = $_POST['media_id'] ?? '';
        if (!empty($_SESSION['shop_media'][$shopId]))
            $_SESSION['shop_media'][$shopId] = array_values(array_filter($_SESSION['shop_media'][$shopId], fn($m)=>$m['id']!==$mid));
        $actionMsg = 'Media removed.';
    }

    if (in_array($act, ['add_media', 'delete_media'])) {
        require_once __DIR__ . '/../includes/db.php';
        $db = getDb();
        if ($db) {
            $urls = array_column($_SESSION['shop_media'][$shopId] ?? [], 'url');
            $stmt = $db->prepare("UPDATE laundry_shops SET shop_photos = ? WHERE id = ?");
            $stmt->execute([json_encode($urls), $shopId]);
        }
    }
}


require_once __DIR__ . '/../includes/db.php';
$db = getDb();
$stmt = $db->prepare("SELECT id, title, image as url, is_active as active, DATE_FORMAT(created_at, '%d %b %Y') as added FROM banners WHERE shop_id = ?");
$stmt->execute([$shopId]);
$banners = $stmt->fetchAll(PDO::FETCH_ASSOC);

$shopMedia = $_SESSION['shop_media'][$shopId]   ?? [];

$svcRes    = apiGet('/services');
$catRes    = apiGet('/categories');
$services  = apiExtractList($svcRes);
$categories= apiExtractList($catRes);
if (empty($services)) $services=[['id'=>'1','name'=>'Wash & Fold','price'=>'80/kg','category'=>'Regular Wash','active'=>true],['id'=>'2','name'=>'Dry Cleaning','price'=>'199/piece','category'=>'Dry Clean','active'=>true],['id'=>'3','name'=>'Steam Press','price'=>'40/piece','category'=>'Ironing','active'=>true],['id'=>'4','name'=>'Saree Cleaning','price'=>'250/piece','category'=>'Specialty','active'=>true],['id'=>'5','name'=>'Curtain Wash','price'=>'150/piece','category'=>'Heavy Items','active'=>true],['id'=>'6','name'=>'Blanket Wash','price'=>'350/piece','category'=>'Heavy Items','active'=>true]];
if (empty($categories)) $categories=[['id'=>'1','name'=>'Regular Wash','icon'=>'droplets','color'=>'#3B82F6','count'=>2],['id'=>'2','name'=>'Dry Clean','icon'=>'wind','color'=>'#8B5CF6','count'=>1],['id'=>'3','name'=>'Ironing','icon'=>'zap','color'=>'#F59E0B','count'=>1],['id'=>'4','name'=>'Specialty','icon'=>'sparkles','color'=>'#EC4899','count'=>1],['id'=>'5','name'=>'Heavy Items','icon'=>'package','color'=>'#10B981','count'=>2]];
$coupons = $_SESSION['shop_promotions'][$shopId] ?? $_SESSION['promotions'] ?? [['id'=>'C1','code'=>'WASH20','discount'=>'20% OFF','minOrder'=>'500','expiry'=>'30 Oct 2026','active'=>true],['id'=>'C2','code'=>'FIRST50','discount'=>'50 OFF','minOrder'=>'300','expiry'=>'31 Dec 2026','active'=>true]];
$activeTab = $_GET['tab'] ?? 'banners';
?>
<div style="color: var(--text-primary);">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.75rem;flex-wrap:wrap;gap:1rem;">
    <div>
      <h1 style="font-size:1.5rem;font-weight:900;display:flex;align-items:center;gap:0.65rem;color:var(--text-primary);margin:0;letter-spacing:-0.5px;">
        <i data-lucide="smartphone" style="width:28px;height:28px;color:#0EA5E9;"></i>
        Customer App Management
      </h1>
      <p style="color:var(--text-secondary);font-size:0.875rem;margin-top:0.3rem;margin-bottom:0;">
        Control what customers see for <strong><?= htmlspecialchars($shopName) ?></strong> inside the DhobiPro customer app.
      </p>
    </div>
    <div style="background:linear-gradient(135deg,#0EA5E9 0%,#6366F1 100%);color:#FFF;padding:0.65rem 1.2rem;border-radius:12px;font-size:0.82rem;font-weight:800;display:flex;align-items:center;gap:0.5rem;box-shadow:0 4px 15px rgba(14,165,233,0.35);">
      <i data-lucide="eye" style="width:16px;height:16px;"></i>Customers see this live
    </div>
  </div>

  <?php if ($actionMsg): ?>
  <div style="background:<?= $actionType==='error'?'rgba(239,68,68,0.12)':'rgba(16,185,129,0.12)' ?>;border:1px solid <?= $actionType==='error'?'rgba(239,68,68,0.3)':'rgba(16,185,129,0.3)' ?>;color:<?= $actionType==='error'?'#DC2626':'#059669' ?>;padding:0.75rem 1rem;border-radius:10px;font-weight:700;font-size:0.85rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:0.5rem;">
    <i data-lucide="check-circle" style="width:18px;height:18px;"></i> <?= htmlspecialchars($actionMsg) ?>
  </div>
  <?php endif; ?>

  <!-- TABS -->
  <div style="display:flex;gap:0.4rem;margin-bottom:1.75rem;background:var(--bg-card);border:1px solid var(--border-color);border-radius:14px;padding:0.4rem;flex-wrap:wrap;">
    <?php
    $tabs=['banners'=>['Banners','image','#0EA5E9'],'media'=>['Photos & Videos','camera','#8B5CF6'],'services'=>['Services & Prices','layers','#10B981'],'coupons'=>['Coupons','ticket','#F59E0B']];
    foreach($tabs as $key=>[$label,$icon,$color]):?>
      <a href="?tab=<?= $key ?>" style="flex:1;min-width:120px;display:flex;align-items:center;justify-content:center;gap:0.5rem;padding:0.65rem 0.85rem;border-radius:10px;font-size:0.83rem;font-weight:800;text-decoration:none;transition:all 0.2s;<?= $activeTab===$key?"background:{$color};color:#FFF;box-shadow:0 4px 14px {$color}40;":'color:var(--text-secondary);background:transparent;' ?>">
        <i data-lucide="<?= $icon ?>" style="width:16px;height:16px;"></i><?= $label ?>
      </a>
    <?php endforeach; ?>
  </div>

  <!-- TAB: BANNERS -->
  <?php if($activeTab==='banners'): ?>
  <div>
    <div class="card" style="padding:1.5rem;margin-bottom:1.75rem;border:1.5px solid rgba(14,165,233,0.2);border-radius:16px;">
      <h3 style="font-size:1.05rem;font-weight:800;margin:0 0 1rem 0;display:flex;align-items:center;gap:0.5rem;"><i data-lucide="plus-circle" style="width:20px;height:20px;color:#0EA5E9;"></i>Add New Banner</h3>
      <form method="POST" action="" enctype="multipart/form-data">
        <input type="hidden" name="action" value="add_banner">
        <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:1rem;align-items:end;flex-wrap:wrap;">
          <div><label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">Banner Title</label><input type="text" name="banner_title" placeholder="e.g. Festive Offer - 30% OFF" class="form-control" style="width:100%;" required></div>
          <div><label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">Banner Image (JPG/PNG/WebP)</label><input type="file" name="banner_image" accept="image/*" class="form-control" style="width:100%;" required></div>
          <div><button type="submit" class="btn btn-primary" style="background:linear-gradient(135deg,#0EA5E9 0%,#6366F1 100%);border:none;color:#FFF;font-weight:800;padding:0.6rem 1.4rem;white-space:nowrap;display:inline-flex;align-items:center;gap:0.4rem;box-shadow:0 4px 12px rgba(14,165,233,0.35);border-radius:10px;"><i data-lucide="upload-cloud" style="width:16px;height:16px;"></i>Upload Banner</button></div>
        </div>
      </form>
    </div>
    <?php if(empty($banners)): ?>
    <div style="text-align:center;padding:3.5rem 2rem;background:var(--bg-card);border:2px dashed var(--border-color);border-radius:16px;">
      <div style="width:64px;height:64px;background:rgba(14,165,233,0.1);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem auto;"><i data-lucide="image" style="width:30px;height:30px;color:#0EA5E9;"></i></div>
      <h3 style="font-size:1.1rem;font-weight:800;margin:0 0 0.4rem 0;">No Banners Yet</h3>
      <p style="color:var(--text-secondary);font-size:0.875rem;margin:0;">Upload promotional banners to display in the customer app.</p>
    </div>
    <?php else: ?>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem;">
      <?php foreach($banners as $bn): ?>
      <div class="card" style="padding:0;overflow:hidden;border-radius:14px;border:1px solid var(--border-color);position:relative;">
        <img src="<?= htmlspecialchars($bn['url']) ?>" alt="" style="width:100%;height:160px;object-fit:cover;display:block;">
        <div style="position:absolute;top:0.6rem;right:0.6rem;background:<?= ($bn['active']??true)?'#10B981':'#6B7280' ?>;color:#FFF;font-size:0.68rem;font-weight:800;padding:0.2rem 0.55rem;border-radius:20px;text-transform:uppercase;"><?= ($bn['active']??true)?'ACTIVE':'HIDDEN' ?></div>
        <div style="padding:0.85rem 1rem;">
          <div style="font-weight:800;font-size:0.92rem;margin-bottom:0.2rem;"><?= htmlspecialchars($bn['title']) ?></div>
          <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:0.85rem;">Added: <?= htmlspecialchars($bn['added']) ?></div>
          <div style="display:flex;gap:0.5rem;">
            <form method="POST" style="display:inline;"><input type="hidden" name="action" value="toggle_banner"><input type="hidden" name="banner_id" value="<?= htmlspecialchars($bn['id']) ?>"><button type="submit" class="btn btn-secondary btn-sm" style="font-size:0.75rem;font-weight:700;display:inline-flex;align-items:center;gap:0.25rem;"><i data-lucide="<?= ($bn['active']??true)?'eye-off':'eye' ?>" style="width:13px;height:13px;"></i><?= ($bn['active']??true)?'Hide':'Show' ?></button></form>
            <form method="POST" style="display:inline;" onsubmit="return confirm('Remove banner?')"><input type="hidden" name="action" value="delete_banner"><input type="hidden" name="banner_id" value="<?= htmlspecialchars($bn['id']) ?>"><button type="submit" class="btn btn-danger btn-sm" style="font-size:0.75rem;font-weight:700;display:inline-flex;align-items:center;gap:0.25rem;"><i data-lucide="trash-2" style="width:13px;height:13px;"></i>Delete</button></form>
          </div>
        </div>
      </div>
      <?php endforeach; ?>
    </div>
    <?php endif; ?>
  </div>

  <!-- TAB: PHOTOS & VIDEOS -->
  <?php elseif($activeTab==='media'): ?>
  <div>
    <div class="card" style="padding:1.5rem;margin-bottom:1.75rem;border:1.5px solid rgba(139,92,246,0.2);border-radius:16px;">
      <h3 style="font-size:1.05rem;font-weight:800;margin:0 0 1rem 0;display:flex;align-items:center;gap:0.5rem;"><i data-lucide="camera" style="width:20px;height:20px;color:#8B5CF6;"></i>Upload Shop Photo / Video</h3>
      <form method="POST" action="" enctype="multipart/form-data">
        <input type="hidden" name="action" value="add_media">
        <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:1rem;align-items:end;">
          <div><label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">Caption (Optional)</label><input type="text" name="media_caption" placeholder="e.g. Our washing machines..." class="form-control" style="width:100%;"></div>
          <div><label style="display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.35rem;">File (Image or MP4 Video)</label><input type="file" name="media_file" accept="image/*,video/mp4,video/quicktime" class="form-control" style="width:100%;" required></div>
          <div><button type="submit" class="btn btn-primary" style="background:linear-gradient(135deg,#8B5CF6 0%,#EC4899 100%);border:none;color:#FFF;font-weight:800;padding:0.6rem 1.4rem;white-space:nowrap;display:inline-flex;align-items:center;gap:0.4rem;box-shadow:0 4px 12px rgba(139,92,246,0.35);border-radius:10px;"><i data-lucide="upload-cloud" style="width:16px;height:16px;"></i>Upload</button></div>
        </div>
      </form>
    </div>
    <?php if(empty($shopMedia)): ?>
    <div style="text-align:center;padding:3.5rem 2rem;background:var(--bg-card);border:2px dashed var(--border-color);border-radius:16px;">
      <div style="width:64px;height:64px;background:rgba(139,92,246,0.1);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem auto;"><i data-lucide="camera" style="width:30px;height:30px;color:#8B5CF6;"></i></div>
      <h3 style="font-size:1.1rem;font-weight:800;margin:0 0 0.4rem 0;">No Shop Media Yet</h3>
      <p style="color:var(--text-secondary);font-size:0.875rem;margin:0;">Showcase your facility to customers - upload photos & videos of your shop.</p>
    </div>
    <?php else: ?>
    <?php $photoCount=count(array_filter($shopMedia,fn($m)=>$m['type']==='photo')); $videoCount=count(array_filter($shopMedia,fn($m)=>$m['type']==='video')); ?>
    <div style="display:flex;gap:1rem;margin-bottom:1.25rem;flex-wrap:wrap;">
      <div class="card" style="padding:0.75rem 1.25rem;display:flex;align-items:center;gap:0.6rem;border-radius:10px;min-width:130px;"><i data-lucide="image" style="width:18px;height:18px;color:#8B5CF6;"></i><div><div style="font-size:1.1rem;font-weight:900;"><?= $photoCount ?></div><div style="font-size:0.72rem;color:var(--text-muted);">Photos</div></div></div>
      <div class="card" style="padding:0.75rem 1.25rem;display:flex;align-items:center;gap:0.6rem;border-radius:10px;min-width:130px;"><i data-lucide="video" style="width:18px;height:18px;color:#EC4899;"></i><div><div style="font-size:1.1rem;font-weight:900;"><?= $videoCount ?></div><div style="font-size:0.72rem;color:var(--text-muted);">Videos</div></div></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1.1rem;">
      <?php foreach($shopMedia as $m): ?>
      <div class="card" style="padding:0;overflow:hidden;border-radius:12px;border:1px solid var(--border-color);">
        <?php if($m['type']==='video'): ?><video src="<?= htmlspecialchars($m['url']) ?>" style="width:100%;height:145px;object-fit:cover;display:block;" controls muted></video>
        <?php else: ?><img src="<?= htmlspecialchars($m['url']) ?>" alt="" style="width:100%;height:145px;object-fit:cover;display:block;"><?php endif; ?>
        <div style="padding:0.7rem 0.85rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.4rem;">
          <div><div style="font-size:0.78rem;font-weight:700;"><?= htmlspecialchars($m['caption']?:($m['type']==='video'?'Video':'Photo')) ?></div><div style="font-size:0.68rem;color:var(--text-muted);"><?= htmlspecialchars($m['added']) ?></div></div>
          <form method="POST" onsubmit="return confirm('Remove this?')"><input type="hidden" name="action" value="delete_media"><input type="hidden" name="media_id" value="<?= htmlspecialchars($m['id']) ?>"><button type="submit" class="btn btn-danger btn-sm" style="font-size:0.72rem;padding:0.3rem 0.65rem;display:inline-flex;align-items:center;gap:0.25rem;font-weight:700;"><i data-lucide="trash-2" style="width:12px;height:12px;"></i>Remove</button></form>
        </div>
      </div>
      <?php endforeach; ?>
    </div>
    <?php endif; ?>
  </div>

  <!-- TAB: SERVICES & PRICES -->
  <?php elseif($activeTab==='services'): ?>
  <div>
    <div style="margin-bottom:1.75rem;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.85rem;">
        <h3 style="font-size:1.05rem;font-weight:800;margin:0;display:flex;align-items:center;gap:0.5rem;"><i data-lucide="grid-3x3" style="width:18px;height:18px;color:#10B981;"></i>Service Categories</h3>
        <a href="<?= ADMIN_BASE_URL ?>/services/index.php" class="btn btn-secondary btn-sm" style="font-weight:700;display:inline-flex;align-items:center;gap:0.3rem;font-size:0.78rem;"><i data-lucide="settings" style="width:13px;height:13px;"></i>Manage</a>
      </div>
      <div style="display:flex;gap:0.85rem;flex-wrap:wrap;">
        <?php foreach($categories as $cat): ?>
        <div class="card" style="padding:0.85rem 1.1rem;border-radius:12px;display:flex;align-items:center;gap:0.65rem;min-width:140px;border-left:3.5px solid <?= htmlspecialchars($cat['color']??'#6366F1') ?>;">
          <div style="width:36px;height:36px;border-radius:10px;background:<?= htmlspecialchars($cat['color']??'#6366F1') ?>20;display:flex;align-items:center;justify-content:center;"><i data-lucide="<?= htmlspecialchars($cat['icon']??'layers') ?>" style="width:18px;height:18px;color:<?= htmlspecialchars($cat['color']??'#6366F1') ?>;"></i></div>
          <div><div style="font-size:0.85rem;font-weight:800;"><?= htmlspecialchars($cat['name']) ?></div><div style="font-size:0.7rem;color:var(--text-muted);"><?= intval($cat['count']??0) ?> services</div></div>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
    <div class="card" style="padding:1.5rem;border-radius:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.1rem;flex-wrap:wrap;gap:0.75rem;">
        <h3 style="font-size:1.05rem;font-weight:800;margin:0;display:flex;align-items:center;gap:0.5rem;"><i data-lucide="layers" style="width:18px;height:18px;color:#10B981;"></i>All Services &amp; Pricing</h3>
        <a href="<?= ADMIN_BASE_URL ?>/services/index.php" class="btn btn-primary btn-sm" style="background:linear-gradient(135deg,#10B981 0%,#059669 100%);border:none;color:#FFF;font-weight:800;display:inline-flex;align-items:center;gap:0.3rem;font-size:0.78rem;box-shadow:0 3px 10px rgba(16,185,129,0.35);"><i data-lucide="plus" style="width:13px;height:13px;"></i>Add / Edit Services</a>
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table" style="min-width:600px;">
          <thead><tr><th>Service</th><th>Category</th><th style="text-align:right;">Price</th><th style="text-align:center;">Status</th><th style="text-align:center;">Action</th></tr></thead>
          <tbody>
            <?php foreach($services as $svc):
              $sName=$svc['name']??'Service';
              $sCat=$svc['category']??$svc['category_name']??'-';
              $sPrice='&#8377;'.($svc['price']??$svc['base_price']??'-');
              $sActive=(bool)($svc['active']??$svc['is_active']??true);
            ?>
            <tr>
              <td style="font-weight:700;font-size:0.9rem;"><?= htmlspecialchars($sName) ?></td>
              <td><span style="background:rgba(99,102,241,0.1);color:#4338CA;padding:0.2rem 0.6rem;border-radius:6px;font-size:0.75rem;font-weight:700;"><?= htmlspecialchars($sCat) ?></span></td>
              <td style="text-align:right;font-weight:800;font-size:0.95rem;color:#10B981;"><?= $sPrice ?></td>
              <td style="text-align:center;"><span style="background:<?= $sActive?'rgba(16,185,129,0.12)':'rgba(107,114,128,0.12)' ?>;color:<?= $sActive?'#059669':'#6B7280' ?>;font-size:0.73rem;font-weight:800;padding:0.2rem 0.65rem;border-radius:20px;text-transform:uppercase;"><?= $sActive?'Active':'Inactive' ?></span></td>
              <td style="text-align:center;"><a href="<?= ADMIN_BASE_URL ?>/services/index.php?edit=<?= htmlspecialchars($svc['id']??'1') ?>" class="btn btn-secondary btn-sm" style="font-size:0.74rem;font-weight:700;display:inline-flex;align-items:center;gap:0.25rem;"><i data-lucide="edit-2" style="width:12px;height:12px;"></i>Edit</a></td>
            </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- TAB: COUPONS -->
  <?php elseif($activeTab==='coupons'): ?>
  <div>
    <div style="background:linear-gradient(135deg,rgba(245,158,11,0.1) 0%,rgba(251,191,36,0.08) 100%);border:1.5px solid rgba(245,158,11,0.25);border-radius:14px;padding:1.2rem 1.5rem;margin-bottom:1.75rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
      <div style="display:flex;align-items:center;gap:0.75rem;">
        <div style="width:42px;height:42px;background:linear-gradient(135deg,#F59E0B 0%,#D97706 100%);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#FFF;box-shadow:0 4px 12px rgba(245,158,11,0.35);"><i data-lucide="ticket" style="width:22px;height:22px;"></i></div>
        <div><div style="font-size:1rem;font-weight:800;">Active Coupons &amp; Promotions</div><div style="font-size:0.8rem;color:var(--text-secondary);"><?= count($coupons) ?> coupon(s) configured</div></div>
      </div>
      <a href="<?= ADMIN_BASE_URL ?>/promotions/index.php" class="btn btn-primary" style="background:linear-gradient(135deg,#F59E0B 0%,#D97706 100%);border:none;color:#FFF;font-weight:800;padding:0.6rem 1.4rem;display:inline-flex;align-items:center;gap:0.5rem;box-shadow:0 4px 12px rgba(245,158,11,0.35);border-radius:10px;"><i data-lucide="plus-circle" style="width:16px;height:16px;"></i>Manage All Coupons</a>
    </div>
    <?php if(empty($coupons)): ?>
    <div style="text-align:center;padding:3.5rem 2rem;background:var(--bg-card);border:2px dashed var(--border-color);border-radius:16px;">
      <h3 style="font-size:1.1rem;font-weight:800;margin:0 0 0.4rem 0;">No Coupons Yet</h3>
      <a href="<?= ADMIN_BASE_URL ?>/promotions/index.php" class="btn btn-primary" style="background:linear-gradient(135deg,#F59E0B 0%,#D97706 100%);border:none;color:#FFF;font-weight:800;display:inline-flex;align-items:center;gap:0.4rem;border-radius:10px;margin-top:0.75rem;"><i data-lucide="plus" style="width:16px;height:16px;"></i>Create First Coupon</a>
    </div>
    <?php else: ?>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem;">
      <?php foreach($coupons as $c): $cActive=(bool)($c['active']??true); ?>
      <div style="background:<?= $cActive?'linear-gradient(135deg,rgba(245,158,11,0.08) 0%,rgba(251,191,36,0.05) 100%)':'var(--bg-card)' ?>;border:1.5px solid <?= $cActive?'rgba(245,158,11,0.3)':'var(--border-color)' ?>;border-radius:14px;padding:1.25rem;position:relative;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.85rem;">
          <div>
            <div style="font-size:1.15rem;font-weight:900;letter-spacing:1px;color:<?= $cActive?'#D97706':'var(--text-muted)' ?>;font-family:monospace;"><?= htmlspecialchars($c['code']??'CODE') ?></div>
            <div style="font-size:1.4rem;font-weight:900;color:<?= $cActive?'#10B981':'var(--text-muted)' ?>;margin-top:0.15rem;"><?= htmlspecialchars($c['discount']??'-') ?></div>
          </div>
          <span style="background:<?= $cActive?'#D1FAE5':'#F3F4F6' ?>;color:<?= $cActive?'#059669':'#6B7280' ?>;font-size:0.7rem;font-weight:800;padding:0.25rem 0.6rem;border-radius:20px;text-transform:uppercase;"><?= $cActive?'Active':'Inactive' ?></span>
        </div>
        <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:0.3rem;">Min Order: <strong>&#8377;<?= htmlspecialchars($c['minOrder']??$c['min_order_value']??'-') ?></strong></div>
        <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem;">Expires: <strong><?= htmlspecialchars($c['expiry']??$c['expires_at']??'-') ?></strong></div>
        <a href="<?= ADMIN_BASE_URL ?>/promotions/index.php" class="btn btn-secondary btn-sm" style="width:100%;text-align:center;justify-content:center;font-size:0.78rem;font-weight:700;display:flex;align-items:center;gap:0.3rem;"><i data-lucide="edit-2" style="width:12px;height:12px;"></i>Edit / Delete</a>
      </div>
      <?php endforeach; ?>
    </div>
    <?php endif; ?>
  </div>
  <?php endif; ?>

  <div style="margin-top:2.5rem;background:linear-gradient(135deg,rgba(14,165,233,0.08) 0%,rgba(99,102,241,0.06) 100%);border:1px solid rgba(14,165,233,0.2);border-radius:14px;padding:1rem 1.5rem;display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
    <div style="width:40px;height:40px;background:linear-gradient(135deg,#0EA5E9 0%,#6366F1 100%);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#FFF;box-shadow:0 4px 12px rgba(14,165,233,0.3);flex-shrink:0;"><i data-lucide="info" style="width:20px;height:20px;"></i></div>
    <div style="flex:1;min-width:200px;"><div style="font-size:0.85rem;font-weight:800;">Changes go live in the Customer App within minutes</div><div style="font-size:0.78rem;color:var(--text-secondary);margin-top:0.15rem;">Banners, photos, and service updates sync to the DhobiPro customer app automatically.</div></div>
  </div>
</div>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
