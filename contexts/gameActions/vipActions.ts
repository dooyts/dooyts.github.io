
import React from 'react';
import { GameState, VIPLevel, Mail, BasePet } from '../../types';
import * as VIPManager from '../../lib/game-logic/vipManager';
import * as MailManager from '../../lib/game-logic/mailManager'; // For potential mail sending on VIP level up
import { VIP_LEVELS } from '../../constants/gameplayConstants';
import { BASE_PETS } from '../../constants/petConstants'; // Needed for VIPManager.addVipExpLogic

export const addVipExpCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
    // Removed sendSystemMailFn from params as VIPManager now returns mailToSend
) => (amount: number) => {
    setGameState(prevVipUpdate => {
        const { newState, mailToSend } = VIPManager.addVipExpLogic(prevVipUpdate, amount, BASE_PETS, VIP_LEVELS);
        if (mailToSend) {
            // Schedule mail sending to occur after current state update cycle
             setTimeout(() => { // Using setTimeout to ensure mail is sent after the current state update cycle
                setGameState(prevMailSend => MailManager.sendSystemMailLogic(prevMailSend, mailToSend!));
            }, 0);
        }
        return newState;
    });
};

export const getVipPerksCallback = (
    getGameState: () => GameState
) => (): string[] => {
    const currentGameState = getGameState();
    return VIPManager.getVipPerks(currentGameState, VIP_LEVELS);
};
