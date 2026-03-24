/**
 * ==============================================
 * IIEC Certificate API with Activity Logging
 * ==============================================
 *
 * SETUP INSTRUCTIONS:
 * 1. Open Google Apps Script (script.google.com)
 * 2. Create a new project or open your existing one
 * 3. Replace all code with this file
 * 4. Update SPREADSHEET_ID with your Google Sheet ID
 * 5. Create an "ActivityLog" sheet in your spreadsheet with headers:
 *    Timestamp | Action | Identifier | Name | Event | Status | Source | UserAgent
 * 6. Deploy > New deployment > Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 7. Copy the deployment URL and update your HTML files
 *
 * API ENDPOINTS:
 * - Search:   ?action=search&email=xxx
 * - Verify:   ?id=xxx (or ?id=xxx&source=qr)
 * - Download: ?action=logDownload&uid=xxx&name=xxx&event=xxx
 * - Stats:    ?action=stats&key=YOUR_ADMIN_KEY
 * - Logs:     ?action=logs&key=YOUR_ADMIN_KEY&limit=100
 */

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // Replace with your Sheet ID
const CERTIFICATES_SHEET = 'Certificates';          // Your certificates data sheet
const LOG_SHEET = 'ActivityLog';                    // Activity log sheet name
const ADMIN_KEY = 'YOUR_SECRET_ADMIN_KEY_123';      // Secret key for dashboard access

// ============================================
// MAIN ENTRY POINT
// ============================================
function doGet(e) {
  // Set up CORS headers for cross-origin requests
  const output = handleRequest(e);
  return output;
}

function handleRequest(e) {
  const params = e.parameter || {};
  const userAgent = getUserAgent(e);

  try {
    // Verification by ID (for verify.html and QR codes)
    if (params.id) {
      return handleVerification(params.id, params.source || 'manual', userAgent);
    }

    // Search by email (for certificates.html)
    if (params.action === 'search' && params.email) {
      return handleSearch(params.email, userAgent);
    }

    // Log download click (called from certificates.html)
    if (params.action === 'logDownload' && params.uid) {
      return handleDownloadLog(params.uid, params.name, params.event, params.type, userAgent);
    }

    // Dashboard: Get statistics (protected by admin key)
    if (params.action === 'stats' && params.key === ADMIN_KEY) {
      return handleStats();
    }

    // Dashboard: Get activity logs (protected by admin key)
    if (params.action === 'logs' && params.key === ADMIN_KEY) {
      const limit = parseInt(params.limit) || 100;
      const offset = parseInt(params.offset) || 0;
      const filter = params.filter || 'all';
      return handleLogs(limit, offset, filter);
    }

    // Invalid request
    return jsonResponse({ error: 'Invalid request parameters' });

  } catch (error) {
    console.error('API Error:', error);
    return jsonResponse({ error: 'Internal server error', message: error.toString() });
  }
}

// ============================================
// VERIFICATION HANDLER
// ============================================
function handleVerification(id, source, userAgent) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CERTIFICATES_SHEET);

  if (!sheet) {
    return jsonResponse({ valid: false, reason: 'Configuration error' });
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().trim());

  // Find column indices
  const uidCol = headers.indexOf('uid');
  const nameCol = headers.indexOf('name');
  const docTitleCol = headers.indexOf('doctitle') !== -1 ? headers.indexOf('doctitle') : headers.indexOf('doc_title');
  const eventCol = headers.indexOf('event');
  const roleCol = headers.indexOf('role');
  const dateCol = headers.indexOf('date');
  const statusCol = headers.indexOf('status');

  if (uidCol === -1) {
    return jsonResponse({ valid: false, reason: 'Configuration error: UID column not found' });
  }

  // Search for the certificate
  const normalizedId = String(id).trim().toUpperCase();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowUid = String(row[uidCol] || '').trim().toUpperCase();

    if (rowUid === normalizedId) {
      // Check if revoked
      const status = statusCol !== -1 ? String(row[statusCol] || '').toLowerCase() : 'active';

      if (status === 'revoked' || status === 'cancelled' || status === 'invalid') {
        logActivity('verify', id, row[nameCol], row[eventCol], 'revoked', source, userAgent);
        return jsonResponse({
          valid: false,
          reason: 'This certificate has been revoked.'
        });
      }

      // Valid certificate found
      const result = {
        valid: true,
        uid: row[uidCol],
        name: row[nameCol] || '',
        docTitle: docTitleCol !== -1 ? row[docTitleCol] : 'Certificate',
        event: row[eventCol] || 'IIEC Event',
        role: roleCol !== -1 ? row[roleCol] : '',
        date: formatDate(dateCol !== -1 ? row[dateCol] : '')
      };

      logActivity('verify', id, result.name, result.event, 'valid', source, userAgent);
      return jsonResponse(result);
    }
  }

  // Not found
  logActivity('verify', id, '-', '-', 'not_found', source, userAgent);
  return jsonResponse({ valid: false, reason: 'Certificate not found' });
}

// ============================================
// SEARCH HANDLER
// ============================================
function handleSearch(email, userAgent) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CERTIFICATES_SHEET);

  if (!sheet) {
    return jsonResponse([]);
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().trim());

  // Find column indices
  const emailCol = headers.indexOf('email');
  const uidCol = headers.indexOf('uid');
  const nameCol = headers.indexOf('name');
  const docTitleCol = headers.indexOf('doctitle') !== -1 ? headers.indexOf('doctitle') : headers.indexOf('doc_title');
  const eventCol = headers.indexOf('event');
  const roleCol = headers.indexOf('role');
  const dateCol = headers.indexOf('date');
  const statusCol = headers.indexOf('status');

  if (emailCol === -1) {
    return jsonResponse([]);
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const results = [];
  let firstName = '-';

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowEmail = String(row[emailCol] || '').trim().toLowerCase();

    if (rowEmail === normalizedEmail) {
      // Skip revoked certificates
      const status = statusCol !== -1 ? String(row[statusCol] || '').toLowerCase() : 'active';
      if (status === 'revoked' || status === 'cancelled' || status === 'invalid') {
        continue;
      }

      if (firstName === '-' && nameCol !== -1) {
        firstName = row[nameCol] || '-';
      }

      results.push({
        uid: row[uidCol] || '',
        name: nameCol !== -1 ? row[nameCol] : '',
        docTitle: docTitleCol !== -1 ? row[docTitleCol] : 'Certificate',
        event: eventCol !== -1 ? row[eventCol] : 'IIEC Event',
        role: roleCol !== -1 ? row[roleCol] : '',
        date: formatDate(dateCol !== -1 ? row[dateCol] : '')
      });
    }
  }

  // Log the search
  const status = results.length > 0 ? `found:${results.length}` : 'not_found';
  const eventName = results.length > 0 ? results[0].event : '-';
  logActivity('search', email, firstName, eventName, status, 'certificates', userAgent);

  return jsonResponse(results);
}

// ============================================
// DOWNLOAD LOG HANDLER
// ============================================
function handleDownloadLog(uid, name, event, certType, userAgent) {
  logActivity('download', uid, name || '-', event || '-', 'clicked', 'certificates', userAgent, certType);
  return jsonResponse({ success: true });
}

// ============================================
// DASHBOARD STATS HANDLER
// ============================================
function handleStats() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const logSheet = ss.getSheetByName(LOG_SHEET);

  if (!logSheet) {
    return jsonResponse({ error: 'ActivityLog sheet not found' });
  }

  const data = logSheet.getDataRange().getValues();
  if (data.length <= 1) {
    return jsonResponse({
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = {
    totalSearches: 0,
    totalVerifications: 0,
    totalDownloads: 0,
    uniqueEmails: new Set(),
    uniqueCertificates: new Set(),
    verificationsBySource: { qr: 0, manual: 0 },
    searchResults: { found: 0, notFound: 0 },
    todayStats: { searches: 0, verifications: 0, downloads: 0 },
    dailyActivity: {}
  };

  // Process each log entry (skip header row)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const timestamp = new Date(row[0]);
    const action = String(row[1] || '').toLowerCase();
    const identifier = String(row[2] || '');
    const status = String(row[4] || '').toLowerCase();
    const source = String(row[5] || '').toLowerCase();

    // Get date key for daily tracking
    const dateKey = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd');

    if (!stats.dailyActivity[dateKey]) {
      stats.dailyActivity[dateKey] = { searches: 0, verifications: 0, downloads: 0 };
    }

    // Check if today
    const isToday = timestamp >= today;

    switch (action) {
      case 'search':
        stats.totalSearches++;
        stats.dailyActivity[dateKey].searches++;
        if (isToday) stats.todayStats.searches++;

        if (identifier.includes('@')) {
          stats.uniqueEmails.add(identifier.toLowerCase());
        }

        if (status.startsWith('found')) {
          stats.searchResults.found++;
        } else {
          stats.searchResults.notFound++;
        }
        break;

      case 'verify':
        stats.totalVerifications++;
        stats.dailyActivity[dateKey].verifications++;
        if (isToday) stats.todayStats.verifications++;

        stats.uniqueCertificates.add(identifier.toUpperCase());

        if (source === 'qr' || source === 'qr_scan') {
          stats.verificationsBySource.qr++;
        } else {
          stats.verificationsBySource.manual++;
        }
        break;

      case 'download':
        stats.totalDownloads++;
        stats.dailyActivity[dateKey].downloads++;
        if (isToday) stats.todayStats.downloads++;
        break;
    }
  }

  // Get last 7 days activity
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const dayName = Utilities.formatDate(d, Session.getScriptTimeZone(), 'EEE');

    last7Days.push({
      date: dateKey,
      day: dayName,
      searches: stats.dailyActivity[dateKey]?.searches || 0,
      verifications: stats.dailyActivity[dateKey]?.verifications || 0,
      downloads: stats.dailyActivity[dateKey]?.downloads || 0
    });
  }

  return jsonResponse({
    totalSearches: stats.totalSearches,
    totalVerifications: stats.totalVerifications,
    totalDownloads: stats.totalDownloads,
    uniqueEmails: stats.uniqueEmails.size,
    uniqueCertificates: stats.uniqueCertificates.size,
    verificationsBySource: stats.verificationsBySource,
    searchResults: stats.searchResults,
    todayStats: stats.todayStats,
    last7DaysActivity: last7Days,
    generatedAt: new Date().toISOString()
  });
}

// ============================================
// DASHBOARD LOGS HANDLER
// ============================================
function handleLogs(limit, offset, filter) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const logSheet = ss.getSheetByName(LOG_SHEET);

  if (!logSheet) {
    return jsonResponse({ error: 'ActivityLog sheet not found', logs: [] });
  }

  const data = logSheet.getDataRange().getValues();
  if (data.length <= 1) {
    return jsonResponse({ logs: [], total: 0 });
  }

  // Convert to objects and reverse (newest first)
  const logs = [];
  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i];
    const action = String(row[1] || '').toLowerCase();

    // Apply filter
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

  const total = logs.length;
  const paginatedLogs = logs.slice(offset, offset + limit);

  return jsonResponse({
    logs: paginatedLogs,
    total: total,
    limit: limit,
    offset: offset,
    hasMore: (offset + limit) < total
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Log activity to the ActivityLog sheet
 */
function logActivity(action, identifier, name, event, status, source, userAgent, certType) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let logSheet = ss.getSheetByName(LOG_SHEET);

    // Create sheet if it doesn't exist
    if (!logSheet) {
      logSheet = ss.insertSheet(LOG_SHEET);
      logSheet.appendRow([
        'Timestamp', 'Action', 'Identifier', 'Name', 'Event',
        'Status', 'Source', 'UserAgent', 'CertType'
      ]);
      logSheet.getRange(1, 1, 1, 9).setFontWeight('bold');
    }

    logSheet.appendRow([
      new Date(),
      action,
      identifier || '',
      name || '-',
      event || '-',
      status || '',
      source || '',
      userAgent || '-',
      certType || ''
    ]);

  } catch (e) {
    console.error('Failed to log activity:', e);
  }
}

/**
 * Format date for display
 */
function formatDate(value) {
  if (!value) return '';

  try {
    if (value instanceof Date) {
      return Utilities.formatDate(value, Session.getScriptTimeZone(), 'dd MMM yyyy');
    }

    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd MMM yyyy');
    }

    return String(value);
  } catch (e) {
    return String(value);
  }
}

/**
 * Get user agent from request
 */
function getUserAgent(e) {
  try {
    // Try to get from parameter (set by frontend)
    if (e.parameter && e.parameter.ua) {
      return decodeURIComponent(e.parameter.ua).substring(0, 200);
    }
    return 'Unknown';
  } catch (e) {
    return 'Unknown';
  }
}

/**
 * Create JSON response with CORS headers
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// SETUP FUNCTION - Run this once to initialize
// ============================================
function setupActivityLog() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let logSheet = ss.getSheetByName(LOG_SHEET);

  if (!logSheet) {
    logSheet = ss.insertSheet(LOG_SHEET);
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

    Logger.log('ActivityLog sheet created successfully!');
  } else {
    Logger.log('ActivityLog sheet already exists.');
  }
}
