
import React from 'react';
import { GameState, Task, Currency } from '../../types';
import * as TaskManager from '../../lib/game-logic/taskManager';
import { DAILY_TASKS_DEFINITIONS, WEEKLY_TASKS_DEFINITIONS, ACHIEVEMENT_TASKS_DEFINITIONS } from '../../constants/gameplayConstants';

// Typedefs for functions passed from GameContext
type AddCurrencyFn = (currency: Currency, amount: number) => void;
type GetCurrentGameStateFn = () => GameState;

export const getTaskProgressCallback = (
    getGameState: GetCurrentGameStateFn
) => (task: Task): { current: number, target: number } => {
    return TaskManager.getTaskProgress(getGameState(), task);
};

export const claimTaskRewardCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    getTaskProgressFn: (task: Task) => { current: number, target: number }, // This will be the getTaskProgressCallback instance
    addCurrencyFn: AddCurrencyFn
) => (taskId: string) => {
    setGameState(prev => TaskManager.claimTaskRewardLogic(prev, taskId, [...DAILY_TASKS_DEFINITIONS, ...WEEKLY_TASKS_DEFINITIONS, ...ACHIEVEMENT_TASKS_DEFINITIONS], getTaskProgressFn, addCurrencyFn));
};
