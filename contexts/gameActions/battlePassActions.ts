
import React from 'react';
import { GameState, Currency, OwnedCharacter, OwnedEquipmentItem, BattlePassTier } from '../../types';
import * as BattlePassManager from '../../lib/game-logic/battlePassManager';
import { BATTLE_PASS_TIERS, BATTLE_PASS_PRICES } from '../../constants/shopConstants';

// Typedefs for functions passed from GameContext
type AddCurrencyFn = (currency: Currency, amount: number) => void;
type AddCharacterFn = (characterId: string, shards?: number) => OwnedCharacter | null;
type AddEquipmentItemFn = (baseItemId: string, source?: string) => OwnedEquipmentItem | null;
type AddVipExpFn = (amount: number) => void;


export const claimBattlePassRewardCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    addCurrencyFn: AddCurrencyFn,
    addCharacterFn: AddCharacterFn,
    addEquipmentItemFn: AddEquipmentItemFn
) => (tierLevel: number, isPaid: boolean) => {
    setGameState(prev => BattlePassManager.claimBattlePassRewardLogic(prev, tierLevel, isPaid, BATTLE_PASS_TIERS, addCurrencyFn, addCharacterFn, addEquipmentItemFn));
};

export const purchaseBattlePassCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    addVipExpFn: AddVipExpFn,
    addCurrencyFn: AddCurrencyFn
) => (type: 'advanced' | 'collector') => {
    setGameState(prev => BattlePassManager.purchaseBattlePassLogic(prev, type, BATTLE_PASS_PRICES, BATTLE_PASS_TIERS, addVipExpFn, addCurrencyFn));
};

export const processBattlePassExpEffectCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => () => {
     setGameState(prev => BattlePassManager.processBattlePassExp(prev, BATTLE_PASS_TIERS));
};
