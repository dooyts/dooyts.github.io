
import { GameState, OwnedCharacter, Character, CharacterRarity, Currency, BaseSkill, OwnedSkill, EquipmentSlot, OwnedEquipmentItem, OwnedRune, VIPLevel, OwnedPet, PlayerResources, ComputedCharacterStats, PetStatBoostKey, ArenaHeroPreview, AppliedBuffDebuff } from '../../types';
import { uuidv4, getExpToNextLevel as calculateExpToNextLevelDefault, getGoldToNextLevel as calculateGoldToNextLevelDefault } from './utils';
import { STAT_BONUS_PER_STAR, LEVEL_UP_GOLD_COST_BASE, LEVEL_UP_EXP_COST_BASE, BASE_SKILLS_DATA, BASE_CHARACTERS, MAX_CHARACTER_LEVEL_BY_STARS } from '../../constants/characterConstants'; // Added BASE_CHARACTERS and MAX_CHARACTER_LEVEL_BY_STARS
import { MAX_HEROES_IN_BATTLE_TEAM, VIP_LEVELS } from '../../constants/gameplayConstants'; // VIP_LEVELS imported for getCharacterComputedStats

// --- Character Management ---
export const getCharacterById = (gameState: GameState, id: string): OwnedCharacter | undefined => {
    return gameState.characters.find(c => c.id === id);
};

export const getCharacterBaseById = (id: string, baseCharacters: Character[]): Character | undefined => {
    return baseCharacters.find(c => c.id === id);
};

interface AddCharacterResult {
    newState: GameState;
    character: OwnedCharacter | null;
    offerToTrigger?: { templateIndex: number; dynamicData?: any };
}

export const addCharacterLogic = (
    prev: GameState,
    characterId: string,
    initialShards: number = 0,
    baseCharactersList: Character[], 
    triggeredOfferTemplates: any[] 
): AddCharacterResult => {
    const baseChar = baseCharactersList.find(c => c.id === characterId);
    if (!baseChar) return { newState: prev, character: null };

    let finalCharState: OwnedCharacter | null = null;
    const existingCharIndex = prev.characters.findIndex(c => c.id === characterId);
    let newCharactersState = [...prev.characters];
    let heroesSummonedIncrement = 0;
    let offerToTrigger: AddCharacterResult['offerToTrigger'] | undefined = undefined;

    if (existingCharIndex !== -1) {
        const existingChar = prev.characters[existingCharIndex];
        const defaultShardsForDupe = (baseChar.rarity === CharacterRarity.SSR ? 30 : baseChar.rarity === CharacterRarity.UR ? 50 : 10);
        const shardsToAdd = initialShards > 0 ? initialShards : defaultShardsForDupe;

        const rehydratedSkills = existingChar.skills.map((sk_saved: any) => {
            const baseSkillDef = BASE_SKILLS_DATA[sk_saved.id];
            if (!baseSkillDef) {
                console.warn(`Rehydrating existing char skill: Skill ID ${sk_saved.id} for char ${existingChar.id} not in BASE_SKILLS_DATA. Using minimal fallback.`);
                return { 
                    id: sk_saved.id,
                    name: "Unknown Skill (Rehydration)",
                    description: "Error: Skill definition missing during rehydration.",
                    emoji: "❓",
                    maxLevel: 1,
                    currentLevel: sk_saved.currentLevel || 1,
                    upgradeCost: () => ({}), 
                 } as OwnedSkill;
            }
            return {
                ...(baseSkillDef as Omit<BaseSkill, 'id'>),
                id: sk_saved.id,
                currentLevel: sk_saved.currentLevel || 1,
            };
        });

        newCharactersState[existingCharIndex] = {
            ...existingChar,
            shards: existingChar.shards + shardsToAdd,
            skills: rehydratedSkills,
            activeBuffDebuff: existingChar.activeBuffDebuff || null, 
        };
        finalCharState = newCharactersState[existingCharIndex];
        heroesSummonedIncrement = 1;
    } else {
        const newCharToAdd: OwnedCharacter = {
            ...baseChar,
            level: 1,
            stars: 1,
            currentExp: 0,
            shards: initialShards,
            skills: baseChar.skills.map(s => {
                const baseSkillDef = BASE_SKILLS_DATA[s.id];
                if (!baseSkillDef) {
                    console.error(`addCharacterLogic (new): Skill ID ${s.id} for new character ${baseChar.id} not found in BASE_SKILLS_DATA.`);
                    return { 
                        id: s.id, name: "Unknown Skill (New Char)", description: "Definition missing.", emoji: "❓", maxLevel: 1, 
                        upgradeCost: () => ({}), currentLevel: 1 
                    } as OwnedSkill;
                }
                return {
                    ...(baseSkillDef as Omit<BaseSkill, 'id'>),
                    id: s.id,
                    currentLevel: 1
                };
            }),
            equipment: {},
            runes: Array(9).fill(null),
            assignedPetId: null,
            statusEffects: [], 
            activeBuffDebuff: null, // Initialize activeBuffDebuff
        };
        newCharactersState.push(newCharToAdd);
        finalCharState = newCharToAdd;
        heroesSummonedIncrement = 1;
        if (baseChar.rarity === CharacterRarity.SSR && !prev.triggeredOffer) {
            const templateIndex = triggeredOfferTemplates.findIndex(t => t.triggerCondition === 'new_ssr_hero');
            if (templateIndex !== -1) {
                 offerToTrigger = { templateIndex, dynamicData: { heroName: baseChar.name } };
            }
        }
    }
    const newState = { ...prev, characters: newCharactersState, taskProgress: {...prev.taskProgress, heroesSummoned: (prev.taskProgress.heroesSummoned || 0) + heroesSummonedIncrement} };
    return { newState, character: finalCharState, offerToTrigger };
};

export const levelUpCharacterLogic = (
    prev: GameState,
    characterId: string,
    maxLevelByStars: Record<number, number>,
    expCostBase: number,
    goldCostBase: number,
    calculateExpFn: typeof calculateExpToNextLevelDefault,
    calculateGoldFn: typeof calculateGoldToNextLevelDefault
): GameState => {
    const charIndex = prev.characters.findIndex(c => c.id === characterId);
    if (charIndex === -1) return prev;

    const char = prev.characters[charIndex];
    const maxLevel = maxLevelByStars[char.stars];
    if (char.level >= maxLevel) return prev;

    const expNeeded = calculateExpFn(char.level, expCostBase);
    const goldNeeded = calculateGoldFn(char.level, goldCostBase);

    if (prev.resources[Currency.EXP_POTION] >= expNeeded && prev.resources[Currency.GOLD] >= goldNeeded) {
        const updatedCharacters = [...prev.characters];
        updatedCharacters[charIndex] = { ...char, level: char.level + 1, currentExp: 0 };
        return {
            ...prev,
            resources: {
                ...prev.resources,
                [Currency.EXP_POTION]: prev.resources[Currency.EXP_POTION] - expNeeded,
                [Currency.GOLD]: prev.resources[Currency.GOLD] - goldNeeded,
            },
            characters: updatedCharacters,
        };
    }
    return prev;
};

export const starUpCharacterLogic = (
    prev: GameState,
    characterId: string,
    shardsPerStar: Record<number, number>
): GameState => {
    const charIndex = prev.characters.findIndex(c => c.id === characterId);
    if (charIndex === -1) return prev;

    const char = prev.characters[charIndex];
    if (char.stars >= 7) return prev;

    const shardsNeeded = shardsPerStar[char.stars + 1];
    const breakthroughStonesNeeded = char.stars * 50; 

    if (char.shards >= shardsNeeded && prev.resources[Currency.BREAKTHROUGH_STONE] >= breakthroughStonesNeeded) {
        const updatedCharacters = [...prev.characters];
        updatedCharacters[charIndex] = {
            ...char,
            stars: char.stars + 1,
            shards: char.shards - shardsNeeded,
        };
        return {
            ...prev,
            resources: {
                ...prev.resources,
                [Currency.BREAKTHROUGH_STONE]: prev.resources[Currency.BREAKTHROUGH_STONE] - breakthroughStonesNeeded,
            },
            characters: updatedCharacters,
        };
    }
    return prev;
};

export const upgradeSkillLogic = (
    prev: GameState,
    characterId: string,
    skillIdToUpgrade: string, 
    canAffordCheck: (currency: Currency, amount: number) => boolean
): GameState => {
    const charIndex = prev.characters.findIndex(c => c.id === characterId);
    if (charIndex === -1) return prev;

    const character = prev.characters[charIndex];
    const skillToUpgradeIndex = character.skills.findIndex(s => s.id === skillIdToUpgrade);
    if (skillToUpgradeIndex === -1) return prev;

    const skillToUpgrade = character.skills[skillToUpgradeIndex];
    if (skillToUpgrade.currentLevel >= skillToUpgrade.maxLevel) return prev;

    const baseSkillDefinitionForCost = BASE_SKILLS_DATA[skillToUpgrade.id];
    if (!baseSkillDefinitionForCost || typeof baseSkillDefinitionForCost.upgradeCost !== 'function') {
        console.error(`upgradeSkillLogic: Skill ${skillToUpgrade.id} for character ${characterId} has invalid/missing upgradeCost function in BASE_SKILLS_DATA.`);
        return prev;
    }

    const costs = baseSkillDefinitionForCost.upgradeCost(skillToUpgrade.currentLevel + 1);
    for (const currency in costs) {
        if (!canAffordCheck(currency as Currency, costs[currency as Currency]!)) return prev;
    }

    const rehydratedSkills = character.skills.map(s => {
        const baseDef = BASE_SKILLS_DATA[s.id];
        if (!baseDef) {
            console.warn(`upgradeSkillLogic: Base definition for skill ${s.id} not found. Using minimal fallback.`);
            return {
                id: s.id, name: s.name || "Unknown Skill", description: s.description || "Definition missing.", emoji: s.emoji || "❓",
                maxLevel: s.maxLevel || 1, currentLevel: s.currentLevel || 1, upgradeCost: () => ({}), upgradeEffect: (level: number) => ({}),
            } as OwnedSkill;
        }
        
        let newLevel = s.currentLevel;
        if (s.id === skillIdToUpgrade) {
            newLevel = s.currentLevel + 1;
        }

        return {
            ...(baseDef as Omit<BaseSkill, 'id'>), 
            id: s.id, 
            currentLevel: newLevel,
        };
    });

    const updatedCharacters = [...prev.characters];
    updatedCharacters[charIndex] = {
        ...character,
        skills: rehydratedSkills,
    };

    let newResources = { ...prev.resources };
    for (const currency in costs) {
        newResources[currency as Currency] -= costs[currency as Currency]!;
    }

    return { ...prev, characters: updatedCharacters, resources: newResources };
};


export const getEffectiveBaseStats = (character: Character, level: number, stars: number): { hp: number, atk: number, def: number, spd: number } => {
    const starBonus = (STAT_BONUS_PER_STAR[stars] || 0) / 100;
    const hp = character.baseHp * (1 + starBonus) * (1 + (level - 1) * 0.05);
    const atk = character.baseAtk * (1 + starBonus) * (1 + (level - 1) * 0.05);
    const def = character.baseDef * (1 + starBonus) * (1 + (level - 1) * 0.05);
    const spd = character.baseSpd * (1 + starBonus); 
    return { hp: Math.floor(hp), atk: Math.floor(atk), def: Math.floor(def), spd: Math.floor(spd) };
};

export const getCharacterComputedStats = (
    character: OwnedCharacter,
    gameState: GameState, 
    vipLevelsConst: VIPLevel[]
): ComputedCharacterStats => {
    const effectiveBase = getEffectiveBaseStats(character, character.level, character.stars); 

    let computed: ComputedCharacterStats = {
        hp: effectiveBase.hp,
        atk: effectiveBase.atk,
        def: effectiveBase.def,
        spd: effectiveBase.spd,
        critRate: character.critRate,
        critDmg: character.critDmg,
        accuracy: character.accuracy,
        evasion: character.evasion,
    };

    if (character.equipment && Object.keys(character.equipment).length > 0) {
        Object.values(character.equipment).forEach(eqUniqueId => {
            if (eqUniqueId) {
                const equipment = gameState.ownedEquipment.find(eq => eq.uniqueId === eqUniqueId);
                if (equipment) {
                    Object.entries(equipment.baseStats).forEach(([statKey, baseValue]) => {
                        const statIncrease = equipment.statIncreasePerEnhancement[statKey as keyof typeof equipment.statIncreasePerEnhancement] || 0;
                        const totalValue = baseValue + (statIncrease * equipment.enhancementLevel);
                        if (statKey in computed) {
                            (computed[statKey as keyof ComputedCharacterStats] as number) += totalValue;
                        }
                    });
                }
            }
        });
    }

    if (character.runes && character.runes.length > 0) {
        character.runes.forEach(runeUniqueId => {
            if (runeUniqueId) {
                const rune = gameState.ownedRunes.find(r => r.uniqueId === runeUniqueId);
                if (rune) {
                    const { type, value } = rune.currentMainStat; 
                    let initialHp = computed.hp; 
                    let initialAtk = computed.atk;
                    let initialDef = computed.def;

                    if (type === 'hp_flat') computed.hp += value;
                    else if (type === 'atk_flat') computed.atk += value;
                    else if (type === 'def_flat') computed.def += value;
                    else if (type === 'spd_flat') computed.spd += value;
                    else if (type === 'critRate_perc') computed.critRate += value;
                    else if (type === 'critDmg_perc') computed.critDmg += value;
                    else if (type === 'accuracy_perc') computed.accuracy += value;
                    else if (type === 'evasion_perc') computed.evasion += value;
                    else if (type === 'hp_perc') computed.hp += initialHp * (value / 100);
                    else if (type === 'atk_perc') computed.atk += initialAtk * (value / 100);
                    else if (type === 'def_perc') computed.def += initialDef * (value / 100);
                }
            }
        });
    }
    
    computed.hp = Math.floor(computed.hp);
    computed.atk = Math.floor(computed.atk);
    computed.def = Math.floor(computed.def);

    if (character.assignedPetId) { 
        const pet = gameState.ownedPets.find(p => p.uniqueId === character.assignedPetId);
        if (pet && pet.globalStatsBoost) {
            let initialHpForPetBonus = computed.hp;
            let initialAtkForPetBonus = computed.atk;
            let initialDefForPetBonus = computed.def;

            Object.entries(pet.globalStatsBoost).forEach(([statKeyUntyped, baseValueAtL1]) => {
                const statKey = statKeyUntyped as PetStatBoostKey;
                const increasePerLevel = pet.statIncreasePerLevel?.[statKey] || 0;
                const totalStatBoostValue = baseValueAtL1 + (increasePerLevel * (pet.level - 1));

                if (statKey === 'hp_perc') computed.hp += initialHpForPetBonus * (totalStatBoostValue / 100);
                else if (statKey === 'atk_perc') computed.atk += initialAtkForPetBonus * (totalStatBoostValue / 100);
                else if (statKey === 'def_perc') computed.def += initialDefForPetBonus * (totalStatBoostValue / 100);
                else if (statKey === 'spd_flat') computed.spd += totalStatBoostValue;
                else if (statKey === 'critRate_perc') computed.critRate += totalStatBoostValue;
                else if (statKey === 'critDmg_perc') computed.critDmg += totalStatBoostValue;
                else if (statKey === 'evasion_perc') computed.evasion += totalStatBoostValue;
                else if (statKey === 'accuracy_perc') computed.accuracy += totalStatBoostValue;
            });
        }
    }
    
    computed.hp = Math.floor(computed.hp);
    computed.atk = Math.floor(computed.atk);
    computed.def = Math.floor(computed.def);

    const vip = vipLevelsConst.find(v => v.level === gameState.vipLevel);
    if (vip) {
        if (vip.bonusAttackPercent) {
            computed.atk *= (1 + vip.bonusAttackPercent / 100);
        }
        if (vip.bonusAllStatsPercent) {
            const statBonus = vip.bonusAllStatsPercent / 100;
            computed.hp *= (1 + statBonus);
            computed.atk *= (1 + statBonus); 
            computed.def *= (1 + statBonus);
            computed.spd *= (1 + statBonus);
        }
    }

    computed.hp = Math.max(0, Math.floor(computed.hp));
    computed.atk = Math.max(0, Math.floor(computed.atk));
    computed.def = Math.max(0, Math.floor(computed.def));
    computed.spd = Math.max(0, Math.floor(computed.spd));
    computed.critRate = Math.max(0, Math.min(100, parseFloat(computed.critRate.toFixed(1)) ));
    computed.critDmg = Math.max(0, parseFloat(computed.critDmg.toFixed(1)) );
    computed.accuracy = Math.max(0, parseFloat(computed.accuracy.toFixed(1)) );
    computed.evasion = Math.max(0, parseFloat(computed.evasion.toFixed(1)) );

    return computed;
};


export const getComputedStatsFromArenaHeroPreview = (
    heroPreview: ArenaHeroPreview,
    npcVipLevel: number,
    vipLevelsConst: VIPLevel[]
): ComputedCharacterStats => {
    const baseCharDefinition = BASE_CHARACTERS.find(bc => bc.id === heroPreview.heroId);
    if (!baseCharDefinition) {
        console.error(`getComputedStatsFromArenaHeroPreview: Base character definition not found for NPC hero ID: ${heroPreview.heroId}`);
        return { hp: 1, atk: 1, def: 1, spd: 1, critRate: 0, critDmg: 0, accuracy: 0, evasion: 0 };
    }

    const scaledBaseStats = getEffectiveBaseStats(baseCharDefinition, heroPreview.level, heroPreview.stars);
    
    let finalStats: ComputedCharacterStats = {
        ...scaledBaseStats, 
        critRate: baseCharDefinition.critRate,
        critDmg: baseCharDefinition.critDmg,
        accuracy: baseCharDefinition.accuracy,
        evasion: baseCharDefinition.evasion,
    };

    if (heroPreview.simulatedEquipmentBoost) {
        const boosts = heroPreview.simulatedEquipmentBoost;
        (Object.keys(boosts) as Array<keyof ComputedCharacterStats>).forEach(key => {
            if (finalStats[key] !== undefined && boosts[key] !== undefined) {
                (finalStats[key] as number) = (finalStats[key] as number || 0) + (boosts[key] as number);
            }
        });
    }
    
    if (heroPreview.simulatedRuneBoost) {
        const boosts = heroPreview.simulatedRuneBoost;
        (Object.keys(boosts) as Array<keyof ComputedCharacterStats>).forEach(key => {
             if (finalStats[key] !== undefined && boosts[key] !== undefined) {
                (finalStats[key] as number) = (finalStats[key] as number || 0) + (boosts[key] as number);
            }
        });
    }
    
    finalStats.hp = Math.floor(finalStats.hp);
    finalStats.atk = Math.floor(finalStats.atk);
    finalStats.def = Math.floor(finalStats.def);

    if (heroPreview.simulatedPetBoostConfig) {
        const petBoosts = heroPreview.simulatedPetBoostConfig;
        const currentHpForPet = finalStats.hp; 
        const currentAtkForPet = finalStats.atk;
        const currentDefForPet = finalStats.def;
    
        (Object.entries(petBoosts) as [PetStatBoostKey, number][]).forEach(([key, value]) => {
            if (key === 'hp_perc') finalStats.hp += currentHpForPet * (value / 100);
            else if (key === 'atk_perc') finalStats.atk += currentAtkForPet * (value / 100);
            else if (key === 'def_perc') finalStats.def += currentDefForPet * (value / 100);
            else if (key === 'spd_flat') finalStats.spd += value;
            else if (key === 'critRate_perc') finalStats.critRate += value;
            else if (key === 'critDmg_perc') finalStats.critDmg += value;
            else if (key === 'evasion_perc') finalStats.evasion += value;
            else if (key === 'accuracy_perc') finalStats.accuracy += value;
        });
    }
    
    finalStats.hp = Math.floor(finalStats.hp);
    finalStats.atk = Math.floor(finalStats.atk);
    finalStats.def = Math.floor(finalStats.def);
    
    const vip = vipLevelsConst.find(v => v.level === npcVipLevel);
    if (vip) {
        if (vip.bonusAttackPercent) {
            finalStats.atk *= (1 + vip.bonusAttackPercent / 100);
        }
        if (vip.bonusAllStatsPercent) {
            const statBonus = vip.bonusAllStatsPercent / 100;
            finalStats.hp *= (1 + statBonus);
            finalStats.atk *= (1 + statBonus);
            finalStats.def *= (1 + statBonus);
            finalStats.spd *= (1 + statBonus);
        }
    }
    return {
        hp: Math.max(1, Math.floor(finalStats.hp)),
        atk: Math.max(1, Math.floor(finalStats.atk)),
        def: Math.max(1, Math.floor(finalStats.def)),
        spd: Math.max(1, Math.floor(finalStats.spd)),
        critRate: Math.max(0, Math.min(100, parseFloat(finalStats.critRate.toFixed(1)))),
        critDmg: Math.max(0, parseFloat(finalStats.critDmg.toFixed(1))),
        accuracy: Math.max(0, parseFloat(finalStats.accuracy.toFixed(1))),
        evasion: Math.max(0, parseFloat(finalStats.evasion.toFixed(1))),
    };
};

export const calculatePowerFromStats = (stats: ComputedCharacterStats): number => {
    let power = (stats.hp / 10) + (stats.atk * 4) + (stats.def * 6) + (stats.spd * 10) + (stats.critRate * 100) + (stats.critDmg * 50) + (stats.accuracy * 80) + (stats.evasion * 80) ;
    return Math.floor(power);
};


export const calculateCharacterPower = (
    characterInput: OwnedCharacter | { heroPreview: ArenaHeroPreview, vipLevel: number },
    gameState: GameState, 
    vipLevelsConst: VIPLevel[]
): number => {
    if ('heroPreview' in characterInput) { 
        const { heroPreview, vipLevel: npcVipLevel } = characterInput;
        const finalStats = getComputedStatsFromArenaHeroPreview(heroPreview, npcVipLevel, vipLevelsConst);
        return calculatePowerFromStats(finalStats);
    } else { 
        const finalStats = getCharacterComputedStats(characterInput, gameState, vipLevelsConst);
        return calculatePowerFromStats(finalStats);
    }
};


export const calculateTeamPower = (
    gameStateOrNpcTeam: GameState | { npcTeamPreview: ArenaHeroPreview[], npcVipLevel: number },
    vipLevelsConst: VIPLevel[],
    customTeamIds?: (string | null)[] 
): number => {
    let totalPower = 0;

    if ('npcTeamPreview' in gameStateOrNpcTeam) { 
        const { npcTeamPreview, npcVipLevel } = gameStateOrNpcTeam;
        if (!npcTeamPreview || npcTeamPreview.length === 0) return 0;
        
        npcTeamPreview.forEach(heroPrev => {
            // Pass an empty GameState shell as it's not used by calculateCharacterPower when heroPreview is provided
            totalPower += calculateCharacterPower({ heroPreview: heroPrev, vipLevel: npcVipLevel }, {} as GameState, vipLevelsConst);
        });
    } else { 
        const gameState = gameStateOrNpcTeam;
        const teamIdsToUse = customTeamIds || gameState.battleTeamSlots;
        const teamToCalculate = teamIdsToUse
            .map(id => id ? getCharacterById(gameState, id) : null) 
            .filter(Boolean) as OwnedCharacter[];

        if (teamToCalculate.length === 0) return 0;
        totalPower = teamToCalculate.reduce((sum, char) => sum + calculateCharacterPower(char, gameState, vipLevelsConst), 0);
    }
    return Math.floor(totalPower);
};


export const getStrongestTeam = (gameState: GameState, vipLevelsConst: VIPLevel[]): OwnedCharacter[] => {
    return gameState.characters
        .slice()
        .sort((a, b) => calculateCharacterPower(b, gameState, vipLevelsConst) - calculateCharacterPower(a, gameState, vipLevelsConst))
        .slice(0, MAX_HEROES_IN_BATTLE_TEAM);
};


export const equipItemLogic = (prev: GameState, characterId: string, equipmentUniqueId: string): GameState => {
    const charIndex = prev.characters.findIndex(c => c.id === characterId);
    const equipment = prev.ownedEquipment.find(eq => eq.uniqueId === equipmentUniqueId);
    if (charIndex === -1 || !equipment) return prev;

    const character = prev.characters[charIndex];
    const slotToEquip = equipment.slot;
    const updatedCharacters = [...prev.characters];
    updatedCharacters[charIndex] = {
        ...character,
        equipment: { ...character.equipment, [slotToEquip]: equipmentUniqueId }
    };
    return { ...prev, characters: updatedCharacters };
};

export const unequipItemLogic = (prev: GameState, characterId: string, slot: EquipmentSlot): GameState => {
    const charIndex = prev.characters.findIndex(c => c.id === characterId);
    if (charIndex === -1) return prev;
    const character = prev.characters[charIndex];
    if (!character.equipment[slot]) return prev;

    const updatedCharacters = [...prev.characters];
    updatedCharacters[charIndex] = {
        ...character,
        equipment: { ...character.equipment, [slot]: null }
    };
    return { ...prev, characters: updatedCharacters };
};

export const equipRuneLogic = (prev: GameState, characterId: string, runeUniqueId: string, slotIndex: number): GameState => {
    if (slotIndex < 0 || slotIndex >= 9) return prev;
    const charIndex = prev.characters.findIndex(c => c.id === characterId);
    const rune = prev.ownedRunes.find(r => r.uniqueId === runeUniqueId);
    if (charIndex === -1 || !rune) return prev;
    const character = prev.characters[charIndex];
    const updatedRunes = [...character.runes];
    updatedRunes[slotIndex] = runeUniqueId;
    const updatedCharacters = [...prev.characters];
    updatedCharacters[charIndex] = { ...character, runes: updatedRunes };
    return { ...prev, characters: updatedCharacters };
};

export const unequipRuneLogic = (prev: GameState, characterId: string, slotIndex: number): GameState => {
    if (slotIndex < 0 || slotIndex >= 9) return prev;
    const charIndex = prev.characters.findIndex(c => c.id === characterId);
    if (charIndex === -1) return prev;
    const character = prev.characters[charIndex];
    if (!character.runes[slotIndex]) return prev;
    const updatedRunes = [...character.runes];
    updatedRunes[slotIndex] = null;
    const updatedCharacters = [...prev.characters];
    updatedCharacters[charIndex] = { ...character, runes: updatedRunes };
    return { ...prev, characters: updatedCharacters };
};

export const checkHeroUpgradeRedDot = (
    char: OwnedCharacter,
    resources: PlayerResources,
    maxLevelByStars: Record<number, number>,
    shardsPerStar: Record<number, number>,
    expCostBase: number,
    goldCostBase: number,
    calculateExpFn: typeof calculateExpToNextLevelDefault,
    calculateGoldFn: typeof calculateGoldToNextLevelDefault,
    canAffordCheck: (currency: Currency, amount: number) => boolean
): boolean => {
    const maxLevel = maxLevelByStars[char.stars];
    const canLevelUp = char.level < maxLevel && 
                       canAffordCheck(Currency.EXP_POTION, calculateExpFn(char.level, expCostBase)) && 
                       canAffordCheck(Currency.GOLD, calculateGoldFn(char.level, goldCostBase));
    const canStarUp = char.stars < 7 && 
                      char.shards >= (shardsPerStar[char.stars + 1] || Infinity) && 
                      canAffordCheck(Currency.BREAKTHROUGH_STONE, char.stars * 50);
    return canLevelUp || canStarUp;
};

export const checkHeroSkillUpgradeRedDot = (
    char: OwnedCharacter,
    canAffordCheck: (currency: Currency, amount: number) => boolean
): boolean => {
    return char.skills.some(s => {
        if (s.currentLevel >= s.maxLevel) return false;
        
        let costFunction = s.upgradeCost;
        if (typeof costFunction !== 'function') {
            const baseSkillDef = BASE_SKILLS_DATA[s.id];
            if (baseSkillDef && typeof baseSkillDef.upgradeCost === 'function') {
                costFunction = baseSkillDef.upgradeCost;
            } else {
                return false; 
            }
        }
        
        const costs = costFunction(s.currentLevel + 1);
        return Object.entries(costs).every(([curr, amount]) => canAffordCheck(curr as Currency, amount as number));
    });
};

export const assignHeroToBattleSlotLogic = (
    prev: GameState,
    heroId: string,
    slotIndex: number,
    maxTeamSize: number
): GameState => {
    if (slotIndex < 0 || slotIndex >= maxTeamSize) return prev;

    const newBattleTeamSlots = [...prev.battleTeamSlots];
    const existingSlotOfHero = newBattleTeamSlots.indexOf(heroId);
    if (existingSlotOfHero !== -1 && existingSlotOfHero !== slotIndex) {
        newBattleTeamSlots[existingSlotOfHero] = null;
    }
    newBattleTeamSlots[slotIndex] = heroId;

    return { ...prev, battleTeamSlots: newBattleTeamSlots };
};

export const clearBattleSlotLogic = (
    prev: GameState,
    slotIndex: number,
    maxTeamSize: number
): GameState => {
    if (slotIndex < 0 || slotIndex >= maxTeamSize) return prev;
    const newBattleTeamSlots = [...prev.battleTeamSlots];
    newBattleTeamSlots[slotIndex] = null;
    return { ...prev, battleTeamSlots: newBattleTeamSlots };
};

export const checkHeroTeamAssignRedDot = (gameState: GameState, maxTeamSize: number): boolean => {
    const filledSlots = gameState.battleTeamSlots.filter(id => id !== null).length;
    if (filledSlots < maxTeamSize && gameState.characters.length > filledSlots) {
        return true; 
    }
    return false;
};
