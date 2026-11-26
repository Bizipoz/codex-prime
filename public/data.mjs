export const statuses = ['À démarrer', 'Découpé', 'En couture', 'Terminé'];
export const formats = ['PDF', 'Papier'];
export const storageKey = 'point-par-point.v1';

export function emptyData() {
  return { patterns: [], projects: [], activities: [] };
}

function isDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function readData(storage) {
  const raw = storage.getItem(storageKey);
  if (raw === null) return emptyData();
  const data = JSON.parse(raw);
  const string = value => typeof value === 'string';
  const record = (item, fields) => item && fields.every(field => string(item[field]));
  if (!data || !Object.keys(emptyData()).every(key => Array.isArray(data[key]))
    || !data.patterns.every(item => record(item, ['id', 'brand', 'model', 'universe', 'sizes'])
      && Array.isArray(item.formats) && item.formats.length && item.formats.every(format => formats.includes(format)))
    || !data.projects.every(item => record(item, ['id', 'patternId', 'name', 'size', 'status', 'notes'])
      && statuses.includes(item.status) && data.patterns.some(pattern => pattern.id === item.patternId))
    || !data.activities.every(item => record(item, ['id', 'date', 'description']) && isDateKey(item.date))) {
    throw new Error('Données locales invalides');
  }
  return data;
}

export function writeData(storage, data) {
  storage.setItem(storageKey, JSON.stringify(data));
}

export function upsert(items, item) {
  return items.some(entry => entry.id === item.id)
    ? items.map(entry => entry.id === item.id ? item : entry)
    : [item, ...items];
}

function normalize(value) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

export function filterPatterns(patterns, query, universe) {
  const terms = normalize(query).split(/\s+/);
  return patterns.filter(pattern => {
    const text = normalize([pattern.brand, pattern.model, pattern.universe, pattern.sizes].join(' '));
    return (!universe || normalize(pattern.universe) === normalize(universe))
      && terms.every(term => text.includes(term));
  });
}

export function universes(patterns) {
  const unique = new Map(patterns.map(pattern => [normalize(pattern.universe), pattern.universe]));
  return [...unique.values()].sort((a, b) => a.localeCompare(b, 'fr'));
}

export function statistics(data) {
  const finished = data.projects.filter(project => project.status === 'Terminé').length;
  return { patterns: data.patterns.length, active: data.projects.length - finished, finished };
}

export function dateKey(date) {
  const pad = number => String(number).padStart(2, '0');
  return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-');
}

export function calendarDays(activities, today = new Date()) {
  const totals = new Map();
  for (const { date } of activities) totals.set(date, (totals.get(date) ?? 0) + 1);
  const mondayOffset = (today.getDay() + 6) % 7;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset - 51 * 7);
  const days = [];
  while (cursor <= today) {
    const date = dateKey(cursor);
    days.push({ date, count: totals.get(date) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}
