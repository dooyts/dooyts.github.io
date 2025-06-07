
import { GameState, Currency, Dungeon, Stage, SevenDayLoginReward, Mail, ShopItem, WorldBossInfo, VIPLevel, Character, OwnedCharacter, ArenaLeaderboardEntry } from '../../types';
import { isToday, uuidv4 } from './utils';
import { 
    MILLISECONDS_PER_STAMINA_POINT, WORLD_BOSS_REFRESH_INTERVAL_MS, 
    GAME_STAGES, ELEMENT_ADVANTAGE, WORLD_BOSS_RANK_REWARDS,
    ARENA_LEADERBOARD_UPDATE_INTERVAL_MS,
    MAX_HEROES_IN_BATTLE_TEAM
} from '../../constants/gameplayConstants';
import { BASE_CHARACTERS as ALL_BASE_CHARACTERS, BASE_SKILLS_DATA } from '../../constants/characterConstants';
import { SHOP_ITEMS_VIP_EXCLUSIVE } from '../../constants/shopConstants'; 
import * as WorldBossManager from './worldBossManager';
import * as ArenaManager from './arenaManager'; 
import * as BattleManager from './battleManager'; 
import { CURRENCY_EMOJIS, CURRENCY_NAMES } from '../../constants/uiConstants';


export const getPlayerLevelForProgress = (gameState: GameState, gameStages: Stage[]): number => {
    const highestChapter = gameStages.reduce((maxChap, stage) => {
        if (gameState.completedStages.includes(stage.id)) {
            return Math.max(maxChap, stage.chapter);
        }
        return maxChap;
    }, 0);
    return highestChapter * 2 + Math.floor(gameState.completedStages.length / 10) + 1; // Start at level 1
};

// Removed simulateArenaDefense function as this logic is now consolidated in ArenaManager.updateArenaLeaderboardDynamics


export const handlePeriodicUpdates = (
    prev: GameState,
    staminaRegenRate: number, 
    dungeonDefinitions: Dungeon[],
    arenaDailyAttemptsMax: number,
    sevenDayLoginRewards: SevenDayLoginReward[],
    shopResourceItems: ShopItem[],
    sendSystemMailFn: (currentState: GameState, mailData: Omit<Mail, 'id'|'timestamp'|'isRead'|'claimed'>) => GameState,
    worldBossDefinitions: WorldBossInfo[],
    vipLevels: VIPLevel[],
    calculateTeamPowerFn: (customTeamIds?: (string | null)[]) => number, 
    sendSystemMailFnDirect: (mailData: Omit<Mail, 'id' | 'timestamp' | 'isRead' | 'claimed'>) => void, 
    shopSpecialItems: ShopItem[], 
    shopStaminaItems: ShopItem[]
    // Removed arenaDefenseIntervalGeneral, arenaDefenseIntervalTop10 as parameters
): GameState => {
    let newState = { ...prev };
    const now = Date.now();
    const previousBossNameForMail = prev.worldBoss?.name || ''; 

    // Stamina Regen
    if (newState.resources.currentStamina < newState.resources.maxStamina) {
        const timeSinceLastStaminaUpdate = now - newState.lastStaminaUpdateTime;
        const staminaPointsToRegen = Math.floor(timeSinceLastStaminaUpdate / MILLISECONDS_PER_STAMINA_POINT);

        if (staminaPointsToRegen > 0) {
            const newStaminaValue = Math.min(newState.resources.maxStamina, newState.resources.currentStamina + staminaPointsToRegen);
            if (newStaminaValue > newState.resources.currentStamina) {
                newState.resources = {
                    ...newState.resources,
                    currentStamina: newStaminaValue,
                };
                newState.lastStaminaUpdateTime = newState.lastStaminaUpdateTime + staminaPointsToRegen * MILLISECONDS_PER_STAMINA_POINT;
            } else if (newStaminaValue === newState.resources.maxStamina) { 
                 newState.lastStaminaUpdateTime = now; 
            }
        }
    } else if (newState.resources.currentStamina >= newState.resources.maxStamina) { 
        newState.lastStaminaUpdateTime = now; 
    }


    newState.lastLoginTime = now; 

    // Daily Reset
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    if (!isToday(newState.lastDailyReset)) {
        newState.lastDailyReset = now;
        newState.dailyDungeonAttempts = dungeonDefinitions.reduce((acc, dungeon) => ({ ...acc, [dungeon.id]: dungeon.dailyAttempts }), {});
        newState.dailyArenaAttempts = arenaDailyAttemptsMax;
        
        newState.taskProgress = {
            ...newState.taskProgress,
            battlesWonToday: 0,
            dungeonsClearedToday: 0,
            worldBossDamageDealtToday: 0, 
            arenaBattlesWonToday: 0, 
            petsEnhanced: 0, 
            runesEnhanced: 0, 
        };
        
        newState.playerWorldBossStats = { ...newState.playerWorldBossStats, attacksMadeThisCycle: 0 };


        const newDailyPurchaseLimits = { ...newState.dailyPurchaseLimits };
        // Only reset items that actually have a dailyLimit defined. Stamina items won't.
        [...shopResourceItems, ...shopSpecialItems, ...shopStaminaItems].forEach(item => { 
            if (item.dailyLimit && newDailyPurchaseLimits[item.id]) { // Check if item.dailyLimit exists
                newDailyPurchaseLimits[item.id] = { count: 0, lastPurchaseTime: now };
            }
        });
        newState.dailyPurchaseLimits = newDailyPurchaseLimits;


        if (newState.sevenDayLogin.currentDay <= sevenDayLoginRewards.length && !newState.sevenDayLogin.claimedToday) {
            newState.sevenDayLogin.currentDay = Math.min(sevenDayLoginRewards.length + 1, newState.sevenDayLogin.currentDay + 1); 
        } else if (newState.sevenDayLogin.currentDay < sevenDayLoginRewards.length) { 
             newState.sevenDayLogin.currentDay++;
        }
        newState.sevenDayLogin.claimedToday = false;


        let dailyCardDiamonds = 0;
        if (newState.activeMonthlyCardEndTime && newState.activeMonthlyCardEndTime > now) dailyCardDiamonds += 100;
        if (newState.activeLifetimeCard) dailyCardDiamonds += 150; 
        
        if(dailyCardDiamonds > 0) {
            newState = sendSystemMailFn(newState, {
                title: "每日登入獎勵",
                body: `您的月卡/終身卡每日鑽石 ${dailyCardDiamonds} 已發放！`,
                sender: "福利中心",
                rewards: { [Currency.DIAMONDS]: dailyCardDiamonds }
            });
        }
    }
    
    // Weekly Reset
    const MS_PER_WEEK = 7 * MS_PER_DAY;
    if (now - newState.lastWeeklyReset >= MS_PER_WEEK) {
        newState.lastWeeklyReset = now;
        newState.taskProgress = {
            ...newState.taskProgress,
        };
        const newDailyPurchaseLimits = { ...newState.dailyPurchaseLimits };
        [...SHOP_ITEMS_VIP_EXCLUSIVE].forEach(item => { 
            if (item.dailyLimit === 0 && newDailyPurchaseLimits[item.id]) { 
                newDailyPurchaseLimits[item.id] = { count: 0, lastPurchaseTime: now };
            }
        });
        newState.dailyPurchaseLimits = newDailyPurchaseLimits;
    }

    if (WORLD_BOSS_REFRESH_INTERVAL_MS > 0) {
        const { newState: stateAfterBossCheck, didRefresh, playerRankForRewards, actualPlayerRewards } = WorldBossManager.checkAndRefreshBoss(
            newState,
            worldBossDefinitions,
            WORLD_BOSS_RANK_REWARDS
        );
        newState = stateAfterBossCheck;

        if (didRefresh) {
            let refreshMailBody = `新的世界頭目 ${newState.worldBoss?.name || '未知頭目'} 已降臨！快去挑戰吧！`;
            if (playerRankForRewards && actualPlayerRewards) {
                refreshMailBody = `前一輪世界頭目 ${previousBossNameForMail} 已被擊退！\n你的排名: ${playerRankForRewards}。\n獲得獎勵:\n` + 
                                  Object.entries(actualPlayerRewards).map(([key, val]) => `${CURRENCY_EMOJIS[key as Currency] || ''} ${CURRENCY_NAMES[key as Currency] || key}: ${val}`).join('\n') +
                                  `\n\n新的世界頭目 ${newState.worldBoss?.name || '未知頭目'} 已降臨！快去挑戰吧！`;
                
                newState = sendSystemMailFn(newState, {
                    title: "世界頭目獎勵結算",
                    body: refreshMailBody,
                    sender: "頭目討伐司令部",
                    rewards: actualPlayerRewards
                });
            } else {
                 newState = sendSystemMailFn(newState, {
                    title: "世界頭目刷新",
                    body: refreshMailBody,
                    sender: "頭目討伐司令部"
                });
            }
        }
    }
    
    // Arena Defense Simulation is now handled by ArenaManager.updateArenaLeaderboardDynamics triggered by a separate useEffect in GameContext

    return newState;
};
