
import { CharacterRarity, ElementType, EquipmentSlot, Currency } from '../types';

export const RARITY_COLORS: Record<CharacterRarity, string> = {
  [CharacterRarity.N]: 'text-gray-400 border-gray-500',
  [CharacterRarity.R]: 'text-green-400 border-green-500',
  [CharacterRarity.SR]: 'text-blue-400 border-blue-500',
  [CharacterRarity.SSR]: 'text-yellow-400 border-yellow-500',
  [CharacterRarity.UR]: 'text-red-500 border-red-600 animate-pulse',
};

export const ELEMENT_COLORS: Record<ElementType, string> = {
  [ElementType.WATER]: 'bg-blue-500',
  [ElementType.FIRE]: 'bg-red-500',
  [ElementType.WIND]: 'bg-green-500',
  [ElementType.THUNDER]: 'bg-yellow-500',
  [ElementType.LIGHT]: 'bg-indigo-400',
  [ElementType.DARK]: 'bg-purple-600',
};

export const EQUIPMENT_SLOT_NAMES: Record<EquipmentSlot, string> = {
  [EquipmentSlot.WEAPON]: '武器',
  [EquipmentSlot.HELMET]: '頭盔',
  [EquipmentSlot.CHEST]: '胸甲',
  [EquipmentSlot.LEGS]: '護腿',
  [EquipmentSlot.BOOTS]: '鞋子',
  [EquipmentSlot.ACCESSORY]: '飾品',
};

export const CURRENCY_NAMES: Record<Currency, string> = {
    [Currency.GOLD]: '金幣',
    [Currency.DIAMONDS]: '鑽石',
    [Currency.STAMINA]: '體力',
    [Currency.ARENA_COIN]: '競技場幣',
    [Currency.EXP_POTION]: '經驗藥水',
    [Currency.BREAKTHROUGH_STONE]: '突破石',
    [Currency.GACHA_TICKET]: '英雄召喚券',
    [Currency.SKILL_BOOK_NORMAL]: '普通技能書',
    [Currency.SKILL_BOOK_ADVANCED]: '高級技能書',
    [Currency.ENHANCEMENT_STONE]: '強化石',
    [Currency.EQUIPMENT_TICKET]: '裝備召喚券',
    [Currency.PET_FOOD]: '寵物零食',
    [Currency.PET_TICKET]: '寵物召喚券',
    [Currency.RUNE_DUST]: '符文塵埃',
    [Currency.RUNE_TICKET]: '符文召喚券',
    [Currency.BATTLE_PASS_EXP]: '通行證經驗',
    [Currency.LUCKY_DRAW_TICKET]: '幸運抽獎券',
    [Currency.WORLD_BOSS_ENERGY]: '世界王能源',
    [Currency.WORLD_BOSS_COIN]: '世界王徽章',
};

export const RESOURCE_ITEM_NAMES: Record<string, string> = {
    'stamina_potion_small': '小體力藥劑',
};

export const CURRENCY_EMOJIS: Record<Currency, string> = {
    [Currency.GOLD]: '💰',
    [Currency.DIAMONDS]: '💎',
    [Currency.STAMINA]: '⚡',
    [Currency.ARENA_COIN]: '🪙',
    [Currency.EXP_POTION]: '🧪',
    [Currency.BREAKTHROUGH_STONE]: '💠',
    [Currency.GACHA_TICKET]: '🎟️',
    [Currency.SKILL_BOOK_NORMAL]: '📚',
    [Currency.SKILL_BOOK_ADVANCED]: '📖',
    [Currency.ENHANCEMENT_STONE]: '⛏️',
    [Currency.EQUIPMENT_TICKET]: '🎫', // Differentiated ticket emoji
    [Currency.PET_FOOD]: '🍖',
    [Currency.PET_TICKET]: '🎟️', 
    [Currency.RUNE_DUST]: '💨',
    [Currency.RUNE_TICKET]: '🎟️', 
    [Currency.BATTLE_PASS_EXP]: '📜',
    [Currency.LUCKY_DRAW_TICKET]: '🎰',
    [Currency.WORLD_BOSS_ENERGY]: '⚡', 
    [Currency.WORLD_BOSS_COIN]: '🏅',
};

export const STAT_NAMES_CHINESE: Record<string, string> = {
    hp: '生命值',
    atk: '攻擊力',
    def: '防禦力',
    spd: '速度',
    critRate: '暴擊率',
    critDmg: '暴擊傷害',
    accuracy: '命中率',
    evasion: '閃避率',
    hp_flat: '生命值',
    hp_perc: '生命值(%)',
    atk_flat: '攻擊力',
    atk_perc: '攻擊力(%)',
    def_flat: '防禦力',
    def_perc: '防禦力(%)',
    spd_flat: '速度',
    critRate_perc: '暴擊率(%)',
    critDmg_perc: '暴擊傷害(%)',
    accuracy_perc: '命中率(%)',
    evasion_perc: '閃避率(%)',
};

export const MAX_ANNOUNCEMENTS = 10; // For marquee announcements