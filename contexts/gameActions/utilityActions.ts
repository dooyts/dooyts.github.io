
import React from 'react';
import { GameState, Stage, Currency, OwnedCharacter, EquipmentSlot, Task, OwnedEquipmentItem, OwnedRune, CharacterRarity, OwnedPet } from '../../types';
import { RedDotType } from '../GameContext'; // Import from GameContext itself
import * as EventManager from '../../lib/game-logic/eventManager';
import * as CharacterManager from '../../lib/game-logic/characterManager';
import * as EquipmentManager from '../../lib/game-logic/equipmentManager';
import * as RuneManager from '../../lib/game-logic/runeManager';
import * as PetManager from '../../lib/game-logic/petManager';
import * as BattlePassManager from '../../lib/game-logic/battlePassManager';
import * as GrowthFundManager from '../../lib/game-logic/growthFundManager';
import * as MailManager from '../../lib/game-logic/mailManager';
import * as TaskManager from '../../lib/game-logic/taskManager';
import * as SevenDayLoginManager from '../../lib/game-logic/sevenDayLoginManager';
import * as WorldBossManager from '../../lib/game-logic/worldBossManager';
import * as BattleManagerUtils from '../../lib/game-logic/battleManager';

import { 
    GAME_STAGES, BATTLE_COST_STAMINA, DUNGEONS_DEFINITIONS, 
    ENDLESS_TOWER_FLOOR_COST_STAMINA, MAX_HEROES_IN_BATTLE_TEAM,
    SEVEN_DAY_LOGIN_REWARDS,
    DAILY_TASKS_DEFINITIONS, WEEKLY_TASKS_DEFINITIONS, ACHIEVEMENT_TASKS_DEFINITIONS,
    ARENA_BATTLE_COST_STAMINA, ULTIMATE_CHALLENGE_STAMINA_COST
} from '../../constants/gameplayConstants';
import { 
    MAX_CHARACTER_LEVEL_BY_STARS, SHARDS_PER_STAR, 
    LEVEL_UP_EXP_COST_BASE, LEVEL_UP_GOLD_COST_BASE 
} from '../../constants/characterConstants';
import { EQUIPMENT_ENHANCEMENT_COST } from '../../constants/equipmentConstants';
import { ALL_GACHA_POOLS } from '../../constants/gachaConstants';
import { SHOP_ITEMS_DIAMONDS, SHOP_ITEMS_RESOURCES, BATTLE_PASS_TIERS, GROWTH_FUND_MILESTONES, SHOP_ITEMS_SPECIALS } from '../../constants/shopConstants';
import { getExpToNextLevel as calculateExpToNextLevel, getGoldToNextLevel as calculateGoldToNextLevel, isToday } from '../../lib/game-logic/utils';

// Type definitions for function dependencies
type GetCurrentGameStateFn = () => GameState;
type GetCharacterByIdFn = (id: string) => OwnedCharacter | undefined;
type CanAffordFn = (currency: Currency, amount: number) => boolean;
type GetNextStageFn = () => Stage | null;
type GetUnequippedEquipmentBySlotFn = (slot: EquipmentSlot) => OwnedEquipmentItem[];
type GetUnequippedRunesFn = () => OwnedRune[];
type GetTaskProgressFn = (task: Task) => { current: number, target: number };
type PetEnhancementCostFn = (level: number, rarity: CharacterRarity) => Partial<Record<Currency, number>>;
type RuneEnhancementCostFn = (level: number, rarity: CharacterRarity) => Partial<Record<Currency, number>>;


export const getPlayerLevelForProgressCallback = (
    getGameState: GetCurrentGameStateFn
) => (): number => {
    return EventManager.getPlayerLevelForProgress(getGameState(), GAME_STAGES);
};

export const checkRedDotCallback = (
    getGameState: GetCurrentGameStateFn,
    getCharacterByIdFn: GetCharacterByIdFn,
    canAffordFn: CanAffordFn,
    getNextStageFn: GetNextStageFn,
    getUnequippedEquipmentBySlotFn: GetUnequippedEquipmentBySlotFn,
    getUnequippedRunesFn: GetUnequippedRunesFn,
    getTaskProgressFn: GetTaskProgressFn,
    petEnhancementCostFn: PetEnhancementCostFn,
    maxPetLevelConst: number,
    runeEnhancementCostFn: RuneEnhancementCostFn,
    maxRuneLevelConst: number
) => (type: RedDotType, entityId?: string): boolean => {
    const gameState = getGameState();
    switch (type) {
        case 'hero_upgrade':
            const charsToCheck = entityId && getCharacterByIdFn(entityId) ? [getCharacterByIdFn(entityId)!] : gameState.characters;
            return charsToCheck.some(char => {
                if (!char) return false;
                return CharacterManager.checkHeroUpgradeRedDot(char, gameState.resources, MAX_CHARACTER_LEVEL_BY_STARS, SHARDS_PER_STAR, LEVEL_UP_EXP_COST_BASE, LEVEL_UP_GOLD_COST_BASE, calculateExpToNextLevel, calculateGoldToNextLevel, (c,a) => canAffordFn(c,a));
            });
        case 'hero_skill_upgrade':
             const skillHero = entityId && getCharacterByIdFn(entityId) ? getCharacterByIdFn(entityId) : gameState.characters.find(c => CharacterManager.checkHeroSkillUpgradeRedDot(c, (curr,amt) => canAffordFn(curr,amt)));
             return !!skillHero;
        case 'hero_equipment':
            return EquipmentManager.checkHeroEquipmentRedDot(gameState, EQUIPMENT_ENHANCEMENT_COST, (c,a) => canAffordFn(c,a), getUnequippedEquipmentBySlotFn);
        case 'hero_rune': 
             return RuneManager.checkHeroRuneRedDot(gameState, getUnequippedRunesFn, runeEnhancementCostFn, maxRuneLevelConst, (c,a) => canAffordFn(c,a));
        case 'hero_rune_enhance':
             return gameState.characters.some(char => 
                char.runes.some(runeId => {
                    if (!runeId) return false;
                    const rune = gameState.ownedRunes.find(r => r.uniqueId === runeId);
                    if (!rune || rune.level >= maxRuneLevelConst) return false;
                    const costs = runeEnhancementCostFn(rune.level + 1, rune.rarity);
                    return Object.entries(costs).every(([curr, val]) => canAffordFn(curr as Currency, val as number));
                })
             );
        case 'hero_pet_enhance':
            if (entityId) { 
                const char = getCharacterByIdFn(entityId);
                if (char && char.assignedPetId) {
                    const pet = gameState.ownedPets.find(p => p.uniqueId === char.assignedPetId);
                    return !!pet && PetManager.canEnhancePet(pet, gameState.resources, petEnhancementCostFn, maxPetLevelConst, (c,a,res) => canAffordFn(c,a));
                }
                return false;
            }
            return PetManager.checkGlobalPetRedDot(gameState, petEnhancementCostFn, maxPetLevelConst, (c,a,res) => canAffordFn(c,a));
        case 'hero_team_assign':
            return CharacterManager.checkHeroTeamAssignRedDot(gameState, MAX_HEROES_IN_BATTLE_TEAM);
        case 'stage_progress':
            const nextStage = getNextStageFn();
            return !!nextStage && canAffordFn(Currency.STAMINA, BATTLE_COST_STAMINA);
        case 'shop_free':
            const canClaimFreeDiamonds = !gameState.lastFreeDailyDiamondClaimTimestamp || (Date.now() - gameState.lastFreeDailyDiamondClaimTimestamp > 24 * 60 * 60 * 1000);
            const luckyDrawPool = ALL_GACHA_POOLS.find(p => p.id === 'lucky_draw_banner');
            const canAffordLuckyDraw = luckyDrawPool?.singlePullCost ? canAffordFn(luckyDrawPool.singlePullCost.currency, luckyDrawPool.singlePullCost.amount) : false;
            return SHOP_ITEMS_DIAMONDS.some(item => item.bonusDiamonds && !gameState.firstPurchaseBonusUsed[item.id]) || canClaimFreeDiamonds || canAffordLuckyDraw;
        case 'shop_resource_purchase':
            return SHOP_ITEMS_RESOURCES.some(item => {
                const limitInfo = item.dailyLimit ? gameState.dailyPurchaseLimits[item.id] : null;
                const purchasedToday = limitInfo && isToday(limitInfo.lastPurchaseTime) ? limitInfo.count : 0;
                const canPurchaseToday = item.dailyLimit ? purchasedToday < item.dailyLimit : true;
                return canPurchaseToday && item.priceCurrency && item.priceAmount && canAffordFn(item.priceCurrency, item.priceAmount);
            });
        case 'shop_specials_purchase': 
             return SHOP_ITEMS_SPECIALS.some(item => { 
                const limitInfo = item.dailyLimit ? gameState.dailyPurchaseLimits[item.id] : null;
                const purchasedToday = limitInfo && isToday(limitInfo.lastPurchaseTime) ? limitInfo.count : 0;
                const canPurchaseToday = item.dailyLimit ? purchasedToday < item.dailyLimit : true;
                return canPurchaseToday && item.priceCurrency && item.priceAmount && canAffordFn(item.priceCurrency, item.priceAmount);
             });
        case 'battlepass_claim':
            return BattlePassManager.checkBattlePassRedDot(gameState, BATTLE_PASS_TIERS);
        case 'dungeon_available':
             const etDungeon = DUNGEONS_DEFINITIONS.find(d => d.id === 'endless_tower');
             const canAttemptET = etDungeon && (gameState.dailyDungeonAttempts['endless_tower'] || 0) > 0 && (!gameState.currentEndlessTowerRun || !gameState.currentEndlessTowerRun.isActive) && etDungeon.cost.every(c => canAffordFn(c.currency, c.amount));
            return DUNGEONS_DEFINITIONS.some(d => {
                if (d.isEndlessTower) return canAttemptET;
                return (gameState.dailyDungeonAttempts[d.id] || 0) > 0 && d.cost.every(c => canAffordFn(c.currency, c.amount));
            }) || (gameState.currentEndlessTowerRun?.isActive && canAffordFn(Currency.STAMINA, ENDLESS_TOWER_FLOOR_COST_STAMINA) );
        case 'endless_tower_attempt':
             const etDungeonCheck = DUNGEONS_DEFINITIONS.find(d => d.id === 'endless_tower');
             return (etDungeonCheck && (gameState.dailyDungeonAttempts['endless_tower'] || 0) > 0 && (!gameState.currentEndlessTowerRun || !gameState.currentEndlessTowerRun.isActive) && etDungeonCheck.cost.every(c => canAffordFn(c.currency, c.amount))) || (gameState.currentEndlessTowerRun?.isActive && canAffordFn(Currency.STAMINA, ENDLESS_TOWER_FLOOR_COST_STAMINA));
        case 'arena_available':
            return gameState.dailyArenaAttempts > 0 && canAffordFn(Currency.STAMINA, ARENA_BATTLE_COST_STAMINA);
        case 'mail_unread':
            return MailManager.checkMailRedDot(gameState);
        case 'task_claimable':
            return TaskManager.checkTaskRedDot(gameState, [...DAILY_TASKS_DEFINITIONS, ...WEEKLY_TASKS_DEFINITIONS, ...ACHIEVEMENT_TASKS_DEFINITIONS], getTaskProgressFn);
        case 'growthfund_claimable':
            return GrowthFundManager.checkGrowthFundRedDot(gameState, GROWTH_FUND_MILESTONES);
        case 'seven_day_login_claimable':
            return SevenDayLoginManager.checkSevenDayLoginRedDot(gameState, SEVEN_DAY_LOGIN_REWARDS);
        case 'world_boss_available':
            return WorldBossManager.checkWorldBossAvailableRedDot(gameState);
        case 'ultimate_challenge_available':
            const allCampaignComplete = GAME_STAGES.every(stage => gameState.completedStages.includes(stage.id));
            return allCampaignComplete && !gameState.ultimateChallengeMaxLevelReached && canAffordFn(Currency.STAMINA, ULTIMATE_CHALLENGE_STAMINA_COST);
        default: return false;
    }
};
