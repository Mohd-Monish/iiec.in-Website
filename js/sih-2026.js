/**
 * CSMU - SIH 2026 Internal Hackathon Registration JavaScript
 * IIEC.in - Incubation, Innovation & Entrepreneurship Cell
 */

// Replace this URL with your deployed Google Apps Script Web App URL
var GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxK1mCkQU48l2nQ_uXGUHplM70fJhbmt4XcP9iigEFXqatkrFfv4NZMKko8AQGMCkS4Mw/exec";

document.addEventListener('DOMContentLoaded', () => {
  let currentStep = 1;
  const totalSteps = 6;
  const form = document.getElementById('sihRegistrationForm');
  const modal = document.getElementById('submissionModal');

  // Initialize
  initMobileNavbar();
  initStepWizard();
  initFormModeToggle();
  initMemberSwitcher();
  initChipsSelection();
  initCharCounters();
  initComplianceChecker();
  initDraftSaving();

  // ---------------------------------------------------------
  // 0. Mobile Hamburger Menu Toggle
  // ---------------------------------------------------------
  function initMobileNavbar() {
    const toggleBtn = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (toggleBtn && navLinks) {
      toggleBtn.addEventListener('click', () => {
        const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
        toggleBtn.setAttribute('aria-expanded', !isExpanded);
        navLinks.classList.toggle('active');
      });

      navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          navLinks.classList.remove('active');
          toggleBtn.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  // ---------------------------------------------------------
  // 1. Step Wizard Navigation
  // ---------------------------------------------------------
  function initStepWizard() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (validateStep(currentStep)) {
          if (currentStep < totalSteps) {
            goToStep(currentStep + 1);
          }
        }
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
          goToStep(currentStep - 1);
        }
      });
    }

    document.querySelectorAll('.sih-stepper-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const stepNum = parseInt(tab.dataset.step);
        if (stepNum < currentStep || validateStep(currentStep)) {
          goToStep(stepNum);
        }
      });
    });

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (validateAllSteps()) {
          processSubmission();
        }
      });
    }
  }

  function goToStep(step) {
    currentStep = step;

    document.querySelectorAll('.sih-section').forEach(sec => {
      sec.classList.remove('active');
    });
    const activeSection = document.getElementById(`stepSection${step}`);
    if (activeSection) {
      activeSection.classList.add('active');
    }

    document.querySelectorAll('.sih-stepper-tab').forEach(tab => {
      const tabStep = parseInt(tab.dataset.step);
      tab.classList.remove('active');
      if (tabStep === step) {
        tab.classList.add('active');
      }
      if (tabStep < step) {
        tab.classList.add('completed');
      }
    });

    const percent = Math.round((step / totalSteps) * 100);
    const fill = document.getElementById('progressBarFill');
    const label = document.getElementById('progressPercentLabel');
    const stepLabel = document.getElementById('currentStepLabel');

    if (fill) fill.style.width = `${percent}%`;
    if (label) label.textContent = `${percent}%`;
    if (stepLabel) stepLabel.textContent = `Step ${step} of ${totalSteps}`;

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    if (prevBtn) prevBtn.style.display = (step === 1) ? 'none' : 'inline-flex';
    if (nextBtn) nextBtn.style.display = (step === totalSteps) ? 'none' : 'inline-flex';
    if (submitBtn) submitBtn.style.display = (step === totalSteps) ? 'inline-flex' : 'none';

    const wrapper = document.querySelector('.sih-form-wrapper');
    if (wrapper) {
      window.scrollTo({ top: wrapper.offsetTop - 70, behavior: 'smooth' });
    }
  }

  // ---------------------------------------------------------
  // 2. Form Mode Toggle (Multi-step vs Single-page)
  // ---------------------------------------------------------
  function initFormModeToggle() {
    const wizardBtn = document.getElementById('btnWizardMode');
    const singleBtn = document.getElementById('btnSinglePageMode');
    const formBody = document.querySelector('.sih-form-body');

    if (wizardBtn && singleBtn) {
      wizardBtn.addEventListener('click', () => {
        wizardBtn.classList.add('active');
        singleBtn.classList.remove('active');
        formBody.classList.remove('sih-single-page-mode');
        document.querySelector('.sih-progress-container').style.display = 'block';
        document.querySelector('.sih-stepper-tabs').style.display = 'flex';
        goToStep(currentStep);
      });

      singleBtn.addEventListener('click', () => {
        singleBtn.classList.add('active');
        wizardBtn.classList.remove('active');
        formBody.classList.add('sih-single-page-mode');
        document.querySelector('.sih-progress-container').style.display = 'none';
        document.querySelector('.sih-stepper-tabs').style.display = 'none';
        document.getElementById('prevBtn').style.display = 'none';
        document.getElementById('nextBtn').style.display = 'none';
        document.getElementById('submitBtn').style.display = 'inline-flex';
      });
    }
  }

  // ---------------------------------------------------------
  // 3. Compact Member Details Switcher
  // ---------------------------------------------------------
  function initMemberSwitcher() {
    document.querySelectorAll('.sih-member-switcher-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const memberId = btn.dataset.member;
        btn.parentElement.querySelectorAll('.sih-member-switcher-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const section = btn.closest('.sih-section');
        if (section) {
          section.querySelectorAll('.sih-member-card').forEach(card => card.classList.remove('active'));
          const targetCard = section.querySelector(`#memberCard${memberId}`);
          if (targetCard) targetCard.classList.add('active');
        }
      });
    });
  }

  // ---------------------------------------------------------
  // 4. Tag Chips Selection
  // ---------------------------------------------------------
  function initChipsSelection() {
    document.querySelectorAll('.sih-chip').forEach(chip => {
      const input = chip.querySelector('input[type="checkbox"]');
      if (input) {
        if (input.checked) chip.classList.add('selected');

        chip.addEventListener('click', (e) => {
          if (e.target !== input) {
            input.checked = !input.checked;
          }
          chip.classList.toggle('selected', input.checked);
          saveDraft();
        });
      }
    });
  }

  // ---------------------------------------------------------
  // 5. Character Counter
  // ---------------------------------------------------------
  function initCharCounters() {
    const probDefInput = document.getElementById('q8_problem_definition');
    const charCounter = document.getElementById('probDefCounter');

    if (probDefInput && charCounter) {
      probDefInput.addEventListener('input', () => {
        const count = probDefInput.value.length;
        charCounter.textContent = `${count} / 150 characters`;
        charCounter.style.color = (count > 150) ? 'var(--sih-required-star)' : 'var(--sih-text-muted)';
      });
    }
  }

  // ---------------------------------------------------------
  // 6. Compliance Status Checker
  // ---------------------------------------------------------
  function initComplianceChecker() {
    document.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('change', updateComplianceStatus);
      el.addEventListener('input', updateComplianceStatus);
    });
  }

  function updateComplianceStatus() {
    const fulltimeSelect = document.getElementById('q12_fulltime_select');
    const femaleSelect = document.getElementById('q13_female_select');

    let femaleCount = 0;
    for (let i = 1; i <= 6; i++) {
      const gSelect = document.getElementById(`m${i}_gender`);
      if (gSelect && gSelect.value === 'F') {
        femaleCount++;
      }

      // Live check if member i is complete
      const card = document.getElementById(`memberCard${i}`);
      const btn = document.querySelector(`.sih-member-switcher-btn[data-member="${i}"]`);
      if (card && btn) {
        const inputs = card.querySelectorAll('input, select');
        const filled = Array.from(inputs).every(inp => inp.value.trim().length > 0);
        btn.classList.toggle('completed', filled);
        if (filled) btn.classList.remove('incomplete');
      }
    }

    const itemFemale = document.getElementById('compFemaleStatus');
    if (itemFemale) {
      const hasFemale = (femaleSelect && femaleSelect.value === 'Yes') || femaleCount > 0;
      itemFemale.className = `sih-compliance-item ${hasFemale ? 'valid' : 'invalid'}`;
      itemFemale.querySelector('.comp-text').textContent = hasFemale
        ? `Female Member: Included (${femaleCount > 0 ? femaleCount : 'Yes'})`
        : 'Female Member: Required (At least 1)';
    }

    const itemFulltime = document.getElementById('compFulltimeStatus');
    if (itemFulltime) {
      const isFulltime = fulltimeSelect && fulltimeSelect.value === 'Yes';
      itemFulltime.className = `sih-compliance-item ${isFulltime ? 'valid' : 'invalid'}`;
      itemFulltime.querySelector('.comp-text').textContent = isFulltime
        ? 'CSMU Students: Verified (All 6 Members)'
        : 'CSMU Students: Pending Verification';
    }
  }

  // ---------------------------------------------------------
  // 7. Step Validation
  // ---------------------------------------------------------
  function validateStep(step) {
    const section = document.getElementById(`stepSection${step}`);
    if (!section) return true;

    // Special strict validation for Step 3 (All 6 Team Members)
    if (step === 3) {
      let firstIncompleteMember = null;
      let incompleteCount = 0;

      for (let m = 1; m <= 6; m++) {
        const card = document.getElementById(`memberCard${m}`);
        const switcherBtn = document.querySelector(`.sih-member-switcher-btn[data-member="${m}"]`);
        let memberValid = true;

        if (card) {
          const reqGroups = card.querySelectorAll('[data-required="true"]');
          reqGroups.forEach(group => {
            group.classList.remove('has-error');
            const inputs = group.querySelectorAll('input, select');
            inputs.forEach(inp => {
              if (!inp.value.trim()) {
                memberValid = false;
                group.classList.add('has-error');
                inp.classList.add('error');
              } else {
                inp.classList.remove('error');
              }
            });
          });
        }

        if (switcherBtn) {
          switcherBtn.classList.toggle('completed', memberValid);
          switcherBtn.classList.toggle('incomplete', !memberValid);
        }

        if (!memberValid) {
          incompleteCount++;
          if (!firstIncompleteMember) {
            firstIncompleteMember = m;
          }
        }
      }

      const alertBanner = document.getElementById('memberAlertBanner');
      const alertText = document.getElementById('memberAlertText');

      if (incompleteCount > 0) {
        // Switch to the first incomplete member tab so the user can fill it immediately
        const firstBtn = document.querySelector(`.sih-member-switcher-btn[data-member="${firstIncompleteMember}"]`);
        if (firstBtn) firstBtn.click();

        if (alertBanner && alertText) {
          const memberLabel = firstIncompleteMember === 1 ? 'Team Leader (Member 1)' : `Team Member ${firstIncompleteMember}`;
          alertText.textContent = `Please fill out all details for all 6 members! Details for ${memberLabel} (and ${incompleteCount} member${incompleteCount > 1 ? 's' : ''} total) are incomplete.`;
          alertBanner.style.display = 'flex';
          alertBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        return false;
      } else {
        if (alertBanner) alertBanner.style.display = 'none';
        return true;
      }
    }

    // Standard validation for other steps
    let isValid = true;
    const requiredGroups = section.querySelectorAll('[data-required="true"]');

    requiredGroups.forEach(group => {
      group.classList.remove('has-error');

      const inputs = group.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="url"], select, textarea');
      const checkboxes = group.querySelectorAll('input[type="checkbox"]');

      if (inputs.length > 0) {
        inputs.forEach(inp => {
          if (!inp.value.trim()) {
            isValid = false;
            group.classList.add('has-error');
            inp.classList.add('error');
          } else {
            inp.classList.remove('error');
            if (inp.type === 'email' && !isValidEmail(inp.value)) {
              isValid = false;
              group.classList.add('has-error');
              inp.classList.add('error');
            }
            if (inp.id === 'q8_problem_definition' && inp.value.length > 150) {
              isValid = false;
              group.classList.add('has-error');
              inp.classList.add('error');
            }
          }
        });
      } else if (checkboxes.length > 0) {
        const checked = Array.from(checkboxes).some(c => c.checked);
        if (!checked) {
          isValid = false;
          group.classList.add('has-error');
        }
      }
    });

    if (!isValid) {
      const firstError = section.querySelector('.has-error');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return isValid;
  }

  function validateAllSteps() {
    let valid = true;
    for (let i = 1; i <= totalSteps; i++) {
      if (!validateStep(i)) {
        goToStep(i);
        valid = false;
        break;
      }
    }
    return valid;
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ---------------------------------------------------------
  // 8. Auto Save & Restore Draft
  // ---------------------------------------------------------
  function initDraftSaving() {
    const clearDraftBtn = document.getElementById('btnClearDraft');

    const saved = localStorage.getItem('csmu_sih2026_draft');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        Object.keys(data).forEach(name => {
          const input = form.querySelector(`[name="${name}"]`);
          if (input) {
            if (input.type === 'checkbox') {
              const matches = form.querySelectorAll(`[name="${name}"]`);
              matches.forEach(m => {
                if (Array.isArray(data[name]) ? data[name].includes(m.value) : m.value === data[name]) {
                  m.checked = true;
                  m.closest('.sih-chip')?.classList.add('selected');
                }
              });
            } else {
              input.value = data[name];
            }
          }
        });
        updateComplianceStatus();
      } catch (err) {
        console.error('Failed to restore draft:', err);
      }
    }

    form.addEventListener('input', saveDraft);
    form.addEventListener('change', saveDraft);

    if (clearDraftBtn) {
      clearDraftBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear your saved registration draft?')) {
          localStorage.removeItem('csmu_sih2026_draft');
          form.reset();
          document.querySelectorAll('.sih-chip').forEach(c => c.classList.remove('selected'));
          updateComplianceStatus();
          alert('Draft cleared successfully.');
        }
      });
    }
  }

  function saveDraft() {
    const formData = new FormData(form);
    const data = {};
    for (const [key, val] of formData.entries()) {
      if (data[key]) {
        if (!Array.isArray(data[key])) {
          data[key] = [data[key]];
        }
        data[key].push(val);
      } else {
        data[key] = val;
      }
    }
    localStorage.setItem('csmu_sih2026_draft', JSON.stringify(data));
  }

  // ---------------------------------------------------------
  // 9. Submission Handling & Google Apps Script Posting
  // ---------------------------------------------------------
  function processSubmission() {
    const regId = 'CSMU-SIH26-' + Math.floor(10000 + Math.random() * 90000);
    const teamName = document.getElementById('q1_team_name')?.value || 'Your Team';
    const leaderName = document.getElementById('m1_fullname')?.value || document.getElementById('m1_name')?.value || 'Team Leader';
    const email = document.getElementById('q0_email')?.value || 'N/A';
    const category = document.getElementById('q3_category_select')?.value || 'SIH 2026 Problem';

    // Populate modal receipt
    document.getElementById('receiptRegId').textContent = regId;
    document.getElementById('receiptTeamName').textContent = teamName;
    document.getElementById('receiptLeaderName').textContent = leaderName;
    document.getElementById('receiptEmail').textContent = email;
    document.getElementById('receiptCategory').textContent = category;
    document.getElementById('receiptDate').textContent = new Date().toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    // Send payload to Google Sheets if endpoint URL is configured
    if (GOOGLE_SCRIPT_URL) {
      const formData = new FormData(form);
      const payload = { regId: regId };
      for (const [key, val] of formData.entries()) {
        if (payload[key]) {
          if (!Array.isArray(payload[key])) payload[key] = [payload[key]];
          payload[key].push(val);
        } else {
          payload[key] = val;
        }
      }

      fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(() => {
        console.log('Successfully posted to Google Sheets');
      }).catch(err => {
        console.error('Google Sheets submission error:', err);
      });
    }

    modal.classList.add('show');
    localStorage.removeItem('csmu_sih2026_draft');

    document.getElementById('btnPrintReceipt')?.addEventListener('click', () => {
      window.print();
    });

    document.getElementById('btnCloseModal')?.addEventListener('click', () => {
      modal.classList.remove('show');
      window.location.href = 'index.html';
    });
  }
});
