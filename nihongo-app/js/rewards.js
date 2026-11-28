// Rewards: gems earned by studying (every 2 XP = 1 gem, so lessons, reviews, texts and challenges all count),
// a daily chest on the story map once you have studied that day, and a shop of looks for the hero (outfit, hat,
// cape, companion) plus a streak shield that saves the streak on a missed day. Shared by every language app.
import { S, update } from './state.js?v=202611281102';

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
