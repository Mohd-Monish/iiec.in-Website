/**
 * Team Page - Portfolio Accordion Script
 */
(function() {
  'use strict';
  
  // Portfolio Accordion Toggle
  document.querySelectorAll('.portfolio-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const portfolioItem = trigger.closest('.portfolio-item');
      const isActive = portfolioItem.classList.contains('active');
      
      // Close all other accordions (optional - for exclusive mode)
      // document.querySelectorAll('.portfolio-item').forEach(item => {
      //   item.classList.remove('active');
      //   item.querySelector('.portfolio-trigger').setAttribute('aria-expanded', 'false');
      // });
      
      // Toggle current accordion
      if (isActive) {
        portfolioItem.classList.remove('active');
        trigger.setAttribute('aria-expanded', 'false');
      } else {
        portfolioItem.classList.add('active');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });
})();
