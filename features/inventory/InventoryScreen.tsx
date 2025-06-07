
import React, { useState } from 'react';
// import TopBar from '../lobby/TopBar'; // Removed
import { useGame } from '../../contexts/GameContext';
import { Currency, EquipmentSlot, OwnedEquipmentItem, OwnedPet, OwnedRune, CharacterRarity, PetStatBoostKey } from '../../types';
import { EQUIPMENT_SLOT_NAMES, RARITY_COLORS, STAT_NAMES_CHINESE } from '../../constants/uiConstants';
import Button from '../../components/Button';

type ItemCategory = 'consumable' | 'material' | 'special' | 'equipment' | 'pet' | 'rune';

const InventoryScreen: React.FC = () => {
  const { gameState, getOwnedEquipmentItemByUniqueId } = useGame();
  const [activeCategory, setActiveCategory] = useState<ItemCategory>('consumable');

  const consumables = [
    { name: '經驗藥水', quantity: gameState.resources[Currency.EXP_POTION], icon: '🧪' },
    { name: '體力藥劑 (背包)', quantity: 0, icon: '⚡️' }, 
    { name: '金幣袋', quantity: 0, icon: '💰' },
  ];
  const materials = [
    { name: '突破石', quantity: gameState.resources[Currency.BREAKTHROUGH_STONE], icon: '💠' },
    { name: '技能書(普通)', quantity: gameState.resources[Currency.SKILL_BOOK_NORMAL], icon: '📚' },
    { name: '技能書(高級)', quantity: gameState.resources[Currency.SKILL_BOOK_ADVANCED], icon: '📖' },
    { name: '強化石', quantity: gameState.resources[Currency.ENHANCEMENT_STONE], icon: '⛏️' },
    { name: '寵物零食', quantity: gameState.resources[Currency.PET_FOOD], icon: '🍖' },
    { name: '符文塵埃', quantity: gameState.resources[Currency.RUNE_DUST], icon: '💨' },
  ];
  const specialItems = [
    { name: '英雄召喚券', quantity: gameState.resources[Currency.GACHA_TICKET], icon: '🎟️H' },
    { name: '裝備召喚券', quantity: gameState.resources[Currency.EQUIPMENT_TICKET], icon: '🎟️E' },
    { name: '寵物召喚券', quantity: gameState.resources[Currency.PET_TICKET], icon: '🎟️P' },
    { name: '符文召喚券', quantity: gameState.resources[Currency.RUNE_TICKET], icon: '🎟️R' },
    { name: '掃蕩券', quantity: 0, icon: '🧹' },
  ];

  const CategoryButton: React.FC<{catId: ItemCategory, text: string}> = ({catId, text}) => (
    <Button variant={activeCategory === catId ? 'primary' : 'ghost'} onClick={() => setActiveCategory(catId)} size="sm" className="flex-1 text-xs md:text-sm">{text}</Button>
  );

  const getCharacterEquippedWith = (itemId: string): string | null => {
    for (const char of gameState.characters) {
        if(Object.values(char.equipment).includes(itemId)) return char.name;
        if(char.runes.includes(itemId)) return char.name;
    }
    return null;
  }
  
  const getCharacterWithPet = (petId: string): string | null => {
    const character = gameState.characters.find(char => char.assignedPetId === petId);
    return character ? character.name : null;
  }


  return (
    <div className="flex flex-col h-full">
      {/* <TopBar /> Removed */}
      <div className="p-4 flex-grow"> {/* Standardized to p-4 */}
        <h1 className="text-xl md:text-2xl font-bold text-yellow-400 mb-4 text-center">我的背包</h1>

        <div className="flex space-x-1 mb-4">
            <CategoryButton catId="consumable" text="消耗品" />
            <CategoryButton catId="material" text="材料" />
            <CategoryButton catId="special" text="特殊" />
            <CategoryButton catId="equipment" text="裝備" />
            <CategoryButton catId="pet" text="寵物" />
            <CategoryButton catId="rune" text="符文" />
        </div>

        {activeCategory === 'consumable' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
            {consumables.filter(item => item.quantity > 0).map(item => (
              <div key={item.name} className="bg-gray-700 p-3 rounded-lg shadow-md flex flex-col items-center text-center aspect-square justify-center">
                <span className="text-3xl mb-1">{item.icon}</span>
                <p className="text-sm font-medium text-gray-200">{item.name}</p>
                <p className="text-xs text-yellow-300">x {item.quantity.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
        {activeCategory === 'material' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
            {materials.filter(item => item.quantity > 0).map(item => (
              <div key={item.name} className="bg-gray-700 p-3 rounded-lg shadow-md flex flex-col items-center text-center aspect-square justify-center">
                <span className="text-3xl mb-1">{item.icon}</span>
                <p className="text-sm font-medium text-gray-200">{item.name}</p>
                <p className="text-xs text-yellow-300">x {item.quantity.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
        {activeCategory === 'special' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
            {specialItems.filter(item => item.quantity > 0).map(item => (
              <div key={item.name} className="bg-gray-700 p-3 rounded-lg shadow-md flex flex-col items-center text-center aspect-square justify-center">
                <span className="text-3xl mb-1">{item.icon}</span>
                <p className="text-sm font-medium text-gray-200">{item.name}</p>
                <p className="text-xs text-yellow-300">x {item.quantity.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}

        {activeCategory === 'equipment' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                {gameState.ownedEquipment.sort((a,b) => b.rarity.localeCompare(a.rarity) || b.enhancementLevel - a.enhancementLevel).map(eq => {
                    const equippedBy = getCharacterEquippedWith(eq.uniqueId);
                    return (
                    <div key={eq.uniqueId} className={`p-2 rounded-md border-2 ${RARITY_COLORS[eq.rarity]} bg-gray-700`}>
                        <p className="font-semibold text-sm">{eq.emoji} {eq.name} <span className="text-xs">({EQUIPMENT_SLOT_NAMES[eq.slot]})</span> +{eq.enhancementLevel}</p>
                        <p className="text-xs text-gray-300">基礎: {Object.entries(eq.baseStats).map(([k,v]) => `${STAT_NAMES_CHINESE[k] || k}: ${v}`).join(', ')}</p>
                        {equippedBy && <p className="text-xs text-cyan-300">裝備於: {equippedBy}</p>}
                    </div>
                );
                })}
                {gameState.ownedEquipment.length === 0 && <p className="text-gray-400 text-center col-span-full">沒有任何裝備</p>}
            </div>
        )}
         {activeCategory === 'pet' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
                {gameState.ownedPets.map(pet => {
                    const petStatsDisplay = Object.entries(pet.globalStatsBoost).map(([statKeyUntyped, baseValueAtL1]) => {
                        const statKey = statKeyUntyped as PetStatBoostKey;
                        const increasePerLevel = pet.statIncreasePerLevel?.[statKey] || 0;
                        const totalStatBoostValue = baseValueAtL1 + (increasePerLevel * (pet.level - 1));
                        return `${STAT_NAMES_CHINESE[statKey] || statKey} +${totalStatBoostValue.toFixed(statKey.includes('_perc') ? 1 : 0)}${statKey.includes('_perc') ? '%' : ''}`;
                    }).join(', ');
                    const assignedToHeroName = getCharacterWithPet(pet.uniqueId);

                    return (
                    <div key={pet.uniqueId} className={`p-2 rounded-md border-2 ${RARITY_COLORS[pet.rarity]} bg-gray-700 text-center aspect-square flex flex-col justify-center items-center`}>
                        <p className="text-3xl">{pet.emoji}</p>
                        <p className="font-semibold text-sm">{pet.name} (Lv.{pet.level})</p>
                        <p className="text-xs text-gray-300">
                            {petStatsDisplay}
                        </p>
                        {assignedToHeroName && <p className="text-xs text-cyan-300">(裝備於: {assignedToHeroName})</p>}
                    </div>
                );
                })}
                {gameState.ownedPets.length === 0 && <p className="text-gray-400 text-center col-span-full">沒有任何寵物</p>}
            </div>
        )}
         {activeCategory === 'rune' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
                {gameState.ownedRunes.map(rune => {
                     const equippedBy = getCharacterEquippedWith(rune.uniqueId);
                    return(
                    <div key={rune.uniqueId} className={`p-2 rounded-md border-2 ${RARITY_COLORS[rune.rarity]} bg-gray-700 text-center aspect-square flex flex-col justify-center items-center`}>
                        <p className="text-3xl">{rune.emoji}</p>
                        <p className="font-semibold text-sm">{rune.name} (Lv.{rune.level})</p>
                        <p className="text-xs text-gray-300">{STAT_NAMES_CHINESE[rune.currentMainStat.type] || rune.currentMainStat.type}: {rune.currentMainStat.value}{rune.currentMainStat.type.includes('perc') ? '%' : ''}</p>
                        {equippedBy && <p className="text-xs text-cyan-300">裝備於: {equippedBy}</p>}
                    </div>
                );
                })}
                {gameState.ownedRunes.length === 0 && <p className="text-gray-400 text-center col-span-full">沒有任何符文</p>}
            </div>
        )}
      </div>
    </div>
  );
};

export default InventoryScreen;
