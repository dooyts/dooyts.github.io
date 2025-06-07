
import { BasePet, CharacterRarity, BaseSkill, Currency, PetStatBoostKey } from '../types';

export const MAX_PET_LEVEL = 20;

export const PET_ENHANCEMENT_COST = (level: number, rarity: CharacterRarity): Partial<Record<Currency, number>> => {
    const rarityMultiplier = 
        rarity === CharacterRarity.N ? 0.5 :
        rarity === CharacterRarity.R ? 1 :
        rarity === CharacterRarity.SR ? 1.5 :
        rarity === CharacterRarity.SSR ? 2.5 : 3.5; // UR

    return {
        [Currency.PET_FOOD]: Math.floor(50 * level * rarityMultiplier),
        [Currency.GOLD]: Math.floor(500 * level * rarityMultiplier),
    };
};

export const BASE_PETS: BasePet[] = [
    { id: 'pet001', name: '小精靈', rarity: CharacterRarity.R, emoji: '🧚', 
      globalStatsBoost: { atk_perc: 5 }, 
      statIncreasePerLevel: { atk_perc: 0.5 }, 
      maxLevel: MAX_PET_LEVEL, 
    },
    { id: 'pet002', name: '石像鬼', rarity: CharacterRarity.SR, emoji: '🗿', 
      globalStatsBoost: { def_perc: 10, hp_perc: 5 }, 
      statIncreasePerLevel: { def_perc: 0.8, hp_perc: 0.4 }, 
      maxLevel: MAX_PET_LEVEL 
    },
    { id: 'pet003', name: '火鳳凰', rarity: CharacterRarity.SSR, emoji: '🐦', 
      globalStatsBoost: { atk_perc: 10, critRate_perc: 5 }, 
      statIncreasePerLevel: { atk_perc: 1, critRate_perc: 0.3 }, 
      maxLevel: MAX_PET_LEVEL, 
    },
    { id: 'pet004', name: '月光貓頭鷹', rarity: CharacterRarity.SR, emoji: '🦉', 
      globalStatsBoost: { spd_flat: 10 }, 
      statIncreasePerLevel: { spd_flat: 1 }, 
      maxLevel: MAX_PET_LEVEL, 
    },
    { id: 'pet005', name: '雷霆幼龍', rarity: CharacterRarity.SSR, emoji: '🐉', 
      globalStatsBoost: { atk_perc: 8 }, 
      statIncreasePerLevel: { atk_perc: 0.8 }, 
      maxLevel: MAX_PET_LEVEL, 
    },
    { id: 'pet006', name: '暗影狼', rarity: CharacterRarity.SSR, emoji: '🐺', 
      globalStatsBoost: { atk_perc: 12, evasion_perc: 3 }, 
      statIncreasePerLevel: { atk_perc: 1.2, evasion_perc: 0.2 }, 
      maxLevel: MAX_PET_LEVEL, 
    },
    { id: 'pet007', name: '聖光獨角獸', rarity: CharacterRarity.UR, emoji: '🦄', 
      globalStatsBoost: { hp_perc: 15, def_perc: 10, spd_flat: 5 }, 
      statIncreasePerLevel: { hp_perc: 1.5, def_perc: 1, spd_flat: 1 }, 
      maxLevel: MAX_PET_LEVEL, 
    },
    { id: 'pet008', name: '史萊姆', rarity: CharacterRarity.N, emoji: '🦠', 
      globalStatsBoost: { hp_perc: 3 }, 
      statIncreasePerLevel: { hp_perc: 0.3 }, 
      maxLevel: MAX_PET_LEVEL 
    },
    { id: 'pet009', name: '森林小鹿', rarity: CharacterRarity.R, emoji: '🦌', 
      globalStatsBoost: { spd_flat: 5 }, 
      statIncreasePerLevel: { spd_flat: 0.5 }, 
      maxLevel: MAX_PET_LEVEL, 
    },
    { id: 'pet010', name: '岩石龜', rarity: CharacterRarity.SR, emoji: '🐢', 
      globalStatsBoost: { def_perc: 12 }, 
      statIncreasePerLevel: { def_perc: 1.2 }, 
      maxLevel: MAX_PET_LEVEL 
    },
    { id: 'pet011', name: '風之隼', rarity: CharacterRarity.SSR, emoji: '🦅', 
      globalStatsBoost: { spd_flat: 15, evasion_perc: 2 }, 
      statIncreasePerLevel: { spd_flat: 1.5, evasion_perc: 0.1 }, 
      maxLevel: MAX_PET_LEVEL, 
    },
    { id: 'pet012', name: '幽靈豹', rarity: CharacterRarity.SSR, emoji: '🐆', 
      globalStatsBoost: { critRate_perc: 7, atk_perc: 7 }, 
      statIncreasePerLevel: { critRate_perc: 0.5, atk_perc: 0.7 }, 
      maxLevel: MAX_PET_LEVEL 
    },
    { id: 'pet013', name: '黃金甲蟲', rarity: CharacterRarity.SR, emoji: '🐞', 
      globalStatsBoost: { hp_perc: 8, def_perc: 5 }, 
      statIncreasePerLevel: { hp_perc: 0.8, def_perc: 0.5 }, 
      maxLevel: MAX_PET_LEVEL 
    },
    { id: 'pet014', name: '九尾狐', rarity: CharacterRarity.UR, emoji: '🦊', 
      globalStatsBoost: { atk_perc: 12, spd_flat: 8, critDmg_perc: 10 }, 
      statIncreasePerLevel: { atk_perc: 1.2, spd_flat: 1, critDmg_perc: 1 }, 
      maxLevel: MAX_PET_LEVEL, 
    },
    { id: 'pet015', name: '冰霜巨龍', rarity: CharacterRarity.UR, emoji: '🧊', 
      globalStatsBoost: { def_perc: 15, hp_perc: 10, atk_perc: 5 }, 
      statIncreasePerLevel: { def_perc: 1.5, hp_perc: 1, atk_perc: 0.5 }, 
      maxLevel: MAX_PET_LEVEL, 
    },
];
