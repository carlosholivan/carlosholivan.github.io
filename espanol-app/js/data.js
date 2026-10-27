const cache = {};

export async function loadUnit(level, unitNum) {
  const key = `${level}-${unitNum}`;
  if (cache[key]) return cache[key];

  const units = await loadJSON(`data/${level}/units.json`);
  const unit = units.find(u => u.id === unitNum);
  if (!unit) return null;

  cache[key] = unit;
  return unit;
}

export async function loadVocab(level) {
  return loadJSON(`data/${level}/vocab.json`);
}

export async function loadGrammar(level) {
  return loadJSON(`data/${level}/grammar.json`);
}

export async function loadTexts(level) {
  try { return await loadJSON(`data/${level}/texts.json`); } catch (e) { return []; }
}

export async function loadDrills(level) {
  try { return await loadJSON(`data/${level}/drills.json`); } catch (e) { return []; }
}

export async function loadUnits(level) {
  return loadJSON(`data/${level}/units.json`);
}

async function loadJSON(path) {
  if (cache[path]) return cache[path];
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  const data = await res.json();
  cache[path] = data;
  return data;
}
