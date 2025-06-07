
import { GameState, SevenDayLoginReward, Currency, Mail } from '../../types';

export const claimSevenDayLoginRewardLogic = (
    prev: GameState,
    day: number,
    sevenDayLoginRewards: SevenDayLoginReward[],
    addCharacterFn: (charId: string, shards?: number) => any, // GameContext functions
    addCurrencyFn: (currency: Currency, amount: number) => void,
    sendSystemMailFn: (mailData: Omit<Mail, 'id'|'timestamp'|'isRead'|'claimed'>) => void
): GameState => {
    const rewardInfo = sevenDayLoginRewards.find(r => r.day === day);
    if (!rewardInfo || prev.sevenDayLogin.currentDay !== rewardInfo.day || prev.sevenDayLogin.claimedToday) {
        return prev;
    }

    let mailBody = `恭喜您領取了七日登入第 ${rewardInfo.day} 天獎勵：${rewardInfo.description}。\n`;
    
    // Add currency rewards
    Object.entries(rewardInfo.rewards).forEach(([currency, amount]) => {
        addCurrencyFn(currency as Currency, amount as number);
    });

    // Add character shards if they exist at the top level
    if (rewardInfo.characterShards) {
        const charData = addCharacterFn(rewardInfo.characterShards.charId, rewardInfo.characterShards.amount);
        if (charData && charData.name) { // Check if charData and charData.name exist
             mailBody += `\n英雄 ${charData.name} 碎片 x${rewardInfo.characterShards.amount} 已發放！`;
        } else {
             mailBody += `\n英雄碎片 (ID: ${rewardInfo.characterShards.charId}) x${rewardInfo.characterShards.amount} 發放處理中。`;
        }
    } else if (rewardInfo.day === 7) { // Specific Day 7 handling if no generic characterShards for day 7 (e.g. direct hero grant)
        const charIdToGrant = 'c003'; 
        const charData = addCharacterFn(charIdToGrant);
        if (charData && charData.name) { // Check if charData and charData.name exist
             mailBody += `\n英雄 ${charData.name} 已發放！`;
        } else {
             mailBody += `\n英雄 風語者 發放處理中 (可能已擁有，碎片已增加)。`;
        }
    }
    
    sendSystemMailFn({
        title: `七日登入 - 第 ${rewardInfo.day} 天獎勵`,
        body: mailBody,
        sender: "系統福利",
    });

    return {
        ...prev,
        sevenDayLogin: {
            ...prev.sevenDayLogin,
            claimedToday: true,
            lastClaimTimestamp: Date.now(),
        }
    };
};

export const checkSevenDayLoginRedDot = (gameState: GameState, sevenDayLoginRewards: SevenDayLoginReward[]): boolean => {
    const currentReward = sevenDayLoginRewards.find(r => r.day === gameState.sevenDayLogin.currentDay);
    return !!currentReward && !gameState.sevenDayLogin.claimedToday;
};