
import React, { useState } from 'react';
import { useGame } from '../../contexts/GameContext';
import CharacterCard from '../../components/CharacterCard';
import Modal from '../../components/Modal';
import { HeroDetailPanel } from './HeroDetailPanel';
import { OwnedCharacter } from '../../types';
// import TopBar from '../lobby/TopBar'; // Removed
import Button from '../../components/Button';
import RedDot from '../../components/RedDot';
import { MAX_HEROES_IN_BATTLE_TEAM, VIP_LEVELS } from '../../constants/gameplayConstants';
import { calculateCharacterPower as calculateCharacterPowerLib } from '../../lib/game-logic/characterManager';

const HeroesScreen: React.FC = () => {
  const { gameState, clearBattleSlot, getCharacterById, checkRedDot, autoAssignTeam } = useGame();
  const [selectedHero, setSelectedHero] = useState<OwnedCharacter | null>(null);
  const [manageTeamSlot, setManageTeamSlot] = useState<number | null>(null);

  const heroForModal = selectedHero ? gameState.characters.find(c => c.id === selectedHero.id) : null;

  const BattleTeamDisplay: React.FC = () => {
    return (
      <div className="mb-4 p-3 bg-gray-700 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold text-yellow-300 flex items-center">
            目前戰隊
            {checkRedDot('hero_team_assign') && <RedDot className="relative top-0 right-0 ml-2" />}
            </h2>
            <Button onClick={autoAssignTeam} variant="ghost" size="sm">
                自動組隊
            </Button>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {gameState.battleTeamSlots.map((heroId, index) => {
            const hero = heroId ? getCharacterById(heroId) : null;
            return (
              <div
                key={index}
                className="aspect-square bg-gray-600 rounded flex flex-col items-center justify-center p-1 cursor-pointer hover:bg-gray-500 relative"
                onClick={() => setManageTeamSlot(index)}
                title={hero ? hero.name : "點擊指派英雄"}
              >
                {hero ? (
                  <>
                    <span className="text-3xl">{hero.spriteEmoji}</span>
                    <span className="text-[10px] text-center truncate w-full leading-tight">{hero.name}</span>
                    <Button 
                        size="sm" 
                        variant="danger" 
                        onClick={(e) => { e.stopPropagation(); clearBattleSlot(index); }} 
                        className="absolute -top-1 -right-1 !p-0.5 w-4 h-4 text-xs leading-none"
                        title="移出隊伍"
                    >
                        &times;
                    </Button>
                  </>
                ) : (
                  <span className="text-2xl text-gray-400">+</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const AssignHeroToSlotModal: React.FC = () => {
    if (manageTeamSlot === null) return null;

    const availableHeroes = gameState.characters.filter(
      char => !gameState.battleTeamSlots.some(slotId => slotId === char.id && gameState.battleTeamSlots[manageTeamSlot!] !== char.id)
    ).sort((a,b) => calculateCharacterPowerLib(b, gameState, VIP_LEVELS) - calculateCharacterPowerLib(a, gameState, VIP_LEVELS));

    const { assignHeroToBattleSlot } = useGame();

    return (
      <Modal isOpen={manageTeamSlot !== null} onClose={() => setManageTeamSlot(null)} title={`指派英雄至欄位 ${manageTeamSlot + 1}`} size="lg">
        <div className="max-h-[60vh] overflow-y-auto space-y-2">
          {availableHeroes.length > 0 ? availableHeroes.map(hero => (
            <Button
              key={hero.id}
              variant="ghost"
              className="w-full flex items-center justify-start text-left p-2 hover:bg-gray-600"
              onClick={() => {
                assignHeroToBattleSlot(hero.id, manageTeamSlot);
                setManageTeamSlot(null);
              }}
            >
              <span className="text-2xl mr-2">{hero.spriteEmoji}</span>
              <div>
                <p className="font-semibold">{hero.name} (Lv.{hero.level})</p>
                <p className="text-xs text-gray-400">戰力: {calculateCharacterPowerLib(hero, gameState, VIP_LEVELS).toLocaleString()}</p>
              </div>
            </Button>
          )) : <p className="text-center text-gray-400">沒有可指派的英雄了。</p>}
        </div>
        <Button onClick={() => setManageTeamSlot(null)} variant="secondary" className="w-full mt-3">取消</Button>
      </Modal>
    );
  };


  return (
    <div className="flex flex-col h-full">
      {/* <TopBar /> Removed */}
      <div className="p-4 flex-grow"> {/* Standardized to p-4 */}
        <h1 className="text-xl md:text-2xl font-bold text-yellow-400 mb-4 md:mb-6 text-center">我的英雄</h1>
        
        <BattleTeamDisplay />
        <AssignHeroToSlotModal />

        <h2 className="text-lg font-semibold text-gray-300 mb-2">所有英雄 ({gameState.characters.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {gameState.characters.length > 0 ? (
            gameState.characters
              .slice()
              .sort((a,b) => calculateCharacterPowerLib(b, gameState, VIP_LEVELS) - calculateCharacterPowerLib(a, gameState, VIP_LEVELS))
              .map(hero => (
                <CharacterCard
                  key={hero.id}
                  character={hero}
                  onClick={() => setSelectedHero(hero)}
                  showDetails={true}
                />
            ))
          ) : (
            <p className="text-center text-gray-400 col-span-full">尚無英雄。試試召喚吧！</p>
          )}
        </div>
      </div>

      {heroForModal && (
        <Modal isOpen={!!heroForModal} onClose={() => setSelectedHero(null)} title={`${heroForModal.name} - 詳細資訊`} size="lg">
          <HeroDetailPanel hero={heroForModal} onClose={() => setSelectedHero(null)} />
        </Modal>
      )}
    </div>
  );
};

export default HeroesScreen;
