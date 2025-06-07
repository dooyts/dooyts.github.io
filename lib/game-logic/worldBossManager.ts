
import { GameState, WorldBossInfo, WorldBossLeaderboardEntry, Currency, VIPLevel, OwnedCharacter, ElementType, BaseSkill, OwnedEquipmentItem, OwnedRune, OwnedPet, ComputedCharacterStats, Character, OwnedSkill, ArenaLeaderboardEntry, CharacterRarity, ArenaHeroPreview, NpcBossParticipantInfo } from '../../types';
import { WORLD_BOSS_REFRESH_INTERVAL_MS, MAX_WORLD_BOSS_ATTACKS_PER_CYCLE, VIP_LEVELS as VIP_LEVELS_CONST, MAX_TURNS_WORLD_BOSS_FIGHT, WORLD_BOSS_RANK_REWARDS, ARENA_MAX_RANK, MAX_HEROES_IN_BATTLE_TEAM, ELEMENT_ADVANTAGE } from '../../constants/gameplayConstants';
import { CURRENCY_NAMES, CURRENCY_EMOJIS } from '../../constants/uiConstants';
import { uuidv4, generateRandomPlayerName, generateArenaNpcTeamData } from './utils'; 
import { BASE_SKILLS_DATA as ALL_BASE_SKILLS_DATA, BASE_CHARACTERS } from '../../constants/characterConstants'; 
import * as CharacterManager from './characterManager';
import { initializeBattleState, processTurn, BattleState, BattleParticipant } from './battleSimulator'; // Import the new battle simulator
import * as ArenaManager from './arenaManager'; // For constructing NPC teams


export const initializeWorldBoss = (
    definitions: WorldBossInfo[],
    bossIndex: number
): WorldBossInfo => {
    const bossDef = definitions[bossIndex % definitions.length];
    const now = Date.now();
    return {
        ...bossDef,
        currentHp: bossDef.maxHp,
        nextRefreshTime: now + WORLD_BOSS_REFRESH_INTERVAL_MS,
        skills: bossDef.skills || [], 
        baseAtk: 1000, // Initial ATK for turn 1
        baseDef: 1000, // Initial DEF for turn 1
        baseSpd: bossDef.baseSpd || 150, // Use defined or default
    };
};

// This function is less relevant now as boss stats are handled differently in battle simulator
const getPlayerCharEffectiveStatsAndSkillsForWB = ( /* ... */ ): any => { /* ... */ };


export const handlePlayerAttack = (
    prev: GameState,
    playerTeamHeroes: OwnedCharacter[],
    elementAdvantageMap: Record<ElementType, ElementType>,
    baseSkillsData: typeof ALL_BASE_SKILLS_DATA
): { newState: GameState; success: boolean; damageDealt?: number; message?: string, battleLog: string[] } => {
    if (!prev.worldBoss || !prev.worldBoss.attackCost) {
        return { newState: prev, success: false, message: "世界頭目資訊錯誤或未定義攻擊消耗。", battleLog: ["頭目資訊錯誤"] };
    }
    if (prev.worldBoss.currentHp <= 0) {
        return { newState: prev, success: false, message: "世界頭目已被擊敗。", battleLog: ["頭目已陣亡"] };
    }
    if (prev.playerWorldBossStats.attacksMadeThisCycle >= MAX_WORLD_BOSS_ATTACKS_PER_CYCLE) {
        return { newState: prev, success: false, message: "今日挑戰次數已用盡。", battleLog: ["挑戰次數不足"] };
    }
    if (playerTeamHeroes.length === 0) {
        return { newState: prev, success: false, message: "隊伍中沒有英雄！", battleLog: ["錯誤：戰鬥隊伍為空。"] };
    }

    const attackCostCurrency = prev.worldBoss.attackCost.currency;
    const attackCostAmount = prev.worldBoss.attackCost.amount;

    if (prev.resources[attackCostCurrency] < attackCostAmount) {
        return {
            newState: prev,
            success: false,
            message: `${CURRENCY_NAMES[attackCostCurrency]}不足`,
            battleLog: [`${CURRENCY_NAMES[attackCostCurrency]}不足`]
        };
    }

    let newState = JSON.parse(JSON.stringify(prev)) as GameState; 
    
    newState.characters = newState.characters.map((char_from_json_copy: any) => {
        const baseCharTemplate = BASE_CHARACTERS.find(bc => bc.id === char_from_json_copy.id);
        if (!baseCharTemplate) {
            console.warn(`handlePlayerAttack rehydration: Character template for ID ${char_from_json_copy.id} not found.`);
            return char_from_json_copy;
        }
        const rehydratedSkills = (char_from_json_copy.skills || []).map((sk_saved: any) => {
            const baseSkillDef = ALL_BASE_SKILLS_DATA[sk_saved.id];
            if (!baseSkillDef) {
                console.warn(`handlePlayerAttack rehydration: Skill ID ${sk_saved.id} for char ${char_from_json_copy.id} not found in ALL_BASE_SKILLS_DATA.`);
                return { id: sk_saved.id, name: "Unknown Skill (Rehydrated)", description: "Definition missing.", emoji: "❓", maxLevel: 1, currentLevel: sk_saved.currentLevel || 1, upgradeCost: () => ({}), upgradeEffect: (l:number) => ({}) } as OwnedSkill;
            }
            return { ...(baseSkillDef as Omit<BaseSkill, 'id'>), id: sk_saved.id, currentLevel: sk_saved.currentLevel || 1 };
        });
        return { ...char_from_json_copy, skills: rehydratedSkills };
    });


    const currentBossInfo = newState.worldBoss!; 

    newState.resources[attackCostCurrency] -= attackCostAmount;
    if (attackCostCurrency === Currency.STAMINA) {
        newState.lastStaminaUpdateTime = Date.now();
    }

    // Construct the boss as a "Character" for the battle simulator
    // Its baseAtk/Def here should be the starting values for turn 1 (1000/1000)
    // The battleSimulator will handle the per-turn scaling.
    const bossAsCharacter: Character = {
        id: currentBossInfo.id,
        name: currentBossInfo.name,
        rarity: CharacterRarity.UR,
        element: currentBossInfo.element,
        baseHp: currentBossInfo.maxHp, 
        baseAtk: 1000, // Initial ATK for turn 1
        baseDef: 1000, // Initial DEF for turn 1
        baseSpd: currentBossInfo.baseSpd || 150,
        critRate: 10, critDmg: 50, accuracy: 100, evasion: 5,
        spriteEmoji: currentBossInfo.spriteEmoji,
        skills: (currentBossInfo.skills || []).map(skillId => ({ id: skillId, ...baseSkillsData[skillId] } as BaseSkill)),
        level: 100, // Effective level, not directly used for WB stat scaling in sim
        stars: 7,   // Effective stars, not directly used for WB stat scaling in sim
    };
    
    let battleResult = initializeBattleState(playerTeamHeroes, [bossAsCharacter], newState);
    let finalBattleLog = [...battleResult.battleLog];
    let totalPlayerDamageDealtThisAttackAttempt = 0;


    while (!battleResult.isBattleOver && battleResult.turnNumber < MAX_TURNS_WORLD_BOSS_FIGHT) {
        battleResult.turnNumber++; // Increment turn at the start of the overall turn processing
        const actor = battleResult.turnOrder[battleResult.currentActorIndex];
        
        if (actor.currentHp <= 0) {
            battleResult.currentActorIndex = (battleResult.currentActorIndex + 1) % battleResult.turnOrder.length;
            continue;
        }

        const enemyBeforeTurnSnapshot = battleResult.enemyTeam.map(e => ({ ...e, battleStats: { ...e.battleStats }, skills: e.skills.map(s => ({...s})) , statusEffects: e.statusEffects.map(ef => ({...ef})) , activeBuffDebuff: e.activeBuffDebuff ? {...e.activeBuffDebuff} : null }));

        const availableSkills = actor.skills.filter(s => (actor.skillCooldowns[s.id] || 0) === 0 && !s.isPassive);
        let skillToUse = availableSkills.length > 0 ? availableSkills[Math.floor(Math.random() * availableSkills.length)] : actor.skills[0];
        if (!skillToUse) { 
             const defaultSkillData = ALL_BASE_SKILLS_DATA['defaultAttack'];
             skillToUse = ({ ...(defaultSkillData as Omit<BaseSkill, 'id'>), id: 'defaultAttack', currentLevel: 1 } as OwnedSkill);
        }

        let targetId: string | undefined;
        if (actor.isPlayerTeam) { 
            const bossInEnemyTeam = battleResult.enemyTeam.find(e => e.currentHp > 0);
            if (bossInEnemyTeam) targetId = bossInEnemyTeam.battleId;
        } else { 
            const alivePlayers = battleResult.playerTeam.filter(p => p.currentHp > 0);
            if (alivePlayers.length > 0) targetId = alivePlayers[Math.floor(Math.random() * alivePlayers.length)].battleId;
        }
        
        battleResult = processTurn(battleResult, actor.battleId, skillToUse.id, targetId);
        finalBattleLog.push(...battleResult.battleLog.slice(finalBattleLog.length)); 

        if (actor.isPlayerTeam) {
            battleResult.enemyTeam.forEach((enemyAfterTurn, index) => {
                const enemyBeforeStats = enemyBeforeTurnSnapshot[index]; 
                if (enemyBeforeStats && enemyAfterTurn.battleId === enemyBeforeStats.battleId) {
                    const damageThisTurnToEnemy = Math.max(0, enemyBeforeStats.currentHp - enemyAfterTurn.currentHp);
                    totalPlayerDamageDealtThisAttackAttempt += damageThisTurnToEnemy;
                }
            });
        }

        battleResult.currentActorIndex = (battleResult.currentActorIndex + 1) % battleResult.turnOrder.length;
        battleResult.turnOrder = battleResult.turnOrder.filter(p => p.currentHp > 0);
         if(battleResult.turnOrder.length === 0 && !battleResult.isBattleOver){
             battleResult.isBattleOver = true;
             battleResult.winner = battleResult.playerTeam.some(p=>p.currentHp > 0) ? 'player' : 'enemy';
        } else if (battleResult.turnOrder.length > 0) {
            battleResult.currentActorIndex = battleResult.currentActorIndex % battleResult.turnOrder.length;
        }
    }
    
    if (!battleResult.isBattleOver && battleResult.turnNumber >= MAX_TURNS_WORLD_BOSS_FIGHT) {
        finalBattleLog.push("<span class='text-yellow-500'>(達到最大回合數，戰鬥結束)</span>");
         battleResult.winner = battleResult.playerTeam.some(p => p.currentHp > 0) ? 'player' : 'enemy';
         battleResult.isBattleOver = true;
    } else if (battleResult.isBattleOver && !battleResult.playerTeam.some(p => p.currentHp > 0)) {
        finalBattleLog.push("<span class='text-red-500'>(我方隊伍全滅，戰鬥結束)</span>");
    } else if (battleResult.isBattleOver && battleResult.enemyTeam.every(e => e.currentHp <= 0)) {
        finalBattleLog.push("<span class='text-green-300'>(世界頭目在模擬中被擊敗，戰鬥結束)</span>");
    }


    finalBattleLog.push(`\n<span class="text-yellow-300">本次挑戰總計對 ${currentBossInfo.name} 造成 <span class="battle-log-damage">${totalPlayerDamageDealtThisAttackAttempt.toLocaleString()}</span> 點傷害！</span>`);

    currentBossInfo.currentHp = Math.max(0, currentBossInfo.currentHp - totalPlayerDamageDealtThisAttackAttempt);
    newState.playerWorldBossStats = {
        ...newState.playerWorldBossStats,
        totalDamageDealtThisCycle: (newState.playerWorldBossStats.totalDamageDealtThisCycle || 0) + totalPlayerDamageDealtThisAttackAttempt,
        attacksMadeThisCycle: (newState.playerWorldBossStats.attacksMadeThisCycle || 0) + 1,
        lastAttackTime: Date.now(),
    };
    newState.taskProgress.worldBossDamageDealtToday = (newState.taskProgress.worldBossDamageDealtToday || 0) + totalPlayerDamageDealtThisAttackAttempt;


    const playerLeaderboardEntryIndex = newState.worldBossLeaderboard.findIndex(e => e.playerId === 'player');
    if (playerLeaderboardEntryIndex !== -1) {
        newState.worldBossLeaderboard[playerLeaderboardEntryIndex].damageDealt = newState.playerWorldBossStats.totalDamageDealtThisCycle;
        newState.worldBossLeaderboard[playerLeaderboardEntryIndex].lastAttackTime = Date.now();
        newState.worldBossLeaderboard[playerLeaderboardEntryIndex].vipLevel = newState.vipLevel;
        newState.worldBossLeaderboard[playerLeaderboardEntryIndex].playerName = newState.playerName;
    } else {
        newState.worldBossLeaderboard.push({
            playerId: 'player',
            playerName: newState.playerName,
            vipLevel: newState.vipLevel,
            damageDealt: newState.playerWorldBossStats.totalDamageDealtThisCycle,
            lastAttackTime: Date.now(),
        });
    }
    
    newState.worldBossLeaderboard.sort((a, b) => b.damageDealt - a.damageDealt || a.lastAttackTime - b.lastAttackTime);
    newState.worldBossLeaderboard = newState.worldBossLeaderboard.slice(0, 100); // Keep top 100

    return {
        newState,
        success: true,
        damageDealt: totalPlayerDamageDealtThisAttackAttempt,
        message: `成功攻擊 ${currentBossInfo.name}`,
        battleLog: finalBattleLog,
    };
};


export const simulateNpcAttacks = (
    prev: GameState,
    vipLevels: typeof VIP_LEVELS_CONST
): GameState => {
    if (!prev.worldBoss || prev.worldBoss.currentHp <= 0) return prev;

    let newState = { ...prev };
    const MAX_NPC_ATTACKERS_PER_CYCLE = 180;
    const NPCS_PER_BATCH = 5;

    if (!newState.worldBossNpcCycleParticipants || newState.worldBossNpcCycleParticipants.length === 0) {
        const topArenaNpcs = newState.arenaLeaderboard
            .filter(e => e.playerId !== 'player' && e.teamPreview && e.teamPreview.length > 0)
            .sort((a, b) => a.rank - b.rank) 
            .slice(0, 500); 

        const selectedNpcParticipants: NpcBossParticipantInfo[] = [];
        const usedArenaNpcIds = new Set<string>();

        while (selectedNpcParticipants.length < MAX_NPC_ATTACKERS_PER_CYCLE && topArenaNpcs.length > 0) {
            const randomIndex = Math.floor(Math.random() * topArenaNpcs.length);
            const arenaNpc = topArenaNpcs.splice(randomIndex, 1)[0];
            if (arenaNpc && !usedArenaNpcIds.has(arenaNpc.playerId)) {
                selectedNpcParticipants.push({
                    npcId: arenaNpc.playerId,
                    playerName: arenaNpc.playerName,
                    teamPreview: arenaNpc.teamPreview!,
                    vipLevel: arenaNpc.vipLevel,
                    totalDamageDealtThisCycle: 0,
                    hasAttackedThisCycle: false,
                });
                usedArenaNpcIds.add(arenaNpc.playerId);
            }
        }
        newState.worldBossNpcCycleParticipants = selectedNpcParticipants;
        newState.worldBossNpcBatchesProcessedThisCycle = 0;
    }

    const processedBatches = newState.worldBossNpcBatchesProcessedThisCycle || 0;
    const startIndex = processedBatches * NPCS_PER_BATCH;
    const endIndex = startIndex + NPCS_PER_BATCH;

    if (startIndex >= newState.worldBossNpcCycleParticipants.length) {
        return newState; 
    }
    
    const currentBatchNpcs = newState.worldBossNpcCycleParticipants.slice(startIndex, endIndex);

    currentBatchNpcs.forEach((npcParticipantInfo, batchIndex) => {
        if (newState.worldBoss!.currentHp <= 0 || npcParticipantInfo.hasAttackedThisCycle) return;

        const teamPreviewForNpc = npcParticipantInfo.teamPreview || []; 
        const npcTeamForBattle = ArenaManager.constructEffectiveArenaNpcTeamForBattle(
            teamPreviewForNpc,
            npcParticipantInfo.vipLevel
        );

        const bossAsCharacter: Character = {
            id: newState.worldBoss!.id, name: newState.worldBoss!.name, rarity: CharacterRarity.UR,
            element: newState.worldBoss!.element,
            baseHp: newState.worldBoss!.maxHp, 
            baseAtk: 1000, // Turn 1 ATK
            baseDef: 1000, // Turn 1 DEF
            baseSpd: newState.worldBoss!.baseSpd || 180,
            critRate: 15, critDmg: 60, accuracy: 110, evasion: 10,
            spriteEmoji: newState.worldBoss!.spriteEmoji,
            skills: (newState.worldBoss!.skills || []).map(skillId => ({ id: skillId, ...ALL_BASE_SKILLS_DATA[skillId] } as BaseSkill)),
            level: 100, stars: 7,
        };

        let npcBattleSim = initializeBattleState(npcTeamForBattle as unknown as OwnedCharacter[], [bossAsCharacter], newState);
        let npcTotalDamageToBossThisSim = 0;

        while (!npcBattleSim.isBattleOver && npcBattleSim.turnNumber < MAX_TURNS_WORLD_BOSS_FIGHT) {
            npcBattleSim.turnNumber++;
            const actor = npcBattleSim.turnOrder[npcBattleSim.currentActorIndex];
             if (actor.currentHp <= 0) {
                npcBattleSim.currentActorIndex = (npcBattleSim.currentActorIndex + 1) % npcBattleSim.turnOrder.length;
                continue;
            }
            const availableSkills = actor.skills.filter(s => (actor.skillCooldowns[s.id] || 0) === 0 && !s.isPassive);
            let skillToUse = availableSkills.length > 0 ? availableSkills[Math.floor(Math.random() * availableSkills.length)] : actor.skills[0];
             if (!skillToUse) {
                 const defaultSkillData = ALL_BASE_SKILLS_DATA['defaultAttack'];
                 skillToUse = ({ ...(defaultSkillData as Omit<BaseSkill, 'id'>), id: 'defaultAttack', currentLevel: 1 } as OwnedSkill);
            }

            let targetId: string | undefined;
            if (actor.isPlayerTeam) { 
                const bossInEnemyTeam = npcBattleSim.enemyTeam.find(e => e.currentHp > 0);
                if (bossInEnemyTeam) targetId = bossInEnemyTeam.battleId;
            } else { 
                const aliveNpcs = npcBattleSim.playerTeam.filter(p => p.currentHp > 0);
                if (aliveNpcs.length > 0) targetId = aliveNpcs[Math.floor(Math.random() * aliveNpcs.length)].battleId;
            }
            
            const enemyBeforeTurnSnapshot = npcBattleSim.enemyTeam.map(e => ({ ...e, battleStats: { ...e.battleStats }, skills: e.skills.map(s => ({...s})) , statusEffects: e.statusEffects.map(ef => ({...ef})) , activeBuffDebuff: e.activeBuffDebuff ? {...e.activeBuffDebuff} : null }));
            npcBattleSim = processTurn(npcBattleSim, actor.battleId, skillToUse.id, targetId);

            if (actor.isPlayerTeam) { 
                npcBattleSim.enemyTeam.forEach((enemyAfterTurn, index) => {
                    const enemyBeforeStats = enemyBeforeTurnSnapshot[index]; 
                    if (enemyBeforeStats && enemyAfterTurn.battleId === enemyBeforeStats.battleId) {
                        const damageThisTurnToEnemy = Math.max(0, enemyBeforeStats.currentHp - enemyAfterTurn.currentHp);
                        npcTotalDamageToBossThisSim += damageThisTurnToEnemy;
                    }
                });
            }
            
            npcBattleSim.currentActorIndex = (npcBattleSim.currentActorIndex + 1) % npcBattleSim.turnOrder.length;
            npcBattleSim.turnOrder = npcBattleSim.turnOrder.filter(p => p.currentHp > 0);
            if(npcBattleSim.turnOrder.length === 0 && !npcBattleSim.isBattleOver){
                 npcBattleSim.isBattleOver = true;
                 npcBattleSim.winner = npcBattleSim.playerTeam.some(p=>p.currentHp > 0) ? 'player' : 'enemy';
            } else if (npcBattleSim.turnOrder.length > 0){
                npcBattleSim.currentActorIndex = npcBattleSim.currentActorIndex % npcBattleSim.turnOrder.length;
            }
        }
        
        const damageMultiplier = 4.25 + Math.random() * 1.5; 
        const finalNpcDamage = Math.min(newState.worldBoss!.currentHp, Math.floor(npcTotalDamageToBossThisSim * damageMultiplier));
        
        newState.worldBoss!.currentHp -= finalNpcDamage;
        npcParticipantInfo.totalDamageDealtThisCycle = finalNpcDamage;
        npcParticipantInfo.hasAttackedThisCycle = true; 

        const existingLeaderboardNpcIndex = newState.worldBossLeaderboard.findIndex(e => e.playerId === npcParticipantInfo.npcId);
        if (existingLeaderboardNpcIndex !== -1) {
            newState.worldBossLeaderboard[existingLeaderboardNpcIndex].damageDealt = npcParticipantInfo.totalDamageDealtThisCycle;
            newState.worldBossLeaderboard[existingLeaderboardNpcIndex].lastAttackTime = Date.now() - Math.floor(Math.random() * 1000);
        } else if (newState.worldBossLeaderboard.length < 100) {
            newState.worldBossLeaderboard.push({
                playerId: npcParticipantInfo.npcId,
                playerName: npcParticipantInfo.playerName,
                vipLevel: npcParticipantInfo.vipLevel,
                damageDealt: npcParticipantInfo.totalDamageDealtThisCycle,
                lastAttackTime: Date.now() - Math.floor(Math.random() * 1000),
            });
        }
        newState.worldBossNpcCycleParticipants[startIndex + batchIndex] = npcParticipantInfo;
    });

    newState.worldBossNpcBatchesProcessedThisCycle = processedBatches + 1;
    newState.worldBossLeaderboard.sort((a, b) => b.damageDealt - a.damageDealt || a.lastAttackTime - b.lastAttackTime);
    newState.worldBossLeaderboard = newState.worldBossLeaderboard.slice(0, 100);
    newState.lastWorldBossLeaderboardUpdateTime = Date.now();

    return newState;
};


export const updateLeaderboardVisuals = (prev: GameState): GameState => {
    if (!prev.worldBoss || prev.worldBoss.currentHp <= 0 || prev.worldBossLeaderboard.length < 2) return prev;
    
    const newLeaderboard = [...prev.worldBossLeaderboard];
    const index1 = Math.floor(Math.random() * newLeaderboard.length);
    let index2 = Math.floor(Math.random() * newLeaderboard.length);
    while (index1 === index2) {
        index2 = Math.floor(Math.random() * newLeaderboard.length);
    }

    if (Math.abs(newLeaderboard[index1].damageDealt - newLeaderboard[index2].damageDealt) < (prev.worldBoss.maxHp * 0.0001) ) {
        if (newLeaderboard[index1].playerId !== 'player' && newLeaderboard[index2].playerId !== 'player') {
            [newLeaderboard[index1], newLeaderboard[index2]] = [newLeaderboard[index2], newLeaderboard[index1]];
        }
    }
    
    return { ...prev, worldBossLeaderboard: newLeaderboard, lastWorldBossLeaderboardUpdateTime: Date.now() };
};


export const getLeaderboard = (gameState: GameState): WorldBossLeaderboardEntry[] => {
    const playerEntry = gameState.worldBossLeaderboard.find(e => e.playerId === 'player');
    if (!playerEntry && gameState.playerWorldBossStats.totalDamageDealtThisCycle > 0) {
        return [
            ...gameState.worldBossLeaderboard,
            {
                playerId: 'player',
                playerName: gameState.playerName,
                vipLevel: gameState.vipLevel,
                damageDealt: gameState.playerWorldBossStats.totalDamageDealtThisCycle,
                lastAttackTime: gameState.playerWorldBossStats.lastAttackTime || Date.now()
            }
        ].sort((a,b) => b.damageDealt - a.damageDealt || a.lastAttackTime - b.lastAttackTime).slice(0,100);
    }
    return gameState.worldBossLeaderboard.slice(0,100);
};


export const checkAndRefreshBoss = (
    prev: GameState,
    definitions: WorldBossInfo[],
    rankRewardsConfig: typeof WORLD_BOSS_RANK_REWARDS
): { newState: GameState, didRefresh: boolean, playerRankForRewards?: number, actualPlayerRewards?: Partial<Record<Currency, number>> } => {
    const now = Date.now();
    if (!prev.worldBoss || now >= prev.worldBoss.nextRefreshTime || prev.worldBoss.currentHp <= 0) {
        let newState = { ...prev };
        let playerRankForRewards: number | undefined = undefined;
        let actualPlayerRewards: Partial<Record<Currency, number>> | undefined = undefined;
        
        if (prev.worldBoss && prev.worldBoss.maxHp > 0) { 
            const playerEntry = prev.worldBossLeaderboard.find(e => e.playerId === 'player');
            if (playerEntry) {
                playerRankForRewards = prev.worldBossLeaderboard.findIndex(e => e.playerId === 'player') + 1;
                if (playerRankForRewards > 0) { 
                    for (const rewardTier of rankRewardsConfig) {
                        if (playerRankForRewards >= rewardTier.minRank && playerRankForRewards <= rewardTier.maxRank) {
                            actualPlayerRewards = { ...rewardTier.rewards }; 
                            break;
                        }
                    }
                }
            }
        }

        newState.playerWorldBossStats = { totalDamageDealtThisCycle: 0, attacksMadeThisCycle: 0, lastAttackTime: null };
        newState.worldBossLeaderboard = []; 
        newState.worldBossCycleIndex = (prev.worldBossCycleIndex + 1) % definitions.length;
        newState.worldBoss = initializeWorldBoss(definitions, newState.worldBossCycleIndex);
        newState.worldBossNpcCycleParticipants = []; 
        newState.worldBossNpcBatchesProcessedThisCycle = 0; 
        
        return { newState, didRefresh: true, playerRankForRewards, actualPlayerRewards };
    }
    return { newState: prev, didRefresh: false };
};

export const checkWorldBossAvailableRedDot = (gameState: GameState): boolean => {
    if (!gameState.worldBoss || gameState.worldBoss.currentHp <= 0) return false;
    return gameState.playerWorldBossStats.attacksMadeThisCycle < MAX_WORLD_BOSS_ATTACKS_PER_CYCLE && 
           gameState.resources[gameState.worldBoss.attackCost.currency] >= gameState.worldBoss.attackCost.amount;
};
