/* GAMEpiada · jsdom smoke / regression harness  (v4 · слоты вместо дат)
   Запуск: node test-site.js   (нужен devDependency jsdom)
   Проверяет рендер, фильтры, сетки, заезды-подиумы, дуо, статистику, палитру и live-парсинг.
   Отдельно сторожит то, что пользователь просил убрать: даты-выдумки, кастомный курсор,
   canvas-звёзды и прочие тяжёлые эффекты. */
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
  check('круговая: туры = 5', qa('#bracket-board .tour-card') === 5, qa('#bracket-board .tour-card'));
  check('круговая: матчи = каждый с каждым', qa('#bracket-board .match') === 15, qa('#bracket-board .match'));
  check('таблица участников = 6', qa('#league-table .league-row:not(.is-head)') === 6, qa('#league-table .league-row:not(.is-head)'));
  check('svg-линий больше нет', !$('#bracket-lines'), 'removed');
  check('roster cards = 8', qa('#roster-grid .player-card') === 8, qa('#roster-grid .player-card'));
  check('leader rows = 8', qa('#leader-list .leader-row') === 8, qa('#leader-list .leader-row'));
  check('wishes = 8', qa('#wishes-wall .wish-card') === 8, qa('#wishes-wall .wish-card'));
  check('waves = 5 + доигрывание', qa('#timeline .wave-card') === 6, qa('#timeline .wave-card'));
  check('catch-up row', ($('#timeline .day-card:last-child').textContent || '').includes('Окно доигрывания'), 'ok');
  check('schedule slots = 17', qa('#timeline .slot[data-disc-id]') === 17, qa('#timeline .slot[data-disc-id]'));
  check('no weekday labels', !/(понедельник|вторник|среда|четверг|пятница|суббота|воскресенье)/i.test($('#timeline').textContent), 'ok');
  check('dates tbd banner', /уточня/i.test($('#dates-note').textContent), $('#dates-note').textContent.replace(/\s+/g, ' ').slice(0, 70));
  check('countdown is TBD', $('#event-countdown').textContent.trim() === 'TBD' && $('#join-timer').textContent.trim() === 'TBD', $('#event-countdown').textContent + ' / ' + $('#join-timer').textContent);
  check('no fake dates in DOM', !/\b(27|28|29|30|31)\.10\.2026\b|\b0[1-9]\.11\.2026\b/.test(document.body.textContent), 'ok');
  check('hero dates tbd', /уточня/i.test($('#hero-dates').parentElement.textContent), $('#hero-dates').parentElement.textContent.replace(/\s+/g, ' ').trim());
  check('no custom cursor/canvas', !$('#cursor') && !$('#stars') && !$('#spotlight'), 'removed');
  check('bracket select = 17', qa('#bracket-select option') === 17, qa('#bracket-select option'));
  const artCards = $$('#disc-grid .disc-card');
  check('каждая карточка с арт-фоном', artCards.every((c) => !!c.querySelector('.disc-art')), qa('#disc-grid .disc-art'));
  const artSrcs = $$('#disc-grid .disc-art').map((i) => i.getAttribute('src'));
  check('арт-файлы на диске', artSrcs.length === 17 && artSrcs.every((src) => fs.existsSync(path.join(root, src))), artSrcs.filter((src) => !fs.existsSync(path.join(root, src))).join(',') || '17/17');
  check('арт ленивый и декоративный', $$('#disc-grid .disc-art').every((i) => i.getAttribute('loading') === 'lazy' && i.getAttribute('alt') === ''), 'lazy+alt=""');
  check('арт из assets/games', artSrcs.every((src) => /^assets\/games\/[a-z0-9]+\.jpg$/.test(src)), artSrcs[0]);
  check('competition starts in bracket', qa('#board-view .podium-slot') === 0 && $('#board-view').hidden, 'board hidden');
  check('bar rows = 10', qa('#bar-chart .bar-row') === 10, qa('#bar-chart .bar-row'));
  check('top bar is Dota', /Dota 2/.test($('#bar-chart .bar-row').textContent) && /7 · 88%/.test($('#bar-chart .bar-row').textContent), $('#bar-chart .bar-row').textContent.replace(/\s+/g, ' '));
  check('stats total = 88', $('#stats-total').textContent === String(TOTAL_SNAP), $('#stats-total').textContent);
  check('mini reg = 88', $('#mini-registrations').textContent === String(TOTAL_SNAP), $('#mini-registrations').textContent);
  check('donut solo/duo', $('#donut-solo').textContent === '69' && $('#donut-duo').textContent === '19', $('#donut-solo').textContent + '/' + $('#donut-duo').textContent);
  check('facts = 3', qa('#facts-row .fact') === 3, qa('#facts-row .fact'));
  check('facts dates parsed', !/undefined|Invalid/.test($('#facts-row').textContent), $('#facts-row').textContent.replace(/\s+/g, ' ').slice(0, 80));
  check('day heads clean', !/(понедельник|вторник|среда|четверг|пятница|суббота|воскресенье)\s*·/.test($('.day-name').textContent), $('.day-head').textContent.replace(/\s+/g, ' '));
  check('pairs >= 3', qa('#pairs-grid .pair-card') >= 3, qa('#pairs-grid .pair-card'));
  check('duo score > 0', parseInt($('#synergy-value').textContent, 10) > 0, $('#synergy-value').textContent);
  check('duo shared chips', qa('#synergy-shared .tag') > 0, qa('#synergy-shared .tag'));
  check('roster word', $('#roster-word').textContent === 'Восемь', $('#roster-word').textContent);
  check('ticker has items', qa('#ticker-track .ticker-item') === 34, qa('#ticker-track .ticker-item'));

  // ── filters & search ───────────────────────────────────────────────
  $('#disc-filters [data-filter="duo"]').click();
  check('duo filter = 3', qa('#disc-grid .disc-card') === 3, qa('#disc-grid .disc-card'));
  $('#disc-filters [data-filter="board"]').click();
  check('board filter = 5', qa('#disc-grid .disc-card') === 5, qa('#disc-grid .disc-card'));
  check('чип «Заезды» = 5', $('[data-filter-count="board"]').textContent === '5', $('[data-filter-count="board"]').textContent);
  $('#disc-filters [data-filter="bracket"]').click();
  check('bracket filter = 12', qa('#disc-grid .disc-card') === 12, qa('#disc-grid .disc-card'));
  check('чип «Круговая» = 12', $('[data-filter-count="bracket"]').textContent === '12', $('[data-filter-count="bracket"]').textContent);
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
  $('#disc-grid .disc-card[data-disc-id="dota11"]').click();
  check('disc modal opens', !$('#modal').hidden, '');
  check('disc modal title', /Dota 2/.test($('#modal-body').textContent), $('#modal-body').querySelector('.md-title') && $('#modal-body').querySelector('.md-title').textContent);
  $('#modal-close').click();
  check('modal closes', $('#modal').hidden, '');

  // ── круговая: каждый с каждым ──────────────────────────────────────
  await sleep(520); // ждём live-синк, иначе состав меняется посреди проверки
  const leagueCounts = () => {
    const n = qa('#league-table .league-row:not(.is-head)');
    return { n, matches: qa('#bracket-board .match'), tours: qa('#bracket-board .tour-card') };
  };
  const L = leagueCounts();
  const leagueTotal = Number(($('#bracket-progress').textContent || '').split('/')[1]) || 0;
  check('league title', /Круговая.*Dota 2/.test($('#bracket-title').textContent), $('#bracket-title').textContent);
  check('league meta says каждый с каждым', /каждый с каждым/.test($('#bracket-meta').textContent), $('#bracket-meta').textContent.replace(/\s+/g, ' ').slice(0, 60));
  check('круговая: матчи = n(n−1)/2', L.matches === L.n * (L.n - 1) / 2 && L.matches > 0, L.matches + ' матчей, ' + L.n + ' участников');
  check('круговая: туры = n−1 (или n при нечётном)', L.tours === (L.n % 2 ? L.n : L.n - 1), L.tours + ' туров');
  check('прогресс знает все матчи', leagueTotal === L.matches, $('#bracket-progress').textContent);
  const allPairs = $$('#bracket-board .match').map((m) => $$('.match-row[data-entrant]', m).map((r) => r.getAttribute('data-entrant')).sort().join(' vs '));
  check('у каждого матча два участника', allPairs.length === L.matches && allPairs.every((p) => p.includes(' vs ')), allPairs.length + ' матчей');
  check('пары не повторяются', new Set(allPairs).size === L.matches, new Set(allPairs).size + ' уникальных из ' + L.matches);
  check('нет пустых слотов и bye', qa('#bracket-board .match-row.is-empty') === 0 && qa('#bracket-board .match-row.is-auto') === 0, 'чисто');
  check('старт без чемпиона', /ещё не сыграна/.test($('#champion-slot').textContent), $('#champion-slot').textContent.replace(/\s+/g, ' ').slice(0, 50));
  check('шапка таблицы И/В/П/О', /участник/.test($('#league-table .league-row.is-head').textContent) && /И/.test($('#league-table .is-head .lr-games').textContent) && /В/.test($('#league-table .is-head .lr-wins').textContent) && /П/.test($('#league-table .is-head .lr-losses').textContent) && /О/.test($('#league-table .is-head .lr-points').textContent), $('#league-table .league-row.is-head').textContent.replace(/\s+/g, ' '));
  check('таблица стартует с нулей', $$('#league-table .league-row:not(.is-head) .lr-points').every((el) => el.textContent === '0'), '0');

  $('#bracket-board .match-row[data-entrant]').click();
  check('клик отмечает победу', qa('#bracket-board .match-row.is-winner') === 1 && $('#bracket-progress').textContent.trim() === '1 / ' + leagueTotal, $('#bracket-progress').textContent);
  check('таблица пересчиталась', $$('#league-table .league-row:not(.is-head) .lr-wins').some((el) => el.textContent === '1'), $$('#league-table .league-row:not(.is-head)').map((r) => r.querySelector('.lr-wins').textContent).join(','));
  check('лидер вместо чемпиона', /Лидер/.test($('#champion-slot').textContent) && !/👑/.test($('#champion-slot').textContent), $('#champion-slot').textContent.replace(/\s+/g, ' ').slice(0, 50));
  $('#bracket-board .match-row.is-winner').click();
  check('повторный клик снимает победу', $('#bracket-progress').textContent.trim() === '0 / ' + leagueTotal, $('#bracket-progress').textContent);

  $('[data-action="auto-bracket"]').click();
  await sleep(420 * L.tours + 900);
  check('автопрогноз закрывает все матчи', $('#bracket-progress').textContent.trim() === leagueTotal + ' / ' + leagueTotal, $('#bracket-progress').textContent);
  check('чемпион определён', /Чемпион/.test($('#champion-slot').textContent), $('#champion-slot').textContent.replace(/\s+/g, ' ').slice(0, 60));
  check('корона в таблице одна', qa('#league-table .league-row.is-champion') === 1, qa('#league-table .league-row.is-champion'));
  check('сумма побед = числу матчей', $$('#league-table .league-row:not(.is-head) .lr-wins').reduce((n, el) => n + Number(el.textContent), 0) === leagueTotal, leagueTotal + '');
  check('сумма поражений = числу матчей', $$('#league-table .league-row:not(.is-head) .lr-losses').reduce((n, el) => n + Number(el.textContent), 0) === leagueTotal, leagueTotal + '');
  const leagueDisc = window.GP_DATA.disciplines.find((x) => x.id === 'dota11');
  const playedTours = window.GP.league.tours(leagueDisc);
  const playedRows = window.GP.league.standings(leagueDisc, playedTours);
  const pointsGroups = {};
  playedRows.forEach((r) => { (pointsGroups[r.points] = pointsGroups[r.points] || []).push(r); });
  const tieProblems = [];
  Object.keys(pointsGroups).forEach((pts) => {
    const g = pointsGroups[pts];
    if (g.length === 2) {
      const m = playedTours.flat().find((x) => (x.a === g[0].key && x.b === g[1].key) || (x.a === g[1].key && x.b === g[0].key));
      if (m && m.winner !== g[0].key) tieProblems.push(g[0].key + ' / ' + g[1].key);
    } else if (g.length > 2) {
      const inside = {};
      g.forEach((r) => { inside[r.key] = 0; });
      playedTours.flat().forEach((m) => {
        if (m.winner && m.a in inside && m.b in inside) inside[m.winner] += 1;
      });
      for (let i = 1; i < g.length; i++) if (inside[g[i].key] > inside[g[i - 1].key]) tieProblems.push(pts + ' очк: ' + g[i - 1].key + ' < ' + g[i].key);
    }
  });
  check('равенство побед решает мини-таблица', tieProblems.length === 0, tieProblems.join(', ') || playedRows.length + ' участников');

  $('[data-action="reset-bracket"]').click();
  check('сброс очищает таблицу', $('#bracket-progress').textContent.trim() === '0 / ' + leagueTotal && qa('#bracket-board .match-row.is-winner') === 0, $('#bracket-progress').textContent);

  $('#bracket-select').value = 'chess';
  $('#bracket-select').dispatchEvent(new window.Event('change', { bubbles: true }));
  const C = leagueCounts();
  const chessTotal = Number(($('#bracket-progress').textContent || '').split('/')[1]) || 0;
  check('league switch', /Шахматы/.test($('#bracket-title').textContent), $('#bracket-title').textContent);
  check('chess: каждый с каждым', C.matches === C.n * (C.n - 1) / 2 && C.matches > 0, C.matches + ' матчей, ' + C.n + ' участников');
  check('chess: туры по кругу', C.tours === (C.n % 2 ? C.n : C.n - 1), C.tours + ' туров');
  $('[data-action="shuffle-bracket"]').click();
  check('shuffle держит туры', qa('#bracket-board .tour-card') === C.tours && $('#bracket-progress').textContent.trim() === '0 / ' + chessTotal, qa('#bracket-board .tour-card') + ' / ' + $('#bracket-progress').textContent);

  // ── дуэль из двух: один матч = сразу чемпион ───────────────────────
  $('#bracket-select').value = 'mk';
  $('#bracket-select').dispatchEvent(new window.Event('change', { bubbles: true }));
  check('mk: два бойца — один матч', qa('#bracket-board .match') === 1 && qa('#bracket-board .tour-card') === 1, qa('#bracket-board .match') + ' матч');
  $('#bracket-board .match-row[data-entrant]').click();
  check('mk: победа = чемпион сразу', /Чемпион/.test($('#champion-slot').textContent) && qa('#league-table .league-row.is-champion') === 1, $('#champion-slot').textContent.replace(/\s+/g, ' ').slice(0, 50));

  // ── каждая крутовая дисциплина: N−1 туров и C(N,2) матчей ──────────
  const leagueIds = $$('#bracket-select option').map((o) => o.value);
  const broken = [];
  let leagueChecked = 0;
  leagueIds.forEach((id) => {
    $('#bracket-select').value = id;
    $('#bracket-select').dispatchEvent(new window.Event('change', { bubbles: true }));
    if (document.body.classList.contains('is-board-mode')) return;
    const n = qa('#league-table .league-row:not(.is-head)');
    if (n < 2) return;
    leagueChecked++;
    const matches = qa('#bracket-board .match');
    const tours = qa('#bracket-board .tour-card');
    const expectTours = n % 2 ? n : n - 1;
    const pairs = $$('#bracket-board .match').map((m) => $$('.match-row[data-entrant]', m).map((r) => r.getAttribute('data-entrant')).sort().join('|'));
    const unique = new Set(pairs).size;
    if (matches !== n * (n - 1) / 2 || tours !== expectTours || unique !== matches) {
      broken.push(id + ': ' + n + ' уч / ' + tours + ' туров / ' + matches + ' матчей / ' + unique + ' пар');
    }
  });
  check('все круговые: N−1 туров, N(N−1)/2 матчей, без повторов', broken.length === 0 && leagueChecked === 12, broken.join('; ') || leagueChecked + ' круговых проверено');

  // ── заезд: подиум 1 / 2 / 3 вместо круговой ────────────────────────
  $('#bracket-select').value = 'tm';
  $('#bracket-select').dispatchEvent(new window.Event('change', { bubbles: true }));
  check('board title', /Заезд.*Trackmania/.test($('#bracket-title').textContent), $('#bracket-title').textContent);
  check('board mode hides league', $('#bracket-body').hidden && !$('#board-view').hidden, 'board only');
  check('podium slots = 3', qa('#board-view .podium-slot') === 3, qa('#board-view .podium-slot'));
  check('podium ступени = 3', qa('#board-podium .podium-step') === 3, qa('#board-podium .podium-step'));
  check('podium медали = 3', qa('#board-podium .podium-medal') === 3, qa('#board-podium .podium-medal'));
  check('podium порядок 2–1–3', $$('#board-podium .podium-slot').map((el) => el.dataset.place).join('') === '123', $$('#board-podium .podium-slot').map((el) => el.dataset.place).join(''));
  check('podium points', /3 \/ 2 \/ 1/.test($('#comp-brief').textContent), 'ok');
  check('board brief from regulation', /сумма времени|5 трасс/i.test($('#comp-brief').textContent), 'ok');
  check('board shell has art', /assets\/games\/tm\.jpg/.test($('#comp-shell').getAttribute('style') || ''), ($('#comp-shell').getAttribute('style') || '').slice(0, 60));
  check('board clears champion slot', !$('#champion-slot').innerHTML.length, 'empty');
  const boardRows = qa('#board-list .board-row');
  check('board list = entrants', boardRows >= 3, boardRows);
  $('[data-action="board-auto"]').click();
  check('board auto fills 3', qa('#board-view .podium-slot.is-filled') === 3, qa('#board-view .podium-slot.is-filled'));
  check('podium собран', $('#board-podium').classList.contains('is-complete'), 'is-complete');
  check('чемпион подписан', /чемпион/.test($('#board-podium .place-1').textContent), $('#board-podium .place-1').textContent.replace(/\s+/g, ' ').slice(0, 60));
  check('board points awarded', /\+3 очк/.test($('#board-podium').textContent) && /\+1 очк/.test($('#board-podium').textContent), 'ok');
  const placedRow = $$('#board-list .board-row').find((r) => (r.querySelector('.br-rank').textContent || '').indexOf('#') === 0);
  if (placedRow) placedRow.click();
  check('board pick clears place', qa('#board-view .podium-slot.is-filled') === 2, qa('#board-view .podium-slot.is-filled'));
  $('[data-action="board-reset"]').click();
  check('board reset empties podium', qa('#board-view .podium-slot.is-filled') === 0, qa('#board-view .podium-slot.is-filled'));
  // ── Double Dealers тоже подиум ─────────────────────────────────────
  $('#bracket-select').value = 'dd';
  $('#bracket-select').dispatchEvent(new window.Event('change', { bubbles: true }));
  check('dd: подиум вместо круговой', /Заезд.*Double Dealers/.test($('#bracket-title').textContent) && !$('#board-view').hidden, $('#bracket-title').textContent);
  check('dd: три места', qa('#board-view .podium-slot') === 3 && qa('#board-podium .podium-step') === 3, qa('#board-view .podium-slot') + ' / ' + qa('#board-podium .podium-step'));
  check('dd: бриф про места', /места 1–3/i.test($('#comp-brief').textContent) && /1–3/.test($('#comp-brief').textContent), $('#comp-brief').textContent.replace(/\s+/g, ' ').slice(0, 80));
  check('dd: карточка = заезд', $$('.disc-card[data-disc-id="dd"] .tag').map((el) => el.textContent).join(' ').indexOf('заезд') >= 0, $$('.disc-card[data-disc-id="dd"] .tag').map((el) => el.textContent).join(' / '));
  check('dd: в списке участников есть бойцы', qa('#board-list .board-row') >= 3, qa('#board-list .board-row'));

  $('#bracket-select').value = 'dota11';
  $('#bracket-select').dispatchEvent(new window.Event('change', { bubbles: true }));
  check('back to league mode', !$('#bracket-body').hidden && $('#board-view').hidden && qa('#bracket-board .tour-card') > 0, qa('#bracket-board .tour-card') + ' туров');
  check('2×2 points split', $('.disc-card[data-disc-id="mcduo"] .tag.is-gold').textContent.trim() === '1,5 / 1 / 0,5', $('.disc-card[data-disc-id="mcduo"] .tag.is-gold').textContent.trim());
  check('roster says заявка', /заявка/.test($('#roster-grid').textContent) && !/в игре с/.test($('#roster-grid').textContent), 'ok');
  check('dota11 series BO1', /BO1/.test($('#bracket-meta').textContent), $('#bracket-meta').textContent.replace(/\s+/g, ' ').slice(0, 70));

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
