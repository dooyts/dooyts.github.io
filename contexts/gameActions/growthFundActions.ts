
import React from 'react';
import { GameState, Currency, OwnedCharacter } from '../../types';
import * as GrowthFundManager from '../../lib/game-logic/growthFundManager';
import { GROWTH_FUND_MILESTONES, SHOP_ITEMS_BUNDLES } from '../../constants/shopConstants';

// Typedefs for functions passed from GameContext
type AddCharacterFn = (charId: string, shards?: number) => OwnedCharacter | null;
type AddCurrencyFn = (currency: Currency, amount: number) => void;
type AddVipExpFn = (amount: number) => void;

export const claimGrowthFundRewardCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    addCharacterFn: AddCharacterFn,
    addCurrencyFn: AddCurrencyFn
) => (milestoneId: string) => {
    setGameState(prev => GrowthFundManager.claimGrowthFundRewardLogic(prev, milestoneId, GROWTH_FUND_MILESTONES, addCharacterFn, addCurrencyFn));
};

export const purchaseGrowthFundCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    addVipExpFn: AddVipExpFn
) => () => {
    setGameState(prev => GrowthFundManager.purchaseGrowthFundLogic(prev, SHOP_ITEMS_BUNDLES, addVipExpFn));
};
