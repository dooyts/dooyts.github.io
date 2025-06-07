
import { GameState, PlayerResources, OwnedCharacter, OwnedEquipmentItem, OwnedPet, OwnedRune, Currency, CharacterRarity, VIPLevel, ArenaLeaderboardEntry, WorldBossInfo, BaseSkill, OwnedSkill, Character, AppliedBuffDebuff } from '../../types';
import {
    INITIAL_GOLD, INITIAL_DIAMONDS, INITIAL_STAMINA_CURRENT, INITIAL_STAMINA_MAX,
    MAX_HEROES_IN_BATTLE_TEAM, ARENA_DAILY_ATTEMPTS, ARENA_MAX_RANK, INITIAL_WORLD_BOSS_ENERGY,
    initialGameStateValues as gameplayInitialGameStateValues, DEFAULT_PLAYER_NAME,
    ULTIMATE_CHALLENGE_INITIAL_LEVEL, ULTIMATE_CHALLENGE_MAX_LEVEL // Import new constants
} from '../../constants/gameplayConstants';
import { ALL_GACHA_POOLS } from '../../constants/gachaConstants';
import { DUNGEONS_DEFINITIONS, VIP_LEVELS, WORLD_BOSSES_DEFINITIONS, GAME_STAGES } from '../../constants/gameplayConstants';
import { SHOP_ITEMS_RESOURCES, SHOP_ITEMS_VIP_EXCLUSIVE, SHOP_ITEMS_SPECIALS, SHOP_ITEMS_CURRENCY_STAMINA } from '../../constants/shopConstants';
import { REGULAR_CHARACTERS, MAX_CHARACTER_LEVEL_BY_STARS, BASE_SKILLS_DATA, BASE_CHARACTERS } from '../../constants/characterConstants'; // Use REGULAR_CHARACTERS
import * as CharacterManager from './characterManager';
import * as WorldBossManager from './worldBossManager';
import * as ArenaManager from './arenaManager'; 
import { uuidv4, generateArenaNpcTeamData } from './utils'; 


export const loadInitialGameState = (): GameState => {
    const initialPlayerResources: PlayerResources = {
      [Currency.GOLD]: INITIAL_GOLD,
      [Currency.DIAMONDS]: INITIAL_DIAMONDS,
      [Currency.STAMINA]: INITIAL_STAMINA_CURRENT,
      [Currency.ARENA_COIN]: 100,
      [Currency.EXP_POTION]: 1000,
      [Currency.BREAKTHROUGH_STONE]: 50,
      [Currency.GACHA_TICKET]: 5,
      [Currency.SKILL_BOOK_NORMAL]: 20,
      [Currency.SKILL_BOOK_ADVANCED]: 5,
      [Currency.ENHANCEMENT_STONE]: 100,
      [Currency.EQUIPMENT_TICKET]: 2,
      [Currency.PET_FOOD]: 100,
      [Currency.PET_TICKET]: 1,
      [Currency.RUNE_DUST]: 500,
      [Currency.RUNE_TICKET]: 1,
      [Currency.BATTLE_PASS_EXP]: 0,
      // [Currency.GUILD_COIN]: 0, // Guild system removed
      [Currency.LUCKY_DRAW_TICKET]: 0,
      [Currency.WORLD_BOSS_ENERGY]: INITIAL_WORLD_BOSS_ENERGY,
      [Currency.WORLD_BOSS_COIN]: 0,
      vipExp: 0,
      currentStamina: INITIAL_STAMINA_CURRENT,
      maxStamina: INITIAL_STAMINA_MAX,
      totalSimulatedNTSpent: 0,
    };

    const initialCharacters: OwnedCharacter[] = REGULAR_CHARACTERS.slice(0, 2).map(bc => ({
        ...bc,
        level: 1,
        stars: 1,
        shards: 0,
        currentExp: 0,
        skills: bc.skills.map(s_base => { 
            const baseSkillDefForNewChar = BASE_SKILLS_DATA[s_base.id];
            if (!baseSkillDefForNewChar) {
                 console.error(`Initial character skill ID ${s_base.id} not found in BASE_SKILLS_DATA.`);
                 return { 
                    id: s_base.id,
                    name: "Unknown Skill",
                    description: "Error: Skill definition missing.",
                    emoji: "❓",
                    maxLevel: 1,
                    currentLevel: 1,
                    upgradeCost: () => ({}),
                 } as OwnedSkill;
            }
            return {
                ...(baseSkillDefForNewChar as Omit<BaseSkill, 'id'>),
                id: s_base.id,
                currentLevel: 1,
            };
        }),
        equipment: {},
        runes: Array(9).fill(null),
        assignedPetId: null, 
        statusEffects: [], 
        activeBuffDebuff: null, // Initialize activeBuffDebuff
    }));
    
    // Use the refined ArenaManager function for initial leaderboard
    const initialArenaLeaderboard = ArenaManager.createInitialArenaLeaderboard(ARENA_MAX_RANK, REGULAR_CHARACTERS, VIP_LEVELS);


    const baseInitialState: GameState = {
      playerName: gameplayInitialGameStateValues.playerName || DEFAULT_PLAYER_NAME,
      resources: initialPlayerResources,
      characters: initialCharacters,
      ownedEquipment: [],
      ownedPets: [],
      ownedRunes: [],
      battleTeamSlots: gameplayInitialGameStateValues.battleTeamSlots!, 
      lastStaminaUpdateTime: gameplayInitialGameStateValues.lastStaminaUpdateTime!, 
      endlessTowerMaxFloor: gameplayInitialGameStateValues.endlessTowerMaxFloor!, 
      currentEndlessTowerRun: gameplayInitialGameStateValues.currentEndlessTowerRun,
      worldBossLeaderboard: gameplayInitialGameStateValues.worldBossLeaderboard!, 
      playerWorldBossStats: gameplayInitialGameStateValues.playerWorldBossStats!, 
      lastWorldBossLeaderboardUpdateTime: gameplayInitialGameStateValues.lastWorldBossLeaderboardUpdateTime!, 
      lastTimePlayerWasAttackedInArena: gameplayInitialGameStateValues.lastTimePlayerWasAttackedInArena!, 
      lastArenaLeaderboardUpdateTime: gameplayInitialGameStateValues.lastArenaLeaderboardUpdateTime!,
      gachaAnnouncements: gameplayInitialGameStateValues.gachaAnnouncements!, 
      worldBossCycleIndex: gameplayInitialGameStateValues.worldBossCycleIndex!, 
      worldBossNpcCycleParticipants: gameplayInitialGameStateValues.worldBossNpcCycleParticipants!,
      worldBossNpcBatchesProcessedThisCycle: gameplayInitialGameStateValues.worldBossNpcBatchesProcessedThisCycle!,
      completedStages: [],
      currentChapter: 1,
      currentLevelInChapter: 1,
      vipLevel: 0,
      battlePassExp: 0,
      battlePassLevel: 1,
      battlePassPurchased: 'none',
      claimedBattlePassFreeTiers: [],
      claimedBattlePassPaidTiers: [],
      growthFundPurchased: false,
      claimedGrowthFundMilestones: [],
      activeMonthlyCardEndTime: null,
      activeLifetimeCard: false,
      firstPurchaseBonusUsed: {},
      purchasedOneTimeOffers: [],
      triggeredOffer: null,
      lastLoginTime: Date.now(),
      gachaPity: ALL_GACHA_POOLS.reduce((acc, pool) => {
        acc[pool.id] = { ssrCount: 0, upGuaranteed: false, totalPulls: 0 };
        return acc;
      }, {} as GameState['gachaPity']),
      battleLog: [],
      lastDailyReset: Date.now(),
      lastWeeklyReset: Date.now(),
      dailyDungeonAttempts: DUNGEONS_DEFINITIONS.reduce((acc, dungeon) => ({...acc, [dungeon.id]: dungeon.dailyAttempts }), {}),
      dailyArenaAttempts: ARENA_DAILY_ATTEMPTS,
      lastFreeDailyDiamondClaimTimestamp: null,
      dailyPurchaseLimits: [...SHOP_ITEMS_RESOURCES, ...SHOP_ITEMS_VIP_EXCLUSIVE, ...SHOP_ITEMS_SPECIALS].reduce((acc, item) => { // Removed SHOP_ITEMS_CURRENCY_STAMINA from here
        if(item.dailyLimit) acc[item.id] = { count: 0, lastPurchaseTime: 0 };
        return acc;
      }, {} as GameState['dailyPurchaseLimits']),
      arenaRank: ARENA_MAX_RANK, 
      arenaLeaderboard: initialArenaLeaderboard, // Use the generated one
      mails: [],
      taskProgress: { battlesWon: 0, stagesCleared: 0, heroesSummoned: 0, equipmentEnhanced: 0, battlesWonToday: 0, dungeonsClearedToday: 0, worldBossDamageDealtToday: 0, arenaBattlesWonToday: 0, petsEnhanced: 0, runesEnhanced: 0 },
      completedTasks: [],
      sevenDayLogin: {
        currentDay: 1,
        claimedToday: false,
        lastClaimTimestamp: null,
      },
      worldBoss: null,
      claimedArenaRank1Hero: false,
      claimedBombardiroHero: gameplayInitialGameStateValues.claimedBombardiroHero || false, 
      isProcessingArenaAction: gameplayInitialGameStateValues.isProcessingArenaAction || false,
      ultimateChallengeCurrentLevel: gameplayInitialGameStateValues.ultimateChallengeCurrentLevel || ULTIMATE_CHALLENGE_INITIAL_LEVEL,
      ultimateChallengeMaxLevelReached: gameplayInitialGameStateValues.ultimateChallengeMaxLevelReached || false,
    };

    const savedGame = localStorage.getItem('endlessSpendingSim_gameState_v3');
    let loadedState: GameState = baseInitialState;

    try {
        if (savedGame) {
            const parsed = JSON.parse(savedGame) as Partial<GameState>;

            let loadedCycleIndex = parsed.worldBossCycleIndex !== undefined ? parsed.worldBossCycleIndex : 0;
            let loadedWorldBossInstance: WorldBossInfo | null = null;
            
            if (WORLD_BOSSES_DEFINITIONS.length > 0) {
                const currentDefinitionForCycle = WORLD_BOSSES_DEFINITIONS[loadedCycleIndex % WORLD_BOSSES_DEFINITIONS.length];
                if (parsed.worldBoss && parsed.worldBoss.id === currentDefinitionForCycle.id) {
                    loadedWorldBossInstance = {
                        ...currentDefinitionForCycle,
                        currentHp: parsed.worldBoss.currentHp,
                        nextRefreshTime: parsed.worldBoss.nextRefreshTime,
                    };
                } else {
                    loadedWorldBossInstance = WorldBossManager.initializeWorldBoss(WORLD_BOSSES_DEFINITIONS, loadedCycleIndex);
                }
            }

            let loadedArenaLeaderboard = parsed.arenaLeaderboard && parsed.arenaLeaderboard.length > 0 
                ? parsed.arenaLeaderboard 
                : initialArenaLeaderboard;

            // Ensure player entry is correctly merged or added
            const savedPlayerArenaEntry = parsed.arenaLeaderboard?.find(e => e.playerId === 'player');
            const initialPlayerArenaEntry = initialArenaLeaderboard.find(e => e.playerId === 'player');
            
            if (savedPlayerArenaEntry) {
                loadedArenaLeaderboard = loadedArenaLeaderboard.filter(e => e.playerId !== 'player'); // Remove old player entry
                loadedArenaLeaderboard.push({ // Add merged player entry
                    ...initialPlayerArenaEntry!, // Base structure
                    ...savedPlayerArenaEntry, // Saved data
                    playerName: parsed.playerName || DEFAULT_PLAYER_NAME, // Ensure latest name
                    vipLevel: parsed.vipLevel || 0,
                    // combatPower will be recalculated if needed by context
                });
            } else if (initialPlayerArenaEntry && !loadedArenaLeaderboard.find(e => e.playerId === 'player')) {
                loadedArenaLeaderboard.push({
                     ...initialPlayerArenaEntry,
                     playerName: parsed.playerName || DEFAULT_PLAYER_NAME,
                     vipLevel: parsed.vipLevel || 0,
                     rank: parsed.arenaRank || ARENA_MAX_RANK
                });
            }
            // Normalize the loaded/merged leaderboard
            loadedArenaLeaderboard.sort((a,b) => a.rank - b.rank);
            const finalLoadedLeaderboard: ArenaLeaderboardEntry[] = [];
            const usedRanks = new Set<number>();
            let rankCounter = 1;
            loadedArenaLeaderboard.forEach(entry => {
                 while(usedRanks.has(rankCounter) && rankCounter <= ARENA_MAX_RANK) {
                     rankCounter++;
                 }
                 if (rankCounter <= ARENA_MAX_RANK) {
                     finalLoadedLeaderboard.push({...entry, rank: rankCounter});
                     usedRanks.add(rankCounter);
                     rankCounter++;
                 }
            });
            // If player is still missing after normalization attempt (e.g. leaderboard was very sparse from save)
             if (!finalLoadedLeaderboard.find(e => e.playerId === 'player')) {
                 const playerEntryToAdd = initialArenaLeaderboard.find(e => e.playerId === 'player')!;
                 playerEntryToAdd.playerName = parsed.playerName || DEFAULT_PLAYER_NAME;
                 playerEntryToAdd.vipLevel = parsed.vipLevel || 0;
                 playerEntryToAdd.rank = parsed.arenaRank || ARENA_MAX_RANK;
                 // Find a slot for the player
                 let playerRankSlot = playerEntryToAdd.rank;
                 while(finalLoadedLeaderboard.find(e => e.rank === playerRankSlot) && playerRankSlot <= ARENA_MAX_RANK) {
                     playerRankSlot++;
                 }
                 if (playerRankSlot <= ARENA_MAX_RANK) {
                    playerEntryToAdd.rank = playerRankSlot;
                    finalLoadedLeaderboard.push(playerEntryToAdd);
                    finalLoadedLeaderboard.sort((a,b) => a.rank - b.rank);
                 }
             }


            loadedState = {
                ...baseInitialState, 
                ...parsed, 
                playerName: parsed.playerName || DEFAULT_PLAYER_NAME,
                resources: { ...baseInitialState.resources, ...(parsed.resources || {}) },
                characters: (parsed.characters || baseInitialState.characters).map((char_saved: any) => { 
                    const baseCharDefinition = REGULAR_CHARACTERS.find(bc => bc.id === char_saved.id) || BASE_CHARACTERS.find(bc => bc.id === char_saved.id); 
                    if (!baseCharDefinition) {
                        console.warn(`Character ID ${char_saved.id} from save not found in BASE_CHARACTERS. Skipping character.`);
                        return null;
                    }

                    return { 
                        ...baseCharDefinition, 
                        ...char_saved, 
                        skills: (char_saved.skills && Array.isArray(char_saved.skills) && char_saved.skills.length > 0)
                            ? char_saved.skills.map((sk_saved: any) => {
                                const baseSkillDef = BASE_SKILLS_DATA[sk_saved.id];
                                if (!baseSkillDef) {
                                    console.warn(`Skill ID ${sk_saved.id} for char ${char_saved.id} from save not found in BASE_SKILLS_DATA. Using minimal fallback.`);
                                    return {
                                        id: sk_saved.id,
                                        name: "Unknown Skill",
                                        description: "Error: Skill definition missing.",
                                        emoji: "❓",
                                        maxLevel: 1,
                                        currentLevel: sk_saved.currentLevel || 1,
                                        upgradeCost: () => ({}),
                                    } as OwnedSkill;
                                }
                                return {
                                    ...(baseSkillDef as Omit<BaseSkill, 'id'>), 
                                    id: sk_saved.id, 
                                    currentLevel: sk_saved.currentLevel || 1,
                                };
                              }).filter(Boolean) as OwnedSkill[]
                            : baseCharDefinition.skills.map(s_base => {
                                const baseSkillDefForNewChar = BASE_SKILLS_DATA[s_base.id];
                                return {
                                    ...(baseSkillDefForNewChar as Omit<BaseSkill, 'id'>),
                                    id: s_base.id,
                                    currentLevel: 1,
                                };
                            }),
                        equipment: char_saved.equipment || {}, 
                        runes: char_saved.runes && char_saved.runes.length === 9 ? char_saved.runes : Array(9).fill(null),
                        assignedPetId: char_saved.assignedPetId || null, 
                        statusEffects: char_saved.statusEffects || [], 
                        activeBuffDebuff: char_saved.activeBuffDebuff || null, // Load or initialize
                    };
                }).filter(Boolean) as OwnedCharacter[],
                ownedEquipment: parsed.ownedEquipment || [],
                ownedPets: parsed.ownedPets || [],
                ownedRunes: parsed.ownedRunes || [],
                battleTeamSlots: parsed.battleTeamSlots && parsed.battleTeamSlots.length === MAX_HEROES_IN_BATTLE_TEAM ? parsed.battleTeamSlots : Array(MAX_HEROES_IN_BATTLE_TEAM).fill(null),
                lastStaminaUpdateTime: parsed.lastStaminaUpdateTime || Date.now(),
                gachaPity: { ...baseInitialState.gachaPity, ...(parsed.gachaPity || {}) },
                dailyDungeonAttempts: parsed.dailyDungeonAttempts || baseInitialState.dailyDungeonAttempts,
                taskProgress: { ...baseInitialState.taskProgress, ...(parsed.taskProgress || {})},
                lastFreeDailyDiamondClaimTimestamp: parsed.lastFreeDailyDiamondClaimTimestamp || null,
                sevenDayLogin: { ...baseInitialState.sevenDayLogin, ...(parsed.sevenDayLogin || {})},
                purchasedOneTimeOffers: parsed.purchasedOneTimeOffers || [],
                dailyPurchaseLimits: {...baseInitialState.dailyPurchaseLimits, ...(parsed.dailyPurchaseLimits || {})},
                dailyArenaAttempts: parsed.dailyArenaAttempts ?? ARENA_DAILY_ATTEMPTS,
                arenaRank: parsed.arenaRank ?? ARENA_MAX_RANK,
                arenaLeaderboard: finalLoadedLeaderboard.slice(0, ARENA_MAX_RANK),
                endlessTowerMaxFloor: parsed.endlessTowerMaxFloor || 0,
                currentEndlessTowerRun: parsed.currentEndlessTowerRun || null,
                worldBoss: loadedWorldBossInstance,
                worldBossCycleIndex: loadedCycleIndex,
                worldBossNpcCycleParticipants: parsed.worldBossNpcCycleParticipants || baseInitialState.worldBossNpcCycleParticipants,
                worldBossNpcBatchesProcessedThisCycle: parsed.worldBossNpcBatchesProcessedThisCycle || baseInitialState.worldBossNpcBatchesProcessedThisCycle,
                worldBossLeaderboard: parsed.worldBossLeaderboard || [],
                playerWorldBossStats: parsed.playerWorldBossStats || gameplayInitialGameStateValues.playerWorldBossStats!,
                lastWorldBossLeaderboardUpdateTime: parsed.lastWorldBossLeaderboardUpdateTime || 0,
                lastTimePlayerWasAttackedInArena: parsed.lastTimePlayerWasAttackedInArena ?? gameplayInitialGameStateValues.lastTimePlayerWasAttackedInArena!,
                lastArenaLeaderboardUpdateTime: parsed.lastArenaLeaderboardUpdateTime || 0,
                gachaAnnouncements: parsed.gachaAnnouncements || [],
                claimedArenaRank1Hero: parsed.claimedArenaRank1Hero || false,
                claimedBombardiroHero: parsed.claimedBombardiroHero || false, 
                isProcessingArenaAction: parsed.isProcessingArenaAction || false,
                ultimateChallengeCurrentLevel: parsed.ultimateChallengeCurrentLevel || gameplayInitialGameStateValues.ultimateChallengeCurrentLevel || ULTIMATE_CHALLENGE_INITIAL_LEVEL,
                ultimateChallengeMaxLevelReached: parsed.ultimateChallengeMaxLevelReached || gameplayInitialGameStateValues.ultimateChallengeMaxLevelReached || false,
            };
            
            const finalPlayerEntry = loadedState.arenaLeaderboard.find(e => e.playerId === 'player');
            if (finalPlayerEntry) {
                 loadedState.arenaRank = finalPlayerEntry.rank;
            } else {
                 loadedState.arenaRank = ARENA_MAX_RANK; // Fallback if player somehow not on normalized board
            }


            ALL_GACHA_POOLS.forEach(pool => {
                if (!loadedState.gachaPity[pool.id]) {
                    loadedState.gachaPity[pool.id] = { ssrCount: 0, upGuaranteed: false, totalPulls: 0 };
                }
            });
            [...SHOP_ITEMS_RESOURCES, ...SHOP_ITEMS_VIP_EXCLUSIVE, ...SHOP_ITEMS_SPECIALS].forEach(item => { // Removed SHOP_ITEMS_CURRENCY_STAMINA
                if (item.dailyLimit && !loadedState.dailyPurchaseLimits[item.id]) {
                    loadedState.dailyPurchaseLimits[item.id] = { count: 0, lastPurchaseTime: 0 };
                }
            });
            DUNGEONS_DEFINITIONS.forEach(dungeon => {
                 if (!loadedState.dailyDungeonAttempts[dungeon.id] && dungeon.dailyAttempts !== undefined) { 
                    loadedState.dailyDungeonAttempts[dungeon.id] = dungeon.dailyAttempts;
                } else if (loadedState.dailyDungeonAttempts[dungeon.id] === undefined && dungeon.dailyAttempts !== undefined) {
                     loadedState.dailyDungeonAttempts[dungeon.id] = dungeon.dailyAttempts;
                }
            });

             if (loadedState.resources[Currency.WORLD_BOSS_ENERGY] === undefined) {
                loadedState.resources[Currency.WORLD_BOSS_ENERGY] = INITIAL_WORLD_BOSS_ENERGY;
            }
            if (loadedState.resources[Currency.WORLD_BOSS_COIN] === undefined) {
                loadedState.resources[Currency.WORLD_BOSS_COIN] = 0;
            }
             if (loadedState.resources[Currency.ARENA_COIN] === undefined) {
                loadedState.resources[Currency.ARENA_COIN] = 100;
            }
             if (loadedState.resources[Currency.BATTLE_PASS_EXP] === undefined) {
                loadedState.resources[Currency.BATTLE_PASS_EXP] = 0;
            }


            if (loadedState.battleTeamSlots.every(slot => slot === null) && loadedState.characters.length > 0) {
                const strongestHeroes = loadedState.characters
                    .slice()
                    .sort((a,b) => CharacterManager.calculateCharacterPower(b, loadedState, VIP_LEVELS) - CharacterManager.calculateCharacterPower(a, loadedState, VIP_LEVELS))
                    .slice(0, MAX_HEROES_IN_BATTLE_TEAM);
                loadedState.battleTeamSlots = Array(MAX_HEROES_IN_BATTLE_TEAM).fill(null).map((_, i) => strongestHeroes[i]?.id || null);
            }
        }
    } catch (error) {
        console.error("Failed to parse saved game state, using default:", error);
        loadedState = baseInitialState; 
    }
    
    if (!loadedState.worldBoss && WORLD_BOSSES_DEFINITIONS.length > 0) { 
        loadedState.worldBoss = WorldBossManager.initializeWorldBoss(WORLD_BOSSES_DEFINITIONS, loadedState.worldBossCycleIndex);
    }
    
    loadedState.arenaLeaderboard = loadedState.arenaLeaderboard.map(entry => {
        if (entry.playerId !== 'player' && (!entry.teamPreview || entry.teamPreview.length === 0)) {
            const numTeamMembers = (entry.rank <= 50) ? MAX_HEROES_IN_BATTLE_TEAM : Math.floor(Math.random() * (MAX_HEROES_IN_BATTLE_TEAM - 2)) + 3;
            return { ...entry, teamPreview: generateArenaNpcTeamData(entry.rank, numTeamMembers, REGULAR_CHARACTERS) }; 
        }
        return entry;
    });
    if (loadedState.arenaLeaderboard.length < (ARENA_MAX_RANK -1) && ARENA_MAX_RANK <= 5000) { // Increased limit for more NPCs
        const additionalNpcsNeeded = ARENA_MAX_RANK - loadedState.arenaLeaderboard.length;
        const additionalNpcs = ArenaManager.createInitialArenaLeaderboard(ARENA_MAX_RANK, REGULAR_CHARACTERS, VIP_LEVELS)
            .filter(npc => npc.playerId !== 'player') // Ensure we only add NPCs
            .slice(0, additionalNpcsNeeded); 
        
        const existingIds = new Set(loadedState.arenaLeaderboard.map(e => e.playerId));
        let rankToAssign = 1;
        additionalNpcs.forEach(newNpc => {
            if (!existingIds.has(newNpc.playerId) && loadedState.arenaLeaderboard.length < ARENA_MAX_RANK) {
                while(loadedState.arenaLeaderboard.some(e => e.rank === rankToAssign) || (loadedState.arenaRank === rankToAssign && newNpc.playerId !== 'player')) {
                    rankToAssign++;
                    if (rankToAssign > ARENA_MAX_RANK) break;
                }
                if (rankToAssign <= ARENA_MAX_RANK) {
                     newNpc.rank = rankToAssign;
                     loadedState.arenaLeaderboard.push(newNpc);
                     existingIds.add(newNpc.playerId);
                }
            }
        });
        loadedState.arenaLeaderboard.sort((a,b) => a.rank - b.rank);
        // Final re-normalization after adding NPCs
        loadedState.arenaLeaderboard.forEach((entry, index) => entry.rank = index + 1);
    }
    
    // Ensure player's rank is accurately reflected from the possibly re-normalized board
    const finalPlayerEntryCheck = loadedState.arenaLeaderboard.find(e => e.playerId === 'player');
    if (finalPlayerEntryCheck) {
        loadedState.arenaRank = finalPlayerEntryCheck.rank;
    }


    return loadedState;
};
