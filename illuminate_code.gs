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
  SpreadsheetApp.getUi()
    .createMenu('illuminate Workshop')
    .addItem('Verify & Send Ticket (Selected Row)', 'verifyAndSendSelectedRow')
    .addItem('Send Tickets to ALL Verified (Unsent)', 'sendAllUnsentVerifiedTickets')
    .addSeparator()
    .addItem('Run Sheet Setup (Format & Formulas)', 'setupSheet')
    .addItem('Send Test Ticket Email to Me', 'testSendTicketToMyself')
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

      if (existingRow > 0) {
        // Update existing registration (e.g. UTR submitted in step 2)
        rowNumber = existingRow;
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
          data.utrNumber || '',
          data.utrNumber ? new Date() : '',
          'No', // Ticket Sent?
          '',   // Ticket Sent Timestamp
          '',   // Verified By
          'Not Checked In'
        ];

        sheet.getRange(rowNumber, 1, 1, rowValues.length).setValues([rowValues]);
      }

      // Optional organizer email alert
      if (CONFIG.NOTIFY_ADMIN) {
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
        regId: data.regId,
        message: 'Registration recorded successfully in database'
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
 * 1. Verification API & Direct Scan: ?action=verify&id=ILL-XXXXXX (or ?id=ILL-XXXXXX / ?verify=ILL-XXXXXX)
 *    - If format === 'json' (or action === 'verify'): returns live JSON payload from Google Sheet.
 *    - If opened directly in browser without json format: renders official HTML verification card.
 * 2. System Diagnostics: ?diag=true -> Health check & total count.
 */
function doGet(e) {
  var p = (e && e.parameter) || {};
  var verifyId = (p.id || p.verify || '').trim().toUpperCase();

  if (verifyId) {
    var record = findRegistrationById(verifyId);
    var isApi = (p.format === 'json' || p.action === 'verify' || p.api === 'true');

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
          message: 'Registration ID ' + verifyId + ' was not found in the official illuminate database.'
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

  return jsonResponse({
    ok: true,
    service: 'illuminate 2026 Backend',
    time: new Date().toISOString()
  });
}

/**
 * Searches the 'illuminate Registrations' sheet for a specific Registration ID
 */
function findRegistrationById(regId) {
  var ss = targetSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) return null;

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null;

  var data = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  for (var i = 0; i < data.length; i++) {
    var rowRegId = String(data[i][COL.REG_ID - 1]).trim().toUpperCase();
    if (rowRegId === regId) {
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
    body { margin:0; padding:24px 16px; background:#f5f5f0; font-family:'Inter',system-ui,sans-serif; color:#111; display:flex; justify-content:center; align-items:center; min-height:100vh; }
    .card { background:#fff; border:1px solid #d8d8d0; border-radius:18px; max-width:440px; width:100%; padding:32px 24px; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,0.06); }
    .tag { display:inline-block; background:#fee2e2; border:1px solid #fca5a5; color:#dc2626; font-size:11px; font-weight:800; padding:4px 12px; border-radius:999px; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:14px; }
    h1 { font-size:20px; font-weight:900; margin:0 0 10px; }
    p { font-size:13.5px; color:#666; line-height:1.55; margin:0 0 24px; }
    .btn { display:inline-block; background:#111; color:#fff; text-decoration:none; font-size:13px; font-weight:700; padding:12px 24px; border-radius:999px; }
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
  var statusColor = isVerified ? '#157f4a' : '#b45309';
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
    body { margin:0; padding:28px 16px; background:#f5f5f0; font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif; color:#111; display:flex; justify-content:center; align-items:center; min-height:100vh; }
    .card { background:#fff; border:1px solid #d8d8d0; border-radius:20px; max-width:460px; width:100%; padding:32px 26px; box-shadow:0 16px 40px rgba(17,17,17,0.08); text-align:center; }
    .top-pill { font-size:10.5px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; color:#ff5a1f; margin-bottom:8px; }
    .brand { font-size:22px; font-weight:900; letter-spacing:-0.5px; margin-bottom:18px; }
    .brand span { color:#ff5a1f; }
    .status-badge { display:inline-block; background:${statusBg}; border:1px solid ${statusBorder}; color:${statusColor}; font-size:12px; font-weight:800; padding:6px 16px; border-radius:999px; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:20px; }
    .name { font-size:22px; font-weight:900; color:#111; margin:0 0 4px; }
    .college { font-size:13.5px; font-weight:600; color:#666; margin:0 0 20px; }
    .grid { background:#fafaf7; border:1px solid #e8e8e0; border-radius:14px; padding:16px; text-align:left; display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:22px; font-size:12.5px; }
    .cell-label { font-size:10px; font-weight:700; text-transform:uppercase; color:#888; letter-spacing:0.5px; margin-bottom:2px; }
    .cell-val { font-size:13px; font-weight:800; color:#111; word-break:break-word; }
    .cell-accent { color:#ff5a1f; }
    .cell-green { color:#157f4a; }
    .meta-box { font-size:11.5px; color:#666; line-height:1.55; margin-bottom:24px; padding-top:14px; border-top:1px dashed #d8d8d0; }
    .btn-row { display:flex; gap:10px; justify-content:center; }
    .btn { display:inline-block; background:#111; color:#fff; text-decoration:none; font-size:12.5px; font-weight:700; padding:11px 22px; border-radius:999px; }
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
        <div class="cell-val cell-green">&#8377;${escapeHtml(record.fee)} (NEC Subsidized)</div>
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
 * Builds an ultra-crisp, mobile-responsive HTML email template.
 * Compatible with Gmail, Apple Mail, Outlook, iOS, and Android.
 */
function buildTicketEmailHtml(attendee, qrUrl) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>illuminate 2026 Pass</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5f5f0;padding:32px 14px;">
    <tr>
      <td align="center">
        <!-- Main Email Container (max 600px) -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:#ffffff;border:1px solid #d8d8d0;border-radius:18px;overflow:hidden;box-shadow:0 12px 32px rgba(17,17,17,0.06);">
          
          <!-- Top Accent Flame Bar -->
          <tr>
            <td style="height:4px;background-color:#ff5a1f;"></td>
          </tr>

          <!-- Header / Branding Bar -->
          <tr>
            <td style="padding:28px 32px 20px;background-color:#ffffff;text-align:center;border-bottom:1px solid #e8e8e0;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <div style="font-size:11px;font-weight:800;color:#ff5a1f;letter-spacing:1.8px;text-transform:uppercase;margin-bottom:6px;">
                      E-CELL IIT BOMBAY &times; IIEC CSMU
                    </div>
                    <div style="font-size:26px;font-weight:900;color:#111111;letter-spacing:-0.5px;line-height:1.2;">
                      illuminate <span style="color:#ff5a1f;">2026</span>
                    </div>
                    <div style="font-size:13px;color:#66665f;margin-top:4px;">
                      Entrepreneurship Workshop &bull; Chhatrapati Shivaji Maharaj University
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Confirmed Hero Banner -->
          <tr>
            <td style="padding:28px 32px 20px;text-align:center;">
              <div style="display:inline-block;background-color:#ecfdf5;border:1px solid #a7f3d0;padding:5px 16px;border-radius:999px;color:#157f4a;font-size:11.5px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:16px;">
                Payment Verified &bull; Seat Confirmed
              </div>
              <h1 style="color:#111111;font-size:22px;font-weight:900;margin:0 0 10px;line-height:1.3;letter-spacing:-0.03em;">
                Welcome to illuminate, ${escapeHtml(attendee.fullName)}!
              </h1>
              <p style="color:#66665f;font-size:14px;line-height:1.6;margin:0 auto;max-width:480px;">
                Your payment of &#8377;${attendee.fee} for the workshop has been verified. Here is your official registration confirmation and digital entry pass.
              </p>
            </td>
          </tr>

          <!-- Digital Pass Ticket Card (Deep Shell #111111) -->
          <tr>
            <td style="padding:0 28px 28px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#111111;color:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 12px 28px rgba(17,17,17,0.25);">
                <tr>
                  <td style="padding:24px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <!-- Left: Pass Metadata -->
                        <td valign="top" style="padding-right:16px;">
                          <div style="font-size:10.5px;color:#a1a1aa;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Registration ID</div>
                          <div style="font-size:20px;font-weight:900;color:#ff5a1f;margin-bottom:14px;letter-spacing:0.5px;">${escapeHtml(attendee.regId)}</div>

                          <div style="font-size:10.5px;color:#a1a1aa;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Attendee Name</div>
                          <div style="font-size:14px;font-weight:700;color:#ffffff;margin-bottom:14px;">${escapeHtml(attendee.fullName)}</div>

                          <div style="font-size:10.5px;color:#a1a1aa;text-transform:uppercase;letter-spacing:1px;font-weight:700;">College / Program</div>
                          <div style="font-size:13px;font-weight:600;color:#e4e4e7;margin-bottom:14px;">
                            ${escapeHtml(attendee.college)}<br>
                            <span style="font-size:12px;color:#a1a1aa;">${escapeHtml(attendee.course)} (${escapeHtml(attendee.year)})</span>
                          </div>

                          <div style="font-size:10.5px;color:#a1a1aa;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Fee Status</div>
                          <div style="font-size:13px;font-weight:700;color:#6ee7b7;">&#8377;${attendee.fee} (NEC Special Fee)</div>
                        </td>

                        <!-- Right: Entry QR Code -->
                        <td valign="top" align="center" style="width:130px;border-left:1px dashed rgba(255,255,255,0.15);padding-left:16px;">
                          <div style="background:#ffffff;padding:8px;border-radius:8px;display:inline-block;">
                            <img src="${qrUrl}" alt="Entry QR" width="110" height="110" style="display:block;border:0;">
                          </div>
                          <div style="font-size:10px;color:#ff986e;font-weight:800;letter-spacing:0.8px;margin-top:8px;text-align:center;">
                            SCAN AT VENUE
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Workshop Highlights & Venue -->
          <tr>
            <td style="padding:0 28px 20px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#fafaf7;border:1px solid #e8e8e0;border-radius:12px;padding:18px;">
                <tr>
                  <td>
                    <div style="font-size:13px;font-weight:800;color:#111111;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.06em;">
                      Event Details &amp; Venue
                    </div>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size:13px;color:#444440;line-height:1.7;">
                      <tr>
                        <td style="padding-bottom:6px;width:95px;color:#66665f;"><strong>Venue:</strong></td>
                        <td style="padding-bottom:6px;color:#111111;">Chhatrapati Shivaji Maharaj University (CSMU), Panvel, Navi Mumbai</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:6px;color:#66665f;"><strong>Format:</strong></td>
                        <td style="padding-bottom:6px;color:#111111;">1-Day Intensive Entrepreneurship Workshop</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:6px;color:#66665f;"><strong>Certification:</strong></td>
                        <td style="padding-bottom:6px;color:#ff5a1f;"><strong>Certified by E-Cell, IIT Bombay</strong></td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:6px;color:#66665f;"><strong>Takeaway:</strong></td>
                        <td style="padding-bottom:6px;color:#111111;">Startup Kit + Business Model Canvas</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Important Guidelines -->
          <tr>
            <td style="padding:0 28px 24px;">
              <div style="font-size:13px;font-weight:800;color:#111111;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.06em;">
                Important Attendee Guidelines
              </div>
              <ul style="margin:0;padding-left:18px;color:#66665f;font-size:13px;line-height:1.7;">
                <li>Please carry your valid <strong>College Photo ID Card</strong> along with this digital pass.</li>
                <li>Show the QR code on your mobile phone at the registration desk for seamless check-in.</li>
                <li>Your physical <strong>Startup Kit</strong> (featuring the Business Model Canvas) will be handed over at the venue.</li>
                <li>Participate in all sessions to receive your official <strong>E-Cell IIT Bombay Certificate of Participation</strong>.</li>
              </ul>
            </td>
          </tr>

          <!-- Email Delivery Notice -->
          <tr>
            <td style="padding:0 28px 24px;">
              <div style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;text-align:center;">
                <span style="color:#c78000;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;">Important Inbox Notice</span>
                <p style="color:#78350f;font-size:12px;margin:4px 0 0;line-height:1.5;">
                  If this email arrived in your <strong>Spam / Promotions</strong> folder, please click <strong>"Not Spam"</strong> to receive critical event updates.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 28px;background-color:#111111;color:#ffffff;text-align:center;">
              <div style="font-size:13px;font-weight:800;color:#ffffff;margin-bottom:4px;">
                Incubation, Innovation &amp; Entrepreneurship Cell (IIEC)
              </div>
              <div style="font-size:11.5px;color:#a1a1aa;line-height:1.6;">
                Chhatrapati Shivaji Maharaj University, Panvel, Navi Mumbai<br>
                Helpline: +91 94666 05579 &bull; <a href="https://iiec.in" style="color:#ff986e;text-decoration:none;">iiec.in</a> &bull; <a href="mailto:${CONFIG.REPLY_TO_EMAIL}" style="color:#ff986e;text-decoration:none;">${CONFIG.REPLY_TO_EMAIL}</a>
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

/* ------------------------------ MENU ACTIONS ------------------------------ */

/**
 * Menu action: Verifies and sends ticket email to the currently selected row
 */
function verifyAndSendSelectedRow() {
  var ss = targetSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  var cell = sheet.getActiveCell();
  var row = cell.getRow();

  if (row <= 1) {
    SpreadsheetApp.getUi().alert('Please select a student registration row (row 2 or below).');
    return;
  }

  var currentStatus = sheet.getRange(row, COL.STATUS).getValue();
  var attendeeName = sheet.getRange(row, COL.NAME).getValue();
  var attendeeEmail = sheet.getRange(row, COL.EMAIL).getValue();

  var ui = SpreadsheetApp.getUi();
  var response = ui.alert(
    'Confirm Verification',
    'Verify payment and send ticket email to:\n\n' +
    'Name: ' + attendeeName + '\n' +
    'Email: ' + attendeeEmail + '\n' +
    'Row: ' + row + '\n\nProceed?',
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    sheet.getRange(row, COL.STATUS).setValue('Verified');
    var userEmail = Session.getActiveUser().getEmail() || 'Admin';
    sheet.getRange(row, COL.VERIFIER).setValue(userEmail);

    try {
      sendTicketEmailForRow(sheet, row);
      ui.alert('Success! Ticket email has been sent to ' + attendeeEmail);
    } catch (err) {
      ui.alert('Error sending ticket email: ' + err.message);
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
    SpreadsheetApp.getUi().alert('No registrations found.');
    return;
  }

  var data = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  var sentCount = 0;
  var errors = [];

  for (var i = 0; i < data.length; i++) {
    var rowNum = i + 2;
    var status = String(data[i][COL.STATUS - 1]).trim();
    var ticketSent = String(data[i][COL.TICKET_SENT - 1]).trim();

    if (status === 'Verified' && ticketSent !== 'Yes') {
      try {
        sendTicketEmailForRow(sheet, rowNum);
        sentCount++;
      } catch (err) {
        errors.push('Row ' + rowNum + ': ' + err.message);
      }
    }
  }

  var msg = 'Sent ' + sentCount + ' ticket email(s).';
  if (errors.length > 0) {
    msg += '\n\nErrors encountered:\n' + errors.join('\n');
  }
  SpreadsheetApp.getUi().alert(msg);
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
