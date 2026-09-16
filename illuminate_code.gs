/**
 * ============================================================================
 * ILLUMINATE 2026 — Workshop Registration Backend & Ticket Automation
 * Organized at CSMU by Incubation, Innovation & Entrepreneurship Cell (IIEC)
 * In collaboration with E-Cell, IIT Bombay
 *
 * HOW THIS WORKS:
 * 1. POST requests from illuminate.html append registration data with status
 *    "Pending Verification" and the student's submitted UPI UTR number.
 * 2. An organizer reviews the UTR in the Google Sheet.
 * 3. When column "Payment Status" is changed to "Verified" (or via the custom
 *    menu), the script AUTOMATICALLY sends a responsive HTML email ticket
 *    featuring event details and a personalized entry check-in QR code.
 *
 * FIRST RUN SETUP:
 * 1. In your Google Sheet, open Extensions -> Apps Script.
 * 2. Replace any existing code with this file and save (Ctrl+S).
 * 3. In the function dropdown, select "setupSheet" and click "Run".
 *    Accept the authorization prompt.
 * 4. Click Deploy -> New deployment -> Select type: Web app.
 *    - Description: "illuminate 2026 Registration Webhook"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 5. Copy the /exec URL and paste into CONFIG.APPS_SCRIPT_URL in js/illuminate.js.
 * ============================================================================
 */

/* ------------------------------ CONFIG ------------------------------ */
var CONFIG = {
  SHEET_NAME:     'illuminate Registrations',
  SUMMARY_NAME:   'Dashboard & Stats',
  EVENT_NAME:     'illuminate 2026',
  FEE_AMOUNT:     749, // Special NEC discounted fee
  ORGANIZER_NAME: 'IIEC CSMU × E-Cell IIT Bombay',
  REPLY_TO_EMAIL: 'ecell-student-rep@csmu.ac.in',
  UPI_ID:         'chavanbhumika1007@oksbi',
  UPI_NAME:       'Bhumika Chavan',
  VENUE_NAME:     'Chhatrapati Shivaji Maharaj University (CSMU), Panvel, Navi Mumbai',
  NOTIFY_ADMIN:   '' // Optional: Add organizer email to receive new registration alerts (e.g. 'admin@iiec.in')
};

/* Headers definition for illuminate Registrations tab */
var HEADERS = [
  'No.',                    // Col 1
  'Timestamp',              // Col 2
  'Registration ID',        // Col 3
  'Full Name',              // Col 4
  'Email',                  // Col 5
  'Mobile',                 // Col 6
  'College / University',   // Col 7
  'Course / Program',       // Col 8
  'Year of Study',          // Col 9
  'Startup Idea Status',    // Col 10
  'Attended Before?',       // Col 11
  'Expectations',           // Col 12
  'Fee (INR)',              // Col 13
  'Payment Status',         // Col 14  ('Pending Verification', 'Verified', 'Rejected')
  'UTR / Txn ID',           // Col 15
  'Payment Timestamp',      // Col 16
  'Ticket Sent?',           // Col 17  ('No', 'Yes')
  'Ticket Sent Timestamp',  // Col 18
  'Verified By',            // Col 19
  'Check-in Status'         // Col 20  ('Not Checked In', 'Checked In')
];

var COL = {
  NO: 1, TS: 2, REG_ID: 3, NAME: 4, EMAIL: 5, MOBILE: 6,
  COLLEGE: 7, COURSE: 8, YEAR: 9, IDEA: 10, ATTENDED: 11,
  EXPECT: 12, FEE: 13, STATUS: 14, UTR: 15, PAY_TS: 16,
  TICKET_SENT: 17, TICKET_TS: 18, VERIFIER: 19, CHECKIN: 20
};

var WIDTHS = [
  50, 150, 130, 180, 230, 130, 220, 160, 120, 160,
  120, 260, 90, 160, 170, 150, 100, 160, 150, 130
];

/* ------------------------------ MENU & TRIGGERS ------------------------------ */

/**
 * Creates custom spreadsheet menu on open
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('⚡ illuminate Admin')
    .addItem('📱 Open Admin Console (Sidebar)', 'showAdminSidebar')
    .addSeparator()
    .addSubMenu(ui.createMenu('💳 Payment & Verification')
      .addItem('✅ Verify & Send Ticket (Selected Row)', 'verifyAndSendSelectedRow')
      .addItem('🚀 Send Tickets to ALL Verified (Unsent)', 'sendAllUnsentVerifiedTickets')
      .addItem('🔄 Resend Ticket Email (by Reg ID / Email)', 'resendTicketDialog')
      .addItem('⏳ Set as Pending Verification (Selected Row)', 'markPendingVerificationSelectedRow')
      .addItem('❌ Reject Registration (Selected Row)', 'rejectSelectedRow')
    )
    .addSubMenu(ui.createMenu('🎟️ Check-In & Gate Attendance')
      .addItem('⚡ Rapid Check-In (Enter / Scan Reg ID)', 'checkinAttendeeDialog')
      .addItem('🔘 Toggle Check-In Status (Selected Row)', 'toggleCheckinSelectedRow')
      .addItem('🔄 Reset Check-In to Not Checked In (Selected Row)', 'resetCheckinSelectedRow')
    )
    .addSubMenu(ui.createMenu('🔍 Search & Attendee Details')
      .addItem('🔎 Lookup Attendee by Reg ID / Email / UTR', 'lookupRegistrationDialog')
    )
    .addSeparator()
    .addItem('📢 Broadcast Announcement / Reminder Email', 'broadcastEmailDialog')
    .addSeparator()
    .addSubMenu(ui.createMenu('⚙️ Maintenance & Tools')
      .addItem('📊 Refresh Dashboard & Stats Formulas', 'refreshDashboard')
      .addItem('🛠️ Run Full Sheet Setup (Format & Rules)', 'setupSheet')
      .addItem('🧪 Send Test Ticket Email to Me', 'testSendTicketToMyself')
    )
    .addToUi();
}

/**
 * onEdit Trigger: Auto-detects when an admin marks Payment Status as "Verified"
 */
function onEdit(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  if (sheet.getName() !== CONFIG.SHEET_NAME) return;

  var row = e.range.getRow();
  var col = e.range.getColumn();

  // Check if modified column is Payment Status (Column 14) and not the header row
  if (col === COL.STATUS && row > 1) {
    var newStatus = String(e.range.getValue()).trim();
    var ticketSent = String(sheet.getRange(row, COL.TICKET_SENT).getValue()).trim();

    if (newStatus === 'Verified' && ticketSent !== 'Yes') {
      try {
        var userEmail = Session.getActiveUser().getEmail() || 'Admin';
        sheet.getRange(row, COL.VERIFIER).setValue(userEmail);

        sendTicketEmailForRow(sheet, row);
      } catch (err) {
        console.error('Failed to send verification email for row ' + row + ': ' + err.message);
      }
    }
  }
}

/* ------------------------------ WEBHOOK ROUTES ------------------------------ */

/**
 * Handles incoming POST requests from illuminate.html
 * Supports two-stage submission:
 * 1. Step 1 Lead Capture: saves personal/academic details immediately to the sheet.
 * 2. Step 2 Payment Submission: updates UTR and timestamp for the existing attendee row.
 */
function doPost(e) {
  try {
    var data = parseRequestBody(e);
    if (!data.fullName || !data.email || !data.regId) {
      return jsonResponse({ ok: false, error: 'Missing required registration details' });
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(25000); // Wait up to 25s for concurrency lock

    try {
      var ss = targetSpreadsheet();
      var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
      if (!sheet || sheet.getLastRow() === 0) {
        setupSheet();
        sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
      }

      var existingRow = findExistingRow(sheet, data.regId, data.email);
      var rowNumber;
      var isLeadOnly = (data.action === 'lead_capture' || !data.utrNumber);

      if (existingRow > 0) {
        // Update existing registration
        rowNumber = existingRow;
        
        // Update contact details if provided
        if (data.fullName) sheet.getRange(rowNumber, COL.NAME).setValue(data.fullName);
        if (data.mobile) sheet.getRange(rowNumber, COL.MOBILE).setValue(data.mobile);
        if (data.college) sheet.getRange(rowNumber, COL.COLLEGE).setValue(data.college);
        if (data.course) sheet.getRange(rowNumber, COL.COURSE).setValue(data.course);
        if (data.year) sheet.getRange(rowNumber, COL.YEAR).setValue(data.year);
        if (data.hasIdea) sheet.getRange(rowNumber, COL.IDEA).setValue(data.hasIdea);
        if (data.attendedBefore) sheet.getRange(rowNumber, COL.ATTENDED).setValue(data.attendedBefore);
        if (data.expectations) sheet.getRange(rowNumber, COL.EXPECT).setValue(data.expectations);

        // Update UTR if submitted in Step 2
        if (data.utrNumber) {
          sheet.getRange(rowNumber, COL.UTR).setValue(data.utrNumber);
          sheet.getRange(rowNumber, COL.PAY_TS).setValue(new Date());
          sheet.getRange(rowNumber, COL.STATUS).setValue('Pending Verification');
        }
      } else {
        // New Registration row
        rowNumber = sheet.getLastRow() + 1;
        var rowValues = [
          rowNumber - 1,
          new Date(),
          data.regId,
          data.fullName,
          data.email,
          data.mobile || '',
          data.college || '',
          data.course || '',
          data.year || '',
          data.hasIdea || '',
          data.attendedBefore || '',
          data.expectations || '',
          CONFIG.FEE_AMOUNT,
          'Pending Verification',
          data.utrNumber || (isLeadOnly ? 'Pending / Step 1' : ''),
          data.utrNumber ? new Date() : '',
          'No', // Ticket Sent?
          '',   // Ticket Sent Timestamp
          '',   // Verified By
          'Not Checked In'
        ];

        sheet.getRange(rowNumber, 1, 1, rowValues.length).setValues([rowValues]);
      }

      // 1. If Step 1 Lead Capture: Send automated Draft Saved & Resume instructions email immediately!
      if (isLeadOnly) {
        try {
          sendLeadDraftEmail({
            regId: data.regId,
            fullName: data.fullName,
            email: data.email,
            mobile: data.mobile,
            college: data.college,
            course: data.course,
            year: data.year,
            fee: CONFIG.FEE_AMOUNT
          });
        } catch (draftMailErr) {
          console.log('Lead draft email error: ' + draftMailErr.message);
        }
      }

      // 2. If Step 2 Payment Submission with UTR: Send "Payment Received — Verification in Progress" acknowledgement email
      // NOTE: Official Ticket Pass with Entry QR is ONLY dispatched after manual payment verification by the organizers.
      if (!isLeadOnly && data.utrNumber) {
        try {
          sendPaymentSubmittedAckEmail({
            regId: data.regId,
            fullName: data.fullName,
            email: data.email,
            mobile: data.mobile,
            college: data.college,
            course: data.course,
            year: data.year,
            utrNumber: data.utrNumber,
            fee: CONFIG.FEE_AMOUNT
          });
        } catch (ackMailErr) {
          console.log('Payment ack email dispatch error: ' + ackMailErr.message);
        }
      }

      // Optional organizer email alert
      if (CONFIG.NOTIFY_ADMIN && !isLeadOnly) {
        try {
          MailApp.sendEmail(
            CONFIG.NOTIFY_ADMIN,
            'New illuminate 2026 Registration: ' + data.regId,
            'New registration received from ' + data.fullName + ' (' + data.email + ').\n' +
            'UTR: ' + (data.utrNumber || 'Pending') + '\n' +
            'Spreadsheet: ' + ss.getUrl()
          );
        } catch (mailErr) {
          console.log('Admin notify error: ' + mailErr.message);
        }
      }

      return jsonResponse({
        ok: true,
        lead: isLeadOnly,
        regId: data.regId,
        message: isLeadOnly ? 'Lead details captured in database & draft email sent' : 'Registration recorded successfully in database'
      });

    } finally {
      lock.releaseLock();
    }

  } catch (err) {
    return jsonResponse({ ok: false, error: err.message || String(err) });
  }
}

/**
 * Handles GET requests:
 * 1. Verification & Resume API: ?action=verify / ?action=get_registration / ?action=resume
 * 2. Two-Stage Fallback Submission: ?action=lead_capture / ?action=payment_submit
 * 3. Web Admin Management Console: ?admin=true / ?panel=true
 */
function doGet(e) {
  var p = (e && e.parameter) || {};
  var verifyId = (p.id || p.verify || p.resume || p.query || p.regId || p.email || '').trim().toUpperCase();

  // 1. Fallback submission via GET
  if (p.action === 'lead_capture' || p.action === 'payment_submit' || p.action === 'register') {
    var payload = {};
    if (p.data) {
      try { payload = JSON.parse(p.data); } catch (err) { payload = p; }
    } else {
      payload = p;
    }
    return doPost({ postData: { contents: JSON.stringify(payload) } });
  }

  // 2. Verification & Resume Lookup
  if (verifyId || p.action === 'get_registration' || p.action === 'resume') {
    var record = findRegistrationById(verifyId);
    var isApi = (p.format === 'json' || p.action === 'verify' || p.action === 'get_registration' || p.action === 'resume' || p.api === 'true');

    if (isApi) {
      if (record) {
        return jsonResponse({
          ok: true,
          found: true,
          attendee: record
        });
      } else {
        return jsonResponse({
          ok: true,
          found: false,
          message: 'Registration ID or Email (' + (verifyId || 'empty') + ') was not found in the official database.'
        });
      }
    }

    // Direct Browser HTML view
    return HtmlService.createHtmlOutput(buildStandaloneVerificationHtml(record, verifyId))
      .setTitle('Verification: ' + verifyId + ' — illuminate 2026')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (p.diag) {
    var ss = targetSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    var rows = sheet ? Math.max(sheet.getLastRow() - 1, 0) : 0;
    return jsonResponse({
      ok: true,
      service: 'illuminate 2026 Registration API',
      spreadsheetName: ss.getName(),
      totalRegistrations: rows,
      spreadsheetUrl: ss.getUrl()
    });
  }

  // 3. Web Admin Management Console (?admin=true or ?panel=true)
  if (p.admin || p.panel) {
    return HtmlService.createHtmlOutput(buildAdminWebHtml())
      .setTitle('⚡ illuminate 2026 — Admin Management Hub')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // 4. Admin API actions via GET
  if (p.api_action) {
    return handleAdminApiGet(p);
  }

  return jsonResponse({
    ok: true,
    service: 'illuminate 2026 API',
    endpoints: [
      'POST /exec with JSON body { action: "lead_capture" | "payment_submit", regId, fullName, email, ... }',
      'GET /exec?action=verify&id=ILL-XXXXXX',
      'GET /exec?action=get_registration&id=ILL-XXXXXX',
      'GET /exec?admin=true'
    ]
  });
}

/**
 * Searches the 'illuminate Registrations' sheet for a specific Registration ID, Email, or Mobile Number
 */
function findRegistrationById(query) {
  if (!query) return null;
  var q = String(query).trim().toUpperCase();
  var ss = targetSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) return null;

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null;

  var data = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  for (var i = 0; i < data.length; i++) {
    var rowRegId = String(data[i][COL.REG_ID - 1] || '').trim().toUpperCase();
    var rowEmail = String(data[i][COL.EMAIL - 1] || '').trim().toUpperCase();
    var rowMobile = String(data[i][COL.MOBILE - 1] || '').replace(/\D/g, '');

    if (rowRegId === q || rowEmail === q || (q.length >= 10 && rowMobile === q)) {
      return {
        rowNumber: i + 2,
        timestamp: data[i][COL.TS - 1],
        regId: data[i][COL.REG_ID - 1],
        fullName: data[i][COL.NAME - 1],
        email: data[i][COL.EMAIL - 1],
        mobile: data[i][COL.MOBILE - 1],
        college: data[i][COL.COLLEGE - 1],
        course: data[i][COL.COURSE - 1],
        year: data[i][COL.YEAR - 1],
        idea: data[i][COL.IDEA - 1],
        fee: data[i][COL.FEE - 1] || CONFIG.FEE_AMOUNT,
        status: data[i][COL.STATUS - 1] || 'Pending Verification',
        utrNumber: data[i][COL.UTR - 1] || '',
        ticketSent: data[i][COL.TICKET_SENT - 1] || 'No',
        verifier: data[i][COL.VERIFIER - 1] || '',
        checkinStatus: data[i][COL.CHECKIN - 1] || 'Not Checked In'
      };
    }
  }
  return null;
}

/**
 * Builds standalone mobile-friendly verification HTML screen when Apps Script URL is opened directly
 */
function buildStandaloneVerificationHtml(record, queryId) {
  if (!record) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Record Not Found — illuminate 2026</title>
  <style>
    body { margin:0; padding:24px 16px; background:#f8fafc; font-family:-apple-system,BlinkMacSystemFont,sans-serif; color:#0f172a; display:flex; justify-content:center; align-items:center; min-height:100vh; }
    .card { background:#fff; border:1px solid #e2e8f0; border-radius:18px; max-width:440px; width:100%; padding:32px 24px; text-align:center; box-shadow:0 10px 30px rgba(15,23,42,0.06); }
    .tag { display:inline-block; background:#fee2e2; border:1px solid #fca5a5; color:#dc2626; font-size:11px; font-weight:800; padding:4px 12px; border-radius:999px; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:14px; }
    h1 { font-size:20px; font-weight:900; margin:0 0 10px; }
    p { font-size:13.5px; color:#64748b; line-height:1.55; margin:0 0 24px; }
    .btn { display:inline-block; background:#0f172a; color:#fff; text-decoration:none; font-size:13px; font-weight:700; padding:12px 24px; border-radius:999px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="tag">Record Not Found</span>
    <h1>Invalid Registration ID</h1>
    <p>Registration ID <strong>${escapeHtml(queryId)}</strong> was not found in the official illuminate 2026 registry. Please verify the ID or register on our official portal.</p>
    <a href="https://iiec.in/illuminate" class="btn">Go to illuminate Portal</a>
  </div>
</body>
</html>`;
  }

  var isVerified = (record.status === 'Verified');
  var statusBg = isVerified ? '#ecfdf5' : '#fffbeb';
  var statusBorder = isVerified ? '#a7f3d0' : '#fde68a';
  var statusColor = isVerified ? '#047857' : '#b45309';
  var statusText = isVerified ? 'Official Registration Verified' : 'Payment Under Verification';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification: ${escapeHtml(record.regId)} — illuminate 2026</title>
  <style>
    * { box-sizing:border-box; }
    body { margin:0; padding:28px 16px; background:#f8fafc; font-family:-apple-system,BlinkMacSystemFont,sans-serif; color:#0f172a; display:flex; justify-content:center; align-items:center; min-height:100vh; }
    .card { background:#fff; border:1px solid #e2e8f0; border-radius:20px; max-width:460px; width:100%; padding:32px 26px; box-shadow:0 16px 40px rgba(15,23,42,0.08); text-align:center; }
    .top-pill { font-size:10.5px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; color:#4f46e5; margin-bottom:8px; }
    .brand { font-size:22px; font-weight:900; letter-spacing:-0.5px; margin-bottom:18px; }
    .brand span { color:#ff5a1f; }
    .status-badge { display:inline-block; background:${statusBg}; border:1px solid ${statusBorder}; color:${statusColor}; font-size:12px; font-weight:800; padding:6px 16px; border-radius:999px; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:20px; }
    .name { font-size:22px; font-weight:900; color:#0f172a; margin:0 0 4px; }
    .college { font-size:13.5px; font-weight:600; color:#64748b; margin:0 0 20px; }
    .grid { background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:16px; text-align:left; display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:22px; font-size:12.5px; }
    .cell-label { font-size:10px; font-weight:700; text-transform:uppercase; color:#64748b; letter-spacing:0.5px; margin-bottom:2px; }
    .cell-val { font-size:13px; font-weight:800; color:#0f172a; word-break:break-word; }
    .cell-accent { color:#4f46e5; }
    .cell-green { color:#047857; }
    .meta-box { font-size:11.5px; color:#64748b; line-height:1.55; margin-bottom:24px; padding-top:14px; border-top:1px dashed #e2e8f0; }
    .btn-row { display:flex; gap:10px; justify-content:center; }
    .btn { display:inline-block; background:#0f172a; color:#fff; text-decoration:none; font-size:12.5px; font-weight:700; padding:11px 22px; border-radius:999px; }
    .btn:hover { background:#ff5a1f; }
  </style>
</head>
<body>
  <div class="card">
    <div class="top-pill">E-CELL IIT BOMBAY × IIEC CSMU</div>
    <div class="brand">illuminate <span>2026</span></div>

    <div class="status-badge">${statusText}</div>

    <div class="name">${escapeHtml(record.fullName)}</div>
    <div class="college">${escapeHtml(record.college)} • ${escapeHtml(record.course)} (${escapeHtml(record.year)})</div>

    <div class="grid">
      <div>
        <div class="cell-label">Registration ID</div>
        <div class="cell-val cell-accent">${escapeHtml(record.regId)}</div>
      </div>
      <div>
        <div class="cell-label">Workshop Fee</div>
        <div class="cell-val cell-green">&#8377;${escapeHtml(record.fee)} (Paid)</div>
      </div>
      <div>
        <div class="cell-label">UTR Reference</div>
        <div class="cell-val">${escapeHtml(record.utrNumber || 'N/A')}</div>
      </div>
      <div>
        <div class="cell-label">Entry Status</div>
        <div class="cell-val">${escapeHtml(record.checkinStatus || 'Not Checked In')}</div>
      </div>
    </div>

    <div class="meta-box">
      <strong>Certified by:</strong> E-Cell, IIT Bombay<br>
      <strong>Venue:</strong> Chhatrapati Shivaji Maharaj University (CSMU), Panvel<br>
      <strong>Organizer:</strong> IIEC CSMU
    </div>

    <div class="btn-row">
      <a href="https://iiec.in/illuminate" class="btn">View Workshop Details</a>
    </div>
  </div>
</body>
</html>`;
}

/* ------------------------------ EMAIL AUTOMATION ------------------------------ */

/**
 * Sends automated Lead / Draft Saved email with Registration ID and resume link
 */
function sendLeadDraftEmail(attendee) {
  if (!attendee.email || attendee.email.indexOf('@') === -1) {
    throw new Error('Attendee has no valid email: ' + attendee.email);
  }

  var htmlBody = buildLeadDraftEmailHtml(attendee);
  var subject = '[Saved Draft] Complete Your Registration for illuminate 2026 [' + attendee.regId + ']';

  MailApp.sendEmail({
    to: attendee.email,
    subject: subject,
    htmlBody: htmlBody,
    name: 'illuminate 2026 — IIEC CSMU',
    replyTo: CONFIG.REPLY_TO_EMAIL
  });
}

/**
 * Builds an ultra-premium Light Luxury email for Step 1 Draft / Resume instructions.
 * Mobile-first responsive layout matching E-Cell IIT Bombay × IIEC CSMU branding.
 */
function buildLeadDraftEmailHtml(attendee) {
  var resumeUrl = 'https://iiec.in/illuminate?resume=' + encodeURIComponent(attendee.regId);

  return `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <title>Complete Your illuminate 2026 Registration — ${escapeHtml(attendee.regId)}</title>
  <style>
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; margin: 0; padding: 0; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
    body { width: 100% !important; min-width: 100%; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    
    @media only screen and (max-width: 580px) {
      .email-outer-td { padding: 12px 8px !important; }
      .main-table { width: 100% !important; border-radius: 14px !important; }
      .header-cell { padding: 24px 16px 18px !important; }
      .brand-title { font-size: 24px !important; }
      .content-cell { padding: 18px 14px !important; }
      .draft-box-inner { padding: 18px 14px !important; }
      .col-cell { display: block !important; width: 100% !important; box-sizing: border-box !important; padding: 0 0 10px 0 !important; }
      .col-cell:last-child { padding-bottom: 0 !important; }
      .btn-action { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;-webkit-font-smoothing:antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" class="email-outer-td" style="padding:32px 14px;">
        <!-- Main Email Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="main-table" style="max-width:580px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;box-shadow:0 12px 36px rgba(15,23,42,0.07);">
          
          <!-- Top Multi-Gradient Bar -->
          <tr>
            <td style="height:6px;background:linear-gradient(90deg, #ff5a1f 0%, #6366f1 50%, #f59e0b 100%);"></td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td class="header-cell" style="padding:28px 28px 20px;text-align:center;background:#ffffff;border-bottom:1px solid #f1f5f9;">
              <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 10px;">
                <tr>
                  <td style="background:#eef2ff;border:1px solid #c7d2fe;padding:5px 16px;border-radius:999px;font-size:10.5px;font-weight:800;color:#4338ca;letter-spacing:1.5px;text-transform:uppercase;">
                    E-CELL IIT BOMBAY &times; IIEC CSMU
                  </td>
                </tr>
              </table>

              <h1 class="brand-title" style="font-size:28px;font-weight:900;color:#0f172a;letter-spacing:-0.03em;line-height:1.15;margin:0 0 4px;">
                illuminate <span style="color:#ff5a1f;">2026</span>
              </h1>
              
              <div style="font-size:13px;font-weight:600;color:#64748b;line-height:1.4;">
                Entrepreneurship Workshop &bull; Chhatrapati Shivaji Maharaj University
              </div>
            </td>
          </tr>

          <!-- Draft Saved Callout -->
          <tr>
            <td class="content-cell" style="padding:24px 28px 16px;text-align:center;">
              <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 12px;">
                <tr>
                  <td style="background:#fef3c7;border:1px solid #fde68a;padding:5px 16px;border-radius:999px;color:#b45309;font-size:11px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;">
                    &#9888; ACTION REQUIRED &bull; REGISTRATION DRAFT SAVED
                  </td>
                </tr>
              </table>
              <h2 style="color:#0f172a;font-size:22px;font-weight:800;margin:0 0 6px;line-height:1.3;letter-spacing:-0.02em;">
                Hi, ${escapeHtml(attendee.fullName)}!
              </h2>
              <p style="color:#475569;font-size:13.5px;line-height:1.6;margin:0 auto;max-width:490px;">
                We have saved your registration details for <strong>illuminate 2026</strong>. Please finish your payment of <strong>₹749</strong> to confirm your seat and receive your official digital entry pass.
              </p>
            </td>
          </tr>

          <!-- REGISTRATION DRAFT DETAILS CARD -->
          <tr>
            <td style="padding:0 24px 22px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" class="draft-box-inner" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:20px 18px;">
                <tr>
                  <td>

                    <!-- Reg ID Highlight Box -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff;border:1.5px dashed #6366f1;border-radius:12px;margin-bottom:16px;text-align:center;">
                      <tr>
                        <td style="padding:14px 16px;">
                          <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">
                            YOUR OFFICIAL REGISTRATION ID
                          </div>
                          <div style="font-size:24px;font-weight:900;color:#4338ca;letter-spacing:1px;font-family:monospace;">
                            ${escapeHtml(attendee.regId)}
                          </div>
                          <div style="font-size:11.5px;color:#64748b;margin-top:4px;">
                            (Save this ID to resume your registration anytime on <a href="https://iiec.in/illuminate" style="color:#4f46e5;font-weight:700;text-decoration:none;">iiec.in/illuminate</a>)
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Attendee Details Summary -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:16px;font-size:12.5px;color:#334155;line-height:1.6;">
                      <tr>
                        <td style="padding:4px 0;width:110px;color:#64748b;font-weight:700;">Attendee:</td>
                        <td style="padding:4px 0;font-weight:800;color:#0f172a;">${escapeHtml(attendee.fullName)}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#64748b;font-weight:700;">College / Course:</td>
                        <td style="padding:4px 0;font-weight:600;color:#0f172a;">${escapeHtml(attendee.college)}${attendee.course ? ' &bull; ' + escapeHtml(attendee.course) : ''}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#64748b;font-weight:700;">Workshop Fee:</td>
                        <td style="padding:4px 0;font-weight:800;color:#059669;">&#8377;${attendee.fee} (Special NEC Subsidized Fee)</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#64748b;font-weight:700;">Status:</td>
                        <td style="padding:4px 0;font-weight:700;color:#b45309;">Draft Saved &bull; Payment Pending</td>
                      </tr>
                    </table>

                    <!-- 1-CLICK RESUME CTA BUTTON -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="text-align:center;margin:8px 0 16px;">
                      <tr>
                        <td align="center">
                          <a href="${resumeUrl}" target="_blank" class="btn-action" style="display:inline-block;background:linear-gradient(135deg, #ff5a1f 0%, #e04b15 100%);color:#ffffff;text-decoration:none;font-size:13.5px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;padding:14px 32px;border-radius:999px;box-shadow:0 6px 18px rgba(255,90,31,0.35);">
                            Complete Registration &amp; Pay &#8377;749 &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>

                    <div style="font-size:11.5px;color:#64748b;text-align:center;line-height:1.5;margin-bottom:14px;">
                      Direct Link: <a href="${resumeUrl}" style="color:#4f46e5;word-break:break-all;">${resumeUrl}</a>
                    </div>

                    <!-- Payment Steps Box -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;">
                      <tr>
                        <td>
                          <div style="font-size:11px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">
                            Quick 3-Step Payment Instructions:
                          </div>
                          <ol style="margin:0;padding-left:18px;font-size:12px;color:#475569;line-height:1.6;">
                            <li>Click the <strong>Complete Registration</strong> button above.</li>
                            <li>Pay <strong>₹749</strong> via UPI (GPay / PhonePe / Paytm / BHIM) to:
                              <br><strong style="color:#0f172a;">Bhumika Chavan</strong> &bull; UPI ID: <code style="color:#4338ca;font-weight:700;">chavanbhumika1007@oksbi</code>
                            </li>
                            <li>Enter your <strong>12-digit UTR / Reference Number</strong> on the payment screen to get your confirmed pass.</li>
                          </ol>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- EVENT DETAILS & HIGHLIGHTS -->
          <tr>
            <td style="padding:0 24px 18px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" class="venue-box" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:16px 18px;">
                <tr>
                  <td>
                    <div style="font-size:11.5px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">
                      Workshop Highlights
                    </div>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size:12.5px;color:#334155;line-height:1.65;">
                      <tr>
                        <td style="padding:4px 0;width:95px;color:#64748b;font-weight:700;vertical-align:top;">Venue:</td>
                        <td style="padding:4px 0;font-weight:600;color:#0f172a;">Chhatrapati Shivaji Maharaj University (CSMU), Panvel</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#64748b;font-weight:700;vertical-align:top;">Certification:</td>
                        <td style="padding:4px 0;font-weight:700;color:#4f46e5;">Official Participation Certificate by E-Cell, IIT Bombay</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#64748b;font-weight:700;vertical-align:top;">Inclusions:</td>
                        <td style="padding:4px 0;font-weight:600;color:#0f172a;">Physical Startup Kit &bull; BMC Canvas &bull; Networking</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:22px 24px;background:#0f172a;color:#ffffff;text-align:center;">
              <div style="font-size:12.5px;font-weight:800;color:#ffffff;margin-bottom:4px;letter-spacing:0.02em;">
                Incubation, Innovation &amp; Entrepreneurship Cell (IIEC)
              </div>
              <div style="font-size:11.5px;color:#94a3b8;line-height:1.65;">
                Chhatrapati Shivaji Maharaj University (CSMU), Panvel, Navi Mumbai<br>
                Coordination Desk &bull; Helpline: <strong>+91 94666 05579</strong><br>
                Official Portal: <a href="https://iiec.in/illuminate" style="color:#a5b4fc;text-decoration:none;font-weight:700;">iiec.in/illuminate</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Sends automated Payment Submitted & Under Review acknowledgement email
 */
function sendPaymentSubmittedAckEmail(attendee) {
  if (!attendee.email || attendee.email.indexOf('@') === -1) {
    throw new Error('Attendee has no valid email: ' + attendee.email);
  }

  var htmlBody = buildPaymentSubmittedAckEmailHtml(attendee);
  var subject = 'Payment Received: Verification in Progress [' + attendee.regId + '] — illuminate 2026';

  MailApp.sendEmail({
    to: attendee.email,
    subject: subject,
    htmlBody: htmlBody,
    name: 'illuminate 2026 — IIEC CSMU',
    replyTo: CONFIG.REPLY_TO_EMAIL
  });
}

/**
 * Builds an ultra-premium Light Luxury email acknowledging UTR submission.
 * Informs student that payment is under manual verification before official ticket pass is issued.
 */
function buildPaymentSubmittedAckEmailHtml(attendee) {
  var verifyUrl = 'https://iiec.in/illuminate?verify=' + encodeURIComponent(attendee.regId);

  return `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <title>Payment Under Verification — ${escapeHtml(attendee.regId)}</title>
  <style>
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; margin: 0; padding: 0; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
    body { width: 100% !important; min-width: 100%; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    
    @media only screen and (max-width: 580px) {
      .email-outer-td { padding: 12px 8px !important; }
      .main-table { width: 100% !important; border-radius: 14px !important; }
      .header-cell { padding: 24px 16px 18px !important; }
      .brand-title { font-size: 24px !important; }
      .content-cell { padding: 18px 14px !important; }
      .ack-box-inner { padding: 18px 14px !important; }
      .col-cell { display: block !important; width: 100% !important; box-sizing: border-box !important; padding: 0 0 10px 0 !important; }
      .col-cell:last-child { padding-bottom: 0 !important; }
      .btn-action { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;-webkit-font-smoothing:antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" class="email-outer-td" style="padding:32px 14px;">
        <!-- Main Email Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="main-table" style="max-width:580px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;box-shadow:0 12px 36px rgba(15,23,42,0.07);">
          
          <!-- Top Multi-Gradient Bar -->
          <tr>
            <td style="height:6px;background:linear-gradient(90deg, #ff5a1f 0%, #6366f1 50%, #f59e0b 100%);"></td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td class="header-cell" style="padding:28px 28px 20px;text-align:center;background:#ffffff;border-bottom:1px solid #f1f5f9;">
              <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 10px;">
                <tr>
                  <td style="background:#eef2ff;border:1px solid #c7d2fe;padding:5px 16px;border-radius:999px;font-size:10.5px;font-weight:800;color:#4338ca;letter-spacing:1.5px;text-transform:uppercase;">
                    E-CELL IIT BOMBAY &times; IIEC CSMU
                  </td>
                </tr>
              </table>

              <h1 class="brand-title" style="font-size:28px;font-weight:900;color:#0f172a;letter-spacing:-0.03em;line-height:1.15;margin:0 0 4px;">
                illuminate <span style="color:#ff5a1f;">2026</span>
              </h1>
              
              <div style="font-size:13px;font-weight:600;color:#64748b;line-height:1.4;">
                Entrepreneurship Workshop &bull; Chhatrapati Shivaji Maharaj University
              </div>
            </td>
          </tr>

          <!-- Payment Ack Hero Callout -->
          <tr>
            <td class="content-cell" style="padding:24px 28px 16px;text-align:center;">
              <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 12px;">
                <tr>
                  <td style="background:#fef3c7;border:1px solid #fde68a;padding:5px 16px;border-radius:999px;color:#b45309;font-size:11px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;">
                    &#9203; PAYMENT RECEIVED &bull; VERIFICATION IN PROGRESS
                  </td>
                </tr>
              </table>
              <h2 style="color:#0f172a;font-size:22px;font-weight:800;margin:0 0 6px;line-height:1.3;letter-spacing:-0.02em;">
                Thank You, ${escapeHtml(attendee.fullName)}!
              </h2>
              <p style="color:#475569;font-size:13.5px;line-height:1.6;margin:0 auto;max-width:490px;">
                We have received your payment reference for <strong>illuminate 2026</strong>. Our organizing team is currently verifying the transaction with our bank.
              </p>
            </td>
          </tr>

          <!-- SUBMISSION SUMMARY CARD -->
          <tr>
            <td style="padding:0 24px 22px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" class="ack-box-inner" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:20px 18px;">
                <tr>
                  <td>

                    <!-- Reg ID Box -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:16px;text-align:center;">
                      <tr>
                        <td style="padding:14px 16px;">
                          <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">
                            REGISTRATION ID
                          </div>
                          <div style="font-size:22px;font-weight:900;color:#4338ca;letter-spacing:1px;font-family:monospace;">
                            ${escapeHtml(attendee.regId)}
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Details Table -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:16px;font-size:12.5px;color:#334155;line-height:1.6;">
                      <tr>
                        <td style="padding:4px 0;width:120px;color:#64748b;font-weight:700;">Attendee:</td>
                        <td style="padding:4px 0;font-weight:800;color:#0f172a;">${escapeHtml(attendee.fullName)}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#64748b;font-weight:700;">College:</td>
                        <td style="padding:4px 0;font-weight:600;color:#0f172a;">${escapeHtml(attendee.college)}${attendee.course ? ' &bull; ' + escapeHtml(attendee.course) : ''}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#64748b;font-weight:700;">Submitted UTR:</td>
                        <td style="padding:4px 0;font-weight:800;color:#0f172a;font-family:monospace;">${escapeHtml(attendee.utrNumber || 'N/A')}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#64748b;font-weight:700;">Workshop Fee:</td>
                        <td style="padding:4px 0;font-weight:800;color:#059669;">&#8377;${attendee.fee}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#64748b;font-weight:700;">Status:</td>
                        <td style="padding:4px 0;font-weight:800;color:#b45309;">Payment Under Manual Verification</td>
                      </tr>
                    </table>

                    <!-- What happens next box -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;">
                      <tr>
                        <td>
                          <div style="font-size:11px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">
                            What Happens Next?
                          </div>
                          <ol style="margin:0;padding-left:18px;font-size:12px;color:#475569;line-height:1.6;">
                            <li>Our team verifies your 12-digit UTR against the bank statement.</li>
                            <li>Once verified, your <strong>Official E-Cell IIT Bombay Delegate Pass &amp; Check-In QR Code</strong> will be sent to your email.</li>
                            <li>You can also track your live verification status anytime on our website.</li>
                          </ol>
                        </td>
                      </tr>
                    </table>

                    <div style="text-align:center;margin-top:16px;">
                      <a href="${verifyUrl}" target="_blank" class="btn-action" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;padding:11px 24px;border-radius:999px;">
                        Check Live Verification Status &rarr;
                      </a>
                    </div>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:22px 24px;background:#0f172a;color:#ffffff;text-align:center;">
              <div style="font-size:12.5px;font-weight:800;color:#ffffff;margin-bottom:4px;letter-spacing:0.02em;">
                Incubation, Innovation &amp; Entrepreneurship Cell (IIEC)
              </div>
              <div style="font-size:11.5px;color:#94a3b8;line-height:1.65;">
                Chhatrapati Shivaji Maharaj University (CSMU), Panvel, Navi Mumbai<br>
                Coordination Desk &bull; Helpline: <strong>+91 94666 05579</strong><br>
                Official Portal: <a href="https://iiec.in/illuminate" style="color:#a5b4fc;text-decoration:none;font-weight:700;">iiec.in/illuminate</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Sends the ticket confirmation email for a given sheet row
 */
function sendTicketEmailForRow(sheet, row) {
  var rowData = sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0];

  var attendee = {
    regId:        String(rowData[COL.REG_ID - 1]),
    fullName:     String(rowData[COL.NAME - 1]),
    email:        String(rowData[COL.EMAIL - 1]).trim(),
    mobile:       String(rowData[COL.MOBILE - 1]),
    college:      String(rowData[COL.COLLEGE - 1]),
    course:       String(rowData[COL.COURSE - 1]),
    year:         String(rowData[COL.YEAR - 1]),
    utrNumber:    String(rowData[COL.UTR - 1]),
    fee:          rowData[COL.FEE - 1] || CONFIG.FEE_AMOUNT
  };

  if (!attendee.email || attendee.email.indexOf('@') === -1) {
    throw new Error('Row ' + row + ' has no valid email: ' + attendee.email);
  }

  // Generate dynamic entry check-in QR code pointing directly to illuminate verification
  var qrData = 'https://iiec.in/illuminate?verify=' + encodeURIComponent(attendee.regId);
  var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=' + encodeURIComponent(qrData);

  // Render responsive HTML email template
  var htmlBody = buildTicketEmailHtml(attendee, qrUrl);
  var subject = 'Confirmed: Your illuminate 2026 Pass [' + attendee.regId + '] — E-Cell IIT Bombay × IIEC CSMU';

  MailApp.sendEmail({
    to: attendee.email,
    subject: subject,
    htmlBody: htmlBody,
    name: 'illuminate 2026 — IIEC CSMU',
    replyTo: CONFIG.REPLY_TO_EMAIL
  });

  // Mark ticket as sent
  sheet.getRange(row, COL.TICKET_SENT).setValue('Yes');
  sheet.getRange(row, COL.TICKET_TS).setValue(new Date());
}

/**
 * Builds an ultra-premium, mobile-first responsive HTML email ticket pass.
 * Optimized for Gmail, Apple Mail, Outlook, iOS Mail, and Android.
 * LIGHT THEME LUXURY DESIGN.
 */
function buildTicketEmailHtml(attendee, qrUrl) {
  var verifyUrl = 'https://iiec.in/illuminate?verify=' + encodeURIComponent(attendee.regId);

  return `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <title>illuminate 2026 Official Delegate Pass — ${escapeHtml(attendee.regId)}</title>
  <style>
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; margin: 0; padding: 0; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
    body { width: 100% !important; min-width: 100%; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    
    @media only screen and (max-width: 580px) {
      .email-outer-td { padding: 12px 8px !important; }
      .main-table { width: 100% !important; border-radius: 14px !important; }
      .header-cell { padding: 24px 16px 18px !important; }
      .brand-title { font-size: 24px !important; }
      .content-cell { padding: 18px 14px !important; }
      .pass-wrap { padding: 0 10px 18px !important; }
      .pass-card-inner { padding: 18px 14px !important; border-radius: 14px !important; }
      .col-cell { display: block !important; width: 100% !important; box-sizing: border-box !important; padding: 0 0 10px 0 !important; }
      .col-cell:last-child { padding-bottom: 0 !important; }
      .venue-box { padding: 14px 12px !important; }
      .btn-action { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;-webkit-font-smoothing:antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" class="email-outer-td" style="padding:32px 14px;">
        <!-- Main Email Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="main-table" style="max-width:580px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;box-shadow:0 12px 36px rgba(15,23,42,0.07);">
          
          <!-- Top Multi-Gradient Bar -->
          <tr>
            <td style="height:6px;background:linear-gradient(90deg, #ff5a1f 0%, #6366f1 50%, #f59e0b 100%);"></td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td class="header-cell" style="padding:28px 28px 20px;text-align:center;background:#ffffff;border-bottom:1px solid #f1f5f9;">
              <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 10px;">
                <tr>
                  <td style="background:#eef2ff;border:1px solid #c7d2fe;padding:5px 16px;border-radius:999px;font-size:10.5px;font-weight:800;color:#4338ca;letter-spacing:1.5px;text-transform:uppercase;">
                    E-CELL IIT BOMBAY &times; IIEC CSMU
                  </td>
                </tr>
              </table>

              <h1 class="brand-title" style="font-size:28px;font-weight:900;color:#0f172a;letter-spacing:-0.03em;line-height:1.15;margin:0 0 4px;">
                illuminate <span style="color:#ff5a1f;">2026</span>
              </h1>
              
              <div style="font-size:13px;font-weight:600;color:#64748b;line-height:1.4;">
                Entrepreneurship Workshop &bull; Chhatrapati Shivaji Maharaj University
              </div>
            </td>
          </tr>

          <!-- Confirmation Hero Callout -->
          <tr>
            <td class="content-cell" style="padding:22px 28px 16px;text-align:center;">
              <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 10px;">
                <tr>
                  <td style="background:#ecfdf5;border:1px solid #a7f3d0;padding:5px 16px;border-radius:999px;color:#047857;font-size:11.5px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;">
                    &#10003; Payment Verified &bull; Official Pass Issued
                  </td>
                </tr>
              </table>
              <h2 style="color:#0f172a;font-size:22px;font-weight:800;margin:0 0 6px;line-height:1.3;letter-spacing:-0.02em;">
                Welcome, ${escapeHtml(attendee.fullName)}!
              </h2>
              <p style="color:#475569;font-size:13.5px;line-height:1.6;margin:0 auto;max-width:480px;">
                Your seat for <strong>illuminate 2026</strong> has been confirmed. Below is your official delegate credential and gate entry QR code.
              </p>
            </td>
          </tr>

          <!-- LIGHT THEME EXECUTIVE DELEGATE PASS BADGE -->
          <tr>
            <td class="pass-wrap" style="padding:0 24px 22px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" class="pass-card-inner" style="background:#ffffff;color:#0f172a;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 12px 30px rgba(15,23,42,0.08);">
                <tr>
                  <td style="padding:20px 18px 20px;">

                    <!-- Pass Top Bar -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;border-bottom:1px solid #f1f5f9;padding-bottom:8px;">
                      <tr>
                        <td align="left" style="font-size:10px;font-weight:800;color:#64748b;letter-spacing:1px;text-transform:uppercase;">
                          OFFICIAL DELEGATE PASS
                        </td>
                        <td align="right" style="font-size:10px;font-weight:700;color:#4f46e5;letter-spacing:0.5px;">
                          CSMU PANVEL EDITION
                        </td>
                      </tr>
                    </table>

                    <!-- Attendee Spotlight Block -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:12px;">
                      <tr>
                        <td style="padding:14px 16px;">
                          <div style="font-size:10px;font-weight:800;color:#4f46e5;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">
                            DELEGATE ATTENDEE
                          </div>
                          <div style="font-size:21px;font-weight:900;color:#0f172a;line-height:1.2;margin-bottom:3px;letter-spacing:-0.02em;">
                            ${escapeHtml(attendee.fullName)}
                          </div>
                          <div style="font-size:13px;font-weight:500;color:#475569;line-height:1.4;">
                            ${escapeHtml(attendee.college)}${attendee.course ? ' &bull; ' + escapeHtml(attendee.course) : ''}${attendee.year ? ' (' + escapeHtml(attendee.year) + ')' : ''}
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- 2x2 Clean Credential Tiles -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;">
                      <tr>
                        <!-- Tile 1: Reg ID -->
                        <td width="50%" class="col-cell" valign="top" style="padding:0 5px 10px 0;">
                          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;">
                            <div style="font-size:9.5px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;">REGISTRATION ID</div>
                            <div style="font-size:14px;font-weight:800;color:#4f46e5;font-family:monospace;margin-top:2px;">${escapeHtml(attendee.regId)}</div>
                          </div>
                        </td>
                        <!-- Tile 2: Fee Status -->
                        <td width="50%" class="col-cell" valign="top" style="padding:0 0 10px 5px;">
                          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;">
                            <div style="font-size:9.5px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;">WORKSHOP FEE</div>
                            <div style="font-size:14px;font-weight:800;color:#059669;margin-top:2px;">&#8377;${attendee.fee} (Paid)</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <!-- Tile 3: UTR -->
                        <td width="50%" class="col-cell" valign="top" style="padding:0 5px 0 0;">
                          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;">
                            <div style="font-size:9.5px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;">UTR REFERENCE</div>
                            <div style="font-size:12.5px;font-weight:700;color:#0f172a;font-family:monospace;margin-top:2px;word-break:break-all;">${escapeHtml(attendee.utrNumber || 'Verified')}</div>
                          </div>
                        </td>
                        <!-- Tile 4: Certification -->
                        <td width="50%" class="col-cell" valign="top" style="padding:0 0 0 5px;">
                          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;">
                            <div style="font-size:9.5px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;">CERTIFIED BY</div>
                            <div style="font-size:12.5px;font-weight:800;color:#b45309;margin-top:2px;">E-Cell, IIT Bombay</div>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Perforated Tear Divider -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:10px 0 14px;">
                      <tr>
                        <td align="center" style="border-top:1.5px dashed #cbd5e1;height:0;"></td>
                      </tr>
                    </table>

                    <!-- PROMINENT CENTERED GATE QR BOX -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px 14px;text-align:center;">
                      <tr>
                        <td align="center">
                          <div style="background:#ffffff;padding:10px;border-radius:12px;display:inline-block;border:1px solid #e2e8f0;box-shadow:0 4px 14px rgba(15,23,42,0.08);">
                            <img src="${qrUrl}" alt="Gate Entry Security QR" width="130" height="130" style="width:130px;height:130px;border:0;display:block;">
                          </div>
                          
                          <div style="font-size:11px;font-weight:800;color:#ff5a1f;letter-spacing:1px;text-transform:uppercase;margin-top:12px;">
                            GATE ENTRY CHECK-IN QR
                          </div>
                          <div style="font-size:12px;color:#64748b;margin-top:3px;max-width:360px;line-height:1.45;">
                            Show this QR code at the CSMU auditorium desk for instant gate entry and kit collection.
                          </div>

                          <div style="margin-top:14px;">
                            <a href="${verifyUrl}" target="_blank" class="btn-action" style="display:inline-block;background:linear-gradient(135deg, #ff5a1f 0%, #e04b15 100%);color:#ffffff;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;padding:11px 24px;border-radius:999px;box-shadow:0 4px 12px rgba(255,90,31,0.35);">
                              View Live Digital Pass &rarr;
                            </a>
                          </div>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- EVENT DETAILS & HIGHLIGHTS -->
          <tr>
            <td style="padding:0 24px 18px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" class="venue-box" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:16px 18px;">
                <tr>
                  <td>
                    <div style="font-size:11.5px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">
                      Workshop Logistics &amp; Details
                    </div>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size:12.5px;color:#334155;line-height:1.65;">
                      <tr>
                        <td style="padding:4px 0;width:95px;color:#64748b;font-weight:700;vertical-align:top;">Venue:</td>
                        <td style="padding:4px 0;font-weight:600;color:#0f172a;">Chhatrapati Shivaji Maharaj University (CSMU), Panvel</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#64748b;font-weight:700;vertical-align:top;">Format:</td>
                        <td style="padding:4px 0;font-weight:600;color:#0f172a;">1-Day Hands-on Entrepreneurship Training</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#64748b;font-weight:700;vertical-align:top;">Certificate:</td>
                        <td style="padding:4px 0;font-weight:700;color:#4f46e5;">Official Participation Certificate by E-Cell, IIT Bombay</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#64748b;font-weight:700;vertical-align:top;">Takeaways:</td>
                        <td style="padding:4px 0;font-weight:600;color:#0f172a;">Physical Startup Kit &bull; Business Canvas &bull; Networking</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ATTENDEE GUIDELINES -->
          <tr>
            <td style="padding:0 24px 20px;">
              <div style="font-size:11.5px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">
                Important Guidelines for Event Day
              </div>
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size:12.5px;color:#475569;line-height:1.65;">
                <tr>
                  <td style="padding:4px 0;vertical-align:top;width:22px;color:#4f46e5;font-weight:800;">1.</td>
                  <td style="padding:4px 0;">Please bring your valid <strong>College Photo ID Card</strong> along with this pass.</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;vertical-align:top;color:#4f46e5;font-weight:800;">2.</td>
                  <td style="padding:4px 0;">Have your QR code ready on your phone or keep a printout for fast gate check-in.</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;vertical-align:top;color:#4f46e5;font-weight:800;">3.</td>
                  <td style="padding:4px 0;">Your physical <strong>Startup Delegate Kit</strong> will be handed over at the auditorium desk.</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:22px 24px;background:#0f172a;color:#ffffff;text-align:center;">
              <div style="font-size:12.5px;font-weight:800;color:#ffffff;margin-bottom:4px;letter-spacing:0.02em;">
                Incubation, Innovation &amp; Entrepreneurship Cell (IIEC)
              </div>
              <div style="font-size:11.5px;color:#94a3b8;line-height:1.65;">
                Chhatrapati Shivaji Maharaj University (CSMU), Panvel, Navi Mumbai<br>
                Student Coordination Desk &bull; Helpline: <strong>+91 94666 05579</strong><br>
                Official Portal: <a href="https://iiec.in/illuminate" style="color:#a5b4fc;text-decoration:none;font-weight:700;">iiec.in/illuminate</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/* ------------------------------ ADMIN PANEL & MENU ACTIONS ------------------------------ */

/**
 * Opens the interactive illuminate Admin Sidebar Console inside Google Sheets
 */
function showAdminSidebar() {
  var html = HtmlService.createHtmlOutput(buildAdminSidebarHtml(false))
    .setTitle('⚡ illuminate 2026 Admin Hub')
    .setWidth(360);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Returns standalone Web Admin Console for browser access (?admin=true)
 */
function buildAdminWebHtml() {
  return buildAdminSidebarHtml(true);
}

/**
 * Menu action: Verifies and sends ticket email to the currently selected row
 */
function verifyAndSendSelectedRow() {
  var ss = targetSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  var cell = sheet.getActiveCell();
  var row = cell.getRow();

  if (row <= 1) {
    SpreadsheetApp.getUi().alert('⚠️ Please select a student registration row (row 2 or below).');
    return;
  }

  var attendeeName = sheet.getRange(row, COL.NAME).getValue();
  var attendeeEmail = sheet.getRange(row, COL.EMAIL).getValue();
  var regId = sheet.getRange(row, COL.REG_ID).getValue();
  var utr = sheet.getRange(row, COL.UTR).getValue() || 'Pending';

  var ui = SpreadsheetApp.getUi();
  var response = ui.alert(
    'Verify Payment & Dispatch Ticket',
    'Delegate Details:\n' +
    '• Name: ' + attendeeName + '\n' +
    '• Reg ID: ' + regId + '\n' +
    '• Email: ' + attendeeEmail + '\n' +
    '• UTR: ' + utr + '\n' +
    '• Sheet Row: ' + row + '\n\n' +
    'Confirm verification and dispatch official ticket email?',
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    sheet.getRange(row, COL.STATUS).setValue('Verified');
    var userEmail = Session.getActiveUser().getEmail() || 'Admin';
    sheet.getRange(row, COL.VERIFIER).setValue(userEmail);
    if (!sheet.getRange(row, COL.PAY_TS).getValue()) {
      sheet.getRange(row, COL.PAY_TS).setValue(new Date());
    }

    try {
      sendTicketEmailForRow(sheet, row);
      ui.alert('✅ Success! Payment marked Verified and ticket emailed to ' + attendeeEmail);
    } catch (err) {
      ui.alert('⚠️ Status marked Verified, but failed to send email: ' + err.message);
    }
  }
}

/**
 * Menu action: Sends ticket emails to all rows marked as 'Verified' where 'Ticket Sent?' is not 'Yes'
 */
function sendAllUnsentVerifiedTickets() {
  var ss = targetSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  var lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No registrations found in database.');
    return;
  }

  var data = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  var unsentRows = [];

  for (var i = 0; i < data.length; i++) {
    var status = String(data[i][COL.STATUS - 1]).trim();
    var ticketSent = String(data[i][COL.TICKET_SENT - 1]).trim();
    if (status === 'Verified' && ticketSent !== 'Yes') {
      unsentRows.push(i + 2);
    }
  }

  if (unsentRows.length === 0) {
    SpreadsheetApp.getUi().alert('✅ All verified attendees have already received their tickets.');
    return;
  }

  var ui = SpreadsheetApp.getUi();
  var proceed = ui.alert(
    'Batch Send Tickets',
    'Found ' + unsentRows.length + ' verified attendee(s) who have NOT received tickets.\n\nSend official ticket emails now?',
    ui.ButtonSet.YES_NO
  );

  if (proceed !== ui.Button.YES) return;

  var sentCount = 0;
  var errors = [];

  for (var j = 0; j < unsentRows.length; j++) {
    var rowNum = unsentRows[j];
    try {
      sendTicketEmailForRow(sheet, rowNum);
      sentCount++;
      Utilities.sleep(400); // Prevent email quota throttling
    } catch (err) {
      errors.push('Row ' + rowNum + ': ' + err.message);
    }
  }

  var msg = 'Successfully sent ' + sentCount + ' of ' + unsentRows.length + ' ticket email(s).';
  if (errors.length > 0) {
    msg += '\n\nErrors encountered:\n' + errors.slice(0, 5).join('\n');
  }
  ui.alert(msg);
}

/**
 * Menu action: Resends ticket by prompting for Registration ID or Email
 */
function resendTicketDialog() {
  var ui = SpreadsheetApp.getUi();
  var prompt = ui.prompt('Resend Ticket Email', 'Enter Registration ID (e.g. ILL-123456) or Attendee Email:', ui.ButtonSet.OK_CANCEL);
  if (prompt.getSelectedButton() !== ui.Button.OK) return;

  var query = prompt.getResponseText().trim();
  if (!query) return;

  var ss = targetSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  var row = findRowByQuery(sheet, query);

  if (row === 0) {
    ui.alert('⚠️ Attendee not found for query: ' + query);
    return;
  }

  var name = sheet.getRange(row, COL.NAME).getValue();
  var email = sheet.getRange(row, COL.EMAIL).getValue();
  var regId = sheet.getRange(row, COL.REG_ID).getValue();
  var status = sheet.getRange(row, COL.STATUS).getValue();

  var confirm = ui.alert(
    'Confirm Resend',
    'Attendee: ' + name + '\nReg ID: ' + regId + '\nEmail: ' + email + '\nPayment Status: ' + status + '\n\nResend official ticket email now?',
    ui.ButtonSet.YES_NO
  );

  if (confirm === ui.Button.YES) {
    try {
      sendTicketEmailForRow(sheet, row);
      ui.alert('✅ Official ticket successfully resent to ' + email);
    } catch (err) {
      ui.alert('⚠️ Failed to send ticket: ' + err.message);
    }
  }
}

/**
 * Menu action: Sets selected row payment status back to 'Pending Verification'
 */
function markPendingVerificationSelectedRow() {
  var ss = targetSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  var row = sheet.getActiveCell().getRow();
  if (row <= 1) {
    SpreadsheetApp.getUi().alert('Please select a student row (row 2 or below).');
    return;
  }

  sheet.getRange(row, COL.STATUS).setValue('Pending Verification');
  sheet.getRange(row, COL.VERIFIER).setValue('');
  SpreadsheetApp.getUi().alert('Row ' + row + ' reverted to "Pending Verification".');
}

/**
 * Menu action: Rejects registration with reason and optional notification email
 */
function rejectSelectedRow() {
  var ss = targetSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  var row = sheet.getActiveCell().getRow();
  if (row <= 1) {
    SpreadsheetApp.getUi().alert('Please select a student row (row 2 or below).');
    return;
  }

  var ui = SpreadsheetApp.getUi();
  var name = sheet.getRange(row, COL.NAME).getValue();
  var email = sheet.getRange(row, COL.EMAIL).getValue();
  var regId = sheet.getRange(row, COL.REG_ID).getValue();

  var prompt = ui.prompt(
    'Reject Registration',
    'Enter rejection reason for ' + name + ' (' + regId + '):\n(e.g. Invalid UTR / Payment not credited / Duplicate submission)',
    ui.ButtonSet.OK_CANCEL
  );

  if (prompt.getSelectedButton() !== ui.Button.OK) return;
  var reason = prompt.getResponseText().trim() || 'Payment verification failed. Invalid or unverified UTR.';

  sheet.getRange(row, COL.STATUS).setValue('Rejected');
  var userEmail = Session.getActiveUser().getEmail() || 'Admin';
  sheet.getRange(row, COL.VERIFIER).setValue(userEmail + ' (Rejected: ' + reason + ')');

  var sendMail = ui.alert('Send Notification Email?', 'Send polite rejection notification to ' + email + ' with instructions to resubmit?', ui.ButtonSet.YES_NO);
  if (sendMail === ui.Button.YES) {
    try {
      var attendee = { fullName: name, email: email, regId: regId };
      var html = buildRejectionEmailHtml(attendee, reason);
      MailApp.sendEmail({
        to: email,
        subject: 'illuminate 2026 Registration Update — ' + regId,
        htmlBody: html,
        name: 'illuminate 2026 — IIEC CSMU',
        replyTo: CONFIG.REPLY_TO_EMAIL
      });
      ui.alert('✅ Status set to Rejected and notification sent to ' + email);
    } catch (err) {
      ui.alert('Status set to Rejected. Email error: ' + err.message);
    }
  } else {
    ui.alert('✅ Status set to Rejected.');
  }
}

/**
 * Menu action: Rapid Gate Check-In by entering or scanning Registration ID
 */
function checkinAttendeeDialog() {
  var ui = SpreadsheetApp.getUi();
  var prompt = ui.prompt('Event Day Rapid Check-In', 'Scan or Enter Registration ID (e.g. ILL-123456):', ui.ButtonSet.OK_CANCEL);
  if (prompt.getSelectedButton() !== ui.Button.OK) return;

  var id = prompt.getResponseText().trim();
  if (!id) return;

  var ss = targetSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  var row = findRowByQuery(sheet, id);

  if (row === 0) {
    ui.alert('❌ Registration ID ' + id + ' not found in database.');
    return;
  }

  var name = sheet.getRange(row, COL.NAME).getValue();
  var college = sheet.getRange(row, COL.COLLEGE).getValue();
  var status = sheet.getRange(row, COL.STATUS).getValue();
  var currentCheckin = sheet.getRange(row, COL.CHECKIN).getValue();

  if (currentCheckin === 'Checked In') {
    ui.alert('⚠️ ALREADY CHECKED IN!\n\nAttendee: ' + name + '\nCollege: ' + college + '\nStatus: Already Marked Checked In');
    return;
  }

  sheet.getRange(row, COL.CHECKIN).setValue('Checked In');
  sheet.getRange(row, COL.CHECKIN).setBackground('#d1fae5').setFontColor('#065f46').setFontWeight('bold');

  ui.alert('✅ CHECK-IN SUCCESSFUL!\n\n• Attendee: ' + name + '\n• College: ' + college + '\n• Payment Status: ' + status + '\n• Seat Confirmed!');
}

/**
 * Menu action: Toggles Check-In status on the active row
 */
function toggleCheckinSelectedRow() {
  var ss = targetSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  var row = sheet.getActiveCell().getRow();
  if (row <= 1) {
    SpreadsheetApp.getUi().alert('Please select a student row (row 2 or below).');
    return;
  }

  var current = sheet.getRange(row, COL.CHECKIN).getValue();
  var newCheckin = (current === 'Checked In') ? 'Not Checked In' : 'Checked In';
  var name = sheet.getRange(row, COL.NAME).getValue();

  sheet.getRange(row, COL.CHECKIN).setValue(newCheckin);
  if (newCheckin === 'Checked In') {
    sheet.getRange(row, COL.CHECKIN).setBackground('#d1fae5').setFontColor('#065f46').setFontWeight('bold');
  } else {
    sheet.getRange(row, COL.CHECKIN).setBackground('#ffffff').setFontColor('#111111').setFontWeight('normal');
  }

  SpreadsheetApp.getUi().alert('Check-in status for ' + name + ' updated to: ' + newCheckin);
}

/**
 * Menu action: Resets Check-In status on active row
 */
function resetCheckinSelectedRow() {
  var ss = targetSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  var row = sheet.getActiveCell().getRow();
  if (row <= 1) {
    SpreadsheetApp.getUi().alert('Please select a student row (row 2 or below).');
    return;
  }

  sheet.getRange(row, COL.CHECKIN).setValue('Not Checked In');
  sheet.getRange(row, COL.CHECKIN).setBackground('#ffffff').setFontColor('#111111').setFontWeight('normal');
  SpreadsheetApp.getUi().alert('Row ' + row + ' reset to "Not Checked In".');
}

/**
 * Menu action: Displays full attendee lookup card with action buttons
 */
function lookupRegistrationDialog() {
  var ui = SpreadsheetApp.getUi();
  var prompt = ui.prompt('Attendee Record Lookup', 'Enter Registration ID, Email, Mobile, or UTR:', ui.ButtonSet.OK_CANCEL);
  if (prompt.getSelectedButton() !== ui.Button.OK) return;

  var query = prompt.getResponseText().trim();
  if (!query) return;

  var ss = targetSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  var row = findRowByQuery(sheet, query);

  if (row === 0) {
    ui.alert('⚠️ No attendee record matched: ' + query);
    return;
  }

  var data = sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0];
  var card = [
    '═══════════════════════════════════════',
    'DELEGATE: ' + data[COL.NAME - 1],
    '═══════════════════════════════════════',
    '• Reg ID: ' + data[COL.REG_ID - 1],
    '• Email: ' + data[COL.EMAIL - 1],
    '• Mobile: ' + data[COL.MOBILE - 1],
    '• College: ' + data[COL.COLLEGE - 1],
    '• Program: ' + data[COL.COURSE - 1] + ' (' + data[COL.YEAR - 1] + ')',
    '• Fee: ₹' + (data[COL.FEE - 1] || CONFIG.FEE_AMOUNT),
    '• Payment Status: ' + data[COL.STATUS - 1],
    '• UTR Reference: ' + (data[COL.UTR - 1] || 'Not submitted'),
    '• Ticket Sent: ' + data[COL.TICKET_SENT - 1],
    '• Check-In: ' + data[COL.CHECKIN - 1],
    '• Verified By: ' + (data[COL.VERIFIER - 1] || 'Pending'),
    '• Sheet Row: ' + row,
    '═══════════════════════════════════════'
  ].join('\n');

  var action = ui.alert('Attendee Record (Row ' + row + ')', card + '\n\nSelect action to perform:', ui.ButtonSet.YES_NO_CANCEL);

  // YES = Verify & Send Ticket, NO = Toggle Check-In, CANCEL = Close
  if (action === ui.Button.YES) {
    sheet.getRange(row, COL.STATUS).setValue('Verified');
    sheet.getRange(row, COL.VERIFIER).setValue(Session.getActiveUser().getEmail() || 'Admin');
    try {
      sendTicketEmailForRow(sheet, row);
      ui.alert('✅ Verified and ticket sent to ' + data[COL.EMAIL - 1]);
    } catch (e) {
      ui.alert('Error sending ticket: ' + e.message);
    }
  } else if (action === ui.Button.NO) {
    var nextCheckin = (data[COL.CHECKIN - 1] === 'Checked In') ? 'Not Checked In' : 'Checked In';
    sheet.getRange(row, COL.CHECKIN).setValue(nextCheckin);
    ui.alert('Check-In updated to: ' + nextCheckin);
  }
}

/**
 * Menu action: Broadcasts official announcement or reminder email to attendees
 */
function broadcastEmailDialog() {
  var ui = SpreadsheetApp.getUi();

  var audPrompt = ui.prompt(
    '1/3: Target Audience',
    'Choose recipient segment:\n' +
    '1 = Verified Attendees Only (Recommended for ticket holders)\n' +
    '2 = Pending Verification Only (Payment reminder)\n' +
    '3 = ALL Registered Students',
    ui.ButtonSet.OK_CANCEL
  );
  if (audPrompt.getSelectedButton() !== ui.Button.OK) return;
  var choice = audPrompt.getResponseText().trim();

  var filterStatus = '';
  if (choice === '1') filterStatus = 'Verified';
  else if (choice === '2') filterStatus = 'Pending Verification';
  else if (choice !== '3') {
    ui.alert('Invalid option. Operation cancelled.');
    return;
  }

  var subjPrompt = ui.prompt('2/3: Email Subject', 'Enter announcement subject:\n(e.g. Important: Reporting Time & Venue Instructions for illuminate 2026)', ui.ButtonSet.OK_CANCEL);
  if (subjPrompt.getSelectedButton() !== ui.Button.OK) return;
  var subject = subjPrompt.getResponseText().trim();
  if (!subject) return;

  var msgPrompt = ui.prompt('3/3: Email Message Body', 'Enter your message text (plain text or paragraphs):', ui.ButtonSet.OK_CANCEL);
  if (msgPrompt.getSelectedButton() !== ui.Button.OK) return;
  var message = msgPrompt.getResponseText().trim();
  if (!message) return;

  var ss = targetSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  var data = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  var recipients = [];

  for (var i = 0; i < data.length; i++) {
    var email = String(data[i][COL.EMAIL - 1]).trim();
    var status = String(data[i][COL.STATUS - 1]).trim();
    if (!email || email.indexOf('@') === -1) continue;

    if (!filterStatus || status === filterStatus) {
      recipients.push({ email: email, name: data[i][COL.NAME - 1] });
    }
  }

  var confirm = ui.alert(
    'Confirm Broadcast Dispatch',
    'Target Audience: ' + (filterStatus || 'ALL Registrations') + '\n' +
    'Total Recipients: ' + recipients.length + '\n' +
    'Subject: ' + subject + '\n\n' +
    'Proceed with broadcasting to ' + recipients.length + ' students?',
    ui.ButtonSet.YES_NO
  );

  if (confirm !== ui.Button.YES) return;

  var sent = 0;
  var errors = [];
  var html = buildBroadcastEmailHtml(subject, message);

  for (var k = 0; k < recipients.length; k++) {
    try {
      MailApp.sendEmail({
        to: recipients[k].email,
        subject: subject,
        htmlBody: html,
        name: 'illuminate 2026 — IIEC CSMU',
        replyTo: CONFIG.REPLY_TO_EMAIL
      });
      sent++;
      Utilities.sleep(350); // Respect Google quota
    } catch (err) {
      errors.push(recipients[k].email + ': ' + err.message);
    }
  }

  ui.alert('✅ Broadcast finished!\nSent to ' + sent + ' of ' + recipients.length + ' recipients.');
}

/**
 * Menu action: Refreshes the Dashboard & Stats sheet formulas and summary
 */
function refreshDashboard() {
  setupSheet();
  SpreadsheetApp.getUi().alert('✅ Dashboard formulas, counts, and formatting have been refreshed!');
}

/**
 * Sends a test ticket to the logged-in user's email
 */
function testSendTicketToMyself() {
  var myEmail = Session.getActiveUser().getEmail();
  if (!myEmail) {
    SpreadsheetApp.getUi().alert('Unable to detect your Google account email.');
    return;
  }

  var sampleAttendee = {
    regId: 'ILL-TEST99',
    fullName: 'Test Participant',
    email: myEmail,
    mobile: '9876543210',
    college: 'Chhatrapati Shivaji Maharaj University',
    course: 'B.Tech Computer Science',
    year: '3rd Year',
    utrNumber: '508219481923',
    fee: CONFIG.FEE_AMOUNT
  };

  var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=' + encodeURIComponent('TEST-TICKET-ILLUMINATE-2026');
  var html = buildTicketEmailHtml(sampleAttendee, qrUrl);

  MailApp.sendEmail({
    to: myEmail,
    subject: '🧪 [TEST] Your illuminate 2026 Pass [ILL-TEST99]',
    htmlBody: html,
    name: 'illuminate 2026 — IIEC CSMU',
    replyTo: CONFIG.REPLY_TO_EMAIL
  });

  SpreadsheetApp.getUi().alert('Test ticket email successfully sent to: ' + myEmail);
}

/* ------------------------------ SIDEBAR & WEB ADMIN APIS ------------------------------ */

function apiGetStats() {
  var ss = targetSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet || sheet.getLastRow() <= 1) {
    return { total: 0, verified: 0, pending: 0, rejected: 0, checkedIn: 0, unsent: 0, revenue: 0 };
  }

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues();
  var total = data.length;
  var verified = 0, pending = 0, rejected = 0, checkedIn = 0, unsent = 0;

  for (var i = 0; i < total; i++) {
    var status = String(data[i][COL.STATUS - 1]).trim();
    var check = String(data[i][COL.CHECKIN - 1]).trim();
    var sent = String(data[i][COL.TICKET_SENT - 1]).trim();

    if (status === 'Verified') {
      verified++;
      if (sent !== 'Yes') unsent++;
    } else if (status === 'Rejected') {
      rejected++;
    } else {
      pending++;
    }

    if (check === 'Checked In') checkedIn++;
  }

  return {
    total: total,
    verified: verified,
    pending: pending,
    rejected: rejected,
    checkedIn: checkedIn,
    unsent: unsent,
    revenue: verified * CONFIG.FEE_AMOUNT
  };
}

function apiSearchAttendee(query) {
  var ss = targetSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  var row = findRowByQuery(sheet, query);
  if (row === 0) return { found: false };

  var d = sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0];
  return {
    found: true,
    row: row,
    regId: d[COL.REG_ID - 1],
    fullName: d[COL.NAME - 1],
    email: d[COL.EMAIL - 1],
    mobile: d[COL.MOBILE - 1],
    college: d[COL.COLLEGE - 1],
    course: d[COL.COURSE - 1],
    year: d[COL.YEAR - 1],
    status: d[COL.STATUS - 1],
    utrNumber: d[COL.UTR - 1],
    ticketSent: d[COL.TICKET_SENT - 1],
    checkinStatus: d[COL.CHECKIN - 1],
    fee: d[COL.FEE - 1] || CONFIG.FEE_AMOUNT
  };
}

function apiVerifyAttendee(regId) {
  var ss = targetSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  var row = findRowByQuery(sheet, regId);
  if (row === 0) return { ok: false, error: 'Attendee not found' };

  sheet.getRange(row, COL.STATUS).setValue('Verified');
  var user = Session.getActiveUser().getEmail() || 'Admin';
  sheet.getRange(row, COL.VERIFIER).setValue(user);
  if (!sheet.getRange(row, COL.PAY_TS).getValue()) {
    sheet.getRange(row, COL.PAY_TS).setValue(new Date());
  }

  sendTicketEmailForRow(sheet, row);
  return { ok: true, message: 'Verified and ticket emailed' };
}

function apiCheckinAttendee(regId) {
  var ss = targetSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  var row = findRowByQuery(sheet, regId);
  if (row === 0) return { ok: false, error: 'Registration ID not found' };

  var current = sheet.getRange(row, COL.CHECKIN).getValue();
  if (current === 'Checked In') {
    return { ok: true, already: true, name: sheet.getRange(row, COL.NAME).getValue() };
  }

  sheet.getRange(row, COL.CHECKIN).setValue('Checked In');
  sheet.getRange(row, COL.CHECKIN).setBackground('#d1fae5').setFontColor('#065f46');
  return { ok: true, name: sheet.getRange(row, COL.NAME).getValue(), college: sheet.getRange(row, COL.COLLEGE).getValue() };
}

function apiResendTicket(regId) {
  var ss = targetSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  var row = findRowByQuery(sheet, regId);
  if (row === 0) return { ok: false, error: 'Attendee not found' };

  sendTicketEmailForRow(sheet, row);
  return { ok: true, email: sheet.getRange(row, COL.EMAIL).getValue() };
}

function handleAdminApiGet(p) {
  var action = (p.api_action || '').toLowerCase();
  try {
    if (action === 'stats') return jsonResponse(apiGetStats());
    if (action === 'search') return jsonResponse(apiSearchAttendee(p.q || ''));
    if (action === 'verify') return jsonResponse(apiVerifyAttendee(p.id || ''));
    if (action === 'checkin') return jsonResponse(apiCheckinAttendee(p.id || ''));
    if (action === 'resend') return jsonResponse(apiResendTicket(p.id || ''));
    return jsonResponse({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

/**
 * Universal query finder (Reg ID, Email, Phone, or UTR)
 */
function findRowByQuery(sheet, query) {
  if (!query) return 0;
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;

  var q = String(query).trim().toUpperCase();
  var data = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();

  for (var i = 0; i < data.length; i++) {
    var regId = String(data[i][COL.REG_ID - 1]).trim().toUpperCase();
    var email = String(data[i][COL.EMAIL - 1]).trim().toUpperCase();
    var mobile = String(data[i][COL.MOBILE - 1]).trim();
    var utr = String(data[i][COL.UTR - 1]).trim().toUpperCase();

    if (regId === q || email === q || mobile === q || (utr && utr === q)) {
      return i + 2;
    }
  }
  return 0;
}

/* ------------------------------ HTML SIDEBAR & TEMPLATES ------------------------------ */

function buildAdminSidebarHtml(isStandaloneWeb) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>illuminate 2026 Admin Hub</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 14px; background: #0d1117; color: #f0f6fc; font-family: 'Inter', -apple-system, sans-serif; font-size: 13px; line-height: 1.45; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; margin-bottom: 14px; }
    .brand { font-size: 15px; font-weight: 900; color: #fff; letter-spacing: -0.02em; }
    .brand span { color: #ff5a1f; }
    .tag { font-size: 9.5px; font-weight: 800; background: rgba(255,90,31,0.15); color: #ff986e; border: 1px solid rgba(255,90,31,0.35); padding: 2px 7px; border-radius: 999px; text-transform: uppercase; }
    .tabs { display: flex; gap: 4px; border-bottom: 1px solid rgba(255,255,255,0.12); margin-bottom: 14px; }
    .tab-btn { flex: 1; padding: 8px 4px; background: transparent; border: none; color: #8b949e; font-size: 11.5px; font-weight: 700; cursor: pointer; border-bottom: 2px solid transparent; text-align: center; }
    .tab-btn.active { color: #ff5a1f; border-bottom-color: #ff5a1f; }
    .panel { display: none; }
    .panel.active { display: block; }
    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
    .stat-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px; }
    .stat-num { font-size: 18px; font-weight: 900; color: #fff; line-height: 1.1; margin-top: 2px; }
    .stat-lbl { font-size: 9.5px; font-weight: 700; color: #8b949e; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-green { color: #34d399; }
    .stat-orange { color: #fbbf24; }
    .stat-accent { color: #ff986e; }
    .btn { display: block; width: 100%; padding: 9px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; border: none; cursor: pointer; margin-bottom: 8px; text-align: center; transition: all 0.2s; }
    .btn-primary { background: #ff5a1f; color: #fff; }
    .btn-primary:hover { background: #e04b15; }
    .btn-green { background: #059669; color: #fff; }
    .btn-green:hover { background: #047857; }
    .btn-dark { background: rgba(255,255,255,0.08); color: #f0f6fc; border: 1px solid rgba(255,255,255,0.12); }
    .btn-dark:hover { background: rgba(255,255,255,0.14); }
    .input-box { width: 100%; padding: 9px 11px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); border-radius: 8px; color: #fff; font-size: 12.5px; margin-bottom: 8px; outline: none; }
    .input-box:focus { border-color: #ff5a1f; background: rgba(255,255,255,0.09); }
    .card-box { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px; margin-bottom: 12px; }
    .toast { position: fixed; bottom: 12px; left: 14px; right: 14px; padding: 9px 12px; border-radius: 6px; font-size: 11.5px; font-weight: 700; background: #1f2937; color: #fff; border: 1px solid #374151; display: none; text-align: center; z-index: 100; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">⚡ illuminate <span>Admin</span></div>
    <span class="tag">IIT Bombay × CSMU</span>
  </div>

  <div class="tabs">
    <button class="tab-btn active" onclick="switchTab('tab-stats')">Dashboard</button>
    <button class="tab-btn" onclick="switchTab('tab-search')">Lookup</button>
    <button class="tab-btn" onclick="switchTab('tab-gate')">Gate Entry</button>
  </div>

  <!-- TAB 1: STATS & BATCH ACTIONS -->
  <div class="panel active" id="tab-stats">
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-lbl">Registrations</div><div class="stat-num" id="s-total">-</div></div>
      <div class="stat-card"><div class="stat-lbl">Verified Paid</div><div class="stat-num stat-green" id="s-verified">-</div></div>
      <div class="stat-card"><div class="stat-lbl">Pending UTR</div><div class="stat-num stat-orange" id="s-pending">-</div></div>
      <div class="stat-card"><div class="stat-lbl">Gate Checked-In</div><div class="stat-num stat-accent" id="s-checkin">-</div></div>
    </div>
    <div class="card-box">
      <div class="stat-lbl" style="margin-bottom:6px;">Confirmed Collections</div>
      <div style="font-size:20px;font-weight:900;color:#34d399;" id="s-revenue">₹0</div>
    </div>
    <button class="btn btn-green" onclick="sendAllUnsentTickets()">🚀 Send All Unsent Tickets (<span id="s-unsent">0</span>)</button>
    <button class="btn btn-dark" onclick="refreshLiveStats()">🔄 Refresh Live Statistics</button>
  </div>

  <!-- TAB 2: LOOKUP & ATTENDEE ACTIONS -->
  <div class="panel" id="tab-search">
    <input type="text" id="searchInput" class="input-box" placeholder="Enter Reg ID / Email / UTR..." onkeydown="if(event.key==='Enter')doSearch()">
    <button class="btn btn-primary" onclick="doSearch()">Search Attendee</button>
    <div id="searchResult" style="display:none;" class="card-box">
      <div id="resName" style="font-size:15px;font-weight:800;color:#fff;margin-bottom:2px;"></div>
      <div id="resId" style="font-size:11px;font-family:monospace;color:#ff986e;margin-bottom:8px;"></div>
      <div style="font-size:12px;color:#cbd5e1;line-height:1.6;margin-bottom:10px;" id="resMeta"></div>
      <button class="btn btn-green" id="btnVerifyAct" onclick="doVerifyFromSearch()">Verify & Send Ticket</button>
      <button class="btn btn-primary" id="btnCheckinAct" onclick="doCheckinFromSearch()">Mark Checked In</button>
      <button class="btn btn-dark" onclick="doResendFromSearch()">Resend Ticket Email</button>
    </div>
  </div>

  <!-- TAB 3: GATE CHECK-IN -->
  <div class="panel" id="tab-gate">
    <div style="font-size:11.5px;color:#8b949e;margin-bottom:8px;">Fast Gate Desk Scanner: Scan QR or type ID and press Enter.</div>
    <input type="text" id="gateInput" class="input-box" placeholder="Scan or Type Reg ID (e.g. ILL-123456)..." autofocus onkeydown="if(event.key==='Enter')doGateCheckin()">
    <button class="btn btn-green" onclick="doGateCheckin()">Check-In Delegate</button>
    <div id="gateFeedback" style="display:none;margin-top:10px;padding:12px;border-radius:8px;"></div>
  </div>

  <div class="toast" id="toastMsg"></div>

  <script>
    var currentRecord = null;

    function switchTab(id) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById(id).classList.add('active');
      if (id === 'tab-gate') document.getElementById('gateInput').focus();
    }

    function showToast(msg, bg) {
      var t = document.getElementById('toastMsg');
      t.textContent = msg;
      t.style.background = bg || '#1f2937';
      t.style.display = 'block';
      setTimeout(() => t.style.display = 'none', 3000);
    }

    function refreshLiveStats() {
      showToast('Refreshing stats...');
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.withSuccessHandler(renderStats).apiGetStats();
      } else {
        fetch('?api_action=stats').then(r => r.json()).then(renderStats);
      }
    }

    function renderStats(s) {
      document.getElementById('s-total').textContent = s.total;
      document.getElementById('s-verified').textContent = s.verified;
      document.getElementById('s-pending').textContent = s.pending;
      document.getElementById('s-checkin').textContent = s.checkedIn;
      document.getElementById('s-unsent').textContent = s.unsent;
      document.getElementById('s-revenue').textContent = '₹' + (s.revenue || 0);
      showToast('Statistics updated', '#065f46');
    }

    function doSearch() {
      var q = document.getElementById('searchInput').value.trim();
      if (!q) return;
      showToast('Searching database...');
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.withSuccessHandler(renderSearchResult).apiSearchAttendee(q);
      } else {
        fetch('?api_action=search&q=' + encodeURIComponent(q)).then(r => r.json()).then(renderSearchResult);
      }
    }

    function renderSearchResult(res) {
      var box = document.getElementById('searchResult');
      if (!res || !res.found) {
        box.style.display = 'none';
        showToast('No record found', '#991b1b');
        return;
      }
      currentRecord = res;
      document.getElementById('resName').textContent = res.fullName;
      document.getElementById('resId').textContent = res.regId + ' • Row ' + res.row;
      document.getElementById('resMeta').innerHTML = 
        'College: <b>' + res.college + '</b><br>' +
        'Status: <b style="color:' + (res.status === 'Verified' ? '#34d399' : '#fbbf24') + '">' + res.status + '</b><br>' +
        'UTR: <code>' + (res.utrNumber || 'Pending') + '</code><br>' +
        'Check-In: <b>' + res.checkinStatus + '</b>';
      box.style.display = 'block';
      showToast('Found: ' + res.fullName, '#065f46');
    }

    function doVerifyFromSearch() {
      if (!currentRecord) return;
      showToast('Verifying payment and sending ticket...');
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.withSuccessHandler(() => {
          showToast('Verified & Ticket Sent!', '#065f46');
          doSearch();
          refreshLiveStats();
        }).apiVerifyAttendee(currentRecord.regId);
      } else {
        fetch('?api_action=verify&id=' + encodeURIComponent(currentRecord.regId)).then(r => r.json()).then(() => {
          showToast('Verified & Ticket Sent!', '#065f46');
          doSearch();
          refreshLiveStats();
        });
      }
    }

    function doCheckinFromSearch() {
      if (!currentRecord) return;
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.withSuccessHandler(() => {
          showToast('Checked in successfully!', '#065f46');
          doSearch();
          refreshLiveStats();
        }).apiCheckinAttendee(currentRecord.regId);
      } else {
        fetch('?api_action=checkin&id=' + encodeURIComponent(currentRecord.regId)).then(r => r.json()).then(() => {
          showToast('Checked in successfully!', '#065f46');
          doSearch();
          refreshLiveStats();
        });
      }
    }

    function doResendFromSearch() {
      if (!currentRecord) return;
      showToast('Resending ticket...');
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.withSuccessHandler(() => showToast('Ticket resent!', '#065f46')).apiResendTicket(currentRecord.regId);
      } else {
        fetch('?api_action=resend&id=' + encodeURIComponent(currentRecord.regId)).then(r => r.json()).then(() => showToast('Ticket resent!', '#065f46'));
      }
    }

    function doGateCheckin() {
      var id = document.getElementById('gateInput').value.trim().toUpperCase();
      if (!id) return;
      var fb = document.getElementById('gateFeedback');

      function showCheckinRes(r) {
        document.getElementById('gateInput').value = '';
        document.getElementById('gateInput').focus();
        fb.style.display = 'block';
        if (!r.ok) {
          fb.style.background = '#7f1d1d';
          fb.innerHTML = '❌ <b>Attendee Not Found!</b> ID: ' + id;
        } else if (r.already) {
          fb.style.background = '#78350f';
          fb.innerHTML = '⚠️ <b>Already Checked In!</b><br>' + r.name;
        } else {
          fb.style.background = '#064e3b';
          fb.innerHTML = '✅ <b>SUCCESSFUL ENTRY!</b><br><b>' + r.name + '</b><br><span style="font-size:11px;">' + r.college + '</span>';
          refreshLiveStats();
        }
      }

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.withSuccessHandler(showCheckinRes).apiCheckinAttendee(id);
      } else {
        fetch('?api_action=checkin&id=' + encodeURIComponent(id)).then(r => r.json()).then(showCheckinRes);
      }
    }

    function sendAllUnsentTickets() {
      if (!confirm('Batch send tickets to all verified attendees who have not received them?')) return;
      showToast('Dispatching ticket batch...');
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.withSuccessHandler(() => {
          showToast('Batch tickets sent!', '#065f46');
          refreshLiveStats();
        }).sendAllUnsentVerifiedTickets();
      }
    }

    // Auto-refresh stats on load
    window.onload = refreshLiveStats;
  </script>
</body>
</html>
  `;
}

function buildBroadcastEmailHtml(subject, messageText) {
  var formatted = escapeHtml(messageText).replace(/\n/g, '<br>');
  return `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(subject)}</title>
  <style>
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; margin: 0; padding: 0; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
    body { width: 100% !important; min-width: 100%; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media only screen and (max-width: 580px) {
      .email-outer-td { padding: 12px 8px !important; }
      .main-table { width: 100% !important; border-radius: 14px !important; }
      .header-cell { padding: 24px 16px 18px !important; }
      .brand-title { font-size: 24px !important; }
      .content-cell { padding: 20px 16px !important; }
      .venue-box { padding: 14px 12px !important; }
      .btn-action { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;-webkit-font-smoothing:antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" class="email-outer-td" style="padding:32px 14px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="main-table" style="max-width:580px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;box-shadow:0 12px 36px rgba(15,23,42,0.07);">
          
          <!-- Top Indigo Gradient Bar -->
          <tr>
            <td style="height:6px;background:linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td class="header-cell" style="padding:30px 28px 20px;text-align:center;background:#ffffff;border-bottom:1px solid #f1f5f9;">
              <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 10px;">
                <tr>
                  <td style="background:#eef2ff;border:1px solid #c7d2fe;padding:5px 16px;border-radius:999px;font-size:10.5px;font-weight:800;color:#4f46e5;letter-spacing:1.5px;text-transform:uppercase;">
                    E-CELL IIT BOMBAY &times; IIEC CSMU
                  </td>
                </tr>
              </table>
              <h1 class="brand-title" style="font-size:28px;font-weight:900;color:#0f172a;letter-spacing:-0.03em;line-height:1.15;margin:0 0 6px;">
                illuminate <span style="color:#6366f1;">2026</span>
              </h1>
              <div style="font-size:13px;font-weight:600;color:#64748b;line-height:1.4;">
                Important Workshop Update &amp; Announcement
              </div>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td class="content-cell" style="padding:28px 28px 24px;">
              <h2 style="font-size:19px;font-weight:800;color:#0f172a;line-height:1.35;margin:0 0 16px;letter-spacing:-0.02em;">
                ${escapeHtml(subject)}
              </h2>
              
              <div style="font-size:14.5px;line-height:1.75;color:#334155;margin-bottom:24px;">
                ${formatted}
              </div>

              <!-- Venue Info Pill Box -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" class="venue-box" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;margin-bottom:20px;">
                <tr>
                  <td>
                    <div style="font-size:11px;font-weight:800;color:#4f46e5;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">
                      WORKSHOP LOCATION
                    </div>
                    <div style="font-size:13px;font-weight:600;color:#0f172a;line-height:1.45;">
                      Chhatrapati Shivaji Maharaj University (CSMU), Panvel, Navi Mumbai
                    </div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px;">
                      Please arrive 15 minutes prior to start time and carry your College Photo ID Card.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Portal Link CTA -->
              <div style="text-align:center;margin-top:24px;">
                <a href="https://iiec.in/illuminate" target="_blank" class="btn-action" style="display:inline-block;background:linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;padding:12px 28px;border-radius:999px;box-shadow:0 6px 18px rgba(99,102,241,0.35);">
                  Visit Workshop Portal &rarr;
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:22px 24px;background:#090d16;color:#ffffff;text-align:center;">
              <div style="font-size:12.5px;font-weight:800;color:#ffffff;margin-bottom:4px;letter-spacing:0.02em;">
                Incubation, Innovation &amp; Entrepreneurship Cell (IIEC)
              </div>
              <div style="font-size:11.5px;color:#94a3b8;line-height:1.6;">
                Chhatrapati Shivaji Maharaj University (CSMU), Panvel &bull; Helpline: <strong>+91 94666 05579</strong><br>
                Official Site: <a href="https://iiec.in/illuminate" style="color:#a5b4fc;text-decoration:none;font-weight:700;">iiec.in/illuminate</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildRejectionEmailHtml(attendee, reason) {
  return `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <title>Payment Update: illuminate 2026 — ${escapeHtml(attendee.regId)}</title>
  <style>
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; margin: 0; padding: 0; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
    body { width: 100% !important; min-width: 100%; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media only screen and (max-width: 580px) {
      .email-outer-td { padding: 12px 8px !important; }
      .main-table { width: 100% !important; border-radius: 14px !important; }
      .header-cell { padding: 24px 16px 18px !important; }
      .content-cell { padding: 20px 16px !important; }
      .btn-action { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;-webkit-font-smoothing:antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" class="email-outer-td" style="padding:32px 14px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="main-table" style="max-width:580px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;box-shadow:0 12px 36px rgba(15,23,42,0.07);">
          
          <!-- Top Alert Red Accent Bar -->
          <tr>
            <td style="height:6px;background:linear-gradient(90deg, #f43f5e 0%, #e11d48 100%);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td class="header-cell" style="padding:30px 28px 20px;text-align:center;background:#ffffff;border-bottom:1px solid #f1f5f9;">
              <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 10px;">
                <tr>
                  <td style="background:#fff1f2;border:1px solid #fecdd3;padding:5px 16px;border-radius:999px;font-size:10.5px;font-weight:800;color:#e11d48;letter-spacing:1.5px;text-transform:uppercase;">
                    REGISTRATION ACTION REQUIRED
                  </td>
                </tr>
              </table>
              <h1 style="font-size:26px;font-weight:900;color:#0f172a;letter-spacing:-0.03em;line-height:1.15;margin:0 0 6px;">
                illuminate <span style="color:#6366f1;">2026</span>
              </h1>
              <div style="font-size:13px;font-weight:600;color:#64748b;line-height:1.4;">
                Payment Verification Notice &bull; Pass Pending
              </div>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td class="content-cell" style="padding:28px 28px 24px;">
              <h2 style="font-size:18px;font-weight:800;color:#0f172a;line-height:1.35;margin:0 0 12px;letter-spacing:-0.02em;">
                Hello ${escapeHtml(attendee.fullName)},
              </h2>
              
              <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 16px;">
                We reviewed your submitted payment details for Registration ID <strong style="color:#0f172a;font-family:monospace;">${escapeHtml(attendee.regId)}</strong>. Unfortunately, we were unable to match the transaction with our bank statements.
              </p>

              <!-- Reason Box -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;padding:16px 18px;margin-bottom:20px;">
                <tr>
                  <td>
                    <div style="font-size:11px;font-weight:800;color:#be123c;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">
                      REASON NOTED BY DESK
                    </div>
                    <div style="font-size:13.5px;font-weight:700;color:#881337;line-height:1.5;">
                      ${escapeHtml(reason)}
                    </div>
                  </td>
                </tr>
              </table>

              <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 24px;">
                If you have completed the payment of <strong>₹${CONFIG.FEE_AMOUNT}</strong> via UPI, please resubmit your correct 12-digit UTR on our portal or contact our student coordination helpline with your payment receipt screenshot.
              </p>

              <!-- Action Button -->
              <div style="text-align:center;">
                <a href="https://iiec.in/illuminate#register" target="_blank" class="btn-action" style="display:inline-block;background:linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;padding:12px 28px;border-radius:999px;box-shadow:0 6px 18px rgba(225,29,72,0.35);">
                  Update Payment Details &rarr;
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:22px 24px;background:#090d16;color:#ffffff;text-align:center;">
              <div style="font-size:12.5px;font-weight:800;color:#ffffff;margin-bottom:4px;letter-spacing:0.02em;">
                IIEC CSMU Coordination Desk
              </div>
              <div style="font-size:11.5px;color:#94a3b8;line-height:1.6;">
                Helpline: <strong>+91 94666 05579</strong> &bull; Email: <a href="mailto:${CONFIG.REPLY_TO_EMAIL}" style="color:#a5b4fc;text-decoration:none;">${CONFIG.REPLY_TO_EMAIL}</a><br>
                Official Portal: <a href="https://iiec.in/illuminate" style="color:#a5b4fc;text-decoration:none;font-weight:700;">iiec.in/illuminate</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ------------------------------ SETUP & FORMATTING ------------------------------ */

/**
 * Initializes and formats the database tabs
 */
function setupSheet() {
  var ss = targetSpreadsheet();

  // 1. Setup "illuminate Registrations" sheet
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.getSheets()[0];
    sheet.setName(CONFIG.SHEET_NAME);
  }

  // Set Headers
  var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setValues([HEADERS]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#0d1222');
  headerRange.setFontColor('#ffb703');
  headerRange.setHorizontalAlignment('center');
  headerRange.setFontSize(10);
  sheet.setFrozenRows(1);

  // Set Widths
  for (var c = 0; c < WIDTHS.length; c++) {
    sheet.setColumnWidth(c + 1, WIDTHS[c]);
  }

  // Dropdown Validation for Payment Status (Col 14)
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Pending Verification', 'Verified', 'Rejected'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, COL.STATUS, 998, 1).setDataValidation(statusRule);

  // Dropdown Validation for Check-in Status (Col 20)
  var checkinRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Not Checked In', 'Checked In'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, COL.CHECKIN, 998, 1).setDataValidation(checkinRule);

  // Conditional Formatting Rules
  var rules = [];

  // "Verified" -> Light Green background
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Verified')
    .setBackground('#d1fae5')
    .setFontColor('#065f46')
    .setRanges([sheet.getRange(2, COL.STATUS, 998, 1)])
    .build());

  // "Pending Verification" -> Light Yellow background
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Pending Verification')
    .setBackground('#fef3c7')
    .setFontColor('#92400e')
    .setRanges([sheet.getRange(2, COL.STATUS, 998, 1)])
    .build());

  // "Rejected" -> Light Red background
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Rejected')
    .setBackground('#fee2e2')
    .setFontColor('#991b1b')
    .setRanges([sheet.getRange(2, COL.STATUS, 998, 1)])
    .build());

  sheet.setConditionalFormatRules(rules);

  // 2. Setup "Dashboard & Stats" Summary sheet
  var summarySheet = ss.getSheetByName(CONFIG.SUMMARY_NAME);
  if (!summarySheet) {
    summarySheet = ss.insertSheet(CONFIG.SUMMARY_NAME);
  }

  summarySheet.clear();
  summarySheet.getRange('A1').setValue('illuminate 2026 — Live Registration Dashboard')
    .setFontSize(16).setFontWeight('bold').setFontColor('#ff5a1f');

  summarySheet.getRange('A3:B8').setFontSize(11);
  summarySheet.getRange('A3').setValue('Total Registrations Submitted:').setFontWeight('bold');
  summarySheet.getRange('B3').setFormula('="ILLUMINATE REGISTRATIONS"!COUNTA(A2:A)');

  summarySheet.getRange('A4').setValue('Verified Registrations:').setFontWeight('bold');
  summarySheet.getRange('B4').setFormula('="ILLUMINATE REGISTRATIONS"!COUNTIF(N:N, "Verified")');

  summarySheet.getRange('A5').setValue('Pending Verification:').setFontWeight('bold');
  summarySheet.getRange('B5').setFormula('="ILLUMINATE REGISTRATIONS"!COUNTIF(N:N, "Pending Verification")');

  summarySheet.getRange('A6').setValue('Total Confirmed Collections (INR):').setFontWeight('bold');
  summarySheet.getRange('B6').setFormula('="ILLUMINATE REGISTRATIONS"!COUNTIF(N:N, "Verified") * ' + CONFIG.FEE_AMOUNT);

  summarySheet.getRange('A7').setValue('Tickets Emailed:').setFontWeight('bold');
  summarySheet.getRange('B7').setFormula('="ILLUMINATE REGISTRATIONS"!COUNTIF(Q:Q, "Yes")');

  summarySheet.getRange('A8').setValue('Attended / Checked-in:').setFontWeight('bold');
  summarySheet.getRange('B8').setFormula('="ILLUMINATE REGISTRATIONS"!COUNTIF(T:T, "Checked In")');

  summarySheet.setColumnWidth(1, 280);
  summarySheet.setColumnWidth(2, 140);

  // Re-link formulas with exact sheet name
  summarySheet.getRange('B3').setFormula('=COUNTA(\'' + CONFIG.SHEET_NAME + '\'!A2:A)');
  summarySheet.getRange('B4').setFormula('=COUNTIF(\'' + CONFIG.SHEET_NAME + '\'!N:N, "Verified")');
  summarySheet.getRange('B5').setFormula('=COUNTIF(\'' + CONFIG.SHEET_NAME + '\'!N:N, "Pending Verification")');
  summarySheet.getRange('B6').setFormula('=COUNTIF(\'' + CONFIG.SHEET_NAME + '\'!N:N, "Verified") * ' + CONFIG.FEE_AMOUNT);
  summarySheet.getRange('B7').setFormula('=COUNTIF(\'' + CONFIG.SHEET_NAME + '\'!Q:Q, "Yes")');
  summarySheet.getRange('B8').setFormula('=COUNTIF(\'' + CONFIG.SHEET_NAME + '\'!T:T, "Checked In")');

  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(sheet);
}

/* ------------------------------ HELPERS ------------------------------ */

function targetSpreadsheet() {
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error('Script must be attached to a Google Spreadsheet (Extensions > Apps Script).');
}

function parseRequestBody(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Empty POST request body');
  }
  return JSON.parse(e.postData.contents);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function findExistingRow(sheet, regId, email) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;

  var ids = sheet.getRange(2, COL.REG_ID, lastRow - 1, 1).getValues();
  var emails = sheet.getRange(2, COL.EMAIL, lastRow - 1, 1).getValues();

  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === String(regId).trim()) return i + 2;
    if (email && String(emails[i][0]).trim().toLowerCase() === String(email).trim().toLowerCase()) return i + 2;
  }
  return 0;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Trigger: Automatically dispatches the Official Ticket Pass with Entry QR Code
 * when an organizer manually changes the Status column to 'Verified' in Google Sheets.
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var sheet = e.range.getSheet();
    if (sheet.getName() !== CONFIG.SHEET_NAME) return;

    var row = e.range.getRow();
    var col = e.range.getColumn();

    // If edit occurred in Column 14 (Status)
    if (col === COL.STATUS && row > 1) {
      var newStatus = String(e.value || sheet.getRange(row, COL.STATUS).getValue()).trim();
      var ticketSent = String(sheet.getRange(row, COL.TICKET_SENT).getValue()).trim();

      if (newStatus === 'Verified' && ticketSent !== 'Yes') {
        var userEmail = Session.getActiveUser().getEmail() || 'Admin';
        sheet.getRange(row, COL.VERIFIER).setValue(userEmail);
        sendTicketEmailForRow(sheet, row);
      }
    }
  } catch (err) {
    console.log('onEdit error: ' + err.message);
  }
}

