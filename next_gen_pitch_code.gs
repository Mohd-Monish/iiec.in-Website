/**
 * ============================================================================
 * Google Apps Script — Next Gen Pitch 2026 Registration Backend
 * File: next_gen_pitch_code.gs
 * ============================================================================
 * 
 * INSTRUCTIONS:
 * 1. Open your target Google Sheet where you want responses stored.
 * 2. In the top menu, click: Extensions > Apps Script.
 * 3. Delete any existing code in Code.gs, paste this entire script, and save (Ctrl+S).
 * 4. In the function dropdown at the top, select "autoSetup" and click "Run".
 *    (Grant authorization permissions when prompted. It will format your sheet).
 * 5. Click "Deploy" (top-right) > "New deployment".
 * 6. Click the gear icon next to "Select type" and choose "Web app".
 * 7. Set configuration:
 *    - Description: Next Gen Pitch Backend
 *    - Execute as: Me (your Google account)
 *    - Who has access: Anyone (required for web form submissions)
 * 8. Click "Deploy" and copy the Web App URL (ends in /exec).
 * 9. Paste that URL into `next_gen_pitch.html` at `var FORM_ENDPOINT = '...'`.
 * ============================================================================
 */

// Configuration
var SHEET_NAME = "Registrations";
var MANDATORY_REFERRAL_CODE = "NEC2661839";

// Column Headers
var HEADERS = [
  "Timestamp",
  "Team Name",
  "Team Size",
  "College / Organization",
  "City",
  "Eureka! Team ID",
  "Leader Name",
  "Leader Email",
  "Leader Phone",
  "Member 2 Name",
  "Member 2 Email",
  "Member 2 Phone",
  "Member 3 Name",
  "Member 3 Email",
  "Member 3 Phone",
  "Consent Confirmed",
  "Referral Code",
  "Submission Time (ISO)",
  "Source Page",
  "User Agent"
];

/**
 * Run this function once from the Apps Script editor.
 * Automatically formats the active sheet with headers, colors, fonts, and column widths.
 */
function autoSetup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.getActiveSheet();
    sheet.setName(SHEET_NAME);
  }
  
  // Set headers in Row 1
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  
  // Style the Header Row
  var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setBackground("#111111");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setFontFamily("Inter");
  headerRange.setFontSize(10);
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  headerRange.setWrap(true);
  
  sheet.setRowHeight(1, 38);
  sheet.setFrozenRows(1);
  
  // Format Timestamp column
  sheet.getRange("A:A").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  
  // Set optimal column widths
  var widths = [160, 180, 85, 220, 140, 150, 180, 220, 140, 170, 210, 130, 170, 210, 130, 130, 130, 190, 180, 200];
  for (var i = 0; i < widths.length; i++) {
    sheet.setColumnWidth(i + 1, widths[i]);
  }
  
  Logger.log("Auto setup complete! Sheet '%s' formatted successfully.", SHEET_NAME);
  return "Auto Setup Complete for " + SHEET_NAME;
}

/**
 * Handles incoming POST requests from the website form submission.
 * Saves response directly into this Google Sheet.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  
  try {
    // 10-second concurrency lock to handle simultaneous submissions safely
    lock.waitLock(10000);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    
    // Auto-setup if sheet is uninitialized
    if (!sheet || sheet.getLastRow() === 0) {
      autoSetup();
      sheet = ss.getSheetByName(SHEET_NAME) || ss.getActiveSheet();
    }
    
    // Parse incoming JSON or form data
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }
    
    // Extract sanitized form values
    var teamName = (data.teamName || "").toString().trim();
    var memberCount = parseInt(data.memberCount, 10) || 1;
    var college = (data.college || "").toString().trim();
    var city = (data.city || "").toString().trim();
    var eurekaId = (data.eurekaId || "").toString().trim().toUpperCase();
    
    // Leader info
    var leaderName = (data.leaderName || "").toString().trim();
    var leaderEmail = (data.leaderEmail || "").toString().trim().toLowerCase();
    var leaderPhone = (data.leaderPhone || "").toString().trim();
    
    // Member 2 info
    var member2Name = memberCount >= 2 ? (data.member2Name || "").toString().trim() : "";
    var member2Email = memberCount >= 2 ? (data.member2Email || "").toString().trim().toLowerCase() : "";
    var member2Phone = memberCount >= 2 ? (data.member2Phone || "").toString().trim() : "";
    
    // Member 3 info
    var member3Name = memberCount >= 3 ? (data.member3Name || "").toString().trim() : "";
    var member3Email = memberCount >= 3 ? (data.member3Email || "").toString().trim().toLowerCase() : "";
    var member3Phone = memberCount >= 3 ? (data.member3Phone || "").toString().trim() : "";
    
    // Metadata
    var consent = data.consent || "Yes";
    var referralCode = MANDATORY_REFERRAL_CODE;
    var submittedAt = data.submittedAt || new Date().toISOString();
    var sourcePage = data.page || "";
    var userAgent = data.userAgent || "";
    
    // Validation check
    if (!teamName || !leaderName || !leaderEmail || !leaderPhone || !eurekaId) {
      return createJsonResponse({
        ok: false,
        error: "Missing required fields. Please fill in Team Name, Leader details, and Eureka! ID."
      });
    }
    
    // Check for duplicate submissions (matching Eureka! ID or Leader Email)
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var existingData = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
      for (var i = 0; i < existingData.length; i++) {
        var existingEureka = (existingData[i][5] || "").toString().trim().toUpperCase();
        var existingEmail = (existingData[i][7] || "").toString().trim().toLowerCase();
        
        if ((eurekaId && existingEureka === eurekaId) || (leaderEmail && existingEmail === leaderEmail)) {
          return createJsonResponse({
            ok: true,
            duplicate: true,
            message: "This team or email is already registered."
          });
        }
      }
    }
    
    // Append row directly into this sheet
    var timestamp = new Date();
    var rowData = [
      timestamp,
      teamName,
      memberCount,
      college,
      city,
      eurekaId,
      leaderName,
      leaderEmail,
      leaderPhone,
      member2Name,
      member2Email,
      member2Phone,
      member3Name,
      member3Email,
      member3Phone,
      consent,
      referralCode,
      submittedAt,
      sourcePage,
      userAgent
    ];
    
    sheet.appendRow(rowData);
    var insertedRow = sheet.getLastRow();
    sheet.getRange(insertedRow, 1, 1, rowData.length).setVerticalAlignment("middle");
    
    return createJsonResponse({
      ok: true,
      duplicate: false,
      message: "Registration successfully recorded in sheet.",
      teamName: teamName,
      eurekaId: eurekaId,
      row: insertedRow
    });
    
  } catch (err) {
    return createJsonResponse({
      ok: false,
      error: "Error saving registration: " + err.message
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Health-check endpoint for GET requests
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.setup === "true") {
    var result = autoSetup();
    return createJsonResponse({ ok: true, message: result });
  }
  
  return createJsonResponse({
    ok: true,
    status: "online",
    sheet: SHEET_NAME,
    message: "Next Gen Pitch 2026 Google Sheet Backend is running."
  });
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
