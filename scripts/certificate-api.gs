// ===============================================
// IIEC CERTIFICATE API WITH ACTIVITY LOGGING
// ===============================================

// ⚙️ COLUMN CONFIGURATION (A=0, B=1, C=2, etc.)
// Make sure your Google Sheet matches this order!
var COLUMN_MAP = {
  UID:       0,  // Column A: The Certificate ID (e.g. EC-LOR...)
  NAME:      1,  // Column B: Student Name
  DOC_TYPE:  2,  // Column C: Type (e.g. LOR, Certificate)
  DOC_TITLE: 3,  // Column D: Full Title (e.g. Letter of Recommendation)
  EVENT:     4,  // Column E: Event Name
  ROLE:      5,  // Column F: Role
  DATE:      6,  // Column G: Date
  EMAIL:     7,  // Column H: Email Address
  STATUS:    8   // Column I: Status (Active/Revoked)
};

// ⚙️ CONFIGURATION
var LOG_SHEET_NAME = 'ActivityLog';           // Activity log sheet name
var ADMIN_KEY = 'iiec-admin-2026';            // Secret key for dashboard access (CHANGE THIS!)

// ===============================================
// MAIN ENTRY POINT
// ===============================================
function doGet(e) {
  // 1. CONNECTION TEST (If you open the URL without parameters)
  if (!e || !e.parameter || Object.keys(e.parameter).length === 0) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var firstRow = sheet.getRange(2, 1, 1, 2).getValues()[0];
    return ContentService.createTextOutput(
      "✅ API IS ONLINE.\n\n" +
      "DEBUG INFO:\n" +
      "First ID in Sheet (Col A): '" + firstRow[0] + "'\n" +
      "First Name in Sheet (Col B): '" + firstRow[1] + "'\n\n" +
      "To test, add ?id=" + firstRow[0] + " to this URL."
    );
  }

  var action = e.parameter.action;
  var idToVerify = e.parameter.id;
  var emailQuery = e.parameter.email;
  var source = e.parameter.source || 'manual';
  var userAgent = e.parameter.ua ? decodeURIComponent(e.parameter.ua).substring(0, 200) : 'Unknown';

  // ----------------------------------------------------
  // DASHBOARD: GET STATISTICS (Protected)
  // ----------------------------------------------------
  if (action === 'stats' && e.parameter.key === ADMIN_KEY) {
    return handleStats();
  }

  // ----------------------------------------------------
  // DASHBOARD: GET ACTIVITY LOGS (Protected)
  // ----------------------------------------------------
  if (action === 'logs' && e.parameter.key === ADMIN_KEY) {
    var limit = parseInt(e.parameter.limit) || 100;
    var offset = parseInt(e.parameter.offset) || 0;
    var filter = e.parameter.filter || 'all';
    return handleLogs(limit, offset, filter);
  }

  // ----------------------------------------------------
  // LOG DOWNLOAD CLICK
  // ----------------------------------------------------
  if (action === 'logDownload' && e.parameter.uid) {
    logActivity('download', e.parameter.uid, e.parameter.name || '-', e.parameter.event || '-', 'clicked', 'certificates', userAgent, e.parameter.type || '');
    return createJSON({ success: true });
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();

  // ----------------------------------------------------
  // MODE 1: SEARCH BY EMAIL (For Certificates Page)
  // ----------------------------------------------------
  if (action === "search") {
    var foundCerts = [];
    var queryEmail = (emailQuery || "").toString().toLowerCase().trim();
    var firstName = '-';

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowEmail = (row[COLUMN_MAP.EMAIL] || "").toString().toLowerCase().trim();
      var status = (row[COLUMN_MAP.STATUS] || "").toString();

      if (rowEmail && rowEmail === queryEmail && status !== "Revoked") {
        if (firstName === '-') {
          firstName = (row[COLUMN_MAP.NAME] || '-').toString();
        }
        foundCerts.push(formatResponse(row));
      }
    }

    // Log the search
    var searchStatus = foundCerts.length > 0 ? 'found:' + foundCerts.length : 'not_found';
    var eventName = foundCerts.length > 0 ? foundCerts[0].event : '-';
    logActivity('search', emailQuery, firstName, eventName, searchStatus, 'certificates', userAgent);

    return createJSON(foundCerts);
  }

  // ----------------------------------------------------
  // MODE 2: VERIFY BY ID (For QR Code / Verify Page)
  // ----------------------------------------------------
  else if (idToVerify) {
    var cleanID = (idToVerify || "").toString().trim();

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowID = (row[COLUMN_MAP.UID] || "").toString().trim();

      if (rowID === cleanID) {
        var certName = (row[COLUMN_MAP.NAME] || '').toString();
        var certEvent = (row[COLUMN_MAP.EVENT] || 'IIEC Event').toString();

        // Check if revoked
        if (row[COLUMN_MAP.STATUS] === "Revoked") {
          logActivity('verify', cleanID, certName, certEvent, 'revoked', source, userAgent);
          return createJSON({ "valid": false, "reason": "This certificate has been revoked." });
        }

        // Success!
        var response = formatResponse(row);
        response.valid = true;

        logActivity('verify', cleanID, certName, certEvent, 'valid', source, userAgent);
        return createJSON(response);
      }
    }

    // Not found
    logActivity('verify', cleanID, '-', '-', 'not_found', source, userAgent);
    return createJSON({ "valid": false, "reason": "ID not found" });
  }

  return createJSON({ error: 'Invalid request' });
}

// ===============================================
// DASHBOARD HANDLERS
// ===============================================

function handleStats() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(LOG_SHEET_NAME);

  if (!logSheet) {
    return createJSON({ error: 'ActivityLog sheet not found. Run setupActivityLog() first.' });
  }

  var data = logSheet.getDataRange().getValues();
  if (data.length <= 1) {
    return createJSON({
      totalSearches: 0,
      totalVerifications: 0,
      totalDownloads: 0,
      uniqueEmails: 0,
      uniqueCertificates: 0,
      verificationsBySource: { qr: 0, manual: 0 },
      searchResults: { found: 0, notFound: 0 },
      todayStats: { searches: 0, verifications: 0, downloads: 0 },
      last7DaysActivity: []
    });
  }

  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var stats = {
    totalSearches: 0,
    totalVerifications: 0,
    totalDownloads: 0,
    uniqueEmails: {},
    uniqueCertificates: {},
    verificationsBySource: { qr: 0, manual: 0 },
    searchResults: { found: 0, notFound: 0 },
    todayStats: { searches: 0, verifications: 0, downloads: 0 },
    dailyActivity: {}
  };

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var timestamp = new Date(row[0]);
    var action = (row[1] || '').toString().toLowerCase();
    var identifier = (row[2] || '').toString();
    var status = (row[5] || '').toString().toLowerCase();
    var source = (row[6] || '').toString().toLowerCase();

    var dateKey = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd');

    if (!stats.dailyActivity[dateKey]) {
      stats.dailyActivity[dateKey] = { searches: 0, verifications: 0, downloads: 0 };
    }

    var isToday = timestamp >= today;

    if (action === 'search') {
      stats.totalSearches++;
      stats.dailyActivity[dateKey].searches++;
      if (isToday) stats.todayStats.searches++;

      if (identifier.indexOf('@') !== -1) {
        stats.uniqueEmails[identifier.toLowerCase()] = true;
      }

      if (status.indexOf('found') === 0) {
        stats.searchResults.found++;
      } else {
        stats.searchResults.notFound++;
      }
    } else if (action === 'verify') {
      stats.totalVerifications++;
      stats.dailyActivity[dateKey].verifications++;
      if (isToday) stats.todayStats.verifications++;

      stats.uniqueCertificates[identifier.toUpperCase()] = true;

      if (source === 'qr' || source === 'qr_scan') {
        stats.verificationsBySource.qr++;
      } else {
        stats.verificationsBySource.manual++;
      }
    } else if (action === 'download') {
      stats.totalDownloads++;
      stats.dailyActivity[dateKey].downloads++;
      if (isToday) stats.todayStats.downloads++;
    }
  }

  // Get last 7 days activity
  var last7Days = [];
  for (var j = 6; j >= 0; j--) {
    var d = new Date();
    d.setDate(d.getDate() - j);
    var dateKey = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var dayName = Utilities.formatDate(d, Session.getScriptTimeZone(), 'EEE');

    var dayData = stats.dailyActivity[dateKey] || { searches: 0, verifications: 0, downloads: 0 };
    last7Days.push({
      date: dateKey,
      day: dayName,
      searches: dayData.searches,
      verifications: dayData.verifications,
      downloads: dayData.downloads
    });
  }

  return createJSON({
    totalSearches: stats.totalSearches,
    totalVerifications: stats.totalVerifications,
    totalDownloads: stats.totalDownloads,
    uniqueEmails: Object.keys(stats.uniqueEmails).length,
    uniqueCertificates: Object.keys(stats.uniqueCertificates).length,
    verificationsBySource: stats.verificationsBySource,
    searchResults: stats.searchResults,
    todayStats: stats.todayStats,
    last7DaysActivity: last7Days,
    generatedAt: new Date().toISOString()
  });
}

function handleLogs(limit, offset, filter) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(LOG_SHEET_NAME);

  if (!logSheet) {
    return createJSON({ error: 'ActivityLog sheet not found', logs: [] });
  }

  var data = logSheet.getDataRange().getValues();
  if (data.length <= 1) {
    return createJSON({ logs: [], total: 0 });
  }

  var logs = [];
  for (var i = data.length - 1; i >= 1; i--) {
    var row = data[i];
    var action = (row[1] || '').toString().toLowerCase();

    if (filter !== 'all' && action !== filter) {
      continue;
    }

    logs.push({
      timestamp: row[0] ? new Date(row[0]).toISOString() : '',
      action: row[1] || '',
      identifier: row[2] || '',
      name: row[3] || '-',
      event: row[4] || '-',
      status: row[5] || '',
      source: row[6] || '',
      userAgent: row[7] || '-',
      certType: row[8] || ''
    });
  }

  var total = logs.length;
  var paginatedLogs = logs.slice(offset, offset + limit);

  return createJSON({
    logs: paginatedLogs,
    total: total,
    limit: limit,
    offset: offset,
    hasMore: (offset + limit) < total
  });
}

// ===============================================
// HELPER FUNCTIONS
// ===============================================

// Formats a row into a nice JSON object
function formatResponse(row) {
  return {
    "uid":      (row[COLUMN_MAP.UID] || '').toString(),
    "name":     (row[COLUMN_MAP.NAME] || '').toString(),
    "docType":  (row[COLUMN_MAP.DOC_TYPE] || '').toString(),
    "docTitle": (row[COLUMN_MAP.DOC_TITLE] || "Certificate").toString(),
    "event":    (row[COLUMN_MAP.EVENT] || "IIEC Event").toString(),
    "role":     (row[COLUMN_MAP.ROLE] || "Participant").toString(),
    "date":     formatDate(row[COLUMN_MAP.DATE])
  };
}

// Sends JSON response to browser
function createJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Formats Date objects to strings
function formatDate(dateObj) {
  if (!dateObj) return "";
  try {
    var d = new Date(dateObj);
    if (isNaN(d.getTime())) return dateObj.toString();

    var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
  } catch (e) {
    return dateObj.toString();
  }
}

// Log activity to the ActivityLog sheet
function logActivity(action, identifier, name, event, status, source, userAgent, certType) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName(LOG_SHEET_NAME);

    // Create sheet if it doesn't exist
    if (!logSheet) {
      logSheet = ss.insertSheet(LOG_SHEET_NAME);
      logSheet.appendRow([
        'Timestamp', 'Action', 'Identifier', 'Name', 'Event',
        'Status', 'Source', 'UserAgent', 'CertType'
      ]);
      logSheet.getRange(1, 1, 1, 9).setFontWeight('bold');
      logSheet.setFrozenRows(1);
    }

    logSheet.appendRow([
      new Date(),
      action || '',
      identifier || '',
      name || '-',
      event || '-',
      status || '',
      source || '',
      userAgent || '-',
      certType || ''
    ]);

  } catch (e) {
    Logger.log('Failed to log activity: ' + e.toString());
  }
}

// ===============================================
// SETUP FUNCTION - Run this once to create ActivityLog sheet
// ===============================================
function setupActivityLog() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(LOG_SHEET_NAME);

  if (!logSheet) {
    logSheet = ss.insertSheet(LOG_SHEET_NAME);
    logSheet.appendRow([
      'Timestamp', 'Action', 'Identifier', 'Name', 'Event',
      'Status', 'Source', 'UserAgent', 'CertType'
    ]);
    logSheet.getRange(1, 1, 1, 9).setFontWeight('bold');
    logSheet.setFrozenRows(1);

    // Set column widths
    logSheet.setColumnWidth(1, 160); // Timestamp
    logSheet.setColumnWidth(2, 80);  // Action
    logSheet.setColumnWidth(3, 200); // Identifier
    logSheet.setColumnWidth(4, 150); // Name
    logSheet.setColumnWidth(5, 150); // Event
    logSheet.setColumnWidth(6, 100); // Status
    logSheet.setColumnWidth(7, 100); // Source
    logSheet.setColumnWidth(8, 200); // UserAgent
    logSheet.setColumnWidth(9, 120); // CertType

    Logger.log('✅ ActivityLog sheet created successfully!');
  } else {
    Logger.log('ActivityLog sheet already exists.');
  }
}
