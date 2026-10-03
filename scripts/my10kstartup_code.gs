/**
 * My ₹10K Startup — entry submission backend.
 *
 * POST from my10kstartup.html  ->  one row per entry, written into THIS spreadsheet
 * (the workbook holding the script). No second file is created: your spreadsheet IS
 * the database. Download it as .xlsx any time via File -> Download -> Microsoft Excel.
 *
 * The challenge is judged on creativity, feasibility, problem-solving, business
 * thinking and presentation, so the row keeps the full text of every answer plus a
 * clickable Story link and the handle, ready for shortlisting.
 *
 * FIRST RUN
 *  1. Create (or open) your spreadsheet -> Extensions -> Apps Script -> paste this
 *     file -> Save. The script now lives inside that workbook.
 *  2. Run `setup` and approve the authorisation prompt (Sheets + external requests).
 *     This builds the data tab and the Summary tab in the current workbook.
 *  3. Deploy -> New deployment -> Web app
 *       Execute as:      Me
 *       Who has access:  Anyone
 *     Copy the /exec URL into FORM_ENDPOINT in my10kstartup.html.
 *  4. After every code edit: Deploy -> Manage deployments -> pencil ->
 *     Version: NEW VERSION -> Deploy. The /exec URL serves the last published
 *     version, so saving alone changes nothing.
 *
 * HELPERS
 *    setup()             build the tabs, print the link
 *    reformat()          re-apply table formatting over existing rows
 *    showDiagnostics()   print where the data is and how many entries
 *    testValidation()    check the field rules, touches nothing
 *    testSubmit()        insert one fake entry end-to-end
 *    deleteTestRows()    remove rows whose email ends in @example.edu
 *    closeEntries()      flip ACCEPTING_ENTRIES off after the deadline
 */

/* ------------------------------ CONFIG ------------------------------ */
var CONFIG = {
  /* Leave SHEET_ID empty when this script is attached to the spreadsheet
     (Extensions > Apps Script). Only set it to run standalone against another file. */
  SHEET_ID:       '',
  SHEET_NAME:     'My 10K Startup Entries',
  SUMMARY_NAME:   'Summary',
  NAMED_RANGE:    'My10KEntries',

  /* Entry deadline from the page: 12 September 2026, end of day IST.
     Late posts are still stored, but flagged in the "Late?" column so judging can
     filter them out — losing a student's work silently would be worse. */
  DEADLINE:       '2026-09-12T23:59:59+05:30',
  ACCEPTING_ENTRIES: true,   // false = reject new entries outright

  ALLOW_RESUBMIT: true,      // true = same email/enrollment updates the existing row
  SHARED_SECRET:  '',        // '' = no token check
  NOTIFY_EMAIL:   ''         // '' = no email alerts; else 'you@gmail.com'
};

/* Table layout. Keep HEADERS, COL and WIDTHS in step if you add a field.
   The idea itself is judged from the Instagram Story, so the sheet stores who
   entered and where to watch it — not a written copy of the pitch. */
var HEADERS = [
  'No.', 'Timestamp', 'Late?', 'Full Name', 'Enrollment No.', 'Email', 'Mobile',
  'Department', 'Year / Sem',
  'Instagram Handle', 'Story Link',
  'Confirmed', 'Page', 'User agent'
];
var COL = {
  NO:1, TS:2, LATE:3, NAME:4, ENROLL:5, EMAIL:6, MOBILE:7,
  DEPT:8, YEAR:9,
  HANDLE:10, STORY:11,
  CONFIRM:12, PAGE:13, UA:14
};
var WIDTHS = [50, 155, 70, 185, 145, 230, 130, 175, 120, 165, 320, 95, 200, 240];

var THEME = {
  header:'#111111', headerText:'#FFFFFF',
  accent:'#FF5A1F', line:'#D8D8D0', band:'#FBF3EF'
};

/* ------------------------------ DESTINATION ------------------------------ */
/**
 * The workbook this script is attached to. getActiveSpreadsheet() returns it even
 * when the code runs from a web app request, so rows land in the same file that
 * holds the script. Standalone fallback: CONFIG.SHEET_ID.
 */
function targetSpreadsheet() {
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  if (CONFIG.SHEET_ID) return SpreadsheetApp.openById(CONFIG.SHEET_ID);
  throw new Error('No spreadsheet found. Attach this script to a spreadsheet ' +
                  '(Extensions > Apps Script) or set CONFIG.SHEET_ID.');
}

/* ------------------------------ ROUTES ------------------------------ */

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.diag) return json(diagnostics());
  return json({ ok:true, service:'My 10K Startup entry submission', time:new Date().toISOString() });
}

function diagnostics() {
  var out = { ok:true, time:new Date().toISOString() };
  try {
    var ss = targetSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    var rows = sheet ? Math.max(sheet.getLastRow() - 1, 0) : 0;
    out.spreadsheet = { name:ss.getName(), id:ss.getId(), url:ss.getUrl(),
                        bound:!!SpreadsheetApp.getActiveSpreadsheet(),
                        tabs:ss.getSheets().map(function (s) { return s.getName(); }) };
    out.sheet = sheet
      ? { name:CONFIG.SHEET_NAME, entries:rows, columns:sheet.getLastColumn() }
      : { error:'tab "' + CONFIG.SHEET_NAME + '" not found — run setup()' };
    out.entries = { accepting:CONFIG.ACCEPTING_ENTRIES, deadline:CONFIG.DEADLINE, past:isLate() };
  } catch (err) {
    out.spreadsheet = { error:String(err && err.message || err) };
  }
  return out;
}

/** True once the deadline has passed. */
function isLate(when) {
  var deadline = new Date(CONFIG.DEADLINE);
  if (isNaN(deadline.getTime())) return false;      // bad config: never flag
  return (when ? new Date(when) : new Date()).getTime() > deadline.getTime();
}

function doPost(e) {
  try {
    var data = parseBody(e);

    if (CONFIG.SHARED_SECRET && data.token !== CONFIG.SHARED_SECRET) {
      return json({ ok:false, error:'Unauthorised' });
    }
    if (!CONFIG.ACCEPTING_ENTRIES) {
      return json({ ok:false, error:'Entries for My ₹10K Startup are closed' });
    }

    var entry = validateSubmission(data);
    if (entry.error) return json({ ok:false, error:entry.error });

    /* Server clock decides the timestamp and the late flag. The browser sends
       submittedAt, but trusting it would let anyone back-date an entry past the
       deadline by changing their device clock. */
    var stamp = new Date();
    var late = isLate(stamp);

    var rowNumber, replaced = false;
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);                     // serialise concurrent submissions
    try {
      var sheet = getSheet();
      var existing = findRow(sheet, entry.email, entry.enrollment, entry.handle);

      // One entry per participant is a rule of the challenge.
      if (existing > 0 && !CONFIG.ALLOW_RESUBMIT) {
        return json({ ok:false, error:'You have already submitted an entry' });
      }

      rowNumber = existing > 0 ? existing : sheet.getLastRow() + 1;
      replaced = existing > 0;

      sheet.getRange(rowNumber, 1, 1, HEADERS.length).setValues([[
        rowNumber - 1,
        stamp,
        late ? 'LATE' : '',
        entry.fullName,
        entry.enrollment,
        entry.email,
        entry.mobile,
        entry.department,
        entry.year,
        entry.handle,
        entry.storyLink,
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
        MailApp.sendEmail(CONFIG.NOTIFY_EMAIL,
          'My ₹10K Startup entry: ' + entry.fullName,
          ['Name: ' + entry.fullName + '  (' + entry.enrollment + ')',
           'Contact: ' + entry.email + ' | ' + entry.mobile,
           'Academic: ' + entry.department + ', ' + entry.year,
           'Instagram: ' + entry.handle,
           'Story: ' + entry.storyLink,
           '',
           late ? '*** SUBMITTED AFTER THE DEADLINE ***' : ''].join('\n'));
      } catch (err) { console.warn('notify failed: ' + err); }
    }

    return json({ ok:true, row:rowNumber, replaced:replaced, late:late });
  } catch (err) {
    console.error(err);
    return json({ ok:false, error:String(err && err.message || err) });
  }
}

/* ------------------------------ VALIDATION ------------------------------ */
/**
 * Mirrors the check() function in my10kstartup.html. The browser copy is for UX;
 * this is the copy that protects the sheet, because anyone can POST to a public
 * /exec URL.
 */
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
var PLACEHOLDER_RE = /^(na|n\/a|nil|none|no|tbd|pending|later|test|-+|\.+|x{3,})$/i;

function emailProblem(value) {
  if (!value) return 'Email is required';
  if (/\s/.test(value)) return 'Email cannot contain spaces';
  if (!EMAIL_RE.test(value)) return 'Email is not valid';
  return '';
}

function phoneKey(value) {
  var digits = String(value || '').replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function phoneProblem(value) {
  if (!value) return 'Mobile number is required';
  if (/[^0-9+\s()-]/.test(value)) return 'Mobile number has invalid characters';
  var d = value.replace(/\D/g, '');
  if (d.length === 10) {
    return /^[6-9]/.test(d) ? '' : 'Mobile number must start with 6, 7, 8 or 9';
  }
  if (d.length === 11 && d.charAt(0) === '0') return '';
  if (d.length === 12 && d.indexOf('91') === 0) return '';
  if (d.length === 13 && d.indexOf('091') === 0) return '';
  return d.length < 10 ? 'Mobile number is too short' : 'Mobile number is too long';
}

/** Normalises to a bare lowercase username, or returns an error. */
function handleProblem(value) {
  if (!value) return 'Instagram handle is required';
  var h = value.replace(/^@+/, '');
  if (h.length < 2) return 'Instagram handle is too short';
  if (h.length > 30) return 'Instagram handle is too long';
  if (!/^[A-Za-z0-9._]+$/.test(h)) return 'Instagram handle has invalid characters';
  return '';
}

function storyProblem(value) {
  if (!value) return 'Story link is required';
  if (!/^https?:\/\//i.test(value)) return 'Story link must start with https://';
  if (!/instagram\.com/i.test(value)) return 'Story link must be an instagram.com URL';
  return '';
}

function validateSubmission(data) {
  var fullName   = trim(data.fullName).replace(/\s+/g, ' ');
  var enrollment = trim(data.enrollment);
  var email      = trim(data.email).toLowerCase();
  var mobile     = trim(data.mobile);
  var department = trim(data.department).replace(/\s+/g, ' ');
  var year       = trim(data.year);
  var handle     = trim(data.handle);
  var storyLink  = trim(data.storyLink);

  function placeholder(v) { return PLACEHOLDER_RE.test(v); }

  if (fullName.length < 3) return { error:'Full name is required' };
  if (placeholder(fullName)) return { error:'Full name looks like a placeholder' };

  if (enrollment.length < 2) return { error:'Enrollment number is required' };
  if (placeholder(enrollment)) return { error:'Enrollment number looks like a placeholder' };

  var mailErr = emailProblem(email);
  if (mailErr) return { error:mailErr };

  var phoneErr = phoneProblem(mobile);
  if (phoneErr) return { error:phoneErr };

  if (department.length < 2 || placeholder(department)) return { error:'Department is required' };
  if (year.length < 1 || placeholder(year)) return { error:'Year / semester is required' };

  var handleErr = handleProblem(handle);
  if (handleErr) return { error:handleErr };

  var storyErr = storyProblem(storyLink);
  if (storyErr) return { error:storyErr };

  if (!/^(yes|true|on|1)$/i.test(trim(data.consent))) {
    return { error:'You must confirm the declaration before submitting' };
  }

  return {
    fullName: titleCase(fullName),
    enrollment: enrollment.toUpperCase(),
    email: email,
    mobile: mobile,
    mobileKey: phoneKey(mobile),
    department: department,
    year: year,
    handle: '@' + handle.replace(/^@+/, '').toLowerCase(),
    storyLink: storyLink,
    confirmed: true
  };
}

/* ------------------------------ SHEET / TABLE ------------------------------ */

function getSheet() {
  var ss = targetSpreadsheet();
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
  var ss = targetSpreadsheet();
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
  sheet.setFrozenColumns(4);                 // No. .. Full Name stay in view

  // the Instagram columns get the accent: they are what judging actually opens
  sheet.getRange(1, COL.HANDLE, 1, 2).setBackground(THEME.accent);

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
  sheet.getRange(2, COL.LATE, n, 1).setHorizontalAlignment('center');
  sheet.getRange(2, COL.MOBILE, n, 1).setNumberFormat('@');   // keeps +91 / leading zeros
  sheet.getRange(2, COL.HANDLE, n, 1).setNumberFormat('@');   // keeps the leading @
  sheet.getRange(2, COL.CONFIRM, n, 1).setHorizontalAlignment('center');

  if (rows > 0) {
    var body = sheet.getRange(2, 1, rows, cols);
    body.setFontSize(10).setVerticalAlignment('middle').setWrap(false);
    body.setBorder(true, true, true, true, true, true, THEME.line, SpreadsheetApp.BorderStyle.SOLID);

    sheet.getRange(2, COL.CONFIRM, rows, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['Yes', 'No'], true).setAllowInvalid(true).build());

    // late entries stand out without needing a manual scan
    var lateRule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('LATE')
      .setBackground('#FFE1D6')
      .setFontColor('#DC4310')
      .setBold(true)
      .setRanges([sheet.getRange(2, COL.LATE, rows, 1)])
      .build();
    sheet.setConditionalFormatRules([lateRule]);

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

/** Row index matching this email, enrollment number or Instagram handle, else 0. */
function findRow(sheet, email, enrollment, handle) {
  var rows = sheet.getLastRow() - 1;
  if (rows < 1) return 0;

  // enrollment, email, mobile, dept, year, handle
  var values = sheet.getRange(2, COL.ENROLL, rows, 6).getValues();
  var mail = String(email).trim().toLowerCase();
  var enr = String(enrollment).trim().toUpperCase();
  var hdl = String(handle).trim().toLowerCase().replace(/^@+/, '');

  for (var i = 0; i < rows; i++) {
    var rowEnr  = String(values[i][0]).trim().toUpperCase();
    var rowMail = String(values[i][1]).trim().toLowerCase();
    var rowHdl  = String(values[i][5]).trim().toLowerCase().replace(/^@+/, '');
    if (mail && rowMail === mail) return i + 2;
    if (enr && rowEnr === enr) return i + 2;
    if (hdl && rowHdl === hdl) return i + 2;
  }
  return 0;
}

/* ------------------------------ SUMMARY TAB ------------------------------ */
function buildSummary() {
  var ss = targetSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SUMMARY_NAME) || ss.insertSheet(CONFIG.SUMMARY_NAME);
  var src = "'" + CONFIG.SHEET_NAME + "'!";

  sheet.clear();
  sheet.getBandings().forEach(function (b) { b.remove(); });

  sheet.getRange('A1').setValue('My ₹10K Startup — Entry Summary')
    .setFontSize(14).setFontWeight('bold').setFontColor(THEME.accent);
  sheet.getRange('A2').setFormula('="Updated "&TEXT(NOW(),"yyyy-mm-dd hh:mm")')
    .setFontColor('#6B7280').setFontSize(9);

  sheet.getRange('A4').setValue('Total entries').setFontWeight('bold');
  sheet.getRange('B4').setFormula('=COUNTA(' + src + '$D$2:$D)');
  sheet.getRange('A5').setValue('On time').setFontWeight('bold');
  sheet.getRange('B5').setFormula('=B4-B6');
  sheet.getRange('A6').setValue('Late entries').setFontWeight('bold');
  sheet.getRange('B6').setFormula('=COUNTIF(' + src + '$C$2:$C,"LATE")');
  sheet.getRange('A7').setValue('Latest submission').setFontWeight('bold');
  sheet.getRange('B7').setFormula('=IFERROR(TEXT(MAX(' + src + '$B$2:$B),"yyyy-mm-dd hh:mm"),"—")');
  sheet.getRange('A8').setValue('Submitted today').setFontWeight('bold');
  sheet.getRange('B8').setFormula('=COUNTIFS(' + src + '$B$2:$B,">="&TODAY(),' + src + '$B$2:$B,"<"&TODAY()+1)');
  sheet.getRange('A9').setValue('Distinct departments').setFontWeight('bold');
  sheet.getRange('B9').setFormula('=IFERROR(COUNTUNIQUE(' + src + '$H$2:$H),0)');
  sheet.getRange('A10').setValue('Story links captured').setFontWeight('bold');
  sheet.getRange('B10').setFormula('=COUNTIF(' + src + '$K$2:$K,"<>")');

  // entries by department, self-maintaining
  sheet.getRange('D4').setValue('Entries by department').setFontWeight('bold')
    .setBackground(THEME.header).setFontColor(THEME.headerText);
  sheet.getRange('E4').setValue('').setBackground(THEME.header);
  sheet.getRange('D5').setFormula(
    '=IFERROR(QUERY(' + src + '$H$2:$H,"select Col1, count(Col1) where Col1 is not null ' +
    'group by Col1 order by count(Col1) desc label count(Col1) \'Entries\'",0),"—")');

  // entries by year of study
  sheet.getRange('G4').setValue('Entries by year').setFontWeight('bold')
    .setBackground(THEME.header).setFontColor(THEME.headerText);
  sheet.getRange('H4').setValue('').setBackground(THEME.header);
  sheet.getRange('G5').setFormula(
    '=IFERROR(QUERY(' + src + '$I$2:$I,"select Col1, count(Col1) where Col1 is not null ' +
    'group by Col1 order by count(Col1) desc label count(Col1) \'Entries\'",0),"—")');

  sheet.setColumnWidth(1, 210);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 30);
  sheet.setColumnWidth(4, 230);
  sheet.setColumnWidth(5, 90);
  sheet.setColumnWidth(6, 30);
  sheet.setColumnWidth(7, 190);
  sheet.setColumnWidth(8, 90);
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

  console.log('--- My 10K Startup entry backend ready ---');
  console.log('workbook    : ' + sheet.getParent().getName());
  console.log('spreadsheet : ' + sheet.getParent().getUrl());
  console.log('data tab    : ' + CONFIG.SHEET_NAME);
  console.log('deadline    : ' + CONFIG.DEADLINE + (isLate() ? '  (ALREADY PASSED)' : ''));
  console.log('entries     : ' + Math.max(sheet.getLastRow() - 1, 0));
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

/** Stops accepting new entries. Run this after judging starts. */
function closeEntries() {
  console.log('Set CONFIG.ACCEPTING_ENTRIES = false in the editor, save, then ' +
              'Deploy -> Manage deployments -> New version. ' +
              'Current value: ' + CONFIG.ACCEPTING_ENTRIES);
}

/** Field rules only — writes nothing. */
function testValidation() {
  var base = {
    fullName:'Asha Patel', enrollment:'CSMU2026001', email:'asha@csmu.ac.in',
    mobile:'9876543210', department:'Computer Science', year:'2nd Year',
    handle:'@asha.builds', storyLink:'https://instagram.com/stories/asha.builds/123',
    consent:'Yes'
  };
  function run(label, patch) {
    var d = {};
    Object.keys(base).forEach(function (k) { d[k] = base[k]; });
    Object.keys(patch).forEach(function (k) { d[k] = patch[k]; });
    var r = validateSubmission(d);
    console.log(label + ' -> ' + (r.error ? 'REJECT: ' + r.error : 'accept'));
  }
  run('valid entry',          {});
  run('no name',              { fullName:'' });
  run('name = NA',            { fullName:'NA' });
  run('bad email',            { email:'asha@csmu' });
  run('short mobile',         { mobile:'98765' });
  run('+91 mobile',           { mobile:'+91 98765 43210' });
  run('handle with space',    { handle:'asha builds' });
  run('handle no @',          { handle:'ashabuilds' });
  run('story not instagram',  { storyLink:'https://facebook.com/x' });
  run('story no scheme',      { storyLink:'instagram.com/stories/x' });
  run('story empty',          { storyLink:'' });
  run('no consent',           { consent:'' });
}

/** End-to-end insert of one fake entry. */
function testSubmit() {
  var out = doPost({ postData: { contents: JSON.stringify({
    token: CONFIG.SHARED_SECRET,
    fullName: 'test student',
    enrollment: 'TEST0001',
    email: 'test.student@example.edu',
    mobile: '9876543210',
    department: 'Computer Science',
    year: '2nd Year',
    handle: '@test.student',
    storyLink: 'https://instagram.com/stories/test.student/1234567890',
    consent: 'Yes',
    submittedAt: new Date().toISOString(),
    page: 'manual test'
  }) } });
  console.log(out.getContent());
}

/** Removes rows whose email ends in @example.edu (the test entries). */
function deleteTestRows() {
  var sheet = getSheet();
  var rows = sheet.getLastRow() - 1;
  if (rows < 1) return console.log('nothing to delete');

  var emails = sheet.getRange(2, COL.EMAIL, rows, 1).getValues();
  var removed = 0;
  for (var i = emails.length - 1; i >= 0; i--) {
    if (/@example\.edu$/i.test(String(emails[i][0]).trim())) {
      sheet.deleteRow(i + 2);
      removed++;
    }
  }
  styleTable(sheet);
  buildSummary();
  console.log('deleted ' + removed + ' test row(s)');
}
