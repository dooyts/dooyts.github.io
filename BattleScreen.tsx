
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGame, RedDotType } from '../../contexts/GameContext'; 
import { Stage, Currency, Dungeon, WorldBossInfo, WorldBossLeaderboardEntry, VIPLevel, ArenaLeaderboardEntry } from '../../types';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import TopBar from '../lobby/TopBar';
import { GAME_STAGES, BATTLE_COST_STAMINA, DUNGEONS_DEFINITIONS, ARENA_DAILY_ATTEMPTS, ENDLESS_TOWER_FLOOR_COST_STAMINA, VIP_LEVELS, WORLD_BOSS_ATTACK_COST, MAX_WORLD_BOSS_ATTACKS_PER_CYCLE, ELEMENT_ADVANTAGE, ARENA_MAX_RANK, ARENA_TOKENS_PER_LOSS, ARENA_TOKENS_PER_WIN, ARENA_BATTLE_COST_STAMINA } from '../../constants/gameplayConstants'; 
import { CURRENCY_NAMES, CURRENCY_EMOJIS } from '../../constants/uiConstants';
import { BASE_CHARACTERS, BASE_SKILLS_DATA } from '../../constants/characterConstants';
import { useNavigate, useLocation } from 'react-router-dom';
import RedDot from '../../components/RedDot';


const VipBadge: React.FC<{ level: number, small?: boolean }> = ({ level, small }) => {
    if (level === 0) return null;

    let vipColor = 'text-green-400 border-green-500';
    let vipShine = '';
    let fontWeight = 'font-semibold';

    if (level >= 15) {
        vipColor = 'text-red-400 border-red-500';
        vipShine = 'animate-pulse'; // Consider a faster/more intense pulse via custom CSS if needed
        fontWeight = 'font-black';
    } else if (level >= 12) {
        vipColor = 'text-yellow-400 border-yellow-500';
        vipShine = 'animate-pulse';
        fontWeight = 'font-bold';
    } else if (level >= 9) {
        vipColor = 'text-purple-400 border-purple-500';
        vipShine = 'animate-pulse animation-duration-slow'; // Custom class if you define it
    } else if (level >= 6) {
        vipColor = 'text-blue-400 border-blue-500';
    }

    const textSize = small ? 'text-[9px]' : 'text-xs';
    const padding = small ? 'px-0.5' : 'px-1';

    return (
        <span className={`inline-block ${textSize} ${fontWeight} ${vipColor} ${vipShine} border rounded-sm ${padding} mr-1 align-middle`}>
            VIP{level}
        </span>
    );
};

const WorldBossSection: React.FC = () => {
    const { gameState, attackWorldBoss, calculateTeamPower, getWorldBossLeaderboard } = useGame();
    const [wbBattleResultModalOpen, setWbBattleResultModalOpen] = useState<boolean>(false);
    const [wbBattleOutcome, setWbBattleOutcome] = useState<{message?: string, damageDealt?: number, battleLog?: string[], success?: boolean } | null>(null);
    const wbBattleLogRef = useRef<HTMLDivElement>(null);

    const teamPower = calculateTeamPower();

    const handleAttackWorldBoss = () => {
        const result = attackWorldBoss();
        setWbBattleOutcome(result);
        setWbBattleResultModalOpen(true);
    };
    
    useEffect(() => {
        if (wbBattleResultModalOpen && wbBattleLogRef.current) {
            wbBattleLogRef.current.scrollTop = wbBattleLogRef.current.scrollHeight;
        }
    }, [wbBattleOutcome?.battleLog, wbBattleResultModalOpen]);

    if (!gameState.worldBoss) {
        return <p className="text-center text-gray-400 mt-8">世界頭目正在集結力量...</p>;
    }
    const { name, spriteEmoji, currentHp, maxHp, nextRefreshTime, attackCost } = gameState.worldBoss;
    const hpPercentage = (currentHp / maxHp) * 100;
    const timeToRefreshMs = Math.max(0, nextRefreshTime - Date.now());
    const refreshMinutes = Math.floor(timeToRefreshMs / 60000);
    const refreshSeconds = Math.floor((timeToRefreshMs % 60000) / 1000);

    const canAttack = gameState.resources[attackCost.currency] >= attackCost.amount && 
                      gameState.playerWorldBossStats.attacksMadeThisCycle < MAX_WORLD_BOSS_ATTACKS_PER_CYCLE &&
                      currentHp > 0;

    const leaderboard = getWorldBossLeaderboard();

    return (
        <div className="mt-4 p-3 md:p-4 bg-gray-700 rounded-lg shadow-lg">
            <h2 className="text-xl md:text-2xl font-bold text-red-400 mb-3 text-center flex items-center justify-center">
                {spriteEmoji} {name} {spriteEmoji}
            </h2>
            <div className="text-center mb-3">
                <p className="text-lg text-gray-200">剩餘生命: <span className="font-bold text-orange-300">{currentHp.toLocaleString()} / {maxHp.toLocaleString()}</span></p>
                <div className="w-full bg-gray-600 rounded-full h-4 my-1 border border-gray-500">
                    <div className="bg-red-500 h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${hpPercentage}%` }}></div>
                </div>
                <p className="text-xs text-gray-400">下次刷新: {refreshMinutes}分 {refreshSeconds}秒</p>
            </div>

            <div className="text-center mb-4">
                 <p className="text-sm text-gray-300">消耗: {CURRENCY_EMOJIS[attackCost.currency]} {attackCost.amount} {CURRENCY_NAMES[attackCost.currency]}</p>
                 <p className="text-sm text-gray-300">剩餘挑戰次數: {MAX_WORLD_BOSS_ATTACKS_PER_CYCLE - gameState.playerWorldBossStats.attacksMadeThisCycle} / {MAX_WORLD_BOSS_ATTACKS_PER_CYCLE}</p>
                <Button onClick={handleAttackWorldBoss} variant="danger" size="lg" className="w-full md:w-1/2 mx-auto mt-2" disabled={!canAttack || wbBattleResultModalOpen}>
                    {currentHp <= 0 ? "頭目已被擊敗" : (!canAttack ? (gameState.playerWorldBossStats.attacksMadeThisCycle >= MAX_WORLD_BOSS_ATTACKS_PER_CYCLE ? "次數已盡" : `${CURRENCY_NAMES[attackCost.currency]}不足`) : "挑戰頭目!")}
                </Button>
            </div>

            <div className="mt-4">
                <h3 className="text-lg font-semibold text-yellow-300 mb-2">傷害排行榜 (模擬)</h3>
                <div className="max-h-60 overflow-y-auto bg-gray-800 p-2 rounded-md space-y-1 text-xs">
                    {leaderboard.length === 0 && <p className="text-gray-400 text-center">暫無排名數據</p>}
                    {leaderboard.map((entry, index) => (
                        <div key={entry.playerId + index} className={`flex justify-between items-center p-1 rounded ${entry.playerId === 'player' ? 'bg-yellow-600 bg-opacity-30' : 'bg-gray-700'}`}>
                           <span>{index + 1}. <VipBadge level={entry.vipLevel} small />{entry.playerName}</span>
                           <span className="font-semibold text-orange-300">{entry.damageDealt.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>
             {wbBattleResultModalOpen && wbBattleOutcome && (
                <Modal isOpen={wbBattleResultModalOpen} onClose={() => setWbBattleResultModalOpen(false)} title={wbBattleOutcome.success ? "攻擊成功!" : "攻擊訊息"} size="md">
                    <div className="space-y-2">
                        {wbBattleOutcome.message && <p className="text-center text-yellow-300">{wbBattleOutcome.message}</p>}
                        {wbBattleOutcome.damageDealt !== undefined && <p className="text-center text-xl text-green-400">對頭目造成傷害: {wbBattleOutcome.damageDealt.toLocaleString()}!</p>}
                        {wbBattleOutcome.battleLog && wbBattleOutcome.battleLog.length > 0 && (
                            <div ref={wbBattleLogRef} className="text-sm text-left max-h-40 overflow-y-auto bg-gray-800 p-2 rounded-md border border-gray-600">
                                <h4 className="font-semibold text-yellow-300 mb-1">戰鬥簡報:</h4>
                                {wbBattleOutcome.battleLog.map((log, index) => (
                                <p key={index} className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: log }}></p>
                                ))}
                            </div>
                        )}
                         <Button onClick={() => setWbBattleResultModalOpen(false)} variant="primary" className="w-full mt-3">確定</Button>
                    </div>
                </Modal>
            )}
        </div>
    );
};


const BattleScreen: React.FC = () => {
  const { 
    gameState, calculateTeamPower, startBattle, startDungeonBattle, startArenaBattle, 
    startEndlessTowerFloorBattle, isStageCompleted, getNextStage, canAfford, 
    checkRedDot, getBattleLog, clearBattleLog, getBattleTeam
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
  const [battleOutcome, setBattleOutcome] = useState<{message?: string, rewards?: Partial<Record<Currency, number>>, rankChange?: number, success?: boolean, battleLog?: string[], nextFloor?: number | null} | null>(null); 
  const [activeTab, setActiveTab] = useState<'campaign' | 'dungeon' | 'arena' | 'world_boss'>(getInitialTab());
  const battleLogRef = useRef<HTMLDivElement>(null);
  const [selectedDungeonIdForModal, setSelectedDungeonIdForModal] = useState<string | null>(null);


  const teamPower = calculateTeamPower(); 
  const navigate = useNavigate();

  const currentNextStage = getNextStage();

  useEffect(() => {
    if (activeTab === 'campaign' && !selectedStage && currentNextStage) {
      setSelectedStage(currentNextStage);
    }
  }, [currentNextStage, selectedStage, activeTab]);

  useEffect(() => {
    if (battleResultModalOpen && battleLogRef.current) { // Ensure modal is open for ref to exist
      battleLogRef.current.scrollTop = battleLogRef.current.scrollHeight;
    }
  }, [battleOutcome?.battleLog, battleResultModalOpen]); // Add battleResultModalOpen dependency

  const performBattle = useCallback((battleFn: () => any, dungeonIdForModal?: string) => {
    const currentBattleTeam = getBattleTeam();
    if (currentBattleTeam.length === 0) {
        setBattleOutcome({ success: false, message: "隊伍中沒有英雄！請先指派英雄到戰隊。", battleLog: ["<span class='text-red-400'>戰鬥失敗：隊伍為空。</span>"] });
        setBattleResultModalOpen(true);
        return;
    }
    clearBattleLog(); 
    const result = battleFn(); 
    setBattleOutcome(result); 
    setSelectedDungeonIdForModal(dungeonIdForModal || null);
    setBattleResultModalOpen(true);
  }, [clearBattleLog, getBattleTeam]);


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
        const floorToAttempt = gameState.currentEndlessTowerRun?.isActive ? gameState.currentEndlessTowerRun.currentFloor : 1;
        performBattle(() => startEndlessTowerFloorBattle(floorToAttempt), dungeonId);
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
        performBattle(() => ({ success: false, message: "今日競技場挑戰次數已用盡！", battleLog: ["<span class='text-red-400'>挑戰失敗：次數不足。</span>"] }));
        return;
    }
    if (!canAfford(Currency.STAMINA, ARENA_BATTLE_COST_STAMINA)) {
         performBattle(() => ({ success: false, message: "體力不足！", battleLog: ["<span class='text-red-400'>挑戰失敗：體力不足。</span>"] }));
        return;
    }
    performBattle(startArenaBattle);
  };


  const closeModal = () => {
    const wasSuccessful = battleOutcome?.success;
    const nextFloorForET = battleOutcome?.nextFloor;
    const isETBattle = selectedDungeonIdForModal === 'endless_tower';

    setBattleResultModalOpen(false);
    setBattleOutcome(null); 
    setSelectedDungeonIdForModal(null);
    
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

  const stagesPerPage = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(GAME_STAGES.length / stagesPerPage);
  const displayedStages = GAME_STAGES.slice((currentPage - 1) * stagesPerPage, currentPage * stagesPerPage);

  useEffect(() => {
    if (activeTab === 'campaign' && currentNextStage) {
      const nextStageIndex = GAME_STAGES.findIndex(s => s.id === currentNextStage.id);
      if (nextStageIndex !== -1) {
        const newPage = Math.floor(nextStageIndex / stagesPerPage) + 1;
        if (currentPage !== newPage) setCurrentPage(newPage);
        if (!selectedStage) setSelectedStage(currentNextStage); 
      }
    }
  }, [currentNextStage, activeTab, selectedStage, currentPage]);


  const TabButton: React.FC<{tabId: typeof activeTab, text: string, redDotKey?: RedDotType}> = ({tabId, text, redDotKey}) => (
    <Button
        variant={activeTab === tabId ? 'primary' : 'ghost'}
        onClick={() => { setActiveTab(tabId); setSelectedStage(null); clearBattleLog(); }}
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
      <TopBar/>
      <div className="p-2 md:p-4 flex-grow overflow-y-auto">
        <h1 className="text-xl md:text-2xl font-bold text-yellow-400 mb-2 text-center">戰鬥中心</h1>
        <p className="text-center text-gray-300 mb-2 md:mb-4 text-sm md:text-base">我方隊伍戰力: <span className="text-green-400 font-semibold">{teamPower.toLocaleString()}</span></p>

        <div className="flex space-x-1 mb-4">
            <TabButton tabId="campaign" text="主線戰役" redDotKey="stage_progress" />
            <TabButton tabId="dungeon" text="每日副本" redDotKey="dungeon_available" />
            <TabButton tabId="arena" text="競技場" redDotKey="arena_available" />
            <TabButton tabId="world_boss" text="世界王" redDotKey="world_boss_available" />
        </div>

        {activeTab === 'campaign' && (
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
        </>)}

        {activeTab === 'dungeon' && (
        <div className="mt-4">
            <h2 className="text-lg md:text-xl font-semibold text-teal-400 mb-3">每日副本</h2>
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
                        if (canRun) hasRedDotForThisDungeon = true; 
                    } else {
                        canRun = attemptsLeft > 0 && dungeon.cost.every(c => canAfford(c.currency, c.amount));
                        if (canRun) hasRedDotForThisDungeon = true;
                    }
                    
                    return (
                        <Button
                            key={dungeon.id}
                            variant="ghost"
                            className="flex-col h-auto items-center justify-center p-2 md:p-3 border-teal-500 hover:bg-teal-700 disabled:opacity-50 relative"
                            onClick={() => handleDungeonBattle(dungeon.id)}
                            disabled={!canRun || battleResultModalOpen || getBattleTeam().length === 0}
                        >
                            {hasRedDotForThisDungeon && !dungeon.isEndlessTower && <RedDot className="!top-1 !right-1" /> }
                            {dungeon.isEndlessTower && checkRedDot('endless_tower_attempt') && <RedDot className="!top-1 !right-1" />}
                            <span className="text-2xl md:text-3xl mb-1">{dungeon.emoji}</span>
                            <span className="text-xs md:text-sm font-medium">{buttonText}</span>
                            {!dungeon.isEndlessTower && <p className="text-xs text-gray-400">剩餘次數: {attemptsLeft}/{dungeon.dailyAttempts}</p>}
                            {dungeon.isEndlessTower && <p className="text-xs text-gray-400">今日剩餘新挑戰: {attemptsLeft}</p>}
                            {!canRun && attemptsLeft > 0 && !dungeon.isEndlessTower && <p className="text-xs text-red-400">資源不足</p>}
                            {dungeon.isEndlessTower && gameState.currentEndlessTowerRun?.isActive && !canAfford(Currency.STAMINA, ENDLESS_TOWER_FLOOR_COST_STAMINA) && <p className="text-xs text-red-400">體力不足</p>}
                            {getBattleTeam().length === 0 && <p className="text-xs text-red-400">隊伍為空</p>}
                        </Button>
                    );
                })}
            </div>
        </div>)}

        {activeTab === 'arena' && (
        <div className="mt-4 p-3 md:p-4 bg-gray-700 rounded-lg shadow-lg text-center">
            <h2 className="text-lg md:text-xl font-semibold text-purple-400 mb-3">競技場</h2>
            <p className="text-gray-300 text-sm md:text-base">目前排名: <span className="font-bold text-yellow-300">{gameState.arenaRank.toLocaleString()}</span></p>
            <p className="text-gray-300 text-sm md:text-base">剩餘挑戰次數: <span className="font-bold text-yellow-300">{gameState.dailyArenaAttempts} / {ARENA_DAILY_ATTEMPTS}</span></p>
             <Button onClick={handleArenaBattle} variant="special" size="lg" className="w-full mt-4 md:mt-6" disabled={gameState.dailyArenaAttempts <= 0 || !canAfford(Currency.STAMINA, ARENA_BATTLE_COST_STAMINA) || battleResultModalOpen || getBattleTeam().length === 0}>
                {getBattleTeam().length === 0 ? "隊伍中無英雄" : (gameState.dailyArenaAttempts > 0 ? (canAfford(Currency.STAMINA, ARENA_BATTLE_COST_STAMINA) ? "挑戰對手!" : "體力不足") : "次數已用盡")}
            </Button>
            <p className="text-xs text-gray-400 mt-2">戰勝對手提升排名，獲取{CURRENCY_EMOJIS[Currency.ARENA_COIN]} {CURRENCY_NAMES.ARENA_COIN}！</p>
        </div>)}

        {activeTab === 'world_boss' && <WorldBossSection />}

      </div>

      {battleResultModalOpen && battleOutcome && (
        <Modal isOpen={battleResultModalOpen} onClose={closeModal} title={battleOutcome.success ? "戰鬥勝利!" : (battleOutcome.message && battleOutcome.message.includes("止步於") ? battleOutcome.message : (battleOutcome.message || "戰鬥失敗..."))} size="lg">
          <div 
            ref={battleLogRef}
            className="mb-4 text-sm text-left max-h-60 overflow-y-auto bg-gray-800 p-2 rounded-md border border-gray-600"
          >
            <h4 className="font-semibold text-yellow-300 mb-2">戰鬥記錄:</h4>
            {(battleOutcome.battleLog || getBattleLog()).map((log, index) => (
              <p key={index} className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: log }}></p>
            ))}
          </div>
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
          {battleOutcome.rankChange && <p className="text-sm text-center text-yellow-300 mb-2">競技場排名變化: {battleOutcome.rankChange > 0 ? `+${battleOutcome.rankChange}` : battleOutcome.rankChange} (新排名: {gameState.arenaRank})</p>}
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
