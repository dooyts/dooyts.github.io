
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import {
  PlayerResources, OwnedCharacter, Stage, VIPLevel, ShopItem, TriggeredOffer, Currency, GameState, Character, 
  GachaPool, ElementType, BaseSkill, OwnedSkill, EquipmentSlot, BaseEquipmentItem, OwnedEquipmentItem, BasePet, OwnedPet, 
  BaseRune, OwnedRune, Dungeon, Mail, Task, GrowthFundMilestone, GachaPullableItem, GachaAnnouncement, ArenaLeaderboardEntry,
  CharacterRarity, WorldBossLeaderboardEntry as WBLeaderboardEntryType // Added CharacterRarity and aliased WorldBossLeaderboardEntry
} from '../types';

import {
    DUNGEONS_DEFINITIONS, ARENA_DAILY_ATTEMPTS, SEVEN_DAY_LOGIN_REWARDS,
    STAMINA_REGEN_RATE_PER_MINUTE, WORLD_BOSSES_DEFINITIONS, VIP_LEVELS,
    initialGameStateValues, GAME_STAGES, ELEMENT_ADVANTAGE,
    WORLD_BOSS_LEADERBOARD_VISUAL_UPDATE_INTERVAL_MS, NPC_ACTUAL_DAMAGE_SIMULATION_INTERVAL_MS,
    ARENA_LEADERBOARD_UPDATE_INTERVAL_MS, NPC_ARENA_CHALLENGES_PER_INTERVAL
} from '../constants/gameplayConstants';
import { SHOP_ITEMS_RESOURCES, SHOP_ITEMS_SPECIALS, BATTLE_PASS_TIERS, SHOP_ITEMS_CURRENCY_STAMINA, TRIGGERED_OFFERS_TEMPLATES } from '../constants/shopConstants';
import { BASE_CHARACTERS, REGULAR_CHARACTERS, BASE_SKILLS_DATA } from '../constants/characterConstants'; 
import { BASE_EQUIPMENT_ITEMS, EQUIPMENT_ENHANCEMENT_COST } from '../constants/equipmentConstants';
import { BASE_PETS, PET_ENHANCEMENT_COST, MAX_PET_LEVEL } from '../constants/petConstants';
import { BASE_RUNES, RUNE_ENHANCEMENT_COST, MAX_RUNE_LEVEL } from '../constants/runeConstants';
import { generateRandomPlayerName } from '../lib/game-logic/utils';
import { calculateCharacterPower as calculateCharacterPowerLib, calculateTeamPower as calculateTeamPowerLib } from '../lib/game-logic/characterManager';
import { loadInitialGameState } from '../lib/game-logic/gameStateManager';
import * as EventManager from '../lib/game-logic/eventManager';
import * as MailManagerLib from '../lib/game-logic/mailManager'; 
import * as WorldBossManagerLib from '../lib/game-logic/worldBossManager';
import * as ArenaManager from '../lib/game-logic/arenaManager'; 
// import * as BattlePassManagerLib from '../lib/game-logic/battlePassManager'; // Not used directly here

// Import action callback creators
import * as CurrencyActions from './gameActions/currencyActions';
import * as VIPActions from './gameActions/vipActions';
import * as MailActions from './gameActions/mailActions';
import * as GachaActions from './gameActions/gachaActions';
import * as ShopActions from './gameActions/shopActions';
import * as CharacterActions from './gameActions/characterActions';
import * as EquipmentActions from './gameActions/equipmentActions';
import * as PetActions from './gameActions/petActions';
import * as RuneActions from './gameActions/runeActions';
import * as BattlePassActions from './gameActions/battlePassActions';
import * as GrowthFundActions from './gameActions/growthFundActions';
import * as TaskActions from './gameActions/taskActions';
import * as SevenDayLoginActions from './gameActions/sevenDayLoginActions';
// import * as BattleActions from './gameActions/battleActions'; // Old import
import * as CampaignBattleActions from './gameActions/campaignBattleActions';
import * as DungeonBattleActions from './gameActions/dungeonBattleActions';
import * as ArenaBattleActions from './gameActions/arenaBattleActions';
import * as BattleLogActions from './gameActions/battleLogActions';
import * as WorldBossActions from './gameActions/worldBossActions';
import * as ArenaActions from './gameActions/arenaActions'; 
import * as UtilityActions from './gameActions/utilityActions';
import * as PlayerActions from './gameActions/playerActions'; 


interface GameContextProps {
  gameState: GameState;
  addCurrency: (currency: Currency, amount: number) => void;
  spendCurrency: (currency: Currency, amount: number) => boolean;
  addVipExp: (amount: number) => void;
  addCharacter: (characterId: string, shards?: number) => OwnedCharacter | null;
  levelUpCharacter: (characterId: string) => void;
  starUpCharacter: (characterId: string) => void;
  upgradeSkill: (characterId: string, skillId: string) => void;
  calculateCharacterPower: (character: OwnedCharacter) => number;
  calculateTeamPower: (customTeamIds?: (string | null)[]) => number;
  completeStage: (stageId: string, fromBattle: boolean) => void;
  startBattle: (stageId: string) => { success: boolean; rewards?: Partial<Record<Currency, number>>; battleLog: string[] };
  startDungeonBattle: (dungeonId: string) => { success: boolean; rewards?: Partial<Record<Currency, number>>; battleLog: string[]; totalPlayerDamageDealt?: number; };
  startArenaBattle: () => { success: boolean; rewards?: Partial<Record<Currency, number>>; battleLog: string[], rankChange?: number, message?: string };
  finishArenaAction: () => void;
  startEndlessTowerFloorBattle: (floor: number) => { success: boolean; message?: string; rewards?: Partial<Record<Currency, number>>; battleLog: string[], nextFloor?: number | null };
  attackWorldBoss: () => { success: boolean; damageDealt?: number; message?: string; battleLog?: string[] };
  startUltimateChallengeBattle: () => { success: boolean; rewards?: Partial<Record<Currency, number>>; battleLog: string[]; message?: string };

  purchaseShopItem: (item: ShopItem) => boolean;
  getVipPerks: () => string[];
  canAfford: (currency: Currency, amount: number) => boolean;
  getCharacterById: (id: string) => OwnedCharacter | undefined;
  getCharacterBaseById: (id: string) => Character | undefined;
  gachaPull: (poolId: string, numPulls: 1 | 10) => GachaPullableItem[];
  triggeredOffer: TriggeredOffer | null;
  clearTriggeredOffer: () => void;
  purchaseTriggeredOffer: (offerId: string) => void;
  triggerOfferById: (templateIndex: number, dynamicData?: any) => void;
  isStageCompleted: (stageId: string) => boolean;
  getNextStage: () => Stage | null;
  checkRedDot: (type: RedDotType, entityId?: string) => boolean;
  getBattleLog: () => string[];
  clearBattleLog: () => void;

  getOwnedEquipmentItemByUniqueId: (uniqueId: string) => OwnedEquipmentItem | undefined;
  getUnequippedEquipmentBySlot: (slot: EquipmentSlot) => OwnedEquipmentItem[];
  equipItem: (characterId: string, equipmentUniqueId: string) => void;
  unequipItem: (characterId: string, slot: EquipmentSlot) => void;
  enhanceEquipment: (equipmentUniqueId: string) => void;
  addEquipmentItem: (baseItemId: string, source?: string) => OwnedEquipmentItem | null;

  getOwnedPetByUniqueId: (uniqueId: string) => OwnedPet | undefined;
  assignPet: (characterId: string, petUniqueId: string | null) => void;
  addPet: (basePetId: string, source?: string) => OwnedPet | null;
  enhancePet: (petUniqueId: string) => void;

  getOwnedRuneByUniqueId: (uniqueId: string) => OwnedRune | undefined;
  getUnequippedRunes: () => OwnedRune[];
  equipRune: (characterId: string, runeUniqueId: string, slotIndex: number) => void;
  unequipRune: (characterId: string, slotIndex: number) => void;
  addRune: (baseRuneId: string, source?: string) => OwnedRune | null;
  enhanceRune: (runeUniqueId: string) => void;

  claimBattlePassReward: (tierLevel: number, isPaid: boolean) => void;
  purchaseBattlePass: (type: 'advanced' | 'collector') => void;

  claimGrowthFundReward: (milestoneId: string) => void;
  purchaseGrowthFund: () => void;

  readMail: (mailId: string) => void;
  claimMailReward: (mailId: string) => void;
  deleteMail: (mailId: string) => void;
  sendSystemMail: (mailData: Omit<Mail, 'id' | 'timestamp' | 'isRead' | 'claimed'>) => void;

  claimTaskReward: (taskId: string) => void;
  getTaskProgress: (task: Task) => { current: number, target: number };

  getPlayerLevelForProgress: () => number;
  changePlayerName: (newName: string) => void; 

  claimSevenDayLoginReward: (day: number) => void;
  setLastFreeDiamondClaimTime: () => void;

  assignHeroToBattleSlot: (heroId: string, slotIndex: number) => void;
  clearBattleSlot: (slotIndex: number) => void;
  autoAssignTeam: () => void; 
  getBattleTeam: () => OwnedCharacter[];

  getWorldBossLeaderboard: () => WBLeaderboardEntryType[];
  getArenaLeaderboard: () => ArenaLeaderboardEntry[];
  addGachaAnnouncement: (announcement: Omit<GachaAnnouncement, 'id' | 'timestamp'>) => void;
}
export type RedDotType = 'hero_upgrade' | 'hero_skill_upgrade' | 'hero_equipment' | 'hero_rune' | 'shop_free' | 'battlepass_claim' | 'stage_progress' | 'dungeon_available' | 'arena_available' | 'mail_unread' | 'task_claimable' | 'growthfund_claimable' | 'seven_day_login_claimable' | 'shop_resource_purchase' | 'endless_tower_attempt' | 'hero_team_assign' | 'world_boss_available' | 'shop_specials_purchase' | 'hero_pet_enhance' | 'hero_rune_enhance' | 'ultimate_challenge_available';


const GameContext = createContext<GameContextProps | undefined>(undefined);


export const GameProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState>(loadInitialGameState);
  const gameStateRef = useRef(gameState); 

  useEffect(() => {
    gameStateRef.current = gameState; 
    localStorage.setItem('endlessSpendingSim_gameState_v3', JSON.stringify(gameState));
  }, [gameState]);

  const getCurrentGameState = useCallback(() => gameStateRef.current, []);

  // --- CURRENCY ACTIONS ---
  const addCurrency = useCallback(CurrencyActions.addCurrencyCallback(setGameState), [setGameState]);
  const spendCurrency = useCallback(CurrencyActions.spendCurrencyCallback(setGameState, getCurrentGameState), [setGameState, getCurrentGameState]);
  const canAfford = useCallback(CurrencyActions.canAffordCallback(getCurrentGameState), [getCurrentGameState]);

  // --- VIP ACTIONS ---
  const addVipExp = useCallback(VIPActions.addVipExpCallback(setGameState), [setGameState]);
  const getVipPerks = useCallback(VIPActions.getVipPerksCallback(getCurrentGameState), [getCurrentGameState]);

  // --- MAIL ACTIONS ---
  const sendSystemMail = useCallback(MailActions.sendSystemMailCallback(setGameState), [setGameState]);
  const readMail = useCallback(MailActions.readMailCallback(setGameState), [setGameState]);
  const claimMailReward = useCallback(MailActions.claimMailRewardCallback(setGameState), [setGameState]);
  const deleteMail = useCallback(MailActions.deleteMailCallback(setGameState), [setGameState]);

  // --- GACHA ACTIONS ---
  const addGachaAnnouncement = useCallback(GachaActions.addGachaAnnouncementCallback(setGameState), [setGameState]);
  const gachaPull = useCallback(GachaActions.gachaPullCallback(getCurrentGameState, setGameState, sendSystemMail), [getCurrentGameState, setGameState, sendSystemMail]);
  
  // --- SHOP ACTIONS (triggerOfferById needed by CharacterActions) ---
  const triggerOfferById = useCallback(ShopActions.triggerOfferByIdCallback(setGameState), [setGameState]);

  // --- CHARACTER ACTIONS ---
  const getCharacterById = useCallback(CharacterActions.getCharacterByIdCallback(getCurrentGameState), [getCurrentGameState]);
  const getCharacterBaseById = useCallback(CharacterActions.getCharacterBaseByIdCallback(), []);
  const addCharacter = useCallback(CharacterActions.addCharacterCallback(setGameState, getCurrentGameState, sendSystemMail, triggerOfferById), [setGameState, getCurrentGameState, sendSystemMail, triggerOfferById]);
  const levelUpCharacter = useCallback(CharacterActions.levelUpCharacterCallback(setGameState), [setGameState]);
  const starUpCharacter = useCallback(CharacterActions.starUpCharacterCallback(setGameState), [setGameState]);
  const upgradeSkill = useCallback(CharacterActions.upgradeSkillCallback(setGameState, canAfford), [setGameState, canAfford]);
  const autoAssignTeam = useCallback(CharacterActions.autoAssignTeamCallback(setGameState, getCurrentGameState), [setGameState, getCurrentGameState]);


  // --- EQUIPMENT ACTIONS ---
  const getOwnedEquipmentItemByUniqueId = useCallback(EquipmentActions.getOwnedEquipmentItemByUniqueIdCallback(getCurrentGameState), [getCurrentGameState]);
  const addEquipmentItem = useCallback(EquipmentActions.addEquipmentItemCallback(setGameState), [setGameState]);
  const enhanceEquipment = useCallback(EquipmentActions.enhanceEquipmentCallback(setGameState, canAfford), [setGameState, canAfford]);
  const getUnequippedEquipmentBySlot = useCallback(EquipmentActions.getUnequippedEquipmentBySlotCallback(getCurrentGameState), [getCurrentGameState]);
  
  // --- SHOP ACTIONS (Rest of them) ---
  const purchaseShopItem = useCallback(ShopActions.purchaseShopItemCallback(setGameState, sendSystemMail, triggerOfferById), [setGameState, sendSystemMail, triggerOfferById]);
  const clearTriggeredOffer = useCallback(ShopActions.clearTriggeredOfferCallback(setGameState), [setGameState]);
  const purchaseTriggeredOffer = useCallback(ShopActions.purchaseTriggeredOfferCallback(setGameState, sendSystemMail), [setGameState, sendSystemMail]);

  // --- PET ACTIONS ---
  const getOwnedPetByUniqueId = useCallback(PetActions.getOwnedPetByUniqueIdCallback(getCurrentGameState), [getCurrentGameState]);
  const addPet = useCallback(PetActions.addPetCallback(setGameState), [setGameState]);
  const assignPet = useCallback(PetActions.assignPetCallback(setGameState), [setGameState]);
  const enhancePet = useCallback(PetActions.enhancePetCallback(setGameState, canAfford), [setGameState, canAfford]);

  // --- RUNE ACTIONS ---
  const getOwnedRuneByUniqueId = useCallback(RuneActions.getOwnedRuneByUniqueIdCallback(getCurrentGameState), [getCurrentGameState]);
  const addRune = useCallback(RuneActions.addRuneCallback(setGameState), [setGameState]);
  const getUnequippedRunes = useCallback(RuneActions.getUnequippedRunesCallback(getCurrentGameState), [getCurrentGameState]);
  const enhanceRune = useCallback(RuneActions.enhanceRuneCallback(setGameState, canAfford), [setGameState, canAfford]);

  // --- CHARACTER EQUIP/UNEQUIP & STATS ---
  const equipItem = useCallback(CharacterActions.equipItemCallback(setGameState), [setGameState]);
  const unequipItem = useCallback(CharacterActions.unequipItemCallback(setGameState), [setGameState]);
  const equipRune = useCallback(CharacterActions.equipRuneCallback(setGameState), [setGameState]);
  const unequipRune = useCallback(CharacterActions.unequipRuneCallback(setGameState), [setGameState]);
  const calculateCharacterPower = useCallback(CharacterActions.calculateCharacterPowerCallback(getCurrentGameState), [getCurrentGameState]);
  const getBattleTeam = useCallback(CharacterActions.getBattleTeamCallback(getCurrentGameState, getCharacterById), [getCurrentGameState, getCharacterById]);
  const calculateTeamPower = useCallback(CharacterActions.calculateTeamPowerCallback(getCurrentGameState), [getCurrentGameState]);
  const assignHeroToBattleSlot = useCallback(CharacterActions.assignHeroToBattleSlotCallback(setGameState), [setGameState]);
  const clearBattleSlot = useCallback(CharacterActions.clearBattleSlotCallback(setGameState), [setGameState]);

  // --- BATTLE ACTIONS ---
  const getPlayerLevelForProgress = useCallback(UtilityActions.getPlayerLevelForProgressCallback(getCurrentGameState), [getCurrentGameState]);
  
  const clearBattleLog = useCallback(BattleLogActions.clearBattleLogCallback(setGameState), [setGameState]);
  const getBattleLog = useCallback(BattleLogActions.getBattleLogCallback(getCurrentGameState), [getCurrentGameState]);
  
  const completeStage = useCallback(CampaignBattleActions.completeStageCallback(setGameState, triggerOfferById, addEquipmentItem), [setGameState, triggerOfferById, addEquipmentItem]);
  const startBattle = useCallback(CampaignBattleActions.startBattleCallback(setGameState, getBattleTeam, calculateCharacterPower, spendCurrency, addCurrency, triggerOfferById, clearBattleLog, addEquipmentItem, getCurrentGameState, sendSystemMail, addCharacter), [setGameState, getBattleTeam, calculateCharacterPower, spendCurrency, addCurrency, triggerOfferById, clearBattleLog, addEquipmentItem, getCurrentGameState, sendSystemMail, addCharacter]);
  const isStageCompleted = useCallback(CampaignBattleActions.isStageCompletedCallback(getCurrentGameState), [getCurrentGameState]);
  const getNextStage = useCallback(CampaignBattleActions.getNextStageCallback(getCurrentGameState), [getCurrentGameState]);

  const startDungeonBattle = useCallback(DungeonBattleActions.startDungeonBattleCallback(setGameState, getCurrentGameState, getBattleTeam, calculateTeamPower, spendCurrency, addCurrency, addEquipmentItem, clearBattleLog, getPlayerLevelForProgress, calculateCharacterPower), [setGameState, getCurrentGameState, getBattleTeam, calculateTeamPower, spendCurrency, addCurrency, addEquipmentItem, clearBattleLog, getPlayerLevelForProgress, calculateCharacterPower]);
  const startEndlessTowerFloorBattle = useCallback(DungeonBattleActions.startEndlessTowerFloorBattleCallback(setGameState, getCurrentGameState, getBattleTeam, calculateTeamPower, calculateCharacterPower, spendCurrency, addCurrency, clearBattleLog), [setGameState, getCurrentGameState, getBattleTeam, calculateTeamPower, calculateCharacterPower, spendCurrency, addCurrency, clearBattleLog]);
  const startUltimateChallengeBattle = useCallback(DungeonBattleActions.startUltimateChallengeBattleCallback(setGameState, getCurrentGameState, getBattleTeam, spendCurrency, addCurrency, clearBattleLog), [setGameState, getCurrentGameState, getBattleTeam, spendCurrency, addCurrency, clearBattleLog]);


  const startArenaBattle = useCallback(ArenaBattleActions.startArenaBattleCallback(setGameState, getCurrentGameState, getBattleTeam, calculateTeamPower, spendCurrency, addCurrency, sendSystemMail, clearBattleLog, getPlayerLevelForProgress, calculateCharacterPower, addCharacter), [setGameState, getCurrentGameState, getBattleTeam, calculateTeamPower, spendCurrency, addCurrency, sendSystemMail, clearBattleLog, getPlayerLevelForProgress, calculateCharacterPower, addCharacter]);
  
  const finishArenaAction = useCallback(ArenaActions.finishArenaActionCallback(setGameState), [setGameState]);

  // --- WORLD BOSS & ARENA LEADERBOARD ACTIONS ---
  const attackWorldBoss = useCallback(WorldBossActions.attackWorldBossCallback(setGameState, getCurrentGameState, getBattleTeam), [setGameState, getCurrentGameState, getBattleTeam]);
  const getWorldBossLeaderboard = useCallback(WorldBossActions.getWorldBossLeaderboardCallback(getCurrentGameState), [getCurrentGameState]);
  const getArenaLeaderboard = useCallback(ArenaActions.getArenaLeaderboardCallback(getCurrentGameState, calculateTeamPower, getCharacterById), [getCurrentGameState, calculateTeamPower, getCharacterById]);

  // --- BATTLE PASS ACTIONS ---
  const claimBattlePassReward = useCallback(BattlePassActions.claimBattlePassRewardCallback(setGameState, addCurrency, addCharacter, addEquipmentItem), [setGameState, addCurrency, addCharacter, addEquipmentItem]);
  const purchaseBattlePass = useCallback(BattlePassActions.purchaseBattlePassCallback(setGameState, addVipExp, addCurrency), [setGameState, addVipExp, addCurrency]);
  const processBattlePassExpEffect = useCallback(BattlePassActions.processBattlePassExpEffectCallback(setGameState), [setGameState]);


  // --- GROWTH FUND ACTIONS ---
  const claimGrowthFundReward = useCallback(GrowthFundActions.claimGrowthFundRewardCallback(setGameState, addCharacter, addCurrency), [setGameState, addCharacter, addCurrency]);
  const purchaseGrowthFund = useCallback(GrowthFundActions.purchaseGrowthFundCallback(setGameState, addVipExp), [setGameState, addVipExp]);

  // --- TASK ACTIONS ---
  const getTaskProgress = useCallback(TaskActions.getTaskProgressCallback(getCurrentGameState), [getCurrentGameState]);
  const claimTaskReward = useCallback(TaskActions.claimTaskRewardCallback(setGameState, getTaskProgress, addCurrency), [setGameState, getTaskProgress, addCurrency]);

  // --- SEVEN DAY LOGIN ACTIONS ---
  const claimSevenDayLoginReward = useCallback(SevenDayLoginActions.claimSevenDayLoginRewardCallback(setGameState, addCharacter, addCurrency, sendSystemMail), [setGameState, addCharacter, addCurrency, sendSystemMail]);
  const setLastFreeDiamondClaimTime = useCallback(SevenDayLoginActions.setLastFreeDiamondClaimTimeCallback(setGameState), [setGameState]);

  // --- PLAYER ACTIONS ---
  const changePlayerName = useCallback(PlayerActions.changePlayerNameCallback(setGameState), [setGameState]);

  // --- UTILITY ACTIONS (RedDot) ---
  const checkRedDot = useCallback(UtilityActions.checkRedDotCallback(
    getCurrentGameState, getCharacterById, canAfford, getNextStage, 
    getUnequippedEquipmentBySlot, getUnequippedRunes, getTaskProgress,
    PET_ENHANCEMENT_COST, MAX_PET_LEVEL, 
    RUNE_ENHANCEMENT_COST, MAX_RUNE_LEVEL 
  ), [getCurrentGameState, getCharacterById, canAfford, getNextStage, getUnequippedEquipmentBySlot, getUnequippedRunes, getTaskProgress]);


  // --- Effects ---
  useEffect(() => {
    const intervalId = setInterval(() => {
      setGameState(prev => EventManager.handlePeriodicUpdates(
        prev,
        STAMINA_REGEN_RATE_PER_MINUTE,
        DUNGEONS_DEFINITIONS,
        ARENA_DAILY_ATTEMPTS,
        SEVEN_DAY_LOGIN_REWARDS,
        SHOP_ITEMS_RESOURCES,
        (currentState, mailData) => MailManagerLib.sendSystemMailLogic(currentState, mailData), 
        WORLD_BOSSES_DEFINITIONS,
        VIP_LEVELS,
        (customTeamIds) => calculateTeamPowerLib(prev, VIP_LEVELS, customTeamIds), 
        sendSystemMail, // Pass the memoized sendSystemMail from context
        SHOP_ITEMS_SPECIALS,
        SHOP_ITEMS_CURRENCY_STAMINA
      ));
    }, 30000); 
    return () => clearInterval(intervalId);
  }, [sendSystemMail]); // sendSystemMail is now a stable dependency from useCallback

   useEffect(() => {
        const wbLeaderboardVisualTimer = setInterval(() => {
            setGameState(prev => WorldBossManagerLib.updateLeaderboardVisuals(prev));
        }, WORLD_BOSS_LEADERBOARD_VISUAL_UPDATE_INTERVAL_MS);
        return () => clearInterval(wbLeaderboardVisualTimer);
    }, []);

   useEffect(() => {
        const npcActualDamageTimer = setInterval(() => {
            setGameState(prev => {
                if (prev.worldBoss && prev.worldBoss.currentHp > 0) {
                    // The WorldBossManagerLib.simulateNpcAttacks now handles the logic for using Arena NPCs
                    return WorldBossManagerLib.simulateNpcAttacks(prev, VIP_LEVELS);
                }
                return prev;
            });
        }, NPC_ACTUAL_DAMAGE_SIMULATION_INTERVAL_MS);
        return () => clearInterval(npcActualDamageTimer);
    }, []);
    
    useEffect(() => {
        const arenaLeaderboardTimer = setInterval(() => {
            setGameState(prev => {
                if (prev.isProcessingArenaAction) { 
                    return prev;
                }
                // Use a temporary variable to hold the result from ArenaManager
                const arenaUpdateResult = ArenaManager.updateArenaLeaderboardDynamics(prev, REGULAR_CHARACTERS, VIP_LEVELS);
                let finalState = arenaUpdateResult.newState; // Start with the state from arena dynamics
                // If there are mails to send, process them
                if (arenaUpdateResult.mailsToSend && arenaUpdateResult.mailsToSend.length > 0) {
                    arenaUpdateResult.mailsToSend.forEach(mailData => {
                        // Update finalState sequentially for each mail
                        finalState = MailManagerLib.sendSystemMailLogic(finalState, mailData);
                    });
                }
                return finalState; // Return the state after all updates
            });
        }, ARENA_LEADERBOARD_UPDATE_INTERVAL_MS);
        return () => clearInterval(arenaLeaderboardTimer);
    }, []); 


  useEffect(() => {
    const npcAnnouncementTimer = setInterval(() => {
        if (Math.random() < 0.30) { 
            const npcName = generateRandomPlayerName();
            let itemName = "神秘寶物";
            let itemEmoji = "✨";
            let itemRarity: CharacterRarity = CharacterRarity.SSR; // Corrected type
            const highRarityItems: Array<{item: any, type: any, name: string, emoji: string, rarity: CharacterRarity}> = [];
            REGULAR_CHARACTERS.forEach(c => { if(c.rarity === CharacterRarity.SSR || c.rarity === CharacterRarity.UR) highRarityItems.push({item: c, type: 'character', name: c.name, emoji: c.spriteEmoji, rarity: c.rarity})});
            BASE_EQUIPMENT_ITEMS.forEach(e => { if(e.rarity === CharacterRarity.SSR || e.rarity === CharacterRarity.UR) highRarityItems.push({item: e, type: 'equipment', name: e.name, emoji: e.emoji, rarity: e.rarity})});
            BASE_PETS.forEach(p => { if(p.rarity === CharacterRarity.SSR || p.rarity === CharacterRarity.UR) highRarityItems.push({item: p, type: 'pet', name: p.name, emoji: p.emoji, rarity: p.rarity})});
            BASE_RUNES.forEach(r => { if(r.rarity === CharacterRarity.SSR || r.rarity === CharacterRarity.UR) highRarityItems.push({item: r, type: 'rune', name: r.name, emoji: r.emoji, rarity: r.rarity})});
            if(highRarityItems.length > 0) {
                const randomPick = highRarityItems[Math.floor(Math.random() * highRarityItems.length)];
                itemName = randomPick.name;
                itemEmoji = randomPick.emoji;
                itemRarity = randomPick.rarity; // Corrected type
            }
            addGachaAnnouncement({ playerName: npcName, itemName, itemEmoji, rarity: itemRarity });
        }
    }, 15000);
    return () => clearInterval(npcAnnouncementTimer);
  }, [addGachaAnnouncement]);


   useEffect(() => {
       processBattlePassExpEffect();
    }, [gameState.resources[Currency.BATTLE_PASS_EXP], processBattlePassExpEffect]); 


  return (
    <GameContext.Provider value={{
      gameState, addCurrency, spendCurrency, addVipExp, addCharacter,
      levelUpCharacter, starUpCharacter, upgradeSkill, calculateCharacterPower, calculateTeamPower, 
      completeStage, startBattle, startDungeonBattle, startArenaBattle, finishArenaAction, startEndlessTowerFloorBattle, attackWorldBoss, startUltimateChallengeBattle,
      purchaseShopItem, getVipPerks, canAfford, getCharacterById,
      getCharacterBaseById, gachaPull,
      triggeredOffer: gameState.triggeredOffer, clearTriggeredOffer, purchaseTriggeredOffer, triggerOfferById,
      isStageCompleted, getNextStage, checkRedDot, getBattleLog, clearBattleLog,
      getOwnedEquipmentItemByUniqueId, getUnequippedEquipmentBySlot, equipItem, unequipItem, enhanceEquipment, addEquipmentItem,
      getOwnedPetByUniqueId, assignPet, addPet, enhancePet,
      getOwnedRuneByUniqueId, getUnequippedRunes, equipRune, unequipRune, addRune, enhanceRune,
      claimBattlePassReward, purchaseBattlePass,
      claimGrowthFundReward, purchaseGrowthFund,
      readMail, claimMailReward, deleteMail, sendSystemMail,
      claimTaskReward, getTaskProgress,
      getPlayerLevelForProgress, changePlayerName,
      claimSevenDayLoginReward,
      setLastFreeDiamondClaimTime,
      assignHeroToBattleSlot, clearBattleSlot, getBattleTeam, autoAssignTeam,
      getWorldBossLeaderboard, getArenaLeaderboard,
      addGachaAnnouncement
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextProps => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame 必須在 GameProvider 內部使用');
  }
  return context;
};
