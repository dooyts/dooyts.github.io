
import { GachaPool, CharacterRarity, Currency, GachaItemType, GachaResultItem, EquipmentSlot } from '../types';
import { BASE_CHARACTERS } from './characterConstants';
import { BASE_EQUIPMENT_ITEMS } from './equipmentConstants';
import { BASE_PETS } from './petConstants';
import { BASE_RUNES } from './runeConstants';
import { CURRENCY_EMOJIS } from './uiConstants';


export const CHARACTER_GACHA_POOL: GachaPool = {
  id: 'character_standard_banner',
  name: '英雄標準召喚',
  costCurrency: Currency.DIAMONDS,
  costAmount: 2700,
  pulls: [1, 10],
  singlePullCost: { currency: Currency.GACHA_TICKET, amount: 1 },
  guarantees: { softPityStart: 75, ssrPerSoftPityIncrease: 0.02, hardPitySSR: 100, upGuaranteeRate: 0.5 },
  rates: { [CharacterRarity.UR]: 0.01, [CharacterRarity.SSR]: 0.04, [CharacterRarity.SR]: 0.15, [CharacterRarity.R]: 0.80, [CharacterRarity.N]: 0 },
  itemPool: BASE_CHARACTERS.map(c => ({ type: 'character', id: c.id, rarity: c.rarity })),
  upItems: [{ type: 'character', id: 'c004' }, {type: 'character', id: 'c005'}, {type: 'character', id: 'c009'}],
};
export const CHARACTER_GACHA_POOL_WATER_UP: GachaPool = {
  ...CHARACTER_GACHA_POOL,
  id: 'character_water_up_banner',
  name: '蒼藍的呼喚 (水UP)',
  upItems: [{ type: 'character', id: 'c005' }, {type: 'character', id: 'c001'}],
  itemPool: BASE_CHARACTERS.map(c => ({ type: 'character', id: c.id, rarity: c.rarity })),
};
export const CHARACTER_GACHA_POOL_FIRE_UP: GachaPool = {
  ...CHARACTER_GACHA_POOL,
  id: 'character_fire_up_banner',
  name: '赤炎的誓約 (火UP)',
  upItems: [{ type: 'character', id: 'c006' }, {type: 'character', id: 'c002'}],
  itemPool: BASE_CHARACTERS.map(c => ({ type: 'character', id: c.id, rarity: c.rarity })),
};
export const CHARACTER_GACHA_POOL_WIND_UR_UP: GachaPool = {
  ...CHARACTER_GACHA_POOL,
  id: 'character_wind_ur_up_banner',
  name: '風神怒號 (風UR UP)',
  upItems: [{ type: 'character', id: 'c012' }], // UR Wind hero c012
  itemPool: BASE_CHARACTERS.map(c => ({ type: 'character', id: c.id, rarity: c.rarity })),
  rates: { [CharacterRarity.UR]: 0.015, [CharacterRarity.SSR]: 0.04, [CharacterRarity.SR]: 0.15, [CharacterRarity.R]: 0.795, [CharacterRarity.N]: 0 },
};
export const CHARACTER_GACHA_POOL_DARK_UR_UP: GachaPool = {
  ...CHARACTER_GACHA_POOL,
  id: 'character_dark_ur_up_banner',
  name: '虛空降臨 (暗UR UP)',
  upItems: [{ type: 'character', id: 'c014' }], // New UR Dark hero c014
  itemPool: BASE_CHARACTERS.map(c => ({ type: 'character', id: c.id, rarity: c.rarity })),
  rates: { [CharacterRarity.UR]: 0.015, [CharacterRarity.SSR]: 0.04, [CharacterRarity.SR]: 0.15, [CharacterRarity.R]: 0.795, [CharacterRarity.N]: 0 },
};


export const SINGLE_PULL_COST_DIAMONDS = 300;
export const SINGLE_PULL_COST_GACHA_TICKET = 1;

export const EQUIPMENT_GACHA_POOL: GachaPool = {
  id: 'equipment_standard_banner',
  name: '稀有裝備工坊',
  costCurrency: Currency.DIAMONDS,
  costAmount: 1800,
  pulls: [1, 10],
  singlePullCost: { currency: Currency.EQUIPMENT_TICKET, amount: 1 },
  guarantees: { softPityStart: 15, ssrPerSoftPityIncrease: 0.05, hardPitySSR: 30, upGuaranteeRate: 0.5 },
  rates: { [CharacterRarity.UR]: 0.01, [CharacterRarity.SSR]: 0.05, [CharacterRarity.SR]: 0.24, [CharacterRarity.R]: 0.70, [CharacterRarity.N]: 0 },
  itemPool: BASE_EQUIPMENT_ITEMS.map(e => ({ type: 'equipment', id: e.id, rarity: e.rarity })),
  upItems: [{ type: 'equipment', id: 'eq_wpn_004' }, { type: 'equipment', id: 'eq_leg_005' }],
};
export const EQUIPMENT_GACHA_POOL_ACCESSORY_UP: GachaPool = {
  ...EQUIPMENT_GACHA_POOL,
  id: 'equipment_accessory_up_banner',
  name: '神賜飾品坊 (飾品UP)',
  upItems: [{ type: 'equipment', id: 'eq_acc_008' }], // New UR Accessory
  itemPool: BASE_EQUIPMENT_ITEMS.filter(e => e.slot === EquipmentSlot.ACCESSORY).map(e => ({ type: 'equipment', id: e.id, rarity: e.rarity })),
  rates: { [CharacterRarity.UR]: 0.02, [CharacterRarity.SSR]: 0.08, [CharacterRarity.SR]: 0.25, [CharacterRarity.R]: 0.65, [CharacterRarity.N]: 0 },
};


export const SINGLE_PULL_COST_DIAMONDS_EQUIPMENT = 200;
export const SINGLE_PULL_COST_EQUIPMENT_TICKET = 1;


export const PET_GACHA_POOL_STANDARD: GachaPool = {
    ...CHARACTER_GACHA_POOL, // Use character pool as a base for structure, then override
    id: 'pet_standard_banner',
    name: '神秘寵物蛋',
    costCurrency: Currency.DIAMONDS,
    costAmount: 1500, // Cost for 10 pulls
    singlePullCost: {currency: Currency.PET_TICKET, amount:1},
    itemPool: BASE_PETS.map(p => ({type: 'pet', id: p.id, rarity: p.rarity})),
    rates: { [CharacterRarity.UR]: 0.005, [CharacterRarity.SSR]: 0.05, [CharacterRarity.SR]: 0.245, [CharacterRarity.R]: 0.70, [CharacterRarity.N]: 0 },
    upItems: BASE_PETS.filter(p=>p.rarity === CharacterRarity.UR || p.rarity === CharacterRarity.SSR).map(p=>({type:'pet', id:p.id}))
};
export const RUNE_GACHA_POOL_STANDARD: GachaPool = {
    ...CHARACTER_GACHA_POOL, // Use character pool as a base for structure, then override
    id: 'rune_standard_banner',
    name: '遠古符文祭壇',
    costCurrency: Currency.DIAMONDS,
    costAmount: 1000, // Cost for 10 pulls
    singlePullCost: {currency: Currency.RUNE_TICKET, amount:1},
    itemPool: BASE_RUNES.map(r => ({type:'rune', id: r.id, rarity: r.rarity})),
    rates: { [CharacterRarity.UR]: 0.005, [CharacterRarity.SSR]: 0.04, [CharacterRarity.SR]: 0.355, [CharacterRarity.R]: 0.60, [CharacterRarity.N]: 0 }, // UR runes are very rare
    upItems: BASE_RUNES.filter(r=>r.rarity === CharacterRarity.UR || r.rarity === CharacterRarity.SSR).map(r=>({type:'rune', id:r.id}))
};

export const LUCKY_DRAW_POOL: GachaPool = {
    id: 'lucky_draw_banner',
    name: '幸運輪盤',
    costCurrency: Currency.LUCKY_DRAW_TICKET, // This is the currency used to buy pulls
    costAmount: 1, // For a single pull (or if there were multi-pulls with this ticket)
    pulls: [1], // Only single pulls
    singlePullCost: { currency: Currency.LUCKY_DRAW_TICKET, amount: 1 }, // Explicit single pull cost
    guarantees: {}, // Lucky draws typically don't have pity
    isLuckyDraw: true,
    rates: {}, // Rates are determined by item weights
    itemPool: [ // These are the actual items in the wheel
        { type: 'resource', id: Currency.PET_TICKET, name: '寵物召喚券', emoji: CURRENCY_EMOJIS[Currency.PET_TICKET], amount: 1, rarity: CharacterRarity.SR, weight: 5 },
        { type: 'resource', id: Currency.RUNE_TICKET, name: '符文召喚券', emoji: CURRENCY_EMOJIS[Currency.RUNE_TICKET], amount: 1, rarity: CharacterRarity.SR, weight: 5 },
        { type: 'resource', id: Currency.EQUIPMENT_TICKET, name: '裝備召喚券', emoji: CURRENCY_EMOJIS[Currency.EQUIPMENT_TICKET], amount: 1, rarity: CharacterRarity.SR, weight: 5 },
        { type: 'resource', id: Currency.SKILL_BOOK_ADVANCED, name: '高級技能書', emoji: CURRENCY_EMOJIS[Currency.SKILL_BOOK_ADVANCED], amount: 1, rarity: CharacterRarity.SR, weight: 3 },
        { type: 'resource', id: Currency.BREAKTHROUGH_STONE, name: '突破石', emoji: CURRENCY_EMOJIS[Currency.BREAKTHROUGH_STONE], amount: 10, rarity: CharacterRarity.R, weight: 7 },
        { type: 'resource', id: Currency.DIAMONDS, name: '鑽石', emoji: CURRENCY_EMOJIS[Currency.DIAMONDS], amount: 20, rarity: CharacterRarity.R, weight: 10 },
        { type: 'resource', id: Currency.DIAMONDS, name: '鑽石', emoji: CURRENCY_EMOJIS[Currency.DIAMONDS], amount: 50, rarity: CharacterRarity.SR, weight: 2 },
        { type: 'resource', id: Currency.GOLD, name: '金幣', emoji: CURRENCY_EMOJIS[Currency.GOLD], amount: 10000, rarity: CharacterRarity.N, weight: 25 },
        { type: 'resource', id: Currency.GOLD, name: '金幣', emoji: CURRENCY_EMOJIS[Currency.GOLD], amount: 50000, rarity: CharacterRarity.R, weight: 5 },
        { type: 'resource', id: Currency.EXP_POTION, name: '經驗藥水', emoji: CURRENCY_EMOJIS[Currency.EXP_POTION], amount: 5000, rarity: CharacterRarity.N, weight: 25 },
        { type: 'resource', id: Currency.STAMINA, name: '體力', emoji: CURRENCY_EMOJIS[Currency.STAMINA], amount: 30, rarity: CharacterRarity.R, weight: 13 },
    ],
    upItems: [], // Lucky draws usually don't have UP items
};
export const ALL_GACHA_POOLS = [
    CHARACTER_GACHA_POOL, CHARACTER_GACHA_POOL_WATER_UP, CHARACTER_GACHA_POOL_FIRE_UP, CHARACTER_GACHA_POOL_WIND_UR_UP, CHARACTER_GACHA_POOL_DARK_UR_UP,
    EQUIPMENT_GACHA_POOL, EQUIPMENT_GACHA_POOL_ACCESSORY_UP,
    PET_GACHA_POOL_STANDARD, RUNE_GACHA_POOL_STANDARD,
    LUCKY_DRAW_POOL
];
