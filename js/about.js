/**
 * IIEC - ABOUT PAGE JAVASCRIPT
 * Specific animations and interactive telemetry for the About Us page.
 */

(function () {
  'use strict';

  function initAboutInteractions() {
    // Scroll reveal observer for timeline and value cards
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    if (window.innerWidth <= 900) {
      revealElements.forEach(el => el.classList.add('revealed'));
    } else if ('IntersectionObserver' in window) {
      const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      }, {
        rootMargin: '0px 0px -30px 0px',
        threshold: 0.1
      });

      revealElements.forEach(el => revealObserver.observe(el));
    } else {
      revealElements.forEach(el => el.classList.add('revealed'));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAboutInteractions);
  } else {
    initAboutInteractions();
  }
})();
