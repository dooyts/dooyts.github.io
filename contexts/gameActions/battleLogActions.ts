
import React from 'react';
import { GameState } from '../../types';

// Typedefs for functions passed from GameContext
type GetCurrentGameStateFn = () => GameState;

export const getBattleLogCallback = (
    getGameState: GetCurrentGameStateFn
) => (): string[] => {
    return getGameState().battleLog;
};

export const clearBattleLogCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => (): void => {
    setGameState(prev => ({ ...prev, battleLog: [] }));
};
