/* ================================================================
   TECHASTRA — Volunteer Registration
   Google Apps Script for Spreadsheet + Auto-Email
   
   HOW TO SET UP:
   ──────────────
   1. Go to https://sheets.google.com and create a NEW blank spreadsheet
   2. Name it "TechAstra Volunteer Registrations" (or whatever you like)
   3. Go to Extensions → Apps Script
   4. Delete any existing code in the editor
   5. Paste this ENTIRE script
   6. Click the Save button (or Ctrl+S)
   7. Click "Deploy" → "New Deployment"
   8. Click the gear icon next to "Select type" → choose "Web app"
   9. Set:
      - Description: "TechAstra Volunteer Form"
      - Execute as: "Me"
      - Who has access: "Anyone"
   10. Click "Deploy"
   11. Authorize the app when prompted (click through the warnings)
   12. Copy the Web App URL
   13. Paste it in js/techastra.js where it says YOUR_TECHASTRA_APPS_SCRIPT_URL_HERE
   
   That's it! The columns will be auto-created on first submission.
   ================================================================ */

// ── Auto-setup: Create headers on the active sheet ──────────────
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Volunteers');
  
  if (!sheet) {
    // Rename the first sheet to "Volunteers"
    sheet = ss.getSheets()[0];
    sheet.setName('Volunteers');
  }
  
  const headers = [
    'Timestamp',
    'Full Name',
    'Department',
    'Academic Year',
    'Roll Number',
    'Mobile',
    'Email',
    'Volunteer Roles',
    'Skills',
    'Why Volunteer',
    'Experience',
    'Status'
  ];
  
  // Set headers in Row 1
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  
  // Format headers
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1a1a2e');
  headerRange.setFontColor('#00d4ff');
  headerRange.setHorizontalAlignment('center');
  headerRange.setFontSize(11);
  
  // Freeze the header row
  sheet.setFrozenRows(1);
  
  // Set column widths
  sheet.setColumnWidth(1, 180);  // Timestamp
  sheet.setColumnWidth(2, 180);  // Full Name
  sheet.setColumnWidth(3, 160);  // Department
  sheet.setColumnWidth(4, 120);  // Academic Year
  sheet.setColumnWidth(5, 140);  // Roll Number
  sheet.setColumnWidth(6, 140);  // Mobile
  sheet.setColumnWidth(7, 220);  // Email
  sheet.setColumnWidth(8, 280);  // Volunteer Roles
  sheet.setColumnWidth(9, 220);  // Skills
  sheet.setColumnWidth(10, 300); // Why Volunteer
  sheet.setColumnWidth(11, 220); // Experience
  sheet.setColumnWidth(12, 100); // Status
  
  // Add data validation for Status column (dropdown)
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['New', 'Reviewed', 'Selected', 'Contacted', 'Rejected'], true)
    .setAllowInvalid(false)
    .build();
  // Apply to rows 2–500
  sheet.getRange(2, 12, 499, 1).setDataValidation(statusRule);
  
  // Add conditional formatting for Status
  const rules = sheet.getConditionalFormatRules();
  
  // "Selected" → green background
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Selected')
    .setBackground('#d4edda')
    .setFontColor('#155724')
    .setRanges([sheet.getRange('L2:L500')])
    .build());
  
  // "Rejected" → red background
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Rejected')
    .setBackground('#f8d7da')
    .setFontColor('#721c24')
    .setRanges([sheet.getRange('L2:L500')])
    .build());
  
  // "Contacted" → blue background
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Contacted')
    .setBackground('#cce5ff')
    .setFontColor('#004085')
    .setRanges([sheet.getRange('L2:L500')])
    .build());
  
  // "Reviewed" → yellow background
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Reviewed')
    .setBackground('#fff3cd')
    .setFontColor('#856404')
    .setRanges([sheet.getRange('L2:L500')])
    .build());
  
  sheet.setConditionalFormatRules(rules);
  
  // Add a summary sheet
  let summarySheet = ss.getSheetByName('Summary');
  if (!summarySheet) {
    summarySheet = ss.insertSheet('Summary');
  }
  
  // Summary headers
  summarySheet.getRange('A1').setValue('TechAstra Volunteer Dashboard').setFontSize(16).setFontWeight('bold').setFontColor('#00d4ff');
  summarySheet.getRange('A3').setValue('Total Registrations:').setFontWeight('bold');
  summarySheet.getRange('B3').setFormula('=COUNTA(Volunteers!A:A)-1');
  summarySheet.getRange('A4').setValue('Selected:').setFontWeight('bold');
  summarySheet.getRange('B4').setFormula('=COUNTIF(Volunteers!L:L,"Selected")');
  summarySheet.getRange('A5').setValue('Reviewed:').setFontWeight('bold');
  summarySheet.getRange('B5').setFormula('=COUNTIF(Volunteers!L:L,"Reviewed")');
  summarySheet.getRange('A6').setValue('New (Pending):').setFontWeight('bold');
  summarySheet.getRange('B6').setFormula('=COUNTIF(Volunteers!L:L,"New")');
  
  summarySheet.getRange('A8').setValue('By Academic Year:').setFontWeight('bold').setFontSize(12);
  summarySheet.getRange('A9').setValue('First Year:').setFontWeight('bold');
  summarySheet.getRange('B9').setFormula('=COUNTIF(Volunteers!D:D,"FY")');
  summarySheet.getRange('A10').setValue('Second Year:').setFontWeight('bold');
  summarySheet.getRange('B10').setFormula('=COUNTIF(Volunteers!D:D,"SY")');
  summarySheet.getRange('A11').setValue('Third Year:').setFontWeight('bold');
  summarySheet.getRange('B11').setFormula('=COUNTIF(Volunteers!D:D,"TY")');
  summarySheet.getRange('A12').setValue('Final Year:').setFontWeight('bold');
  summarySheet.getRange('B12').setFormula('=COUNTIF(Volunteers!D:D,"Final")');
  
  summarySheet.setColumnWidth(1, 200);
  summarySheet.setColumnWidth(2, 100);
  
  SpreadsheetApp.getUi().alert('Setup complete! Sheet is ready to receive TechAstra volunteer registrations.');
}

// ── Handle POST requests from the website form ──────────────────
function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Volunteers');
    
    // Auto-setup if sheet doesn't exist or has no headers
    if (!sheet || sheet.getLastRow() === 0) {
      setupSheet();
      sheet = ss.getSheetByName('Volunteers');
    }
    
    // Parse the incoming data
    const data = JSON.parse(e.postData.contents);
    
    // Format the timestamp
    const timestamp = data.timestamp 
      ? new Date(data.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    
    // Append the row
    sheet.appendRow([
      timestamp,
      data.fullName || '',
      data.department || '',
      data.academicYear || '',
      data.rollNumber || '',
      data.mobile || '',
      data.email || '',
      data.volunteerRoles || '',
      data.skills || '',
      data.whyVolunteer || '',
      data.experience || '',
      'New'  // Default status
    ]);
    
    // Send confirmation email
    try {
      sendConfirmationEmail(data);
    } catch (emailErr) {
      // Log email error but don't fail the registration
      console.log('Email error: ' + emailErr.message);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', message: 'Registration recorded' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Handle GET requests (for testing) ────────────────────────────
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'TechAstra Volunteer Registration API is running.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Confirmation email ───────────────────────────────────────────
function sendConfirmationEmail(data) {
  if (!data.email) return;
  
  const subject = 'TechAstra — Volunteer Application Received';
  
  const htmlBody = `
    <div style="font-family: 'Courier New', Consolas, monospace; max-width: 600px; margin: 0 auto; background: #05070f; color: #c0caf0; overflow: hidden; border: 1px solid #00d4ff33;">
      
      <!-- Terminal Header Bar -->
      <div style="background: #0a0e1a; border-bottom: 1px solid #00d4ff33; padding: 10px 16px; display: flex; align-items: center;">
        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #ff5f57; margin-right: 6px;"></span>
        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #ffbd2e; margin-right: 6px;"></span>
        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #28c840; margin-right: 12px;"></span>
        <span style="color: #00d4ff88; font-size: 11px; letter-spacing: 1px;">techastra@csmu:~$ volunteer --status</span>
      </div>

      <!-- Hero Section -->
      <div style="background: linear-gradient(180deg, #0a1628 0%, #05070f 100%); padding: 40px 32px 32px; text-align: center; border-bottom: 1px solid #00d4ff22;">
        <div style="font-size: 11px; color: #00d4ff; letter-spacing: 6px; text-transform: uppercase; margin-bottom: 12px; font-family: 'Courier New', monospace;">[[ SYSTEM NOTIFICATION ]]</div>
        <h1 style="color: #fff; margin: 0; font-size: 38px; letter-spacing: 3px; font-weight: 800; font-family: 'Segoe UI', Arial, sans-serif;">TECH<span style="color: #00d4ff;">ASTRA</span></h1>
        <div style="width: 60px; height: 2px; background: linear-gradient(90deg, transparent, #00d4ff, transparent); margin: 14px auto 10px;"></div>
        <p style="color: #7c8bb8; margin: 0; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">The Largest Annual Tech Fest of CSMU</p>
      </div>
      
      <!-- Body -->
      <div style="padding: 32px 28px;">

        <!-- Status Log -->
        <div style="background: #0a0e1a; border: 1px solid #00d4ff22; padding: 16px 18px; margin-bottom: 24px;">
          <p style="color: #00d4ff88; font-size: 11px; margin: 0 0 8px; font-family: 'Courier New', monospace;">// volunteer_registration.log</p>
          <p style="color: #4ade80; font-size: 13px; margin: 0 0 4px; font-family: 'Courier New', monospace;">[SUCCESS] Application received</p>
          <p style="color: #7c8bb8; font-size: 12px; margin: 0; font-family: 'Courier New', monospace;">[TIMESTAMP] ${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}</p>
        </div>

        <p style="color: #c0caf0; line-height: 1.8; font-size: 15px; font-family: 'Segoe UI', Arial, sans-serif;">
          Hey <strong style="color: #00d4ff;">${data.fullName || 'there'}</strong>,
        </p>
        <p style="color: #8892b0; line-height: 1.8; font-size: 14px; font-family: 'Segoe UI', Arial, sans-serif;">
          Your volunteer application for <strong style="color: #00d4ff;">TechAstra</strong> has been <strong style="color: #4ade80;">successfully transmitted</strong> to our systems. Welcome aboard.
        </p>
        
        <!-- Application Data Block -->
        <div style="background: #0a0e1a; border: 1px solid #00d4ff22; padding: 20px; margin: 24px 0;">
          <div style="color: #00d4ff; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 14px; font-family: 'Courier New', monospace; border-bottom: 1px solid #00d4ff22; padding-bottom: 10px;">▸ APPLICATION DATA</div>
          <table style="width: 100%; font-size: 13px; color: #8892b0; border-collapse: collapse; font-family: 'Courier New', monospace;">
            <tr style="border-bottom: 1px solid #ffffff08;"><td style="padding: 8px 0; color: #00d4ff99; width: 42%;">name</td><td style="padding: 8px 0; color: #c0caf0;">${data.fullName || '-'}</td></tr>
            <tr style="border-bottom: 1px solid #ffffff08;"><td style="padding: 8px 0; color: #00d4ff99;">dept</td><td style="padding: 8px 0; color: #c0caf0;">${data.department || '-'}</td></tr>
            <tr style="border-bottom: 1px solid #ffffff08;"><td style="padding: 8px 0; color: #00d4ff99;">year</td><td style="padding: 8px 0; color: #c0caf0;">${data.academicYear || '-'}</td></tr>
            <tr style="border-bottom: 1px solid #ffffff08;"><td style="padding: 8px 0; color: #00d4ff99;">roll_no</td><td style="padding: 8px 0; color: #c0caf0;">${data.rollNumber || '-'}</td></tr>
            <tr><td style="padding: 8px 0; color: #00d4ff99;">roles[]</td><td style="padding: 8px 0; color: #c0caf0;">${data.volunteerRoles || '-'}</td></tr>
          </table>
        </div>
        
        <!-- WhatsApp CTA -->
        <div style="background: #0a1a12; border: 1px solid #25D36644; padding: 24px; margin: 24px 0; text-align: center;">
          <div style="color: #25D366; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; font-family: 'Courier New', monospace;">▸ PRIORITY ACTION REQUIRED</div>
          <p style="color: #c0caf0; font-size: 15px; margin: 0 0 6px; font-weight: 700; font-family: 'Segoe UI', Arial, sans-serif;">Join the Volunteer WhatsApp Group</p>
          <p style="color: #7c8bb8; font-size: 13px; margin: 0 0 18px; line-height: 1.6; font-family: 'Segoe UI', Arial, sans-serif;">Updates, task assignments, meetings & behind-the-scenes access.</p>
          <a href="https://chat.whatsapp.com/LKfRXSRsxfmFho4sQ8XhwF" target="_blank" style="display: inline-block; background: #25D366; color: #fff; text-decoration: none; padding: 13px 30px; font-weight: 700; font-size: 14px; letter-spacing: 1px; font-family: 'Courier New', monospace; border: none;">[ JOIN GROUP → ]</a>
        </div>

        <!-- Next Steps -->
        <div style="background: #0a0e1a; border: 1px solid #00d4ff22; padding: 20px; margin: 24px 0;">
          <div style="color: #00d4ff; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 14px; font-family: 'Courier New', monospace; border-bottom: 1px solid #00d4ff22; padding-bottom: 10px;">▸ NEXT STEPS</div>
          <table style="width: 100%; font-size: 13px; color: #8892b0; border-collapse: collapse; font-family: 'Segoe UI', Arial, sans-serif;">
            <tr><td style="padding: 8px 0; width: 24px; vertical-align: top; color: #00d4ff; font-family: 'Courier New', monospace;">01</td><td style="padding: 8px 0 8px 10px;"><strong style="color: #c0caf0;">Join WhatsApp Group</strong> <span style="color: #7c8bb8;">— tap the green button above</span></td></tr>
            <tr><td style="padding: 8px 0; vertical-align: top; color: #00d4ff; font-family: 'Courier New', monospace;">02</td><td style="padding: 8px 0 8px 10px;"><strong style="color: #c0caf0;">Follow on Instagram</strong> <span style="color: #7c8bb8;">— get real-time announcements</span></td></tr>
            <tr><td style="padding: 8px 0; vertical-align: top; color: #00d4ff; font-family: 'Courier New', monospace;">03</td><td style="padding: 8px 0 8px 10px;"><strong style="color: #c0caf0;">Await confirmation</strong> <span style="color: #7c8bb8;">— our team will reach out soon</span></td></tr>
          </table>
        </div>
        
        <!-- Social Follow -->
        <div style="text-align: center; margin: 24px 0;">
          <p style="color: #7c8bb8; font-size: 12px; margin: 0 0 14px; letter-spacing: 1px; text-transform: uppercase; font-family: 'Courier New', monospace;">// follow for updates</p>
          <a href="https://www.instagram.com/techastra.csmu" target="_blank" style="display: inline-block; background: transparent; color: #00d4ff; text-decoration: none; padding: 10px 22px; font-weight: 700; font-size: 13px; margin: 0 4px 8px; border: 1px solid #00d4ff44; font-family: 'Courier New', monospace; letter-spacing: 0.5px;">@techastra.csmu</a>
          <a href="https://www.instagram.com/iiec.csmu" target="_blank" style="display: inline-block; background: transparent; color: #7c3aed; text-decoration: none; padding: 10px 22px; font-weight: 700; font-size: 13px; margin: 0 4px 8px; border: 1px solid #7c3aed44; font-family: 'Courier New', monospace; letter-spacing: 0.5px;">@iiec.csmu</a>
        </div>
        
        <!-- Spam Warning -->
        <div style="background: #1a0a0a; border: 1px solid #ff5f5733; padding: 14px 18px; margin: 24px 0; text-align: center;">
          <p style="color: #ff5f57; font-weight: 700; font-size: 12px; margin: 0 0 4px; font-family: 'Courier New', monospace; letter-spacing: 1px;">[WARNING] EMAIL DELIVERY</p>
          <p style="color: #7c8bb8; font-size: 12px; margin: 0; line-height: 1.5; font-family: 'Segoe UI', Arial, sans-serif;">Can't find this email? Check <strong style="color:#c0caf0;">Spam / Junk</strong> and mark as <strong style="color:#c0caf0;">"Not Spam"</strong> for future updates.</p>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background: #0a0e1a; border-top: 1px solid #00d4ff22; padding: 20px 28px; text-align: center;">
        <p style="color: #00d4ff66; font-size: 11px; margin: 0 0 4px; font-weight: 600; font-family: 'Courier New', monospace; letter-spacing: 2px;">TECHASTRA × IIEC</p>
        <p style="color: #4a5578; font-size: 11px; margin: 0; font-family: 'Segoe UI', Arial, sans-serif;">
          Incubation, Innovation & Entrepreneurship Cell | CSMU<br>
          <a href="https://iiec.in" style="color: #00d4ff88; text-decoration: none; font-family: 'Courier New', monospace;">iiec.in</a>
        </p>
      </div>
    </div>
  `;
  
  MailApp.sendEmail({
    to: data.email,
    subject: subject,
    htmlBody: htmlBody,
    name: 'TechAstra — IIEC',
    replyTo: 'ecell-student-rep@csmu.ac.in'
  });
}

// ── Run this function FIRST to set up the spreadsheet ────────────
// Go to the Apps Script editor, select "setupSheet" from the 
// function dropdown, and click the Run button.
// This will auto-create all columns, formatting, and the summary sheet.
