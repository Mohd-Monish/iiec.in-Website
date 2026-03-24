// ===============================================
// IIEC CERTIFICATE ACTIVITY LOGGER - DETAILED
// ===============================================
// Logs ALL activity with maximum detail
// ActivityLog sheet is in the SAME spreadsheet as your Certificates
//
// SETUP: Just run setupActivityLog() once - it does everything automatically!
// ===============================================

// ⚙️ CONFIGURATION - UPDATE THESE!
var CONFIG = {
  // Create a NEW Google Sheet for activity logs and paste its ID here
  // Find ID in URL: https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID_HERE/edit
  SPREADSHEET_ID: 'YOUR_ACTIVITY_LOG_SPREADSHEET_ID_HERE',

  LOG_SHEET_NAME: 'ActivityLog',              // Sheet name for logs
  SUMMARY_SHEET_NAME: 'Summary',              // Sheet name for summary stats
  ADMIN_KEY: 'iiec-admin-2026',               // Secret key for dashboard (CHANGE THIS!)
  MAX_LOGS_DISPLAY: 500,                      // Max logs to return in one request
  TIMEZONE: 'Asia/Kolkata'                    // Your timezone
};

// ===============================================
// AUTOMATIC SETUP - Run this ONCE
// ===============================================
function setupActivityLog() {
  // Validate config
  if (!CONFIG.SPREADSHEET_ID || CONFIG.SPREADSHEET_ID === 'YOUR_ACTIVITY_LOG_SPREADSHEET_ID_HERE') {
    Logger.log('❌ ERROR: Please set your SPREADSHEET_ID in CONFIG first!');
    Logger.log('1. Create a new Google Sheet for activity logs');
    Logger.log('2. Copy the ID from the URL: https://docs.google.com/spreadsheets/d/YOUR_ID_HERE/edit');
    Logger.log('3. Paste it in CONFIG.SPREADSHEET_ID');
    throw new Error('SPREADSHEET_ID not configured. See logs for instructions.');
  }

  var ss;
  try {
    ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  } catch (e) {
    Logger.log('❌ ERROR: Cannot open spreadsheet. Check if:');
    Logger.log('1. The SPREADSHEET_ID is correct');
    Logger.log('2. You have edit access to the spreadsheet');
    throw new Error('Cannot open spreadsheet: ' + e.message);
  }

  var logSheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);

  if (logSheet) {
    Logger.log('⚠️ ActivityLog sheet already exists. Skipping creation.');
    Logger.log('If you want to reset, delete the sheet manually and run this again.');
    return;
  }

  // Create new sheet
  logSheet = ss.insertSheet(CONFIG.LOG_SHEET_NAME);

  // Set headers
  var headers = [
    'Timestamp',           // A - When it happened
    'Date',                // B - Date only (for filtering)
    'Time',                // C - Time only
    'Action',              // D - verify/search/download
    'Identifier',          // E - Certificate ID or Email
    'Name',                // F - Person's name
    'Event',               // G - Event name
    'Certificate Type',    // H - Type of certificate
    'Status',              // I - valid/not_found/revoked/found:X
    'Source',              // J - manual/qr/certificates
    'Device Type',         // K - Desktop/Mobile/Tablet
    'Browser',             // L - Chrome/Firefox/Safari/etc
    'OS',                  // M - Windows/Mac/iOS/Android
    'User Agent',          // N - Full user agent string
    'Country',             // O - If available
    'Session ID',          // P - Random session identifier
    'Referrer',            // Q - Where they came from
    'Extra Data'           // R - Any additional JSON data
  ];

  logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Format header row
  var headerRange = logSheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#FFB703');
  headerRange.setFontColor('#000000');
  headerRange.setHorizontalAlignment('center');

  // Freeze header row
  logSheet.setFrozenRows(1);

  // Set column widths
  var columnWidths = {
    1: 180,   // Timestamp
    2: 100,   // Date
    3: 80,    // Time
    4: 90,    // Action
    5: 220,   // Identifier
    6: 180,   // Name
    7: 150,   // Event
    8: 130,   // Certificate Type
    9: 120,   // Status
    10: 100,  // Source
    11: 100,  // Device Type
    12: 100,  // Browser
    13: 100,  // OS
    14: 300,  // User Agent
    15: 80,   // Country
    16: 120,  // Session ID
    17: 150,  // Referrer
    18: 200   // Extra Data
  };

  for (var col in columnWidths) {
    logSheet.setColumnWidth(parseInt(col), columnWidths[col]);
  }

  // Add conditional formatting for Action column
  var actionRange = logSheet.getRange('D2:D1000');

  // Verify = Purple
  var verifyRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('verify')
    .setBackground('#E9D5FF')
    .setRanges([actionRange])
    .build();

  // Search = Blue
  var searchRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('search')
    .setBackground('#DBEAFE')
    .setRanges([actionRange])
    .build();

  // Download = Green
  var downloadRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('download')
    .setBackground('#D1FAE5')
    .setRanges([actionRange])
    .build();

  var rules = logSheet.getConditionalFormatRules();
  rules.push(verifyRule, searchRule, downloadRule);
  logSheet.setConditionalFormatRules(rules);

  // Add data validation for Action column
  var actionValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(['verify', 'search', 'download'], true)
    .setAllowInvalid(true)
    .build();
  logSheet.getRange('D2:D1000').setDataValidation(actionValidation);

  // Add filter
  logSheet.getRange(1, 1, 1, headers.length).createFilter();

  // Create summary sheet
  createSummarySheet(ss);

  Logger.log('✅ ActivityLog sheet created successfully!');
  Logger.log('✅ Summary sheet created successfully!');
  Logger.log('📊 Spreadsheet: ' + ss.getName());
  Logger.log('🔗 URL: ' + ss.getUrl());
}

// Create a summary/stats sheet
function createSummarySheet(ss) {
  var summarySheet = ss.getSheetByName('ActivitySummary');
  if (summarySheet) {
    ss.deleteSheet(summarySheet);
  }

  summarySheet = ss.insertSheet('ActivitySummary');

  // Title
  summarySheet.getRange('A1').setValue('📊 Certificate Activity Summary');
  summarySheet.getRange('A1').setFontSize(16).setFontWeight('bold');

  // Stats using COUNTIF formulas
  var stats = [
    ['', ''],
    ['Metric', 'Count'],
    ['Total Searches', '=COUNTIF(ActivityLog!D:D,"search")'],
    ['Total Verifications', '=COUNTIF(ActivityLog!D:D,"verify")'],
    ['Total Downloads', '=COUNTIF(ActivityLog!D:D,"download")'],
    ['', ''],
    ['Successful Searches', '=COUNTIF(ActivityLog!I:I,"found*")'],
    ['Failed Searches', '=COUNTIF(ActivityLog!I:I,"not_found")'],
    ['', ''],
    ['Valid Verifications', '=COUNTIF(ActivityLog!I:I,"valid")'],
    ['Invalid Verifications', '=COUNTIF(ActivityLog!I:I,"not_found")'],
    ['Revoked Certificates', '=COUNTIF(ActivityLog!I:I,"revoked")'],
    ['', ''],
    ['QR Code Scans', '=COUNTIF(ActivityLog!J:J,"qr")'],
    ['Manual Verifications', '=COUNTIF(ActivityLog!J:J,"manual")'],
    ['', ''],
    ['Mobile Users', '=COUNTIF(ActivityLog!K:K,"Mobile")'],
    ['Desktop Users', '=COUNTIF(ActivityLog!K:K,"Desktop")'],
    ['Tablet Users', '=COUNTIF(ActivityLog!K:K,"Tablet")'],
    ['', ''],
    ['Today\'s Activity', '=COUNTIF(ActivityLog!B:B,TODAY())'],
    ['This Week', '=COUNTIFS(ActivityLog!B:B,">="&(TODAY()-7))'],
    ['This Month', '=COUNTIFS(ActivityLog!B:B,">="&(TODAY()-30))']
  ];

  summarySheet.getRange(1, 1, stats.length, 2).setValues(stats);

  // Format
  summarySheet.getRange('A3:A24').setFontWeight('bold');
  summarySheet.getRange('B3:B24').setHorizontalAlignment('center');
  summarySheet.setColumnWidth(1, 200);
  summarySheet.setColumnWidth(2, 100);

  // Header row styling
  summarySheet.getRange('A3:B3').setBackground('#FFB703').setFontWeight('bold');
}

// ===============================================
// MAIN API ENTRY POINT
// ===============================================
function doGet(e) {
  // Connection test
  if (!e || !e.parameter || Object.keys(e.parameter).length === 0) {
    return ContentService.createTextOutput(
      "✅ ACTIVITY LOGGER API IS ONLINE\n\n" +
      "📋 Endpoints:\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      "• Log Search:    ?action=logSearch&email=xxx&name=xxx&event=xxx&status=found:3\n" +
      "• Log Verify:    ?action=logVerify&id=xxx&name=xxx&event=xxx&status=valid&source=qr\n" +
      "• Log Download:  ?action=logDownload&uid=xxx&name=xxx&event=xxx&type=Participation\n" +
      "• Get Stats:     ?action=stats&key=YOUR_ADMIN_KEY\n" +
      "• Get Logs:      ?action=logs&key=YOUR_ADMIN_KEY&limit=100&filter=verify\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
      "⚙️ Admin Key Required for stats/logs endpoints"
    );
  }

  var action = e.parameter.action;

  try {
    // Parse user agent for detailed info
    var userAgentRaw = e.parameter.ua ? decodeURIComponent(e.parameter.ua) : 'Unknown';
    var deviceInfo = parseUserAgent(userAgentRaw);

    // Common parameters
    var params = {
      identifier: e.parameter.id || e.parameter.uid || e.parameter.email || '',
      name: e.parameter.name || '-',
      event: e.parameter.event || '-',
      certType: e.parameter.type || e.parameter.certType || '',
      status: e.parameter.status || '',
      source: e.parameter.source || 'unknown',
      userAgent: userAgentRaw,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      country: e.parameter.country || '',
      sessionId: e.parameter.sid || generateSessionId(),
      referrer: e.parameter.ref || '',
      extraData: e.parameter.extra || ''
    };

    // ----------------------------------------------------
    // LOG SEARCH
    // ----------------------------------------------------
    if (action === 'logSearch') {
      params.source = 'certificates';
      logActivityDetailed('search', params);
      return createJSON({ success: true, logged: 'search' });
    }

    // ----------------------------------------------------
    // LOG VERIFICATION
    // ----------------------------------------------------
    if (action === 'logVerify') {
      logActivityDetailed('verify', params);
      return createJSON({ success: true, logged: 'verify' });
    }

    // ----------------------------------------------------
    // LOG DOWNLOAD
    // ----------------------------------------------------
    if (action === 'logDownload') {
      params.source = 'certificates';
      params.status = 'clicked';
      logActivityDetailed('download', params);
      return createJSON({ success: true, logged: 'download' });
    }

    // ----------------------------------------------------
    // GENERIC LOG (flexible)
    // ----------------------------------------------------
    if (action === 'log') {
      var logType = e.parameter.type || 'unknown';
      logActivityDetailed(logType, params);
      return createJSON({ success: true, logged: logType });
    }

    // ----------------------------------------------------
    // GET STATISTICS (Protected)
    // ----------------------------------------------------
    if (action === 'stats') {
      if (e.parameter.key !== CONFIG.ADMIN_KEY) {
        return createJSON({ error: 'Invalid admin key' });
      }
      return handleStats();
    }

    // ----------------------------------------------------
    // GET ACTIVITY LOGS (Protected)
    // ----------------------------------------------------
    if (action === 'logs') {
      if (e.parameter.key !== CONFIG.ADMIN_KEY) {
        return createJSON({ error: 'Invalid admin key' });
      }
      var limit = Math.min(parseInt(e.parameter.limit) || 100, CONFIG.MAX_LOGS_DISPLAY);
      var offset = parseInt(e.parameter.offset) || 0;
      var filter = e.parameter.filter || 'all';
      return handleLogs(limit, offset, filter);
    }

    // ----------------------------------------------------
    // EXPORT LOGS AS CSV (Protected)
    // ----------------------------------------------------
    if (action === 'export') {
      if (e.parameter.key !== CONFIG.ADMIN_KEY) {
        return createJSON({ error: 'Invalid admin key' });
      }
      return handleExport(e.parameter.format || 'json');
    }

    return createJSON({ error: 'Invalid action', validActions: ['logSearch', 'logVerify', 'logDownload', 'log', 'stats', 'logs', 'export'] });

  } catch (error) {
    Logger.log('API Error: ' + error.toString());
    return createJSON({ error: 'Internal server error', message: error.toString() });
  }
}

// ===============================================
// DETAILED LOGGING FUNCTION
// ===============================================
function logActivityDetailed(action, params) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var logSheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);

    // Auto-create sheet if it doesn't exist
    if (!logSheet) {
      setupActivityLog();
      logSheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);
    }

    var now = new Date();
    var dateStr = Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy-MM-dd');
    var timeStr = Utilities.formatDate(now, CONFIG.TIMEZONE, 'HH:mm:ss');
    var timestampStr = Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');

    var row = [
      timestampStr,                    // A - Timestamp
      dateStr,                         // B - Date
      timeStr,                         // C - Time
      action,                          // D - Action
      params.identifier || '',         // E - Identifier
      params.name || '-',              // F - Name
      params.event || '-',             // G - Event
      params.certType || '',           // H - Certificate Type
      params.status || '',             // I - Status
      params.source || '',             // J - Source
      params.deviceType || '',         // K - Device Type
      params.browser || '',            // L - Browser
      params.os || '',                 // M - OS
      (params.userAgent || '').substring(0, 500),  // N - User Agent (truncated)
      params.country || '',            // O - Country
      params.sessionId || '',          // P - Session ID
      params.referrer || '',           // Q - Referrer
      params.extraData || ''           // R - Extra Data
    ];

    logSheet.appendRow(row);
    return true;

  } catch (e) {
    Logger.log('Failed to log activity: ' + e.toString());
    return false;
  }
}

// ===============================================
// PARSE USER AGENT
// ===============================================
function parseUserAgent(ua) {
  if (!ua || ua === 'Unknown') {
    return { deviceType: 'Unknown', browser: 'Unknown', os: 'Unknown' };
  }

  ua = ua.toLowerCase();

  // Device Type
  var deviceType = 'Desktop';
  if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) {
    deviceType = 'Mobile';
  } else if (/ipad|tablet|playbook|silk/i.test(ua)) {
    deviceType = 'Tablet';
  }

  // Browser
  var browser = 'Other';
  if (ua.indexOf('edg') > -1) browser = 'Edge';
  else if (ua.indexOf('chrome') > -1 && ua.indexOf('safari') > -1) browser = 'Chrome';
  else if (ua.indexOf('firefox') > -1) browser = 'Firefox';
  else if (ua.indexOf('safari') > -1) browser = 'Safari';
  else if (ua.indexOf('opera') > -1 || ua.indexOf('opr') > -1) browser = 'Opera';
  else if (ua.indexOf('msie') > -1 || ua.indexOf('trident') > -1) browser = 'IE';

  // OS
  var os = 'Other';
  if (ua.indexOf('windows') > -1) os = 'Windows';
  else if (ua.indexOf('mac') > -1) os = 'MacOS';
  else if (ua.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1) os = 'iOS';
  else if (ua.indexOf('android') > -1) os = 'Android';
  else if (ua.indexOf('linux') > -1) os = 'Linux';
  else if (ua.indexOf('cros') > -1) os = 'ChromeOS';

  return { deviceType: deviceType, browser: browser, os: os };
}

// ===============================================
// GENERATE SESSION ID
// ===============================================
function generateSessionId() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var result = '';
  for (var i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ===============================================
// STATISTICS HANDLER
// ===============================================
function handleStats() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var logSheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);

  if (!logSheet) {
    return createJSON({ error: 'ActivityLog sheet not found. Run setupActivityLog() first!' });
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
      verificationsByStatus: { valid: 0, not_found: 0, revoked: 0 },
      searchResults: { found: 0, notFound: 0 },
      deviceStats: { desktop: 0, mobile: 0, tablet: 0 },
      browserStats: {},
      osStats: {},
      todayStats: { searches: 0, verifications: 0, downloads: 0 },
      last7DaysActivity: [],
      last30DaysActivity: [],
      topCertificates: [],
      topSearchers: []
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
    verificationsByStatus: { valid: 0, not_found: 0, revoked: 0 },
    searchResults: { found: 0, notFound: 0 },
    deviceStats: { Desktop: 0, Mobile: 0, Tablet: 0, Unknown: 0 },
    browserStats: {},
    osStats: {},
    todayStats: { searches: 0, verifications: 0, downloads: 0 },
    dailyActivity: {},
    certificateCounts: {},
    emailCounts: {}
  };

  // Process each row (skip header)
  for (var i = 1; i < data.length; i++) {
    var row = data[i];

    // Properly format the date from column B (handles both Date objects and strings)
    var dateStr = '';
    if (row[1]) {
      if (row[1] instanceof Date) {
        dateStr = Utilities.formatDate(row[1], CONFIG.TIMEZONE, 'yyyy-MM-dd');
      } else {
        // If it's already a string like "2026-03-24", use it directly
        var dateVal = row[1].toString().trim();
        // Check if it matches yyyy-MM-dd format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
          dateStr = dateVal;
        } else {
          // Try to parse and reformat
          try {
            var parsedDate = new Date(dateVal);
            if (!isNaN(parsedDate.getTime())) {
              dateStr = Utilities.formatDate(parsedDate, CONFIG.TIMEZONE, 'yyyy-MM-dd');
            }
          } catch(e) {
            dateStr = '';
          }
        }
      }
    }

    var action = (row[3] || '').toString().toLowerCase();
    var identifier = (row[4] || '').toString();
    var status = (row[8] || '').toString().toLowerCase();
    var source = (row[9] || '').toString().toLowerCase();
    var deviceType = (row[10] || 'Unknown').toString();
    var browser = (row[11] || 'Unknown').toString();
    var os = (row[12] || 'Unknown').toString();

    // Daily tracking
    if (dateStr && !stats.dailyActivity[dateStr]) {
      stats.dailyActivity[dateStr] = { searches: 0, verifications: 0, downloads: 0 };
    }

    // Check if today
    var rowDate = new Date(row[0]);
    var isToday = rowDate >= today;

    // Process by action type
    if (action === 'search') {
      stats.totalSearches++;
      if (dateStr) stats.dailyActivity[dateStr].searches++;
      if (isToday) stats.todayStats.searches++;

      if (identifier.indexOf('@') !== -1) {
        stats.uniqueEmails[identifier.toLowerCase()] = true;
        stats.emailCounts[identifier.toLowerCase()] = (stats.emailCounts[identifier.toLowerCase()] || 0) + 1;
      }

      if (status.indexOf('found') === 0) {
        stats.searchResults.found++;
      } else {
        stats.searchResults.notFound++;
      }

    } else if (action === 'verify') {
      stats.totalVerifications++;
      if (dateStr) stats.dailyActivity[dateStr].verifications++;
      if (isToday) stats.todayStats.verifications++;

      stats.uniqueCertificates[identifier.toUpperCase()] = true;
      stats.certificateCounts[identifier.toUpperCase()] = (stats.certificateCounts[identifier.toUpperCase()] || 0) + 1;

      // Source tracking
      if (source === 'qr' || source === 'qr_scan') {
        stats.verificationsBySource.qr++;
      } else {
        stats.verificationsBySource.manual++;
      }

      // Status tracking
      if (status === 'valid') {
        stats.verificationsByStatus.valid++;
      } else if (status === 'revoked') {
        stats.verificationsByStatus.revoked++;
      } else {
        stats.verificationsByStatus.not_found++;
      }

    } else if (action === 'download') {
      stats.totalDownloads++;
      if (dateStr) stats.dailyActivity[dateStr].downloads++;
      if (isToday) stats.todayStats.downloads++;
    }

    // Device stats
    if (stats.deviceStats.hasOwnProperty(deviceType)) {
      stats.deviceStats[deviceType]++;
    } else {
      stats.deviceStats['Unknown']++;
    }

    // Browser stats
    stats.browserStats[browser] = (stats.browserStats[browser] || 0) + 1;

    // OS stats
    stats.osStats[os] = (stats.osStats[os] || 0) + 1;
  }

  // Get last 7 days activity
  var last7Days = [];
  for (var j = 6; j >= 0; j--) {
    var d = new Date();
    d.setDate(d.getDate() - j);
    var dateKey = Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd');
    var dayName = Utilities.formatDate(d, CONFIG.TIMEZONE, 'EEE');

    var dayData = stats.dailyActivity[dateKey] || { searches: 0, verifications: 0, downloads: 0 };
    last7Days.push({
      date: dateKey,
      day: dayName,
      searches: dayData.searches,
      verifications: dayData.verifications,
      downloads: dayData.downloads,
      total: dayData.searches + dayData.verifications + dayData.downloads
    });
  }

  // Get last 30 days activity
  var last30Days = [];
  for (var k = 29; k >= 0; k--) {
    var d2 = new Date();
    d2.setDate(d2.getDate() - k);
    var dateKey2 = Utilities.formatDate(d2, CONFIG.TIMEZONE, 'yyyy-MM-dd');

    var dayData2 = stats.dailyActivity[dateKey2] || { searches: 0, verifications: 0, downloads: 0 };
    last30Days.push({
      date: dateKey2,
      searches: dayData2.searches,
      verifications: dayData2.verifications,
      downloads: dayData2.downloads
    });
  }

  // Top 10 most verified certificates
  var topCertificates = Object.keys(stats.certificateCounts)
    .map(function(id) { return { id: id, count: stats.certificateCounts[id] }; })
    .sort(function(a, b) { return b.count - a.count; })
    .slice(0, 10);

  // Top 10 searchers
  var topSearchers = Object.keys(stats.emailCounts)
    .map(function(email) { return { email: email, count: stats.emailCounts[email] }; })
    .sort(function(a, b) { return b.count - a.count; })
    .slice(0, 10);

  return createJSON({
    totalSearches: stats.totalSearches,
    totalVerifications: stats.totalVerifications,
    totalDownloads: stats.totalDownloads,
    totalActivity: stats.totalSearches + stats.totalVerifications + stats.totalDownloads,
    uniqueEmails: Object.keys(stats.uniqueEmails).length,
    uniqueCertificates: Object.keys(stats.uniqueCertificates).length,
    verificationsBySource: stats.verificationsBySource,
    verificationsByStatus: stats.verificationsByStatus,
    searchResults: stats.searchResults,
    deviceStats: stats.deviceStats,
    browserStats: stats.browserStats,
    osStats: stats.osStats,
    todayStats: stats.todayStats,
    last7DaysActivity: last7Days,
    last30DaysActivity: last30Days,
    topCertificates: topCertificates,
    topSearchers: topSearchers,
    generatedAt: new Date().toISOString()
  });
}

// ===============================================
// LOGS HANDLER
// ===============================================
function handleLogs(limit, offset, filter) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var logSheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);

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
    var action = (row[3] || '').toString().toLowerCase();

    // Apply filter
    if (filter !== 'all' && action !== filter) {
      continue;
    }

    logs.push({
      timestamp: row[0] || '',
      date: row[1] || '',
      time: row[2] || '',
      action: row[3] || '',
      identifier: row[4] || '',
      name: row[5] || '-',
      event: row[6] || '-',
      certType: row[7] || '',
      status: row[8] || '',
      source: row[9] || '',
      deviceType: row[10] || '',
      browser: row[11] || '',
      os: row[12] || '',
      userAgent: row[13] || '',
      country: row[14] || '',
      sessionId: row[15] || '',
      referrer: row[16] || '',
      extraData: row[17] || ''
    });
  }

  var total = logs.length;
  var paginatedLogs = logs.slice(offset, offset + limit);

  return createJSON({
    logs: paginatedLogs,
    total: total,
    limit: limit,
    offset: offset,
    hasMore: (offset + limit) < total,
    filter: filter
  });
}

// ===============================================
// EXPORT HANDLER
// ===============================================
function handleExport(format) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var logSheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);

  if (!logSheet) {
    return createJSON({ error: 'ActivityLog sheet not found' });
  }

  var data = logSheet.getDataRange().getValues();

  if (format === 'csv') {
    var csv = data.map(function(row) {
      return row.map(function(cell) {
        return '"' + String(cell).replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\n');

    return ContentService.createTextOutput(csv)
      .setMimeType(ContentService.MimeType.CSV);
  }

  // Default: JSON
  var headers = data[0];
  var logs = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    logs.push(obj);
  }

  return createJSON({ logs: logs, total: logs.length, exportedAt: new Date().toISOString() });
}

// ===============================================
// HELPER
// ===============================================
function createJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
