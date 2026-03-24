// ===============================================
// IIEC CERTIFICATE API - FINAL VERSION
// ===============================================
// Handles: Certificate Search & Verification
// Activity logging is handled separately by Activity Logger API
// ===============================================

// ⚙️ COLUMN CONFIGURATION - Matches your spreadsheet exactly
var COLUMN_MAP = {
  UID:       0,  // Column A: Certificate ID (e.g. EC-LOR-25-24C2)
  NAME:      1,  // Column B: Recipient Name
  DOC_TYPE:  2,  // Column C: Doc Type (Code) - e.g. LOA
  DOC_TITLE: 3,  // Column D: Doc Title (Display) - e.g. Letter of Appreciation
  EVENT:     4,  // Column E: Context / Event - e.g. NEC
  ROLE:      5,  // Column F: Role / Detail - e.g. Team Leader
  DATE:      6,  // Column G: Issue Date
  EMAIL:     7,  // Column H: Email
  STATUS:    8   // Column I: Status (Active/Revoked)
};

// ===============================================
// MAIN API HANDLER
// ===============================================
function doGet(e) {
  // Connection test (no parameters)
  if (!e || !e.parameter || Object.keys(e.parameter).length === 0) {
    return showDebugInfo();
  }

  var action = e.parameter.action;
  var idToVerify = e.parameter.id;
  var emailQuery = e.parameter.email;

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();

  // ----------------------------------------
  // MODE 1: SEARCH BY EMAIL
  // ----------------------------------------
  if (action === "search") {
    var foundCerts = [];
    var queryEmail = (emailQuery || "").toString().toLowerCase().trim();

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowEmail = (row[COLUMN_MAP.EMAIL] || "").toString().toLowerCase().trim();
      var status = (row[COLUMN_MAP.STATUS] || "").toString();

      if (rowEmail && rowEmail === queryEmail && status !== "Revoked") {
        foundCerts.push(formatResponse(row));
      }
    }

    return createJSON(foundCerts);
  }

  // ----------------------------------------
  // MODE 2: VERIFY BY ID
  // ----------------------------------------
  if (idToVerify) {
    var cleanID = (idToVerify || "").toString().trim();

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowID = (row[COLUMN_MAP.UID] || "").toString().trim();

      if (rowID === cleanID) {
        // Check if revoked
        var status = (row[COLUMN_MAP.STATUS] || "").toString();
        if (status === "Revoked") {
          return createJSON({
            valid: false,
            reason: "This certificate has been revoked."
          });
        }

        // Success - return certificate data
        var response = formatResponse(row);
        response.valid = true;
        return createJSON(response);
      }
    }

    // Not found
    return createJSON({
      valid: false,
      reason: "Certificate ID not found"
    });
  }

  return createJSON({ error: "Invalid request. Use ?id=XXX or ?action=search&email=XXX" });
}

// ===============================================
// FORMAT CERTIFICATE DATA
// ===============================================
function formatResponse(row) {
  return {
    uid:      (row[COLUMN_MAP.UID] || "").toString(),
    name:     (row[COLUMN_MAP.NAME] || "").toString(),
    docType:  (row[COLUMN_MAP.DOC_TYPE] || "").toString(),
    docTitle: (row[COLUMN_MAP.DOC_TITLE] || "Certificate").toString(),
    event:    (row[COLUMN_MAP.EVENT] || "IIEC Event").toString(),
    role:     (row[COLUMN_MAP.ROLE] || "Participant").toString(),
    date:     formatDate(row[COLUMN_MAP.DATE])
  };
}

// ===============================================
// FORMAT DATE
// ===============================================
function formatDate(dateObj) {
  if (!dateObj) return "";

  try {
    // If it's already a string like "15 Dec 2025", return as-is
    if (typeof dateObj === "string") {
      return dateObj;
    }

    var d = new Date(dateObj);
    if (isNaN(d.getTime())) return dateObj.toString();

    var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
  } catch (e) {
    return dateObj.toString();
  }
}

// ===============================================
// CREATE JSON RESPONSE
// ===============================================
function createJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===============================================
// DEBUG INFO (when opening API URL directly)
// ===============================================
function showDebugInfo() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var sheetName = sheet.getName();
  var firstRow = sheet.getRange(2, 1, 1, 9).getValues()[0];

  return ContentService.createTextOutput(
    "✅ IIEC CERTIFICATE API IS ONLINE\n\n" +
    "📋 Sheet: " + sheetName + "\n\n" +
    "📊 First Certificate (Row 2):\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "A - UID:       " + firstRow[0] + "\n" +
    "B - Name:      " + firstRow[1] + "\n" +
    "C - DocType:   " + firstRow[2] + "\n" +
    "D - DocTitle:  " + firstRow[3] + "\n" +
    "E - Event:     " + firstRow[4] + "\n" +
    "F - Role:      " + firstRow[5] + "\n" +
    "G - Date:      " + firstRow[6] + "\n" +
    "H - Email:     " + firstRow[7] + "\n" +
    "I - Status:    " + firstRow[8] + "\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
    "🔍 TEST ENDPOINTS:\n" +
    "• Verify: ?id=" + firstRow[0] + "\n" +
    "• Search: ?action=search&email=" + firstRow[7]
  );
}
