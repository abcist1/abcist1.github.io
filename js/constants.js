// js/constants.js

// Показывает
export const STATS_MAP = {
  defense: "Защита (%)",
  regeneration: "Регенерация HP",
  damage: "Урон",
  luck: "Удача (%)",
  maxHp: "Макс. HP",
  maxArmor: "Макс. Броня",
  stunChance: "Шанс оглушения (%)",
  drunkChance: "Шанс опьянения (%)",
  stunEvasion: "Шанс избежать оглушения (%)",
  damageReflection: "Отражение урона (%)"
};

// Порядок
export const STATS_ORDER = [
  'defense',
  'regeneration',
  'damage',
  'luck',
  'maxHp',
  'maxArmor',
  'stunChance',
  'drunkChance',
  'stunEvasion',
  'damageReflection'
];

// Объект с лимитами характеристик >>>
export const STAT_CAPS = {
  defense: 90,

};

// Максимальные заточки
export const MAX_ENHANCEMENT_LEVELS = {
    skin: 12,
    accessory: 14
};

// Нашивки
export const PATCH_OPTIONS = [
    { type: 'none', value: 0 },
    { type: 'defense', value: 1 },
    { type: 'defense', value: 2 },
    { type: 'defense', value: 3 },
    { type: 'damage', value: 1 },
    { type: 'damage', value: 2 },
    { type: 'damage', value: 3 }
];

// Бонус от уровня заточки
export const ENHANCEMENT_CONFIG = {
  bonusPerLevel: {
    defense: 2,
    damage: 1,
    luck: 1,
    maxHp: 5,
    maxArmor: 3,
    regeneration: 1
  },
  level13Bonus: {
    defense: 2,
    maxHp: 4,
    maxArmor: 9
  },
  level14Bonus: {
    defense: 2,
    regeneration: 3,
    maxArmor: 5,
    damageReflection: 1
  }
};