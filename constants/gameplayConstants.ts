
import { Stage, VIPLevel, Dungeon, Task, TaskType, SevenDayLoginReward, Currency, CharacterRarity, ElementType, WorldBossInfo, GameState, PlayerResources, OwnedCharacter, OwnedEquipmentItem, OwnedRune, GachaAnnouncement, DungeonRewardTier } from '../types';
import { BASE_CHARACTERS, BASE_SKILLS_DATA, REGULAR_CHARACTERS } from './characterConstants';
import { BASE_EQUIPMENT_ITEMS } from './equipmentConstants';
import { getPlayerLevelForProgress as calculatePlayerLevelForProgress } from '../lib/game-logic/eventManager';
import { isToday } from '../lib/game-logic/utils';


export const INITIAL_GOLD = 10000;
export const INITIAL_DIAMONDS = 500;
export const INITIAL_STAMINA_MAX = 120;
export const INITIAL_STAMINA_CURRENT = 120;
export const STAMINA_REGEN_RATE_PER_MINUTE = 1 / 5; 
export const MILLISECONDS_PER_STAMINA_POINT = 5 * 60 * 1000;
export const BATTLE_COST_STAMINA = 10;
export const ARENA_BATTLE_COST_STAMINA = 5;
export const ENDLESS_TOWER_FLOOR_COST_STAMINA = 5;
export const MAX_HEROES_IN_BATTLE_TEAM = 5;
export const INITIAL_WORLD_BOSS_ENERGY = 5;
export const WORLD_BOSS_ATTACK_COST = 1; 
export const WORLD_BOSS_REFRESH_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes
export const WORLD_BOSS_LEADERBOARD_VISUAL_UPDATE_INTERVAL_MS = 10 * 1000; // 10 seconds for visual jiggle
export const NPC_ACTUAL_DAMAGE_SIMULATION_INTERVAL_MS = 10 * 1000; // 10 seconds for actual NPC damage simulation
export const MAX_WORLD_BOSS_ATTACKS_PER_CYCLE = 5;
export const MAX_TURNS_WORLD_BOSS_FIGHT = 30; // Max turns for a full World Boss battle simulation

export const PLAYER_ARENA_DEFENSE_COOLDOWN_MS = 30 * 1000; // 30 seconds
export const ARENA_LEADERBOARD_UPDATE_INTERVAL_MS = 20 * 1000; // 20 seconds for NPC leaderboard dynamics & challenges
export const NPC_ARENA_CHALLENGES_PER_INTERVAL = 5; // Number of NPC challenges per interval


export const ARENA_DEFENSE_RANK_CHANGE_LOSS = 10; // How much rank player loses if their defense fails.
export const ARENA_DEFENSE_RANK_CHANGE_WIN_NPC = 5; // How much rank an NPC gains if they "win" a defense (player's rank drops more)
export const ARENA_DEFENSE_SUCCESS_TOKENS = 15; // Arena coins for successful defense.
export const ARENA_OPPONENT_RANK_FACTOR_LOWER = 0.65; 
export const ARENA_OPPONENT_RANK_FACTOR_UPPER = 0.75;


export const ELEMENT_ADVANTAGE: Record<ElementType, ElementType> = {
  [ElementType.WATER]: ElementType.FIRE,
  [ElementType.FIRE]: ElementType.WIND,
  [ElementType.WIND]: ElementType.THUNDER,
  [ElementType.THUNDER]: ElementType.WATER,
  [ElementType.LIGHT]: ElementType.DARK,
  [ElementType.DARK]: ElementType.LIGHT,
};

const tempStages: Stage[] = [];
let initialPower = 800; // Starting power for stage 1-1

for (let i = 0; i < 20 * 10; i++) {
  const chapter = Math.floor(i / 10) + 1;
  const levelInChapter = (i % 10) + 1;
  const isBoss = levelInChapter === 10;
  let currentRecommendedPower: number;

  if (i === 0) {
    currentRecommendedPower = initialPower;
  } else {
    const prevStagePower = tempStages[i-1].recommendedPower;
    if (isBoss) {
      currentRecommendedPower = Math.floor(prevStagePower * 1.12 + (chapter * 250)); // Gentler boss jump
    } else {
      currentRecommendedPower = Math.floor(prevStagePower * 1.05 + (chapter * 60 + 120)); // Gentler normal stage increase
    }
  }

  const enemyCharacterPool = REGULAR_CHARACTERS.length > 0 ? REGULAR_CHARACTERS : BASE_CHARACTERS; // Use regular characters, fallback to all if empty
  const enemyForStage = enemyCharacterPool[Math.min(Math.max(0, chapter-1), enemyCharacterPool.length -1)];
  const equipmentDropIds = (chapter % 2 === 0 && levelInChapter % 4 === 0 && BASE_EQUIPMENT_ITEMS.length > 0) ? [BASE_EQUIPMENT_ITEMS[Math.floor(Math.random() * BASE_EQUIPMENT_ITEMS.length)].id] : undefined;

  tempStages.push({
    id: `stage-${chapter}-${levelInChapter}`,
    chapter,
    levelInChapter,
    name: isBoss ? `第 ${chapter} 章 BOSS - ${enemyForStage.name}` : `關卡 ${chapter}-${levelInChapter}`,
    recommendedPower: currentRecommendedPower,
    isBoss,
    enemies: [{...enemyForStage, level: chapter * 5, stars: Math.min(7, chapter) }], // Enemy stats scale with chapter
    rewards: {
      [Currency.GOLD]: 100 * chapter,
      [Currency.EXP_POTION]: 5 * chapter,
      [Currency.BATTLE_PASS_EXP]: 10 + chapter,
      firstClearDiamonds: isBoss ? 50 * chapter : 10 * chapter,
      equipmentDropIds,
    },
  });
}
export const GAME_STAGES: Stage[] = tempStages;


export const VIP_LEVELS: VIPLevel[] = [
  { level: 0, expRequired: 0, perks: ["基本權限"] },
  { level: 1, expRequired: 150, perks: ["解鎖關卡掃蕩功能"] },
  { level: 2, expRequired: 500, perks: ["每日體力購買上限+1"], dailyStaminaPurchaseLimitIncrease: 1},
  { level: 3, expRequired: 1000, perks: ["每日黃金礦洞挑戰次數+1"], dungeonAttemptsIncrease: {gold_mine: 1}},
  { level: 4, expRequired: 2500, perks: ["每日競技場挑戰次數+1"], arenaAttemptsIncrease: 1 },
  { level: 5, expRequired: 5000, perks: ["每日經驗聖殿挑戰次數+1"], dungeonAttemptsIncrease: {exp_temple: 1} },
  { level: 6, expRequired: 12000, perks: ["專屬頭像框 (VIP6)", "離線收益(金幣/經驗)+5%"], offlineEarningsBonusPercent: 5 },
  { level: 7, expRequired: 25000, perks: ["每日技能書試煉挑戰次數+1"], dungeonAttemptsIncrease: {skill_book_trial: 1}},
  { level: 8, expRequired: 50000, perks: ["專屬聊天氣泡 (VIP8)", "世界BOSS挑戰能量上限+1"] },
  { level: 9, expRequired: 75000, perks: ["每日強化石礦場挑戰次數+1"], dungeonAttemptsIncrease: {enhancement_stone_quarry: 1} },
  { level: 10, expRequired: 120000, perks: ["VIP專屬商店頁籤開啟", "每日可免費重置資源商店限購1次"], exclusiveShopPackId: 'vip10_pack' },
  { level: 11, expRequired: 180000, perks: ["每日贈送1張普通英雄召喚券"], dailyFreeGachaTicket: Currency.GACHA_TICKET },
  { level: 12, expRequired: 250000, perks: ["限定SSR寵物 (火鳳凰)", "全隊攻擊+5%"], bonusAttackPercent: 5 },
  { level: 13, expRequired: 500000, perks: ["專屬翅膀外觀 (VIP13)", "離線收益(金幣/經驗)+10%"], offlineEarningsBonusPercent: 10 },
  { level: 14, expRequired: 750000, perks: ["全隊屬性+5%", "每日可免費重置副本挑戰次數1次"], bonusAllStatsPercent: 5 },
  { level: 15, expRequired: 1000000, perks: ["限定UR英雄 (海洋女皇)", "每日競技場挑戰次數+2", "世界BOSS傷害+10%"], arenaAttemptsIncrease: 2 },
];

export const DUNGEONS_DEFINITIONS: Dungeon[] = [
  { 
    id: 'gold_mine', name: '黃金礦洞', description: '獲取大量金幣', 
    cost: [{currency: Currency.STAMINA, amount: 10}], 
    isDamageBasedReward: true,
    baseRewards: { [Currency.GOLD]: 5000, [Currency.BATTLE_PASS_EXP]: 2 },
    rewardTiers: [
        { damageThreshold: 25000, rewards: { [Currency.GOLD]: 15000 } },
        { damageThreshold: 100000, rewards: { [Currency.GOLD]: 30000 } },
        { damageThreshold: 300000, rewards: { [Currency.GOLD]: 50000, [Currency.BATTLE_PASS_EXP]: 5 } },
        { damageThreshold: 700000, rewards: { [Currency.GOLD]: 70000, [Currency.BATTLE_PASS_EXP]: 10, [Currency.DIAMONDS]: 5 } },
    ],
    dailyAttempts: 2, emoji: '💰', powerCheckMultiplier: 0.6 
  },
  { 
    id: 'exp_temple', name: '經驗聖殿', description: '獲取大量經驗藥水', 
    cost: [{currency: Currency.STAMINA, amount: 10}], 
    isDamageBasedReward: true,
    baseRewards: { [Currency.EXP_POTION]: 2000, [Currency.BATTLE_PASS_EXP]: 2 },
    rewardTiers: [
        { damageThreshold: 25000, rewards: { [Currency.EXP_POTION]: 8000 } },
        { damageThreshold: 100000, rewards: { [Currency.EXP_POTION]: 15000 } },
        { damageThreshold: 300000, rewards: { [Currency.EXP_POTION]: 25000, [Currency.BATTLE_PASS_EXP]: 5 } },
        { damageThreshold: 700000, rewards: { [Currency.EXP_POTION]: 35000, [Currency.BATTLE_PASS_EXP]: 10, [Currency.DIAMONDS]: 5 } },
    ],
    dailyAttempts: 2, emoji: '🧪', powerCheckMultiplier: 0.6 
  },
  { 
    id: 'skill_book_trial', name: '技能書試煉', description: '獲取技能書', 
    cost: [{currency: Currency.STAMINA, amount: 15}], 
    isDamageBasedReward: true,
    baseRewards: { [Currency.SKILL_BOOK_NORMAL]: 1, [Currency.BATTLE_PASS_EXP]: 3 },
    rewardTiers: [
        { damageThreshold: 50000, rewards: { [Currency.SKILL_BOOK_NORMAL]: 2 } },
        { damageThreshold: 200000, rewards: { [Currency.SKILL_BOOK_NORMAL]: 2, [Currency.SKILL_BOOK_ADVANCED]: 1 } },
        { damageThreshold: 500000, rewards: { [Currency.SKILL_BOOK_ADVANCED]: 1, [Currency.BATTLE_PASS_EXP]: 10, [Currency.DIAMONDS]: 10 } },
    ],
    dailyAttempts: 1, emoji: '📚', powerCheckMultiplier: 0.7 
  },
  { 
    id: 'enhancement_stone_quarry', name: '強化石礦場', description: '獲取裝備強化石', 
    cost: [{currency: Currency.STAMINA, amount: 15}], 
    isDamageBasedReward: true,
    baseRewards: { [Currency.ENHANCEMENT_STONE]: 20, [Currency.BATTLE_PASS_EXP]: 3 },
    rewardTiers: [
        { damageThreshold: 50000, rewards: { [Currency.ENHANCEMENT_STONE]: 80 } },
        { damageThreshold: 200000, rewards: { [Currency.ENHANCEMENT_STONE]: 150 } },
        { damageThreshold: 500000, rewards: { [Currency.ENHANCEMENT_STONE]: 250, [Currency.BATTLE_PASS_EXP]: 10, [Currency.DIAMONDS]: 10 } },
    ],
    dailyAttempts: 1, emoji: '⛏️', powerCheckMultiplier: 0.7 
  },
  { id: 'endless_tower', name: '無盡之塔', description: '挑戰極限，贏取豐厚獎勵', cost: [{currency: Currency.STAMINA, amount: ENDLESS_TOWER_FLOOR_COST_STAMINA }], baseRewards: {}, dailyAttempts: 1, emoji: '🗼', isEndlessTower: true },
];

export const ARENA_DAILY_ATTEMPTS = 5;
export const ARENA_TOKENS_PER_WIN = 50;
export const ARENA_TOKENS_PER_LOSS = 20;
export const ARENA_MAX_RANK = 500;


export const DAILY_TASKS_DEFINITIONS: Task[] = [
  { id: 'daily_login', type: TaskType.DAILY, description: '每日登入', targetCount: 1, conditionFunction: (gs: GameState) => (gs.sevenDayLogin.claimedToday && isToday(gs.sevenDayLogin.lastClaimTimestamp)) || (gs.lastDailyReset > Date.now() - 5 * 60 * 1000), rewards: { [Currency.GOLD]: 5000, [Currency.BATTLE_PASS_EXP]: 10 }, emoji: '🗓️' },
  { id: 'daily_battle_3', type: TaskType.DAILY, description: '完成3場任意戰鬥', targetCount: 3, conditionProperty: 'battlesWonToday', rewards: { [Currency.STAMINA]: 20, [Currency.BATTLE_PASS_EXP]: 15 }, emoji: '⚔️' },
  { id: 'daily_dungeon_1', type: TaskType.DAILY, description: '完成1次每日副本', targetCount: 1, conditionProperty: 'dungeonsClearedToday', rewards: { [Currency.DIAMONDS]: 20, [Currency.BATTLE_PASS_EXP]: 20 }, emoji: '🔑' },
  { id: 'daily_arena_1', type: TaskType.DAILY, description: '完成1場競技場挑戰', targetCount: 1, conditionProperty: 'arenaBattlesWonToday', rewards: { [Currency.ARENA_COIN]: 30, [Currency.BATTLE_PASS_EXP]: 15 }, emoji: '🛡️' },
  { id: 'daily_worldboss_1', type: TaskType.DAILY, description: '對世界頭目造成100萬傷害', targetCount: 1000000, conditionProperty: 'worldBossDamageDealtToday', rewards: { [Currency.WORLD_BOSS_COIN]: 20, [Currency.BATTLE_PASS_EXP]: 25 }, emoji: '🐲' },
  { id: 'daily_enhance_pet_1', type: TaskType.DAILY, description: '強化寵物1次', targetCount: 1, conditionProperty: 'petsEnhanced', rewards: { [Currency.PET_FOOD]: 50, [Currency.BATTLE_PASS_EXP]: 10 }, emoji: '🐾' },
  { id: 'daily_enhance_rune_1', type: TaskType.DAILY, description: '強化符文1次', targetCount: 1, conditionProperty: 'runesEnhanced', rewards: { [Currency.RUNE_DUST]: 100, [Currency.BATTLE_PASS_EXP]: 10 }, emoji: '🗿' },
];

export const WEEKLY_TASKS_DEFINITIONS: Task[] = [
  { id: 'weekly_battle_50', type: TaskType.WEEKLY, description: '本週完成50場任意戰鬥', targetCount: 50, conditionProperty: 'battlesWon', rewards: { [Currency.GACHA_TICKET]: 1, [Currency.BATTLE_PASS_EXP]: 100 }, emoji: '🏅' },
  { id: 'weekly_summon_10', type: TaskType.WEEKLY, description: '本週召喚10次英雄', targetCount: 10, conditionProperty: 'heroesSummoned', rewards: { [Currency.DIAMONDS]: 100, [Currency.BATTLE_PASS_EXP]: 80 }, emoji: '🌟' },
];

export const ACHIEVEMENT_TASK_CHAINS: string[][] = [
    ['ach_clear_stage_1_10', 'ach_clear_stage_5_10', 'ach_clear_stage_10_10', 'ach_clear_stage_15_10', 'ach_clear_stage_20_10'],
    ['ach_reach_level_10', 'ach_reach_level_20', 'ach_reach_level_30', 'ach_reach_level_40', 'ach_reach_level_50'],
    ['ach_collect_5_ssr_ur', 'ach_collect_10_ssr_ur', 'ach_collect_15_ssr_ur'],
    ['ach_et_floor_25', 'ach_et_floor_50', 'ach_et_floor_75', 'ach_et_floor_100'],
    ['ach_arena_rank_3000', 'ach_arena_rank_1000', 'ach_arena_rank_100', 'ach_arena_rank_10', 'ach_arena_rank_1'],
    ['ach_sim_spend_1000', 'ach_sim_spend_10000', 'ach_sim_spend_50000', 'ach_sim_spend_100000'],
];
export const STANDALONE_ACHIEVEMENT_IDS: string[] = [
    'ach_hero_7_star', 
    'ach_equip_plus_20',
    'ach_reach_vip5',
    'ach_own_all_hidden_heroes'
];

export const ACHIEVEMENT_TASKS_DEFINITIONS: Task[] = [
  { id: 'ach_clear_stage_1_10', type: TaskType.ACHIEVEMENT, description: '通關主線1-10', targetCount: 1, conditionFunction: (gs: GameState) => gs.completedStages.includes('stage-1-10'), rewards: { [Currency.DIAMONDS]: 100 }, emoji: '🏁' },
  { id: 'ach_clear_stage_5_10', type: TaskType.ACHIEVEMENT, description: '通關主線5-10', targetCount: 1, conditionFunction: (gs: GameState) => gs.completedStages.includes('stage-5-10'), rewards: { [Currency.DIAMONDS]: 300, [Currency.GACHA_TICKET]: 1 }, emoji: '🏆' },
  { id: 'ach_clear_stage_10_10', type: TaskType.ACHIEVEMENT, description: '通關主線10-10', targetCount: 1, conditionFunction: (gs: GameState) => gs.completedStages.includes('stage-10-10'), rewards: { [Currency.DIAMONDS]: 500, [Currency.GACHA_TICKET]: 2 }, characterShards: {charId: 'c004', amount: 20}, emoji: '🏆🏆' },
  { id: 'ach_clear_stage_15_10', type: TaskType.ACHIEVEMENT, description: '通關主線15-10', targetCount: 1, conditionFunction: (gs: GameState) => gs.completedStages.includes('stage-15-10'), rewards: { [Currency.DIAMONDS]: 750, [Currency.PET_TICKET]: 3 }, emoji: '🏆🏆🏆' },
  { id: 'ach_clear_stage_20_10', type: TaskType.ACHIEVEMENT, description: '通關主線20-10 (最終章)', targetCount: 1, conditionFunction: (gs: GameState) => gs.completedStages.includes('stage-20-10'), rewards: { [Currency.DIAMONDS]: 1500, [Currency.EQUIPMENT_TICKET]: 5 }, emoji: '🌟🏆🌟' },
  { id: 'ach_reach_level_10', type: TaskType.ACHIEVEMENT, description: '玩家等級達到10級', targetCount: 1, conditionFunction: (gs: GameState) => calculatePlayerLevelForProgress(gs, GAME_STAGES) >= 10, rewards: { [Currency.GOLD]: 50000, [Currency.EXP_POTION]: 10000 }, emoji: '📈' },
  { id: 'ach_reach_level_20', type: TaskType.ACHIEVEMENT, description: '玩家等級達到20級', targetCount: 1, conditionFunction: (gs: GameState) => calculatePlayerLevelForProgress(gs, GAME_STAGES) >= 20, rewards: { [Currency.DIAMONDS]: 200, [Currency.EXP_POTION]: 20000 }, emoji: '🚀' },
  { id: 'ach_reach_level_30', type: TaskType.ACHIEVEMENT, description: '玩家等級達到30級', targetCount: 1, conditionFunction: (gs: GameState) => calculatePlayerLevelForProgress(gs, GAME_STAGES) >= 30, rewards: { [Currency.DIAMONDS]: 300, [Currency.GACHA_TICKET]: 1 }, emoji: '🚀🚀' },
  { id: 'ach_reach_level_40', type: TaskType.ACHIEVEMENT, description: '玩家等級達到40級', targetCount: 1, conditionFunction: (gs: GameState) => calculatePlayerLevelForProgress(gs, GAME_STAGES) >= 40, rewards: { [Currency.DIAMONDS]: 400, [Currency.SKILL_BOOK_ADVANCED]: 5 }, emoji: '🚀🚀🚀' },
  { id: 'ach_reach_level_50', type: TaskType.ACHIEVEMENT, description: '玩家等級達到50級', targetCount: 1, conditionFunction: (gs: GameState) => calculatePlayerLevelForProgress(gs, GAME_STAGES) >= 50, rewards: { [Currency.DIAMONDS]: 500, [Currency.GACHA_TICKET]: 3 }, emoji: '🌌' },
  { id: 'ach_collect_5_ssr_ur', type: TaskType.ACHIEVEMENT, description: '收集5名SSR/UR英雄', targetCount: 5, conditionFunction: (gs: GameState) => gs.characters.filter(c => c.rarity === CharacterRarity.SSR || c.rarity === CharacterRarity.UR).length >= 5, rewards: { [Currency.GACHA_TICKET]: 3 }, emoji: '🦸' },
  { id: 'ach_collect_10_ssr_ur', type: TaskType.ACHIEVEMENT, description: '收集10名SSR/UR英雄', targetCount: 10, conditionFunction: (gs: GameState) => gs.characters.filter(c => c.rarity === CharacterRarity.SSR || c.rarity === CharacterRarity.UR).length >= 10, rewards: { [Currency.GACHA_TICKET]: 5, [Currency.DIAMONDS]: 500 }, emoji: '🌟' },
  { id: 'ach_collect_15_ssr_ur', type: TaskType.ACHIEVEMENT, description: '收集15名SSR/UR英雄', targetCount: 15, conditionFunction: (gs: GameState) => gs.characters.filter(c => c.rarity === CharacterRarity.SSR || c.rarity === CharacterRarity.UR).length >= 15, rewards: { [Currency.GACHA_TICKET]: 10, [Currency.DIAMONDS]: 1000 }, emoji: '🌟🌟' },
  { id: 'ach_hero_7_star', type: TaskType.ACHIEVEMENT, description: '任意英雄達到7星', targetCount: 1, conditionFunction: (gs: GameState) => gs.characters.some(c => c.stars === 7), rewards: { [Currency.BREAKTHROUGH_STONE]: 200, [Currency.SKILL_BOOK_ADVANCED]: 10 }, emoji: '⭐' },
  { id: 'ach_equip_plus_20', type: TaskType.ACHIEVEMENT, description: '任意裝備強化+20', targetCount: 1, conditionFunction: (gs: GameState) => gs.ownedEquipment.some(e => e.enhancementLevel >= 20), rewards: { [Currency.ENHANCEMENT_STONE]: 500, [Currency.GOLD]: 200000 }, emoji: '🔨' },
  { id: 'ach_et_floor_25', type: TaskType.ACHIEVEMENT, description: '通關無盡之塔25層', targetCount: 1, conditionFunction: (gs: GameState) => gs.endlessTowerMaxFloor >= 25, rewards: { [Currency.DIAMONDS]: 250, [Currency.RUNE_TICKET]: 1 }, emoji: '🗼' },
  { id: 'ach_et_floor_50', type: TaskType.ACHIEVEMENT, description: '通關無盡之塔50層', targetCount: 1, conditionFunction: (gs: GameState) => gs.endlessTowerMaxFloor >= 50, rewards: { [Currency.DIAMONDS]: 500, [Currency.RUNE_TICKET]: 2 }, emoji: '🗼🗼' },
  { id: 'ach_et_floor_75', type: TaskType.ACHIEVEMENT, description: '通關無尽之塔75層', targetCount: 1, conditionFunction: (gs: GameState) => gs.endlessTowerMaxFloor >= 75, rewards: { [Currency.DIAMONDS]: 750, [Currency.RUNE_TICKET]: 3 }, emoji: '🗼🗼🗼' },
  { id: 'ach_et_floor_100', type: TaskType.ACHIEVEMENT, description: '通關無尽之塔100層', targetCount: 1, conditionFunction: (gs: GameState) => gs.endlessTowerMaxFloor >= 100, rewards: { [Currency.DIAMONDS]: 1000, [Currency.RUNE_TICKET]: 5 }, characterShards: {charId: 'c012', amount: 20}, emoji: '🏛️' },
  { id: 'ach_arena_rank_3000', type: TaskType.ACHIEVEMENT, description: '競技場排名進入前3000', targetCount: 1, conditionFunction: (gs: GameState) => gs.arenaRank <= 3000 && gs.arenaRank > 0, rewards: { [Currency.ARENA_COIN]: 500, [Currency.DIAMONDS]: 150 }, emoji: '⚔️' },
  { id: 'ach_arena_rank_1000', type: TaskType.ACHIEVEMENT, description: '競技場排名進入前1000', targetCount: 1, conditionFunction: (gs: GameState) => gs.arenaRank <= 1000 && gs.arenaRank > 0, rewards: { [Currency.ARENA_COIN]: 1000, [Currency.DIAMONDS]: 300 }, emoji: '⚔️⚔️' },
  { id: 'ach_arena_rank_100', type: TaskType.ACHIEVEMENT, description: '競技場排名進入前100', targetCount: 1, conditionFunction: (gs: GameState) => gs.arenaRank <= 100 && gs.arenaRank > 0, rewards: { [Currency.ARENA_COIN]: 1500, [Currency.DIAMONDS]: 500 }, emoji: '⚔️⚔️⚔️' },
  { id: 'ach_arena_rank_10', type: TaskType.ACHIEVEMENT, description: '競技場排名進入前10', targetCount: 1, conditionFunction: (gs: GameState) => gs.arenaRank <= 10 && gs.arenaRank > 0, rewards: { [Currency.ARENA_COIN]: 2000, [Currency.DIAMONDS]: 1000 }, emoji: '🥇' },
  { id: 'ach_arena_rank_1', type: TaskType.ACHIEVEMENT, description: '競技場排名第1', targetCount: 1, conditionFunction: (gs: GameState) => gs.arenaRank === 1, rewards: { [Currency.ARENA_COIN]: 5000, [Currency.DIAMONDS]: 2000 }, characterShards: {charId: 'c009', amount: 50}, emoji: '🏆🥇' },
  { id: 'ach_sim_spend_1000', type: TaskType.ACHIEVEMENT, description: '總模擬消費達到 NT$1,000', targetCount: 1000, conditionFunction: (gs: GameState) => gs.resources.totalSimulatedNTSpent >= 1000, rewards: { [Currency.GACHA_TICKET]: 2 }, emoji: '💸' },
  { id: 'ach_sim_spend_10000', type: TaskType.ACHIEVEMENT, description: '總模擬消費達到 NT$10,000', targetCount: 10000, conditionFunction: (gs: GameState) => gs.resources.totalSimulatedNTSpent >= 10000, rewards: { [Currency.GACHA_TICKET]: 10, [Currency.DIAMONDS]: 1000 }, emoji: '💰' },
  { id: 'ach_sim_spend_50000', type: TaskType.ACHIEVEMENT, description: '總模擬消費達到 NT$50,000', targetCount: 50000, conditionFunction: (gs: GameState) => gs.resources.totalSimulatedNTSpent >= 50000, rewards: { [Currency.GACHA_TICKET]: 20, [Currency.DIAMONDS]: 2000 }, emoji: '💰💰' },
  { id: 'ach_sim_spend_100000', type: TaskType.ACHIEVEMENT, description: '總模擬消費達到 NT$100,000', targetCount: 100000, conditionFunction: (gs: GameState) => gs.resources.totalSimulatedNTSpent >= 100000, rewards: { [Currency.GACHA_TICKET]: 30, [Currency.DIAMONDS]: 5000 }, characterShards: {charId: 'c014', amount: 30}, emoji: '💎💰💎' },
  { id: 'ach_reach_vip5', type: TaskType.ACHIEVEMENT, description: '達到 VIP 5 級', targetCount: 1, conditionFunction: (gs: GameState) => gs.vipLevel >= 5, rewards: { [Currency.DIAMONDS]: 200, [Currency.PET_TICKET]: 1 }, emoji: '👑' },
  { id: 'ach_own_all_hidden_heroes', type: TaskType.ACHIEVEMENT, description: '集齊所有隱藏英雄', targetCount: 1, conditionFunction: (gs) => ['c_konami', 'c_cappuccino', 'c_tralala', 'c_bombardiro', 'c_moguanyu'].every(id => gs.characters.some(c => c.id === id)), rewards: { [Currency.DIAMONDS]: 8888 }, emoji: '🤫' },
];


export const SEVEN_DAY_LOGIN_REWARDS: SevenDayLoginReward[] = [
  { day: 1, description: '新手啟程禮', rewards: { [Currency.GOLD]: 20000, [Currency.EXP_POTION]: 10000 }, emoji: '🎁' },
  { day: 2, description: '英雄召喚券x2', rewards: { [Currency.GACHA_TICKET]: 2 }, emoji: '🎟️' },
  { day: 3, description: '鑽石x200', rewards: { [Currency.DIAMONDS]: 200 }, emoji: '💎' },
  { day: 4, description: 'SR英雄碎片x30 (風語者)', rewards: { [Currency.GOLD]: 50000 }, characterShards: {charId: 'c003', amount: 30}, emoji: '🦸' },
  { day: 5, description: '高級技能書x5', rewards: { [Currency.SKILL_BOOK_ADVANCED]: 5 }, emoji: '📖' },
  { day: 6, description: '突破石x100', rewards: { [Currency.BREAKTHROUGH_STONE]: 100 }, emoji: '💠' },
  { day: 7, description: '強力SR英雄 (風語者)', rewards: { [Currency.DIAMONDS]: 500 }, characterShards: {charId: 'c003', amount: 0}, emoji: '🌟' },
];


export const WORLD_BOSS_RANK_REWARDS: Array<{minRank: number, maxRank: number, rewards: Partial<Record<Currency, number>>}> = [
    { minRank: 1, maxRank: 1, rewards: { [Currency.WORLD_BOSS_COIN]: 1000, [Currency.DIAMONDS]: 500, [Currency.RUNE_TICKET]: 2 } },
    { minRank: 2, maxRank: 3, rewards: { [Currency.WORLD_BOSS_COIN]: 700, [Currency.DIAMONDS]: 300, [Currency.RUNE_TICKET]: 1 } },
    { minRank: 4, maxRank: 10, rewards: { [Currency.WORLD_BOSS_COIN]: 500, [Currency.DIAMONDS]: 150 } },
    { minRank: 11, maxRank: 20, rewards: { [Currency.WORLD_BOSS_COIN]: 300, [Currency.DIAMONDS]: 75 } },
    { minRank: 21, maxRank: 50, rewards: { [Currency.WORLD_BOSS_COIN]: 150, [Currency.DIAMONDS]: 25 } },
    { minRank: 51, maxRank: 100, rewards: { [Currency.WORLD_BOSS_COIN]: 75 } },
];


export const WORLD_BOSSES_DEFINITIONS: WorldBossInfo[] = [
    {
        id: 'wb_fire_dragon', name: '烈焰巨龍 阿格尼', spriteEmoji: '🐲', element: ElementType.FIRE, description: "古老的火山守護者，噴吐著毀滅一切的烈焰。",
        maxHp: 50000000 * 15, currentHp: 50000000 * 15, nextRefreshTime: 0,
        attackCost: { currency: Currency.WORLD_BOSS_ENERGY, amount: 1 },
        baseRewards: { [Currency.GOLD]: 10000, [Currency.WORLD_BOSS_COIN]: 10 },
        skills: ['wb_agni_p_aura', 'wb_agni_p_skin', 'wb_agni_a_breath', 'wb_agni_a_eruption', 'wb_agni_a_worldfire'],
        baseAtk: 1000, baseDef: 1000, baseSpd: 160,
    },
    {
        id: 'wb_ice_golem', name: '寒冰魔像 科賽特斯', spriteEmoji: '🧊', element: ElementType.WATER, description: "由永凍冰晶構成的巨人，其核心散發著刺骨寒氣。",
        maxHp: 75000000 * 15, currentHp: 75000000 * 15, nextRefreshTime: 0,
        attackCost: { currency: Currency.WORLD_BOSS_ENERGY, amount: 1 },
        baseRewards: { [Currency.GOLD]: 12000, [Currency.WORLD_BOSS_COIN]: 12 },
        skills: ['wb_cocytus_p_frostbite', 'wb_cocytus_p_glacial_armor', 'wb_cocytus_a_blizzard', 'wb_cocytus_a_ice_prison', 'wb_cocytus_a_absolute_zero'],
        baseAtk: 1000, baseDef: 1000, baseSpd: 140,
    },
    {
        id: 'wb_storm_titan', name: '風暴泰坦 泰豐', spriteEmoji: '🌪️', element: ElementType.WIND, description: "掌控風暴的遠古巨人，揮手間便是雷霆與颶風。",
        maxHp: 60000000 * 15, currentHp: 60000000 * 15, nextRefreshTime: 0,
        attackCost: { currency: Currency.WORLD_BOSS_ENERGY, amount: 1 },
        baseRewards: { [Currency.GOLD]: 11000, [Currency.WORLD_BOSS_COIN]: 11 },
        skills: ['wb_typhon_p_cyclone_shield', 'wb_typhon_p_eye_of_storm', 'wb_typhon_a_chain_lightning', 'wb_typhon_a_gale_force', 'wb_typhon_a_tempest'],
        baseAtk: 1000, baseDef: 1000, baseSpd: 180,
    }
];

export const DEFAULT_PLAYER_NAME = "冒險者";
export const HIDDEN_HERO_NICKNAME_TRIGGER = "Ballerina Cappuccina";
export const MOGUANYU_NICKNAME_TRIGGER = "TK888";

// Constants for Ultimate Challenge
export const ULTIMATE_CHALLENGE_HERO_IDS = ['c_cappuccino', 'c_bombardiro', 'c_konami', 'c_tralala'];
export const ULTIMATE_CHALLENGE_INITIAL_LEVEL = 30;
export const ULTIMATE_CHALLENGE_LEVEL_INCREMENT = 10;
export const ULTIMATE_CHALLENGE_MAX_LEVEL = 90;
export const ULTIMATE_CHALLENGE_STAMINA_COST = 20;

export const initialGameStateValues: Partial<GameState> = {
  playerName: DEFAULT_PLAYER_NAME,
  battleTeamSlots: Array(MAX_HEROES_IN_BATTLE_TEAM).fill(null),
  lastStaminaUpdateTime: Date.now(),
  endlessTowerMaxFloor: 0,
  currentEndlessTowerRun: null,
  worldBossLeaderboard: [],
  playerWorldBossStats: { totalDamageDealtThisCycle: 0, attacksMadeThisCycle: 0, lastAttackTime: null },
  lastWorldBossLeaderboardUpdateTime: 0,
  lastArenaLeaderboardUpdateTime: 0,
  gachaAnnouncements: [],
  worldBossCycleIndex: 0,
  claimedBombardiroHero: false,
  lastTimePlayerWasAttackedInArena: null,
  isProcessingArenaAction: false, 
  worldBossNpcCycleParticipants: [],
  worldBossNpcBatchesProcessedThisCycle: 0,
  ultimateChallengeCurrentLevel: ULTIMATE_CHALLENGE_INITIAL_LEVEL,
  ultimateChallengeMaxLevelReached: false,
};
