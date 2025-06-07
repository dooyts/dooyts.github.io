import { GameState, Mail, Currency } from '../../types';
import { uuidv4 } from './utils';

export const sendSystemMailLogic = (
    prev: GameState,
    mailData: Omit<Mail, 'id' | 'timestamp' | 'isRead' | 'claimed'>
): GameState => {
    const newMail: Mail = {
        ...mailData,
        id: uuidv4(),
        timestamp: Date.now(),
        isRead: false,
        claimed: false,
    };
    return { ...prev, mails: [newMail, ...prev.mails.slice(0, 49)] }; // Keep max 50 mails
};

export const readMailLogic = (prev: GameState, mailId: string): GameState => {
    return { ...prev, mails: prev.mails.map(m => m.id === mailId ? { ...m, isRead: true } : m) };
};

export const claimMailRewardLogic = (
    prev: GameState,
    mailId: string,
    addCurrencyFn: (currencyKey: Currency, amount: number, currentResources: GameState['resources']) => GameState['resources']
): GameState => {
    const mail = prev.mails.find(m => m.id === mailId);
    if (!mail || mail.claimed || !mail.rewards) return prev;

    let tempNewResources = { ...prev.resources };
    Object.entries(mail.rewards).forEach(([key, value]) => {
        // Assuming addCurrencyFn directly updates and returns the new resources object
        tempNewResources = addCurrencyFn(key as Currency, value as number, tempNewResources);
    });

    return {
        ...prev,
        resources: tempNewResources,
        mails: prev.mails.map(m => m.id === mailId ? { ...m, claimed: true, isRead: true } : m)
    };
};

export const deleteMailLogic = (prev: GameState, mailId: string): GameState => {
    return { ...prev, mails: prev.mails.filter(m => m.id !== mailId) };
};

export const checkMailRedDot = (gameState: GameState): boolean => {
    return gameState.mails.some(mail => !mail.isRead);
};