
import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../../contexts/GameContext';
import { ShopItem, Currency, Character, GachaPool, BaseEquipmentItem, BasePet, BaseRune, GachaPullableItem, ShopItemCategory, GachaItemType, CharacterRarity, GachaResultItem } from '../../types';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import GachaModalContent from './GachaModalContent';
import TopBar from '../lobby/TopBar';
import { 
    SHOP_ITEMS_DIAMONDS, SHOP_ITEMS_BUNDLES, SHOP_ITEMS_RESOURCES, SHOP_ITEMS_SPECIALS,
    SHOP_ITEMS_CURRENCY_GOLD, SHOP_ITEMS_CURRENCY_STAMINA
} from '../../constants/shopConstants';
import { 
    CHARACTER_GACHA_POOL, EQUIPMENT_GACHA_POOL, PET_GACHA_POOL_STANDARD, RUNE_GACHA_POOL_STANDARD, 
    LUCKY_DRAW_POOL,
    CHARACTER_GACHA_POOL_WATER_UP, CHARACTER_GACHA_POOL_FIRE_UP, CHARACTER_GACHA_POOL_WIND_UR_UP, CHARACTER_GACHA_POOL_DARK_UR_UP,
    EQUIPMENT_GACHA_POOL_ACCESSORY_UP
} from '../../constants/gachaConstants';
import { RARITY_COLORS, CURRENCY_NAMES, CURRENCY_EMOJIS } from '../../constants/uiConstants';
import { DUNGEONS_DEFINITIONS } from '../../constants/gameplayConstants';
import { BASE_CHARACTERS } from '../../constants/characterConstants';
import { BASE_EQUIPMENT_ITEMS } from '../../constants/equipmentConstants';
import { BASE_PETS } from '../../constants/petConstants';
import { BASE_RUNES } from '../../constants/runeConstants';
import VIPProgress from './VIPProgress';
import { useLocation } from 'react-router-dom';
import { isToday } from '../../lib/game-logic/utils';


const ShopScreen: React.FC = () => {
  const { purchaseShopItem, gameState, addCurrency, sendSystemMail, setLastFreeDiamondClaimTime, canAfford } = useGame();
  
  const location = useLocation();
  const routeState = location.state as { initialTab?: string, highlightFirstPurchase?: boolean, highlightSection?: 'gold' | 'diamonds' | 'stamina' } | undefined;

  const [activeShopTab, setActiveShopTab] = useState<'gacha' | 'currency' | 'bundles' | 'resources' | 'specials'>(routeState?.initialTab === 'currency' ? 'currency' : (routeState?.initialTab === 'gacha' ? 'gacha' : 'currency'));
  
  const goldShopRef = useRef<HTMLDivElement>(null);
  const diamondShopRef = useRef<HTMLDivElement>(null);
  const staminaShopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeShopTab === 'currency' && routeState?.highlightSection) {
      let targetRef: React.RefObject<HTMLDivElement> | null = null;
      if (routeState.highlightSection === 'gold') targetRef = goldShopRef;
      else if (routeState.highlightSection === 'diamonds') targetRef = diamondShopRef;
      else if (routeState.highlightSection === 'stamina') targetRef = staminaShopRef;

      if (targetRef && targetRef.current) {
        setTimeout(() => { // Allow DOM to update before scrolling
            targetRef!.current!.scrollIntoView({ behavior: 'smooth', block: 'start' });
            targetRef!.current!.classList.add('animate-pulse', 'ring-2', 'ring-yellow-400', 'rounded-lg', 'p-1');
            setTimeout(() => {
                targetRef!.current!.classList.remove('animate-pulse', 'ring-2', 'ring-yellow-400', 'rounded-lg', 'p-1');
            }, 2500); // Remove highlight after a bit
        }, 100);
      }
    }
  }, [activeShopTab, routeState?.highlightSection]);


  const allCharacterGachaPools: GachaPool[] = [CHARACTER_GACHA_POOL, CHARACTER_GACHA_POOL_WATER_UP, CHARACTER_GACHA_POOL_FIRE_UP, CHARACTER_GACHA_POOL_WIND_UR_UP, CHARACTER_GACHA_POOL_DARK_UR_UP];
  const allEquipmentGachaPools: GachaPool[] = [EQUIPMENT_GACHA_POOL, EQUIPMENT_GACHA_POOL_ACCESSORY_UP];
  const allPetGachaPools: GachaPool[] = [PET_GACHA_POOL_STANDARD];
  const allRuneGachaPools: GachaPool[] = [RUNE_GACHA_POOL_STANDARD];
  const allLuckyDrawPools: GachaPool[] = [LUCKY_DRAW_POOL];
  
  const [selectedGachaType, setSelectedGachaType] = useState<'character' | 'equipment' | 'pet' | 'rune' | 'lucky_draw'>('character');

  const [activeGachaPoolId, setActiveGachaPoolId] = useState<string>(CHARACTER_GACHA_POOL.id);
  const [isGachaModalOpen, setIsGachaModalOpen] = useState(false);
  const [gachaResults, setGachaResults] = useState<GachaPullableItem[]>([]);
  const [showGachaResultsModal, setShowGachaResultsModal] = useState(false);

  const activeGachaPool = 
    allCharacterGachaPools.find(p => p.id === activeGachaPoolId) || 
    allEquipmentGachaPools.find(p => p.id === activeGachaPoolId) ||
    allPetGachaPools.find(p => p.id === activeGachaPoolId) ||
    allRuneGachaPools.find(p => p.id === activeGachaPoolId) ||
    allLuckyDrawPools.find(p => p.id === activeGachaPoolId) ||
    (selectedGachaType === 'pet' ? PET_GACHA_POOL_STANDARD : selectedGachaType === 'rune' ? RUNE_GACHA_POOL_STANDARD : CHARACTER_GACHA_POOL);


  const getGachaItemDisplayName = (item: { type: GachaItemType, id: string }): string => {
    switch (item.type) {
        case 'character':
            return BASE_CHARACTERS.find(c => c.id === item.id)?.name || item.id;
        case 'equipment':
            return BASE_EQUIPMENT_ITEMS.find(e => e.id === item.id)?.name || item.id;
        case 'pet':
            return BASE_PETS.find(p => p.id === item.id)?.name || item.id;
        case 'rune':
            return BASE_RUNES.find(r => r.id === item.id)?.name || item.id;
        default:
            return item.id;
    }
  };
  
  const getDungeonNameById = (dungeonId: string): string => {
    return DUNGEONS_DEFINITIONS.find(d => d.id === dungeonId)?.name || dungeonId;
  };


  const handlePurchase = (item: ShopItem) => {
    const success = purchaseShopItem(item); 
    if (success) {
      sendSystemMail({
        title: "商城購買成功",
        body: `感謝您的惠顧！您已成功購買 ${item.name}。\n相關道具與VIP經驗已發放至您的帳號。`,
        sender: "商城系統"
      });
    } else {
       sendSystemMail({
        title: "商城購買失敗",
        body: `很抱歉，您購買 ${item.name} 的操作未能成功。\n請檢查購買條件、每日限購次數或確認是否已擁有此商品。`,
        sender: "商城系統"
      });
    }
  };

  const openGachaPoolSelection = (type: typeof selectedGachaType) => {
    setSelectedGachaType(type);
    if (type === 'character') setActiveGachaPoolId(CHARACTER_GACHA_POOL.id); 
    else if (type === 'equipment') setActiveGachaPoolId(EQUIPMENT_GACHA_POOL.id);
    else if (type === 'pet') setActiveGachaPoolId(PET_GACHA_POOL_STANDARD.id);
    else if (type === 'rune') setActiveGachaPoolId(RUNE_GACHA_POOL_STANDARD.id);
    else if (type === 'lucky_draw') setActiveGachaPoolId(LUCKY_DRAW_POOL.id);
    setActiveShopTab('gacha'); 
  };
  
  const openSpecificGachaBanner = (poolId: string) => {
    setActiveGachaPoolId(poolId);
    setIsGachaModalOpen(true);
  }


  const handleGachaPullAndShowResults = (results: GachaPullableItem[]) => {
    setGachaResults(results);
    setIsGachaModalOpen(false); 
    setShowGachaResultsModal(true); 
  };
  
  const now = Date.now();
  const canClaimFreeDailyDiamonds = !gameState.lastFreeDailyDiamondClaimTimestamp || (now - gameState.lastFreeDailyDiamondClaimTimestamp > 24 * 60 * 60 * 1000);

  const handleClaimFreeDailyDiamonds = () => {
      if (canClaimFreeDailyDiamonds) {
          addCurrency(Currency.DIAMONDS, 50);
          setLastFreeDiamondClaimTime(); 
          sendSystemMail({
            title: "每日福利已領取",
            body: `每日免費50 ${CURRENCY_NAMES[Currency.DIAMONDS]}已發放至您的帳號！明天記得再來喔！`,
            sender: "福利中心"
          });
      }
  };
  
  const ShopTabButton: React.FC<{tab: typeof activeShopTab, text: string}> = ({tab, text}) => (
    <Button
        variant={activeShopTab === tab ? 'special' : 'ghost'}
        onClick={() => setActiveShopTab(tab)}
        className="flex-1 text-xs sm:text-sm"
    >
        {text}
    </Button>
  );


  return (
    <div className="flex flex-col h-full">
      <TopBar/>
      <div className="p-4 flex-grow overflow-y-auto"> {/* Standardized to p-4 */}
        <h1 className="text-2xl md:text-3xl font-bold text-yellow-400 mb-4 md:mb-6 text-center tracking-wider">夢境商城</h1>

        <VIPProgress />

        <div className="mb-4 md:mb-6 p-3 bg-gray-700 rounded-lg shadow-md text-center">
            <h3 className="text-md md:text-lg font-semibold text-cyan-400 mb-1">每日福利</h3>
            <Button onClick={handleClaimFreeDailyDiamonds} disabled={!canClaimFreeDailyDiamonds} variant="ghost" size="sm">
                {canClaimFreeDailyDiamonds ? `領取免費50 ${CURRENCY_NAMES[Currency.DIAMONDS]} ${CURRENCY_EMOJIS[Currency.DIAMONDS]}` : `已領取 (CD: ${gameState.lastFreeDailyDiamondClaimTimestamp ? Math.max(0,Math.ceil(( (gameState.lastFreeDailyDiamondClaimTimestamp + 24*60*60*1000) - Date.now()) / (60*60*1000) )) : 0}小時)`}
            </Button>
        </div>

        <div className="flex space-x-1 mb-4 sticky top-0 bg-gray-800 py-2 z-10">
            <ShopTabButton tab="gacha" text="次元召喚" />
            <ShopTabButton tab="currency" text="貨幣購買" />
            <ShopTabButton tab="bundles" text="特惠禮包" />
            <ShopTabButton tab="resources" text="資源商店" />
            <ShopTabButton tab="specials" text="特殊商店" />
        </div>

        {activeShopTab === 'gacha' && (
            <div className="mb-6 md:mb-8 p-3 md:p-4 bg-gray-700 rounded-xl shadow-xl border-2 border-purple-500">
                <h2 className="text-xl md:text-2xl font-semibold text-pink-400 mb-3 text-center">次元召喚</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                    <Button variant={selectedGachaType === 'character' ? "special" : "primary"} onClick={() => openGachaPoolSelection('character')}>英雄</Button>
                    <Button variant={selectedGachaType === 'equipment' ? "special" : "primary"} onClick={() => openGachaPoolSelection('equipment')}>裝備</Button>
                    <Button variant={selectedGachaType === 'pet' ? "special" : "primary"} onClick={() => openGachaPoolSelection('pet')} disabled={PET_GACHA_POOL_STANDARD.itemPool.length === 0}>寵物</Button>
                    <Button variant={selectedGachaType === 'rune' ? "special" : "primary"} onClick={() => openGachaPoolSelection('rune')} disabled={RUNE_GACHA_POOL_STANDARD.itemPool.length === 0}>符文</Button>
                    <Button variant={selectedGachaType === 'lucky_draw' ? "special" : "primary"} onClick={() => openGachaPoolSelection('lucky_draw')} className="md:col-span-1">幸運輪盤</Button>
                </div>

                {selectedGachaType === 'character' && (
                    <div className="space-y-2">
                        {allCharacterGachaPools.map(pool => (
                            <Button key={pool.id} variant="primary" className="w-full justify-between items-center text-left" onClick={() => openSpecificGachaBanner(pool.id)}>
                                <div>
                                    <span className="font-semibold">{pool.name}</span>
                                    {pool.upItems && pool.upItems.length > 0 && 
                                        <span className="block text-xs text-yellow-200 opacity-90">
                                            UP: {pool.upItems.map(item => getGachaItemDisplayName(item)).join(', ')}
                                        </span>
                                    }
                                </div>
                                <span className="text-2xl"> ✨</span>
                            </Button>
                        ))}
                    </div>
                )}
                {selectedGachaType === 'equipment' && (
                    <div className="space-y-2">
                        {allEquipmentGachaPools.map(pool => (
                             <Button key={pool.id} variant="primary" className="w-full justify-between items-center text-left" onClick={() => openSpecificGachaBanner(pool.id)}>
                                 <div>
                                    <span className="font-semibold">{pool.name}</span>
                                    {pool.upItems && pool.upItems.length > 0 && 
                                        <span className="block text-xs text-yellow-200 opacity-90">
                                        UP: {pool.upItems.map(item => getGachaItemDisplayName(item)).join(', ')}
                                        </span>
                                    }
                                 </div>
                                 <span className="text-2xl"> 🛠️</span>
                            </Button>
                        ))}
                    </div>
                )}
                 {selectedGachaType === 'pet' && allPetGachaPools[0].itemPool.length > 0 && (
                     <Button variant="primary" className="w-full justify-between items-center text-left" onClick={() => openSpecificGachaBanner(allPetGachaPools[0].id)}>
                        {allPetGachaPools[0].name}
                        <span className="text-2xl"> 🐾</span>
                    </Button>
                )}
                 {selectedGachaType === 'rune' && allRuneGachaPools[0].itemPool.length > 0 && (
                     <Button variant="primary" className="w-full justify-between items-center text-left" onClick={() => openSpecificGachaBanner(allRuneGachaPools[0].id)}>
                        {allRuneGachaPools[0].name}
                        <span className="text-2xl"> 🗿</span>
                    </Button>
                )}
                {selectedGachaType === 'lucky_draw' && (
                     <Button variant="primary" className="w-full justify-between items-center text-left" onClick={() => openSpecificGachaBanner(LUCKY_DRAW_POOL.id)}>
                        <div>
                            <span className="font-semibold">{LUCKY_DRAW_POOL.name}</span>
                            <span className="block text-xs text-yellow-200 opacity-90">試試你的手氣！</span>
                        </div>
                        <span className="text-2xl">🎰</span>
                    </Button>
                )}


                {activeGachaPool && activeGachaPool.itemPool.length > 0 && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-300 mb-2">當前選擇卡池: {activeGachaPool.name}</p>
                    {!activeGachaPool.isLuckyDraw && activeGachaPool.guarantees.hardPitySSR &&
                        <p className="text-xs text-center mt-2 text-gray-400">
                            SSR/UR保底: {(gameState.gachaPity[activeGachaPool.id]?.ssrCount || 0)}/{activeGachaPool.guarantees.hardPitySSR}抽. {(gameState.gachaPity[activeGachaPool.id]?.upGuaranteed) ? "下次SSR/UR必為UP!" : ""}
                        </p>
                    }
                  </div>
                )}
            </div>
        )}

        {activeShopTab === 'currency' && (
          <div className="mb-6 md:mb-8 p-3 md:p-4 bg-gray-700 rounded-xl shadow-xl">
            <div className="space-y-6">
              <div ref={diamondShopRef}>
                  <h2 className="text-lg md:text-xl font-semibold text-yellow-300 mb-3">儲值{CURRENCY_NAMES[Currency.DIAMONDS]} (模擬)</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
                      {SHOP_ITEMS_DIAMONDS.map(item => (
                      <Button
                          key={item.id}
                          variant="primary"
                          onClick={() => handlePurchase(item)}
                          className={`flex-col !items-start p-2 md:p-3 h-auto !text-left bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 border border-blue-500 ${routeState?.highlightFirstPurchase && !gameState.firstPurchaseBonusUsed[item.id] && item.bonusDiamonds ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}
                      >
                          <div className="text-xl md:text-2xl mb-1">{item.emoji}</div>
                          <span className="font-bold text-sm md:text-base">{item.name}</span>
                          <span className="text-xs text-yellow-200">NT${item.priceNT}</span>
                          {!gameState.firstPurchaseBonusUsed[item.id] && item.bonusDiamonds && (
                          <span className="text-xs bg-red-500 px-1.5 py-0.5 rounded mt-1">首儲雙倍!</span>
                          )}
                      </Button>
                      ))}
                  </div>
              </div>
              <div ref={goldShopRef}>
                  <h2 className="text-lg md:text-xl font-semibold text-yellow-300 mb-3">購買{CURRENCY_NAMES[Currency.GOLD]}</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
                      {SHOP_ITEMS_CURRENCY_GOLD.map(item => (
                      <Button
                          key={item.id}
                          variant="primary"
                          onClick={() => handlePurchase(item)}
                          disabled={item.priceCurrency && item.priceAmount && !canAfford(item.priceCurrency, item.priceAmount)}
                          className="flex-col !items-start p-2 md:p-3 h-auto !text-left bg-gradient-to-br from-yellow-600 to-yellow-800 hover:from-yellow-700 hover:to-yellow-900 border border-yellow-500"
                      >
                          <div className="text-xl md:text-2xl mb-1">{item.emoji}</div>
                          <span className="font-bold text-sm md:text-base">{item.name}</span>
                          {item.priceCurrency && item.priceAmount && 
                              <span className="text-xs text-cyan-200">
                                  {CURRENCY_EMOJIS[item.priceCurrency]} {item.priceAmount.toLocaleString()} {CURRENCY_NAMES[item.priceCurrency]}
                              </span>
                          }
                          {item.resources && <div className="text-xs text-white mt-0.5">獲得: {Object.entries(item.resources).map(([key,value]) => `${CURRENCY_EMOJIS[key as Currency] || ''}${CURRENCY_NAMES[key as Currency] || key} x${Number(value).toLocaleString()}`).join(', ')}</div> }
                      </Button>
                      ))}
                  </div>
              </div>
              <div ref={staminaShopRef}>
                  <h2 className="text-lg md:text-xl font-semibold text-yellow-300 mb-3">購買{CURRENCY_NAMES[Currency.STAMINA]}</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
                      {SHOP_ITEMS_CURRENCY_STAMINA.map(item => {
                          const isDisabled = (item.priceCurrency && item.priceAmount && !canAfford(item.priceCurrency, item.priceAmount));

                          return (
                          <Button
                              key={item.id}
                              variant="primary"
                              onClick={() => handlePurchase(item)}
                              disabled={isDisabled}
                              className="flex-col !items-start p-2 md:p-3 h-auto !text-left bg-gradient-to-br from-green-600 to-green-800 hover:from-green-700 hover:to-green-900 border border-green-500"
                          >
                              <div className="text-xl md:text-2xl mb-1">{item.emoji}</div>
                              <span className="font-bold text-sm md:text-base">{item.name}</span>
                              {item.priceCurrency && item.priceAmount && 
                                  <span className="text-xs text-cyan-200">
                                      {CURRENCY_EMOJIS[item.priceCurrency]} {item.priceAmount.toLocaleString()} {CURRENCY_NAMES[item.priceCurrency]}
                                  </span>
                              }
                              {item.resources && <div className="text-xs text-white mt-0.5">獲得: {Object.entries(item.resources).map(([key,value]) => `${CURRENCY_EMOJIS[key as Currency] || ''}${CURRENCY_NAMES[key as Currency] || key} x${Number(value).toLocaleString()}`).join(', ')}</div> }
                          </Button>
                          );
                      })}
                  </div>
              </div>
            </div>
          </div>
        )}


        {activeShopTab === 'bundles' && (
            <div className="mb-6 md:mb-8 p-3 md:p-4 bg-gray-700 rounded-xl shadow-xl">
              <h2 className="text-lg md:text-xl font-semibold text-green-400 mb-3">特惠禮包 (模擬)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                  {SHOP_ITEMS_BUNDLES.map(item => {
                  let isDisabled = false;
                  let statusText = "";
                  if (item.isMonthlyCard && gameState.activeMonthlyCardEndTime && gameState.activeMonthlyCardEndTime > Date.now()) {
                      isDisabled = true; statusText = "(月卡生效中)";
                  } else if (item.isLifetimeCard && gameState.activeLifetimeCard) {
                      isDisabled = true; statusText = "(終身卡生效中)";
                  } else if (item.isGrowthFund && gameState.growthFundPurchased) {
                      isDisabled = true; statusText = "(成長基金已購買)";
                  } else if (item.isOneTime && gameState.purchasedOneTimeOffers.includes(item.id)) {
                      isDisabled = true; statusText = "(已購買)";
                  }

                  return (
                  <Button
                      key={item.id}
                      variant="secondary"
                      onClick={() => handlePurchase(item)}
                      disabled={isDisabled}
                      className="flex-col !items-start p-2 md:p-3 h-auto !text-left bg-gradient-to-br from-green-600 to-teal-800 hover:from-green-700 hover:to-teal-900 border border-green-500 disabled:opacity-60 disabled:from-gray-600 disabled:to-gray-700"
                  >
                      <div className="text-xl md:text-2xl mb-1">{item.emoji}</div>
                      <span className="font-bold text-sm md:text-base">{item.name}</span>
                      {item.priceNT && <span className="text-xs text-yellow-200">NT${item.priceNT}</span>}
                      {statusText && <span className="text-xs text-gray-300 mt-1">{statusText}</span>}
                      {item.isGrowthFund && !gameState.growthFundPurchased && <span className="text-xs text-orange-300 mt-1">(解鎖高額返利)</span>}
                      {item.isOneTime && !isDisabled && <span className="text-xs text-red-400 mt-1">(限購一次)</span>}
                       {item.resources && <div className="text-xs text-gray-300 mt-1">內容: {Object.entries(item.resources).map(([key,value]) => `${CURRENCY_EMOJIS[key as Currency] || ''}${CURRENCY_NAMES[key as Currency] || key} x${Number(value).toLocaleString()}`).join(', ')}</div> }
                  </Button>
                  );
                  })}
              </div>
            </div>
        )}

        {activeShopTab === 'resources' && (
            <div className="mb-6 md:mb-8 p-3 md:p-4 bg-gray-700 rounded-xl shadow-xl">
              <h2 className="text-lg md:text-xl font-semibold text-cyan-400 mb-3">資源商店</h2>
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
                  {SHOP_ITEMS_RESOURCES.map(item => {
                      const dailyLimitInfo = item.dailyLimit ? gameState.dailyPurchaseLimits[item.id] : null;
                      const purchasedToday = dailyLimitInfo && isToday(dailyLimitInfo.lastPurchaseTime) ? dailyLimitInfo.count : 0;
                      const canPurchaseToday = item.dailyLimit ? purchasedToday < item.dailyLimit : true;
                      const isDisabled = !canPurchaseToday || (item.priceCurrency && item.priceAmount && (!gameState.resources[item.priceCurrency] || gameState.resources[item.priceCurrency] < item.priceAmount));
                      
                      return (
                          <Button
                              key={item.id}
                              variant="ghost"
                              onClick={() => handlePurchase(item)}
                              disabled={isDisabled}
                              className="flex-col !items-start p-2 md:p-3 h-auto !text-left border border-cyan-500 hover:bg-cyan-700 disabled:opacity-60"
                          >
                              <div className="text-xl md:text-2xl mb-1">{item.emoji}</div>
                              <span className="font-bold text-sm md:text-base">{item.name}</span>
                              {item.priceCurrency && item.priceAmount && 
                                  <span className="text-xs text-yellow-200">
                                      {CURRENCY_EMOJIS[item.priceCurrency]} {item.priceAmount.toLocaleString()} {CURRENCY_NAMES[item.priceCurrency]}
                                  </span>
                              }
                              {item.dailyLimit && <span className="text-xs text-gray-400 mt-1">每日限購: {purchasedToday}/{item.dailyLimit}</span>}
                               {item.resources && <div className="text-xs text-green-300 mt-0.5">獲得: {Object.entries(item.resources).map(([key,value]) => `${CURRENCY_EMOJIS[key as Currency] || ''}${CURRENCY_NAMES[key as Currency] || key} x${Number(value).toLocaleString()}`).join(', ')}</div> }
                               {item.effect?.add_arena_attempts && <span className="text-xs text-green-300 mt-0.5">增加 {item.effect.add_arena_attempts} 次競技場挑戰</span>}
                               {item.effect?.add_dungeon_attempt && <span className="text-xs text-green-300 mt-0.5">增加 {item.effect.add_dungeon_attempt.count} 次{getDungeonNameById(item.effect.add_dungeon_attempt.dungeonId)}副本次數</span>}
                          </Button>
                      );
                  })}
               </div>
            </div>
        )}
        
        {activeShopTab === 'specials' && (
            <div className="mb-6 md:mb-8 p-3 md:p-4 bg-gray-700 rounded-xl shadow-xl">
              <h2 className="text-lg md:text-xl font-semibold text-purple-400 mb-3">特殊商店</h2>
              <p className="text-sm text-gray-400 mb-3">
                  您擁有: {CURRENCY_EMOJIS[Currency.ARENA_COIN]} {gameState.resources[Currency.ARENA_COIN].toLocaleString()} {CURRENCY_NAMES[Currency.ARENA_COIN]}, {CURRENCY_EMOJIS[Currency.WORLD_BOSS_COIN]} {gameState.resources[Currency.WORLD_BOSS_COIN].toLocaleString()} {CURRENCY_NAMES[Currency.WORLD_BOSS_COIN]}
              </p>
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
                  {SHOP_ITEMS_SPECIALS.map(item => {
                      const dailyLimitInfo = item.dailyLimit ? gameState.dailyPurchaseLimits[item.id] : null;
                      const purchasedToday = dailyLimitInfo && isToday(dailyLimitInfo.lastPurchaseTime) ? dailyLimitInfo.count : 0;
                      const canPurchaseToday = item.dailyLimit ? purchasedToday < item.dailyLimit : true;
                      const isDisabled = !canPurchaseToday || (item.priceCurrency && item.priceAmount && (!gameState.resources[item.priceCurrency] || gameState.resources[item.priceCurrency] < item.priceAmount));
                      
                      const itemColorClass = item.priceCurrency === Currency.ARENA_COIN ? 'border-purple-500 hover:bg-purple-700' : 'border-red-500 hover:bg-red-700';

                      let charShardDisplay: React.ReactNode = null;
                      if (item.characterShards) {
                          let charName = "";
                          let charEmoji = "🦸";
                          if (item.characterShards.charId === 'random_sr') {
                              charName = "隨機SR英雄";
                          } else if (item.characterShards.charId === 'random_ssr') {
                              charName = "隨機SSR英雄";
                          } else {
                              const foundChar = BASE_CHARACTERS.find(c => c.id === item.characterShards!.charId);
                              charName = foundChar?.name || item.characterShards!.charId;
                              charEmoji = foundChar?.spriteEmoji || '🦸';
                          }
                          charShardDisplay = <div className="text-xs text-green-300 mt-0.5">獲得: {charEmoji} {charName} 碎片 x{item.characterShards.amount}</div>;
                      }

                      let equipmentDisplay: React.ReactNode = null;
                      if (item.equipment && item.equipment.length > 0) {
                          const equipId = item.equipment[0];
                          let equipName = "";
                          let equipEmoji = "🔩";
                          if (equipId === 'random_r_equipment') {
                              equipName = "隨機R級裝備";
                          } else {
                               const foundEquip = BASE_EQUIPMENT_ITEMS.find(e => e.id === equipId);
                               equipName = foundEquip?.name || equipId;
                               equipEmoji = foundEquip?.emoji || '🔩';
                          }
                          equipmentDisplay = <div className="text-xs text-green-300 mt-0.5">獲得: {equipEmoji} {equipName}</div>;
                      }

                      return (
                          <Button
                              key={item.id}
                              variant="ghost"
                              onClick={() => handlePurchase(item)}
                              disabled={isDisabled}
                              className={`flex-col !items-start p-2 md:p-3 h-auto !text-left ${itemColorClass} disabled:opacity-60`}
                          >
                              <div className="text-xl md:text-2xl mb-1">{item.emoji}</div>
                              <span className="font-bold text-sm md:text-base">{item.name}</span>
                              {item.priceCurrency && item.priceAmount && 
                                  <span className="text-xs text-yellow-200">
                                      {CURRENCY_EMOJIS[item.priceCurrency]} {item.priceAmount.toLocaleString()} {CURRENCY_NAMES[item.priceCurrency]}
                                  </span>
                              }
                              {item.dailyLimit && <span className="text-xs text-gray-400 mt-1">每日限購: {purchasedToday}/{item.dailyLimit}</span>}
                              {item.isOneTime && <span className="text-xs text-red-400 mt-1">(限購一次)</span>}
                              {item.resources && <div className="text-xs text-green-300 mt-0.5">獲得: {Object.entries(item.resources).map(([key,value]) => `${CURRENCY_EMOJIS[key as Currency] || ''}${CURRENCY_NAMES[key as Currency] || key} x${Number(value).toLocaleString()}`).join(', ')}</div> }
                              {charShardDisplay}
                              {equipmentDisplay}
                          </Button>
                      );
                  })}
                  {SHOP_ITEMS_SPECIALS.length === 0 && <p className="col-span-full text-center text-gray-400">特殊商店暫無商品。</p>}
               </div>
            </div>
        )}

      </div>

      {isGachaModalOpen && activeGachaPool && activeGachaPool.itemPool.length > 0 && (
        <Modal isOpen={isGachaModalOpen} onClose={() => setIsGachaModalOpen(false)} title={activeGachaPool.name} size="lg">
          <GachaModalContent pool={activeGachaPool} onPull={handleGachaPullAndShowResults} />
        </Modal>
      )}

      {showGachaResultsModal && (
        <Modal isOpen={showGachaResultsModal} onClose={() => setShowGachaResultsModal(false)} title="召喚結果" size="xl">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[60vh] overflow-y-auto p-2 bg-gray-800 rounded-lg">
                {gachaResults.map((item, index) => {
                    let name: string, rarity: CharacterRarity, emoji: string, description: string | undefined;
                    
                    const gachaItem = item as GachaResultItem; 
                    const characterItem = item as Character;
                    const equipmentItem = item as BaseEquipmentItem;
                    const petItem = item as BasePet;
                    const runeItem = item as BaseRune;

                    if (characterItem.spriteEmoji) { 
                        name = characterItem.name; rarity = characterItem.rarity; emoji = characterItem.spriteEmoji;
                    } else if (equipmentItem.slot && equipmentItem.emoji) { 
                        name = equipmentItem.name; rarity = equipmentItem.rarity; emoji = equipmentItem.emoji;
                    } else if (petItem.globalStatsBoost && petItem.emoji) { 
                        name = petItem.name; rarity = petItem.rarity; emoji = petItem.emoji;
                    } else if (runeItem.mainStatOptions && runeItem.emoji) { 
                        name = runeItem.name; rarity = runeItem.rarity; emoji = runeItem.emoji;
                    } else { 
                        name = gachaItem.name;
                        rarity = gachaItem.rarity;
                        emoji = gachaItem.emoji;
                        description = gachaItem.description || (gachaItem.amount ? `x${gachaItem.amount}` : undefined);
                    }

                    return (
                        <div key={index} className={`p-2 rounded-lg border-2 ${RARITY_COLORS[rarity]} bg-gray-700 flex flex-col items-center justify-center text-center aspect-square shadow-md`}>
                            <div className="text-3xl md:text-4xl mb-1 flex items-center justify-center h-10 w-10 md:h-12 md:w-12">{emoji}</div>
                            <p className="text-xs font-semibold leading-tight truncate w-full">{name}</p>
                            {description && <p className="text-[10px] text-gray-300">{description}</p>}
                            <p className={`text-[10px] ${RARITY_COLORS[rarity]?.split(' ')[0] || 'text-gray-300'}`}>{rarity}</p>
                        </div>
                    );
                })}
            </div>
            <Button onClick={() => setShowGachaResultsModal(false)} variant="primary" className="w-full mt-4">確定</Button>
        </Modal>
      )}

    </div>
  );
};

export default ShopScreen;
