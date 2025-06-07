
import { GameState, BattlePassTier, Currency, OwnedCharacter, OwnedEquipmentItem } from '../../types';

export const processBattlePassExp = (
    prev: GameState,
    battlePassTiers: BattlePassTier[]
): GameState => {
    const newlyAddedExp = prev.resources[Currency.BATTLE_PASS_EXP] || 0;
    
    // If no new EXP has been added and there's no existing progress, no need to process.
    // This check is important to prevent an infinite loop if the useEffect was misconfigured.
    if (newlyAddedExp === 0 && prev.battlePassExp === 0 && prev.battlePassLevel === 1) { // Added more specific condition
      // If there was some new exp but it's now processed, it's fine.
      // This handles the case where resource[BP_EXP] is already 0 from a previous run.
      if (prev.resources[Currency.BATTLE_PASS_EXP] === 0) return prev;
    }


    let currentTotalProgressExp = (prev.battlePassExp || 0) + newlyAddedExp;
    let newLevel = prev.battlePassLevel;

    // Ensure we don't process if already max level and no new exp
    const maxBattlePassLevel = battlePassTiers.length > 0 ? battlePassTiers[battlePassTiers.length - 1].level : 1;
    if (newLevel >= maxBattlePassLevel && newlyAddedExp === 0) {
        // If already at max level, ensure battlePassExp is 0, and consume any leftover newlyAddedExp if any (though it should be 0 here)
        if (prev.battlePassExp !== 0 || prev.resources[Currency.BATTLE_PASS_EXP] !== 0) {
             return {
                ...prev,
                battlePassExp: 0,
                battlePassLevel: maxBattlePassLevel, // Ensure level is correctly capped
                resources: {
                    ...prev.resources,
                    [Currency.BATTLE_PASS_EXP]: 0 
                }
            };
        }
        return prev;
    }
     if (newLevel >= maxBattlePassLevel && newlyAddedExp > 0) {
        // At max level, but new EXP was added. Consume it and ensure state is clean.
        return {
            ...prev,
            battlePassLevel: maxBattlePassLevel,
            battlePassExp: 0, // No progress possible beyond max level
            resources: {
                ...prev.resources,
                [Currency.BATTLE_PASS_EXP]: 0 // Consume the newly added exp
            }
        };
    }


    while (true) {
        const tierDataForCurrentLevel = battlePassTiers.find(t => t.level === newLevel);
        
        if (!tierDataForCurrentLevel || newLevel > maxBattlePassLevel ) { // Max level check
             if (newLevel > maxBattlePassLevel) { // If somehow overshot, correct it
                newLevel = maxBattlePassLevel;
                currentTotalProgressExp = 0; // Cap progress at max level
            }
            break;
        }
        
        const expNeededForThisLevel = tierDataForCurrentLevel.expRequired;

        if (currentTotalProgressExp >= expNeededForThisLevel) {
            currentTotalProgressExp -= expNeededForThisLevel;
            newLevel++;
            
            if (newLevel > maxBattlePassLevel) { // Check again after incrementing
                newLevel = maxBattlePassLevel;
                currentTotalProgressExp = 0; 
                break;
            }
        } else {
            break; 
        }
    }
    
    if (newLevel !== prev.battlePassLevel || currentTotalProgressExp !== prev.battlePassExp || newlyAddedExp > 0) {
        return {
            ...prev,
            battlePassLevel: newLevel,
            battlePassExp: currentTotalProgressExp,
            resources: {
                ...prev.resources,
                [Currency.BATTLE_PASS_EXP]: 0 
            }
        };
    }

    return prev;
};

export const claimBattlePassRewardLogic = (
    prev: GameState,
    tierLevel: number,
    isPaid: boolean,
    battlePassTiers: BattlePassTier[],
    addCurrencyFn: (currency: Currency, amount: number) => void,
    addCharacterFn: (charId: string, shards?: number) => OwnedCharacter | null,
    addEquipmentItemFn: (baseItemId: string, source?: string) => OwnedEquipmentItem | null
): GameState => {
    if (prev.battlePassLevel < tierLevel) return prev;

    const tier = battlePassTiers.find(t => t.level === tierLevel);
    if (!tier) return prev;

    let newState = { ...prev };
    const rewardToClaim = isPaid ? tier.paidReward : tier.freeReward;
    const claimedListToUpdate = isPaid ? newState.claimedBattlePassPaidTiers : newState.claimedBattlePassFreeTiers;

    if (!rewardToClaim || claimedListToUpdate.includes(tierLevel)) return prev;
    if (isPaid && newState.battlePassPurchased === 'none') return prev;

    if (rewardToClaim.characterShards) {
        addCharacterFn(rewardToClaim.characterShards.charId, rewardToClaim.characterShards.amount);
    }
    if (rewardToClaim.equipment) {
        rewardToClaim.equipment.forEach(eqId => addEquipmentItemFn(eqId, "BattlePass"));
    }
    Object.entries(rewardToClaim).forEach(([key, value]) => {
        if (key !== 'characterShards' && key !== 'equipment' && key !== 'isSkin' && key !== 'pet') {
            addCurrencyFn(key as Currency, value as number);
        }
    });

    if (isPaid) {
        newState.claimedBattlePassPaidTiers = [...newState.claimedBattlePassPaidTiers, tierLevel];
    } else {
        newState.claimedBattlePassFreeTiers = [...newState.claimedBattlePassFreeTiers, tierLevel];
    }
    return newState;
};

export const purchaseBattlePassLogic = (
    prev: GameState,
    type: 'advanced' | 'collector',
    battlePassPrices: { advanced: any, collector: any },
    battlePassTiers: BattlePassTier[],
    addVipExpFn: (amount: number) => void,
    addCurrencyFn: (currency: Currency, amount: number) => void
): GameState => { // Added explicit return type GameState
    if (prev.battlePassPurchased !== 'none') return prev; 

    const priceData = battlePassPrices[type];
    addVipExpFn(priceData.vipExp);
    addCurrencyFn(Currency.DIAMONDS, priceData.immediateDiamonds);

    let newBattlePassLevel = prev.battlePassLevel;

    if (type === 'collector' && priceData.levelsGranted) {
        newBattlePassLevel = Math.min(battlePassTiers.length, prev.battlePassLevel + priceData.levelsGranted);
    }
    if (type === 'collector' && priceData.bonusItems) {
        Object.entries(priceData.bonusItems).forEach(([key, value]) => {
             addCurrencyFn(key as Currency, value as number);
        });
    }
    
    let newState: GameState = {
        ...prev,
        battlePassPurchased: type,
        // battlePassLevel is updated by processBattlePassExp if levelsGranted changes effective exp
        resources: {
            ...prev.resources,
            totalSimulatedNTSpent: prev.resources.totalSimulatedNTSpent + priceData.nt,
        }
    };
    
    // If levels were granted, effectively this means a large amount of EXP was "added"
    // We need to re-evaluate the level based on this.
    // A simple way: calculate total EXP needed to reach newBattlePassLevel (if collector)
    // and ensure gameState.battlePassExp reflects that, then let processBattlePassExp normalize.
    // Or, more directly:
    if (type === 'collector' && priceData.levelsGranted) {
        newState.battlePassLevel = newBattlePassLevel; // Directly set level
        newState.battlePassExp = 0; // Reset progress into the new level
    }
    
    // Call processBattlePassExp to ensure consistency if any direct level changes happened
    // or if immediateDiamonds could somehow grant battlePassExp via a VIP perk (unlikely here)
    newState = processBattlePassExp(newState, battlePassTiers);
    return newState;
};

export const checkBattlePassRedDot = (
    gameState: GameState,
    battlePassTiers: BattlePassTier[]
): boolean => {
    for (const tier of battlePassTiers) {
        if (tier.level > gameState.battlePassLevel) continue; 

        if (tier.freeReward && Object.keys(tier.freeReward).length > 0 && !gameState.claimedBattlePassFreeTiers.includes(tier.level)) {
            return true;
        }
        if (gameState.battlePassPurchased !== 'none' && tier.paidReward && Object.keys(tier.paidReward).length > 0 && !gameState.claimedBattlePassPaidTiers.includes(tier.level)) {
            return true;
        }
    }
    return false;
};
