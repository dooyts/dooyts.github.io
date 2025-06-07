
import React from 'react';
// import TopBar from '../lobby/TopBar'; // Removed
import { useGame } from '../../contexts/GameContext';
import { GROWTH_FUND_MILESTONES, SHOP_ITEMS_BUNDLES, TOTAL_GROWTH_FUND_DIAMONDS } from '../../constants/shopConstants';
import { CURRENCY_NAMES, CURRENCY_EMOJIS } from '../../constants/uiConstants';
import { BASE_CHARACTERS } from '../../constants/characterConstants';
import Button from '../../components/Button';
import { Currency } from '../../types';

const GrowthFundScreen: React.FC = () => {
  const { gameState, claimGrowthFundReward, purchaseGrowthFund, getPlayerLevelForProgress } = useGame();
  const growthFundShopItem = SHOP_ITEMS_BUNDLES.find(item => item.isGrowthFund)!;
  const playerLevel = getPlayerLevelForProgress();

  const formatMilestoneReward = (rewardKey: string, rewardValue: any): string => {
    if (rewardKey === 'characterShards' && typeof rewardValue === 'object' && rewardValue !== null) {
      const char = BASE_CHARACTERS.find(c => c.id === rewardValue.charId);
      return `${char?.spriteEmoji || '🦸'} ${char?.name || rewardValue.charId} 碎片 x${rewardValue.amount}`;
    }
    const currencyKey = rewardKey as Currency;
    const currencyName = CURRENCY_NAMES[currencyKey] || rewardKey;
    const currencyEmoji = CURRENCY_EMOJIS[currencyKey] || '';
    return `${currencyEmoji} ${currencyName} x${Number(rewardValue).toLocaleString()}`;
  };


  return (
    <div className="flex flex-col h-full">
      {/* <TopBar /> Removed */}
      <div className="p-4 flex-grow"> {/* Standardized to p-4 */}
        <h1 className="text-2xl font-bold text-yellow-400 mb-2 text-center">成長基金</h1>
        <p className="text-center text-sm text-gray-300 mb-4">總計可領取 <span className="font-bold text-green-400">{CURRENCY_EMOJIS[Currency.DIAMONDS]} {TOTAL_GROWTH_FUND_DIAMONDS.toLocaleString()}</span>！</p>

        {!gameState.growthFundPurchased && (
            <div className="mb-6 p-4 bg-gray-700 rounded-lg text-center">
                <p className="text-lg text-gray-200 mb-2">購買成長基金，隨等級提升領取海量鑽石！</p>
                <Button variant="special" size="lg" onClick={purchaseGrowthFund}>
                    購買基金 (NT$ {growthFundShopItem.priceNT})
                </Button>
            </div>
        )}
        {gameState.growthFundPurchased && (
            <p className="text-center text-green-400 mb-4">成長基金已購買！努力升級領取獎勵吧！</p>
        )}

        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {GROWTH_FUND_MILESTONES.map(milestone => {
                const isClaimed = gameState.claimedGrowthFundMilestones.includes(milestone.id);
                const canClaim = gameState.growthFundPurchased && milestone.condition(gameState) && !isClaimed;
                const meetsCondition = milestone.condition(gameState);

                return (
                    <div key={milestone.id} className={`p-3 rounded-md ${meetsCondition ? 'bg-gray-600' : 'bg-gray-700 opacity-60'}`}>
                        <h3 className="font-semibold text-lg text-orange-300">{milestone.description}</h3>
                         <div className="text-xs text-gray-300 mb-1">
                            獎勵:
                            {Object.entries(milestone.rewards).map(([key, value]) => (
                                <span key={key} className="mr-2">{formatMilestoneReward(key, value)}</span>
                            ))}
                        </div>
                        <Button
                            size="sm"
                            variant={isClaimed ? "secondary" : "primary"}
                            onClick={() => claimGrowthFundReward(milestone.id)}
                            disabled={!canClaim || !gameState.growthFundPurchased}
                            className="w-full mt-1"
                        >
                            {isClaimed ? "已領取" : (gameState.growthFundPurchased ? (canClaim ? "領取獎勵" : (meetsCondition ? "已達標" : "未達成")) : "未購買基金")}
                        </Button>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};

export default GrowthFundScreen;
