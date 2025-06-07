
import React from 'react';
import { GameState, OwnedCharacter, Character, EquipmentSlot, VIPLevel, Currency, Mail } from '../../types'; // Added Mail
import * as CharacterManager from '../../lib/game-logic/characterManager';
import * as MailManager from '../../lib/game-logic/mailManager'; // For Bombardiro mail
import { 
    BASE_CHARACTERS, MAX_CHARACTER_LEVEL_BY_STARS, LEVEL_UP_EXP_COST_BASE, 
    LEVEL_UP_GOLD_COST_BASE, SHARDS_PER_STAR 
} from '../../constants/characterConstants';
import { MAX_HEROES_IN_BATTLE_TEAM, VIP_LEVELS } from '../../constants/gameplayConstants';
import { getExpToNextLevel as calculateExpToNextLevel, getGoldToNextLevel as calculateGoldToNextLevel } from '../../lib/game-logic/utils';
import { TRIGGERED_OFFERS_TEMPLATES } from '../../constants/shopConstants';

// Type for functions passed from GameContext
type GetCurrentGameStateFn = () => GameState;
type SendSystemMailFn = (mailData: Omit<Mail, 'id' | 'timestamp' | 'isRead' | 'claimed'>) => void;
type TriggerOfferByIdFn = (templateIndex: number, dynamicData?: any) => void;
type CanAffordFn = (currency: Currency, amount: number) => boolean;


export const getCharacterByIdCallback = (
    getGameState: GetCurrentGameStateFn
) => (id: string): OwnedCharacter | undefined => {
    return CharacterManager.getCharacterById(getGameState(), id);
};

export const getCharacterBaseByIdCallback = () => (id: string): Character | undefined => {
    return CharacterManager.getCharacterBaseById(id, BASE_CHARACTERS);
};

export const addCharacterCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    getGameState: GetCurrentGameStateFn,
    sendSystemMailFn: SendSystemMailFn,
    triggerOfferByIdFn: TriggerOfferByIdFn
) => (characterId: string, initialShards: number = 0): OwnedCharacter | null => {
    
    const currentGameStateForDryRun = getGameState();
    const dryRunResult = CharacterManager.addCharacterLogic(
        currentGameStateForDryRun, 
        characterId, 
        initialShards, 
        BASE_CHARACTERS, 
        [] 
    );
    const characterToReturnFromOuterFunction = dryRunResult.character;

    let offerToTriggerData: { templateIndex: number; dynamicData?: any } | null = null;

    setGameState(prev => {
        const actualLogicResult = CharacterManager.addCharacterLogic(
            prev, 
            characterId, 
            initialShards, 
            BASE_CHARACTERS, 
            TRIGGERED_OFFERS_TEMPLATES
        );
        
        let nextState = actualLogicResult.newState;

        if (actualLogicResult.offerToTrigger && !prev.triggeredOffer) { 
             offerToTriggerData = actualLogicResult.offerToTrigger;
        }
        
        return nextState;
    });

    if (offerToTriggerData) {
        triggerOfferByIdFn(offerToTriggerData.templateIndex, offerToTriggerData.dynamicData);
    }

    return characterToReturnFromOuterFunction;
};


export const levelUpCharacterCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => (characterId: string) => {
    setGameState(prev => CharacterManager.levelUpCharacterLogic(prev, characterId, MAX_CHARACTER_LEVEL_BY_STARS, LEVEL_UP_EXP_COST_BASE, LEVEL_UP_GOLD_COST_BASE, calculateExpToNextLevel, calculateGoldToNextLevel));
};

export const starUpCharacterCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => (characterId: string) => {
    setGameState(prev => CharacterManager.starUpCharacterLogic(prev, characterId, SHARDS_PER_STAR));
};

export const upgradeSkillCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    canAffordFn: CanAffordFn // Pass the context's canAfford function
) => (characterId: string, skillId: string) => {
    setGameState(prev => CharacterManager.upgradeSkillLogic(prev, characterId, skillId, canAffordFn));
};

export const calculateCharacterPowerCallback = (
    getGameState: GetCurrentGameStateFn
) => (character: OwnedCharacter): number => {
    return CharacterManager.calculateCharacterPower(character, getGameState(), VIP_LEVELS);
};

export const getBattleTeamCallback = (
    getGameState: GetCurrentGameStateFn,
    getCharacterByIdFn: (id: string) => OwnedCharacter | undefined
) => (): OwnedCharacter[] => {
    const currentGameState = getGameState();
    return currentGameState.battleTeamSlots
        .map(id => id ? getCharacterByIdFn(id) : null) // Use the passed getCharacterByIdFn
        .filter(Boolean) as OwnedCharacter[];
};

export const calculateTeamPowerCallback = (
    getGameState: GetCurrentGameStateFn
) => (customTeamIds?: (string | null)[]): number => {
    return CharacterManager.calculateTeamPower(getGameState(), VIP_LEVELS, customTeamIds);
};

export const assignHeroToBattleSlotCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => (heroId: string, slotIndex: number) => {
    setGameState(prev => CharacterManager.assignHeroToBattleSlotLogic(prev, heroId, slotIndex, MAX_HEROES_IN_BATTLE_TEAM));
};

export const clearBattleSlotCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => (slotIndex: number) => {
    setGameState(prev => CharacterManager.clearBattleSlotLogic(prev, slotIndex, MAX_HEROES_IN_BATTLE_TEAM));
};

export const autoAssignTeamCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    getGameState: GetCurrentGameStateFn // Pass getGameState
) => () => {
    setGameState(prev => { // Use prev for the freshest state if multiple rapid calls
        const currentGameState = prev; 
        const allPlayerChars = [...currentGameState.characters];

        const charsWithPower = allPlayerChars.map(char => ({
            ...char,
            power: CharacterManager.calculateCharacterPower(char, currentGameState, VIP_LEVELS)
        }));

        charsWithPower.sort((a, b) => b.power - a.power);

        const newBattleTeamSlots: (string | null)[] = Array(MAX_HEROES_IN_BATTLE_TEAM).fill(null);
        const assignedHeroIds = new Set<string>();

        for (let i = 0; i < MAX_HEROES_IN_BATTLE_TEAM; i++) {
            for (const char of charsWithPower) {
                if (!assignedHeroIds.has(char.id)) {
                    newBattleTeamSlots[i] = char.id;
                    assignedHeroIds.add(char.id);
                    break; 
                }
            }
        }
        return { ...currentGameState, battleTeamSlots: newBattleTeamSlots };
    });
};

export const equipItemCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => (characterId: string, equipmentUniqueId: string) => {
    setGameState(prev => CharacterManager.equipItemLogic(prev, characterId, equipmentUniqueId));
};

export const unequipItemCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => (characterId: string, slot: EquipmentSlot) => {
    setGameState(prev => CharacterManager.unequipItemLogic(prev, characterId, slot));
};

export const equipRuneCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => (characterId: string, runeUniqueId: string, slotIndex: number) => {
    setGameState(prev => CharacterManager.equipRuneLogic(prev, characterId, runeUniqueId, slotIndex));
};

export const unequipRuneCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => (characterId: string, slotIndex: number) => {
    setGameState(prev => CharacterManager.unequipRuneLogic(prev, characterId, slotIndex));
};
