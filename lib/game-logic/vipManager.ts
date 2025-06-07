import { GameState, VIPLevel, Currency, Mail, BasePet } from '../../types';

export const addVipExpLogic = (
    prev: GameState,
    amount: number,
    basePets: BasePet[], // Needed for VIP 12 reward check
    vipLevels: VIPLevel[]
): { newState: GameState, mailToSend: Omit<Mail, 'id' | 'timestamp' | 'isRead' | 'claimed'> | null } => {
    const newVipExp = prev.resources.vipExp + amount;
    let newVipLevel = prev.vipLevel;
    let mailToSend: Omit<Mail, 'id' | 'timestamp' | 'isRead' | 'claimed'> | null = null;

    const oldVipLevelData = vipLevels.find(v => v.level === prev.vipLevel);

    for (let i = vipLevels.length - 1; i >= 0; i--) {
        if (newVipExp >= vipLevels[i].expRequired) {
            newVipLevel = vipLevels[i].level;
            break;
        }
    }

    if (newVipLevel > prev.vipLevel) {
        const currentVipData = vipLevels.find(v => v.level === newVipLevel);
        if (currentVipData) {
            let rewardsForMail: Partial<Record<Currency, number>> | undefined = undefined;
            if (currentVipData.level === 12 && basePets.find(p => p.id === 'pet003')) { // Fire Phoenix
                rewardsForMail = { [Currency.PET_TICKET]: 1 }; // Give a ticket to summon it, or direct add
            }
             if (currentVipData.level === 15 && basePets.find(p => p.id === 'c005')) { // UR Hero Ocean Empress
                // This should ideally grant shards or the hero directly
                // For simplicity, let's assume a gacha ticket or a special mail item
            }


            mailToSend = {
                title: `VIP等級提升!`,
                body: `恭喜你達到VIP ${currentVipData.level}！\n獲得特權：${currentVipData.perks.join('、 ')}`,
                sender: "系統",
                rewards: rewardsForMail
            };
        }
    }

    return {
        newState: {
            ...prev,
            resources: { ...prev.resources, vipExp: newVipExp },
            vipLevel: newVipLevel,
        },
        mailToSend
    };
};

export const getVipPerks = (gameState: GameState, vipLevels: VIPLevel[]): string[] => {
    const currentVipLevelData = vipLevels.find(v => v.level === gameState.vipLevel);
    return currentVipLevelData ? currentVipLevelData.perks : [];
};
