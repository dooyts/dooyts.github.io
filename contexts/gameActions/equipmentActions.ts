
import React from 'react';
import { GameState, OwnedEquipmentItem, EquipmentSlot, Currency, CharacterRarity } from '../../types';
import * as EquipmentManager from '../../lib/game-logic/equipmentManager';
import { BASE_EQUIPMENT_ITEMS, EQUIPMENT_ENHANCEMENT_COST } from '../../constants/equipmentConstants';

type CanAffordFn = (currency: Currency, amount: number) => boolean;
type GetCurrentGameStateFn = () => GameState;

export const getOwnedEquipmentItemByUniqueIdCallback = (
    getGameState: GetCurrentGameStateFn
) => (uniqueId: string): OwnedEquipmentItem | undefined => {
    return EquipmentManager.getOwnedEquipmentItemByUniqueId(getGameState(), uniqueId);
};

export const addEquipmentItemCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => (baseItemId: string, source: string = "Unknown"): OwnedEquipmentItem | null => {
    let addedItem: OwnedEquipmentItem | null = null;
    setGameState(prev => {
        const result = EquipmentManager.addEquipmentItemLogic(prev, baseItemId, source, BASE_EQUIPMENT_ITEMS);
        addedItem = result.item;
        return result.newState;
    });
    return addedItem;
};

export const enhanceEquipmentCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    canAffordFn: CanAffordFn
) => (equipmentUniqueId: string) => {
    setGameState(prev => EquipmentManager.enhanceEquipmentLogic(prev, equipmentUniqueId, EQUIPMENT_ENHANCEMENT_COST, canAffordFn));
};

export const getUnequippedEquipmentBySlotCallback = (
    getGameState: GetCurrentGameStateFn
) => (slot: EquipmentSlot): OwnedEquipmentItem[] => {
    return EquipmentManager.getUnequippedEquipmentBySlot(getGameState(), slot);
};
