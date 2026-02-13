/* ================================================================
   TECHASTRA — Volunteer Registration Form Logic
   Connected to Google Apps Script (Spreadsheet + Auto-Email)
   ================================================================ */

(function () {
  'use strict';

  // ── Google Apps Script Web App URL ───────────────────────────
  // Replace this with your deployed TechAstra Apps Script URL
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzWuXwGZH4iVfz4YYMUVTn4gRISN5yam_RkJ96rzyMzJVJJN_6aktb-FMYZMit9RoqwiQ/exec';

  const form = document.getElementById('techastra-form');
  const successEl = document.getElementById('techastra-success');
  const submitBtn = document.getElementById('ta-submit-btn');

  if (!form) return;

  // ── Validation helpers ───────────────────────────────────────
  function showError(field, message) {
    field.classList.add('error');
    const existing = field.parentElement.querySelector('.error-msg');
    if (existing) existing.remove();

    const msg = document.createElement('span');
    msg.className = 'error-msg';
    msg.textContent = message;
    msg.style.cssText = 'color:#ef4444;font-size:12px;margin-top:2px;display:block;';
    field.parentElement.appendChild(msg);
  }

  function clearError(field) {
    field.classList.remove('error');
    const msg = field.parentElement.querySelector('.error-msg');
    if (msg) msg.remove();
  }

  // Clear errors on input
  form.querySelectorAll('input, select, textarea').forEach(field => {
    field.addEventListener('input', () => clearError(field));
    field.addEventListener('change', () => clearError(field));
  });

  // ── Form submission ──────────────────────────────────────────
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Collect data
    const fullName = form.fullName.value.trim();
    const department = form.department.value.trim();
    const academicYear = form.academicYear.value;
    const rollNumber = form.rollNumber.value.trim();
    const mobile = form.mobile.value.trim();
    const email = form.email.value.trim();
    const consent = form.consent.checked;

    // Volunteer roles
    const roles = [];
    form.querySelectorAll('input[name="volunteerRole"]:checked').forEach(cb => {
      roles.push(cb.value);
    });

    // Skills
    const skills = form.skills.value.trim();

    // Why volunteer
    const whyVolunteer = form.whyVolunteer.value.trim();

    // Previous experience
    const experience = form.experience.value.trim();

    // ── Validate ─────────────────────────────────────────────
    let isValid = true;

    if (!fullName) {
      showError(form.fullName, 'Full name is required.');
      isValid = false;
    }

    if (!department) {
      showError(form.department, 'Department is required.');
      isValid = false;
    }

    if (!academicYear) {
      showError(form.academicYear, 'Please select your academic year.');
      isValid = false;
    }

    if (!rollNumber) {
      showError(form.rollNumber, 'Roll number is required.');
      isValid = false;
    }

    if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
      showError(form.mobile, 'Enter a valid 10-digit mobile number.');
      isValid = false;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError(form.email, 'Enter a valid email address.');
      isValid = false;
    }

    if (roles.length === 0) {
      const chipsWrapper = form.querySelector('.ta-interest-chips');
      if (chipsWrapper) {
        chipsWrapper.style.outline = '2px solid #ef4444';
        chipsWrapper.style.outlineOffset = '4px';
        chipsWrapper.style.borderRadius = '8px';
        setTimeout(() => {
          chipsWrapper.style.outline = '';
          chipsWrapper.style.outlineOffset = '';
        }, 3000);
      }
      isValid = false;
    }

    if (!consent) {
      const consentCheckmark = form.querySelector('.ta-consent-checkmark');
      if (consentCheckmark) {
        consentCheckmark.style.borderColor = '#ef4444';
        consentCheckmark.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.15)';
        setTimeout(() => {
          consentCheckmark.style.borderColor = '';
          consentCheckmark.style.boxShadow = '';
        }, 3000);
      }
      isValid = false;
    }

    if (!isValid) {
      const firstError = form.querySelector('.error, [style*="outline"]');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // ── Submit ───────────────────────────────────────────────
    submitBtn.disabled = true;
    submitBtn.classList.add('submitting');

    const formData = {
      fullName,
      department,
      academicYear,
      rollNumber,
      mobile,
      email,
      volunteerRoles: roles.join(', '),
      skills,
      whyVolunteer,
      experience,
      timestamp: new Date().toISOString()
    };

    // Store locally as fallback
    try {
      const existing = JSON.parse(localStorage.getItem('techastra_volunteers') || '[]');
      existing.push(formData);
      localStorage.setItem('techastra_volunteers', JSON.stringify(existing));
    } catch (err) {
      // Silent fail
    }

    // ── Send to Google Apps Script ───────────────────────────
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(formData)
    })
    .then(() => {
      form.hidden = true;
      successEl.hidden = false;
      successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      initSuccessAnimations(successEl);
    })
    .catch(() => {
      showSubmitError('Network error. Your submission was saved locally. Please check your connection and try again.');
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.classList.remove('submitting');
    });
  });

  // ── Submit error toast ────────────────────────────────────────
  function showSubmitError(message) {
    let toast = document.getElementById('ta-submit-error-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'ta-submit-error-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(239, 68, 68, 0.95);
        color: #fff;
        padding: 14px 24px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        max-width: 90vw;
        text-align: center;
        backdrop-filter: blur(8px);
        box-shadow: 0 8px 32px rgba(239, 68, 68, 0.3);
        animation: toastSlideUp 0.3s ease-out;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.display = 'block';

    setTimeout(() => {
      toast.style.display = 'none';
    }, 6000);
  }

  // ── Success state tech animations ─────────────────────────────
  function initSuccessAnimations(container) {
    // 1. Typewriter effect on subtitle
    const subtitle = container.querySelector('.ta-success-subtitle');
    if (subtitle) {
      const origHTML = subtitle.innerHTML;
      subtitle.style.opacity = '0';
      setTimeout(() => {
        subtitle.style.opacity = '1';
        typewriterEffect(subtitle, origHTML);
      }, 400);
    }

    // 2. Generate random binary/hex "data stream" overlay
    spawnDataStream(container);

    // 3. Sequential panel reveal with stagger
    const panels = container.querySelectorAll('.ta-panel');
    panels.forEach((panel, i) => {
      panel.style.opacity = '0';
      panel.style.transform = 'translateY(16px)';
      panel.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      setTimeout(() => {
        panel.style.opacity = '1';
        panel.style.transform = 'translateY(0)';
      }, 1200 + i * 250);
    });

    // 4. Spawn extra floating particles via JS
    spawnTechParticles(container);

    // 5. Matrix rain in background
    spawnMatrixRain(container);
  }

  function typewriterEffect(el, html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || tempDiv.innerText;
    el.textContent = '';
    const prefix = document.createElement('span');
    prefix.className = 'ta-typed-prefix';
    prefix.textContent = '>_';
    el.appendChild(prefix);
    let idx = 0;
    // Skip the ">_" prefix from text
    const cleanText = text.replace(/^>_\s*/, '');
    const interval = setInterval(() => {
      if (idx < cleanText.length) {
        el.appendChild(document.createTextNode(cleanText[idx]));
        idx++;
      } else {
        clearInterval(interval);
        // Restore original HTML for proper formatting
        el.innerHTML = html;
      }
    }, 18);
  }

  function spawnDataStream(container) {
    const stream = document.createElement('div');
    stream.style.cssText = `
      position: absolute; top: 0; right: 12px; z-index: 1;
      font-family: 'Courier New', monospace; font-size: 10px;
      color: rgba(0,212,255,0.12); line-height: 1.4;
      pointer-events: none; overflow: hidden; max-height: 100%;
      writing-mode: vertical-rl; text-orientation: mixed;
    `;
    const chars = '01ABCDEF';
    let str = '';
    for (let i = 0; i < 200; i++) {
      str += chars[Math.floor(Math.random() * chars.length)];
      if (Math.random() < 0.1) str += ' ';
    }
    stream.textContent = str;
    stream.style.animation = 'dataScroll 20s linear infinite';
    container.appendChild(stream);

    // Add a second stream on the left
    const stream2 = stream.cloneNode(true);
    stream2.style.right = 'auto';
    stream2.style.left = '12px';
    stream2.style.animationDuration = '25s';
    stream2.style.animationDirection = 'reverse';
    let str2 = '';
    for (let i = 0; i < 200; i++) {
      str2 += chars[Math.floor(Math.random() * chars.length)];
      if (Math.random() < 0.1) str2 += ' ';
    }
    stream2.textContent = str2;
    container.appendChild(stream2);

    // Inject keyframes
    if (!document.getElementById('ta-data-scroll-kf')) {
      const style = document.createElement('style');
      style.id = 'ta-data-scroll-kf';
      style.textContent = `
        @keyframes dataScroll {
          0% { transform: translateY(-50%); }
          100% { transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  function spawnTechParticles(container) {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('div');
      const size = Math.random() * 3 + 1;
      const x = Math.random() * 100;
      const delay = Math.random() * 4;
      const dur = 4 + Math.random() * 6;
      const hue = Math.random() > 0.5 ? '188,100%,50%' : '263,86%,56%';
      dot.style.cssText = `
        position: absolute;
        width: ${size}px; height: ${size}px;
        border-radius: 50%;
        background: hsla(${hue}, 0.6);
        box-shadow: 0 0 ${size * 3}px hsla(${hue}, 0.3);
        left: ${x}%;
        bottom: -10px;
        pointer-events: none;
        z-index: 1;
        animation: particleDrift ${dur}s ease-in-out ${delay}s infinite;
      `;
      container.appendChild(dot);
    }
  }

  function spawnMatrixRain(container) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
      position: absolute; inset: 0; z-index: 0;
      pointer-events: none; opacity: 0.06;
    `;
    container.insertBefore(canvas, container.firstChild);
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
    }
    resize();

    const chars = 'アイウエオカキクケコ01IIEC';
    const fontSize = 12;
    const cols = Math.floor(canvas.width / fontSize);
    const drops = new Array(cols).fill(1);

    function draw() {
      ctx.fillStyle = 'rgba(6,10,20,0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#00d4ff';
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }

    const interval = setInterval(draw, 80);

    // Stop after 30 seconds to save resources
    setTimeout(() => {
      clearInterval(interval);
      canvas.style.transition = 'opacity 2s';
      canvas.style.opacity = '0';
      setTimeout(() => canvas.remove(), 2000);
    }, 30000);

    // Handle resize
    window.addEventListener('resize', resize, { passive: true });
  }

})();