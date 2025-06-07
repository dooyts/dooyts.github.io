
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGame, RedDotType } from '../../contexts/GameContext'; 
import { Stage, Currency, Dungeon, WorldBossInfo, ArenaLeaderboardEntry, ElementType, Character as BaseCharacterType, CharacterRarity, ArenaHeroPreview } from '../../types';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
// import TopBar from '../lobby/TopBar'; // Removed
import RedDot from '../../components/RedDot';
import { useNavigate, useLocation } from 'react-router-dom';

import CampaignTab from './CampaignTab';
import DungeonTab from './DungeonTab';
import ArenaTab from './ArenaTab';
import WorldBossSection from './WorldBossSection';
import ArenaTeamViewModal from './ArenaTeamViewModal';

import { GAME_STAGES, BATTLE_COST_STAMINA, DUNGEONS_DEFINITIONS, ARENA_DAILY_ATTEMPTS, ENDLESS_TOWER_FLOOR_COST_STAMINA, VIP_LEVELS, WORLD_BOSS_ATTACK_COST, MAX_WORLD_BOSS_ATTACKS_PER_CYCLE, ELEMENT_ADVANTAGE, ARENA_MAX_RANK, ARENA_TOKENS_PER_LOSS, ARENA_TOKENS_PER_WIN, ARENA_BATTLE_COST_STAMINA, ULTIMATE_CHALLENGE_STAMINA_COST } from '../../constants/gameplayConstants'; 
import { CURRENCY_NAMES, CURRENCY_EMOJIS, ELEMENT_COLORS, RARITY_COLORS } from '../../constants/uiConstants';
import { BASE_CHARACTERS, BASE_SKILLS_DATA } from '../../constants/characterConstants';


const BattleScreen: React.FC = () => {
  const { 
    gameState, calculateTeamPower, startBattle, startDungeonBattle, startArenaBattle, getArenaLeaderboard,
    startEndlessTowerFloorBattle, isStageCompleted, getNextStage, canAfford, 
    checkRedDot, getBattleLog, clearBattleLog, getBattleTeam, finishArenaAction,
    startUltimateChallengeBattle // Added
  } = useGame();

  const location = useLocation();
  const routeState = location.state as { initialTab?: string } | undefined;
  
  const validTabs: Array<'campaign' | 'dungeon' | 'arena' | 'world_boss'> = ['campaign', 'dungeon', 'arena', 'world_boss'];
  const getInitialTab = (): 'campaign' | 'dungeon' | 'arena' | 'world_boss' => {
    const tabFromState = routeState?.initialTab;
    if (tabFromState && validTabs.includes(tabFromState as any)) {
        return tabFromState as 'campaign' | 'dungeon' | 'arena' | 'world_boss';
    }
    return 'campaign';
  };


  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [battleResultModalOpen, setBattleResultModalOpen] = useState<boolean>(false);
  const [battleOutcome, setBattleOutcome] = useState<{message?: string, rewards?: Partial<Record<Currency, number>>, rankChange?: number, success?: boolean, battleLog?: string[], nextFloor?: number | null, totalPlayerDamageDealt?: number} | null>(null); 
  const [activeTab, setActiveTab] = useState<'campaign' | 'dungeon' | 'arena' | 'world_boss'>(getInitialTab());
  const battleLogRef = useRef<HTMLDivElement>(null);
  const [selectedDungeonIdForModal, setSelectedDungeonIdForModal] = useState<string | null>(null);
  const [isUltimateChallengeBattle, setIsUltimateChallengeBattle] = useState<boolean>(false);
  const [viewingArenaTeamEntry, setViewingArenaTeamEntry] = useState<ArenaLeaderboardEntry | null>(null);
  const [arenaView, setArenaView] = useState<'myRank' | 'top50'>('myRank');


  const teamPower = calculateTeamPower(); 
  const navigate = useNavigate();

  const currentNextStage = getNextStage();
  const [currentPage, setCurrentPage] = useState(1); 

  useEffect(() => {
    if (activeTab === 'campaign' && !selectedStage && currentNextStage) {
      setSelectedStage(currentNextStage);
    }
  }, [currentNextStage, selectedStage, activeTab]);

  useEffect(() => {
    if (battleResultModalOpen && battleLogRef.current) { 
      battleLogRef.current.scrollTop = battleLogRef.current.scrollHeight;
    }
  }, [battleOutcome?.battleLog, battleResultModalOpen]); 

  const performBattle = useCallback((battleFn: () => any, dungeonIdForModal?: string, isArena?: boolean, isUltimate?: boolean) => {
    const currentBattleTeam = getBattleTeam();
    if (currentBattleTeam.length === 0) {
        setBattleOutcome({ success: false, message: "隊伍中沒有英雄！請先指派英雄到戰隊。", battleLog: ["<span class='text-red-400'>戰鬥失敗：隊伍為空。</span>"] });
        if (isArena) finishArenaAction(); 
        setBattleResultModalOpen(true);
        return;
    }
    clearBattleLog(); 
    const result = battleFn(); 
    setBattleOutcome(result); 
    setSelectedDungeonIdForModal(dungeonIdForModal || null);
    setIsUltimateChallengeBattle(isUltimate || false);
    setBattleResultModalOpen(true);
  }, [clearBattleLog, getBattleTeam, finishArenaAction]);


  const handleCampaignBattle = () => {
    if (!selectedStage) return;
    if (!canAfford(Currency.STAMINA, BATTLE_COST_STAMINA)) {
        performBattle(() => ({ success: false, message: "體力不足！", battleLog: ["<span class='text-red-400'>戰鬥失敗：體力不足。</span>"] }));
        return;
    }
    performBattle(() => startBattle(selectedStage.id));
  };
  
  const handleDungeonBattle = (dungeonId: string) => {
    const dungeon = DUNGEONS_DEFINITIONS.find(d => d.id === dungeonId);
    if (!dungeon) return;

    if (dungeon.isEndlessTower) {
        performBattle(() => startEndlessTowerFloorBattle(gameState.currentEndlessTowerRun?.currentFloor || 1), dungeonId);
        return;
    }

     if ((gameState.dailyDungeonAttempts[dungeon.id] || 0) <= 0) {
        performBattle(() => ({ success: false, message: "今日挑戰次數已用盡！", battleLog: ["<span class='text-red-400'>挑戰失敗：次數不足。</span>"] }), dungeonId);
        return;
    }
    for (const cost of dungeon.cost) {
        if (!canAfford(cost.currency, cost.amount)) {
            performBattle(() => ({ success: false, message: `${CURRENCY_NAMES[cost.currency]}不足！`, battleLog: [`<span class='text-red-400'>挑戰失敗：${CURRENCY_NAMES[cost.currency]}不足。</span>`] }), dungeonId);
            return;
        }
    }
    performBattle(() => startDungeonBattle(dungeonId), dungeonId);
  };

  const handleArenaBattle = () => {
    if (gameState.dailyArenaAttempts <= 0) {
        performBattle(() => ({ success: false, message: "今日競技場挑戰次數已用盡！", battleLog: ["<span class='text-red-400'>挑戰失敗：次數不足。</span>"] }), undefined, true);
        return;
    }
    if (!canAfford(Currency.STAMINA, ARENA_BATTLE_COST_STAMINA)) {
         performBattle(() => ({ success: false, message: "體力不足！", battleLog: ["<span class='text-red-400'>挑戰失敗：體力不足。</span>"] }), undefined, true);
        return;
    }
    performBattle(startArenaBattle, undefined, true);
  };

  const handleUltimateChallengeBattle = () => {
    if (!canAfford(Currency.STAMINA, ULTIMATE_CHALLENGE_STAMINA_COST)) {
      performBattle(() => ({ success: false, message: "體力不足！", battleLog: ["<span class='text-red-400'>終極試煉失敗：體力不足。</span>"] }), undefined, false, true);
      return;
    }
    performBattle(startUltimateChallengeBattle, undefined, false, true);
  };


  const closeModal = () => {
    const wasSuccessful = battleOutcome?.success;
    const nextFloorForET = battleOutcome?.nextFloor;
    const isETBattle = selectedDungeonIdForModal === 'endless_tower';
    const wasArenaBattle = activeTab === 'arena' && (battleOutcome?.rankChange !== undefined || battleOutcome?.message?.includes("競技場"));


    setBattleResultModalOpen(false);
    setBattleOutcome(null); 
    setSelectedDungeonIdForModal(null);
    setIsUltimateChallengeBattle(false);
    
    if (wasArenaBattle) {
        finishArenaAction(); 
    }
    
    if (activeTab === 'campaign' && wasSuccessful) { 
        const next = getNextStage();
        if(next) {
          setSelectedStage(next);
          clearBattleLog(); 
        } else {
          setSelectedStage(null); 
        }
    } else if (isETBattle && wasSuccessful && nextFloorForET) {
        clearBattleLog();
    } 
  };

  useEffect(() => {
    if (activeTab === 'campaign' && currentNextStage) {
      const nextStageIndex = GAME_STAGES.findIndex(s => s.id === currentNextStage.id);
      if (nextStageIndex !== -1) {
        const newPage = Math.floor(nextStageIndex / GAME_STAGES.length * (Math.ceil(GAME_STAGES.length / 5))) +1;
        if (currentPage !== newPage) setCurrentPage(newPage);
        if (!selectedStage) setSelectedStage(currentNextStage); 
      }
    }
  }, [currentNextStage, activeTab, selectedStage, currentPage]);


  const TabButton: React.FC<{tabId: typeof activeTab, text: string, redDotKey?: RedDotType}> = ({tabId, text, redDotKey}) => (
    <Button
        variant={activeTab === tabId ? 'primary' : 'ghost'}
        onClick={() => { setActiveTab(tabId); setSelectedStage(null); clearBattleLog(); if (tabId === 'arena') setArenaView('myRank'); }}
        size="md"
        className="flex-1 relative text-xs sm:text-sm"
    >
        {text}
        {redDotKey && checkRedDot(redDotKey) && <RedDot className="!top-0 !right-0" />}
    </Button>
  );

  const formatRewardKey = (key: string): string => {
    if (key in CURRENCY_NAMES) return CURRENCY_NAMES[key as Currency];
    if (key.endsWith(' (首通)')) return `${CURRENCY_NAMES.DIAMONDS} (首通)`;
    if (key.includes('(') && key.includes(')')) { 
        const namePart = key.substring(0, key.lastIndexOf(' ('));
        const rarityPart = key.substring(key.lastIndexOf(' ('));
        return `${namePart} ${rarityPart}`;
    }
    return key;
  }

  return (
    <div className="flex flex-col h-full">
      {/* <TopBar/> Removed */}
      <div className="p-4 flex-grow"> {/* Standardized to p-4 */}
        <h1 className="text-xl md:text-2xl font-bold text-yellow-400 mb-2 text-center">戰鬥中心</h1>
        <p className="text-center text-gray-300 mb-2 md:mb-4 text-sm md:text-base">我方隊伍戰力: <span className="text-green-400 font-semibold">{teamPower.toLocaleString()}</span></p>

        <div className="flex space-x-1 mb-4">
            <TabButton tabId="campaign" text="主線戰役" redDotKey="stage_progress" />
            <TabButton tabId="dungeon" text="每日副本" redDotKey="dungeon_available" />
            <TabButton tabId="arena" text="競技場" redDotKey="arena_available" />
            <TabButton tabId="world_boss" text="世界王" redDotKey="world_boss_available" />
        </div>

        {activeTab === 'campaign' && (
          <CampaignTab
            selectedStage={selectedStage}
            setSelectedStage={setSelectedStage}
            handleCampaignBattle={handleCampaignBattle}
            teamPower={teamPower}
            battleResultModalOpen={battleResultModalOpen}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
        )}

        {activeTab === 'dungeon' && (
          <DungeonTab
            handleDungeonBattle={handleDungeonBattle}
            battleResultModalOpen={battleResultModalOpen}
            handleUltimateChallengeBattle={handleUltimateChallengeBattle} // Pass down
          />
        )}

        {activeTab === 'arena' && (
          <ArenaTab
            handleArenaBattle={handleArenaBattle}
            battleResultModalOpen={battleResultModalOpen}
            arenaView={arenaView}
            setArenaView={setArenaView}
            setViewingArenaTeamEntry={setViewingArenaTeamEntry}
          />
        )}
        
        {activeTab === 'world_boss' && <WorldBossSection />}
        
        <ArenaTeamViewModal isOpen={!!viewingArenaTeamEntry} onClose={() => setViewingArenaTeamEntry(null)} entry={viewingArenaTeamEntry} />
      </div>

      {battleResultModalOpen && battleOutcome && (
        <Modal isOpen={battleResultModalOpen} onClose={closeModal} title={battleOutcome.success ? (isUltimateChallengeBattle ? "試煉勝利!" : "戰鬥勝利!") : (battleOutcome.message && battleOutcome.message.includes("止步於") ? battleOutcome.message : (battleOutcome.message || (isUltimateChallengeBattle ? "試煉失敗..." : "戰鬥失敗...")))} size="lg">
          <div 
            ref={battleLogRef}
            className="mb-4 text-sm text-left max-h-60 overflow-y-auto bg-gray-800 p-2 rounded-md border border-gray-600"
          >
            <h4 className="font-semibold text-yellow-300 mb-2">戰鬥記錄:</h4>
            {(battleOutcome.battleLog || getBattleLog()).map((log, index) => (
              <p key={index} className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: log }}></p>
            ))}
          </div>
          
          {selectedDungeonIdForModal && selectedDungeonIdForModal !== 'endless_tower' && !isUltimateChallengeBattle && battleOutcome.totalPlayerDamageDealt !== undefined && (
            <p className="text-center text-green-400 font-semibold mb-2">本次造成傷害: {battleOutcome.totalPlayerDamageDealt.toLocaleString()}</p>
          )}
          {isUltimateChallengeBattle && battleOutcome.success && (
            <p className="text-center text-green-400 font-semibold mb-2">隱藏強者試煉成功！他們的等級提升了！</p>
          )}
           {isUltimateChallengeBattle && !battleOutcome.success && (
            <p className="text-center text-red-400 font-semibold mb-2">隱藏強者試煉失敗。再接再厲！</p>
          )}


          {battleOutcome.rewards && Object.keys(battleOutcome.rewards).length > 0 && (
            <div className="mb-4 text-sm text-left">
              <h4 className="font-semibold text-yellow-300">獲得獎勵:</h4>
              {Object.entries(battleOutcome.rewards).map(([key, value]) => (
                <p key={key} className="capitalize text-gray-300">
                   {CURRENCY_EMOJIS[key as Currency] || ''} {formatRewardKey(key)}: {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
              ))}
            </div>
          )}
          {battleOutcome.rankChange !== undefined && activeTab === 'arena' && <p className="text-sm text-center text-yellow-300 mb-2">競技場排名變化: {battleOutcome.rankChange > 0 ? `+${battleOutcome.rankChange}` : battleOutcome.rankChange} (新排名: {gameState.arenaRank})</p>}
          {!battleOutcome.success && activeTab === 'campaign' && (
            <Button onClick={() => { closeModal(); navigate('/shop'); }} variant="special" className="w-full mb-2">
              前往商城變強！
            </Button>
          )}
          <Button onClick={closeModal} variant="primary" className="w-full">
            確定
          </Button>
        </Modal>
      )}
    </div>
  );
};

export default BattleScreen;
