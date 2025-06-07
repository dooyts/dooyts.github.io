
import { v4 as uuidv4_imported } from 'uuid';
import { CharacterRarity, ArenaLeaderboardEntry, Character, ElementType, ComputedCharacterStats, ArenaHeroPreview, BaseEquipmentItem, BaseRune, OwnedEquipmentItem, OwnedRune, PetStatBoostKey, BasePet, BaseSkill, EquipmentSlot } from '../../types';
import { MAX_CHARACTER_LEVEL_BY_STARS, REGULAR_CHARACTERS, STAT_BONUS_PER_STAR, BASE_SKILLS_DATA } from '../../constants/characterConstants'; // Import REGULAR_CHARACTERS and STAT_BONUS_PER_STAR
import { ARENA_MAX_RANK, MAX_HEROES_IN_BATTLE_TEAM } from '../../constants/gameplayConstants';
import { BASE_EQUIPMENT_ITEMS, EQUIPMENT_ENHANCEMENT_COST } from '../../constants/equipmentConstants'; // For simulating equipment
import { BASE_RUNES, RUNE_ENHANCEMENT_COST, MAX_RUNE_LEVEL } from '../../constants/runeConstants'; // For simulating runes
import { BASE_PETS, MAX_PET_LEVEL } from '../../constants/petConstants'; // For simulating pets


const uuidv4Polyfill = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
export const uuidv4 = typeof uuidv4_imported === 'function' ? uuidv4_imported : uuidv4Polyfill;


export const getExpToNextLevel = (level: number, baseCost: number, powFactor: number = 1.2): number => 
    Math.floor(baseCost * Math.pow(powFactor, level - 1));

export const getGoldToNextLevel = (level: number, baseCost: number, powFactor: number = 1.1): number =>
    Math.floor(baseCost * Math.pow(powFactor, level - 1));


export const isToday = (timestamp: number | null): boolean => {
    if (!timestamp) return false;
    const today = new Date();
    const dateToCheck = new Date(timestamp);
    return today.getFullYear() === dateToCheck.getFullYear() &&
           today.getMonth() === dateToCheck.getMonth() &&
           today.getDate() === dateToCheck.getDate();
};

export const generateRandomPlayerName = (): string => {
    const prefixes = [
        "至尊", "無敵", "絕世", "最強", "隱姓", "逆天", "狂霸", "虛空", "冰封", "流星", "幽冥", "不死", "天煞", "肥宅", "熱狗", "靈魂", "夜行", "天命", "絕地", "暗黑", "黑色"
    ];
    
    const cores = [
        "劍神", "魔尊", "殺手", "刺客", "牧師", "戰神", "浪人", "影帝", "法王", "武僧", "忍者", "貓妖", "槍王", "神射", "小仙女", "修羅", "貓咪", "和尚", "術士", "小廢物", "劍士", "封弊者"
    ];
    
    const suffixes = [
        "之怒", "降臨", "無雙", "出沒", "吃瓜中", "帶風", "打工中", "上線了", "已退坑", "不加好友", "別惹我", "求組隊", "好可怕", "太強了", "打不過", "天下第一", "啃老中", "掛機中"
    ];

    const number = Math.random() < 0.5 ? "" : Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const core = cores[Math.floor(Math.random() * cores.length)];
    const suffix = Math.random() < 0.7 ? suffixes[Math.floor(Math.random() * suffixes.length)] : "";

    return `${prefix}${core}${suffix}${number}`;
};

// Simulates stats from equipment for an NPC hero based on rank
const simulateEquipmentStatsForNpcHero = (rank: number, heroRarity: CharacterRarity): Partial<ComputedCharacterStats> => {
    const bonusStats: Partial<ComputedCharacterStats> = { hp: 0, atk: 0, def: 0, spd: 0, critRate: 0, critDmg: 0, accuracy: 0, evasion: 0 };
    const numEquipPieces = 6; // NPCs should have all 6 slots filled for top ranks

    let targetRarityOverride: CharacterRarity | null = null;
    let enhancementLevelCap: number;
    let enhancementLevelMin: number;

    if (rank === 1) { targetRarityOverride = CharacterRarity.UR; enhancementLevelCap = 25; enhancementLevelMin = 25; } // Max everything for rank 1
    else if (rank <= 10) { targetRarityOverride = CharacterRarity.UR; enhancementLevelCap = 25; enhancementLevelMin = 23; }
    else if (rank <= 50) { targetRarityOverride = CharacterRarity.SSR; enhancementLevelCap = 20; enhancementLevelMin = 18; }
    else if (rank <= 100) { targetRarityOverride = CharacterRarity.SR; enhancementLevelCap = 15; enhancementLevelMin = 13; }
    else if (rank <= 500) { targetRarityOverride = CharacterRarity.R; enhancementLevelCap = 10; enhancementLevelMin = 8; }
    else { targetRarityOverride = CharacterRarity.N; enhancementLevelCap = 5; enhancementLevelMin = 3; } 
    
    if (rank > 2000) { // Very low ranks get minimal random gear
        return { hp: Math.random() * 50, atk: Math.random() * 5, def: Math.random() * 5 };
    }

    const potentialEquips = BASE_EQUIPMENT_ITEMS.filter(eq => 
        (targetRarityOverride && eq.rarity === targetRarityOverride) || // Specific target rarity
        (targetRarityOverride === CharacterRarity.UR && eq.rarity === CharacterRarity.SSR) ||
        (targetRarityOverride === CharacterRarity.SSR && eq.rarity === CharacterRarity.SR) ||
        (!targetRarityOverride && eq.rarity === heroRarity) // Fallback to hero rarity if no override
    );
    
    let availableSlots = Object.values(EquipmentSlot);

    for (let i = 0; i < numEquipPieces; i++) {
        if (availableSlots.length === 0) break;
        const slotToFill = availableSlots.shift()!; // Take one slot to fill

        let baseEqPoolForSlot = potentialEquips.filter(eq => eq.slot === slotToFill);
        if (baseEqPoolForSlot.length === 0) { // If no specific rarity for slot, try any rarity for that slot
            baseEqPoolForSlot = BASE_EQUIPMENT_ITEMS.filter(eq => eq.slot === slotToFill && eq.rarity === targetRarityOverride);
        }
        if (baseEqPoolForSlot.length === 0 && targetRarityOverride && targetRarityOverride !== CharacterRarity.N) { // Try one rarity lower if UR/SSR
             const lowerRarities = targetRarityOverride === CharacterRarity.UR ? [CharacterRarity.SSR, CharacterRarity.SR] : targetRarityOverride === CharacterRarity.SSR ? [CharacterRarity.SR, CharacterRarity.R] : [CharacterRarity.R, CharacterRarity.N];
             for(const lr of lowerRarities){
                 baseEqPoolForSlot = BASE_EQUIPMENT_ITEMS.filter(eq => eq.slot === slotToFill && eq.rarity === lr);
                 if(baseEqPoolForSlot.length > 0) break;
             }
        }
        if (baseEqPoolForSlot.length === 0) baseEqPoolForSlot = BASE_EQUIPMENT_ITEMS.filter(eq => eq.slot === slotToFill && eq.rarity === CharacterRarity.N); // Fallback to N rarity for the slot
        if (baseEqPoolForSlot.length === 0 && BASE_EQUIPMENT_ITEMS.length > 0) baseEqPoolForSlot = [BASE_EQUIPMENT_ITEMS.find(eq=> eq.slot === slotToFill) || BASE_EQUIPMENT_ITEMS[0]]; // Absolute fallback
        if (baseEqPoolForSlot.length === 0) continue;


        const baseEq = baseEqPoolForSlot[Math.floor(Math.random() * baseEqPoolForSlot.length)];
        
        let actualEnhancementLevelCap = enhancementLevelCap;
        let actualEnhancementLevelMin = enhancementLevelMin;
        // Adjust cap/min based on selected item's actual rarity if it differs from targetRarityOverride
        if (baseEq.rarity !== targetRarityOverride) {
            if (baseEq.rarity === CharacterRarity.UR) { actualEnhancementLevelCap = 25; actualEnhancementLevelMin = Math.min(25, enhancementLevelMin + 2); }
            else if (baseEq.rarity === CharacterRarity.SSR) { actualEnhancementLevelCap = 20; actualEnhancementLevelMin = Math.min(20, enhancementLevelMin); }
            else if (baseEq.rarity === CharacterRarity.SR) { actualEnhancementLevelCap = 15; actualEnhancementLevelMin = Math.min(15, enhancementLevelMin - 2); }
            else if (baseEq.rarity === CharacterRarity.R) { actualEnhancementLevelCap = 10; actualEnhancementLevelMin = Math.min(10, enhancementLevelMin - 4); }
            else { actualEnhancementLevelCap = 5; actualEnhancementLevelMin = Math.min(5, enhancementLevelMin - 5); }
        }


        const enhancementLevel = Math.min(baseEq.maxEnhancement, Math.max(0, Math.floor(Math.random() * (actualEnhancementLevelCap - actualEnhancementLevelMin + 1)) + actualEnhancementLevelMin));

        Object.entries(baseEq.baseStats).forEach(([statKey, baseValue]) => {
            const key = statKey as keyof ComputedCharacterStats;
            const increasePerLevel = baseEq.statIncreasePerEnhancement[key as keyof BaseEquipmentItem['statIncreasePerEnhancement']] || 0;
            (bonusStats[key] as number) = (bonusStats[key] as number || 0) + baseValue + (increasePerLevel * enhancementLevel);
        });
    }
    return bonusStats;
};

// Simulates stats from runes for an NPC hero based on rank
const simulateRuneStatsForNpcHero = (rank: number, heroStatsBeforeRunes: ComputedCharacterStats): Partial<ComputedCharacterStats> => {
    const bonusStats: Partial<ComputedCharacterStats> = { hp: 0, atk: 0, def: 0, spd: 0, critRate: 0, critDmg: 0, accuracy: 0, evasion: 0 };
    
    let numRunes: number;
    let targetRarity: CharacterRarity;
    let runeLevelCap: number;
    let runeLevelMin: number;
    let initialRollFactor: number; // For main stat initial roll (0.0 to 1.0)

    if (rank === 1) { numRunes = 9; targetRarity = CharacterRarity.UR; runeLevelCap = MAX_RUNE_LEVEL; runeLevelMin = MAX_RUNE_LEVEL; initialRollFactor = 1.0; }
    else if (rank <= 10) { numRunes = 9; targetRarity = CharacterRarity.UR; runeLevelCap = MAX_RUNE_LEVEL; runeLevelMin = MAX_RUNE_LEVEL - 1; initialRollFactor = 0.9 + Math.random() * 0.1; }
    else if (rank <= 50) { numRunes = Math.floor(Math.random() * 3) + 7; targetRarity = CharacterRarity.SSR; runeLevelCap = MAX_RUNE_LEVEL - 2; runeLevelMin = MAX_RUNE_LEVEL - 5; initialRollFactor = 0.7 + Math.random() * 0.3; }
    else if (rank <= 100) { numRunes = Math.floor(Math.random() * 3) + 5; targetRarity = CharacterRarity.SR; runeLevelCap = MAX_RUNE_LEVEL - 5; runeLevelMin = MAX_RUNE_LEVEL - 8; initialRollFactor = 0.6 + Math.random() * 0.4; }
    else if (rank <= 500) { numRunes = Math.floor(Math.random() * 3) + 3; targetRarity = CharacterRarity.R; runeLevelCap = MAX_RUNE_LEVEL - 8; runeLevelMin = MAX_RUNE_LEVEL - 11; initialRollFactor = 0.5 + Math.random() * 0.5; }
    else { numRunes = Math.floor(Math.random()*2)+1; targetRarity = CharacterRarity.N; runeLevelCap = Math.max(0, MAX_RUNE_LEVEL - 11); runeLevelMin = 0; initialRollFactor = 0.3 + Math.random() * 0.7; }

    const potentialRunes = BASE_RUNES.filter(r => r.rarity === targetRarity || 
        (targetRarity === CharacterRarity.UR && r.rarity === CharacterRarity.SSR) ||
        (targetRarity === CharacterRarity.SSR && r.rarity === CharacterRarity.SR)
    );

    if (rank > 2000) { 
        return { hp: Math.random() * 20, atk: Math.random() * 2, def: Math.random() * 2 };
    }
    
    for (let i = 0; i < numRunes; i++) {
        let baseRunePool = potentialRunes.length > 0 ? potentialRunes : BASE_RUNES.filter(r => r.rarity === CharacterRarity.N);
        if (baseRunePool.length === 0 && BASE_RUNES.length > 0) baseRunePool = [BASE_RUNES[0]];
        if (baseRunePool.length === 0) continue;

        const baseRune = baseRunePool[Math.floor(Math.random() * baseRunePool.length)];
        const runeLevel = Math.min(baseRune.maxLevel, Math.max(0, Math.floor(Math.random() * (runeLevelCap - runeLevelMin + 1)) + runeLevelMin));
        
        const mainStatKeys = Object.keys(baseRune.mainStatOptions) as (keyof BaseRune['mainStatOptions'])[];
        if (mainStatKeys.length === 0) continue;
        
        const selectedMainStatType = mainStatKeys[Math.floor(Math.random() * mainStatKeys.length)];
        const statOptionRange = baseRune.mainStatOptions[selectedMainStatType];
        let initialRolledValue = 0;
        if (statOptionRange) {
            initialRolledValue = statOptionRange.min + Math.floor((statOptionRange.max - statOptionRange.min) * initialRollFactor);
        }
        const currentMainStatValueFromRune = initialRolledValue + (runeLevel * baseRune.mainStatIncreasePerLevel);

        if (selectedMainStatType === 'hp_perc') {
            (bonusStats.hp as number) += heroStatsBeforeRunes.hp * (currentMainStatValueFromRune / 100);
        } else if (selectedMainStatType === 'atk_perc') {
            (bonusStats.atk as number) += heroStatsBeforeRunes.atk * (currentMainStatValueFromRune / 100);
        } else if (selectedMainStatType === 'def_perc') {
            (bonusStats.def as number) += heroStatsBeforeRunes.def * (currentMainStatValueFromRune / 100);
        } else if (selectedMainStatType === 'hp_flat') {
            (bonusStats.hp as number) += currentMainStatValueFromRune;
        } else if (selectedMainStatType === 'atk_flat') {
            (bonusStats.atk as number) += currentMainStatValueFromRune;
        } else if (selectedMainStatType === 'def_flat') {
            (bonusStats.def as number) += currentMainStatValueFromRune;
        } else if (selectedMainStatType === 'spd_flat') {
            (bonusStats.spd as number) += currentMainStatValueFromRune;
        } else if (selectedMainStatType === 'critRate_perc') {
            (bonusStats.critRate as number) += currentMainStatValueFromRune;
        } else if (selectedMainStatType === 'critDmg_perc') {
            (bonusStats.critDmg as number) += currentMainStatValueFromRune;
        } else if (selectedMainStatType === 'accuracy_perc') {
            (bonusStats.accuracy as number) += currentMainStatValueFromRune;
        } else if (selectedMainStatType === 'evasion_perc') {
            (bonusStats.evasion as number) += currentMainStatValueFromRune;
        }
    }
    Object.keys(bonusStats).forEach(key => {
        const statKey = key as keyof Partial<ComputedCharacterStats>;
        bonusStats[statKey] = Math.floor(bonusStats[statKey] || 0);
    });
    return bonusStats;
};

const simulatePetStatsForNpcHero = (rank: number): Partial<Record<PetStatBoostKey, number>> => {
    const petBoosts: Partial<Record<PetStatBoostKey, number>> = {};
    
    let targetRarity: CharacterRarity;
    let petLevelCap: number;
    let petLevelMin: number;
    let shouldHavePet = false;

    if (rank === 1) { targetRarity = CharacterRarity.UR; petLevelCap = MAX_PET_LEVEL; petLevelMin = MAX_PET_LEVEL; shouldHavePet = true; }
    else if (rank <= 10) { targetRarity = CharacterRarity.UR; petLevelCap = MAX_PET_LEVEL; petLevelMin = MAX_PET_LEVEL - 2; shouldHavePet = true; }
    else if (rank <= 50) { targetRarity = CharacterRarity.SSR; petLevelCap = MAX_PET_LEVEL - 3; petLevelMin = MAX_PET_LEVEL - 7; shouldHavePet = true; }
    else if (rank <= 100) { targetRarity = CharacterRarity.SR; petLevelCap = MAX_PET_LEVEL - 6; petLevelMin = MAX_PET_LEVEL - 10; shouldHavePet = true; }
    else if (rank <= 500) { targetRarity = CharacterRarity.R; petLevelCap = MAX_PET_LEVEL - 10; petLevelMin = MAX_PET_LEVEL - 15; shouldHavePet = Math.random() < 0.7; }
    else if (rank <= 1000) { targetRarity = CharacterRarity.N; petLevelCap = MAX_PET_LEVEL - 15; petLevelMin = 1; shouldHavePet = Math.random() < 0.3; }
    else { return petBoosts; } 

    if (!shouldHavePet) return petBoosts;

    const potentialPets = BASE_PETS.filter(p => p.rarity === targetRarity ||
        (targetRarity === CharacterRarity.UR && p.rarity === CharacterRarity.SSR) ||
        (targetRarity === CharacterRarity.SSR && p.rarity === CharacterRarity.SR));

    if (potentialPets.length === 0 && targetRarity !== CharacterRarity.N) { // Fallback if no target/higher found
         const fallbackPets = BASE_PETS.filter(p => p.rarity === CharacterRarity.N);
         if (fallbackPets.length > 0) {
            const basePet = fallbackPets[Math.floor(Math.random() * fallbackPets.length)];
            const petLevel = Math.min(basePet.maxLevel, Math.max(1, Math.floor(Math.random() * (5 - 1 + 1)) + 1)); // L1-5 for N pets
            Object.entries(basePet.globalStatsBoost).forEach(([statKey, baseValueAtL1]) => {
                const key = statKey as PetStatBoostKey;
                const increasePerLevel = basePet.statIncreasePerLevel?.[key] || 0;
                petBoosts[key] = (petBoosts[key] || 0) + baseValueAtL1 + (increasePerLevel * (petLevel - 1));
            });
         }
        return petBoosts;
    }
    if (potentialPets.length === 0) return petBoosts;


    const basePet = potentialPets[Math.floor(Math.random() * potentialPets.length)];
    const petLevel = Math.min(basePet.maxLevel, Math.max(1, Math.floor(Math.random() * (petLevelCap - petLevelMin + 1)) + petLevelMin));

    Object.entries(basePet.globalStatsBoost).forEach(([statKey, baseValueAtL1]) => {
        const key = statKey as PetStatBoostKey;
        const increasePerLevel = basePet.statIncreasePerLevel?.[key] || 0;
        const totalStatBoostValue = baseValueAtL1 + (increasePerLevel * (petLevel - 1));
        petBoosts[key] = (petBoosts[key] || 0) + totalStatBoostValue;
    });

    return petBoosts;
};

const simulateSkillLevelsForNpcHero = (rank: number, baseSkills: BaseSkill[]): Record<string, number> => {
    const skillLevels: Record<string, number> = {};
    if (!baseSkills || baseSkills.length === 0) return skillLevels;

    baseSkills.forEach(skill => {
        let targetLevel: number;
        if (rank === 1) { targetLevel = skill.maxLevel; }
        else if (rank <= 10) { targetLevel = skill.maxLevel - Math.floor(Math.random() * 1.5); } // Max or Max-1
        else if (rank <= 50) { targetLevel = skill.maxLevel - Math.floor(Math.random() * 2.5); } // Max, Max-1, or Max-2
        else {
            const rankFactor = Math.max(0.1, 1 - (rank / ARENA_MAX_RANK) * 0.9); 
            targetLevel = Math.floor(skill.maxLevel * rankFactor) + Math.floor(Math.random() * (skill.maxLevel * 0.15));
        }
        skillLevels[skill.id] = Math.min(skill.maxLevel, Math.max(1, Math.round(targetLevel)));
    });
    return skillLevels;
}


export const generateArenaNpcTeamData = (rank: number, numHeroes: number, baseCharactersList: Character[] = REGULAR_CHARACTERS): ArenaHeroPreview[] => {
    const team: ArenaHeroPreview[] = [];
    let availableHeroesPool = [...baseCharactersList]; 
    
    let targetRarityDistribution: Record<CharacterRarity, number> = {
        [CharacterRarity.UR]: 0, [CharacterRarity.SSR]: 0, [CharacterRarity.SR]: 0, [CharacterRarity.R]: 0, [CharacterRarity.N]: 0,
    };

    if (rank === 1) { targetRarityDistribution.UR = numHeroes; }
    else if (rank <= 10) { targetRarityDistribution.UR = Math.max(0, numHeroes - 1); targetRarityDistribution.SSR = numHeroes - targetRarityDistribution.UR; }
    else if (rank <= 50) { targetRarityDistribution.SSR = Math.max(0, numHeroes-1); targetRarityDistribution.UR = Math.min(1, numHeroes - targetRarityDistribution.SSR); targetRarityDistribution.SR = numHeroes - targetRarityDistribution.SSR - targetRarityDistribution.UR;}
    else if (rank <= 100) { targetRarityDistribution.SR = numHeroes - Math.min(numHeroes, 2); targetRarityDistribution.R = Math.min(numHeroes, 2);}
    else if (rank <= 500) { targetRarityDistribution.R = numHeroes - Math.min(numHeroes, 1); targetRarityDistribution.N = Math.min(numHeroes, 1); }
    else { targetRarityDistribution.N = numHeroes; } 

    const selectedHeroesDefinitions: Character[] = [];
    const rarityOrder: CharacterRarity[] = [CharacterRarity.UR, CharacterRarity.SSR, CharacterRarity.SR, CharacterRarity.R, CharacterRarity.N];

    for (const rarity of rarityOrder) {
        const countNeeded = targetRarityDistribution[rarity];
        if (countNeeded === 0) continue;

        const heroesOfThisRarity = availableHeroesPool.filter(h => h.rarity === rarity && !selectedHeroesDefinitions.find(sh => sh.id === h.id));
        heroesOfThisRarity.sort(() => 0.5 - Math.random()); 

        for (let i = 0; i < countNeeded && heroesOfThisRarity.length > 0; i++) {
            if (selectedHeroesDefinitions.length < numHeroes) {
                selectedHeroesDefinitions.push(heroesOfThisRarity.pop()!);
            }
        }
    }
    
    let fallbackRarityIdx = rarityOrder.length -1; 
    while(selectedHeroesDefinitions.length < numHeroes && fallbackRarityIdx >=0) {
        const currentFallbackRarity = rarityOrder[fallbackRarityIdx--];
        const heroesOfFallbackRarity = availableHeroesPool.filter(h => h.rarity === currentFallbackRarity && !selectedHeroesDefinitions.find(sh => sh.id === h.id));
        heroesOfFallbackRarity.sort(() => 0.5 - Math.random());
        while(selectedHeroesDefinitions.length < numHeroes && heroesOfFallbackRarity.length > 0) {
            selectedHeroesDefinitions.push(heroesOfFallbackRarity.pop()!);
        }
    }
    if (selectedHeroesDefinitions.length < numHeroes) {
        const remainingAvailable = availableHeroesPool.filter(h => !selectedHeroesDefinitions.find(sh => sh.id === h.id));
        remainingAvailable.sort(() => 0.5 - Math.random());
        while(selectedHeroesDefinitions.length < numHeroes && remainingAvailable.length > 0) {
            selectedHeroesDefinitions.push(remainingAvailable.pop()!);
        }
    }

    for (const heroDef of selectedHeroesDefinitions.slice(0, numHeroes)) { 
        let stars: number;
        let targetLevel: number;

        if (rank === 1) { 
            stars = 7;
            targetLevel = MAX_CHARACTER_LEVEL_BY_STARS[7];
        } else if (rank <= 10) { 
            stars = 7; 
            targetLevel = MAX_CHARACTER_LEVEL_BY_STARS[stars] - Math.floor(Math.random() * 3); // 88-90
        } else if (rank <= 50) { 
            stars = (Math.random() < 0.6) ? 7 : 6;
            targetLevel = MAX_CHARACTER_LEVEL_BY_STARS[stars] - Math.floor(Math.random() * 8); 
        } else if (rank <= 100) { 
            stars = (Math.random() < 0.7) ? 6 : 5;
            targetLevel = MAX_CHARACTER_LEVEL_BY_STARS[stars] - Math.floor(Math.random() * 12);
        } else if (rank <= 500) { 
            stars = (Math.random() < 0.6) ? 5 : 4;
            targetLevel = MAX_CHARACTER_LEVEL_BY_STARS[stars] - Math.floor(Math.random() * 15); 
        } else { 
            stars = Math.max(1, 4 - Math.floor(Math.random() * 2.1)); 
            targetLevel = MAX_CHARACTER_LEVEL_BY_STARS[stars] - Math.floor(Math.random() * 20);
        }
        
        stars = Math.min(7, Math.max(1, stars));
        const maxLevelForGeneratedStars = MAX_CHARACTER_LEVEL_BY_STARS[stars];
        targetLevel = Math.max(1, Math.min(maxLevelForGeneratedStars, targetLevel));
        
        const starBonus = (STAT_BONUS_PER_STAR[stars] || 0) / 100;
        const scaledHeroStats: ComputedCharacterStats = {
            hp: Math.floor(heroDef.baseHp * (1 + starBonus) * (1 + (targetLevel - 1) * 0.05)),
            atk: Math.floor(heroDef.baseAtk * (1 + starBonus) * (1 + (targetLevel - 1) * 0.05)),
            def: Math.floor(heroDef.baseDef * (1 + starBonus) * (1 + (targetLevel - 1) * 0.05)),
            spd: Math.floor(heroDef.baseSpd * (1 + starBonus)), // Speed typically only scales with stars
            critRate: heroDef.critRate,
            critDmg: heroDef.critDmg,
            accuracy: heroDef.accuracy,
            evasion: heroDef.evasion,
        };
        
        const equipmentBoost = simulateEquipmentStatsForNpcHero(rank, heroDef.rarity);
        
        const statsAfterEquipment: ComputedCharacterStats = { ...scaledHeroStats };
        Object.keys(equipmentBoost).forEach(key => {
            const statKey = key as keyof ComputedCharacterStats;
            (statsAfterEquipment[statKey] as number) = Math.floor((statsAfterEquipment[statKey] as number || 0) + (equipmentBoost[statKey] || 0));
        });

        const runeBoost = simulateRuneStatsForNpcHero(rank, statsAfterEquipment);
        const petBoostConfig = simulatePetStatsForNpcHero(rank);
        const simulatedSkillLevels = simulateSkillLevelsForNpcHero(rank, heroDef.skills);

        team.push({
            heroId: heroDef.id,
            level: targetLevel,
            stars,
            spriteEmoji: heroDef.spriteEmoji,
            name: heroDef.name,
            simulatedEquipmentBoost: equipmentBoost,
            simulatedRuneBoost: runeBoost,
            simulatedPetBoostConfig: petBoostConfig,
            simulatedSkillLevels: simulatedSkillLevels,
        });
    }
    return team;
};
