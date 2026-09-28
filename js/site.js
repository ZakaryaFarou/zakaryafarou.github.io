document.addEventListener('DOMContentLoaded', () => {
  // Active nav state
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });

  // Hamburger menu
  const toggle = document.querySelector('.menu-toggle');
  const navEl = document.querySelector('nav');
  if (toggle && navEl) {
    toggle.addEventListener('click', () => {
      const open = navEl.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
      toggle.classList.toggle('open', open);
    });
    // Close when a nav link is clicked
    navEl.addEventListener('click', e => {
      if (e.target.tagName === 'A') {
        navEl.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
    // Close on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('header') && navEl.classList.contains('open')) {
        navEl.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
});
