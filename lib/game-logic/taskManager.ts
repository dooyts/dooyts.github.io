
import { GameState, Task, TaskType, Currency } from '../../types';
import { isToday } from './utils';

export const getTaskProgress = (gameState: GameState, task: Task): { current: number, target: number } => {
    let current = 0;
    if (task.conditionProperty && gameState.taskProgress[task.conditionProperty] !== undefined) {
        current = gameState.taskProgress[task.conditionProperty] as number;
    } else if (task.conditionValue !== undefined) {
        // This condition is a bit vague, assuming it checks if a specific task ID in progress matches a value.
        // Needs clarification or better structure for conditionValue tasks.
        // For now, let's assume if conditionValue exists, it's a simple flag.
        // Example: if (gameState.taskProgress[task.id as keyof GameState['taskProgress']] === task.conditionValue) current = task.targetCount;
    } else if (task.conditionFunction) {
        if (task.conditionFunction(gameState)) current = task.targetCount;
    }

    // Specific overrides for certain tasks
    if (task.type === TaskType.DAILY && task.id === 'daily_login') {
        // A daily login task might be considered complete if EITHER sevenDayLogin.claimedToday is true (for current day)
        // OR if lastDailyReset happened very recently (within a few minutes, indicating app launch after reset)
        current = (gameState.sevenDayLogin.claimedToday && isToday(gameState.sevenDayLogin.lastClaimTimestamp)) || 
                  (gameState.lastDailyReset > Date.now() - 5 * 60 * 1000) ? 1 : 0;
    } else if (task.type === TaskType.DAILY && task.id === 'daily_dungeon_1') {
        current = gameState.taskProgress.dungeonsClearedToday || 0;
    } else if (task.type === TaskType.DAILY && task.id === 'daily_battle_3') {
        current = gameState.taskProgress.battlesWonToday || 0;
    }


    return { current, target: task.targetCount };
};

export const claimTaskRewardLogic = (
    prev: GameState,
    taskId: string,
    allTasksDefinitions: Task[], // Pass all task definitions
    getTaskProgressFn: (task: Task) => { current: number, target: number }, // Pass the getTaskProgress function itself
    addCurrencyFn: (currency: Currency, amount: number) => void // GameContext function
): GameState => {
    const task = allTasksDefinitions.find(t => t.id === taskId);
    if (!task || prev.completedTasks.includes(taskId)) return prev;

    const progress = getTaskProgressFn(task); // Use the passed function
    if (progress.current < progress.target) return prev;

    // Add rewards (this part will be handled by GameContext wrapper calling addCurrency)
    // For now, let's assume the GameContext wrapper handles calling addCurrencyFn
    // This manager should just return the state changes.
    let newResources = { ...prev.resources };
    Object.entries(task.rewards).forEach(([key, value]) => {
        // addCurrencyFn(key as Currency, value as number);
         newResources[key as Currency] = (newResources[key as Currency] || 0) + (value as number);
    });
    
    let newCompletedTasks = [...prev.completedTasks, taskId];
    let newTaskProgress = { ...prev.taskProgress };

    // Reset progress for repeatable tasks (daily/weekly) after claim
    if (task.type === TaskType.DAILY && task.conditionProperty && task.conditionProperty.endsWith('Today')) {
        // Daily tasks like 'battlesWonToday' or 'dungeonsClearedToday' are reset by daily reset logic, not here.
        // Claiming them just marks them as complete for the day.
    } else if (task.type === TaskType.WEEKLY && task.conditionProperty) {
        // Weekly tasks like 'battlesWon' (overall for the week) might reset if needed.
        // For now, assume weekly reset handles this.
    }


    return { ...prev, resources: newResources, completedTasks: newCompletedTasks, taskProgress: newTaskProgress };
};

export const updateBattleTasks = (
    currentProgress: GameState['taskProgress'],
    isStageBattle: boolean,
    arenaBattleResult?: 'arena' | 'win' | 'loss' | undefined
): GameState['taskProgress'] => {
    let newProgress = {
        ...currentProgress,
        battlesWon: (currentProgress.battlesWon || 0) + 1,
        battlesWonToday: (currentProgress.battlesWonToday || 0) + 1,
    };

    if (arenaBattleResult === 'arena' || arenaBattleResult === 'win') {
        newProgress.arenaBattlesWonToday = (newProgress.arenaBattlesWonToday || 0) + 1;
    }
    // Note: stagesCleared is handled in completeStageLogic in BattleManager
    // Note: dungeonsClearedToday is handled in startDungeonBattle in GameContext
    return newProgress;
};

export const checkTaskRedDot = (
    gameState: GameState,
    allTasksDefinitions: Task[],
    getTaskProgressFn: (task: Task) => { current: number, target: number }
): boolean => {
    return allTasksDefinitions.some(task => {
        if (gameState.completedTasks.includes(task.id)) return false;
        const progress = getTaskProgressFn(task);
        return progress.current >= progress.target;
    });
};
