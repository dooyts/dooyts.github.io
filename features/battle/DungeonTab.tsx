
import React from 'react';
import { useGame } from '../../contexts/GameContext';
import { Currency } from '../../types';
import Button from '../../components/Button';
import RedDot from '../../components/RedDot';
import { 
    DUNGEONS_DEFINITIONS, 
    ENDLESS_TOWER_FLOOR_COST_STAMINA, 
    ULTIMATE_CHALLENGE_STAMINA_COST, 
    GAME_STAGES,
    ULTIMATE_CHALLENGE_LEVEL_INCREMENT, // Import this
    ULTIMATE_CHALLENGE_MAX_LEVEL // Import this
} from '../../constants/gameplayConstants';

interface DungeonTabProps {
  handleDungeonBattle: (dungeonId: string) => void;
  battleResultModalOpen: boolean;
  handleUltimateChallengeBattle: () => void; // New prop
}

const DungeonTab: React.FC<DungeonTabProps> = ({
  handleDungeonBattle,
  battleResultModalOpen,
  handleUltimateChallengeBattle, // New prop
}) => {
  const { gameState, canAfford, checkRedDot, getBattleTeam } = useGame();
  const allCampaignStagesCompleted = GAME_STAGES.every(stage => gameState.completedStages.includes(stage.id));
  const canAttemptUltimateChallenge = allCampaignStagesCompleted && 
                                     !gameState.ultimateChallengeMaxLevelReached && 
                                     canAfford(Currency.STAMINA, ULTIMATE_CHALLENGE_STAMINA_COST) &&
                                     getBattleTeam().length > 0;

  const nextChallengeLevelDisplay = Math.min(ULTIMATE_CHALLENGE_MAX_LEVEL, gameState.ultimateChallengeCurrentLevel + ULTIMATE_CHALLENGE_LEVEL_INCREMENT);

  return (
    <div className="mt-4 p-3 md:p-4 bg-gray-700 rounded-lg shadow-lg">
      <h2 className="text-lg md:text-xl font-semibold text-teal-400 mb-3 text-center">每日副本</h2>
      <div className="grid grid-cols-2 gap-2 md:gap-3">
        {DUNGEONS_DEFINITIONS.map(dungeon => {
            const attemptsLeft = gameState.dailyDungeonAttempts[dungeon.id] || 0;
            let canRun = false;
            let buttonText = dungeon.name;
            let hasRedDotForThisDungeon = false;

            if (dungeon.isEndlessTower) {
                const etRun = gameState.currentEndlessTowerRun;
                const canStartNewRun = attemptsLeft > 0 && (!etRun || !etRun.isActive);
                const canContinueRun = etRun?.isActive && canAfford(Currency.STAMINA, ENDLESS_TOWER_FLOOR_COST_STAMINA);
                canRun = canStartNewRun || canContinueRun;
                buttonText = etRun?.isActive ? `無盡之塔 (樓層 ${etRun.currentFloor})` : `無盡之塔 (最高 ${gameState.endlessTowerMaxFloor})`;
                if (canRun && getBattleTeam().length > 0) hasRedDotForThisDungeon = checkRedDot('endless_tower_attempt'); 
            } else {
                canRun = attemptsLeft > 0 && dungeon.cost.every(c => canAfford(c.currency, c.amount));
                if (canRun && getBattleTeam().length > 0) hasRedDotForThisDungeon = checkRedDot('dungeon_available');
            }
            
            return (
                <Button
                    key={dungeon.id}
                    variant="ghost"
                    className="flex-col h-auto items-center justify-center p-2 md:p-3 border-teal-500 hover:bg-teal-600 bg-gray-800 disabled:opacity-50 relative" 
                    onClick={() => handleDungeonBattle(dungeon.id)}
                    disabled={!canRun || battleResultModalOpen || getBattleTeam().length === 0}
                >
                    {hasRedDotForThisDungeon && !dungeon.isEndlessTower && <RedDot className="!top-1 !right-1" /> }
                    {dungeon.isEndlessTower && hasRedDotForThisDungeon && <RedDot className="!top-1 !right-1" />}
                    <span className="text-2xl md:text-3xl mb-1">{dungeon.emoji}</span>
                    <span className="text-xs md:text-sm font-medium">{buttonText}</span>
                    {!dungeon.isEndlessTower && <p className="text-xs text-gray-400">剩餘次數: {attemptsLeft}/{dungeon.dailyAttempts}</p>}
                    {dungeon.isEndlessTower && <p className="text-xs text-gray-400">今日剩餘新挑戰: {attemptsLeft}</p>}
                    {!canRun && attemptsLeft > 0 && !dungeon.isEndlessTower && getBattleTeam().length > 0 && <p className="text-xs text-red-400">資源不足</p>}
                    {dungeon.isEndlessTower && gameState.currentEndlessTowerRun?.isActive && !canAfford(Currency.STAMINA, ENDLESS_TOWER_FLOOR_COST_STAMINA) && getBattleTeam().length > 0 && <p className="text-xs text-red-400">體力不足</p>}
                    {getBattleTeam().length === 0 && <p className="text-xs text-red-400">隊伍為空</p>}
                </Button>
            );
        })}
      </div>
      {allCampaignStagesCompleted && (
        <div className="mt-6 pt-4 border-t border-gray-600">
            <h3 className="text-lg md:text-xl font-semibold text-red-500 mb-2 text-center">終極試煉</h3>
            <Button
                variant="special"
                className="w-full flex-col h-auto items-center justify-center p-3 md:p-4 !from-red-600 !to-purple-700 hover:!from-red-700 hover:!to-purple-800 relative"
                onClick={handleUltimateChallengeBattle}
                disabled={!canAttemptUltimateChallenge || battleResultModalOpen}
            >
                {checkRedDot('ultimate_challenge_available') && <RedDot className="!top-1 !right-1" />}
                <span className="text-3xl md:text-4xl mb-1">💀</span>
                <span className="text-sm md:text-base font-medium">
                    {gameState.ultimateChallengeMaxLevelReached ? `挑戰極限 (Lv.${gameState.ultimateChallengeCurrentLevel})` : `挑戰隱藏強者 (Lv.${gameState.ultimateChallengeCurrentLevel})`}
                </span>
                <p className="text-xs text-gray-300 mt-1">
                    {gameState.ultimateChallengeMaxLevelReached ? "已達最高等級，仍可重複挑戰！" : `下一級: Lv.${nextChallengeLevelDisplay}`}
                </p>
                {!canAttemptUltimateChallenge && getBattleTeam().length > 0 && (
                    <p className="text-xs text-red-400 mt-1">
                        {gameState.ultimateChallengeMaxLevelReached ? "" : (!canAfford(Currency.STAMINA, ULTIMATE_CHALLENGE_STAMINA_COST) ? "體力不足" : "條件未滿足")}
                    </p>
                )}
                 {getBattleTeam().length === 0 && <p className="text-xs text-red-400 mt-1">隊伍為空</p>}
            </Button>
        </div>
      )}
    </div>
  );
};

export default DungeonTab;
