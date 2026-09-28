// Theme toggle — runs immediately so saved preference applies before first paint
(function () {
  try {
    var saved = localStorage.getItem('theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  } catch (e) {}
})();

document.addEventListener('DOMContentLoaded', () => {
  // Theme toggle button
  const themeToggle = document.querySelector('.theme-toggle');
  const root = document.documentElement;
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = root.getAttribute('data-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      // Determine the effective current theme, then flip it
      const isDark = current === 'dark' || (!current && prefersDark);
      const next = isDark ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

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
