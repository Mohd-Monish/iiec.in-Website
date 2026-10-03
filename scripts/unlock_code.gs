/**
 * UNLOCK — Interactive Discovery Workshop registration backend.
 *
 * POST from unlock.html  ->  one row per student, written into THIS spreadsheet
 * (the workbook holding the script). No second file is created: your spreadsheet
 * IS the database. Download it as .xlsx any time via File -> Download -> Microsoft
 * Excel.
 *
 * FIRST RUN
 *  1. Create (or open) your spreadsheet -> Extensions -> Apps Script -> paste this
 *     file -> Save. The script now lives inside that workbook.
 *  2. Run `setup` and approve the authorisation prompt (Sheets + external requests).
 *     This builds the data tab and the Summary tab in the current workbook.
 *  3. Deploy -> New deployment -> Web app
 *       Execute as:      Me
 *       Who has access:  Anyone
 *     Copy the /exec URL into REGISTRATION_ENDPOINT in unlock.html.
 *  4. After every code edit: Deploy -> Manage deployments -> pencil ->
 *     Version: NEW VERSION -> Deploy. The /exec URL serves the last published
 *     version, so saving alone changes nothing.
 *
 * HELPERS
 *    setup()            build the tabs, print the link
 *    reformat()         re-apply table formatting over existing rows
 *    showDiagnostics()  print where the data is and how many rows / seats
 *    testValidation()   check the field rules, touches nothing
 *    testSubmit()       insert one fake row end-to-end
 *    deleteTestRows()   remove rows whose email ends in @example.edu
 */

/* ------------------------------ CONFIG ------------------------------ */
var CONFIG = {
  /* Leave SHEET_ID empty when this script is attached to the spreadsheet
     (Extensions > Apps Script). Only set it to run standalone against another file. */
  SHEET_ID:       '',
  SHEET_NAME:     'UNLOCK Registrations',
  SUMMARY_NAME:   'Summary',
  NAMED_RANGE:    'UnlockRegistrations',

  SEAT_LIMIT:     20,       // seats advertised on the page; drives the "seats left" count
  CLOSE_WHEN_FULL: false,   // true = reject new rows once SEAT_LIMIT is reached

  ALLOW_RESUBMIT: true,     // true = same email/enrollment updates the existing row
  SHARED_SECRET:  '',       // '' = no token check
  NOTIFY_EMAIL:   ''        // '' = no email alerts; else 'you@gmail.com'
};

/* Table layout. Keep HEADERS, COL and WIDTHS in step if you add a field. */
var HEADERS = [
  'No.', 'Timestamp', 'Full Name', 'Enrollment No.', 'Email', 'Mobile',
  'Department', 'Year / Sem', 'Attended IIEC before?',
  'Has idea?', 'Idea description', 'Expectations', 'Heard from', 'User agent'
];
var COL = {
  NO:1, TS:2, NAME:3, ENROLL:4, EMAIL:5, MOBILE:6,
  DEPT:7, YEAR:8, PREV:9,
  HASIDEA:10, IDEA:11, EXPECT:12, HEARD:13, UA:14
};
var WIDTHS = [50, 155, 190, 150, 235, 130, 190, 130, 150, 90, 340, 340, 220, 250];

var YESNO   = ['Yes', 'No'];
var HEARD_OPTIONS = [
  'Friends or classmates', 'Faculty or department notice', 'Social media',
  'Posters on campus', 'IIEC session or communication', 'Other'
];

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

function sheetId() {
  return targetSpreadsheet().getId();
}

/* ------------------------------ ROUTES ------------------------------ */

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.diag) return json(diagnostics());
  return json({ ok:true, service:'UNLOCK workshop registration', time:new Date().toISOString() });
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
      ? { name:CONFIG.SHEET_NAME, registrations:rows, columns:sheet.getLastColumn(),
          seatLimit:CONFIG.SEAT_LIMIT, seatsLeft:Math.max(CONFIG.SEAT_LIMIT - rows, 0) }
      : { error:'tab "' + CONFIG.SHEET_NAME + '" not found — run setup()' };
  } catch (err) {
    out.spreadsheet = { error:String(err && err.message || err) };
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

    var rowNumber, replaced = false, seatsLeft;
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);                     // serialise concurrent submissions
    try {
      var sheet = getSheet();
      var rows = Math.max(sheet.getLastRow() - 1, 0);
      var existing = findRow(sheet, entry.email, entry.enrollment);

      if (existing > 0 && !CONFIG.ALLOW_RESUBMIT) {
        return json({ ok:false, error:'You are already registered for UNLOCK' });
      }

      // Only new rows count against the seat cap; a resubmission reuses its seat.
      if (CONFIG.CLOSE_WHEN_FULL && existing === 0 && rows >= CONFIG.SEAT_LIMIT) {
        return json({ ok:false, error:'Registrations are full — all ' + CONFIG.SEAT_LIMIT + ' seats are taken' });
      }

      rowNumber = existing > 0 ? existing : sheet.getLastRow() + 1;
      replaced = existing > 0;

      sheet.getRange(rowNumber, 1, 1, HEADERS.length).setValues([[
        rowNumber - 1,
        data.submittedAt ? new Date(data.submittedAt) : new Date(),
        entry.fullName,
        entry.enrollment,
        entry.email,
        entry.mobile,
        entry.department,
        entry.year,
        entry.prevIIEC,
        entry.hasIdea,
        entry.ideaDesc,
        entry.expectations,
        entry.heardFrom,
        trim(data.userAgent)
      ]]);

      styleTable(sheet);
      SpreadsheetApp.flush();

      seatsLeft = Math.max(CONFIG.SEAT_LIMIT - Math.max(sheet.getLastRow() - 1, 0), 0);
    } finally {
      lock.releaseLock();
    }

    // Must never break the submission.
    if (CONFIG.NOTIFY_EMAIL) {
      try {
        MailApp.sendEmail(CONFIG.NOTIFY_EMAIL,
          'New UNLOCK registration: ' + entry.fullName,
          ['Name: ' + entry.fullName + '  (' + entry.enrollment + ')',
           'Contact: ' + entry.email + ' | ' + entry.mobile,
           'Academic: ' + entry.department + ', ' + entry.year,
           'Attended IIEC before: ' + entry.prevIIEC,
           'Has idea: ' + entry.hasIdea + (entry.ideaDesc ? ' — ' + entry.ideaDesc : ''),
           'Expectations: ' + (entry.expectations || '—'),
           'Heard from: ' + entry.heardFrom,
           '',
           'Seats left: ' + seatsLeft + ' of ' + CONFIG.SEAT_LIMIT].join('\n'));
      } catch (err) { console.warn('notify failed: ' + err); }
    }

    return json({ ok:true, row:rowNumber, replaced:replaced, seatsLeft:seatsLeft });
  } catch (err) {
    console.error(err);
    return json({ ok:false, error:String(err && err.message || err) });
  }
}

/* ------------------------------ VALIDATION ------------------------------ */
/**
 * Mirrors the validators in unlock.html. The browser copy is for UX; this is the
 * copy that protects the sheet, because anyone can POST to a public /exec URL.
 */
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

function validateSubmission(data) {
  var fullName   = trim(data.fullName).replace(/\s+/g, ' ');
  var enrollment = trim(data.enrollment);
  var email      = trim(data.email).toLowerCase();
  var mobile     = trim(data.mobile);
  var department = trim(data.department).replace(/\s+/g, ' ');
  var year       = trim(data.year);
  var prevIIEC   = trim(data.prevIIEC);
  var hasIdea    = trim(data.hasIdea);
  var ideaDesc   = trim(data.ideaDesc);
  var expect     = trim(data.expectations);
  var heardFrom  = trim(data.heardFrom);

  if (fullName.length < 2)   return { error:'Full name is required' };
  if (enrollment.length < 2) return { error:'Enrollment number is required' };

  if (!email) return { error:'Email is required' };
  if (/\s/.test(email)) return { error:'Email cannot contain spaces' };
  if (!EMAIL_RE.test(email)) return { error:'Email is not valid' };

  var digits = mobile.replace(/\D/g, '');
  // Accept a bare 10-digit Indian mobile or the same with a country code.
  var mobileOk =
    (digits.length === 10 && /^[6-9]/.test(digits)) ||
    (digits.length === 11 && digits.charAt(0) === '0') ||
    (digits.length === 12 && digits.indexOf('91') === 0) ||
    (digits.length === 13 && digits.indexOf('091') === 0);
  if (!mobileOk) return { error:'Mobile number must be a valid 10-digit number' };

  if (department.length < 2) return { error:'Department is required' };
  if (year.length < 1) return { error:'Year / semester is required' };

  if (YESNO.indexOf(prevIIEC) === -1) return { error:'Please answer whether you attended an IIEC event before' };
  if (YESNO.indexOf(hasIdea) === -1)  return { error:'Please answer whether you have an idea' };

  // The idea description is only required when they said they have one.
  if (hasIdea === 'Yes') {
    if (ideaDesc.length < 5) return { error:'Please describe your idea (at least 5 characters)' };
  } else {
    ideaDesc = '';   // discard anything sent when the answer was No
  }

  if (!heardFrom) return { error:'Please tell us how you heard about UNLOCK' };
  if (HEARD_OPTIONS.indexOf(heardFrom) === -1) return { error:'Invalid "heard from" option' };

  return {
    fullName: titleCase(fullName),
    enrollment: enrollment.toUpperCase(),
    email: email,
    mobile: mobile,
    department: department,
    year: year,
    prevIIEC: prevIIEC,
    hasIdea: hasIdea,
    ideaDesc: ideaDesc,
    expectations: expect,
    heardFrom: heardFrom
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
  sheet.setFrozenColumns(3);                       // No. + Timestamp + Name stay in view

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
  sheet.getRange(2, COL.MOBILE, n, 1).setNumberFormat('@');   // keeps +91 / leading zeros
  sheet.getRange(2, COL.PREV, n, 1).setHorizontalAlignment('center');
  sheet.getRange(2, COL.HASIDEA, n, 1).setHorizontalAlignment('center');

  if (rows > 0) {
    var body = sheet.getRange(2, 1, rows, cols);
    body.setFontSize(10).setVerticalAlignment('top').setWrap(false);
    body.setBorder(true, true, true, true, true, true, THEME.line, SpreadsheetApp.BorderStyle.SOLID);

    // the free-text columns are the ones worth reading in place
    sheet.getRange(2, COL.IDEA, rows, 1).setWrap(true);
    sheet.getRange(2, COL.EXPECT, rows, 1).setWrap(true);

    sheet.getRange(2, COL.PREV, rows, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(YESNO, true).setAllowInvalid(true).build());
    sheet.getRange(2, COL.HASIDEA, rows, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(YESNO, true).setAllowInvalid(true).build());

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

/** Row index matching this email or enrollment number, else 0. */
function findRow(sheet, email, enrollment) {
  var rows = sheet.getLastRow() - 1;
  if (rows < 1) return 0;

  var values = sheet.getRange(2, COL.ENROLL, rows, 2).getValues();  // enrollment, email
  var mail = String(email).trim().toLowerCase();
  var enr = String(enrollment).trim().toUpperCase();

  for (var i = 0; i < rows; i++) {
    var rowEnr  = String(values[i][0]).trim().toUpperCase();
    var rowMail = String(values[i][1]).trim().toLowerCase();
    if (mail && rowMail === mail) return i + 2;
    if (enr && rowEnr === enr) return i + 2;
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

  sheet.getRange('A1').setValue('UNLOCK — Registration Summary')
    .setFontSize(14).setFontWeight('bold').setFontColor(THEME.accent);
  sheet.getRange('A2').setFormula('="Updated "&TEXT(NOW(),"yyyy-mm-dd hh:mm")')
    .setFontColor('#6B7280').setFontSize(9);

  sheet.getRange('A4').setValue('Registrations').setFontWeight('bold');
  sheet.getRange('B4').setFormula('=COUNTA(' + src + '$C$2:$C)');
  sheet.getRange('A5').setValue('Seat limit').setFontWeight('bold');
  sheet.getRange('B5').setValue(CONFIG.SEAT_LIMIT);
  sheet.getRange('A6').setValue('Seats left').setFontWeight('bold');
  sheet.getRange('B6').setFormula('=MAX(B5-B4,0)');
  sheet.getRange('A7').setValue('Latest submission').setFontWeight('bold');
  sheet.getRange('B7').setFormula('=IFERROR(TEXT(MAX(' + src + '$B$2:$B),"yyyy-mm-dd hh:mm"),"—")');
  sheet.getRange('A8').setValue('Registered today').setFontWeight('bold');
  sheet.getRange('B8').setFormula('=COUNTIFS(' + src + '$B$2:$B,">="&TODAY(),' + src + '$B$2:$B,"<"&TODAY()+1)');
  sheet.getRange('A9').setValue('Come with an idea').setFontWeight('bold');
  sheet.getRange('B9').setFormula('=COUNTIF(' + src + '$J$2:$J,"Yes")');
  sheet.getRange('A10').setValue('Returning (attended before)').setFontWeight('bold');
  sheet.getRange('B10').setFormula('=COUNTIF(' + src + '$I$2:$I,"Yes")');

  // how did they hear about it
  sheet.getRange('D4:E4').setValues([['Heard about UNLOCK', 'Count']])
    .setFontWeight('bold').setBackground(THEME.header).setFontColor(THEME.headerText);
  HEARD_OPTIONS.forEach(function (opt, i) {
    var r = 5 + i;
    sheet.getRange(r, 4).setValue(opt);
    sheet.getRange(r, 5).setFormula('=COUNTIF(' + src + '$M$2:$M,D' + r + ')');
  });
  var heardEnd = 4 + HEARD_OPTIONS.length;
  sheet.getRange(heardEnd + 1, 4).setValue('Total').setFontWeight('bold');
  sheet.getRange(heardEnd + 1, 5).setFormula('=SUM(E5:E' + heardEnd + ')').setFontWeight('bold');

  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 90);
  sheet.setColumnWidth(3, 30);
  sheet.setColumnWidth(4, 260);
  sheet.setColumnWidth(5, 80);
  sheet.getRange(4, 4, HEARD_OPTIONS.length + 2, 2)
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

  console.log('--- UNLOCK registration backend ready ---');
  console.log('workbook    : ' + sheet.getParent().getName());
  console.log('spreadsheet : ' + sheet.getParent().getUrl());
  console.log('data tab    : ' + CONFIG.SHEET_NAME);
  console.log('seat limit  : ' + CONFIG.SEAT_LIMIT);
  console.log('rows        : ' + Math.max(sheet.getLastRow() - 1, 0));
  console.log('Rows are written into this workbook. No extra file is created.');
  console.log('Next: Deploy -> Manage deployments -> New version, then paste the /exec URL into REGISTRATION_ENDPOINT.');
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

/** Field rules only — writes nothing. */
function testValidation() {
  var base = {
    fullName:'Asha Patel', enrollment:'CSMU2026001', email:'asha@csmu.ac.in',
    mobile:'9876543210', department:'Computer Science', year:'2nd Year',
    prevIIEC:'No', hasIdea:'No', ideaDesc:'', expectations:'Curious to learn.',
    heardFrom:'Social media'
  };
  function run(label, patch) {
    var d = {};
    Object.keys(base).forEach(function (k) { d[k] = base[k]; });
    Object.keys(patch).forEach(function (k) { d[k] = patch[k]; });
    var r = validateSubmission(d);
    console.log(label + ' -> ' + (r.error ? 'REJECT: ' + r.error : 'accept'));
  }
  run('valid, no idea',       {});
  run('valid, with idea',     { hasIdea:'Yes', ideaDesc:'A campus delivery-sharing app.' });
  run('no name',              { fullName:'' });
  run('no enrollment',        { enrollment:'' });
  run('bad email',            { email:'asha@csmu' });
  run('short mobile',         { mobile:'98765' });
  run('mobile starts 5',      { mobile:'5876543210' });
  run('+91 mobile',           { mobile:'+91 98765 43210' });
  run('no department',        { department:'' });
  run('no year',              { year:'' });
  run('prevIIEC blank',       { prevIIEC:'' });
  run('hasIdea blank',        { hasIdea:'' });
  run('idea=Yes no desc',     { hasIdea:'Yes', ideaDesc:'' });
  run('heardFrom blank',      { heardFrom:'' });
  run('heardFrom invalid',    { heardFrom:'TV advert' });
}

/** End-to-end insert of one fake row. */
function testSubmit() {
  var out = doPost({ postData: { contents: JSON.stringify({
    token: CONFIG.SHARED_SECRET,
    fullName: 'test student',
    enrollment: 'TEST0001',
    email: 'test.student@example.edu',
    mobile: '9876543210',
    department: 'Computer Science',
    year: '2nd Year',
    prevIIEC: 'No',
    hasIdea: 'Yes',
    ideaDesc: 'A test idea used to verify the backend stores the row correctly.',
    expectations: 'Testing the pipeline end to end.',
    heardFrom: 'Social media',
    submittedAt: new Date().toISOString()
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
