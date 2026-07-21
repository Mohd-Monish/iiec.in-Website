/**
 * ================================================================
 * Google Apps Script - Innovation & Startup Expo 2026 Backend
 * Database: Google Spreadsheet ("Startup Registrations" sheet)
 * Features:
 * - autoSetup(): Initializes sheet, headers, styling, freezing & formatting
 * - Email Duplicate check
 * - Concurrency Lock management
 * - JSON and Form-Encoded POST support
 * ================================================================
 * 
 * INSTRUCTIONS:
 * 1. Open your Google Spreadsheet for Startup Expo Registrations.
 * 2. Go to Extensions > Apps Script.
 * 3. Replace all code in Code.gs with this script.
 * 4. Run `autoSetup()` once from the Apps Script menu to format your Google Sheet.
 * 5. Click Deploy > New deployment.
 * 6. Select "Web app", Execute as "Me", Access "Anyone".
 * 7. Paste the Web App URL into the action attribute of startup-expo.html!
 */

var SHEET_NAME = "Startup Registrations";
var HEADERS = [
  "Timestamp",
  "Full Name",
  "Email Address",
  "Phone Number",
  "Department",
  "Year",
  "Enrollment Number",
  "Startup Name",
  "Startup Stage",
  "Startup Category",
  "Website",
  "Description",
  "Team Size",
  "Need Funding"
];

/**
 * Run this function once manually from the script editor to set up the Google Sheet automatically.
 */
function autoSetup() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = doc.insertSheet(SHEET_NAME);
  }
  
  // Set headers if empty or missing
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  } else {
    var existingHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    for (var i = 0; i < HEADERS.length; i++) {
      if (!existingHeaders[i]) {
        sheet.getRange(1, i + 1).setValue(HEADERS[i]);
      }
    }
  }

  // Format Header Row
  var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setBackground("#BB3012");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setFontFamily("Roboto");
  headerRange.setFontSize(10);
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setRowHeight(1, 35);
  
  // Freeze Header Row
  sheet.setFrozenRows(1);
  
  // Auto-resize columns for clean view
  for (var c = 1; c <= HEADERS.length; c++) {
    sheet.setColumnWidth(c, 160);
  }
  
  Logger.log("Sheet '%s' successfully configured!", SHEET_NAME);
  return "Auto Setup Complete for " + SHEET_NAME;
}

/**
 * Handles incoming POST requests from the website form submission
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // 10s concurrency protection

    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheetByName(SHEET_NAME);

    // Auto setup sheet if not created yet
    if (!sheet || sheet.getLastRow() === 0) {
      autoSetup();
      sheet = doc.getSheetByName(SHEET_NAME);
    }

    // Parse parameters from JSON body or URLSearchParams
    var params = {};
    if (e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch (err) {
        params = e.parameter || {};
      }
    } else {
      params = e.parameter || {};
    }

    var name = params.name || "";
    var email = (params.email || "").toString().trim();
    var phone = params.phone || "";
    var department = params.department || "";
    var year = params.year || "";
    var enrollment = params.enrollment || "";
    var startupName = params.startup_name || "";
    var stage = params.stage || "";
    var category = params.category || "";
    var website = params.website || "";
    var description = params.description || "";
    var teamSize = params.team_size || "";
    var needFunding = params.need_funding || "";
    var timestamp = new Date();

    // Prevent duplicate registrations by Email
    if (email !== "") {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var existingEmail = (data[i][2] || "").toString().trim().toLowerCase();
        if (existingEmail === email.toLowerCase()) {
          lock.releaseLock();
          return responseJSON({
            "result": "error",
            "message": "Email already registered for Startup Expo!"
          });
        }
      }
    }

    // Append entry row
    sheet.appendRow([
      timestamp,
      name,
      email,
      phone,
      department,
      year,
      enrollment,
      startupName,
      stage,
      category,
      website,
      description,
      teamSize,
      needFunding
    ]);

    lock.releaseLock();

    return responseJSON({
      "result": "success",
      "message": "Registration successful!"
    });

  } catch (error) {
    if (lock) lock.releaseLock();
    return responseJSON({
      "result": "error",
      "error": error.toString()
    });
  }
}

/**
 * GET status endpoint
 */
function doGet(e) {
  return responseJSON({
    "status": "online",
    "service": "IIEC Innovation & Startup Expo 2026 API Backend",
    "timestamp": new Date().toISOString()
  });
}

/**
 * Helper to build JSON output
 */
function responseJSON(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
