/**
 * Webhook nhận lead từ Next.js (POST /api/lead) và ghi vào Google Sheets.
 *
 * Cấu hình trong Project Settings → Script Properties:
 *   SECRET      (bắt buộc) chuỗi bí mật, trùng với WEBHOOK_SECRET của Next.js
 *   SHEET_NAME  (tùy chọn) tên tab, mặc định "Leads"
 *
 * Xem README.md để cài đặt và deploy.
 */

var DEFAULT_SHEET_NAME = 'Leads';

// Thứ tự cột. Không đổi thứ tự sau khi đã có dữ liệu; chỉ thêm cột mới ở cuối.
var HEADERS = [
  'Thời gian',        // 1
  'Họ tên',           // 2
  'SĐT (Zalo)',       // 3
  'Dự án',            // 4
  'Điểm TB',          // 5
  'Điểm màn 1',       // 6
  'Điểm màn 2',       // 7
  'Điểm màn 3',       // 8
  'Rank',             // 9
  'Mã voucher',       // 10
  'Giá trị voucher',  // 11
  'utm_source',       // 12
  'utm_medium',       // 13
  'utm_campaign',     // 14
  'utm_term',         // 15
  'utm_content',      // 16
  'fbclid',           // 17
  'gclid',            // 18
  'Thời gian chơi (giây)', // 19
  'Trùng SĐT',        // 20
  'Nghi giả điểm',    // 21
  'Ghi chú sale'      // 22
];
var COL_PHONE = 3;
var COL_DUPLICATE = 20;

// Thứ tự id màn chơi trong cột "Điểm màn 1..3" (khớp src/data/scenarios.json).
var LEVEL_IDS = ['sink_cabinet', 'kids_bedroom', 'living_wall'];

function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents;
    if (!raw) return json_({ ok: false, error: 'EMPTY_BODY' });

    var data = JSON.parse(raw);
    var secret = PropertiesService.getScriptProperties().getProperty('SECRET');
    if (!secret || !safeEqual_(String(data.secret || ''), secret)) {
      return json_({ ok: false, error: 'UNAUTHORIZED' });
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(15000); // tránh 2 request ghi chồng lên nhau
    try {
      var sheet = getSheet_();
      ensureHeader_(sheet);

      var phone = String(data.phone || '');
      var previous = countPhone_(sheet, phone);
      var duplicate = previous > 0;

      var utm = data.utm || {};
      var scores = data.levelScores || {};
      var row = [
        data.submittedAt ? new Date(data.submittedAt) : new Date(),
        safeText_(data.name),
        phone,
        safeText_(data.project),
        num_(data.averageScore),
        num_(scores[LEVEL_IDS[0]]),
        num_(scores[LEVEL_IDS[1]]),
        num_(scores[LEVEL_IDS[2]]),
        safeText_(data.rankTitle),
        safeText_(data.voucherCode),
        num_(data.voucherValue),
        safeText_(utm.utm_source),
        safeText_(utm.utm_medium),
        safeText_(utm.utm_campaign),
        safeText_(utm.utm_term),
        safeText_(utm.utm_content),
        safeText_(utm.fbclid),
        safeText_(utm.gclid),
        data.durationMs ? Math.round(Number(data.durationMs) / 1000) : '',
        duplicate ? 'TRÙNG (lần ' + (previous + 1) + ')' : '',
        data.scoreMismatch ? 'CÓ' : '',
        ''
      ];

      // Đặt định dạng TRƯỚC khi ghi để SĐT giữ số 0 đầu (appendRow sẽ ép kiểu số nếu ô chưa là text).
      var last = sheet.getLastRow() + 1;
      sheet.getRange(last, COL_PHONE).setNumberFormat('@');
      sheet.getRange(last, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
      sheet.getRange(last, 1, 1, row.length).setValues([row]);
      if (duplicate) sheet.getRange(last, 1, 1, HEADERS.length).setBackground('#FFF3CD');
      if (data.scoreMismatch) sheet.getRange(last, 21).setBackground('#F8D7DA');

      return json_({ ok: true, duplicate: duplicate });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({ ok: false, error: 'SERVER_ERROR', message: String(err) });
  }
}

/** Mở URL web app bằng trình duyệt để kiểm tra nhanh service đang chạy. */
function doGet() {
  return json_({ ok: true, service: 'mda-lead-webhook' });
}

// --- Helpers ------------------------------------------------------------------------------------

function getSheet_() {
  var name = PropertiesService.getScriptProperties().getProperty('SHEET_NAME') || DEFAULT_SHEET_NAME;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function ensureHeader_(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#F1EDE4');
  sheet.setFrozenRows(1);
  // Cột SĐT dạng text để Sheets không bỏ số 0 đầu.
  sheet.getRange(1, COL_PHONE, sheet.getMaxRows(), 1).setNumberFormat('@');
}

/** Đếm số dòng đã có cùng SĐT (so sánh theo chữ số, bỏ qua định dạng). */
function countPhone_(sheet, phone) {
  var target = digits_(phone);
  var lastRow = sheet.getLastRow();
  if (!target || lastRow < 2) return 0;
  var values = sheet.getRange(2, COL_PHONE, lastRow - 1, 1).getDisplayValues();
  var count = 0;
  for (var i = 0; i < values.length; i++) {
    if (digits_(values[i][0]) === target) count++;
  }
  return count;
}

function digits_(s) {
  var d = String(s || '').replace(/\D/g, '');
  return d.indexOf('84') === 0 && d.length >= 11 ? '0' + d.slice(2) : d;
}

/** Chặn công thức độc hại: ô bắt đầu bằng = + - @ sẽ được coi là chuỗi thường. */
function safeText_(v) {
  if (v === undefined || v === null) return '';
  var s = String(v);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function num_(v) {
  var n = Number(v);
  return isFinite(n) ? n : '';
}

/** So sánh chuỗi không dừng sớm, giảm rủi ro dò secret theo thời gian phản hồi. */
function safeEqual_(a, b) {
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Chạy thủ công từ trình soạn thảo (Run → testAppend) để thử ghi một dòng mẫu.
 * Cần đã đặt Script Property SECRET.
 */
function testAppend() {
  var secret = PropertiesService.getScriptProperties().getProperty('SECRET');
  var res = doPost({
    postData: {
      contents: JSON.stringify({
        secret: secret,
        submittedAt: new Date().toISOString(),
        name: 'Test Người Dùng',
        phone: '0912345678',
        project: 'Căn hộ mẫu',
        averageScore: 90,
        levelScores: { sink_cabinet: 100, kids_bedroom: 90, living_wall: 80 },
        rankTitle: 'KTS Thông Thái',
        voucherCode: 'MDA-KTS-TEST22',
        voucherValue: 5000000,
        utm: { utm_source: 'test' },
        durationMs: 45000,
        scoreMismatch: false
      })
    }
  });
  Logger.log(res.getContent());
}
