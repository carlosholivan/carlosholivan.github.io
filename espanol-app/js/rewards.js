// Rewards: gems earned by studying (every 2 XP = 1 gem, so lessons, reviews, texts and challenges all count),
// a daily chest on the story map once you have studied that day, and a shop of looks for the hero (outfit, hat,
// cape, companion) plus a streak shield that saves the streak on a missed day. Shared by every language app.
import { S, update } from './state.js?v=202611282029';

const today = () => new Date().toISOString().slice(0, 10);
export const R = () => {
  const r = S.rew || {};
  return { bonus: 0, spent: 0, owned: {}, wear: {}, chest: '', shield: 0, t: 0, ...r };
};
const put = r => { r.t = Date.now(); update({ rew: r }); };
export const gems = () => Math.max(0, Math.floor((S.xp || 0) / 2) + (R().bonus || 0) - (R().spent || 0));

// The chest is ready once you have studied today and have not opened it yet.
export const chestReady = () => S.lastDay === today() && R().chest !== today();
export function openChest() {
  if (!chestReady()) return 0;
  const r = R(), n = 10 + Math.min(S.streak || 0, 30) + Math.floor(Math.random() * 16);
  r.bonus += n; r.chest = today(); put(r);
  return n;
}

// id, slot, price, icon, names. Slot 'shield' is a consumable.
export const SHOP = [
  { id: 'green', slot: 'outfit', cost: 120, icon: '🟢', n: { es: 'Túnica de explorador', en: 'Explorer tunic' } },
  { id: 'crimson', slot: 'outfit', cost: 120, icon: '🔴', n: { es: 'Traje carmesí', en: 'Crimson outfit' } },
  { id: 'night', slot: 'outfit', cost: 160, icon: '🌌', n: { es: 'Traje de noche estrellada', en: 'Starry night outfit' } },
  { id: 'snow', slot: 'outfit', cost: 160, icon: '❄️', n: { es: 'Traje de nieve', en: 'Snow outfit' } },
  { id: 'cap', slot: 'hat', cost: 90, icon: '🧢', n: { es: 'Gorro de aventurero', en: "Adventurer's cap" } },
  { id: 'straw', slot: 'hat', cost: 80, icon: '👒', n: { es: 'Sombrero de paja', en: 'Straw hat' } },
  { id: 'flowers', slot: 'hat', cost: 100, icon: '🌸', n: { es: 'Corona de flores', en: 'Flower crown' } },
  { id: 'wool', slot: 'hat', cost: 70, icon: '🧶', n: { es: 'Gorro de lana', en: 'Wool hat' } },
  { id: 'red', slot: 'cape', cost: 150, icon: '🟥', n: { es: 'Capa roja', en: 'Red cape' } },
  { id: 'blue', slot: 'cape', cost: 150, icon: '🟦', n: { es: 'Capa azul', en: 'Blue cape' } },
  { id: 'mochi', slot: 'pet', cost: 250, icon: '🍡', n: { es: 'Mochi, la mascota', en: 'Mochi the mascot' } },
  { id: 'fairy', slot: 'pet', cost: 200, icon: '✨', n: { es: 'Hada de luz', en: 'Fairy of light' } },
  { id: 'fox', slot: 'pet', cost: 280, icon: '🦊', n: { es: 'Zorro de nieve', en: 'Snow fox' } },
  { id: 'shield', slot: 'shield', cost: 60, icon: '🛡️', n: { es: 'Escudo de racha (salva un día perdido)', en: 'Streak shield (saves one missed day)' } },
];

export function buy(id) {
  const it = SHOP.find(x => x.id === id), r = R();
  if (!it || gems() < it.cost || (it.slot !== 'shield' && r.owned[id])) return false;
  r.spent += it.cost;
  if (it.slot === 'shield') r.shield = (r.shield || 0) + 1;
  else { r.owned = { ...r.owned, [id]: 1 }; r.wear = { ...r.wear, [it.slot]: id }; }
  put(r);
  return true;
}
export function wear(slot, id) {
  const r = R();
  if (id && !r.owned[id]) return;
  r.wear = { ...r.wear, [slot]: id || undefined };
  put(r);
}

// "Did you know?" facts read at the elders' stones: +3 gems the first time each one is read.
export function readFact(k) {
  const r = R(), read = { ...(r.read || {}) };
  if (read[k]) return false;
  read[k] = 1; r.read = read; r.bonus += 3; put(r);
  return true;
}
export const factsRead = () => Object.keys(R().read || {}).length;

// Lives (themed per language: onigiri in Japanese, dumplings in Chinese…). A wrong answer costs one and they come
// back one every 20 minutes. Running out never stops you from studying: you keep playing, you only miss the bonus
// gems that a challenge pays for every life you still have at the end.
export const LIFE_MAX = 5, LIFE_MS = 20 * 60000;
const gained = r => r.lv == null ? 0 : Math.floor((Date.now() - (r.lt || 0)) / LIFE_MS);
export function lives() { const r = R(); return r.lv == null ? LIFE_MAX : Math.min(LIFE_MAX, r.lv + gained(r)); }
export function loseLife() {
  const r = R(), n = lives();
  if (n <= 0) return 0;
  r.lt = n >= LIFE_MAX ? Date.now() : (r.lt || Date.now()) + gained(r) * LIFE_MS;   // keep the part of the 20 minutes already waited
  r.lv = n - 1; put(r);
  return r.lv;
}
export const lifeIn = () => { const r = R(); return lives() >= LIFE_MAX ? 0 : LIFE_MS - ((Date.now() - (r.lt || 0)) % LIFE_MS); };
export const livesFullAt = () => { const r = R(), n = lives(); return n >= LIFE_MAX ? 0 : Date.now() + lifeIn() + (LIFE_MAX - n - 1) * LIFE_MS; };
export function addGems(n) { const r = R(); r.bonus += n; put(r); return n; }

// Out of lives: earn one back by reviewing (5 right answers in any review = +1), or refill them all with gems.
export const REFILL_COST = 40;
export const earned = () => R().earn || 0;
export function earnTick() {
  if (lives() >= LIFE_MAX) return false;
  const r = R(); r.earn = (r.earn || 0) + 1;
  const got = r.earn >= 5;
  if (got) { r.earn = 0; r.lv = (r.lv == null ? LIFE_MAX : r.lv) + 1; }
  put(r);
  if (got) try { window.dispatchEvent(new CustomEvent('lifeearned')); } catch (e) {}
  return got;
}
export function refillLives() {
  if (gems() < REFILL_COST) return false;
  const r = R(); r.spent += REFILL_COST; r.lv = LIFE_MAX; r.lt = Date.now(); r.earn = 0; put(r);
  return true;
}
