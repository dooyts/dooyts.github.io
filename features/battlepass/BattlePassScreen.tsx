
import React from 'react';
// import TopBar from '../lobby/TopBar'; // Removed
import { useGame } from '../../contexts/GameContext';
import { BATTLE_PASS_TIERS, BATTLE_PASS_PRICES } from '../../constants/shopConstants';
import { CURRENCY_NAMES, CURRENCY_EMOJIS } from '../../constants/uiConstants';
import { BASE_CHARACTERS } from '../../constants/characterConstants';
import { BASE_EQUIPMENT_ITEMS } from '../../constants/equipmentConstants';
import { BASE_PETS } from '../../constants/petConstants';
import Button from '../../components/Button';
import { Currency, BattlePassTier } from '../../types';

const BattlePassScreen: React.FC = () => {
  const { gameState, claimBattlePassReward, purchaseBattlePass } = useGame();

  const currentTierExp = BATTLE_PASS_TIERS.slice(0, gameState.battlePassLevel).reduce((sum, tier) => sum + tier.expRequired, 0);
  const nextTierData = BATTLE_PASS_TIERS.find(t => t.level === gameState.battlePassLevel); 
  const nextTierExpRequired = nextTierData?.expRequired || Infinity;

  const progressToNextTier = nextTierExpRequired === Infinity || gameState.battlePassLevel >= BATTLE_PASS_TIERS.length 
    ? 100 
    : (gameState.battlePassExp / nextTierExpRequired) * 100;

  const formatRewardItem = (rewardKey: string, rewardValue: any): string => {
    if (rewardKey === 'characterShards' && typeof rewardValue === 'object' && rewardValue !== null) {
      const char = BASE_CHARACTERS.find(c => c.id === rewardValue.charId);
      return `${char?.spriteEmoji || '🦸'} ${char?.name || rewardValue.charId} 碎片 x${rewardValue.amount}`;
    }
    if (rewardKey === 'equipment' && Array.isArray(rewardValue)) {
      return rewardValue.map(eqId => {
        const eq = BASE_EQUIPMENT_ITEMS.find(e => e.id === eqId);
        return `${eq?.emoji || '🔩'} ${eq?.name || eqId}`;
      }).join(', ') + ' (裝備)';
    }
    if (rewardKey === 'pet' && Array.isArray(rewardValue)) {
         return rewardValue.map(petId => {
           const pet = BASE_PETS.find(p => p.id === petId);
           return `${pet?.emoji || '🐾'} ${pet?.name || petId}`;
          }).join(', ') + ' (寵物)';
    }
    if (rewardKey === 'isSkin') {
        return "🎨 限定造型";
    }
    
    const currencyKey = rewardKey as Currency;
    const currencyName = CURRENCY_NAMES[currencyKey] || rewardKey;
    const currencyEmoji = CURRENCY_EMOJIS[currencyKey] || '';
    
    return `${currencyEmoji} ${currencyName}: ${Number(rewardValue).toLocaleString()}`;
  };


  return (
    <div className="flex flex-col h-full">
      {/* <TopBar /> Removed */}
      <div className="p-4 flex-grow"> {/* Standardized to p-4 */}
        <h1 className="text-2xl font-bold text-yellow-400 mb-2 text-center">戰鬥通行證</h1>
        <div className="mb-4 p-3 bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-200">目前等級: <span className="font-bold text-lg text-green-400">{gameState.battlePassLevel}</span> / {BATTLE_PASS_TIERS.length}</p>
            <div className="w-full bg-gray-600 rounded-full h-2.5 my-1">
                <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${progressToNextTier}%` }}></div>
            </div>
            <p className="text-xs text-gray-400">經驗: {gameState.battlePassExp} / {nextTierExpRequired === Infinity ? 'MAX' : nextTierExpRequired}</p>
             <p className="text-xs text-gray-400">每日任務、通關主線、挑戰副本可獲得通行證經驗。</p>
        </div>

        {gameState.battlePassPurchased === 'none' && (
            <div className="grid grid-cols-2 gap-2 mb-4">
                <Button variant="special" onClick={() => purchaseBattlePass('advanced')} className="py-3">
                    購買進階版 <span className="text-xs block">(NT${BATTLE_PASS_PRICES.advanced.nt})</span>
                </Button>
                <Button variant="special" onClick={() => purchaseBattlePass('collector')} className="py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
                    購買典藏版 <span className="text-xs block">(NT${BATTLE_PASS_PRICES.collector.nt})</span>
                </Button>
            </div>
        )}
        {gameState.battlePassPurchased !== 'none' && (
             <p className="text-center text-green-400 mb-4">已購買 {BATTLE_PASS_PRICES[gameState.battlePassPurchased].name} 通行證！</p>
        )}


        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {BATTLE_PASS_TIERS.map(tier => {
                const canClaimFree = gameState.battlePassLevel >= tier.level && !gameState.claimedBattlePassFreeTiers.includes(tier.level) && tier.freeReward && Object.keys(tier.freeReward).length > 0;
                const canClaimPaid = gameState.battlePassPurchased !== 'none' && gameState.battlePassLevel >= tier.level && !gameState.claimedBattlePassPaidTiers.includes(tier.level) && tier.paidReward && Object.keys(tier.paidReward).length > 0;
                const isFreeClaimed = gameState.claimedBattlePassFreeTiers.includes(tier.level);
                const isPaidClaimed = gameState.claimedBattlePassPaidTiers.includes(tier.level);

                return (
                    <div key={tier.level} className={`p-3 rounded-md ${gameState.battlePassLevel >= tier.level ? 'bg-gray-600' : 'bg-gray-700 opacity-70'}`}>
                        <h3 className="font-semibold text-lg text-yellow-300">等級 {tier.level}</h3>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                            <div className={`p-2 rounded ${tier.freeReward ? 'bg-gray-500' : 'bg-gray-700'} `}>
                                <p className="text-xs text-gray-300 mb-1">免費獎勵:</p>
                                {tier.freeReward && Object.keys(tier.freeReward).length > 0 ? (
                                    <>
                                    {Object.entries(tier.freeReward).map(([key, val]) => {
                                        if (typeof val === 'number' && val === 0 && key.toUpperCase().includes('TICKET')) return null;
                                        return <p key={key} className="text-xs">{formatRewardItem(key,val)}</p>
                                    }).filter(Boolean)}
                                    <Button size="sm" variant="primary" onClick={() => claimBattlePassReward(tier.level, false)} disabled={!canClaimFree} className="w-full mt-1">
                                        {isFreeClaimed ? "已領取" : canClaimFree ? "領取" : "未解鎖"}
                                    </Button>
                                    </>
                                ) : <p className="text-xs text-gray-400">(無)</p>}
                            </div>
                            <div className={`p-2 rounded ${tier.paidReward ? (gameState.battlePassPurchased !== 'none' ? 'bg-yellow-700 bg-opacity-50 border border-yellow-500' : 'bg-gray-500') : 'bg-gray-700'}`}>
                                <p className="text-xs text-yellow-200 mb-1">進階獎勵:</p>
                                 {tier.paidReward && Object.keys(tier.paidReward).length > 0 ? (
                                    <>
                                    {Object.entries(tier.paidReward).map(([key, val]) => {
                                        if (typeof val === 'number' && val === 0 && key.toUpperCase().includes('TICKET')) return null;
                                        return <p key={key} className="text-xs">{formatRewardItem(key,val)}</p>
                                    }).filter(Boolean)}
                                    <Button size="sm" variant="special" onClick={() => claimBattlePassReward(tier.level, true)} disabled={!canClaimPaid} className="w-full mt-1">
                                        {isPaidClaimed ? "已領取" : canClaimPaid ? "領取" : (gameState.battlePassPurchased === 'none' ? "未購買" : "未解鎖")}
                                    </Button>
                                    </>
                                ) : <p className="text-xs text-gray-400">(無)</p>}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};
export default BattlePassScreen;
