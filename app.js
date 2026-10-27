/* ==========================================================================
   GAMEpiada · Celestial Arena — app v3
   Vanilla JS: рендер, фильтры, сетки, дуо-синергия, статистика,
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
    brackets: 'gamepiada-brackets-v3',
    bracketId: 'gamepiada-bracket-id'
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
  function mskToday() {
    try {
      return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' });
    } catch (e) {
      var d = new Date();
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }
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
  function dateLabel(iso) {
    if (!iso) return '';
    var p = String(iso).slice(0, 10).split('-');
    return p[2] + '.' + p[1];
  }
  var WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  function weekday(iso) {
    var p = String(iso).slice(0, 10).split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return WEEKDAYS[d.getDay()] || '';
  }
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
  function discStart(d) { return new Date(d.date + 'T' + d.start + ':00+03:00'); }
  function discEnd(d) { return new Date(d.date + 'T' + d.end + ':00+03:00'); }
  function durationMin(d) {
    var a = discStart(d), b = discEnd(d);
    return Math.max(0, Math.round((b - a) / 60000));
  }
  function dateBadge(d) {
    var today = mskToday();
    var now = Date.now();
    if (d.date === today) return { cls: 'today', text: discStart(d) <= now && now <= discEnd(d) ? 'Идёт' : 'Сегодня' };
    if (discEnd(d) < now) return { cls: 'catchup', text: 'Прошло' };
    var diff = (discStart(d) - now) / 86400000;
    if (diff <= 3) return { cls: 'soon', text: 'Скоро' };
    return { cls: '', text: dateLabel(d.date) };
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
    var savedBracketId = localStorage.getItem(LS.bracketId);
    if (savedBracketId && DISC.some(function (d) { return d.id === savedBracketId; })) state.bracketId = savedBracketId;
  } catch (e) { /* ignore */ }

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
  function saveBrackets() {
    try {
      localStorage.setItem(LS.brackets, JSON.stringify(state.brackets));
      localStorage.setItem(LS.bracketId, state.bracketId);
    } catch (e) { /* quota */ }
  }
  function bracketState(id) {
    if (!state.brackets[id]) {
      var st = { seed: hash(id), winners: {} };
      state.brackets[id] = st;
    }
    return state.brackets[id];
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
    var start = performance.now();
    function frame(now) {
      var dt = Math.min(32, now - start) / 16.7;
      confettiCtx.clearRect(0, 0, w, h);
      var alive = false;
      parts.forEach(function (p) {
        p.vy += 0.32 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        if (p.y < h + 40) alive = true;
        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate(p.rot);
        confettiCtx.globalAlpha = Math.max(0, 1 - (now - start) / 4200);
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        confettiCtx.restore();
      });
      if (alive && now - start < 4200) requestAnimationFrame(frame);
      else confettiCtx.clearRect(0, 0, w, h);
    }
    requestAnimationFrame(frame);
  }

  /* stars */
  (function stars() {
    var canvas = $('#stars');
    if (!canvas) return;
    var ctx = null;
    try { ctx = canvas.getContext('2d'); } catch (e) { ctx = null; }
    if (!ctx) return;
    var stars = [], w = 0, h = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    function size() {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = [];
      var n = Math.round(w * h / 16000);
      for (var i = 0; i < n; i++) {
        stars.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.3 + 0.25, a: Math.random() * 0.7 + 0.15, s: Math.random() * 0.02 + 0.004, p: Math.random() * Math.PI * 2 });
      }
    }
    size();
    window.addEventListener('resize', size);
    var last = 0;
    function loop(now) {
      if (now - last < 40) { requestAnimationFrame(loop); return; }
      last = now;
      ctx.clearRect(0, 0, w, h);
      var light = root.getAttribute('data-theme') === 'light';
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.p += s.s;
        var a = s.a * (0.6 + 0.4 * Math.sin(s.p));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = light ? 'rgba(120,95,40,' + (a * 0.5) + ')' : 'rgba(255,245,220,' + a + ')';
        ctx.fill();
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  })();

  /* cursor / spotlight / parallax */
  (function pointerFx() {
    var cursor = $('#cursor');
    var fine = true;
    try { fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches; } catch (e) { fine = false; }
    var x = 0, y = 0, moved = false, raf = 0;
    function frame() {
      raf = 0;
      if (cursor) cursor.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      root.style.setProperty('--mx', x + 'px');
      root.style.setProperty('--my', y + 'px');
    }
    window.addEventListener('pointermove', function (e) {
      x = e.clientX; y = e.clientY;
      if (!moved && cursor && fine) { cursor.classList.add('is-on'); moved = true; }
      if (!raf) raf = requestAnimationFrame(frame);
      var stage = e.target.closest ? e.target.closest('.hero-stage') : null;
      if (stage) {
        var r = stage.getBoundingClientRect();
        var rx = ((e.clientY - r.top) / r.height - 0.5) * -7;
        var ry = ((e.clientX - r.left) / r.width - 0.5) * 9;
        var core = $('#stage-core', stage);
        if (core) {
          core.style.setProperty('--rx', rx.toFixed(2) + 'deg');
          core.style.setProperty('--ry', ry.toFixed(2) + 'deg');
        }
        $$('.float-chip', stage).forEach(function (chip, i) {
          var depth = (i % 3 + 1) * 5;
          chip.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5) * depth * 2);
          chip.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5) * depth);
        });
      }
    }, { passive: true });
    window.addEventListener('pointerover', function (e) {
      if (!cursor || !fine) return;
      var hot = e.target.closest && e.target.closest('a,button,.disc-card,.player-card,.pair-card,.wish-card,[role="button"]');
      cursor.classList.toggle('is-hot', !!hot);
    });
    window.addEventListener('pointerout', function (e) {
      if (cursor && fine && !e.relatedTarget) cursor.classList.remove('is-hot');
    });
  })();

  /* tilt cards */
  document.addEventListener('pointermove', function (e) {
    var card = e.target.closest && e.target.closest('[data-tilt]');
    if (!card) return;
    var r = card.getBoundingClientRect();
    var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    card.style.setProperty('--rx', ((0.5 - py) * 7).toFixed(2) + 'deg');
    card.style.setProperty('--ry', ((px - 0.5) * 9).toFixed(2) + 'deg');
    card.style.setProperty('--ty', '-2px');
    card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
    card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
  }, { passive: true });
  document.addEventListener('pointerout', function (e) {
    var card = e.target.closest && e.target.closest('[data-tilt]');
    if (!card || (e.relatedTarget && card.contains(e.relatedTarget))) return;
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
    card.style.setProperty('--ty', '0px');
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
        ' <i>' + countFor(d.id) + '</i> · ' + dateLabel(d.date) + ' ' + d.start + '</span>';
    }).join('');
    host.innerHTML = items + items;
  }

  function renderHeroNow() {
    var now = Date.now();
    var active = DISC.filter(function (d) { return discStart(d) <= now && now <= discEnd(d); })[0];
    var next = DISC.filter(function (d) { return discStart(d) > now; }).sort(function (a, b) { return discStart(a) - discStart(b); })[0];
    var d = active || next || DISC[DISC.length - 1];
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
    if (time) time.textContent = (active ? 'идёт до ' + d.end : d.start + '–' + d.end) + ' MSK · ' + dateLabel(d.date);
    var count = $('#now-count');
    if (count) count.textContent = String(list.length);
  }

  function syncLivePill() {
    var pill = $('#live-pill'), text = $('#live-text');
    if (!pill || !text) return;
    var now = Date.now();
    var start = new Date(EVENT.start).getTime();
    var end = new Date(EVENT.end).getTime();
    pill.classList.remove('is-soon', 'is-ended');
    if (now < start) { pill.classList.add('is-soon'); text.textContent = 'Скоро'; }
    else if (now > end) { pill.classList.add('is-ended'); text.textContent = 'Финал'; }
    else { text.textContent = 'Live'; }
  }

  /* ─────────────────────────── disciplines ─────────────────────────── */
  function filteredDisc() {
    var today = mskToday();
    var q = norm(state.discQuery);
    return DISC.filter(function (d) {
      if (state.filter === 'today' && d.date !== today) return false;
      if (state.filter === 'solo' && d.type !== 'solo') return false;
      if (state.filter === 'duo' && d.type !== 'duo') return false;
      if (state.filter === 'bo3' && d.bo !== 'BO3') return false;
      if (q && !matchesDisc(d, q)) return false;
      return true;
    });
  }

  function renderDisc() {
    var grid = $('#disc-grid');
    if (!grid) return;
    var list = filteredDisc();
    grid.innerHTML = list.map(function (d, i) {
      var badge = dateBadge(d);
      var list = participants(d);
      var avatars = list.slice(0, 3).map(function (p) {
        return '<span class="avatar" style="--c1:' + p.c1 + ';--c2:' + p.c2 + '" title="' + esc(p.nick) + '"><span>' + esc(p.initials) + '</span></span>';
      }).join('');
      return '<article class="disc-card" data-disc-id="' + d.id + '" data-tilt tabindex="0" role="button" aria-label="' + esc(d.name + ' ' + d.mode + ', ' + d.format) + '" style="--a:' + d.accent + ';--b:' + d.accent2 + ';--i:' + i + '">' +
        '<span class="disc-watermark" aria-hidden="true">' + d.icon + '</span>' +
        '<div class="disc-top"><span class="disc-icon" aria-hidden="true">' + d.icon + '</span>' +
        '<span class="disc-status ' + badge.cls + '">' + badge.text + '</span></div>' +
        '<div class="disc-name">' + esc(d.name) + '<span>' + esc(d.mode) + '</span></div>' +
        '<div class="disc-meta"><span class="tag">' + dateLabel(d.date) + ' · ' + d.start + '</span><span class="tag">' + esc(d.format) + '</span><span class="tag is-gold">' + esc(d.bo) + '</span></div>' +
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
    var todayCount = DISC.filter(function (d) { return d.date === mskToday(); }).length;
    var duoCount = DISC.filter(function (d) { return d.type === 'duo'; }).length;
    var bo3Count = DISC.filter(function (d) { return d.bo === 'BO3'; }).length;
    var soloCount = DISC.length - duoCount;
    var map = { all: DISC.length, today: todayCount, solo: soloCount, duo: duoCount, bo3: bo3Count };
    $$('#disc-filters [data-filter-count]').forEach(function (el) {
      el.textContent = String(map[el.getAttribute('data-filter-count')] || 0);
    });
  }

  /* ─────────────────────────── bracket ─────────────────────────── */
  function buildRounds(d) {
    var st = bracketState(d.id);
    var pool = participants(d).map(function (p) { return p.id; });
    if (!pool.length) return [[{ a: null, b: null, winner: null }]];
    var size = 2;
    while (size < Math.max(2, pool.length)) size *= 2;
    var byes = size - pool.length;
    var order = seededShuffle(pool, st.seed);
    var first = [];
    // пустые слоты (bye) всегда в паре с бойцом — без «матчей» null vs null
    for (var b = 0; b < byes; b++) {
      var solo = order.pop();
      first.push(b % 2 ? { a: solo, b: null, winner: null } : { a: null, b: solo, winner: null });
    }
    while (order.length) first.push({ a: order.pop() || null, b: order.pop() || null, winner: null });
    first = seededShuffle(first, (st.seed ^ 0x9e3779b9) >>> 0);
    var rounds = [first];
    while (rounds[rounds.length - 1].length > 1) {
      var prev = rounds[rounds.length - 1], next = [];
      for (var j = 0; j < prev.length; j += 2) next.push({ a: null, b: null, winner: null });
      rounds.push(next);
    }
    rounds.forEach(function (matches, r) {
      matches.forEach(function (m, i) {
        if (r > 0) {
          var pa = rounds[r - 1][i * 2], pb = rounds[r - 1][i * 2 + 1];
          m.a = pa ? pa.winner : null;
          m.b = pb ? pb.winner : null;
        }
        if (m.a && !m.b) m.winner = m.a;
        else if (!m.a && m.b) m.winner = m.b;
        else if (m.a && m.b) {
          var pick = st.winners[r + '-' + i];
          if (pick === m.a || pick === m.b) m.winner = pick;
        }
      });
    });
    return rounds;
  }

  function roundLabel(count) {
    if (count === 1) return 'Финал';
    if (count === 2) return 'Полуфинал';
    if (count === 4) return '1/4 финала';
    if (count === 8) return '1/8 финала';
    return 'Раунд ' + count;
  }

  function matchRow(m, r, i, seed) {
    return [m.a, m.b].map(function (id, side) {
      var p = id ? playerById(id) : null;
      var win = id && m.winner === id;
      if (!p) {
        return '<div class="match-row is-empty"><span class="match-seed">' + (side === 0 ? seed : seed + 1) + '</span>' +
          '<span class="match-name">Ожидание</span><span class="match-bye">' + (side === 0 && m.b ? 'bye' : '') + '</span></div>';
      }
      return '<button class="match-row' + (win ? ' is-winner' : '') + '" type="button" data-player="' + p.id + '" data-key="' + r + '-' + i + '"' +
        (win ? ' aria-pressed="true"' : ' aria-pressed="false"') + ' title="' + esc(p.nick) + '">' +
        '<span class="match-seed">' + (side === 0 ? seed : seed + 1) + '</span>' +
        '<span class="match-name">' + esc(p.nick) + '</span>' +
        '<span class="match-score" aria-hidden="true">✓</span></button>';
    }).join('');
  }

  function renderBracket() {
    var d = discById(state.bracketId) || DISC[0];
    var rounds = buildRounds(d);
    var board = $('#bracket-board');
    if (!board) return;
    $$('.bracket-round', board).forEach(function (el) { el.parentNode.removeChild(el); });
    var lines = $('#bracket-lines');
    if (lines) lines.innerHTML = '';
    rounds.forEach(function (matches, r) {
      var wrap = document.createElement('div');
      wrap.className = 'bracket-round';
      wrap.setAttribute('data-round', r);
      var html = '<div class="round-label">' + roundLabel(matches.length) + '</div><div class="round-matches">';
      matches.forEach(function (m, i) {
        var seed = i * 2 + 1;
        html += '<div class="match' + (m.a && m.b ? '' : ' is-bye') + '" data-key="' + r + '-' + i + '">' + matchRow(m, r, i, seed) + '</div>';
      });
      html += '</div>';
      wrap.innerHTML = html;
      board.appendChild(wrap);
    });
    var title = $('#bracket-title');
    if (title) title.textContent = d.name + ' · ' + d.mode;
    var meta = $('#bracket-meta');
    if (meta) {
      meta.innerHTML = '<span class="tag"><b>' + dateLabel(d.date) + '</b> ' + d.start + '–' + d.end + ' MSK</span>' +
        '<span class="tag">' + esc(d.format) + '</span>' +
        '<span class="tag is-gold">' + esc(d.bo) + '</span>' +
        '<span class="tag">' + participants(d).length + ' ' + plural(participants(d).length, ['боец', 'бойца', 'бойцов']) + '</span>';
    }
    var playable = 0, decided = 0;
    rounds.forEach(function (matches) {
      matches.forEach(function (m) {
        if (m.a && m.b) { playable++; if (m.winner) decided++; }
      });
    });
    var prog = $('#bracket-progress'), fill = $('#bracket-progress-fill');
    if (prog) prog.textContent = decided + ' / ' + Math.max(playable, 1);
    if (fill) fill.style.setProperty('--w', Math.round(decided / Math.max(playable, 1) * 100) + '%');
    var sel = $('#bracket-select');
    if (sel && sel.value !== d.id) sel.value = d.id;
    requestAnimationFrame(function () { drawBracketLines(rounds); });
  }

  function drawBracketLines(rounds) {
    var board = $('#bracket-board');
    var svg = $('#bracket-lines');
    if (!board || !svg) return;
    var br = board.getBoundingClientRect();
    var width = board.scrollWidth, height = board.scrollHeight;
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    svg.style.width = width + 'px';
    svg.style.height = height + 'px';
    var paths = [];
    rounds.forEach(function (matches, r) {
      if (r >= rounds.length - 1) return;
      matches.forEach(function (m, i) {
        var el = $('.match[data-key="' + r + '-' + i + '"]', board);
        var next = $('.match[data-key="' + (r + 1) + '-' + Math.floor(i / 2) + '"]', board);
        if (!el || !next) return;
        var a = el.getBoundingClientRect(), b = next.getBoundingClientRect();
        var x1 = a.right - br.left, y1 = a.top + a.height / 2 - br.top;
        var x2 = b.left - br.left, y2 = b.top + b.height / 2 - br.top;
        var mid = x1 + Math.max(12, (x2 - x1) / 2);
        var path = 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' H' + mid.toFixed(1) + ' V' + y2.toFixed(1) + ' H' + x2.toFixed(1);
        paths.push('<path class="bracket-path' + (m.winner ? ' is-win' : '') + '" d="' + path + '"/>');
      });
    });
    svg.innerHTML = paths.join('');
  }

  function renderChampion() {
    var slot = $('#champion-slot');
    if (!slot) return;
    var d = discById(state.bracketId);
    var rounds = buildRounds(d);
    var final = rounds[rounds.length - 1][0];
    var champ = final.winner ? playerById(final.winner) : null;
    if (!champ) {
      slot.innerHTML = '<div class="champion-empty glass"><span class="ce-icon" aria-hidden="true">⚔️</span>' +
        '<div><b>Финал ещё не сыгран</b><span>Кликай по бойцам в сетке — или запусти автопрогноз.</span></div></div>';
      return;
    }
    slot.innerHTML = '<div class="champion-card">' +
      '<span class="champ-crown" aria-hidden="true">👑</span>' +
      '<span class="avatar champ-avatar" style="--c1:' + champ.c1 + ';--c2:' + champ.c2 + '"><span>' + esc(champ.initials) + '</span></span>' +
      '<div class="champ-body"><span class="champ-label">Чемпион · ' + esc(d.name) + ' ' + esc(d.mode) + '</span>' +
      '<div class="champ-name">' + esc(champ.nick) + '</div>' +
      '<div class="champ-sub">' + esc(champ.name) + ' · ' + dateLabel(d.date) + ' · ' + esc(d.format) + '</div></div>' +
      '<div class="champ-actions"><button class="btn btn-primary btn-sm" type="button" data-action="share-champ">Поделиться</button>' +
      '<button class="btn btn-ghost btn-sm" type="button" data-action="open-champ" data-player="' + champ.id + '">Профиль</button></div>' +
      '</div>';
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
    var d = discById(state.bracketId);
    if (!d) return;
    if (state.autoRunning) { cancelAuto(); toast('Автопрогноз остановлен', '⏹'); return; }
    state.autoRunning = true;
    var btn = $('[data-action="auto-bracket"]');
    if (btn) { btn.disabled = false; btn.innerHTML = '<span aria-hidden="true">⏹</span><span>Стоп</span>'; }
    var rounds = buildRounds(d);
    var step = function (r) {
      if (state.bracketId !== d.id) { cancelAuto(); return; }
      var nowRounds = buildRounds(d);
      if (r >= nowRounds.length) { finish(); return; }
      var st = bracketState(d.id);
      nowRounds[r].forEach(function (m, i) {
        if (m.a && m.b && !m.winner) {
          var a = (playerById(m.a) && playerById(m.a).disciplines || []).length;
          var b = (playerById(m.b) && playerById(m.b).disciplines || []).length;
          var pa = 0.5 + (a - b) / 60;
          st.winners[r + '-' + i] = Math.random() < pa ? m.a : m.b;
        }
      });
      saveBrackets();
      renderBracket(); renderChampion();
      sound(520 + r * 90, 0.05, 'triangle', 0.025);
      if (r < nowRounds.length - 1) autoTimer = setTimeout(function () { step(r + 1); }, 420);
      else finish();
    };
    var finish = function () {
      state.autoRunning = false;
      autoTimer = null;
      if (btn) { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
      var roundsNow = buildRounds(d);
      var final = roundsNow[roundsNow.length - 1][0];
      var champ = final.winner ? playerById(final.winner) : null;
      if (champ) { confetti(); chime(); toast('Автопрогноз готов: <b>' + esc(champ.nick) + '</b> забирает «' + esc(d.name) + ' ' + esc(d.mode) + '»', '👑'); }
    };
    step(0);
  }

  function pickBracket(btn) {
    var key = btn.getAttribute('data-key');
    var player = btn.getAttribute('data-player');
    if (!key || !player) return;
    var d = discById(state.bracketId);
    var rounds = buildRounds(d);
    var parts = key.split('-');
    var m = rounds[+parts[0]] && rounds[+parts[0]][+parts[1]];
    if (!m) return;
    if (!m.a || !m.b) { toast('Соперник ещё не определён — сначала доиграй предыдущий раунд', '⏳'); return; }
    var st = bracketState(d.id);
    if (st.winners[key] === player) delete st.winners[key];
    else st.winners[key] = player;
    saveBrackets();
    haptic(st.winners[key] ? 14 : 8);
    sound(st.winners[key] ? 720 : 380, 0.06, 'triangle', 0.03);
    renderBracket();
    renderChampion();
    var roundsNow = buildRounds(d);
    var final = roundsNow[roundsNow.length - 1][0];
    if (final.winner) { slotCelebrate(); }
  }
  var celebrated = {};
  function slotCelebrate() {
    var key = state.bracketId + ':' + buildRounds(discById(state.bracketId)).map(function (r) { return r.map(function (m) { return m.winner; }).join(','); }).join('|');
    if (celebrated[key]) return;
    celebrated[key] = true;
    confetti(); chime();
    var champ = playerById(buildRounds(discById(state.bracketId)).slice(-1)[0][0].winner);
    if (champ) toast('Чемпион «' + esc(discById(state.bracketId).name) + '» — <b>' + esc(champ.nick) + '</b>', '🏆');
  }

  function fillBracketSelect() {
    var sel = $('#bracket-select');
    if (!sel) return;
    sel.innerHTML = DISC.map(function (d) {
      return '<option value="' + d.id + '">' + d.icon + ' ' + esc(d.name) + ' · ' + esc(d.mode) + '</option>';
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
      var ds = (p.disciplines || []).map(discById).filter(Boolean).sort(function (a, b) { return countFor(b.id) - countFor(a.id); });
      var top = ds.slice(0, 3).map(function (d) { return '<span class="tag" style="border-color:' + d.accent + '44">' + d.icon + ' ' + esc(d.name) + ' ' + esc(d.mode) + '</span>'; }).join('');
      var more = ds.length > 3 ? '<span class="tag is-more">+' + (ds.length - 3) + '</span>' : '';
      var duoCount = ds.filter(function (d) { return d.type === 'duo'; }).length;
      var joined = parseStamp(p.joined);
      var rank = state.players.slice().sort(function (a, b) { return (b.disciplines || []).length - (a.disciplines || []).length; }).findIndex(function (x) { return x.id === p.id; }) + 1;
      return '<article class="player-card" data-player="' + p.id + '" data-tilt tabindex="0" role="button" aria-label="Профиль ' + esc(p.nick) + '" style="--c1:' + p.c1 + ';--c2:' + p.c2 + ';--i:' + i + '">' +
        '<span class="pl-rank">#' + rank + '</span>' +
        '<div class="pl-top"><span class="avatar pl-avatar" style="--c1:' + p.c1 + ';--c2:' + p.c2 + '"><span>' + esc(p.initials) + '</span></span>' +
        '<div class="pl-id"><div class="pl-nick">' + esc(p.nick) + '</div><div class="pl-name">' + esc(p.name) + '</div></div>' +
        '<div class="pl-count"><b>' + ds.length + '</b><span>арен</span></div></div>' +
        '<div class="pl-bar"><i style="--w:' + Math.round(ds.length / DISC.length * 100) + '%"></i></div>' +
        '<div class="pl-tags">' + top + more + '</div>' +
        '<p class="pl-quote">' + (p.quote ? '«' + esc(p.quote) + '»' : 'Без пожеланий — просто пришёл побеждать.') + '</p>' +
        '<div class="pl-foot"><span>в игре с <b>' + (joined ? mskShort(joined) : '—') + '</b></span><span>' + duoCount + ' ' + plural(duoCount, ['дуо', 'дуо', 'дуо']) + ' · ' + (p.partners && (p.partners.minecraft || p.partners.cs2 || p.partners.dota2) ? 'есть тиммейт' : 'ищет пару') + '</span></div>' +
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
  }

  var NUM_WORDS = ['Ноль', 'Один', 'Два', 'Три', 'Четыре', 'Пять', 'Шесть', 'Семь', 'Восемь', 'Девять', 'Десять', 'Одиннадцать', 'Двенадцать'];
  var ORD_WORDS = ['нулевым', 'первым', 'вторым', 'третьим', 'четвёртым', 'пятым', 'шестым', 'седьмым', 'восьмым', 'девятым', 'десятым', 'одиннадцатым', 'двенадцатым'];
  function numberWord(n) { return NUM_WORDS[n] || String(n); }
  function ordinalWord(n) { return ORD_WORDS[n] || String(n) + '-м'; }

  function renderMatrix() {
    var host = $('#matrix-scroll');
    if (!host) return;
    var head = '<thead><tr><th>Дисциплина</th>' + state.players.map(function (p) {
      return '<th><div class="mx-player"><span class="avatar" style="--c1:' + p.c1 + ';--c2:' + p.c2 + '"><span>' + esc(p.initials) + '</span></span><span>' + esc(p.nick) + '</span></div></th>';
    }).join('') + '</tr></thead>';
    var today = mskToday();
    var body = '<tbody>' + DISC.map(function (d) {
      return '<tr' + (d.date === today ? ' class="is-today"' : '') + '><th><div class="mx-disc"><i aria-hidden="true">' + d.icon + '</i>' + esc(d.name) + ' ' + esc(d.mode) + '<small>' + dateLabel(d.date) + '</small></div></th>' +
        state.players.map(function (p) {
          var on = (p.disciplines || []).indexOf(d.id) >= 0;
          return '<td><button class="matrix-dot' + (on ? ' on' : '') + '" type="button" data-player="' + p.id + '" data-disc="' + d.id + '" style="--c1:' + p.c1 + ';--c2:' + p.c2 + '" aria-label="' + esc((on ? 'Да: ' : 'Нет: ') + p.nick + ' · ' + d.name + ' ' + d.mode) + '"></button></td>';
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
        return d ? '<span class="tag">' + d.icon + ' ' + esc(d.name) + '</span>' : '';
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
  function renderSchedule() {
    var host = $('#timeline');
    if (!host) return;
    var groups = new Map();
    DISC.slice().sort(function (a, b) { return discStart(a) - discStart(b); }).forEach(function (d) {
      if (!groups.has(d.date)) groups.set(d.date, []);
      groups.get(d.date).push(d);
    });
    var endDay = (EVENT.end || '').slice(0, 10);
    if (endDay && !groups.has(endDay)) groups.set(endDay, []);
    var today = mskToday();
    host.innerHTML = Array.from(groups.entries()).map(function (entry) {
      var date = entry[0], list = entry[1];
      var dt = new Date(date + 'T12:00:00+03:00');
      return '<div class="day-card' + (date === today ? ' is-today' : '') + '">' +
        '<div class="day-head"><span class="day-num">' + date.slice(8, 10) + '</span><span class="day-name">' + weekday(date) + ' · ' + date.slice(5, 7) + '</span>' +
        '<span class="day-count">' + (list.length ? list.length + ' ' + plural(list.length, ['старт', 'старта', 'стартов']) : 'резерв') + (date === today ? ' · сегодня' : '') + '</span></div>' +
        '<div class="day-list">' + (list.length ? list.map(function (d) {
          return '<button class="slot" type="button" data-disc-id="' + d.id + '" style="--a:' + d.accent + '">' +
            '<span class="slot-time">' + d.start + '</span><span class="slot-icon" aria-hidden="true">' + d.icon + '</span>' +
            '<span class="slot-name">' + esc(d.name) + ' ' + esc(d.mode) + '<small>' + esc(d.format) + '</small></span>' +
            '<span class="slot-dur">' + durationMin(d) + 'м</span></button>';
        }).join('') : '<div class="slot-catchup"><span class="slot-time">ALL DAY</span><span class="slot-icon" aria-hidden="true">⏳</span><span class="slot-name">Окно доигрывания<small>перенесённые матчи · по согласованию</small></span><span class="slot-dur">1д</span></div>') + '</div></div>';
    }).join('');

    var now = Date.now();
    var upcoming = DISC.slice().sort(function (a, b) { return discStart(a) - discStart(b); }).filter(function (d) { return discEnd(d) > now; });
    var next = upcoming[0] || DISC.slice().sort(function (a, b) { return discEnd(a) - discEnd(b); }).slice(-1)[0];
    var nextBox = $('#next-event');
    if (nextBox && next) {
      nextBox.innerHTML = '<span class="ne-label"><i class="status-dot" aria-hidden="true"></i> ' + (discStart(next) <= now && now <= discEnd(next) ? 'идёт сейчас' : 'следующий старт') + '</span>' +
        '<b>' + next.icon + ' ' + esc(next.name) + ' ' + esc(next.mode) + '</b>' +
        '<span>' + dateLabel(next.date) + ' · ' + next.start + '–' + next.end + ' MSK · ' + esc(next.format) + '</span>';
    }
  }

  function fmtDelta(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    return (d > 0 ? d + 'д ' : '') + pad(h) + ':' + pad(m) + ':' + pad(sec);
  }
  function tickClocks() {
    var clock = $('#event-clock');
    if (clock) clock.innerHTML = mskClock() + '<small>MSK</small>';
    var now = Date.now();
    var end = new Date(EVENT.end).getTime();
    var start = new Date(EVENT.start).getTime();
    var left = end - now;
    var label = now < start ? 'до старта' : left > 0 ? 'до финала' : 'турнир завершён';
    var val = now < start ? fmtDelta(start - now) : left > 0 ? fmtDelta(left) : '00:00:00';
    var cd = $('#event-countdown'); if (cd) cd.textContent = val;
    var jt = $('#join-timer'); if (jt) jt.textContent = val;
    var jl = $('#join-timer') && $('#join-timer').parentNode && $('#join-timer').parentNode.querySelector('small');
    if (jl) jl.textContent = label;
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
    if (status) status.textContent = Date.now() > new Date(EVENT.end).getTime() ? 'заявки закрыты' : 'заявки открыты';
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
    var badge = dateBadge(d);
    var html = '<div class="md-hero" style="--a:' + d.accent + ';--b:' + d.accent2 + '">' +
      '<span class="md-icon" aria-hidden="true">' + d.icon + '</span>' +
      '<div><span class="md-kicker">' + dateLabel(d.date) + ' · ' + d.start + '–' + d.end + ' MSK · ' + badge.text + '</span>' +
      '<h3 class="md-title">' + esc(d.name) + ' <span style="color:' + d.accent + '">' + esc(d.mode) + '</span></h3>' +
      '<div class="md-sub">' + esc(d.format) + ' · ' + esc(d.bo) + ' · ' + (d.type === 'duo' ? 'дуо-режим' : 'соло') + '</div></div></div>' +
      '<div class="md-meta"><div class="md-meta-item"><small>дата</small><b>' + weekday(d.date) + ', ' + dateLabel(d.date) + '</b></div>' +
      '<div class="md-meta-item"><small>время</small><b>' + d.start + '–' + d.end + ' MSK</b></div>' +
      '<div class="md-meta-item"><small>формат</small><b>' + esc(d.bo) + ' · ' + (durationMin(d)) + ' мин</b></div>' +
      '<div class="md-meta-item"><small>участники</small><b>' + list.length + ' из ' + state.players.length + '</b></div></div>' +
      '<div class="md-section"><h4>Правила</h4><div class="md-rules">' + esc(d.rules) + '</div></div>' +
      '<div class="md-section"><h4>Заявились</h4><div class="md-people">' + (list.length ? list.map(function (p) {
        return '<button class="md-person" type="button" data-md-player="' + p.id + '"><span class="avatar" style="--c1:' + p.c1 + ';--c2:' + p.c2 + '"><span>' + esc(p.initials) + '</span></span>' + esc(p.nick) + '</button>';
      }).join('') : '<span class="modal-info">Пока никто — стань первым.</span>') + '</div></div>' +
      '<div class="md-actions"><button class="btn btn-primary" type="button" data-md-grid="' + d.id + '">Открыть сетку</button>' +
      '<button class="btn btn-ghost" type="button" data-md-share-disc="' + d.id + '">Поделиться</button>' +
      '<button class="btn btn-ghost" type="button" data-md-ics="' + d.id + '">В календарь</button></div>';
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
      '<h3 class="md-title">' + esc(p.nick) + '</h3><div class="md-sub">' + esc(p.name) + (joined ? ' · в игре с ' + mskShort(joined) : '') + '</div></div></div>' +
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
      '<button class="btn btn-ghost" type="button" data-md-share-player="' + p.id + '">Поделиться</button></div>';
    openModal(html);
  }

  /* ─────────────────────────── palette ─────────────────────────── */
  var PALETTE_ACTIONS = [
    { name: 'Заявка на турнир', type: 'Действие', icon: '🏆', hint: 'форма', run: function () { window.open(EVENT.formUrl, '_blank', 'noopener'); } },
    { name: 'Случайный боец', type: 'Действие', icon: '🎯', hint: 'рандом', run: function () { randomPlayer(); } },
    { name: 'Случайное дуо', type: 'Действие', icon: '🧬', hint: 'рандом', run: function () { randomDuo(); } },
    { name: 'Автопрогноз сетки', type: 'Действие', icon: '⚡', hint: 'сетка', run: function () { autoBracket(); } },
    { name: 'Перемешать пары', type: 'Действие', icon: '🔀', hint: 'сетка', run: function () { shuffleBracket(); } },
    { name: 'Сбросить сетку', type: 'Действие', icon: '↺', hint: 'сетка', run: function () { resetBracket(); } },
    { name: 'Добавить расписание в календарь', type: 'Действие', icon: '📅', hint: 'ics', run: function () { downloadICS(); } },
    { name: 'Копировать ссылку', type: 'Действие', icon: '🔗', hint: 'share', run: function () { sharePage(); } },
    { name: 'Сменить тему', type: 'Действие', icon: '🌗', hint: 'тема', run: function () { toggleTheme(); } },
    { name: 'Звук вкл/выкл', type: 'Действие', icon: '🔊', hint: 'звук', run: function () { toggleSound(); } },
    { name: 'Наверх', type: 'Действие', icon: '↑', hint: 'скролл', run: function () { window.scrollTo({ top: 0, behavior: 'smooth' }); } }
  ];

  function paletteSource() {
    var items = [];
    DISC.forEach(function (d) {
      items.push({ name: d.name + ' · ' + d.mode, type: 'Дисциплина', icon: d.icon, hint: dateLabel(d.date) + ' ' + d.start, kw: discKeys(d), run: function () { discModal(d.id); } });
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
    }).join('') : '<div class="pal-empty">Ничего не нашлось. Попробуй «дота», «сетка», «Сева» или «календарь».</div>';
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
  function shuffleBracket() {
    cancelAuto();
    var d = discById(state.bracketId);
    if (!d) return;
    var st = bracketState(d.id);
    st.seed = (st.seed * 1664525 + 1013904223) >>> 0;
    st.winners = {};
    saveBrackets();
    renderBracket(); renderChampion();
    sound(460, 0.07, 'triangle', 0.03);
    toast('Пары «' + esc(d.name) + ' ' + esc(d.mode) + '» пересобраны', '🔀');
  }
  function resetBracket() {
    cancelAuto();
    var d = discById(state.bracketId);
    if (!d) return;
    bracketState(d.id).winners = {};
    saveBrackets();
    renderBracket(); renderChampion();
    sound(360, 0.07, 'sine', 0.03);
    toast('Сетка «' + esc(d.name) + ' ' + esc(d.mode) + '» сброшена', '↺');
  }
  function setBracketDisc(id) {
    if (!discById(id)) return;
    cancelAuto();
    state.bracketId = id;
    saveBrackets();
    var sel = $('#bracket-select');
    if (sel) sel.value = id;
    renderBracket(); renderChampion();
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
  function shareCurrentBracket() {
    var d = discById(state.bracketId);
    if (!d) return;
    var rounds = buildRounds(d);
    var champ = rounds[rounds.length - 1][0].winner;
    var p = champ ? playerById(champ) : null;
    var text = 'Сетка GAMEpiada · ' + d.name + ' ' + d.mode + (p ? ' — чемпион: ' + p.nick : '') + '. Собери свою: ';
    copy(text + EVENT.siteUrl + '#bracket').then(function (ok) {
      toast(ok ? 'Сетка скопирована' : 'Ссылка: ' + EVENT.siteUrl + '#bracket', '🏟️');
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
  function downloadICS(id) {
    var list = id ? [discById(id)].filter(Boolean) : DISC;
    function stamp(d) {
      var t = new Date(d.getTime() + 3 * 3600000);
      return t.getUTCFullYear() + pad(t.getUTCMonth() + 1) + pad(t.getUTCDate()) + 'T' + pad(t.getUTCHours()) + pad(t.getUTCMinutes()) + '00Z';
    }
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GAMEpiada//Tournament//RU', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:GAMEpiada'];
    list.forEach(function (d) {
      lines.push('BEGIN:VEVENT');
      lines.push('UID:' + d.id + '-gamepiada@tournaments');
      lines.push('DTSTAMP:' + stamp(new Date()));
      lines.push('DTSTART:' + stamp(discStart(d)));
      lines.push('DTEND:' + stamp(discEnd(d)));
      lines.push('SUMMARY:' + d.name + ' ' + d.mode + ' — GAMEpiada');
      lines.push('DESCRIPTION:' + (d.format + ' · ' + d.bo + '. ' + d.rules).replace(/\n/g, ' '));
      lines.push('LOCATION:Discord GAMEpiada');
      lines.push('URL:' + EVENT.siteUrl);
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    try {
      var blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = id ? 'gamepiada-' + id + '.ics' : 'gamepiada-2026.ics';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 500);
      toast('Файл календаря готов', '📅');
      sound(760, 0.06, 'sine', 0.03);
    } catch (e) { toast('Не удалось собрать календарь', 'ℹ️'); }
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
    if (!playerById(state.duoA)) state.duoA = state.players[0].id;
    if (!playerById(state.duoB)) state.duoB = state.players[Math.min(1, state.players.length - 1)].id;
    renderTicker();
    renderDisc();
    fillBracketSelect();
    renderBracket();
    renderChampion();
    renderRoster();
    renderMatrix();
    fillDuoSelects();
    renderDuo();
    renderPairs();
    renderStats();
    renderSchedule();
    renderWishes();
    renderJoin();
    renderHeroNow();
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
      case 'top': window.scrollTo({ top: 0, behavior: 'smooth' }); break;
      case 'open-champ': if (el && el.dataset.player) playerModal(el.dataset.player); break;
      case 'install': installApp(); break;
      default: break;
    }
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
    var matrixDot = e.target.closest('.matrix-dot');
    if (matrixDot) { playerModal(matrixDot.getAttribute('data-player')); return; }
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
    var match = e.target.closest('#bracket-board .match-row[data-player]');
    if (match) { pickBracket(match); return; }
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
      copy(dd.name + ' ' + dd.mode + ' — GAMEpiada, ' + dateLabel(dd.date) + ' в ' + dd.start + ' MSK. ' + EVENT.siteUrl).then(function () { toast('Ссылка на дисциплину скопирована', '🔗'); });
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
    var card = e.target.closest && e.target.closest('.disc-card,.player-card,.pair-card');
    if (card && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      if (card.classList.contains('disc-card')) discModal(card.getAttribute('data-disc-id'));
      else if (card.classList.contains('player-card')) playerModal(card.getAttribute('data-player'));
      else setDuo(card.getAttribute('data-pair-a'), card.getAttribute('data-pair-b'), true);
    }
  });

  document.addEventListener('input', function (e) {
    if (e.target.id === 'disc-search') { state.discQuery = e.target.value; renderDisc(); }
    else if (e.target.id === 'roster-search') { state.rosterQuery = e.target.value; renderRoster(); }
    else if (e.target.id === 'palette-input') { state.paletteIndex = 0; renderPalette(); }
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'bracket-select') setBracketDisc(e.target.value);
    else if (e.target.id === 'duo-a') { state.duoA = e.target.value; renderDuo(); sound(600, 0.04, 'sine', 0.02); }
    else if (e.target.id === 'duo-b') { state.duoB = e.target.value; renderDuo(); sound(640, 0.04, 'sine', 0.02); }
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
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { drawBracketLines(buildRounds(discById(state.bracketId))); }, 160);
  });

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
      var start = performance.now();
      var dur = 1100;
      function step(now) {
        var k = Math.min(1, (now - start) / dur);
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
  function init() {
    document.body.classList.toggle('is-muted', !state.sound);
    var soundBtn = $('#sound-toggle');
    if (soundBtn) soundBtn.setAttribute('aria-pressed', String(state.sound));
    var year = $('#year'); if (year) year.textContent = String(new Date().getFullYear());
    var themeMeta = $('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', state.theme === 'dark' ? '#04060d' : '#f6f2e9');
    var autoBtn = $('[data-action="auto-bracket"]');
    if (autoBtn && !autoBtn.dataset.label) autoBtn.dataset.label = autoBtn.innerHTML;
    $$('.reveal').forEach(function (el) { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in'); });
    renderAll();
    setDataStatus('Снимок формы · ' + state.players.length + ' ' + plural(state.players.length, ['ответ', 'ответа', 'ответов']), '');
    tickClocks();
    setInterval(tickClocks, 1000);
    loadLive(false);
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () { /* ignore */ });
      });
    }
    window.GP = { state: state, openDisc: discModal, openPlayer: playerModal, setDuo: setDuo, refresh: function () { loadLive(true); } };
    window.setTimeout(deepLink, 60);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
