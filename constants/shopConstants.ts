
import { ShopItem, ShopItemCategory, Currency, TriggeredOffer, BattlePassTier, GrowthFundMilestone } from '../types';
import { BASE_CHARACTERS } from './characterConstants'; // For BattlePass/GrowthFund rewards

export const SHOP_ITEMS_DIAMONDS: ShopItem[] = [
  { id: 'diamonds_60', name: '60鑽石', category: ShopItemCategory.DIAMOND, priceNT: 30, diamondsAwarded: 60, bonusDiamonds: 60, vipExpAwarded: 60, emoji: '💎' },
  { id: 'diamonds_300', name: '300鑽石', category: ShopItemCategory.DIAMOND, priceNT: 170, diamondsAwarded: 300, bonusDiamonds: 300, vipExpAwarded: 300, emoji: '💎' },
  { id: 'diamonds_980', name: '980鑽石', category: ShopItemCategory.DIAMOND, priceNT: 490, diamondsAwarded: 980, bonusDiamonds: 980, vipExpAwarded: 980, emoji: '💎' },
  { id: 'diamonds_1980', name: '1980鑽石', category: ShopItemCategory.DIAMOND, priceNT: 990, diamondsAwarded: 1980, bonusDiamonds: 1980, vipExpAwarded: 1980, emoji: '💎' },
  { id: 'diamonds_3280', name: '3280鑽石', category: ShopItemCategory.DIAMOND, priceNT: 1590, diamondsAwarded: 3280, bonusDiamonds: 3280, vipExpAwarded: 3280, emoji: '💠' },
  { id: 'diamonds_6480', name: '6480鑽石', category: ShopItemCategory.DIAMOND, priceNT: 2990, diamondsAwarded: 6480, bonusDiamonds: 6480, vipExpAwarded: 6480, emoji: '💍' },
];

export const SHOP_ITEMS_CURRENCY_GOLD: ShopItem[] = [
  { id: 'gold_purchase_s', name: '小袋金幣', category: ShopItemCategory.RESOURCE, priceCurrency: Currency.DIAMONDS, priceAmount: 50, resources: { [Currency.GOLD]: 100000 }, vipExpAwarded: 0, emoji: '💰' },
  { id: 'gold_purchase_m', name: '中袋金幣', category: ShopItemCategory.RESOURCE, priceCurrency: Currency.DIAMONDS, priceAmount: 200, resources: { [Currency.GOLD]: 500000 }, vipExpAwarded: 0, emoji: '💰💰' },
  { id: 'gold_purchase_l', name: '大袋金幣', category: ShopItemCategory.RESOURCE, priceCurrency: Currency.DIAMONDS, priceAmount: 800, resources: { [Currency.GOLD]: 2500000 }, vipExpAwarded: 0, emoji: '💰💰💰' },
];

export const SHOP_ITEMS_CURRENCY_STAMINA: ShopItem[] = [
  { id: 'stamina_refill_small', name: '小瓶體力藥劑', category: ShopItemCategory.RESOURCE, priceCurrency: Currency.DIAMONDS, priceAmount: 75, resources: { [Currency.STAMINA]: 60 }, vipExpAwarded: 0, emoji: '💧' },
  { id: 'stamina_refill_medium', name: '中瓶體力藥劑', category: ShopItemCategory.RESOURCE, priceCurrency: Currency.DIAMONDS, priceAmount: 150, resources: { [Currency.STAMINA]: 120 }, vipExpAwarded: 0, emoji: '💧💧' },
  { id: 'stamina_refill_large', name: '大瓶體力藥劑', category: ShopItemCategory.RESOURCE, priceCurrency: Currency.DIAMONDS, priceAmount: 300, resources: { [Currency.STAMINA]: 250 }, vipExpAwarded: 0, emoji: '💧💧💧' },
];


export const SHOP_ITEMS_BUNDLES: ShopItem[] = [
  { id: 'monthly_card', name: '月卡', category: ShopItemCategory.BUNDLE, priceNT: 170, diamondsAwarded: 300, isMonthlyCard: true, vipExpAwarded: 300, emoji: '📅' },
  { id: 'lifetime_card', name: '終身卡', category: ShopItemCategory.BUNDLE, priceNT: 670, diamondsAwarded: 680, isLifetimeCard: true, vipExpAwarded: 680, emoji: '♾️' },
  { id: 'growth_fund', name: '成長基金', category: ShopItemCategory.BUNDLE, priceNT: 330, isGrowthFund: true, vipExpAwarded: 330, emoji: '🚀' },
  { id: 'hero_breakthrough_pack', name: '英雄突破包', category: ShopItemCategory.BUNDLE, priceNT: 330, resources: { [Currency.BREAKTHROUGH_STONE]: 100, [Currency.SKILL_BOOK_ADVANCED]: 10, [Currency.GOLD]: 200000 }, vipExpAwarded: 330, emoji: '🦸', isOneTime: true },
  { id: 'equipment_enhance_pack', name: '裝備強化包', category: ShopItemCategory.BUNDLE, priceNT: 330, resources: { [Currency.ENHANCEMENT_STONE]: 500, [Currency.GOLD]: 500000 }, vipExpAwarded: 330, emoji: '🔨', isOneTime: true },
  { id: 'newbie_sprint_pack', name: '新手衝刺包', category: ShopItemCategory.BUNDLE, priceNT: 90, resources: { [Currency.GACHA_TICKET]: 3, [Currency.EXP_POTION]: 100000, [Currency.GOLD]: 100000 }, vipExpAwarded: 90, emoji: '⚡', isOneTime: true },
  { id: 'weekend_warrior_pack', name: '週末戰士包', category: ShopItemCategory.BUNDLE, priceNT: 170, resources: { [Currency.STAMINA]: 120, [Currency.GACHA_TICKET]: 2, [Currency.GOLD]: 150000 }, vipExpAwarded: 170, emoji: '🎉', isOneTime: false, dailyLimit: 1 },
  { id: 'rune_masters_trove', name: '符文大師秘寶', category: ShopItemCategory.BUNDLE, priceNT: 330, resources: { [Currency.RUNE_TICKET]: 5, [Currency.RUNE_DUST]: 5000, [Currency.GOLD]: 300000 }, vipExpAwarded: 330, emoji: '🗿', isOneTime: true },
  { id: 'pet_whisperers_kit', name: '寵物低語者工具組', category: ShopItemCategory.BUNDLE, priceNT: 330, resources: { [Currency.PET_TICKET]: 5, [Currency.PET_FOOD]: 1000, [Currency.GOLD]: 300000 }, vipExpAwarded: 330, emoji: '🐾', isOneTime: true },
  { id: 'daily_diamond_dash', name: '每日鑽石衝刺', category: ShopItemCategory.BUNDLE, priceNT: 30, resources: { [Currency.DIAMONDS]: 50, [Currency.STAMINA]: 30 }, vipExpAwarded: 30, emoji: '💨', dailyLimit: 1 },
];

export const SHOP_ITEMS_RESOURCES: ShopItem[] = [
    { id: 'arena_ticket_1', name: '競技場挑戰券', category: ShopItemCategory.RESOURCE, priceCurrency: Currency.DIAMONDS, priceAmount: 50, effect: { "add_arena_attempts": 1 }, vipExpAwarded: 0, emoji: '🎟️', dailyLimit: 20 }, // Limit doubled
    { id: 'dungeon_entry_gold_purchase', name: '黃金礦洞入場券', category: ShopItemCategory.RESOURCE, priceCurrency: Currency.DIAMONDS, priceAmount: 100, effect: { "add_dungeon_attempt": { dungeonId: "gold_mine", count: 1 } }, vipExpAwarded: 0, emoji: '🔑', dailyLimit: 3 }, // Limit tripled
    { id: 'dungeon_entry_exp_purchase', name: '經驗聖殿入場券', category: ShopItemCategory.RESOURCE, priceCurrency: Currency.DIAMONDS, priceAmount: 100, effect: { "add_dungeon_attempt": { dungeonId: "exp_temple", count: 1 } }, vipExpAwarded: 0, emoji: '🔑', dailyLimit: 3 }, // Limit tripled
    { id: 'exp_potion_medium', name: '中型經驗藥水', category: ShopItemCategory.RESOURCE, priceCurrency: Currency.DIAMONDS, priceAmount: 150, resources: { [Currency.EXP_POTION]: 50000 }, vipExpAwarded: 0, emoji: '🧪', dailyLimit: 15 }, // Limit tripled
    { id: 'exp_potion_large', name: '大型經驗藥水', category: ShopItemCategory.RESOURCE, priceCurrency: Currency.DIAMONDS, priceAmount: 350, resources: { [Currency.EXP_POTION]: 150000 }, vipExpAwarded: 0, emoji: '✨', dailyLimit: 9 }, // Limit tripled
    { id: 'skill_book_normal_pack', name: '普通技能書x10', category: ShopItemCategory.RESOURCE, priceCurrency: Currency.DIAMONDS, priceAmount: 80, resources: { [Currency.SKILL_BOOK_NORMAL]: 10 }, vipExpAwarded: 0, emoji: '📚', dailyLimit: 9 }, // Limit tripled
    { id: 'skill_book_advanced_pack', name: '高級技能書x5', category: ShopItemCategory.RESOURCE, priceCurrency: Currency.DIAMONDS, priceAmount: 250, resources: { [Currency.SKILL_BOOK_ADVANCED]: 5 }, vipExpAwarded: 0, emoji: '📖', dailyLimit: 3 }, // Limit tripled
    { id: 'resource_breakthrough_stone_small', name: '突破石 (小)', category: ShopItemCategory.RESOURCE, priceCurrency: Currency.DIAMONDS, priceAmount: 100, resources: { [Currency.BREAKTHROUGH_STONE]: 20 }, vipExpAwarded: 0, emoji: '💠', dailyLimit: 9 }, // Limit tripled
    { id: 'resource_enhancement_stone_small', name: '強化石 (小)', category: ShopItemCategory.RESOURCE, priceCurrency: Currency.DIAMONDS, priceAmount: 75, resources: { [Currency.ENHANCEMENT_STONE]: 100 }, vipExpAwarded: 0, emoji: '⛏️', dailyLimit: 9 }, // Limit tripled
    { id: 'resource_pet_food_small', name: '寵物零食 (小)', category: ShopItemCategory.RESOURCE, priceCurrency: Currency.DIAMONDS, priceAmount: 50, resources: { [Currency.PET_FOOD]: 100 }, vipExpAwarded: 0, emoji: '🍖', dailyLimit: 15 }, // Limit tripled
    { id: 'resource_pet_food_large', name: '寵物零食 (大)', category: ShopItemCategory.RESOURCE, priceCurrency: Currency.DIAMONDS, priceAmount: 200, resources: { [Currency.PET_FOOD]: 500 }, vipExpAwarded: 0, emoji: '🍗', dailyLimit: 6 }, // Limit tripled
    { id: 'resource_rune_dust_small', name: '符文塵埃 (小)', category: ShopItemCategory.RESOURCE, priceCurrency: Currency.DIAMONDS, priceAmount: 60, resources: { [Currency.RUNE_DUST]: 200 }, vipExpAwarded: 0, emoji: '💨', dailyLimit: 15 }, // Limit tripled
    { id: 'resource_rune_dust_large', name: '符文塵埃 (大)', category: ShopItemCategory.RESOURCE, priceCurrency: Currency.DIAMONDS, priceAmount: 250, resources: { [Currency.RUNE_DUST]: 1000 }, vipExpAwarded: 0, emoji: '🌪️', dailyLimit: 6 }, // Limit tripled
    { id: 'reset_daily_limits_shop', name: '重置商店限購', category: ShopItemCategory.RESOURCE, priceCurrency: Currency.DIAMONDS, priceAmount: 990, effect: { "reset_resource_shop_daily_limits": true }, vipExpAwarded: 0, emoji: '🔄' }, // Price updated
    { id: 'world_boss_energy_refill', name: '世界王能源', category: ShopItemCategory.RESOURCE, priceCurrency: Currency.DIAMONDS, priceAmount: 50, resources: { [Currency.WORLD_BOSS_ENERGY]: 5 }, vipExpAwarded: 0, emoji: '🐲', dailyLimit: 9 }, // Limit tripled
    { id: 'endless_tower_reset_ticket', name: '無盡之塔重置券', category: ShopItemCategory.RESOURCE, priceCurrency: Currency.DIAMONDS, priceAmount: 150, effect: { "add_dungeon_attempt": { dungeonId: "endless_tower", count: 1 } }, vipExpAwarded: 0, emoji: '🔄', dailyLimit: 3 }, // Limit tripled
];

export const SHOP_ITEMS_VIP_EXCLUSIVE: ShopItem[] = [
    { id: 'vip10_pack', name: 'VIP10專屬每週禮包', category: ShopItemCategory.VIP_EXCLUSIVE, priceCurrency: Currency.DIAMONDS, priceAmount: 1000, resources: { [Currency.GACHA_TICKET]: 5, [Currency.EQUIPMENT_TICKET]: 3 }, vipExpAwarded: 0, emoji: '👑', dailyLimit: 0, requiredVipLevel: 10 },
];

export const SHOP_ITEMS_SPECIALS: ShopItem[] = [
    // Arena Coin Items
    { id: 'arena_hero_shards_sr_random', name: 'SR英雄碎片箱x10', category: ShopItemCategory.SPECIALS, priceCurrency: Currency.ARENA_COIN, priceAmount: 800, characterShards: { charId: 'random_sr', amount: 10 }, vipExpAwarded: 0, emoji: '🦸', dailyLimit: 3 }, // Limit tripled
    { id: 'arena_hero_shards_ssr_random', name: 'SSR英雄碎片箱x5', category: ShopItemCategory.SPECIALS, priceCurrency: Currency.ARENA_COIN, priceAmount: 2000, characterShards: { charId: 'random_ssr', amount: 5 }, vipExpAwarded: 0, emoji: '🌟', dailyLimit: 3 }, // Limit tripled
    { id: 'arena_equipment_r_box', name: 'R級裝備箱', category: ShopItemCategory.SPECIALS, priceCurrency: Currency.ARENA_COIN, priceAmount: 300, equipment: ['random_r_equipment'], vipExpAwarded: 0, emoji: '🔩', dailyLimit: 9 }, // Limit tripled
    { id: 'arena_gold_large', name: '大量金幣 (競技場)', category: ShopItemCategory.SPECIALS, priceCurrency: Currency.ARENA_COIN, priceAmount: 500, resources: { [Currency.GOLD]: 250000 }, vipExpAwarded: 0, emoji: '💰', dailyLimit: 6 }, // Limit tripled
    // World Boss Coin Items
    { id: 'wb_shop_shards_c005', name: '海洋女皇碎片x5', category: ShopItemCategory.SPECIALS, priceCurrency: Currency.WORLD_BOSS_COIN, priceAmount: 5000, characterShards: { charId: 'c005', amount: 5 }, vipExpAwarded: 0, emoji: '👸', dailyLimit: 3 }, // Limit tripled
    { id: 'wb_shop_ur_equip_wpn005', name: '颶風長弓', category: ShopItemCategory.SPECIALS, priceCurrency: Currency.WORLD_BOSS_COIN, priceAmount: 15000, equipment: ['eq_wpn_005'], vipExpAwarded: 0, emoji: '🏹', isOneTime: true },
    { id: 'wb_shop_adv_skill_book', name: '高級技能書x10', category: ShopItemCategory.SPECIALS, priceCurrency: Currency.WORLD_BOSS_COIN, priceAmount: 2000, resources: { [Currency.SKILL_BOOK_ADVANCED]: 10 }, vipExpAwarded: 0, emoji: '📖', dailyLimit: 9 }, // Limit tripled
    { id: 'wb_shop_pet_ticket_x5', name: '寵物召喚券x5', category: ShopItemCategory.SPECIALS, priceCurrency: Currency.WORLD_BOSS_COIN, priceAmount: 1500, resources: { [Currency.PET_TICKET]: 5 }, vipExpAwarded: 0, emoji: '🐾', dailyLimit: 3 }, // Limit tripled
];


export const TRIGGERED_OFFERS_TEMPLATES: Omit<TriggeredOffer, 'id' | 'emoji'>[] = [
  { name: '新手啟航包', category: ShopItemCategory.BUNDLE, triggerCondition: 'login_first_time', priceNT: 30, resources: { [Currency.GACHA_TICKET]: 1, [Currency.GOLD]: 100000 }, vipExpAwarded: 30, durationSeconds: 3600, isOneTime: true },
  { name: '等級突破包 (Lv.10)', category: ShopItemCategory.BUNDLE, triggerCondition: 'level_10_player', priceNT: 170, resources: { [Currency.EXP_POTION]: 5000, [Currency.GOLD]: 200000 }, vipExpAwarded: 170, durationSeconds: 3600, isOneTime: true },
  { name: '關卡戰敗支援包', category: ShopItemCategory.BUNDLE, triggerCondition: 'stage_defeat_3_times', priceNT: 170, resources: { [Currency.DIAMONDS]: 500, [Currency.STAMINA]: 100 }, vipExpAwarded: 170, durationSeconds: 3600 },
  { name: '英雄速成包', category: ShopItemCategory.BUNDLE, triggerCondition: 'new_ssr_hero', priceNT: 330, resources: { [Currency.BREAKTHROUGH_STONE]: 100, [Currency.SKILL_BOOK_ADVANCED]: 10 }, vipExpAwarded: 330, durationSeconds: 86400, isOneTime: true },
  { name: '週末狂歡禮包', category: ShopItemCategory.BUNDLE, triggerCondition: 'weekend_login', priceNT: 330, resources: { [Currency.EQUIPMENT_TICKET]: 5, [Currency.DIAMONDS]: 300 }, vipExpAwarded: 330, durationSeconds: 2 * 86400, isOneTime: true },
  { name: 'VIP升級賀禮 (VIP3)', category: ShopItemCategory.BUNDLE, triggerCondition: 'vip_level_3', priceNT: 90, resources: { [Currency.GACHA_TICKET]: 2, [Currency.GOLD]: 500000 }, vipExpAwarded: 90, durationSeconds: 7 * 86400, isOneTime: true },
];

export const TRIGGER_OFFER_EMOJIS: Record<string, string> = {
    'login_first_time': '🎁',
    'level_10_player': '⭐',
    'stage_defeat_3_times': '💪',
    'new_ssr_hero': '🦸',
    'weekend_login': '🎉',
    'vip_level_3': '💎',
};

export const BATTLE_PASS_TIERS: BattlePassTier[] = Array.from({ length: 50 }).map((_, i) => ({
  level: i + 1,
  expRequired: 100 + (i * 20),
  freeReward: { [Currency.GOLD]: (i + 1) * 1000, ...( (i+1) % 5 === 0 && {[Currency.EXP_POTION]: (i+1) * 100}) },
  paidReward: { [Currency.DIAMONDS]: (i + 1) * 20 + 50, ...( (i+1) % 10 === 0 && {[Currency.GACHA_TICKET]: 1} ), ...( (i+1) % 15 === 0 && { characterShards: { charId: BASE_CHARACTERS[2].id, amount: 10 } } ) },
}));

export const BATTLE_PASS_PRICES = {
  advanced: { nt: 330, vipExp: 330, name: '進階版', currency: Currency.DIAMONDS, immediateDiamonds: 300 },
  collector: { nt: 670, vipExp: 670, levelsGranted: 20, name: '典藏版', currency: Currency.DIAMONDS, immediateDiamonds: 680, bonusItems: { [Currency.GACHA_TICKET]: 5 } },
};

export const GROWTH_FUND_MILESTONES: GrowthFundMilestone[] = [
    { id: 'gf_stage_1_10', description: "通關主線 1-10", condition: gs => gs.completedStages.includes('stage-1-10'), rewards: { [Currency.DIAMONDS]: 500 } },
    { id: 'gf_stage_3_10', description: "通關主線 3-10", condition: gs => gs.completedStages.includes('stage-3-10'), rewards: { [Currency.DIAMONDS]: 1000 } },
    { id: 'gf_stage_5_10', description: "通關主線 5-10", condition: gs => gs.completedStages.includes('stage-5-10'), rewards: { [Currency.DIAMONDS]: 1500, [Currency.GACHA_TICKET]: 5 } },
    { id: 'gf_stage_10_10', description: "通關主線 10-10", condition: gs => gs.completedStages.includes('stage-10-10'), rewards: { [Currency.DIAMONDS]: 3000 }, characterShards: {charId: 'c004', amount: 20} },
    { id: 'gf_stage_15_10', description: "通關主線 15-10", condition: gs => gs.completedStages.includes('stage-15-10'), rewards: { [Currency.DIAMONDS]: 4000, [Currency.PET_TICKET]: 3 } },
];
export const TOTAL_GROWTH_FUND_DIAMONDS = GROWTH_FUND_MILESTONES.reduce((sum, m) => sum + (m.rewards[Currency.DIAMONDS] || 0), 0);
