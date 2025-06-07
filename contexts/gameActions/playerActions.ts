
import React from 'react';
import { GameState } from '../../types';

export const changePlayerNameCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => (newName: string) => {
    setGameState(prev => ({
        ...prev,
        playerName: newName.trim() || prev.playerName 
    }));
};
