
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LobbyScreen from './features/lobby/LobbyScreen';
import HeroesScreen from './features/heroes/HeroesScreen';
import BattleScreen from './features/battle/BattleScreen';
import ShopScreen from './features/shop/ShopScreen';
import InventoryScreen from './features/inventory/InventoryScreen';
import BottomNav from './features/lobby/BottomNav';
import TopBar from './features/lobby/TopBar'; // Import TopBar
import { useGame } from './contexts/GameContext';
import OfferModal from './features/shop/OfferModal';
import BattlePassScreen from './features/battlepass/BattlePassScreen';
import GrowthFundScreen from './features/growthfund/GrowthFundScreen';
import MailScreen from './features/mail/MailScreen';
import TaskScreen from './features/tasks/TaskScreen';
import { Currency } from './types';
import MarqueeAnnouncements from './components/MarqueeAnnouncements';

const App: React.FC = () => {
  const { triggeredOffer, clearTriggeredOffer, purchaseTriggeredOffer, gameState, sendSystemMail, addCharacter } = useGame();
  const [konamiSequence, setKonamiSequence] = useState<string[]>([]);
  const targetKonamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

  useEffect(() => {
    if (gameState.mails.length === 0) {
        sendSystemMail({title: "歡迎來到無盡課金模擬器!", body: "祝您遊戲愉快！記得每天回來看看有什麼新內容喔！這是初始的100鑽石獎勵。", sender:"GM莉莉絲", rewards: {[Currency.DIAMONDS]: 100}});
    }
  }, [gameState.mails, sendSystemMail]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      setKonamiSequence(prevSequence => {
        const newSequence = [...prevSequence, key];
        if (newSequence.length > targetKonamiCode.length) {
          return newSequence.slice(newSequence.length - targetKonamiCode.length);
        }
        if (newSequence.join(',') === targetKonamiCode.join(',')) {
          const konamiHeroOwned = gameState.characters.find(char => char.id === 'c_konami');
          if (!konamiHeroOwned) {
            const konamiHero = addCharacter('c_konami');
            if (konamiHero) {
              sendSystemMail({
                title: "神秘力量湧現！",
                body: `你輸入了古老的密碼！傳說中的英雄 ${konamiHero.name} ${konamiHero.spriteEmoji} 已加入你的隊伍，感受他的無窮力量吧！Tung Tung Tung Sahur!`,
                sender: "彩蛋之神"
              });
            } else {
              sendSystemMail({
                title: "神秘力量回應錯誤...",
                body: `你輸入了古老的密碼，但似乎出了點問題... 傳說中的英雄未能回應。 (Debug: Konami Hero 'c_konami' definition not found or error occurred).`,
                sender: "彩蛋之神"
              });
            }
          }
          return []; 
        }
        return newSequence;
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [addCharacter, sendSystemMail, targetKonamiCode, gameState.characters]);

  return (
    <div className="flex flex-col h-full max-h-screen max-w-sm mx-auto bg-gray-800 shadow-2xl">
      <MarqueeAnnouncements />
      <TopBar /> 
      {/* Main content area for screens, adjusted padding for Marquee (h-8) and TopBar (h-14 approx) */}
      {/* Previous pt-22 (88px), New pt-24 (96px) */}
      <div className="flex-grow overflow-y-auto pb-16 no-scrollbar pt-24"> 
        <Routes>
          <Route path="/" element={<Navigate to="/lobby" replace />} />
          <Route path="/lobby" element={<LobbyScreen />} />
          <Route path="/heroes" element={<HeroesScreen />} />
          <Route path="/battle" element={<BattleScreen />} />
          <Route path="/shop" element={<ShopScreen />} />
          <Route path="/inventory" element={<InventoryScreen />} />
          <Route path="/battlepass" element={<BattlePassScreen />} />
          <Route path="/growthfund" element={<GrowthFundScreen />} />
          <Route path="/mail" element={<MailScreen />} />
          <Route path="/tasks" element={<TaskScreen />} />
        </Routes>
      </div>
      <BottomNav />
      {triggeredOffer && (
        <OfferModal
          offer={triggeredOffer}
          onClose={clearTriggeredOffer}
          onPurchase={() => {
            purchaseTriggeredOffer(triggeredOffer.id);
          }}
        />
      )}
    </div>
  );
};

export default App;
