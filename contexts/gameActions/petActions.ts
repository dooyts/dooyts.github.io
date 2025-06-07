
import React from 'react';
import { GameState, OwnedPet, Currency, CharacterRarity } from '../../types';
import * as PetManager from '../../lib/game-logic/petManager';
import { BASE_PETS, MAX_PET_LEVEL, PET_ENHANCEMENT_COST } from '../../constants/petConstants';

type CanAffordFn = (currency: Currency, amount: number) => boolean;
type GetCurrentGameStateFn = () => GameState;

export const getOwnedPetByUniqueIdCallback = (
    getGameState: GetCurrentGameStateFn
) => (uniqueId: string): OwnedPet | undefined => {
    return PetManager.getOwnedPetByUniqueId(getGameState(), uniqueId);
};

export const addPetCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => (basePetId: string, source: string = "Unknown"): OwnedPet | null => {
    let addedPet: OwnedPet | null = null;
    setGameState(prev => {
        const result = PetManager.addPetLogic(prev, basePetId, source, BASE_PETS);
        addedPet = result.pet;
        return result.newState;
    });
    return addedPet;
};

export const assignPetCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => (characterId: string, petUniqueId: string | null) => {
    setGameState(prev => PetManager.assignPetLogic(prev, characterId, petUniqueId));
};

export const enhancePetCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    canAffordFn: CanAffordFn
) => (petUniqueId: string) => {
    setGameState(prev => PetManager.enhancePetLogic(prev, petUniqueId, PET_ENHANCEMENT_COST, MAX_PET_LEVEL, canAffordFn));
};
