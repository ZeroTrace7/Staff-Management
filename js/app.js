// App shell: routing, auth UI, owner setup, employee punch flow.

if (typeof selectedRole === 'undefined') {
  var selectedRole = 'business';
}

let isPunchedIn = false;
let employeePunchBlob = null;
let employeePunchPreviewUrl = null;
let employeeDashboardInitialized = false;

function navigateTo(viewId) {
  document.querySelectorAll('.app-layout').forEach((view) => {
    view.classList.add('hidden');
    view.classList.remove('view-enter');
  });

  const target = document.getElementById(viewId);
  if (!target) return;

  target.classList.remove('hidden');
  void target.offsetWidth;
  target.classList.add('view-enter');

  const isMainView = [
    'view-dashboard',
    'view-map',
    'view-payroll',
    'view-settings',
    'view-emp-dashboard',
    'view-emp-you',
    'view-emp-requests',
    'view-emp-settings'
  ].includes(viewId);

  const ownerNav = document.getElementById('owner-bottom-nav');
  const empNav = document.getElementById('emp-bottom-nav');

  if (ownerNav) ownerNav.classList.toggle('hidden', !(isMainView && selectedRole === 'business'));
  if (empNav) empNav.classList.toggle('hidden', !(isMainView && selectedRole === 'employee'));

  const activeNav = selectedRole === 'employee' ? empNav : ownerNav;
  if (activeNav) {
    activeNav.querySelectorAll('.bottom-nav-item').forEach((item) => {
      item.classList.remove('active');
      const icon = item.querySelector('.nav-icon');
      const text = item.querySelector('span');
      if (icon) {
        icon.style.background = 'transparent';
        icon.style.padding = '0';
        icon.style.borderRadius = '0';
      }
      if (text) {
        text.style.color = '#9CA3AF';
        text.style.fontWeight = '400';
      }
    });

    const activeMap = {
      'view-dashboard': 'nav-staff',
      'view-map': 'nav-map',
      'view-payroll': 'nav-payroll',
      'view-settings': 'nav-settings',
      'view-emp-dashboard': 'nav-punch',
      'view-emp-you': 'nav-you',
      'view-emp-requests': 'nav-req',
      'view-emp-settings': 'nav-settings-emp'
    };
    const activeItem = document.getElementById(activeMap[viewId]);
    if (activeItem) {
      activeItem.classList.add('active');
      const icon = activeItem.querySelector('.nav-icon');
      const text = activeItem.querySelector('span');
      if (icon) {
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

  if (viewId === 'view-dashboard') {
    AdminDashboard.init();
  }
  if (viewId === 'view-map') {
    AdminDashboard.loadMap();
  }
  if (viewId === 'view-payroll') {
    initPayrollView();
  }
  if (viewId === 'view-emp-dashboard' && employeeDashboardInitialized) {
    restoreEmployeePunchState();
  }
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.classList.remove('hidden');
  void modal.offsetWidth;
  modal.classList.add('modal-enter');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.classList.add('modal-exit');
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('modal-enter');
    modal.classList.remove('modal-exit');
  }, 180);
}

function selectRole(role) {
  selectedRole = role;
  const cards = document.querySelectorAll('.selection-card');
  cards.forEach((card) => {
    card.classList.remove('active');
    card.classList.add('inactive');
  });

  if (role === 'employee') {
    cards[0]?.classList.add('active');
    cards[0]?.classList.remove('inactive');
  } else {
    cards[1]?.classList.add('active');
    cards[1]?.classList.remove('inactive');
  }
}

function handleStep1Continue() {
  if (selectedRole === 'employee') {
    window.location.href = 'employee.html';
  } else {
    window.location.href = 'owner.html';
  }
}

function showAuthError(containerId, message) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
}

function clearAuthError(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.textContent = '';
  el.classList.add('hidden');
}

function showStatusMessage(containerId, message) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
  el.classList.remove('status-pop');
  void el.offsetWidth;
  el.classList.add('status-pop');
}

function clearStatusMessage(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.textContent = '';
  el.classList.add('hidden');
  el.classList.remove('status-pop');
}

function toggleOwnerConfirmationResend(show) {
  const btn = document.getElementById('btn-resend-owner-confirmation');
  if (!btn) return;
  btn.classList.toggle('hidden', !show);
}

function showStartupError(message) {
  showAuthError('owner-auth-error', message);
  showAuthError('emp-auth-error', message);
}

function showInitialView(isOwnerPage, isEmployeePage) {
  let firstView = document.getElementById('view-step1');
  if (isOwnerPage) firstView = document.getElementById('view-step2');
  if (isEmployeePage) firstView = document.getElementById('view-emp-step2');

  if (firstView) {
    firstView.classList.remove('hidden');
    firstView.classList.add('view-enter');
  }
}

async function handleOwnerAuth() {
  const email = document.getElementById('owner-email')?.value?.trim();
  const password = document.getElementById('owner-password')?.value;
  const company = document.getElementById('owner-company')?.value?.trim();
  const isSignUp = document.getElementById('owner-signup-toggle')?.checked;

  clearAuthError('owner-auth-error');
  toggleOwnerConfirmationResend(false);
  if (!email || !password) {
    return showAuthError('owner-auth-error', 'Email and password are required.');
  }

  const btn = document.getElementById('btn-owner-auth');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Please wait...';
  }

  let result;
  if (isSignUp) {
    if (!company) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Continue';
      }
      return showAuthError('owner-auth-error', 'Company name is required.');
    }
    result = await Auth.signUpOwner(email, password, company);
  } else {
    result = await Auth.signIn(email, password, {
      allowOwnerBootstrap: true,
      companyName: company
    });
  }

  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Continue';
  }

  if (!result.success) {
    toggleOwnerConfirmationResend(result.error === 'Check your email and confirm your account before signing in.');
    return showAuthError('owner-auth-error', result.error);
  }

  if (result.needsConfirmation) {
    toggleOwnerConfirmationResend(true);
    return showAuthError('owner-auth-error', result.message);
  }

  if (result.profile?.role === 'employee') {
    window.location.href = 'employee.html';
    return;
  }

  selectedRole = 'business';
  navigateTo('view-dashboard');
  await initializeOwnerExperience();
}

async function handleResendOwnerConfirmation() {
  const email = document.getElementById('owner-email')?.value?.trim();
  const company = document.getElementById('owner-company')?.value?.trim();
  const btn = document.getElementById('btn-resend-owner-confirmation');

  clearAuthError('owner-auth-error');
  if (!email) {
    toggleOwnerConfirmationResend(false);
    return showAuthError('owner-auth-error', 'Email is required.');
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Sending...';
  }

  const result = await Auth.resendOwnerConfirmation(email, company);

  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Resend confirmation email';
  }

  toggleOwnerConfirmationResend(!result.success);
  return showAuthError('owner-auth-error', result.success ? result.message : result.error);
}

async function handleEmployeeAuth() {
  const email = document.getElementById('emp-email')?.value?.trim();
  const password = document.getElementById('emp-password')?.value;

  clearAuthError('emp-auth-error');
  if (!email || !password) {
    return showAuthError('emp-auth-error', 'Email and password are required.');
  }

  const btn = document.getElementById('btn-emp-auth');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Please wait...';
  }

  const result = await Auth.signIn(email, password);

  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }

  if (!result.success) {
    const message = String(result.error || '').toLowerCase().includes('invalid login credentials')
      ? 'Check the email and temporary password from your owner.'
      : result.error;
    return showAuthError('emp-auth-error', message);
  }

  if (result.profile?.role === 'admin') {
    window.location.href = 'owner.html';
    return;
  }

  selectedRole = 'employee';
  navigateTo('view-emp-dashboard');
  await initializeEmployeeExperience();
}

async function initializeOwnerExperience() {
  await AdminDashboard.init();
  const profile = await Auth.getProfile();
  const company = profile ? await Auth.getCompany(profile.company_id) : null;

  // Populate payroll settings inputs from company data
  if (company) {
    window._cachedCompanyData = company;
    populatePayrollConfig(company);
  }

  if (company && Number(company.geofence_lat) === 0 && Number(company.geofence_lng) === 0) {
    openModal('geofence-modal');
  }
}

async function handleAddEmployee() {
  clearAuthError('add-employee-error');
  clearStatusMessage('add-employee-success');

  const name = document.getElementById('add-employee-name')?.value?.trim();
  const email = document.getElementById('add-employee-email')?.value?.trim();
  const password = document.getElementById('add-employee-password')?.value;

  if (!name || !email || !password) {
    return showAuthError('add-employee-error', 'Name, email, and password are required.');
  }

  const btn = document.getElementById('btn-add-employee');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Creating...';
  }

  const result = await Auth.provisionEmployee(email, password, name);

  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Create Employee';
  }

  if (!result.success) {
    clearStatusMessage('add-employee-success');
    return showAuthError('add-employee-error', result.error);
  }

  showStatusMessage('add-employee-success', `${result.employee?.name || name} added successfully. They can sign in with the email and temporary password.`);

  ['add-employee-name', 'add-employee-email', 'add-employee-password'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  await AdminDashboard.refresh();
  setTimeout(() => {
    closeModal('add-employee-modal');
    clearStatusMessage('add-employee-success');
  }, 1400);
}

async function useCurrentLocationForGeofence() {
  clearAuthError('geofence-error');
  const btn = document.querySelector('button[onclick="useCurrentLocationForGeofence()"]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Getting location...';
  }

  try {
    const pos = await LocationService.getCurrentPosition();
    const lat = document.getElementById('geofence-lat');
    const lng = document.getElementById('geofence-lng');
    if (lat) lat.value = Number(pos.lat).toFixed(6);
    if (lng) lng.value = Number(pos.lng).toFixed(6);
    showAuthError('geofence-error', 'Location captured. Save the geofence to continue.');
  } catch (err) {
    showAuthError('geofence-error', err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Use Current Location';
    }
  }
}

async function handleSaveGeofence() {
  clearAuthError('geofence-error');

  const profile = await Auth.getProfile();
  if (!profile) {
    return showAuthError('geofence-error', 'You must be signed in.');
  }

  const lat = Number(document.getElementById('geofence-lat')?.value);
  const lng = Number(document.getElementById('geofence-lng')?.value);
  const radius = Number(document.getElementById('geofence-radius')?.value || 100);
  const workStart = document.getElementById('work-start-time')?.value || '09:00';

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return showAuthError('geofence-error', 'Latitude and longitude are required.');
  }
  if (lat === 0 && lng === 0) {
    return showAuthError('geofence-error', 'Use your office location before saving.');
  }
  if (!Number.isFinite(radius) || radius < 10) {
    return showAuthError('geofence-error', 'Radius must be at least 10 metres.');
  }

  const btn = document.getElementById('btn-save-geofence');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Saving...';
  }

  const result = await Auth.updateCompanySettings(profile.company_id, {
    geofence_lat: lat,
    geofence_lng: lng,
    geofence_radius: radius,
    work_start_time: workStart
  });

  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Save Geofence';
  }

  if (!result.success) {
    return showAuthError('geofence-error', result.error);
  }

  AdminDashboard._company = result.company;
  AdminDashboard.populateGeofenceSummary(result.company);
  closeModal('geofence-modal');
  await AdminDashboard.refresh();
  if (!document.getElementById('view-map')?.classList.contains('hidden')) {
    await AdminDashboard.loadMap();
  }
}

function showEmployeeBanner(message, background) {
  const banner = document.getElementById('emp-top-banner');
  if (!banner) return;
  banner.textContent = message;
  if (background) {
    banner.style.background = background;
  }
}

function applyPunchState(punchedIn, lastLog) {
  isPunchedIn = punchedIn;

  const statusText = document.getElementById('emp-status-text');
  const btnPunch = document.getElementById('btn-punch');
  const modalTitle = document.getElementById('punch-modal-title');
  const modalDesc = document.getElementById('punch-modal-desc');
  const modalConfirm = document.getElementById('punch-modal-confirm');

  if (punchedIn) {
    const time = lastLog ? Utils.formatTime(lastLog.timestamp) : '';
    showEmployeeBanner(`You are punched in${time ? ` since ${time}` : ''}`, '#065F46');
    if (statusText) statusText.textContent = 'You are currently clocked in.';
    if (btnPunch) {
      btnPunch.disabled = false;
      btnPunch.textContent = 'Punch OUT';
      btnPunch.style.background = '#EF4444';
    }
    if (modalTitle) {
      modalTitle.textContent = 'Punching OUT?';
      modalTitle.style.color = '#EF4444';
    }
    if (modalDesc) modalDesc.textContent = 'Capture a fresh selfie to punch OUT.';
    if (modalConfirm) modalConfirm.style.color = '#EF4444';
  } else {
    if (lastLog?.type === 'clock_out') {
      showEmployeeBanner(`Last punch out at ${Utils.formatTime(lastLog.timestamp)}`, '#374151');
    } else {
      showEmployeeBanner('Please punch in to mark your attendance', '#374151');
    }
    if (statusText) statusText.textContent = 'Ready to start your day?';
    if (btnPunch) {
      btnPunch.disabled = false;
      btnPunch.textContent = 'Punch IN';
      btnPunch.style.background = '#4ADE80';
    }
    if (modalTitle) {
      modalTitle.textContent = 'Punching IN?';
      modalTitle.style.color = '#4ADE80';
    }
    if (modalDesc) modalDesc.textContent = 'Capture a fresh selfie to punch IN.';
    if (modalConfirm) modalConfirm.style.color = '#4ADE80';
  }
}

async function restoreEmployeePunchState() {
  const state = await Attendance.getPunchState();
  applyPunchState(state.isPunchedIn, state.lastLog);
}

async function initializeEmployeeExperience() {
  employeeDashboardInitialized = true;
  await restoreEmployeePunchState();
}

function resetEmployeeCameraState() {
  employeePunchBlob = null;
  CameraService.stopCamera();

  if (employeePunchPreviewUrl) {
    URL.revokeObjectURL(employeePunchPreviewUrl);
    employeePunchPreviewUrl = null;
  }

  const video = document.getElementById('emp-camera-video');
  const preview = document.getElementById('emp-camera-preview');
  const captureBtn = document.getElementById('btn-capture-selfie');
  const submitBtn = document.getElementById('btn-submit-punch');
  const retakeBtn = document.getElementById('btn-retake-selfie');
  const error = document.getElementById('emp-camera-error');

  if (video) video.classList.remove('hidden');
  if (preview) {
    preview.classList.add('hidden');
    preview.removeAttribute('src');
  }
  if (captureBtn) {
    captureBtn.classList.remove('hidden');
    captureBtn.disabled = false;
    captureBtn.textContent = 'Capture';
  }
  if (submitBtn) {
    submitBtn.classList.add('hidden');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Punch';
  }
  if (retakeBtn) retakeBtn.classList.add('hidden');
  if (error) {
    error.textContent = '';
    error.classList.add('hidden');
  }
}

function showEmployeeCameraError(message) {
  const error = document.getElementById('emp-camera-error');
  if (!error) return;
  error.textContent = message;
  error.classList.remove('hidden');
}

async function startEmployeeCamera() {
  resetEmployeeCameraState();
  navigateTo('view-emp-camera');

  const video = document.getElementById('emp-camera-video');
  const started = await CameraService.startCamera(video);
  if (!started.success) {
    navigateTo('view-emp-dashboard');
    showEmployeeBanner(started.error, '#7F1D1D');
  }
}

async function handlePunch() {
  closeModal('punch-modal');
  await startEmployeeCamera();
}

async function captureEmployeeSelfie() {
  try {
    const video = document.getElementById('emp-camera-video');
    employeePunchBlob = await CameraService.captureFrame(video);
    CameraService.stopCamera();

    const preview = document.getElementById('emp-camera-preview');
    const captureBtn = document.getElementById('btn-capture-selfie');
    const submitBtn = document.getElementById('btn-submit-punch');
    const retakeBtn = document.getElementById('btn-retake-selfie');

    employeePunchPreviewUrl = URL.createObjectURL(employeePunchBlob);
    if (preview) {
      preview.src = employeePunchPreviewUrl;
      preview.classList.remove('hidden');
    }
    if (video) video.classList.add('hidden');
    if (captureBtn) captureBtn.classList.add('hidden');
    if (submitBtn) submitBtn.classList.remove('hidden');
    if (retakeBtn) retakeBtn.classList.remove('hidden');
  } catch (err) {
    showEmployeeCameraError(err.message);
  }
}

async function retakeEmployeeSelfie() {
  await startEmployeeCamera();
}

function cancelEmployeeCamera() {
  resetEmployeeCameraState();
  navigateTo('view-emp-dashboard');
}

// ── GEOFENCE REJECTION MODAL HANDLER ──────────────────────────────────────
function showGeofenceRejection(errorMessage) {
  // Parse distance and radius from the error message
  // Error format: "You are 832m from the office. Move within the 100m zone to mark attendance."
  const distMatch = errorMessage.match(/You are (\d+)m from/i);
  const radiusMatch = errorMessage.match(/within the (\d+)m zone/i);
  const distance = distMatch ? distMatch[1] : '—';
  const radius = radiusMatch ? radiusMatch[1] : '—';

  const msgEl = document.getElementById('geofence-reject-message');
  const distEl = document.getElementById('geofence-reject-distance');

  if (msgEl) {
    msgEl.textContent = `You are outside your office area. Please move within ${radius}m of the office to mark your attendance.`;
  }
  if (distEl) {
    distEl.textContent = `${distance}m away from office`;
  }

  // Navigate back to dashboard before showing modal
  resetEmployeeCameraState();
  navigateTo('view-emp-dashboard');
  showEmployeeBanner('Cannot punch — you are outside the office zone.', '#7F1D1D');
  openModal('geofence-reject-modal');
}

function isGeofenceError(errorMessage) {
  return typeof errorMessage === 'string' && (
    errorMessage.includes('from the office') ||
    errorMessage.includes('zone to mark attendance') ||
    errorMessage.includes('outside the office') ||
    errorMessage.includes('Attendance cannot be saved from this location')
  );
}

async function submitEmployeePunch() {
  if (!employeePunchBlob) {
    return showEmployeeCameraError('Capture a selfie before continuing.');
  }

  const submitBtn = document.getElementById('btn-submit-punch');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
  }

  showEmployeeBanner('Verifying GPS and uploading your selfie...', '#1E3A8A');

  const result = isPunchedIn
    ? await Attendance.clockOut(employeePunchBlob)
    : await Attendance.clockIn(employeePunchBlob);

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Punch';
  }

  if (!result.success) {
    // Show the geofence rejection modal for location errors
    if (isGeofenceError(result.error)) {
      return showGeofenceRejection(result.error);
    }
    // Other errors: show in the camera view
    showEmployeeBanner(result.error, '#7F1D1D');
    return showEmployeeCameraError(result.error);
  }

  resetEmployeeCameraState();
  navigateTo('view-emp-dashboard');
  applyPunchState(!isPunchedIn, result.record);

  const suffix = result.offline ? ' Saved offline and will sync automatically.' : '';
  showEmployeeBanner(`Attendance recorded successfully.${suffix}`, '#065F46');
}

const empPermissions = {
  notif: true,
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

  if (key === 'batt' || key === 'auto') {
    setTimeout(() => openModal('battery-modal'), 250);
  }

  const allAllowed = Object.values(empPermissions).every(Boolean);
  const continueBtn = document.getElementById('btn-perm-continue');
  if (allAllowed && continueBtn) {
    continueBtn.disabled = false;
    continueBtn.style.opacity = '1';
    continueBtn.style.background = '#0F766E';
    continueBtn.onclick = () => navigateTo('view-emp-dashboard');
  }
}

// ─── PAYROLL HANDLERS ─────────────────────────────────────────────────────────

let currentSalaryEditUserId = null;

/**
 * Open salary config modal for a specific employee.
 */
async function openSalarySetup(userId, userName) {
  currentSalaryEditUserId = userId;
  const modal = document.getElementById('salary-setup-modal');
  if (!modal) return;

  const nameEl = document.getElementById('salary-setup-name');
  if (nameEl) nameEl.textContent = userName || 'Employee';

  // Load existing config
  const config = await Payroll.getSalaryConfig(userId);
  const ctcInput = document.getElementById('salary-ctc');
  const basicInput = document.getElementById('salary-basic-pct');
  const hraInput = document.getElementById('salary-hra-pct');
  const specialDisplay = document.getElementById('salary-special-display');
  const bankInput = document.getElementById('salary-bank-account');
  const ifscInput = document.getElementById('salary-bank-ifsc');
  const panInput = document.getElementById('salary-pan');

  if (config) {
    if (ctcInput) ctcInput.value = config.monthly_ctc || '';
    if (basicInput) basicInput.value = config.basic_pct || 50;
    if (hraInput) hraInput.value = config.hra_pct || 20;
    if (bankInput) bankInput.value = config.bank_account || '';
    if (ifscInput) ifscInput.value = config.bank_ifsc || '';
    if (panInput) panInput.value = config.pan || '';
  } else {
    if (ctcInput) ctcInput.value = '';
    if (basicInput) basicInput.value = '50';
    if (hraInput) hraInput.value = '20';
    if (bankInput) bankInput.value = '';
    if (ifscInput) ifscInput.value = '';
    if (panInput) panInput.value = '';
  }

  updateSpecialAllowance();
  openModal('salary-setup-modal');
}

/**
 * Update the "Special Allowance" display based on Basic% + HRA%.
 */
function updateSpecialAllowance() {
  const basic = parseFloat(document.getElementById('salary-basic-pct')?.value) || 0;
  const hra = parseFloat(document.getElementById('salary-hra-pct')?.value) || 0;
  const ctc = parseFloat(document.getElementById('salary-ctc')?.value) || 0;
  const remaining = 100 - basic - hra;
  const specialEl = document.getElementById('salary-special-display');
  if (specialEl) {
    const amount = ctc > 0 ? Payroll.formatCurrency(ctc * remaining / 100) : '—';
    specialEl.textContent = `${remaining}% ${ctc > 0 ? '= ' + amount : ''}`;
  }
}

/**
 * Save salary config from the modal.
 */
async function handleSaveSalaryConfig() {
  const errEl = document.getElementById('salary-setup-error');
  const successEl = document.getElementById('salary-setup-success');
  if (errEl) { errEl.classList.add('hidden'); errEl.textContent = ''; }
  if (successEl) { successEl.classList.add('hidden'); successEl.textContent = ''; }

  const ctc = parseFloat(document.getElementById('salary-ctc')?.value);
  const basicPct = parseFloat(document.getElementById('salary-basic-pct')?.value) || 50;
  const hraPct = parseFloat(document.getElementById('salary-hra-pct')?.value) || 20;

  if (!ctc || ctc <= 0) {
    if (errEl) { errEl.textContent = 'Please enter a valid monthly CTC.'; errEl.classList.remove('hidden'); }
    return;
  }
  if (basicPct + hraPct > 100) {
    if (errEl) { errEl.textContent = 'Basic% + HRA% cannot exceed 100%.'; errEl.classList.remove('hidden'); }
    return;
  }
  if (basicPct < 50) {
    if (errEl) { errEl.textContent = 'Basic salary must be at least 50% of CTC (as per Indian wage code).'; errEl.classList.remove('hidden'); }
    return;
  }

  const profile = await Auth.getProfile();
  if (!profile || !currentSalaryEditUserId) {
    if (errEl) { errEl.textContent = 'Unable to determine company. Please refresh.'; errEl.classList.remove('hidden'); }
    return;
  }

  const btn = document.getElementById('btn-save-salary');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  const result = await Payroll.saveSalaryConfig(currentSalaryEditUserId, profile.company_id, {
    monthly_ctc: ctc,
    basic_pct: basicPct,
    hra_pct: hraPct,
    bank_account: document.getElementById('salary-bank-account')?.value || null,
    bank_ifsc: document.getElementById('salary-bank-ifsc')?.value || null,
    pan: document.getElementById('salary-pan')?.value || null
  });

  if (btn) { btn.disabled = false; btn.textContent = 'Save Salary Config'; }

  if (result.success) {
    if (successEl) { successEl.textContent = 'Salary configuration saved!'; successEl.classList.remove('hidden'); }
    setTimeout(() => closeModal('salary-setup-modal'), 1200);
  } else {
    if (errEl) { errEl.textContent = result.error || 'Failed to save. Please try again.'; errEl.classList.remove('hidden'); }
  }
}

/**
 * Save company payroll settings from the settings section.
 */
async function handleSavePayrollConfig() {
  const errEl = document.getElementById('payroll-config-error');
  const successEl = document.getElementById('payroll-config-success');
  if (errEl) { errEl.classList.add('hidden'); errEl.textContent = ''; }
  if (successEl) { successEl.classList.add('hidden'); successEl.textContent = ''; }

  const profile = await Auth.getProfile();
  if (!profile) {
    if (errEl) { errEl.textContent = 'Unable to load profile. Please refresh.'; errEl.classList.remove('hidden'); }
    return;
  }

  const btn = document.getElementById('btn-save-payroll-config');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  const result = await Payroll.savePayrollSettings(profile.company_id, {
    daily_rate_method: document.getElementById('payroll-rate-method')?.value || '26_day',
    work_hours_per_day: parseFloat(document.getElementById('payroll-work-hours')?.value) || 8,
    late_grace_minutes: parseInt(document.getElementById('payroll-grace-minutes')?.value) || 15,
    late_marks_per_half_day: parseInt(document.getElementById('payroll-late-threshold')?.value) || 3,
    overtime_multiplier: parseFloat(document.getElementById('payroll-ot-multiplier')?.value) || 2.0
  });

  if (btn) { btn.disabled = false; btn.textContent = 'Save Payroll Settings'; }

  if (result.success) {
    if (successEl) { successEl.textContent = 'Payroll settings saved!'; successEl.classList.remove('hidden'); }
    // Update cached company data
    if (window._cachedCompanyData) {
      Object.assign(window._cachedCompanyData, result.company);
    }
  } else {
    if (errEl) { errEl.textContent = result.error || 'Failed to save.'; errEl.classList.remove('hidden'); }
  }
}

/**
 * Populate payroll config inputs from company data.
 */
function populatePayrollConfig(company) {
  if (!company) return;
  const rateMethod = document.getElementById('payroll-rate-method');
  const workHours = document.getElementById('payroll-work-hours');
  const graceMinutes = document.getElementById('payroll-grace-minutes');
  const lateThreshold = document.getElementById('payroll-late-threshold');
  const otMultiplier = document.getElementById('payroll-ot-multiplier');

  if (rateMethod) rateMethod.value = company.daily_rate_method || '26_day';
  if (workHours) workHours.value = company.work_hours_per_day || 8;
  if (graceMinutes) graceMinutes.value = company.late_grace_minutes || 15;
  if (lateThreshold) lateThreshold.value = company.late_marks_per_half_day || 3;
  if (otMultiplier) otMultiplier.value = company.overtime_multiplier || 2.0;
}

/**
 * Initialize the payroll view (placeholder for Phase 2).
 */
function initPayrollView() {
  const container = document.getElementById('payroll-content');
  if (!container) return;
  container.innerHTML = `
    <div style="text-align: center; padding: 60px 20px; color: #9CA3AF;">
      <div style="font-size: 3rem; margin-bottom: 16px;">💰</div>
      <div style="font-size: 1.2rem; font-weight: 600; color: #E2E8F0; margin-bottom: 8px;">Payroll Coming in Phase 2</div>
      <div style="font-size: 0.9rem; line-height: 1.5;">Monthly salary generation will appear here.<br>Set up salary configs from the dashboard first.</div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('.switch').forEach((el) => {
    el.addEventListener('click', () => el.classList.toggle('active'));
  });

  const path = window.location.pathname;
  const isOwnerPage = path.endsWith('owner.html');
  const isEmployeePage = path.endsWith('employee.html');
  let routed = false;

  try {
    if (isOwnerPage || isEmployeePage) {
      const session = await Auth.getSession();
      if (session) {
        const profile = await Auth.getProfile();

        if (!profile && isOwnerPage) {
          const pending = Auth._loadPendingOwnerBootstrap?.();
          const companyName = pending?.email === session.user.email
            ? pending.companyName
            : session.user.user_metadata?.company_name;
          if (companyName) {
            const bootstrap = await Auth.completeOwnerBootstrap(companyName, session.user.email);
            if (!bootstrap.success) {
              showAuthError('owner-auth-error', bootstrap.error);
            }
          }
        }

        const resolvedProfile = await Auth.getProfile();
        if (resolvedProfile) {
          if (resolvedProfile.role === 'admin' && !isOwnerPage) {
            window.location.href = 'owner.html';
            routed = true;
            return;
          }
          if (resolvedProfile.role === 'employee' && !isEmployeePage) {
            window.location.href = 'employee.html';
            routed = true;
            return;
          }

          if (isOwnerPage && resolvedProfile.role === 'admin') {
            selectedRole = 'business';
            navigateTo('view-dashboard');
            await initializeOwnerExperience();
            routed = true;
            return;
          }

          if (isEmployeePage && resolvedProfile.role === 'employee') {
            selectedRole = 'employee';
            navigateTo('view-emp-dashboard');
            await initializeEmployeeExperience();
            routed = true;
            return;
          }
        }
      }
    }
  } catch (err) {
    console.error('[App] Startup error:', err.message);
    showStartupError('The app could not finish startup. Refresh and try again.');
  }

  if (!routed) {
    showInitialView(isOwnerPage, isEmployeePage);
  }
});
