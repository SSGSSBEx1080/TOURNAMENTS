/* ==========================================================================
   GAMEpiada · данные турнира
   Источник: ответы Google-формы регистрации (лист «Ответы на форму (1)»).
   Таблица только читается: ниже — снимок на момент сборки сайта.
   Живые ответы подтягиваются на клиенте через публичный gviz-эндпоинт.
   ========================================================================== */
window.GP_DATA = {
  version: '3.0.0',

  event: {
    name: 'GAMEpiada',
    edition: 'Сезон I',
    tagline: 'Небесная игровая олимпиада',
    start: '2026-10-27T17:00:00+03:00',
    end: '2026-11-01T23:59:59+03:00',
    timezone: 'Europe/Moscow',
    timezoneLabel: 'MSK',
    tzOffset: 3,
    prize: 'золотой трон',
    champion: 'Победитель определяется по сумме очков: 1-е место — 3, 2-е — 2, 3-е — 1.',
    venue: 'Discord · голосовые комнаты',
    sheetId: '1lFdBNVyLDUHQwzqxrALJSEdtgmZDibtpS-huupTTTVI',
    sheetTab: 'Ответы на форму (1)',
    formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfTcLac50_-Jh_b2OC8IQpCKJBXhs4m5TlEICbz3N6W06Hyug/viewform',
    sheetUrl: 'https://docs.google.com/spreadsheets/d/1lFdBNVyLDUHQwzqxrALJSEdtgmZDibtpS-huupTTTVI/edit?usp=sharing',
    regulationUrl: 'https://docs.google.com/document/d/1vBNVpcpow1niNuO3SABZsS93yPqguPrEPO4HrHzF_0U/edit?usp=sharing',
    discordUrl: 'https://discord.gg/5fRZkcjt',
    githubUrl: 'https://github.com/SSGSSBEx1080/TOURNAMENTS',
    siteUrl: 'https://ssgssbex1080.github.io/TOURNAMENTS/',
    clanTag: '#RPQGPV9Q',
    scoring: [3, 2, 1]
  },

  snapshot: {
    label: '27.10.2026 · 16:29 MSK',
    iso: '2026-10-27T16:29:39+03:00',
    responses: 8,
    rows: 9,
    note: 'Снимок ответов формы. Ниже таблица опрашивается повторно — без записи.'
  },

  disciplines: [
    {
      id: 'dota11', name: 'Dota 2', mode: '1×1', icon: '⚔️', accent: '#ff657c', accent2: '#ffb36b',
      date: '2026-10-27', start: '18:00', end: '21:00', type: 'solo', bo: 'BO1',
      format: 'All Random · 1×1', form: 'Dota 2 | 1х1',
      aliases: ['dota 2 1x1', 'dota 1x1', 'дота 1х1'],
      rules: 'All Random, 1×1 на мид. Победа — снести трон противника. Один матч, без банов.'
    },
    {
      id: 'dota22', name: 'Dota 2', mode: '2×2', icon: '🗡️', accent: '#f5ae55', accent2: '#ff7e5f',
      date: '2026-10-28', start: '16:30', end: '18:00', type: 'duo', bo: 'BO1',
      format: 'All Random · 2×2', form: 'Dota 2 | 2х2',
      aliases: ['dota 2 2x2', 'dota 2x2', 'дота 2х2'],
      rules: 'All Random, 2×2. Один игрок на мид, второй — саппорт, роли фиксируются до крипа. BO1.'
    },
    {
      id: 'cs11', name: 'CS 2', mode: '1×1', icon: '🎯', accent: '#ff9854', accent2: '#ffd36e',
      date: '2026-10-28', start: '15:00', end: '16:15', type: 'solo', bo: 'BO1',
      format: 'Aim-арена · 1×1', form: 'CS 2 | 1x1',
      aliases: ['cs 2 1x1', 'cs2 1x1', 'кс 1х1'],
      rules: '1×1 на aim-арене, оружие по договорённости. Победа — 16 раундов или больше фрагов за отведённое время.'
    },
    {
      id: 'cs22', name: 'CS 2', mode: '2×2', icon: '💥', accent: '#57d7ed', accent2: '#6ee7ff',
      date: '2026-10-28', start: '19:15', end: '21:00', type: 'duo', bo: 'BO1',
      format: '2×2 · Wingman', form: 'CS 2 | 2x2',
      aliases: ['cs 2 2x2', 'cs2 2x2', 'кс 2х2'],
      rules: '2×2, зеркальный пик. Победа по раундам на стандартной карте Wingman. BO1.'
    },
    {
      id: 'mcduo', name: 'Minecraft', mode: 'Duo Speedrun', icon: '🧊', accent: '#66d78e', accent2: '#34d399',
      date: '2026-10-29', start: '17:00', end: '19:30', type: 'duo', bo: '—',
      format: 'Random Seed · дуо', form: 'Minecraft Duo Speedrun',
      aliases: ['minecraft duo speedrun', 'minecraft duo', 'майнкрафт спидраун'],
      rules: 'Дуо-спидран по случайному сиду. Сначала убить дракона — таймер останавливается для обоих. Один забег.'
    },
    {
      id: 'cr', name: 'Clash Royale', mode: '1×1', icon: '👑', accent: '#7aa9ff', accent2: '#a78bfa',
      date: '2026-10-28', start: '18:15', end: '19:00', type: 'solo', bo: 'BO3',
      format: 'Mega Draft · BO3', form: 'Clash Royale',
      aliases: ['clash royale', 'клаш рояль'],
      rules: 'Mega Draft, 3 колоды, BO3. Клан турнира: #RPQGPV9Q. Одинаковые уровни карт.'
    },
    {
      id: 'dd', name: 'Double Dealers', mode: '1×1', icon: '🃏', accent: '#c57bff', accent2: '#f472b6',
      date: '2026-10-29', start: '19:40', end: '21:00', type: 'solo', bo: 'BO1',
      format: 'Арена · BO1', form: 'Double Dealers',
      aliases: ['double dealers', 'дабл дилерс'],
      rules: 'Режим на арене Double Dealers. Правила объявляются перед стартом, BO1.'
    },
    {
      id: 'rl', name: 'Rocket League', mode: '1×1', icon: '🚀', accent: '#48d8e7', accent2: '#3b82f6',
      date: '2026-10-30', start: '17:00', end: '18:00', type: 'solo', bo: 'BO1',
      format: 'Стандарт · 5 минут', form: 'Rocket League | 1x1',
      aliases: ['rocket league 1x1', 'rocket league', 'ракета лига'],
      rules: '1×1, стандартная арена, 5 минут. Ничья — овертайм. BO1.'
    },
    {
      id: 'geo', name: 'Geoguessr', mode: '1×1', icon: '🌐', accent: '#60dbb0', accent2: '#22d3ee',
      date: '2026-10-30', start: '19:15', end: '20:00', type: 'solo', bo: 'BO3',
      format: 'World · BO3', form: 'Geoguesser',
      aliases: ['geoguesser', 'geoguessr', 'геогессер', 'геогесср'],
      rules: 'Geoguessr 1×1, BO3. Одинаковый набор карт и раундов для обоих игроков.'
    },
    {
      id: 'fg', name: 'Fall Guys', mode: '1×1', icon: '🫧', accent: '#ff78c5', accent2: '#fb7185',
      date: '2026-10-30', start: '18:15', end: '19:00', type: 'solo', bo: 'BO1',
      format: 'Один забег', form: 'Fall Guys',
      aliases: ['fall guys', 'фол гайс'],
      rules: 'Один забег, очки по финишу. Кто дальше — тот и забрал раунд. BO1.'
    },
    {
      id: 'gd', name: 'Geometry Dash', mode: '1×1', icon: '🔺', accent: '#f5d348', accent2: '#ffef9e',
      date: '2026-10-27', start: '17:00', end: '17:45', type: 'solo', bo: 'BO1',
      format: '5 попыток', form: 'Geometry Dash',
      aliases: ['geometry dash', 'геометрия дэш'],
      rules: 'Уровни объявляются на старте. Пять попыток на уровень, дальше решает процент прохождения.'
    },
    {
      id: 'fn', name: 'Fortnite', mode: '1×1', icon: '🏗️', accent: '#5d9fff', accent2: '#a78bfa',
      date: '2026-10-31', start: '12:00', end: '14:00', type: 'solo', bo: 'BO3',
      format: 'Build Fight · до 5 киллов', form: 'Fortnite | 1x1',
      aliases: ['fortnite 1x1', 'fortnite', 'фортнайт'],
      rules: '1×1 Build Fight до 5 киллов. BO3, никаких сторонних assist-режимов.'
    },
    {
      id: 'tm', name: 'Trackmania', mode: '1×1', icon: '🏁', accent: '#ff9257', accent2: '#f59e0b',
      date: '2026-10-30', start: '20:15', end: '21:00', type: 'solo', bo: '—',
      format: '5 трасс · time attack', form: 'Trackmania',
      aliases: ['trackmania', 'трекмания'],
      rules: 'Пять трасс, сумма времени. Никаких рестартов после финиша — только чистый заезд.'
    },
    {
      id: 'mk', name: 'Mortal Kombat 11', mode: '1×1', icon: '🐉', accent: '#ff6471', accent2: '#f97316',
      date: '2026-10-31', start: '14:15', end: '16:00', type: 'solo', bo: 'BO3',
      format: 'Любые персонажи', form: 'Mortal Kombat 11',
      aliases: ['mortal kombat 11', 'mortal kombat', 'мортал комбат'],
      rules: 'Mortal Kombat 11, BO3, любые персонажи и вариации. Запрещены только глитч-комбо.'
    },
    {
      id: 'chess', name: 'Шахматы', mode: 'Онлайн', icon: '♞', accent: '#e7d4a3', accent2: '#d4b483',
      date: '2026-10-31', start: '17:15', end: '18:00', type: 'solo', bo: 'BO3',
      format: 'Блиц 3+0', form: 'Шахматы',
      aliases: ['шахматы', 'chess'],
      rules: 'Онлайн-блиц 3+0, BO3. Ничья в партии — переигровка с тем же контролем времени.'
    },
    {
      id: 'mcpvp', name: 'Minecraft PVP', mode: '1×1', icon: '⛏️', accent: '#6fe2a1', accent2: '#34d399',
      date: '2026-10-31', start: '16:15', end: '17:00', type: 'solo', bo: 'BO3',
      format: 'Железный сет · BO3', form: 'Minecraft PVP 1v1',
      aliases: ['minecraft pvp 1v1', 'minecraft pvp', 'майнкрафт пвп'],
      rules: 'Minecraft PVP, железный сет, BO3. Арена и версия объявляются до первого раунда.'
    },
    {
      id: 'bs', name: 'Brawl Stars', mode: '1×1', icon: '✦', accent: '#ffc44c', accent2: '#fbbf24',
      date: '2026-10-31', start: '18:15', end: '19:00', type: 'solo', bo: 'BO3',
      format: 'Bounty · BO3', form: 'Brawl Stars | 1x1',
      aliases: ['brawl stars 1x1', 'brawl stars', 'бравл старс'],
      rules: 'Brawl Stars 1×1, Bounty, BO3. Все бойцы разрешены, уровни уравниваются.'
    }
  ],

  players: [
    {
      id: 'p1', name: 'Никита Андреева', nick: 'Никита', initials: 'НА', emoji: '🦊',
      c1: '#ffb36b', c2: '#ffd98a', joined: '2026-10-26T17:18:00+03:00',
      quote: 'готов занять все первые места (с конца)',
      disciplines: ['fn', 'chess'],
      partners: { minecraft: '', cs2: '', dota2: '' },
      aliases: ['никита', 'никита андреева', 'андреева', 'андреев']
    },
    {
      id: 'p2', name: 'Сева', nick: 'Сева', initials: 'С', emoji: '🐺',
      c1: '#6ee7ff', c2: '#3b82f6', joined: '2026-10-26T18:07:00+03:00',
      quote: 'Да',
      disciplines: ['dota11', 'dota22', 'cs11', 'cs22', 'mcduo', 'cr', 'dd', 'rl', 'geo', 'fg', 'gd', 'tm', 'chess', 'mcpvp', 'bs'],
      partners: { minecraft: '', cs2: 'Пуша', dota2: 'Пуша' },
      aliases: ['сева', 'seva']
    },
    {
      id: 'p3', name: 'Сеня', nick: 'BNaNa_Bughaлтер', initials: 'ББ', emoji: '🍌',
      c1: '#c084fc', c2: '#fb7185', joined: '2026-10-26T18:19:00+03:00',
      quote: 'Места мало на компьютере но я скачаю пох',
      disciplines: ['dota11', 'dota22', 'mcduo', 'cr', 'dd', 'rl', 'geo', 'fg', 'gd', 'fn', 'tm', 'mk', 'chess', 'mcpvp', 'bs'],
      partners: { minecraft: 'morte', cs2: 'не знаю пока', dota2: 'не знаю пока' },
      aliases: ['сеня', 'bugha', 'банан', 'bnaNa_bughaлтер']
    },
    {
      id: 'p4', name: 'Илюха', nick: '.27', initials: '27', emoji: '🌪️',
      c1: '#ff6b6b', c2: '#f97316', joined: '2026-10-26T21:52:00+03:00',
      quote: 'ебал воевал',
      disciplines: ['dota11', 'dota22', 'cs11', 'cs22', 'mcduo', 'cr', 'dd', 'geo', 'mcpvp'],
      partners: { minecraft: 'рома', cs2: 'похуй', dota2: 'похуй' },
      aliases: ['.27', '27', 'илюха', 'илья']
    },
    {
      id: 'p5', name: 'Диса', nick: 'morte', initials: 'M', emoji: '💀',
      c1: '#34d399', c2: '#22d3ee', joined: '2026-10-27T00:46:00+03:00',
      quote: 'хз',
      disciplines: ['dota22', 'mcduo', 'gd', 'mk', 'chess', 'mcpvp'],
      partners: { minecraft: 'я и сеня вроде', cs2: 'фейсит заблокали в 10 винде', dota2: 'наверное я и сеня' },
      aliases: ['morte', 'морте', 'диса']
    },
    {
      id: 'p6', name: 'Ливенский Роман Евгеньевич', nick: 'angel may cry', initials: 'АМ', emoji: '😇',
      c1: '#fbbf24', c2: '#f59e0b', joined: '2026-10-27T10:32:00+03:00',
      quote: 'Добавьте больше игр',
      disciplines: ['dota11', 'dota22', 'cs11', 'cs22', 'mcduo', 'cr', 'dd', 'rl', 'geo', 'fg', 'gd', 'fn', 'tm', 'mcpvp', 'bs'],
      partners: { minecraft: '.27', cs2: 'похуй', dota2: 'похуй' },
      aliases: ['рома', 'роман', 'angel may cry', 'ливенский', 'роман евгеньевич']
    },
    {
      id: 'p7', name: 'Пуша', nick: 'Dhjs', initials: 'D', emoji: '🐾',
      c1: '#fb7185', c2: '#e879f9', joined: '2026-10-27T13:37:00+03:00',
      quote: '.',
      disciplines: ['dota11', 'dota22', 'cs11', 'cs22', 'mcduo', 'cr', 'dd', 'rl', 'geo', 'fg', 'gd', 'mcpvp'],
      partners: { minecraft: 'Сева', cs2: 'Хз', dota2: 'Хз' },
      aliases: ['dhjs', 'пуша', 'пуш']
    },
    {
      id: 'p8', name: 'Михаил', nick: 'Чёрный', initials: 'Ч', emoji: '🖤',
      c1: '#94a3b8', c2: '#64748b', joined: '2026-10-27T16:29:00+03:00',
      quote: 'Добавьте покер',
      disciplines: ['dota11', 'dota22', 'cs11', 'cs22', 'mcduo', 'cr', 'rl', 'geo', 'fg', 'gd', 'fn', 'chess', 'mcpvp', 'bs'],
      partners: { minecraft: 'Рома', cs2: 'Рома', dota2: 'Рома' },
      aliases: ['михаил', 'чёрный', 'черный', 'миша']
    }
  ],

  livePalette: [
    ['#7dd3fc', '#38bdf8', '🛰️'],
    ['#fca5a5', '#f87171', '🜂'],
    ['#86efac', '#4ade80', '🌿'],
    ['#fcd34d', '#f59e0b', '🔥'],
    ['#d8b4fe', '#c084fc', '🔮'],
    ['#99f6e4', '#2dd4bf', '🌊'],
    ['#f9a8d4', '#ec4899', '🌸'],
    ['#cbd5e1', '#94a3b8', '⚙️']
  ],

  milestones: [
    { date: '2026-10-26', title: 'Форма открыта', text: 'Первые ответы прилетели в таблицу.' },
    { date: '2026-10-27', title: 'Старт турнира', text: 'Geometry Dash открывает счёт в 17:00 MSK.' },
    { date: '2026-10-29', title: 'Дуо-день', text: 'Minecraft Duo Speedrun и Double Dealers.' },
    { date: '2026-10-31', title: 'Суперсуббота', text: 'Пять дисциплин, включая шахматы и Brawl Stars.' },
    { date: '2026-11-01', title: 'День доигрывания', text: 'Перенесённые матчи и вручение трона.' }
  ]
};
