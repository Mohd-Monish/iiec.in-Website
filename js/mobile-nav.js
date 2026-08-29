/**
 * IIEC - SHARED MOBILE NAVIGATION CONTROLLER
 * Controls opening and closing of the mobile navigation drawer across all pages.
 */

(function () {
  'use strict';

  function initMobileDrawer() {
    const toggleButtons = document.querySelectorAll('#hamburger-btn, .menu-toggle, .hamburger-btn');
    const drawer = document.getElementById('mobile-nav-drawer') || document.querySelector('.mobile-nav-drawer');
    const backdrop = document.getElementById('mobile-nav-backdrop') || document.querySelector('.mobile-nav-backdrop');
    const closeBtn = document.getElementById('mobile-drawer-close') || document.querySelector('.mobile-drawer-close');

    if (!drawer) return;

    function openDrawer() {
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      toggleButtons.forEach(btn => {
        btn.classList.add('active');
        btn.setAttribute('aria-expanded', 'true');
      });
    }

    function closeDrawer() {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      toggleButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-expanded', 'false');
      });
    }

    toggleButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (drawer.classList.contains('open')) {
          closeDrawer();
        } else {
          openDrawer();
        }
      });
    });

    if (backdrop) backdrop.addEventListener('click', closeDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) {
        closeDrawer();
      }
    });

    // Close on clicking any link inside drawer (smooth UX)
    const links = drawer.querySelectorAll('.mobile-nav-link, .mobile-join-link');
    links.forEach(link => {
      link.addEventListener('click', () => {
        closeDrawer();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileDrawer);
  } else {
    initMobileDrawer();
  }
})();
