
import { GameState, GachaPool, GachaPullableItem, Currency, CharacterRarity, GachaItemType, Character, BaseEquipmentItem, BasePet, OwnedPet, BaseRune, GachaPoolItemConfig, GachaResultItem, Mail, VIPLevel, GachaAnnouncement, OwnedCharacter, OwnedEquipmentItem, BaseSkill, OwnedSkill } from '../../types';
import * as CharacterManager from './characterManager';
import * as EquipmentManager from './equipmentManager';
import * as PetManager from './petManager';
import * as RuneManager from './runeManager';
import * as VIPManager from './vipManager';
import { BASE_CHARACTERS, BASE_SKILLS_DATA } from '../../constants/characterConstants';
import { BASE_EQUIPMENT_ITEMS } from '../../constants/equipmentConstants';
import { BASE_PETS } from '../../constants/petConstants';
import { BASE_RUNES } from '../../constants/runeConstants';
import { SINGLE_PULL_COST_DIAMONDS, SINGLE_PULL_COST_GACHA_TICKET, SINGLE_PULL_COST_DIAMONDS_EQUIPMENT, SINGLE_PULL_COST_EQUIPMENT_TICKET, ALL_GACHA_POOLS } from '../../constants/gachaConstants';
import { VIP_LEVELS } from '../../constants/gameplayConstants';
import { uuidv4 } from './utils';
import { MAX_ANNOUNCEMENTS } from '../../constants/uiConstants';


interface GachaPullLogicResult {
    newState: GameState;
    results: GachaPullableItem[];
    mailsToSend?: Omit<Mail, 'id' | 'timestamp' | 'isRead' | 'claimed'>[];
}

export const gachaPullLogic = (
    prev: GameState,
    poolId: string,
    numPulls: 1 | 10,
    basePets: BasePet[],
    vipLevels: VIPLevel[]
): GachaPullLogicResult => {
    const pool = ALL_GACHA_POOLS.find(p => p.id === poolId);
    if (!pool) return { newState: prev, results: [], mailsToSend: [] };

    let mailsToSendCollector: Omit<Mail, 'id' | 'timestamp' | 'isRead' | 'claimed'>[] = [];

    let newStateAfterJsonCopy = JSON.parse(JSON.stringify(prev)) as GameState;
    
    newStateAfterJsonCopy.characters = newStateAfterJsonCopy.characters.map((char_from_json_copy: any) => {
        const baseCharTemplate = BASE_CHARACTERS.find(bc => bc.id === char_from_json_copy.id);
        if (!baseCharTemplate) {
            console.warn(`gachaPullLogic global rehydration: Character template for ID ${char_from_json_copy.id} not found. Returning as is.`);
            return char_from_json_copy;
        }

        const rehydratedSkills = (char_from_json_copy.skills || []).map((sk_saved: any) => {
            const fullSkillDefinition = BASE_SKILLS_DATA[sk_saved.id];
            if (!fullSkillDefinition) {
                console.warn(`gachaPullLogic global rehydration: Full skill definition for ID ${sk_saved.id} for char ${char_from_json_copy.id} not found. Using minimal fallback.`);
                return {
                    id: sk_saved.id, name: sk_saved.name || "Unknown Skill", description: sk_saved.description || "Definition missing.", emoji: sk_saved.emoji || "❓",
                    maxLevel: sk_saved.maxLevel || 1, currentLevel: sk_saved.currentLevel || 1, upgradeCost: () => ({}),
                } as OwnedSkill;
            }
            return {
                ...(fullSkillDefinition as Omit<BaseSkill, 'id'>),
                id: sk_saved.id,
                currentLevel: sk_saved.currentLevel || 1,
            };
        });
        return { ...char_from_json_copy, skills: rehydratedSkills };
    });
    
    let newState = newStateAfterJsonCopy;

    let costCurrencyForPull: Currency;
    let costAmountForPull = 0;
    let ticketToUse: Currency | null = null;

    if (numPulls === 1) {
        if (!pool.singlePullCost) {
            console.error(`Gacha Pool ${pool.id} is configured for single pulls but has no singlePullCost defined.`);
            return { newState: prev, results: [], mailsToSend: [] };
        }
        const primaryTicketType = pool.singlePullCost.currency;
        const primaryTicketAmount = pool.singlePullCost.amount;

        if (newState.resources[primaryTicketType] >= primaryTicketAmount) {
            costCurrencyForPull = primaryTicketType;
            costAmountForPull = primaryTicketAmount;
            ticketToUse = primaryTicketType;
        } else {
            if (pool.id.includes('character_') && primaryTicketType === Currency.GACHA_TICKET) {
                costCurrencyForPull = Currency.DIAMONDS;
                costAmountForPull = SINGLE_PULL_COST_DIAMONDS;
            } else if (pool.id.includes('equipment_') && primaryTicketType === Currency.EQUIPMENT_TICKET) {
                costCurrencyForPull = Currency.DIAMONDS;
                costAmountForPull = SINGLE_PULL_COST_DIAMONDS_EQUIPMENT;
            } else {
                costCurrencyForPull = primaryTicketType;
                costAmountForPull = primaryTicketAmount;
                ticketToUse = primaryTicketType; 
            }
        }
    } else { 
        costCurrencyForPull = pool.costCurrency;
        costAmountForPull = pool.costAmount;
    }

    if (newState.resources[costCurrencyForPull] < costAmountForPull) {
        return { newState: prev, results: [], mailsToSend: [] }; 
    }

    newState.resources[costCurrencyForPull] -= costAmountForPull;
    if (costCurrencyForPull === Currency.STAMINA) {
        newState.lastStaminaUpdateTime = Date.now();
    }
    
    if (costCurrencyForPull === Currency.DIAMONDS || 
        (ticketToUse === null && (pool.id.includes('character_') || pool.id.includes('equipment_')) && numPulls === 10) ) {
        let vipExpToAdd = costAmountForPull; 
        if (vipExpToAdd > 0) {
          const vipResult = VIPManager.addVipExpLogic(newState, vipExpToAdd, basePets, vipLevels);
          newState = vipResult.newState;
          if (vipResult.mailToSend) {
              mailsToSendCollector.push(vipResult.mailToSend);
          }
      }
    }

    const results: GachaPullableItem[] = [];
    const announcementsGeneratedThisPull: GachaAnnouncement[] = [];
    let currentPityState = newState.gachaPity[pool.id] || { ssrCount: 0, upGuaranteed: false, totalPulls: 0 };
    currentPityState.totalPulls = (currentPityState.totalPulls || 0) + numPulls;

    for (let i = 0; i < numPulls; i++) {
        currentPityState.ssrCount++;
        let pulledItemConfig: GachaPoolItemConfig | null = null;
        const random = Math.random();
        let cumulativeRate = 0;

        if (pool.isLuckyDraw) {
            let cumulativeWeight = 0;
            const totalWeight = pool.itemPool.reduce((sum, item) => sum + ((item as any).weight || 0), 0);
            if (totalWeight === 0 && pool.itemPool.length > 0) { 
                 pulledItemConfig = pool.itemPool[Math.floor(Math.random() * pool.itemPool.length)];
            } else if (totalWeight > 0) {
                for (const item of pool.itemPool) {
                    const castedItem = item as Extract<GachaPoolItemConfig, {weight: number}>;
                    if (castedItem.weight) {
                        cumulativeWeight += castedItem.weight / totalWeight;
                        if (random < cumulativeWeight) {
                            pulledItemConfig = castedItem;
                            break;
                        }
                    }
                }
            }
             if(!pulledItemConfig && pool.itemPool.length > 0) { 
                pulledItemConfig = pool.itemPool[pool.itemPool.length-1];
            }
        } else {
            const isHighRarityGuaranteedByPity = currentPityState.ssrCount >= (pool.guarantees.hardPitySSR || Infinity);
            const raritiesToIterate: CharacterRarity[] = [CharacterRarity.UR, CharacterRarity.SSR, CharacterRarity.SR, CharacterRarity.R, CharacterRarity.N];

            for (const rarity of raritiesToIterate) {
                let currentRate = (pool.rates as Record<CharacterRarity, number>)[rarity] || 0;
                
                if ((rarity === CharacterRarity.SSR || rarity === CharacterRarity.UR)) {
                    if (isHighRarityGuaranteedByPity) {
                        currentRate = 1.0 - cumulativeRate; 
                    } else if (pool.guarantees.softPityStart && currentPityState.ssrCount >= pool.guarantees.softPityStart) {
                        currentRate += (currentPityState.ssrCount - pool.guarantees.softPityStart + 1) * (pool.guarantees.ssrPerSoftPityIncrease || 0);
                    }
                    currentRate = Math.min(1.0 - cumulativeRate, currentRate); 
                }

                if (random < cumulativeRate + currentRate) {
                    const basePotentialItems = pool.itemPool.filter(item => item.rarity === rarity && item.type !== 'resource');
                    let itemsToPickFrom = [...basePotentialItems];

                    if ((rarity === CharacterRarity.SSR || rarity === CharacterRarity.UR) && pool.upItems && pool.upItems.length > 0) {
                        const upSystemApplies = isHighRarityGuaranteedByPity || currentPityState.upGuaranteed;
                        if (upSystemApplies) {
                            const upItemsOfThisRarity = pool.upItems
                                .map(upConf => basePotentialItems.find(pItem => pItem.id === upConf.id && pItem.type === upConf.type))
                                .filter(Boolean) as GachaPoolItemConfig[];
                            if (upItemsOfThisRarity.length > 0) {
                                itemsToPickFrom = upItemsOfThisRarity;
                            }
                        }
                    }

                    if (itemsToPickFrom.length > 0) {
                        pulledItemConfig = itemsToPickFrom[Math.floor(Math.random() * itemsToPickFrom.length)];
                        
                        if (rarity === CharacterRarity.SSR || rarity === CharacterRarity.UR) {
                            const isPulledUpItem = pool.upItems?.some(up => up.id === pulledItemConfig!.id && up.type === pulledItemConfig!.type);
                            if (isHighRarityGuaranteedByPity || currentPityState.upGuaranteed) {
                                currentPityState.upGuaranteed = !isPulledUpItem;
                            } else {
                                if (pool.guarantees.upGuaranteeRate && Math.random() < pool.guarantees.upGuaranteeRate) {
                                    const upItemsForRoll = pool.upItems
                                        ?.map(upConf => basePotentialItems.find(pItem => pItem.id === upConf.id && pItem.type === upConf.type))
                                        .filter(Boolean) as GachaPoolItemConfig[];
                                    if (upItemsForRoll && upItemsForRoll.length > 0) {
                                        pulledItemConfig = upItemsForRoll[Math.floor(Math.random() * upItemsForRoll.length)];
                                        currentPityState.upGuaranteed = false;
                                    } else {
                                        currentPityState.upGuaranteed = true;
                                    }
                                } else {
                                    currentPityState.upGuaranteed = true;
                                }
                            }
                            currentPityState.ssrCount = 0;
                        }
                    } else {
                         console.warn(`Gacha Pull: No items found for rarity ${rarity} in pool ${pool.id} after filtering.`);
                    }
                    break; 
                }
                cumulativeRate += currentRate;
            }
        }

        if (!pulledItemConfig) {
            console.warn(`Gacha Pull: No item selected for pool ${pool.id} through standard logic. Random: ${random}, Final Cumulative Rate: ${cumulativeRate}. Attempting fallback from entire pool.`);
            if (pool.itemPool.length > 0) {
                pulledItemConfig = pool.itemPool[Math.floor(Math.random() * pool.itemPool.length)];
                console.warn(`Fallback item selected: ID ${pulledItemConfig.id}, Rarity ${pulledItemConfig.rarity}`);
                if ((pulledItemConfig.rarity === CharacterRarity.SSR || pulledItemConfig.rarity === CharacterRarity.UR) && !pool.isLuckyDraw) {
                    const isFallbackUpItem = pool.upItems?.some(up => up.id === pulledItemConfig!.id && up.type === pulledItemConfig!.type);
                    currentPityState.upGuaranteed = !isFallbackUpItem;
                    currentPityState.ssrCount = 0;
                }
            } else {
                console.error(`Gacha Pull Error: Pool ${pool.id} is empty. Cannot provide an item.`);
            }
        }

        if (pulledItemConfig) {
            let addedInstance: GachaPullableItem | null = null;
            let tempStateAfterAdd = newState;

            switch (pulledItemConfig.type) {
                case 'character':
                    const charResult = CharacterManager.addCharacterLogic(tempStateAfterAdd, pulledItemConfig.id, 0, BASE_CHARACTERS, []);
                    tempStateAfterAdd = charResult.newState;
                    addedInstance = charResult.character;
                    break;
                case 'equipment':
                    const eqResult = EquipmentManager.addEquipmentItemLogic(tempStateAfterAdd, pulledItemConfig.id, "Gacha", BASE_EQUIPMENT_ITEMS);
                    tempStateAfterAdd = eqResult.newState;
                    addedInstance = eqResult.item;
                    break;
                case 'pet':
                    const petResult = PetManager.addPetLogic(tempStateAfterAdd, pulledItemConfig.id, "Gacha", BASE_PETS);
                    tempStateAfterAdd = petResult.newState;
                    addedInstance = petResult.pet;
                    break;
                case 'rune':
                    const runeResult = RuneManager.addRuneLogic(tempStateAfterAdd, pulledItemConfig.id, "Gacha", BASE_RUNES);
                    tempStateAfterAdd = runeResult.newState;
                    addedInstance = runeResult.rune;
                    break;
                case 'resource':
                    const resItemConf = pulledItemConfig as Extract<GachaPoolItemConfig, { type: 'resource' }>;
                    const currencyKey = resItemConf.id as Currency;
                    const amount = resItemConf.amount || 1;
                    if (Object.values(Currency).includes(currencyKey)) {
                         if (currencyKey === Currency.STAMINA) {
                            tempStateAfterAdd.resources.currentStamina += amount;
                         } else {
                            tempStateAfterAdd.resources[currencyKey] = (tempStateAfterAdd.resources[currencyKey] || 0) + amount;
                         }
                    }
                    addedInstance = {
                        type: 'resource',
                        id: resItemConf.id,
                        name: resItemConf.name,
                        emoji: resItemConf.emoji,
                        rarity: resItemConf.rarity,
                        amount: resItemConf.amount,
                    };
                    break;
            }
            newState = tempStateAfterAdd;

            if (addedInstance) {
                 results.push(addedInstance);
                 if (pulledItemConfig.type !== 'resource' && (addedInstance.rarity === CharacterRarity.SSR || addedInstance.rarity === CharacterRarity.UR)) {
                    let itemName = "", itemEmoji = "";
                    if ('spriteEmoji' in addedInstance && 'name' in addedInstance && typeof addedInstance.name === 'string') { 
                        itemName = (addedInstance as OwnedCharacter).name;
                        itemEmoji = (addedInstance as OwnedCharacter).spriteEmoji;
                    } else if ('slot' in addedInstance && 'emoji' in addedInstance && 'name' in addedInstance && typeof addedInstance.name === 'string') { 
                        itemName = (addedInstance as OwnedEquipmentItem).name;
                        itemEmoji = (addedInstance as OwnedEquipmentItem).emoji;
                    } else if ('globalStatsBoost' in addedInstance && 'emoji' in addedInstance && 'name' in addedInstance && typeof addedInstance.name === 'string') { 
                        itemName = (addedInstance as OwnedPet).name;
                        itemEmoji = (addedInstance as OwnedPet).emoji;
                    } else if ('mainStatOptions' in addedInstance && 'emoji' in addedInstance && 'name' in addedInstance && typeof addedInstance.name === 'string') { 
                        itemName = (addedInstance as BaseRune).name;
                        itemEmoji = (addedInstance as BaseRune).emoji;
                    }

                    if (itemName && itemEmoji) {
                        announcementsGeneratedThisPull.push({
                            id: uuidv4(),
                            timestamp: Date.now() + i, 
                            playerName: newState.playerName, // Use player's actual name
                            itemName,
                            itemEmoji,
                            rarity: addedInstance.rarity
                        });
                    }
                }
            }
        }
    }
    
    // Removed Bombardiro Crocodilo acquisition logic from here. It's now tied to campaign completion.

    if (announcementsGeneratedThisPull.length > 0) {
        newState.gachaAnnouncements = [...announcementsGeneratedThisPull, ...(newState.gachaAnnouncements || [])];
        newState.gachaAnnouncements.sort((a, b) => b.timestamp - a.timestamp);
        newState.gachaAnnouncements = newState.gachaAnnouncements.slice(0, MAX_ANNOUNCEMENTS);
    }

    newState.gachaPity[pool.id] = currentPityState;
    newState.taskProgress.heroesSummoned = (newState.taskProgress.heroesSummoned || 0) + results.filter(r => (r as Character).skills && (r as Character).baseHp).length;

    return { newState, results, mailsToSend: mailsToSendCollector };
};
