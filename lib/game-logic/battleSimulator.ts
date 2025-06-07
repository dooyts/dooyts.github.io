
import {
  OwnedCharacter,
  Character,
  BaseSkill,
  ElementType,
  StatusEffectType,
  AppliedStatusEffect,
  ComputedCharacterStats,
  SkillEffectTargetting,
  GameState,
  OwnedSkill,
  AppliedBuffDebuff, // Added
  BuffDebuffStatEffectKey, // Added
  ArenaHeroPreview,
} from '../../types';
import { getCharacterComputedStats as getCharacterComputedStatsLib } from './characterManager'; // Renamed import
import * as CharacterManager from './characterManager';
import { VIP_LEVELS, ELEMENT_ADVANTAGE, MAX_TURNS_WORLD_BOSS_FIGHT } from '../../constants/gameplayConstants';
import { BASE_SKILLS_DATA } from '../../constants/characterConstants';
import { uuidv4 } from './utils';
import { ArenaNpcBattleDefinition } from './arenaManager'; // Import the new type


export interface BattleParticipant extends OwnedCharacter {
  currentHp: number;
  currentShield: number;
  skillCooldowns: Record<string, number>;
  battleStats: ComputedCharacterStats; // Dynamic stats including buffs/debuffs
  baseComputedStats: ComputedCharacterStats; // Stats before in-battle buffs/debuffs
  isPlayerTeam: boolean;
  battleId: string;
  // activeBuffDebuff is now on OwnedCharacter
}

export interface BattleState {
  playerTeam: BattleParticipant[];
  enemyTeam: BattleParticipant[];
  turnOrder: BattleParticipant[];
  currentActorIndex: number;
  turnNumber: number;
  battleLog: string[];
  isBattleOver: boolean;
  winner?: 'player' | 'enemy';
  // Add gameState to access VIP levels etc for getCharacterComputedStats
  _internalGameStateRef: GameState;
}

function getSkillDefinition(skillId: string): BaseSkill | undefined {
  const baseSkill = BASE_SKILLS_DATA[skillId];
  if (!baseSkill) return undefined;
  const defaultSkillShape: Partial<BaseSkill> = {
      target: 'enemy_single', 
  };
  return { ...defaultSkillShape, ...baseSkill, id: skillId } as BaseSkill;
}

// Helper to calculate stats with buffs/debuffs
function calculateDynamicBattleStats(
  baseStats: ComputedCharacterStats,
  activeEffect: AppliedBuffDebuff | null
): ComputedCharacterStats {
  const finalStats = { ...baseStats }; 

  if (activeEffect) {
    const { statAffected, value, duration, isBuff } = activeEffect;
    const multiplier = isBuff ? (1 + value / 100) : (1 - value / 100);

    const applyModification = (statName: keyof ComputedCharacterStats, val: number, isPercent: boolean, isPositive: boolean) => {
        if (isPercent) {
            finalStats[statName] = Math.floor(finalStats[statName] * (isPositive ? (1 + val / 100) : (1 - val / 100)));
        } else {
            finalStats[statName] = Math.floor(finalStats[statName] + (isPositive ? val : -val));
        }
    };

    if (statAffected === 'all_stats') {
        applyModification('hp', value, true, isBuff);
        applyModification('atk', value, true, isBuff);
        applyModification('def', value, true, isBuff);
        applyModification('spd', value, true, isBuff);
    } else if (statAffected === 'atk' || statAffected === 'attack_increase' || statAffected === 'attack_reduction') {
        applyModification('atk', value, true, isBuff);
    } else if (statAffected === 'def' || statAffected === 'defense_increase' || statAffected === 'defense_reduction') {
        applyModification('def', value, true, isBuff);
    } else if (statAffected === 'spd' || statAffected === 'speed_increase' || statAffected === 'speed_reduction') {
        applyModification('spd', value, true, isBuff);
    } else if (statAffected === 'critRate') {
        finalStats.critRate = parseFloat(Math.max(0, Math.min(100, finalStats.critRate + (isBuff ? value : -value))).toFixed(1));
    } else if (statAffected === 'critDmg') {
        finalStats.critDmg = parseFloat(Math.max(0, finalStats.critDmg + (isBuff ? value : -value)).toFixed(1));
    } else if (statAffected === 'evasion' || statAffected === 'evasion_increase') {
         finalStats.evasion = parseFloat(Math.max(0, finalStats.evasion + value).toFixed(1)); 
    } else if (statAffected === 'accuracy' || statAffected === 'accuracy_perc') { // Combined accuracy and accuracy_perc here for simplicity
         finalStats.accuracy = parseFloat(Math.max(0, finalStats.accuracy + (isBuff ? value : -value)).toFixed(1));
    }
     else if (statAffected === 'crit_chance_reduction' && !isBuff) { 
        finalStats.critRate = parseFloat(Math.max(0, finalStats.critRate - value).toFixed(1));
     }


    finalStats.hp = Math.max(1, finalStats.hp); 
    finalStats.atk = Math.max(1, finalStats.atk);
    finalStats.def = Math.max(1, finalStats.def);
    finalStats.spd = Math.max(1, finalStats.spd);
  }
  return finalStats;
}


export function initializeBattleState(
  playerHeroes: OwnedCharacter[],
  enemyDefinitions: (Character | ArenaNpcBattleDefinition)[], 
  gameState: GameState
): BattleState {
  const battleLog: string[] = [];
  battleLog.push("<span class='text-gray-400'>戰鬥初始化...</span>");

  const mapToBattleParticipant = (
    char: OwnedCharacter | Character | ArenaNpcBattleDefinition, 
    isPlayer: boolean, 
    index: number
  ): BattleParticipant => {
    
    let baseComputedStats: ComputedCharacterStats;
    let charSkills: OwnedSkill[];
    let charNameForLog: string = char.name;
    let charSpriteForLog: string = char.spriteEmoji;
    let charIdForBattle: string = char.id;
    let charElement: ElementType = char.element;
    let activeBuffDebuffForParticipant: AppliedBuffDebuff | null = null;
    let currentHpToUse: number;
    let isWorldBossParticipant = false;

    if (!isPlayer && 'arenaPreview' in char) { 
      const npcDef = char as ArenaNpcBattleDefinition;
      baseComputedStats = CharacterManager.getComputedStatsFromArenaHeroPreview(npcDef.arenaPreview, npcDef.npcVipLevelForBattle, VIP_LEVELS);
      charSkills = npcDef.skills as OwnedSkill[]; 
    } else if (!isPlayer && char.id.startsWith('wb_')) { // World Boss
        isWorldBossParticipant = true;
        const bossDefFromState = gameState.worldBoss!;
        baseComputedStats = { // Turn 1 stats for WB
            hp: bossDefFromState.maxHp, 
            atk: 1000, 
            def: 1000,
            spd: bossDefFromState.baseSpd || 150,
            critRate: 10, critDmg: 50, accuracy: 100, evasion: 5, 
        };
        charSkills = (bossDefFromState.skills || []).map(skillId => ({ id: skillId, ...(BASE_SKILLS_DATA[skillId] || { name: "未知技能", description:"", emoji:"?", maxLevel:1, upgradeCost:()=>({}) }), currentLevel: 1 } as OwnedSkill));
        currentHpToUse = bossDefFromState.currentHp;
    } else { // Player heroes or standard campaign enemies
      const ownedOrCampaignChar = char as OwnedCharacter; // Treat campaign enemies as OwnedCharacter structure for consistency
      baseComputedStats = getCharacterComputedStatsLib(ownedOrCampaignChar, gameState, VIP_LEVELS);
      charSkills = ownedOrCampaignChar.skills;
      activeBuffDebuffForParticipant = ownedOrCampaignChar.activeBuffDebuff || null;

      // Apply difficulty scaling for standard campaign/dungeon enemies if not player
      if (!isPlayer) {
          const difficultyHpMultiplier = 1.5 + (ownedOrCampaignChar.level / 50);
          const difficultyAtkMultiplier = 1.1 + (ownedOrCampaignChar.level / 100);
          const difficultyDefMultiplier = 1.0 + (ownedOrCampaignChar.level / 150);
          baseComputedStats.hp = Math.floor(baseComputedStats.hp * difficultyHpMultiplier);
          baseComputedStats.atk = Math.floor(baseComputedStats.atk * difficultyAtkMultiplier);
          baseComputedStats.def = Math.floor(baseComputedStats.def * difficultyDefMultiplier);
      }
    }
    
    currentHpToUse = baseComputedStats.hp; // Default for non-WB or WB at full HP

    if(isWorldBossParticipant){
        currentHpToUse = gameState.worldBoss!.currentHp;
    }


    let initialBattleStats = { ...baseComputedStats };

     if (!activeBuffDebuffForParticipant && !isWorldBossParticipant) { // World Boss passives handled in processTurn
        charSkills.forEach(skill => {
            const skillDef = getSkillDefinition(skill.id);
            if (skillDef?.isPassive && skillDef.buffs) {
                skillDef.buffs.forEach(buff => {
                    if (buff.targetType === 'self' || (buff.targetType === 'all_allies' && isPlayer)) {
                        let statKeyForEffect: BuffDebuffStatEffectKey | null = null;
                        if (buff.stat === 'all_stats') statKeyForEffect = 'all_stats';
                        else if (buff.stat === 'attack_increase') statKeyForEffect = 'attack_increase';
                        else if (buff.stat === 'defense_increase') statKeyForEffect = 'defense_increase';
                        else if (buff.stat === 'speed_increase') statKeyForEffect = 'speed_increase';
                        else if (buff.stat === 'critRate') statKeyForEffect = 'critRate';
                        else if (buff.stat === 'critDmg') statKeyForEffect = 'critDmg';
                        else if (buff.stat === 'evasion_increase') statKeyForEffect = 'evasion_increase';
                        else if (buff.stat === 'skill_damage_increase') statKeyForEffect = 'skill_damage_increase';
                        else if (buff.stat === 'crit_chance_reduction') statKeyForEffect = 'crit_chance_reduction';

                        if (statKeyForEffect) {
                            activeBuffDebuffForParticipant = { 
                                id: uuidv4(), sourceSkillId: skill.id, casterId: charIdForBattle,
                                statAffected: statKeyForEffect, value: buff.value, duration: buff.duration, 
                                isBuff: true,
                            };
                            battleLog.push(`<span class='${isPlayer ? 'battle-log-player' : 'battle-log-enemy'}'>${charNameForLog} ${charSpriteForLog}</span> 因 ${skill.name} 獲得被動增益!`);
                        }
                    }
                });
            }
        });
    }
    initialBattleStats = calculateDynamicBattleStats(initialBattleStats, activeBuffDebuffForParticipant);

    let powerToDisplay: number;
    if (!isPlayer && 'arenaPreview' in char) {
        const npcDef = char as ArenaNpcBattleDefinition;
        powerToDisplay = CharacterManager.calculatePowerFromStats(baseComputedStats);
    } else if (isWorldBossParticipant) {
        powerToDisplay = CharacterManager.calculatePowerFromStats(initialBattleStats); // Use initial battle stats for WB power
    } else {
        powerToDisplay = CharacterManager.calculateCharacterPower(char as OwnedCharacter, gameState, VIP_LEVELS);
    }

    const participantLogName = `<span class='${isPlayer ? 'battle-log-player' : 'battle-log-enemy'}'>${charNameForLog} ${charSpriteForLog}</span>`;
    battleLog.push(`${participantLogName} (戰力: ${powerToDisplay.toLocaleString()}) 加入戰鬥. HP: ${initialBattleStats.hp}, ATK: ${initialBattleStats.atk}, DEF: ${initialBattleStats.def}, SPD: ${initialBattleStats.spd}`);

    return {
      ...(char as Character), 
      id: charIdForBattle, name: charNameForLog, spriteEmoji: charSpriteForLog, element: charElement,
      level: (char as OwnedCharacter).level || ('arenaPreview' in char ? (char as ArenaNpcBattleDefinition).arenaPreview.level : (isWorldBossParticipant ? 100 : 1)),
      stars: (char as OwnedCharacter).stars || ('arenaPreview' in char ? (char as ArenaNpcBattleDefinition).arenaPreview.stars : (isWorldBossParticipant ? 7 : 1)),
      shards: (char as OwnedCharacter).shards || 0, currentExp: (char as OwnedCharacter).currentExp || 0,
      equipment: (char as OwnedCharacter).equipment || {}, runes: (char as OwnedCharacter).runes || Array(9).fill(null),
      assignedPetId: (char as OwnedCharacter).assignedPetId || null,
      npcSimulatedEquipment: (char as OwnedCharacter).npcSimulatedEquipment,
      npcSimulatedRunes: (char as OwnedCharacter).npcSimulatedRunes,
      
      battleId: `${isPlayer ? 'player' : 'enemy'}_${charIdForBattle}_${index}`,
      currentHp: currentHpToUse,
      currentShield: 0,
      skillCooldowns: charSkills.reduce((acc, s) => ({ ...acc, [s.id]: s.currentCooldown || 0 }), {}),
      baseComputedStats: baseComputedStats, 
      battleStats: initialBattleStats, 
      isPlayerTeam: isPlayer,
      statusEffects: [],
      skills: charSkills, 
      activeBuffDebuff: activeBuffDebuffForParticipant,
    };
  };

  const playerTeam: BattleParticipant[] = playerHeroes.map((hero, index) =>
    mapToBattleParticipant(hero, true, index)
  );

  const enemyTeam: BattleParticipant[] = enemyDefinitions.map((enemyDef, index) => {
    if (!isCharacterType(enemyDef)) { // Check if it's ArenaNpcBattleDefinition
      return mapToBattleParticipant(enemyDef, false, index);
    }
    // For standard Character (campaign enemies)
    const campEnemy = enemyDef as Character;
    const tempEnemyOwned: OwnedCharacter = {
        ...campEnemy,
        level: campEnemy.level || 1,
        stars: campEnemy.stars || 1,
        shards: 0, currentExp: 0,
        skills: (campEnemy.skills.map(s_base => {
            const baseSkillDef = BASE_SKILLS_DATA[s_base.id];
            if (!baseSkillDef) return null;
            return { ...baseSkillDef, id: s_base.id, currentLevel: 1 } as OwnedSkill;
        }).filter(Boolean) as OwnedSkill[]),
        equipment: {}, runes: Array(9).fill(null), assignedPetId: null,
        statusEffects: [], activeBuffDebuff: null,
      };
    return mapToBattleParticipant(tempEnemyOwned, false, index);
  });
  // Helper type guard
  function isCharacterType(def: any): def is Character {
    return def && typeof def.baseHp === 'number' && typeof def.baseAtk === 'number';
  }


  const turnOrder = [...playerTeam, ...enemyTeam]
    .sort((a, b) => b.battleStats.spd - a.battleStats.spd || Math.random() - 0.5);

  return {
    playerTeam,
    enemyTeam,
    turnOrder,
    currentActorIndex: 0,
    turnNumber: 0,
    battleLog,
    isBattleOver: false,
    _internalGameStateRef: gameState,
  };
}

function calculateDamage(
  attacker: BattleParticipant,
  defender: BattleParticipant,
  skillDef: BaseSkill,
  log: string[]
): number {
  let baseDamage = attacker.battleStats.atk * (skillDef.damageMultiplier || 1);
  const attackerNameSpan = `<span class='${attacker.isPlayerTeam ? 'battle-log-player' : 'battle-log-enemy'}'>${attacker.name} ${attacker.spriteEmoji}</span>`;
  const defenderNameSpan = `<span class='${defender.isPlayerTeam ? 'battle-log-player' : 'battle-log-enemy'}'>${defender.name} ${defender.spriteEmoji}</span>`;

  if (ELEMENT_ADVANTAGE[attacker.element] === defender.element) {
    baseDamage *= 1.3;
    log.push(`<span class='text-yellow-300'>屬性克制! ${attackerNameSpan} 對 ${defenderNameSpan} 傷害增加!</span>`);
  } else if (ELEMENT_ADVANTAGE[defender.element] === attacker.element) {
    baseDamage *= 0.7;
    log.push(`<span class='text-blue-300'>屬性被克制! ${attackerNameSpan} 對 ${defenderNameSpan} 傷害減少!</span>`);
  }

  const critRoll = Math.random() * 100;
  if (critRoll < attacker.battleStats.critRate) {
    baseDamage *= (1 + attacker.battleStats.critDmg / 100);
    log.push(`<span class='text-red-500'>${attackerNameSpan} 打出了爆擊!</span>`);
  }

  const evasionRoll = Math.random() * 100;
  const effectiveEvasionChance = Math.max(0, defender.battleStats.evasion - attacker.battleStats.accuracy);
  if (evasionRoll < effectiveEvasionChance) {
    log.push(`<span class='text-green-400'>${defenderNameSpan} 閃避了 ${attackerNameSpan} 的攻擊!</span>`);
    return 0;
  }

  let defenseToUse = defender.battleStats.def;
  if (skillDef.specialConditions?.some(sc => sc.type === 'ignore_defense')) {
      const ignoreDefCondition = skillDef.specialConditions.find(sc => sc.type === 'ignore_defense')!;
      const defenseToIgnore = defenseToUse * (ignoreDefCondition.ignoreDefensePercent || 0);
      defenseToUse -= defenseToIgnore;
      log.push(`${attackerNameSpan} 的攻擊部分無視了 ${defenderNameSpan} 的防禦!`);
  }
  
  // Apply passive damage boost for Typhon's Eye of the Storm
  if (attacker.id.startsWith('wb_storm_titan') && skillDef.id === 'wb_typhon_p_eye_of_storm') { // Check if it's Typhon and this skill
      if (defender.currentHp / defender.battleStats.hp < 0.5) {
          baseDamage *= 2; // Double damage if target HP < 50%
          log.push(`${attackerNameSpan} 的 風暴之眼 對低血量 ${defenderNameSpan} 造成額外傷害!`);
      }
  }

  let damageAfterDefense = baseDamage - defenseToUse;
  return Math.max(1, Math.floor(damageAfterDefense));
}

function applyDirectDamage(target: BattleParticipant, damage: number, battleLog: string[]) {
    const targetNameSpan = `<span class='${target.isPlayerTeam ? 'battle-log-player' : 'battle-log-enemy'}'>${target.name} ${target.spriteEmoji}</span>`;
    if (target.currentShield > 0) {
        const shieldDamage = Math.min(target.currentShield, damage);
        target.currentShield -= shieldDamage;
        damage -= shieldDamage;
        battleLog.push(`${targetNameSpan} 的護盾吸收了 ${shieldDamage} 傷害.`);
    }
    if (damage > 0) {
        target.currentHp = Math.max(0, target.currentHp - damage);
    }
}

export function processTurn(
  battleState: BattleState,
  actorBattleId: string,
  skillIdUsed: string,
  targetBattleId?: string
): BattleState {
  const newState = JSON.parse(JSON.stringify(battleState)) as BattleState; // Deep copy state for this turn
  const actorIndexInTurnOrder = newState.turnOrder.findIndex(p => p.battleId === actorBattleId);

  if (actorIndexInTurnOrder === -1) {
    if (newState.turnOrder.length > 0) {
         newState.currentActorIndex = (newState.currentActorIndex) % newState.turnOrder.length;
    }
    return newState;
  }
  const actor = newState.turnOrder[actorIndexInTurnOrder];
  const turnLog: string[] = [];

  if (!actor || actor.currentHp <= 0 || newState.isBattleOver) {
    newState.battleLog.push(...turnLog);
    return newState;
  }
  const actorNameSpan = `<span class='${actor.isPlayerTeam ? 'battle-log-player' : 'battle-log-enemy'}'>${actor.name} ${actor.spriteEmoji}</span>`;
  turnLog.push(`--- ${actorNameSpan} 的回合 (回合 ${newState.turnNumber}) ---`);

  // World Boss Stat Scaling for this turn
  if (!actor.isPlayerTeam && actor.id.startsWith('wb_')) {
    const scaleProgress = Math.min(1, (newState.turnNumber -1) / (MAX_TURNS_WORLD_BOSS_FIGHT -1));
    actor.battleStats.atk = Math.floor(1000 + scaleProgress * 9000);
    actor.battleStats.def = Math.floor(1000 + scaleProgress * 9000);
    // turnLog.push(`${actorNameSpan} 力量增強! ATK: ${actor.battleStats.atk}, DEF: ${actor.battleStats.def}`); // Optional log
  }


  // Skill Cooldown Reduction
  for (const sId in actor.skillCooldowns) {
    if (actor.skillCooldowns[sId] > 0) {
      actor.skillCooldowns[sId]--;
    }
  }

  // Process existing Status Effects (DOTs, Duration Down)
  const newStatusEffects: AppliedStatusEffect[] = [];
  let isUnableToAct = false;
  actor.statusEffects.forEach(effect => {
    // Agni's Immunity to DOT and Unable to Act
    if (actor.id === 'wb_fire_dragon' && (effect.type === StatusEffectType.DAMAGE_OVER_TIME || effect.type === StatusEffectType.UNABLE_TO_ACT)) {
        turnLog.push(`${actorNameSpan} 免疫了 ${effect.type} 效果!`);
        return; // Skip this effect
    }
    if (effect.type === StatusEffectType.DAMAGE_OVER_TIME && effect.damagePerTurn) {
      const dotDamage = effect.damagePerTurn;
      applyDirectDamage(actor, dotDamage, turnLog);
      turnLog.push(`${actorNameSpan} 受到 <span class='text-purple-400'>${StatusEffectType.DAMAGE_OVER_TIME}</span> 效果，損失 ${dotDamage} HP.`);
      if (actor.currentHp <= 0) turnLog.push(`${actorNameSpan} 因持續傷害倒下!`);
    }
    if (effect.type === StatusEffectType.UNABLE_TO_ACT) isUnableToAct = true;

    if (effect.duration - 1 > 0) newStatusEffects.push({ ...effect, duration: effect.duration - 1 });
    else turnLog.push(`${actorNameSpan} 的 ${effect.type} 效果結束了。`);
  });
  actor.statusEffects = newStatusEffects;

  if (actor.activeBuffDebuff) {
    actor.activeBuffDebuff.duration--;
    if (actor.activeBuffDebuff.duration <= 0) {
      turnLog.push(`${actorNameSpan} 的 ${actor.activeBuffDebuff.isBuff ? '增益' : '減益'} (${actor.activeBuffDebuff.statAffected}) 效果結束了。`);
      actor.activeBuffDebuff = null;
    }
  }
  actor.battleStats = calculateDynamicBattleStats(actor.baseComputedStats, actor.activeBuffDebuff);
  if (!actor.isPlayerTeam && actor.id.startsWith('wb_')) { // Re-apply WB scaling after buff/debuff processing
    const scaleProgress = Math.min(1, (newState.turnNumber - 1) / (MAX_TURNS_WORLD_BOSS_FIGHT - 1));
    actor.battleStats.atk = Math.floor(Math.max(actor.battleStats.atk, 1000 + scaleProgress * 9000)); // Ensure it doesn't go below scaled value due to debuff
    actor.battleStats.def = Math.floor(Math.max(actor.battleStats.def, 1000 + scaleProgress * 9000));
  }

  // World Boss Passive Effects Application
  if (!actor.isPlayerTeam && actor.id.startsWith('wb_')) {
      const bossSkillDefs = actor.skills.map(s => getSkillDefinition(s.id)).filter(Boolean) as BaseSkill[];
      bossSkillDefs.forEach(passiveSkill => {
          if (passiveSkill.isPassive) {
              if (passiveSkill.id === 'wb_agni_p_aura') {
                  const auraDamage = Math.floor(actor.battleStats.atk * 1.0); // 100% ATK
                  newState.playerTeam.forEach(playerChar => {
                      if (playerChar.currentHp > 0) {
                          applyDirectDamage(playerChar, auraDamage, turnLog);
                          turnLog.push(`${actorNameSpan} 的火山靈氣對 <span class='battle-log-player'>${playerChar.name}</span> 造成 ${auraDamage} 火焰傷害。`);
                          if (playerChar.currentHp <=0) turnLog.push(`<span class='battle-log-player'>${playerChar.name}</span> 被火山靈氣燒盡!`);
                      }
                  });
              } else if (passiveSkill.id === 'wb_cocytus_p_frostbite') {
                  newState.playerTeam.forEach(playerChar => {
                      if (playerChar.currentHp > 0 && Math.random() < 0.25) { // 25% chance
                          playerChar.statusEffects.push({id: uuidv4(), type: StatusEffectType.UNABLE_TO_ACT, duration: 1, sourceSkillId: passiveSkill.id, casterId: actor.id });
                          turnLog.push(`<span class='battle-log-player'>${playerChar.name}</span> 被刺骨嚴寒凍結，無法行動!`);
                      }
                  });
              } else if (passiveSkill.id === 'wb_typhon_p_cyclone_shield' && newState.turnNumber === 1 && actor.currentShield === 0) { // Only at battle start
                  const shieldAmount = Math.floor(actor.battleStats.hp * 0.20);
                  actor.currentShield += shieldAmount;
                  turnLog.push(`${actorNameSpan} 產生了 ${shieldAmount} 點的颶風護盾！`);
                  // Speed buff if shield active is handled by checking actor.currentShield > 0 when Typhon attacks
              }
          }
      });
  }


  if (actor.currentHp <= 0) { /* Handled by death check later */ }
  else if (isUnableToAct) {
    turnLog.push(`${actorNameSpan} <span class='text-red-600'>無法行動</span>!`);
    newState.battleLog.push(...turnLog);
    const remainingPlayer = newState.playerTeam.filter(p => p.currentHp > 0).length;
    const remainingEnemy = newState.enemyTeam.filter(e => e.currentHp > 0).length;
    if (remainingPlayer === 0) { newState.isBattleOver = true; newState.winner = 'enemy'; }
    else if (remainingEnemy === 0) { newState.isBattleOver = true; newState.winner = 'player'; }
    return newState;
  }

  const skillDefinitionFromActor = actor.skills.find(s => s.id === skillIdUsed);
  let skillToExecuteDef = getSkillDefinition(skillIdUsed);

  if (!skillDefinitionFromActor || !skillToExecuteDef || (actor.skillCooldowns[skillIdUsed] || 0) > 0) {
    turnLog.push(`${actorNameSpan} 嘗試使用 ${skillIdUsed}，但技能尚未準備好或不存在。使用普通攻擊。`);
    const defaultAttackBase = getSkillDefinition('defaultAttack')!;
    skillToExecuteDef = defaultAttackBase;
    skillIdUsed = defaultAttackBase.id;
  }

  const currentSkillLevel = skillDefinitionFromActor?.currentLevel || 1;
  const effectsAtLevel = skillToExecuteDef.upgradeEffect ? skillToExecuteDef.upgradeEffect(currentSkillLevel) : {};
  const effectiveSkillDef: BaseSkill = { ...skillToExecuteDef, ...effectsAtLevel };

  let targets: BattleParticipant[] = [];
  const potentialEnemyTargets = actor.isPlayerTeam ? newState.enemyTeam.filter(e => e.currentHp > 0) : newState.playerTeam.filter(p => p.currentHp > 0);
  const potentialAllyTargets = actor.isPlayerTeam ? newState.playerTeam.filter(p => p.currentHp > 0) : newState.enemyTeam.filter(e => e.currentHp > 0);

  switch (effectiveSkillDef.target) {
    case 'self': targets = [actor]; break;
    case 'enemy_single':
      if (targetBattleId) targets = potentialEnemyTargets.filter(t => t.battleId === targetBattleId);
      if (targets.length === 0 && potentialEnemyTargets.length > 0) targets = [potentialEnemyTargets[Math.floor(Math.random() * potentialEnemyTargets.length)]];
      break;
    case 'enemy_all': targets = potentialEnemyTargets; break;
    case 'ally_single_lowest_hp':
      targets = [...potentialAllyTargets].sort((a, b) => (a.currentHp / a.battleStats.hp) - (b.currentHp / b.battleStats.hp)).slice(0, 1);
      break;
    case 'ally_all': targets = potentialAllyTargets; break;
    case 'random_enemy_targets':
      const numTargets = effectiveSkillDef.numRandomTargets || 1;
      targets = [...potentialEnemyTargets].sort(() => 0.5 - Math.random()).slice(0, numTargets);
      break;
    default:
        if(effectiveSkillDef.damageMultiplier || effectiveSkillDef.debuffs || effectiveSkillDef.applyStatusEffects?.some(eff => eff.type === StatusEffectType.DAMAGE_OVER_TIME || eff.type === StatusEffectType.UNABLE_TO_ACT )){
            if (targetBattleId) targets = potentialEnemyTargets.filter(t => t.battleId === targetBattleId);
            if (targets.length === 0 && potentialEnemyTargets.length > 0) targets = [potentialEnemyTargets[Math.floor(Math.random() * potentialEnemyTargets.length)]];
        } else if (effectiveSkillDef.healMultiplier || effectiveSkillDef.shieldMultiplier || effectiveSkillDef.buffs){
            targets = [actor];
        }
      break;
  }

  if (targets.length === 0 && (effectiveSkillDef.damageMultiplier || effectiveSkillDef.healMultiplier || effectiveSkillDef.shieldMultiplier || effectiveSkillDef.applyStatusEffects || effectiveSkillDef.buffs || effectiveSkillDef.debuffs) ) { 
      turnLog.push(`${actorNameSpan} 使用 ${effectiveSkillDef.emoji || ''}${effectiveSkillDef.name}，但沒有有效目標!`);
      newState.battleLog.push(...turnLog);
      return newState;
  }

  turnLog.push(`${actorNameSpan} 使用 ${effectiveSkillDef.emoji || ''}${effectiveSkillDef.name} 對 ${targets.map(t => `<span class='${t.isPlayerTeam ? 'battle-log-player' : 'battle-log-enemy'}'>${t.name}</span>`).join(', ')}!`);
  actor.skillCooldowns[skillIdUsed] = effectiveSkillDef.cooldown || 0;

  targets.forEach(target => {
    if (target.currentHp <= 0) return;
    const targetNameSpan = `<span class='${target.isPlayerTeam ? 'battle-log-player' : 'battle-log-enemy'}'>${target.name} ${target.spriteEmoji}</span>`;

    if (effectiveSkillDef.damageMultiplier) {
      let damage = calculateDamage(actor, target, effectiveSkillDef, turnLog);
       const hpConditionDamage = effectiveSkillDef.specialConditions?.find(sc => sc.type === 'if_hp_below_threshold_extra_damage' && target.currentHp / target.battleStats.hp < (sc.hpThresholdPercent || 0));
      if(hpConditionDamage && hpConditionDamage.extraDamageMultiplier){
          damage *= hpConditionDamage.extraDamageMultiplier;
          turnLog.push(`${effectiveSkillDef.name} 觸發特殊條件，對 ${targetNameSpan} 傷害大幅提升!`);
      }
      const hpAboveConditionDamage = effectiveSkillDef.specialConditions?.find(sc => sc.type === 'if_hp_above_threshold_extra_damage' && actor.currentHp / actor.battleStats.hp > (sc.hpThresholdPercent || 0));
      if(hpAboveConditionDamage && hpAboveConditionDamage.extraDamageMultiplier){
          damage += Math.floor(actor.battleStats.atk * hpAboveConditionDamage.extraDamageMultiplier);
          turnLog.push(`${effectiveSkillDef.name} 觸發 ${actorNameSpan} 血量條件，追加傷害!`);
      }
      if (effectiveSkillDef.specialConditions?.some(sc => sc.type === 'damage_boost_per_debuff')) {
        const offensiveStatusTypes = [StatusEffectType.DAMAGE_OVER_TIME, StatusEffectType.UNABLE_TO_ACT];
        const debuffCount = target.statusEffects.filter(eff => offensiveStatusTypes.includes(eff.type)).length;
        const boostPercent = effectiveSkillDef.specialConditions.find(sc => sc.type === 'damage_boost_per_debuff')!.damageBoostPerDebuffPercent || 0;
        damage *= (1 + debuffCount * boostPercent);
        if (debuffCount > 0) turnLog.push(`因 ${targetNameSpan} 身上的負面效果，傷害提升!`);
      }

      // Typhon's Gale Force additional %maxHP damage
      if (skillIdUsed === 'wb_typhon_a_gale_force') {
          const maxHpDamage = Math.floor(target.battleStats.hp * 0.20);
          damage += maxHpDamage;
          turnLog.push(`${actorNameSpan} 的 風神衝擊 對 ${targetNameSpan} 造成額外 ${maxHpDamage} 最大生命傷害!`);
      }


      damage = Math.floor(damage);
      turnLog.push(`${actorNameSpan} 對 ${targetNameSpan} 造成了 <span class='battle-log-damage'>${damage}</span> 點傷害。`);
      applyDirectDamage(target, damage, turnLog);

      if (effectiveSkillDef.specialConditions?.some(sc => sc.type === 'life_steal')) {
        const lifeStealPercent = effectiveSkillDef.specialConditions.find(sc => sc.type === 'life_steal')!.lifeStealPercent || 0;
        const healedAmount = Math.floor(damage * lifeStealPercent);
        actor.currentHp = Math.min(actor.battleStats.hp, actor.currentHp + healedAmount);
        turnLog.push(`${actorNameSpan} 吸取了 ${healedAmount} HP。`);
      }
      const executeCondition = effectiveSkillDef.specialConditions?.find(sc => sc.type === 'execute');
      if (executeCondition && target.currentHp > 0 && (target.currentHp / target.baseComputedStats.hp < (executeCondition.executeHpThreshold || 0))) {
          let bonusExecuteDamage = target.baseComputedStats.hp * (executeCondition.executeHpThreshold || 0);
           if (skillIdUsed === 'wb_agni_a_worldfire') { // Agni's World Fire specific
              bonusExecuteDamage = target.currentHp * 0.20; // 20% of CURRENT HP
          } else if (skillIdUsed === 'wb_cocytus_a_absolute_zero') { // Cocytus' Absolute Zero specific
              bonusExecuteDamage = target.baseComputedStats.hp * 0.15; // 15% of MAX HP
          }

          if(executeCondition.executeDamageCapMultiplier) {
              bonusExecuteDamage = Math.min(bonusExecuteDamage, actor.battleStats.atk * executeCondition.executeDamageCapMultiplier);
          }
          bonusExecuteDamage = Math.floor(bonusExecuteDamage);
          turnLog.push(`${effectiveSkillDef.name} 觸發處決效果，對 ${targetNameSpan} 造成額外 <span class='battle-log-damage'>${bonusExecuteDamage}</span> 點真實傷害！`);
          applyDirectDamage(target, bonusExecuteDamage, turnLog);
      }
      if (target.currentHp <= 0) {
        turnLog.push(`${targetNameSpan} 被擊敗了!`);
        if (effectiveSkillDef.specialConditions?.some(sc => sc.type === 'reset_cooldown_on_kill')) {
            actor.skillCooldowns[skillIdUsed] = 0;
            turnLog.push(`${actorNameSpan} 的 ${skillToExecuteDef.name} 冷卻重置!`);
        }
      }
    }

    if (effectiveSkillDef.healMultiplier && target.currentHp > 0) {
      const healAmount = Math.floor(actor.battleStats.atk * effectiveSkillDef.healMultiplier);
      target.currentHp = Math.min(target.battleStats.hp, target.currentHp + healAmount);
      turnLog.push(`${actorNameSpan} 治療了 ${targetNameSpan} <span class='battle-log-heal'>${healAmount}</span> 點生命。`);
    }
    if (effectiveSkillDef.shieldMultiplier && target.currentHp > 0) {
      const shieldAmount = Math.floor(actor.battleStats.atk * effectiveSkillDef.shieldMultiplier);
      target.currentShield = (target.currentShield || 0) + shieldAmount;
      turnLog.push(`${actorNameSpan} 為 ${targetNameSpan} 施加了 <span class='battle-log-buff'>${shieldAmount}</span> 點護盾。`);
    }

    if (effectiveSkillDef.applyStatusEffects && target.currentHp > 0) {
        effectiveSkillDef.applyStatusEffects.forEach(effectToApply => {
            if (actor.id === 'wb_fire_dragon' && (effectToApply.type === StatusEffectType.DAMAGE_OVER_TIME || effectToApply.type === StatusEffectType.UNABLE_TO_ACT)) return; // Agni immunity
            if (target.id === 'wb_fire_dragon' && (effectToApply.type === StatusEffectType.DAMAGE_OVER_TIME || effectToApply.type === StatusEffectType.UNABLE_TO_ACT)) {
                 turnLog.push(`${targetNameSpan} 免疫了 ${effectToApply.type} 效果!`);
                 return;
            }


            if (Math.random() < (effectToApply.chance || 1.0)) {
                const existingEffectIndex = target.statusEffects.findIndex(se => se.type === effectToApply.type && se.sourceSkillId === skillIdUsed);
                const newDuration = effectToApply.duration || 1;
                let damagePerTurnForDot: number | undefined;
                if (effectToApply.type === StatusEffectType.DAMAGE_OVER_TIME) {
                    damagePerTurnForDot = Math.floor(actor.battleStats.atk * (effectToApply.dotDamageMultiplier || 0));
                }
                if (existingEffectIndex !== -1) {
                    target.statusEffects[existingEffectIndex].duration = Math.max(target.statusEffects[existingEffectIndex].duration, newDuration);
                    if(damagePerTurnForDot !== undefined) target.statusEffects[existingEffectIndex].damagePerTurn = damagePerTurnForDot;
                } else {
                    target.statusEffects.push({id: uuidv4(), type: effectToApply.type, duration: newDuration, damagePerTurn: damagePerTurnForDot, sourceSkillId: skillIdUsed, casterId: actor.id });
                }
                turnLog.push(`${targetNameSpan} 受到了 <span class='battle-log-debuff'>${effectToApply.type}</span> 效果 (${newDuration}回合)!`);
            } else {
                turnLog.push(`${effectiveSkillDef.name} 的 ${effectToApply.type} 效果未能命中 ${targetNameSpan}。`);
            }
        });
    }

    const processBuffDebuffApplication = (effects: typeof effectiveSkillDef.buffs | typeof effectiveSkillDef.debuffs, isBuffFlag: boolean) => {
        if (effects && target.currentHp > 0) {
            effects.forEach(effect => {
                if ((effect.chance || 1.0) >= Math.random()) {
                    let statKey: BuffDebuffStatEffectKey;
                    const skillStat = effect.stat;

                    if (skillStat === 'all_stats') statKey = 'all_stats';
                    else if (skillStat === 'skill_damage_increase') statKey = 'skill_damage_increase';
                    else if (skillStat === 'crit_chance_reduction') statKey = 'crit_chance_reduction';
                    else if (skillStat === 'evasion_increase') statKey = 'evasion_increase';
                    else if (skillStat === 'attack_increase') statKey = 'attack_increase';
                    else if (skillStat === 'defense_increase') statKey = 'defense_increase';
                    else if (skillStat === 'speed_increase') statKey = 'speed_increase';
                    else if (skillStat === 'critRate') statKey = 'critRate';
                    else if (skillStat === 'critDmg') statKey = 'critDmg';
                    else if (isBuffFlag === false && skillStat === 'defense_reduction') statKey = 'defense_reduction'; 
                    else if (isBuffFlag === false && skillStat === 'speed_reduction') statKey = 'speed_reduction'; 
                    else if (isBuffFlag === false && skillStat === 'attack_reduction') statKey = 'attack_reduction';
                    else if (isBuffFlag === false && skillStat === 'accuracy_perc') statKey = 'accuracy_perc';
                     else {
                        console.error(`[battleSimulator.ts] Unhandled skill stat in processBuffDebuffApplication: "${skillStat}" for ${isBuffFlag ? 'buff' : 'debuff'}. Assigning 'atk' as fallback.`);
                        statKey = 'atk';
                    }


                    const newEffect: AppliedBuffDebuff = {
                        id: uuidv4(),
                        sourceSkillId: skillIdUsed,
                        casterId: actor.id,
                        statAffected: statKey,
                        value: effect.value,
                        duration: effect.duration,
                        isBuff: isBuffFlag,
                    };
                    target.activeBuffDebuff = newEffect;
                    target.battleStats = calculateDynamicBattleStats(target.baseComputedStats, target.activeBuffDebuff);
                     if (!target.isPlayerTeam && target.id.startsWith('wb_')) { // Re-apply WB scaling after buff/debuff processing
                        const scaleProgress = Math.min(1, (newState.turnNumber - 1) / (MAX_TURNS_WORLD_BOSS_FIGHT - 1));
                        target.battleStats.atk = Math.floor(Math.max(target.battleStats.atk, 1000 + scaleProgress * 9000));
                        target.battleStats.def = Math.floor(Math.max(target.battleStats.def, 1000 + scaleProgress * 9000));
                    }
                    turnLog.push(`${targetNameSpan} ${isBuffFlag ? '獲得了' : '受到了'} <span class='${isBuffFlag ? 'battle-log-buff' : 'battle-log-debuff'}'>${effect.stat} ${isBuffFlag ? '提升' : '下降'}</span> 效果，持續${effect.duration}回合。`);
                }
            });
        }
    };
    processBuffDebuffApplication(effectiveSkillDef.buffs, true);
    processBuffDebuffApplication(effectiveSkillDef.debuffs, false);


    if (effectiveSkillDef.cooldownReductionEffect && target.currentHp > 0 && (effectiveSkillDef.target === 'ally_all' || effectiveSkillDef.target === 'self')) {
        if ((effectiveSkillDef.cooldownReductionEffect.chance || 1.0) >= Math.random()) {
            Object.keys(target.skillCooldowns).forEach(sId => {
                target.skillCooldowns[sId] = Math.max(0, target.skillCooldowns[sId] - (effectiveSkillDef.cooldownReductionEffect!.amount));
            });
            turnLog.push(`${targetNameSpan} 的技能冷卻減少了 ${effectiveSkillDef.cooldownReductionEffect.amount} 回合!`);
        }
    }
  });

  if (effectiveSkillDef.specialConditions?.some(sc => sc.type === 'self_damage_current_hp_perc')) {
      const selfDamagePercent = effectiveSkillDef.specialConditions.find(sc => sc.type === 'self_damage_current_hp_perc')!.selfDamagePercent || 0;
      const selfDamage = Math.floor(actor.currentHp * selfDamagePercent);
      applyDirectDamage(actor, selfDamage, turnLog);
      turnLog.push(`${actorNameSpan} 因技能反噬，損失了 ${selfDamage} HP。`);
      if (actor.currentHp <= 0) turnLog.push(`${actorNameSpan} 因技能反噬倒下!`);
  }

  newState.battleLog.push(...turnLog);

  const remainingPlayer = newState.playerTeam.filter(p => p.currentHp > 0).length;
  const remainingEnemy = newState.enemyTeam.filter(e => e.currentHp > 0).length;

  if (remainingPlayer === 0) {
    newState.isBattleOver = true;
    newState.winner = 'enemy';
  } else if (remainingEnemy === 0) {
    newState.isBattleOver = true;
    newState.winner = 'player';
  }
  return newState;
}
