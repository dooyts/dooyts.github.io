
import React from 'react';
import { GameState, ArenaLeaderboardEntry, OwnedCharacter, CharacterRarity, ElementType, ComputedCharacterStats, ArenaHeroPreview } from '../../types';
import * as ArenaManager from '../../lib/game-logic/arenaManager';
import * as CharacterManager from '../../lib/game-logic/characterManager';
import { REGULAR_CHARACTERS, STAT_BONUS_PER_STAR } from '../../constants/characterConstants';
import { VIP_LEVELS } from '../../constants/gameplayConstants';

// Typedefs
type GetCurrentGameStateFn = () => GameState;
type CalculateTeamPowerFn = (customTeamIds?: (string | null)[]) => number;
type GetCharacterByIdFn = (id: string) => OwnedCharacter | undefined;


export const getArenaLeaderboardCallback = (
    getGameState: GetCurrentGameStateFn,
    calculateTeamPowerFn: CalculateTeamPowerFn,
    getCharacterByIdFn: GetCharacterByIdFn
) => (): ArenaLeaderboardEntry[] => {
    const currentGameState = getGameState();
    
    // Calculate player's current power and team preview for the leaderboard
    const playerCombatPower = calculateTeamPowerFn(); // Uses current battle team
    const playerTeamPreview = currentGameState.battleTeamSlots
        .map(id => {
            const char = id ? getCharacterByIdFn(id) : null;
            return char ? { 
                heroId: char.id, 
                level: char.level, 
                stars: char.stars, 
                spriteEmoji: char.spriteEmoji, 
                name: char.name 
            } : undefined;
        })
        .filter(Boolean) as ArenaHeroPreview[];

    // Create or update player entry
    let leaderboard = [...currentGameState.arenaLeaderboard];
    const playerEntryIndex = leaderboard.findIndex(e => e.playerId === 'player');

    if (playerEntryIndex !== -1) {
        leaderboard[playerEntryIndex] = {
            ...leaderboard[playerEntryIndex],
            playerName: currentGameState.playerName,
            vipLevel: currentGameState.vipLevel,
            combatPower: playerCombatPower,
            rank: currentGameState.arenaRank, // Ensure rank is from gameState
            teamPreview: playerTeamPreview
        };
    } else {
        // This case should ideally be handled by initial leaderboard creation and updates,
        // but as a fallback, add the player if missing.
        leaderboard.push({
            playerId: 'player',
            playerName: currentGameState.playerName,
            vipLevel: currentGameState.vipLevel,
            combatPower: playerCombatPower,
            rank: currentGameState.arenaRank,
            teamPreview: playerTeamPreview
        });
    }
    
    // Recalculate NPC powers for display consistency if needed (optional, could be heavy)
    // For now, assume NPC powers in gameState.arenaLeaderboard are sufficiently up-to-date
    // or updated by the periodic ArenaManager.updateArenaLeaderboardDynamics.

    leaderboard.sort((a, b) => a.rank - b.rank);
    return leaderboard;
};

export const finishArenaActionCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => () => {
    setGameState(prev => ({ ...prev, isProcessingArenaAction: false }));
};
