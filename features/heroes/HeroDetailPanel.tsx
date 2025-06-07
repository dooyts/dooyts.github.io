
import React, { useState } from 'react';
import { OwnedCharacter, Currency, EquipmentSlot, OwnedSkill, OwnedEquipmentItem, OwnedPet, OwnedRune, RuneSlotType, BaseSkill, ComputedCharacterStats, CharacterRarity, PetStatBoostKey } from '../../types';
import { useGame } from '../../contexts/GameContext';
import Button from '../../components/Button';
import Modal from '../../components/Modal'; // For selecting items
import { MAX_CHARACTER_LEVEL_BY_STARS, SHARDS_PER_STAR, LEVEL_UP_EXP_COST_BASE, LEVEL_UP_GOLD_COST_BASE, BASE_SKILLS_DATA } from '../../constants/characterConstants';
import { EQUIPMENT_SLOT_NAMES, RARITY_COLORS, ELEMENT_COLORS, CURRENCY_NAMES, CURRENCY_EMOJIS, STAT_NAMES_CHINESE } from '../../constants/uiConstants';
import { EQUIPMENT_ENHANCEMENT_COST } from '../../constants/equipmentConstants';
import { PET_ENHANCEMENT_COST, MAX_PET_LEVEL } from '../../constants/petConstants';
import { RUNE_ENHANCEMENT_COST, MAX_RUNE_LEVEL } from '../../constants/runeConstants';
import { MAX_HEROES_IN_BATTLE_TEAM, VIP_LEVELS } from '../../constants/gameplayConstants';
import { getCharacterComputedStats as getCharacterComputedStatsLib, calculateCharacterPower as calculateCharacterPowerLib } from '../../lib/game-logic/characterManager';


interface HeroDetailPanelProps {
  hero: OwnedCharacter;
  onClose: () => void;
}

export const HeroDetailPanel: React.FC<HeroDetailPanelProps> = ({ hero, onClose }) => {
  const {
    levelUpCharacter, starUpCharacter, upgradeSkill, canAfford, gameState,
    getUnequippedEquipmentBySlot, equipItem, unequipItem, enhanceEquipment, getOwnedEquipmentItemByUniqueId,
    assignPet, getOwnedPetByUniqueId, enhancePet,
    getUnequippedRunes, equipRune, unequipRune, getOwnedRuneByUniqueId, enhanceRune,
    assignHeroToBattleSlot, getCharacterById
  } = useGame();

  const [activeTab, setActiveTab] = useState<'attributes' | 'skills' | 'equipment' | 'pets' | 'runes'>('attributes');
  const [equipmentSelectionModal, setEquipmentSelectionModal] = useState<{isOpen: boolean, slot: EquipmentSlot | null}>({isOpen: false, slot: null});
  const [runeSelectionModal, setRuneSelectionModal] = useState<{isOpen: boolean, slotIndex: number | null}>({isOpen: false, slotIndex: null});
  const [petSelectionModal, setPetSelectionModal] = useState<boolean>(false);
  const [assignTeamSlotModalOpen, setAssignTeamSlotModalOpen] = useState<boolean>(false);


  const maxLevelForStars = MAX_CHARACTER_LEVEL_BY_STARS[hero.stars];
  const expToNextLevel = LEVEL_UP_EXP_COST_BASE * Math.pow(1.2, hero.level -1);
  const goldToNextLevel = LEVEL_UP_GOLD_COST_BASE * Math.pow(1.1, hero.level -1);
  const canLevelUpHero = hero.level < maxLevelForStars && canAfford(Currency.EXP_POTION, expToNextLevel) && canAfford(Currency.GOLD, goldToNextLevel);

  const shardsForNextStar = SHARDS_PER_STAR[hero.stars + 1];
  const breakthroughStonesForNextStar = hero.stars * 50;
  const canStarUpHero = hero.stars < 7 && hero.shards >= (shardsForNextStar || Infinity) && canAfford(Currency.BREAKTHROUGH_STONE, breakthroughStonesForNextStar);

  const rarityStyle = RARITY_COLORS[hero.rarity] || 'text-gray-400';
  const elementStyle = ELEMENT_COLORS[hero.element] || 'bg-gray-500';

  const isHeroInBattleTeam = gameState.battleTeamSlots.includes(hero.id);
  
  const computedStats: ComputedCharacterStats = getCharacterComputedStatsLib(
    hero, 
    gameState, 
    VIP_LEVELS
  );
  const power = calculateCharacterPowerLib(hero, gameState, VIP_LEVELS);


  const TabButton: React.FC<{tabId: typeof activeTab, text: string}> = ({tabId, text}) => (
    <Button variant={activeTab === tabId ? 'primary' : 'ghost'} onClick={() => setActiveTab(tabId)} size="sm" className="flex-1">{text}</Button>
  );

  const handleEquipItem = (slot: EquipmentSlot) => {
    setEquipmentSelectionModal({isOpen: true, slot});
  };
  const handleSelectEquipmentToEquip = (eqUniqueId: string) => {
    if (equipmentSelectionModal.slot) {
        equipItem(hero.id, eqUniqueId);
    }
    setEquipmentSelectionModal({isOpen: false, slot: null});
  };

  const handleEquipRune = (slotIndex: number) => {
    setRuneSelectionModal({isOpen: true, slotIndex});
  };
  const handleSelectRuneToEquip = (runeUniqueId: string) => {
    if (runeSelectionModal.slotIndex !== null) {
        equipRune(hero.id, runeUniqueId, runeSelectionModal.slotIndex);
    }
    setRuneSelectionModal({isOpen: false, slotIndex: null});
  };

  const handleSelectPet = (petUniqueId: string | null) => {
    assignPet(hero.id, petUniqueId); // Assign pet to the current hero
    setPetSelectionModal(false);
  }
  const currentHeroPet = hero.assignedPetId ? getOwnedPetByUniqueId(hero.assignedPetId) : null;
  const canEnhanceCurrentHeroPet = currentHeroPet && currentHeroPet.level < MAX_PET_LEVEL && Object.entries(PET_ENHANCEMENT_COST(currentHeroPet.level + 1, currentHeroPet.rarity)).every(([curr, val]) => canAfford(curr as Currency, val as number));


  const handleAssignToTeamSlot = (slotIndex: number) => {
    assignHeroToBattleSlot(hero.id, slotIndex);
    setAssignTeamSlotModalOpen(false);
  }


  return (
    <div className="p-1 text-sm">
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="w-32 h-32 rounded-lg border-2 border-gray-600 mx-auto md:mx-0 flex items-center justify-center text-6xl bg-gray-700">
            {hero.spriteEmoji}
        </div>
        <div className="flex-1">
          <h2 className={`text-2xl font-bold ${rarityStyle.split(' ')[0]}`}>{hero.name}</h2>
          <p className="text-gray-400">稀有度: {hero.rarity} | <span className={`px-1.5 py-0.5 text-xs rounded ${elementStyle}`}>{hero.element}</span></p>
          <p className="text-gray-300">等級: {hero.level} / {maxLevelForStars}</p>
          <p className="text-gray-300">星級: {'★'.repeat(hero.stars)} {'☆'.repeat(7-hero.stars)}</p>
          <p className="text-yellow-400 font-semibold">戰力: {power.toLocaleString()}</p>
          <Button 
            variant={isHeroInBattleTeam ? "secondary" : "special"} 
            size="sm" 
            className="mt-2 w-full md:w-auto"
            onClick={() => {
                if(!isHeroInBattleTeam) setAssignTeamSlotModalOpen(true)
            }}
            disabled={isHeroInBattleTeam && !gameState.battleTeamSlots.some(s => s === null)}
          >
            {isHeroInBattleTeam ? '已在戰隊' : '設為戰隊成員'}
          </Button>
        </div>
      </div>

      <div className="flex space-x-1 mb-3">
        <TabButton tabId="attributes" text="屬性強化"/>
        <TabButton tabId="skills" text="技能"/>
        <TabButton tabId="equipment" text="裝備"/>
        <TabButton tabId="pets" text="寵物"/>
        <TabButton tabId="runes" text="符文"/>
      </div>

      {activeTab === 'attributes' && (
        <div className="space-y-3 mb-4">
            <div>
            <h4 className="font-semibold text-gray-200">等級提升:</h4>
            {hero.level < maxLevelForStars ? (
                <> <p className="text-xs text-gray-400">消耗: {CURRENCY_EMOJIS[Currency.EXP_POTION]}{expToNextLevel.toFixed(0)} {CURRENCY_NAMES[Currency.EXP_POTION]}, {CURRENCY_EMOJIS[Currency.GOLD]}{goldToNextLevel.toFixed(0)} {CURRENCY_NAMES[Currency.GOLD]}</p>
                <Button onClick={() => levelUpCharacter(hero.id)} disabled={!canLevelUpHero} size="sm" variant="primary" className="w-full mt-1">提升等級</Button> </>
            ) : ( <p className="text-xs text-green-400">已達目前星級最高等級！</p> )}
            </div>
            <div>
            <h4 className="font-semibold text-gray-200">星級提升:</h4>
            {hero.stars < 7 ? (
                <> <p className="text-xs text-gray-400">碎片: {hero.shards} / {shardsForNextStar || 'MAX'}</p>
                <p className="text-xs text-gray-400">消耗: {CURRENCY_EMOJIS[Currency.BREAKTHROUGH_STONE]}{breakthroughStonesForNextStar} {CURRENCY_NAMES[Currency.BREAKTHROUGH_STONE]}</p>
                <Button onClick={() => starUpCharacter(hero.id)} disabled={!canStarUpHero} size="sm" variant="special" className="w-full mt-1">提升星級 ({hero.stars}★ → {hero.stars+1}★)</Button> </>
            ) : ( <p className="text-xs text-green-400">已達最高星級！</p> )}
            </div>
             <div className="text-xs text-gray-400 mt-3 border-t border-gray-700 pt-2">
                <p>生命: {computedStats.hp.toLocaleString()}, 攻擊: {computedStats.atk.toLocaleString()}, 防禦: {computedStats.def.toLocaleString()}, 速度: {computedStats.spd.toLocaleString()}</p>
                <p>暴擊率: {computedStats.critRate.toFixed(1)}%, 暴擊傷害: {computedStats.critDmg.toFixed(1)}%</p>
                <p>命中率: {computedStats.accuracy.toFixed(1)}%, 閃避率: {computedStats.evasion.toFixed(1)}%</p>
                <p className="mt-2">{CURRENCY_EMOJIS[Currency.EXP_POTION]} {CURRENCY_NAMES[Currency.EXP_POTION]}: {gameState.resources[Currency.EXP_POTION].toLocaleString()}</p>
                <p>{CURRENCY_EMOJIS[Currency.GOLD]} {CURRENCY_NAMES[Currency.GOLD]}: {gameState.resources[Currency.GOLD].toLocaleString()}</p>
                <p>{CURRENCY_EMOJIS[Currency.BREAKTHROUGH_STONE]} {CURRENCY_NAMES[Currency.BREAKTHROUGH_STONE]}: {gameState.resources[Currency.BREAKTHROUGH_STONE].toLocaleString()}</p>
            </div>
        </div>
      )}

      {activeTab === 'skills' && (
        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-2">
            <h4 className="font-semibold text-gray-200 mb-2">技能列表:</h4>
            {hero.skills.map((skill: OwnedSkill) => {
                let canUpgradeSkill = skill.currentLevel < skill.maxLevel;
                let costString = "無法升級或已滿級";
                
                const baseSkillDef = BASE_SKILLS_DATA[skill.id];
                let actualUpgradeCostFn = skill.upgradeCost;

                if (typeof actualUpgradeCostFn !== 'function' && baseSkillDef && typeof baseSkillDef.upgradeCost === 'function') {
                    actualUpgradeCostFn = baseSkillDef.upgradeCost;
                }

                if (typeof actualUpgradeCostFn !== 'function') {
                    console.error(`HeroDetailPanel: Skill ${skill.id} (Hero: ${hero.name}) 'upgradeCost' is not a function and not found in BASE_SKILLS_DATA. This is unexpected and might indicate a data issue.`);
                    costString = "升級費用資訊錯誤";
                    canUpgradeSkill = false;
                } else {
                    const costs = actualUpgradeCostFn(skill.currentLevel + 1);
                    if (Object.keys(costs).length > 0 && skill.currentLevel < skill.maxLevel) {
                        costString = Object.entries(costs).map(([curr, val]) => {
                            if (!canAfford(curr as Currency, val as number)) canUpgradeSkill = false;
                            return `${CURRENCY_EMOJIS[curr as Currency] || ''} ${val} ${CURRENCY_NAMES[curr as Currency] || curr}`;
                        }).join(', ');
                    } else if (skill.currentLevel >= skill.maxLevel) {
                        costString = "已達最高等級";
                        canUpgradeSkill = false;
                    }
                }

                let currentEffectsDesc = "";
                let actualUpgradeEffectFn = skill.upgradeEffect;
                if (typeof actualUpgradeEffectFn !== 'function' && baseSkillDef && typeof baseSkillDef.upgradeEffect === 'function') {
                    actualUpgradeEffectFn = baseSkillDef.upgradeEffect;
                }

                if (actualUpgradeEffectFn && typeof actualUpgradeEffectFn === 'function') {
                    const effectsAtLevel = actualUpgradeEffectFn(skill.currentLevel);
                    let parts = [];
                    if (effectsAtLevel.damageMultiplier) parts.push(`傷害倍率: ${(effectsAtLevel.damageMultiplier * 100).toFixed(0)}%`);
                    if (effectsAtLevel.cooldownReductionEffect?.amount && skill.cooldown) parts.push(`冷卻: ${skill.cooldown - effectsAtLevel.cooldownReductionEffect.amount}回合`);
                    else if (skill.cooldown) parts.push(`冷卻: ${skill.cooldown}回合`);
                    if (effectsAtLevel.applyStatusEffects && effectsAtLevel.applyStatusEffects[0]?.chance) parts.push(`效果機率: ${(effectsAtLevel.applyStatusEffects[0].chance * 100).toFixed(0)}%`);
                    if (effectsAtLevel.applyStatusEffects && effectsAtLevel.applyStatusEffects[0]?.duration) parts.push(`持續時間: ${effectsAtLevel.applyStatusEffects[0].duration}回合`);
                    if (parts.length > 0) currentEffectsDesc = `目前效果: ${parts.join(', ')}`;
                } else if (skill.upgradeEffect) { 
                     console.warn(`HeroDetailPanel: Skill ${skill.id} (Hero: ${hero.name}) 'upgradeEffect' exists but is not a function, and not found in BASE_SKILLS_DATA.`);
                }


                return (
                    <div key={skill.id} className="p-2 bg-gray-700 rounded">
                        <div className="flex justify-between items-start">
                            <p className="font-semibold text-yellow-300">{skill.emoji} {skill.name} (Lv.{skill.currentLevel}/{skill.maxLevel})</p>
                            {skill.currentLevel < skill.maxLevel && <Button size="sm" variant="primary" onClick={() => upgradeSkill(hero.id, skill.id)} disabled={!canUpgradeSkill}>升級</Button>}
                        </div>
                        <p className="text-xs text-gray-300">{skill.description}</p>
                        {currentEffectsDesc && <p className="text-xs text-cyan-300 mt-1">{currentEffectsDesc}</p>}
                        {skill.currentLevel < skill.maxLevel && <p className="text-xs text-gray-400 mt-1">升級消耗: {costString}</p>}
                    </div>
                );
            })}
            {hero.skills.length === 0 && <p className="text-xs text-gray-500">此英雄暫無技能。</p>}
        </div>
      )}

      {activeTab === 'equipment' && (
        <div className="space-y-2 mb-4">
            <h4 className="font-semibold text-gray-200 mb-2">裝備欄位:</h4>
            {Object.values(EquipmentSlot).map(slot => {
                const equippedItemId = hero.equipment[slot];
                const equippedItem = equippedItemId ? getOwnedEquipmentItemByUniqueId(equippedItemId) : null;
                const canEnhance = equippedItem && equippedItem.enhancementLevel < equippedItem.maxEnhancement && Object.entries(EQUIPMENT_ENHANCEMENT_COST(equippedItem.enhancementLevel+1, equippedItem.rarity)).every(([curr,val]) => canAfford(curr as Currency, val as number));
                return (
                    <div key={slot} className="p-2 bg-gray-700 rounded">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-300">{EQUIPMENT_SLOT_NAMES[slot]}:</span>
                            {equippedItem ?
                                <span className="text-green-400">{equippedItem.emoji} {equippedItem.name} (+{equippedItem.enhancementLevel})</span> :
                                <span className="text-gray-500">(空)</span>
                            }
                        </div>
                        <div className="flex gap-1 mt-1">
                            {equippedItem ? (
                                <>
                                 <Button size="sm" variant="secondary" onClick={() => unequipItem(hero.id, slot)} className="flex-1">卸下</Button>
                                 <Button size="sm" variant="primary" onClick={() => enhanceEquipment(equippedItem.uniqueId)} disabled={!canEnhance} className="flex-1">強化</Button>
                                </>
                            ): (
                                <Button size="sm" variant="primary" onClick={() => handleEquipItem(slot)} className="w-full">裝備</Button>
                            )}
                        </div>
                        {equippedItem && equippedItem.enhancementLevel < equippedItem.maxEnhancement && (
                             <p className="text-xs text-gray-400 mt-1">強化消耗: {Object.entries(EQUIPMENT_ENHANCEMENT_COST(equippedItem.enhancementLevel+1, equippedItem.rarity)).map(([c,v])=>`${CURRENCY_EMOJIS[c as Currency] || ''}${v} ${CURRENCY_NAMES[c as Currency] || c}`).join(', ')}</p>
                        )}
                    </div>
                );
            })}
        </div>
      )}
       {activeTab === 'pets' && (
        <div className="p-2 bg-gray-700 rounded text-center">
            <h4 className="font-semibold text-gray-200 mb-2">{hero.name} 的寵物:</h4>
            {currentHeroPet ? (
                 <div>
                    <p className="text-2xl">{currentHeroPet.emoji}</p>
                    <p className="text-lg font-semibold text-yellow-300">{currentHeroPet.name} (Lv.{currentHeroPet.level}/{MAX_PET_LEVEL})</p>
                    <p className="text-xs text-gray-400">
                        提供: {Object.entries(currentHeroPet.globalStatsBoost).map(([statKey, baseValueAtL1]) => {
                             const increasePerLevel = currentHeroPet.statIncreasePerLevel?.[statKey as keyof typeof currentHeroPet.statIncreasePerLevel] || 0;
                             const totalStatBoostValue = baseValueAtL1 + (increasePerLevel * (currentHeroPet.level - 1));
                             return `${STAT_NAMES_CHINESE[statKey] || statKey} +${totalStatBoostValue.toFixed(statKey.includes('_perc') ? 1 : 0)}${statKey.includes('_perc') ? '%' : ''}`;
                        }).join(', ')}
                    </p>
                    <div className="flex gap-1 mt-2">
                        <Button size="sm" variant="secondary" onClick={() => handleSelectPet(null)} className="flex-1">卸下</Button>
                        <Button size="sm" variant="primary" onClick={() => setPetSelectionModal(true)} className="flex-1">更換</Button>
                    </div>
                    {currentHeroPet.level < MAX_PET_LEVEL && (
                        <>
                            <Button size="sm" variant="special" onClick={() => enhancePet(currentHeroPet.uniqueId)} disabled={!canEnhanceCurrentHeroPet} className="w-full mt-2">
                                強化寵物
                            </Button>
                            <p className="text-xs text-gray-400 mt-1">強化消耗: {Object.entries(PET_ENHANCEMENT_COST(currentHeroPet.level+1, currentHeroPet.rarity)).map(([c,v])=>`${CURRENCY_EMOJIS[c as Currency] || ''}${v} ${CURRENCY_NAMES[c as Currency] || c}`).join(', ')}</p>
                        </>
                    )}
                 </div>
            ) : (
                 <Button size="md" variant="primary" onClick={() => setPetSelectionModal(true)} className="w-full">指派寵物</Button>
            )}
        </div>
       )}
        {activeTab === 'runes' && (
         <div className="space-y-1 mb-4">
            <h4 className="font-semibold text-gray-200 mb-2">符文 ({hero.runes.filter(r => r !== null).length}/9):</h4>
            <div className="grid grid-cols-3 gap-1">
            {hero.runes.map((runeId, index) => {
                const rune = runeId ? getOwnedRuneByUniqueId(runeId) : null;
                const canEnhanceCurrentRune = rune && rune.level < MAX_RUNE_LEVEL && Object.entries(RUNE_ENHANCEMENT_COST(rune.level + 1, rune.rarity)).every(([curr, val]) => canAfford(curr as Currency, val as number));
                return (
                    <div key={index} className="p-1.5 bg-gray-700 rounded aspect-square flex flex-col items-center justify-center">
                        {rune ? (
                            <>
                            <span className="text-xl">{rune.emoji}</span>
                            <p className="text-[10px] text-center leading-tight font-semibold text-yellow-200">{rune.name} (Lv.{rune.level}/{MAX_RUNE_LEVEL})</p>
                            <p className="text-[9px] text-gray-300">{STAT_NAMES_CHINESE[rune.currentMainStat.type] || rune.currentMainStat.type}: {rune.currentMainStat.value.toFixed(rune.currentMainStat.type.includes('_perc') ? 1 : 0)}{rune.currentMainStat.type.includes('perc') ? '%' : ''}</p>
                            <div className="flex gap-0.5 mt-0.5 w-full">
                                <Button size="sm" variant="ghost" className="!p-0.5 !text-[10px] flex-1" onClick={() => unequipRune(hero.id, index)}>卸下</Button>
                                {rune.level < MAX_RUNE_LEVEL && 
                                    <Button size="sm" variant="primary" className="!p-0.5 !text-[10px] flex-1" onClick={() => enhanceRune(rune.uniqueId)} disabled={!canEnhanceCurrentRune}>強化</Button>
                                }
                            </div>
                            {rune.level < MAX_RUNE_LEVEL && 
                                <p className="text-[8px] text-gray-400 mt-0.5 leading-tight">消耗: {Object.entries(RUNE_ENHANCEMENT_COST(rune.level+1, rune.rarity)).map(([c,v])=>`${CURRENCY_EMOJIS[c as Currency] || ''}${v}`).join(' ')}</p>
                            }
                            </>
                        ) : (
                            <Button size="sm" variant="ghost" className="w-full h-full text-2xl" onClick={() => handleEquipRune(index)}>+</Button>
                        )}
                    </div>
                );
            })}
            </div>
        </div>
       )}

      <Button onClick={onClose} variant="secondary" className="w-full mt-4">關閉</Button>

      <Modal isOpen={equipmentSelectionModal.isOpen} onClose={() => setEquipmentSelectionModal({isOpen: false, slot: null})} title={`選擇${equipmentSelectionModal.slot ? EQUIPMENT_SLOT_NAMES[equipmentSelectionModal.slot] : ''}裝備`} size="md">
        <div className="max-h-60 overflow-y-auto space-y-2">
            {equipmentSelectionModal.slot && getUnequippedEquipmentBySlot(equipmentSelectionModal.slot).map(eq => {
                const currentStatsDisplay = Object.entries(eq.baseStats)
                    .map(([statKey, baseValue]) => {
                        const statIncreasePerLevel = eq.statIncreasePerEnhancement[statKey as keyof typeof eq.statIncreasePerEnhancement] || 0;
                        const totalValue = (baseValue || 0) + (statIncreasePerLevel * eq.enhancementLevel);
                        return `${STAT_NAMES_CHINESE[statKey] || statKey}:${totalValue}`;
                    })
                    .join(', ');

                return (
                    <Button key={eq.uniqueId} variant="ghost" className="w-full justify-start text-left" onClick={() => handleSelectEquipmentToEquip(eq.uniqueId)}>
                        {eq.emoji} {eq.name} (+{eq.enhancementLevel}) - {currentStatsDisplay}
                    </Button>
                );
            })}
            {equipmentSelectionModal.slot && getUnequippedEquipmentBySlot(equipmentSelectionModal.slot).length === 0 && <p className="text-gray-400 text-center">此欄位無可用裝備</p>}
        </div>
      </Modal>

      <Modal isOpen={runeSelectionModal.isOpen} onClose={() => setRuneSelectionModal({isOpen:false, slotIndex: null})} title={`選擇符文 (欄位 ${runeSelectionModal.slotIndex !== null ? runeSelectionModal.slotIndex + 1 : ''})`} size="md">
        <div className="max-h-60 overflow-y-auto space-y-2">
            {getUnequippedRunes().map(rune => (
                 <Button key={rune.uniqueId} variant="ghost" className="w-full justify-start text-left" onClick={() => handleSelectRuneToEquip(rune.uniqueId)}>
                    {rune.emoji} {rune.name} (Lv.{rune.level}) - {STAT_NAMES_CHINESE[rune.currentMainStat.type] || rune.currentMainStat.type}: {rune.currentMainStat.value.toFixed(rune.currentMainStat.type.includes('_perc') ? 1 : 0)}{rune.currentMainStat.type.includes('perc') ? '%' : ''}
                </Button>
            ))}
            {getUnequippedRunes().length === 0 && <p className="text-gray-400 text-center">無可用符文</p>}
        </div>
      </Modal>

      <Modal isOpen={petSelectionModal} onClose={() => setPetSelectionModal(false)} title={`為 ${hero.name} 選擇寵物`} size="md">
        <div className="max-h-60 overflow-y-auto space-y-2">
            {gameState.ownedPets.map(pet => {
                const petStatsDisplay = Object.entries(pet.globalStatsBoost).map(([statKey, baseValueAtL1]) => {
                    const increasePerLevel = pet.statIncreasePerLevel?.[statKey as PetStatBoostKey] || 0;
                    const totalStatBoostValue = baseValueAtL1 + (increasePerLevel * (pet.level - 1));
                    return `${STAT_NAMES_CHINESE[statKey] || statKey} +${totalStatBoostValue.toFixed(statKey.includes('_perc') ? 1 : 0)}${statKey.includes('_perc') ? '%' : ''}`;
                }).join(', ');
                 const isAssignedToCurrentHero = hero.assignedPetId === pet.uniqueId;
                 const assignedToOtherHero = gameState.characters.find(c => c.id !== hero.id && c.assignedPetId === pet.uniqueId);

                return (
                    <Button 
                        key={pet.uniqueId} 
                        variant={isAssignedToCurrentHero ? "special" : "primary"} 
                        className={`w-full justify-start text-left ${assignedToOtherHero ? 'opacity-60' : ''}`}
                        onClick={() => handleSelectPet(pet.uniqueId)}
                        disabled={!!assignedToOtherHero && !isAssignedToCurrentHero}
                        title={assignedToOtherHero ? `已裝備於 ${assignedToOtherHero.name}` : ''}
                    >
                        {pet.emoji} {pet.name} (Lv.{pet.level}) - {petStatsDisplay}
                        {assignedToOtherHero && <span className="ml-auto text-xs text-gray-400">(裝於{assignedToOtherHero.name})</span>}
                    </Button>
                );
            })}
            {gameState.ownedPets.length === 0 && <p className="text-gray-400 text-center">沒有任何寵物</p>}
        </div>
      </Modal>

      <Modal isOpen={assignTeamSlotModalOpen} onClose={() => setAssignTeamSlotModalOpen(false)} title="選擇戰隊欄位" size="sm">
        <div className="space-y-2">
            {Array.from({length: MAX_HEROES_IN_BATTLE_TEAM}).map((_, slotIndex) => {
                 const heroInSlot = gameState.battleTeamSlots[slotIndex] ? getCharacterById(gameState.battleTeamSlots[slotIndex]!) : null;
                return (
                <Button 
                    key={slotIndex}
                    variant="ghost"
                    className="w-full justify-between"
                    onClick={() => handleAssignToTeamSlot(slotIndex)}
                    disabled={gameState.battleTeamSlots[slotIndex] === hero.id}
                >
                    <span>欄位 {slotIndex + 1}</span>
                    {heroInSlot && <span className="text-xs text-gray-400">{heroInSlot.spriteEmoji} {heroInSlot.name}</span>}
                    {!heroInSlot && <span className="text-xs text-green-400">(空)</span>}
                </Button>
            );
            })}
        </div>
      </Modal>

    </div>
  );
};
