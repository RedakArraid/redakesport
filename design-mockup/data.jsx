// data.jsx — mock data for tournament app
// All names are fictional. Designed to feel like a real EA FC / CoD / Fortnite / RL scene.

const TEAMS = [
  { id: 't1', tag: 'NVX', name: 'Nova Esports', color: '#ff3b30', country: 'FR', players: ['Le0n', 'Kr1m', 'Vyx', 'Astra'], wins: 18, losses: 4, elo: 2140 },
  { id: 't2', tag: 'KRA', name: 'Kraken Gaming', color: '#2547ff', country: 'NO', players: ['Bj0rn', 'Sigrid', 'Halv', 'Magnu'], wins: 16, losses: 6, elo: 2080 },
  { id: 't3', tag: 'EMB', name: 'Ember Collective', color: '#ff8a00', country: 'BR', players: ['Ravi', 'Tico', 'Mu7', 'Dani'], wins: 15, losses: 7, elo: 2030 },
  { id: 't4', tag: 'PXL', name: 'Pixel Wolves', color: '#00b86b', country: 'JP', players: ['Yuto', 'Ren', 'K3n', 'Sora'], wins: 14, losses: 8, elo: 1990 },
  { id: 't5', tag: 'OBL', name: 'Oblivion', color: '#a855f7', country: 'DE', players: ['Lukas', 'Mira', 'Jonas', 'Finn'], wins: 13, losses: 9, elo: 1955 },
  { id: 't6', tag: 'HVR', name: 'Hivemind', color: '#facc15', country: 'KR', players: ['Jin', 'Hye', 'Min', 'Doh'], wins: 13, losses: 9, elo: 1940 },
  { id: 't7', tag: 'AZR', name: 'Azur Légion', color: '#0ea5e9', country: 'FR', players: ['Theo', 'Lila', 'Noé', 'Anaé'], wins: 11, losses: 11, elo: 1890 },
  { id: 't8', tag: 'BLZ', name: 'Blizzard FC', color: '#94a3b8', country: 'CA', players: ['Owen', 'Mia', 'Kal', 'Jess'], wins: 11, losses: 11, elo: 1885 },
  { id: 't9', tag: 'SLR', name: 'Solar Riot', color: '#f43f5e', country: 'ES', players: ['Pau', 'Marc', 'Inés', 'Pol'], wins: 10, losses: 12, elo: 1850 },
  { id: 't10', tag: 'NEO', name: 'Neon Tigers', color: '#22d3ee', country: 'TH', players: ['Boon', 'Nan', 'Ploy', 'Win'], wins: 9, losses: 13, elo: 1820 },
  { id: 't11', tag: 'VEX', name: 'Vexa Crew', color: '#84cc16', country: 'NL', players: ['Bram', 'Daan', 'Sven', 'Ties'], wins: 8, losses: 14, elo: 1790 },
  { id: 't12', tag: 'OMX', name: 'Omnix', color: '#e11d48', country: 'GB', players: ['Liam', 'Jack', 'Noah', 'Theo'], wins: 7, losses: 15, elo: 1760 },
  { id: 't13', tag: 'GLD', name: 'Gladius', color: '#7c3aed', country: 'IT', players: ['Luca', 'Mat', 'Gio', 'Dav'], wins: 7, losses: 15, elo: 1740 },
  { id: 't14', tag: 'RVN', name: 'Ravenhold', color: '#0f766e', country: 'US', players: ['Cole', 'Drew', 'Reed', 'Sam'], wins: 6, losses: 16, elo: 1710 },
  { id: 't15', tag: 'ZRO', name: 'Zero Day', color: '#475569', country: 'PL', players: ['Kuba', 'Igor', 'Bart', 'Olek'], wins: 5, losses: 17, elo: 1680 },
  { id: 't16', tag: 'FLX', name: 'Flux Squad', color: '#db2777', country: 'MX', players: ['Diego', 'Iván', 'Leo', 'Beto'], wins: 4, losses: 18, elo: 1650 },
];

const COUNTRY_FLAGS = {
  FR: '🇫🇷', NO: '🇳🇴', BR: '🇧🇷', JP: '🇯🇵', DE: '🇩🇪', KR: '🇰🇷',
  CA: '🇨🇦', ES: '🇪🇸', TH: '🇹🇭', NL: '🇳🇱', GB: '🇬🇧', IT: '🇮🇹',
  US: '🇺🇸', PL: '🇵🇱', MX: '🇲🇽'
};

// Tournament context
const TOURNAMENT = {
  id: 'redak-cup-26',
  name: 'Redak Cup 2026',
  subtitle: 'Spring Major — EA FC 26',
  game: 'EA FC 26',
  platform: 'PS5 · Xbox · PC',
  format: 'Poules + Élimination directe',
  prize: '50 000 €',
  status: 'live',
  teamsCount: 16,
  matchesPlayed: 38,
  matchesTotal: 47,
  startDate: '2026-06-01',
  endDate: '2026-06-14',
  venue: 'Paris La Défense Arena + Online',
  organizer: 'Redak Esports',
  sponsors: ['Logitech G', 'Red Bull', 'EA Sports', 'Secretlab', 'PlayStation', 'NACON'],
};

// Bracket — single elim, 8 teams shown (quarter / semi / final)
const BRACKET_SE = {
  rounds: [
    {
      name: 'Quart de finale',
      matches: [
        { id: 'qf1', a: 't1', b: 't8', sa: 3, sb: 1, status: 'done', date: '11/06 · 17:00' },
        { id: 'qf2', a: 't4', b: 't5', sa: 2, sb: 3, status: 'done', date: '11/06 · 19:00' },
        { id: 'qf3', a: 't2', b: 't7', sa: 3, sb: 0, status: 'done', date: '11/06 · 21:00' },
        { id: 'qf4', a: 't3', b: 't6', sa: 2, sb: 2, status: 'live', date: 'EN COURS' },
      ]
    },
    {
      name: 'Demi-finale',
      matches: [
        { id: 'sf1', a: 't1', b: 't5', sa: null, sb: null, status: 'upcoming', date: '13/06 · 18:00' },
        { id: 'sf2', a: 't2', b: null, sa: null, sb: null, status: 'upcoming', date: '13/06 · 21:00' },
      ]
    },
    {
      name: 'Finale',
      matches: [
        { id: 'fn', a: null, b: null, sa: null, sb: null, status: 'upcoming', date: '14/06 · 20:00' },
      ]
    },
  ]
};

// Groups (round-robin), 4 groups of 4
const GROUPS = [
  {
    name: 'Groupe A', teams: ['t1', 't8', 't11', 't14'],
    rows: [
      { team: 't1', mp: 3, w: 3, d: 0, l: 0, gf: 9, ga: 2, pts: 9 },
      { team: 't8', mp: 3, w: 2, d: 0, l: 1, gf: 6, ga: 4, pts: 6 },
      { team: 't11', mp: 3, w: 1, d: 0, l: 2, gf: 4, ga: 6, pts: 3 },
      { team: 't14', mp: 3, w: 0, d: 0, l: 3, gf: 2, ga: 9, pts: 0 },
    ]
  },
  {
    name: 'Groupe B', teams: ['t2', 't7', 't10', 't15'],
    rows: [
      { team: 't2', mp: 3, w: 2, d: 1, l: 0, gf: 7, ga: 2, pts: 7 },
      { team: 't7', mp: 3, w: 2, d: 0, l: 1, gf: 5, ga: 4, pts: 6 },
      { team: 't10', mp: 3, w: 1, d: 0, l: 2, gf: 3, ga: 5, pts: 3 },
      { team: 't15', mp: 3, w: 0, d: 1, l: 2, gf: 2, ga: 6, pts: 1 },
    ]
  },
  {
    name: 'Groupe C', teams: ['t3', 't6', 't12', 't16'],
    rows: [
      { team: 't3', mp: 3, w: 2, d: 1, l: 0, gf: 8, ga: 3, pts: 7 },
      { team: 't6', mp: 3, w: 2, d: 0, l: 1, gf: 6, ga: 4, pts: 6 },
      { team: 't12', mp: 3, w: 1, d: 0, l: 2, gf: 4, ga: 7, pts: 3 },
      { team: 't16', mp: 3, w: 0, d: 1, l: 2, gf: 3, ga: 7, pts: 1 },
    ]
  },
  {
    name: 'Groupe D', teams: ['t4', 't5', 't9', 't13'],
    rows: [
      { team: 't4', mp: 3, w: 3, d: 0, l: 0, gf: 8, ga: 1, pts: 9 },
      { team: 't5', mp: 3, w: 2, d: 0, l: 1, gf: 6, ga: 3, pts: 6 },
      { team: 't9', mp: 3, w: 1, d: 0, l: 2, gf: 4, ga: 6, pts: 3 },
      { team: 't13', mp: 3, w: 0, d: 0, l: 3, gf: 1, ga: 9, pts: 0 },
    ]
  },
];

// Championship standings — Pro League season
const STANDINGS = TEAMS.map((t, i) => ({
  team: t.id,
  rank: i + 1,
  mp: t.wins + t.losses,
  w: t.wins,
  l: t.losses,
  pts: t.wins * 3,
  form: ['W', 'W', 'L', 'W', 'D'].sort(() => 0.5 - Math.random()).slice(0, 5),
  trend: i < 4 ? 'up' : i < 8 ? 'flat' : 'down'
}));

// Calendar — upcoming + recent matches
const CALENDAR = [
  { id: 'm101', date: '2026-06-13', time: '18:00', a: 't1', b: 't5', round: 'Demi-finale', stream: 'twitch', status: 'upcoming' },
  { id: 'm102', date: '2026-06-13', time: '21:00', a: 't2', b: 't3', round: 'Demi-finale', stream: 'youtube', status: 'upcoming' },
  { id: 'm103', date: '2026-06-14', time: '20:00', a: null, b: null, round: 'Finale', stream: 'twitch', status: 'upcoming' },
  { id: 'm104', date: '2026-06-12', time: '21:00', a: 't3', b: 't6', round: 'Quart de finale', sa: 2, sb: 2, stream: 'twitch', status: 'live' },
  { id: 'm105', date: '2026-06-11', time: '21:00', a: 't2', b: 't7', round: 'Quart de finale', sa: 3, sb: 0, status: 'done' },
  { id: 'm106', date: '2026-06-11', time: '19:00', a: 't4', b: 't5', round: 'Quart de finale', sa: 2, sb: 3, status: 'done' },
  { id: 'm107', date: '2026-06-11', time: '17:00', a: 't1', b: 't8', round: 'Quart de finale', sa: 3, sb: 1, status: 'done' },
  { id: 'm108', date: '2026-06-10', time: '20:00', a: 't9', b: 't13', round: 'Poule D', sa: 4, sb: 0, status: 'done' },
  { id: 'm109', date: '2026-06-10', time: '18:00', a: 't4', b: 't13', round: 'Poule D', sa: 3, sb: 0, status: 'done' },
  { id: 'm110', date: '2026-06-15', time: '20:00', a: 't1', b: 't2', round: 'Match d\'exhibition', stream: 'twitch', status: 'upcoming' },
];

// Live match focus
const LIVE_MATCH = {
  id: 'm104',
  round: 'Quart de finale · Match 4',
  a: 't3', b: 't6',
  sa: 2, sb: 2,
  minute: '78\'',
  period: '2e mi-temps',
  status: 'live',
  viewers: 24187,
  bestOf: 'Match unique · prolongations possibles',
  events: [
    { min: '6\'', type: 'goal', team: 't3', player: 'Ravi', detail: 'Frappe enroulée 18m' },
    { min: '23\'', type: 'yellow', team: 't6', player: 'Jin', detail: 'Tacle en retard' },
    { min: '34\'', type: 'goal', team: 't6', player: 'Hye', detail: 'Tête sur corner' },
    { min: '45\'+2', type: 'goal', team: 't6', player: 'Min', detail: 'Contre rapide' },
    { min: '58\'', type: 'sub', team: 't3', player: 'Tico → Dani', detail: 'Changement offensif' },
    { min: '64\'', type: 'goal', team: 't3', player: 'Dani', detail: 'Reprise lucarne' },
    { min: '71\'', type: 'goal', team: 't3', player: 'Mu7', detail: 'Pénalty transformé' },
    { min: '78\'', type: 'now', team: null, player: '', detail: 'Possession Hivemind' },
  ],
  stats: {
    possession: [54, 46],
    shots: [14, 11],
    shotsOnTarget: [7, 5],
    corners: [6, 4],
    fouls: [9, 12],
    passes: [482, 421],
    passAccuracy: [88, 84],
  },
  media: [
    { type: 'photo', label: 'But de Ravi (6\')', tone: 'red' },
    { type: 'video', label: 'Égalisation Hivemind', tone: 'blue', duration: '0:34' },
    { type: 'photo', label: 'Réaction du banc', tone: 'cream' },
    { type: 'video', label: 'Penalty Mu7', tone: 'red', duration: '0:18' },
    { type: 'photo', label: 'Vue arena', tone: 'blue' },
    { type: 'video', label: 'Highlight 1ʳᵉ mi-temps', tone: 'red', duration: '2:14' },
  ],
  summary: `Après une première mi-temps dominée par Hivemind (deux buts en six minutes autour de la pause), Ember a relancé la rencontre dès l'heure de jeu. Dani, entré à la 58ᵉ, a égalisé d'une reprise pleine lucarne avant que Mu7 ne transforme un pénalty obtenu par Ravi. Le score est à présent de 2-2 à douze minutes de la fin, dans une ambiance électrique à La Défense Arena.`
};

// Player profile focus
const PLAYER = {
  id: 'p1',
  handle: 'Le0n',
  realName: 'Léonard Mercier',
  team: 't1',
  role: 'Captain · Attaquant',
  country: 'FR',
  age: 22,
  joined: '2024-08',
  bio: `Capitaine de Nova Esports depuis 2024. Spécialiste du jeu offensif en 4-2-3-1, Le0n est considéré comme l'un des meilleurs joueurs FIFA / EA FC européens. Trois fois finaliste de la Pro League.`,
  socials: { twitch: 'le0n_nvx', youtube: '@le0n', x: '@le0n_nvx', instagram: 'le0n.nvx', tiktok: '@le0n.gg', discord: 'le0n#0001' },
  stats: {
    matches: 142, wins: 98, winRate: 69, goalsPerGame: 2.4, mvp: 31, trophies: 7, currentStreak: 8
  },
  recent: [
    { opp: 't8', result: 'W', score: '3-1', date: '11/06' },
    { opp: 't11', result: 'W', score: '4-0', date: '09/06' },
    { opp: 't14', result: 'W', score: '2-1', date: '07/06' },
    { opp: 't2', result: 'L', score: '1-2', date: '03/06' },
    { opp: 't5', result: 'W', score: '3-2', date: '01/06' },
  ],
  trophies: [
    { year: 2025, name: 'Redak Cup', place: 1 },
    { year: 2025, name: 'EU Masters', place: 2 },
    { year: 2024, name: 'Pro League S4', place: 1 },
    { year: 2024, name: 'Paris Open', place: 1 },
  ]
};

// Media library
const MEDIA_LIBRARY = [
  { id: 'md1', kind: 'photo', title: 'Cérémonie d\'ouverture', match: 'Opening', tone: 'red', size: 'tall' },
  { id: 'md2', kind: 'video', title: 'Top 10 buts — Semaine 1', match: 'Compilation', tone: 'blue', duration: '4:12', size: 'wide' },
  { id: 'md3', kind: 'photo', title: 'NVX vs BLZ — Le0n', match: 'QF1', tone: 'cream', size: 'square' },
  { id: 'md4', kind: 'video', title: 'Highlights QF2', match: 'PXL vs OBL', tone: 'red', duration: '3:08', size: 'square' },
  { id: 'md5', kind: 'photo', title: 'Le public en délire', match: 'QF3', tone: 'blue', size: 'wide' },
  { id: 'md6', kind: 'video', title: 'Réaction d\'après-match Kraken', match: 'QF3', tone: 'cream', duration: '1:42', size: 'square' },
  { id: 'md7', kind: 'photo', title: 'Coulisses — préparation', match: 'Behind the scenes', tone: 'red', size: 'square' },
  { id: 'md8', kind: 'video', title: 'Le but du tournoi ?', match: 'QF4', tone: 'blue', duration: '0:48', size: 'tall' },
  { id: 'md9', kind: 'photo', title: 'Trophée Spring Major', match: 'Setup', tone: 'cream', size: 'square' },
  { id: 'md10', kind: 'video', title: 'Interview Ember Collective', match: 'QF4', tone: 'red', duration: '6:30', size: 'wide' },
  { id: 'md11', kind: 'photo', title: 'L\'arène à pleine capacité', match: 'QF3', tone: 'blue', size: 'square' },
  { id: 'md12', kind: 'video', title: 'Égalisation Hivemind', match: 'QF4 LIVE', tone: 'red', duration: '0:34', size: 'square' },
];

// ============================================================
// CLUB MANAGEMENT — Pro Clubs context
// ============================================================
// The user's club, from captain perspective
const MY_CLUB = {
  id: 'club-nvx',
  tag: 'NVX',
  name: 'Nova Esports',
  fullName: 'Nova Esports Club',
  color: '#ff3b30',
  country: 'FR',
  founded: '2023-09',
  city: 'Paris, France',
  motto: 'Code blue. Strike red.',
  // Tournament / league context
  game: 'EA FC 26 · Pro Clubs',
  format: '11 vs 11',
  formation: '4-2-3-1',
  currentLeague: 'Pro Clubs Elite — Division 1',
  leagueRank: 2,
  leagueRecord: { w: 14, d: 3, l: 2, gf: 52, ga: 18, pts: 45 },
  promotionStatus: 'champions_race',
  // Bank
  trophies: 7,
  followers: 18420,
  monthlyGrowth: '+12%',
  // Discord
  discord: 'discord.gg/nova-esports',
  // Captain
  captainId: 'cp1',
  // Sponsors (club-level)
  sponsors: ['Logitech G', 'Red Bull', 'Secretlab'],
  socials: { twitch: 'novaesports', youtube: '@NovaEsports', x: '@nova_esports', instagram: 'nova.esports', tiktok: '@nova.esports', discord: 'discord.gg/nova' },
};

// Roster — full Pro Club lineup with roles
const CLUB_ROSTER = [
  // Staff
  { id: 'cp1', handle: 'Le0n', name: 'Léonard Mercier', country: 'FR', age: 22, role: 'captain', position: 'ATT', shirt: 10, status: 'online', stream: 'twitch.tv/le0n_nvx', streaming: false, stats: { app: 19, goals: 28, assists: 12, motm: 7, rating: 8.4 }, joined: '2023-09', flair: 'Capitaine fondateur' },
  { id: 'cp2', handle: 'Kr1m', name: 'Karim Belkacem', country: 'FR', age: 24, role: 'vice_captain', position: 'MIL', shirt: 8, status: 'in_game', stream: 'twitch.tv/kr1m', streaming: true, stats: { app: 18, goals: 7, assists: 21, motm: 4, rating: 8.1 }, joined: '2023-10', flair: 'Vice-capitaine · Cerveau du milieu' },
  { id: 'cp3', handle: 'Vyx', name: 'Vincent Yax', country: 'BE', age: 21, role: 'streamer', position: 'DEF', shirt: 4, status: 'online', stream: 'twitch.tv/vyx_live', streaming: true, stats: { app: 19, goals: 2, assists: 4, motm: 2, rating: 7.8 }, joined: '2023-11', flair: 'Streamer officiel · 142K followers' },
  { id: 'cp4', handle: 'Astra', name: 'Anaé Strauss', country: 'CH', age: 23, role: 'starter', position: 'GK', shirt: 1, status: 'online', stream: null, streaming: false, stats: { app: 19, goals: 0, assists: 0, motm: 5, rating: 8.0 }, joined: '2024-01', flair: 'Gardienne titulaire · 7 clean sheets' },
  { id: 'cp5', handle: 'Yu7o', name: 'Yuto Nakamura', country: 'JP', age: 20, role: 'starter', position: 'MIL', shirt: 6, status: 'online', stream: 'twitch.tv/yu7o', streaming: false, stats: { app: 17, goals: 4, assists: 9, motm: 2, rating: 7.6 }, joined: '2024-03', flair: 'Récupérateur · arrivé de PXL' },
  { id: 'cp6', handle: 'Ravn', name: 'Théo Ravenel', country: 'FR', age: 19, role: 'starter', position: 'ATT', shirt: 11, status: 'in_game', stream: null, streaming: false, stats: { app: 18, goals: 14, assists: 6, motm: 3, rating: 7.9 }, joined: '2024-05', flair: 'Ailier explosif' },
  { id: 'cp7', handle: 'Hex', name: 'Hector Pomares', country: 'ES', age: 24, role: 'starter', position: 'DEF', shirt: 3, status: 'offline', stream: null, streaming: false, stats: { app: 16, goals: 1, assists: 2, motm: 1, rating: 7.4 }, joined: '2024-02', flair: 'Latéral solide' },
  { id: 'cp8', handle: 'Mira', name: 'Mira Halvorsen', country: 'NO', age: 22, role: 'starter', position: 'MIL', shirt: 14, status: 'online', stream: 'twitch.tv/mira_nvx', streaming: false, stats: { app: 18, goals: 5, assists: 11, motm: 2, rating: 7.7 }, joined: '2024-01', flair: 'Meneuse de jeu' },
  // Subs
  { id: 'cp9', handle: 'Cinder', name: 'Sandra Iglesias', country: 'ES', age: 20, role: 'sub', position: 'ATT', shirt: 19, status: 'online', stream: null, streaming: false, stats: { app: 9, goals: 6, assists: 2, motm: 1, rating: 7.5 }, joined: '2024-08', flair: 'Joker du banc' },
  { id: 'cp10', handle: 'Sora', name: 'Sora Yamamoto', country: 'JP', age: 18, role: 'sub', position: 'MIL', shirt: 21, status: 'in_game', stream: null, streaming: false, stats: { app: 7, goals: 1, assists: 3, motm: 0, rating: 7.2 }, joined: '2024-09', flair: 'Jeune talent' },
  { id: 'cp11', handle: 'Bj0rn', name: 'Bjørn Halvorsen', country: 'NO', age: 25, role: 'sub', position: 'DEF', shirt: 22, status: 'offline', stream: null, streaming: false, stats: { app: 5, goals: 0, assists: 1, motm: 0, rating: 7.1 }, joined: '2024-11', flair: 'Vétéran du banc' },
  { id: 'cp12', handle: 'Kepa', name: 'Kepa Olarte', country: 'ES', age: 21, role: 'sub', position: 'GK', shirt: 12, status: 'online', stream: null, streaming: false, stats: { app: 2, goals: 0, assists: 0, motm: 0, rating: 7.0 }, joined: '2025-01', flair: 'Gardien remplaçant' },
  // Staff
  { id: 'cp13', handle: 'CoachM', name: 'Marc Dupont', country: 'FR', age: 38, role: 'coach', position: 'STAFF', shirt: null, status: 'online', stream: null, streaming: false, stats: null, joined: '2023-09', flair: 'Coach principal' },
  { id: 'cp14', handle: 'ManR', name: 'Romain Vasseur', country: 'FR', age: 34, role: 'manager', position: 'STAFF', shirt: null, status: 'online', stream: null, streaming: false, stats: null, joined: '2023-09', flair: 'Manager · contrats & logistique' },
];

const ROLE_META = {
  captain: { label: 'Capitaine', short: 'C', color: '#ff3b30', priority: 1 },
  vice_captain: { label: 'Vice-capitaine', short: 'VC', color: '#f59e0b', priority: 2 },
  streamer: { label: 'Streamer officiel', short: 'STR', color: '#a855f7', priority: 3 },
  starter: { label: 'Titulaire', short: 'TIT', color: '#0f0f10', priority: 4 },
  sub: { label: 'Remplaçant', short: 'SUB', color: '#71706b', priority: 5 },
  coach: { label: 'Coach', short: 'COACH', color: '#2547ff', priority: 6 },
  manager: { label: 'Manager', short: 'MGR', color: '#16a34a', priority: 7 },
};

const STATUS_META = {
  online: { label: 'En ligne', color: '#16a34a' },
  in_game: { label: 'En jeu', color: '#ff3b30' },
  offline: { label: 'Hors ligne', color: '#94a3b8' },
};

// Pending applications to join the club
const CLUB_APPLICATIONS = [
  { id: 'app1', handle: 'Vortex_FR', name: 'Mehdi Tahiri', country: 'FR', age: 19, position: 'ATT', level: 'Division 2 EU', winRate: 71, message: 'Salut Nova ! J\'ai suivi votre saison en Elite, j\'aimerais passer un essai pour le poste d\'ailier. Je stream aussi sur Twitch (8K followers).', referredBy: 'Yu7o', tryoutDate: '15/06', stats: { matches: 84, goals: 132, assists: 47, rating: 8.2 }, sentAt: 'il y a 2 jours' },
  { id: 'app2', handle: 'NeoKeeper', name: 'Anastasia Volkov', country: 'PL', age: 22, position: 'GK', level: 'Division 1 EU', winRate: 68, message: 'Cherche un club ambitieux pour la prochaine saison. Disponible 4 soirs/semaine + week-ends.', referredBy: null, tryoutDate: '17/06', stats: { matches: 156, goals: 0, assists: 0, rating: 8.0 }, sentAt: 'il y a 4 jours' },
  { id: 'app3', handle: 'Zeke', name: 'Ezekiel Marchand', country: 'BE', age: 17, position: 'MIL', level: 'Division 3 EU', winRate: 64, message: 'Jeune joueur, motivé, je peux apporter de l\'énergie sur le côté droit.', referredBy: null, tryoutDate: null, stats: { matches: 42, goals: 8, assists: 14, rating: 7.4 }, sentAt: 'il y a 6 jours' },
  { id: 'app4', handle: 'Kasper', name: 'Kasper Lindqvist', country: 'SE', age: 24, position: 'DEF', level: 'Division 1 EU', winRate: 73, message: 'Défenseur central expérimenté, libre depuis la dissolution de Northern Stars.', referredBy: 'Mira', tryoutDate: '18/06', stats: { matches: 198, goals: 12, assists: 8, rating: 8.1 }, sentAt: 'aujourd\'hui' },
  { id: 'app5', handle: 'Phoenix_TV', name: 'Léa Renaud', country: 'FR', age: 23, position: 'ATT', level: 'Division 2 EU', winRate: 69, message: 'Streamer (24K followers Twitch) + joueuse compétitive. Cherche un club pour structurer ma carrière esport.', referredBy: null, tryoutDate: null, stats: { matches: 67, goals: 91, assists: 34, rating: 7.9 }, sentAt: 'aujourd\'hui' },
];

// Pro Clubs League — separate competition the club competes in
const PRO_CLUBS_LEAGUE = {
  name: 'EA FC Pro Clubs Elite',
  division: 'Division 1 — Conférence Ouest',
  season: 'Saison 5 · J19/24',
  prizePool: '180 000 € (saison)',
  promotionSlots: 2,
  relegationSlots: 3,
  standings: [
    { rank: 1, club: 'Kraken Gaming', tag: 'KRA', color: '#2547ff', country: 'NO', mp: 19, w: 15, d: 2, l: 2, gf: 58, ga: 19, pts: 47, form: ['W','W','W','W','D'] },
    { rank: 2, club: 'Nova Esports', tag: 'NVX', color: '#ff3b30', country: 'FR', mp: 19, w: 14, d: 3, l: 2, gf: 52, ga: 18, pts: 45, form: ['W','W','W','D','W'], mine: true },
    { rank: 3, club: 'Ember Collective', tag: 'EMB', color: '#ff8a00', country: 'BR', mp: 19, w: 13, d: 2, l: 4, gf: 49, ga: 28, pts: 41, form: ['W','L','W','W','W'] },
    { rank: 4, club: 'Pixel Wolves', tag: 'PXL', color: '#00b86b', country: 'JP', mp: 19, w: 12, d: 1, l: 6, gf: 44, ga: 31, pts: 37, form: ['W','W','L','W','D'] },
    { rank: 5, club: 'Oblivion', tag: 'OBL', color: '#a855f7', country: 'DE', mp: 19, w: 10, d: 3, l: 6, gf: 41, ga: 33, pts: 33, form: ['L','W','D','W','W'] },
    { rank: 6, club: 'Hivemind', tag: 'HVR', color: '#facc15', country: 'KR', mp: 19, w: 9, d: 4, l: 6, gf: 38, ga: 34, pts: 31, form: ['W','D','L','W','L'] },
    { rank: 7, club: 'Azur Légion', tag: 'AZR', color: '#0ea5e9', country: 'FR', mp: 19, w: 8, d: 3, l: 8, gf: 32, ga: 35, pts: 27, form: ['L','W','L','D','W'] },
    { rank: 8, club: 'Blizzard FC', tag: 'BLZ', color: '#94a3b8', country: 'CA', mp: 19, w: 6, d: 4, l: 9, gf: 28, ga: 38, pts: 22, form: ['L','D','L','W','D'] },
    { rank: 9, club: 'Solar Riot', tag: 'SLR', color: '#f43f5e', country: 'ES', mp: 19, w: 4, d: 5, l: 10, gf: 24, ga: 41, pts: 17, form: ['L','L','D','D','W'] },
    { rank: 10, club: 'Neon Tigers', tag: 'NEO', color: '#22d3ee', country: 'TH', mp: 19, w: 3, d: 2, l: 14, gf: 18, ga: 56, pts: 11, form: ['L','L','L','L','D'] },
  ],
  schedule: [
    { date: '08/06', time: '21:00', opp: 'Oblivion', oppTag: 'OBL', oppColor: '#a855f7', home: true, stream: 'twitch', status: 'upcoming' },
    { date: '11/06', time: '20:00', opp: 'Kraken Gaming', oppTag: 'KRA', oppColor: '#2547ff', home: false, stream: 'twitch', status: 'upcoming', big: true },
    { date: '15/06', time: '21:00', opp: 'Pixel Wolves', oppTag: 'PXL', oppColor: '#00b86b', home: true, stream: 'youtube', status: 'upcoming' },
    { date: '04/06', time: '20:30', opp: 'Hivemind', oppTag: 'HVR', oppColor: '#facc15', home: true, score: '3-1', status: 'done' },
    { date: '01/06', time: '21:00', opp: 'Azur Légion', oppTag: 'AZR', oppColor: '#0ea5e9', home: false, score: '2-2', status: 'done' },
  ]
};

// Active streams from club members
const CLUB_STREAMS_LIVE = [
  { player: 'Kr1m', platform: 'twitch', title: 'Pro Clubs Elite — Pré-match vs Kraken 🔵', viewers: 1842, started: '2h12', color: '#f59e0b' },
  { player: 'Vyx', platform: 'twitch', title: 'Entraînement défensif + Q&R avec le coach', viewers: 524, started: '47min', color: '#a855f7' },
];
const CLUB_STREAMS_SCHEDULED = [
  { player: 'Le0n', platform: 'twitch', when: 'Ce soir · 20h', topic: 'Live match Pro Clubs Division 1' },
  { player: 'Mira', platform: 'tiktok', when: 'Demain · 19h', topic: 'Highlights de la semaine' },
  { player: 'Yu7o', platform: 'youtube', when: 'Vendredi · 18h', topic: 'Tactique 4-2-3-1 expliquée' },
  { player: 'Vyx', platform: 'kick', when: 'Samedi · 21h', topic: 'Co-stream avec invité surprise' },
];

// Helpers
const teamById = (id) => TEAMS.find(t => t.id === id);
const flag = (cc) => COUNTRY_FLAGS[cc] || '🏴';
const playerById = (id) => CLUB_ROSTER.find(p => p.id === id);

Object.assign(window, {
  TEAMS, COUNTRY_FLAGS, TOURNAMENT, BRACKET_SE, GROUPS, STANDINGS,
  CALENDAR, LIVE_MATCH, PLAYER, MEDIA_LIBRARY, teamById, flag,
  MY_CLUB, CLUB_ROSTER, ROLE_META, STATUS_META, CLUB_APPLICATIONS,
  PRO_CLUBS_LEAGUE, CLUB_STREAMS_LIVE, CLUB_STREAMS_SCHEDULED, playerById
});
