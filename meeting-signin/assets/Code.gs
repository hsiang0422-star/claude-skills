/**
 * 會議電子簽到系統（Google Apps Script）
 * 建立方式：開一份 Google 試算表（命名「會議簽到總覽」）→「擴充功能 → Apps Script」→ 貼上本檔與 Index.html
 *
 * 運作方式：
 * - 與會者用手機開網址 → 填姓名、單位、職稱 → 手寫簽名 → 送出
 * - 每場會議自動建立「一份獨立的試算表」：簽到表_會議名稱
 *     欄位：序號、簽到時間、姓名、單位、職稱、簽名（儲存格直接顯示簽名圖）、簽名檔連結、檔案ID
 * - 簽名 PNG 與該場試算表放在雲端硬碟「會議簽到 / 會議名稱」資料夾
 * - 「會議簽到總覽」（本試算表）列出所有會議：簽到人數、最後簽到時間、試算表與資料夾連結
 * - 總覽上方選單「簽到工具 → 匯出選取的會議」：產生含簽名圖的 Excel（.xlsx）與 A4 PDF 簽到表
 *
 * 會議名稱：在網址後面加 ?m=會議名稱，例如 .../exec?m=11月校務會議
 */

const DEFAULT_MEETING = '會議簽到';
const ROOT_FOLDER_NAME = '會議簽到';
const INDEX_FILE_NAME = '會議簽到總覽';
const INDEX_SHEET_NAME = '會議總覽';
const MEETING_FILE_PREFIX = '簽到表_';
const ROSTER_SHEET_NAME = '簽到名冊';
const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024; // 單張簽名上限 2MB

const HEADERS = ['序號', '簽到時間', '姓名', '單位', '職稱', '簽名', '簽名檔連結', '檔案ID'];
const COL = { no: 1, time: 2, name: 3, org: 4, title: 5, sig: 6, link: 7, fileId: 8 };
const INDEX_HEADERS = ['會議名稱', '簽到人數', '建立時間', '最後簽到時間', '簽到試算表', '簽名檔資料夾', '試算表ID'];
const IDX = { meeting: 1, count: 2, created: 3, last: 4, sheetLink: 5, folderLink: 6, ssId: 7 };

/* ================= 選單與首次設定 ================= */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('簽到工具')
    .addItem('匯出選取的會議（Excel＋PDF，含簽名）', 'exportSelectedMeeting')
    .addItem('開啟選取會議的簽到試算表', 'openSelectedMeeting')
    .addItem('重新計算簽到人數', 'refreshIndex')
    .addToUi();
}

/** 第一次請手動執行一次：授權並建立資料夾與總覽表 */
function setup() {
  const folder = getRootFolder_();
  getIndexSheet_();
  Logger.log('簽名資料夾：' + folder.getUrl());
  Logger.log('會議簽到總覽：' + getIndexSpreadsheet_().getUrl());
}

/* ================= 簽到網頁 ================= */

function doGet(e) {
  const t = HtmlService.createTemplateFromFile('Index');
  t.meeting = cleanMeetingName_((e && e.parameter && e.parameter.m) || DEFAULT_MEETING);
  return t.evaluate()
    .setTitle('會議簽到 - ' + t.meeting)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/** 前端呼叫：送出簽到 */
function submitSignIn(form) {
  const meeting = cleanMeetingName_(form.meeting || DEFAULT_MEETING);
  const name = String(form.name || '').trim().slice(0, 50);
  const org = String(form.org || '').trim().slice(0, 100);
  const title = String(form.title || '').trim().slice(0, 50);
  const dataUrl = String(form.signature || '');

  if (!name) throw new Error('請填寫姓名');
  const m = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!m) throw new Error('簽名格式錯誤，請重新簽名');
  const bytes = Utilities.base64Decode(m[1]);
  if (bytes.length > MAX_SIGNATURE_BYTES) throw new Error('簽名檔過大');

  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const now = new Date();
    const tz = Session.getScriptTimeZone() || 'Asia/Taipei';
    const stamp = Utilities.formatDate(now, tz, 'yyyyMMdd_HHmmss');
    const display = Utilities.formatDate(now, tz, 'yyyy/MM/dd HH:mm:ss');

    // 1) 存簽名檔
    const folder = getMeetingFolder_(meeting);
    const safe = s => s.replace(/[\\/:*?"<>|\s]+/g, '_');
    const fileName = [stamp, safe(name), org ? safe(org) : ''].filter(Boolean).join('_') + '.png';
    const file = folder.createFile(Utilities.newBlob(bytes, 'image/png', fileName));

    // 2) 寫進「這場會議自己的試算表」
    const ss = getMeetingSpreadsheet_(meeting);
    const sheet = getRosterSheet_(ss);
    const no = Math.max(sheet.getLastRow(), 1); // 第 1 列是標題
    sheet.appendRow([no, display, noFormula_(name), noFormula_(org), noFormula_(title), '',
                     file.getUrl(), file.getId()]);
    const row = sheet.getLastRow();
    sheet.setRowHeight(row, 64);

    // 3) 「簽名」欄直接顯示簽名圖
    try {
      const img = SpreadsheetApp.newCellImage()
        .setSourceUrl(dataUrl)
        .setAltTextTitle(name + ' 的簽名')
        .build();
      sheet.getRange(row, COL.sig).setValue(img);
    } catch (err) {
      sheet.getRange(row, COL.sig).setValue('（請點簽名檔連結）');
    }

    // 4) 更新總覽
    updateIndexRow_(meeting, ss, folder, no, display);

    return { ok: true, no: no, time: display };
  } finally {
    lock.releaseLock();
  }
}

/* ================= 每場會議的試算表 ================= */

/** 找出（或建立）這場會議專屬的試算表：「會議簽到 / 會議名稱 / 簽到表_會議名稱」 */
function getMeetingSpreadsheet_(meeting) {
  const props = PropertiesService.getScriptProperties();
  const key = 'SS::' + meeting;
  const id = props.getProperty(key);
  if (id) {
    try {
      const ss = SpreadsheetApp.openById(id);
      if (!DriveApp.getFileById(id).isTrashed()) return ss;
    } catch (err) {}
  }
  const folder = getMeetingFolder_(meeting);
  const name = MEETING_FILE_PREFIX + meeting;
  const it = folder.getFilesByName(name);
  while (it.hasNext()) {
    const f = it.next();
    if (f.getMimeType() === MimeType.GOOGLE_SHEETS && !f.isTrashed()) {
      props.setProperty(key, f.getId());
      return SpreadsheetApp.openById(f.getId());
    }
  }
  const ss = SpreadsheetApp.create(name);
  DriveApp.getFileById(ss.getId()).moveTo(folder);
  const sheet = ss.getSheets()[0].setName(ROSTER_SHEET_NAME);
  setupRosterSheet_(sheet);
  props.setProperty(key, ss.getId());
  return ss;
}

function getRosterSheet_(ss) {
  let sheet = ss.getSheetByName(ROSTER_SHEET_NAME);
  if (!sheet) { sheet = ss.insertSheet(ROSTER_SHEET_NAME, 0); setupRosterSheet_(sheet); }
  return sheet;
}

function setupRosterSheet_(sheet) {
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold').setBackground('#eef2f7').setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
  [50, 150, 100, 150, 100, 200, 120, 80].forEach((w, i) => sheet.setColumnWidth(i + 1, w));
}

/* ================= 會議簽到總覽 ================= */

/** 從試算表建立的專案：用那份試算表當總覽；獨立專案：自動建立一份 */
function getIndexSpreadsheet_() {
  let active = null;
  try { active = SpreadsheetApp.getActiveSpreadsheet(); } catch (err) {}
  if (active) return active;
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('INDEX_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (err) {} }
  const ss = SpreadsheetApp.create(INDEX_FILE_NAME);
  DriveApp.getFileById(ss.getId()).moveTo(getRootFolder_());
  props.setProperty('INDEX_ID', ss.getId());
  return ss;
}

function getIndexSheet_() {
  const ss = getIndexSpreadsheet_();
  let sheet = ss.getSheetByName(INDEX_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(INDEX_SHEET_NAME, 0);
    sheet.getRange(1, 1, 1, INDEX_HEADERS.length).setValues([INDEX_HEADERS])
      .setFontWeight('bold').setBackground('#eef2f7').setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
    [200, 80, 150, 150, 130, 130, 80].forEach((w, i) => sheet.setColumnWidth(i + 1, w));
    // 刪除建立試算表時預設的空白工作表（例如「工作表1」）
    ss.getSheets().forEach(s => {
      if (s.getName() !== INDEX_SHEET_NAME && s.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s);
    });
  }
  return sheet;
}

function updateIndexRow_(meeting, ss, folder, count, lastTime) {
  const sheet = getIndexSheet_();
  const last = sheet.getLastRow();
  let row = 0;
  if (last >= 2) {
    const ids = sheet.getRange(2, IDX.ssId, last - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) if (ids[i][0] === ss.getId()) { row = i + 2; break; }
  }
  if (!row) {
    row = last + 1;
    sheet.getRange(row, 1, 1, INDEX_HEADERS.length).setValues([[
      noFormula_(meeting), 0, lastTime, lastTime,
      '=HYPERLINK("' + ss.getUrl() + '","開啟試算表")',
      '=HYPERLINK("' + folder.getUrl() + '","開啟資料夾")',
      ss.getId()
    ]]);
  }
  sheet.getRange(row, IDX.count).setValue(count);
  sheet.getRange(row, IDX.last).setValue(lastTime);
}

/** 選單：依各會議試算表的實際列數，重新計算總覽的簽到人數 */
function refreshIndex() {
  const sheet = getIndexSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return;
  const ids = sheet.getRange(2, IDX.ssId, last - 1, 1).getValues();
  ids.forEach((r, i) => {
    try {
      const roster = getRosterSheet_(SpreadsheetApp.openById(r[0]));
      sheet.getRange(i + 2, IDX.count).setValue(Math.max(roster.getLastRow() - 1, 0));
    } catch (err) {
      sheet.getRange(i + 2, IDX.count).setValue('找不到試算表');
    }
  });
  SpreadsheetApp.getActive() && SpreadsheetApp.getActive().toast('已重新計算簽到人數');
}

/** 取得總覽中目前選取那一列的會議 */
function selectedMeeting_() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();
  const row = sheet.getActiveRange() ? sheet.getActiveRange().getRow() : 0;
  if (sheet.getName() !== INDEX_SHEET_NAME || row < 2) {
    ui.alert('請先在「' + INDEX_SHEET_NAME + '」工作表點選要處理的那場會議（任一格），再執行一次。');
    return null;
  }
  const meeting = String(sheet.getRange(row, IDX.meeting).getValue()).replace(/^'/, '');
  const ssId = String(sheet.getRange(row, IDX.ssId).getValue());
  if (!meeting || !ssId) { ui.alert('這一列沒有會議資料。'); return null; }
  return { meeting: meeting, ssId: ssId };
}

function openSelectedMeeting() {
  const sel = selectedMeeting_();
  if (!sel) return;
  const url = SpreadsheetApp.openById(sel.ssId).getUrl();
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(
    '<p style="font:15px sans-serif"><a href="' + url + '" target="_blank">開啟「' +
    MEETING_FILE_PREFIX + escapeHtml_(sel.meeting) + '」</a></p>').setWidth(360).setHeight(90), '簽到試算表');
}

/* ================= 匯出 Excel / PDF ================= */

function exportSelectedMeeting() {
  const sel = selectedMeeting_();
  if (!sel) return;
  const ui = SpreadsheetApp.getUi();
  const roster = getRosterSheet_(SpreadsheetApp.openById(sel.ssId));
  if (roster.getLastRow() < 2) { ui.alert('這場會議還沒有人簽到。'); return; }
  const res = exportMeeting_(sel.meeting, roster);
  const html = HtmlService.createHtmlOutput(
    '<div style="font:15px/1.8 sans-serif">' +
    '<p>已匯出「' + escapeHtml_(sel.meeting) + '」<b>' + res.count + '</b> 人的簽到表，存在該場會議資料夾：</p>' +
    '<p>📗 <a href="' + res.xlsxUrl + '" target="_blank">Excel 簽到表（.xlsx）</a></p>' +
    '<p>📕 <a href="' + res.pdfUrl + '" target="_blank">PDF 簽到表（可列印、附公文）</a></p>' +
    '<p>📁 <a href="' + res.folderUrl + '" target="_blank">開啟資料夾</a></p></div>'
  ).setWidth(440).setHeight(260);
  ui.showModalDialog(html, '匯出完成');
}

/**
 * 產生「簽到表」：建立暫存試算表 → 放入簽名圖 → 匯出 xlsx 與 pdf → 刪除暫存檔
 * 回傳 {count, xlsxUrl, pdfUrl, folderUrl}
 */
function exportMeeting_(meeting, src) {
  const values = src.getRange(2, 1, src.getLastRow() - 1, HEADERS.length).getValues()
    .filter(r => String(r[COL.name - 1]).trim());
  const tz = Session.getScriptTimeZone() || 'Asia/Taipei';
  const now = new Date();
  const stamp = Utilities.formatDate(now, tz, 'yyyyMMdd_HHmm');

  const temp = SpreadsheetApp.create('簽到表_' + meeting + '_暫存');
  const ts = temp.getSheets()[0].setName('簽到表');
  const OUT = ['序號', '簽到時間', '姓名', '單位', '職稱', '簽名'];
  const top = 4; // 表頭列

  ts.getRange(1, 1, 1, OUT.length).merge().setValue(meeting + '　簽到表')
    .setFontSize(16).setFontWeight('bold').setHorizontalAlignment('center');
  ts.getRange(2, 1, 1, OUT.length).merge()
    .setValue('簽到人數：' + values.length + ' 人　　匯出時間：' + Utilities.formatDate(now, tz, 'yyyy/MM/dd HH:mm'))
    .setHorizontalAlignment('center').setFontColor('#555555');
  ts.getRange(top, 1, 1, OUT.length).setValues([OUT])
    .setFontWeight('bold').setBackground('#eef2f7').setHorizontalAlignment('center');

  if (values.length) {
    const rows = values.map((r, i) => [i + 1, String(r[COL.time - 1]), r[COL.name - 1], r[COL.org - 1], r[COL.title - 1], '']);
    ts.getRange(top + 1, 1, rows.length, OUT.length).setValues(rows).setVerticalAlignment('middle');
    ts.getRange(top + 1, 1, rows.length, 1).setHorizontalAlignment('center');
    ts.setRowHeights(top + 1, rows.length, 64);
  }
  [50, 150, 100, 150, 100, 210].forEach((w, i) => ts.setColumnWidth(i + 1, w));
  ts.getRange(top, 1, values.length + 1, OUT.length)
    .setBorder(true, true, true, true, true, true, '#999999', SpreadsheetApp.BorderStyle.SOLID)
    .setWrap(true);

  // 放簽名圖（浮動圖片，Excel 與 PDF 都會保留）
  values.forEach((r, i) => {
    const id = String(r[COL.fileId - 1] || '');
    if (!id) return;
    try {
      const img = ts.insertImage(DriveApp.getFileById(id).getBlob(), COL.sig, top + 1 + i, 6, 6);
      const k = Math.min(190 / img.getWidth(), 50 / img.getHeight(), 1);
      img.setWidth(Math.round(img.getWidth() * k)).setHeight(Math.round(img.getHeight() * k));
    } catch (err) {
      ts.getRange(top + 1 + i, COL.sig).setValue('（簽名檔遺失）');
    }
  });
  ts.setFrozenRows(top);
  SpreadsheetApp.flush();

  const base = 'https://docs.google.com/spreadsheets/d/' + temp.getId() + '/export?';
  const opt = { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true };
  const fetch = (q, ext, mime) => {
    const resp = UrlFetchApp.fetch(base + q, opt);
    if (resp.getResponseCode() !== 200) throw new Error('匯出 ' + ext + ' 失敗（' + resp.getResponseCode() + '）');
    return resp.getBlob().setContentType(mime).setName('簽到表_' + meeting + '_' + stamp + '.' + ext);
  };
  const xlsx = fetch('format=xlsx', 'xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  const pdf = fetch('format=pdf&gid=' + ts.getSheetId() +
    '&size=A4&portrait=true&fitw=true&gridlines=false&printtitle=false&sheetnames=false' +
    '&pagenum=CENTER&fzr=true&top_margin=0.6&bottom_margin=0.6&left_margin=0.5&right_margin=0.5',
    'pdf', 'application/pdf');

  const folder = getMeetingFolder_(meeting);
  const xf = folder.createFile(xlsx);
  const pf = folder.createFile(pdf);
  DriveApp.getFileById(temp.getId()).setTrashed(true);

  return { count: values.length, xlsxUrl: xf.getUrl(), pdfUrl: pf.getUrl(), folderUrl: folder.getUrl() };
}

/* ================= 內部工具 ================= */

function getRootFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('ROOT_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (err) {} }
  const folder = DriveApp.createFolder(ROOT_FOLDER_NAME);
  props.setProperty('ROOT_FOLDER_ID', folder.getId());
  return folder;
}

function getMeetingFolder_(meeting) {
  const root = getRootFolder_();
  const it = root.getFoldersByName(meeting);
  return it.hasNext() ? it.next() : root.createFolder(meeting);
}

function cleanMeetingName_(s) {
  return String(s).replace(/[\\/:*?"<>|\[\]]/g, '').trim().slice(0, 80) || DEFAULT_MEETING;
}

/** 防止有人輸入 =、+、-、@ 開頭的內容被試算表當成公式 */
function noFormula_(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function escapeHtml_(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
