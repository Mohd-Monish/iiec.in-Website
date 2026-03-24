// ===============================================
// IIEC CERTIFICATE ACTIVITY LOGGER
// ===============================================
// Logs ALL certificate activity with full details
// ===============================================

// ⚙️ CONFIGURATION - UPDATE THESE!
var CONFIG = {
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE', // <-- PUT YOUR ACTUAL SPREADSHEET ID HERE
  LOG_SHEET_NAME: 'ActivityLog',
  SUMMARY_SHEET_NAME: 'Summary',
  ADMIN_KEY: 'iiec-admin-2026',
  MAX_LOGS_DISPLAY: 500,
  TIMEZONE: 'Asia/Kolkata'
};

// ===============================================
// AUTOMATIC SETUP - Run this ONCE
// ===============================================
function setupActivityLog() {
  if (!CONFIG.SPREADSHEET_ID || CONFIG.SPREADSHEET_ID === 'YOUR_ACTIVITY_LOG_SPREADSHEET_ID_HERE') {
    throw new Error('Please set SPREADSHEET_ID first');
  }

  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var logSheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);

  if (logSheet) {
    Logger.log('ActivityLog sheet already exists');
    return;
  }

  logSheet = ss.insertSheet(CONFIG.LOG_SHEET_NAME);

  var headers = [
    'Timestamp', 'Date', 'Time', 'Action', 'Identifier', 'Name',
    'Event', 'Certificate Type', 'Status', 'Source', 'Device Type',
    'Browser', 'OS', 'User Agent', 'Country', 'Session ID', 'Referrer', 'Extra Data'
  ];

  logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  logSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#FFB703');
  logSheet.setFrozenRows(1);

  Logger.log('Setup complete!');
}

// ===============================================
// MAIN API ENTRY POINT
// ===============================================
function doGet(e) {
  if (!e || !e.parameter || Object.keys(e.parameter).length === 0) {
    return ContentService.createTextOutput("Activity Logger API is ONLINE");
  }

  var action = e.parameter.action;

  try {
    var userAgentRaw = e.parameter.ua ? decodeURIComponent(e.parameter.ua) : 'Unknown';
    var deviceInfo = parseUserAgent(userAgentRaw);

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
      sessionId: generateSessionId()
    };

    if (action === 'logSearch') {
      params.source = 'certificates';
      logActivity('search', params);
      return createJSON({ success: true, logged: 'search' });
    }

    if (action === 'logVerify') {
      logActivity('verify', params);
      return createJSON({ success: true, logged: 'verify' });
    }

    if (action === 'logDownload') {
      params.source = 'certificates';
      params.status = 'clicked';
      logActivity('download', params);
      return createJSON({ success: true, logged: 'download' });
    }

    if (action === 'stats') {
      if (e.parameter.key !== CONFIG.ADMIN_KEY) {
        return createJSON({ error: 'Invalid admin key' });
      }
      return handleStats();
    }

    if (action === 'logs') {
      if (e.parameter.key !== CONFIG.ADMIN_KEY) {
        return createJSON({ error: 'Invalid admin key' });
      }
      var limit = Math.min(parseInt(e.parameter.limit) || 100, CONFIG.MAX_LOGS_DISPLAY);
      var filter = e.parameter.filter || 'all';
      return handleLogs(limit, filter);
    }

    return createJSON({ error: 'Invalid action' });

  } catch (error) {
    return createJSON({ error: error.toString() });
  }
}

// ===============================================
// LOG ACTIVITY
// ===============================================
function logActivity(action, params) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var logSheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);

  if (!logSheet) {
    setupActivityLog();
    logSheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);
  }

  var now = new Date();
  var dateStr = Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy-MM-dd');
  var timeStr = Utilities.formatDate(now, CONFIG.TIMEZONE, 'HH:mm:ss');
  var timestampStr = Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');

  var row = [
    timestampStr, dateStr, timeStr, action,
    params.identifier || '', params.name || '-', params.event || '-',
    params.certType || '', params.status || '', params.source || '',
    params.deviceType || '', params.browser || '', params.os || '',
    (params.userAgent || '').substring(0, 500), '', params.sessionId || '', '', ''
  ];

  logSheet.appendRow(row);
}

// ===============================================
// STATS HANDLER - SIMPLIFIED & FIXED
// ===============================================
function handleStats() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var logSheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);

  if (!logSheet) {
    return createJSON({ error: 'ActivityLog sheet not found' });
  }

  var data = logSheet.getDataRange().getValues();

  // Initialize counters
  var totalSearches = 0;
  var totalVerifications = 0;
  var totalDownloads = 0;
  var todaySearches = 0;
  var todayVerifications = 0;
  var todayDownloads = 0;
  var qrCount = 0;
  var manualCount = 0;
  var dailyData = {};

  // Get today's date string
  var today = new Date();
  var todayStr = Utilities.formatDate(today, CONFIG.TIMEZONE, 'yyyy-MM-dd');

  // Process each row (skip header at index 0)
  for (var i = 1; i < data.length; i++) {
    var row = data[i];

    // Column D (index 3) = Action
    var action = String(row[3] || '').toLowerCase().trim();

    // Column B (index 1) = Date - handle both Date object and string
    var dateVal = row[1];
    var dateStr = '';

    if (dateVal) {
      if (dateVal instanceof Date) {
        dateStr = Utilities.formatDate(dateVal, CONFIG.TIMEZONE, 'yyyy-MM-dd');
      } else {
        dateStr = String(dateVal).trim();
        // If date has time component, extract just the date
        if (dateStr.indexOf(' ') > -1) {
          dateStr = dateStr.split(' ')[0];
        }
      }
    }

    // Column J (index 9) = Source
    var source = String(row[9] || '').toLowerCase().trim();

    // Skip if no valid action
    if (!action) continue;

    // Initialize daily tracking for this date
    if (dateStr && !dailyData[dateStr]) {
      dailyData[dateStr] = { searches: 0, verifications: 0, downloads: 0 };
    }

    // Count by action type
    if (action === 'search') {
      totalSearches++;
      if (dateStr) dailyData[dateStr].searches++;
      if (dateStr === todayStr) todaySearches++;
    }
    else if (action === 'verify') {
      totalVerifications++;
      if (dateStr) dailyData[dateStr].verifications++;
      if (dateStr === todayStr) todayVerifications++;

      // Track source
      if (source === 'qr') {
        qrCount++;
      } else {
        manualCount++;
      }
    }
    else if (action === 'download') {
      totalDownloads++;
      if (dateStr) dailyData[dateStr].downloads++;
      if (dateStr === todayStr) todayDownloads++;
    }
  }

  // Build last 7 days array
  var last7Days = [];
  var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (var j = 6; j >= 0; j--) {
    var d = new Date();
    d.setDate(d.getDate() - j);
    var dateKey = Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd');
    var dayName = dayNames[d.getDay()];

    var dayStats = dailyData[dateKey] || { searches: 0, verifications: 0, downloads: 0 };

    last7Days.push({
      date: dateKey,
      day: dayName,
      searches: dayStats.searches,
      verifications: dayStats.verifications,
      downloads: dayStats.downloads,
      total: dayStats.searches + dayStats.verifications + dayStats.downloads
    });
  }

  return createJSON({
    totalSearches: totalSearches,
    totalVerifications: totalVerifications,
    totalDownloads: totalDownloads,
    verificationsBySource: { qr: qrCount, manual: manualCount },
    todayStats: {
      searches: todaySearches,
      verifications: todayVerifications,
      downloads: todayDownloads
    },
    last7DaysActivity: last7Days,
    debug: {
      totalRows: data.length - 1,
      todayDate: todayStr,
      datesFound: Object.keys(dailyData)
    }
  });
}

// ===============================================
// LOGS HANDLER
// ===============================================
function handleLogs(limit, filter) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var logSheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);

  if (!logSheet) {
    return createJSON({ logs: [], total: 0 });
  }

  var data = logSheet.getDataRange().getValues();
  var logs = [];

  for (var i = data.length - 1; i >= 1 && logs.length < limit; i--) {
    var row = data[i];
    var action = String(row[3] || '').toLowerCase();

    if (filter !== 'all' && action !== filter) continue;

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
      os: row[12] || ''
    });
  }

  return createJSON({ logs: logs, total: logs.length });
}

// ===============================================
// HELPERS
// ===============================================
function parseUserAgent(ua) {
  if (!ua || ua === 'Unknown') {
    return { deviceType: 'Unknown', browser: 'Unknown', os: 'Unknown' };
  }

  ua = ua.toLowerCase();

  var deviceType = 'Desktop';
  if (/mobile|android|iphone/i.test(ua)) deviceType = 'Mobile';
  else if (/ipad|tablet/i.test(ua)) deviceType = 'Tablet';

  var browser = 'Other';
  if (ua.indexOf('edg') > -1) browser = 'Edge';
  else if (ua.indexOf('chrome') > -1) browser = 'Chrome';
  else if (ua.indexOf('firefox') > -1) browser = 'Firefox';
  else if (ua.indexOf('safari') > -1) browser = 'Safari';

  var os = 'Other';
  if (ua.indexOf('windows') > -1) os = 'Windows';
  else if (ua.indexOf('mac') > -1) os = 'MacOS';
  else if (ua.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1) os = 'iOS';
  else if (ua.indexOf('android') > -1) os = 'Android';

  return { deviceType: deviceType, browser: browser, os: os };
}

function generateSessionId() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var result = '';
  for (var i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function createJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
