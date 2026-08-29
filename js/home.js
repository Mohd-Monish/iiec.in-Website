/**
 * IIEC - HOME PAGE INTERACTIVE ENGINE
 * Features:
 * 1. 3D Holographic Hero Card Tilt Physics
 * 2. Interactive "Founder Engine" 4-Stage Bento Switcher
 * 3. Animated Metrics Count-Up on Scroll
 * 4. Mobile Drawer Navigation Toggle
 * 5. Newsletter Form Submission Handler
 * 6. Viewport Scroll Reveal Observer
 */

document.addEventListener('DOMContentLoaded', () => {
  // ================================================================
  // 1. 3D Hero Ticket Holographic Tilt (Desktop only)
  // ================================================================
  const heroTicket = document.querySelector('.hero-ticket-card');
  const heroStage = document.querySelector('.hero-ticket-stage');

  if (heroTicket && heroStage && window.innerWidth > 1080) {
    heroStage.addEventListener('mousemove', (e) => {
      const rect = heroTicket.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      const rotX = -(y / (rect.height / 2)) * 10;
      const rotY = (x / (rect.width / 2)) * 12;

      heroTicket.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateY(-4px)`;
    });

    heroStage.addEventListener('mouseleave', () => {
      heroTicket.style.transform = 'rotate(1.5deg)';
    });
  }

  // ================================================================
  // 3. Interactive "Founder Engine" 4-Stage Switcher
  // ================================================================
  const stageData = {
    1: {
      step: "STAGE 01 / 04",
      badge: "Discovery & Ideation",
      heading: "Illuminate & Problem Validation",
      desc: "Student founders identify high-impact problems, conduct lean canvas workshops, and validate market demand through masterclasses with E-Cell IIT Bombay.",
      stat1Label: "Flagship Event",
      stat1Val: "Illuminate Workshop",
      stat2Label: "Partner Network",
      stat2Val: "E-Cell IIT Bombay",
      stat3Label: "Key Output",
      stat3Val: "Validated Lean Canvas",
      ctaText: "Explore Illuminate ↗",
      ctaLink: "activities.html#events"
    },
    2: {
      step: "STAGE 02 / 04",
      badge: "Build & Prototype",
      heading: "Hackathons & Technical Build",
      desc: "Transform validated hypotheses into working software and hardware prototypes at Smart India Hackathon (SIH 2026) and TechAstra annual fest.",
      stat1Label: "Active Hackathon",
      stat1Val: "SIH 2026 Internal",
      stat2Label: "Innovation Tracks",
      stat2Val: "18+ Multi-Disciplinary",
      stat3Label: "Key Output",
      stat3Val: "Functional MVP",
      ctaText: "View SIH 2026 ↗",
      ctaLink: "sih-2026.html"
    },
    3: {
      step: "STAGE 03 / 04",
      badge: "Pitch & Compete",
      heading: "Next Gen Pitch & Investor Panels",
      desc: "Pitch working prototypes to veteran angels, startup mentors, and industry juries. Receive structured evaluation and fast-track nominations for Eureka! 2026.",
      stat1Label: "Pitch Platform",
      stat1Val: "Next Gen Pitch",
      stat2Label: "National Track",
      stat2Val: "NEC Fast-Track",
      stat3Label: "Key Output",
      stat3Val: "Seed Term Sheets",
      ctaText: "Explore Next Gen Pitch ↗",
      ctaLink: "activities.html#vault"
    },
    4: {
      step: "STAGE 04 / 04",
      badge: "Incubate & Scale",
      heading: "IIEC Incubation & Venture Growth",
      desc: "Formal admission into IIEC Incubation (Room no 119, Rajgarh Block CSMU), accessing university legal counsel, seed grant pathways, mentor advisory boards, and corporate networks.",
      stat1Label: "Incubation Hub",
      stat1Val: "Room 119, Rajgarh Block",
      stat2Label: "National Standing",
      stat2Val: "Top 23 All India",
      stat3Label: "Key Output",
      stat3Val: "Registered Startup",
      ctaText: "Join Incubation ↗",
      ctaLink: "about.html"
    }
  };

  const tabButtons = document.querySelectorAll('.engine-tab-btn');
  const panelBadge = document.getElementById('engine-badge');
  const panelHeading = document.getElementById('engine-heading');
  const panelDesc = document.getElementById('engine-desc');
  const panelStat1L = document.getElementById('engine-stat1-label');
  const panelStat1V = document.getElementById('engine-stat1-val');
  const panelStat2L = document.getElementById('engine-stat2-label');
  const panelStat2V = document.getElementById('engine-stat2-val');
  const panelStat3L = document.getElementById('engine-stat3-label');
  const panelStat3V = document.getElementById('engine-stat3-val');
  const panelCta = document.getElementById('engine-cta-btn');

  function updateEngineStage(stageNum) {
    const data = stageData[stageNum];
    if (!data) return;

    tabButtons.forEach(btn => {
      const num = btn.getAttribute('data-stage');
      if (num === String(stageNum)) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      }
    });

    if (panelBadge) panelBadge.innerHTML = `<span class="pulse-dot"></span> ${data.step} · ${data.badge}`;
    if (panelHeading) panelHeading.textContent = data.heading;
    if (panelDesc) panelDesc.textContent = data.desc;
    if (panelStat1L) panelStat1L.textContent = data.stat1Label;
    if (panelStat1V) panelStat1V.textContent = data.stat1Val;
    if (panelStat2L) panelStat2L.textContent = data.stat2Label;
    if (panelStat2V) panelStat2V.textContent = data.stat2Val;
    if (panelStat3L) panelStat3L.textContent = data.stat3Label;
    if (panelStat3V) panelStat3V.textContent = data.stat3Val;
    if (panelCta) {
      panelCta.textContent = data.ctaText;
      panelCta.setAttribute('href', data.ctaLink);
    }
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const stage = btn.getAttribute('data-stage');
      updateEngineStage(stage);
    });
  });

  // ================================================================
  // 4. Scroll Reveal Intersection Observer (Desktop) / Instant (Mobile)
  // ================================================================
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
      rootMargin: '0px 0px -20px 0px',
      threshold: 0.08
    });

    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    revealElements.forEach(el => el.classList.add('revealed'));
  }

  // ================================================================
  // 5. Newsletter Form Submission Handler
  // ================================================================
  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = newsletterForm.querySelector('.newsletter-input');
      const msg = newsletterForm.querySelector('.form-message');
      const submitBtn = newsletterForm.querySelector('button[type="submit"]');

      if (!input || !input.value.trim()) return;

      const originalBtnText = submitBtn ? submitBtn.innerText : 'Subscribe';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Subscribing...';
      }
      if (msg) {
        msg.className = 'form-message';
        msg.textContent = '';
      }

      setTimeout(() => {
        if (msg) {
          msg.className = 'form-message success';
          msg.textContent = 'Thank you for subscribing to IIEC updates!';
        }
        input.value = '';
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = originalBtnText;
        }
      }, 550);
    });
  }
});
