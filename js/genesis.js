/* ================================================================
   GENESIS — Registration Form Logic
   Connected to Google Apps Script (Spreadsheet + Auto-Email)
   ================================================================ */

(function () {
  'use strict';

  // ── Google Apps Script Web App URL ───────────────────────────
  // Replace this with your deployed Apps Script URL
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyetfB8njJhNm_e0f2WaY7MzIyP688EBAEx7NOx_wq2C3ARLJHCyLa37Dn12SwRR8Aqsw/exec';

  const form = document.getElementById('genesis-form');
  const successEl = document.getElementById('genesis-success');
  const submitBtn = document.getElementById('submit-btn');

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
  form.querySelectorAll('input, select').forEach(field => {
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

    // Interests
    const interests = [];
    form.querySelectorAll('input[name="interest"]:checked').forEach(cb => {
      interests.push(cb.value);
    });
    const otherInterest = form.otherInterest.value.trim();

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

    if (interests.length === 0 && !otherInterest) {
      const chipsWrapper = form.querySelector('.interest-chips');
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
      const consentCheckmark = form.querySelector('.consent-checkmark');
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
      interests: interests.join(', '),
      otherInterest,
      timestamp: new Date().toISOString()
    };

    // Store locally as fallback
    try {
      const existing = JSON.parse(localStorage.getItem('genesis_registrations') || '[]');
      existing.push(formData);
      localStorage.setItem('genesis_registrations', JSON.stringify(existing));
    } catch (err) {
      // Silent fail
    }

    // ── Send to Google Apps Script ───────────────────────────
    // no-cors mode: browser sends the request but gets an opaque response (CORS blocks reading it)
    // text/plain: CORS-safelisted header, so the browser won't strip it (unlike application/json)
    // The server still processes the request and saves data even though we can't read the response
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(formData)
    })
    .then(() => {
      // no-cors returns opaque response (status 0), but server has processed the data
      form.hidden = true;
      successEl.hidden = false;
      successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    })
    .catch(() => {
      // Network error — data is saved in localStorage
      showSubmitError('Network error. Your registration was saved locally. Please check your connection and try again.');
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.classList.remove('submitting');
    });
  });

  // ── Submit error toast ────────────────────────────────────────
  function showSubmitError(message) {
    let toast = document.getElementById('submit-error-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'submit-error-toast';
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

})();
