
import { GameState, OwnedEquipmentItem, BaseEquipmentItem, EquipmentSlot, Currency } from '../../types';
import { uuidv4 } from './utils';

export const getOwnedEquipmentItemByUniqueId = (gameState: GameState, uniqueId: string): OwnedEquipmentItem | undefined => {
    return gameState.ownedEquipment.find(eq => eq.uniqueId === uniqueId);
};

interface AddEquipmentResult {
    newState: GameState;
    item: OwnedEquipmentItem | null;
}

export const addEquipmentItemLogic = (
    prev: GameState,
    baseItemId: string,
    source: string = "Unknown",
    baseEquipmentItems: BaseEquipmentItem[]
): AddEquipmentResult => {
    const baseItem = baseEquipmentItems.find(item => item.id === baseItemId);
    if (!baseItem) return { newState: prev, item: null };

    const newOwnedItem: OwnedEquipmentItem = {
        ...baseItem,
        uniqueId: uuidv4(),
        enhancementLevel: 0,
    };
    const newState = { ...prev, ownedEquipment: [...prev.ownedEquipment, newOwnedItem] };
    return { newState, item: newOwnedItem };
};

export const enhanceEquipmentLogic = (
    prev: GameState,
    equipmentUniqueId: string,
    enhancementCostFn: (level: number, rarity: OwnedEquipmentItem['rarity']) => Partial<Record<Currency, number>>,
    canAffordCheck: (currency: Currency, amount: number) => boolean
): GameState => {
    const itemIndex = prev.ownedEquipment.findIndex(eq => eq.uniqueId === equipmentUniqueId);
    if (itemIndex === -1) return prev;

    const item = prev.ownedEquipment[itemIndex];
    if (item.enhancementLevel >= item.maxEnhancement) return prev;

    const costs = enhancementCostFn(item.enhancementLevel + 1, item.rarity);
    for (const currency in costs) {
        if (!canAffordCheck(currency as Currency, costs[currency as Currency]!)) return prev;
    }

    const updatedEquipmentList = [...prev.ownedEquipment];
    updatedEquipmentList[itemIndex] = { ...item, enhancementLevel: item.enhancementLevel + 1 };

    let newResources = { ...prev.resources };
    for (const currency in costs) {
        newResources[currency as Currency] -= costs[currency as Currency]!;
    }
    
    // Update task progress for equipment enhancement
    const newTaskProgress = {
        ...prev.taskProgress,
        equipmentEnhanced: (prev.taskProgress.equipmentEnhanced || 0) + 1,
    };

    return { ...prev, ownedEquipment: updatedEquipmentList, resources: newResources, taskProgress: newTaskProgress };
};

export const getUnequippedEquipmentBySlot = (gameState: GameState, slot: EquipmentSlot): OwnedEquipmentItem[] => {
    const equippedIds = new Set<string>();
    gameState.characters.forEach(char => {
        const itemIdInSlot = char.equipment[slot];
        if (itemIdInSlot) {
            equippedIds.add(itemIdInSlot);
        }
        // Also consider all other slots, as an item can only be equipped once
        Object.values(char.equipment).forEach(id => {
            if (id) equippedIds.add(id);
        });

    });
    return gameState.ownedEquipment.filter(eq => eq.slot === slot && !equippedIds.has(eq.uniqueId));
};

export const checkHeroEquipmentRedDot = (
    gameState: GameState,
    enhancementCostFn: (level: number, rarity: OwnedEquipmentItem['rarity']) => Partial<Record<Currency, number>>,
    canAffordCheck: (currency: Currency, amount: number) => boolean,
    getUnequippedFn: (slot: EquipmentSlot) => OwnedEquipmentItem[]
): boolean => {
    // Check if any equipped item can be enhanced
    for (const char of gameState.characters) {
        for (const slot in char.equipment) {
            const eqId = char.equipment[slot as EquipmentSlot];
            if (eqId) {
                const item = getOwnedEquipmentItemByUniqueId(gameState, eqId);
                if (item && item.enhancementLevel < item.maxEnhancement) {
                    const costs = enhancementCostFn(item.enhancementLevel + 1, item.rarity);
                    if (Object.entries(costs).every(([curr, val]) => canAffordCheck(curr as Currency, val as number))) {
                        return true; // Can enhance an equipped item
                    }
                }
            }
        }
    }
    // Check if any character has an empty slot for which an unequipped item exists
     for (const char of gameState.characters) {
        for (const slotKey of Object.values(EquipmentSlot)) {
            if (!char.equipment[slotKey]) { // If slot is empty
                if (getUnequippedFn(slotKey).length > 0) {
                    return true; // Found an empty slot and an item to equip
                }
            }
        }
    }
    return false;
};
