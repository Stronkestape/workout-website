// src/utils/workoutThemes.js

export const WORKOUT_THEMES = {
  walkenergie: {
    key: 'walkenergie',
    label: 'WALKenergie',
    category: 'Kardió & Állóképesség',
    duration: '60 perc',
    intensity: 'Közepes – Magas',
    accentBg: 'bg-emerald-600',
    accentText: 'text-emerald-800',
    badgeBg: 'bg-emerald-100/90',
    badgeText: 'text-emerald-900',
    badgeBorder: 'border-emerald-300',
    calendarBg: '#d1fae5',
    calendarBorder: '#059669',
    calendarText: '#064e3b',
  },
  spinning: {
    key: 'spinning',
    label: 'Spinning',
    category: 'Teremkerékpár',
    duration: '60 perc',
    intensity: 'Magas',
    accentBg: 'bg-blue-600',
    accentText: 'text-blue-800',
    badgeBg: 'bg-blue-100/90',
    badgeText: 'text-blue-900',
    badgeBorder: 'border-blue-300',
    calendarBg: '#dbeafe',
    calendarBorder: '#2563eb',
    calendarText: '#1e3a8a',
  },
  'step aerobik': {
    key: 'step aerobik',
    label: 'Step Aerobik',
    category: 'Ritmus & Kardió',
    duration: '60 perc',
    intensity: 'Közepes',
    accentBg: 'bg-rose-600',
    accentText: 'text-rose-800',
    badgeBg: 'bg-rose-100/90',
    badgeText: 'text-rose-900',
    badgeBorder: 'border-rose-300',
    calendarBg: '#ffe4e6',
    calendarBorder: '#e11d48',
    calendarText: '#881337',
  },
  alakformalo: {
    key: 'alakformalo',
    label: 'Alakformálás',
    category: 'Alakformálás & Tónus',
    duration: '60 perc',
    intensity: 'Közepes',
    accentBg: 'bg-violet-600',
    accentText: 'text-violet-800',
    badgeBg: 'bg-violet-100/90',
    badgeText: 'text-violet-900',
    badgeBorder: 'border-violet-300',
    calendarBg: '#ede9fe',
    calendarBorder: '#7c3aed',
    calendarText: '#4c1d95',
  },
  tabata: {
    key: 'tabata',
    label: 'Tabata',
    category: 'HIIT Intervallum',
    duration: '60 perc',
    intensity: 'Maximális',
    accentBg: 'bg-amber-600',
    accentText: 'text-amber-800',
    badgeBg: 'bg-amber-100/90',
    badgeText: 'text-amber-900',
    badgeBorder: 'border-amber-300',
    calendarBg: '#fef3c7',
    calendarBorder: '#d97706',
    calendarText: '#78350f',
  },
  gymstick: {
    key: 'gymstick',
    label: 'GYMSTICK',
    category: 'Ellenállás & Törzs',
    duration: '60 perc',
    intensity: 'Közepes',
    accentBg: 'bg-teal-600',
    accentText: 'text-teal-800',
    badgeBg: 'bg-teal-100/90',
    badgeText: 'text-teal-900',
    badgeBorder: 'border-teal-300',
    calendarBg: '#ccfbf1',
    calendarBorder: '#0d9488',
    calendarText: '#134e4a',
  },
  'funkcionalis edzes': {
    key: 'funkcionalis edzes',
    label: 'Funkcionális Tréning',
    category: 'Erőnlét & Mobilitás',
    duration: '60 perc',
    intensity: 'Magas',
    accentBg: 'bg-indigo-600',
    accentText: 'text-indigo-800',
    badgeBg: 'bg-indigo-100/90',
    badgeText: 'text-indigo-900',
    badgeBorder: 'border-indigo-300',
    calendarBg: '#e0e7ff',
    calendarBorder: '#4f46e5',
    calendarText: '#312e81',
  },
};

export const DEFAULT_THEME = {
  key: 'default',
  label: 'Egyéb Edzés',
  category: 'Csoportos Óra',
  duration: '60 perc',
  intensity: 'Minden szint',
  accentBg: 'bg-stone-700',
  accentText: 'text-stone-800',
  badgeBg: 'bg-stone-200/90',
  badgeText: 'text-stone-900',
  badgeBorder: 'border-stone-300',
  calendarBg: '#e7e5e4',
  calendarBorder: '#57534e',
  calendarText: '#1c1917',
};

const THEME_MATCHERS = [
  {
    key: 'walkenergie',
    matches: (norm) => norm.includes('walk'),
  },
  {
    key: 'spinning',
    matches: (norm) => norm.includes('spin') || norm.includes('cycle'),
  },
  {
    key: 'step aerobik',
    matches: (norm) => norm.includes('step'),
  },
  {
    key: 'alakformalo',
    matches: (norm) =>
      norm.includes('alakformal') ||
      norm.includes('sculpt') ||
      norm.includes('toning'),
  },
  {
    key: 'tabata',
    matches: (norm) => norm.includes('tabata'),
  },
  {
    key: 'gymstick',
    matches: (norm) => norm.includes('gymstick'),
  },
  {
    key: 'funkcionalis edzes',
    matches: (norm) =>
      norm.includes('funkcional') ||
      norm.includes('function') ||
      norm.includes('funkci') ||
      norm.includes('cross') ||
      norm.includes('koredzes'),
  },
];

export function normalizeWorkoutKey(title = '') {
  return String(title ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function getWorkoutTheme(title = '') {
  const normalized = normalizeWorkoutKey(title);
  if (!normalized) {
    return DEFAULT_THEME;
  }

  // Exact key match
  if (WORKOUT_THEMES[normalized]) {
    return WORKOUT_THEMES[normalized];
  }

  // Robust stem/root matcher to cover real gym variations
  for (const matcher of THEME_MATCHERS) {
    if (matcher.matches(normalized)) {
      return WORKOUT_THEMES[matcher.key];
    }
  }

  return DEFAULT_THEME;
}
