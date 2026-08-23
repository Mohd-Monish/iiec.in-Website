/**
 * Next Gen Pitch — startup / pitch deck submission backend (stage 2).
 *
 * POST from next_gen_pitch_form.html
 *   ->  one row per team, written into THIS spreadsheet (the one holding the script)
 *   ->  the uploaded PPT / PPTX / PDF stored as a REAL FILE in a "Pitch Decks"
 *       folder beside the workbook, named <Team> - <Eureka ID> - <timestamp>.
 *
 * WHERE THE DECKS LIVE
 *   The binary is written to Drive with Utilities.newBlob + createFile, so the file
 *   itself is stored and downloadable — the sheet column only holds a link to it,
 *   because a cell cannot contain a PPTX. Run listDecks() to see the real byte size
 *   of each stored file, or zipAllDecks() to download the whole set at once.
 *
 * No second file is ever created: your spreadsheet IS the database. Download it as
 * .xlsx whenever you need one via File -> Download -> Microsoft Excel.
 *
 * The Eureka! Team ID is mandatory here. A pitch without it cannot be evaluated by
 * IIT Bombay, so the row is rejected rather than stored half-valid.
 *
 * FIRST RUN
 *  1. Create (or open) your spreadsheet -> Extensions -> Apps Script -> paste this
 *     file -> Save. The script now lives inside that workbook.
 *  2. Run `setup` and approve the authorisation prompt (Sheets + Drive + external
 *     requests). This builds the two tabs in the current workbook and the Pitch
 *     Decks folder, then prints the links.
 *  3. Deploy -> New deployment -> Web app
 *       Execute as:      Me
 *       Who has access:  Anyone
 *     Copy the /exec URL into FORM_ENDPOINT in next_gen_pitch_form.html.
 *  4. After every code edit: Deploy -> Manage deployments -> pencil ->
 *     Version: NEW VERSION -> Deploy. The /exec URL serves the last published
 *     version, so saving alone changes nothing.
 *
 * HELPERS
 *    setup()            build the tabs and deck folder, print links
 *    reformat()         re-apply table formatting over existing rows
 *    showDiagnostics()  print where the data and decks actually are
 *    listDecks()        list every stored deck with its real size and type
 *    zipAllDecks()      bundle all decks into one .zip for offline download
 *    testValidation()   check the field rules, touches nothing
 *    testSubmit()       insert one fake row with a small dummy PDF
 *    deleteTestRows()   remove rows whose email ends in @example.edu, decks included
 */

/* ------------------------------ CONFIG ------------------------------ */
var CONFIG = {
  /* Leave SHEET_ID empty when this script is attached to the spreadsheet
     (Extensions > Apps Script). Rows are written to that same workbook — no extra
     file is created anywhere. Only set SHEET_ID if you run this as a standalone
     script that must write into some other spreadsheet. */
  SHEET_ID:       '',
  SHEET_NAME:     'Pitch Submissions',      // tab inside your workbook
  SUMMARY_NAME:   'Pitch Summary',          // second tab, live counts
  DECK_FOLDER_NAME: 'Pitch Decks',          // Drive subfolder beside the workbook
  DECK_FOLDER_ID: '',                       // optional: put decks in a specific folder
  NAMED_RANGE:    'PitchSubmissions',

  MAX_FILE_MB:    15,                       // must match the form
  ALLOWED_EXT:    ['ppt', 'pptx', 'pdf'],
  MIN_IDEA_CHARS: 80,

  ALLOW_RESUBMIT: true,     // true = a repeat submission replaces the previous row
  SHARED_SECRET:  '',       // '' = no token check
  NOTIFY_EMAIL:   '',       // '' = no email alerts; else 'you@gmail.com'

  /* Mail the deck to NOTIFY_EMAIL as a real attachment, so you hold a second copy
     outside Drive. Gmail rejects attachments over ~25 MB, and the 15 MB cap keeps
     every deck well under that. */
  ATTACH_DECK_TO_EMAIL: true
};

/* Table layout. Keep HEADERS, COL and WIDTHS in step if you add a field. */
var HEADERS = [
  'No.', 'Timestamp', 'Team Name', 'Eureka Team ID',
  'Leader Name', 'Leader Email', 'Leader Phone',
  'Startup Idea', 'Idea (chars)',
  'Deck File', 'Deck Type', 'Deck Size (MB)', 'Deck Link',
  'Confirmed', 'Page', 'User agent'
];
var COL = {
  NO:1, TS:2, TEAM:3, EUREKA:4,
  NAME:5, MAIL:6, PHONE:7,
  IDEA:8, IDEA_LEN:9,
  FILE:10, FTYPE:11, FSIZE:12, FLINK:13,
  CONFIRM:14, PAGE:15, UA:16
};
var WIDTHS = [50, 155, 175, 150, 175, 225, 130, 420, 95, 260, 90, 110, 260, 90, 210, 250];

var THEME = {
  header:'#111111', headerText:'#FFFFFF',
  accent:'#FF5A1F', line:'#D8D8D0', band:'#FBF3EF'
};

/* ------------------------------ DESTINATION ------------------------------ */
/**
 * The workbook this script is attached to. Nothing new is ever created.
 *
 * Bound script (the normal case): you made the spreadsheet, opened
 * Extensions -> Apps Script, and pasted this in. getActiveSpreadsheet() returns
 * that workbook even when the code runs from a web app request, so the rows land
 * in the same file that holds the script.
 *
 * Standalone script: there is no container, so set CONFIG.SHEET_ID to the
 * spreadsheet you want written to.
 */
function targetSpreadsheet() {
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;

  if (CONFIG.SHEET_ID) return SpreadsheetApp.openById(CONFIG.SHEET_ID);

  throw new Error('No spreadsheet found. Either attach this script to a spreadsheet ' +
                  '(Extensions > Apps Script) or set CONFIG.SHEET_ID.');
}

function sheetId() {
  return targetSpreadsheet().getId();
}

/**
 * Decks are files, so they still need somewhere in Drive to live. They go into a
 * subfolder sitting beside the spreadsheet itself, so the workbook and its uploads
 * stay together without inventing a separate location.
 */
function deckFolder() {
  if (CONFIG.DECK_FOLDER_ID) return DriveApp.getFolderById(CONFIG.DECK_FOLDER_ID);

  var parents = DriveApp.getFileById(sheetId()).getParents();
  var parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();

  var hits = parent.getFoldersByName(CONFIG.DECK_FOLDER_NAME);
  return hits.hasNext() ? hits.next() : parent.createFolder(CONFIG.DECK_FOLDER_NAME);
}

/* ------------------------------ ROUTES ------------------------------ */

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.diag) return json(diagnostics());
  return json({ ok:true, service:'Next Gen Pitch pitch-deck submission', time:new Date().toISOString() });
}

function diagnostics() {
  var out = { ok:true, time:new Date().toISOString() };

  try {
    var ss = targetSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    out.spreadsheet = { name:ss.getName(), id:ss.getId(), url:ss.getUrl(),
                        bound:!!SpreadsheetApp.getActiveSpreadsheet(),
                        tabs:ss.getSheets().map(function (s) { return s.getName(); }) };
    out.sheet = sheet
      ? { name:CONFIG.SHEET_NAME, dataRows:Math.max(sheet.getLastRow() - 1, 0), columns:sheet.getLastColumn() }
      : { error:'tab "' + CONFIG.SHEET_NAME + '" not found — run setup()' };
  } catch (err) {
    out.spreadsheet = { error:String(err && err.message || err) };
  }

  try {
    // Deliberately counts only — deck file names identify students, and this URL is public.
    var decks = deckFolder();
    var count = 0, it = decks.getFiles();
    while (it.hasNext()) { it.next(); count++; }
    out.decks = { folder:decks.getName(), id:decks.getId(), url:decks.getUrl(), files:count };
  } catch (err) {
    out.decks = { error:String(err && err.message || err) };
  }

  return out;
}

function doPost(e) {
  try {
    var data = parseBody(e);

    if (CONFIG.SHARED_SECRET && data.token !== CONFIG.SHARED_SECRET) {
      return json({ ok:false, error:'Unauthorised' });
    }

    var entry = validateSubmission(data);
    if (entry.error) return json({ ok:false, error:entry.error });

    // The upload happens before the lock: it is the slow part, and holding a lock
    // across a multi-megabyte Drive write would serialise every submitter behind it.
    var deck = saveDeck(entry, data);

    var rowNumber, replaced = false;
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var sheet = getSheet();
      var existing = findRow(sheet, entry.eurekaId, entry.email, entry.teamName);

      if (existing > 0 && !CONFIG.ALLOW_RESUBMIT) {
        return json({ ok:false, error:'A submission already exists for this team' });
      }

      rowNumber = existing > 0 ? existing : sheet.getLastRow() + 1;
      replaced = existing > 0;

      sheet.getRange(rowNumber, 1, 1, HEADERS.length).setValues([[
        rowNumber - 1,
        data.submittedAt ? new Date(data.submittedAt) : new Date(),
        entry.teamName,
        entry.eurekaId,
        entry.name,
        entry.email,
        entry.phone,
        entry.idea,
        entry.idea.length,
        deck.name,
        deck.ext.toUpperCase(),
        deck.mb,
        deck.url,
        entry.confirmed ? 'Yes' : 'No',
        trim(data.page),
        trim(data.userAgent)
      ]]);

      styleTable(sheet);
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }

    // Must never break the submission.
    if (CONFIG.NOTIFY_EMAIL) {
      try {
        var options = {};
        if (CONFIG.ATTACH_DECK_TO_EMAIL) {
          // Attach the stored file itself, giving you a copy independent of Drive.
          options.attachments = [DriveApp.getFileById(deck.id).getBlob()];
        }
        MailApp.sendEmail(CONFIG.NOTIFY_EMAIL,
          'Pitch deck submitted: ' + entry.teamName,
          ['Team: ' + entry.teamName,
           'Eureka ID: ' + entry.eurekaId,
           'Leader: ' + entry.name + ' | ' + entry.email + ' | ' + entry.phone,
           '',
           'Idea:', entry.idea,
           '',
           'Deck in Drive: ' + deck.url,
           'Stored as: ' + deck.name + ' (' + deck.mb + ' MB)'].join('\n'),
          options);
      } catch (err) { console.warn('notify failed: ' + err); }
    }

    return json({ ok:true, row:rowNumber, replaced:replaced, deckUrl:deck.url });
  } catch (err) {
    console.error(err);
    return json({ ok:false, error:String(err && err.message || err) });
  }
}

/* ------------------------------ VALIDATION ------------------------------ */
/**
 * Mirrors next_gen_pitch_form.html. The browser copy is for UX; this is the copy
 * that protects the sheet, because anyone can POST to a public /exec URL.
 */
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
var PLACEHOLDER_RE = /^(na|n\/a|nil|none|no|not applicable|pending|later|will submit later|tbd|-+|\.+|x{3,}|test)$/i;

function emailProblem(value, who) {
  if (!value) return who + ' email is required';
  if (/\s/.test(value)) return who + ' email cannot contain spaces';
  if (!EMAIL_RE.test(value)) return who + ' email is not valid';
  return '';
}

function phoneKey(value) {
  var digits = String(value || '').replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function phoneProblem(value, who) {
  if (!value) return who + ' phone number is required';
  if (/[^0-9+\s()-]/.test(value)) return who + ' phone number has invalid characters';
  var digits = value.replace(/\D/g, '');
  if (digits.length === 10) {
    return /^[6-9]/.test(digits) ? '' : who + ' phone number must start with 6, 7, 8 or 9';
  }
  if (digits.length === 11 && digits.charAt(0) === '0') return '';
  if (digits.length === 12 && digits.indexOf('91') === 0) return '';
  if (digits.length === 13 && digits.indexOf('091') === 0) return '';
  return digits.length < 10 ? who + ' phone number is too short' : who + ' phone number is too long';
}

/** The Eureka! Team ID gates eligibility, so it gets its own rules. */
function eurekaProblem(value) {
  if (!value) return 'Eureka! Team ID is required';
  if (PLACEHOLDER_RE.test(value)) return 'Eureka! Team ID looks like a placeholder — enter the real ID';
  if (value.length < 4) return 'Eureka! Team ID is too short';
  if (value.length > 40) return 'Eureka! Team ID is too long';
  if (!/^[A-Za-z0-9][A-Za-z0-9 _\/-]*$/.test(value)) return 'Eureka! Team ID has invalid characters';
  if (!/[0-9]/.test(value)) return 'Eureka! Team ID must contain at least one number';
  return '';
}

function fileProblem(name, bytes, base64) {
  if (!base64) return 'Pitch deck file is required';
  if (!name) return 'Pitch deck file name is missing';
  var ext = String(name).split('.').pop().toLowerCase();
  if (CONFIG.ALLOWED_EXT.indexOf(ext) === -1) {
    return 'Only ' + CONFIG.ALLOWED_EXT.join(', ').toUpperCase() + ' files are accepted';
  }
  if (bytes && bytes > CONFIG.MAX_FILE_MB * 1024 * 1024) {
    return 'Pitch deck is larger than ' + CONFIG.MAX_FILE_MB + ' MB';
  }
  return '';
}

function validateSubmission(data) {
  var teamName = trim(data.teamName);
  var eurekaId = trim(data.eurekaId).toUpperCase();
  var name  = trim(data.leaderName);
  var email = trim(data.leaderEmail).toLowerCase();
  var phone = trim(data.leaderPhone);
  var idea  = trim(data.startupIdea).replace(/[ \t]+/g, ' ');

  if (!teamName) return { error:'Team name is required' };
  if (PLACEHOLDER_RE.test(teamName)) return { error:'Team name looks like a placeholder' };

  var eurekaErr = eurekaProblem(eurekaId);
  if (eurekaErr) return { error:eurekaErr };

  if (!name) return { error:'Team leader name is required' };
  if (PLACEHOLDER_RE.test(name)) return { error:'Team leader name looks like a placeholder' };

  var mailErr = emailProblem(email, 'Team leader');
  if (mailErr) return { error:mailErr };

  var phoneErr = phoneProblem(phone, 'Team leader');
  if (phoneErr) return { error:phoneErr };

  if (!idea) return { error:'Startup idea is required' };
  if (idea.length < CONFIG.MIN_IDEA_CHARS) {
    return { error:'Startup idea must be at least ' + CONFIG.MIN_IDEA_CHARS + ' characters' };
  }

  if (!/^(yes|true|on|1)$/i.test(trim(data.confirmation))) {
    return { error:'You must confirm the details before submitting' };
  }

  var fileErr = fileProblem(trim(data.fileName), Number(data.fileSize) || 0, trim(data.fileData));
  if (fileErr) return { error:fileErr };

  return {
    teamName: titleCase(teamName),
    eurekaId: eurekaId,
    name: titleCase(name),
    email: email,
    phone: phone,
    phoneDigits: phoneKey(phone),
    idea: idea,
    confirmed: true
  };
}

/* ------------------------------ DECK UPLOAD ------------------------------ */
var MIME_BY_EXT = {
  pdf:  'application/pdf',
  ppt:  'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
};

/**
 * Writes the base64 payload into the Pitch Decks folder. Named
 * "<Team> - <Eureka ID> - <original>" so decks stay sortable and traceable, and a
 * resubmission does not silently overwrite the earlier file — the timestamp keeps
 * both, and the sheet row points at the newest.
 */
function saveDeck(entry, data) {
  var original = trim(data.fileName) || 'pitch-deck';
  var ext = original.split('.').pop().toLowerCase();
  var mime = MIME_BY_EXT[ext] || trim(data.fileType) || 'application/octet-stream';

  var bytes = Utilities.base64Decode(trim(data.fileData));
  if (!bytes || !bytes.length) throw new Error('Uploaded file was empty');
  if (bytes.length > CONFIG.MAX_FILE_MB * 1024 * 1024) {
    throw new Error('Pitch deck is larger than ' + CONFIG.MAX_FILE_MB + ' MB');
  }

  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmm');
  var safeTeam = entry.teamName.replace(/[\\\/:*?"<>|]/g, '-');
  var safeId = entry.eurekaId.replace(/[\\\/:*?"<>|]/g, '-');
  var fileName = safeTeam + ' - ' + safeId + ' - ' + stamp + '.' + ext;

  var blob = Utilities.newBlob(bytes, mime, fileName);
  var file = deckFolder().createFile(blob);
  file.setDescription('Next Gen Pitch deck — ' + entry.teamName + ' (' + entry.eurekaId +
                      '), submitted by ' + entry.name + ' <' + entry.email + '>. Original: ' + original);

  return {
    id: file.getId(),
    name: fileName,
    original: original,
    ext: ext,
    mb: Math.round(bytes.length / 1048576 * 100) / 100,
    url: file.getUrl()
  };
}

/* ------------------------------ SHEET / TABLE ------------------------------ */

function getSheet() {
  var ss = SpreadsheetApp.openById(sheetId());
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME, 0);
    styleTable(sheet);
  } else if (sheet.getLastRow() === 0) {
    styleTable(sheet);
  }
  return sheet;
}

function tidyWorkbook() {
  var ss = SpreadsheetApp.openById(sheetId());

  ss.getSheets().forEach(function (s) {
    var name = s.getName();
    var isDefault = /^Sheet\s?\d+$/i.test(name);
    var isOurs = (name === CONFIG.SHEET_NAME || name === CONFIG.SUMMARY_NAME);
    if (isDefault && !isOurs && s.getLastRow() === 0 && ss.getSheets().length > 1) {
      ss.deleteSheet(s);
    }
  });

  var data = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (data) { ss.setActiveSheet(data); ss.moveActiveSheet(1); }
  var summary = ss.getSheetByName(CONFIG.SUMMARY_NAME);
  if (summary) { ss.setActiveSheet(summary); ss.moveActiveSheet(2); }
  if (data) ss.setActiveSheet(data);
}

function styleTable(sheet) {
  var cols = HEADERS.length;
  var last = Math.max(sheet.getLastRow(), 1);
  var rows = last - 1;

  if (sheet.getMaxColumns() > cols) sheet.deleteColumns(cols + 1, sheet.getMaxColumns() - cols);
  if (sheet.getMaxColumns() < cols) sheet.insertColumnsAfter(sheet.getMaxColumns(), cols - sheet.getMaxColumns());

  sheet.getRange(1, 1, 1, cols)
    .setValues([HEADERS])
    .setBackground(THEME.header)
    .setFontColor(THEME.headerText)
    .setFontWeight('bold')
    .setFontSize(10)
    .setVerticalAlignment('middle')
    .setHorizontalAlignment('left');
  sheet.setRowHeight(1, 30);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(4);                       // No. .. Eureka ID stay in view

  // the deck columns get the accent so uploads are easy to spot
  sheet.getRange(1, COL.FILE, 1, 4).setBackground(THEME.accent);

  WIDTHS.forEach(function (w, i) { sheet.setColumnWidth(i + 1, w); });

  sheet.getBandings().forEach(function (b) { b.remove(); });
  sheet.getRange(1, 1, Math.max(last, 2), cols)
    .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false)
    .setHeaderRowColor(THEME.header)
    .setFirstRowColor('#FFFFFF')
    .setSecondRowColor(THEME.band);

  var filter = sheet.getFilter();
  if (filter) filter.remove();
  sheet.getRange(1, 1, Math.max(last, 2), cols).createFilter();

  var n = Math.max(rows, 1);
  sheet.getRange(2, COL.NO, n, 1).setNumberFormat('0').setHorizontalAlignment('center');
  sheet.getRange(2, COL.TS, n, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange(2, COL.EUREKA, n, 1).setNumberFormat('@');   // keeps IDs as typed
  sheet.getRange(2, COL.PHONE, n, 1).setNumberFormat('@');    // keeps +91 / leading zeros
  sheet.getRange(2, COL.IDEA_LEN, n, 1).setNumberFormat('0').setHorizontalAlignment('center');
  sheet.getRange(2, COL.FSIZE, n, 1).setNumberFormat('0.00').setHorizontalAlignment('center');
  sheet.getRange(2, COL.CONFIRM, n, 1).setHorizontalAlignment('center');

  if (rows > 0) {
    var body = sheet.getRange(2, 1, rows, cols);
    body.setFontSize(10).setVerticalAlignment('top').setWrap(false);
    body.setBorder(true, true, true, true, true, true, THEME.line, SpreadsheetApp.BorderStyle.SOLID);

    // the idea is the one column worth reading in place
    sheet.getRange(2, COL.IDEA, rows, 1).setWrap(true);

    sheet.getRange(2, COL.CONFIRM, rows, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['Yes', 'No'], true).setAllowInvalid(true).build());

    var seq = [];
    for (var i = 0; i < rows; i++) seq.push([i + 1]);
    sheet.getRange(2, COL.NO, rows, 1).setValues(seq);
  }

  var ss = sheet.getParent();
  ss.getNamedRanges().forEach(function (nr) {
    if (nr.getName() === CONFIG.NAMED_RANGE) nr.remove();
  });
  ss.setNamedRange(CONFIG.NAMED_RANGE, sheet.getRange(1, 1, Math.max(last, 2), cols));
}

/** Row index matching this Eureka ID, leader email or team name, else 0. */
function findRow(sheet, eurekaId, email, teamName) {
  var rows = sheet.getLastRow() - 1;
  if (rows < 1) return 0;

  var values = sheet.getRange(2, COL.TEAM, rows, 4).getValues();  // team, eureka, name, email
  var id = String(eurekaId).trim().toUpperCase();
  var mail = String(email).trim().toLowerCase();
  var team = String(teamName).trim().toLowerCase();

  for (var i = 0; i < rows; i++) {
    var rowTeam = String(values[i][0]).trim().toLowerCase();
    var rowId   = String(values[i][1]).trim().toUpperCase();
    var rowMail = String(values[i][3]).trim().toLowerCase();
    if (id && rowId === id) return i + 2;
    if (mail && rowMail === mail) return i + 2;
    if (team && rowTeam === team) return i + 2;
  }
  return 0;
}

/* ------------------------------ SUMMARY TAB ------------------------------ */
function buildSummary() {
  var ss = SpreadsheetApp.openById(sheetId());
  var sheet = ss.getSheetByName(CONFIG.SUMMARY_NAME) || ss.insertSheet(CONFIG.SUMMARY_NAME);
  var src = "'" + CONFIG.SHEET_NAME + "'!";

  sheet.clear();
  sheet.getBandings().forEach(function (b) { b.remove(); });

  sheet.getRange('A1').setValue('Next Gen Pitch — Pitch Deck Submissions')
    .setFontSize(14).setFontWeight('bold').setFontColor(THEME.accent);
  sheet.getRange('A2').setFormula('="Updated "&TEXT(NOW(),"yyyy-mm-dd hh:mm")')
    .setFontColor('#6B7280').setFontSize(9);

  sheet.getRange('A4').setValue('Decks submitted').setFontWeight('bold');
  sheet.getRange('B4').setFormula('=COUNTA(' + src + '$C$2:$C)');
  sheet.getRange('A5').setValue('Latest submission').setFontWeight('bold');
  sheet.getRange('B5').setFormula('=IFERROR(TEXT(MAX(' + src + '$B$2:$B),"yyyy-mm-dd hh:mm"),"—")');
  sheet.getRange('A6').setValue('Submitted today').setFontWeight('bold');
  sheet.getRange('B6').setFormula('=COUNTIFS(' + src + '$B$2:$B,">="&TODAY(),' + src + '$B$2:$B,"<"&TODAY()+1)');
  sheet.getRange('A7').setValue('With Eureka! ID').setFontWeight('bold');
  sheet.getRange('B7').setFormula('=COUNTIF(' + src + '$D$2:$D,"<>")');
  sheet.getRange('A8').setValue('Total deck size (MB)').setFontWeight('bold');
  sheet.getRange('B8').setFormula('=ROUND(SUM(' + src + '$L$2:$L),2)');
  sheet.getRange('A9').setValue('Avg idea length (chars)').setFontWeight('bold');
  sheet.getRange('B9').setFormula('=IFERROR(ROUND(AVERAGE(' + src + '$I$2:$I),0),0)');

  sheet.getRange('D4:E4').setValues([['Deck format', 'Count']])
    .setFontWeight('bold').setBackground(THEME.header).setFontColor(THEME.headerText);
  ['PDF', 'PPTX', 'PPT'].forEach(function (ext, i) {
    var r = 5 + i;
    sheet.getRange(r, 4).setValue(ext);
    sheet.getRange(r, 5).setFormula('=COUNTIF(' + src + '$K$2:$K,D' + r + ')');
  });
  sheet.getRange('D8').setValue('Total').setFontWeight('bold');
  sheet.getRange('E8').setFormula('=SUM(E5:E7)').setFontWeight('bold');

  sheet.getRange('D10').setValue('Missing deck link (check these)').setFontWeight('bold');
  sheet.getRange('D11').setFormula(
    '=IFERROR(IF(COUNTBLANK(' + src + '$M$2:$M)-COUNTBLANK(' + src + '$C$2:$C)=0,"none",' +
    'COUNTBLANK(' + src + '$M$2:$M)-COUNTBLANK(' + src + '$C$2:$C)),"none")');

  sheet.setColumnWidth(1, 185);
  sheet.setColumnWidth(2, 165);
  sheet.setColumnWidth(3, 30);
  sheet.setColumnWidth(4, 210);
  sheet.setColumnWidth(5, 80);
  sheet.getRange(4, 4, 5, 2)
    .setBorder(true, true, true, true, true, true, THEME.line, SpreadsheetApp.BorderStyle.SOLID);
}

/* ------------------------------ HELPERS ------------------------------ */

function parseBody(e) {
  if (e && e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch (err) { /* fall through */ }
  }
  return (e && e.parameter) || {};
}

function trim(v) { return v === null || v === undefined ? '' : String(v).trim(); }

function titleCase(s) {
  return s.replace(/\s+/g, ' ').replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------ MAINTENANCE ------------------------------ */

function setup() {
  var sheet = getSheet();
  styleTable(sheet);
  buildSummary();
  tidyWorkbook();

  var decks = deckFolder();

  console.log('--- Next Gen Pitch submission backend ready ---');
  console.log('workbook    : ' + sheet.getParent().getName());
  console.log('spreadsheet : ' + sheet.getParent().getUrl());
  console.log('data tab    : ' + CONFIG.SHEET_NAME);
  console.log('deck folder : ' + decks.getUrl());
  console.log('data rows   : ' + Math.max(sheet.getLastRow() - 1, 0));
  console.log('Rows are written into this workbook. No extra file is created.');
  console.log('Next: Deploy -> Manage deployments -> New version, then paste the /exec URL into FORM_ENDPOINT.');
}

function reformat() {
  styleTable(getSheet());
  buildSummary();
  tidyWorkbook();
  console.log('formatting re-applied');
}

function showDiagnostics() {
  console.log(JSON.stringify(diagnostics(), null, 2));
}

/**
 * Proof that the decks are real stored files, not just links: prints the actual
 * byte size and MIME type Drive holds for each one. A 0-byte or wrong-type entry
 * would mean a broken upload.
 */
function listDecks() {
  var folder = deckFolder();
  var it = folder.getFiles();
  var total = 0, count = 0;

  console.log('deck folder: ' + folder.getUrl());
  while (it.hasNext()) {
    var f = it.next();
    count++;
    total += f.getSize();
    console.log([
      count + '.',
      f.getName(),
      '| ' + (f.getSize() / 1048576).toFixed(2) + ' MB',
      '| ' + f.getMimeType(),
      '| uploaded ' + Utilities.formatDate(f.getDateCreated(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'),
      '| ' + f.getUrl()
    ].join(' '));
  }

  console.log('---');
  console.log(count + ' file(s), ' + (total / 1048576).toFixed(2) + ' MB stored in Drive');
  if (!count) console.log('No decks yet. Files appear here as teams submit.');
}

/**
 * Bundles every stored deck into a single .zip beside the workbook, so you can
 * download the whole set in one click and keep an offline copy on your machine.
 * Re-run any time; the previous archive is replaced.
 */
function zipAllDecks() {
  var folder = deckFolder();
  var it = folder.getFiles();
  var blobs = [];

  while (it.hasNext()) {
    var f = it.next();
    blobs.push(f.getBlob().setName(f.getName()));
  }
  if (!blobs.length) return console.log('No decks to zip yet.');

  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmm');
  var zipName = 'Next Gen Pitch decks ' + stamp + '.zip';

  var parents = DriveApp.getFileById(sheetId()).getParents();
  var destination = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();

  // clear older archives so the folder does not fill with near-duplicates
  var old = destination.getFilesByType('application/zip');
  while (old.hasNext()) {
    var candidate = old.next();
    if (candidate.getName().indexOf('Next Gen Pitch decks') === 0) candidate.setTrashed(true);
  }

  var zip = destination.createFile(Utilities.zip(blobs, zipName));
  console.log('zipped ' + blobs.length + ' deck(s): ' + zip.getUrl());
  console.log('Download that file for an offline copy of every pitch deck.');
}

/** Field rules only — writes nothing. */
function testValidation() {
  var base = {
    teamName:'Team Nova', eurekaId:'EU2026AB12', leaderName:'Asha Patel',
    leaderEmail:'asha@csmu.ac.in', leaderPhone:'9876543210', confirmation:'Yes',
    startupIdea:'We are building a campus logistics platform that lets hostel students ' +
                'share verified delivery runs, cutting cost and wait time for everyone involved.',
    fileName:'deck.pdf', fileSize:1024 * 500, fileData:'QQ=='
  };
  function run(label, patch) {
    var d = {};
    Object.keys(base).forEach(function (k) { d[k] = base[k]; });
    Object.keys(patch).forEach(function (k) { d[k] = patch[k]; });
    var r = validateSubmission(d);
    console.log(label + ' -> ' + (r.error ? 'REJECT: ' + r.error : 'accept'));
  }
  run('valid submission',   {});
  run('no eureka id',       { eurekaId:'' });
  run('eureka = NA',        { eurekaId:'NA' });
  run('eureka = pending',   { eurekaId:'pending' });
  run('eureka no digits',   { eurekaId:'TEAMALPHA' });
  run('eureka too short',   { eurekaId:'E1' });
  run('bad email',          { leaderEmail:'asha@csmu' });
  run('short phone',        { leaderPhone:'98765' });
  run('idea too short',     { startupIdea:'An app for students.' });
  run('no confirmation',    { confirmation:'' });
  run('missing file',       { fileData:'' });
  run('wrong file type',    { fileName:'deck.docx' });
  run('file too big',       { fileSize:40 * 1024 * 1024 });
}

/** End-to-end insert with a tiny real PDF, so the Drive upload path is exercised. */
function testSubmit() {
  var pdf = 'JVBERi0xLjQKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAw' +
            'IG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8' +
            'PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL01lZGlhQm94WzAgMCA5OSA5OV0+PgplbmRvYmoKdHJh' +
            'aWxlcgo8PC9Sb290IDEgMCBSPj4K';
  var out = doPost({ postData: { contents: JSON.stringify({
    token: CONFIG.SHARED_SECRET,
    teamName: 'test team',
    eurekaId: 'EU2026TEST1',
    leaderName: 'test leader',
    leaderEmail: 'leader@example.edu',
    leaderPhone: '9876543210',
    startupIdea: 'This is a test submission used to verify that the backend stores the row ' +
                 'in the sheet and the deck file in the Drive folder correctly.',
    confirmation: 'Yes',
    fileName: 'test-deck.pdf',
    fileType: 'application/pdf',
    fileSize: 400,
    fileData: pdf,
    submittedAt: new Date().toISOString(),
    page: 'manual test'
  }) } });
  console.log(out.getContent());
}

/** Removes test rows and their uploaded decks. */
function deleteTestRows() {
  var sheet = getSheet();
  var rows = sheet.getLastRow() - 1;
  if (rows < 1) return console.log('nothing to delete');

  var values = sheet.getRange(2, COL.MAIL, rows, 8).getValues();  // email .. deck link
  var removed = 0, files = 0;

  for (var i = values.length - 1; i >= 0; i--) {
    if (!/@example\.edu$/i.test(String(values[i][0]).trim())) continue;

    var link = String(values[i][7] || '');
    var match = link.match(/[-\w]{25,}/);
    if (match) {
      try { DriveApp.getFileById(match[0]).setTrashed(true); files++; }
      catch (err) { console.warn('could not trash deck: ' + err); }
    }
    sheet.deleteRow(i + 2);
    removed++;
  }

  styleTable(sheet);
  buildSummary();
  console.log('deleted ' + removed + ' test row(s) and trashed ' + files + ' deck file(s)');
}
