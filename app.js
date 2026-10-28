/* ==========================================================================
   GAMEpiada · Celestial Arena — app v3
   Vanilla JS: рендер, фильтры, круговые таблицы, дуо-синергия, статистика,
   Google Sheets (gviz JSONP), палитра, темы, звук, эффекты.
   ========================================================================== */
(function () {
  'use strict';

  var DATA = window.GP_DATA;
  if (!DATA) return;

  var EVENT = DATA.event;
  var DISC = DATA.disciplines;
  var SNAP = DATA.players;
  var root = document.documentElement;
  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };

  var LS = {
    theme: 'gamepiada-theme',
    likes: 'gamepiada-likes-v3',
    sound: 'gamepiada-sound',
    duo: 'gamepiada-duo',
    brackets: 'gamepiada-league-v5',
    bracketId: 'gamepiada-bracket-id',
    boards: 'gamepiada-boards-v4',
    roster: 'gamepiada-roster-v1'
  };

  /* ─────────────────────────── helpers ─────────────────────────── */
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(v) {
    return String(v == null ? '' : v).toLowerCase()
      .replace(/ё/g, 'е').replace(/[×х]/g, 'x')
      .replace(/[^a-zа-я0-9.]+/gi, ' ').replace(/\s+/g, ' ').trim();
  }
  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function plural(n, forms) {
    var a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return forms[2];
    if (b > 1 && b < 5) return forms[1];
    if (b === 1) return forms[0];
    return forms[2];
  }
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seededShuffle(arr, seed) {
    var rnd = mulberry32(seed), a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  function mskClock() {
    try {
      return new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' }).format(new Date());
    } catch (e) { return '--:--'; }
  }
  function mskShort(ms) {
    try {
      return new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: 'short' }).format(ms);
    } catch (e) { return ''; }
  }
  function dateLabel(value) {
    if (!value) return '';
    var s = String(value).trim();
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[3] + '.' + m[2];
    m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (m) return pad(+m[1]) + '.' + pad(+m[2]);
    var d = parseStamp(s);
    if (d) {
      var shifted = new Date(d.getTime() + 3 * 3600000);
      return pad(shifted.getUTCDate()) + '.' + pad(shifted.getUTCMonth() + 1);
    }
    return '';
  }
  var WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  function parseStamp(v) {
    if (v == null || v === '') return null;
    if (v instanceof Date) return v;
    var s = String(v).trim();
    var m = s.match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2}),(\d{1,2}),(\d{1,2})(?:,(\d{1,2}))?\)$/);
    if (m) return new Date(+m[1] + '-' + pad(+m[2] + 1) + '-' + pad(+m[3]) + 'T' + pad(+m[4]) + ':' + pad(+m[5]) + ':' + pad(+(m[6] || 0)) + '+03:00');
    m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) return new Date(+m[3] + '-' + pad(+m[2]) + '-' + pad(+m[1]) + 'T' + pad(+m[4]) + ':' + pad(+m[5]) + ':' + pad(+(m[6] || 0)) + '+03:00');
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (m) return new Date(+m[1] + '-' + m[2] + '-' + m[3] + 'T' + m[4] + ':' + m[5] + ':' + (m[6] || '00') + '+03:00');
    var d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  /* Календарных дат нет: турнир идёт по очереди слотов. Порядок — order. */
  function byOrder(a, b) { return (a.order || 0) - (b.order || 0); }
  function queue() { return DISC.slice().sort(byOrder); }
  function compOf(d) { return (d && d.comp) || {}; }
  function isBoard(d) { return compOf(d).kind === 'board'; }
  function seriesOf(d) { return compOf(d).series || d.bo || '—'; }
  function durationLabel(d) {
    var m = d.duration || 0;
    if (!m) return '—';
    if (m < 60) return m + 'м';
    var h = Math.floor(m / 60), rest = m % 60;
    return h + 'ч' + (rest ? ' ' + rest + 'м' : '');
  }
  function slotBadge(d) {
    if (isBoard(d)) return { cls: 'is-board', text: 'заезд' };
    return { cls: '', text: 'слот ' + (d.order || '—') };
  }
  function fmtPoints(v) {
    return String(v).replace('.', ',').replace(/,0$/, '');
  }
  function pointsLabel(d) {
    return (compOf(d).seats || 1) > 1 ? '1,5 / 1 / 0,5' : '3 / 2 / 1';
  }
  function placePoints(d, place) {
    var base = (EVENT.scoring || [3, 2, 1])[place - 1] || 0;
    if ((compOf(d).seats || 1) > 1) return base / 2;
    return base;
  }
  /* Участники соревнования: в одиночных — игроки, в 2×2 — команды из
     взаимных дуо-пожеланий, одиночки добираются как solo-команды. */
  function entrants(d) {
    var seats = compOf(d).seats || 1;
    var people = participants(d);
    if (seats < 2) {
      return people.map(function (p) {
        return { key: p.id, label: p.nick, players: [p], team: false, strength: (p.disciplines || []).length };
      });
    }
    var used = {}, out = [];
    people.forEach(function (p) {
      if (used[p.id]) return;
      var mate = null;
      for (var i = 0; i < people.length; i++) {
        var q = people[i];
        if (q.id === p.id || used[q.id]) continue;
        var info = pairInfo(p, q);
        if (info && info.mutual) { mate = q; break; }
      }
      if (mate) {
        used[p.id] = used[mate.id] = 1;
        out.push({
          key: 't-' + p.id + '-' + mate.id,
          label: p.nick + ' + ' + mate.nick,
          players: [p, mate], team: true,
          strength: (p.disciplines || []).length + (mate.disciplines || []).length
        });
      } else {
        used[p.id] = 1;
        out.push({ key: 's-' + p.id, label: p.nick, players: [p], team: false, strength: (p.disciplines || []).length });
      }
    });
    return out;
  }
  function entrantByKey(d, key) {
    if (!key) return null;
    var list = entrants(d);
    for (var i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
    return null;
  }

  /* ─────────────────────────── state ─────────────────────────── */
  var state = {
    players: SNAP.map(function (p) { return Object.assign({}, p); }),
    source: 'snapshot',
    liveAt: null,
    liveTries: 0,
    filter: 'all',
    discQuery: '',
    rosterQuery: '',
    rosterSort: 'disciplines',
    bracketId: 'dota11',
    brackets: {},
    boards: {},
    rosterEdits: {},
    matrixEdit: false,
    rosterModal: null,
    fromUrlCode: false,
    duoA: 'p2',
    duoB: 'p7',
    chartOpen: false,
    likes: {},
    theme: root.getAttribute('data-theme') || 'dark',
    sound: true,
    sheetOpen: false,
    paletteOpen: false,
    paletteItems: [],
    paletteIndex: 0,
    autoRunning: false
  };

  try {
    state.likes = JSON.parse(localStorage.getItem(LS.likes) || '{}') || {};
    state.sound = localStorage.getItem(LS.sound) !== '0';
    var savedDuo = JSON.parse(localStorage.getItem(LS.duo) || 'null');
    if (savedDuo && savedDuo.a && savedDuo.b) { state.duoA = savedDuo.a; state.duoB = savedDuo.b; }
    var savedBrackets = JSON.parse(localStorage.getItem(LS.brackets) || 'null');
    if (savedBrackets && typeof savedBrackets === 'object') state.brackets = savedBrackets;
    var savedBoards = JSON.parse(localStorage.getItem(LS.boards) || 'null');
    if (savedBoards && typeof savedBoards === 'object') state.boards = savedBoards;
    var savedBracketId = localStorage.getItem(LS.bracketId);
    if (savedBracketId && DISC.some(function (d) { return d.id === savedBracketId; })) state.bracketId = savedBracketId;
    var savedRoster = JSON.parse(localStorage.getItem(LS.roster) || 'null');
    if (savedRoster && typeof savedRoster === 'object') state.rosterEdits = sanitizeRoster(savedRoster);
  } catch (e) { /* ignore */ }
  /* Ссылка вида ?r=<код> переносит раскладку состава на другое устройство. */
  var urlRosterMatch = /[?&]r=([^&#]+)/.exec(location.search || '');
  if (urlRosterMatch) {
    var fromUrl = readRosterCode(urlRosterMatch[1]);
    if (fromUrl) { state.rosterEdits = fromUrl; state.fromUrlCode = true; }
  }

  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }
  function playerById(id) {
    for (var i = 0; i < state.players.length; i++) if (state.players[i].id === id) return state.players[i];
    return null;
  }
  function discById(id) {
    for (var i = 0; i < DISC.length; i++) if (DISC[i].id === id) return DISC[i];
    return null;
  }
  function participants(d) {
    return state.players.filter(function (p) { return (p.disciplines || []).indexOf(d.id) >= 0; });
  }
  function countFor(id) { return participants(discById(id)).length; }
  function saveBoards() {
    try { localStorage.setItem(LS.boards, JSON.stringify(state.boards)); } catch (e) { /* quota */ }
    cloudMarkDirty('подиум заезда');
  }
  function boardState(id) {
    if (!state.boards[id]) state.boards[id] = { 1: '', 2: '', 3: '' };
    return state.boards[id];
  }
  function saveBrackets() {
    try {
      localStorage.setItem(LS.brackets, JSON.stringify(state.brackets));
      localStorage.setItem(LS.bracketId, state.bracketId);
    } catch (e) { /* quota */ }
    cloudMarkDirty('результат матча');
  }
  function bracketState(id) {
    if (!state.brackets[id]) {
      var st = { seed: hash(id), winners: {} };
      state.brackets[id] = st;
    }
    return state.brackets[id];
  }
  /* ── состав: локальная правка «кто в какой сетке» ───────────────────────
     Google Таблица остаётся только для чтения: правки хранятся отдельным
     слоем (добавил/снял) и накладываются поверх ответов формы при каждом
     рендере — в том числе после live-синка. */
  function sanitizeRoster(raw) {
    var out = {};
    if (!raw || typeof raw !== 'object') return out;
    Object.keys(raw).forEach(function (pid) {
      /* боец может прийти только из live-синка — не выбрасываем такие правки,
         просто ждём, пока он появится в state.players */
      if (!pid || /^(__proto__|constructor|prototype)$/.test(pid)) return;
      var ed = raw[pid] || {};
      var add = (Array.isArray(ed.add) ? ed.add : []).filter(function (id) { return !!discById(id); });
      var drop = (Array.isArray(ed.drop) ? ed.drop : []).filter(function (id) { return !!discById(id); });
      if (add.length || drop.length) out[pid] = { add: add, drop: drop };
    });
    return out;
  }
  function saveRosterEdits() {
    try { localStorage.setItem(LS.roster, JSON.stringify(state.rosterEdits)); } catch (e) { /* quota */ }
    cloudMarkDirty('состав сетки');
  }
  /* База — ответы формы, _base не даёт правкам «съесть» друг друга. */
  function applyRosterEdits() {
    state.players.forEach(function (p) {
      if (!p._base) p._base = (p.disciplines || []).slice();
      var base = p._base.filter(function (id) { return !!discById(id); });
      var ed = state.rosterEdits[p.id];
      if (!ed) { p.disciplines = base.slice(); return; }
      var out = base.filter(function (id) { return (ed.drop || []).indexOf(id) < 0; });
      (ed.add || []).forEach(function (id) {
        if (discById(id) && out.indexOf(id) < 0) out.push(id);
      });
      p.disciplines = out;
    });
  }
  function baseDisciplines(p) {
    return ((p && (p._base || p.disciplines)) || []).slice();
  }
  function rosterToggle(playerId, discId) {
    if (guardReadonly('Состав сетки меняет админ.')) return null;
    var p = playerById(playerId);
    if (!p || !discById(discId)) return null;
    var base = baseDisciplines(p);
    var on = (p.disciplines || []).indexOf(discId) >= 0;
    var ed = state.rosterEdits[p.id] || { add: [], drop: [] };
    ed.add = (ed.add || []).filter(function (x) { return x !== discId; });
    ed.drop = (ed.drop || []).filter(function (x) { return x !== discId; });
    if (on) {
      if (base.indexOf(discId) >= 0) ed.drop.push(discId);
    } else if (base.indexOf(discId) < 0) {
      ed.add.push(discId);
    }
    if (!ed.add.length && !ed.drop.length) delete state.rosterEdits[p.id];
    else state.rosterEdits[p.id] = ed;
    saveRosterEdits();
    applyRosterEdits();
    return !on;
  }
  function resetRoster(playerId) {
    if (playerId) delete state.rosterEdits[playerId];
    else state.rosterEdits = {};
    saveRosterEdits();
    applyRosterEdits();
  }
  function resetRosterDisc(discId) {
    Object.keys(state.rosterEdits).forEach(function (pid) {
      var ed = state.rosterEdits[pid];
      ed.add = (ed.add || []).filter(function (x) { return x !== discId; });
      ed.drop = (ed.drop || []).filter(function (x) { return x !== discId; });
      if (!ed.add.length && !ed.drop.length) delete state.rosterEdits[pid];
    });
    saveRosterEdits();
    applyRosterEdits();
  }
  function rosterEditCount(discId) {
    var n = 0;
    Object.keys(state.rosterEdits).forEach(function (pid) {
      var ed = state.rosterEdits[pid] || {};
      var add = ed.add || [], drop = ed.drop || [];
      if (discId) n += add.filter(function (x) { return x === discId; }).length + drop.filter(function (x) { return x === discId; }).length;
      else n += add.length + drop.length;
    });
    return n;
  }
  function rosterCode() {
    try {
      return btoa(unescape(encodeURIComponent(JSON.stringify(state.rosterEdits))))
        .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    } catch (e) { return ''; }
  }
  function readRosterCode(code) {
    try {
      var b = String(code || '').replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      var obj = JSON.parse(decodeURIComponent(escape(atob(b))));
      return sanitizeRoster(obj);
    } catch (e) { return null; }
  }
  function rosterShareUrl() {
    var base = EVENT.siteUrl || (location.origin + location.pathname);
    base = String(base).replace(/[?#].*$/, '');
    var code = rosterCode();
    return base + (code ? '?r=' + code : '') + '#bracket';
  }

  /* ══════════════════ облако: общие результаты для всех ══════════════════
     Сайт статический, поэтому «сервер» — файл data/live-state.json в этом же
     репозитории. Читают его все (публично), а пишут только админы: у них в
     браузере лежит GitHub-токен с правом contents:write на этот репозиторий.
     Токен никогда не попадает в код и не уходит никуда, кроме api.github.com. */
  var CLOUD = {
    cfgKey: 'gamepiada-cloud-v1',
    cfg: { owner: 'SSGSSBEx1080', repo: 'TOURNAMENTS', branch: 'main', path: 'data/live-state.json', token: '', login: '' },
    status: {
      mode: 'local',      /* local | live | readonly */
      shared: 'setup',    /* режим, объявленный в файле: setup | live */
      rev: 0,
      updatedAt: '',
      updatedBy: '',
      syncing: false,
      error: '',
      checkedAt: 0,
      dirty: false,
      retries: 0,
      savedAt: 0,
      expires: '',
      login: ''
    },
    admins: [],
    log: [],
    base: null,        /* последняя версия облака, которую видел браузер */
    pushTimer: null,
    retryTimer: null,
    pollTimer: null,
    applying: false
  };
  var CLOUD_API = 'https://api.github.com';

  function cloudExpiresText() {
    var raw = CLOUD.status.expires;
    if (!raw) return '';
    var d = new Date(raw);
    if (isNaN(d.getTime())) return '';
    var days = Math.ceil((d.getTime() - Date.now()) / 86400000);
    var when = clockShort(d.toISOString());
    if (days <= 0) return 'срок истёк ' + when;
    if (days === 1) return 'истекает завтра (' + when + ')';
    if (days <= 7) return 'истекает через ' + days + ' ' + plural(days, ['день', 'дня', 'дней']) + ' (' + when + ')';
    return 'действует до ' + when;
  }
  function cloudExpiresSoon() {
    var d = new Date(CLOUD.status.expires || 0);
    if (!CLOUD.status.expires || isNaN(d.getTime())) return false;
    return d.getTime() - Date.now() < 7 * 86400000;
  }

  function cloudLoadCfg() {
    try {
      var raw = JSON.parse(localStorage.getItem(CLOUD.cfgKey) || 'null');
      if (raw && typeof raw === 'object') {
        ['owner', 'repo', 'branch', 'path', 'token', 'login'].forEach(function (k) {
          if (typeof raw[k] === 'string' && raw[k]) CLOUD.cfg[k] = raw[k];
        });
      }
    } catch (e) { /* ignore */ }
  }
  function cloudSaveCfg() {
    try { localStorage.setItem(CLOUD.cfgKey, JSON.stringify(CLOUD.cfg)); } catch (e) { /* quota */ }
  }
  function cloudHasToken() { return !!CLOUD.cfg.token; }
  function cloudIsAdmin() { return cloudHasToken() && CLOUD.status.shared === 'live'; }
  function cloudIsReadonly() { return !cloudHasToken() && CLOUD.status.shared === 'live'; }
  /* Пересчитать локальный режим по файлу состояния и наличию токена. */
  function cloudSyncMode() {
    CLOUD.status.mode = CLOUD.status.shared === 'live'
      ? (cloudHasToken() ? 'live' : 'readonly')
      : 'local';
    return CLOUD.status.mode;
  }
  function cloudReady() { return typeof fetch === 'function'; }

  function cloudRepo() {
    return CLOUD.cfg.owner + '/' + CLOUD.cfg.repo;
  }
  function cloudFileUrl() {
    return CLOUD_API + '/repos/' + cloudRepo() + '/contents/' + CLOUD.cfg.path.split('/').map(encodeURIComponent).join('/');
  }
  function cloudHeaders(withAuth) {
    var h = { 'Accept': 'application/vnd.github+json' };
    if (withAuth && cloudHasToken()) h['Authorization'] = 'Bearer ' + CLOUD.cfg.token;
    return h;
  }
  function b64encode(str) {
    try { return btoa(unescape(encodeURIComponent(str))); } catch (e) { return ''; }
  }
  function b64decode(str) {
    try { return decodeURIComponent(escape(atob(String(str || '').replace(/\s+/g, '')))); } catch (e) { return ''; }
  }

  /* Локальное состояние в формате файла. */
  function cloudExport() {
    return {
      schema: 1,
      mode: 'live',
      rev: CLOUD.status.rev || 0,
      updatedAt: new Date().toISOString(),
      updatedBy: CLOUD.cfg.login || 'admin',
      admins: CLOUD.admins.slice(),
      log: CLOUD.log.slice(0, 60),
      brackets: (function () {
        var out = {};
        /* seed держим в облаке даже у пустой сетки: иначе после сброса
           результаты пересобирались бы в другом порядке */
        Object.keys(state.brackets || {}).forEach(function (id) {
          var st = state.brackets[id] || {};
          if (st.seed == null && !(st.winners && Object.keys(st.winners).length)) return;
          out[id] = { seed: st.seed, winners: st.winners || {} };
        });
        return JSON.parse(JSON.stringify(out));
      })(),
      boards: JSON.parse(JSON.stringify(state.boards || {})),
      roster: JSON.parse(JSON.stringify(state.rosterEdits || {}))
    };
  }
  /* ── слияние: не терять чужие правки и не откатывать свои ─────────────
     remote — что лежит в облаке, local — что в этом браузере, base — последняя
     версия облака, которую видел браузер. Ключ, который локально отличается от
     base (в том числе удалён), остаётся локальным; остальное берём из облака.
     Без base (первый контакт) побеждает облако: старый кеш не спорит с сервером. */
  function cloudSame(a, b) {
    return JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);
  }
  function cloudPick(remoteV, localV, baseV, hasBase) {
    if (!hasBase) return localV === undefined ? remoteV : localV;
    return cloudSame(localV, baseV) ? remoteV : localV;
  }
  function cloudKeySet() {
    var seen = {};
    for (var i = 0; i < arguments.length; i++) {
      var m = arguments[i];
      if (!m || typeof m !== 'object') continue;
      Object.keys(m).forEach(function (k) { seen[k] = true; });
    }
    return seen;
  }
  /* Плоские словари: победители матчей, места подиума, правки состава. */
  function cloudMergeMap(remoteMap, localMap, baseMap, hasBase) {
    var seen = cloudKeySet(remoteMap, localMap, baseMap), out = {};
    Object.keys(seen).forEach(function (k) {
      var v = cloudPick(remoteMap && remoteMap[k], localMap && localMap[k], baseMap && baseMap[k], hasBase);
      if (v === undefined || v === null) return;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        var add = Array.isArray(v.add) ? v.add.slice() : [];
        var drop = Array.isArray(v.drop) ? v.drop.slice() : [];
        if (!add.length && !drop.length) return;   /* пустая правка — не правка */
        out[k] = { add: add, drop: drop };
        return;
      }
      out[k] = v;
    });
    return out;
  }
  function cloudMergeBrackets(remoteB, localB, baseB, hasBase) {
    var seen = cloudKeySet(remoteB, localB, baseB), out = {};
    Object.keys(seen).forEach(function (id) {
      var r = (remoteB && remoteB[id]) || {}, l = (localB && localB[id]) || {}, b = (baseB && baseB[id]) || {};
      var winners = cloudMergeMap(r.winners, l.winners, b.winners, hasBase);
      var seed = cloudPick(r.seed, l.seed, b.seed, hasBase);
      if (!Object.keys(winners).length && (seed === undefined || seed === null)) return;
      out[id] = {};
      if (seed !== undefined && seed !== null) out[id].seed = seed;
      out[id].winners = winners;
    });
    return out;
  }
  /* Подиумы: {disciplineId: {'1': playerId, '2': ..., '3': ...}} */
  function cloudMergeBoards(remoteB, localB, baseB, hasBase) {
    var seen = cloudKeySet(remoteB, localB, baseB), out = {};
    Object.keys(seen).forEach(function (id) {
      var places = cloudMergeMap((remoteB && remoteB[id]) || {}, (localB && localB[id]) || {}, (baseB && baseB[id]) || {}, hasBase);
      if (!Object.keys(places).length) return;
      out[id] = places;
    });
    return out;
  }
  function cloudMergeAdmins(remoteA, localA, baseA, hasBase) {
    remoteA = Array.isArray(remoteA) ? remoteA.slice() : [];
    localA = Array.isArray(localA) ? localA.slice() : [];
    baseA = Array.isArray(baseA) ? baseA.slice() : [];
    if (!hasBase) {
      remoteA.forEach(function (x) { if (localA.indexOf(x) < 0) localA.push(x); });
      return localA.slice(0, 20);
    }
    return (cloudSame(localA, baseA) ? remoteA : localA).slice(0, 20);
  }
  function cloudMergeLog(remoteL, localL) {
    var out = [], seen = {};
    (localL || []).concat(remoteL || []).forEach(function (x) {
      if (!x || !x.at) return;
      var k = x.at + '|' + (x.by || '') + '|' + (x.text || '');
      if (seen[k]) return;
      seen[k] = 1;
      out.push(x);
    });
    out.sort(function (x, y) { return String(y.at).localeCompare(String(x.at)); });
    return out.slice(0, 60);
  }
  function cloudMerge(remote, local, base) {
    remote = remote || {};
    local = local || {};
    var hasBase = !!(base && typeof base === 'object');
    return {
      schema: 1,
      mode: 'live',
      rev: Math.max(Number(remote.rev) || 0, Number(local.rev) || 0),
      updatedAt: remote.updatedAt || local.updatedAt || '',
      updatedBy: remote.updatedBy || local.updatedBy || '',
      admins: cloudMergeAdmins(remote.admins, local.admins, hasBase ? base.admins : null, hasBase),
      log: cloudMergeLog(remote.log, local.log),
      brackets: cloudMergeBrackets(remote.brackets, local.brackets, hasBase ? base.brackets : null, hasBase),
      boards: cloudMergeBoards(remote.boards, local.boards, hasBase ? base.boards : null, hasBase),
      roster: cloudMergeMap(remote.roster, local.roster, hasBase ? base.roster : null, hasBase)
    };
  }

  /* Снимок облака без служебных полей — с ним сравниваем локальные правки. */
  function cloudSnapshot(src) {
    src = src || {};
    function plain(v) { return (v && typeof v === 'object') ? JSON.parse(JSON.stringify(v)) : {}; }
    return {
      admins: Array.isArray(src.admins) ? src.admins.slice() : [],
      brackets: plain(src.brackets),
      boards: plain(src.boards),
      roster: plain(src.roster)
    };
  }
  /* Есть ли в браузере правки, которых ещё нет в облаке. */
  function cloudHasLocalChanges() {
    if (!CLOUD.base) return !!CLOUD.status.dirty;
    var local = cloudExport();
    return !cloudSame(local.brackets, CLOUD.base.brackets)
      || !cloudSame(local.boards, CLOUD.base.boards)
      || !cloudSame(local.roster, CLOUD.base.roster);
  }

  /* Применяем файл к сайту: сюда приходят и админ, и обычный зритель.
     Админу локальные правки не затираются: они склеиваются с облаком. */
  function cloudApply(remote) {
    if (!remote || typeof remote !== 'object') return false;
    var rev = Number(remote.rev) || 0;
    if (rev && rev < (CLOUD.status.rev || 0)) return false;
    var local = cloudExport();
    var mergeLocal = cloudHasToken() && (CLOUD.base || CLOUD.status.dirty);
    var next = mergeLocal ? cloudMerge(remote, local, CLOUD.base) : remote;
    CLOUD.applying = true;
    CLOUD.status.rev = Math.max(rev, Number(CLOUD.status.rev) || 0);
    CLOUD.status.updatedAt = remote.updatedAt || '';
    CLOUD.status.updatedBy = remote.updatedBy || '';
    CLOUD.admins = Array.isArray(next.admins) ? next.admins.slice(0, 20) : [];
    CLOUD.log = Array.isArray(next.log) ? next.log.slice(0, 60) : [];
    if (next.brackets && typeof next.brackets === 'object') state.brackets = next.brackets;
    if (next.boards && typeof next.boards === 'object') state.boards = next.boards;
    if (next.roster && typeof next.roster === 'object') state.rosterEdits = sanitizeRoster(next.roster);
    applyRosterEdits();
    CLOUD.status.shared = remote.mode === 'live' ? 'live' : 'setup';
    cloudSyncMode();
    CLOUD.status.checkedAt = Date.now();
    if (!CLOUD.status.dirty) CLOUD.status.error = '';
    CLOUD.base = cloudSnapshot(remote);
    CLOUD.applying = false;
    renderAll();
    renderCloudUI();
    /* если в браузере остались правки, которых нет в облаке — отправим их сами */
    if (mergeLocal && cloudHasLocalChanges()) {
      CLOUD.status.dirty = true;
      scheduleCloudPush(900);
      renderCloudUI();
    }
    return true;
  }

  function cloudFetchState(useAuth) {
    if (!cloudReady()) return Promise.reject(new Error('no fetch'));
    var url = cloudFileUrl();
    if (useAuth && cloudHasToken()) {
      return fetch(url + '?ref=' + encodeURIComponent(CLOUD.cfg.branch), { headers: cloudHeaders(true), cache: 'no-store' })
        .then(function (r) {
          if (r.status === 404) return null;
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function (meta) {
          if (!meta) return { data: null, sha: null };
          var text = b64decode(meta.content);
          var data = text ? JSON.parse(text) : null;
          return { data: data, sha: meta.sha || null };
        });
    }
    var plain = CLOUD.cfg.path + '?t=' + Date.now();
    return fetch(plain, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { return { data: data, sha: null }; });
  }

  function cloudPull(silent) {
    if (!cloudReady()) return Promise.resolve(false);
    return cloudFetchState(false)
      .then(function (res) {
        if (!res || !res.data) return false;
        return cloudApply(res.data);
      })
      .catch(function (e) {
        CLOUD.status.error = String(e && e.message || e);
        renderCloudUI();
        if (!silent) toast('Не удалось прочитать общие результаты: ' + esc(CLOUD.status.error), '📡');
        return false;
      });
  }

  function cloudLog(text) {
    CLOUD.log.unshift({ at: new Date().toISOString(), by: CLOUD.cfg.login || 'admin', text: text });
    CLOUD.log = CLOUD.log.slice(0, 60);
  }

  /* Отложенная публикация: 0,9 с после правки, чтобы не коммитить каждый клик. */
  function scheduleCloudPush(delay) {
    if (!cloudHasToken()) return;
    if (CLOUD.pushTimer) clearTimeout(CLOUD.pushTimer);
    CLOUD.pushTimer = setTimeout(function () {
      CLOUD.pushTimer = null;
      if (CLOUD.status.syncing) return;
      if (!CLOUD.status.dirty && !cloudHasLocalChanges()) return;
      cloudPush(null, true);
    }, Math.max(200, delay || 900));
  }

  /* Не сохранилось — пробуем сами, с нарастающей паузой. */
  function scheduleCloudRetry() {
    if (!cloudHasToken() || CLOUD.retryTimer) return;
    var n = Math.min(Math.max(CLOUD.status.retries || 1, 1), 4);
    var delay = Math.min(30000, 2500 * Math.pow(2, n - 1));
    CLOUD.retryTimer = setTimeout(function () {
      CLOUD.retryTimer = null;
      if (CLOUD.status.syncing) return;
      if (!CLOUD.status.dirty) return;
      cloudPush(null, true);
    }, delay);
  }
  function cloudRetryNow() {
    if (CLOUD.retryTimer) { clearTimeout(CLOUD.retryTimer); CLOUD.retryTimer = null; }
    if (!cloudHasToken()) { toast('Сначала войди как админ', '🔑'); return; }
    CLOUD.status.retries = 0;
    CLOUD.status.dirty = true;
    cloudPush(null, false);
  }

  function cloudPush(reason, silent) {
    if (!cloudHasToken() || !cloudReady()) return Promise.resolve(false);
    if (CLOUD.status.syncing) { CLOUD.status.dirty = true; return Promise.resolve(false); }
    CLOUD.status.syncing = true;
    CLOUD.status.dirty = false;
    CLOUD.status.error = '';
    renderCloudUI();
    var sha = null;
    var url = cloudFileUrl();
    var nextState = null;
    return fetch(url + '?ref=' + encodeURIComponent(CLOUD.cfg.branch), { headers: cloudHeaders(true), cache: 'no-store' })
      .then(function (r) {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (meta) {
        var remote = null;
        if (meta) {
          sha = meta.sha;
          var text = b64decode(meta.content);
          try { remote = text ? JSON.parse(text) : null; } catch (e) { remote = null; }
        }
        if (reason) cloudLog(reason);
        /* склейка: наши правки поверх облака, чужие не теряем */
        nextState = cloudMerge(remote || {}, cloudExport(), CLOUD.base);
        nextState.rev = Math.max(Number(remote && remote.rev) || 0, CLOUD.status.rev || 0) + 1;
        nextState.updatedAt = new Date().toISOString();
        nextState.updatedBy = CLOUD.cfg.login || 'admin';
        nextState.mode = 'live';
        var body = {
          message: 'state: ' + (reason || 'обновление результатов') + ' (rev ' + nextState.rev + ')',
          content: b64encode(JSON.stringify(nextState, null, 2)),
          branch: CLOUD.cfg.branch
        };
        if (sha) body.sha = sha;
        return fetch(url, {
          method: 'PUT',
          headers: Object.assign({ 'Content-Type': 'application/json' }, cloudHeaders(true)),
          body: JSON.stringify(body)
        });
      })
      .then(function (r) {
        if (r.status === 401) throw new Error('токен истёк или отозван — создай новый в GitHub и вставь заново');
        if (r.status === 403) throw new Error('у токена нет права Contents: read & write на этот репозиторий');
        if (r.status === 404) throw new Error('репозиторий или файл недоступны токену');
        if (r.status === 409) throw new Error('конфликт версий — нажми «Повторить»');
        if (!r.ok) return r.text().then(function (t) { throw new Error('HTTP ' + r.status + ' ' + String(t).slice(0, 120)); });
        return true;
      })
      .catch(function (e) {
        CLOUD.status.error = String(e && e.message || e);
        CLOUD.status.dirty = true;          /* правка остаётся в браузере */
        CLOUD.status.retries = (CLOUD.status.retries || 0) + 1;
        if (!silent) toast('Не сохранилось в облако: ' + esc(CLOUD.status.error), '⚠️');
        return false;
      })
      .then(function (ok) {
        CLOUD.status.syncing = false;
        if (ok) {
          CLOUD.status.retries = 0;
          CLOUD.status.error = '';
          CLOUD.status.savedAt = Date.now();
          CLOUD.status.rev = nextState.rev;
          CLOUD.status.updatedAt = nextState.updatedAt;
          CLOUD.status.updatedBy = nextState.updatedBy;
          CLOUD.base = cloudSnapshot(nextState);
          renderCloudUI();
          cloudFlashSaved();
          if (CLOUD.status.dirty) { CLOUD.status.dirty = false; cloudPush(null, true); }
          else if (cloudHasLocalChanges()) {          /* дошлём: первый пуш мог быть без базы */
            CLOUD.status.dirty = true;
            scheduleCloudPush(600);
          }
        } else {
          renderCloudUI();
          scheduleCloudRetry();
        }
        return ok;
      });
  }

  /* Любое изменение результатов → отложенная публикация. */
  function cloudMarkDirty(reason) {
    if (!cloudHasToken()) { if (CLOUD.status.mode === 'live') renderCloudUI(); return; }
    if (CLOUD.applying) return;
    if (reason) cloudLog(reason);
    /* Токен есть, но общий режим ещё не включён — не публикуем молча,
       иначе сайт неожиданно закроется для всех на первом же клике. */
    if (CLOUD.status.mode !== 'live') {
      renderCloudUI();
      if (!CLOUD.hinted) {
        CLOUD.hinted = true;
        toast('Пока видно только у тебя. Открой <b>🛡️ админку</b> и нажми «Включить общий режим», чтобы результаты увидели все.', '🔒');
      }
      return;
    }
    CLOUD.status.dirty = true;
    cloudClearFlash();
    renderCloudUI();
    scheduleCloudPush(900);
  }

  /* Проверяем токен: кто это и есть ли право писать. */
  function cloudVerifyToken() {
    if (!cloudReady()) return Promise.reject(new Error('нет fetch'));
    return fetch(CLOUD_API + '/user', { headers: cloudHeaders(true), cache: 'no-store' })
      .then(function (r) {
        if (r.status === 401) throw new Error('токен истёк или отозван — создай новый');
        if (!r.ok) throw new Error('токен не принят (HTTP ' + r.status + ')');
        try {
          var exp = r.headers && r.headers.get && r.headers.get('github-authentication-token-expiration');
          if (exp) CLOUD.status.expires = new Date(String(exp).replace(' UTC', 'Z').replace(' ', 'T')).toISOString();
        } catch (e) { /* ignore */ }
        return r.json();
      })
      .then(function (u) {
        CLOUD.cfg.login = u.login || 'admin';
        CLOUD.status.login = CLOUD.cfg.login;
        cloudSaveCfg();
        return fetch(cloudFileUrl(), { headers: cloudHeaders(true), cache: 'no-store' })
          .then(function (r) { return { perm: r.ok ? r.json() : null, status: r.status }; })
          .then(function (x) {
            var canWrite = !!(x.perm && (x.perm.permissions ? x.perm.permissions.push : true));
            return { login: CLOUD.cfg.login, canWrite: canWrite, status: x.status };
          });
      });
  }

  function cloudGoLive() {
    if (!cloudHasToken()) { toast('Сначала вставь токен администратора', '🔑'); return Promise.resolve(false); }
    return cloudVerifyToken().then(function (u) {
      if (!u.canWrite) throw new Error('у токена нет права contents:write на этот репозиторий');
      if (CLOUD.admins.indexOf(u.login) < 0) CLOUD.admins.unshift(u.login);
      CLOUD.status.shared = 'live';
      cloudSyncMode();
      cloudLog('включил общий режим');
      return cloudPush('включил общий режим', false).then(function (ok) {
        renderAll(); renderCloudUI();
        if (ok) toast('Общий режим включён: изменения видят все, кто откроет сайт', '🌍');
        return ok;
      });
    }).catch(function (e) {
      CLOUD.status.error = String(e && e.message || e);
      renderCloudUI();
      toast('Не получилось: ' + esc(CLOUD.status.error), '⚠️');
      return false;
    });
  }

  function cloudDisconnect() {
    CLOUD.cfg.token = '';
    CLOUD.cfg.login = '';
    cloudSaveCfg();
    cloudSyncMode();
    CLOUD.status.error = '';
    renderAll();
    renderCloudUI();
    toast('Токен убран из этого браузера. Общие результаты остались на сайте.', '🔓');
  }

  function cloudAddAdmin(login) {
    var l = String(login || '').trim().replace(/^@/, '');
    if (!l) return false;
    if (!/^[A-Za-z0-9-]{1,39}$/.test(l)) { toast('GitHub-логин: латиница, цифры и дефис', '⚠️'); return false; }
    if (CLOUD.admins.indexOf(l) < 0) CLOUD.admins.push(l);
    cloudMarkDirty('назначил админом ' + l);
    renderCloudUI();
    return true;
  }
  function cloudRemoveAdmin(login) {
    CLOUD.admins = CLOUD.admins.filter(function (x) { return x !== login; });
    cloudMarkDirty('снял админа ' + login);
    renderCloudUI();
  }

  /* ── админка: вход по токену, админы, журнал, бэкап ────────────────── */
  function cloudSavedText() {
    if (cloudIsAdmin() && CLOUD.status.error && CLOUD.status.dirty) return 'не сохранилось — правка у меня, повторю сам';
    if (cloudIsAdmin() && CLOUD.status.syncing) return 'сохраняю…';
    if (cloudIsAdmin() && CLOUD.status.dirty) return 'жду сохранения…';
    if (CLOUD.status.updatedAt) return 'сохранено ' + clockShort(CLOUD.status.updatedAt);
    return 'ещё нечего сохранять';
  }

  /* Новая правка гасит подсветку «сохранено», иначе она врёт про актуальность. */
  function cloudClearFlash() {
    if (CLOUD.flashTimer) { clearTimeout(CLOUD.flashTimer); CLOUD.flashTimer = null; }
    CLOUD.status.savedAt = 0;
  }

  /* Свежее сохранение подсвечиваем на пару секунд — видно, что клик дошёл. */
  function cloudFlashSaved() {
    CLOUD.status.savedAt = Date.now();
    renderCloudUI();
    if (CLOUD.flashTimer) clearTimeout(CLOUD.flashTimer);
    CLOUD.flashTimer = setTimeout(function () {
      CLOUD.flashTimer = null;
      CLOUD.status.savedAt = 0;
      renderCloudUI();
    }, 2600);
  }

  function cloudBarState() {
    if (CLOUD.status.syncing) return 'saving';
    if (CLOUD.status.savedAt && Date.now() - CLOUD.status.savedAt < 2600) return 'saved';
    if (CLOUD.status.error && CLOUD.status.dirty) return 'error';
    if (CLOUD.status.dirty) return 'saving';
    return 'idle';
  }

  function cloudBadgeHtml() {
    var state = cloudBarState();
    var savedBadge = state === 'saved'
      ? '<span class="cb-pill is-ok"><i aria-hidden="true">✓</i>сохранено</span>'
      : (state === 'error'
        ? '<span class="cb-pill is-error"><i aria-hidden="true">!</i>не сохранено</span>'
        : (state === 'saving'
          ? '<span class="cb-pill is-busy"><i class="cb-spin" aria-hidden="true"></i>' + (cloudIsAdmin() ? 'сохраняю' : 'обновляю') + '</span>'
          : ''));

    if (cloudIsAdmin()) {
      var live = CLOUD.status.savedAt && Date.now() - CLOUD.status.savedAt < 2600;
      return '<div class="cloud-bar is-live" data-state="' + state + '">' +
        '<span class="cb-glow" aria-hidden="true"></span>' +
        '<span class="cb-orb" aria-hidden="true"><b>●</b></span>' +
        '<div class="cb-text">' +
          '<span class="cb-kicker">режим админа · всё видят все</span>' +
          '<b>Ты админ — можно менять</b>' +
          '<span>' + (live ? 'правка сохранена в облако — её уже видят все' : esc(cloudSavedText())) + '</span>' +
        '</div>' +
        savedBadge +
        '<div class="cb-actions">' +
          (state === 'error'
            ? '<button class="btn btn-primary btn-sm" type="button" data-action="cloud-retry"><span aria-hidden="true">⟳</span><span>Повторить</span></button>'
            : '') +
          '<button class="btn btn-primary btn-sm" type="button" data-action="how-to-edit"><span aria-hidden="true">?</span><span>Как вносить</span></button>' +
          '<button class="btn btn-ghost btn-sm" type="button" data-action="cloud-panel"><span aria-hidden="true">⚙️</span><span>Настройки</span></button>' +
        '</div>' +
        '<span class="cb-progress" aria-hidden="true"><i></i></span></div>';
    }
    if (cloudIsReadonly()) {
      return '<div class="cloud-bar is-read" data-state="' + state + '">' +
        '<span class="cb-glow" aria-hidden="true"></span>' +
        '<span class="cb-orb" aria-hidden="true"><b>🔒</b></span>' +
        '<div class="cb-text">' +
          '<span class="cb-kicker">общие результаты · только чтение</span>' +
          '<b>Результаты вносит админ</b>' +
          '<span>' + esc(CLOUD.status.updatedAt ? 'обновлено ' + clockShort(CLOUD.status.updatedAt) : 'пока пусто') + '</span>' +
        '</div>' +
        savedBadge +
        '<div class="cb-actions">' +
          '<button class="btn btn-primary btn-sm" type="button" data-action="admin-login"><span aria-hidden="true">🔑</span><span>Я админ — войти</span></button>' +
          '<button class="btn btn-ghost btn-sm" type="button" data-action="how-to-edit"><span aria-hidden="true">?</span><span>Как это работает</span></button>' +
        '</div>' +
        '<span class="cb-progress" aria-hidden="true"><i></i></span></div>';
    }
    /* локальный режим: не мозолим глаза зрителям, показываем только владельцу */
    if (!cloudHasToken()) return '';
    return '<div class="cloud-bar is-local" data-state="' + state + '">' +
      '<span class="cb-glow" aria-hidden="true"></span>' +
      '<span class="cb-orb" aria-hidden="true"><b>💾</b></span>' +
      '<div class="cb-text">' +
        '<span class="cb-kicker">локальный режим</span>' +
        '<b>Пока только у тебя</b>' +
        '<span>Правки не видны другим. Включи общий режим — и их увидят все.</span>' +
      '</div>' +
      '<div class="cb-actions">' +
        '<button class="btn btn-primary btn-sm" type="button" data-action="cloud-go-live"><span aria-hidden="true">🌍</span><span>Включить общий режим</span></button>' +
      '</div></div>';
  }

  function renderCloudUI() {
    var chip = $('#cloud-chip');
    if (chip) chip.innerHTML = cloudBadgeHtml();
    document.body.classList.toggle('is-admin', cloudIsAdmin());
    var foot = $('#cloud-foot');
    if (foot) foot.textContent = cloudStatusText();
    var badge = $('#cloud-mode');
    if (badge) {
      badge.className = 'admin-status ' + (cloudIsAdmin() ? 'is-live' : (cloudIsReadonly() ? 'is-read' : 'is-local'));
      badge.textContent = cloudStatusText();
    }
    document.body.classList.toggle('is-readonly', cloudIsReadonly());
    var ro = cloudIsReadonly();
    $$('#bracket-actions [data-action], #board-actions [data-action], [data-action="roster-edit"], [data-action="matrix-edit"], [data-action="roster-reset-all"], [data-action="roster-reset-disc"]').forEach(function (b) {
      if (ro) {
        b.setAttribute('disabled', 'disabled');
        b.setAttribute('title', 'Менять результаты может только админ');
      } else if (b.getAttribute('title') === 'Менять результаты может только админ') {
        b.removeAttribute('disabled');
        b.removeAttribute('title');
      }
    });
  }

  function cloudLogHtml() {
    if (!CLOUD.log.length) return '<div class="admin-empty">Пока пусто — тут появятся записи о том, кто что менял.</div>';
    return '<div class="admin-log">' + CLOUD.log.slice(0, 12).map(function (x) {
      return '<div class="admin-log-row"><span class="al-who">' + esc(x.by || '—') + '</span>' +
        '<span class="al-what">' + esc(x.text || '') + '</span>' +
        '<span class="al-at">' + esc(clockShort(x.at)) + '</span></div>';
    }).join('') + '</div>';
  }

  /* Выносим инструкцию по токену в отдельную функцию: нужна и в админке,
     и в простом экране входа. */
  function adminHelpHtml() {
    return '<details class="admin-help"><summary>Где взять токен — 6 шагов</summary><ol>' +
        '<li>Открой <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com/settings/personal-access-tokens/new</a> (нужен вход в GitHub).</li>' +
        '<li><b>Token name</b> — любой, например <b>gamepiada-admin</b>.</li>' +
        '<li><b>Expiration</b> — поставь «Custom» и дату подольше (например, через год).</li>' +
        '<li><b>Repository access</b> → <b>Only select repositories</b> → выбери <b>' + esc(CLOUD.cfg.repo) + '</b>.</li>' +
        '<li><b>Permissions</b> → <b>Repository permissions</b> → <b>Contents</b> → <b>Read and write</b>. Больше ничего не нужно.</li>' +
        '<li>Нажми <b>Generate token</b> и скопируй строку (начинается с <b>github_pat_</b>). Вставь её в поле выше и нажми Enter.</li>' +
      '</ol><p>Токен = ключ админа. Чтобы назначить друга: добавь его в <b>Settings → Collaborators</b> репозитория (доступ Write), пусть он создаст свой такой же токен и вставит в админке на своём устройстве.</p></details>';
  }

  /* Простой вход: одно поле, одна кнопка. Без таблиц и настроек. */
  function adminLoginModal() {
    var html = '<div class="md-hero" style="--a:#f3cd7c;--b:#7fe9ff">' +
        '<span class="md-icon" aria-hidden="true">🔑</span>' +
        '<div><span class="md-kicker">вход для админа</span>' +
        '<h3 class="md-title">Только ты меняешь результаты</h3>' +
        '<div class="md-sub">Вставь свой GitHub-токен один раз — этот браузер запомнит. Дальше сайт будет пускать тебя в режим правки, а остальные увидят только чтение.</div></div></div>' +
      '<label class="admin-field"><span>Токен администратора</span>' +
        '<input type="password" id="cloud-token" placeholder="github_pat_…" autocomplete="off" spellcheck="false"></label>' +
      '<div class="admin-actions">' +
        '<button class="btn btn-primary" type="button" data-action="cloud-connect">Подключиться</button>' +
      '</div>' +
      '<div class="admin-hint">Токен живёт только в этом браузере и уходит исключительно на <b>api.github.com</b>. В код сайта он не попадает — посетители его не видят.</div>' +
      (CLOUD.status.error ? '<div class="admin-error">' + esc(CLOUD.status.error) + '</div>' : '') +
      adminHelpHtml() +
      '<div class="md-actions"><button class="btn btn-ghost" type="button" data-action="close-modal">Отмена</button></div>';
    openModal(html);
    window.setTimeout(function () {
      var f = $('#cloud-token');
      if (f) f.focus();
    }, 60);
  }

  /* Шпаргалка: что и куда нажимать. */
  function howToEditModal() {
    var steps = [
      { n: '1', icon: '🎮', title: 'Выбери дисциплину', text: 'Список «Круговая · Dota 2 · 1×1» находится вверху блока «02 Турниры». Выбери нужную — сетка и таблица переключатся.' },
      { n: '2', icon: '⚔️', title: 'Круговая: нажми на победителя', text: 'В карточке матча два ника. Клик по нику = он выиграл этот матч (счёт 1:0, ник подсветится, чип станет оранжевым). Ошибся — нажми ещё раз, результат снимется.' },
      { n: '3', icon: '🏆', title: 'Заезды: собери подиум', text: 'У заездов (Double Dealers, Geometry Dash, Minecraft Duo, Fall Guys, Trackmania) вместо сетки подиум. Жми на бойцов в списке «Участники арены» — они встают на места по порядку: 1-е, 2-е, 3-е. Повторный клик снимает.' },
      { n: '4', icon: '👥', title: 'Состав: чипы над сеткой', text: 'Панель «Кто играет в этой сетке» — клик по бойцу добавляет или убирает его из этой дисциплины. Крутится сразу везде: в сетке, таблице и матрице.' },
      { n: '5', icon: '💾', title: 'Сохранять не надо', text: 'Всё уходит в облако само примерно через секунду — в зелёной полосе сверху видно «сохранено 19:42». Другие увидят изменения в течение 25 секунд.' }
    ];
    var html = '<div class="md-hero" style="--a:#7fe9ff;--b:#b18bff">' +
        '<span class="md-icon" aria-hidden="true">?</span>' +
        '<div><span class="md-kicker">шпаргалка</span>' +
        '<h3 class="md-title">Как вносить результаты</h3>' +
        '<div class="md-sub">Пять шагов, ничего сложного. Все изменения сохраняются автоматически.</div></div></div>' +
      '<div class="howto">' + steps.map(function (s) {
        return '<div class="howto-step"><span class="hs-num">' + s.n + '</span>' +
          '<div class="hs-body"><b>' + s.icon + ' ' + esc(s.title) + '</b><span>' + esc(s.text) + '</span></div></div>';
      }).join('') + '</div>' +
      '<div class="md-actions">' +
        (cloudIsAdmin()
          ? '<button class="btn btn-primary" type="button" data-action="close-modal">Понятно, поехали</button>'
          : '<button class="btn btn-primary" type="button" data-action="admin-login">Войти как админ</button>' +
            '<button class="btn btn-ghost" type="button" data-action="close-modal">Закрыть</button>') +
      '</div>';
    openModal(html);
  }

  function adminModal() {
    var admins = CLOUD.admins.length ? CLOUD.admins.map(function (a) {
      return '<span class="admin-tag' + (a === CLOUD.cfg.login ? ' is-me' : '') + '">' + esc(a) +
        '<button type="button" data-action="admin-remove" data-login="' + esc(a) + '" aria-label="Снять админа ' + esc(a) + '">×</button></span>';
    }).join('') : '<span class="admin-empty">Список пуст — добавь свой GitHub-логин, когда включишь общий режим.</span>';
    var tokenLine = cloudHasToken()
      ? '<div class="admin-token"><b>Токен подключён</b><span>' + esc(CLOUD.cfg.login || 'не проверен') + ' · ' + esc(CLOUD.cfg.owner + '/' + CLOUD.cfg.repo) +
          (cloudExpiresText() ? '<br><i class="admin-exp' + (cloudExpiresSoon() ? ' is-soon' : '') + '">' + esc(cloudExpiresText()) + '</i>' : '') +
        '</span>' +
        '<button class="btn btn-ghost btn-sm" type="button" data-action="cloud-logout">Выйти</button></div>' +
        (cloudExpiresSoon() ? '<div class="admin-warn">Токен скоро закончится' + (cloudExpiresText() ? ' (' + esc(cloudExpiresText()) + ')' : '') +
          '. Создай новый с датой подольше и вставь заново — иначе сайт перестанет принимать твои правки.</div>' : '')
      : '<label class="admin-field"><span>Токен администратора (GitHub)</span>' +
        '<input type="password" id="cloud-token" placeholder="github_pat_…" autocomplete="off" spellcheck="false"></label>' +
        '<div class="admin-hint">Токен хранится только в этом браузере и уходит исключительно на <b>api.github.com</b>. В код сайта он не попадает — посетители его не видят.</div>';
    tokenLine += adminHelpHtml();

    var html = '<div class="md-hero" style="--a:#7fe9ff;--b:#b18bff">' +
        '<span class="md-icon" aria-hidden="true">🛡️</span>' +
        '<div><span class="md-kicker">админка турнира</span>' +
        '<h3 class="md-title">Кто вносит результаты</h3>' +
        '<div class="md-sub">Общий режим: изменения сохраняются в файл на сайте и сразу видны всем. Остальные смотрят только чтение.</div></div></div>' +
      '<div class="admin-status ' + (cloudIsAdmin() ? 'is-live' : (cloudIsReadonly() ? 'is-read' : 'is-local')) + '" id="cloud-mode">' + esc(cloudStatusText()) + '</div>' +
      '<div class="admin-block"><h4>Что делать</h4>' +
        '<div class="admin-quick">' +
          '<button class="btn btn-primary btn-sm" type="button" data-action="how-to-edit"><span aria-hidden="true">?</span><span>Как вносить результаты</span></button>' +
          '<button class="btn btn-ghost btn-sm" type="button" data-action="cloud-sync"><span aria-hidden="true">⟳</span><span>Синхронизировать</span></button>' +
          '<button class="btn btn-ghost btn-sm" type="button" data-action="cloud-backup"><span aria-hidden="true">💾</span><span>Скачать бэкап</span></button>' +
        '</div>' +
        '<div class="admin-hint">Менять результаты можно прямо в блоке «02 Турниры»: клик по бойцу в матче — он победил. Здесь — только доступ, журнал и бэкапы.</div>' +
      '</div>' +
      '<div class="admin-block"><h4>Вход</h4>' + tokenLine +
        '<div class="admin-actions">' +
          (cloudHasToken() ? '<button class="btn btn-ghost btn-sm" type="button" data-action="cloud-verify">Проверить токен</button>' : '') +
          (cloudHasToken() && !cloudIsAdmin() ? '<button class="btn btn-primary btn-sm" type="button" data-action="cloud-go-live">Включить общий режим</button>' : '') +
          '<button class="btn btn-ghost btn-sm" type="button" data-action="cloud-pull">Прочитать с сервера</button>' +
          '<label class="btn btn-ghost btn-sm admin-upload">Загрузить бэкап<input type="file" id="cloud-import" accept="application/json,.json" hidden></label>' +
        '</div>' +
        (cloudHasToken() && !cloudIsAdmin() ? '<div class="admin-warn">Изменения пока сохраняются только в этом браузере. Нажми «Включить общий режим», чтобы их увидели все.</div>' : '') +
        (CLOUD.status.error ? '<div class="admin-error">' + esc(CLOUD.status.error) + '</div>' : '') +
      '</div>' +
      '<div class="admin-block"><h4>Админы <span>' + CLOUD.admins.length + '</span></h4>' +
        '<div class="admin-tags">' + admins + '</div>' +
        (cloudIsAdmin() ? '<div class="admin-add"><input type="text" id="admin-login" placeholder="github-логин друга" autocomplete="off" spellcheck="false">' +
          '<button class="btn btn-primary btn-sm" type="button" data-action="admin-add">Назначить</button></div>' +
          '<div class="admin-hint">Админ = у него есть свой GitHub-токен с доступом к репозиторию (и он добавлен коллаборатором). Список здесь — для журнала и порядка.</div>' : '') +
      '</div>' +
      '<div class="admin-block"><h4>Журнал</h4>' + cloudLogHtml() + '</div>' +
      '<div class="md-actions"><button class="btn btn-primary" type="button" data-action="close-modal">Готово</button></div>';
    openModal(html);
  }

  function refreshAdminModal() {
    var modal = $('#modal');
    if (!modal || modal.hidden) return;
    if (!$('#cloud-mode')) return;
    adminModal();
  }

  function cloudBackup() {
    try {
      var blob = new Blob([JSON.stringify(cloudExport(), null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'gamepiada-state-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.json';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      toast('Бэкап результатов скачан', '💾');
    } catch (e) { toast('Браузер не дал сохранить файл', '⚠️'); }
  }

  function cloudImportFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var obj = JSON.parse(String(reader.result || '{}'));
        if (!obj || typeof obj !== 'object') throw new Error('не JSON');
        obj.rev = (CLOUD.status.rev || 0) + 1;
        obj.mode = 'live';
        obj.updatedAt = new Date().toISOString();
        obj.updatedBy = CLOUD.cfg.login || 'admin';
        cloudLog('загрузил бэкап');
        cloudApply(JSON.parse(JSON.stringify(obj)));
        if (cloudHasToken()) cloudPush('загрузил бэкап', false);
        toast('Бэкап применён', '📥');
      } catch (e) { toast('Файл не подошёл: ' + esc(e.message), '⚠️'); }
    };
    reader.readAsText(file);
  }

  /* Чужие клики: результаты вносит админ, зритель только смотрит. */
  function guardReadonly(what) {
    if (!cloudIsReadonly()) return false;
    toast('Результаты вносит админ. ' + (what || 'Смотреть можно всем, менять — нет.'), '🔒');
    return true;
  }

  function cloudStatusText() {
    if (CLOUD.status.syncing) return 'сохраняю…';
    if (CLOUD.status.error && /истёк|отозван/.test(CLOUD.status.error)) return 'токен истёк — нужен новый';
    if (cloudIsAdmin()) {
      return 'общие результаты · обновлено ' + clockShort(CLOUD.status.updatedAt) + (CLOUD.status.dirty ? ' · есть несохранённое' : '');
    }
    if (cloudIsReadonly()) return 'общие результаты · только чтение';
    if (cloudHasToken()) return 'токен есть, общий режим не включён';
    return 'локальный режим · правки видны только в этом браузере';
  }
  function clockShort(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    try {
      return new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d);
    } catch (e) { return d.toISOString().slice(11, 16); }
  }

  function confirmedDuos() {
    return allPairStats().filter(function (x) { return x.mutual; }).length;
  }
  function allPairStats() {
    var out = [];
    for (var i = 0; i < state.players.length; i++) {
      for (var j = i + 1; j < state.players.length; j++) {
        var info = pairInfo(state.players[i], state.players[j]);
        if (info.mutual || info.shared.length >= 6) out.push(info);
      }
    }
    out.sort(function (a, b) { return b.score - a.score; });
    return out;
  }
  function pairInfo(a, b) {
    var shared = (a.disciplines || []).filter(function (id) { return (b.disciplines || []).indexOf(id) >= 0; });
    var channels = [
      { key: 'minecraft', label: 'Minecraft' },
      { key: 'cs2', label: 'CS 2' },
      { key: 'dota2', label: 'Dota 2' }
    ];
    var aToB = 0, bToA = 0, links = 0;
    channels.forEach(function (c) {
      var at = (a.partners && a.partners[c.key]) || '';
      var bt = (b.partners && b.partners[c.key]) || '';
      var am = mentions(a, bt);  // B зовёт A
      var bm = mentions(b, at);  // A зовёт B
      if (am) { aToB++; links++; }
      if (bm) { bToA++; links++; }
    });
    var mutual = aToB > 0 && bToA > 0;
    var score = clamp(Math.round(shared.length / 17 * 100 * 0.66 + (mutual ? 14 : 0) + links * 6), 3, 99);
    return { a: a, b: b, shared: shared, mutual: mutual, aToB: aToB, bToA: bToA, links: links, score: score };
  }
  function mentions(target, text) {
    if (!text) return false;
    var t = norm(text);
    if (!t || t.length < 1) return false;
    if (norm(target.nick) && t.indexOf(norm(target.nick)) >= 0) return true;
    var aliases = target.aliases || [];
    for (var i = 0; i < aliases.length; i++) {
      var a = norm(aliases[i]);
      if (a && (t === a || t.indexOf(a) >= 0)) return true;
    }
    return false;
  }
  function discKeys(d) {
    return [d.id, d.name, d.name + ' ' + d.mode, d.form, (d.aliases || []).join(' '), (RU_TERMS[d.id] || '')].join(' ');
  }
  function matchesDisc(d, q) {
    if (!q) return true;
    return norm(discKeys(d)).indexOf(q) >= 0;
  }

  var RU_TERMS = {
    dota11: 'дота дотка dota',
    dota22: 'дота дотка dota',
    cs11: 'кс кс2 контра counter cs',
    cs22: 'кс кс2 контра counter cs',
    mcduo: 'майнкрафт майн спидраун minecraft',
    cr: 'клаш рояль clash royale',
    dd: 'дабл дилерс карты double dealers',
    rl: 'ракета лига rocket league',
    geo: 'геогессер гео geoguessr',
    fg: 'фол гайс fall guys',
    gd: 'геометрия дэш geometry dash',
    fn: 'фортнайт fortnite',
    tm: 'трекмания гонки trackmania',
    mk: 'мортал комбат мк mortal kombat',
    mcpvp: 'майнкрафт пвп minecraft pvp',
    chess: 'шахматы chess',
    bs: 'бравл старс brawl stars'
  };

  /* ─────────────────────────── sound & fx ─────────────────────────── */
  var actx = null;
  function sound(freq, dur, type, gain) {
    if (!state.sound) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = actx || new AC();
      if (actx.state === 'suspended') actx.resume();
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq || 540;
      var t = actx.currentTime;
      g.gain.setValueAtTime(gain || 0.035, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.06));
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + (dur || 0.06) + 0.02);
    } catch (e) { /* audio optional */ }
  }
  function chime() { sound(660, 0.08, 'triangle', 0.04); setTimeout(function () { sound(990, 0.1, 'triangle', 0.03); }, 70); }

  var confettiCanvas = $('#confetti');
  var confettiCtx = null;
  try { confettiCtx = confettiCanvas ? confettiCanvas.getContext('2d') : null; } catch (e) { confettiCtx = null; }
  function confetti() {
    if (!confettiCtx) return;
    var dpr = window.devicePixelRatio || 1;
    var w = window.innerWidth, h = window.innerHeight;
    confettiCanvas.width = w * dpr; confettiCanvas.height = h * dpr;
    confettiCanvas.style.width = w + 'px'; confettiCanvas.style.height = h + 'px';
    confettiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var colors = ['#f3cd7c', '#ffe9b8', '#b18bff', '#7fe9ff', '#ff86a2', '#fff'];
    var parts = [];
    for (var i = 0; i < 130; i++) {
      parts.push({
        x: w * (0.2 + Math.random() * 0.6), y: h * (0.28 + Math.random() * 0.2),
        vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 11 - 2,
        w: 4 + Math.random() * 7, h: 6 + Math.random() * 9,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)], life: 1
      });
    }
    var start = 0;
    function frame(now) {
      if (!start) start = now;
      var elapsed = Math.max(0, now - start);
      var dt = Math.min(32, elapsed) / 16.7;
      confettiCtx.clearRect(0, 0, w, h);
      var alive = false;
      parts.forEach(function (p) {
        p.vy += 0.32 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        if (p.y < h + 40) alive = true;
        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate(p.rot);
        confettiCtx.globalAlpha = Math.max(0, 1 - elapsed / 4200);
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        confettiCtx.restore();
      });
      if (alive && elapsed < 4200) requestAnimationFrame(frame);
      else confettiCtx.clearRect(0, 0, w, h);
    }
    requestAnimationFrame(frame);
  }

  /* ── эффекты: только там, где они не мешают FPS ─────────────────────────
     Нет звёздного canvas-цикла, нет кастомного курсора и нет тилта карточек
     на каждом pointermove. Остался один лёгкий параллакс сцены: rAF-throttle,
     точный указатель, только когда hero в кадре. */
  (function heroParallax() {
    var fine = false;
    try { fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches; } catch (e) { fine = false; }
    if (!fine) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var hero = $('#home');
    var core = hero ? $('#stage-core', hero) : null;
    if (!hero || !core) return;
    var raf = 0, px = 0, py = 0;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      px = (e.clientX - r.left) / r.width - 0.5;
      py = (e.clientY - r.top) / r.height - 0.5;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        core.style.setProperty('--ry', (px * -7).toFixed(2) + 'deg');
        core.style.setProperty('--rx', (py * 5).toFixed(2) + 'deg');
      });
    }, { passive: true });
    hero.addEventListener('pointerleave', function () {
      core.style.setProperty('--ry', '0deg');
      core.style.setProperty('--rx', '0deg');
    }, { passive: true });
  })();

  /* В свёрнутой вкладке всё анимируемое встаёт на паузу. */
  document.addEventListener('visibilitychange', function () {
    document.body.classList.toggle('is-idle', document.hidden);
  });

  /* ─────────────────────────── toasts ─────────────────────────── */
  function toast(message, icon) {
    var host = $('#toasts');
    if (!host) return;
    var el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = '<span class="t-icon">' + (icon || '✦') + '</span><div>' + message + '</div>';
    host.appendChild(el);
    setTimeout(function () {
      el.classList.add('is-out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 320);
    }, 3400);
  }

  /* ─────────────────────────── hero / ticker ─────────────────────────── */
  function renderTicker() {
    var host = $('#ticker-track');
    if (!host) return;
    var items = DISC.map(function (d) {
      return '<span class="ticker-item">' + d.icon + ' <b>' + esc(d.name) + '</b> ' + esc(d.mode) +
        ' <i>' + countFor(d.id) + '</i> · слот ' + d.order + ' · ~' + d.time + '</span>';
    }).join('');
    host.innerHTML = items + items;
  }

  function renderHeroNow() {
    var d = queue()[0];
    if (!d) return;
    var list = participants(d);
    var avatars = $('#now-avatars');
    if (avatars) {
      avatars.innerHTML = list.slice(0, 4).map(function (p) {
        return '<span class="avatar" style="--c1:' + p.c1 + ';--c2:' + p.c2 + '" title="' + esc(p.nick) + '"><span>' + esc(p.initials) + '</span></span>';
      }).join('') + (list.length > 4 ? '<span class="avatar-more">+' + (list.length - 4) + '</span>' : '');
    }
    var disc = $('#now-discipline');
    if (disc) disc.textContent = d.name + ' · ' + d.mode;
    var time = $('#now-time');
    if (time) time.textContent = 'стартует первым · ~' + d.time + ' MSK · даты уточняются';
    var count = $('#now-count');
    if (count) count.textContent = String(list.length);
  }

  function syncLivePill() {
    var pill = $('#live-pill'), text = $('#live-text');
    if (!pill || !text) return;
    pill.classList.remove('is-ended');
    pill.classList.add('is-soon');
    text.textContent = 'Набор';
    pill.setAttribute('title', EVENT.dateLabel || 'Даты уточняются');
  }

  /* ─────────────────────────── disciplines ─────────────────────────── */
  function filteredDisc() {
    var q = norm(state.discQuery);
    return queue().filter(function (d) {
      if (state.filter === 'board' && !isBoard(d)) return false;
      if (state.filter === 'bracket' && isBoard(d)) return false;
      if (state.filter === 'solo' && d.type !== 'solo') return false;
      if (state.filter === 'duo' && d.type !== 'duo') return false;
      if (state.filter === 'bo3' && seriesOf(d) !== 'BO3') return false;
      if (q && !matchesDisc(d, q)) return false;
      return true;
    });
  }

  function renderDisc() {
    var grid = $('#disc-grid');
    if (!grid) return;
    var list = filteredDisc();
    grid.innerHTML = list.map(function (d, i) {
      var badge = slotBadge(d);
      var list = participants(d);
      var avatars = list.slice(0, 3).map(function (p) {
        return '<span class="avatar" style="--c1:' + p.c1 + ';--c2:' + p.c2 + '" title="' + esc(p.nick) + '"><span>' + esc(p.initials) + '</span></span>';
      }).join('');
      return '<article class="disc-card" data-disc-id="' + d.id + '" tabindex="0" role="button" aria-label="' + esc(d.name + ' ' + d.mode + ', ' + d.format) + '" style="--a:' + d.accent + ';--b:' + d.accent2 + ';--i:' + i + '">' +
        (d.art ? '<img class="disc-art" src="' + d.art + '" alt="" width="640" height="360" loading="lazy" decoding="async">' : '') +
        '<div class="disc-top"><span class="disc-icon" aria-hidden="true">' + d.icon + '</span>' +
        '<span class="disc-status ' + badge.cls + '">' + badge.text + '</span></div>' +
        '<div class="disc-name">' + esc(d.name) + '<span>' + esc(d.mode) + '</span></div>' +
        '<div class="disc-meta"><span class="tag">~' + d.time + ' MSK</span><span class="tag">' + esc(isBoard(d) ? 'заезд' : 'круговая') + '</span><span class="tag is-gold">' + esc(isBoard(d) ? pointsLabel(d) : seriesOf(d)) + '</span></div>' +
        '<div class="disc-foot"><div class="disc-avatars">' + avatars + '</div><span class="disc-count">' + list.length + ' / ' + state.players.length + '</span>' +
        '<span class="disc-cta">Открыть <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></div>' +
        '</article>';
    }).join('');
    var empty = $('#disc-empty');
    if (empty) empty.hidden = list.length > 0;
    var count = $('#disc-count');
    if (count) {
      var foot = count.closest('span');
      if (foot) foot.innerHTML = '<b id="disc-count">' + list.length + '</b> из ' + DISC.length + ' · клик по карточке открывает детали';
    }
    var boardCount = DISC.filter(isBoard).length;
    var duoCount = DISC.filter(function (d) { return d.type === 'duo'; }).length;
    var bo3Count = DISC.filter(function (d) { return seriesOf(d) === 'BO3'; }).length;
    var soloCount = DISC.length - duoCount;
    var map = { all: DISC.length, board: boardCount, bracket: DISC.length - boardCount, solo: soloCount, duo: duoCount, bo3: bo3Count };
    $$('#disc-filters [data-filter-count]').forEach(function (el) {
      el.textContent = String(map[el.getAttribute('data-filter-count')] || 0);
    });
  }

  /* ─────────────────────────── bracket ─────────────────────────── */

  /* ─────────────────────────── круговая система ───────────────────────────
     Каждый участник играет с каждым ровно один раз. Пары раскладываются
     методом круга: первый остаётся на месте, остальные проворачиваются,
     поэтому получается ровно N−1 туров без повторов и лишних матчей. */

  function tourLabel(index) {
    return 'Раунд ' + (index + 1);
  }

  /* Ключ матча — пара участников, а не номер ячейки в раскладке.
     Так результат остаётся за своими игроками, даже если состав сетки
     поменяли: добавили или сняли бойца и порядок раундов сдвинулся. */
  function pairKey(a, b) {
    if (!a || !b) return '';
    return String(a) < String(b) ? a + '~' + b : b + '~' + a;
  }
  /* Победа матча: новый формат (пара) или старый (номер раунда-матча). */
  function winnerOf(st, m, t, i) {
    var pick = st.winners[pairKey(m.a, m.b)];
    if (pick === undefined) pick = st.winners[t + '-' + i];   /* ключи до v4.11 */
    return (pick === m.a || pick === m.b) ? pick : null;
  }

  function buildTours(d) {
    var st = bracketState(d.id);
    var pool = entrants(d).map(function (e) { return e.key; });
    if (pool.length < 2) return [];
    var slots = seededShuffle(pool, st.seed);
    if (slots.length % 2) slots.push(null);
    var n = slots.length, tours = [];
    for (var t = 0; t < n - 1; t++) {
      var matches = [];
      for (var i = 0; i < n / 2; i++) {
        var a = slots[i], b = slots[n - 1 - i];
        if (a && b) matches.push({ a: a, b: b, winner: null });
      }
      tours.push(matches);
      slots = [slots[0], slots[n - 1]].concat(slots.slice(1, n - 1));
    }
    tours.forEach(function (matches, t) {
      matches.forEach(function (m, i) {
        m.winner = winnerOf(st, m, t, i);
      });
    });
    return tours;
  }

  /* Сид участника — тот же порядок, что и раскладка раундов. */
  function leagueSeeds(d) {
    var st = bracketState(d.id);
    var seeds = {};
    seededShuffle(entrants(d).map(function (e) { return e.key; }), st.seed).forEach(function (key, i) {
      seeds[key] = i + 1;
    });
    return seeds;
  }

  function leagueTotals(tours) {
    var total = 0, decided = 0;
    tours.forEach(function (matches) {
      matches.forEach(function (m) {
        if (!m.a || !m.b) return;
        total++;
        if (m.winner) decided++;
      });
    });
    return { total: total, decided: decided, complete: total > 0 && decided === total };
  }

  /* Тай-брейк при равенстве побед — мини-таблица личных встреч внутри группы. */
  function miniTable(tours, group) {
    var inside = {}, score = {};
    group.forEach(function (row) { inside[row.key] = true; score[row.key] = 0; });
    tours.forEach(function (matches) {
      matches.forEach(function (m) {
        if (!m.winner || !inside[m.a] || !inside[m.b]) return;
        score[m.winner] += 1;
      });
    });
    return score;
  }

  function leagueStandings(d, tours) {
    var byKey = {}, rows = [];
    entrants(d).forEach(function (e) {
      var row = { key: e.key, entrant: e, played: 0, wins: 0, losses: 0, points: 0, tiebreak: 0 };
      byKey[e.key] = row;
      rows.push(row);
    });
    tours.forEach(function (matches) {
      matches.forEach(function (m) {
        if (!m.winner) return;
        var win = byKey[m.winner];
        var lose = byKey[m.winner === m.a ? m.b : m.a];
        if (!win || !lose) return;
        win.wins++; win.played++;
        lose.losses++; lose.played++;
      });
    });
    rows.forEach(function (row) { row.points = row.wins; });
    rows.sort(function (x, y) { return y.points - x.points; });
    var mark = 0;
    while (mark < rows.length) {
      var stop = mark;
      while (stop < rows.length && rows[stop].points === rows[mark].points) stop++;
      if (stop - mark > 1) {
        var group = rows.slice(mark, stop);
        var score = miniTable(tours, group);
        group.sort(function (x, y) {
          if (score[y.key] !== score[x.key]) return score[y.key] - score[x.key];
          var sx = x.entrant.strength || 0, sy = y.entrant.strength || 0;
          if (sy !== sx) return sy - sx;
          return String(x.entrant.label).localeCompare(String(y.entrant.label), 'ru');
        });
        group.forEach(function (row) { row.tiebreak = score[row.key] || 0; });
        rows = rows.slice(0, mark).concat(group, rows.slice(stop));
      }
      mark = stop;
    }
    rows.forEach(function (row, i) { row.place = i + 1; });
    return rows;
  }


  function compBriefHtml(d) {
    var c = compOf(d);
    var pts = (c.seats || 1) > 1 ? '1,5 / 1 / 0,5' : '3 / 2 / 1';
    var system = isBoard(d) ? '' : '<li><b>Круговая система:</b> каждый играет с каждым один раз; победа = 1 очко в таблице.</li>';
    var rows = system + (c.rules || []).map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('');
    var tbd = (c.tbd || []).map(function (t) { return '<span class="tbd-chip">' + esc(t) + '</span>'; }).join('');
    return '<div class="cp-grid">' +
        '<div class="cp-cell"><small>формат</small><b>' + (isBoard(d) ? 'заезд · общий зачёт' : (c.seats > 1 ? 'круговая 2×2' : 'круговая 1×1')) + '</b></div>' +
        '<div class="cp-cell"><small>' + (isBoard(d) ? 'метрика' : 'серия') + '</small><b>' + esc(isBoard(d) ? (c.metric || '—') : (c.seriesNote || seriesOf(d))) + '</b></div>' +
        '<div class="cp-cell"><small>победа</small><b>' + esc(c.win || '—') + '</b></div>' +
        '<div class="cp-cell"><small>очки за места</small><b>' + pts + '</b></div>' +
      '</div>' +
      '<div class="cp-lists">' +
        '<div class="cp-rules"><span class="cp-cap">регламент · ' + esc(d.name) + ' ' + esc(d.mode) + '</span><ul>' + rows + '</ul></div>' +
        (tbd ? '<div class="cp-tbd"><span class="cp-cap">уточняется до старта</span><div>' + tbd + '</div></div>' : '') +
      '</div>';
  }

  function renderCompHead(d) {
    var c = compOf(d);
    var list = entrants(d);
    var title = $('#bracket-title');
    if (title) title.textContent = (isBoard(d) ? 'Заезд · ' : 'Круговая · ') + d.name + ' · ' + d.mode;
    var meta = $('#bracket-meta');
    if (meta) {
      meta.innerHTML = '<span class="tag"><b>слот ' + d.order + '</b> · ~' + d.time + ' MSK</span>' +
        '<span class="tag">' + esc(isBoard(d) ? 'общий зачёт' : 'каждый с каждым') + '</span>' +
        '<span class="tag is-gold">' + esc(isBoard(d) ? 'места 1–3' : seriesOf(d)) + '</span>' +
        '<span class="tag">' + list.length + ' ' + plural(list.length, [c.seats > 1 ? 'команда' : 'боец', c.seats > 1 ? 'команды' : 'бойца', c.seats > 1 ? 'команд' : 'бойцов']) + '</span>' +
        (rosterEditCount(d.id) ? '<span class="tag is-edit" title="состав правился вручную в этом браузере">состав изменён</span>' : '');
    }
    var rosterCount = $('#roster-comp-count');
    if (rosterCount) rosterCount.textContent = String(list.length);
    var icon = $('#comp-icon');
    if (icon) icon.textContent = d.icon;
    var shell = $('#comp-shell');
    if (shell) {
      shell.style.setProperty('--comp-a', d.accent);
      shell.style.setProperty('--comp-b', d.accent2);
    }
    var brief = $('#comp-brief');
    if (brief) brief.innerHTML = compBriefHtml(d);
  }

  function rrRow(d, m, t, i, key, seed) {
    var e = entrantByKey(d, key) || { key: key, label: key, players: [] };
    var first = e.players[0] || {};
    var win = m.winner === key;
    var played = !!m.winner;
    var score = win ? '1' : (played ? '0' : '–');
    return '<button class="rr-row' + (win ? ' is-winner' : '') + (played && !win ? ' is-loser' : '') + (e.team ? ' is-team' : '') + '"' +
      ' type="button" data-entrant="' + esc(key) + '" data-player="' + esc(first.id || '') + '" data-key="' + esc(pairKey(m.a, m.b)) + '"' +
      ' aria-pressed="' + (win ? 'true' : 'false') + '" title="' + esc(e.label) + ' — победа в этом матче">' +
      '<span class="rr-name"><span class="rr-seednum" aria-hidden="true">' + seed + '.</span> ' + esc(e.label) + (e.team ? '<small>2×2</small>' : '') + '</span>' +
      '<span class="rr-score" aria-hidden="true">' + score + '</span>' +
      '</button>';
  }

  function rrMatch(d, m, t, i, seeds, number) {
    return '<div class="rr-item">' +
      '<span class="rr-num" aria-hidden="true">' + number + '</span>' +
      '<div class="rr-match' + (m.winner ? ' is-decided' : '') + '" data-key="' + esc(pairKey(m.a, m.b)) + '">' +
        rrRow(d, m, t, i, m.a, seeds[m.a] || 0) +
        rrRow(d, m, t, i, m.b, seeds[m.b] || 0) +
      '</div></div>';
  }

  function renderLeague(d) {
    d = d || discById(state.bracketId) || queue()[0];
    if (!d) return;
    var host = $('#bracket-board');
    if (!host) return;
    var tours = buildTours(d);
    var rows = leagueStandings(d, tours);
    var totals = leagueTotals(tours);
    var seeds = leagueSeeds(d);

    if (!tours.length) {
      host.innerHTML = '<div class="league-empty">Нужно хотя бы два участника — на эту дисциплину пока мало заявок.</div>';
    } else {
      var number = 0;
      host.innerHTML = tours.map(function (matches, t) {
        var done = matches.filter(function (m) { return !!m.winner; }).length;
        return '<section class="rr-round' + (done === matches.length ? ' is-done' : '') + '" data-tour="' + t + '">' +
          '<h3 class="rr-round-head"><b>' + tourLabel(t) + '</b></h3>' +
          '<div class="rr-round-matches">' + matches.map(function (m, i) {
            number += 1;
            return rrMatch(d, m, t, i, seeds, number);
          }).join('') + '</div></section>';
      }).join('');
    }

    var table = $('#league-table');
    if (table) {
      var head = '<thead><tr>' +
        '<th class="rr-rank" scope="col">Место</th>' +
        '<th class="rr-who" scope="col">Участник</th>' +
        '<th class="rr-gl" scope="col" title="матчи: победы-поражения-ничьи">1. Матчи В-П-Н</th>' +
        '<th class="rr-tb" scope="col" title="тай-брейк: победы в мини-таблице личных встреч">2. Тай-брейк</th>' +
        '<th class="rr-w" scope="col">3. Победы</th>' +
        '<th class="rr-d" scope="col">Ничьи</th>' +
        '<th class="rr-p" scope="col">4. Очки</th>' +
        '</tr></thead>';
      var body = rows.length ? rows.map(function (row) {
        var crown = totals.complete && row.place === 1;
        var pid = (row.entrant.players[0] || {}).id || '';
        return '<tr class="rr-tr' + (crown ? ' is-champion' : '') + (totals.complete && row.place <= 3 ? ' is-podium place-' + row.place : '') + '"' +
          (pid ? ' data-player="' + esc(pid) + '" role="button" tabindex="0"' : '') + '>' +
          '<td class="rr-rank">' + (crown ? '👑' : row.place) + '</td>' +
          '<td class="rr-who"><span class="rr-name-full"><span class="rr-seednum" aria-hidden="true">' + (seeds[row.key] || 0) + '.</span> ' + esc(row.entrant.label) + '</span></td>' +
          '<td class="rr-gl">' + row.wins + ' - ' + row.losses + ' - 0</td>' +
          '<td class="rr-tb">' + (row.tiebreak || 0) + '</td>' +
          '<td class="rr-w">' + row.wins + '</td>' +
          '<td class="rr-d">0</td>' +
          '<td class="rr-p">' + row.points + '</td></tr>';
      }).join('') : '<tr><td class="rr-empty" colspan="7">Нет участников.</td></tr>';
      table.innerHTML = head + '<tbody>' + body + '</tbody>';
    }

    var prog = $('#bracket-progress'), fill = $('#bracket-progress-fill');
    if (prog) prog.textContent = totals.decided + ' / ' + Math.max(0, totals.total);
    if (fill) fill.style.setProperty('--w', totals.total ? Math.round(totals.decided / totals.total * 100) + '%' : '0%');

    var note = $('#league-note');
    if (note) {
      note.innerHTML = '<span><b>1. Матчи В-П-Н</b> — победы-поражения-ничьи: ничьих в круговой нет, счёт всегда 1:0.</span>' +
        '<span><b>2. Тай-брейк</b> — победы в мини-таблице личных встреч равных по очкам. <b>Очки</b> = победы, а место в таблице превращается в сезонные 3 / 2 / 1' +
        ((compOf(d).seats || 1) > 1 ? ' (в 2×2 — 1,5 / 1 / 0,5).' : '.') + '</span>' +
        (rosterEditCount(d.id) ? '<span><b>Состав правился вручную</b> — в этой сетке ' + rosterEditCount(d.id) + ' ' + plural(rosterEditCount(d.id), ['правка', 'правки', 'правок']) + ' к ответам формы. Вернуть исходный состав: матрица дисциплин → «Сбросить к форме».</span>' : '');
    }
  }
  function renderChampion(d) {
    var slot = $('#champion-slot');
    if (!slot) return;
    d = d || discById(state.bracketId);
    if (!d || isBoard(d)) { slot.innerHTML = ''; return; }
    var tours = buildTours(d);
    var totals = leagueTotals(tours);
    var rows = leagueStandings(d, tours);
    var leader = rows[0];
    if (!leader) { slot.innerHTML = ''; return; }
    if (!totals.decided) {
      slot.innerHTML = '<div class="champion-empty glass"><span class="ce-icon" aria-hidden="true">🏁</span>' +
        '<div><b>Круговая ещё не сыграна</b><span>Отмечай победителей матчей — таблица пересчитается сразу, или запусти автопрогноз.</span></div></div>';
      return;
    }
    var first = leader.entrant.players[0] || {};
    var complete = totals.complete;
    slot.innerHTML = '<div class="champion-card' + (complete ? ' is-final' : ' is-live') + '">' +
      '<span class="champ-crown" aria-hidden="true">' + (complete ? '👑' : '📈') + '</span>' +
      '<span class="avatar champ-avatar" style="--c1:' + (first.c1 || '#f3cd7c') + ';--c2:' + (first.c2 || '#e8ac4a') + '"><span>' + esc(first.initials || '★') + '</span></span>' +
      '<div class="champ-body"><span class="champ-label">' + (complete ? 'Чемпион' : 'Лидер') + ' · ' + esc(d.name) + ' ' + esc(d.mode) + '</span>' +
      '<div class="champ-name">' + esc(leader.entrant.label) + '</div>' +
      '<div class="champ-sub">' + esc(first.name || '') + ' · ' + leader.wins + '–' + leader.losses +
      ' · ' + (complete ? 'все ' + totals.total + ' матчей сыграны' : 'сыграно ' + totals.decided + ' из ' + totals.total) + '</div></div>' +
      '<div class="champ-actions"><button class="btn btn-primary btn-sm" type="button" data-action="share-champ">Поделиться</button>' +
      '<button class="btn btn-ghost btn-sm" type="button" data-action="open-champ" data-player="' + esc(first.id || '') + '">Профиль</button></div>' +
      '</div>';
  }

  /* ── заезды: 1-е / 2-е / 3-е место, без круговой ───────────────────────── */
  function boardSelectOptions(d, st, place) {
    var busy = {};
    [1, 2, 3].forEach(function (p) { if (p !== place && st[p]) busy[st[p]] = 1; });
    return '<option value="">— не занято —</option>' + entrants(d).map(function (e) {
      return '<option value="' + esc(e.key) + '"' + (st[place] === e.key ? ' selected' : '') + (busy[e.key] ? ' disabled' : '') + '>' +
        esc(e.label) + (e.team ? ' · 2×2' : '') + '</option>';
    }).join('');
  }

  function renderBoard(d) {
    var host = $('#board-podium');
    if (!host) return;
    var st = boardState(d.id);
    var c = compOf(d);
    var places = c.places || ['1-е место', '2-е место', '3-е место'];
    host.innerHTML = [1, 2, 3].map(function (place) {
      var e = st[place] ? entrantByKey(d, st[place]) : null;
      var pts = placePoints(d, place);
      return '<div class="podium-slot place-' + place + (e ? ' is-filled' : '') + '" data-place="' + place + '">' +
        '<span class="podium-beam" aria-hidden="true"></span>' +
        '<div class="podium-top">' +
          '<span class="podium-medal" aria-hidden="true"><b>' + place + '</b></span>' +
          '<span class="podium-label">' + esc(places[place - 1] || (place + '-е место')) + (place === 1 && e ? ' · чемпион' : '') + '</span>' +
          '<span class="podium-points">' + (e ? '+' + fmtPoints(pts) + ' очк.' : '— очк.') + '</span>' +
        '</div>' +
        (e
          ? '<div class="podium-team">' + e.players.map(function (pl) {
              return '<span class="avatar" style="--c1:' + pl.c1 + ';--c2:' + pl.c2 + '"><span>' + esc(pl.initials) + '</span></span>';
            }).join('') + '<b>' + esc(e.label) + '</b></div>' +
            (function () {
              var captions = e.players.map(function (pl) { return pl.name || ''; }).filter(function (n) { return n && n !== e.label; });
              return captions.length ? '<span class="podium-caption">' + esc(captions.join(' · ')) + '</span>' : '';
            })()
          : '<div class="podium-empty"><span>место свободно</span><small>клик по бойцу ниже</small></div>') +
        '<span class="select-wrap"><select class="select podium-select" data-place="' + place + '" aria-label="' + esc(places[place - 1] || ('Место ' + place)) + '">' +
          boardSelectOptions(d, st, place) + '</select></span>' +
        '<div class="podium-step" aria-hidden="true"><span>' + place + '</span></div>' +
        '</div>';
    }).join('');

    var filledNow = [1, 2, 3].filter(function (p) { return !!st[p]; }).length;
    host.classList.toggle('is-complete', filledNow === 3);

    var list = $('#board-list');
    if (list) {
      var sorted = entrants(d).slice().sort(function (a, b) { return (b.strength || 0) - (a.strength || 0); });
      list.innerHTML = sorted.map(function (e, i) {
        var place = [1, 2, 3].filter(function (p) { return st[p] === e.key; })[0] || 0;
        return '<button class="board-row' + (place ? ' is-placed place-' + place : '') + '" type="button" data-board-pick="' + esc(e.key) + '">' +
          '<span class="br-rank">' + (place ? '#' + place : pad(i + 1)) + '</span>' +
          '<span class="br-team">' + e.players.map(function (p) {
            return '<span class="avatar" style="--c1:' + p.c1 + ';--c2:' + p.c2 + '"><span>' + esc(p.initials) + '</span></span>';
          }).join('') + '<b>' + esc(e.label) + '</b></span>' +
          '<span class="br-val">' + (place ? '+' + fmtPoints(placePoints(d, place)) : '—') + '</span>' +
          '</button>';
      }).join('');
    }

    var note = $('#board-note');
    if (note) {
      note.innerHTML = '<b>' + esc(c.metric || 'Результат заезда') + '</b> · ' + esc(c.win || '') +
        '<span>Подиум: ' + filledNow + ' / 3 места. Клик по бойцу ставит его на ближайшее свободное место, повторный — снимает. Место в подиуме сразу превращается в сезонные очки.</span>';
    }
  }

  /* Состав текущей сетки — всегда на виду, без модалок: чипы бойцов. */
  function renderRosterInline(d) {
    var host = $('#roster-inline');
    if (!host || !d) return;
    var list = state.players;
    var onCount = participants(d).length;
    var edits = rosterEditCount(d.id);
    host.innerHTML = '<div class="ri-head">' +
        '<div class="ri-title"><b>Кто играет в этой сетке</b>' +
          '<span>' + onCount + ' из ' + list.length + ' · клик по бойцу — добавить или убрать</span></div>' +
        '<div class="ri-tools">' +
          (edits ? '<span class="ri-edited">правился вручную · ' + edits + ' ' + plural(edits, ['правка', 'правки', 'правок']) +
            ' <button class="ri-link" type="button" data-action="roster-reset-disc">сбросить</button></span>' : '') +
          '<button class="btn btn-ghost btn-sm" type="button" data-action="roster-edit"><span aria-hidden="true">🔎</span><span>Найти бойца</span></button>' +
        '</div>' +
      '</div>' +
      '<div class="ri-chips">' + list.map(function (p) {
        var on = (p.disciplines || []).indexOf(d.id) >= 0;
        return '<button class="ri-chip' + (on ? ' is-on' : '') + '" type="button" aria-pressed="' + (on ? 'true' : 'false') + '"' +
          ' data-roster-player="' + esc(p.id) + '" data-roster-disc="' + esc(d.id) + '"' +
          ' title="' + esc(p.nick + ' — ' + (on ? 'убрать из сетки' : 'добавить в сетку')) + '">' +
          '<span class="avatar" style="--c1:' + p.c1 + ';--c2:' + p.c2 + '"><span>' + esc(p.initials) + '</span></span>' +
          '<span class="ri-nick">' + esc(p.nick) + '</span>' +
          '<i class="ri-mark" aria-hidden="true">' + (on ? '✓' : '+') + '</i>' +
          '</button>';
      }).join('') + '</div>';
  }

  function renderComp() {
    var d = discById(state.bracketId) || queue()[0];
    if (!d) return;
    state.bracketId = d.id;
    var boardMode = isBoard(d);
    document.body.classList.toggle('is-board-mode', boardMode);
    var shell = $('#comp-shell');
    if (shell) {
      if (d.art) shell.style.setProperty('--art', 'url("' + d.art + '")');
      else shell.style.removeProperty('--art');
    }
    var body = $('#bracket-body'), view = $('#board-view');
    if (body) body.hidden = boardMode;
    if (view) view.hidden = !boardMode;
    var ba = $('#bracket-actions'), ra = $('#board-actions');
    if (ba) ba.hidden = boardMode;
    if (ra) ra.hidden = !boardMode;
    var sel = $('#bracket-select');
    if (sel && sel.value !== d.id) sel.value = d.id;
    renderCompHead(d);
    renderRosterInline(d);
    if (boardMode) {
      renderBoard(d);
      var champSlot = $('#champion-slot');
      if (champSlot) champSlot.innerHTML = '';
    } else { renderLeague(d); renderChampion(d); }
  }

  function boardPick(key) {
    if (guardReadonly('Подиум заезда собирает админ.')) return;
    var d = discById(state.bracketId);
    if (!d || !isBoard(d)) return;
    var st = boardState(d.id);
    var wasComplete = [1, 2, 3].every(function (p) { return !!st[p]; });
    var current = [1, 2, 3].filter(function (p) { return st[p] === key; })[0];
    if (current) {
      st[current] = '';
      sound(380, 0.05, 'triangle', 0.03);
    } else {
      var free = [1, 2, 3].filter(function (p) { return !st[p]; })[0];
      if (!free) { toast('Все три места уже заняты — сними кого-то или нажми «Заново»', '🥇'); return; }
      st[free] = key;
      sound(620 + free * 80, 0.05, 'triangle', 0.03);
      haptic(10);
    }
    saveBoards();
    renderBoard(d);
    if (!wasComplete && [1, 2, 3].every(function (p) { return !!st[p]; })) {
      confetti(); chime();
      var winner = entrantByKey(d, st[1]) || {};
      toast('Подиум «' + esc(d.name) + ' ' + esc(d.mode) + '» собран: <b>' + esc(winner.label || '—') + '</b> — первое место', '🥇');
    }
  }

  function boardAuto() {
    if (guardReadonly('Подиум собирает админ.')) return;
    var d = discById(state.bracketId);
    if (!d || !isBoard(d)) return;
    var keys = entrants(d).map(function (e) { return e.key; });
    var st = boardState(d.id);
    for (var i = keys.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = keys[i]; keys[i] = keys[j]; keys[j] = t;
    }
    st[1] = keys[0] || '';
    st[2] = keys[1] || '';
    st[3] = keys[2] || '';
    saveBoards();
    renderBoard(d);
    renderCompHead(d);
    sound(700, 0.05, 'sine', 0.03);
    confetti();
    toast('Подиум собран: <b>' + esc(st[1] ? (entrantByKey(d, st[1]) || {}).label : '—') + '</b> забирает первое место', '🥇');
  }

  function boardReset() {
    if (guardReadonly('Сбрасывает админ.')) return;
    var d = discById(state.bracketId);
    if (!d) return;
    state.boards[d.id] = { 1: '', 2: '', 3: '' };
    saveBoards();
    renderBoard(d);
    sound(360, 0.06, 'sine', 0.03);
    toast('Подиум очищен', '↺');
  }

  var autoTimer = null;
  function cancelAuto() {
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = null;
    state.autoRunning = false;
    var btn = $('[data-action="auto-bracket"]');
    if (btn) { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
  }
  function autoBracket() {
    if (guardReadonly('Автопрогноз запускает админ.')) return;
    var d = discById(state.bracketId);
    if (!d) return;
    if (isBoard(d)) { boardAuto(); return; }
    if (state.autoRunning) { cancelAuto(); toast('Автопрогноз остановлен', '⏹'); return; }
    var first = buildTours(d);
    if (!first.length) { toast('Нужно хотя бы два участника — заявок пока мало', '⏳'); return; }
    state.autoRunning = true;
    var btn = $('[data-action="auto-bracket"]');
    if (btn) { btn.disabled = false; btn.innerHTML = '<span aria-hidden="true">⏹</span><span>Стоп</span>'; }
    var finish = function () {
      state.autoRunning = false;
      autoTimer = null;
      if (btn) { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
      var tours = buildTours(d);
      var totals = leagueTotals(tours);
      var leader = leagueStandings(d, tours)[0];
      if (totals.complete && leader) {
        confetti(); chime();
        toast('Автопрогноз готов: <b>' + esc(leader.entrant.label) + '</b> забирает «' + esc(d.name) + ' ' + esc(d.mode) + '»', '👑');
      }
    };
    var step = function (t) {
      if (state.bracketId !== d.id) { cancelAuto(); return; }
      var tours = buildTours(d);
      if (t >= tours.length) { finish(); return; }
      var st = bracketState(d.id);
      tours[t].forEach(function (m, i) {
        if (!m.a || !m.b || m.winner) return;
        var a = (entrantByKey(d, m.a) || {}).strength || 1;
        var b = (entrantByKey(d, m.b) || {}).strength || 1;
        var pa = 0.5 + (a - b) / 60;
        delete st.winners[t + '-' + i];
        st.winners[pairKey(m.a, m.b)] = Math.random() < pa ? m.a : m.b;
      });
      saveBrackets();
      renderLeague(d); renderChampion(d);
      sound(520 + t * 90, 0.05, 'triangle', 0.025);
      if (t < tours.length - 1) autoTimer = setTimeout(function () { step(t + 1); }, 380);
      else finish();
    };
    step(0);
  }

  function pickBracket(btn) {
    if (guardReadonly('Результаты матчей вносит админ.')) return;
    var key = btn.getAttribute('data-key');
    var entrant = btn.getAttribute('data-entrant') || btn.getAttribute('data-player');
    if (!key || !entrant) return;
    var d = discById(state.bracketId);
    if (!d || isBoard(d)) return;
    var tours = buildTours(d);
    var m = null, ti = null;
    tours.forEach(function (matches, t) {
      matches.forEach(function (x, i) {
        if (!m && pairKey(x.a, x.b) === key) { m = x; ti = t + '-' + i; }
      });
    });
    if (!m || !m.a || !m.b) return;
    var st = bracketState(d.id);
    var pk = pairKey(m.a, m.b);
    var cur = st.winners[pk];
    if (cur === undefined) cur = st.winners[ti];   /* победа из старого формата */
    delete st.winners[ti];                         /* дальше живём только парами */
    if (cur === entrant) delete st.winners[pk];
    else st.winners[pk] = entrant;
    saveBrackets();
    haptic(st.winners[pk] ? 14 : 8);
    sound(st.winners[pk] ? 720 : 380, 0.06, 'triangle', 0.03);
    renderLeague(d);
    renderChampion(d);
    if (leagueTotals(buildTours(d)).complete) slotCelebrate();
  }
  var celebrated = {};
  function slotCelebrate() {
    var d = discById(state.bracketId);
    if (!d || isBoard(d)) return;
    var tours = buildTours(d);
    if (!leagueTotals(tours).complete) return;
    var key = state.bracketId + ':' + tours.map(function (ms) {
      return ms.map(function (m) { return m.winner; }).join(',');
    }).join('|');
    if (celebrated[key]) return;
    celebrated[key] = true;
    var leader = leagueStandings(d, tours)[0];
    if (!leader) return;
    confetti(); chime();
    toast('Чемпион «' + esc(d.name) + '» — <b>' + esc(leader.entrant.label) + '</b>', '🏆');
  }

  function fillBracketSelect() {
    var sel = $('#bracket-select');
    if (!sel) return;
    sel.innerHTML = queue().map(function (d) {
      return '<option value="' + d.id + '">' + d.icon + ' ' + esc(d.name) + ' · ' + esc(d.mode) + ' · слот ' + d.order + '</option>';
    }).join('');
    sel.value = state.bracketId;
  }

  /* ─────────────────────────── roster & matrix ─────────────────────────── */
  function filteredRoster() {
    var q = norm(state.rosterQuery);
    var list = state.players.filter(function (p) {
      if (!q) return true;
      var hay = norm([p.name, p.nick, (p.aliases || []).join(' '), (p.disciplines || []).map(function (id) { var d = discById(id); return d ? d.name + ' ' + d.mode + ' ' + (RU_TERMS[d.id] || '') : ''; }).join(' ')].join(' '));
      return hay.indexOf(q) >= 0;
    });
    if (state.rosterSort === 'disciplines') list.sort(function (a, b) { return (b.disciplines || []).length - (a.disciplines || []).length; });
    else if (state.rosterSort === 'recent') list.sort(function (a, b) { return (parseStamp(b.joined) || 0) - (parseStamp(a.joined) || 0); });
    else list.sort(function (a, b) { return String(a.nick).localeCompare(String(b.nick), 'ru'); });
    return list;
  }

  function renderRoster() {
    var grid = $('#roster-grid');
    if (!grid) return;
    var list = filteredRoster();
    grid.innerHTML = list.map(function (p, i) {
      /* на карточке — самые редкие арены бойца: так карточки не дублируют друг друга */
      var ds = (p.disciplines || []).map(discById).filter(Boolean).sort(function (a, b) {
        return (countFor(a.id) - countFor(b.id)) || a.name.localeCompare(b.name);
      });
      var top = ds.slice(0, 3).map(function (d) { return '<span class="tag" style="border-color:' + d.accent + '44">' + d.icon + ' ' + esc(d.name) + ' ' + esc(d.mode) + '</span>'; }).join('');
      var more = ds.length > 3 ? '<span class="tag is-more">+' + (ds.length - 3) + '</span>' : '';
      var duoCount = ds.filter(function (d) { return d.type === 'duo'; }).length;
      var joined = parseStamp(p.joined);
      var rank = state.players.slice().sort(function (a, b) { return (b.disciplines || []).length - (a.disciplines || []).length; }).findIndex(function (x) { return x.id === p.id; }) + 1;
      return '<article class="player-card" data-player="' + p.id + '" tabindex="0" role="button" aria-label="Профиль ' + esc(p.nick) + '" style="--c1:' + p.c1 + ';--c2:' + p.c2 + ';--i:' + i + '">' +
        '<span class="pl-rank">#' + rank + '</span>' +
        '<div class="pl-top"><span class="avatar pl-avatar" style="--c1:' + p.c1 + ';--c2:' + p.c2 + '"><span>' + esc(p.initials) + '</span></span>' +
        '<div class="pl-id"><div class="pl-nick">' + esc(p.nick) + '</div><div class="pl-name">' + esc(p.name) + '</div></div>' +
        '<div class="pl-count"><b>' + ds.length + '</b><span>арен</span></div></div>' +
        '<div class="pl-bar"><i style="--w:' + Math.round(ds.length / DISC.length * 100) + '%"></i></div>' +
        '<div class="pl-tags">' + top + more + '</div>' +
        '<p class="pl-quote">' + (p.quote ? '«' + esc(p.quote) + '»' : 'Без пожеланий — просто пришёл побеждать.') + '</p>' +
        '<div class="pl-foot"><span>заявка <b>' + (joined ? mskShort(joined) : '—') + '</b></span><span>' + duoCount + ' ' + plural(duoCount, ['дуо', 'дуо', 'дуо']) + ' · ' + (p.partners && (p.partners.minecraft || p.partners.cs2 || p.partners.dota2) ? 'есть тиммейт' : 'ищет пару') + '</span></div>' +
        '</article>';
    }).join('');
    var empty = $('#roster-empty');
    if (empty) empty.hidden = list.length > 0;
    var count = $('#roster-count');
    if (count) count.textContent = String(state.players.length);
    var word = $('#roster-word');
    if (word) word.textContent = numberWord(state.players.length);
    var next = $('#roster-next');
    if (next) next.textContent = ordinalWord(state.players.length + 1);
    var heroWord = $('#hero-player-word');
    if (heroWord) heroWord.textContent = numberWord(state.players.length);
    var footPlayers = $('#footer-players');
    if (footPlayers) footPlayers.textContent = String(state.players.length);
  }

  var NUM_WORDS = ['Ноль', 'Один', 'Два', 'Три', 'Четыре', 'Пять', 'Шесть', 'Семь', 'Восемь', 'Девять', 'Десять', 'Одиннадцать', 'Двенадцать'];
  var ORD_WORDS = ['нулевым', 'первым', 'вторым', 'третьим', 'четвёртым', 'пятым', 'шестым', 'седьмым', 'восьмым', 'девятым', 'десятым', 'одиннадцатым', 'двенадцатым'];
  function numberWord(n) { return NUM_WORDS[n] || String(n); }
  function ordinalWord(n) { return ORD_WORDS[n] || String(n) + '-м'; }

  function renderMatrixMode() {
    var wrap = $('.matrix-wrap');
    if (wrap) wrap.classList.toggle('is-editing', !!state.matrixEdit);
    var btn = $('#matrix-edit-btn');
    if (btn) {
      btn.setAttribute('aria-pressed', String(!!state.matrixEdit));
      btn.classList.toggle('is-on', !!state.matrixEdit);
    }
    var hint = $('#matrix-hint');
    if (hint) hint.textContent = state.matrixEdit ? 'правка: клик по точке — добавить или убрать из сетки' : 'клик по имени или точке — профиль бойца';
    var bar = $('#roster-bar');
    var n = rosterEditCount();
    if (bar) {
      bar.hidden = !n && !state.matrixEdit;
      var num = $('#roster-bar-count');
      if (num) num.textContent = String(n);
    }
  }

  function renderMatrix() {
    var host = $('#matrix-scroll');
    if (!host) return;
    var head = '<thead><tr><th>Дисциплина</th>' + state.players.map(function (p) {
      return '<th><div class="mx-player"><span class="avatar" style="--c1:' + p.c1 + ';--c2:' + p.c2 + '"><span>' + esc(p.initials) + '</span></span><span>' + esc(p.nick) + '</span></div></th>';
    }).join('') + '</tr></thead>';
    var body = '<tbody>' + queue().map(function (d) {
      return '<tr><th><div class="mx-disc"><i aria-hidden="true">' + d.icon + '</i>' + esc(d.name) + ' ' + esc(d.mode) + '<small>слот ' + d.order + '</small></div></th>' +
        state.players.map(function (p) {
          var on = (p.disciplines || []).indexOf(d.id) >= 0;
          var edited = !!state.rosterEdits[p.id];
          return '<td><button class="matrix-dot' + (on ? ' on' : '') + (edited ? ' is-edited' : '') + '" type="button" data-player="' + p.id + '" data-disc="' + d.id + '" style="--c1:' + p.c1 + ';--c2:' + p.c2 + '" aria-label="' + esc((on ? 'Да: ' : 'Нет: ') + p.nick + ' · ' + d.name + ' ' + d.mode) + '"></button></td>';
        }).join('') + '</tr>';
    }).join('') + '</tbody>';
    host.innerHTML = '<table class="matrix">' + head + body + '</table>';
  }

  /* ─────────────────────────── duo lab ─────────────────────────── */
  function fillDuoSelects() {
    var opts = state.players.map(function (p) {
      return '<option value="' + p.id + '">' + esc(p.nick) + ' · ' + esc(p.name) + '</option>';
    }).join('');
    ['#duo-a', '#duo-b'].forEach(function (sel) {
      var el = $(sel);
      if (!el) return;
      el.innerHTML = opts;
      el.value = sel === '#duo-a' ? state.duoA : state.duoB;
    });
  }

  function renderDuoCard(side, p) {
    var rootEl = $('#duo-pick-' + side);
    var av = $('#duo-' + side + '-avatar');
    var count = $('#duo-' + side + '-count');
    if (!p) return;
    if (rootEl) rootEl.style.setProperty('--c1', p.c1);
    if (av) { av.style.setProperty('--c1', p.c1); av.style.setProperty('--c2', p.c2); av.innerHTML = '<span>' + esc(p.initials) + '</span>'; }
    var name = $('#duo-' + side + '-name'); if (name) name.textContent = p.nick;
    var real = $('#duo-' + side + '-real'); if (real) real.textContent = p.name;
    if (count) count.textContent = (p.disciplines || []).length + ' арен';
    var wishes = $('#duo-' + side + '-wishes');
    if (wishes) {
      var rows = [
        ['Minecraft', p.partners && p.partners.minecraft],
        ['CS 2', p.partners && p.partners.cs2],
        ['Dota 2', p.partners && p.partners.dota2]
      ].filter(function (x) { return x[1]; });
      wishes.innerHTML = rows.length ? rows.map(function (x) {
        return '<div class="duo-wish"><b>' + x[0] + '</b><span>' + esc(x[1]) + '</span></div>';
      }).join('') : '<div class="duo-wish"><b>тиммейт</b><span>не указан — ищет пару</span></div>';
    }
  }

  function verdict(score) {
    if (score >= 82) return 'Идеальная синергия';
    if (score >= 64) return 'Сильная связка';
    if (score >= 46) return 'Рабочий состав';
    if (score >= 28) return 'Есть потенциал';
    return 'Разные вселенные';
  }

  function renderDuo() {
    var a = playerById(state.duoA) || state.players[0];
    var b = playerById(state.duoB) || state.players[Math.min(1, state.players.length - 1)];
    if (!a || !b) return;
    if (a.id === b.id) {
      var other = state.players.filter(function (p) { return p.id !== a.id; })[0];
      if (other) { b = other; state.duoB = other.id; }
    }
    renderDuoCard('a', a); renderDuoCard('b', b);
    var selects = { '#duo-a': a.id, '#duo-b': b.id };
    Object.keys(selects).forEach(function (sel) { var el = $(sel); if (el) el.value = selects[sel]; });

    var info = pairInfo(a, b);
    var ring = $('#synergy-ring');
    if (ring) ring.style.setProperty('--p', info.score);
    var val = $('#synergy-value'); if (val) val.textContent = info.score + '%';
    var ver = $('#synergy-verdict'); if (ver) ver.textContent = verdict(info.score);
    var note = $('#synergy-note');
    if (note) {
      var bits = [];
      bits.push(info.shared.length + ' ' + plural(info.shared.length, ['общая арена', 'общие арены', 'общих арен']));
      if (info.mutual) bits.push('взаимные пожелания');
      else if (info.aToB || info.bToA) bits.push('пожелание в одну сторону');
      else bits.push('без общих пожеланий');
      if (info.links) bits.push(info.links + ' ' + plural(info.links, ['связь', 'связи', 'связей']) + ' по дуо');
      note.textContent = bits.join(' · ') + '. ' + (info.mutual ? 'Тиммейты уже назвали друг друга — осталось сыграть.' : info.aToB || info.bToA ? 'Один уже позвал второго, но взаимности пока нет.' : 'Зато арены общие: можно договориться.');
    }
    var shared = $('#synergy-shared');
    if (shared) {
      shared.innerHTML = info.shared.length ? info.shared.slice(0, 6).map(function (id) {
        var d = discById(id);
        return d ? '<span class="tag" style="border-color:' + d.accent + '55">' + d.icon + ' ' + esc(d.name) + ' ' + esc(d.mode) + '</span>' : '';
      }).join('') + (info.shared.length > 6 ? '<span class="tag is-more">+' + (info.shared.length - 6) + '</span>' : '') : '<span class="tag empty">общих арен нет</span>';
    }
    try { localStorage.setItem(LS.duo, JSON.stringify({ a: a.id, b: b.id })); } catch (e) { /* ignore */ }
  }

  function renderPairs() {
    var grid = $('#pairs-grid');
    if (!grid) return;
    var list = allPairStats().slice(0, 6);
    grid.innerHTML = list.map(function (info) {
      var tags = info.shared.slice(0, 3).map(function (id) {
        var d = discById(id);
        return d ? '<span class="tag">' + d.icon + ' ' + esc(d.name) + ' ' + esc(d.mode) + '</span>' : '';
      }).join('');
      return '<article class="pair-card" data-pair-a="' + info.a.id + '" data-pair-b="' + info.b.id + '" tabindex="0" role="button" aria-label="Открыть пару ' + esc(info.a.nick) + ' и ' + esc(info.b.nick) + '">' +
        '<span class="pair-score">' + info.score + '%</span>' +
        '<div class="pair-faces"><span class="avatar" style="--c1:' + info.a.c1 + ';--c2:' + info.a.c2 + '"><span>' + esc(info.a.initials) + '</span></span>' +
        '<span class="pair-link" aria-hidden="true">' + (info.mutual ? '♥' : '⚡') + '</span>' +
        '<span class="avatar" style="--c1:' + info.b.c1 + ';--c2:' + info.b.c2 + '"><span>' + esc(info.b.initials) + '</span></span></div>' +
        '<div class="pair-names">' + esc(info.a.nick) + ' + ' + esc(info.b.nick) + '<small>' + info.shared.length + ' общих арен' + (info.mutual ? ' · взаимно' : '') + '</small></div>' +
        '<div class="pair-tags">' + tags + '</div>' +
        '<div class="pair-meter"><i style="--w:' + info.score + '%"></i></div></article>';
    }).join('');
    var total = $('#pair-total');
    if (total) total.textContent = String(allPairStats().length);
  }

  /* ─────────────────────────── stats ─────────────────────────── */
  function totals() {
    var per = DISC.map(function (d) { return { d: d, n: countFor(d.id) }; });
    var total = per.reduce(function (s, x) { return s + x.n; }, 0);
    var duo = per.filter(function (x) { return x.d.type === 'duo'; }).reduce(function (s, x) { return s + x.n; }, 0);
    return { per: per, total: total, solo: total - duo, duo: duo };
  }

  function renderStats() {
    var t = totals();
    var sorted = t.per.slice().sort(function (a, b) { return b.n - a.n; });
    var top = sorted[0];
    var universal = state.players.slice().sort(function (a, b) { return (b.disciplines || []).length - (a.disciplines || []).length; })[0];
    var avg = state.players.length ? Math.round(t.total / state.players.length) : 0;

    var st1 = $('#stat-1-value'); if (st1) st1.textContent = universal ? universal.nick : '—';
    var st1s = $('#stat-1-sub'); if (st1s) st1s.textContent = universal ? (universal.disciplines || []).length + ' из ' + DISC.length + ' арен' : '—';
    var st2 = $('#stat-2-value'); if (st2) st2.textContent = top ? top.d.name : '—';
    var st2s = $('#stat-2-sub'); if (st2s) st2s.textContent = top ? top.n + ' из ' + state.players.length + ' · ' + top.d.mode : '—';
    var st3 = $('#stat-3-value'); if (st3) st3.textContent = String(avg);
    var st3s = $('#stat-3-sub'); if (st3s) st3s.textContent = t.total + ' ' + plural(t.total, ['заявка', 'заявки', 'заявок']) + ' / ' + state.players.length + ' ' + plural(state.players.length, ['боец', 'бойца', 'бойцов']);
    var duoPairs = allPairStats().length;
    var st4 = $('#stat-4-value'); if (st4) st4.textContent = (t.total ? Math.round(t.duo / t.total * 100) : 0) + '%';
    var st4s = $('#stat-4-sub'); if (st4s) st4s.textContent = t.duo + ' дуо-заявок · ' + duoPairs + ' ' + plural(duoPairs, ['связка', 'связки', 'связок']);

    var chipTop = $('#chip-top-name'), chipIcon = $('#chip-top-icon'), chipMeta = $('#chip-top-meta'), chipPlayers = $('#chip-players'), chipPlayerMeta = $('#chip-player-meta');
    if (top) {
      if (chipTop) chipTop.textContent = top.d.name;
      if (chipIcon) chipIcon.textContent = top.d.icon;
      if (chipMeta) chipMeta.textContent = top.n + ' ' + plural(top.n, ['заявка', 'заявки', 'заявок']) + ' · ' + top.d.mode;
    }
    if (chipPlayers) chipPlayers.textContent = state.players.length + ' ' + plural(state.players.length, ['боец', 'бойца', 'бойцов']);
    if (chipPlayerMeta) chipPlayerMeta.textContent = 'один трон · ' + DISC.length + ' арен';
    var statsTotal = $('#stats-total'); if (statsTotal) statsTotal.textContent = String(t.total);
    var mini = $('#mini-registrations'); if (mini) mini.textContent = String(t.total);
    var mini2 = $('#mini-registrations-2'); if (mini2) { mini2.textContent = String(t.total); mini2.setAttribute('data-count', String(t.total)); }
    var miniDuos = $('#mini-duos'); if (miniDuos) miniDuos.textContent = String(confirmedDuos());
    var footerSync = $('#footer-sync'); if (footerSync) footerSync.textContent = (state.source === 'live' ? 'live ' : 'snapshot ') + state.players.length;

    var rows = sorted;
    var shown = state.chartOpen ? rows : rows.slice(0, 10);
    var max = rows[0] ? rows[0].n || 1 : 1;
    var chart = $('#bar-chart');
    if (chart) {
      chart.classList.toggle('is-open', state.chartOpen);
      chart.innerHTML = shown.map(function (x) {
        var pct = Math.round(x.n / max * 100);
        return '<button class="bar-row" type="button" data-disc-id="' + x.d.id + '" style="--a:' + x.d.accent + '">' +
          '<span class="bar-name"><i aria-hidden="true">' + x.d.icon + '</i><span>' + esc(x.d.name) + ' ' + esc(x.d.mode) + '</span></span>' +
          '<span class="bar-track"><i class="bar-fill" data-w="' + pct + '%" style="--w:0%"></i></span>' +
          '<span class="bar-val">' + x.n + ' · ' + Math.round(x.n / state.players.length * 100) + '%</span></button>';
      }).join('');
      requestAnimationFrame(function () {
        $$('.bar-fill', chart).forEach(function (el) { el.style.setProperty('--w', el.getAttribute('data-w')); });
      });
    }
    var more = $('#chart-more');
    if (more) {
      more.innerHTML = rows.length > 10
        ? '<button type="button" data-chart-toggle>' + (state.chartOpen ? 'Свернуть до топ-10' : 'Показать все ' + rows.length + ' арен') + '</button>'
        : '';
    }
    var badge = $('#chart-badge'); if (badge) badge.textContent = state.chartOpen ? 'все ' + rows.length : 'топ-10';

    var leader = $('#leader-list');
    if (leader) {
      leader.innerHTML = state.players.slice().sort(function (a, b) { return (b.disciplines || []).length - (a.disciplines || []).length; }).map(function (p, i) {
        var n = (p.disciplines || []).length;
        return '<button class="leader-row" type="button" data-player="' + p.id + '">' +
          '<span class="leader-rank">' + pad(i + 1) + '</span>' +
          '<span class="avatar leader-av" style="--c1:' + p.c1 + ';--c2:' + p.c2 + '"><span>' + esc(p.initials) + '</span></span>' +
          '<span class="leader-body"><span class="leader-name">' + esc(p.nick) + '</span><span class="leader-bar"><i style="--w:' + Math.round(n / DISC.length * 100) + '%"></i></span></span>' +
          '<span class="leader-count">' + n + '</span></button>';
      }).join('');
    }

    var donut = $('#donut');
    if (donut) donut.style.setProperty('--p', t.total ? Math.round(t.solo / t.total * 100) : 0);
    var ds = $('#donut-solo'); if (ds) ds.textContent = String(t.solo);
    var ds2 = $('#donut-solo-2'); if (ds2) ds2.textContent = String(t.solo);
    var dd = $('#donut-duo'); if (dd) dd.textContent = String(t.duo);

    var facts = $('#facts-row');
    if (facts) {
      var first = state.players.slice().sort(function (a, b) { return (parseStamp(a.joined) || 0) - (parseStamp(b.joined) || 0); })[0];
      var rare = t.per.filter(function (x) { return x.n > 0; }).slice().sort(function (a, b) { return a.n - b.n; })[0];
      var duoMag = state.players.slice().sort(function (a, b) {
        var da = (a.disciplines || []).filter(function (id) { var d = discById(id); return d && d.type === 'duo'; }).length;
        var db = (b.disciplines || []).filter(function (id) { var d = discById(id); return d && d.type === 'duo'; }).length;
        if (db !== da) return db - da;
        return (b.disciplines || []).length - (a.disciplines || []).length;
      })[0];
      facts.innerHTML = '<div class="fact"><div class="fact-icon" aria-hidden="true">⏱️</div><b>Первым был <em>' + esc(first ? first.nick : '—') + '</em></b><span>' + (first ? dateLabel(first.joined) + ' · ' + (parseStamp(first.joined) ? new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' }).format(parseStamp(first.joined)) : '—') + ' MSK' : '—') + '</span></div>' +
        '<div class="fact"><div class="fact-icon" aria-hidden="true">💎</div><b>Самая редкая арена</b><span>' + (rare ? rare.d.icon + ' ' + esc(rare.d.name) + ' ' + esc(rare.d.mode) + ' · ' + rare.n + ' ' + plural(rare.n, ['боец', 'бойца', 'бойцов']) : '—') + '</span></div>' +
        '<div class="fact"><div class="fact-icon" aria-hidden="true">🧬</div><b>Дуо-магнит — <em>' + esc(duoMag ? duoMag.nick : '—') + '</em></b><span>' + (duoMag ? (duoMag.disciplines || []).filter(function (id) { var d = discById(id); return d && d.type === 'duo'; }).length + ' дуо-дисциплины · ' + (duoMag.disciplines || []).length + ' арен всего' : '—') + '</span></div>';
    }
  }

  /* ─────────────────────────── schedule ─────────────────────────── */
  function fmtMinutes(m) {
    if (!m) return '—';
    var h = Math.floor(m / 60), rest = m % 60;
    return h ? h + 'ч' + (rest ? ' ' + rest + 'м' : '') : m + 'м';
  }
  function renderSchedule() {
    var host = $('#timeline');
    if (!host) return;
    var groups = new Map();
    queue().forEach(function (d) {
      if (!groups.has(d.wave)) groups.set(d.wave, []);
      groups.get(d.wave).push(d);
    });
    host.innerHTML = Array.from(groups.entries()).map(function (entry) {
      var wave = entry[0], list = entry[1];
      var total = list.reduce(function (sum, d) { return sum + (d.duration || 0); }, 0);
      return '<div class="day-card wave-card">' +
        '<div class="day-head"><span class="day-num">' + pad(wave) + '</span><span class="day-name">Волна</span>' +
        '<span class="day-count">' + list.length + ' ' + plural(list.length, ['старт', 'старта', 'стартов']) + ' · ~' + fmtMinutes(total) + '</span></div>' +
        '<div class="day-list">' + list.map(function (d) {
          return '<button class="slot" type="button" data-disc-id="' + d.id + '" style="--a:' + d.accent + '">' +
            '<span class="slot-time">~' + d.time + '</span><span class="slot-icon" aria-hidden="true">' + d.icon + '</span>' +
            '<span class="slot-name">' + esc(d.name) + ' ' + esc(d.mode) + '<small>' + esc(d.format) + '</small></span>' +
            '<span class="slot-dur">' + esc(isBoard(d) ? 'заезд' : seriesOf(d)) + '</span></button>';
        }).join('') + '</div></div>';
    }).join('') +
      '<div class="day-card wave-card is-catchup"><div class="day-head"><span class="day-num">∞</span><span class="day-name">Окно доигрывания</span>' +
      '<span class="day-count">по согласованию</span></div><div class="day-list">' +
      '<div class="slot-catchup"><span class="slot-time">TBD</span><span class="slot-icon" aria-hidden="true">⏳</span>' +
      '<span class="slot-name">Перенесённые матчи<small>между дисциплинами · с организатором</small></span><span class="slot-dur">∞</span></div>' +
      '</div></div>';

    var next = queue()[0];
    var nextBox = $('#next-event');
    if (nextBox && next) {
      nextBox.innerHTML = '<span class="ne-label"><i class="status-dot" aria-hidden="true"></i> первый в очереди</span>' +
        '<b>' + next.icon + ' ' + esc(next.name) + ' ' + esc(next.mode) + '</b>' +
        '<span>слот ' + next.order + ' · ~' + next.time + ' MSK · ' + esc(next.format) + '</span>';
    }
    var note = $('#dates-note');
    if (note) {
      note.innerHTML = '<b>' + esc(EVENT.dateLabel || 'Даты уточняются') + '</b><span>' + esc(EVENT.dateNote || '') + '</span>';
    }
  }

  function tickClocks() {
    var clock = $('#event-clock');
    if (clock) clock.innerHTML = mskClock() + '<small>MSK</small>';
    var cd = $('#event-countdown'); if (cd) cd.textContent = 'TBD';
    var jt = $('#join-timer'); if (jt) jt.textContent = 'TBD';
    syncLivePill();
  }

  /* ─────────────────────────── wishes ─────────────────────────── */
  function renderWishes() {
    var host = $('#wishes-wall');
    if (!host) return;
    var list = state.players.filter(function (p) { return p.quote && String(p.quote).trim(); });
    host.innerHTML = list.map(function (p, i) {
      var liked = !!state.likes[p.id];
      var base = state.likes[p.id + ':n'] || 0;
      return '<article class="wish-card" style="--c1:' + p.c1 + ';--i:' + i + '">' +
        '<span class="wish-tag">#' + pad(i + 1) + '</span>' +
        '<p class="wish-text">' + esc(p.quote) + '</p>' +
        '<div class="wish-foot"><span class="avatar wish-av" style="--c1:' + p.c1 + ';--c2:' + p.c2 + '"><span>' + esc(p.initials) + '</span></span>' +
        '<div class="wish-name"><b>' + esc(p.nick) + '</b><span>' + esc(p.name) + '</span></div>' +
        '<button class="wish-like' + (liked ? ' is-liked' : '') + '" type="button" data-like="' + p.id + '" aria-pressed="' + liked + '" aria-label="Лайкнуть пожелание">' +
        '<svg viewBox="0 0 24 24" fill="' + (liked ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z"/></svg><span>' + base + '</span></button></div></article>';
    }).join('');
    var count = $('#wishes-count'); if (count) count.textContent = String(list.length);
  }

  function toggleLike(id) {
    var el = $('[data-like="' + id + '"]');
    if (!el) return;
    var liked = !state.likes[id];
    var n = Number(state.likes[id + ':n'] || 0) + (liked ? 1 : -1);
    if (n < 0) n = 0;
    state.likes[id] = liked;
    state.likes[id + ':n'] = n;
    save(LS.likes, state.likes);
    el.classList.toggle('is-liked', liked);
    el.setAttribute('aria-pressed', String(liked));
    var span = el.querySelector('span'); if (span) span.textContent = String(n);
    var svg = el.querySelector('svg'); if (svg) svg.setAttribute('fill', liked ? 'currentColor' : 'none');
    sound(liked ? 880 : 420, 0.05, 'sine', 0.03);
  }

  /* ─────────────────────────── join ─────────────────────────── */
  function renderJoin() {
    var avatars = $('#join-avatars');
    if (avatars) {
      avatars.innerHTML = state.players.slice(0, 5).map(function (p) {
        return '<span class="avatar" style="--c1:' + p.c1 + ';--c2:' + p.c2 + '" title="' + esc(p.nick) + '"><span>' + esc(p.initials) + '</span></span>';
      }).join('') + (state.players.length > 5 ? '<span class="avatar-more">+' + (state.players.length - 5) + '</span>' : '');
    }
    var count = $('#join-count'); if (count) count.textContent = String(state.players.length);
    var status = $('#join-status-text');
    if (status) status.textContent = 'заявки открыты · даты уточняются';
    var timer = $('#join-timer');
    if (timer) timer.textContent = 'TBD';
    var timerLabel = timer && timer.parentNode && timer.parentNode.querySelector('small');
    if (timerLabel) timerLabel.textContent = 'Даты старта';
  }

  /* ─────────────────────────── modal ─────────────────────────── */
  var lastFocus = null;
  function openModal(html) {
    var modal = $('#modal');
    if (!modal) return;
    lastFocus = document.activeElement;
    var body = $('#modal-body');
    if (body) body.innerHTML = html;
    modal.hidden = false;
    document.body.classList.add('is-locked');
    var close = $('#modal-close');
    if (close) close.focus();
  }
  function closeModal() {
    var modal = $('#modal');
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('is-locked');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function discModal(id) {
    var d = discById(id);
    if (!d) return;
    var list = participants(d);
    var c = compOf(d);
    var html = '<div class="md-hero' + (d.art ? ' has-art' : '') + '" style="--a:' + d.accent + ';--b:' + d.accent2 + '">' +
      (d.art ? '<img class="md-art" src="' + d.art + '" alt="" width="640" height="360" decoding="async">' : '') +
      '<span class="md-icon" aria-hidden="true">' + d.icon + '</span>' +
      '<div><span class="md-kicker">слот ' + d.order + ' · ~' + d.time + ' MSK · даты уточняются</span>' +
      '<h3 class="md-title">' + esc(d.name) + ' <span style="color:' + d.accent + '">' + esc(d.mode) + '</span></h3>' +
      '<div class="md-sub">' + esc(d.format) + ' · ' + esc(isBoard(d) ? 'заезд' : seriesOf(d)) + ' · ' + (d.type === 'duo' ? 'дуо-режим' : 'соло') + '</div></div></div>' +
      '<div class="md-meta"><div class="md-meta-item"><small>слот</small><b>#' + d.order + ' в очереди</b></div>' +
      '<div class="md-meta-item"><small>время</small><b>~' + d.time + ' MSK · ' + durationLabel(d) + '</b></div>' +
      '<div class="md-meta-item"><small>формат</small><b>' + esc(isBoard(d) ? (c.metric || 'заезд') : (c.seriesNote || seriesOf(d))) + '</b></div>' +
      '<div class="md-meta-item"><small>участники</small><b>' + list.length + ' из ' + state.players.length + '</b></div></div>' +
      '<div class="md-section"><h4>Победа</h4><div class="md-rules"><b>' + esc(c.win || '—') + '</b><br>' + esc(d.rules) + '</div></div>' +
      '<div class="md-section"><h4>Регламент</h4><ul class="md-rule-list">' + (isBoard(d) ? '' : '<li><b>Круговая система:</b> каждый играет с каждым один раз; победа = 1 очко в таблице.</li>') + (c.rules || []).map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>' +
      ((c.tbd || []).length ? '<div class="md-tbd"><span>уточнить до старта</span>' + c.tbd.map(function (t) { return '<i>' + esc(t) + '</i>'; }).join('') + '</div>' : '') + '</div>' +
      '<div class="md-section"><h4>Заявились</h4><div class="md-people">' + (list.length ? list.map(function (p) {
        return '<button class="md-person" type="button" data-md-player="' + p.id + '"><span class="avatar" style="--c1:' + p.c1 + ';--c2:' + p.c2 + '"><span>' + esc(p.initials) + '</span></span>' + esc(p.nick) + '</button>';
      }).join('') : '<span class="modal-info">Пока никто — стань первым.</span>') + '</div></div>' +
      '<div class="md-actions"><button class="btn btn-primary" type="button" data-md-grid="' + d.id + '">' + (isBoard(d) ? 'Открыть заезд' : 'Открыть таблицу') + '</button>' +
      '<button class="btn btn-ghost" type="button" data-md-roster="' + d.id + '">Изменить состав</button>' +
      '<button class="btn btn-ghost" type="button" data-md-share-disc="' + d.id + '">Поделиться</button>' +
      '<button class="btn btn-ghost" type="button" data-md-ics="' + d.id + '">Когда играем</button></div>';
    openModal(html);
  }
  function playerModal(id) {
    var p = playerById(id);
    if (!p) return;
    var ds = (p.disciplines || []).map(discById).filter(Boolean);
    var rank = state.players.slice().sort(function (a, b) { return (b.disciplines || []).length - (a.disciplines || []).length; }).findIndex(function (x) { return x.id === p.id; }) + 1;
    var duo = ds.filter(function (d) { return d.type === 'duo'; });
    var joined = parseStamp(p.joined);
    var best = ds.slice().sort(function (a, b) { return countFor(a.id) - countFor(b.id); })[0];
    var partnerLines = [
      ['Minecraft', p.partners && p.partners.minecraft],
      ['CS 2', p.partners && p.partners.cs2],
      ['Dota 2', p.partners && p.partners.dota2]
    ].filter(function (x) { return x[1]; });
    var html = '<div class="md-hero" style="--a:' + p.c1 + ';--b:' + p.c2 + '">' +
      '<span class="avatar md-avatar" style="--c1:' + p.c1 + ';--c2:' + p.c2 + '"><span>' + esc(p.initials) + '</span></span>' +
      '<div><span class="md-kicker">боец · #' + rank + ' по арсеналу</span>' +
      '<h3 class="md-title">' + esc(p.nick) + '</h3><div class="md-sub">' + esc(p.name) + (joined ? ' · заявка ' + mskShort(joined) : '') + '</div></div></div>' +
      '<div class="md-stats"><div class="md-stat"><b>' + ds.length + '</b><span>арен</span></div><div class="md-stat"><b>' + duo.length + '</b><span>дуо</span></div><div class="md-stat"><b>' + (p.quote ? '✓' : '—') + '</b><span>пожелание</span></div></div>' +
      (p.quote ? '<div class="md-quote">«' + esc(p.quote) + '»</div>' : '') +
      '<div class="md-section"><h4>Дисциплины</h4><div class="md-chips">' + ds.map(function (d) {
        return '<button class="md-chip" type="button" data-md-disc="' + d.id + '" style="border-color:' + d.accent + '44">' + d.icon + ' ' + esc(d.name) + ' ' + esc(d.mode) + '</button>';
      }).join('') + '</div></div>' +
      '<div class="md-section"><h4>Дуо-пожелания</h4><div class="md-chips">' + (partnerLines.length ? partnerLines.map(function (x) {
        return '<span class="md-chip" style="cursor:default">' + x[0] + ' → ' + esc(x[1]) + '</span>';
      }).join('') : '<span class="modal-info">Не указаны — можно звать в пару.</span>') + '</div></div>' +
      '<div class="md-actions"><button class="btn btn-primary" type="button" data-md-synergy="' + p.id + '">Подобрать дуо</button>' +
      (best ? '<button class="btn btn-ghost" type="button" data-md-disc="' + best.id + '">Любимая арена</button>' : '') +
      '<button class="btn btn-ghost" type="button" data-md-roster-player="' + p.id + '">Изменить арены</button>' +
      '<button class="btn btn-ghost" type="button" data-md-share-player="' + p.id + '">Поделиться</button></div>';
    openModal(html);
  }

  /* ────────── правка состава: дисциплина → бойцы, боец → арены ────────── */
  function rosterFlag(p, discId) {
    var base = baseDisciplines(p);
    var on = (p.disciplines || []).indexOf(discId) >= 0;
    var inBase = base.indexOf(discId) >= 0;
    if (on && !inBase) return { text: 'добавлен', cls: 'is-added' };
    if (on) return { text: 'в сетке', cls: '' };
    if (inBase) return { text: 'снят', cls: 'is-dropped' };
    return { text: '—', cls: '' };
  }
  function rosterAvatar(p) {
    return '<span class="avatar" style="--c1:' + p.c1 + ';--c2:' + p.c2 + '"><span>' + esc(p.initials) + '</span></span>';
  }
  function rosterRowHtml(playerId, discId) {
    var p = playerById(playerId), d = discById(discId);
    if (!p || !d) return '';
    var on = (p.disciplines || []).indexOf(d.id) >= 0;
    var flag = rosterFlag(p, d.id);
    var who = state.rosterModal && state.rosterModal.mode === 'player'
      ? '<b>' + d.icon + ' ' + esc(d.name) + ' ' + esc(d.mode) + '</b><small>слот ' + d.order + ' · ' + esc(isBoard(d) ? 'заезд' : seriesOf(d)) + '</small>'
      : '<b>' + esc(p.nick) + '</b><small>' + (p.name && p.name !== p.nick ? esc(p.name) + ' · ' : '') + (p.disciplines || []).length + ' ' + plural((p.disciplines || []).length, ['арена', 'арены', 'арен']) + '</small>';
    return '<button class="roster-row' + (on ? ' is-on' : ' is-off') + (flag.cls ? ' is-edited ' + flag.cls : '') + '"' +
      ' type="button" role="switch" aria-checked="' + (on ? 'true' : 'false') + '"' +
      ' data-roster-player="' + esc(p.id) + '" data-roster-disc="' + esc(d.id) + '">' +
      (state.rosterModal && state.rosterModal.mode === 'player' ? '<span class="roster-icon" aria-hidden="true">' + d.icon + '</span>' : rosterAvatar(p)) +
      '<span class="roster-who">' + who + '</span>' +
      '<span class="roster-flag">' + esc(flag.text) + '</span>' +
      '</button>';
  }
  function rosterMatches(query, text) {
    var q = norm(query);
    if (!q) return true;
    return norm(text).indexOf(q) >= 0;
  }
  function rosterListHtml() {
    var m = state.rosterModal;
    if (!m) return '';
    if (m.mode === 'disc') {
      var d = discById(m.id);
      if (!d) return '';
      var rows = state.players.filter(function (p) {
        return rosterMatches(m.query, [p.nick, p.name, (p.aliases || []).join(' ')].join(' '));
      }).map(function (p) { return rosterRowHtml(p.id, d.id); }).join('');
      return rows || '<div class="roster-empty">Никого не нашли — попробуй другой ник.</div>';
    }
    var p = playerById(m.id);
    if (!p) return '';
    var discs = queue().filter(function (d) {
      return rosterMatches(m.query, [d.name, d.mode, RU_TERMS[d.id] || ''].join(' '));
    }).map(function (d) { return rosterRowHtml(p.id, d.id); }).join('');
    return discs || '<div class="roster-empty">Такой дисциплины нет.</div>';
  }
  function rosterModalStat() {
    var m = state.rosterModal;
    if (!m) return '';
    if (m.mode === 'disc') {
      var d = discById(m.id);
      var n = d ? participants(d).length : 0;
      var edits = rosterEditCount(m.id);
      return n + ' ' + plural(n, ['боец', 'бойца', 'бойцов']) + ' в сетке' + (edits ? ' · ' + edits + ' ' + plural(edits, ['правка', 'правки', 'правок']) : '');
    }
    var p = playerById(m.id);
    return (p ? (p.disciplines || []).length : 0) + ' ' + plural(p ? (p.disciplines || []).length : 0, ['арена', 'арены', 'арен']) +
      (p && state.rosterEdits[p.id] ? ' · есть ручные правки' : '');
  }
  function refreshRosterModal() {
    var host = $('#roster-list');
    if (host) host.innerHTML = rosterListHtml();
    var stat = $('#roster-modal-stat');
    if (stat) stat.textContent = rosterModalStat();
  }
  function rosterModalShell(kicker, title, sub, accent) {
    return '<div class="md-hero" style="--a:' + accent + ';--b:' + accent + '">' +
      '<span class="md-icon" aria-hidden="true">👥</span>' +
      '<div><span class="md-kicker">' + kicker + '</span>' +
      '<h3 class="md-title">' + title + '</h3>' +
      '<div class="md-sub">' + sub + '</div></div></div>' +
      '<div class="roster-tools"><label class="search-field">' +
        '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
        '<input type="search" id="roster-modal-search" placeholder="' + (state.rosterModal.mode === 'disc' ? 'Найти бойца…' : 'Найти дисциплину…') + '" autocomplete="off" aria-label="Поиск">' +
      '</label><span class="roster-stat" id="roster-modal-stat"></span></div>' +
      '<div class="roster-list" id="roster-list"></div>' +
      '<p class="roster-note">Правка живёт в этом браузере и не меняет Google Таблицу — ссылку с готовой раскладкой можно скопировать кнопкой ниже. Если сетка уже играется, смена состава пересобирает пары: результаты сбрасываются кнопкой «Сброс» в блоке турниров.</p>' +
      '<div class="md-actions"><button class="btn btn-primary" type="button" data-action="close-modal">Готово</button>' +
      '<button class="btn btn-ghost" type="button" data-action="roster-share">Скопировать ссылку</button>' +
      '<button class="btn btn-ghost" type="button" data-action="roster-reset-current">Сбросить правки</button></div>';
  }
  function rosterModal(discId) {
    var d = discById(discId) || discById(state.bracketId);
    if (!d) return;
    state.rosterModal = { mode: 'disc', id: d.id, query: '' };
    openModal(rosterModalShell(
      'состав · локальная правка · слот ' + d.order,
      esc(d.name) + ' <span style="color:' + d.accent + '">' + esc(d.mode) + '</span>',
      'Отметь, кто играет в этой сетке. Клик по строке добавляет или убирает бойца, круги и таблица пересоберутся сразу.',
      d.accent
    ));
    refreshRosterModal();
  }
  function playerRosterModal(playerId) {
    var p = playerById(playerId);
    if (!p) return;
    state.rosterModal = { mode: 'player', id: p.id, query: '' };
    openModal(rosterModalShell(
      'арены бойца · локальная правка',
      esc(p.nick),
      esc(p.name) + ' · отметь дисциплины, где боец играет. Состав круговой и матрица обновятся сразу.',
      p.c1
    ));
    refreshRosterModal();
  }
  function rosterToggleUI(playerId, discId) {
    var nowOn = rosterToggle(playerId, discId);
    if (nowOn == null) return;
    sound(nowOn ? 700 : 420, 0.05, 'triangle', 0.03);
    renderAll();
    refreshRosterModal();
  }

  /* ─────────────────────────── palette ─────────────────────────── */
  var PALETTE_ACTIONS = [
    { name: 'Заявка на турнир', type: 'Действие', icon: '🏆', hint: 'форма', run: function () { window.open(EVENT.formUrl, '_blank', 'noopener'); } },
    { name: 'Случайный боец', type: 'Действие', icon: '🎯', hint: 'рандом', run: function () { randomPlayer(); } },
    { name: 'Случайное дуо', type: 'Действие', icon: '🧬', hint: 'рандом', run: function () { randomDuo(); } },
    { name: 'Автопрогноз круговой', type: 'Действие', icon: '⚡', hint: 'круговая', run: function () { autoBracket(); } },
    { name: 'Админка: кто вносит результаты', type: 'Действие', icon: '🛡️', hint: 'доступ', run: function () { adminModal(); } },
    { name: 'Кто в какой сетке', type: 'Действие', icon: '👥', hint: 'состав', run: function () { rosterModal(state.bracketId); } },
    { name: 'Правка состава в матрице', type: 'Действие', icon: '✎', hint: 'матрица', run: function () { state.matrixEdit = true; renderMatrixMode(); var m = $('#roster'); if (m) m.scrollIntoView({ behavior: 'smooth' }); } },
    { name: 'Пересобрать раунды', type: 'Действие', icon: '🔀', hint: 'круговая', run: function () { shuffleBracket(); } },
    { name: 'Сбросить таблицу', type: 'Действие', icon: '↺', hint: 'круговая', run: function () { resetBracket(); } },
    { name: 'Когда играем', type: 'Действие', icon: '📅', hint: 'даты', run: function () { datesTbd(); } },
    { name: 'Копировать ссылку', type: 'Действие', icon: '🔗', hint: 'share', run: function () { sharePage(); } },
    { name: 'Сменить тему', type: 'Действие', icon: '🌗', hint: 'тема', run: function () { toggleTheme(); } },
    { name: 'Звук вкл/выкл', type: 'Действие', icon: '🔊', hint: 'звук', run: function () { toggleSound(); } },
    { name: 'Наверх', type: 'Действие', icon: '↑', hint: 'скролл', run: function () { window.scrollTo({ top: 0, behavior: 'smooth' }); } }
  ];

  function paletteSource() {
    var items = [];
    DISC.forEach(function (d) {
      items.push({ name: d.name + ' · ' + d.mode, type: 'Дисциплина', icon: d.icon, hint: 'слот ' + d.order + ' · ~' + d.time, kw: discKeys(d), run: function () { discModal(d.id); } });
    });
    state.players.forEach(function (p) {
      items.push({ name: p.nick, type: 'Боец', icon: p.emoji || '👤', hint: (p.disciplines || []).length + ' арен', kw: [p.name, p.nick, (p.aliases || []).join(' ')].join(' '), run: function () { playerModal(p.id); } });
    });
    PALETTE_ACTIONS.forEach(function (a) { items.push(Object.assign({ kw: a.name + ' ' + a.type + ' ' + a.hint }, a)); });
    return items;
  }

  function filteredPalette() {
    var q = norm($('#palette-input') ? $('#palette-input').value : '');
    var all = paletteSource();
    if (!q) return all.slice(0, 14);
    return all.filter(function (it) { return norm(it.name + ' ' + it.kw + ' ' + it.type).indexOf(q) >= 0; }).slice(0, 20);
  }

  function renderPalette() {
    var host = $('#palette-results');
    if (!host) return;
    state.paletteItems = filteredPalette();
    state.paletteIndex = clamp(state.paletteIndex, 0, Math.max(0, state.paletteItems.length - 1));
    host.innerHTML = state.paletteItems.length ? state.paletteItems.map(function (it, i) {
      return '<button class="pal-item' + (i === state.paletteIndex ? ' is-active' : '') + '" type="button" role="option" aria-selected="' + (i === state.paletteIndex) + '" data-pal="' + i + '">' +
        '<span class="pal-icon" aria-hidden="true">' + it.icon + '</span>' +
        '<span class="pal-body"><span class="pal-name">' + esc(it.name) + '</span><span class="pal-type">' + esc(it.type) + '</span></span>' +
        '<span class="pal-hint">' + esc(it.hint || '') + '</span></button>';
    }).join('') : '<div class="pal-empty">Ничего не нашлось. Попробуй «дота», «круговая», «заезд» или «Сева».</div>';
  }

  function openPalette() {
    var pal = $('#palette');
    if (!pal) return;
    if (!$('#palette').hidden) { closePalette(); return; }
    lastFocus = document.activeElement;
    pal.hidden = false;
    state.paletteOpen = true;
    state.paletteIndex = 0;
    document.body.classList.add('is-locked');
    var input = $('#palette-input');
    if (input) { input.value = ''; input.focus(); }
    renderPalette();
    sound(620, 0.04, 'sine', 0.02);
  }
  function closePalette() {
    var pal = $('#palette');
    if (!pal) return;
    pal.hidden = true;
    state.paletteOpen = false;
    document.body.classList.remove('is-locked');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function runPaletteItem(i) {
    var item = state.paletteItems[i];
    if (!item) return;
    closePalette();
    setTimeout(function () { item.run(); }, 80);
  }

  /* ─────────────────────────── actions ─────────────────────────── */
  function randomPlayer() {
    var p = state.players[Math.floor(Math.random() * state.players.length)];
    if (!p) return;
    confetti(); chime();
    playerModal(p.id);
    toast('Случайный боец: <b>' + esc(p.nick) + '</b> · ' + (p.disciplines || []).length + ' арен', '🎯');
  }
  function randomDuo() {
    if (state.players.length < 2) return;
    var a = state.players[Math.floor(Math.random() * state.players.length)];
    var others = state.players.filter(function (p) { return p.id !== a.id; });
    var b = others[Math.floor(Math.random() * others.length)];
    setDuo(a.id, b.id, true);
    toast('Случайная пара: <b>' + esc(a.nick) + '</b> + <b>' + esc(b.nick) + '</b>', '🧬');
  }
  function setDuo(a, b, scroll) {
    if (a === b) return;
    state.duoA = a; state.duoB = b;
    renderDuo();
    sound(700, 0.05, 'sine', 0.025);
    if (scroll) {
      var sec = $('#duo');
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  /* Случайный клик по «Раунды»/«Сброс» не должен стирать результаты:
     если в сетке уже что-то отмечено, первый клик только предупреждает. */
  var riskArmed = {};
  function riskConfirm(action, id) {
    var key = action + ':' + id;
    var now = Date.now();
    if (riskArmed[key] && now - riskArmed[key] < 6000) { riskArmed[key] = 0; return true; }
    riskArmed[key] = now;
    return false;
  }

  function shuffleBracket() {
    if (guardReadonly('Пересобирает раунды админ.')) return;
    cancelAuto();
    var d = discById(state.bracketId);
    if (!d) return;
    if (isBoard(d)) { boardReset(); return; }
    var st = bracketState(d.id);
    if (Object.keys(st.winners || {}).length && !riskConfirm('shuffle', d.id)) {
      toast('В сетке уже есть результаты. Нажми <b>«Раунды»</b> ещё раз — пары пересоберутся, а отметки сбросятся.', '⚠️');
      return;
    }
    st.seed = (st.seed * 1664525 + 1013904223) >>> 0;
    st.winners = {};
    saveBrackets();
    renderComp();
    sound(460, 0.07, 'triangle', 0.03);
    toast('Раунды «' + esc(d.name) + ' ' + esc(d.mode) + '» пересобраны', '🔀');
  }
  function resetBracket() {
    if (guardReadonly('Сбрасывает админ.')) return;
    cancelAuto();
    var d = discById(state.bracketId);
    if (!d) return;
    if (isBoard(d)) { boardReset(); return; }
    if (Object.keys(bracketState(d.id).winners || {}).length && !riskConfirm('reset', d.id)) {
      toast('Результаты уже отмечены. Нажми <b>«Сброс»</b> ещё раз, если правда нужно очистить сетку.', '⚠️');
      return;
    }
    bracketState(d.id).winners = {};
    saveBrackets();
    renderComp();
    sound(360, 0.07, 'sine', 0.03);
    toast('Таблица «' + esc(d.name) + ' ' + esc(d.mode) + '» сброшена', '↺');
  }
  function setBracketDisc(id) {
    if (!discById(id)) return;
    cancelAuto();
    state.bracketId = id;
    saveBrackets();
    var sel = $('#bracket-select');
    if (sel) sel.value = id;
    renderComp();
    sound(680, 0.04, 'sine', 0.02);
  }
  function haptic(ms) {
    try { if (state.sound && navigator.vibrate) navigator.vibrate(ms || 12); } catch (e) { /* ignore */ }
  }
  function withViewTransition(run) {
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduced) { run(); return; }
    try { document.startViewTransition(run); } catch (e) { run(); }
  }
  function deepLink() {
    try {
      var q = new URLSearchParams(window.location.search);
      var pid = q.get('p');
      if (pid && playerById(pid)) { playerModal(pid); return; }
      var did = q.get('d');
      if (did && discById(did)) { discModal(did); }
    } catch (e) { /* ignore */ }
  }
  function toggleTheme() {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    withViewTransition(function () { applyTheme(next); });
  }
  function applyTheme(next) {
    root.setAttribute('data-theme', next);
    state.theme = next;
    try { localStorage.setItem(LS.theme, next); } catch (e) { /* ignore */ }
    var moon = $('.moon'), sun = $('.sun');
    if (moon) moon.style.display = next === 'dark' ? '' : 'none';
    if (sun) sun.style.display = next === 'dark' ? 'none' : '';
    var themeMeta = $('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', next === 'dark' ? '#04060d' : '#f6f2e9');
    sound(520, 0.06, 'sine', 0.03);
    toast(next === 'dark' ? 'Тёмная сторона арены' : 'Светлая сторона арены', next === 'dark' ? '🌙' : '☀️');
  }
  function toggleSound() {
    state.sound = !state.sound;
    document.body.classList.toggle('is-muted', !state.sound);
    try { localStorage.setItem(LS.sound, state.sound ? '1' : '0'); } catch (e) { /* ignore */ }
    var btn = $('#sound-toggle');
    if (btn) btn.setAttribute('aria-pressed', String(state.sound));
    if (state.sound) sound(720, 0.06, 'sine', 0.035);
    toast(state.sound ? 'Звук включён' : 'Звук выключен', state.sound ? '🔊' : '🔇');
  }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }
  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }
  function sharePage() {
    var text = 'GAMEpiada · турнирная арена: 17 дисциплин, ' + state.players.length + ' бойцов и один золотой трон. 27.10–01.11.2026';
    if (navigator.share) {
      navigator.share({ title: 'GAMEpiada', text: text, url: EVENT.siteUrl }).catch(function () {});
      return;
    }
    copy(text + ' ' + EVENT.siteUrl).then(function (ok) {
      toast(ok ? 'Ссылка скопирована — кидай в чат' : 'Не удалось скопировать, но ссылка в адресной строке', ok ? '🔗' : 'ℹ️');
    });
  }
  function shareBoard() {
    var d = discById(state.bracketId);
    if (!d) return;
    var st = boardState(d.id);
    var parts = [1, 2, 3].map(function (place) {
      var e = st[place] ? entrantByKey(d, st[place]) : null;
      return place + ') ' + (e ? e.label : '—');
    });
    copy('GAMEpiada · ' + d.name + ' ' + d.mode + ' — ' + parts.join(' · ') + '. ' + EVENT.siteUrl + '#bracket')
      .then(function (ok) { toast(ok ? 'Подиум скопирован' : 'Ссылка: ' + EVENT.siteUrl + '#bracket', '🥇'); });
  }
  function shareCurrentBracket() {
    var d = discById(state.bracketId);
    if (!d) return;
    if (isBoard(d)) { shareBoard(); return; }
    var tours = buildTours(d);
    var totals = leagueTotals(tours);
    var leader = leagueStandings(d, tours)[0];
    var tail = leader && totals.decided ? (totals.complete ? ' — чемпион: ' : ' — лидер: ') + leader.entrant.label : '';
    var text = 'Круговая GAMEpiada · ' + d.name + ' ' + d.mode + ' · ' + seriesOf(d) + tail + '. Таблица: ';
    copy(text + EVENT.siteUrl + '#bracket').then(function (ok) {
      toast(ok ? 'Таблица скопирована' : 'Ссылка: ' + EVENT.siteUrl + '#bracket', '🏟️');
    });
  }
  function shareDuo() {
    var a = playerById(state.duoA), b = playerById(state.duoB);
    if (!a || !b) return;
    var info = pairInfo(a, b);
    copy('Дуо GAMEpiada: ' + a.nick + ' + ' + b.nick + ' — синергия ' + info.score + '%. ' + EVENT.siteUrl + '#duo').then(function (ok) {
      toast(ok ? 'Дуо скопировано' : 'Ссылка: ' + EVENT.siteUrl + '#duo', '🧬');
    });
  }
  function datesTbd() {
    toast('Даты ещё не объявлены. Порядок слотов зафиксирован — дни организатор назовёт в Discord.', '📅');
    sound(520, 0.05, 'sine', 0.02);
  }
  function downloadICS(id) {
    /* Календарь собираем только когда организатор утвердит даты:
       пустые или выдуманные слоты в .ics хуже, чем честное «TBD». */
    if (!EVENT.start || EVENT.dateMode === 'tbd') { datesTbd(); return; }
    datesTbd();
  }

  /* ─────────────────────────── live data ─────────────────────────── */
  function setDataStatus(text, mode) {
    var el = $('#data-text');
    if (el) el.textContent = text;
    var dot = $('#data-dot');
    if (dot) dot.className = 'status-dot' + (mode ? ' is-' + mode : '');
    var retry = $('#retry-data');
    if (retry) retry.hidden = mode !== 'offline';
    var status = $('#data-status');
    if (status) status.classList.toggle('is-loading', mode === 'loading');
  }

  function discTokens(d) {
    return [d.id, d.name, d.name + ' ' + d.mode, d.form, (d.aliases || []).join(' '), (RU_TERMS[d.id] || '')];
  }
  function parseDisciplines(raw) {
    var text = String(raw == null ? '' : raw).toLowerCase().replace(/ё/g, 'е').replace(/[×х]/g, 'x');
    if (!text.trim()) return [];
    text = text.replace(/кроме/g, ' ,except, ').replace(/(^|[^a-zа-я0-9])без/g, '$1 ,except, ');
    var tokens = text.split(/[,;/\n]+/).map(function (t) { return norm(t); }).filter(Boolean);
    var all = tokens.some(function (t) { return /^все/.test(t) || t === 'all' || t === 'everything'; });
    var ids = all ? DISC.map(function (d) { return d.id; }) : [];
    var excluding = false;
    tokens.forEach(function (t) {
      if (t === 'except' || t === 'без') { excluding = true; return; }
      /* Тир-матчинг: точное совпадение важнее вхождения. Иначе «Dota 2 | 1x1»
         цепляет и Dota 2 | 2x2 (общее имя), а «Minecraft PVP» — дуо-спидран. */
      var best = 0, hits = [];
      DISC.forEach(function (d) {
        var keys = discTokens(d).map(norm);
        var tier = 0;
        keys.forEach(function (k) {
          if (!k) return;
          if (t === k) tier = 3;
          else if (k.indexOf(t) >= 0 && t.length >= 4) tier = Math.max(tier, 2);
          else if (t.indexOf(k) >= 0 && k.length >= 5 && (k.indexOf(' ') >= 0 || /\d/.test(k))) tier = Math.max(tier, 1);
        });
        if (!tier) return;
        if (tier > best) { best = tier; hits = [d.id]; }
        else if (tier === best) hits.push(d.id);
      });
      hits.forEach(function (id) {
        if (excluding) ids = ids.filter(function (x) { return x !== id; });
        else if (ids.indexOf(id) < 0) ids.push(id);
      });
    });
    return ids;
  }
  function parseLive(resp) {
    var table = resp && (resp.table || (resp.data && resp.data.table));
    if (!table) table = resp;
    var rows = table && table.rows ? table.rows : [];
    if (!rows.length) return [];
    var out = [];
    rows.forEach(function (row, index) {
      var cells = row && row.c ? row.c : [];
      function cell(i) {
        var c = cells[i];
        if (!c) return '';
        return c.v != null ? c.v : (c.f != null ? c.f : '');
      }
      var stamp = cell(0), name = String(cell(1) || '').trim(), nick = String(cell(2) || '').trim();
      if (!name && !nick) return;
      if (/отметка|timestamp|время/i.test(stamp) && /фио|ник|имя/i.test(name)) return;
      var discRaw = cell(3);
      var quote = String(cell(5) || '').trim();
      var mc = String(cell(6) || '').trim();
      var cs = String(cell(7) || '').trim();
      var dota = String(cell(8) || '').trim();
      var n = nick || name.split(/\s+/)[0];
      var known = SNAP.filter(function (p) {
        return norm(p.nick) === norm(n) || norm(p.name) === norm(name) || (norm(p.nick) && norm(n).indexOf(norm(p.nick)) === 0);
      })[0];
      var pal = DATA.livePalette[index % DATA.livePalette.length];
      var id = known ? known.id : 'live-' + hash(name + '|' + n + '|' + index);
      var ds = parseDisciplines(discRaw);
      if (!ds.length && known) ds = known.disciplines.slice();
      out.push({
        id: id,
        name: name || n,
        nick: n,
        initials: known ? known.initials : initials(name || n),
        emoji: known ? known.emoji : pal[2],
        c1: known ? known.c1 : pal[0],
        c2: known ? known.c2 : pal[1],
        joined: stamp ? String(stamp) : '',
        quote: quote || (known ? known.quote : ''),
        disciplines: ds,
        partners: { minecraft: mc, cs2: cs, dota2: dota },
        aliases: known ? known.aliases : [name, n],
        live: true
      });
    });
    return out;
  }

  function loadLive(manual) {
    state.liveTries++;
    setDataStatus('Обновляю из Google Таблицы…', 'loading');
    var cb = 'gpGviz_' + Math.random().toString(36).slice(2, 11);
    var script = document.createElement('script');
    var done = false;
    var timer = setTimeout(fail, 12000);
    function cleanup() {
      clearTimeout(timer);
      try { delete window[cb]; } catch (e) { window[cb] = null; }
      if (script.parentNode) script.parentNode.removeChild(script);
    }
    function fail() {
      if (done) return;
      done = true;
      cleanup();
      setDataStatus('Таблица недоступна · снимок ' + state.players.length + ' ответов', 'offline');
      if (manual) toast('Не получилось достучаться до таблицы. Показываю снимок формы.', '📡');
    }
    window[cb] = function (resp) {
      if (done) return;
      done = true;
      cleanup();
      try {
        var players = parseLive(resp);
        if (players.length >= state.players.length) {
          state.players = players;
          state.source = 'live';
          state.liveAt = new Date();
          renderAll();
          setDataStatus('Google Таблица · ' + players.length + ' ответов · обновлено ' + mskClock() + ' MSK', '');
          if (manual) toast('Данные обновлены: <b>' + players.length + '</b> ' + plural(players.length, ['ответ', 'ответа', 'ответов']), '📥');
          sound(700, 0.05, 'sine', 0.02);
        } else {
          setDataStatus('Google Таблица · ' + players.length + ' ответов (снимок новее)', '');
        }
      } catch (e) {
        fail();
      }
    };
    script.onerror = fail;
    script.src = 'https://docs.google.com/spreadsheets/d/' + EVENT.sheetId + '/gviz/tq?tqx=responseHandler:' + cb + '&headers=1&t=' + Date.now();
    document.head.appendChild(script);
  }

  /* ─────────────────────────── render all ─────────────────────────── */
  function renderAll() {
    if (!state.players.length) state.players = SNAP.slice();
    applyRosterEdits();
    if (!playerById(state.duoA)) state.duoA = state.players[0].id;
    if (!playerById(state.duoB)) state.duoB = state.players[Math.min(1, state.players.length - 1)].id;
    renderTicker();
    renderDisc();
    fillBracketSelect();
    renderComp();
    renderRoster();
    renderMatrix();
    renderMatrixMode();
    fillDuoSelects();
    renderDuo();
    renderPairs();
    renderStats();
    renderSchedule();
    renderWishes();
    renderJoin();
    renderHeroNow();
    renderCloudUI();
    tickClocks();
  }

  /* ─────────────────────────── events ─────────────────────────── */
  function openSheet() {
    var sheet = $('#mobile-sheet'), scrim = $('#scrim'), btn = $('#menu-btn');
    if (!sheet) return;
    sheet.hidden = false; if (scrim) scrim.hidden = false;
    if (btn) { btn.setAttribute('aria-expanded', 'true'); }
    state.sheetOpen = true;
    sound(600, 0.05, 'sine', 0.02);
  }
  function closeSheet() {
    var sheet = $('#mobile-sheet'), scrim = $('#scrim'), btn = $('#menu-btn');
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true; if (scrim) scrim.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
    state.sheetOpen = false;
  }

  function handleAction(action, el) {
    switch (action) {
      case 'register': window.open(EVENT.formUrl, '_blank', 'noopener'); sound(660, 0.06, 'sine', 0.03); break;
      case 'palette': openPalette(); break;
      case 'lucky': randomPlayer(); break;
      case 'random-player': randomPlayer(); break;
      case 'random-duo': randomDuo(); break;
      case 'pick-duo': randomDuo(); break;
      case 'share': sharePage(); break;
      case 'share-bracket': shareCurrentBracket(); break;
      case 'share-duo': shareDuo(); break;
      case 'share-champ': shareCurrentBracket(); break;
      case 'shuffle-bracket': shuffleBracket(); break;
      case 'reset-bracket': resetBracket(); break;
      case 'auto-bracket': autoBracket(); break;
      case 'ics': downloadICS(); break;
      case 'dates': datesTbd(); break;
      case 'roster-edit': rosterModal(state.bracketId); break;
      case 'matrix-edit':
        state.matrixEdit = !state.matrixEdit;
        renderMatrixMode();
        sound(state.matrixEdit ? 660 : 420, 0.05, 'triangle', 0.03);
        if (state.matrixEdit) toast('Правка состава: клик по точке добавляет или убирает бойца из сетки', '👥');
        break;
      case 'cloud-panel': adminModal(); break;
      case 'cloud-retry': cloudRetryNow(); break;
      case 'admin-login': adminLoginModal(); break;
      case 'how-to-edit': howToEditModal(); break;
      case 'cloud-connect': {
        var el2 = $('#cloud-token');
        var val = el2 ? el2.value.trim() : '';
        if (!val) { toast('Вставь токен в поле выше', '🔑'); break; }
        CLOUD.cfg.token = val;
        cloudSaveCfg();
        cloudVerifyToken().then(function (u) {
          if (!u.canWrite) throw new Error('у токена нет права Contents: read and write');
          if (CLOUD.admins.indexOf(u.login) < 0) CLOUD.admins.unshift(u.login);
          CLOUD.status.shared = 'live';
          cloudSyncMode();
          CLOUD.status.error = '';
          return cloudPush('вход админа', true).then(function (ok) {
            if (!ok) throw new Error(CLOUD.status.error || 'не удалось сохранить');
            renderAll();
            renderCloudUI();
            closeModal();
            toast('Готово! Теперь ты можешь менять результаты — изменения увидят все', '🟢');
            window.setTimeout(function () { howToEditModal(); }, 500);
          });
        }).catch(function (e) {
          CLOUD.status.error = String(e && e.message || e);
          renderCloudUI();
          adminLoginModal();
          toast('Не получилось: ' + esc(CLOUD.status.error), '⚠️');
        });
        break;
      }
      case 'cloud-go-live': cloudGoLive(); break;
      case 'cloud-sync': cloudPush('ручная синхронизация', false); break;
      case 'cloud-pull':
        cloudPull(false).then(function (ok) {
          if (ok) { toast('Прочитал общие результаты (rev ' + CLOUD.status.rev + ')', '🌍'); refreshAdminModal(); }
        });
        break;
      case 'cloud-logout': cloudDisconnect(); refreshAdminModal(); break;
      case 'cloud-verify':
        cloudVerifyToken().then(function (u) {
          toast('Токен рабочий: <b>' + esc(u.login) + '</b>' + (u.canWrite ? ' · может писать' : ' · только чтение репозитория'), u.canWrite ? '🔑' : '⚠️');
          renderCloudUI(); refreshAdminModal();
        }).catch(function (e) { toast('Токен не подошёл: ' + esc(e.message), '⚠️'); });
        break;
      case 'cloud-backup': cloudBackup(); break;
      case 'admin-add': {
        var inp = $('#admin-login');
        if (inp && cloudAddAdmin(inp.value)) { inp.value = ''; refreshAdminModal(); toast('Админ добавлен — не забудь синхронизировать', '🛡️'); }
        break;
      }
      case 'admin-remove': if (el && el.dataset.login) { cloudRemoveAdmin(el.dataset.login); refreshAdminModal(); } break;
      case 'roster-reset-disc':
        if (guardReadonly('Сброс состава делает админ.')) break;
        resetRosterDisc(state.bracketId);
        renderAll();
        sound(380, 0.06, 'sine', 0.03);
        toast('Состав этой сетки вернулся к ответам формы', '↺');
        break;
      case 'roster-reset-all':
        if (guardReadonly('Сброс состава делает админ.')) break;
        resetRoster();
        renderAll();
        sound(380, 0.06, 'sine', 0.03);
        toast('Состав вернулся к ответам формы', '↺');
        break;
      case 'roster-reset-current':
        if (guardReadonly('Сброс состава делает админ.')) break;
        if (state.rosterModal && state.rosterModal.mode === 'disc') resetRosterDisc(state.rosterModal.id);
        else if (state.rosterModal) resetRoster(state.rosterModal.id);
        else resetRoster();
        renderAll();
        refreshRosterModal();
        sound(380, 0.06, 'sine', 0.03);
        toast('Ручные правки сброшены', '↺');
        break;
      case 'roster-share':
        copy('Раскладка состава GAMEpiada: ' + rosterShareUrl()).then(function () {
          toast(rosterEditCount() ? 'Ссылка на раскладку скопирована — открой её на другом устройстве' : 'Ссылка на состав скопирована', '🔗');
        });
        break;
      case 'close-modal': closeModal(); break;
      case 'board-auto': boardAuto(); break;
      case 'board-reset': boardReset(); break;
      case 'board-share': shareBoard(); break;
      case 'top': window.scrollTo({ top: 0, behavior: 'smooth' }); break;
      case 'open-champ': if (el && el.dataset.player) playerModal(el.dataset.player); break;
      case 'install': installApp(); break;
      case 'force-refresh': forceRefresh(); break;
      default: break;
    }
  }

  /* Кеш и service worker иногда держат старую версию сайта — даём кнопку «Обновить». */
  function forceRefresh() {
    var done = function () {
      var url = location.pathname + '?v=' + Date.now() + (location.hash || '');
      location.replace(url);
    };
    try {
      if (!('caches' in window) || !window.caches.keys) { done(); return; }
      window.caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) { return window.caches['delete'](k); }));
      }).then(function () {
        if (!navigator.serviceWorker || !navigator.serviceWorker.getRegistrations) { done(); return; }
        return navigator.serviceWorker.getRegistrations().then(function (rs) {
          return Promise.all(rs.map(function (r) { return r.unregister(); }));
        });
      }).then(done).catch(done);
    } catch (e) { done(); }
  }

  /* Новая версия service worker'а встала на место — перезагружаемся один раз,
     чтобы страница точно работала на свежих JS/CSS. */
  if ('serviceWorker' in navigator && navigator.serviceWorker.addEventListener) {
    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController) { hadController = true; return; }
      location.reload();
    });
  }

  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
  });
  function installApp() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () { deferredPrompt = null; });
    } else {
      toast('Открой меню браузера → «Добавить на главный экран». Сайт уже готов к установке.', '📱');
    }
  }

  document.addEventListener('click', function (e) {
    var actionEl = e.target.closest('[data-action]');
    if (actionEl) {
      handleAction(actionEl.getAttribute('data-action'), actionEl);
      return;
    }
    var discCard = e.target.closest('.disc-card');
    if (discCard) { discModal(discCard.getAttribute('data-disc-id')); return; }
    var playerCard = e.target.closest('.player-card');
    if (playerCard) { playerModal(playerCard.getAttribute('data-player')); return; }
    var leagueRow = e.target.closest('#league-table tr[data-player]');
    if (leagueRow) { playerModal(leagueRow.getAttribute('data-player')); return; }
    var rosterRow = e.target.closest('[data-roster-player][data-roster-disc]');
    if (rosterRow) { rosterToggleUI(rosterRow.getAttribute('data-roster-player'), rosterRow.getAttribute('data-roster-disc')); return; }
    var matrixDot = e.target.closest('.matrix-dot');
    if (matrixDot) {
      if (state.matrixEdit) { rosterToggleUI(matrixDot.getAttribute('data-player'), matrixDot.getAttribute('data-disc')); return; }
      playerModal(matrixDot.getAttribute('data-player')); return;
    }
    var mdRoster = e.target.closest('[data-md-roster]');
    if (mdRoster) { rosterModal(mdRoster.getAttribute('data-md-roster')); return; }
    var mdRosterPlayer = e.target.closest('[data-md-roster-player]');
    if (mdRosterPlayer) { playerRosterModal(mdRosterPlayer.getAttribute('data-md-roster-player')); return; }
    var pairCard = e.target.closest('.pair-card');
    if (pairCard) { setDuo(pairCard.getAttribute('data-pair-a'), pairCard.getAttribute('data-pair-b'), true); toast('Пара загружена в дуо-лаб', '🧬'); return; }
    var bar = e.target.closest('.bar-row');
    if (bar) { discModal(bar.getAttribute('data-disc-id')); return; }
    var leader = e.target.closest('.leader-row');
    if (leader) { playerModal(leader.getAttribute('data-player')); return; }
    var slot = e.target.closest('.slot[data-disc-id]');
    if (slot) { discModal(slot.getAttribute('data-disc-id')); return; }
    var like = e.target.closest('[data-like]');
    if (like) { toggleLike(like.getAttribute('data-like')); return; }
    var match = e.target.closest('#bracket-board .rr-row[data-entrant]');
    if (match) { pickBracket(match); return; }
    var boardRow = e.target.closest('[data-board-pick]');
    if (boardRow) { boardPick(boardRow.getAttribute('data-board-pick')); return; }
    var chartToggle = e.target.closest('[data-chart-toggle]');
    if (chartToggle) { state.chartOpen = !state.chartOpen; renderStats(); return; }
    var filter = e.target.closest('#disc-filters [data-filter]');
    if (filter) {
      state.filter = filter.getAttribute('data-filter');
      $$('#disc-filters .filter-chip').forEach(function (b) { b.classList.toggle('is-active', b === filter); });
      renderDisc(); sound(560, 0.04, 'sine', 0.02); return;
    }
    var sort = e.target.closest('#roster-sort [data-sort]');
    if (sort) {
      state.rosterSort = sort.getAttribute('data-sort');
      $$('#roster-sort button').forEach(function (b) { b.classList.toggle('is-active', b === sort); });
      renderRoster(); return;
    }
    var pal = e.target.closest('[data-pal]');
    if (pal) { runPaletteItem(Number(pal.getAttribute('data-pal'))); return; }
    var mdPlayer = e.target.closest('[data-md-player]');
    if (mdPlayer) { playerModal(mdPlayer.getAttribute('data-md-player')); return; }
    var mdDisc = e.target.closest('[data-md-disc]');
    if (mdDisc) { discModal(mdDisc.getAttribute('data-md-disc')); return; }
    var mdGrid = e.target.closest('[data-md-grid]');
    if (mdGrid) { closeModal(); setBracketDisc(mdGrid.getAttribute('data-md-grid')); var bs = $('#bracket'); if (bs) bs.scrollIntoView({ behavior: 'smooth' }); return; }
    var mdIcs = e.target.closest('[data-md-ics]');
    if (mdIcs) { downloadICS(mdIcs.getAttribute('data-md-ics')); return; }
    var mdShareDisc = e.target.closest('[data-md-share-disc]');
    if (mdShareDisc) {
      var dd = discById(mdShareDisc.getAttribute('data-md-share-disc'));
      copy(dd.name + ' ' + dd.mode + ' — GAMEpiada, слот ' + dd.order + ' (~' + dd.time + ' MSK, даты уточняются). ' + EVENT.siteUrl).then(function () { toast('Ссылка на дисциплину скопирована', '🔗'); });
      return;
    }
    var mdSharePlayer = e.target.closest('[data-md-share-player]');
    if (mdSharePlayer) {
      var pp = playerById(mdSharePlayer.getAttribute('data-md-share-player'));
      var link = EVENT.siteUrl.replace(/#.*$/, '') + '?p=' + encodeURIComponent(pp.id);
      copy(pp.nick + ' на арене GAMEpiada · ' + (pp.disciplines || []).length + ' дисциплин. ' + link).then(function () { toast('Ссылка на карточку бойца скопирована', '🔗'); });
      return;
    }
    var synergy = e.target.closest('[data-md-synergy]');
    if (synergy) {
      var id = synergy.getAttribute('data-md-synergy');
      var best = null;
      state.players.forEach(function (p) {
        if (p.id === id) return;
        var info = pairInfo(playerById(id), p);
        if (!best || info.score > best.score) best = { p: p, score: info.score };
      });
      if (best) { closeModal(); setDuo(id, best.p.id, true); toast('Лучшая пара для <b>' + esc(playerById(id).nick) + '</b> — <b>' + esc(best.p.nick) + '</b> (' + best.score + '%)', '🧬'); }
      return;
    }
    if (e.target.closest('#modal-close') || (e.target.id === 'modal')) { closeModal(); return; }
    if (e.target.id === 'palette') { closePalette(); return; }
    if (e.target.closest('#menu-btn')) { state.sheetOpen ? closeSheet() : openSheet(); return; }
    if (e.target.closest('#scrim')) { closeSheet(); return; }
    if (e.target.closest('#theme-toggle')) { toggleTheme(); return; }
    if (e.target.closest('#sound-toggle')) { toggleSound(); return; }
    if (e.target.closest('#palette-trigger')) { openPalette(); return; }
    if (e.target.closest('#refresh-data')) { loadLive(true); return; }
    if (e.target.closest('#retry-data')) { loadLive(true); return; }
    if (e.target.closest('a[href^="#"]')) { closeSheet(); }
  });

  document.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || tag === 'select';
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return; }
    if (e.key === 'Escape') {
      if (state.paletteOpen) closePalette();
      else if ($('#modal') && !$('#modal').hidden) closeModal();
      else if (state.sheetOpen) closeSheet();
      return;
    }
    if (!typing && e.key === '/') { e.preventDefault(); openPalette(); return; }
    if (state.paletteOpen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); state.paletteIndex = Math.min(state.paletteItems.length - 1, state.paletteIndex + 1); renderPalette(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); state.paletteIndex = Math.max(0, state.paletteIndex - 1); renderPalette(); }
      else if (e.key === 'Enter') { e.preventDefault(); runPaletteItem(state.paletteIndex); }
      return;
    }
    if (typing) return;
    var card = e.target.closest && e.target.closest('.disc-card,.player-card,.pair-card,#league-table tr[data-player]');
    if (card && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      if (card.classList.contains('disc-card')) discModal(card.getAttribute('data-disc-id'));
      else if (card.classList.contains('player-card') || card.tagName === 'TR') playerModal(card.getAttribute('data-player'));
      else setDuo(card.getAttribute('data-pair-a'), card.getAttribute('data-pair-b'), true);
    }
  });

  document.addEventListener('input', function (e) {
    if (e.target.id === 'disc-search') { state.discQuery = e.target.value; renderDisc(); }
    else if (e.target.id === 'roster-search') { state.rosterQuery = e.target.value; renderRoster(); }
    else if (e.target.id === 'palette-input') { state.paletteIndex = 0; renderPalette(); }
    else if (e.target.id === 'roster-modal-search' && state.rosterModal) { state.rosterModal.query = e.target.value; refreshRosterModal(); }
    else if (e.target.id === 'cloud-token') { CLOUD.cfg.token = e.target.value.trim(); cloudSaveCfg(); }
    else if (e.target.id === 'admin-login') { /* значение читаем по кнопке */ }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    if (e.target && e.target.id === 'cloud-token') {
      e.preventDefault();
      var connect = $('[data-action="cloud-connect"]');
      if (connect) { connect.click(); return; }
      CLOUD.cfg.token = e.target.value.trim();
      cloudSaveCfg();
      cloudVerifyToken().then(function (u) {
        toast('Токен рабочий: <b>' + esc(u.login) + '</b>' + (u.canWrite ? '' : ' · нет права на запись'), u.canWrite ? '🔑' : '⚠️');
        refreshAdminModal();
        renderCloudUI();
        if (u.canWrite && !cloudIsAdmin()) cloudGoLive().then(refreshAdminModal);
      }).catch(function (err) {
        CLOUD.status.error = String(err && err.message || err);
        toast('Токен не подошёл: ' + esc(CLOUD.status.error), '⚠️');
        refreshAdminModal();
      });
      return;
    }
    if (e.target && e.target.id === 'admin-login') {
      e.preventDefault();
      var b = $('[data-action="admin-add"]');
      if (b) b.click();
    }
  });

  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'cloud-import') { cloudImportFile(e.target.files && e.target.files[0]); return; }
    if (e.target.id === 'bracket-select') setBracketDisc(e.target.value);
    else if (e.target.id === 'duo-a') { state.duoA = e.target.value; renderDuo(); sound(600, 0.04, 'sine', 0.02); }
    else if (e.target.id === 'duo-b') { state.duoB = e.target.value; renderDuo(); sound(640, 0.04, 'sine', 0.02); }
    else if (e.target.classList && e.target.classList.contains('podium-select')) {
      var d = discById(state.bracketId);
      var place = Number(e.target.getAttribute('data-place'));
      var st = d ? boardState(d.id) : null;
      if (d && st) {
        var val = e.target.value;
        [1, 2, 3].forEach(function (p) { if (p !== place && st[p] === val) st[p] = ''; });
        st[place] = val;
        saveBoards();
        renderBoard(d);
        sound(val ? 640 : 380, 0.05, 'triangle', 0.03);
      }
    }
  });

  /* scroll & resize */
  var scrollRaf = 0;
  function onScroll() {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(function () {
      scrollRaf = 0;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? window.scrollY / max * 100 : 0;
      var bar = $('#scroll-progress i');
      if (bar) bar.style.setProperty('--w', pct.toFixed(2) + '%');
      var island = $('#island');
      if (island) island.classList.toggle('is-scrolled', window.scrollY > 24);
      if (state.sheetOpen && window.scrollY > 40) closeSheet();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  /* Линий между турами больше нет — на resize пересчитывать нечего. */

  /* reveal + counters + scroll spy */
  (function observables() {
    var reveals = $$('.reveal');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
      reveals.forEach(function (el) { io.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add('in'); });
    }

    var counters = $$('.count');
    function animateCounter(el) {
      if (el.dataset.done) return;
      el.dataset.done = '1';
      var target = Number(el.getAttribute('data-count') || el.textContent || 0);
      var start = 0;
      var dur = 1100;
      function step(now) {
        if (!start) start = now;
        var k = Math.min(1, Math.max(0, (now - start) / dur));
        var eased = 1 - Math.pow(1 - k, 3);
        el.textContent = String(Math.round(target * eased));
        if (k < 1) requestAnimationFrame(step);
        else el.textContent = String(target);
      }
      requestAnimationFrame(step);
    }
    if ('IntersectionObserver' in window) {
      var io2 = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { if (entry.isIntersecting) { animateCounter(entry.target); io2.unobserve(entry.target); } });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { io2.observe(el); });
    } else counters.forEach(animateCounter);

    var sections = ['home', 'disc', 'bracket', 'roster', 'duo', 'stats', 'schedule', 'wishes', 'rules', 'join'];
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        $$('.nav-link').forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + id); });
        $$('.dock-item').forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (id) { var el = document.getElementById(id); if (el) spy.observe(el); });
  })();

  /* boot */
  /* Первый контакт с общим состоянием: читаем файл, потом раз в 25 секунд
     подтягиваем свежее (только когда вкладка активна). */
  function cloudBootstrap() {
    cloudLoadCfg();
    if (!cloudReady()) { renderCloudUI(); return; }
    var load = cloudHasToken() && CLOUD.status.mode !== 'local'
      ? cloudFetchState(true).then(function (res) { return res && res.data ? cloudApply(res.data) : cloudPull(true); })
      : cloudPull(true);
    load.catch(function () { /* офлайн — работаем на локальных данных */ });
    if (CLOUD.pollTimer) clearInterval(CLOUD.pollTimer);
    CLOUD.pollTimer = setInterval(function () {
      if (document.hidden) return;
      if (CLOUD.status.syncing) return;
      cloudPull(true).then(function () {
        /* если в браузере остались неотправленные правки — отправляем сейчас */
        if (CLOUD.status.dirty && !CLOUD.status.syncing) scheduleCloudPush(400);
      });
    }, 25000);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden || !cloudReady() || CLOUD.status.syncing) return;
      cloudPull(true).then(function () {
        if (CLOUD.status.dirty && !CLOUD.status.syncing) scheduleCloudPush(400);
      });
    });
  }

  function init() {
    document.body.classList.toggle('is-muted', !state.sound);
    cloudLoadCfg();
    var soundBtn = $('#sound-toggle');
    if (soundBtn) soundBtn.setAttribute('aria-pressed', String(state.sound));
    var year = $('#year'); if (year) year.textContent = String(new Date().getFullYear());
    var themeMeta = $('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', state.theme === 'dark' ? '#04060d' : '#f6f2e9');
    var autoBtn = $('[data-action="auto-bracket"]');
    if (autoBtn && !autoBtn.dataset.label) autoBtn.dataset.label = autoBtn.innerHTML;
    $$('.reveal').forEach(function (el) { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in'); });
    if (state.fromUrlCode) {
      saveRosterEdits();
      try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* ignore */ }
      window.setTimeout(function () {
        toast('Состав загружен из ссылки: ' + rosterEditCount() + ' ' + plural(rosterEditCount(), ['правка', 'правки', 'правок']), '👥');
      }, 400);
    }
    renderAll();
    setDataStatus('Снимок формы · ' + state.players.length + ' ' + plural(state.players.length, ['ответ', 'ответа', 'ответов']), '');
    tickClocks();
    /* в фоновой вкладке часы и статус не пересчитываем — экономим батарею */
    setInterval(function () { if (!document.hidden) tickClocks(); }, 1000);
    cloudBootstrap();
    loadLive(false);
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(function () { /* ignore */ });
      });
    }
    window.GP = {
      state: state,
      openDisc: discModal,
      openPlayer: playerModal,
      setDuo: setDuo,
      refresh: function () { loadLive(true); },
      league: { tours: buildTours, standings: leagueStandings, totals: leagueTotals },
      cloud: {
        cfg: CLOUD.cfg, status: CLOUD.status,
        exportState: cloudExport, apply: cloudApply, merge: cloudMerge,
        pull: cloudPull, push: cloudPush, verify: cloudVerifyToken, goLive: cloudGoLive,
        setToken: function (t) { CLOUD.cfg.token = t || ''; cloudSaveCfg(); cloudSyncMode(); renderCloudUI(); },
        setMode: function (m) { CLOUD.status.mode = m; renderCloudUI(); },
        admins: function () { return CLOUD.admins.slice(); },
        addAdmin: cloudAddAdmin, log: function () { return CLOUD.log.slice(); }
      }
    };
    window.setTimeout(deepLink, 60);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
