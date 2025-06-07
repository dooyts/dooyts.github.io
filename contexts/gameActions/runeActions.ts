
import React from 'react';
import { GameState, OwnedRune, Currency, CharacterRarity } from '../../types';
import * as RuneManager from '../../lib/game-logic/runeManager';
import { BASE_RUNES, MAX_RUNE_LEVEL, RUNE_ENHANCEMENT_COST } from '../../constants/runeConstants';

type CanAffordFn = (currency: Currency, amount: number) => boolean;
type GetCurrentGameStateFn = () => GameState;

export const getOwnedRuneByUniqueIdCallback = (
    getGameState: GetCurrentGameStateFn
) => (uniqueId: string): OwnedRune | undefined => {
    return RuneManager.getOwnedRuneByUniqueId(getGameState(), uniqueId);
};

export const addRuneCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => (baseRuneId: string, source: string = "Unknown"): OwnedRune | null => {
    let addedRune: OwnedRune | null = null;
    setGameState(prev => {
        const result = RuneManager.addRuneLogic(prev, baseRuneId, source, BASE_RUNES);
        addedRune = result.rune;
        return result.newState;
    });
    return addedRune;
};

export const getUnequippedRunesCallback = (
    getGameState: GetCurrentGameStateFn
) => (): OwnedRune[] => {
    return RuneManager.getUnequippedRunes(getGameState());
};

export const enhanceRuneCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    canAffordFn: CanAffordFn
) => (runeUniqueId: string) => {
    setGameState(prev => RuneManager.enhanceRuneLogic(prev, runeUniqueId, RUNE_ENHANCEMENT_COST, MAX_RUNE_LEVEL, canAffordFn));
};
