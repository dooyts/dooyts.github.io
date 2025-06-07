
import { GameState, GrowthFundMilestone, Currency, ShopItem, OwnedCharacter } from '../../types';

export const claimGrowthFundRewardLogic = (
    prev: GameState,
    milestoneId: string,
    growthFundMilestones: GrowthFundMilestone[],
    addCharacterFn: (charId: string, shards?: number) => OwnedCharacter | null,
    addCurrencyFn: (currency: Currency, amount: number) => void
): GameState => {
    if (!prev.growthFundPurchased) return prev; 
    if (prev.claimedGrowthFundMilestones.includes(milestoneId)) return prev; 

    const milestone = growthFundMilestones.find(m => m.id === milestoneId);
    if (!milestone || !milestone.condition(prev)) return prev; 

    // Handle character shards directly from milestone.characterShards
    if (milestone.characterShards) {
        addCharacterFn(milestone.characterShards.charId, milestone.characterShards.amount);
    }

    // Iterate over milestone.rewards for currency rewards
    Object.entries(milestone.rewards).forEach(([key, value]) => {
        addCurrencyFn(key as Currency, value as number);
    });

    return {
        ...prev,
        claimedGrowthFundMilestones: [...prev.claimedGrowthFundMilestones, milestoneId],
    };
};

export const purchaseGrowthFundLogic = (
    prev: GameState,
    shopItemsBundles: ShopItem[], 
    addVipExpFn: (amount: number) => void
): GameState => {
    if (prev.growthFundPurchased) return prev; 

    const growthFundItem = shopItemsBundles.find(item => item.isGrowthFund);
    if (!growthFundItem || !growthFundItem.priceNT) return prev; 

    addVipExpFn(growthFundItem.vipExpAwarded);
    
    return {
        ...prev,
        growthFundPurchased: true,
        resources: {
            ...prev.resources,
            totalSimulatedNTSpent: prev.resources.totalSimulatedNTSpent + growthFundItem.priceNT,
        }
    };
};

export const checkGrowthFundRedDot = (
    gameState: GameState,
    growthFundMilestones: GrowthFundMilestone[]
): boolean => {
    if (!gameState.growthFundPurchased) return false;

    return growthFundMilestones.some(milestone => {
        return !gameState.claimedGrowthFundMilestones.includes(milestone.id) && milestone.condition(gameState);
    });
};
