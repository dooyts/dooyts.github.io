
import { BaseRune, CharacterRarity, RuneSlotType, Currency } from '../types';

export const MAX_RUNE_LEVEL = 15;

export const RUNE_ENHANCEMENT_COST = (level: number, rarity: CharacterRarity): Partial<Record<Currency, number>> => {
    const rarityMultiplier = 
        rarity === CharacterRarity.N ? 0.5 :
        rarity === CharacterRarity.R ? 1 :
        rarity === CharacterRarity.SR ? 2 :
        rarity === CharacterRarity.SSR ? 3 : 4; // UR
    return {
        [Currency.RUNE_DUST]: Math.floor(100 * Math.pow(1.2, level -1) * rarityMultiplier),
        [Currency.GOLD]: Math.floor(1000 * Math.pow(1.1, level -1) * rarityMultiplier),
    };
};

export const BASE_RUNES: BaseRune[] = [
    { id: 'rune_atk_01', name: '力量符文', emoji: '💪', rarity: CharacterRarity.R, slotType: RuneSlotType.ATTACK, mainStatOptions: { atk_perc: {min: 5, max: 10}, atk_flat: {min: 20, max: 50} }, maxLevel: MAX_RUNE_LEVEL, mainStatIncreasePerLevel: 0.5 },
    { id: 'rune_def_01', name: '守護符文', emoji: '🛡️', rarity: CharacterRarity.R, slotType: RuneSlotType.DEFENSE, mainStatOptions: { def_perc: {min: 5, max: 10}, hp_perc: {min: 5, max: 10} }, maxLevel: MAX_RUNE_LEVEL, mainStatIncreasePerLevel: 0.5 },
    { id: 'rune_crit_01', name: '致命符文', emoji: '🎯', rarity: CharacterRarity.SR, slotType: RuneSlotType.ATTACK, mainStatOptions: { critRate_perc: {min: 3, max: 7}, critDmg_perc: {min: 5, max: 12} }, maxLevel: MAX_RUNE_LEVEL, mainStatIncreasePerLevel: 0.3 },
    { id: 'rune_spd_01', name: '迅速符文', emoji: '💨', rarity: CharacterRarity.SR, slotType: RuneSlotType.SUPPORT, mainStatOptions: { spd_flat: {min: 5, max: 15} }, maxLevel: MAX_RUNE_LEVEL, mainStatIncreasePerLevel: 1 },
    { id: 'rune_acc_01', name: '精準符文', emoji: '👁️', rarity: CharacterRarity.SR, slotType: RuneSlotType.SUPPORT, mainStatOptions: { accuracy_perc: {min: 5, max: 15} }, maxLevel: MAX_RUNE_LEVEL, mainStatIncreasePerLevel: 0.8 },
    { id: 'rune_hp_02', name: '活力符文', emoji: '❤️', rarity: CharacterRarity.SR, slotType: RuneSlotType.DEFENSE, mainStatOptions: { hp_perc: {min:8, max:15}, hp_flat: {min:100, max:250} }, maxLevel: MAX_RUNE_LEVEL, mainStatIncreasePerLevel: 0.6 },
    { id: 'rune_eva_02', name: '幻影符文', emoji: '🌬️', rarity: CharacterRarity.SSR, slotType: RuneSlotType.SUPPORT, mainStatOptions: { evasion_perc: {min:5, max:12} }, maxLevel: MAX_RUNE_LEVEL, mainStatIncreasePerLevel: 0.5 },
    { id: 'rune_revenge_01', name: '復仇符文', emoji: '🔄', rarity: CharacterRarity.UR, slotType: RuneSlotType.SPECIAL, mainStatOptions: { atk_perc: {min:10, max:20} }, maxLevel: MAX_RUNE_LEVEL, mainStatIncreasePerLevel: 1 },
    { id: 'rune_atk_n01', name: '破損攻擊石', emoji: '💥', rarity: CharacterRarity.N, slotType: RuneSlotType.ATTACK, mainStatOptions: { atk_flat: {min:5, max:15} }, maxLevel: MAX_RUNE_LEVEL, mainStatIncreasePerLevel: 2 },
    { id: 'rune_def_n01', name: '破損防禦石', emoji: '🧱', rarity: CharacterRarity.N, slotType: RuneSlotType.DEFENSE, mainStatOptions: { def_flat: {min:5, max:15} }, maxLevel: MAX_RUNE_LEVEL, mainStatIncreasePerLevel: 2 },
    { id: 'rune_hp_n01', name: '破損生命石', emoji: '💔', rarity: CharacterRarity.N, slotType: RuneSlotType.DEFENSE, mainStatOptions: { hp_flat: {min:10, max:30} }, maxLevel: MAX_RUNE_LEVEL, mainStatIncreasePerLevel: 3 },
    { id: 'rune_spd_n01', name: '破損速度石', emoji: '🐌', rarity: CharacterRarity.N, slotType: RuneSlotType.SUPPORT, mainStatOptions: { spd_flat: {min:1, max:3} }, maxLevel: MAX_RUNE_LEVEL, mainStatIncreasePerLevel: 0.5 },
    { id: 'rune_atk_r02', name: '戰意符文', emoji: '⚔️', rarity: CharacterRarity.R, slotType: RuneSlotType.ATTACK, mainStatOptions: { atk_perc: {min:4, max:8}, critRate_perc: {min:1, max:3} }, maxLevel: MAX_RUNE_LEVEL, mainStatIncreasePerLevel: 0.4 },
    { id: 'rune_def_r02', name: '堅韌符文', emoji: '💎', rarity: CharacterRarity.R, slotType: RuneSlotType.DEFENSE, mainStatOptions: { def_perc: {min:4, max:8}, hp_flat: {min:50, max:100} }, maxLevel: MAX_RUNE_LEVEL, mainStatIncreasePerLevel: 0.4 },
    { id: 'rune_hp_r02', name: '祝福符文', emoji: '🍀', rarity: CharacterRarity.R, slotType: RuneSlotType.SUPPORT, mainStatOptions: { hp_perc: {min:4, max:8}, evasion_perc: {min:1, max:3} }, maxLevel: MAX_RUNE_LEVEL, mainStatIncreasePerLevel: 0.4 },
    { id: 'rune_critdmg_sr01', name: '破壞符文', emoji: '🔨', rarity: CharacterRarity.SR, slotType: RuneSlotType.ATTACK, mainStatOptions: { critDmg_perc: {min:8, max:18} }, maxLevel: MAX_RUNE_LEVEL, mainStatIncreasePerLevel: 0.7 },
    { id: 'rune_acc_sr02', name: '洞察符文', emoji: '💡', rarity: CharacterRarity.SR, slotType: RuneSlotType.SUPPORT, mainStatOptions: { accuracy_perc: {min:8, max:18} }, maxLevel: MAX_RUNE_LEVEL, mainStatIncreasePerLevel: 0.7 },
    { id: 'rune_atk_ssr01', name: '猛攻符文', emoji: '☄️', rarity: CharacterRarity.SSR, slotType: RuneSlotType.ATTACK, mainStatOptions: { atk_perc: {min:10, max:20}, atk_flat: {min:50, max:120} }, maxLevel: MAX_RUNE_LEVEL, mainStatIncreasePerLevel: 0.8 },
    { id: 'rune_def_ssr01', name: '不屈符文', emoji: '🏰', rarity: CharacterRarity.SSR, slotType: RuneSlotType.DEFENSE, mainStatOptions: { def_perc: {min:10, max:20}, hp_perc: {min:8, max:15} }, maxLevel: MAX_RUNE_LEVEL, mainStatIncreasePerLevel: 0.8 },
    { id: 'rune_hp_ssr01', name: '永生符文', emoji: '🌳', rarity: CharacterRarity.SSR, slotType: RuneSlotType.DEFENSE, mainStatOptions: { hp_perc: {min:12, max:25}, hp_flat: {min:200, max:500} }, maxLevel: MAX_RUNE_LEVEL, mainStatIncreasePerLevel: 1 },
    { id: 'rune_spd_ssr01', name: '神速符文', emoji: '⚡', rarity: CharacterRarity.SSR, slotType: RuneSlotType.SUPPORT, mainStatOptions: { spd_flat: {min:10, max:25} }, maxLevel: MAX_RUNE_LEVEL, mainStatIncreasePerLevel: 1.5 },
    { id: 'rune_crit_ssr01', name: '絕殺符文', emoji: '☠️', rarity: CharacterRarity.SSR, slotType: RuneSlotType.ATTACK, mainStatOptions: { critRate_perc: {min:5, max:12}, critDmg_perc: {min:10, max:20} }, maxLevel: MAX_RUNE_LEVEL, mainStatIncreasePerLevel: 0.5 },
    { id: 'rune_will_ur01', name: '意志符文', emoji: '🧘', rarity: CharacterRarity.UR, slotType: RuneSlotType.SPECIAL, mainStatOptions: { def_perc: {min:15, max:25} }, maxLevel: MAX_RUNE_LEVEL, mainStatIncreasePerLevel: 1.2 }, // Grants immunity for 1 turn at battle start
    { id: 'rune_vampire_ur01', name: '吸血符文', emoji: '🩸', rarity: CharacterRarity.UR, slotType: RuneSlotType.SPECIAL, mainStatOptions: { atk_perc: {min:12, max:22} }, maxLevel: MAX_RUNE_LEVEL, mainStatIncreasePerLevel: 1 }, // Leeches % of damage as HP
    { id: 'rune_destroy_ur01', name: '毀滅符文', emoji: '💣', rarity: CharacterRarity.UR, slotType: RuneSlotType.SPECIAL, mainStatOptions: { hp_perc: {min:15, max:25} }, maxLevel: MAX_RUNE_LEVEL, mainStatIncreasePerLevel: 1.2 }, // Destroys enemy max HP
];