# GENESIS Registration — Google Apps Script Backend Setup

## Overview
This guide sets up:
1. **Google Spreadsheet** to store all registrations
2. **Auto-confirmation email** (HTML, mobile-friendly, matching IIEC theme)
3. **Web endpoint** that receives form data via `POST`

---

## Step 1: Create a Google Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet.
2. Rename it to **`GENESIS Registrations 2026`**
3. In **Row 1**, add these headers (exactly as written):

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| Timestamp | Full Name | Department | Academic Year | Roll Number | Mobile | Email | Interests | Other Interest |

4. Rename the sheet tab at the bottom to **`Registrations`**

---

## Step 2: Open Apps Script

1. In the spreadsheet, click **Extensions → Apps Script**
2. Delete any existing code in `Code.gs`
3. Paste the entire code from the section below

---

## Step 3: Paste This Code in `Code.gs`

```javascript
/* ================================================================
   GENESIS Registration — Google Apps Script
   Saves to Spreadsheet + Sends HTML Confirmation Email
   ================================================================ */

// ── Configuration ──────────────────────────────────────────────
const SHEET_NAME = 'Registrations';
const EMAIL_SUBJECT = 'GENESIS Registration Confirmed — IIEC';
const SENDER_NAME = 'IIEC — Innovation, Incubation & Entrepreneurship Cell';

// ── Web App Entry Point ────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Save to spreadsheet
    saveToSheet(data);

    // Send confirmation email
    sendConfirmationEmail(data);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', message: 'Registration recorded.' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Also handle GET for testing
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'GENESIS API is running.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Save to Spreadsheet ────────────────────────────────────────
function saveToSheet(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);

  sheet.appendRow([
    new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    data.fullName || '',
    data.department || '',
    data.academicYear || '',
    data.rollNumber || '',
    data.mobile || '',
    data.email || '',
    data.interests || '',
    data.otherInterest || ''
  ]);
}

// ── Send HTML Confirmation Email ───────────────────────────────
function sendConfirmationEmail(data) {
  if (!data.email) return;

  const htmlBody = getEmailHTML(data);

  MailApp.sendEmail({
    to: data.email,
    subject: EMAIL_SUBJECT,
    htmlBody: htmlBody,
    name: SENDER_NAME,
    replyTo: 'ecell-student-rep@csmu.ac.in'
  });
}

// ── HTML Email Template ────────────────────────────────────────
function getEmailHTML(data) {
  const yearMap = {
    'FY': 'First Year',
    'SY': 'Second Year',
    'TY': 'Third Year',
    'Final': 'Final Year'
  };
  const yearLabel = yearMap[data.academicYear] || data.academicYear;

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>GENESIS Registration Confirmed</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset */
    * { margin: 0; padding: 0; }
    body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }

    /* Base */
    body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: #05070f !important;
      width: 100% !important;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, Arial, Helvetica, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    /* Wrapper */
    .email-wrapper {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      background-color: #0a0e1a;
    }

    /* Header */
    .email-header {
      background: linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #0a0e1a 100%);
      padding: 40px 24px 32px;
      text-align: center;
      border-bottom: 1px solid rgba(255, 183, 3, 0.15);
    }

    .email-logo {
      width: 56px;
      height: 56px;
      margin-bottom: 16px;
    }

    .email-brand {
      font-size: 14px;
      color: #ffb703;
      letter-spacing: 3px;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .email-event-name {
      font-size: 36px;
      font-weight: 800;
      background: linear-gradient(135deg, #ffb703, #ff6b00);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: 6px;
      line-height: 1.2;
    }

    /* For email clients that don't support background-clip */
    .email-event-name-fallback {
      font-size: 36px;
      font-weight: 800;
      color: #ffb703;
      letter-spacing: 6px;
      line-height: 1.2;
    }

    .email-tagline {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 8px;
    }

    /* Confirmation Badge */
    .confirmed-badge {
      display: inline-block;
      background: rgba(34, 197, 94, 0.12);
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 24px;
      padding: 8px 20px;
      margin: 24px auto 0;
      color: #22c55e;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 1px;
    }

    /* Body */
    .email-body {
      padding: 32px 24px;
    }

    .greeting {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 8px;
    }

    .greeting-name {
      color: #ffb703;
    }

    .email-message {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.7);
      line-height: 1.7;
      margin-bottom: 28px;
    }

    /* Details Card */
    .details-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 28px;
    }

    .details-title {
      font-size: 13px;
      color: #ffb703;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 600;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .detail-row {
      padding: 10px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    .detail-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .detail-label {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
      display: block;
      margin-bottom: 4px;
    }

    .detail-value {
      font-size: 15px;
      color: #ffffff;
      font-weight: 500;
    }

    /* Event Info Card */
    .event-info-card {
      background: linear-gradient(135deg, rgba(255, 183, 3, 0.08), rgba(255, 107, 0, 0.05));
      border: 1px solid rgba(255, 183, 3, 0.15);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 28px;
    }

    .event-info-title {
      font-size: 13px;
      color: #ffb703;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 600;
      margin-bottom: 16px;
    }

    .event-info-row {
      display: flex;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .event-info-row:last-child {
      margin-bottom: 0;
    }

    .event-info-icon {
      font-size: 16px;
      margin-right: 10px;
      flex-shrink: 0;
      line-height: 1.5;
    }

    .event-info-text {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.8);
      line-height: 1.5;
    }

    .event-info-text strong {
      color: #ffffff;
    }

    /* Reminders */
    .reminders-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 28px;
    }

    .reminders-title {
      font-size: 13px;
      color: #ffb703;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 600;
      margin-bottom: 16px;
    }

    .reminder-item {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.65);
      line-height: 1.6;
      padding: 6px 0;
      padding-left: 20px;
      position: relative;
    }

    .reminder-item::before {
      content: '→';
      position: absolute;
      left: 0;
      color: #ffb703;
      font-weight: 700;
    }

    /* CTA Button */
    .cta-section {
      text-align: center;
      padding: 8px 0 16px;
    }

    .cta-btn {
      display: inline-block;
      background: linear-gradient(135deg, #ffb703, #ff8c00);
      color: #05070f !important;
      text-decoration: none !important;
      font-size: 15px;
      font-weight: 700;
      padding: 14px 36px;
      border-radius: 8px;
      letter-spacing: 0.5px;
    }

    /* Footer */
    .email-footer {
      background: rgba(0, 0, 0, 0.3);
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding: 28px 24px;
      text-align: center;
    }

    .footer-brand {
      font-size: 15px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 4px;
    }

    .footer-tagline {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.35);
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 16px;
    }

    .footer-links {
      margin-bottom: 16px;
    }

    .footer-link {
      display: inline-block;
      color: #ffb703;
      text-decoration: none;
      font-size: 12px;
      font-weight: 500;
      margin: 0 8px;
    }

    .footer-copy {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.25);
      line-height: 1.5;
    }

    .divider {
      height: 1px;
      background: linear-gradient(to right, transparent, rgba(255, 183, 3, 0.2), transparent);
      margin: 20px 0;
    }

    /* ── Mobile Responsive ────────────────────────────────── */
    @media only screen and (max-width: 480px) {
      .email-wrapper {
        width: 100% !important;
        min-width: 100% !important;
      }

      .email-header {
        padding: 32px 20px 24px !important;
      }

      .email-logo {
        width: 48px !important;
        height: 48px !important;
      }

      .email-event-name,
      .email-event-name-fallback {
        font-size: 28px !important;
        letter-spacing: 4px !important;
      }

      .email-body {
        padding: 24px 20px !important;
      }

      .greeting {
        font-size: 18px !important;
      }

      .details-card,
      .event-info-card,
      .reminders-card {
        padding: 18px !important;
      }

      .detail-value {
        font-size: 14px !important;
      }

      .cta-btn {
        padding: 12px 28px !important;
        font-size: 14px !important;
        display: block !important;
        text-align: center !important;
      }

      .email-footer {
        padding: 24px 20px !important;
      }

      .confirmed-badge {
        padding: 6px 16px !important;
        font-size: 12px !important;
      }
    }

    @media only screen and (max-width: 360px) {
      .email-event-name,
      .email-event-name-fallback {
        font-size: 24px !important;
        letter-spacing: 3px !important;
      }

      .email-header {
        padding: 24px 16px 20px !important;
      }

      .email-body {
        padding: 20px 16px !important;
      }

      .details-card,
      .event-info-card,
      .reminders-card {
        padding: 14px !important;
      }
    }

    /* Dark mode support for Apple Mail / Outlook */
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #05070f !important;
      }
      .email-wrapper {
        background-color: #0a0e1a !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#05070f;">

  <!-- Preheader text (hidden) -->
  <div style="display:none;font-size:1px;color:#05070f;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    Your GENESIS registration is confirmed! Here are your details for the IIEC Orientation 2026.
  </div>

  <!-- Email Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#05070f;">
    <tr>
      <td align="center" style="padding:20px 8px;">

        <!-- Email Wrapper -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-wrapper" style="background-color:#0a0e1a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">

          <!-- Header -->
          <tr>
            <td class="email-header" style="background:linear-gradient(135deg,#0a0e1a 0%,#111827 50%,#0a0e1a 100%);padding:40px 24px 32px;text-align:center;border-bottom:1px solid rgba(255,183,3,0.15);">
              <img src="https://iiec.in/assets/Logo/IIEC%20Logo.png" alt="IIEC" class="email-logo" width="56" height="56" style="width:56px;height:56px;margin-bottom:16px;display:inline-block;">
              <div class="email-brand" style="font-size:14px;color:#ffb703;letter-spacing:3px;text-transform:uppercase;font-weight:600;margin-bottom:8px;">IIEC PRESENTS</div>
              <!--[if mso]>
              <div class="email-event-name-fallback" style="font-size:36px;font-weight:800;color:#ffb703;letter-spacing:6px;line-height:1.2;">GENESIS</div>
              <![endif]-->
              <!--[if !mso]><!-->
              <div class="email-event-name" style="font-size:36px;font-weight:800;color:#ffb703;letter-spacing:6px;line-height:1.2;">GENESIS</div>
              <!--<![endif]-->
              <div class="email-tagline" style="font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:2px;text-transform:uppercase;margin-top:8px;">Where Vision Drives Venture</div>
              <div class="confirmed-badge" style="display:inline-block;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.3);border-radius:24px;padding:8px 20px;margin-top:24px;color:#22c55e;font-size:13px;font-weight:600;letter-spacing:1px;">✓ REGISTRATION CONFIRMED</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="email-body" style="padding:32px 24px;">

              <!-- Greeting -->
              <div class="greeting" style="font-size:20px;font-weight:700;color:#ffffff;margin-bottom:8px;">
                Hi <span class="greeting-name" style="color:#ffb703;">${data.fullName || 'there'}</span>,
              </div>
              <div class="email-message" style="font-size:14px;color:rgba(255,255,255,0.7);line-height:1.7;margin-bottom:28px;">
                Your registration for <strong style="color:#ffffff;">GENESIS — IIEC Orientation 2026</strong> has been successfully recorded. We're excited to have you join us for the beginning of your innovation journey!
              </div>

              <!-- Registration Details -->
              <div class="details-card" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:24px;margin-bottom:28px;">
                <div class="details-title" style="font-size:13px;color:#ffb703;text-transform:uppercase;letter-spacing:2px;font-weight:600;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.06);">Your Registration Details</div>

                <div class="detail-row" style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
                  <span class="detail-label" style="font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;font-weight:600;display:block;margin-bottom:4px;">Full Name</span>
                  <span class="detail-value" style="font-size:15px;color:#ffffff;font-weight:500;">${data.fullName || '—'}</span>
                </div>

                <div class="detail-row" style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
                  <span class="detail-label" style="font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;font-weight:600;display:block;margin-bottom:4px;">Department</span>
                  <span class="detail-value" style="font-size:15px;color:#ffffff;font-weight:500;">${data.department || '—'}</span>
                </div>

                <div class="detail-row" style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
                  <span class="detail-label" style="font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;font-weight:600;display:block;margin-bottom:4px;">Academic Year</span>
                  <span class="detail-value" style="font-size:15px;color:#ffffff;font-weight:500;">${yearLabel}</span>
                </div>

                <div class="detail-row" style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
                  <span class="detail-label" style="font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;font-weight:600;display:block;margin-bottom:4px;">Roll Number</span>
                  <span class="detail-value" style="font-size:15px;color:#ffffff;font-weight:500;">${data.rollNumber || '—'}</span>
                </div>

                <div class="detail-row" style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
                  <span class="detail-label" style="font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;font-weight:600;display:block;margin-bottom:4px;">Mobile</span>
                  <span class="detail-value" style="font-size:15px;color:#ffffff;font-weight:500;">${data.mobile || '—'}</span>
                </div>

                <div class="detail-row" style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
                  <span class="detail-label" style="font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;font-weight:600;display:block;margin-bottom:4px;">Email</span>
                  <span class="detail-value" style="font-size:15px;color:#ffffff;font-weight:500;">${data.email || '—'}</span>
                </div>

                <div class="detail-row" style="padding:10px 0;">
                  <span class="detail-label" style="font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;font-weight:600;display:block;margin-bottom:4px;">Areas of Interest</span>
                  <span class="detail-value" style="font-size:15px;color:#ffffff;font-weight:500;">${data.interests || '—'}${data.otherInterest ? ', ' + data.otherInterest : ''}</span>
                </div>
              </div>

              <!-- Event Info -->
              <div class="event-info-card" style="background:linear-gradient(135deg,rgba(255,183,3,0.08),rgba(255,107,0,0.05));border:1px solid rgba(255,183,3,0.15);border-radius:12px;padding:24px;margin-bottom:28px;">
                <div class="event-info-title" style="font-size:13px;color:#ffb703;text-transform:uppercase;letter-spacing:2px;font-weight:600;margin-bottom:16px;">Event Information</div>

                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="padding:6px 0;vertical-align:top;width:28px;">
                      <span style="font-size:16px;">📅</span>
                    </td>
                    <td style="padding:6px 0;font-size:14px;color:rgba(255,255,255,0.8);line-height:1.5;">
                      <strong style="color:#ffffff;">Date:</strong> To Be Announced (March 2026)
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;vertical-align:top;width:28px;">
                      <span style="font-size:16px;">🕐</span>
                    </td>
                    <td style="padding:6px 0;font-size:14px;color:rgba(255,255,255,0.8);line-height:1.5;">
                      <strong style="color:#ffffff;">Duration:</strong> 2 – 3 Hours
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;vertical-align:top;width:28px;">
                      <span style="font-size:16px;">📍</span>
                    </td>
                    <td style="padding:6px 0;font-size:14px;color:rgba(255,255,255,0.8);line-height:1.5;">
                      <strong style="color:#ffffff;">Venue:</strong> University Auditorium, CSMU
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;vertical-align:top;width:28px;">
                      <span style="font-size:16px;">🤝</span>
                    </td>
                    <td style="padding:6px 0;font-size:14px;color:rgba(255,255,255,0.8);line-height:1.5;">
                      <strong style="color:#ffffff;">In collaboration with</strong> GeeksforGeeks
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Reminders -->
              <div class="reminders-card" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:24px;margin-bottom:28px;">
                <div class="reminders-title" style="font-size:13px;color:#ffb703;text-transform:uppercase;letter-spacing:2px;font-weight:600;margin-bottom:16px;">Important Reminders</div>

                <div style="font-size:13px;color:rgba(255,255,255,0.65);line-height:1.6;padding:6px 0 6px 20px;position:relative;">
                  <span style="position:absolute;left:0;color:#ffb703;font-weight:700;">→</span>
                  Carry your <strong style="color:#ffffff;">College ID Card</strong> on the event day
                </div>
                <div style="font-size:13px;color:rgba(255,255,255,0.65);line-height:1.6;padding:6px 0 6px 20px;position:relative;">
                  <span style="position:absolute;left:0;color:#ffb703;font-weight:700;">→</span>
                  Entry is <strong style="color:#ffffff;">only after verification</strong> at the venue
                </div>
                <div style="font-size:13px;color:rgba(255,255,255,0.65);line-height:1.6;padding:6px 0 6px 20px;position:relative;">
                  <span style="position:absolute;left:0;color:#ffb703;font-weight:700;">→</span>
                  Arrive <strong style="color:#ffffff;">10–15 minutes early</strong> for a smooth check-in
                </div>
                <div style="font-size:13px;color:rgba(255,255,255,0.65);line-height:1.6;padding:6px 0 6px 20px;position:relative;">
                  <span style="position:absolute;left:0;color:#ffb703;font-weight:700;">→</span>
                  Event updates will be shared via <strong style="color:#ffffff;">WhatsApp or Email</strong>
                </div>
              </div>

              <!-- CTA -->
              <div class="cta-section" style="text-align:center;padding:8px 0 16px;">
                <a href="https://iiec.in/genesis" class="cta-btn" style="display:inline-block;background:linear-gradient(135deg,#ffb703,#ff8c00);color:#05070f;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:8px;letter-spacing:0.5px;">Visit IIEC Website</a>
              </div>

            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td>
              <div style="height:1px;background:linear-gradient(to right,transparent,rgba(255,183,3,0.2),transparent);margin:0 24px;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="email-footer" style="background:rgba(0,0,0,0.3);border-top:1px solid rgba(255,255,255,0.06);padding:28px 24px;text-align:center;">
              <div class="footer-brand" style="font-size:15px;font-weight:700;color:#ffffff;margin-bottom:4px;">IIEC</div>
              <div class="footer-tagline" style="font-size:10px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;">Where Vision Drives Venture</div>

              <div class="footer-links" style="margin-bottom:16px;">
                <a href="https://iiec.in" style="display:inline-block;color:#ffb703;text-decoration:none;font-size:12px;font-weight:500;margin:0 8px;">Website</a>
                <a href="https://instagram.com/iiec.csmu" style="display:inline-block;color:#ffb703;text-decoration:none;font-size:12px;font-weight:500;margin:0 8px;">Instagram</a>
                <a href="https://linkedin.com/company/iiec-csmu" style="display:inline-block;color:#ffb703;text-decoration:none;font-size:12px;font-weight:500;margin:0 8px;">LinkedIn</a>
                <a href="https://twitter.com/iiec_csmu" style="display:inline-block;color:#ffb703;text-decoration:none;font-size:12px;font-weight:500;margin:0 8px;">Twitter / X</a>
              </div>

              <div class="footer-copy" style="font-size:11px;color:rgba(255,255,255,0.25);line-height:1.5;">
                Innovation, Incubation & Entrepreneurship Cell<br>
                Chhatrapati Shivaji Maharaj University<br><br>
                © 2025 IIEC. All rights reserved.
              </div>
            </td>
          </tr>

        </table>
        <!-- End Email Wrapper -->

      </td>
    </tr>
  </table>

</body>
</html>
`;
}

// ── Test function (run manually in editor) ─────────────────────
function testEmail() {
  const testData = {
    fullName: 'Test Student',
    department: 'Computer Science',
    academicYear: 'SY',
    rollNumber: 'CS2024001',
    mobile: '9876543210',
    email: 'YOUR_EMAIL@gmail.com', // ← Replace with your email
    interests: 'Entrepreneurship, Technology',
    otherInterest: ''
  };

  sendConfirmationEmail(testData);
  Logger.log('Test email sent!');
}
```

---

## Step 4: Deploy as Web App

1. In Apps Script, click **Deploy → New deployment**
2. Click the gear icon next to "Select type" → choose **Web app**
3. Set:
   - **Description**: `GENESIS Registration v1`
   - **Execute as**: `Me (your-email@gmail.com)`
   - **Who has access**: `Anyone`
4. Click **Deploy**
5. **Authorize** the script when prompted (allow access to Spreadsheet and Gmail)
6. **Copy the Web App URL** — it will look like:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

---

## Step 5: Add the URL to Your Website

Open `js/genesis.js` and find this line near the top:

```javascript
const APPS_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL';
```

Replace `YOUR_GOOGLE_APPS_SCRIPT_URL` with the URL you copied in Step 4.

---

## Step 6: Test the Email

1. In Apps Script, find the `testEmail()` function
2. Replace `YOUR_EMAIL@gmail.com` with your actual email
3. Click **Run** (▶️ button)
4. Check your inbox for the confirmation email

---

## Step 7: Test the Full Flow

1. Open `genesis.html` in your browser
2. Fill out the registration form
3. Submit — it should:
   - ✅ Save to the Google Spreadsheet
   - ✅ Send a themed confirmation email
   - ✅ Show the success state on the page

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS / Network error | Make sure "Who has access" is set to **Anyone** |
| Email not received | Check spam folder. Also check Google's daily email quota (100/day for free accounts) |
| Data not appearing in sheet | Make sure the sheet tab is named exactly **`Registrations`** |
| Need to update code | After editing, go to **Deploy → Manage deployments → Edit (pencil icon) → New version → Deploy** |

---

## Daily Email Limits

- **Free Google account**: 100 emails/day
- **Google Workspace**: 1,500 emails/day

If you expect more registrations, consider batching notification emails or using a service like SendGrid.
