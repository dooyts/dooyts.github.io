
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import TopBar from './TopBar'; // Removed
import { useGame, RedDotType } from '../../contexts/GameContext';
import Button from '../../components/Button';
import RedDot from '../../components/RedDot';
import SevenDayLoginModal from './SevenDayLoginModal';
import { calculateCharacterPower as calculateCharacterPowerLib } from '../../lib/game-logic/characterManager';
import { VIP_LEVELS } from '../../constants/gameplayConstants';


interface LobbyIconItem {
  name: string;
  path?: string;
  action?: () => void;
  redDotType?: RedDotType;
  icon: string;
  disabled?: boolean;
  state?: any; 
}

const LobbyScreen: React.FC = () => {
  const navigate = useNavigate();
  const { gameState, checkRedDot } = useGame();
  const { characters } = gameState;
  const [isSevenDayLoginModalOpen, setIsSevenDayLoginModalOpen] = useState(false);

  const mainCharacterDisplay = characters.length > 0 ?
    [...characters].sort((a,b) => calculateCharacterPowerLib(b, gameState, VIP_LEVELS) - calculateCharacterPowerLib(a, gameState, VIP_LEVELS))[0]
    : null;

  const topRowIcons: LobbyIconItem[] = [
    { name: '七日', action: () => setIsSevenDayLoginModalOpen(true), icon: '🎉', redDotType: 'seven_day_login_claimable' },
    { name: '首儲', path: '/shop', state: { initialTab: 'currency', highlightFirstPurchase: true, highlightSection: 'diamonds' }, icon: '🎁', redDotType: 'shop_free' },
  ];

  const rightSideIcons: LobbyIconItem[] = [
    { name: '通行證', path: '/battlepass', redDotType: 'battlepass_claim', icon: '🎟️' },
    { name: '基金', path: '/growthfund', redDotType: 'growthfund_claimable', icon: '🚀' },
    { name: '任務', path: '/tasks', redDotType: 'task_claimable', icon: '📋' },
    { name: '郵件', path: '/mail', redDotType: 'mail_unread', icon: '✉️' },
    { name: '世界王', path: '/battle', state: { initialTab: 'world_boss' }, icon: '🐲', redDotType: 'world_boss_available' }
  ];


  return (
    <div className="flex flex-col h-full">
      {/* <TopBar /> Removed */}
      <div className="flex-grow p-4 relative"> {/* Standardized to p-4 */}
        
        <div className="w-full bg-gray-700 rounded-lg p-3 md:p-4 space-y-4 shadow-lg">
            <div className="flex justify-center space-x-2">
                {topRowIcons.map(item => (
                     <Button
                        key={item.name}
                        variant="ghost"
                        className="w-20 h-18 flex flex-col items-center justify-center relative !px-1.5 !py-1.5 text-xs bg-gray-800 hover:bg-gray-600"
                        onClick={() => { if (item.path) navigate(item.path, {state: item.state}); else if (item.action) item.action(); }}
                        title={item.name}
                        disabled={item.disabled}
                    >
                        {item.redDotType && checkRedDot(item.redDotType as RedDotType) && <RedDot className="!top-0.5 !right-0.5"/>}
                        <span className="text-3xl mb-1">{item.icon}</span>
                        <span className="truncate w-full text-center text-[10px] leading-tight">{item.name}</span>
                    </Button>
                ))}
            </div>

            <div className="flex flex-col items-center justify-center my-2">
              {mainCharacterDisplay ? (
                <>
                  <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-yellow-400 shadow-lg flex items-center justify-center text-5xl md:text-6xl bg-gray-600 mb-2">
                    {mainCharacterDisplay.spriteEmoji}
                  </div>
                  <h2 className="text-lg md:text-xl font-bold">{mainCharacterDisplay.name}</h2>
                  <p className="text-gray-400 text-xs md:text-sm">等級 {mainCharacterDisplay.level} | 戰力: {calculateCharacterPowerLib(mainCharacterDisplay, gameState, VIP_LEVELS).toLocaleString()}</p>
                </>
              ) : (
                <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-gray-600 flex items-center justify-center text-gray-500 text-4xl mb-2">
                  👤
                </div>
              )}
            </div>

            <div className="p-2 bg-gray-600 rounded-lg shadow-md">
              <h3 className="text-md font-semibold text-yellow-400 mb-1">遊戲公告</h3>
              <p className="text-xs text-gray-300">歡迎來到無盡課金模擬器！最新活動火熱進行中！七日登入獎勵等你拿！全新世界頭目等你挑戰！競技場商店已開張！</p>
            </div>
        </div>

        <div className="absolute right-1 top-1/3 transform flex flex-col space-y-1 bg-gray-800 bg-opacity-85 p-1.5 rounded-lg shadow-xl z-20">
          {rightSideIcons.map(item => (
            <Button
              key={item.name}
              variant="ghost"
              className="w-16 h-16 flex flex-col items-center justify-center relative !px-1 !py-1 text-xs hover:bg-gray-700 focus:ring-0"
              onClick={() => { if (item.path) navigate(item.path, {state: item.state}); else if (item.action) item.action(); }}
              title={item.name}
              disabled={item.disabled}
            >
              {item.redDotType && checkRedDot(item.redDotType as RedDotType) && <RedDot className="!top-0 !right-0"/>}
              <span className="text-2xl mb-0.5">{item.icon}</span>
              <span className="text-center text-xs leading-tight mt-0.5 whitespace-nowrap">{item.name}</span>
            </Button>
          ))}
        </div>

      </div>

      <SevenDayLoginModal isOpen={isSevenDayLoginModalOpen} onClose={() => setIsSevenDayLoginModalOpen(false)} />
    </div>
  );
};

export default LobbyScreen;
