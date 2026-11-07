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
 * - 總覽上方選單「簽到工具 → 建立會議並產生簽到 QR Code」：輸入會議名稱，自動建立該場試算表與 QR Code
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
const INDEX_HEADERS = ['會議名稱', '簽到人數', '建立時間', '最後簽到時間', '簽到試算表', '簽名檔資料夾', '試算表ID', '簽到 QR Code'];
const IDX = { meeting: 1, count: 2, created: 3, last: 4, sheetLink: 5, folderLink: 6, ssId: 7, qr: 8 };

/* ================= 選單與首次設定 ================= */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('簽到工具')
    .addItem('建立會議並產生簽到 QR Code', 'createMeetingWithQr')
    .addItem('重新產生選取會議的 QR Code', 'showQrForSelected')
    .addSeparator()
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
  // 舊版總覽沒有「簽到 QR Code」欄，補上標題
  const qrHead = sheet.getRange(1, IDX.qr);
  if (qrHead.getValue() !== INDEX_HEADERS[IDX.qr - 1]) {
    qrHead.setValue(INDEX_HEADERS[IDX.qr - 1]).setFontWeight('bold').setBackground('#eef2f7').setHorizontalAlignment('center');
    sheet.setColumnWidth(IDX.qr, 130);
  }
  return sheet;
}

/** 找出（或新增）總覽中這場會議的那一列，回傳列號 */
function findOrCreateIndexRow_(meeting, ss, folder) {
  const sheet = getIndexSheet_();
  const last = sheet.getLastRow();
  if (last >= 2) {
    const ids = sheet.getRange(2, IDX.ssId, last - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) if (ids[i][0] === ss.getId()) return i + 2;
  }
  const tz = Session.getScriptTimeZone() || 'Asia/Taipei';
  const row = last + 1;
  sheet.getRange(row, 1, 1, INDEX_HEADERS.length).setValues([[
    noFormula_(meeting), 0, Utilities.formatDate(new Date(), tz, 'yyyy/MM/dd HH:mm:ss'), '',
    '=HYPERLINK("' + ss.getUrl() + '","開啟試算表")',
    '=HYPERLINK("' + folder.getUrl() + '","開啟資料夾")',
    ss.getId(), ''
  ]]);
  return row;
}

function updateIndexRow_(meeting, ss, folder, count, lastTime) {
  const sheet = getIndexSheet_();
  const row = findOrCreateIndexRow_(meeting, ss, folder);
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

/* ================= 建立會議與 QR Code ================= */

/** 選單：輸入會議名稱 → 建立該場試算表與資料夾 → 顯示並儲存 QR Code */
function createMeetingWithQr() {
  const ui = SpreadsheetApp.getUi();
  const base = webAppUrl_();
  if (!base) return;
  const r = ui.prompt('建立會議', '請輸入會議名稱（例如：11月校務會議）', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  if (!r.getResponseText().trim()) { ui.alert('請輸入會議名稱。'); return; }
  const meeting = cleanMeetingName_(r.getResponseText());
  const ss = getMeetingSpreadsheet_(meeting);
  const folder = getMeetingFolder_(meeting);
  const row = findOrCreateIndexRow_(meeting, ss, folder);
  getIndexSheet_().getRange(row, 1).activate();
  showQrDialog_(meeting, base);
}

/** 選單：替總覽中選取的會議重新產生 QR Code */
function showQrForSelected() {
  const sel = selectedMeeting_();
  if (!sel) return;
  const base = webAppUrl_();
  if (!base) return;
  showQrDialog_(sel.meeting, base);
}

/** 取得已部署的簽到網址（/exec） */
function webAppUrl_() {
  const url = ScriptApp.getService().getUrl();
  if (!url) {
    SpreadsheetApp.getUi().alert('還沒有部署成網頁應用程式。請先到 Apps Script：「部署 → 新增部署作業 → 網頁應用程式」，執行身分選「我」、存取權選「所有人」。');
    return '';
  }
  return url.replace(/\/dev$/, '/exec');
}

function signInUrl_(base, meeting) {
  return base + '?m=' + encodeURIComponent(meeting);
}

function showQrDialog_(meeting, base) {
  const html = HtmlService.createHtmlOutput(qrDialogHtml_(meeting, signInUrl_(base, meeting)))
    .setWidth(460).setHeight(640);
  SpreadsheetApp.getUi().showModalDialog(html, '簽到 QR Code');
}

/** 對話框前端呼叫：把 QR Code 圖存到該場會議資料夾，並在總覽記下連結 */
function saveQrPng(meeting, dataUrl) {
  meeting = cleanMeetingName_(meeting);
  const m = String(dataUrl || '').match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!m) throw new Error('QR Code 圖片格式錯誤');
  const folder = getMeetingFolder_(meeting);
  const name = 'QRCode_' + meeting + '.png';
  const old = folder.getFilesByName(name);
  while (old.hasNext()) old.next().setTrashed(true);
  const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(m[1]), 'image/png', name));
  const ss = getMeetingSpreadsheet_(meeting);
  const row = findOrCreateIndexRow_(meeting, ss, folder);
  getIndexSheet_().getRange(row, IDX.qr).setFormula('=HYPERLINK("' + file.getUrl() + '","開啟 QR Code")');
  return { url: file.getUrl(), downloadUrl: 'https://drive.google.com/uc?export=download&id=' + file.getId() };
}

function qrDialogHtml_(meeting, url) {
  const data = JSON.stringify({ meeting: meeting, url: url }).replace(/</g, '\\u003c');
  return '<!DOCTYPE html><html><head><meta charset="utf-8">' +
'<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>' +
'<style>' +
'body{margin:0;font-family:-apple-system,"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif;color:#1b2333;}' +
'.wrap{padding:8px 12px;text-align:center}' +
'#poster{max-width:100%;width:300px;border:1px solid #d6dbe4;border-radius:8px}' +
'#qrsrc{display:none}' +
'.url{width:100%;box-sizing:border-box;font-size:12px;padding:8px;border:1px solid #d6dbe4;border-radius:6px;margin-top:10px}' +
'.row{display:flex;gap:8px;margin-top:10px}' +
'a.btn,button{flex:1;font-size:14px;padding:10px;border-radius:8px;border:0;cursor:pointer;text-decoration:none;text-align:center}' +
'.primary{background:#1f6feb;color:#fff}.secondary{background:#eceef2;color:#1b2333}' +
'.msg{font-size:13px;margin-top:10px;color:#555;min-height:1.4em}.err{color:#c62828}' +
'</style></head><body><div class="wrap">' +
'<img id="poster" alt="簽到 QR Code"><div id="qrsrc"></div>' +
'<input class="url" id="url" readonly>' +
'<div class="row"><button class="secondary" id="copy">複製簽到網址</button>' +
'<a class="btn primary" id="open" target="_blank">開啟 QR Code 圖檔</a></div>' +
'<div class="msg" id="msg">正在產生 QR Code…</div></div>' +
'<script>' +
'var D=' + data + ';' +
'var msg=document.getElementById("msg"),openBtn=document.getElementById("open");' +
'openBtn.style.visibility="hidden";' +
'document.getElementById("url").value=D.url;' +
'document.getElementById("copy").onclick=function(){var u=document.getElementById("url");u.select();' +
'try{document.execCommand("copy");msg.textContent="已複製簽到網址";}catch(e){msg.textContent="請手動複製上方網址";}};' +
'function fail(t){msg.className="msg err";msg.textContent=t;}' +
'function build(){' +
' if(typeof QRCode==="undefined"){fail("QR Code 元件載入失敗，請確認網路後重新開啟。簽到網址仍可複製使用。");return;}' +
' var box=document.getElementById("qrsrc");' +
' new QRCode(box,{text:D.url,width:600,height:600,correctLevel:QRCode.CorrectLevel.M});' +
' setTimeout(function(){' +
'  var q=box.querySelector("canvas");if(!q){fail("QR Code 產生失敗");return;}' +
'  var W=760,H=960,c=document.createElement("canvas");c.width=W;c.height=H;var g=c.getContext("2d");' +
'  g.fillStyle="#fff";g.fillRect(0,0,W,H);' +
'  g.fillStyle="#1b2333";g.textAlign="center";' +
'  g.font="bold 46px -apple-system,PingFang TC,Noto Sans TC,Microsoft JhengHei,sans-serif";' +
'  var t=D.meeting;while(g.measureText(t).width>W-60&&t.length>1)t=t.slice(0,-1);if(t!==D.meeting)t=t.slice(0,-1)+"…";' +
'  g.fillText(t,W/2,90);' +
'  g.font="30px -apple-system,PingFang TC,Noto Sans TC,Microsoft JhengHei,sans-serif";g.fillStyle="#555";' +
'  g.fillText("請用手機相機掃描，完成電子簽到",W/2,140);' +
'  g.drawImage(q,80,190,600,600);' +
'  g.font="24px sans-serif";g.fillStyle="#888";g.fillText("掃描後填寫姓名並手寫簽名",W/2,860);' +
'  var png=c.toDataURL("image/png");document.getElementById("poster").src=png;' +
'  msg.textContent="正在存到雲端硬碟…";' +
'  google.script.run.withSuccessHandler(function(r){openBtn.href=r.url;openBtn.style.visibility="visible";' +
'   msg.textContent="已存到該場會議資料夾（QRCode_"+D.meeting+".png），可開啟後下載或列印。";})' +
'  .withFailureHandler(function(e){fail("存檔失敗："+(e&&e.message||e));}).saveQrPng(D.meeting,png);' +
' },300);' +
'}' +
'if(document.readyState==="complete")build();else window.addEventListener("load",build);' +
'</script></body></html>';
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
