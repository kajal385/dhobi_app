<?php
require_once __DIR__ . '/../config/api.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/api-client.php';

if (isLoggedIn()) {
    header('Location: ' . ADMIN_BASE_URL . '/dashboard/index.php');
    exit;
}

$error      = null;
$identifier = '';   // email OR mobile
$loginHint  = '';   // for demo credential display

// -----------------------------------------------------------------------
// Helper: detect if string looks like a phone number
// -----------------------------------------------------------------------
function looksLikePhone(string $id): bool {
    $clean = preg_replace('/[\s\-\+\(\)]/', '', $id);
    return preg_match('/^[\d]{7,15}$/', $clean) === 1;
}

// -----------------------------------------------------------------------
// Helper: build a "canonical" phone (digits only, strip leading 91/0)
// -----------------------------------------------------------------------
function canonicalPhone(string $id): string {
    $clean = preg_replace('/\D/', '', $id);
    // strip leading country code 91
    if (strlen($clean) === 12 && str_starts_with($clean, '91')) {
        $clean = substr($clean, 2);
    }
    if (strlen($clean) === 11 && str_starts_with($clean, '0')) {
        $clean = substr($clean, 1);
    }
    return $clean;
}

// -----------------------------------------------------------------------
// Match identifier against registered laundry owners stored in session
// (Owners onboarded via laundries/index.php â†’ stored in $_SESSION['custom_shops'])
// -----------------------------------------------------------------------
function matchOwnerCredentials(string $identifier, string $password): ?array {
    $shops = $_SESSION['custom_shops'] ?? [];

    // Built-in demo accounts (always available as fallback)
    $demoOwners = [
        [
            'id'        => '41',
            'name'      => 'Javed Atkhar',
            'email'     => 'javed.laundry@dhobipro.com',
            'phone'     => '020394859292',
            'password'  => 'owner123',
            'shopId'    => '41',
            'shopName'  => 'Super Clean Wash Laundry',
        ],
        [
            'id'        => '45',
            'name'      => 'Kajal Test Owner',
            'email'     => 'kajal.owner@dhobipro.com',
            'phone'     => '9898989898',
            'password'  => 'owner123',
            'shopId'    => '45',
            'shopName'  => 'Super Fast Wash',
        ],
    ];

    // Merge session-registered owners into the list
    foreach ($shops as $shop) {
        $demoOwners[] = [
            'id'        => strval($shop['id']         ?? uniqid()),
            'name'      => $shop['ownerName']         ?? $shop['owner_name'] ?? 'Owner',
            'email'     => strtolower(trim($shop['email']   ?? $shop['ownerEmail'] ?? '')),
            'phone'     => preg_replace('/\D/', '', $shop['phone'] ?? $shop['ownerPhone'] ?? ''),
            'password'  => $shop['password']          ?? $shop['ownerPassword'] ?? 'owner123',
            'shopId'    => strval($shop['id']         ?? ''),
            'shopName'  => $shop['shopName']          ?? $shop['name'] ?? 'Laundry Shop',
            'verificationStatus' => $shop['verificationStatus'] ?? $shop['verification_status'] ?? 'PENDING',
        ];
    }

    $inputIsPhone = looksLikePhone($identifier);
    $inputPhone   = $inputIsPhone ? canonicalPhone($identifier) : '';
    $inputEmail   = !$inputIsPhone ? strtolower(trim($identifier)) : '';

    foreach ($demoOwners as $owner) {
        $ownerPhone = canonicalPhone($owner['phone'] ?? '');
        $ownerEmail = strtolower(trim($owner['email'] ?? ''));
        $ownerPass  = $owner['password'] ?? 'owner123';

        $identifierMatches = false;
        if ($inputIsPhone && $ownerPhone && $inputPhone === $ownerPhone) {
            $identifierMatches = true;
        } elseif (!$inputIsPhone && $ownerEmail && $inputEmail === $ownerEmail) {
            $identifierMatches = true;
        }

        // Also allow: any password that is 'owner123' as a master demo key
        $passwordMatches = ($password === $ownerPass || $password === 'owner123');

        if ($identifierMatches && $passwordMatches) {
            return $owner;
        }
    }

    return null;
}

// -----------------------------------------------------------------------
// POST â€“ Login Attempt
// -----------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $identifier = trim($_POST['identifier'] ?? '');
    $password   = trim($_POST['password']   ?? '');

    if (empty($identifier) || empty($password)) {
        $error = 'Please enter your email / mobile number and password.';
    } else {
        $isPhone = looksLikePhone($identifier);

        // 1ï¸âƒ£  Try Laravel REST API first (send both fields)
        $apiPayload = ['password' => $password];
        if ($isPhone) {
            $apiPayload['phone']  = $identifier;
        } else {
            $apiPayload['email']  = $identifier;
        }

        $apiResponse = apiPost('/auth/login', $apiPayload);
        if (!$apiResponse['success'] || empty($apiResponse['data']['token'])) {
            $apiResponse = apiPost('/admin/login', $apiPayload);
        }

        if ($apiResponse['success'] && !empty($apiResponse['data'])) {
            // --- API Login Succeeded ---
            $rawUser  = $apiResponse['data']['user'] ?? [];
            $token    = $apiResponse['data']['token'] ?? $apiResponse['data']['access_token'] ?? 'mock-jwt-2026';
            $roleStr  = strtolower(strval($rawUser['role'] ?? $apiResponse['data']['role'] ?? ''));
            $role     = (strpos($roleStr, 'owner') !== false || strpos($roleStr, 'laundry') !== false)
                        ? 'LAUNDRY_OWNER' : 'SUPER_ADMIN';
            $rawShop  = $apiResponse['data']['shop'] ?? [];
            $shopId   = strval($rawShop['id'] ?? $rawUser['shop_id'] ?? ($role === 'LAUNDRY_OWNER' ? '30' : '1'));
            $shopName = $rawShop['name'] ?? $rawUser['shop_name'] ?? ($role === 'LAUNDRY_OWNER' ? 'Star Wash Ultra Premium' : 'Platform');

            $_SESSION['dhobipro_admin_token'] = $token;
            $_SESSION['dhobipro_admin_user']  = [
                'id'          => strval($rawUser['id'] ?? '1'),
                'name'        => $rawUser['name'] ?? 'User',
                'email'       => $rawUser['email'] ?? $identifier,
                'phone'       => $rawUser['phone'] ?? ($isPhone ? $identifier : ''),
                'role'        => $role,
                'permissions' => ($role === 'SUPER_ADMIN') ? ['ALL'] : ['MANAGE_OWN_SHOP', 'MANAGE_OWN_ORDERS', 'MANAGE_OWN_SERVICES'],
                'shopId'      => $shopId,
                'shopName'    => $shopName,
            ];
            header('Location: ' . ADMIN_BASE_URL . '/dashboard/index.php');
            exit;
        }

        // 2ï¸âƒ£  Local fallback â€” Super Admin by email only
        if (!$isPhone && strtolower($identifier) === 'admin@dhobipro.com' && $password === 'admin123') {
            $_SESSION['dhobipro_admin_token'] = 'mock-jwt-superadmin-2026';
            $_SESSION['dhobipro_admin_user']  = [
                'id'          => 'ADM-001',
                'name'        => 'Super Admin',
                'email'       => 'admin@dhobipro.com',
                'phone'       => '',
                'role'        => 'SUPER_ADMIN',
                'permissions' => ['ALL'],
            ];
            header('Location: ' . ADMIN_BASE_URL . '/dashboard/index.php');
            exit;
        }

        // 3ï¸âƒ£  Local fallback â€” Laundry Owner by email OR mobile number
        $matchedOwner = matchOwnerCredentials($identifier, $password);
        if ($matchedOwner) {
            $_SESSION['dhobipro_admin_token'] = 'mock-jwt-laundryowner-' . $matchedOwner['shopId'] . '-2026';
            $_SESSION['dhobipro_admin_user']  = [
                'id'          => $matchedOwner['id'],
                'name'        => $matchedOwner['name'],
                'email'       => $matchedOwner['email'],
                'phone'       => $matchedOwner['phone'],
                'role'        => 'LAUNDRY_OWNER',
                'permissions' => ['MANAGE_OWN_SHOP', 'MANAGE_OWN_ORDERS', 'MANAGE_OWN_SERVICES'],
                'shopId'      => $matchedOwner['shopId'],
                'shopName'    => $matchedOwner['shopName'],
                'verificationStatus' => $matchedOwner['verificationStatus'] ?? 'APPROVED',
            ];
            header('Location: ' . ADMIN_BASE_URL . '/dashboard/index.php');
            exit;
        }

        // 4ï¸âƒ£  Failed
        $error = 'Invalid credentials. Please check your email / mobile number and password.';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portal Login | DhobiPro</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="<?= ADMIN_BASE_URL ?>/assets/css/style.css">
  <script src="https://unpkg.com/lucide@latest"></script>
<style>
    body {
        margin: 0;
        font-family: 'Plus Jakarta Sans', sans-serif;
        background-color: #F8FAFC;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        box-sizing: border-box;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 1rem;
    }
    
    .login-wrapper {
        display: flex;
        width: 100%;
        max-width: 900px; 
        min-height: 480px; 
        background: #FFF;
        border-radius: 20px;
        box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.15);
        overflow: hidden;
        margin: auto;
        z-index: 10;
        position: relative;
    }

    /* Left Side: Image Slideshow */
    .login-left {
        flex: 1.1;
        position: relative;
        overflow: hidden;
        background: #000;
    }

    .slide {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-size: cover;
        background-position: center;
        opacity: 0;
        transition: opacity 1.5s ease-in-out, transform 8s linear;
        transform: scale(1.05);
    }
    .slide.active {
        opacity: 0.85; 
        transform: scale(1);
    }
    
    /* Water Bubbles Animation */
    .bubbles-container {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 10;
        pointer-events: none;
        overflow: hidden;
    }
    
    /* Left Side Bubbles (Water Color) */
    .bubble {
        position: absolute;
        border-radius: 50%;
        bottom: -20px;
        background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.9), rgba(135, 206, 250, 0.4) 40%, rgba(0, 191, 255, 0.1) 70%, rgba(255, 255, 255, 0) 80%);
        box-shadow: inset -5px -5px 15px rgba(255, 255, 255, 0.4), inset 5px 5px 10px rgba(0, 191, 255, 0.1), 0 0 10px rgba(0, 191, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.7);
        animation: bubbleFloat linear infinite;
    }
    
    /* Right Side Bubbles (Water Color) */
    .bubble-right {
        position: absolute;
        border-radius: 50%;
        bottom: -20px;
        background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), rgba(135, 206, 250, 0.2) 40%, rgba(0, 191, 255, 0) 70%);
        box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.6), 0 0 5px rgba(0, 191, 255, 0.1);
        border: 1px solid rgba(135, 206, 250, 0.4);
        animation: bubbleFloat linear infinite;
    }

    @keyframes bubbleFloat {
        0% {
            transform: translateY(0) scale(0.8);
            opacity: 0;
        }
        10% { opacity: 1; }
        80% { opacity: 1; }
        100% {
            transform: translateY(-800px) scale(1.2);
            opacity: 0;
        }
    }

    /* Right Side: Login Form */
    .login-right {
        flex: 1;
        padding: 1.5rem 2rem; 
        display: flex;
        flex-direction: column;
        justify-content: center;
        background: #FFF;
        z-index: 2;
        position: relative;
    }
    
    .login-content {
        position: relative;
        z-index: 10; 
    }
    
    .brand-logo-wrapper {
        width: 80px; /* Made the logo a bit bigger since it has no background box now */
        height: 80px;
        background: transparent; /* Removed white background */
        margin: 0 auto 0.5rem auto; /* Centered horizontally */
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .login-header {
        text-align: center; /* Center the welcome text to match the centered logo */
        margin-bottom: 1.2rem;
    }
    .login-header h2 {
        font-size: 1.4rem; 
        font-weight: 800;
        color: #0F172A;
        margin: 0 0 0.2rem 0;
    }
    .login-header p {
        color: #64748B;
        font-size: 0.8rem;
        margin: 0;
    }

    .form-group {
        margin-bottom: 0.8rem; 
    }
    .form-label {
        display: block;
        font-weight: 700;
        font-size: 0.75rem;
        color: #334155;
        margin-bottom: 0.3rem;
    }
    .form-control-modern {
        width: 100%;
        padding: 0.65rem 1rem 0.65rem 2.4rem; 
        border: 2px solid #E2E8F0;
        border-radius: 10px;
        background: #F8FAFC;
        font-size: 0.85rem;
        color: #1E293B;
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-weight: 600;
        transition: all 0.2s ease;
        outline: none;
        box-sizing: border-box;
    }
    .form-control-modern::placeholder {
        color: #94A3B8;
        font-weight: 500;
    }
    .form-control-modern:focus {
        background: #FFF;
        border-color: #8162EE;
        box-shadow: 0 0 0 4px rgba(129, 98, 238, 0.15);
    }
    .input-icon {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        color: #94A3B8;
        pointer-events: none;
        transition: color 0.2s;
    }
    .form-control-modern:focus + .input-icon {
        color: #8162EE;
    }
    
    .btn-login-premium {
        width: 100%;
        padding: 0.75rem; 
        font-size: 0.9rem;
        font-weight: 800;
        border-radius: 10px;
        background: linear-gradient(64.52deg, #8162EE 1.27%, #A672D6 31.73%, #E18C8E 67.34%, #FE9A5D 98.26%);
        background-size: 200% auto;
        border: none;
        color: #FFF;
        box-shadow: 0 8px 15px rgba(129, 98, 238, 0.3), 0 0 0 1px rgba(255,255,255,0.2) inset;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        transition: all 0.3s ease;
        margin-top: 1rem;
    }
    .btn-login-premium:hover {
        background-position: right center;
        transform: translateY(-2px);
        box-shadow: 0 12px 25px rgba(129, 98, 238, 0.4), 0 0 0 1px rgba(255,255,255,0.3) inset;
    }
    .btn-login-premium:active {
        transform: translateY(1px);
    }
    
    .role-tabs {
        display: flex;
        background: #F1F5F9;
        border-radius: 10px;
        padding: 0.25rem;
        margin-bottom: 1rem;
        position: relative;
    }
    .role-tab {
        flex: 1;
        padding: 0.5rem;
        text-align: center;
        font-size: 0.8rem;
        font-weight: 800;
        color: #64748B;
        cursor: pointer;
        border-radius: 8px;
        transition: all 0.3s ease;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
    }
    .role-tab.active {
        color: #8162EE;
    }
    .role-slider {
        position: absolute;
        top: 0.25rem;
        bottom: 0.25rem;
        left: 0.25rem;
        width: calc(50% - 0.25rem);
        background: #FFF;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 1;
    }

    /* Responsive */
    @media (max-width: 900px) {
        .login-wrapper {
            flex-direction: column;
            max-width: 450px;
            margin: 1rem;
        }
        .login-left {
            display: none;
        }
        .login-right {
            padding: 2rem 1.5rem;
        }
    }
</style>
</head>
<body>

  <!-- Full screen background shapes -->
  <div style="position:fixed; top:-20%; left:-10%; width:50%; height:50%; background:radial-gradient(circle, rgba(129,98,238,0.1) 0%, rgba(255,255,255,0) 70%); z-index:0; pointer-events:none;"></div>
  <div style="position:fixed; bottom:-20%; right:-10%; width:60%; height:60%; background:radial-gradient(circle, rgba(254,154,93,0.08) 0%, rgba(255,255,255,0) 70%); z-index:0; pointer-events:none;"></div>

  <div class="login-wrapper">
    <!-- Left Side - IMAGE SLIDESHOW WITH BUBBLES -->
    <div class="login-left">
      <!-- High Quality Sharp Images -->
      <div class="slide active" style="background-image: url('https://images.unsplash.com/photo-1545173168-9f1947eebb7f?q=80&w=2071&auto=format&fit=crop');"></div>
      <div class="slide" style="background-image: url('https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?q=80&w=2071&auto=format&fit=crop');"></div>
      <div class="slide" style="background-image: url('https://images.unsplash.com/photo-1582735689369-4fe89db7114c?q=80&w=2071&auto=format&fit=crop');"></div>
      
      <!-- Bubbles Animation overlaying the images -->
      <div class="bubbles-container">
        <div class="bubble" style="left: 15%; width: 45px; height: 45px; animation-duration: 9s; animation-delay: 0s;"></div>
        <div class="bubble" style="left: 35%; width: 25px; height: 25px; animation-duration: 12s; animation-delay: 2s;"></div>
        <div class="bubble" style="left: 55%; width: 55px; height: 55px; animation-duration: 10s; animation-delay: 1s;"></div>
        <div class="bubble" style="left: 75%; width: 35px; height: 35px; animation-duration: 14s; animation-delay: 4s;"></div>
        <div class="bubble" style="left: 85%; width: 50px; height: 50px; animation-duration: 11s; animation-delay: 3s;"></div>
        <div class="bubble" style="left: 25%; width: 65px; height: 65px; animation-duration: 15s; animation-delay: 5s;"></div>
        <div class="bubble" style="left: 65%; width: 20px; height: 20px; animation-duration: 8s; animation-delay: 6s;"></div>
      </div>
    </div>

    <!-- Right Login Side -->
    <div class="login-right">
      
      <!-- Right Side Bubbles Animation -->
      <div class="bubbles-container" style="z-index: 1;">
        <div class="bubble-right" style="left: 10%; width: 30px; height: 30px; animation-duration: 11s; animation-delay: 1s;"></div>
        <div class="bubble-right" style="left: 40%; width: 45px; height: 45px; animation-duration: 13s; animation-delay: 3s;"></div>
        <div class="bubble-right" style="left: 70%; width: 20px; height: 20px; animation-duration: 9s; animation-delay: 0s;"></div>
        <div class="bubble-right" style="left: 85%; width: 50px; height: 50px; animation-duration: 14s; animation-delay: 5s;"></div>
      </div>

      <div class="login-content">
          <div class="brand-logo-wrapper">
            <img src="<?= ADMIN_BASE_URL ?>/assets/images/logo.png" alt="DhobiPro" style="width:100%;height:100%;object-fit:contain;">
          </div>
          
          <div class="login-header">
            <h2>Welcome Back</h2>
            <p>Please sign in to your account</p>
          </div>

          <?php if (!empty($error)): ?>
            <div style="background:#FEF2F2;color:#DC2626;padding:0.75rem;border-radius:10px;margin-bottom:1rem;font-size:0.8rem;font-weight:700;display:flex;align-items:center;gap:0.5rem;border:1px solid #FECACA;">
              <i data-lucide="alert-circle" style="width:18px;height:18px;flex-shrink:0;"></i>
              <span><?= htmlspecialchars($error) ?></span>
            </div>
          <?php endif; ?>

          <!-- Role Selector -->
          <div class="role-tabs">
            <div class="role-slider" id="roleSlider"></div>
            <div class="role-tab active" id="tabAdmin" onclick="selectRole('admin')">
              <i data-lucide="shield" style="width:16px;height:16px;"></i> Super Admin
            </div>
            <div class="role-tab" id="tabOwner" onclick="selectRole('owner')">
              <i data-lucide="store" style="width:16px;height:16px;"></i> Laundry Owner
            </div>
          </div>

          <form method="POST" action="" id="loginForm">
            <!-- Identifier Field -->
            <div class="form-group">
              <label class="form-label" id="identifierLabel">Email or Mobile Number</label>
              <div style="position:relative;">
                <input
                  id="inputIdentifier"
                  type="text"
                  name="identifier"
                  class="form-control-modern"
                  placeholder="Enter email or mobile number"
                  value="<?= htmlspecialchars($identifier) ?>"
                  autocomplete="username"
                  required
                />
                <i data-lucide="user" id="identifierIcon" class="input-icon" style="width:18px;height:18px;"></i>
              </div>
            </div>

            <!-- Password -->
            <div class="form-group">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.3rem;">
                <label class="form-label" style="margin:0;">Password</label>
                <a href="#" onclick="alert('Please contact platform administrator to reset your password.'); return false;" style="color:#8162EE;font-weight:700;font-size:0.75rem;text-decoration:none;">Forgot password?</a>
              </div>
              <div style="position:relative;">
                <input
                  id="inputPassword"
                  type="password"
                  name="password"
                  class="form-control-modern"
                  placeholder="••••••••"
                  autocomplete="current-password"
                  required
                  style="padding-right:2.5rem;"
                />
                <i data-lucide="lock" class="input-icon" style="width:18px;height:18px;"></i>
                <button type="button" onclick="togglePwd()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#94A3B8;padding:0;display:flex;align-items:center;transition:color 0.2s;" onmouseover="this.style.color='#8162EE'" onmouseout="this.style.color='#94A3B8'" title="Show/hide password">
                  <i data-lucide="eye" id="eyeIcon" style="width:18px;height:18px;"></i>
                </button>
              </div>
            </div>

            <!-- Remember Me -->
            <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;color:#475569;font-weight:600;font-size:0.8rem;margin-top:0.4rem;">
              <input type="checkbox" name="remember" checked style="accent-color:#8162EE;width:14px;height:14px;border-radius:4px;">
              Keep me signed in
            </label>

            <!-- Submit -->
            <button type="submit" id="loginBtn" class="btn-login-premium">
              Sign In <i data-lucide="arrow-right" style="width:18px;height:18px;"></i>
            </button>

            <!-- Registration Link for Laundry Owner. Using visibility instead of display none to reserve space and prevent height jumps! -->
            <div id="registerContainer" style="visibility:hidden; opacity:0; transition: opacity 0.3s ease; text-align:center; margin-top: 1rem; font-size: 0.8rem; height: 18px;">
              <span style="color:#64748B;font-weight:600;">Not registered?</span> 
              <a href="register.php" style="color:#8162EE; font-weight:800; text-decoration:none; margin-left:0.3rem;">
                Create an Account
              </a>
            </div>
          </form>
      </div> <!-- /login-content -->
    </div> <!-- /login-right -->
  </div>

<script>
  if (window.lucide) window.lucide.createIcons();

  // ------------------------------------------------------------------
  // Slideshow Logic
  // ------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function() {
    const slides = document.querySelectorAll('.slide');
    if(slides.length > 0) {
      let currentSlide = 0;
      setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
      }, 5000); 
    }
  });

  let pwdVisible = false;

  function selectRole(role) {
    const slider = document.getElementById('roleSlider');
    const tabAdmin = document.getElementById('tabAdmin');
    const tabOwner = document.getElementById('tabOwner');
    const registerLink = document.getElementById('registerContainer');

    if (role === 'admin') {
      slider.style.transform = 'translateX(0)';
      tabAdmin.classList.add('active');
      tabOwner.classList.remove('active');
      tabAdmin.style.color = '#8162EE';
      tabOwner.style.color = '#64748B';
      if(registerLink) {
        registerLink.style.visibility = 'hidden';
        registerLink.style.opacity = '0';
      }
      copyAndFill('admin@dhobipro.com', 'admin123');
    } else {
      slider.style.transform = 'translateX(100%)';
      tabOwner.classList.add('active');
      tabAdmin.classList.remove('active');
      tabOwner.style.color = '#10B981';
      tabAdmin.style.color = '#64748B';
      if(registerLink) {
        registerLink.style.visibility = 'visible';
        registerLink.style.opacity = '1';
      }
      copyAndFill('ashish.laundry@dhobipro.com', 'owner123');
    }
  }

  function togglePwd() {
    pwdVisible = !pwdVisible;
    const inp = document.getElementById('inputPassword');
    const ico = document.getElementById('eyeIcon');
    inp.type = pwdVisible ? 'text' : 'password';
    ico.setAttribute('data-lucide', pwdVisible ? 'eye-off' : 'eye');
    if (window.lucide) window.lucide.createIcons();
  }

  function copyAndFill(identifier, pwd) {
    document.getElementById('inputIdentifier').value = identifier;
    document.getElementById('inputPassword').value   = pwd;
  }

  document.getElementById('loginForm').addEventListener('submit', function() {
    const btn = document.getElementById('loginBtn');
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 0.9s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>&nbsp; Signing in...';
    btn.style.opacity = '0.85';
    btn.disabled = true;
  });

  const style = document.createElement('style');
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
</script>
</body>
</html>