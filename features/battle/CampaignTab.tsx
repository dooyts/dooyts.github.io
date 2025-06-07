
import React from 'react';
import { Stage, Currency } from '../../types';
import Button from '../../components/Button';
import RedDot from '../../components/RedDot';
import { GAME_STAGES, BATTLE_COST_STAMINA } from '../../constants/gameplayConstants';
import { CURRENCY_EMOJIS, CURRENCY_NAMES } from '../../constants/uiConstants';
import { useGame } from '../../contexts/GameContext'; // Import useGame

interface CampaignTabProps {
  selectedStage: Stage | null;
  setSelectedStage: (stage: Stage | null) => void;
  handleCampaignBattle: () => void;
  teamPower: number;
  battleResultModalOpen: boolean;
  currentPage: number;
  setCurrentPage: (page: number | ((prevPage: number) => number)) => void;
}

const CampaignTab: React.FC<CampaignTabProps> = ({
  selectedStage,
  setSelectedStage,
  handleCampaignBattle,
  teamPower,
  battleResultModalOpen,
  currentPage,
  setCurrentPage,
}) => {
  const { isStageCompleted, getNextStage, checkRedDot, canAfford, getBattleTeam } = useGame();
  const currentNextStage = getNextStage();
  const stagesPerPage = 5;
  const totalPages = Math.ceil(GAME_STAGES.length / stagesPerPage);
  const displayedStages = GAME_STAGES.slice((currentPage - 1) * stagesPerPage, currentPage * stagesPerPage);

  return (
    <>
      <h2 className="text-lg md:text-xl font-semibold text-orange-400 mb-2">選擇關卡:</h2>
      <div className="grid grid-cols-1 gap-2 max-h-48 md:max-h-60 overflow-y-auto pr-2 bg-gray-800 p-2 rounded-md mb-2">
        {displayedStages.map(stage => (
          <Button
            key={stage.id}
            onClick={() => setSelectedStage(stage)}
            variant={selectedStage?.id === stage.id ? 'special' : isStageCompleted(stage.id) ? 'secondary' : 'primary'}
            className={`w-full justify-between items-center relative ${isStageCompleted(stage.id) ? 'opacity-70' : ''}`}
          >
            <div className="text-left">
              <span className="font-semibold text-sm md:text-base">{stage.name}</span>
              <p className="text-xs opacity-80">推薦戰力: {stage.recommendedPower.toLocaleString()}</p>
            </div>
            {isStageCompleted(stage.id) && <span className="text-xs text-green-400">已通關</span>}
            {currentNextStage?.id === stage.id && checkRedDot('stage_progress') && <RedDot className="!top-1 !right-1"/>}
          </Button>
        ))}
      </div>
      <div className="flex justify-between items-center text-xs md:text-sm">
        <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} size="sm">上一頁</Button>
        <span className="text-gray-400">第 {currentPage} / {totalPages} 頁</span>
        <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} size="sm">下一頁</Button>
      </div>

      {selectedStage && (
      <div className="mt-3 md:mt-4 p-3 md:p-4 bg-gray-700 rounded-lg shadow-lg">
        <h3 className="text-md md:text-lg font-semibold text-yellow-300">{selectedStage.name}</h3>
        <p className="text-xs md:text-sm text-gray-400">推薦戰力: <span className={teamPower >= selectedStage.recommendedPower ? "text-green-400" : "text-red-400"}>{selectedStage.recommendedPower.toLocaleString()}</span></p>
        <p className="text-xs md:text-sm text-gray-400">體力消耗: {BATTLE_COST_STAMINA}</p>
        <p className="text-xs md:text-sm text-gray-400">獎勵: {CURRENCY_EMOJIS[Currency.GOLD]} {CURRENCY_NAMES.GOLD} {selectedStage.rewards[Currency.GOLD]}, {CURRENCY_EMOJIS[Currency.EXP_POTION]} {CURRENCY_NAMES.EXP_POTION} {selectedStage.rewards[Currency.EXP_POTION]}</p>
        {selectedStage.rewards.firstClearDiamonds && !isStageCompleted(selectedStage.id) && <p className="text-xs md:text-sm text-cyan-400">首次通關獎勵: {selectedStage.rewards.firstClearDiamonds} {CURRENCY_EMOJIS[Currency.DIAMONDS]} {CURRENCY_NAMES.DIAMONDS}</p>}
        <Button onClick={handleCampaignBattle} variant="special" size="lg" className="w-full mt-3 md:mt-4 animate-pulse" disabled={!canAfford(Currency.STAMINA, BATTLE_COST_STAMINA) || battleResultModalOpen || getBattleTeam().length === 0}>
            {getBattleTeam().length === 0 ? "隊伍中無英雄" : (canAfford(Currency.STAMINA, BATTLE_COST_STAMINA) ? '開始戰鬥!' : `${CURRENCY_NAMES.STAMINA}不足`)}
        </Button>
        {teamPower < selectedStage.recommendedPower && <p className="text-center text-red-400 mt-2 text-xs">戰力不足！考慮強化英雄或前往商城！</p>}
      </div>
      )}
      {!selectedStage && currentNextStage && <Button onClick={() => setSelectedStage(currentNextStage)} variant="primary" size="lg" className="w-full mt-4">前往下一關卡: {currentNextStage.name}</Button>}
      {!selectedStage && !currentNextStage && <p className="text-center text-xl text-green-400 mt-8">所有主線關卡已通關！恭喜！</p>}
    </>
  );
};

export default CampaignTab;
