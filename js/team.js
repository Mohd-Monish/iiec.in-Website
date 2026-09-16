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
  // ---------------------------------------------------------
  // Initialization on DOM Ready
  // ---------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    initPortfolioFilters();
  });

})();