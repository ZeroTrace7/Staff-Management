// App Navigation Logic
function navigateTo(viewId) {
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
  const isMainView = ['view-dashboard', 'view-map', 'view-settings'].includes(viewId);
  const globalNav = document.getElementById('global-bottom-nav');
  const trialBanner = document.getElementById('trial-banner');
  
  if (globalNav) {
    if (isMainView) {
      if(globalNav.classList.contains('hidden')) {
          globalNav.classList.remove('hidden');
          void globalNav.offsetWidth;
          globalNav.classList.add('view-enter');
      }
    } else {
      globalNav.classList.add('hidden');
      globalNav.classList.remove('view-enter');
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
  if (isMainView && globalNav) {
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
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

    if (activeItem) {
      activeItem.classList.add('active');
      const icon = activeItem.querySelector('.nav-icon');
      const text = activeItem.querySelector('span');
      if (icon) {
        icon.style.background = '#2563EB';
        icon.style.padding = '8px 24px';
        icon.style.borderRadius = '20px';
      }
      if (text) {
        text.style.color = 'white';
        text.style.fontWeight = '500';
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

// Step 1 Selection Cards
function selectRole(role) {
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

// Interactive Switches
document.querySelectorAll('.switch').forEach(el => {
  el.addEventListener('click', () => {
    el.classList.toggle('active');
    const thumb = el.querySelector('.switch-thumb');
    if (el.classList.contains('active')) {
       el.style.background = '#93C5FD';
       if(thumb) thumb.style.background = '#1E3A8A';
    } else {
       el.style.background = '#374151'; // or whatever inactive bg
       if(thumb) thumb.style.background = '#9CA3AF';
    }
  });
});

// Initialize first view animation
document.addEventListener('DOMContentLoaded', () => {
   const firstView = document.getElementById('view-step1');
   if(firstView) firstView.classList.add('view-enter');
});
