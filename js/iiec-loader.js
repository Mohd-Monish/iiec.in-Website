/**
 * IIEC - CIRCUIT CHIP LOADER & GLOBAL RECRUITMENT PILL ENGINE
 * Controls circuit preloader screen, top scroll hairline, and floating recruitment pill
 */

(function () {
  'use strict';

  const loader = document.getElementById('page-loader') || document.getElementById('iiec-preloader');
  const topHairline = document.getElementById('iiec-top-hairline');

  let isLoaded = false;

  function dismissLoader() {
    if (isLoaded) return;
    isLoaded = true;

    if (loader) {
      loader.classList.add('loaded');
      setTimeout(() => {
        loader.style.display = 'none';
      }, 650);
    }

    initScrollHairline();
    initRecruitmentPill();
  }

  function initScrollHairline() {
    if (!topHairline) return;

    function onScroll() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) {
        topHairline.style.width = '0%';
        return;
      }
      const progress = Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100));
      topHairline.style.width = progress + '%';
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Floating Recruitment Pill ('LIVE · Join IIEC Team')
  function initRecruitmentPill() {
    if (document.getElementById('iiec-recruitment-pill')) return;

    if (!document.querySelector('link[href*="recruitment-popup.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'css/recruitment-popup.css';
      document.head.appendChild(link);
    }

    const pill = document.createElement('a');
    pill.id = 'iiec-recruitment-pill';
    pill.className = 'iiec-floating-pill';
    pill.href = 'https://join.iiec.in';
    pill.target = '_blank';
    pill.rel = 'noopener';
    pill.setAttribute('aria-label', 'Join IIEC Team - Recruitment Live');
    pill.innerHTML = `
      <span class="pill-live-badge">LIVE</span>
      <span class="pill-label">Join IIEC Team</span>
      <span class="pill-arrow">↗</span>
    `;

    document.body.appendChild(pill);

    setTimeout(() => {
      pill.classList.add('visible');
    }, 600);
  }

  // Dismiss after page load + minimum display time for the glowing circuit animation
  window.addEventListener('load', () => {
    setTimeout(dismissLoader, 900);
  });

  // Safety fallback
  setTimeout(dismissLoader, 1800);

  // Initialize pill immediately if document already loaded
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initRecruitmentPill, 800);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initRecruitmentPill, 800);
    });
  }

})();
