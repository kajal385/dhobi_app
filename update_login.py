import sys

file_path = 'c:/CODEXXA_PROJECT/Dhobi_app/admin_panel_php/auth/login.php'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

parts = content.split('<style>')
if len(parts) == 2:
    new_html = '''<style>
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
    }
    
    .login-wrapper {
        display: flex;
        width: 100%;
        max-width: 1100px;
        min-height: 650px;
        background: #FFF;
        border-radius: 24px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
        overflow: hidden;
        margin: 2rem;
    }

    /* Left Side: Brand Image & Proposition */
    .login-left {
        flex: 1.2;
        background: linear-gradient(135deg, rgba(129, 98, 238, 0.95) 0%, rgba(50, 19, 143, 0.95) 100%), url('https://images.unsplash.com/photo-1545173168-9f1947eebb7f?q=80&w=2071&auto=format&fit=crop') center/cover no-repeat;
        padding: 4rem;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        color: #FFF;
        position: relative;
    }
    .login-left::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNykiLz48L3N2Zz4=') repeat;
        opacity: 0.5;
    }
    
    .brand-section {
        position: relative;
        z-index: 1;
    }
    .brand-logo-wrapper {
        width: 64px;
        height: 64px;
        background: #FFF;
        border-radius: 16px;
        padding: 8px;
        margin-bottom: 2rem;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    }
    .brand-title {
        font-size: 2.5rem;
        font-weight: 800;
        line-height: 1.2;
        margin: 0 0 1rem 0;
    }
    .brand-subtitle {
        font-size: 1.1rem;
        font-weight: 400;
        line-height: 1.6;
        color: rgba(255,255,255,0.85);
        max-width: 400px;
    }
    
    .feature-list {
        list-style: none;
        padding: 0;
        margin: 0;
        position: relative;
        z-index: 1;
    }
    .feature-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
        font-size: 1.05rem;
        font-weight: 600;
    }
    .feature-icon {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: rgba(255,255,255,0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(10px);
    }

    /* Right Side: Login Form */
    .login-right {
        flex: 1;
        padding: 4rem 3.5rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
        background: #FFF;
    }
    
    .login-header {
        margin-bottom: 2.5rem;
    }
    .login-header h2 {
        font-size: 1.75rem;
        font-weight: 800;
        color: #0F172A;
        margin: 0 0 0.5rem 0;
    }
    .login-header p {
        color: #64748B;
        font-size: 0.95rem;
        margin: 0;
    }

    .form-group {
        margin-bottom: 1.5rem;
    }
    .form-label {
        display: block;
        font-weight: 700;
        font-size: 0.85rem;
        color: #334155;
        margin-bottom: 0.5rem;
    }
    .form-control-modern {
        width: 100%;
        padding: 0.9rem 1rem 0.9rem 2.8rem;
        border: 2px solid #E2E8F0;
        border-radius: 12px;
        background: #F8FAFC;
        font-size: 0.95rem;
        color: #1E293B;
        font-family: "Plus Jakarta Sans", sans-serif;
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
        box-shadow: 0 0 0 4px rgba(129, 98, 238, 0.1);
    }
    .input-icon {
        position: absolute;
        left: 14px;
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
        padding: 1rem;
        font-size: 1rem;
        font-weight: 800;
        border-radius: 12px;
        background: linear-gradient(135deg, #8162EE 0%, #32138F 100%);
        border: none;
        color: #FFF;
        box-shadow: 0 10px 20px rgba(129, 98, 238, 0.25);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        transition: all 0.3s ease;
        margin-top: 2rem;
    }
    .btn-login-premium:hover {
        transform: translateY(-2px);
        box-shadow: 0 15px 30px rgba(129, 98, 238, 0.35);
    }
    .btn-login-premium:active {
        transform: translateY(1px);
    }
    
    .role-tabs {
        display: flex;
        background: #F1F5F9;
        border-radius: 12px;
        padding: 0.35rem;
        margin-bottom: 2rem;
        position: relative;
    }
    .role-tab {
        flex: 1;
        padding: 0.85rem;
        text-align: center;
        font-size: 0.9rem;
        font-weight: 800;
        color: #64748B;
        cursor: pointer;
        border-radius: 10px;
        transition: all 0.3s ease;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
    }
    .role-tab.active {
        color: #8162EE;
    }
    .role-slider {
        position: absolute;
        top: 0.35rem;
        bottom: 0.35rem;
        left: 0.35rem;
        width: calc(50% - 0.35rem);
        background: #FFF;
        border-radius: 10px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
        transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 1;
    }

    /* Responsive */
    @media (max-width: 900px) {
        .login-wrapper {
            flex-direction: column;
            max-width: 500px;
            margin: 1rem;
        }
        .login-left {
            padding: 3rem 2rem;
        }
        .feature-list {
            display: none;
        }
        .login-right {
            padding: 3rem 2rem;
        }
    }
</style>
</head>
<body>

  <div class="login-wrapper">
    <!-- Left Promotional Side -->
    <div class="login-left">
      <div class="brand-section">
        <div class="brand-logo-wrapper">
          <img src="<?= ADMIN_BASE_URL ?>/assets/images/logo.png" alt="DhobiPro" style="width:100%;height:100%;object-fit:contain;">
        </div>
        <h1 class="brand-title">Manage your laundry business seamlessly.</h1>
        <p class="brand-subtitle">The all-in-one platform for modern laundry operations, customer management, and analytics.</p>
      </div>

      <ul class="feature-list">
        <li class="feature-item">
          <div class="feature-icon"><i data-lucide="bar-chart-3" style="width:20px;height:20px;color:#FFF;"></i></div>
          <span>Real-time Operations Dashboard</span>
        </li>
        <li class="feature-item">
          <div class="feature-icon"><i data-lucide="users" style="width:20px;height:20px;color:#FFF;"></i></div>
          <span>Customer &amp; Vendor Management</span>
        </li>
        <li class="feature-item">
          <div class="feature-icon"><i data-lucide="shield-check" style="width:20px;height:20px;color:#FFF;"></i></div>
          <span>Secure Compliance &amp; KYC</span>
        </li>
      </ul>
    </div>

    <!-- Right Login Side -->
    <div class="login-right">
      <div class="login-header">
        <h2>Welcome Back</h2>
        <p>Please sign in to your account</p>
      </div>

      <?php if (!empty($error)): ?>
        <div style="background:#FEF2F2;color:#DC2626;padding:1rem;border-radius:12px;margin-bottom:1.5rem;font-size:0.85rem;font-weight:700;display:flex;align-items:center;gap:0.6rem;border:1px solid #FECACA;">
          <i data-lucide="alert-circle" style="width:20px;height:20px;flex-shrink:0;"></i>
          <span><?= htmlspecialchars($error) ?></span>
        </div>
      <?php endif; ?>

      <!-- Role Selector -->
      <div class="role-tabs">
        <div class="role-slider" id="roleSlider"></div>
        <div class="role-tab active" id="tabAdmin" onclick="selectRole('admin')">
          <i data-lucide="shield" style="width:18px;height:18px;"></i> Super Admin
        </div>
        <div class="role-tab" id="tabOwner" onclick="selectRole('owner')">
          <i data-lucide="store" style="width:18px;height:18px;"></i> Laundry Owner
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
            <i data-lucide="user" id="identifierIcon" class="input-icon" style="width:20px;height:20px;"></i>
          </div>
        </div>

        <!-- Password -->
        <div class="form-group">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
            <label class="form-label" style="margin:0;">Password</label>
            <a href="#" onclick="alert('Please contact platform administrator to reset your password.'); return false;" style="color:#8162EE;font-weight:700;font-size:0.8rem;text-decoration:none;">Forgot password?</a>
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
              style="padding-right:3rem;"
            />
            <i data-lucide="lock" class="input-icon" style="width:20px;height:20px;"></i>
            <button type="button" onclick="togglePwd()" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#94A3B8;padding:0;display:flex;align-items:center;transition:color 0.2s;" onmouseover="this.style.color='#8162EE'" onmouseout="this.style.color='#94A3B8'" title="Show/hide password">
              <i data-lucide="eye" id="eyeIcon" style="width:20px;height:20px;"></i>
            </button>
          </div>
        </div>

        <!-- Remember Me -->
        <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;color:#475569;font-weight:600;font-size:0.85rem;margin-top:0.5rem;">
          <input type="checkbox" name="remember" checked style="accent-color:#8162EE;width:16px;height:16px;border-radius:4px;">
          Keep me signed in
        </label>

        <!-- Submit -->
        <button type="submit" id="loginBtn" class="btn-login-premium">
          Sign In <i data-lucide="arrow-right" style="width:20px;height:20px;"></i>
        </button>

        <!-- Registration Link for Laundry Owner -->
        <div id="registerContainer" style="display:none; text-align:center; margin-top: 1.5rem; font-size: 0.9rem;">
          <span style="color:#64748B;font-weight:600;">Not registered?</span> 
          <a href="register.php" style="color:#8162EE; font-weight:800; text-decoration:none; margin-left:0.3rem;">
            Create an Account
          </a>
        </div>
      </form>
    </div>
  </div>

<script>
  if (window.lucide) window.lucide.createIcons();

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
      if(registerLink) registerLink.style.display = 'none';
      copyAndFill('admin@dhobipro.com', 'admin123');
    } else {
      slider.style.transform = 'translateX(100%)';
      tabOwner.classList.add('active');
      tabAdmin.classList.remove('active');
      tabOwner.style.color = '#10B981';
      tabAdmin.style.color = '#64748B';
      if(registerLink) registerLink.style.display = 'block';
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
</html>'''

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(parts[0] + new_html)
    print('Success')
else:
    print('Failed to split')
