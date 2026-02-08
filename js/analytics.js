/**
 * Analytics Page - Specific Functionality
 */
(function() {
  'use strict';
  
  document.addEventListener('DOMContentLoaded', function() {
    // Date filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        filterBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        // Here you would fetch data for the selected period
        console.log('Selected period:', this.dataset.period);
      });
    });
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function() {
        this.classList.add('loading');
        // Simulate refresh
        setTimeout(() => {
          this.classList.remove('loading');
        }, 1000);
      });
    }
  });
})();
