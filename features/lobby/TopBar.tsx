import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Currency, VIPLevel, OwnedCharacter } from '../../types';
import { useGame } from '../../contexts/GameContext';
import CurrencyDisplay from '../../components/CurrencyDisplay';
import { VIP_LEVELS, HIDDEN_HERO_NICKNAME_TRIGGER, MOGUANYU_NICKNAME_TRIGGER } from '../../constants/gameplayConstants';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import { calculateCharacterPower as calculateCharacterPowerLib, calculateTeamPower as calculateTeamPowerLib } from '../../lib/game-logic/characterManager';

const PlayerProfileModal: React.FC<{isOpen: boolean, onClose: () => void}> = ({isOpen, onClose}) => {
    const { gameState, getPlayerLevelForProgress, changePlayerName, addCharacter, sendSystemMail } = useGame();
    const [editingName, setEditingName] = useState(gameState.playerName);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setEditingName(gameState.playerName);
            setShowSuccessMessage(false);
        }
    }, [isOpen, gameState.playerName]);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditingName(e.target.value);
    };

    const handleSaveName = () => {
        if (editingName.trim() === "") {
            alert("暱稱不能為空！");
            return;
        }
        const trimmedName = editingName.trim();
        changePlayerName(trimmedName);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 2000);

        if (trimmedName === HIDDEN_HERO_NICKNAME_TRIGGER) {
            const newHero = addCharacter('c_cappuccino');
            if (newHero) {
                 sendSystemMail({
                    title: "咖啡的藝術！",
                    body: `你發現了隱藏的風味！神秘英雄 ${newHero.name} ${newHero.spriteEmoji} 被你的品味所吸引，加入了你的隊伍！`,
                    sender: "咖啡之神"
                });
            } else {
                sendSystemMail({
                    title: "神秘的咖啡豆...",
                    body: `你念出了「${HIDDEN_HERO_NICKNAME_TRIGGER}」的咒語，但似乎什麼也沒發生... 咖啡豆還未成熟。\n(Debug: Cappuccino ('c_cappuccino') not found or error occurred).`,
                    sender: "咖啡小精靈"
                });
            }
        }

        if (trimmedName === MOGUANYU_NICKNAME_TRIGGER) {
            const newHero = addCharacter('c_moguanyu');
            if (newHero) {
                sendSystemMail({
                    title: "魔關羽降臨！",
                    body: `你輸入了神秘的代號！魔將 ${newHero.name} ${newHero.spriteEmoji} 已被你的霸氣所召喚，加入你的隊伍！`,
                    sender: "亂世的呼喚"
                });
            } else {
                sendSystemMail({
                    title: "神秘代號回應異常...",
                    body: `你輸入了代號，但魔關羽似乎未受感召。 (Debug: Mo Guan Yu 'c_moguanyu' already owned or definition error).`,
                    sender: "亂世的迴響"
                });
            }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="玩家資訊" size="md">
            <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-2">
                    <label htmlFor="playerNameInput" className="text-gray-300">玩家暱稱:</label>
                    <input 
                        id="playerNameInput"
                        type="text" 
                        value={editingName} 
                        onChange={handleNameChange}
                        className="flex-grow bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 focus:ring-yellow-500 focus:border-yellow-500"
                        maxLength={20}
                    />
                    <Button onClick={handleSaveName} size="sm" variant="primary">儲存</Button>
                </div>
                {showSuccessMessage && <p className="text-xs text-green-400 text-center">暱稱已更新！</p>}
                <p>玩家等級 (基於進度): <span className="font-semibold text-yellow-300">{getPlayerLevelForProgress()}</span></p>
                <p>VIP 等級: <span className="font-semibold text-yellow-300">VIP {gameState.vipLevel}</span></p>
                <p>VIP 經驗: <span className="font-semibold text-yellow-300">{gameState.resources.vipExp.toLocaleString()} / {(VIP_LEVELS.find(v => v.level === gameState.vipLevel + 1)?.expRequired || gameState.resources.vipExp).toLocaleString()}</span></p>
                <p>總隊伍戰力: <span className="font-semibold text-yellow-300">{calculateTeamPowerLib(gameState, VIP_LEVELS).toLocaleString()}</span></p>
                <p>無盡之塔最高樓層: <span className="font-semibold text-yellow-300">{gameState.endlessTowerMaxFloor}</span></p>
                <p className="mt-3 text-lg">總模擬消費金額: <span className="font-bold text-green-400">NT$ {gameState.resources.totalSimulatedNTSpent.toLocaleString()}</span></p>
            </div>
            <Button onClick={onClose} variant="secondary" className="w-full mt-4">關閉</Button>
        </Modal>
    );
};

const TopBar: React.FC = () => {
  const { gameState } = useGame();
  const navigate = useNavigate();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const currentVipLevelData = VIP_LEVELS.find(v => v.level === gameState.vipLevel) as VIPLevel; 
  const nextVipLevelData = VIP_LEVELS.find(v => v.level === gameState.vipLevel + 1);
  
  const vipProgressPercent = nextVipLevelData && currentVipLevelData 
    ? Math.min(100, (gameState.resources.vipExp - currentVipLevelData.expRequired) / (nextVipLevelData.expRequired - currentVipLevelData.expRequired) * 100) 
    : (currentVipLevelData ? 100 : 0);

  const radius = 18; // Slightly smaller than half of w-10 (20px) to fit inside
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (vipProgressPercent / 100) * circumference;

  let avatarHero: OwnedCharacter | null = null;
  const firstBattleTeamHeroId = gameState.battleTeamSlots.find(id => id !== null);
  if (firstBattleTeamHeroId) {
    avatarHero = gameState.characters.find(c => c.id === firstBattleTeamHeroId) || null;
  }
  if (!avatarHero && gameState.characters.length > 0) {
    avatarHero = [...gameState.characters].sort((a,b) => calculateCharacterPowerLib(b, gameState, VIP_LEVELS) - calculateCharacterPowerLib(a, gameState, VIP_LEVELS))[0];
  }

  const handleDiamondsAdd = () => {
    navigate('/shop', { state: { initialTab: 'currency', highlightSection: 'diamonds' } });
  };

  return (
    <>
    {/* Ensure TopBar itself is fixed if moved to App.tsx */}
    <div className="fixed top-8 left-0 right-0 max-w-sm mx-auto bg-gray-800 p-2 shadow-md flex justify-between items-center z-30 h-14">
      <div className="flex items-center">
        <div className="relative w-10 h-10 mr-2">
          <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 40 40">
            {/* Background Circle */}
            <circle
              cx="20"
              cy="20"
              r={radius}
              fill="transparent"
              strokeWidth="3"
              className="text-gray-600"
            />
            {/* Progress Circle */}
            {nextVipLevelData && (
                <circle
                cx="20"
                cy="20"
                r={radius}
                fill="transparent"
                strokeWidth="3"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="text-green-400" // Changed from text-yellow-400
                transform="rotate(-90 20 20)" // Start progress from the top
                style={{ transition: 'stroke-dashoffset 0.3s ease-out' }}
                />
            )}
          </svg>
          <button 
              onClick={() => setIsProfileModalOpen(true)} 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-9 h-9 bg-yellow-500 rounded-full flex items-center justify-center text-gray-800 font-bold text-2xl shadow-sm overflow-hidden focus:outline-none transition-transform duration-150 ease-in-out hover:scale-110"
              aria-label="玩家資訊"
          >
            {avatarHero ? (
               <span className="text-xl">{avatarHero.spriteEmoji}</span>
            ) : '👤'}
          </button>
        </div>
        <div className="text-sm font-semibold text-yellow-400">VIP {gameState.vipLevel}</div>
      </div>

      <div className="flex space-x-1 sm:space-x-2 items-center">
        <CurrencyDisplay currency={Currency.GOLD} icon="💰" />
        <CurrencyDisplay currency={Currency.STAMINA} icon="⚡" showMax={true} />
        <CurrencyDisplay currency={Currency.DIAMONDS} icon="💎" onAddClick={handleDiamondsAdd} />
      </div>
    </div>
    <PlayerProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </>
  );
};

export default TopBar;