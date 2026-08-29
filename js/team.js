/**
 * IIEC - TEAM PAGE JAVASCRIPT ENGINE
 * Handles portfolio vertical filters and mobile navigation drawer
 */

(function () {
  'use strict';

  // ---------------------------------------------------------
  // 1. Portfolio Category Filtering Engine
  // ---------------------------------------------------------
  function initPortfolioFilters() {
    const filterButtons = document.querySelectorAll('.filter-pill');
    const portfolioCards = document.querySelectorAll('.portfolio-card');
    const counterEl = document.getElementById('portfolio-results-count');

    if (!filterButtons.length || !portfolioCards.length) return;

    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Toggle active button state
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const selectedFilter = button.getAttribute('data-filter') || 'all';
        let visibleCount = 0;

        portfolioCards.forEach(card => {
          const category = card.getAttribute('data-category') || '';
          
          if (selectedFilter === 'all' || category.includes(selectedFilter)) {
            card.style.display = 'flex';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
            visibleCount++;
          } else {
            card.style.display = 'none';
          }
        });

        // Update results counter
        if (counterEl) {
          counterEl.textContent = `Showing ${visibleCount} of ${portfolioCards.length} Verticals`;
        }
      });
    });
  }

  // ---------------------------------------------------------
  // 2. Mobile Navigation Drawer & Morphing Hamburger
  // ---------------------------------------------------------
  function initMobileNavDrawer() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const drawer = document.getElementById('mobile-nav-drawer');
    const closeBtn = document.getElementById('mobile-drawer-close');
    const backdrop = document.getElementById('mobile-nav-backdrop');
    const drawerLinks = document.querySelectorAll('.mobile-nav-link');

    if (!hamburgerBtn || !drawer) return;

    function openDrawer() {
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      hamburgerBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    hamburgerBtn.addEventListener('click', () => {
      const isOpen = drawer.classList.contains('open');
      if (isOpen) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (backdrop) backdrop.addEventListener('click', closeDrawer);

    drawerLinks.forEach(link => {
      link.addEventListener('click', () => {
        closeDrawer();
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) {
        closeDrawer();
      }
    });
  }

  // ---------------------------------------------------------
  // Initialization on DOM Ready
  // ---------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    initPortfolioFilters();
    initMobileNavDrawer();
  });

})();