
import React from 'react';
import { GameState, GachaPullableItem, GachaAnnouncement, Mail, BasePet, VIPLevel } from '../../types'; // Added BasePet, VIPLevel
import * as GachaManager from '../../lib/game-logic/gachaManager';
import * as MailManager from '../../lib/game-logic/mailManager';
import { uuidv4 } from '../../lib/game-logic/utils';
import { MAX_ANNOUNCEMENTS } from '../../constants/uiConstants';
import { VIP_LEVELS } from '../../constants/gameplayConstants'; // Import VIP_LEVELS
import { BASE_PETS } from '../../constants/petConstants'; // Import BASE_PETS

export const addGachaAnnouncementCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => (announcementData: Omit<GachaAnnouncement, 'id' | 'timestamp'>) => {
    setGameState(prev => {
        const newAnnouncement: GachaAnnouncement = {
            ...announcementData,
            id: uuidv4(),
            timestamp: Date.now(),
        };
        const updatedAnnouncements = [newAnnouncement, ...(prev.gachaAnnouncements || [])];
        updatedAnnouncements.sort((a, b) => b.timestamp - a.timestamp); 
        
        return { ...prev, gachaAnnouncements: updatedAnnouncements.slice(0, MAX_ANNOUNCEMENTS) };
    });
};

export const gachaPullCallback = (
    getGameState: () => GameState,
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    sendSystemMailFn: (mailData: Omit<Mail, 'id' | 'timestamp' | 'isRead' | 'claimed'>) => void
) => (poolId: string, numPulls: 1 | 10): GachaPullableItem[] => {
    
    const currentGameState = getGameState(); 

    const { newState: nextStateAfterGacha, results, mailsToSend } = GachaManager.gachaPullLogic(
        currentGameState,
        poolId, 
        numPulls, 
        BASE_PETS, 
        VIP_LEVELS
    );

    setGameState(nextStateAfterGacha);

    if (mailsToSend && mailsToSend.length > 0) {
        mailsToSend.forEach(mailData => {
            setTimeout(() => sendSystemMailFn(mailData), 0);
        });
    }

    return results;
};
