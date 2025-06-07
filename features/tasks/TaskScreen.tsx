
import React, { useState } from 'react';
// import TopBar from '../lobby/TopBar'; // Removed
import { useGame } from '../../contexts/GameContext';
import { Task, TaskType, Currency, GameState } from '../../types'; 
import { 
    DAILY_TASKS_DEFINITIONS, 
    WEEKLY_TASKS_DEFINITIONS, 
    ACHIEVEMENT_TASKS_DEFINITIONS,
    ACHIEVEMENT_TASK_CHAINS, 
    STANDALONE_ACHIEVEMENT_IDS 
} from '../../constants/gameplayConstants';
import { CURRENCY_NAMES, CURRENCY_EMOJIS } from '../../constants/uiConstants';
import Button from '../../components/Button';
import * as TaskManager from '../../lib/game-logic/taskManager';


const getActiveAchievementTasks = (
  gameState: GameState, 
  allAchievements: Task[],
  taskChainsConfig: string[][],
  standaloneAchievementIds: string[]
): Task[] => {
  const activeTasks: Task[] = [];
  const allTasksById = new Map(allAchievements.map(task => [task.id, task]));
  const completedTasks = gameState.completedTasks; 

  taskChainsConfig.forEach(chain => {
    const nextTaskInChainId = chain.find(taskId => !completedTasks.includes(taskId));
    if (nextTaskInChainId) {
      const task = allTasksById.get(nextTaskInChainId);
      if (task) activeTasks.push(task);
    }
  });

  standaloneAchievementIds.forEach(taskId => {
    if (!completedTasks.includes(taskId)) {
      const task = allTasksById.get(taskId);
      if (task) activeTasks.push(task);
    }
  });
  
  activeTasks.sort((a, b) => {
    const progressA = TaskManager.getTaskProgress(gameState, a);
    const progressB = TaskManager.getTaskProgress(gameState, b);
    const canClaimA = progressA.current >= progressA.target;
    const canClaimB = progressB.current >= progressB.target;

    if (canClaimA && !canClaimB) return -1;
    if (!canClaimA && canClaimB) return 1;
    
    const indexA = allAchievements.findIndex(t => t.id === a.id);
    const indexB = allAchievements.findIndex(t => t.id === b.id);
    return indexA - indexB;
  });


  return activeTasks;
};


const TaskScreen: React.FC = () => {
  const { gameState, claimTaskReward, getTaskProgress } = useGame();
  const [activeTab, setActiveTab] = useState<TaskType>(TaskType.DAILY);

  const tasksToDisplay = () => {
    switch (activeTab) {
      case TaskType.DAILY: return DAILY_TASKS_DEFINITIONS;
      case TaskType.WEEKLY: return WEEKLY_TASKS_DEFINITIONS;
      case TaskType.ACHIEVEMENT: 
        return getActiveAchievementTasks(
          gameState, 
          ACHIEVEMENT_TASKS_DEFINITIONS,
          ACHIEVEMENT_TASK_CHAINS,
          STANDALONE_ACHIEVEMENT_IDS
        );
      default: return [];
    }
  };

  const TabButton: React.FC<{tabId: TaskType, text: string}> = ({tabId, text}) => (
    <Button variant={activeTab === tabId ? 'primary' : 'ghost'} onClick={() => setActiveTab(tabId)} size="sm" className="flex-1">{text}</Button>
  );


  return (
    <div className="flex flex-col h-full">
      {/* <TopBar /> Removed */}
      <div className="p-4 flex-grow"> {/* Standardized to p-4 */}
        <h1 className="text-2xl font-bold text-yellow-400 mb-4 text-center">任務中心</h1>

        <div className="flex space-x-1 mb-4">
            <TabButton tabId={TaskType.DAILY} text="每日任務" />
            <TabButton tabId={TaskType.WEEKLY} text="每週任務" />
            <TabButton tabId={TaskType.ACHIEVEMENT} text="成就獎勵" />
        </div>

        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {tasksToDisplay().map(task => {
            const progress = getTaskProgress(task);
            const isClaimed = gameState.completedTasks.includes(task.id);
            const canClaim = progress.current >= progress.target && !isClaimed;

            return (
              <div key={task.id} className={`p-3 rounded-md ${canClaim ? 'bg-green-700 bg-opacity-30 border border-green-500 animate-pulse' : (isClaimed ? 'bg-gray-700 opacity-60' : 'bg-gray-600')}`}>
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-semibold text-lg text-orange-300">{task.emoji} {task.description}</h3>
                        <p className="text-xs text-gray-300">進度: {progress.current.toLocaleString()} / {progress.target.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">獎勵: {Object.entries(task.rewards).map(([key, val]) => `${CURRENCY_EMOJIS[key as Currency] || ''} ${CURRENCY_NAMES[key as Currency] || key} x${(val as number).toLocaleString()}`).join(', ')}</p>
                    </div>
                    <Button
                        size="sm"
                        variant={isClaimed ? "secondary" : "primary"}
                        onClick={() => claimTaskReward(task.id)}
                        disabled={!canClaim || isClaimed}
                    >
                        {isClaimed ? "已領取" : (canClaim ? "領取" : "未完成")}
                    </Button>
                </div>
              </div>
            );
          })}
           {tasksToDisplay().length === 0 && activeTab === TaskType.ACHIEVEMENT && (
            <p className="text-center text-gray-400 mt-8">所有成就已完成！太棒了！</p>
          )}
          {tasksToDisplay().length === 0 && (activeTab === TaskType.DAILY || activeTab === TaskType.WEEKLY) && (
            <p className="text-center text-gray-400 mt-8">目前沒有可顯示的任務。</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskScreen;
