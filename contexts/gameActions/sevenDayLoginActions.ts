
import React from 'react';
import { GameState, Currency, Mail, OwnedCharacter } from '../../types';
import * as SevenDayLoginManager from '../../lib/game-logic/sevenDayLoginManager';
import { SEVEN_DAY_LOGIN_REWARDS } from '../../constants/gameplayConstants';

// Typedefs for functions passed from GameContext
type AddCharacterFn = (charId: string, shards?: number) => OwnedCharacter | null;
type AddCurrencyFn = (currency: Currency, amount: number) => void;
type SendSystemMailFn = (mailData: Omit<Mail, 'id' | 'timestamp' | 'isRead' | 'claimed'>) => void;

export const claimSevenDayLoginRewardCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    addCharacterFn: AddCharacterFn,
    addCurrencyFn: AddCurrencyFn,
    sendSystemMailFn: SendSystemMailFn
) => (day: number) => {
    setGameState(prev => SevenDayLoginManager.claimSevenDayLoginRewardLogic(prev, day, SEVEN_DAY_LOGIN_REWARDS, addCharacterFn, addCurrencyFn, sendSystemMailFn));
};

export const setLastFreeDiamondClaimTimeCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => () => {
    setGameState(prev => ({...prev, lastFreeDailyDiamondClaimTimestamp: Date.now() }));
};
