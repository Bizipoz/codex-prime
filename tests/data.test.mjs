import assert from 'node:assert/strict';
import test from 'node:test';
import { calendarDays, emptyData, filterPatterns, readData, statistics, storageKey, universes, upsert, writeData } from '../public/data.mjs';

const robe = { id: 'robe', brand: 'Atelier', model: 'Églantine', universe: 'Vêtements', formats: ['PDF', 'Papier'], sizes: '34–46' };
const sac = { id: 'sac', brand: 'Maison', model: 'Cabas', universe: 'Accessoires', formats: ['Papier'], sizes: 'Unique' };
const projet = { id: 'premier', patternId: robe.id, name: 'Robe en lin', size: '38', status: 'En couture', notes: 'Ourlet à refaire' };

test('La recherche combine les mots et le filtre, sans tenir compte des accents', () => {
  assert.deepEqual(filterPatterns([robe, sac], 'eglantine atelier', 'vetements'), [robe]);
  assert.deepEqual(filterPatterns([robe, sac], 'eglantine', 'Accessoires'), []);
  assert.deepEqual(universes([robe, sac, { ...robe, universe: 'vêtements' }]), ['Accessoires', 'vêtements']);
});

test('Deux projets gardent des tailles et des statuts distincts pour le même patron', () => {
  const other = { ...projet, id: 'second', size: '42', status: 'À démarrer' };
  const projects = upsert(upsert([], projet), other);
  const updated = upsert(projects, { ...projet, status: 'Terminé' });
  assert.deepEqual(updated, [other, { ...projet, status: 'Terminé' }]);
  assert.deepEqual(statistics({ patterns: [robe], projects: updated }), { patterns: 1, active: 1, finished: 1 });
});

test('Le stockage fonctionne après relecture et signale les données corrompues', () => {
  const memory = new Map();
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  assert.deepEqual(readData(storage), emptyData());
  const data = { patterns: [robe], projects: [projet], activities: [{ id: 'a', date: '2026-11-26', description: 'Découpe du tissu' }] };
  writeData(storage, data);
  assert.deepEqual(readData(storage), data);
  memory.set(storageKey, '{');
  assert.throws(() => readData(storage));
  memory.set(storageKey, JSON.stringify({ ...data, patterns: [] }));
  assert.throws(() => readData(storage));
});

test('Le calendrier commence un lundi, additionne les déclarations et exclut les jours futurs', () => {
  const days = calendarDays([{ date: '2026-11-26' }, { date: '2026-11-26' }, { date: '2026-11-28' }], new Date(2026, 10, 26));
  assert.deepEqual(days[0], { date: '2025-12-01', count: 0 });
  assert.deepEqual(days.at(-1), { date: '2026-11-26', count: 2 });
  assert.equal(days.length, 361);
  assert.equal(days.reduce((total, day) => total + day.count, 0), 2);
});
