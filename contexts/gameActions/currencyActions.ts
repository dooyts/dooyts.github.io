
import React from 'react';
import { GameState, Currency } from '../../types';
// Note: No specific CurrencyManager needed here as logic is simple enough or relies on setGameState directly.

export const addCurrencyCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => (currency: Currency, amount: number) => {
    if (amount <= 0) return;
    setGameState(prev => {
        let updatedResources = { ...prev.resources };
        let finalLastStaminaUpdateTime = prev.lastStaminaUpdateTime;

        if (currency === Currency.STAMINA) {
            const newStamina = prev.resources.currentStamina + amount;
            updatedResources.currentStamina = newStamina; 
            // Also update the specific Currency.STAMINA key if it's used elsewhere, though currentStamina is primary
            updatedResources[Currency.STAMINA] = newStamina; 
            finalLastStaminaUpdateTime = Date.now(); 
        } else {
            updatedResources[currency] = (prev.resources[currency] || 0) + amount;
        }
        
        return {
            ...prev,
            resources: updatedResources,
            lastStaminaUpdateTime: finalLastStaminaUpdateTime
        };
    });
};

export const spendCurrencyCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    getGameState: () => GameState 
) => (currency: Currency, amount: number): boolean => {
    if (amount <= 0) return true; 
    const currentGameState = getGameState();

    const canCurrentlyAfford = currency === Currency.STAMINA 
        ? currentGameState.resources.currentStamina >= amount 
        : currentGameState.resources[currency] >= amount;

    if (!canCurrentlyAfford) {
        return false;
    }

    setGameState(prev => {
        // Re-check affordability with the latest `prev` state to handle concurrent updates.
        const canAffordInPrev = currency === Currency.STAMINA
            ? prev.resources.currentStamina >= amount
            : prev.resources[currency] >= amount;

        if (!canAffordInPrev) {
            return prev; // Return original state if cannot afford with the most current state.
        }

        let updatedResources = { ...prev.resources };
        let finalLastStaminaUpdateTime = prev.lastStaminaUpdateTime;

        if (currency === Currency.STAMINA) {
            const newStamina = Math.max(0, prev.resources.currentStamina - amount);
            updatedResources.currentStamina = newStamina;
            updatedResources[Currency.STAMINA] = newStamina;
            finalLastStaminaUpdateTime = Date.now();
        } else {
            updatedResources[currency] = prev.resources[currency] - amount;
        }
        return {
            ...prev,
            resources: updatedResources,
            lastStaminaUpdateTime: finalLastStaminaUpdateTime
        };
    });
    return canCurrentlyAfford; // Return based on the initial check; actual update is async.
};

export const canAffordCallback = (
    getGameState: () => GameState
) => (currency: Currency, amount: number): boolean => {
    const currentGameState = getGameState();
    if (currency === Currency.STAMINA) return currentGameState.resources.currentStamina >= amount;
    return (currentGameState.resources[currency] || 0) >= amount;
};
