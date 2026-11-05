/* ═══════════════════════════════════════════════════════════════════
 * CfosCallCal — month calendar + time slots for the free Creative Founder OS
 * fit call (20 min). Copy of consultation/consult.js with its own slot action
 * and فصحى strings. Used by index.html and reschedule.html in this folder.
 * Backend: token-validator CfosCall.js (same engine as the consultation).
 * ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var EXEC = 'https://script.google.com/macros/s/AKfycbznjcsYu8gLDZqFJGededAQaATad_L8vlhRQV04pOqh57HB5nFVRy9zUHAcg6goyj8DKA/exec';
  var OFFSET = 3 * 3600 * 1000;
  var AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  var AR_DOW_SHORT = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  var AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  function arDigits(v) { return String(v).replace(/[0-9]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function slotMs(slot) { return Date.parse(slot + ':00+03:00'); }
  function ksa(ms) {
    var d = new Date(ms + OFFSET);
    return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), dow: d.getUTCDay() };
  }
  function timeAr(slot) {                       // "١١:٠٠ ص"
    var p = ksa(slotMs(slot)), h12 = p.h % 12 === 0 ? 12 : p.h % 12;
    return arDigits(h12 + ':' + pad(p.mi)) + ' ' + (p.h < 12 ? 'ص' : 'م');
  }
  function timeArLong(slot) {                   // "١١:٠٠ صباحًا"
    var p = ksa(slotMs(slot)), h12 = p.h % 12 === 0 ? 12 : p.h % 12;
    return arDigits(h12 + ':' + pad(p.mi)) + ' ' + (p.h < 12 ? 'صباحًا' : (p.h === 12 ? 'ظهرًا' : 'مساءً'));
  }
  function dateAr(slotOrDate) {                 // "الأحد ٢٥ أكتوبر"
    var p = ksa(slotMs(slotOrDate.length === 10 ? slotOrDate + 'T12:00' : slotOrDate));
    return AR_DAYS[p.dow] + ' ' + arDigits(p.d) + ' ' + AR_MONTHS[p.mo - 1];
  }
  function labelAr(slot) { return dateAr(slot) + '، الساعة ' + timeArLong(slot); }

  // Visitor's own time, only when it differs from Saudi time.
  var userTz = '';
  try { userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (_) {}
  function localLabel(slot) {
    if (!userTz || userTz === 'Asia/Riyadh') return '';
    try {
      var ms = slotMs(slot);
      var hm = new Intl.DateTimeFormat('en-GB', { timeZone: userTz, hour: '2-digit', minute: '2-digit', hour12: false, day: '2-digit' }).formatToParts(new Date(ms));
      var get = function (t) { var f = hm.filter(function (x) { return x.type === t; })[0]; return f ? parseInt(f.value, 10) : NaN; };
      var p = ksa(ms);
      var h = get('hour') % 24, mi = get('minute'), day = get('day');
      if (h === p.h && mi === p.mi) return '';
      var h12 = h % 12 === 0 ? 12 : h % 12;
      return arDigits(h12 + ':' + pad(mi)) + ' ' + (h < 12 ? 'ص' : 'م') + (day !== p.d ? (day > p.d || (p.d > 25 && day < 5) ? ' (اليوم التالي)' : ' (اليوم السابق)') : '') + ' بتوقيتك';
    } catch (_) { return ''; }
  }

  function getJSON(params) {
    var q = Object.keys(params).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
    return fetch(EXEC + '?' + q + '&_=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); });
  }
  // text/plain body → no CORS preflight; Apps Script parses the JSON body.
  function post(body) {
    return fetch(EXEC, { method: 'POST', body: JSON.stringify(body) }).then(function (r) { return r.json(); });
  }

  function mount(root, opts) {
    opts = opts || {};
    var days = {}, order = [], cursor = null, selectedDate = '', busySlot = '';
    var todayKsa = (function () { var p = ksa(Date.now()); return p.y + '-' + pad(p.mo) + '-' + pad(p.d); })();

    root.innerHTML =
      '<div class="cc-wrap">' +
      '  <div class="cc-cal">' +
      '    <div class="cc-head">' +
      '      <button type="button" class="cc-nav" data-dir="-1" aria-label="الشهر السابق"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>' +
      '      <span class="cc-month" aria-live="polite"></span>' +
      '      <button type="button" class="cc-nav" data-dir="1" aria-label="الشهر التالي"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>' +
      '    </div>' +
      '    <div class="cc-dow">' + AR_DOW_SHORT.map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div>' +
      '    <div class="cc-grid" role="grid"></div>' +
      '  </div>' +
      '  <div class="cc-times" aria-live="polite"><div class="cc-loading">جارٍ تحميل المواعيد المتاحة…</div></div>' +
      '</div>';
    var monthEl = root.querySelector('.cc-month'), grid = root.querySelector('.cc-grid'), times = root.querySelector('.cc-times');
    var prevBtn = root.querySelector('[data-dir="-1"]'), nextBtn = root.querySelector('[data-dir="1"]');
    prevBtn.onclick = function () { shift(-1); };
    nextBtn.onclick = function () { shift(1); };

    function monthKey(dateStr) { return dateStr.slice(0, 7); }
    function shift(n) {
      var y = +cursor.slice(0, 4), m = +cursor.slice(5, 7) + n;
      if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
      cursor = y + '-' + pad(m);
      renderMonth();
    }
    function renderMonth() {
      var y = +cursor.slice(0, 4), m = +cursor.slice(5, 7);
      monthEl.textContent = AR_MONTHS[m - 1] + ' ' + arDigits(y);
      var firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
      var nDays = new Date(Date.UTC(y, m, 0)).getUTCDate();
      var html = '';
      for (var i = 0; i < firstDow; i++) html += '<span class="cc-day" aria-hidden="true"></span>';
      for (var d = 1; d <= nDays; d++) {
        var ds = cursor + '-' + pad(d);
        var open = !!days[ds];
        var cls = 'cc-day' + (open ? ' is-open' : '') + (ds === selectedDate ? ' is-selected' : '') + (ds === todayKsa ? ' is-today' : '');
        html += open
          ? '<button type="button" class="' + cls + '" data-date="' + ds + '" aria-pressed="' + (ds === selectedDate) + '" aria-label="' + dateAr(ds) + '، ' + arDigits(days[ds].length) + ' مواعيد متاحة">' + arDigits(d) + '</button>'
          : '<span class="' + cls + '" aria-label="' + dateAr(ds) + ' غير متاح">' + arDigits(d) + '</span>';
      }
      grid.innerHTML = html;
      grid.querySelectorAll('button[data-date]').forEach(function (b) { b.onclick = function () { selectDate(b.getAttribute('data-date')); }; });
      var first = order.length ? monthKey(order[0]) : cursor, last = order.length ? monthKey(order[order.length - 1]) : cursor;
      prevBtn.disabled = cursor <= first;
      nextBtn.disabled = cursor >= last;
    }
    function selectDate(ds) {
      selectedDate = ds;
      renderMonth();
      var list = (days[ds] || []).map(function (t) {
        var slot = ds + 'T' + t;
        if (slot === opts.excludeSlot) return '';
        var loc = localLabel(slot);
        return '<button type="button" class="cc-time" data-slot="' + slot + '">' + timeAr(slot) + (loc ? '<small>' + loc + '</small>' : '') + '</button>';
      }).join('');
      times.innerHTML = '<p class="cc-times-title">' + dateAr(ds) + '</p>' +
        (list ? '<div class="cc-time-list">' + list + '</div>' : '<div class="cc-empty">لا توجد مواعيد متاحة في هذا اليوم.</div>') +
        '<p class="note" style="margin-top:10px;">جميع المواعيد بتوقيت السعودية.</p>';
      times.querySelectorAll('.cc-time').forEach(function (b) {
        b.onclick = function () {
          if (busySlot) return;
          var slot = b.getAttribute('data-slot');
          busySlot = slot; b.classList.add('is-busy'); b.disabled = true;
          Promise.resolve(opts.onPick ? opts.onPick(slot) : null).then(function () {
            busySlot = ''; b.classList.remove('is-busy'); b.disabled = false;
          }, function () {
            busySlot = ''; b.classList.remove('is-busy'); b.disabled = false;
          });
        };
      });
    }
    function load() {
      times.innerHTML = '<div class="cc-loading">جارٍ تحميل المواعيد المتاحة…</div>';
      return getJSON({ action: 'cfos_call_slots' }).then(function (j) {
        if (!j || !j.ok) throw new Error('bad');
        days = {}; order = [];
        (j.days || []).forEach(function (d) {
          var t = d.times.filter(function (x) { return d.date + 'T' + x !== opts.excludeSlot; });
          if (t.length) { days[d.date] = t; order.push(d.date); }
        });
        if (!order.length) {
          cursor = todayKsa.slice(0, 7); renderMonth();
          times.innerHTML = '<div class="cc-empty">جميع المواعيد في الأسابيع القادمة محجوزة. يُرجى المحاولة بعد أيام، أو مراسلتنا على support@malearnsa.com.</div>';
          return j;
        }
        if (!selectedDate || !days[selectedDate]) selectedDate = order[0];
        cursor = monthKey(selectedDate);
        selectDate(selectedDate);
        return j;
      }).catch(function () {
        if (!cursor) { cursor = todayKsa.slice(0, 7); renderMonth(); }
        times.innerHTML = '<div class="cc-empty">تعذّر تحميل المواعيد. <button type="button" class="link-btn" data-retry>حاول مرة أخرى</button></div>';
        var r = times.querySelector('[data-retry]'); if (r) r.onclick = load;
      });
    }
    load();
    return { reload: load, labelAr: labelAr };
  }

  window.CfosCallCal = { mount: mount, labelAr: labelAr, dateAr: dateAr, timeAr: timeAr, timeArLong: timeArLong, localLabel: localLabel, post: post, getJSON: getJSON, EXEC: EXEC };
})();
