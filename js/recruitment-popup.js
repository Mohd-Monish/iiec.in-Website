/**
 * IIEC - FLOATING RECRUITMENT LIVE POPUP PILL
 * Auto-injects and manages the floating 'LIVE · Join IIEC Team' pill across all pages.
 */

(function () {
  'use strict';

  function initRecruitmentPill() {
    // Prevent duplicate injection
    if (document.getElementById('iiec-recruitment-pill')) return;

    // Ensure CSS is loaded
    if (!document.querySelector('link[href*="recruitment-popup.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'css/recruitment-popup.css';
      document.head.appendChild(link);
    }

    // Create Floating Pill
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

    // Smooth Entrance after 700ms
    setTimeout(() => {
      pill.classList.add('visible');
    }, 700);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRecruitmentPill);
  } else {
    initRecruitmentPill();
  }
})();
