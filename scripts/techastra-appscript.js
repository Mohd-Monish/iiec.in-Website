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
   6. Click the 💾 Save button (or Ctrl+S)
   7. Click "Deploy" → "New Deployment"
   8. Click the gear icon ⚙️ next to "Select type" → choose "Web app"
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
  
  SpreadsheetApp.getUi().alert('✅ Setup complete! Sheet is ready to receive TechAstra volunteer registrations.');
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
  
  const subject = '🚀 TechAstra Volunteer Application Received!';
  
  const htmlBody = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0d18; color: #f5f7ff; border-radius: 16px; overflow: hidden; border: 1px solid rgba(0,212,255,0.15);">
      
      <!-- Header with gradient -->
      <div style="background: linear-gradient(135deg, #00d4ff 0%, #7c3aed 50%, #00d4ff 100%); padding: 40px 32px; text-align: center;">
        <div style="font-size: 14px; color: rgba(255,255,255,0.85); letter-spacing: 4px; text-transform: uppercase; margin-bottom: 8px;">🚀 Welcome to the Team</div>
        <h1 style="color: #fff; margin: 0; font-size: 36px; letter-spacing: -1px; font-weight: 800;">TECHASTRA</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 15px;">The Largest Annual Tech Fest of CSMU</p>
      </div>
      
      <!-- Body -->
      <div style="padding: 36px 32px;">
        <h2 style="color: #00d4ff; margin: 0 0 16px; font-size: 22px;">Hey ${data.fullName || 'there'}! 👋</h2>
        <p style="color: #b0b8d0; line-height: 1.8; font-size: 15px;">
          Thank you for registering as a volunteer for <strong style="color: #00d4ff;">TechAstra</strong>! 🎉 Your application has been <strong style="color: #4ade80;">successfully received</strong> and recorded.
        </p>
        <p style="color: #b0b8d0; line-height: 1.8; font-size: 15px;">
          You're now one step closer to being part of the biggest tech fest on campus!
        </p>
        
        <!-- Application Summary Card -->
        <div style="background: linear-gradient(135deg, rgba(0,212,255,0.08), rgba(124,58,237,0.08)); border: 1px solid rgba(0,212,255,0.2); border-radius: 14px; padding: 24px; margin: 28px 0;">
          <h3 style="color: #f5f7ff; margin: 0 0 16px; font-size: 17px;">📋 Your Application Summary</h3>
          <table style="width: 100%; font-size: 14px; color: #b0b8d0; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);"><td style="padding: 10px 0; color: #00d4ff; font-weight: 600; width: 40%;">👤 Name</td><td style="padding: 10px 0;">${data.fullName || '-'}</td></tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);"><td style="padding: 10px 0; color: #00d4ff; font-weight: 600;">🏛️ Department</td><td style="padding: 10px 0;">${data.department || '-'}</td></tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);"><td style="padding: 10px 0; color: #00d4ff; font-weight: 600;">📅 Year</td><td style="padding: 10px 0;">${data.academicYear || '-'}</td></tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);"><td style="padding: 10px 0; color: #00d4ff; font-weight: 600;">🆔 Roll Number</td><td style="padding: 10px 0;">${data.rollNumber || '-'}</td></tr>
            <tr><td style="padding: 10px 0; color: #00d4ff; font-weight: 600;">🎯 Preferred Roles</td><td style="padding: 10px 0;">${data.volunteerRoles || '-'}</td></tr>
          </table>
        </div>
        
        <!-- WhatsApp CTA -->
        <div style="background: linear-gradient(135deg, rgba(37,211,102,0.12), rgba(37,211,102,0.04)); border: 1px solid rgba(37,211,102,0.3); border-radius: 14px; padding: 24px; margin: 28px 0; text-align: center;">
          <div style="font-size: 32px; margin-bottom: 8px;">💬</div>
          <h3 style="color: #25D366; margin: 0 0 8px; font-size: 18px;">Join the Volunteer WhatsApp Group</h3>
          <p style="color: #b0b8d0; font-size: 14px; margin: 0 0 18px; line-height: 1.6;">Stay connected with the team for updates, task assignments, meetings, and all the behind-the-scenes action!</p>
          <a href="https://chat.whatsapp.com/LKfRXSRsxfmFho4sQ8XhwF" target="_blank" style="display: inline-block; background: #25D366; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-weight: 700; font-size: 15px; letter-spacing: 0.3px;">✅ Join WhatsApp Group</a>
        </div>

        <!-- What's Next -->
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; margin: 28px 0;">
          <h3 style="color: #f5f7ff; margin: 0 0 16px; font-size: 17px;">⚡ What's Next?</h3>
          <table style="width: 100%; font-size: 14px; color: #b0b8d0; border-collapse: collapse;">
            <tr><td style="padding: 8px 12px 8px 0; vertical-align: top; width: 30px; font-size: 18px;">1️⃣</td><td style="padding: 8px 0;"><strong style="color: #f5f7ff;">Join the WhatsApp Group</strong> — Click the green button above</td></tr>
            <tr><td style="padding: 8px 12px 8px 0; vertical-align: top; font-size: 18px;">2️⃣</td><td style="padding: 8px 0;"><strong style="color: #f5f7ff;">Follow us on Instagram</strong> — Stay updated with all announcements</td></tr>
            <tr><td style="padding: 8px 12px 8px 0; vertical-align: top; font-size: 18px;">3️⃣</td><td style="padding: 8px 0;"><strong style="color: #f5f7ff;">Wait for confirmation</strong> — Our team will review and reach out soon</td></tr>
          </table>
        </div>
        
        <!-- Social Follow -->
        <div style="text-align: center; margin: 28px 0;">
          <p style="color: #b0b8d0; font-size: 14px; margin: 0 0 14px;">Follow us for latest updates & announcements:</p>
          <a href="https://instagram.com/techastra.csmu" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 50px; font-weight: 700; font-size: 14px; margin: 0 6px 8px;">📸 @techastra.csmu</a>
          <a href="https://instagram.com/iiec.csmu" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 50px; font-weight: 700; font-size: 14px; margin: 0 6px 8px;">📸 @iiec.csmu</a>
        </div>
        
        <!-- Spam Warning -->
        <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 12px; padding: 16px 20px; margin: 24px 0; text-align: center;">
          <p style="color: #ff6b6b; font-weight: 700; font-size: 14px; margin: 0 0 6px;">⚠️ Can't find this email?</p>
          <p style="color: rgba(176,184,208,0.7); font-size: 13px; margin: 0; line-height: 1.5;">Check your <strong style="color:#f5f7ff;">Spam / Junk</strong> folder and mark this email as <strong style="color:#f5f7ff;">"Not Spam"</strong> to receive future updates from TechAstra.</p>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background: rgba(255,255,255,0.03); border-top: 1px solid rgba(255,255,255,0.08); padding: 24px 32px; text-align: center;">
        <p style="color: #888; font-size: 13px; margin: 0 0 4px; font-weight: 600;">TECHASTRA — The Largest Annual Tech Fest</p>
        <p style="color: #666; font-size: 12px; margin: 0;">
          Organized by IIEC — Incubation, Innovation & Entrepreneurship Cell | CSMU<br>
          <a href="https://iiec.in" style="color: #00d4ff; text-decoration: none;">iiec.in</a>
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
// function dropdown, and click the ▶️ Run button.
// This will auto-create all columns, formatting, and the summary sheet.
