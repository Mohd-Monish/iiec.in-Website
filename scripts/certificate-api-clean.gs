// ===============================================
// IIEC CERTIFICATE API - CLEAN VERSION
// ===============================================
// This handles ONLY certificate search and verify
// Activity logging is handled by the separate Activity Logger API
// ===============================================

// ⚙️ COLUMN CONFIGURATION (A=0, B=1, C=2, etc.)
// UPDATE THESE TO MATCH YOUR SPREADSHEET!
var COLUMN_MAP = {
  UID:       0,  // Column A: The Certificate ID (e.g. EC-COP-...)
  NAME:      1,  // Column B: Student Name
  DOC_TYPE:  2,  // Column C: Type (e.g. LOR, Certificate)
  DOC_TITLE: 3,  // Column D: Full Title
  EVENT:     4,  // Column E: Event Name
  ROLE:      5,  // Column F: Role
  DATE:      6,  // Column G: Date
  EMAIL:     7,  // Column H: Email Address
  STATUS:    8   // Column I: Status (Active/Revoked)
};

// ===============================================
// MAIN ENTRY POINT
// ===============================================
function doGet(e) {
  // Connection test
  if (!e || !e.parameter || Object.keys(e.parameter).length === 0) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var firstRow = sheet.getRange(2, 1, 1, 9).getValues()[0];
    return ContentService.createTextOutput(
      "✅ CERTIFICATE API IS ONLINE\n\n" +
      "📋 DEBUG - First row data:\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      "Column A (UID):      '" + firstRow[0] + "'\n" +
      "Column B (NAME):     '" + firstRow[1] + "'\n" +
      "Column C (DOC_TYPE): '" + firstRow[2] + "'\n" +
      "Column D (DOC_TITLE):'" + firstRow[3] + "'\n" +
      "Column E (EVENT):    '" + firstRow[4] + "'\n" +
      "Column F (ROLE):     '" + firstRow[5] + "'\n" +
      "Column G (DATE):     '" + firstRow[6] + "'\n" +
      "Column H (EMAIL):    '" + firstRow[7] + "'\n" +
      "Column I (STATUS):   '" + firstRow[8] + "'\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
      "📝 Usage:\n" +
      "• Search: ?action=search&email=student@email.com\n" +
      "• Verify: ?id=EC-COP-XXXXX\n"
    );
  }

  var action = e.parameter.action;
  var idToVerify = e.parameter.id;
  var emailQuery = e.parameter.email;

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();

  // ----------------------------------------------------
  // MODE 1: SEARCH BY EMAIL (For Certificates Page)
  // ----------------------------------------------------
  if (action === "search") {
    var foundCerts = [];
    var queryEmail = (emailQuery || "").toString().toLowerCase().trim();

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowEmail = (row[COLUMN_MAP.EMAIL] || "").toString().toLowerCase().trim();
      var status = (row[COLUMN_MAP.STATUS] || "").toString().toLowerCase();

      if (rowEmail && rowEmail === queryEmail && status !== "revoked") {
        foundCerts.push(formatResponse(row));
      }
    }

    return createJSON(foundCerts);
  }

  // ----------------------------------------------------
  // MODE 2: VERIFY BY ID (For QR Code / Verify Page)
  // ----------------------------------------------------
  if (idToVerify) {
    var cleanID = (idToVerify || "").toString().trim();

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowID = (row[COLUMN_MAP.UID] || "").toString().trim();

      if (rowID === cleanID) {
        // Check if revoked
        var status = (row[COLUMN_MAP.STATUS] || "").toString().toLowerCase();
        if (status === "revoked") {
          return createJSON({
            valid: false,
            reason: "This certificate has been revoked.",
            uid: cleanID
          });
        }

        // Certificate found and valid
        var response = formatResponse(row);
        response.valid = true;
        return createJSON(response);
      }
    }

    // Certificate not found
    return createJSON({
      valid: false,
      reason: "Certificate not found",
      uid: cleanID
    });
  }

  return createJSON({ error: 'Invalid request. Use ?action=search&email=xxx or ?id=xxx' });
}

// ===============================================
// FORMAT RESPONSE
// Returns a properly structured certificate object
// ===============================================
function formatResponse(row) {
  return {
    uid:      getString(row[COLUMN_MAP.UID]),
    name:     getString(row[COLUMN_MAP.NAME]),
    docType:  getString(row[COLUMN_MAP.DOC_TYPE]),
    docTitle: getString(row[COLUMN_MAP.DOC_TITLE]) || 'Certificate',
    event:    getString(row[COLUMN_MAP.EVENT]) || 'IIEC Event',
    role:     getString(row[COLUMN_MAP.ROLE]) || 'Participant',
    date:     formatDate(row[COLUMN_MAP.DATE]),
    email:    getString(row[COLUMN_MAP.EMAIL])
  };
}

// ===============================================
// HELPER FUNCTIONS
// ===============================================

// Safely convert any value to string
function getString(value) {
  if (value === null || value === undefined) return '';
  return value.toString().trim();
}

// Format date to readable string
function formatDate(dateObj) {
  if (!dateObj) return '';

  try {
    var d;

    // If it's already a Date object
    if (dateObj instanceof Date) {
      d = dateObj;
    } else {
      // Try to parse as date string
      d = new Date(dateObj);
    }

    // Check if valid date
    if (isNaN(d.getTime())) {
      return dateObj.toString();
    }

    var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();

  } catch (e) {
    return dateObj.toString();
  }
}

// Create JSON response with CORS headers
function createJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===============================================
// DEBUG FUNCTION - Run this to test your setup
// ===============================================
function debugColumnMapping() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var headers = sheet.getRange(1, 1, 1, 10).getValues()[0];
  var firstDataRow = sheet.getRange(2, 1, 1, 10).getValues()[0];

  Logger.log("=== COLUMN MAPPING DEBUG ===");
  Logger.log("");
  Logger.log("Headers in your spreadsheet:");
  for (var i = 0; i < headers.length; i++) {
    Logger.log("Column " + String.fromCharCode(65 + i) + " (index " + i + "): '" + headers[i] + "'");
  }

  Logger.log("");
  Logger.log("First data row:");
  Logger.log("UID (col " + COLUMN_MAP.UID + "):      '" + firstDataRow[COLUMN_MAP.UID] + "'");
  Logger.log("NAME (col " + COLUMN_MAP.NAME + "):     '" + firstDataRow[COLUMN_MAP.NAME] + "'");
  Logger.log("DOC_TYPE (col " + COLUMN_MAP.DOC_TYPE + "): '" + firstDataRow[COLUMN_MAP.DOC_TYPE] + "'");
  Logger.log("DOC_TITLE (col " + COLUMN_MAP.DOC_TITLE + "):'" + firstDataRow[COLUMN_MAP.DOC_TITLE] + "'");
  Logger.log("EVENT (col " + COLUMN_MAP.EVENT + "):    '" + firstDataRow[COLUMN_MAP.EVENT] + "'");
  Logger.log("ROLE (col " + COLUMN_MAP.ROLE + "):     '" + firstDataRow[COLUMN_MAP.ROLE] + "'");
  Logger.log("DATE (col " + COLUMN_MAP.DATE + "):     '" + firstDataRow[COLUMN_MAP.DATE] + "'");
  Logger.log("EMAIL (col " + COLUMN_MAP.EMAIL + "):    '" + firstDataRow[COLUMN_MAP.EMAIL] + "'");
  Logger.log("STATUS (col " + COLUMN_MAP.STATUS + "):   '" + firstDataRow[COLUMN_MAP.STATUS] + "'");

  Logger.log("");
  Logger.log("=== If any values show blank when they shouldn't, update COLUMN_MAP ===");
}
