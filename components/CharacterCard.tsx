
import React from 'react';
import { OwnedCharacter, CharacterRarity } from '../types';
import { RARITY_COLORS, ELEMENT_COLORS, STAT_NAMES_CHINESE } from '../constants/uiConstants';
import { MAX_CHARACTER_LEVEL_BY_STARS, SHARDS_PER_STAR } from '../constants/characterConstants';
import { useGame } from '../contexts/GameContext';
import RedDot from './RedDot';
import { getCharacterComputedStats as getCharacterComputedStatsLib, calculateCharacterPower as calculateCharacterPowerLib } from '../lib/game-logic/characterManager';
import { VIP_LEVELS } from '../constants/gameplayConstants';


interface CharacterCardProps {
  character: OwnedCharacter;
  onClick?: () => void;
  showDetails?: boolean;
}

const CharacterCard: React.FC<CharacterCardProps> = ({ character, onClick, showDetails = false }) => {
  const { gameState, checkRedDot } = useGame(); // Removed context versions of calculateCharacterPower, etc.
  const rarityStyle = RARITY_COLORS[character.rarity] || 'border-gray-500';
  const elementStyle = ELEMENT_COLORS[character.element] || 'bg-gray-500';
  const maxLevelForStars = MAX_CHARACTER_LEVEL_BY_STARS[character.stars];
  const shardsForNextStar = SHARDS_PER_STAR[character.stars + 1] || Infinity;
  
  const hasLevelOrStarUpgrade = checkRedDot('hero_upgrade', character.id);
  const hasSkillUpgrade = checkRedDot('hero_skill_upgrade', character.id);
  const hasAnyUpgrade = hasLevelOrStarUpgrade || hasSkillUpgrade;

  // Use lib functions directly with gameState from context
  const computedStats = showDetails 
    ? getCharacterComputedStatsLib(character, gameState, VIP_LEVELS) 
    : null;
  const power = calculateCharacterPowerLib(character, gameState, VIP_LEVELS);


  return (
    <div
      className={`relative bg-gray-700 p-3 rounded-lg shadow-lg border-2 ${rarityStyle} hover:shadow-xl transition-shadow cursor-pointer transform hover:scale-105`}
      onClick={onClick}
    >
      {hasAnyUpgrade && <RedDot className="absolute -top-1 -right-1" />}
      <div className="flex items-center space-x-3">
        <div className="w-16 h-16 rounded-md border border-gray-600 flex items-center justify-center text-4xl bg-gray-600">
            {character.spriteEmoji}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h3 className={`text-lg font-bold ${RARITY_COLORS[character.rarity]?.split(' ')[0]}`}>{character.name}</h3>
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full text-white ${elementStyle}`}>{character.element}</span>
          </div>
          <p className="text-xs text-gray-400">稀有度: {character.rarity} | 星級: {'★'.repeat(character.stars)}{'☆'.repeat(7-character.stars)}</p>
          <p className="text-xs text-gray-400">等級: {character.level}/{maxLevelForStars}</p>
          {showDetails && computedStats && (
             <>
              <p className="text-xs text-gray-400">戰力: {power.toLocaleString()}</p>
              <p className="text-xs text-gray-400">碎片: {character.shards} / {character.stars < 7 ? shardsForNextStar : 'MAX'}</p>
             </>
          )}
        </div>
      </div>
      {showDetails && computedStats && (
        <div className="mt-2 pt-2 border-t border-gray-600 text-xs">
            <p>生命: {computedStats.hp.toLocaleString()}, 攻擊: {computedStats.atk.toLocaleString()}, 防禦: {computedStats.def.toLocaleString()}, 速度: {computedStats.spd.toLocaleString()}</p>
            <p>暴擊率: {computedStats.critRate.toFixed(1)}%, 暴擊傷害: {computedStats.critDmg.toFixed(1)}%</p>
            <p>命中率: {computedStats.accuracy.toFixed(1)}%, 閃避率: {computedStats.evasion.toFixed(1)}%</p>
            {hasSkillUpgrade && <p className="text-yellow-400">有技能可升級!</p>}
        </div>
      )}
    </div>
  );
};

export default CharacterCard;
