
import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../../contexts/GameContext';
import { Currency, WorldBossInfo, ElementType } from '../../types';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import VipBadge from './VipBadge';
import { MAX_WORLD_BOSS_ATTACKS_PER_CYCLE } from '../../constants/gameplayConstants';
import { CURRENCY_NAMES, CURRENCY_EMOJIS, ELEMENT_COLORS } from '../../constants/uiConstants';

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
    const { name, spriteEmoji, currentHp, maxHp, nextRefreshTime, attackCost, element, description } = gameState.worldBoss;
    const hpPercentage = (currentHp / maxHp) * 100;
    const timeToRefreshMs = Math.max(0, nextRefreshTime - Date.now());
    const refreshMinutes = Math.floor(timeToRefreshMs / 60000);
    const refreshSeconds = Math.floor((timeToRefreshMs % 60000) / 1000);

    const canAttack = gameState.resources[attackCost.currency] >= attackCost.amount && 
                      gameState.playerWorldBossStats.attacksMadeThisCycle < MAX_WORLD_BOSS_ATTACKS_PER_CYCLE &&
                      currentHp > 0;

    const leaderboard = getWorldBossLeaderboard();
    const bossElementStyle = ELEMENT_COLORS[element as ElementType] || 'bg-gray-500';


    return (
        <div className="mt-4 p-3 md:p-4 bg-gray-700 rounded-lg shadow-lg">
            <h2 className="text-xl md:text-2xl font-bold text-red-400 mb-1 text-center flex items-center justify-center">
                {spriteEmoji} {name} <span className={`ml-2 px-2 py-0.5 text-sm font-semibold rounded-full text-white ${bossElementStyle}`}>{element}</span> {spriteEmoji}
            </h2>
            {description && <p className="text-xs text-center text-gray-400 mb-2">{description}</p>}
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
                    {currentHp <= 0 ? "頭目已被擊敗" : (!canAttack ? (gameState.playerWorldBossStats.attacksMadeThisCycle >= MAX_WORLD_BOSS_ATTACKS_PER_CYCLE ? "次數已尽" : `${CURRENCY_NAMES[attackCost.currency]}不足`) : "挑戰頭目!")}
                </Button>
            </div>
            
            <div className="mt-2 p-2 bg-gray-800 rounded-md text-center">
                <h4 className="text-md font-semibold text-yellow-300 mb-1">排名獎勵說明</h4>
                <p className="text-xs text-gray-300">
                    根據您在本輪世界頭目討伐中的傷害排名，您將獲得豐厚的獎勵，包括稀有的{CURRENCY_EMOJIS[Currency.WORLD_BOSS_COIN]} {CURRENCY_NAMES[Currency.WORLD_BOSS_COIN]}！
                    排名越高，獎勵越好！使用{CURRENCY_EMOJIS[Currency.WORLD_BOSS_COIN]}可在特殊商店兌換珍稀道具。
                </p>
            </div>

            <div className="mt-4">
                <h3 className="text-lg font-semibold text-yellow-300 mb-2">傷害排行榜 (模擬)</h3>
                <div className="max-h-60 overflow-y-auto bg-gray-800 p-2 rounded-md space-y-1 text-xs">
                    {leaderboard.length === 0 && <p className="text-gray-400 text-center">暫無排名數據</p>}
                    {leaderboard.map((entry, index) => (
                        <div key={entry.playerId + '_' + index} className={`flex justify-between items-center p-1 rounded ${entry.playerId === 'player' ? 'bg-yellow-600 bg-opacity-30' : 'bg-gray-700'}`}>
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
                                {(wbBattleOutcome.battleLog || []).map((log, index) => (
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
export default WorldBossSection;
