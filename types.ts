
export enum Currency {
  GOLD = 'GOLD',
  DIAMONDS = 'DIAMONDS',
  STAMINA = 'STAMINA',
  ARENA_COIN = 'ARENA_COIN',
  EXP_POTION = 'EXP_POTION',
  BREAKTHROUGH_STONE = 'BREAKTHROUGH_STONE',
  GACHA_TICKET = 'GACHA_TICKET', // Hero gacha ticket
  SKILL_BOOK_NORMAL = 'SKILL_BOOK_NORMAL',
  SKILL_BOOK_ADVANCED = 'SKILL_BOOK_ADVANCED',
  ENHANCEMENT_STONE = 'ENHANCEMENT_STONE',
  EQUIPMENT_TICKET = 'EQUIPMENT_TICKET', // For equipment gacha or crafting
  PET_FOOD = 'PET_FOOD',
  PET_TICKET = 'PET_TICKET', // For pet gacha
  RUNE_DUST = 'RUNE_DUST', // For rune upgrades
  RUNE_TICKET = 'RUNE_TICKET', // For rune gacha/crafting
  BATTLE_PASS_EXP = 'BATTLE_PASS_EXP',
  LUCKY_DRAW_TICKET = 'LUCKY_DRAW_TICKET', // For the new lucky draw
  WORLD_BOSS_ENERGY = 'WORLD_BOSS_ENERGY', // For attacking world boss
  WORLD_BOSS_COIN = 'WORLD_BOSS_COIN', // Reward from world boss
}

export interface PlayerResources {
  [Currency.GOLD]: number;
  [Currency.DIAMONDS]: number;
  [Currency.STAMINA]: number;
  [Currency.ARENA_COIN]: number;
  [Currency.EXP_POTION]: number;
  [Currency.BREAKTHROUGH_STONE]: number;
  [Currency.GACHA_TICKET]: number;
  [Currency.SKILL_BOOK_NORMAL]: number;
  [Currency.SKILL_BOOK_ADVANCED]: number;
  [Currency.ENHANCEMENT_STONE]: number;
  [Currency.EQUIPMENT_TICKET]: number;
  [Currency.PET_FOOD]: number;
  [Currency.PET_TICKET]: number;
  [Currency.RUNE_DUST]: number;
  [Currency.RUNE_TICKET]: number;
  [Currency.BATTLE_PASS_EXP]: number; // Added this line
  [Currency.LUCKY_DRAW_TICKET]: number;
  [Currency.WORLD_BOSS_ENERGY]: number;
  [Currency.WORLD_BOSS_COIN]: number;

  vipExp: number;
  currentStamina: number;
  maxStamina: number;
  totalSimulatedNTSpent: number; // New: Track total spending
}

export enum CharacterRarity {
  N = 'N',
  R = 'R',
  SR = 'SR',
  SSR = 'SSR',
  UR = 'UR',
}

export enum ElementType {
  WATER = '水',
  FIRE = '火',
  WIND = '風',
  THUNDER = '雷',
  LIGHT = '光',
  DARK = '暗',
}

export enum StatusEffectType {
  UNABLE_TO_ACT = '無法行動', // Stun, Freeze, etc.
  DAMAGE_OVER_TIME = '持續傷害', // Burn, Poison, Bleed, etc.
}

export interface AppliedStatusEffect {
  id: string;
  type: StatusEffectType;
  duration: number;
  sourceSkillId: string;
  casterId?: string;

  dotDamageMultiplier?: number;
  damagePerTurn?: number;
}

export type BuffDebuffStatEffectKey =
  | keyof ComputedCharacterStats // 'hp', 'atk', 'def', 'spd', 'critRate', 'critDmg', 'accuracy', 'evasion'
  | 'all_stats'
  | 'skill_damage_increase'
  | 'crit_chance_reduction'
  | 'evasion_increase'
  | 'attack_increase'
  | 'defense_increase'
  | 'speed_increase'
  | 'attack_reduction'
  | 'defense_reduction'
  | 'speed_reduction'
  | 'accuracy_perc'; // Added accuracy_perc for WB skill

export interface AppliedBuffDebuff {
  id: string;
  sourceSkillId: string;
  casterId?: string;
  statAffected: BuffDebuffStatEffectKey;
  value: number; // Percentage (e.g., 20 for +20%)
  duration: number;
  isBuff: boolean; // true for buff, false for debuff
}


export interface SkillEffectTargetting {
    target?: 'self' | 'enemy_single' | 'enemy_all' | 'ally_single_lowest_hp' | 'ally_all' | 'random_enemy_targets' ;
    numRandomTargets?: number;
}

export interface BaseSkill extends SkillEffectTargetting {
  id: string;
  name: string;
  description: string;
  emoji: string;
  damageMultiplier?: number;
  healMultiplier?: number;
  shieldMultiplier?: number;
  cooldown?: number;
  currentCooldown?: number;
  maxLevel: number;
  isPassive?: boolean;

  applyStatusEffects?: {
    type: StatusEffectType;
    chance?: number;
    duration?: number;
    dotDamageMultiplier?: number;
  }[];

  buffs?: {
    // stat key indicates the type of buff, maps to a statAffected and isBuff=true
    stat: 'all_stats' | 'skill_damage_increase' | 'crit_chance_reduction' | 'evasion_increase' | 'attack_increase' | 'defense_increase' | 'speed_increase' | 'critRate' | 'critDmg';
    value: number;
    duration: number;
    chance?: number;
    targetType?: 'self' | 'all_allies';
  }[];

  debuffs?: {
    // stat key indicates the type of debuff, maps to a statAffected and isBuff=false
    stat: 'all_stats' | 'defense_reduction' | 'speed_reduction' | 'attack_reduction' | 'accuracy_perc'; // Added 'accuracy_perc' for WB skill debuff
    value: number;
    duration: number;
    chance?: number;
    targetType?: 'all_enemies' | 'enemy_single';
  }[];

  cooldownReductionEffect?: {
      amount: number;
      targetType: 'self' | 'all_allies';
      chance?: number;
  };

  statModifications?: { // This might be redundant if buffs/debuffs are used for all stat changes
    stat: keyof ComputedCharacterStats;
    value: number;
    isPercentage?: boolean;
    duration?: number;
  }[];

  specialConditions?: {
    type: 'execute' | 'life_steal' | 'ignore_defense' | 'damage_boost_per_debuff' | 'reset_cooldown_on_kill' | 'if_hp_above_threshold_extra_damage' | 'if_hp_below_threshold_extra_damage' | 'self_damage_current_hp_perc';
    executeHpThreshold?: number;
    executeDamageCapMultiplier?: number;
    lifeStealPercent?: number;
    ignoreDefensePercent?: number;
    damageBoostPerDebuffPercent?: number;
    hpThresholdPercent?: number;
    extraDamageMultiplier?: number;
    selfDamagePercent?: number;
  }[];

  upgradeCost: (level: number) => Partial<Record<Currency, number>>;
  upgradeEffect?: (level: number) => Partial<Omit<BaseSkill, 'id' | 'name' | 'description' | 'emoji' | 'cooldown' | 'maxLevel' | 'upgradeCost' | 'upgradeEffect' | 'isPassive' | 'currentCooldown'>>;
}


export interface OwnedSkill extends BaseSkill {
  currentLevel: number;
}

export enum EquipmentSlot {
  WEAPON = '武器',
  HELMET = '頭盔',
  CHEST = '胸甲',
  LEGS = '護腿',
  BOOTS = '鞋子',
  ACCESSORY = '飾品',
}

export interface BaseEquipmentItem {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: CharacterRarity;
  emoji: string;
  baseStats: Partial<Record<'hp' | 'atk' | 'def' | 'spd' | 'critRate' | 'critDmg' | 'accuracy' | 'evasion', number>>;
  statIncreasePerEnhancement: Partial<Record<'hp' | 'atk' | 'def' | 'spd' | 'critRate' | 'critDmg' | 'accuracy' | 'evasion', number>>;
  maxEnhancement: number;
}

export interface OwnedEquipmentItem extends BaseEquipmentItem {
  uniqueId: string;
  enhancementLevel: number;
}

export interface Character {
  id: string;
  name: string;
  rarity: CharacterRarity;
  element: ElementType;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  critRate: number;
  critDmg: number;
  accuracy: number;
  evasion: number;
  spriteEmoji: string;
  skills: BaseSkill[];
  level?: number;
  stars?: number;
}

export enum RuneSlotType {
  ATTACK = '攻擊型',
  DEFENSE = '防禦型',
  SUPPORT = '輔助型',
  SPECIAL = '特殊型',
}
export interface BaseRune {
    id: string;
    name: string;
    emoji: string;
    rarity: CharacterRarity;
    slotType: RuneSlotType;
    mainStatOptions: Partial<Record<'hp_flat' | 'hp_perc' | 'atk_flat' | 'atk_perc' | 'def_flat' | 'def_perc' | 'spd_flat' | 'critRate_perc' | 'critDmg_perc' | 'accuracy_perc' | 'evasion_perc', {min: number, max: number}>>;
    maxLevel: number;
    mainStatIncreasePerLevel: number;
}
export interface OwnedRune extends BaseRune {
    uniqueId: string;
    currentMainStat: { type: keyof BaseRune['mainStatOptions'], value: number };
    initialMainStatValue: number;
    level: number;
}

export type PetStatBoostKey = 'hp_perc' | 'atk_perc' | 'def_perc' | 'spd_flat' | 'critRate_perc' | 'critDmg_perc' | 'evasion_perc' | 'accuracy_perc';

export interface BasePet {
    id: string;
    name: string;
    rarity: CharacterRarity;
    emoji: string;
    globalStatsBoost: Partial<Record<PetStatBoostKey, number>>;
    statIncreasePerLevel: Partial<Record<PetStatBoostKey, number>>;
    maxLevel: number;
}
export interface OwnedPet extends BasePet {
    uniqueId: string;
    level: number;
}

export interface OwnedCharacter extends Omit<Character, 'skills' | 'level' | 'stars'> {
  level: number;
  stars: number;
  shards: number;
  currentExp: number;
  skills: OwnedSkill[];
  equipment: Partial<Record<EquipmentSlot, OwnedEquipmentItem['uniqueId'] | null>>;
  runes: (OwnedRune['uniqueId'] | null)[];
  assignedPetId: OwnedPet['uniqueId'] | null;
  npcSimulatedEquipment?: OwnedEquipmentItem[];
  npcSimulatedRunes?: OwnedRune[];
  statusEffects: AppliedStatusEffect[];
  currentShield?: number;
  activeBuffDebuff: AppliedBuffDebuff | null; // Single slot for buff/debuff
}

export interface ComputedCharacterStats {
    hp: number;
    atk: number;
    def: number;
    spd: number;
    critRate: number;
    critDmg: number;
    accuracy: number;
    evasion: number;
    // skill_damage_increase?: number; // Not a direct stat, handled in damage calc
    // crit_chance_reduction?: number; // Not a direct stat, handled in crit calc
}

export interface Stage {
  id: string;
  chapter: number;
  levelInChapter: number;
  name: string;
  recommendedPower: number;
  isBoss: boolean;
  enemies: Character[]; // For campaign, these are base Character definitions
  rewards: Partial<Record<Currency, number>> & { firstClearDiamonds?: number, equipmentDropIds?: string[], petDropIds?: string[], runeDropIds?: string[] };
}

export interface VIPLevel {
  level: number;
  expRequired: number;
  perks: string[];
  bonusAttackPercent?: number;
  bonusAllStatsPercent?: number;
  dailyStaminaPurchaseLimitIncrease?: number;
  arenaAttemptsIncrease?: number;
  dungeonAttemptsIncrease?: Record<Dungeon['id'], number>;
  offlineEarningsBonusPercent?: number;
  exclusiveShopPackId?: string;
  dailyFreeGachaTicket?: Currency.GACHA_TICKET;
}

export enum ShopItemCategory {
    DIAMOND = 'DIAMOND',
    BUNDLE = 'BUNDLE',
    RESOURCE = 'RESOURCE',
    SPECIALS = 'SPECIALS',
    VIP_EXCLUSIVE = 'VIP_EXCLUSIVE',
}

export interface ShopItem {
  id: string;
  name: string;
  category: ShopItemCategory;
  priceNT?: number;
  priceCurrency?: Currency;
  priceAmount?: number;
  diamondsAwarded?: number;
  bonusDiamonds?: number;
  resources?: Partial<Record<Currency, number>>;
  characterShards?: { charId: string, amount: number };
  equipment?: BaseEquipmentItem['id'][];
  effect?: Record<string, any>;
  isMonthlyCard?: boolean;
  isLifetimeCard?: boolean;
  isGrowthFund?: boolean;
  vipExpAwarded: number;
  emoji: string;
  isOneTime?: boolean;
  dailyLimit?: number;
  requiredVipLevel?: number;
}

export interface TriggeredOffer extends ShopItem {
  triggerCondition: string;
  durationSeconds: number;
}

export interface BattlePassTier {
  level: number;
  expRequired: number;
  freeReward?: Partial<Record<Currency, number>> & { characterShards?: { charId: string, amount: number }, equipment?: BaseEquipmentItem['id'][] };
  paidReward: Partial<Record<Currency, number>> & { characterShards?: { charId: string, amount: number }, isSkin?: boolean, equipment?: BaseEquipmentItem['id'][], pet?: BasePet['id'][] };
}

export interface GrowthFundMilestone {
  id: string;
  description: string;
  condition: (gs: GameState) => boolean;
  rewards: Partial<Record<Currency, number>>;
  characterShards?: {charId: string, amount: number};
}

export type GachaItemType = 'character' | 'equipment' | 'pet' | 'rune' | 'resource';

export interface GachaResultItem {
  type: GachaItemType;
  name: string;
  emoji: string;
  description?: string;
  rarity: CharacterRarity;
  id: string;
  item?: Character | BaseEquipmentItem | BasePet | BaseRune;
  amount?: number;
}

export type GachaPoolItemConfig =
  | { type: 'character'; id: string; rarity: CharacterRarity; }
  | { type: 'equipment'; id: string; rarity: CharacterRarity; }
  | { type: 'pet'; id: string; rarity: CharacterRarity; }
  | { type: 'rune'; id: string; rarity: CharacterRarity; }
  | { type: 'resource'; id: string; name: string; emoji: string; amount?: number; rarity: CharacterRarity; weight: number; };

export type GachaPullableItem = Character | OwnedEquipmentItem | OwnedPet | OwnedRune | GachaResultItem;

export interface GachaPool {
  id: string;
  name: string;
  costCurrency: Currency;
  costAmount: number;
  pulls: (1 | 10)[];
  singlePullCost?: { currency: Currency, amount: number };
  guarantees: {
    softPityStart?: number;
    ssrPerSoftPityIncrease?: number;
    hardPitySSR?: number;
    upGuaranteeRate?: number;
  };
  rates: Record<CharacterRarity, number> | Record<string, number>;
  itemPool: GachaPoolItemConfig[];
  upItems?: { type: GachaItemType, id: string }[];
  isLuckyDraw?: boolean;
}

export interface DungeonRewardTier {
  damageThreshold: number;
  rewards: Partial<Record<Currency, number>> & { equipmentDropIds?: string[], petDropIds?: string[], runeDropIds?: string[] };
}

export interface Dungeon {
  id: string;
  name: string;
  description: string;
  cost: { currency: Currency, amount: number }[];
  baseRewards?: Partial<Record<Currency, number>> & { equipmentDropIds?: string[], petDropIds?: string[], runeDropIds?: string[] };
  rewardTiers?: DungeonRewardTier[];
  isDamageBasedReward?: boolean;
  dailyAttempts: number;
  emoji: string;
  powerCheckMultiplier?: number;
  isEndlessTower?: boolean;
  enemies?: Character[]; // For fixed enemy dungeons like Gold Mine, Exp Temple
}

export interface Mail {
  id: string;
  title: string;
  body: string;
  sender: string;
  timestamp: number;
  rewards?: Partial<Record<Currency, number>>;
  isRead: boolean;
  claimed: boolean;
}

export enum TaskType {
  DAILY = '每日',
  WEEKLY = '每週',
  ACHIEVEMENT = '成就'
}
export interface Task {
  id: string;
  type: TaskType;
  description: string;
  targetCount: number;
  conditionProperty?: keyof GameState['taskProgress'];
  conditionValue?: any;
  conditionFunction?: (gs: GameState) => boolean;
  rewards: Partial<Record<Currency, number>>;
  characterShards?: { charId: string, amount: number }; // Added for achievements
  emoji: string;
}

export interface SevenDayLoginReward {
  day: number;
  description: string;
  rewards: Partial<Record<Currency, number>>;
  characterShards?: { charId: string, amount: number };
  emoji: string;
}

export interface WorldBossLeaderboardEntry {
    playerId: string;
    playerName: string;
    vipLevel: number;
    damageDealt: number;
    lastAttackTime: number;
}

export interface ArenaHeroPreview {
    heroId: string;
    level: number;
    stars: number;
    spriteEmoji: string;
    name: string;
    simulatedEquipmentBoost?: Partial<ComputedCharacterStats>;
    simulatedRuneBoost?: Partial<ComputedCharacterStats>;
    simulatedPetBoostConfig?: Partial<Record<PetStatBoostKey, number>>;
    simulatedSkillLevels?: Record<string, number>;
}

export interface ArenaLeaderboardEntry {
    playerId: string;
    playerName: string;
    vipLevel: number;
    combatPower: number;
    rank: number;
    teamPreview?: ArenaHeroPreview[];
}

export interface WorldBossInfo {
    id: string;
    name: string;
    spriteEmoji: string;
    element: ElementType;
    description?: string;
    currentHp: number;
    maxHp: number;
    nextRefreshTime: number;
    attackCost: { currency: Currency, amount: number };
    baseRewards: Partial<Record<Currency, number>>;
    rankRewardsMultiplier?: Record<number, number>;
    skills?: string[]; // Array of skill IDs for the boss
    baseAtk?: number; // Optional base stats for battle simulator
    baseDef?: number;
    baseSpd?: number;
}
export interface NpcBossParticipantInfo {
    npcId: string; // Arena NPC ID
    playerName: string; // Arena NPC Name
    teamPreview: ArenaHeroPreview[];
    vipLevel: number;
    totalDamageDealtThisCycle: number;
    hasAttackedThisCycle: boolean;
}


export interface GachaAnnouncement {
  id: string;
  playerName: string;
  itemName: string;
  itemEmoji: string;
  rarity: CharacterRarity;
  timestamp: number;
}

// For state management
export interface GameState {
  playerName: string;
  resources: PlayerResources;
  characters: OwnedCharacter[];
  ownedEquipment: OwnedEquipmentItem[];
  ownedPets: OwnedPet[];
  ownedRunes: OwnedRune[];
  battleTeamSlots: (OwnedCharacter['id'] | null)[];

  completedStages: string[];
  currentChapter: number;
  currentLevelInChapter: number;

  vipLevel: number;

  battlePassExp: number;
  battlePassLevel: number;
  battlePassPurchased: 'none' | 'advanced' | 'collector';
  claimedBattlePassFreeTiers: number[];
  claimedBattlePassPaidTiers: number[];

  growthFundPurchased: boolean;
  claimedGrowthFundMilestones: string[];

  activeMonthlyCardEndTime: number | null;
  activeLifetimeCard: boolean;
  firstPurchaseBonusUsed: Record<string, boolean>;
  purchasedOneTimeOffers: string[];

  triggeredOffer: TriggeredOffer | null;
  lastLoginTime: number;
  lastStaminaUpdateTime: number;

  gachaPity: Record<GachaPool['id'], { ssrCount: number, upGuaranteed: boolean, totalPulls?: number }>;

  battleLog: string[];

  lastDailyReset: number;
  lastWeeklyReset: number;
  dailyDungeonAttempts: Record<Dungeon['id'], number>;
  dailyArenaAttempts: number;
  lastFreeDailyDiamondClaimTimestamp: number | null;
  dailyPurchaseLimits: Record<ShopItem['id'], { count: number; lastPurchaseTime: number }>;

  arenaRank: number;
  arenaLeaderboard: ArenaLeaderboardEntry[];
  claimedArenaRank1Hero: boolean;
  lastTimePlayerWasAttackedInArena: number | null;
  isProcessingArenaAction?: boolean;

  mails: Mail[];

  taskProgress: {
      battlesWon: number;
      stagesCleared: number;
      heroesSummoned: number;
      equipmentEnhanced: number;
      battlesWonToday?: number;
      dungeonsClearedToday?: number;
      worldBossDamageDealtToday?: number;
      arenaBattlesWonToday?: number;
      petsEnhanced?: number;
      runesEnhanced?: number;
  };
  completedTasks: string[];

  sevenDayLogin: {
    currentDay: number;
    claimedToday: boolean;
    lastClaimTimestamp: number | null;
  };

  endlessTowerMaxFloor: number;
  currentEndlessTowerRun: {
    currentFloor: number;
    isActive: boolean;
    initialAttemptMadeToday: boolean;
  } | null;

  worldBoss: WorldBossInfo | null;
  worldBossLeaderboard: WorldBossLeaderboardEntry[];
  playerWorldBossStats: {
      totalDamageDealtThisCycle: number;
      attacksMadeThisCycle: number;
      lastAttackTime: number | null;
  };
  lastWorldBossLeaderboardUpdateTime: number;
  lastArenaLeaderboardUpdateTime: number;
  worldBossCycleIndex: number;
  worldBossNpcCycleParticipants: NpcBossParticipantInfo[]; // Stores selected NPCs for the current boss cycle
  worldBossNpcBatchesProcessedThisCycle: number; // Tracks how many batches of NPCs have attacked

  gachaAnnouncements: GachaAnnouncement[];
  claimedBombardiroHero: boolean;

  ultimateChallengeCurrentLevel: number;
  ultimateChallengeMaxLevelReached: boolean;
}
