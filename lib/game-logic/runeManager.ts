
import { GameState, OwnedRune, BaseRune, RuneSlotType, Currency, CharacterRarity } from '../../types';
import { uuidv4 } from './utils';
import { MAX_RUNE_LEVEL, RUNE_ENHANCEMENT_COST } from '../../constants/runeConstants'; // Import MAX_RUNE_LEVEL

interface AddRuneResult {
    newState: GameState;
    rune: OwnedRune | null;
}

export const addRuneLogic = (
    prev: GameState,
    baseRuneId: string,
    source: string = "Unknown",
    baseRunes: BaseRune[]
): AddRuneResult => {
    const baseRune = baseRunes.find(r => r.id === baseRuneId);
    if (!baseRune) return { newState: prev, rune: null };

    const mainStatKeys = Object.keys(baseRune.mainStatOptions) as (keyof BaseRune['mainStatOptions'])[];
    if (mainStatKeys.length === 0) {
        console.warn(`Rune ${baseRuneId} has no mainStatOptions defined.`);
        return { newState: prev, rune: null };
    }
    const selectedMainStatType = mainStatKeys[Math.floor(Math.random() * mainStatKeys.length)];
    const statOptionRange = baseRune.mainStatOptions[selectedMainStatType];
    
    let initialRolledValue = 0;
    if (statOptionRange) {
        initialRolledValue = statOptionRange.min + Math.floor(Math.random() * (statOptionRange.max - statOptionRange.min + 1));
    }

    const newOwnedRune: OwnedRune = {
        ...baseRune,
        uniqueId: uuidv4(),
        currentMainStat: {
            type: selectedMainStatType,
            value: initialRolledValue, // At L0, current value is the initial roll
        },
        initialMainStatValue: initialRolledValue, // Store the L0 roll
        level: 0, 
    };

    const newState: GameState = {
        ...prev,
        ownedRunes: [...prev.ownedRunes, newOwnedRune],
    };
    return { newState, rune: newOwnedRune };
};

export const getOwnedRuneByUniqueId = (
    gameState: GameState,
    uniqueId: string
): OwnedRune | undefined => {
    return gameState.ownedRunes.find(r => r.uniqueId === uniqueId);
};

export const getUnequippedRunes = (gameState: GameState): OwnedRune[] => {
    const equippedRuneIds = new Set<string>();
    gameState.characters.forEach(character => {
        character.runes.forEach(runeId => {
            if (runeId) {
                equippedRuneIds.add(runeId);
            }
        });
    });
    return gameState.ownedRunes.filter(rune => !equippedRuneIds.has(rune.uniqueId));
};

export const enhanceRuneLogic = (
    prev: GameState,
    runeUniqueId: string,
    enhancementCostFn: (level: number, rarity: CharacterRarity) => Partial<Record<Currency, number>>,
    maxRuneLevelConst: number,
    canAffordCheck: (currency: Currency, amount: number) => boolean
): GameState => {
    const runeIndex = prev.ownedRunes.findIndex(r => r.uniqueId === runeUniqueId);
    if (runeIndex === -1) return prev;

    const rune = prev.ownedRunes[runeIndex];
    if (rune.level >= maxRuneLevelConst) return prev;

    const costs = enhancementCostFn(rune.level + 1, rune.rarity);
    for (const currency in costs) {
        if (!canAffordCheck(currency as Currency, costs[currency as Currency]!)) {
            return prev;
        }
    }

    const newLevel = rune.level + 1;
    const newMainStatValue = rune.initialMainStatValue + (newLevel * rune.mainStatIncreasePerLevel);

    const updatedRunes = [...prev.ownedRunes];
    updatedRunes[runeIndex] = { 
        ...rune, 
        level: newLevel,
        currentMainStat: {
            ...rune.currentMainStat,
            value: parseFloat(newMainStatValue.toFixed(rune.currentMainStat.type.includes("_perc") ? 1 : 0)) // Round percentages to 1 decimal
        }
    };

    let newResources = { ...prev.resources };
    for (const currency in costs) {
        newResources[currency as Currency]! -= costs[currency as Currency]!;
    }

    const newTaskProgress = {
        ...prev.taskProgress,
        runesEnhanced: (prev.taskProgress.runesEnhanced || 0) + 1,
    };

    return { ...prev, ownedRunes: updatedRunes, resources: newResources, taskProgress: newTaskProgress };
};


export const checkHeroRuneRedDot = (
    gameState: GameState,
    getUnequippedRunesFn: () => OwnedRune[],
    enhancementCostFn: (level: number, rarity: CharacterRarity) => Partial<Record<Currency, number>>,
    maxRuneLevelConst: number,
    canAffordFn: (currency: Currency, amount: number) => boolean
): boolean => {
    const hasUnequippedRunes = getUnequippedRunesFn().length > 0;
    let canEquip = false;
    if (hasUnequippedRunes) {
      for (const char of gameState.characters) {
          if (char.runes.some(runeId => runeId === null)) {
              canEquip = true; 
              break;
          }
      }
    }
    if (canEquip) return true;

    // Check for rune enhancement
    for (const char of gameState.characters) {
        for (const runeId of char.runes) {
            if (runeId) {
                const rune = gameState.ownedRunes.find(r => r.uniqueId === runeId);
                if (rune && rune.level < maxRuneLevelConst) {
                    const costs = enhancementCostFn(rune.level + 1, rune.rarity);
                    if (Object.entries(costs).every(([curr, val]) => canAffordFn(curr as Currency, val as number))) {
                        return true; // Can enhance an equipped rune
                    }
                }
            }
        }
    }
    return false;
};