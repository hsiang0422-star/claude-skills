/**
 * 會議電子簽到系統（Google Apps Script）
 * - 與會者用手機開網址 → 填資料 → 手寫簽名 → 送出
 * - 簽名 PNG 存到你的 Google 雲端硬碟「會議簽到」資料夾（每場會議一個子資料夾）
 * - 簽到紀錄寫入 Google 試算表「會議簽到紀錄」（每場會議一個工作表）
 *
 * 會議名稱：在網址後面加 ?m=會議名稱，例如 .../exec?m=11月校務會議
 *           沒加就用下面的 DEFAULT_MEETING。
 */

const DEFAULT_MEETING = '會議簽到';
const ROOT_FOLDER_NAME = '會議簽到';
const SHEET_FILE_NAME = '會議簽到紀錄';
const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024; // 單張簽名上限 2MB

/** 第一次請手動執行一次：授權並建立資料夾與試算表 */
function setup() {
  const folder = getRootFolder_();
  const ss = getSpreadsheet_();
  Logger.log('簽名資料夾：' + folder.getUrl());
  Logger.log('簽到試算表：' + ss.getUrl());
}

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
  lock.waitLock(20000);
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

    // 2) 寫入試算表
    const sheet = getMeetingSheet_(meeting);
    const no = Math.max(sheet.getLastRow(), 1); // 標題列佔第 1 列
    sheet.appendRow([no, display, noFormula_(name), noFormula_(org), noFormula_(title),
                     file.getUrl(), file.getName(), file.getId()]);

    return { ok: true, no: no, time: display };
  } finally {
    lock.releaseLock();
  }
}

/* ---------- 內部工具 ---------- */

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

function getSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (err) {} }
  const ss = SpreadsheetApp.create(SHEET_FILE_NAME);
  DriveApp.getFileById(ss.getId()).moveTo(getRootFolder_());
  props.setProperty('SHEET_ID', ss.getId());
  return ss;
}

function getMeetingSheet_(meeting) {
  const ss = getSpreadsheet_();
  const sheetName = meeting.slice(0, 90);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(['序號', '簽到時間', '姓名', '單位', '職稱', '簽名檔連結', '簽名檔名', '檔案ID']);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
    // 刪除建立試算表時預設的空白「工作表1」
    const def = ss.getSheets().find(s => s.getName() !== sheetName && s.getLastRow() === 0);
    if (def && ss.getSheets().length > 1) ss.deleteSheet(def);
  }
  return sheet;
}

function cleanMeetingName_(s) {
  return String(s).replace(/[\\/:*?"<>|\[\]]/g, '').trim().slice(0, 80) || DEFAULT_MEETING;
}

/** 防止有人輸入 =、+、-、@ 開頭的內容被試算表當成公式 */
function noFormula_(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
