/**
 * IIEC — Shared Animation & Interaction Engine
 * Extracted from Next Gen Pitch Design System
 * Features:
 *   1. Scroll-Reveal IntersectionObserver
 *   2. 3D Tilt Physics (desktop only)
 *   3. Animated Count-Up on Scroll
 *   4. Staggered Card Entrance
 *   5. Parallax Background Micro-Shift
 */

(function () {
  'use strict';

  // ================================================================
  // 1. Scroll-Reveal Observer
  // Adds .in-view to any element with .animate-on-scroll when visible
  // ================================================================
  function initScrollReveal() {
    var elements = document.querySelectorAll('.animate-on-scroll');
    if (!elements.length) return;

    // Immediately reveal elements already in viewport
    for (var i = 0; i < elements.length; i++) {
      var rect = elements[i].getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        elements[i].classList.add('in-view');
      }
    }

    // Observe future scrolling
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px'
      });

      elements.forEach(function (el) {
        if (!el.classList.contains('in-view')) {
          observer.observe(el);
        }
      });
    } else {
      // Fallback: show everything
      elements.forEach(function (el) {
        el.classList.add('in-view');
      });
    }
  }

  // ================================================================
  // 2. 3D Tilt Physics (Desktop Only)
  // Add class .ngp-tilt-card to any card. Desktop mousemove applies
  // perspective rotateX/rotateY. Resets on mouseleave.
  // ================================================================
  function initTiltCards() {
    if (window.innerWidth < 1024) return;

    var cards = document.querySelectorAll('.ngp-tilt-card');
    if (!cards.length) return;

    cards.forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;

        var rotX = -(y / (rect.height / 2)) * 6;
        var rotY =  (x / (rect.width  / 2)) * 8;

        card.style.transform =
          'perspective(800px) rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg) translateY(-3px)';
      });

      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
      });
    });
  }

  // ================================================================
  // 3. Animated Count-Up on Scroll
  // Usage: <span class="ngp-count-up" data-target="500">0</span>
  // Optional: data-suffix="+" data-prefix="$" data-duration="2000"
  // ================================================================
  function initCountUp() {
    var counters = document.querySelectorAll('.ngp-count-up');
    if (!counters.length) return;

    if (!('IntersectionObserver' in window)) {
      counters.forEach(function (el) {
        el.textContent = (el.dataset.prefix || '') + el.dataset.target + (el.dataset.suffix || '');
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    counters.forEach(function (el) {
      observer.observe(el);
    });
  }

  function animateCounter(el) {
    var target   = parseInt(el.dataset.target, 10) || 0;
    var duration = parseInt(el.dataset.duration, 10) || 1800;
    var prefix   = el.dataset.prefix || '';
    var suffix   = el.dataset.suffix || '';
    var start    = 0;
    var startTs  = null;

    function step(timestamp) {
      if (!startTs) startTs = timestamp;
      var progress = Math.min((timestamp - startTs) / duration, 1);

      // Ease-out cubic
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(start + (target - start) * eased);

      el.textContent = prefix + current.toLocaleString() + suffix;

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  // ================================================================
  // 4. Staggered Card Entrance
  // Auto-assigns stagger delays to direct children of .ngp-stagger-grid
  // ================================================================
  function initStaggerGrid() {
    var grids = document.querySelectorAll('.ngp-stagger-grid');
    grids.forEach(function (grid) {
      var children = grid.children;
      for (var i = 0; i < children.length; i++) {
        if (children[i].classList.contains('animate-on-scroll')) {
          children[i].style.transitionDelay = (i * 0.08) + 's';
        }
      }
    });
  }

  // ================================================================
  // 5. Parallax Background Micro-Shift
  // Usage: Add class "ngp-parallax" and data-speed="0.3"
  // Moves element on scroll at fraction of scroll speed
  // ================================================================
  function initParallax() {
    var elements = document.querySelectorAll('.ngp-parallax');
    if (!elements.length || window.innerWidth < 768) return;

    var ticking = false;

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(function () {
          var scrollY = window.pageYOffset;
          elements.forEach(function (el) {
            var speed = parseFloat(el.dataset.speed) || 0.15;
            var rect = el.getBoundingClientRect();
            var offset = (rect.top + scrollY - window.innerHeight / 2) * speed;
            el.style.transform = 'translateY(' + (-offset).toFixed(1) + 'px)';
          });
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ================================================================
  // Initialize All Modules on DOMContentLoaded
  // ================================================================
  function init() {
    initScrollReveal();
    initTiltCards();
    initCountUp();
    initStaggerGrid();
    initParallax();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
