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

export async function loadUnits(level) {
  return loadJSON(`data/${level}/units.json`);
}

async function loadJSON(path) {
  if (cache[path]) return cache[path];
  const res = await fetch(path);
  const data = await res.json();
  cache[path] = data;
  return data;
}
