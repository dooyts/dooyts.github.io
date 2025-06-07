
import React from 'react';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import { useGame } from '../../contexts/GameContext';
import { SEVEN_DAY_LOGIN_REWARDS } from '../../constants/gameplayConstants';
import { RARITY_COLORS, CURRENCY_EMOJIS, CURRENCY_NAMES } from '../../constants/uiConstants';
import { BASE_CHARACTERS } from '../../constants/characterConstants';
import { Currency } from '../../types';

const SevenDayLoginModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { gameState, claimSevenDayLoginReward } = useGame(); // Removed direct state manipulation, rely on claimSevenDayLoginReward in context


  const handleClaimReward = (dayIndex: number) => {
    const rewardInfo = SEVEN_DAY_LOGIN_REWARDS[dayIndex];
    if (!rewardInfo || gameState.sevenDayLogin.currentDay !== rewardInfo.day || gameState.sevenDayLogin.claimedToday) {
      return;
    }
    claimSevenDayLoginReward(rewardInfo.day); // Call context function
    // Optionally close modal, or let context re-render handle visual update
    // onClose();
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="七日登入豪禮" size="lg">
      <div className="p-2 space-y-3">
        <p className="text-center text-gray-300 text-sm">每日登入領取豐厚獎勵！連續登入不要斷喔！</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto">
          {SEVEN_DAY_LOGIN_REWARDS.map((reward, index) => {
            const isPastDay = gameState.sevenDayLogin.currentDay > reward.day;
            const isCurrentDay = gameState.sevenDayLogin.currentDay === reward.day;
            const canClaimCurrentDay = isCurrentDay && !gameState.sevenDayLogin.claimedToday;
            // Check if already claimed OR (it's a past day AND (player is beyond this day OR (it's the current day of the reward cycle but not today in real time for a missed claim) ))
            // This logic can be tricky. Assuming simple `claimedToday` for current day, and `currentDay > reward.day` for past implies missed/claimed based on how `currentDay` advances.
            // For simplicity, if `currentDay > reward.day` it's considered done/missed. If `currentDay === reward.day` then `claimedToday` matters.
            const isEffectivelyClaimedOrMissed = (gameState.sevenDayLogin.currentDay > reward.day && gameState.sevenDayLogin.lastClaimTimestamp && new Date(gameState.sevenDayLogin.lastClaimTimestamp).getDate() >= reward.day ) || (isCurrentDay && gameState.sevenDayLogin.claimedToday) ;


            let rarityStyle = RARITY_COLORS.N;
            if (reward.day === 7) rarityStyle = RARITY_COLORS.SR;
            else if (Object.keys(reward.rewards).some(key => key === Currency.DIAMONDS || key === Currency.GACHA_TICKET || key === Currency.EQUIPMENT_TICKET) ) rarityStyle = RARITY_COLORS.SSR;
            else if (Object.keys(reward.rewards).length > 0) rarityStyle = RARITY_COLORS.R;


            return (
              <div
                key={reward.day}
                className={`p-3 rounded-lg shadow-md flex flex-col items-center text-center border-2
                  ${isEffectivelyClaimedOrMissed ? `${RARITY_COLORS.N} opacity-60` : (canClaimCurrentDay ? `${rarityStyle} animate-pulse` : (gameState.sevenDayLogin.currentDay < reward.day ? `${RARITY_COLORS.N} opacity-40` : rarityStyle) )}`}
              >
                <p className={`font-bold text-lg mb-1 ${isEffectivelyClaimedOrMissed ? 'text-gray-400' : 'text-yellow-300'}`}>第 {reward.day} 天</p>
                <span className="text-4xl mb-2">{reward.emoji}</span>
                <p className="text-xs text-gray-200 h-8 overflow-hidden">{reward.description}</p>
                <div className="text-xs text-yellow-200 mt-1">
                    {Object.entries(reward.rewards).map(([key,value]) =>
                        <div key={key}>{CURRENCY_EMOJIS[key as Currency] || ''} {CURRENCY_NAMES[key as Currency] || key}: {value as number}</div>
                    )}
                    {reward.day === 7 && <div>{BASE_CHARACTERS.find(c=>c.id==='c003')?.spriteEmoji || '🧝'} {BASE_CHARACTERS.find(c=>c.id==='c003')?.name || '風語者'} (SR)</div>}
                </div>
                {isCurrentDay && (
                  <Button
                    size="sm"
                    variant={gameState.sevenDayLogin.claimedToday ? 'secondary' : 'special'}
                    onClick={() => handleClaimReward(index)}
                    disabled={gameState.sevenDayLogin.claimedToday || !canClaimCurrentDay}
                    className="w-full mt-2"
                  >
                    {gameState.sevenDayLogin.claimedToday ? '今日已領' : '領取'}
                  </Button>
                )}
                {isPastDay && !isEffectivelyClaimedOrMissed && reward.day < gameState.sevenDayLogin.currentDay && (
                     <p className="text-xs text-red-400 mt-2">已錯過</p> // This condition might need refinement based on how `currentDay` and `claimedToday` interact on reset
                )}
                 {gameState.sevenDayLogin.currentDay < reward.day && (
                     <p className="text-xs text-gray-500 mt-2">敬請期待</p>
                )}
              </div>
            );
          })}
        </div>
        <Button onClick={onClose} variant="secondary" className="w-full mt-4">關閉</Button>
      </div>
    </Modal>
  );
};

export default SevenDayLoginModal;
