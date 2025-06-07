
import React from 'react';
import { GameState, WorldBossLeaderboardEntry, OwnedCharacter, ElementType, BaseSkill } from '../../types';
import * as WorldBossManager from '../../lib/game-logic/worldBossManager';
import { ELEMENT_ADVANTAGE } from '../../constants/gameplayConstants';
import { BASE_SKILLS_DATA } from '../../constants/characterConstants';

// Typedefs
type GetCurrentGameStateFn = () => GameState;
type GetBattleTeamFn = () => OwnedCharacter[];

export const attackWorldBossCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    getGameState: GetCurrentGameStateFn,
    getBattleTeamFn: GetBattleTeamFn
) => (): { success: boolean; damageDealt?: number; message?: string; battleLog?: string[] } => {
    
    const initialGameState = getGameState(); 
    const result = WorldBossManager.handlePlayerAttack(
        initialGameState,
        getBattleTeamFn(),
        ELEMENT_ADVANTAGE,
        BASE_SKILLS_DATA
    );
    
    if (result.success) { // Only update state if the attack attempt was valid (e.g., had tickets)
        setGameState(result.newState);
    }

    return {
        success: result.success,
        damageDealt: result.damageDealt,
        message: result.message,
        battleLog: result.battleLog || []
    };
};

export const getWorldBossLeaderboardCallback = (
    getGameState: GetCurrentGameStateFn
) => (): WorldBossLeaderboardEntry[] => {
    return WorldBossManager.getLeaderboard(getGameState());
};
