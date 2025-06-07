
import { BaseEquipmentItem, EquipmentSlot, CharacterRarity, Currency } from '../types';

export const BASE_EQUIPMENT_ITEMS: BaseEquipmentItem[] = [
    { id: 'eq_wpn_001', name: '新手長劍', slot: EquipmentSlot.WEAPON, rarity: CharacterRarity.N, emoji: '🗡️', baseStats: { atk: 10 }, statIncreasePerEnhancement: { atk: 2 }, maxEnhancement: 5 },
    { id: 'eq_hlm_001', name: '皮製頭盔', slot: EquipmentSlot.HELMET, rarity: CharacterRarity.N, emoji: '⛑️', baseStats: { def: 10, hp: 20 }, statIncreasePerEnhancement: { def: 2, hp: 5 }, maxEnhancement: 5 },
    { id: 'eq_chst_001', name: '布衣', slot: EquipmentSlot.CHEST, rarity: CharacterRarity.N, emoji: '👕', baseStats: { def: 8, hp: 15 }, statIncreasePerEnhancement: { def: 1, hp: 3 }, maxEnhancement: 5 },
    { id: 'eq_leg_001', name: '短褲', slot: EquipmentSlot.LEGS, rarity: CharacterRarity.N, emoji: '🩳', baseStats: { def: 5, hp: 10 }, statIncreasePerEnhancement: { def: 1, hp: 2 }, maxEnhancement: 5 },
    { id: 'eq_boot_001', name: '草鞋', slot: EquipmentSlot.BOOTS, rarity: CharacterRarity.N, emoji: '🩴', baseStats: { spd: 3 }, statIncreasePerEnhancement: { spd: 1 }, maxEnhancement: 5 },
    { id: 'eq_acc_001', name: '幸運石', slot: EquipmentSlot.ACCESSORY, rarity: CharacterRarity.N, emoji: '💎', baseStats: { critRate: 1 }, statIncreasePerEnhancement: { critRate: 0.2 }, maxEnhancement: 5 },

    { id: 'eq_wpn_002', name: '火焰魔杖', slot: EquipmentSlot.WEAPON, rarity: CharacterRarity.R, emoji: '🪄', baseStats: { atk: 30, critRate: 2 }, statIncreasePerEnhancement: { atk: 5 }, maxEnhancement: 10 },
    { id: 'eq_chst_002', name: '精鐵胸甲', slot: EquipmentSlot.CHEST, rarity: CharacterRarity.R, emoji: '🛡️', baseStats: { def: 40, hp: 100 }, statIncreasePerEnhancement: { def: 6, hp: 20 }, maxEnhancement: 10 },
    { id: 'eq_hlm_002', name: '鐵頭盔', slot: EquipmentSlot.HELMET, rarity: CharacterRarity.R, emoji: '🔩', baseStats: { def: 30, hp: 50 }, statIncreasePerEnhancement: { def: 4, hp: 10 }, maxEnhancement: 10 },
    { id: 'eq_leg_002', name: '鎖子甲護腿', slot: EquipmentSlot.LEGS, rarity: CharacterRarity.R, emoji: '⛓️', baseStats: { def: 25, hp: 40 }, statIncreasePerEnhancement: { def: 3, hp: 8 }, maxEnhancement: 10 },
    { id: 'eq_boot_002', name: '旅行者之靴', slot: EquipmentSlot.BOOTS, rarity: CharacterRarity.R, emoji: '👢', baseStats: { spd: 8, evasion: 1 }, statIncreasePerEnhancement: { spd: 1 }, maxEnhancement: 10 },
    { id: 'eq_acc_002', name: '力量指環', slot: EquipmentSlot.ACCESSORY, rarity: CharacterRarity.R, emoji: '💍', baseStats: { atk: 15 }, statIncreasePerEnhancement: { atk: 3 }, maxEnhancement: 10 },

    { id: 'eq_wpn_003', name: '雷霆戰斧', slot: EquipmentSlot.WEAPON, rarity: CharacterRarity.SR, emoji: '🪓', baseStats: { atk: 80, critDmg: 10 }, statIncreasePerEnhancement: { atk: 12 }, maxEnhancement: 15 },
    { id: 'eq_acc_003', name: '鷹眼護符', slot: EquipmentSlot.ACCESSORY, rarity: CharacterRarity.SR, emoji: '🧿', baseStats: { accuracy: 10, critRate: 5 }, statIncreasePerEnhancement: { accuracy: 1 }, maxEnhancement: 15 },
    { id: 'eq_chst_003', name: '騎士鎧甲', slot: EquipmentSlot.CHEST, rarity: CharacterRarity.SR, emoji: '🤺', baseStats: { def: 90, hp: 250 }, statIncreasePerEnhancement: { def: 10, hp: 30 }, maxEnhancement: 15 },
    { id: 'eq_hlm_003', name: '守護者之盔', slot: EquipmentSlot.HELMET, rarity: CharacterRarity.SR, emoji: '💂', baseStats: { def: 70, hp: 150 }, statIncreasePerEnhancement: { def: 8, hp: 25 }, maxEnhancement: 15 },
    { id: 'eq_leg_003', name: '精靈護腿', slot: EquipmentSlot.LEGS, rarity: CharacterRarity.SR, emoji: '🌿', baseStats: { def: 60, spd: 5 }, statIncreasePerEnhancement: { def: 7, spd: 1 }, maxEnhancement: 15 }, // Changed emoji
    { id: 'eq_boot_003', name: '刺客皮靴', slot: EquipmentSlot.BOOTS, rarity: CharacterRarity.SR, emoji: '👟', baseStats: { spd: 15, evasion: 3 }, statIncreasePerEnhancement: { spd: 2 }, maxEnhancement: 15 },

    { id: 'eq_wpn_004', name: '聖光權杖', slot: EquipmentSlot.WEAPON, rarity: CharacterRarity.SSR, emoji: '🌟', baseStats: { atk: 150, hp: 200 }, statIncreasePerEnhancement: { atk: 20, hp: 30 }, maxEnhancement: 20 },
    { id: 'eq_boot_004', name: '疾風之靴', slot: EquipmentSlot.BOOTS, rarity: CharacterRarity.SSR, emoji: '💨', baseStats: { spd: 25 }, statIncreasePerEnhancement: { spd: 3 }, maxEnhancement: 20 }, // Changed emoji
    { id: 'eq_chst_004', name: '龍鱗胸甲', slot: EquipmentSlot.CHEST, rarity: CharacterRarity.SSR, emoji: '🐉', baseStats: { def: 160, hp: 450, critDmg: 5 }, statIncreasePerEnhancement: { def: 18, hp: 50 }, maxEnhancement: 20 }, // Changed emoji
    { id: 'eq_hlm_004', name: '王者之冠', slot: EquipmentSlot.HELMET, rarity: CharacterRarity.SSR, emoji: '👑', baseStats: { def: 100, hp: 300, atk: 30 }, statIncreasePerEnhancement: { def: 12, hp: 35, atk: 4 }, maxEnhancement: 20 },
    { id: 'eq_acc_004', name: '暴君項鏈', slot: EquipmentSlot.ACCESSORY, rarity: CharacterRarity.SSR, emoji: '💀', baseStats: { atk: 50, critRate: 7, critDmg: 12 }, statIncreasePerEnhancement: { atk: 6, critRate: 0.5 }, maxEnhancement: 20 }, // Changed emoji

    { id: 'eq_leg_005', name: '龍鱗護腿', slot: EquipmentSlot.LEGS, rarity: CharacterRarity.UR, emoji: '👖', baseStats: { def: 120, hp: 500 }, statIncreasePerEnhancement: { def: 15, hp: 60 }, maxEnhancement: 25 },
    { id: 'eq_chst_006', name: '學徒法袍', slot: EquipmentSlot.CHEST, rarity: CharacterRarity.R, emoji: '🧥', baseStats: { def: 30, hp: 80 }, statIncreasePerEnhancement: { def: 5, hp: 15 }, maxEnhancement: 10 },
    { id: 'eq_acc_007', name: '守護者壁壘', slot: EquipmentSlot.ACCESSORY, rarity: CharacterRarity.SR, emoji: '🧱', baseStats: { def: 50, hp: 150 }, statIncreasePerEnhancement: { def: 7 }, maxEnhancement: 15 },
    { id: 'eq_wpn_005', name: '颶風長弓', slot: EquipmentSlot.WEAPON, rarity: CharacterRarity.UR, emoji: '🏹', baseStats: { atk: 250, spd: 15, critRate: 10 }, statIncreasePerEnhancement: { atk: 30, spd: 2 }, maxEnhancement: 25 },
    { id: 'eq_hlm_005', name: '暗影兜帽', slot: EquipmentSlot.HELMET, rarity: CharacterRarity.SSR, emoji: '🎓', baseStats: { hp: 300, def: 50 }, statIncreasePerEnhancement: { hp: 40, def: 5 }, maxEnhancement: 20 }, // Changed emoji
    { id: 'eq_leg_006', name: '秘法長褲', slot: EquipmentSlot.LEGS, rarity: CharacterRarity.SSR, emoji: '✨', baseStats: { hp: 250, def: 60, accuracy: 5 }, statIncreasePerEnhancement: { hp:35, def: 6}, maxEnhancement: 20}, // Changed emoji
    { id: 'eq_boot_007', name: '虛空行者之靴', slot: EquipmentSlot.BOOTS, rarity: CharacterRarity.UR, emoji: '👣', baseStats: { spd: 35, evasion: 5 }, statIncreasePerEnhancement: { spd: 4 }, maxEnhancement: 25}, // Changed emoji
    { id: 'eq_acc_008', name: '龍魂玉佩', slot: EquipmentSlot.ACCESSORY, rarity: CharacterRarity.UR, emoji: '🐉', baseStats: { atk: 50, hp: 300, critDmg: 15 }, statIncreasePerEnhancement: { atk: 7, hp: 40}, maxEnhancement: 25}, // Changed emoji
];

export const EQUIPMENT_ENHANCEMENT_COST = (level: number, rarity: CharacterRarity): Partial<Record<Currency, number>> => {
    const rarityMultiplier = rarity === CharacterRarity.N ? 1 : rarity === CharacterRarity.R ? 1.5 : rarity === CharacterRarity.SR ? 2 : rarity === CharacterRarity.SSR ? 3 : 4;
    return {
        [Currency.GOLD]: 100 * level * rarityMultiplier,
        [Currency.ENHANCEMENT_STONE]: Math.ceil(level / 2) * rarityMultiplier,
    };
};
