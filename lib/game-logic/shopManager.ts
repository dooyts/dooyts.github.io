
import { GameState, ShopItem, TriggeredOffer, Currency, ShopItemCategory, VIPLevel, BasePet, Mail, BaseEquipmentItem, OwnedCharacter, OwnedEquipmentItem } from '../../types';
import { uuidv4, isToday } from './utils';
import * as VIPManager from './vipManager'; // Import VIPManager
import * as CharacterManager from './characterManager'; // For adding characters/shards
import * as EquipmentManager from './equipmentManager'; // For adding equipment

interface PurchaseResult {
    newState: GameState;
    success: boolean;
    mailToSend?: Omit<Mail, 'id' | 'timestamp' | 'isRead' | 'claimed'>;
    offerToTrigger?: { templateIndex: number; dynamicData?: any };
}

export const purchaseShopItemLogic = (
    prev: GameState,
    item: ShopItem,
    basePets: BasePet[], // For VIPManager
    vipLevels: VIPLevel[], // For VIPManager
    shopResourceItemsForReset: ShopItem[], // For resetting limits for resource tab items
    shopStaminaItemsForReset: ShopItem[], // For resetting limits for stamina items
    triggeredOfferTemplates: Omit<TriggeredOffer, 'id' | 'emoji'>[], // For new offer trigger
    triggerOfferEmojis: Record<string, string>, // For new offer trigger
    addCharacterFn: (currentState: GameState, characterId: string, initialShards?: number) => { newState: GameState, character: OwnedCharacter | null }, // Internal add char
    addEquipmentItemFn: (currentState: GameState, baseItemId: string, source?: string) => { newState: GameState, item: OwnedEquipmentItem | null } // Internal add equip
): PurchaseResult => {
    let success = false;
    let newState = { ...prev }; // Create a mutable copy
    let mailToSend: PurchaseResult['mailToSend'] | undefined = undefined;
    let offerToTrigger: PurchaseResult['offerToTrigger'] | undefined = undefined;

    // Check daily limits for resource items
    if ((item.category === ShopItemCategory.RESOURCE || item.category === ShopItemCategory.SPECIALS) && item.dailyLimit && item.id !== 'reset_daily_limits_shop') {
        const limitInfo = newState.dailyPurchaseLimits[item.id] || { count: 0, lastPurchaseTime: 0 };
        if (!isToday(limitInfo.lastPurchaseTime)) {
            limitInfo.count = 0; // Reset count if it's a new day
        }
        if (limitInfo.count >= item.dailyLimit) {
            return { newState: prev, success: false }; // Return original state if purchase fails early
        }
    }


    if (item.isOneTime && newState.purchasedOneTimeOffers.includes(item.id)) {
        return { newState: prev, success: false };
    }

    // Handle price payment
    if (item.priceCurrency && item.priceAmount) {
        if (newState.resources[item.priceCurrency] < item.priceAmount) {
            return { newState: prev, success: false };
        }
        newState.resources = { ...newState.resources, [item.priceCurrency]: newState.resources[item.priceCurrency] - item.priceAmount };
        if (item.priceCurrency === Currency.STAMINA) { 
            newState.lastStaminaUpdateTime = Date.now();
        }
    }

    let awardedDiamondsThisPurchase = 0;
    // Handle item effects/rewards
    if (item.category === ShopItemCategory.DIAMOND && item.diamondsAwarded) {
        let diamondsToAdd = item.diamondsAwarded;
        if (item.bonusDiamonds && !newState.firstPurchaseBonusUsed[item.id]) {
            diamondsToAdd += item.bonusDiamonds;
            newState.firstPurchaseBonusUsed = { ...newState.firstPurchaseBonusUsed, [item.id]: true };
        }
        newState.resources[Currency.DIAMONDS] = (newState.resources[Currency.DIAMONDS] || 0) + diamondsToAdd;
        awardedDiamondsThisPurchase = diamondsToAdd;
        success = true;
    } else if (item.category === ShopItemCategory.BUNDLE) {
        if (item.isMonthlyCard && (!newState.activeMonthlyCardEndTime || newState.activeMonthlyCardEndTime <= Date.now())) {
            const diamondsFromCard = item.diamondsAwarded || 300;
            newState.resources[Currency.DIAMONDS] = (newState.resources[Currency.DIAMONDS] || 0) + diamondsFromCard;
            newState.activeMonthlyCardEndTime = Date.now() + 30 * 24 * 60 * 60 * 1000;
            success = true;
        } else if (item.isLifetimeCard && !newState.activeLifetimeCard) {
            const diamondsFromCard = item.diamondsAwarded || 680;
            newState.resources[Currency.DIAMONDS] = (newState.resources[Currency.DIAMONDS] || 0) + diamondsFromCard;
            newState.activeLifetimeCard = true;
            success = true;
        } else if (item.isGrowthFund && !newState.growthFundPurchased) {
            newState.growthFundPurchased = true;
            success = true;
        } else if (item.resources) { // General bundle resources
             Object.entries(item.resources).forEach(([currency, amount]) => {
                if (currency === Currency.STAMINA) {
                    newState.resources.currentStamina += (amount as number); // Allow exceeding max
                } else {
                    newState.resources[currency as Currency] = (newState.resources[currency as Currency] || 0) + (amount as number);
                }
            });
            success = true;
        }
         if (item.diamondsAwarded && !item.isMonthlyCard && !item.isLifetimeCard) { 
            newState.resources[Currency.DIAMONDS] = (newState.resources[Currency.DIAMONDS] || 0) + item.diamondsAwarded;
        }
    } else if (item.category === ShopItemCategory.RESOURCE || item.category === ShopItemCategory.SPECIALS) {
        let appliedEffectOrResource = false;
        if (item.effect) {
            if (item.effect.add_stamina) {
                newState.resources.currentStamina += item.effect.add_stamina; // Allow exceeding max
                newState.lastStaminaUpdateTime = Date.now(); 
                appliedEffectOrResource = true;
            }
            if (item.effect.add_arena_attempts) {
                newState.dailyArenaAttempts += item.effect.add_arena_attempts;
                appliedEffectOrResource = true;
            }
            if (item.effect.add_dungeon_attempt) {
                const { dungeonId, count } = item.effect.add_dungeon_attempt;
                newState.dailyDungeonAttempts[dungeonId] = (newState.dailyDungeonAttempts[dungeonId] || 0) + count;
                appliedEffectOrResource = true;
            }
            if (item.effect.reset_resource_shop_daily_limits) {
                const newDailyLimits = { ...newState.dailyPurchaseLimits };
                // Iterate over items that might have limits. Stamina items won't have `dailyLimit` anymore.
                [...shopResourceItemsForReset, ...shopStaminaItemsForReset].forEach(shopItemToReset => {
                    if (shopItemToReset.dailyLimit && newDailyLimits[shopItemToReset.id]) { // Check if item.dailyLimit exists
                        newDailyLimits[shopItemToReset.id] = { count: 0, lastPurchaseTime: 0 };
                    }
                });
                newState.dailyPurchaseLimits = newDailyLimits;
                appliedEffectOrResource = true;
            }
        }
        if (item.resources) { 
            Object.entries(item.resources).forEach(([currency, amount]) => {
               if (currency === Currency.STAMINA) {
                 newState.resources.currentStamina += (amount as number); // Allow exceeding max
                 newState.lastStaminaUpdateTime = Date.now();
               } else {
                 newState.resources[currency as Currency] = (newState.resources[currency as Currency] || 0) + (amount as number);
               }
           });
           appliedEffectOrResource = true;
        }
        if (item.characterShards) {
            // Assuming addCharacterFn is a modified version that takes current state and returns new state and the character
            const charResult = addCharacterFn(newState, item.characterShards.charId, item.characterShards.amount);
            newState = charResult.newState;
            appliedEffectOrResource = true;
        }
        if (item.equipment) {
            for (const eqId of item.equipment) {
                 // Assuming addEquipmentItemFn is modified similarly
                const eqResult = addEquipmentItemFn(newState, eqId, "ShopPurchase");
                newState = eqResult.newState;
            }
            appliedEffectOrResource = true;
        }

        if (appliedEffectOrResource) {
            success = true;
        }
    }

    if (success) {
        const vipResult = VIPManager.addVipExpLogic(newState, item.vipExpAwarded, basePets, vipLevels);
        newState = vipResult.newState; 
        if (vipResult.mailToSend) {
            mailToSend = vipResult.mailToSend;
        }

        if (item.priceNT) {
             newState.resources.totalSimulatedNTSpent += item.priceNT;
        }

        if (item.isOneTime) {
            newState.purchasedOneTimeOffers = [...newState.purchasedOneTimeOffers, item.id];
        }

        if ((item.category === ShopItemCategory.RESOURCE || item.category === ShopItemCategory.SPECIALS) && item.dailyLimit && item.id !== 'reset_daily_limits_shop') {
            const limitInfo = newState.dailyPurchaseLimits[item.id] || { count: 0, lastPurchaseTime: 0 };
            newState.dailyPurchaseLimits[item.id] = {
                count: (isToday(limitInfo.lastPurchaseTime) ? limitInfo.count : 0) + 1,
                lastPurchaseTime: Date.now()
            };
        }

        const isFirstEverDiamondPurchase = Object.keys(newState.firstPurchaseBonusUsed).length <= 1 && awardedDiamondsThisPurchase > 0 && item.category === ShopItemCategory.DIAMOND;
        if (isFirstEverDiamondPurchase && !newState.triggeredOffer && !mailToSend) { 
            const templateIndex = triggeredOfferTemplates.findIndex(t => t.triggerCondition === 'login_first_time'); 
             if (templateIndex !== -1) {
                offerToTrigger = { templateIndex };
            }
        }
    } else {
        return { newState: prev, success: false }; 
    }

    return { newState, success, mailToSend, offerToTrigger };
};

export const triggerOfferByIdLogic = (
    prev: GameState,
    templateIndex: number,
    dynamicData: any,
    templates: Omit<TriggeredOffer, 'id' | 'emoji'>[],
    emojis: Record<string, string>
): GameState => {
    const template = templates[templateIndex];
    if (template && !prev.triggeredOffer && (!template.isOneTime || !prev.purchasedOneTimeOffers.includes(template.triggerCondition + '_template'))) {
        const offerId = `${template.triggerCondition}_${Date.now()}`;
        let name = template.name;
        if (dynamicData?.heroName && template.name.includes('英雄')) name = `${dynamicData.heroName} 速成包`;
        if (dynamicData?.stageName && template.name.includes('關卡')) name = `關卡 ${dynamicData.stageName} 支援包`;

        const newOffer: TriggeredOffer = {
            ...template,
            id: offerId,
            name: name,
            emoji: emojis[template.triggerCondition] || '🎉'
        };
        return { ...prev, triggeredOffer: newOffer };
    }
    return prev;
};

export const clearTriggeredOfferLogic = (prev: GameState): GameState => {
    return { ...prev, triggeredOffer: null };
};

interface PurchaseTriggeredOfferResult extends PurchaseResult {}

export const purchaseTriggeredOfferLogic = (
    prev: GameState,
    offerId: string,
    basePets: BasePet[],
    vipLevels: VIPLevel[]
): PurchaseTriggeredOfferResult => {
    const offer = prev.triggeredOffer;
    if (offer && offer.id === offerId) {
        let newState = { ...prev }; 
        let mailToSend: PurchaseResult['mailToSend'] | undefined = undefined;

        if (offer.resources) {
            Object.entries(offer.resources).forEach(([currency, amount]) => {
                if (currency === Currency.STAMINA) {
                     newState.resources.currentStamina += (amount as number); // Allow exceeding max
                     newState.lastStaminaUpdateTime = Date.now();
                } else {
                    newState.resources[currency as Currency] = (newState.resources[currency as Currency] || 0) + (amount as number);
                }
            });
        }
        if (offer.diamondsAwarded) {
            newState.resources[Currency.DIAMONDS] = (newState.resources[Currency.DIAMONDS] || 0) + offer.diamondsAwarded;
        }

        const vipResult = VIPManager.addVipExpLogic(newState, offer.vipExpAwarded, basePets, vipLevels);
        newState = vipResult.newState; 
        if (vipResult.mailToSend) {
            mailToSend = vipResult.mailToSend;
        }


        if (offer.priceNT) newState.resources.totalSimulatedNTSpent += offer.priceNT;

        if (offer.isOneTime) {
            newState.purchasedOneTimeOffers = [...newState.purchasedOneTimeOffers, offer.id];
        }
        newState.triggeredOffer = null;
        return { newState, success: true, mailToSend };
    }
    return { newState: prev, success: false };
};
