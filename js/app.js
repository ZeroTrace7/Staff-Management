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

async function handleOwnerAuth() {
  const email = document.getElementById('owner-email')?.value?.trim();
  const password = document.getElementById('owner-password')?.value;
  const company = document.getElementById('owner-company')?.value?.trim();
  const isSignUp = document.getElementById('owner-signup-toggle')?.checked;

  clearAuthError('owner-auth-error');
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
    result = await Auth.signIn(email, password);
  }

  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Continue';
  }

  if (!result.success) {
    return showAuthError('owner-auth-error', result.error);
  }

  if (result.needsConfirmation) {
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
    return showAuthError('emp-auth-error', result.error);
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
  if (company && Number(company.geofence_lat) === 0 && Number(company.geofence_lng) === 0) {
    openModal('geofence-modal');
  }
}

async function handleAddEmployee() {
  clearAuthError('add-employee-error');

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
    return showAuthError('add-employee-error', result.error);
  }

  ['add-employee-name', 'add-employee-email', 'add-employee-password'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  closeModal('add-employee-modal');
  await AdminDashboard.refresh();
}

async function useCurrentLocationForGeofence() {
  clearAuthError('geofence-error');

  try {
    const pos = await LocationService.getCurrentPosition();
    const lat = document.getElementById('geofence-lat');
    const lng = document.getElementById('geofence-lng');
    if (lat) lat.value = pos.lat;
    if (lng) lng.value = pos.lng;
  } catch (err) {
    showAuthError('geofence-error', err.message);
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
    showEmployeeBanner(result.error, '#7F1D1D');
    return showEmployeeCameraError(result.error);
  }

  resetEmployeeCameraState();
  navigateTo('view-emp-dashboard');
  applyPunchState(!isPunchedIn, result.record);

  const suffix = result.offline ? ' Saved offline and will sync automatically.' : '';
  if (result.record?.is_geofence_valid === false) {
    showEmployeeBanner(`Attendance recorded outside the office zone.${suffix}`, '#92400E');
  } else {
    showEmployeeBanner(`Attendance recorded successfully.${suffix}`, '#065F46');
  }
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

document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('.switch').forEach((el) => {
    el.addEventListener('click', () => el.classList.toggle('active'));
  });

  const path = window.location.pathname;
  const isOwnerPage = path.endsWith('owner.html');
  const isEmployeePage = path.endsWith('employee.html');

  if (isOwnerPage || isEmployeePage) {
    const session = await Auth.getSession();
    if (session) {
      const profile = await Auth.getProfile();

      if (!profile && isOwnerPage) {
        const pending = Auth._loadPendingOwnerBootstrap?.();
        if (pending && pending.email === session.user.email) {
          const bootstrap = await Auth.completeOwnerBootstrap(pending.companyName, session.user.email);
          if (!bootstrap.success) {
            showAuthError('owner-auth-error', bootstrap.error);
          }
        }
      }

      const resolvedProfile = await Auth.getProfile();
      if (resolvedProfile) {
        if (resolvedProfile.role === 'admin' && !isOwnerPage) {
          window.location.href = 'owner.html';
          return;
        }
        if (resolvedProfile.role === 'employee' && !isEmployeePage) {
          window.location.href = 'employee.html';
          return;
        }

        if (isOwnerPage && resolvedProfile.role === 'admin') {
          selectedRole = 'business';
          navigateTo('view-dashboard');
          await initializeOwnerExperience();
          return;
        }

        if (isEmployeePage && resolvedProfile.role === 'employee') {
          selectedRole = 'employee';
          navigateTo('view-emp-dashboard');
          await initializeEmployeeExperience();
          return;
        }
      }
    }
  }

  let firstView = document.getElementById('view-step1');
  if (isOwnerPage) firstView = document.getElementById('view-step2');
  if (isEmployeePage) firstView = document.getElementById('view-emp-step2');

  if (firstView) {
    firstView.classList.remove('hidden');
    firstView.classList.add('view-enter');
  }
});
