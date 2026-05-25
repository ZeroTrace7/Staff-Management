// Simple View Navigation for UI Mockup
function navigateTo(viewId, isDark = false) {
  // Hide all views
  document.querySelectorAll('.app-layout').forEach(view => {
    view.classList.add('hidden');
  });
  
  // Show target view
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.remove('hidden');
    
    // Toggle body dark class for consistency (though it's on the layout div)
    if (isDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }
}

// Interactive Switches
document.querySelectorAll('.switch').forEach(el => {
  el.addEventListener('click', () => {
    el.classList.toggle('active');
  });
});

// Interactive Nav Items in Dashboard
document.querySelectorAll('#view-dashboard .bottom-nav-item').forEach(el => {
  el.addEventListener('click', (e) => {
    // Basic active class toggling just for visual effect within the view
    // (If not navigating away)
    if(!el.hasAttribute('onclick') || el.getAttribute('onclick').includes('alert')) {
      const nav = el.closest('.bottom-nav');
      nav.querySelectorAll('.bottom-nav-item').forEach(n => n.classList.remove('active'));
      el.classList.add('active');
    }
  });
});
