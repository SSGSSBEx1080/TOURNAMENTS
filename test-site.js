/* GAMEpiada · jsdom smoke / regression harness
   Запуск: node test-site.js   (нужен devDependency jsdom)
   Проверяет рендер, фильтры, сетку, дуо, статистику, палитру и live-парсинг. */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const root = __dirname;
let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; console.log('PASS · ' + name + (detail ? ' · ' + String(detail).replace(/\s+/g, ' ').slice(0, 90) : '')); }
  else { fail++; failures.push(name + (detail ? ' · ' + detail : '')); console.log('FAIL · ' + name + (detail ? ' · ' + String(detail).replace(/\s+/g, ' ').slice(0, 160) : '')); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e && e.message)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

  const dom = new JSDOM(html, {
    url: 'https://ssgssbex1080.github.io/TOURNAMENTS/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole: vc
  });
  const { window } = dom;
  const { document } = window;
  const $ = (s, scope) => (scope || document).querySelector(s);
  const $$ = (s, scope) => Array.from((scope || document).querySelectorAll(s));
  const qa = (s) => $$(s).length;

  // ── environment stubs ──────────────────────────────────────────────
  window.matchMedia = window.matchMedia || function () {
    return { matches: false, media: '', addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} };
  };
  window.IntersectionObserver = class {
    constructor(cb) { this.cb = cb; }
    observe(el) { this.cb([{ target: el, isIntersecting: true, intersectionRatio: 1 }], this); }
    unobserve() {} disconnect() {}
  };
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.requestAnimationFrame = (cb) => window.setTimeout(() => cb(window.performance.now()), 0);
  window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  window.HTMLCanvasElement.prototype.getContext = () => null;
  window.scrollTo = () => {};
  window.Element.prototype.scrollIntoView = () => {};
  window.open = () => null;
  try { window.navigator.clipboard = { writeText: () => Promise.resolve() }; } catch (e) {}
  window.URL.createObjectURL = () => 'blob:test';
  window.URL.revokeObjectURL = () => {};
  document.execCommand = () => true;
  window.onerror = (msg) => errors.push('window.onerror: ' + msg);

  const liveScripts = [];
  const fakeRows = [];
  const origAppend = document.head.appendChild.bind(document.head);
  document.head.appendChild = (node) => {
    if (node && node.tagName === 'SCRIPT' && /gviz\/tq/.test(node.src || '')) {
      liveScripts.push(node.src);
      const cb = (node.src.match(/responseHandler:([^&]+)/) || [])[1];
      window.setTimeout(() => { if (cb && typeof window[cb] === 'function') window[cb](buildFake()); }, 350);
      return node;
    }
    return origAppend(node);
  };

  window.eval(fs.readFileSync(path.join(root, 'data.js'), 'utf8'));
  window.eval(fs.readFileSync(path.join(root, 'app.js'), 'utf8'));
  await sleep(220);

  const D = window.GP_DATA;
  const TOTAL_SNAP = D.players.reduce((s, p) => s + p.disciplines.length, 0);

  function buildFake() {
    const rows = D.players.map((p) => {
      const forms = p.disciplines.map((id) => (D.disciplines.find((d) => d.id === id) || {}).form || id).join(', ');
      const t = new Date(p.joined);
      const stamp = t.getUTCDate().toString().padStart(2, '0') + '.' + (t.getUTCMonth() + 1).toString().padStart(2, '0') + '.' +
        t.getUTCFullYear() + ' ' + t.getUTCHours() + ':' + String(t.getUTCMinutes()).padStart(2, '0') + ':00';
      const cells = [stamp, p.name, p.nick, forms, 'ДА, я понял всё', p.quote, p.partners.minecraft, p.partners.cs2, p.partners.dota2]
        .map((v) => ({ v, f: v }));
      return { c: cells };
    });
    // девятый ответ: проверяем парсинг «все, кроме …» и появление нового бойца
    rows.push({
      c: [
        '27.10.2026 19:23:00', 'Тест Тестович', 'TestNick', 'Dota 2 | 1х1, Шахматы, Brawl Stars', 'ДА, я понял всё', 'Проверка live-синка', 'Сева', 'Хз', 'Хз'
      ].map((v) => ({ v, f: v }))
    });
    rows.push({ c: [{ v: '27.10.2026 19:30:00' }, { v: 'Все, кроме fn, mk' }, { v: 'AllNick' }, { v: 'все, кроме fn, mk' }, { v: 'ДА' }, { v: '' }, { v: '' }, { v: '' }, { v: '' }] });
    // ловушка для матчера: «Dota 2 | 2х2» не должен цеплять Dota 2 | 1х1,
    // а «Minecraft PVP» — дуо-спидран
    rows.push({ c: [{ v: '27.10.2026 19:40:00' }, { v: 'Проверка Парсера' }, { v: 'ParserProbe' }, { v: 'Dota 2 | 2х2, Minecraft PVP 1v1' }, { v: 'ДА' }, { v: '' }, { v: '' }, { v: '' }, { v: '' }] });
    return {
      status: 'ok',
      table: {
        cols: ['Отметка времени', 'ФИО', 'Ник', 'Дисциплины', 'Согласие', 'Пожелания', 'Minecraft', 'CS2', 'Dota 2'].map((label) => ({ label })),
        rows
      }
    };
  }

  // ── snapshot render ────────────────────────────────────────────────
  check('disc cards = 17', qa('#disc-grid .disc-card') === 17, qa('#disc-grid .disc-card'));
  check('matrix rows = 17', qa('#matrix-scroll tbody tr') === 17, qa('#matrix-scroll tbody tr'));
  check('matrix cells on = total', qa('#matrix-scroll .matrix-dot.on') === TOTAL_SNAP, qa('#matrix-scroll .matrix-dot.on') + ' / ' + TOTAL_SNAP);
  check('bracket rounds = 3', qa('#bracket-board .bracket-round') === 3, qa('#bracket-board .bracket-round'));
  check('bracket lines', ($('#bracket-lines').innerHTML || '').includes('bracket-path'), ($('#bracket-lines').innerHTML || '').length + ' chars');
  check('roster cards = 8', qa('#roster-grid .player-card') === 8, qa('#roster-grid .player-card'));
  check('leader rows = 8', qa('#leader-list .leader-row') === 8, qa('#leader-list .leader-row'));
  check('wishes = 8', qa('#wishes-wall .wish-card') === 8, qa('#wishes-wall .wish-card'));
  check('timeline days = 6', qa('#timeline .day-card') === 6, qa('#timeline .day-card'));
  check('catch-up row', ($('#timeline .day-card:last-child').textContent || '').includes('Окно доигрывания'), 'ok');
  check('schedule slots = 17', qa('#timeline .slot[data-disc-id]') === 17, qa('#timeline .slot[data-disc-id]'));
  check('bar rows = 10', qa('#bar-chart .bar-row') === 10, qa('#bar-chart .bar-row'));
  check('top bar is Dota', /Dota 2/.test($('#bar-chart .bar-row').textContent) && /7 · 88%/.test($('#bar-chart .bar-row').textContent), $('#bar-chart .bar-row').textContent.replace(/\s+/g, ' '));
  check('stats total = 88', $('#stats-total').textContent === String(TOTAL_SNAP), $('#stats-total').textContent);
  check('mini reg = 88', $('#mini-registrations').textContent === String(TOTAL_SNAP), $('#mini-registrations').textContent);
  check('donut solo/duo', $('#donut-solo').textContent === '69' && $('#donut-duo').textContent === '19', $('#donut-solo').textContent + '/' + $('#donut-duo').textContent);
  check('facts = 3', qa('#facts-row .fact') === 3, qa('#facts-row .fact'));
  check('pairs >= 3', qa('#pairs-grid .pair-card') >= 3, qa('#pairs-grid .pair-card'));
  check('duo score > 0', parseInt($('#synergy-value').textContent, 10) > 0, $('#synergy-value').textContent);
  check('duo shared chips', qa('#synergy-shared .tag') > 0, qa('#synergy-shared .tag'));
  check('roster word', $('#roster-word').textContent === 'Восемь', $('#roster-word').textContent);
  check('ticker has items', qa('#ticker-track .ticker-item') === 34, qa('#ticker-track .ticker-item'));

  // ── filters & search ───────────────────────────────────────────────
  $('#disc-filters [data-filter="duo"]').click();
  check('duo filter = 3', qa('#disc-grid .disc-card') === 3, qa('#disc-grid .disc-card'));
  $('#disc-filters [data-filter="all"]').click();
  $('#disc-search').value = 'шахматы';
  $('#disc-search').dispatchEvent(new window.Event('input', { bubbles: true }));
  check('search chess = 1', qa('#disc-grid .disc-card') === 1, qa('#disc-grid .disc-card'));
  $('#disc-search').value = 'дота';
  $('#disc-search').dispatchEvent(new window.Event('input', { bubbles: true }));
  check('search дота = 2', qa('#disc-grid .disc-card') === 2, qa('#disc-grid .disc-card'));
  $('#disc-search').value = '';
  $('#disc-search').dispatchEvent(new window.Event('input', { bubbles: true }));

  // ── disc modal ─────────────────────────────────────────────────────
  $('#disc-grid .disc-card').click();
  check('disc modal opens', !$('#modal').hidden, '');
  check('disc modal title', /Dota 2/.test($('#modal-body').textContent), $('#modal-body').querySelector('.md-title') && $('#modal-body').querySelector('.md-title').textContent);
  $('#modal-close').click();
  check('modal closes', $('#modal').hidden, '');

  // ── bracket play ───────────────────────────────────────────────────
  const progressBefore = $('#bracket-progress').textContent;
  const playable = $('#bracket-board .match-row[data-player]');
  playable.click();
  check('bracket pick works', $('#bracket-progress').textContent !== progressBefore || qa('#bracket-board .match-row.is-winner') > 0, progressBefore + ' -> ' + $('#bracket-progress').textContent);
  check('champion slot has text', ($('#champion-slot').textContent || '').length > 0, 'ok');
  $('#bracket-select').value = 'chess';
  $('#bracket-select').dispatchEvent(new window.Event('change', { bubbles: true }));
  check('bracket switch', /Шахматы/.test($('#bracket-title').textContent), $('#bracket-title').textContent);
  $('[data-action="shuffle-bracket"]').click();
  check('shuffle keeps rounds', qa('#bracket-board .bracket-round') >= 2, qa('#bracket-board .bracket-round'));
  $('[data-action="reset-bracket"]').click();
  check('reset clears winners', /^0 \//.test($('#bracket-progress').textContent.trim()), $('#bracket-progress').textContent);

  // ── roster, matrix, duo ────────────────────────────────────────────
  $('#roster-grid .player-card').click();
  check('player modal opens', /боец/i.test($('#modal-body').textContent), '');
  $('#modal-close').click();
  $('#matrix-scroll .matrix-dot.on').click();
  check('matrix opens player', !$('#modal').hidden, '');
  $('#modal-close').click();
  const duoBefore = $('#synergy-value').textContent;
  $('[data-action="pick-duo"]').click();
  check('random duo works', $('#synergy-value').textContent !== '—', duoBefore + ' -> ' + $('#synergy-value').textContent);
  $('#pairs-grid .pair-card').click();
  check('pair click no error', true, 'ok');

  // ── stats toggle, wishes like, palette ─────────────────────────────
  $('#chart-more button').click();
  check('chart expands to 17', qa('#bar-chart .bar-row') === 17, qa('#bar-chart .bar-row'));
  const like = $('#wishes-wall [data-like]');
  like.click();
  check('like toggles', like.classList.contains('is-liked'), like.className);
  $('#palette-trigger').click();
  check('palette opens', !$('#palette').hidden, '');
  check('palette items', qa('#palette-results .pal-item') >= 10, qa('#palette-results .pal-item'));
  $('#palette-input').value = 'дота';
  $('#palette-input').dispatchEvent(new window.Event('input', { bubbles: true }));
  check('palette filters', qa('#palette-results .pal-item') === 2, qa('#palette-results .pal-item'));
  $('#palette-input').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  check('palette closes', $('#palette').hidden, '');

  // ── theme ──────────────────────────────────────────────────────────
  const themeBefore = document.documentElement.getAttribute('data-theme');
  $('#theme-toggle').click();
  check('theme toggles', document.documentElement.getAttribute('data-theme') !== themeBefore, themeBefore + ' -> ' + document.documentElement.getAttribute('data-theme'));

  // ── live JSONP ─────────────────────────────────────────────────────
  await sleep(700);
  check('jsonp requested', liveScripts.length > 0, liveScripts[0] && liveScripts[0].slice(0, 80));
  check('live players = 11', qa('#roster-grid .player-card') === 11, qa('#roster-grid .player-card'));
  var probe = window.GP.state.players.filter(function (p) { return p.nick === 'ParserProbe'; })[0];
  check('live matcher precision', !!probe && probe.disciplines.length === 2 && probe.disciplines.indexOf('dota11') < 0, probe ? probe.disciplines.join(',') : 'no probe');
  check('live new nick visible', $('#roster-grid').textContent.includes('TestNick'), '');
  check('live all-except parsed', $('#roster-grid').textContent.includes('AllNick'), '');
  check('live status', /Google Таблица/.test($('#data-text').textContent) && /11 ответов/.test($('#data-text').textContent), $('#data-text').textContent);
  check('live stats total', Number($('#stats-total').textContent) > 88, $('#stats-total').textContent);
  check('live matrix rows', qa('#matrix-scroll tbody tr') === 17, qa('#matrix-scroll tbody tr'));

  // ── errors ─────────────────────────────────────────────────────────
  check('no js errors', errors.length === 0, errors.join(' | '));

  console.log('\n' + (fail ? fail + ' FAILED' : 'ALL PASSED') + ' · ' + pass + ' checks');
  if (failures.length) console.log(failures.join('\n'));
  window.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('HARNESS ERROR', e);
  process.exit(2);
});
