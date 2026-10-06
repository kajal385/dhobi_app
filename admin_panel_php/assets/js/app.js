/**
 * DhobiPro Admin Panel - Core Application JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  // ─── 1. THEME MANAGEMENT ──────────────────────────────────────────
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  const savedTheme = localStorage.getItem('dhobipro_theme') || 'light';
  
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dhobipro_theme', theme);
    if (themeIcon) {
      themeIcon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
      if (window.lucide) window.lucide.createIcons();
    }
  }

  applyTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  // ─── 2. SIDEBAR TOGGLE & ACCORDIONS ──────────────────────────────
  const sidebar = document.getElementById('adminSidebar');
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');

  if (sidebarToggleBtn && sidebar) {
    sidebarToggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      const isCollapsed = sidebar.classList.contains('collapsed');
      localStorage.setItem('dhobipro_sidebar_collapsed', isCollapsed ? '1' : '0');
    });

    if (localStorage.getItem('dhobipro_sidebar_collapsed') === '1') {
      sidebar.classList.add('collapsed');
    }
  }

  // Submenu toggles
  function setupSubmenu(btnId, menuId, chevronId) {
    const btn = document.getElementById(btnId);
    const menu = document.getElementById(menuId);
    const chevron = document.getElementById(chevronId);
    if (btn && menu) {
      btn.addEventListener('click', () => {
        const isHidden = menu.style.display === 'none' || !menu.style.display;
        menu.style.display = isHidden ? 'flex' : 'none';
        if (chevron) {
          chevron.setAttribute('data-lucide', isHidden ? 'chevron-down' : 'chevron-right');
          if (window.lucide) window.lucide.createIcons();
        }
      });
    }
  }

  setupSubmenu('usersMenuBtn', 'usersSubmenu', 'usersMenuChevron');
  setupSubmenu('laundryMenuBtn', 'laundrySubmenu', 'laundryMenuChevron');

  // ─── 3. QUICK SEARCH (Ctrl + K) ───────────────────────────────────
  const quickSearchInput = document.getElementById('globalQuickSearch');
  const searchResultsDropdown = document.getElementById('quickSearchResults');

  if (quickSearchInput && searchResultsDropdown) {
    quickSearchInput.addEventListener('focus', () => {
      searchResultsDropdown.style.display = 'block';
    });

    quickSearchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const items = searchResultsDropdown.querySelectorAll('.search-result-item');
      let hasShortcutMatch = false;
      items.forEach(item => {
        const text = item.innerText.toLowerCase();
        const matches = !q || text.includes(q);
        item.style.display = matches ? 'flex' : 'none';
        if (matches) hasShortcutMatch = true;
      });

      // Hide dropdown if no shortcuts match, allowing the user to see the filtered table below
      if (!hasShortcutMatch && q) {
        searchResultsDropdown.style.display = 'none';
      } else {
        searchResultsDropdown.style.display = 'block';
      }

      // Live-filter on-screen data tables
      const tableRows = document.querySelectorAll('.data-table tbody tr');
      tableRows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = (!q || text.includes(q)) ? '' : 'none';
      });
    });

    document.addEventListener('click', (e) => {
      if (!quickSearchInput.contains(e.target) && !searchResultsDropdown.contains(e.target)) {
        searchResultsDropdown.style.display = 'none';
      }
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        quickSearchInput.focus();
        searchResultsDropdown.style.display = 'block';
      } else if (e.key === 'Escape') {
        searchResultsDropdown.style.display = 'none';
      }
    });
  }

  // ─── 4. USER PROFILE DROPDOWN ─────────────────────────────────────
  const userProfileBtn = document.getElementById('userProfileBtn');
  const userProfileDropdown = document.getElementById('userProfileDropdown');

  if (userProfileBtn && userProfileDropdown) {
    userProfileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = userProfileDropdown.style.display === 'none' || !userProfileDropdown.style.display;
      userProfileDropdown.style.display = isHidden ? 'block' : 'none';
    });

    document.addEventListener('click', (e) => {
      if (!userProfileDropdown.contains(e.target)) {
        userProfileDropdown.style.display = 'none';
      }
    });
  }
});

// ─── 5. GLOBAL REUSABLE HELPERS ──────────────────────────────────────
window.openModal = function (modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
};

window.closeModal = function (modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
};

window.showToast = function (message, type = 'success') {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 99999; display: flex; flex-direction: column; gap: 8px; pointer-events: none;';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bg = type === 'success' ? '#10B981' : (type === 'error' ? '#EF4444' : '#8162EE');
  toast.style.cssText = `background: ${bg}; color: #FFFFFF; padding: 12px 20px; border-radius: 10px; font-weight: 700; font-size: 0.85rem; box-shadow: 0 10px 25px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 8px; pointer-events: auto; animation: slideIn 0.25s ease;`;
  toast.innerHTML = `<span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

window.apiCall = async function (endpoint, method = 'GET', data = null) {
  const base = (window.DHOBI_CONFIG && window.DHOBI_CONFIG.baseUrl) ? window.DHOBI_CONFIG.baseUrl : '';
  const url = `${base}/includes/api_proxy.php?endpoint=${encodeURIComponent(endpoint)}`;

  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  try {
    const res = await fetch(url, options);
    const json = await res.json();
    return json;
  } catch (err) {
    console.error('API call error:', err);
    throw err;
  }
};
