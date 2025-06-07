
import React from 'react';
import { GameState, Currency, OwnedCharacter, Dungeon, OwnedEquipmentItem, Mail, OwnedSkill, StatusEffectType, BaseSkill, Character } from '../../types';
import * as BattleManagerUtils from '../../lib/game-logic/battleManager';
import * as TaskManager from '../../lib/game-logic/taskManager';
import * as EventManager from '../../lib/game-logic/eventManager';
import { initializeBattleState, processTurn, BattleState, BattleParticipant } from '../../lib/game-logic/battleSimulator';
import { DUNGEONS_DEFINITIONS, ELEMENT_ADVANTAGE, MAX_TURNS_WORLD_BOSS_FIGHT, ENDLESS_TOWER_FLOOR_COST_STAMINA, GAME_STAGES, ULTIMATE_CHALLENGE_HERO_IDS, ULTIMATE_CHALLENGE_INITIAL_LEVEL, ULTIMATE_CHALLENGE_LEVEL_INCREMENT, ULTIMATE_CHALLENGE_MAX_LEVEL, ULTIMATE_CHALLENGE_STAMINA_COST } from '../../constants/gameplayConstants';
import { BASE_SKILLS_DATA, BASE_CHARACTERS, REGULAR_CHARACTERS } from '../../constants/characterConstants';
import { BASE_EQUIPMENT_ITEMS } from '../../constants/equipmentConstants';
import { uuidv4 } from '../../lib/game-logic/utils';
import { CURRENCY_NAMES } from '../../constants/uiConstants';

// Typedefs for functions passed from GameContext
type GetCurrentGameStateFn = () => GameState;
type GetBattleTeamFn = () => OwnedCharacter[];
type CalculateTeamPowerFn = (customTeamIds?: (string | null)[]) => number;
type CalculateCharacterPowerFn = (character: OwnedCharacter) => number;
type SpendCurrencyFn = (currency: Currency, amount: number) => boolean;
type AddCurrencyFn = (currency: Currency, amount: number) => void;
type AddEquipmentItemFn = (baseItemId: string, source?: string) => OwnedEquipmentItem | null;
type ClearBattleLogFn = () => void;
type GetPlayerLevelForProgressFn = () => number;


export const startDungeonBattleCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    getGameState: GetCurrentGameStateFn,
    getBattleTeamFn: GetBattleTeamFn,
    calculateTeamPowerFn: CalculateTeamPowerFn,
    spendCurrencyFn: SpendCurrencyFn,
    addCurrencyFn: AddCurrencyFn,
    addEquipmentItemFn: AddEquipmentItemFn,
    clearBattleLogFn: ClearBattleLogFn,
    getPlayerLevelForProgressFn: GetPlayerLevelForProgressFn,
    calculateCharacterPowerFn: CalculateCharacterPowerFn
) => (dungeonId: string): { success: boolean; rewards?: Partial<Record<Currency, number>>; battleLog: string[]; totalPlayerDamageDealt?: number } => {
    clearBattleLogFn();
    const initialGameState = getGameState();

    const dungeon = DUNGEONS_DEFINITIONS.find(d => d.id === dungeonId);
    if (!dungeon) {
        const log = ["錯誤：找不到副本資訊。"];
        setGameState(prev => ({ ...prev, battleLog: log }));
        return { success: false, battleLog: log };
    }

    if ((initialGameState.dailyDungeonAttempts[dungeon.id] || 0) <= 0) {
        const log = ["<span class='text-red-400'>挑戰失敗：次數不足。</span>"];
        setGameState(prev => ({ ...prev, battleLog: log }));
        return { success: false, battleLog: log };
    }

    for (const cost of dungeon.cost) {
        if (!spendCurrencyFn(cost.currency, cost.amount)) {
            const log = [`<span class='text-red-400'>挑戰失敗：${CURRENCY_NAMES[cost.currency]}不足。</span>`];
            setGameState(prev => ({ ...prev, battleLog: log }));
            return { success: false, battleLog: log };
        }
    }

    const playerTeamHeroes = getBattleTeamFn();
    if (playerTeamHeroes.length === 0) {
        const log = ["錯誤：戰鬥隊伍為空。"];
        dungeon.cost.forEach(c => addCurrencyFn(c.currency, c.amount)); // Refund cost
        setGameState(prev => ({ ...prev, battleLog: log }));
        return { success: false, battleLog: log };
    }
    
    const playerLevel = getPlayerLevelForProgressFn();
    const enemyPowerMultiplier = dungeon.powerCheckMultiplier || 0.8;
    const baseEnemyCount = 3 + Math.floor(playerLevel / 10);
    const enemyCharacterPool = REGULAR_CHARACTERS.length > 0 ? REGULAR_CHARACTERS : BASE_CHARACTERS;
    const dungeonEnemies: Character[] = Array.from({ length: Math.min(5, baseEnemyCount) }).map((_, i) => {
        const baseChar = enemyCharacterPool[Math.floor(Math.random() * enemyCharacterPool.length)];
        return {
            ...baseChar,
            id: `dungeon_${dungeon.id}_enemy_${i}`,
            name: `${baseChar.name} (副本守衛)`,
            level: Math.max(1, playerLevel + Math.floor(Math.random() * 5) - 2),
            stars: Math.min(7, Math.floor(playerLevel / 7) + 1),
            baseHp: baseChar.baseHp * (1 + (enemyPowerMultiplier * 0.5)),
            baseAtk: baseChar.baseAtk * (1 + (enemyPowerMultiplier * 0.2)),
            baseDef: baseChar.baseDef * (1 + (enemyPowerMultiplier * 0.3)),
        };
    });


    let battleState: BattleState = initializeBattleState(playerTeamHeroes, dungeonEnemies, initialGameState);
    let finalBattleLog = [...battleState.battleLog];
    let totalPlayerDamageDealtThisBattle = 0;


    while (!battleState.isBattleOver && battleState.turnNumber < MAX_TURNS_WORLD_BOSS_FIGHT) {
        battleState.turnNumber++;
        const actor = battleState.turnOrder[battleState.currentActorIndex];

        if (actor.currentHp > 0 && !actor.statusEffects.some(eff => eff.type === StatusEffectType.UNABLE_TO_ACT)) {
            const availableSkills = actor.skills.filter(s => (actor.skillCooldowns[s.id] || 0) === 0 && !s.isPassive);
            let skillToUse: OwnedSkill;
             if (availableSkills.length > 0) {
                skillToUse = availableSkills[Math.floor(Math.random() * availableSkills.length)];
            } else {
                const defaultSkillData = BASE_SKILLS_DATA['defaultAttack'];
                skillToUse = ({
                    ...(defaultSkillData as Omit<BaseSkill, 'id'>), 
                    id: 'defaultAttack', 
                    currentLevel: 1,
                } as OwnedSkill);
            }
            
            let targetId: string | undefined = undefined;
            const skillDefFromData = BASE_SKILLS_DATA[skillToUse.id] || skillToUse;
            const skillDef = { ...skillDefFromData, id: skillToUse.id } as BaseSkill;


            if (skillDef.target?.startsWith('enemy')) {
                const potentialTargets = (actor.isPlayerTeam ? battleState.enemyTeam : battleState.playerTeam).filter(t => t.currentHp > 0);
                if (potentialTargets.length > 0) targetId = potentialTargets[Math.floor(Math.random() * potentialTargets.length)].battleId;
            } else if (skillDef.target === 'ally_single_lowest_hp') {
                 const potentialAllies = (actor.isPlayerTeam ? battleState.playerTeam : battleState.enemyTeam).filter(t => t.currentHp > 0);
                 if (potentialAllies.length > 0) targetId = [...potentialAllies].sort((a,b) => (a.currentHp/a.battleStats.hp) - (b.currentHp/b.battleStats.hp))[0].battleId;
            }
            
            const turnStartState = battleState;
            battleState = processTurn(battleState, actor.battleId, skillToUse.id, targetId);
            
            if(actor.isPlayerTeam) {
                const damageLogEntries = battleState.battleLog.slice(turnStartState.battleLog.length);
                damageLogEntries.forEach(logEntry => {
                    const damageMatch = logEntry.match(/造成了 <span class='battle-log-damage'>(\d{1,3}(,\d{3})*|\d+)<\/span> 點傷害/);
                    if (damageMatch && damageMatch[1]) {
                        totalPlayerDamageDealtThisBattle += parseInt(damageMatch[1].replace(/,/g, ''), 10);
                    }
                });
            }

        } else if (actor.currentHp > 0 && actor.statusEffects.some(eff => eff.type === StatusEffectType.UNABLE_TO_ACT)) {
             battleState = processTurn(battleState, actor.battleId, actor.skills[0].id, undefined);
        }
        
        finalBattleLog.push(...battleState.battleLog.slice(finalBattleLog.length));
        battleState.currentActorIndex = (battleState.currentActorIndex + 1) % battleState.turnOrder.length;
        battleState.turnOrder = battleState.turnOrder.filter(p => p.currentHp > 0);
        if(battleState.turnOrder.length === 0 && !battleState.isBattleOver) {
            battleState.isBattleOver = true;
            battleState.winner = battleState.playerTeam.some(p=>p.currentHp > 0) ? 'player' : 'enemy';
        } else if (battleState.turnOrder.length > 0) {
             battleState.currentActorIndex = battleState.currentActorIndex % battleState.turnOrder.length;
        }
    }
     if (!battleState.isBattleOver && battleState.turnNumber >= MAX_TURNS_WORLD_BOSS_FIGHT) {
        finalBattleLog.push("<span class='text-yellow-500'>(達到最大回合數)</span>");
        battleState.winner = battleState.playerTeam.some(p=>p.currentHp > 0) ? 'player' : 'enemy'; // Player wins on timeout if alive
        battleState.isBattleOver = true;
    }

    finalBattleLog.push(battleState.winner === 'player' ? "\n<span class='text-2xl text-green-300'>🎉 === 副本勝利! === 🎉</span>" : "\n<span class='text-2xl text-red-300'>☠️ === 副本失敗... === ☠️</span>");
    
    let rewardsForDisplay: Partial<Record<Currency, number>> = {};
    let equipmentDrops: OwnedEquipmentItem[] = [];

    setGameState(prev => {
        let newStateAfterBattle = { ...prev, battleLog: finalBattleLog };
        newStateAfterBattle.dailyDungeonAttempts[dungeon.id] = Math.max(0, (newStateAfterBattle.dailyDungeonAttempts[dungeon.id] || 0) - 1);
        
        if (battleState.winner === 'player' || dungeon.isDamageBasedReward) { // Always process rewards if damage based, success based on thresholds
            const dungeonOutcomeResult = BattleManagerUtils.processDungeonOutcome(
                newStateAfterBattle, dungeon, totalPlayerDamageDealtThisBattle, addCurrencyFn, addEquipmentItemFn
            );
            rewardsForDisplay = dungeonOutcomeResult.rewardsForDisplay;
            equipmentDrops = dungeonOutcomeResult.equipmentDrops;

            Object.entries(rewardsForDisplay).forEach(([key, value]) => {
                if (key !== 'equipmentDropIds' && key !== 'petDropIds' && key !== 'runeDropIds') { // These are handled separately
                     addCurrencyFn(key as Currency, value as number);
                }
            });
            equipmentDrops.forEach(eqDrop => addEquipmentItemFn(eqDrop.id, "DungeonDrop"));
            
            if (battleState.winner === 'player'){ // Only count as "cleared" if enemies defeated, not just damage threshold
                 newStateAfterBattle.taskProgress = {
                    ...newStateAfterBattle.taskProgress,
                    dungeonsClearedToday: (newStateAfterBattle.taskProgress.dungeonsClearedToday || 0) + 1,
                    battlesWon: (newStateAfterBattle.taskProgress.battlesWon || 0) + 1,
                    battlesWonToday: (newStateAfterBattle.taskProgress.battlesWonToday || 0) + 1,
                };
            }
        }
        return newStateAfterBattle;
    });
    
    let displayModalRewards = { ...rewardsForDisplay };
    equipmentDrops.forEach(eq => {
        const key = `${eq.name} (${eq.rarity})` as any;
        displayModalRewards[key] = (displayModalRewards[key] || 0) + 1;
    });

    return { success: battleState.winner === 'player', rewards: displayModalRewards, battleLog: finalBattleLog, totalPlayerDamageDealt: totalPlayerDamageDealtThisBattle };
};


export const startEndlessTowerFloorBattleCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    getGameState: GetCurrentGameStateFn,
    getBattleTeamFn: GetBattleTeamFn,
    calculateTeamPowerFn: CalculateTeamPowerFn,
    calculateCharacterPowerFn: CalculateCharacterPowerFn,
    spendCurrencyFn: SpendCurrencyFn,
    addCurrencyFn: AddCurrencyFn,
    clearBattleLogFn: ClearBattleLogFn
) => (floor: number): { success: boolean; message?: string; rewards?: Partial<Record<Currency, number>>; battleLog: string[], nextFloor?: number | null } => {
    clearBattleLogFn();
    const initialGameState = getGameState();

    if (!initialGameState.currentEndlessTowerRun?.isActive && initialGameState.dailyDungeonAttempts['endless_tower'] <= 0) {
        const log = ["<span class='text-red-400'>今日無盡之塔挑戰次數已用盡。</span>"];
        setGameState(prev => ({ ...prev, battleLog: log }));
        return { success: false, message: "挑戰次數不足", battleLog: log };
    }
    if (!spendCurrencyFn(Currency.STAMINA, ENDLESS_TOWER_FLOOR_COST_STAMINA)) {
        const log = ["<span class='text-red-400'>體力不足以挑戰無盡之塔。</span>"];
        setGameState(prev => ({ ...prev, battleLog: log }));
        return { success: false, message: "體力不足", battleLog: log };
    }

    const playerTeamHeroes = getBattleTeamFn();
    if (playerTeamHeroes.length === 0) {
        const log = ["錯誤：戰鬥隊伍為空。"];
        addCurrencyFn(Currency.STAMINA, ENDLESS_TOWER_FLOOR_COST_STAMINA); // Refund
        setGameState(prev => ({ ...prev, battleLog: log }));
        return { success: false, message: "隊伍為空", battleLog: log };
    }

    const towerEnemies = BattleManagerUtils.generateEndlessTowerEnemies(floor, REGULAR_CHARACTERS); // Use REGULAR_CHARACTERS
    const recommendedPower = Math.floor(1000 * Math.pow(1.15, floor - 1) + 500 * floor); // Example power scaling

    let battleState: BattleState = initializeBattleState(playerTeamHeroes, towerEnemies, initialGameState);
    let finalBattleLog = [...battleState.battleLog];

    while (!battleState.isBattleOver && battleState.turnNumber < MAX_TURNS_WORLD_BOSS_FIGHT) { // Using MAX_TURNS_WORLD_BOSS_FIGHT as a general limit
         battleState.turnNumber++;
        const actor = battleState.turnOrder[battleState.currentActorIndex];

        if (actor.currentHp > 0 && !actor.statusEffects.some(eff => eff.type === StatusEffectType.UNABLE_TO_ACT)) {
            const availableSkills = actor.skills.filter(s => (actor.skillCooldowns[s.id] || 0) === 0 && !s.isPassive);
            let skillToUse: OwnedSkill;
            if (availableSkills.length > 0) {
                skillToUse = availableSkills[Math.floor(Math.random() * availableSkills.length)];
            } else {
                const defaultSkillData = BASE_SKILLS_DATA['defaultAttack'];
                skillToUse = ({
                    ...(defaultSkillData as Omit<BaseSkill, 'id'>), 
                    id: 'defaultAttack', 
                    currentLevel: 1,
                } as OwnedSkill);
            }
            
            let targetId: string | undefined = undefined;
            const skillDefFromData = BASE_SKILLS_DATA[skillToUse.id] || skillToUse;
            const skillDef = { ...skillDefFromData, id: skillToUse.id } as BaseSkill;

            if (skillDef.target?.startsWith('enemy')) {
                const potentialTargets = (actor.isPlayerTeam ? battleState.enemyTeam : battleState.playerTeam).filter(t => t.currentHp > 0);
                if (potentialTargets.length > 0) targetId = potentialTargets[Math.floor(Math.random() * potentialTargets.length)].battleId;
            } else if (skillDef.target === 'ally_single_lowest_hp') {
                 const potentialAllies = (actor.isPlayerTeam ? battleState.playerTeam : battleState.enemyTeam).filter(t => t.currentHp > 0);
                 if (potentialAllies.length > 0) targetId = [...potentialAllies].sort((a,b) => (a.currentHp/a.battleStats.hp) - (b.currentHp/b.battleStats.hp))[0].battleId;
            }
            battleState = processTurn(battleState, actor.battleId, skillToUse.id, targetId);
        } else if (actor.currentHp > 0 && actor.statusEffects.some(eff => eff.type === StatusEffectType.UNABLE_TO_ACT)) {
             battleState = processTurn(battleState, actor.battleId, actor.skills[0].id, undefined);
        }
        
        finalBattleLog.push(...battleState.battleLog.slice(finalBattleLog.length));
        battleState.currentActorIndex = (battleState.currentActorIndex + 1) % battleState.turnOrder.length;
        battleState.turnOrder = battleState.turnOrder.filter(p => p.currentHp > 0);
         if(battleState.turnOrder.length === 0 && !battleState.isBattleOver){
             battleState.isBattleOver = true;
             battleState.winner = battleState.playerTeam.some(p=>p.currentHp > 0) ? 'player' : 'enemy';
        } else if (battleState.turnOrder.length > 0) {
             battleState.currentActorIndex = battleState.currentActorIndex % battleState.turnOrder.length;
        }
    }
     if (!battleState.isBattleOver && battleState.turnNumber >= MAX_TURNS_WORLD_BOSS_FIGHT) {
        finalBattleLog.push("<span class='text-yellow-500'>(達到最大回合數)</span>");
        battleState.winner = battleState.playerTeam.some(p=>p.currentHp > 0) ? 'player' : 'enemy';
        battleState.isBattleOver = true;
    }
    
    finalBattleLog.push(battleState.winner === 'player' ? `\n<span class='text-2xl text-green-300'>🎉 === 無盡之塔 第 ${floor} 層 勝利! === 🎉</span>` : `\n<span class='text-2xl text-red-300'>☠️ === 無盡之塔 第 ${floor} 層 失敗... === ☠️</span>`);

    let rewardsForDisplay: Partial<Record<Currency, number>> = {};
    let nextFloor: number | null = null;

    setGameState(prev => {
        let newStateAfterBattle = { ...prev, battleLog: finalBattleLog };
        if (!newStateAfterBattle.currentEndlessTowerRun || !newStateAfterBattle.currentEndlessTowerRun.isActive) {
            newStateAfterBattle.dailyDungeonAttempts['endless_tower'] = Math.max(0, (newStateAfterBattle.dailyDungeonAttempts['endless_tower'] || 0) - 1);
        }
        
        if (battleState.winner === 'player') {
            rewardsForDisplay = {
                [Currency.GOLD]: 1000 * floor,
                [Currency.DIAMONDS]: 10 * floor,
                [Currency.BATTLE_PASS_EXP]: 20 + floor * 2,
                ...(floor % 5 === 0 && { [Currency.RUNE_TICKET]: 1 }),
                ...(floor % 10 === 0 && { [Currency.GACHA_TICKET]: 1 }),
            };
            Object.entries(rewardsForDisplay).forEach(([key, value]) => addCurrencyFn(key as Currency, value as number));
            
            newStateAfterBattle.endlessTowerMaxFloor = Math.max(prev.endlessTowerMaxFloor, floor);
            nextFloor = floor + 1;
            newStateAfterBattle.currentEndlessTowerRun = {
                currentFloor: nextFloor,
                isActive: true,
                initialAttemptMadeToday: true,
            };
             newStateAfterBattle.taskProgress = TaskManager.updateBattleTasks(newStateAfterBattle.taskProgress, true);

        } else { // Player lost
            newStateAfterBattle.currentEndlessTowerRun = { // End the current run on loss
                ...newStateAfterBattle.currentEndlessTowerRun,
                isActive: false,
                initialAttemptMadeToday: true, // Mark that an attempt was made
            } as GameState['currentEndlessTowerRun'];
        }
        return newStateAfterBattle;
    });

    return { 
        success: battleState.winner === 'player', 
        rewards: rewardsForDisplay, 
        battleLog: finalBattleLog, 
        nextFloor: battleState.winner === 'player' ? nextFloor : null,
        message: battleState.winner === 'player' ? `成功通關第 ${floor} 層！` : `止步於第 ${floor} 層。`
    };
};

export const startUltimateChallengeBattleCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    getGameState: GetCurrentGameStateFn,
    getBattleTeamFn: GetBattleTeamFn,
    spendCurrencyFn: SpendCurrencyFn,
    addCurrencyFn: AddCurrencyFn,
    clearBattleLogFn: ClearBattleLogFn
  ) => (): { success: boolean; rewards?: Partial<Record<Currency, number>>; battleLog: string[]; message?: string } => {
    clearBattleLogFn();
    const initialGameState = getGameState();
  
    const allCampaignComplete = GAME_STAGES.every(s => initialGameState.completedStages.includes(s.id));
    if (!allCampaignComplete) {
      const log = ["<span class='text-red-400'>請先完成所有主線關卡以解鎖終極試煉。</span>"];
      setGameState(prev => ({ ...prev, battleLog: log }));
      return { success: false, message: "主線未完成", battleLog: log };
    }
  
    if (!spendCurrencyFn(Currency.STAMINA, ULTIMATE_CHALLENGE_STAMINA_COST)) {
      const log = ["<span class='text-red-400'>終極試煉失敗：體力不足。</span>"];
      setGameState(prev => ({ ...prev, battleLog: log }));
      return { success: false, message: "體力不足", battleLog: log };
    }
  
    const playerTeamHeroes = getBattleTeamFn();
    if (playerTeamHeroes.length === 0) {
      const log = ["錯誤：戰鬥隊伍為空。"];
      addCurrencyFn(Currency.STAMINA, ULTIMATE_CHALLENGE_STAMINA_COST); // Refund
      setGameState(prev => ({ ...prev, battleLog: log }));
      return { success: false, message: "隊伍為空", battleLog: log };
    }
  
    const currentChallengeLevel = initialGameState.ultimateChallengeCurrentLevel;
    const ultimateEnemies: Character[] = ULTIMATE_CHALLENGE_HERO_IDS.map((heroId, index) => {
      const baseChar = BASE_CHARACTERS.find(c => c.id === heroId);
      if (!baseChar) throw new Error(`Ultimate challenge hero definition not found: ${heroId}`);
      return {
        ...baseChar,
        id: `ultimate_challenge_enemy_${heroId}_${currentChallengeLevel}`,
        name: `${baseChar.name} (試煉 Lv.${currentChallengeLevel})`,
        level: currentChallengeLevel,
        stars: baseChar.stars || 1, // Use base stars or default to 1
        equipment: {}, // No equipment
        skills: baseChar.skills.map(s_base => ({ // Base skills at level 1
            ...(BASE_SKILLS_DATA[s_base.id] as Omit<BaseSkill, 'id'>),
            id: s_base.id,
            currentLevel: 1,
        })),
      };
    });
  
    let battleState: BattleState = initializeBattleState(playerTeamHeroes, ultimateEnemies, initialGameState);
    let finalBattleLog = [...battleState.battleLog];
    finalBattleLog.unshift(`<span class='text-yellow-500 font-bold'>終極試煉 Lv.${currentChallengeLevel} 開始！</span>`);
  
    while (!battleState.isBattleOver && battleState.turnNumber < MAX_TURNS_WORLD_BOSS_FIGHT) {
        battleState.turnNumber++;
        const actor = battleState.turnOrder[battleState.currentActorIndex];

        if (actor.currentHp > 0 && !actor.statusEffects.some(eff => eff.type === StatusEffectType.UNABLE_TO_ACT)) {
            const availableSkills = actor.skills.filter(s => (actor.skillCooldowns[s.id] || 0) === 0 && !s.isPassive);
            let skillToUse: OwnedSkill;
             if (availableSkills.length > 0) {
                skillToUse = availableSkills[Math.floor(Math.random() * availableSkills.length)];
            } else {
                const defaultSkillData = BASE_SKILLS_DATA['defaultAttack'];
                skillToUse = ({...(defaultSkillData as Omit<BaseSkill, 'id'>), id: 'defaultAttack', currentLevel: 1 } as OwnedSkill);
            }
            let targetId: string | undefined = undefined;
            const skillDefFromData = BASE_SKILLS_DATA[skillToUse.id] || skillToUse;
            const skillDef = { ...skillDefFromData, id: skillToUse.id } as BaseSkill;
            if (skillDef.target?.startsWith('enemy')) {
                const potentialTargets = (actor.isPlayerTeam ? battleState.enemyTeam : battleState.playerTeam).filter(t => t.currentHp > 0);
                if (potentialTargets.length > 0) targetId = potentialTargets[Math.floor(Math.random() * potentialTargets.length)].battleId;
            } else if (skillDef.target === 'ally_single_lowest_hp') {
                 const potentialAllies = (actor.isPlayerTeam ? battleState.playerTeam : battleState.enemyTeam).filter(t => t.currentHp > 0);
                 if (potentialAllies.length > 0) targetId = [...potentialAllies].sort((a,b) => (a.currentHp/a.battleStats.hp) - (b.currentHp/b.battleStats.hp))[0].battleId;
            }
            battleState = processTurn(battleState, actor.battleId, skillToUse.id, targetId);
        } else if (actor.currentHp > 0 && actor.statusEffects.some(eff => eff.type === StatusEffectType.UNABLE_TO_ACT)) {
             battleState = processTurn(battleState, actor.battleId, actor.skills[0].id, undefined);
        }
        finalBattleLog.push(...battleState.battleLog.slice(finalBattleLog.length));
        battleState.currentActorIndex = (battleState.currentActorIndex + 1) % battleState.turnOrder.length;
        battleState.turnOrder = battleState.turnOrder.filter(p => p.currentHp > 0);
        if(battleState.turnOrder.length === 0 && !battleState.isBattleOver){
             battleState.isBattleOver = true;
             battleState.winner = battleState.playerTeam.some(p=>p.currentHp > 0) ? 'player' : 'enemy';
        } else if (battleState.turnOrder.length > 0) {
             battleState.currentActorIndex = battleState.currentActorIndex % battleState.turnOrder.length;
        }
    }
    if (!battleState.isBattleOver && battleState.turnNumber >= MAX_TURNS_WORLD_BOSS_FIGHT) {
        finalBattleLog.push("<span class='text-yellow-500'>(達到最大回合數)</span>");
        battleState.winner = battleState.playerTeam.some(p=>p.currentHp > 0) ? 'player' : 'enemy';
        battleState.isBattleOver = true;
    }
  
    finalBattleLog.push(battleState.winner === 'player' ? `\n<span class='text-2xl text-green-300'>🎉 === 終極試煉 Lv.${currentChallengeLevel} 勝利! === 🎉</span>` : `\n<span class='text-2xl text-red-300'>☠️ === 終極試煉 Lv.${currentChallengeLevel} 失敗... === ☠️</span>`);
    
    // Placeholder rewards
    const rewardsForDisplay: Partial<Record<Currency, number>> = battleState.winner === 'player' ? { [Currency.DIAMONDS]: 50 + currentChallengeLevel, [Currency.GOLD]: 10000 + currentChallengeLevel * 100 } : {};
  
    setGameState(prev => {
      let newStateAfterBattle = { ...prev, battleLog: finalBattleLog };
      if (battleState.winner === 'player') {
        Object.entries(rewardsForDisplay).forEach(([key, value]) => addCurrencyFn(key as Currency, value as number));
        if (!prev.ultimateChallengeMaxLevelReached) {
          const nextLevel = prev.ultimateChallengeCurrentLevel + ULTIMATE_CHALLENGE_LEVEL_INCREMENT;
          if (nextLevel >= ULTIMATE_CHALLENGE_MAX_LEVEL) {
            newStateAfterBattle.ultimateChallengeCurrentLevel = ULTIMATE_CHALLENGE_MAX_LEVEL;
            newStateAfterBattle.ultimateChallengeMaxLevelReached = true;
          } else {
            newStateAfterBattle.ultimateChallengeCurrentLevel = nextLevel;
          }
        }
        newStateAfterBattle.taskProgress = TaskManager.updateBattleTasks(newStateAfterBattle.taskProgress, true); // Count as a battle won
      }
      return newStateAfterBattle;
    });
  
    return { 
      success: battleState.winner === 'player', 
      rewards: rewardsForDisplay, 
      battleLog: finalBattleLog, 
      message: battleState.winner === 'player' ? `終極試煉 Lv.${currentChallengeLevel} 勝利!` : `終極試煉 Lv.${currentChallengeLevel} 失敗。`
    };
  };
