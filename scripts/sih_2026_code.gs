/**
 * ============================================================================
 * Google Apps Script — CSMU SIH 2026 Internal Hackathon Backend & Dashboard
 * File: sih_2026_code.gs
 * ============================================================================
 * 
 * INSTRUCTIONS TO SET UP GOOGLE SHEETS & DASHBOARD:
 * 
 * 1. Create a new Google Sheet (or open an existing one).
 * 2. In the top menu, click: Extensions > Apps Script.
 * 3. Replace any code in Code.gs with this entire script and Save (Ctrl + S).
 * 4. At the top function dropdown, select `autoSetupSheet` and click "Run".
 *    - Grant permissions when prompted.
 *    - This will automatically create two sheets: "Registrations" & "Dashboard".
 *    - It will set up color-coded headers, widths, formulas, and KPI cards!
 * 5. Click "Deploy" (top right) > "New deployment".
 * 6. Choose type "Web app":
 *    - Description: SIH 2026 Backend
 *    - Execute as: Me (your Google account)
 *    - Who has access: Anyone (required for web form submissions)
 * 7. Click "Deploy" and copy the Web App URL (starts with https://script.google.com/macros/s/...).
 * 8. Paste that Web App URL into `js/sih-2026.js` at `var GOOGLE_SCRIPT_URL = '...'`.
 * ============================================================================
 */

var SHEET_REGISTRATIONS = "Registrations";
var SHEET_DASHBOARD = "Dashboard";

// Column Headers for all form fields
var HEADERS = [
  "Timestamp",
  "Registration ID",
  "Primary Email",
  "Team Name",
  "Team Leader Name",
  "Problem Category",
  "SIH Theme",
  "Problem ID",
  "Problem Title",
  "Brief Idea Title",
  "One-Line Definition",
  "Solution Summary",
  "Department Name",
  "Full-Time Students (Yes/No)",
  "Has Female Member (Yes/No)",
  "Is Multidisciplinary (Yes/No)",
  "Departments Represented",
  
  // Leader / Member 1
  "Leader Full Name",
  "Leader Enrollment",
  "Leader Gender",
  "Leader College Email",
  "Leader Mobile",
  "Leader Program",
  "Leader Year",
  
  // Member 2
  "Member 2 Full Name",
  "Member 2 Enrollment",
  "Member 2 Gender",
  "Member 2 College Email",
  "Member 2 Mobile",
  "Member 2 Program",
  "Member 2 Year",
  
  // Member 3
  "Member 3 Full Name",
  "Member 3 Enrollment",
  "Member 3 Gender",
  "Member 3 College Email",
  "Member 3 Mobile",
  "Member 3 Program",
  "Member 3 Year",
  
  // Member 4
  "Member 4 Full Name",
  "Member 4 Enrollment",
  "Member 4 Gender",
  "Member 4 College Email",
  "Member 4 Mobile",
  "Member 4 Program",
  "Member 4 Year",
  
  // Member 5
  "Member 5 Full Name",
  "Member 5 Enrollment",
  "Member 5 Gender",
  "Member 5 College Email",
  "Member 5 Mobile",
  "Member 5 Program",
  "Member 5 Year",
  
  // Member 6
  "Member 6 Full Name",
  "Member 6 Enrollment",
  "Member 6 Gender",
  "Member 6 College Email",
  "Member 6 Mobile",
  "Member 6 Program",
  "Member 6 Year",
  
  // Deliverables & Mentor
  "Pitch Deck Link",
  "GitHub/Drive Link",
  "Preferred Tracks",
  "Current Development Status",
  "Faculty Mentor Name",
  "Faculty Mentor Email",
  "Faculty Mentor Mobile",
  
  // Declarations
  "Student Declaration",
  "SIH Eligibility Declaration",
  "Hackathon Participation Consent",
  "Code of Conduct Agreed",
  "Intellectual Property Agreed",
  "Data Consent Agreed"
];

/**
 * AUTOMATIC SHEET & DASHBOARD SETUP FUNCTION
 * Run this function once from the Apps Script editor to initialize the spreadsheet.
 */
function autoSetupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // -------------------------------------------------------------
  // 1. Setup Registrations Sheet
  // -------------------------------------------------------------
  var regSheet = ss.getSheetByName(SHEET_REGISTRATIONS);
  if (!regSheet) {
    regSheet = ss.insertSheet(SHEET_REGISTRATIONS, 0);
  }
  
  // Write Header Row
  regSheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  
  // Style Header Row
  var headerRange = regSheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setBackground("#0F172A");
  headerRange.setFontColor("#FFB703");
  headerRange.setFontWeight("bold");
  headerRange.setFontFamily("Inter");
  headerRange.setFontSize(10);
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  
  regSheet.setRowHeight(1, 40);
  regSheet.setFrozenRows(1);
  regSheet.setFrozenColumns(4); // Freeze Registration ID & Team Name
  
  // -------------------------------------------------------------
  // 2. Setup Dashboard Sheet
  // -------------------------------------------------------------
  var dashSheet = ss.getSheetByName(SHEET_DASHBOARD);
  if (!dashSheet) {
    dashSheet = ss.insertSheet(SHEET_DASHBOARD, 1);
  }
  dashSheet.clear();
  
  // Dashboard Title Header
  dashSheet.getRange("A1:G1").merge();
  var titleRange = dashSheet.getRange("A1");
  titleRange.setValue("🏆 CSMU – SIH 2026 Internal Hackathon Analytics Dashboard");
  titleRange.setBackground("#0F172A");
  titleRange.setFontColor("#FFB703");
  titleRange.setFontWeight("bold");
  titleRange.setFontSize(16);
  titleRange.setHorizontalAlignment("center");
  dashSheet.setRowHeight(1, 48);
  
  // KPI Metrics Cards
  // Card 1: Total Registered Teams
  dashSheet.getRange("A3:B3").merge().setValue("TOTAL TEAMS REGISTERED").setFontWeight("bold").setBackground("#1E293B").setFontColor("#94A3B8").setHorizontalAlignment("center");
  dashSheet.getRange("A4:B4").merge().setFormula("=COUNTA(Registrations!B2:B)").setFontSize(22).setFontWeight("bold").setFontColor("#FFB703").setHorizontalAlignment("center");
  
  // Card 2: Teams with Female Member
  dashSheet.getRange("C3:D3").merge().setValue("FEMALE MEMBER COMPLIANT").setFontWeight("bold").setBackground("#1E293B").setFontColor("#94A3B8").setHorizontalAlignment("center");
  dashSheet.getRange("C4:D4").merge().setFormula('=COUNTIF(Registrations!O2:O, "Yes")').setFontSize(22).setFontWeight("bold").setFontColor("#10B981").setHorizontalAlignment("center");
  
  // Card 3: Multidisciplinary Teams
  dashSheet.getRange("E3:F3").merge().setValue("MULTIDISCIPLINARY TEAMS").setFontWeight("bold").setBackground("#1E293B").setFontColor("#94A3B8").setHorizontalAlignment("center");
  dashSheet.getRange("E4:F4").merge().setFormula('=COUNTIF(Registrations!P2:P, "Yes")').setFontSize(22).setFontWeight("bold").setFontColor("#00F2FE").setHorizontalAlignment("center");
  
  // Problem Category Summary Table
  dashSheet.getRange("A7:B7").setValues([["Problem Category", "Count"]]).setFontWeight("bold").setBackground("#0F172A").setFontColor("#FFF");
  var categories = [
    ["Official SIH 2026 Problem Statement"],
    ["Institute-Level Problem Statement"],
    ["Societal / State-Level Problem"],
    ["Student-Initiated Real-World Problem"]
  ];
  dashSheet.getRange("A8:A11").setValues(categories);
  dashSheet.getRange("B8").setFormula('=COUNTIF(Registrations!F2:F, A8)');
  dashSheet.getRange("B9").setFormula('=COUNTIF(Registrations!F2:F, A9)');
  dashSheet.getRange("B10").setFormula('=COUNTIF(Registrations!F2:F, A10)');
  dashSheet.getRange("B11").setFormula('=COUNTIF(Registrations!F2:F, A11)');
  
  // Development Status Summary Table
  dashSheet.getRange("D7:E7").setValues([["Development Status", "Count"]]).setFontWeight("bold").setBackground("#0F172A").setFontColor("#FFF");
  var statuses = [
    ["Idea Only"],
    ["Problem Identified + Initial Research"],
    ["Wireframe / UI Designed"],
    ["Prototype in Development"],
    ["Working Prototype"],
    ["Working Solution"]
  ];
  dashSheet.getRange("D8:D13").setValues(statuses);
  for (var k = 8; k <= 13; k++) {
    dashSheet.getRange("E" + k).setFormula('=COUNTIF(Registrations!BK2:BK, D' + k + ')');
  }

  // Set column widths for Dashboard
  dashSheet.setColumnWidth(1, 260);
  dashSheet.setColumnWidth(2, 100);
  dashSheet.setColumnWidth(3, 160);
  dashSheet.setColumnWidth(4, 280);
  dashSheet.setColumnWidth(5, 100);
  
  Logger.log("Auto Setup Complete! Registrations and Dashboard formatted successfully.");
  return "Auto Setup Complete for CSMU SIH 2026 Spreadsheet!";
}

/**
 * Handle HTTP POST requests from the website form.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(10000); // 10-second lock concurrency
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_REGISTRATIONS);
    if (!sheet) {
      autoSetupSheet();
      sheet = ss.getSheetByName(SHEET_REGISTRATIONS);
    }
    
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var timestamp = new Date();
    var regId = data.regId || ('CSMU-SIH26-' + Math.floor(10000 + Math.random() * 90000));
    var email = (data.email || '').toString().trim();
    var teamName = (data.team_name || '').toString().trim();
    var leaderName = (data.team_leader_name || data.member_1_name || '').toString().trim();
    var problemCategory = (data.problem_category || '').toString().trim();
    var sihTheme = (data.sih_theme || '').toString().trim();
    var problemId = (data.problem_id || '').toString().trim();
    var problemTitle = (data.problem_title || '').toString().trim();
    var ideaTitle = (data.idea_title || '').toString().trim();
    var problemDef = (data.problem_definition || '').toString().trim();
    var solutionSummary = (data.solution_summary || '').toString().trim();
    var deptName = (data.department_name || '').toString().trim();
    var allFulltime = (data.all_fulltime || 'Yes').toString().trim();
    var hasFemale = (data.has_female_member || 'Yes').toString().trim();
    var isMulti = (data.is_multidisciplinary || 'No').toString().trim();
    var deptsRep = Array.isArray(data.departments_represented) ? data.departments_represented.join(", ") : (data.departments_represented || '');

    // Member details array helper
    var rowValues = [
      timestamp,
      regId,
      email,
      teamName,
      leaderName,
      problemCategory,
      sihTheme,
      problemId,
      problemTitle,
      ideaTitle,
      problemDef,
      solutionSummary,
      deptName,
      allFulltime,
      hasFemale,
      isMulti,
      deptsRep
    ];

    // Append Members 1 to 6
    for (var m = 1; m <= 6; m++) {
      rowValues.push((data['member_' + m + '_name'] || '').toString().trim());
      rowValues.push((data['member_' + m + '_enrollment'] || '').toString().trim());
      rowValues.push((data['member_' + m + '_gender'] || '').toString().trim());
      rowValues.push((data['member_' + m + '_email'] || '').toString().trim());
      rowValues.push((data['member_' + m + '_mobile'] || '').toString().trim());
      rowValues.push((data['member_' + m + '_program'] || '').toString().trim());
      rowValues.push((data['member_' + m + '_year'] || '').toString().trim());
    }

    // Deliverables & Mentor
    rowValues.push((data.pitch_deck_link || '').toString().trim());
    rowValues.push((data.github_drive_link || '').toString().trim());
    var tracks = Array.isArray(data.preferred_track) ? data.preferred_track.join(", ") : (data.preferred_track || '');
    rowValues.push(tracks);
    rowValues.push((data.current_dev_status || '').toString().trim());
    rowValues.push((data.faculty_mentor_name || '').toString().trim());
    rowValues.push((data.faculty_mentor_email || '').toString().trim());
    rowValues.push((data.faculty_mentor_mobile || '').toString().trim());

    // Declarations
    rowValues.push(data.declaration_student || 'Agreed');
    rowValues.push(data.declaration_eligibility || 'Agreed');
    rowValues.push(data.declaration_participation || 'Agreed');
    rowValues.push(data.declaration_conduct || 'Agreed');
    rowValues.push(data.declaration_ip || 'Agreed');
    rowValues.push(data.declaration_data_consent || 'Agreed');

    sheet.appendRow(rowValues);
    
    return createJsonResponse({
      ok: true,
      registrationId: regId,
      teamName: teamName,
      message: "Registration recorded in Google Sheet successfully."
    });

  } catch (err) {
    return createJsonResponse({ ok: false, error: err.message });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Handle HTTP GET requests (Health Check & Setup Trigger)
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.setup === "true") {
    var res = autoSetupSheet();
    return createJsonResponse({ ok: true, message: res });
  }
  
  return createJsonResponse({
    ok: true,
    status: "online",
    message: "CSMU SIH 2026 Google Sheet Web App Service is active."
  });
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
