// App Navigation Logic
function navigateTo(viewId) {
  if (viewId === 'view-step1' && !document.getElementById('view-step1')) {
     window.location.href = 'index.html';
     return;
  }
  // Hide all views
  document.querySelectorAll('.app-layout').forEach(view => {
    if (view.id !== 'notification-modal' && view.id !== 'location-modal') {
      view.classList.add('hidden');
      view.classList.remove('view-enter');
    }
  });
  
  // Show target view
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.remove('hidden');
    // Force reflow for animation
    void target.offsetWidth;
    target.classList.add('view-enter');
  }

  // Handle global UI elements (Bottom Nav & Trial Banner)
  const isMainView = ['view-dashboard', 'view-map', 'view-settings', 'view-emp-dashboard', 'view-emp-you', 'view-emp-requests', 'view-emp-settings'].includes(viewId);
  const ownerNav = document.getElementById('owner-bottom-nav');
  const empNav = document.getElementById('emp-bottom-nav');
  const trialBanner = document.getElementById('trial-banner');
  
  if (ownerNav) {
    if (isMainView && selectedRole === 'business') {
      if(ownerNav.classList.contains('hidden')) {
          ownerNav.classList.remove('hidden');
          void ownerNav.offsetWidth;
          ownerNav.classList.add('view-enter');
      }
    } else {
      ownerNav.classList.add('hidden');
      ownerNav.classList.remove('view-enter');
    }
  }

  if (empNav) {
    if (isMainView && selectedRole === 'employee') {
      if(empNav.classList.contains('hidden')) {
          empNav.classList.remove('hidden');
          void empNav.offsetWidth;
          empNav.classList.add('view-enter');
      }
    } else {
      empNav.classList.add('hidden');
      empNav.classList.remove('view-enter');
    }
  }
  
  if (trialBanner) {
    if (isMainView) {
      if(trialBanner.classList.contains('hidden')) {
          trialBanner.classList.remove('hidden');
          void trialBanner.offsetWidth;
          trialBanner.classList.add('view-enter');
      }
    } else {
      trialBanner.classList.add('hidden');
      trialBanner.classList.remove('view-enter');
    }
  }

  // Update Bottom Nav Active States
  if (isMainView) {
    const activeNav = selectedRole === 'employee' ? empNav : ownerNav;
    if (activeNav) {
      activeNav.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.classList.remove('active');
        const icon = item.querySelector('.nav-icon');
        const text = item.querySelector('span');
        if (icon) {
          icon.style.background = 'transparent';
          icon.style.padding = '0';
        }
        if (text) text.style.color = '#9CA3AF';
      });

      let activeItem = null;
      if (viewId === 'view-dashboard') activeItem = document.getElementById('nav-staff');
      if (viewId === 'view-map') activeItem = document.getElementById('nav-map');
      if (viewId === 'view-settings') activeItem = document.getElementById('nav-settings');
      if (viewId === 'view-emp-dashboard') activeItem = document.getElementById('nav-punch');
      if (viewId === 'view-emp-you') activeItem = document.getElementById('nav-you');
      if (viewId === 'view-emp-requests') activeItem = document.getElementById('nav-req');
      if (viewId === 'view-emp-settings') activeItem = document.getElementById('nav-settings-emp');

      if (activeItem) {
        activeItem.classList.add('active');
        const icon = activeItem.querySelector('.nav-icon');
        const text = activeItem.querySelector('span');
        if (icon) {
          // Employee nav uses #1E3A8A for active icon background, Owner uses #2563EB
          icon.style.background = selectedRole === 'employee' ? '#1E3A8A' : '#2563EB';
          icon.style.padding = '8px 24px';
          icon.style.borderRadius = '20px';
        }
        if (text) {
          text.style.color = 'white';
          text.style.fontWeight = '500';
        }
      }
    }
  }

  // Show notification modal if navigating to dashboard from step3 (simulate first login)
  if (viewId === 'view-dashboard' && !window.notificationShown) {
    setTimeout(() => { openModal('notification-modal'); }, 400);
    window.notificationShown = true;
  }
  
  // Show location modal if navigating to map (simulate first time)
  if (viewId === 'view-map' && !window.locationShown) {
    setTimeout(() => { openModal('location-modal'); }, 400);
    window.locationShown = true;
  }
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('hidden');
    void modal.offsetWidth; // Force reflow
    modal.classList.add('modal-enter');
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('modal-exit');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('modal-exit');
      modal.classList.remove('modal-enter');
    }, 200);
  }
}

// Step 1 Selection Cards - selectedRole is declared per-page in a script block
// (owner.html sets 'business', employee.html sets 'employee', index.html defaults to 'business')
if (typeof selectedRole === 'undefined') { var selectedRole = 'business'; }

function selectRole(role) {
  selectedRole = role;
  const cards = document.querySelectorAll('.selection-card');
  cards.forEach(card => {
    card.classList.remove('active');
    card.classList.add('inactive');
  });

  if (role === 'employee') {
    cards[0].classList.add('active');
    cards[0].classList.remove('inactive');
  } else {
    cards[1].classList.add('active');
    cards[1].classList.remove('inactive');
  }
}

// ─── STEP 1: Role Selection → Route to correct auth flow ─────────────────
function handleStep1Continue() {
  if (selectedRole === 'employee') {
    window.location.href = 'employee.html';
  } else {
    window.location.href = 'owner.html';
  }
}

// ─── UI Helper: show inline auth errors ──────────────────────────────────
function showAuthError(containerId, message) {
  let el = document.getElementById(containerId);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
}
function clearAuthError(containerId) {
  let el = document.getElementById(containerId);
  if (el) { el.textContent = ''; el.classList.add('hidden'); }
}

// ─── OWNER AUTH: Sign in OR sign up on Step 2 form submit ────────────────
async function handleOwnerAuth() {
  const email    = document.getElementById('owner-email')?.value?.trim();
  const password = document.getElementById('owner-password')?.value;
  const company  = document.getElementById('owner-company')?.value?.trim();
  const isSignUp = document.getElementById('owner-signup-toggle')?.checked;

  clearAuthError('owner-auth-error');

  if (!email || !password) {
    return showAuthError('owner-auth-error', 'Email and password are required.');
  }

  const btn = document.getElementById('btn-owner-auth');
  if (btn) { btn.disabled = true; btn.textContent = 'Please wait…'; }

  let result;
  if (isSignUp) {
    if (!company) {
      if (btn) { btn.disabled = false; btn.textContent = 'Continue'; }
      return showAuthError('owner-auth-error', 'Company name is required for sign up.');
    }
    result = await Auth.signUpOwner(email, password, company);
  } else {
    result = await Auth.signIn(email, password);
  }

  if (!result.success) {
    if (btn) { btn.disabled = false; btn.textContent = 'Continue'; }
    return showAuthError('owner-auth-error', result.error);
  }

  // Success → go to dashboard
  navigateTo('view-dashboard');
}

// ─── EMPLOYEE AUTH: Sign in OR sign up on Step 2 form submit ─────────────
async function handleEmployeeAuth() {
  const email    = document.getElementById('emp-email')?.value?.trim();
  const password = document.getElementById('emp-password')?.value;

  clearAuthError('emp-auth-error');

  if (!email || !password) {
    return showAuthError('emp-auth-error', 'Email and password are required.');
  }

  const btn = document.getElementById('btn-emp-auth');
  if (btn) { btn.disabled = true; btn.textContent = 'Please wait…'; }

  const result = await Auth.signIn(email, password);

  if (!result.success) {
    if (btn) { btn.disabled = false; btn.textContent = 'Continue'; }
    return showAuthError('emp-auth-error', result.error);
  }

  navigateTo('view-emp-dashboard');
}


function validateEmpStep2() {
  let isValid = true;
  
  const fname = document.getElementById('emp-fname');
  const lname = document.getElementById('emp-lname');
  const ccode = document.getElementById('emp-ccode');
  
  // reset errors
  document.querySelectorAll('#view-emp-step2 .error-msg').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('#view-emp-step2 .input-error').forEach(el => el.classList.remove('input-error'));

  if (!fname.value.trim()) {
    isValid = false;
    fname.classList.add('input-error');
    document.getElementById('err-fname').classList.remove('hidden');
  }
  if (!lname.value.trim()) {
    isValid = false;
    lname.classList.add('input-error');
    document.getElementById('err-lname').classList.remove('hidden');
  }
  if (!ccode.value.trim()) {
    isValid = false;
    ccode.classList.add('input-error');
    document.getElementById('err-ccode').classList.remove('hidden');
  }

  if (isValid) {
    navigateTo('view-emp-step3');
  }
}

// Interactive Switches
document.querySelectorAll('.switch').forEach(el => {
  el.addEventListener('click', () => {
    el.classList.toggle('active');
  });
});

// Initialize first view animation + session-aware routing
document.addEventListener('DOMContentLoaded', async () => {
  const path = window.location.pathname;
  const isOwnerPage    = path.endsWith('owner.html');
  const isEmployeePage = path.endsWith('employee.html');

  // ── Route Guard: check if already logged in ───────────────────────────
  if (isOwnerPage || isEmployeePage) {
    const session = await Auth.getSession();
    if (session) {
      const profile = await Auth.getProfile();
      if (profile) {
        // Restore session — skip onboarding, jump to dashboard
        console.log('[App] Existing session found for:', profile.name, '|', profile.role);
        if (isOwnerPage && profile.role === 'admin') {
          navigateTo('view-dashboard');
          return;
        }
        if (isEmployeePage && profile.role === 'employee') {
          navigateTo('view-emp-dashboard');
          return;
        }
      }
    }
  }

  // ── No session: show the first onboarding step ───────────────────────
  let firstView = document.getElementById('view-step1');
  if (isOwnerPage)    firstView = document.getElementById('view-step2');
  if (isEmployeePage) firstView = document.getElementById('view-emp-step2');

  if (firstView) {
    firstView.classList.remove('hidden');
    firstView.classList.add('view-enter');
  }
});


// Employee Permissions Logic
let empPermissions = {
  notif: true, // Already checked in UI mockup
  loc: true,
  phys: true,
  locSvc: false,
  batt: false,
  auto: false
};

function allowPermission(key) {
  empPermissions[key] = true;
  
  const btn = document.getElementById(`btn-allow-${key}`);
  const check = document.getElementById(`check-${key}`);
  const icon = document.getElementById(`icon-${key}`);
  
  if (btn) btn.classList.add('hidden');
  if (check) check.classList.remove('hidden');
  if (icon) icon.style.color = '#22C55E';
  
  // Show battery modal for specific permissions
  if (key === 'batt' || key === 'auto') {
    setTimeout(() => { openModal('battery-modal'); }, 300);
  }
  
  checkAllPermissions();
}

function checkAllPermissions() {
  const allAllowed = Object.values(empPermissions).every(v => v);
  const continueBtn = document.getElementById('btn-perm-continue');
  if (allAllowed && continueBtn) {
    continueBtn.style.background = '#0F766E';
    continueBtn.style.opacity = '1';
    continueBtn.disabled = false;
    continueBtn.onclick = () => navigateTo('view-emp-dashboard');
  }
}

// Employee Punch Logic
let isPunchedIn = false;

async function handlePunch() {
  closeModal('punch-modal');

  const banner      = document.getElementById('emp-top-banner');
  const statusText  = document.getElementById('emp-status-text');
  const btnPunch    = document.getElementById('btn-punch');
  const modalTitle  = document.getElementById('punch-modal-title');
  const modalDesc   = document.getElementById('punch-modal-desc');
  const modalConfirm = document.getElementById('punch-modal-confirm');

  // Show loading state
  if (btnPunch) { btnPunch.disabled = true; btnPunch.textContent = '⏳ Processing…'; }
  if (banner) { banner.textContent = 'Getting your location…'; banner.style.background = '#1E3A5F'; }

  // Call real Attendance module (camera video element = null for now until camera UI is built)
  const result = isPunchedIn
    ? await Attendance.clockOut(null)
    : await Attendance.clockIn(null);

  if (btnPunch) btnPunch.disabled = false;

  if (!result.success) {
    // Show error in banner
    if (banner) {
      banner.textContent = `❌ ${result.error}`;
      banner.style.background = '#7F1D1D';
    }
    if (statusText) statusText.textContent = 'Something went wrong. Try again.';
    return;
  }

  // Toggle state on success
  isPunchedIn = !isPunchedIn;
  const offlineSuffix = result.offline ? ' (saved offline)' : '';

  if (isPunchedIn) {
    if (banner) {
      banner.textContent = `✅ Attendance marked successfully${offlineSuffix}`;
      banner.style.background = '#065F46';
    }
    if (statusText) statusText.textContent = 'You have successfully logged in!';
    if (btnPunch) { btnPunch.textContent = 'Punch OUT'; btnPunch.style.background = '#EF4444'; }
    if (modalTitle) { modalTitle.textContent = 'Punching OUT?'; modalTitle.style.color = '#EF4444'; }
    if (modalDesc) modalDesc.textContent = 'Are you sure you want to punch OUT?';
    if (modalConfirm) modalConfirm.style.color = '#EF4444';
  } else {
    if (banner) {
      banner.textContent = `You have successfully logged off${offlineSuffix}`;
      banner.style.background = '#374151';
    }
    if (statusText) statusText.textContent = 'You have successfully logged off!';
    if (btnPunch) { btnPunch.textContent = 'Punch IN'; btnPunch.style.background = '#4ADE80'; }
    if (modalTitle) { modalTitle.textContent = 'Punching IN?'; modalTitle.style.color = '#4ADE80'; }
    if (modalDesc) modalDesc.textContent = 'Are you sure you want to punch IN?';
    if (modalConfirm) modalConfirm.style.color = '#4ADE80';
  }
}
