/**
 * Next Gen Pitch — registration form backend.
 *
 * POST from next_gen_pitch.html  ->  formatted Google Sheet  ->  .xlsx in Drive.
 *
 * Every participant is stored on ONE row per team: team fields, then the leader's
 * details, then Member 2 and Member 3 in their own columns (max 3 per team).
 *
 * FIRST RUN
 *  1. script.google.com -> New project -> paste this file -> Save.
 *  2. Run `setup` from the editor and approve the authorisation prompt
 *     (Sheets + Drive + external requests). With CONFIG.SHEET_ID and
 *     CONFIG.XLSX_FOLDER_ID left empty this creates the spreadsheet and the Drive
 *     folder for you, then builds the header row, banding, filter, column formats,
 *     dropdowns, named range and the Summary tab, and writes the first .xlsx.
 *     The log prints both links — open them to confirm.
 *  3. Deploy -> New deployment -> Web app
 *       Execute as:      Me
 *       Who has access:  Anyone
 *     Copy the /exec URL into FORM_ENDPOINT in next_gen_pitch.html.
 *  4. The /exec URL serves the last PUBLISHED version, so after every code edit do
 *     Deploy -> Manage deployments -> pencil -> Version: NEW VERSION -> Deploy.
 *     Editing and saving alone changes nothing.
 *
 * HELPERS you can run from the editor at any time
 *    setup()            rebuild formatting + Summary, then export
 *    reformat()         re-apply table formatting over existing rows
 *    refreshXlsxNow()   regenerate the .xlsx without adding a row
 *    showDiagnostics()  print where the data actually is
 *    testSubmit()       insert one fake 3-member team end-to-end
 *    deleteTestRows()   delete rows whose leader email ends in @example.edu
 */

/* ------------------------------ CONFIG ------------------------------ */
var CONFIG = {
  /* Leave SHEET_ID and XLSX_FOLDER_ID empty and `setup` creates both for you in
     your own Drive, then remembers them. Paste IDs here only if you want the data
     to land in a specific existing spreadsheet / folder. */
  SHEET_ID:       '',                          // spreadsheet ID from its URL: /d/<ID>/edit
  SHEET_NAME:     'Next Gen Pitch',
  SUMMARY_NAME:   'Summary',
  XLSX_FOLDER_ID: '',                          // Drive folder ID from its URL: /folders/<ID>
  XLSX_NAME:      'Next Gen Pitch Registrations.xlsx',
  /* Optional. Paste the ID of an existing .xlsx in your Drive to have the script
     overwrite THAT file every time (from its URL: /file/d/<ID>/view).
     Leave empty and the script manages its own file named XLSX_NAME. */
  XLSX_FILE_ID:   '',
  NAMED_RANGE:    'NextGenPitchData',
  MAX_MEMBERS:    3,
  SHARED_SECRET:  '',      // '' = no token check
  NOTIFY_EMAIL:   ''       // '' = no email alerts; else 'you@gmail.com'
};

/* Table layout. Keep HEADERS, COL and WIDTHS in step if you add a field. */
var HEADERS = [
  'No.', 'Timestamp', 'Team Name', 'Team Size', 'College / Organization', 'City',
  'Eureka Team ID',
  'Leader Name', 'Leader Email', 'Leader Phone',
  'Member 2 Name', 'Member 2 Email', 'Member 2 Phone',
  'Member 3 Name', 'Member 3 Email', 'Member 3 Phone',
  'Consent', 'Page', 'User agent'
];
var COL = {
  NO:1, TS:2, TEAM:3, SIZE:4, COLLEGE:5, CITY:6, EUREKA:7,
  L_NAME:8,  L_MAIL:9,  L_PHONE:10,
  M2_NAME:11, M2_MAIL:12, M2_PHONE:13,
  M3_NAME:14, M3_MAIL:15, M3_PHONE:16,
  CONSENT:17, PAGE:18, UA:19
};
var WIDTHS = [50, 155, 175, 80, 210, 130, 130,
              175, 225, 130,
              175, 225, 130,
              175, 225, 130,
              80, 210, 250];

var SIZES = ['1', '2', '3'];

var THEME = {
  header:'#111111', headerText:'#FFFFFF',
  accent:'#FF5A1F', line:'#D8D8D0', band:'#FBF3EF'
};

/* ------------------------------ DESTINATION ------------------------------ */
/**
 * Where the data lives. Order of preference:
 *   1. the ID hard-coded in CONFIG
 *   2. the ID this script created earlier (remembered in Script Properties)
 *   3. a brand new spreadsheet / folder, created now
 *
 * This is why you do not have to paste any IDs to get started, and why the
 * destination never silently moves once it exists.
 */
var SPREADSHEET_TITLE = 'Next Gen Pitch Registrations';
var FOLDER_TITLE      = 'Next Gen Pitch';

function sheetId() {
  if (CONFIG.SHEET_ID) return CONFIG.SHEET_ID;

  var props = PropertiesService.getScriptProperties();
  var saved = props.getProperty('sheetId');
  if (saved) {
    try {
      SpreadsheetApp.openById(saved);          // still exists and reachable?
      return saved;
    } catch (err) { /* fall through and make a new one */ }
  }

  var created = SpreadsheetApp.create(SPREADSHEET_TITLE);
  props.setProperty('sheetId', created.getId());
  console.log('created spreadsheet: ' + created.getUrl());
  return created.getId();
}

function folderId() {
  if (CONFIG.XLSX_FOLDER_ID) return CONFIG.XLSX_FOLDER_ID;

  var props = PropertiesService.getScriptProperties();
  var saved = props.getProperty('folderId');
  if (saved) {
    try {
      var f = DriveApp.getFolderById(saved);
      if (!f.isTrashed()) return saved;
    } catch (err) { /* fall through */ }
  }

  // reuse a folder of the same name before creating a duplicate
  var hits = DriveApp.getFoldersByName(FOLDER_TITLE);
  var folder = hits.hasNext() ? hits.next() : DriveApp.createFolder(FOLDER_TITLE);
  props.setProperty('folderId', folder.getId());
  console.log('using folder: ' + folder.getUrl());
  return folder.getId();
}

/**
 * Read-only lookups for diagnostics. ?diag=1 is a public URL, so it must never
 * create anything — otherwise a stranger loading it would make files in your Drive.
 */
function peekSheetId() {
  return CONFIG.SHEET_ID || PropertiesService.getScriptProperties().getProperty('sheetId') || '';
}

function peekFolderId() {
  return CONFIG.XLSX_FOLDER_ID || PropertiesService.getScriptProperties().getProperty('folderId') || '';
}

/** Moves the spreadsheet next to the .xlsx so everything sits in one folder. */
function fileInFolder(id, folder) {
  try {
    var file = DriveApp.getFileById(id);
    var parents = file.getParents();
    while (parents.hasNext()) {
      if (parents.next().getId() === folder.getId()) return;   // already there
    }
    file.moveTo(folder);
  } catch (err) { console.warn('could not move file into folder: ' + err); }
}

/* ------------------------------ ROUTES ------------------------------ */

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.diag) return json(diagnostics());
  return json({ ok:true, service:'Next Gen Pitch registration', time:new Date().toISOString() });
}

/**
 * Open <your /exec URL>?diag=1 to see where the data actually is.
 * Deliberately returns counts and file metadata only — no personal data, because
 * this endpoint is public.
 */
function diagnostics() {
  var out = { ok:true, time:new Date().toISOString() };

  try {
    var id = peekSheetId();
    if (!id) throw new Error('no spreadsheet yet — run setup() in the editor');
    var ss = SpreadsheetApp.openById(id);
    var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    out.spreadsheet = {
      name:ss.getName(), id:id, url:ss.getUrl(),
      tabs:ss.getSheets().map(function (s) { return s.getName(); })
    };
    out.sheet = sheet
      ? { name:CONFIG.SHEET_NAME, dataRows:Math.max(sheet.getLastRow() - 1, 0), columns:sheet.getLastColumn() }
      : { error:'tab "' + CONFIG.SHEET_NAME + '" not found' };
  } catch (err) {
    out.spreadsheet = { error:String(err && err.message || err) };
  }

  try {
    var fid = peekFolderId();
    if (!fid) throw new Error('no folder yet — run setup() in the editor');
    var folder = DriveApp.getFolderById(fid);
    var files = [], it = folder.getFiles();
    while (it.hasNext() && files.length < 25) {
      var f = it.next();
      files.push({
        name:f.getName(), id:f.getId(), mimeType:f.getMimeType(),
        bytes:f.getSize(), updated:f.getLastUpdated().toISOString()
      });
    }
    out.folder = { name:folder.getName(), id:fid, url:folder.getUrl(), files:files };
  } catch (err) {
    out.folder = { error:String(err && err.message || err) };
  }

  out.trackedXlsxId = CONFIG.XLSX_FILE_ID ||
    PropertiesService.getScriptProperties().getProperty('xlsxFileId') || null;

  return out;
}

function doPost(e) {
  try {
    var data = parseBody(e);

    if (CONFIG.SHARED_SECRET && data.token !== CONFIG.SHARED_SECRET) {
      return json({ ok:false, error:'Unauthorised' });
    }

    var team = validateSubmission(data);
    if (team.error) return json({ ok:false, error:team.error });

    var rowNumber;
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);                     // serialise concurrent submissions
    try {
      var sheet = getSheet();

      if (findRow(sheet, team.leader.email, team.leader.digits, team.teamName) > 0) {
        return json({ ok:true, duplicate:true, message:'Already registered' });
      }

      rowNumber = sheet.getLastRow() + 1;
      sheet.getRange(rowNumber, 1, 1, HEADERS.length).setValues([[
        rowNumber - 1,                                        // No.
        data.submittedAt ? new Date(data.submittedAt) : new Date(),
        team.teamName,
        String(team.size),
        team.college,
        team.city,
        team.eurekaId,
        team.leader.name, team.leader.email, team.leader.phone,
        team.members[1] ? team.members[1].name  : '',
        team.members[1] ? team.members[1].email : '',
        team.members[1] ? team.members[1].phone : '',
        team.members[2] ? team.members[2].name  : '',
        team.members[2] ? team.members[2].email : '',
        team.members[2] ? team.members[2].phone : '',
        team.consent ? 'Yes' : 'No',
        trim(data.page),
        trim(data.userAgent)
      ]]);

      styleTable(sheet);                      // keeps banding, filter and borders in step
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }

    // Neither of these may break the submission.
    var xlsxOk = false, xlsxId = null;
    try {
      var x = exportXlsx();
      xlsxOk = true;
      xlsxId = x.id;
      console.log('xlsx updated: ' + x.id + ' (' + x.bytes + ' bytes, created=' + x.created + ')');
    } catch (err) { console.warn('xlsx export failed: ' + err); }

    if (CONFIG.NOTIFY_EMAIL) {
      try {
        var lines = ['Team: ' + team.teamName, 'Size: ' + team.size,
                     team.college + ' — ' + team.city,
                     'Eureka ID: ' + (team.eurekaId || '—'), '',
                     'Leader: ' + team.leader.name + ' | ' + team.leader.email + ' | ' + team.leader.phone];
        for (var i = 1; i < team.members.length; i++) {
          if (team.members[i]) {
            lines.push('Member ' + (i + 1) + ': ' + team.members[i].name +
                       ' | ' + team.members[i].email + ' | ' + team.members[i].phone);
          }
        }
        MailApp.sendEmail(CONFIG.NOTIFY_EMAIL, 'New Next Gen Pitch registration: ' + team.teamName,
          lines.join('\n'));
      } catch (err) { console.warn('notify failed: ' + err); }
    }

    return json({ ok:true, row:rowNumber, xlsx:xlsxOk, xlsxId:xlsxId });
  } catch (err) {
    console.error(err);
    return json({ ok:false, error:String(err && err.message || err) });
  }
}

/* ------------------------------ VALIDATION ------------------------------ */
/**
 * Mirrors the checks in next_gen_pitch.html. The browser copy is for UX only —
 * this is the one that actually protects the sheet, since anyone can POST here.
 * Returns { error:'...' } or the cleaned team object.
 */
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

function emailProblem(value, who) {
  if (!value) return who + ' email is required';
  if (/\s/.test(value)) return who + ' email cannot contain spaces';
  if (!EMAIL_RE.test(value)) return who + ' email is not valid';
  return '';
}

/**
 * Comparison key for a phone number: the last 10 digits.
 * Without this, '9876543210' and '+91 98765 43210' are the same person but read
 * as two different values, so duplicates slip through.
 */
function phoneKey(value) {
  var digits = String(value || '').replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function phoneProblem(value, who) {
  if (!value) return who + ' phone number is required';
  if (/[^0-9+\s()-]/.test(value)) return who + ' phone number has invalid characters';
  var digits = value.replace(/\D/g, '');
  // Accept a bare 10-digit Indian mobile or the same number with a country code.
  if (digits.length === 10) {
    return /^[6-9]/.test(digits) ? '' : who + ' phone number must start with 6, 7, 8 or 9';
  }
  if (digits.length === 11 && digits.charAt(0) === '0') return '';
  if (digits.length === 12 && digits.indexOf('91') === 0) return '';
  if (digits.length === 13 && digits.indexOf('091') === 0) return '';
  return digits.length < 10
    ? who + ' phone number is too short'
    : who + ' phone number is too long';
}

function validateSubmission(data) {
  var teamName = trim(data.teamName);
  var size = parseInt(trim(data.memberCount), 10);

  if (!teamName) return { error:'Team name is required' };
  if (!size || size < 1 || size > CONFIG.MAX_MEMBERS) {
    return { error:'Team size must be between 1 and ' + CONFIG.MAX_MEMBERS };
  }
  if (!trim(data.college)) return { error:'College / organization is required' };
  if (!trim(data.city)) return { error:'City is required' };
  if (!trim(data.eurekaId) || trim(data.eurekaId).length < 5) {
    return { error:'Eureka! Team ID must be at least 5 characters' };
  }

  var consent = /^(yes|true|on|1)$/i.test(trim(data.consent));
  if (!consent) return { error:'You must accept the details and instructions' };

  // Leader is index 0, Member 2 is index 1, Member 3 is index 2.
  var people = [];
  var seenEmails = {}, seenPhones = {};

  for (var i = 0; i < size; i++) {
    var who = i === 0 ? 'Team leader' : 'Member ' + (i + 1);
    var prefix = i === 0 ? 'leader' : 'member' + (i + 1);

    var name  = trim(data[prefix + 'Name']);
    var email = trim(data[prefix + 'Email']).toLowerCase();
    var phone = trim(data[prefix + 'Phone']);

    if (!name) return { error:who + ' name is required' };

    var mailErr = emailProblem(email, who);
    if (mailErr) return { error:mailErr };

    var phoneErr = phoneProblem(phone, who);
    if (phoneErr) return { error:phoneErr };

    var key = phoneKey(phone);
    if (seenEmails[email]) return { error:'Duplicate email within the team: ' + email };
    if (seenPhones[key]) return { error:'Duplicate phone number within the team: ' + phone };
    seenEmails[email] = true;
    seenPhones[key] = true;

    people.push({ name:titleCase(name), email:email, phone:phone, digits:key });
  }

  return {
    teamName: titleCase(teamName),
    size: size,
    // Left as typed apart from trimming: title casing would turn 'CSMU' into
    // 'Csmu' and 'IIT Bombay' into 'Iit Bombay'.
    college: trim(data.college).replace(/\s+/g, ' '),
    city: titleCase(trim(data.city)),
    eurekaId: trim(data.eurekaId).toUpperCase(),
    consent: consent,
    leader: people[0],
    members: people
  };
}

/* ------------------------------ SHEET / TABLE ------------------------------ */

/**
 * Deletes the empty default "Sheet1" and puts the data tab first, so the
 * exported .xlsx opens on the registrations instead of a blank sheet.
 */
function tidyWorkbook() {
  var ss = SpreadsheetApp.openById(sheetId());
  var sheets = ss.getSheets();

  // drop leftover empty default tabs
  sheets.forEach(function (s) {
    var name = s.getName();
    var isDefault = /^Sheet\s?\d+$/i.test(name);
    var isOurs = (name === CONFIG.SHEET_NAME || name === CONFIG.SUMMARY_NAME);
    if (isDefault && !isOurs && s.getLastRow() === 0 && ss.getSheets().length > 1) {
      ss.deleteSheet(s);
    }
  });

  // order: data first, summary second
  var data = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (data) { ss.setActiveSheet(data); ss.moveActiveSheet(1); }
  var summary = ss.getSheetByName(CONFIG.SUMMARY_NAME);
  if (summary) { ss.setActiveSheet(summary); ss.moveActiveSheet(2); }
  if (data) ss.setActiveSheet(data);          // leave the data tab selected
}

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

/**
 * Applies the whole table treatment: header row, frozen pane, alternating row
 * bands, filter, borders, column widths, number formats and dropdowns.
 * Safe to run repeatedly — it clears what it owns before re-applying.
 */
function styleTable(sheet) {
  var cols = HEADERS.length;
  var last = Math.max(sheet.getLastRow(), 1);
  var rows = last - 1;                                  // data rows, excluding header

  // trim stray columns so the exported table has no empty tail
  if (sheet.getMaxColumns() > cols) sheet.deleteColumns(cols + 1, sheet.getMaxColumns() - cols);
  if (sheet.getMaxColumns() < cols) sheet.insertColumnsAfter(sheet.getMaxColumns(), cols - sheet.getMaxColumns());

  // header
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
  sheet.setFrozenColumns(3);                            // No. + Timestamp + Team Name stay in view

  // group headers get the accent colour so the three people blocks read apart
  sheet.getRange(1, COL.L_NAME, 1, 3).setBackground(THEME.accent);
  sheet.getRange(1, COL.M2_NAME, 1, 3).setBackground('#C2410C');
  sheet.getRange(1, COL.M3_NAME, 1, 3).setBackground('#9A3412');

  WIDTHS.forEach(function (w, i) { sheet.setColumnWidth(i + 1, w); });

  // banding — the closest equivalent to an Excel table style that survives export
  sheet.getBandings().forEach(function (b) { b.remove(); });
  sheet.getRange(1, 1, Math.max(last, 2), cols)
    .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false)
    .setHeaderRowColor(THEME.header)
    .setFirstRowColor('#FFFFFF')
    .setSecondRowColor(THEME.band);

  // filter over the whole table
  var filter = sheet.getFilter();
  if (filter) filter.remove();
  sheet.getRange(1, 1, Math.max(last, 2), cols).createFilter();

  // formats
  var n = Math.max(rows, 1);
  sheet.getRange(2, COL.NO, n, 1).setNumberFormat('0').setHorizontalAlignment('center');
  sheet.getRange(2, COL.TS, n, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange(2, COL.SIZE, n, 1).setNumberFormat('0').setHorizontalAlignment('center');
  // '@' keeps +91 and leading zeros intact instead of turning them into numbers
  sheet.getRange(2, COL.L_PHONE,  n, 1).setNumberFormat('@');
  sheet.getRange(2, COL.M2_PHONE, n, 1).setNumberFormat('@');
  sheet.getRange(2, COL.M3_PHONE, n, 1).setNumberFormat('@');
  sheet.getRange(2, COL.EUREKA,   n, 1).setNumberFormat('@');
  sheet.getRange(2, COL.CONSENT,  n, 1).setHorizontalAlignment('center');

  if (rows > 0) {
    var body = sheet.getRange(2, 1, rows, cols);
    body.setFontSize(10).setVerticalAlignment('middle').setWrap(false);
    body.setBorder(true, true, true, true, true, true, THEME.line, SpreadsheetApp.BorderStyle.SOLID);

    // dropdowns so manual edits stay consistent with the form
    sheet.getRange(2, COL.SIZE, rows, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(SIZES, true).setAllowInvalid(true).build());
    sheet.getRange(2, COL.CONSENT, rows, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['Yes', 'No'], true).setAllowInvalid(true).build());

    // renumber the No. column so it always reads 1..n after deletions
    var seq = [];
    for (var i = 0; i < rows; i++) seq.push([i + 1]);
    sheet.getRange(2, COL.NO, rows, 1).setValues(seq);
  }

  // named range: use =NextGenPitchData in formulas, exports to Excel as a defined name
  var ss = sheet.getParent();
  ss.getNamedRanges().forEach(function (nr) {
    if (nr.getName() === CONFIG.NAMED_RANGE) nr.remove();
  });
  ss.setNamedRange(CONFIG.NAMED_RANGE, sheet.getRange(1, 1, Math.max(last, 2), cols));
}

/** Returns the row index of a matching leader email, phone or team name, or 0. */
function findRow(sheet, email, digits, teamName) {
  var rows = sheet.getLastRow() - 1;
  if (rows < 1) return 0;

  var teams  = sheet.getRange(2, COL.TEAM, rows, 1).getValues();
  var leader = sheet.getRange(2, COL.L_MAIL, rows, 2).getValues();   // email + phone
  var mail = String(email).trim().toLowerCase();
  var team = String(teamName).trim().toLowerCase();

  for (var i = 0; i < rows; i++) {
    var rowMail  = String(leader[i][0]).trim().toLowerCase();
    var rowPhone = phoneKey(leader[i][1]);
    var rowTeam  = String(teams[i][0]).trim().toLowerCase();
    if (rowMail === mail) return i + 2;
    if (digits && rowPhone === digits) return i + 2;
    if (team && rowTeam === team) return i + 2;
  }
  return 0;
}

/* ------------------------------ SUMMARY TAB ------------------------------ */
/**
 * Live counts written as formulas, so they stay correct in the Sheet and in the
 * exported .xlsx without the script having to recalculate anything.
 */
function buildSummary() {
  var ss = SpreadsheetApp.openById(sheetId());
  var sheet = ss.getSheetByName(CONFIG.SUMMARY_NAME) || ss.insertSheet(CONFIG.SUMMARY_NAME);
  var src = "'" + CONFIG.SHEET_NAME + "'!";

  sheet.clear();
  sheet.getBandings().forEach(function (b) { b.remove(); });

  sheet.getRange('A1').setValue('Next Gen Pitch — Registration Summary')
    .setFontSize(14).setFontWeight('bold').setFontColor(THEME.accent);
  sheet.getRange('A2').setFormula('="Updated "&TEXT(NOW(),"yyyy-mm-dd hh:mm")')
    .setFontColor('#6B7280').setFontSize(9);

  sheet.getRange('A4').setValue('Teams registered').setFontWeight('bold');
  sheet.getRange('B4').setFormula('=COUNTA(' + src + '$C$2:$C)');
  sheet.getRange('A5').setValue('Total participants').setFontWeight('bold');
  sheet.getRange('B5').setFormula('=SUM(' + src + '$D$2:$D)');
  sheet.getRange('A6').setValue('Latest submission').setFontWeight('bold');
  sheet.getRange('B6').setFormula('=IFERROR(TEXT(MAX(' + src + '$B$2:$B),"yyyy-mm-dd hh:mm"),"—")');
  sheet.getRange('A7').setValue('Registrations today').setFontWeight('bold');
  sheet.getRange('B7').setFormula('=COUNTIFS(' + src + '$B$2:$B,">="&TODAY(),' + src + '$B$2:$B,"<"&TODAY()+1)');
  sheet.getRange('A8').setValue('With Eureka! Team ID').setFontWeight('bold');
  sheet.getRange('B8').setFormula('=COUNTIF(' + src + '$G$2:$G,"<>")');

  // by team size
  sheet.getRange('A10:B10').setValues([['Team size', 'Teams']])
    .setFontWeight('bold').setBackground(THEME.header).setFontColor(THEME.headerText);
  var sizeLabels = ['1 — individual', '2 members', '3 members'];
  SIZES.forEach(function (code, i) {
    var r = 11 + i;
    sheet.getRange(r, 1).setValue(sizeLabels[i]);
    sheet.getRange(r, 2).setFormula('=COUNTIF(' + src + '$D$2:$D,"' + code + '")');
  });
  var sizeEnd = 10 + SIZES.length;
  sheet.getRange(sizeEnd + 1, 1).setValue('Total').setFontWeight('bold');
  sheet.getRange(sizeEnd + 1, 2).setFormula('=SUM(B11:B' + sizeEnd + ')').setFontWeight('bold');

  // spread across colleges and cities
  sheet.getRange('D10:E10').setValues([['Reach', 'Count']])
    .setFontWeight('bold').setBackground(THEME.header).setFontColor(THEME.headerText);
  sheet.getRange('D11').setValue('Distinct colleges');
  sheet.getRange('E11').setFormula('=IFERROR(COUNTUNIQUE(' + src + '$E$2:$E)-IF(COUNTBLANK(' + src + '$E$2:$E)>0,0,0),0)');
  sheet.getRange('D12').setValue('Distinct cities');
  sheet.getRange('E12').setFormula('=IFERROR(COUNTUNIQUE(' + src + '$F$2:$F),0)');
  sheet.getRange('D13').setValue('Consent recorded');
  sheet.getRange('E13').setFormula('=COUNTIF(' + src + '$Q$2:$Q,"Yes")');

  // top cities, self-maintaining
  sheet.getRange('D15').setValue('Teams by city').setFontWeight('bold');
  sheet.getRange('D16').setFormula(
    '=IFERROR(QUERY(' + src + '$F$2:$F,"select Col1, count(Col1) where Col1 is not null ' +
    'group by Col1 order by count(Col1) desc label count(Col1) \'Teams\'",0),"—")');

  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 80);
  sheet.setColumnWidth(3, 30);
  sheet.setColumnWidth(4, 165);
  sheet.setColumnWidth(5, 80);
  sheet.getRange(10, 1, SIZES.length + 2, 2)
    .setBorder(true, true, true, true, true, true, THEME.line, SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange(10, 4, 4, 2)
    .setBorder(true, true, true, true, true, true, THEME.line, SpreadsheetApp.BorderStyle.SOLID);
}

/* ------------------------------ XLSX ------------------------------ */
/**
 * Exports the whole workbook as .xlsx into the Drive folder, updating the file
 * in place so its ID and share link never change.
 */
var XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function exportXlsx() {
  var token = ScriptApp.getOAuthToken();
  var props = PropertiesService.getScriptProperties();

  // 1. snapshot the whole workbook as a real .xlsx
  var res = UrlFetchApp.fetch(
    'https://docs.google.com/spreadsheets/d/' + sheetId() + '/export?format=xlsx',
    { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true }
  );
  if (res.getResponseCode() !== 200) {
    throw new Error('Export failed ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300));
  }
  var blob = res.getBlob().setName(CONFIG.XLSX_NAME);
  var bytes = blob.getBytes();
  if (bytes.length < 1000) throw new Error('Export returned only ' + bytes.length + ' bytes');

  // 2. work out which Drive file to overwrite
  var target = CONFIG.XLSX_FILE_ID || props.getProperty('xlsxFileId') || '';
  if (target) {
    try {
      var f = DriveApp.getFileById(target);
      if (f.isTrashed() || f.getMimeType() !== XLSX_MIME) target = '';
    } catch (err) { target = ''; }          // gone, renamed away or wrong type
  }
  if (!target) {
    var folder = DriveApp.getFolderById(folderId());
    var hits = folder.getFilesByName(CONFIG.XLSX_NAME);
    while (hits.hasNext()) {
      var hit = hits.next();
      if (hit.getMimeType() === XLSX_MIME) { target = hit.getId(); break; }
    }
  }

  // 3. overwrite in place, or create it the first time
  if (target) {
    var up = UrlFetchApp.fetch(
      'https://www.googleapis.com/upload/drive/v3/files/' + target +
        '?uploadType=media&supportsAllDrives=true&fields=id,name,size,modifiedTime',
      {
        method: 'patch',
        contentType: XLSX_MIME,
        payload: bytes,
        headers: { Authorization: 'Bearer ' + token },
        muteHttpExceptions: true
      }
    );
    if (up.getResponseCode() >= 300) {
      throw new Error('Drive update ' + up.getResponseCode() + ': ' + up.getContentText().slice(0, 300));
    }
    props.setProperty('xlsxFileId', target);
    return { id:target, bytes:bytes.length, created:false, info:up.getContentText() };
  }

  var destination = DriveApp.getFolderById(folderId());
  var created = destination.createFile(blob);
  props.setProperty('xlsxFileId', created.getId());
  fileInFolder(sheetId(), destination);        // keep the Sheet beside the .xlsx
  return { id:created.getId(), bytes:bytes.length, created:true, url:created.getUrl() };
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

/** Run once after pasting this file: builds everything and grants permissions. */
function setup() {
  var sheet = getSheet();
  styleTable(sheet);
  buildSummary();
  tidyWorkbook();

  var x = exportXlsx();

  console.log('--- Next Gen Pitch backend ready ---');
  console.log('spreadsheet : ' + sheet.getParent().getUrl());
  console.log('drive folder: ' + DriveApp.getFolderById(folderId()).getUrl());
  console.log('xlsx file   : https://drive.google.com/file/d/' + x.id + '/view');
  console.log('data rows   : ' + Math.max(sheet.getLastRow() - 1, 0));
  console.log('Next: Deploy -> Manage deployments -> New version, so /exec runs this code.');
}

/** Re-apply table formatting over whatever rows exist now. */
function reformat() {
  styleTable(getSheet());
  buildSummary();
  tidyWorkbook();
  console.log('xlsx: ' + JSON.stringify(exportXlsx()));
}

function refreshXlsxNow() {
  console.log('xlsx: ' + JSON.stringify(exportXlsx()));
}

/** Prints exactly what ?diag=1 would return, straight into the editor log. */
function showDiagnostics() {
  console.log(JSON.stringify(diagnostics(), null, 2));
}

function testSubmit() {
  var out = doPost({ postData: { contents: JSON.stringify({
    token: CONFIG.SHARED_SECRET,
    teamName: 'test team',
    memberCount: '3',
    college: 'CSMU',
    city: 'Navi Mumbai',
    eurekaId: 'EUREKA-TEST-01',
    leaderName: 'test leader',
    leaderEmail: 'leader@example.edu',
    leaderPhone: '9876543210',
    member2Name: 'test member two',
    member2Email: 'two@example.edu',
    member2Phone: '9876543211',
    member3Name: 'test member three',
    member3Email: 'three@example.edu',
    member3Phone: '+91 98765 43212',
    consent: 'Yes',
    submittedAt: new Date().toISOString(),
    page: 'manual test'
  }) } });
  console.log(out.getContent());
}

/** Checks the validation rules without touching the sheet. */
function testValidation() {
  var base = {
    teamName:'T', memberCount:'1', college:'CSMU', city:'Navi Mumbai', eurekaId:'EUREKA123', consent:'Yes',
    leaderName:'A B', leaderEmail:'a@b.com', leaderPhone:'9876543210'
  };
  function run(label, patch) {
    var data = {};
    Object.keys(base).forEach(function (k) { data[k] = base[k]; });
    Object.keys(patch).forEach(function (k) { data[k] = patch[k]; });
    var r = validateSubmission(data);
    console.log(label + ' -> ' + (r.error ? 'REJECT: ' + r.error : 'accept'));
  }
  run('valid solo',        {});
  run('no @',              { leaderEmail:'ab.com' });
  run('space in email',    { leaderEmail:'a b@c.com' });
  run('no TLD',            { leaderEmail:'a@b' });
  run('phone 9 digits',    { leaderPhone:'987654321' });
  run('phone starts 5',    { leaderPhone:'5876543210' });
  run('phone +91 form',    { leaderPhone:'+91 98765 43210' });
  run('letters in phone',  { leaderPhone:'98765abcde' });
  run('size 2, no member', { memberCount:'2' });
  run('size 4',            { memberCount:'4' });
  run('no consent',        { consent:'' });
  run('dupe email in team', {
    memberCount:'2', member2Name:'C D', member2Email:'a@b.com', member2Phone:'9876543211'
  });
}

/** Removes rows whose leader email ends in @example.edu (the test entries). */
function deleteTestRows() {
  var sheet = getSheet();
  var rows = sheet.getLastRow() - 1;
  if (rows < 1) return console.log('nothing to delete');
  var emails = sheet.getRange(2, COL.L_MAIL, rows, 1).getValues();
  var removed = 0;
  for (var i = emails.length - 1; i >= 0; i--) {
    if (/@example\.edu$/i.test(String(emails[i][0]).trim())) {
      sheet.deleteRow(i + 2);
      removed++;
    }
  }
  styleTable(sheet);
  buildSummary();
  exportXlsx();
  console.log('deleted ' + removed + ' test row(s)');
}
