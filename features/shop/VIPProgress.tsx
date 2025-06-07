import React, { useState, useEffect }  from 'react';
import { useGame } from '../../contexts/GameContext';
import { VIP_LEVELS } from '../../constants/gameplayConstants';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { Currency } from '../../types'; // Import Currency for dailyFreeGachaTicket

const VIPProgress: React.FC = () => {
  const { gameState } = useGame();
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);
  const [displayedVipLevel, setDisplayedVipLevel] = useState(gameState.vipLevel);

  useEffect(() => {
    // Reset displayedVipLevel to current player's VIP level when modal opens
    if (isVipModalOpen) {
      setDisplayedVipLevel(gameState.vipLevel);
    }
  }, [isVipModalOpen, gameState.vipLevel]);

  const currentVipLevelData = VIP_LEVELS.find(v => v.level === gameState.vipLevel);
  const nextVipLevelData = VIP_LEVELS.find(v => v.level === gameState.vipLevel + 1);

  let progressPercent = 0;
  if (currentVipLevelData && nextVipLevelData) {
    const expIntoCurrentLevel = gameState.resources.vipExp - currentVipLevelData.expRequired;
    const expForNextLevel = nextVipLevelData.expRequired - currentVipLevelData.expRequired;
    if (expForNextLevel > 0) { 
        progressPercent = Math.min(100, (expIntoCurrentLevel / expForNextLevel) * 100);
    } else if (expIntoCurrentLevel >=0) { 
        progressPercent = 100;
    }
  } else if (currentVipLevelData && !nextVipLevelData) { // Max VIP
    progressPercent = 100;
  }

  const handlePreviousVipLevel = () => {
    setDisplayedVipLevel(prev => Math.max(0, prev - 1));
  };

  const handleNextVipLevel = () => {
    setDisplayedVipLevel(prev => Math.min(VIP_LEVELS.length - 1, prev + 1));
  };
  
  const vipToShowDetails = VIP_LEVELS.find(v => v.level === displayedVipLevel);

  return (
    <div className="mb-6 p-4 bg-gray-700 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold text-yellow-400">VIP {gameState.vipLevel} 特權</h2>
        <Button size="sm" variant="ghost" onClick={() => setIsVipModalOpen(true)}>查看所有VIP等級</Button>
      </div>
      <div className="w-full bg-gray-600 rounded-full h-2.5 mb-1">
        <div className="bg-yellow-500 h-2.5 rounded-full" style={{ width: `${progressPercent}%` }}></div>
      </div>
      {nextVipLevelData ? (
        <p className="text-xs text-gray-300 text-right">
          {gameState.resources.vipExp.toLocaleString()} / {nextVipLevelData.expRequired.toLocaleString()} EXP 升級至 VIP {nextVipLevelData.level}
        </p>
      ) : (
        <p className="text-xs text-green-400 text-right">已達最高VIP等級！</p>
      )}
      {currentVipLevelData && (
        <p className="text-xs text-gray-400 mt-1">目前特權範例: {currentVipLevelData.perks[0]}</p>
      )}

      <Modal isOpen={isVipModalOpen} onClose={() => setIsVipModalOpen(false)} title={`VIP ${displayedVipLevel} 特權詳情`} size="lg">
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {vipToShowDetails && (
            <div className={`p-3 rounded-md ${vipToShowDetails.level === gameState.vipLevel ? 'bg-yellow-600 bg-opacity-30 border-2 border-yellow-500' : 'bg-gray-600'}`}>
              <h4 className="font-bold text-yellow-300">VIP {vipToShowDetails.level} <span className="text-xs text-gray-400">(需要 {vipToShowDetails.expRequired.toLocaleString()} EXP)</span></h4>
              <ul className="list-disc list-inside text-xs text-gray-200 pl-2">
                {vipToShowDetails.perks.map((perk, i) => <li key={i}>{perk}</li>)}
                 {vipToShowDetails.bonusAttackPercent && <li className="text-green-300">全隊攻擊 +{vipToShowDetails.bonusAttackPercent}%</li>}
                 {vipToShowDetails.bonusAllStatsPercent && <li className="text-green-300">全隊屬性 +{vipToShowDetails.bonusAllStatsPercent}%</li>}
                 {vipToShowDetails.dailyStaminaPurchaseLimitIncrease && <li className="text-cyan-300">每日體力購買上限 +{vipToShowDetails.dailyStaminaPurchaseLimitIncrease}</li>}
                 {vipToShowDetails.arenaAttemptsIncrease && <li className="text-cyan-300">每日競技場挑戰次數 +{vipToShowDetails.arenaAttemptsIncrease}</li>}
                 {vipToShowDetails.dungeonAttemptsIncrease && Object.entries(vipToShowDetails.dungeonAttemptsIncrease).map(([dungeonId, count]) => <li key={dungeonId} className="text-cyan-300">每日 {dungeonId} 挑戰次數 +{count}</li> )}
                 {vipToShowDetails.offlineEarningsBonusPercent && <li className="text-cyan-300">離線收益 +{vipToShowDetails.offlineEarningsBonusPercent}%</li>}
                 {vipToShowDetails.dailyFreeGachaTicket && vipToShowDetails.dailyFreeGachaTicket === Currency.GACHA_TICKET && <li className="text-cyan-300">每日贈送 普通英雄召喚券 x1</li>}
              </ul>
            </div>
          )}
           {!vipToShowDetails && <p className="text-gray-400 text-center">無法載入VIP等級資訊。</p>}
        </div>
        <div className="flex justify-between mt-4">
            <Button onClick={handlePreviousVipLevel} variant="primary" disabled={displayedVipLevel === 0}>上一級</Button>
            <Button onClick={handleNextVipLevel} variant="primary" disabled={displayedVipLevel === VIP_LEVELS.length - 1}>下一級</Button>
        </div>
         <Button onClick={() => setIsVipModalOpen(false)} variant="secondary" className="w-full mt-4">關閉</Button>
      </Modal>
    </div>
  );
};

export default VIPProgress;