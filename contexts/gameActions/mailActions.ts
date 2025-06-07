
import React from 'react';
import { GameState, Mail, Currency } from '../../types';
import * as MailManager from '../../lib/game-logic/mailManager';

export const sendSystemMailCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => (mailData: Omit<Mail, 'id' | 'timestamp' | 'isRead' | 'claimed'>) => {
    setGameState(prev => MailManager.sendSystemMailLogic(prev, mailData));
};

export const readMailCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => (mailId: string) => {
    setGameState(prev => MailManager.readMailLogic(prev, mailId));
};

export const claimMailRewardCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => (mailId: string) => {
    setGameState(prev => {
        const addCurrencyInternal = (currentResources: GameState['resources'], currency: Currency, amount: number) => {
            let updatedResources = { ...currentResources };
             if (currency === Currency.STAMINA) {
                updatedResources.currentStamina = (updatedResources.currentStamina || 0) + amount;
                updatedResources[Currency.STAMINA] = updatedResources.currentStamina;
            } else {
                updatedResources[currency] = (updatedResources[currency] || 0) + amount;
            }
            return updatedResources;
        };
        
        const mail = prev.mails.find(m => m.id === mailId);
        if (!mail || mail.claimed || !mail.rewards) return prev;

        let tempNewResources = { ...prev.resources };
        let newLastStaminaUpdateTime = prev.lastStaminaUpdateTime;

        Object.entries(mail.rewards).forEach(([key, value]) => {
            tempNewResources = addCurrencyInternal(tempNewResources, key as Currency, value as number);
            if (key as Currency === Currency.STAMINA) {
                newLastStaminaUpdateTime = Date.now();
            }
        });
        
        return {
            ...prev,
            resources: tempNewResources,
            lastStaminaUpdateTime: newLastStaminaUpdateTime,
            mails: prev.mails.map(m => m.id === mailId ? { ...m, claimed: true, isRead: true } : m)
        };
    });
};

export const deleteMailCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => (mailId: string) => {
    setGameState(prev => MailManager.deleteMailLogic(prev, mailId));
};
