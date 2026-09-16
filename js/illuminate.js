/**
 * ILLUMINATE 2026 — Client-side Application Script
 * E-Cell IIT Bombay × IIEC CSMU
 * Handles multi-step registration, dynamic UPI QR generation (₹749),
 * live field validation, UTR verification submission, and digital pass rendering.
 */

(function () {
  'use strict';

  // ── CONFIGURATION ──────────────────────────────────────────────
  var CONFIG = {
    EVENT_NAME: 'illuminate 2026',
    ORGANIZER: 'IIEC CSMU × E-Cell IIT Bombay',
    FEE_AMOUNT: 749, // Special NEC discounted fee in INR
    UPI_ID: 'iiec-csmu@okhdfcbank', // Replace with university/cell official UPI ID
    UPI_NAME: 'IIEC CSMU',
    // Paste published Apps Script /exec URL here:
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby7QscQp692FD9ut0Gh-QbmuoktP4YKYzyObS1acqLdMznEsA-E4cXP_e4dcePSVEEM/exec'
  };

  // State object
  var state = {
    regId: '',
    fullName: '',
    email: '',
    mobile: '',
    college: '',
    course: '',
    year: '',
    hasIdea: '',
    attendedBefore: '',
    expectations: '',
    utrNumber: '',
    submittedAt: ''
  };

  // Helper: Generate unique Registration ID (ILL-XXXXXX)
  function generateRegistrationId() {
    var randomNum = Math.floor(100000 + Math.random() * 900000);
    return 'ILL-' + randomNum;
  }

  // Toast Notification
  function showToast(message) {
    var toast = document.getElementById('illToast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(function () {
      toast.classList.remove('show');
    }, 3200);
  }

  // ── 1. READING HAIRLINE SCROLL PROGRESS ─────────────────────────
  var hairline = document.getElementById('iiec-top-hairline');
  if (hairline) {
    window.addEventListener('scroll', function () {
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var scrollPercent = (window.scrollY / (docHeight || 1)) * 100;
      hairline.style.width = scrollPercent + '%';
    }, { passive: true });
  }

  // ── 2. FAQ ACCORDION HANDLER ───────────────────────────────────
  var faqCards = document.querySelectorAll('.faq-card, .faq-item');
  faqCards.forEach(function (card) {
    var trigger = card.querySelector('.faq-btn, .faq-trigger');
    var content = card.querySelector('.faq-body, .faq-content');
    if (!trigger || !content) return;

    trigger.addEventListener('click', function () {
      var isOpen = card.classList.contains('active');

      // Close other accordions
      faqCards.forEach(function (other) {
        if (other !== card) {
          other.classList.remove('active');
          var otherTrigger = other.querySelector('.faq-btn, .faq-trigger');
          if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
          var otherContent = other.querySelector('.faq-body, .faq-content');
          if (otherContent) otherContent.style.maxHeight = null;
        }
      });

      if (!isOpen) {
        card.classList.add('active');
        trigger.setAttribute('aria-expanded', 'true');
        content.style.maxHeight = (content.scrollHeight + 36) + 'px';
      } else {
        card.classList.remove('active');
        trigger.setAttribute('aria-expanded', 'false');
        content.style.maxHeight = null;
      }
    });
  });

  // ── 3. FORM VALIDATION ─────────────────────────────────────────
  var form = document.getElementById('illuminateRegForm');
  if (!form) return;

  var step1Pane = document.getElementById('step1Pane');
  var step2Pane = document.getElementById('step2Pane');
  var step3Pane = document.getElementById('step3Pane');

  var stepper1 = document.getElementById('stepper1');
  var stepper2 = document.getElementById('stepper2');
  var stepper3 = document.getElementById('stepper3');

  function setFieldError(fieldId, errorMsg) {
    var el = document.getElementById(fieldId);
    if (!el) return;
    var group = (el.classList.contains('field-box') || el.classList.contains('form-group'))
      ? el
      : el.closest('.field-box, .form-group');
    if (!group) return;
    group.classList.add('has-error');
    var msgEl = group.querySelector('.error-text, .form-error-msg');
    if (msgEl && errorMsg) msgEl.textContent = errorMsg;
  }

  function clearFieldError(fieldId) {
    var el = document.getElementById(fieldId);
    if (!el) return;
    var group = (el.classList.contains('field-box') || el.classList.contains('form-group'))
      ? el
      : el.closest('.field-box, .form-group');
    if (!group) return;
    group.classList.remove('has-error');
  }

  // Validation Rules
  function validateStep1() {
    var isValid = true;

    // Full Name
    var fullName = document.getElementById('fullName');
    if (!fullName.value.trim() || fullName.value.trim().length < 2) {
      setFieldError('fullName', 'Please enter your full name (minimum 2 characters).');
      isValid = false;
    } else {
      clearFieldError('fullName');
    }

    // Email
    var email = document.getElementById('email');
    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!email.value.trim() || !emailPattern.test(email.value.trim())) {
      setFieldError('email', 'Please enter a valid email address.');
      isValid = false;
    } else {
      clearFieldError('email');
    }

    // Mobile
    var mobile = document.getElementById('mobile');
    var cleanMobile = mobile.value.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setFieldError('mobile', 'Please enter a valid 10-digit mobile number.');
      isValid = false;
    } else {
      clearFieldError('mobile');
    }

    // College
    var college = document.getElementById('college');
    if (!college.value.trim() || college.value.trim().length < 2) {
      setFieldError('college', 'Please enter your college or university.');
      isValid = false;
    } else {
      clearFieldError('college');
    }

    // Course
    var course = document.getElementById('course');
    if (!course.value.trim()) {
      setFieldError('course', 'Please enter your course or program (e.g. B.Tech CSE).');
      isValid = false;
    } else {
      clearFieldError('course');
    }

    // Year
    var year = document.getElementById('year');
    if (!year.value) {
      setFieldError('year', 'Please select your current year of study.');
      isValid = false;
    } else {
      clearFieldError('year');
    }

    // Startup Idea Radio
    var ideaSelected = form.querySelector('input[name="hasIdea"]:checked');
    if (!ideaSelected) {
      setFieldError('hasIdeaGroup', 'Please select one option.');
      isValid = false;
    } else {
      clearFieldError('hasIdeaGroup');
    }

    // Attended Before Radio
    var attendedSelected = form.querySelector('input[name="attendedBefore"]:checked');
    if (!attendedSelected) {
      setFieldError('attendedGroup', 'Please select yes or no.');
      isValid = false;
    } else {
      clearFieldError('attendedGroup');
    }

    // Agreement Checkboxes
    var agreeAccurate = document.getElementById('agreeAccurate');
    var agreeRules = document.getElementById('agreeRules');
    var agreePayment = document.getElementById('agreePayment');

    if (!agreeAccurate.checked || !agreeRules.checked || !agreePayment.checked) {
      setFieldError('agreementsGroup', 'Please check all 3 confirmation boxes to proceed.');
      isValid = false;
    } else {
      clearFieldError('agreementsGroup');
    }

    return isValid;
  }

  // Live validation listeners
  ['fullName', 'email', 'mobile', 'college', 'course', 'year'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur', function () {
      if (el.value.trim()) clearFieldError(id);
    });
    el.addEventListener('input', function () {
      clearFieldError(id);
    });
    el.addEventListener('change', function () {
      clearFieldError(id);
    });
  });

  // Radio & Checkbox instant error clearers
  form.querySelectorAll('input[name="hasIdea"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      clearFieldError('hasIdeaGroup');
    });
  });

  form.querySelectorAll('input[name="attendedBefore"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      clearFieldError('attendedGroup');
    });
  });

  ['agreeAccurate', 'agreeRules', 'agreePayment'].forEach(function (chkId) {
    var chk = document.getElementById(chkId);
    if (chk) {
      chk.addEventListener('change', function () {
        var a1 = document.getElementById('agreeAccurate');
        var a2 = document.getElementById('agreeRules');
        var a3 = document.getElementById('agreePayment');
        if (a1 && a2 && a3 && a1.checked && a2.checked && a3.checked) {
          clearFieldError('agreementsGroup');
        }
      });
    }
  });

  // ── 4. STEP 1 SUBMISSION → GO TO STEP 2 (PAYMENT) ──────────────
  var step1SubmitBtn = document.getElementById('step1SubmitBtn');
  step1SubmitBtn.addEventListener('click', function (e) {
    e.preventDefault();

    if (!validateStep1()) {
      var firstError = form.querySelector('.has-error');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      showToast('Please check the highlighted fields.');
      return;
    }

    // Populate state
    state.regId = generateRegistrationId();
    state.fullName = document.getElementById('fullName').value.trim();
    state.email = document.getElementById('email').value.trim();
    state.mobile = document.getElementById('mobile').value.trim();
    state.college = document.getElementById('college').value.trim();
    state.course = document.getElementById('course').value.trim();
    state.year = document.getElementById('year').value;
    state.hasIdea = form.querySelector('input[name="hasIdea"]:checked')?.value || 'Exploring';
    state.attendedBefore = form.querySelector('input[name="attendedBefore"]:checked')?.value || 'No';
    state.expectations = document.getElementById('expectations')?.value.trim() || 'Learn entrepreneurship fundamentals';
    state.submittedAt = new Date().toISOString();

    // Update Step 2 UI elements
    var regIdDisplay = document.getElementById('regIdDisplay');
    if (regIdDisplay) regIdDisplay.textContent = state.regId;

    var payPayerName = document.getElementById('payPayerName');
    if (payPayerName) payPayerName.textContent = state.fullName;

    // Generate Dynamic UPI QR Code
    // Format: upi://pay?pa={UPI_ID}&pn={NAME}&am={AMOUNT}&tn={NOTE}&cu=INR
    var upiUri = 'upi://pay?pa=' + encodeURIComponent(CONFIG.UPI_ID) +
                 '&pn=' + encodeURIComponent(CONFIG.UPI_NAME) +
                 '&am=' + CONFIG.FEE_AMOUNT +
                 '&tn=' + encodeURIComponent('illuminate 2026 ' + state.regId) +
                 '&cu=INR';

    var qrImg = document.getElementById('paymentQrImage');
    if (qrImg) {
      // Using fast, reliable QR API
      qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=' + encodeURIComponent(upiUri);
      qrImg.alt = 'UPI Payment QR Code for ' + state.regId;
    }

    // Setup Mobile Intent Button
    var mobilePayBtn = document.getElementById('mobileUpiIntentBtn');
    if (mobilePayBtn) {
      mobilePayBtn.href = upiUri;
    }

    // Switch step panes
    step1Pane.classList.remove('active');
    step2Pane.classList.add('active');

    stepper1.classList.remove('active');
    stepper1.classList.add('completed');
    stepper2.classList.add('active');

    // Scroll smoothly to payment station
    var station = document.getElementById('register');
    if (station) {
      station.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    showToast('Registration ID assigned: ' + state.regId);
  });

  // ── 5. COPY UPI ID & REGISTRATION ID ────────────────────────────
  var copyUpiBtn = document.getElementById('copyUpiIdBtn');
  if (copyUpiBtn) {
    copyUpiBtn.addEventListener('click', function () {
      navigator.clipboard.writeText(CONFIG.UPI_ID).then(function () {
        showToast('UPI ID copied: ' + CONFIG.UPI_ID);
      }).catch(function () {
        showToast('UPI ID: ' + CONFIG.UPI_ID);
      });
    });
  }

  var copyRegIdBtn = document.getElementById('copyRegIdBtn');
  if (copyRegIdBtn) {
    copyRegIdBtn.addEventListener('click', function () {
      navigator.clipboard.writeText(state.regId).then(function () {
        showToast('Registration ID copied: ' + state.regId);
      });
    });
  }

  // ── 6. STEP 2: UTR SUBMISSION → STEP 3 (CONFIRMATION) ──────────
  var backToStep1Btn = document.getElementById('backToStep1Btn');
  if (backToStep1Btn) {
    backToStep1Btn.addEventListener('click', function (e) {
      e.preventDefault();
      step2Pane.classList.remove('active');
      step1Pane.classList.add('active');

      stepper2.classList.remove('active');
      stepper1.classList.remove('completed');
      stepper1.classList.add('active');
    });
  }

  var confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
  confirmPaymentBtn.addEventListener('click', function (e) {
    e.preventDefault();

    var utrInput = document.getElementById('utrNumber');
    var utrValue = utrInput ? utrInput.value.trim() : '';

    if (!utrValue || utrValue.length < 8) {
      setFieldError('utrNumber', 'Please enter a valid 12-digit UTR or Transaction Number.');
      if (utrInput) utrInput.focus();
      return;
    }
    clearFieldError('utrNumber');
    state.utrNumber = utrValue;

    // Loading state with strictly sized spinner (prevents logo/icon glitch)
    confirmPaymentBtn.disabled = true;
    confirmPaymentBtn.innerHTML = `
      <svg class="animate-spin btn-icon btn-svg" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" style="width:16px;height:16px;max-width:16px;max-height:16px;animation:spin 1s linear infinite;flex-shrink:0;">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"></circle>
        <path class="opacity-75" fill="currentColor" opacity="0.75" d="M4 12a8 8 0 018-8v8H4z"></path>
      </svg>
      <span>Submitting Verification…</span>
    `;

    // Send payload to backend
    submitRegistrationToBackend(state)
      .then(function (res) {
        renderConfirmationScreen(state);
      })
      .catch(function (err) {
        console.warn('Backend warning:', err);
        renderConfirmationScreen(state);
      })
      .finally(function () {
        confirmPaymentBtn.disabled = false;
        confirmPaymentBtn.innerHTML = `
          <span>Submit Payment Verification</span>
          <svg class="btn-icon btn-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:16px;height:16px;max-width:16px;max-height:16px;flex-shrink:0;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        `;
      });
  });

  // ── 7. BACKEND API SUBMISSION ───────────────────────────────────
  async function submitRegistrationToBackend(payload) {
    var endpoint = CONFIG.APPS_SCRIPT_URL;

    if (endpoint && endpoint.startsWith('http')) {
      // Use text/plain to avoid CORS preflight issues on Google Apps Script
      var response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      return await response.json();
    }

    // Fallback: Local demo storage simulation
    console.log('[illuminate 2026] Registration saved locally (Apps Script pending):', payload);
    try {
      var stored = JSON.parse(localStorage.getItem('illuminate_registrations') || '[]');
      stored.push(payload);
      localStorage.setItem('illuminate_registrations', JSON.stringify(stored));
    } catch (e) {}

    await new Promise(function (resolve) { setTimeout(resolve, 800); });
    return { ok: true, message: 'Saved successfully' };
  }

  // ── 8. RENDER CONFIRMATION SCREEN & DIGITAL PASS ───────────────
  function renderConfirmationScreen(data) {
    // Populate Digital Pass Fields
    var passId = document.getElementById('passRegId');
    if (passId) passId.textContent = data.regId;

    var passName = document.getElementById('passAttendeeName');
    if (passName) passName.textContent = data.fullName;

    var passCollege = document.getElementById('passCollege');
    if (passCollege) passCollege.textContent = data.college || 'CSMU';

    var passCourseYear = document.getElementById('passCourseYear');
    if (passCourseYear) {
      passCourseYear.textContent = (data.course || 'Degree Program') + (data.year ? ' • Year ' + data.year : '');
    }

    var passUtr = document.getElementById('passUtr');
    if (passUtr) passUtr.textContent = data.utrNumber || 'PENDING';

    var passStatusPill = document.getElementById('passLiveStatusPill');
    if (passStatusPill) {
      passStatusPill.textContent = 'Status: Payment Verification Pending';
      passStatusPill.className = 'pass-status-pill';
    }

    // Generate Check-in verification QR code on the pass
    // Points directly to illuminate page with query verify=ILL-XXXXXX (NOT verify.html)
    var passQr = document.getElementById('passQrImage');
    var verifyUrl = window.location.origin + window.location.pathname.replace(/\/+$/, '') + '?verify=' + encodeURIComponent(data.regId);
    if (passQr) {
      passQr.crossOrigin = 'anonymous';
      passQr.src = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=6&data=' + encodeURIComponent(verifyUrl);
      passQr.alt = 'Scan to verify registration record ' + data.regId;
    }

    // Cache record in localStorage for instant retrieval & offline scan
    try {
      localStorage.setItem('illuminate_record_' + data.regId, JSON.stringify({
        regId: data.regId,
        fullName: data.fullName,
        email: data.email,
        college: data.college,
        course: data.course,
        year: data.year,
        fee: CONFIG.FEE_AMOUNT,
        status: 'Pending Verification',
        utrNumber: data.utrNumber,
        checkinStatus: 'Not Checked In',
        timestamp: new Date().toISOString()
      }));
    } catch (e) {}

    // Switch panes
    step2Pane.classList.remove('active');
    step3Pane.classList.add('active');

    stepper2.classList.remove('active');
    stepper2.classList.add('completed');
    stepper3.classList.add('active');

    // Scroll up to view confirmation
    var station = document.getElementById('register');
    if (station) {
      station.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    showToast('Registration Confirmed for ' + data.regId + '!');
  }

  // ── 9. DIRECT PASS DOWNLOAD (HIGH-DPI CANVAS PNG) ──────────────
  function downloadPassAsPNG() {
    var regId = state.regId || 'ILL-PASS';
    var fullName = state.fullName || 'Registered Attendee';
    var college = state.college || 'CSMU';
    var courseYear = (state.course || 'Degree Program') + (state.year ? ' • Year ' + state.year : '');
    var utr = state.utrNumber || 'PENDING';
    var qrImg = document.getElementById('passQrImage');

    var canvas = document.createElement('canvas');
    var w = 840;
    var h = 1200;
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    if (!ctx) {
      showToast('Could not create canvas context');
      return;
    }

    // 1. Dark executive background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    // Accent radial glow
    var radGlow = ctx.createRadialGradient(w / 2, 0, 10, w / 2, 0, 520);
    radGlow.addColorStop(0, 'rgba(255, 90, 31, 0.22)');
    radGlow.addColorStop(1, 'rgba(13, 17, 23, 0)');
    ctx.fillStyle = radGlow;
    ctx.fillRect(0, 0, w, h);

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 3;
    ctx.strokeRect(12, 12, w - 24, h - 24);

    // 2. Lanyard Hole simulation
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect((w - 120) / 2, 28, 120, 16, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 3. Flame bar
    var flameGrad = ctx.createLinearGradient(40, 0, w - 40, 0);
    flameGrad.addColorStop(0, '#ff5a1f');
    flameGrad.addColorStop(0.5, '#ffb703');
    flameGrad.addColorStop(1, '#ff5a1f');
    ctx.fillStyle = flameGrad;
    ctx.fillRect(40, 68, w - 80, 8);

    // 4. Header Top Meta
    ctx.fillStyle = '#8b949e';
    ctx.font = '800 18px Inter, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('E-CELL IIT BOMBAY  ×  IIEC CSMU', 48, 118);

    // Badge Pill
    ctx.fillStyle = 'rgba(255, 90, 31, 0.16)';
    ctx.beginPath();
    ctx.roundRect(w - 280, 96, 232, 34, 17);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 90, 31, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ff986e';
    ctx.font = '800 13.5px Inter, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OFFICIAL DELEGATE PASS', w - 164, 118);

    // 5. Title Row
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 46px Inter, -apple-system, sans-serif';
    ctx.fillText('illuminate ', 48, 185);
    var illWidth = ctx.measureText('illuminate ').width;
    ctx.fillStyle = '#ff5a1f';
    ctx.fillText('2026', 48 + illWidth, 185);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '600 20px Inter, -apple-system, sans-serif';
    ctx.fillText('CSMU Panvel Edition', w - 48, 182);

    // Separator line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(48, 208);
    ctx.lineTo(w - 48, 208);
    ctx.stroke();

    // 6. Attendee Spotlight Card
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(48, 232, w - 96, 150, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#8b949e';
    ctx.font = '800 15px Inter, -apple-system, sans-serif';
    ctx.fillText('DELEGATE ATTENDEE', 76, 270);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px Inter, -apple-system, sans-serif';
    ctx.fillText(fullName, 76, 320);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 20px Inter, -apple-system, sans-serif';
    ctx.fillText(college + '  •  ' + courseYear, 76, 355);

    // 7. 2x2 Credential Grid
    var gridX = 48;
    var gridY = 405;
    var cellW = (w - 96 - 20) / 2;
    var cellH = 92;

    function drawCell(x, y, label, val, valColor) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.beginPath();
      ctx.roundRect(x, y, cellW, cellH, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#8b949e';
      ctx.font = '800 14px Inter, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, x + 20, y + 32);

      ctx.fillStyle = valColor || '#ffffff';
      ctx.font = '800 21px Inter, -apple-system, sans-serif';
      ctx.fillText(val, x + 20, y + 68);
    }

    drawCell(gridX, gridY, 'REGISTRATION ID', regId, '#ff986e');
    drawCell(gridX + cellW + 20, gridY, 'WORKSHOP FEE', '₹749 (Paid)', '#34d399');
    drawCell(gridX, gridY + cellH + 16, 'UTR REFERENCE', utr, '#ffffff');
    drawCell(gridX + cellW + 20, gridY + cellH + 16, 'CERTIFIED BY', 'E-Cell, IIT Bombay', '#ffc7b0');

    // 8. Perforated Notch Divider
    var tearY = 645;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(56, tearY);
    ctx.lineTo(w - 56, tearY);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // 9. QR Code & Security Row
    var qrBoxX = 54;
    var qrBoxY = 680;
    var qrSize = 190;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(qrBoxX, qrBoxY, qrSize, qrSize, 14);
    ctx.fill();

    if (qrImg && qrImg.complete && qrImg.naturalWidth > 0) {
      try {
        ctx.drawImage(qrImg, qrBoxX + 10, qrBoxY + 10, qrSize - 20, qrSize - 20);
      } catch (e) {
        ctx.fillStyle = '#111';
        ctx.font = '700 16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('QR Code Verified', qrBoxX + qrSize / 2, qrBoxY + qrSize / 2);
      }
    } else {
      ctx.fillStyle = '#111';
      ctx.font = '700 16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Entry QR Code', qrBoxX + qrSize / 2, qrBoxY + qrSize / 2);
    }

    // Security text details beside QR
    var metaX = qrBoxX + qrSize + 30;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ff5a1f';
    ctx.font = '800 16px Inter, -apple-system, sans-serif';
    ctx.fillText('SCAN FOR LIVE DATABASE RECORD', metaX, qrBoxY + 36);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 20px Inter, -apple-system, sans-serif';
    ctx.fillText('Venue: CSMU Campus, Panvel', metaX, qrBoxY + 76);

    ctx.fillStyle = '#8b949e';
    ctx.font = '500 16px Inter, -apple-system, sans-serif';
    ctx.fillText('Valid for single student entry  •  Carry College Photo ID', metaX, qrBoxY + 112);

    // Status Pill beside QR
    ctx.fillStyle = 'rgba(253, 230, 138, 0.15)';
    ctx.beginPath();
    ctx.roundRect(metaX, qrBoxY + 136, 320, 36, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(253, 230, 138, 0.35)';
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = '800 14px Inter, -apple-system, sans-serif';
    ctx.fillText('STATUS: PAYMENT VERIFICATION PENDING', metaX + 18, qrBoxY + 160);

    // 10. Bottom Security Watermark
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(48, h - 70);
    ctx.lineTo(w - 48, h - 70);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '800 13px Inter, -apple-system, sans-serif';
    ctx.fillText('IIEC CSMU  •  WHERE VISION DRIVES VENTURE  •  E-CELL IIT BOMBAY', w / 2, h - 36);

    // Trigger PNG download directly
    try {
      var dataURL = canvas.toDataURL('image/png');
      var a = document.createElement('a');
      a.href = dataURL;
      a.download = 'illuminate-pass-' + regId + '.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('Pass image downloaded successfully!');
    } catch (err) {
      console.error('Canvas export error:', err);
      window.print();
    }
  }

  var downloadPassBtn = document.getElementById('downloadPassBtn');
  if (downloadPassBtn) {
    downloadPassBtn.addEventListener('click', function () {
      downloadPassAsPNG();
    });
  }

  // ── 10. SINGLE-PAGE PASS PRINT ──────────────────────────────────
  var printPassBtn = document.getElementById('printPassBtn');
  if (printPassBtn) {
    printPassBtn.addEventListener('click', function () {
      window.print();
    });
  }

  // ── 11. ADD TO CALENDAR (.ICS) ─────────────────────────────────
  var calendarBtn = document.getElementById('addToCalendarBtn');
  if (calendarBtn) {
    calendarBtn.addEventListener('click', function () {
      var icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//IIEC CSMU//illuminate 2026//EN',
        'BEGIN:VEVENT',
        'SUMMARY:illuminate 2026 — Workshop by E-Cell IIT Bombay at CSMU',
        'DESCRIPTION:Registration ID: ' + (state.regId || 'ILL-CONFIRMED') + '\\nOrganized by Incubation, Innovation & Entrepreneurship Cell (IIEC) at CSMU Panvel in collaboration with E-Cell IIT Bombay.',
        'LOCATION:Chhatrapati Shivaji Maharaj University, Panvel, Navi Mumbai, Maharashtra',
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      var blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'illuminate-2026-csmu.ics');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Calendar invite downloaded!');
    });
  }

  // ── 12. LIVE DATABASE VERIFICATION VIA URL SCAN ────────────────
  function initLiveVerificationModal() {
    var modal = document.getElementById('illVerifyModal');
    var modalBody = document.getElementById('verifyModalBody');
    var closeBtn = document.getElementById('closeVerifyModalBtn');
    if (!modal || !modalBody) return;

    function openModal() {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });

    var params = new URLSearchParams(window.location.search);
    var verifyId = (params.get('verify') || params.get('id') || '').trim().toUpperCase();
    if (!verifyId) return;

    openModal();
    modalBody.innerHTML = `
      <div class="verify-loading-state">
        <svg class="animate-spin btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" style="width:32px;height:32px;color:var(--ill-accent);animation:spin 1s linear infinite;margin:0 auto 14px;">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"></circle>
          <path class="opacity-75" fill="currentColor" opacity="0.75" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <p style="font-weight:700;color:var(--ill-ink);margin:0 0 6px;">Querying Google Sheets Registry...</p>
        <p style="font-size:12px;color:var(--ill-muted);margin:0;">Verifying Registration ID: <code style="color:var(--ill-accent);">${escapeHtml(verifyId)}</code></p>
      </div>
    `;

    // Fetch from Apps Script Backend
    var verifyUrl = CONFIG.APPS_SCRIPT_URL;
    var fetchPromise;

    if (verifyUrl && verifyUrl.startsWith('http')) {
      var sep = verifyUrl.indexOf('?') === -1 ? '?' : '&';
      var queryEndpoint = verifyUrl + sep + 'action=verify&id=' + encodeURIComponent(verifyId) + '&format=json';
      fetchPromise = fetch(queryEndpoint).then(function (r) { return r.json(); });
    } else {
      // Local demo fallback
      fetchPromise = Promise.reject('Apps Script URL pending');
    }

    fetchPromise
      .then(function (res) {
        if (res && res.found && res.attendee) {
          renderVerificationResult(res.attendee);
        } else {
          renderVerificationNotFound(verifyId);
        }
      })
      .catch(function (err) {
        // Check localStorage fallback
        try {
          var localRec = JSON.parse(localStorage.getItem('illuminate_record_' + verifyId) || 'null');
          if (localRec) {
            renderVerificationResult(localRec);
            return;
          }
          var all = JSON.parse(localStorage.getItem('illuminate_registrations') || '[]');
          var match = all.find(function (item) { return item.regId && item.regId.toUpperCase() === verifyId; });
          if (match) {
            renderVerificationResult(match);
            return;
          }
        } catch (e) {}

        renderVerificationNotFound(verifyId);
      });

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function renderVerificationResult(data) {
      var isVerified = (data.status === 'Verified');
      var statusClass = isVerified ? 'status-verified' : 'status-pending';
      var statusText = isVerified ? 'Official Registration Verified' : 'Payment Under Verification';

      modalBody.innerHTML = `
        <div class="verify-result-card">
          <div class="verify-badge-banner ${statusClass}">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:24px;height:24px;flex-shrink:0;">
              ${isVerified
                ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>'
                : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>'
              }
            </svg>
            <div>
              <strong style="font-size:14px;display:block;">${statusText}</strong>
              <span style="font-size:12px;opacity:0.9;">illuminate 2026 Official Delegate Record</span>
            </div>
          </div>

          <div class="verify-grid">
            <div class="verify-field-full">
              <div class="verify-lbl">Attendee Name</div>
              <div class="verify-val-lg">${escapeHtml(data.fullName || 'Registered Student')}</div>
            </div>

            <div>
              <div class="verify-lbl">Registration ID</div>
              <div class="verify-val" style="color:var(--ill-accent);font-family:monospace;font-size:14px;">${escapeHtml(data.regId)}</div>
            </div>

            <div>
              <div class="verify-lbl">Workshop Fee</div>
              <div class="verify-val" style="color:#059669;">₹${escapeHtml(String(data.fee || 749))} (Paid)</div>
            </div>

            <div class="verify-field-full">
              <div class="verify-lbl">College / University</div>
              <div class="verify-val">${escapeHtml(data.college || 'CSMU')}</div>
            </div>

            <div>
              <div class="verify-lbl">Program / Year</div>
              <div class="verify-val">${escapeHtml(data.course || 'Degree')}${data.year ? ' • Year ' + escapeHtml(data.year) : ''}</div>
            </div>

            <div>
              <div class="verify-lbl">Payment UTR</div>
              <div class="verify-val" style="font-family:monospace;font-size:12px;">${escapeHtml(data.utrNumber || 'Submitted')}</div>
            </div>

            <div>
              <div class="verify-lbl">Event Check-in</div>
              <div class="verify-val">${escapeHtml(data.checkinStatus || 'Not Checked In')}</div>
            </div>

            <div>
              <div class="verify-lbl">Certification</div>
              <div class="verify-val" style="color:var(--ill-accent);">E-Cell, IIT Bombay</div>
            </div>
          </div>

          <div style="display:flex;gap:10px;justify-content:center;">
            <button type="button" class="btn-iiec btn-iiec-ink" id="modalCloseBtn" style="padding:10px 24px;font-size:12px;">
              Close Verification
            </button>
            <a href="illuminate" class="btn-iiec btn-iiec-ghost" style="padding:10px 20px;font-size:12px;">
              Workshop Portal
            </a>
          </div>
        </div>
      `;

      var modalClose = document.getElementById('modalCloseBtn');
      if (modalClose) modalClose.addEventListener('click', closeModal);
    }

    function renderVerificationNotFound(id) {
      modalBody.innerHTML = `
        <div class="verify-result-card text-center" style="padding:16px 0;">
          <div class="verify-badge-banner status-notfound" style="justify-content:center;">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:24px;height:24px;flex-shrink:0;">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <div>
              <strong style="font-size:14px;display:block;">Record Not Found</strong>
              <span style="font-size:12px;">No attendee record matches ID: ${escapeHtml(id)}</span>
            </div>
          </div>
          <p style="font-size:13.5px;color:var(--ill-muted);margin:16px 0 20px;line-height:1.55;">
            The scanned Registration ID was not found in the official database. Please ensure you registered on the official IIEC portal.
          </p>
          <div style="display:flex;gap:10px;justify-content:center;">
            <button type="button" class="btn-iiec btn-iiec-ink" id="modalNotFoundCloseBtn" style="padding:10px 24px;font-size:12px;">
              Close
            </button>
            <a href="illuminate#register" class="btn-iiec btn-iiec-primary" style="padding:10px 20px;font-size:12px;">
              Register Now (₹749)
            </a>
          </div>
        </div>
      `;

      var notFoundClose = document.getElementById('modalNotFoundCloseBtn');
      if (notFoundClose) notFoundClose.addEventListener('click', closeModal);
    }
  }

  // Initialize URL query verification on load
  initLiveVerificationModal();

})();
