
import React from 'react';
import { useGame } from '../../contexts/GameContext';
import { ArenaLeaderboardEntry, Currency } from '../../types';
import Button from '../../components/Button';
import VipBadge from './VipBadge'; // Assuming VipBadge is in the same directory or adjust path
import { ARENA_DAILY_ATTEMPTS, ARENA_BATTLE_COST_STAMINA } from '../../constants/gameplayConstants';
import { CURRENCY_EMOJIS, CURRENCY_NAMES } from '../../constants/uiConstants';

interface ArenaTabProps {
  handleArenaBattle: () => void;
  battleResultModalOpen: boolean;
  arenaView: 'myRank' | 'top50';
  setArenaView: React.Dispatch<React.SetStateAction<'myRank' | 'top50'>>;
  setViewingArenaTeamEntry: (entry: ArenaLeaderboardEntry | null) => void;
}

const ArenaTab: React.FC<ArenaTabProps> = ({
  handleArenaBattle,
  battleResultModalOpen,
  arenaView,
  setArenaView,
  setViewingArenaTeamEntry,
}) => {
  const { gameState, canAfford, getBattleTeam, getArenaLeaderboard } = useGame();
  const arenaLeaderboard = getArenaLeaderboard();
  const playerArenaEntry = arenaLeaderboard.find(e => e.playerId === 'player');

  let arenaMyRankDisplay: ArenaLeaderboardEntry[] = [];
  if (playerArenaEntry) {
    const playerRank = playerArenaEntry.rank;
    const lowerBound = Math.max(1, playerRank - 10);
    const upperBound = playerRank + 10;

    arenaMyRankDisplay = arenaLeaderboard
        .filter(entry => (entry.rank >= lowerBound && entry.rank <= upperBound) || entry.playerId === 'player')
        .sort((a,b) => a.rank - b.rank)
        .filter((entry, index, self) => index === self.findIndex((t) => t.playerId === entry.playerId && t.rank === entry.rank)) 
        .slice(0, 21); 
  } else { 
    arenaMyRankDisplay = arenaLeaderboard.filter(e => e.rank <= 10).sort((a,b) => a.rank - b.rank).slice(0,10);
  }

  const top50ArenaForDisplay = arenaLeaderboard.filter(e => e.rank <= 50).sort((a,b)=>a.rank - b.rank);

  const getRankBorderClass = (rank: number): string => {
    if (rank === 1) return 'border-yellow-400 ring-2 ring-yellow-500 shadow-lg shadow-yellow-500/70';
    if (rank === 2) return 'border-gray-300 ring-2 ring-gray-400 shadow-lg shadow-gray-400/60';
    if (rank === 3) return 'border-yellow-600 ring-2 ring-yellow-700 shadow-lg shadow-yellow-700/50'; 
    return 'border-gray-700';
  };

  return (
    <div className="mt-4 p-3 md:p-4 bg-gray-700 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg md:text-xl font-semibold text-purple-400">競技場</h2>
          <Button onClick={() => setArenaView(prev => prev === 'myRank' ? 'top50' : 'myRank')} variant="ghost" size="sm">
              {arenaView === 'myRank' ? "查看Top 50排行" : "返回我的排名"}
          </Button>
      </div>

      {arenaView === 'myRank' && playerArenaEntry && (
          <div className="text-center">
              <p className="text-gray-300 text-sm md:text-base mb-1">
                  你的排名: <span className="font-bold text-yellow-300">{playerArenaEntry.rank.toLocaleString()}</span>
                  (<VipBadge level={playerArenaEntry.vipLevel} small />戰力: {playerArenaEntry.combatPower.toLocaleString()})
              </p>
              <p className="text-gray-300 text-sm md:text-base mb-3">剩餘挑戰次數: <span className="font-bold text-yellow-300">{gameState.dailyArenaAttempts} / {ARENA_DAILY_ATTEMPTS}</span></p>
              <Button onClick={handleArenaBattle} variant="special" size="lg" className="w-full md:w-2/3 mx-auto" disabled={gameState.dailyArenaAttempts <= 0 || !canAfford(Currency.STAMINA, ARENA_BATTLE_COST_STAMINA) || battleResultModalOpen || getBattleTeam().length === 0 || gameState.isProcessingArenaAction}>
                  {gameState.isProcessingArenaAction ? "處理中..." : (getBattleTeam().length === 0 ? "隊伍中無英雄" : (gameState.dailyArenaAttempts > 0 ? (canAfford(Currency.STAMINA, ARENA_BATTLE_COST_STAMINA) ? "挑戰對手!" : "體力不足") : "次數已用盡"))}
              </Button>
              <p className="text-xs text-gray-400 mt-2 text-center">戰勝對手提升排名，獲取{CURRENCY_EMOJIS[Currency.ARENA_COIN]} {CURRENCY_NAMES.ARENA_COIN}！</p>
          </div>
      )}

      {arenaView === 'myRank' && (
          <div className="mt-6">
              <h3 className="text-md font-semibold text-yellow-300 mb-2 text-center">競技場排行榜 (我的排名附近)</h3>
              <div className="max-h-72 overflow-y-auto bg-gray-800 p-2 rounded-md space-y-1 text-xs">
                  {arenaMyRankDisplay.length === 0 && <p className="text-gray-400 text-center">暫無排名數據</p>}
                  {arenaMyRankDisplay.map((entry) => (
                      <div 
                          key={entry.playerId} 
                          onClick={() => {if(entry.playerId !== 'player' && entry.teamPreview) setViewingArenaTeamEntry(entry)}}
                          className={`flex justify-between items-center p-1.5 rounded ${entry.playerId === 'player' ? 'bg-yellow-600 bg-opacity-40 border-yellow-500' : (entry.teamPreview ? 'bg-gray-700 hover:bg-gray-600 cursor-pointer' : 'bg-gray-700')} ${getRankBorderClass(entry.rank)}`}
                      >
                      <div className="flex-1 truncate">
                          {entry.rank}. <VipBadge level={entry.vipLevel} small />{entry.playerName}
                      </div>
                      <span className="font-semibold text-orange-300 ml-2">{entry.combatPower.toLocaleString()}</span>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {arenaView === 'top50' && (
           <div className="mt-4">
              <h3 className="text-md font-semibold text-yellow-300 mb-2 text-center">競技場 Top 50 排行榜</h3>
              <div className="max-h-[60vh] overflow-y-auto bg-gray-800 p-2 rounded-md space-y-1 text-xs">
                  {top50ArenaForDisplay.length === 0 && <p className="text-gray-400 text-center">暫無排名數據</p>}
                  {top50ArenaForDisplay.map((entry) => (
                       <div 
                          key={entry.playerId} 
                          onClick={() => {if(entry.teamPreview) setViewingArenaTeamEntry(entry)}}
                          className={`flex justify-between items-center p-1.5 rounded ${entry.teamPreview ? 'bg-gray-700 hover:bg-gray-600 cursor-pointer' : 'bg-gray-700'} ${getRankBorderClass(entry.rank)}`}
                      >
                      <div className="flex-1 truncate">
                          {entry.rank}. <VipBadge level={entry.vipLevel} small />{entry.playerName}
                      </div>
                      <span className="font-semibold text-orange-300 ml-2">{entry.combatPower.toLocaleString()}</span>
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};

export default ArenaTab;
