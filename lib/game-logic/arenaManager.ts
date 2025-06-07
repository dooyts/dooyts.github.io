
import { GameState, ArenaLeaderboardEntry, Character, VIPLevel, ArenaHeroPreview, Currency, OwnedCharacter, ElementType, BaseSkill, OwnedSkill, ComputedCharacterStats, CharacterRarity, Mail, PetStatBoostKey } from '../../types';
import { uuidv4, generateRandomPlayerName, generateArenaNpcTeamData } from './utils';
import { 
    ARENA_MAX_RANK, MAX_HEROES_IN_BATTLE_TEAM, VIP_LEVELS as VIP_LEVELS_CONST, 
    ARENA_TOKENS_PER_WIN, ARENA_TOKENS_PER_LOSS, ARENA_DEFENSE_RANK_CHANGE_LOSS, 
    ARENA_DEFENSE_SUCCESS_TOKENS, ARENA_BATTLE_COST_STAMINA, 
    NPC_ARENA_CHALLENGES_PER_INTERVAL, ARENA_LEADERBOARD_UPDATE_INTERVAL_MS,
    PLAYER_ARENA_DEFENSE_COOLDOWN_MS, ELEMENT_ADVANTAGE,
    ARENA_OPPONENT_RANK_FACTOR_LOWER, ARENA_OPPONENT_RANK_FACTOR_UPPER
} from '../../constants/gameplayConstants';
import { REGULAR_CHARACTERS, BASE_SKILLS_DATA, STAT_BONUS_PER_STAR, BASE_CHARACTERS as ALL_BASE_CHARACTERS, MAX_CHARACTER_LEVEL_BY_STARS } from '../../constants/characterConstants'; 
import * as CharacterManager from './characterManager'; 
import * as BattleManager from './battleManager';
import { CURRENCY_EMOJIS, CURRENCY_NAMES } from '../../constants/uiConstants';
import * as MailManager from './mailManager';

export interface ArenaNpcBattleDefinition extends Character {
    arenaPreview: ArenaHeroPreview;
    npcVipLevelForBattle: number;
    // skills here should be the effective OwnedSkill[] based on simulated levels
}


export const createInitialArenaLeaderboard = (playerInitialRank: number, baseCharactersList: Character[] = REGULAR_CHARACTERS, vipLevels: typeof VIP_LEVELS_CONST): ArenaLeaderboardEntry[] => {
    const leaderboard: ArenaLeaderboardEntry[] = [];
    const numNpcsToGenerate = ARENA_MAX_RANK;
    const occupiedRanks = new Set<number>();

    const playerEntry: ArenaLeaderboardEntry = {
        playerId: 'player',
        playerName: "你", 
        vipLevel: 0, 
        combatPower: 0, 
        rank: playerInitialRank,
        teamPreview: [] 
    };
    leaderboard.push(playerEntry);
    occupiedRanks.add(playerInitialRank);

    for (let i = 1; i <= numNpcsToGenerate; i++) {
        if (i === playerInitialRank) continue; 

        let rank = i;
        if (occupiedRanks.has(rank)) { 
            while(occupiedRanks.has(rank) && rank <= ARENA_MAX_RANK + 50) { 
                rank++;
            }
            if (rank > ARENA_MAX_RANK + 50) continue; 
        }
        occupiedRanks.add(rank);

        const numTeamMembers = (rank <= 50) ? MAX_HEROES_IN_BATTLE_TEAM : Math.floor(Math.random() * (MAX_HEROES_IN_BATTLE_TEAM - 2)) + 3; // Ensure top NPCs have full teams
        const teamPreviewData = generateArenaNpcTeamData(rank, numTeamMembers, baseCharactersList);
        
        const npcTeamPower = CharacterManager.calculateTeamPower(
            { npcTeamPreview: teamPreviewData, npcVipLevel: Math.floor(Math.random() * (vipLevels.length * 0.7)) },
            vipLevels
        );

        leaderboard.push({
            playerId: uuidv4(),
            playerName: generateRandomPlayerName(),
            vipLevel: Math.floor(Math.random() * (vipLevels.length * 0.7)),
            combatPower: npcTeamPower || (10000 + (ARENA_MAX_RANK - rank) * (100 + Math.floor(Math.random() * 100)) + Math.floor(Math.random() * 5000)), 
            rank: rank,
            teamPreview: teamPreviewData,
        });
    }
    
    leaderboard.sort((a,b) => a.rank - b.rank);
    const finalLeaderboard = leaderboard.slice(0, ARENA_MAX_RANK);
    finalLeaderboard.forEach((entry, index) => {
        entry.rank = index + 1;
    });
    
    return finalLeaderboard;
};

const simulateNpcVsNpcBattle = (attacker: ArenaLeaderboardEntry, defender: ArenaLeaderboardEntry): { winnerId: string, loserId: string } => {
    const powerDifferenceFactor = Math.abs(attacker.combatPower - defender.combatPower) / Math.max(attacker.combatPower, defender.combatPower, 1);
    let attackerWinChance = 0.5;

    if (attacker.combatPower > defender.combatPower) {
        attackerWinChance += powerDifferenceFactor * 0.4; 
    } else {
        attackerWinChance -= powerDifferenceFactor * 0.4; 
    }
    attackerWinChance = Math.max(0.1, Math.min(0.9, attackerWinChance)); 

    if (Math.random() < attackerWinChance) {
        return { winnerId: attacker.playerId, loserId: defender.playerId };
    } else {
        return { winnerId: defender.playerId, loserId: attacker.playerId };
    }
};

const normalizeLeaderboardRanks = (leaderboard: ArenaLeaderboardEntry[]): ArenaLeaderboardEntry[] => {
    leaderboard.sort((a, b) => a.rank - b.rank); 
    leaderboard.forEach((entry, index) => {
        entry.rank = index + 1; 
    });
    return leaderboard.slice(0, ARENA_MAX_RANK); 
};


export const updateArenaLeaderboardDynamics = (
    prev: GameState,
    baseCharactersToUse: Character[] = REGULAR_CHARACTERS,
    vipLevels: typeof VIP_LEVELS_CONST
): { newState: GameState, mailsToSend: Omit<Mail, 'id' | 'timestamp' | 'isRead' | 'claimed'>[] } => {
    let newState = JSON.parse(JSON.stringify(prev)) as GameState;
    let updatedLeaderboard = [...newState.arenaLeaderboard];
    const mailsToSend: Omit<Mail, 'id' | 'timestamp' | 'isRead' | 'claimed'>[] = [];
    
    let playerEntryIndex = updatedLeaderboard.findIndex(e => e.playerId === 'player');
    if (playerEntryIndex === -1) { 
        const playerTeamPreview = newState.battleTeamSlots
            .map(id => {
                const char = id ? CharacterManager.getCharacterById(newState, id) : null;
                return char ? { heroId: char.id, level: char.level, stars: char.stars, spriteEmoji: char.spriteEmoji, name: char.name, simulatedSkillLevels: {} } : undefined;
            })
            .filter(Boolean) as ArenaHeroPreview[];

        updatedLeaderboard.push({
            playerId: 'player',
            playerName: newState.playerName,
            vipLevel: newState.vipLevel,
            combatPower: CharacterManager.calculateTeamPower(newState, vipLevels, newState.battleTeamSlots),
            rank: newState.arenaRank,
            teamPreview: playerTeamPreview
        });
        playerEntryIndex = updatedLeaderboard.length - 1;
    } else { 
        updatedLeaderboard[playerEntryIndex].combatPower = CharacterManager.calculateTeamPower(newState, vipLevels, newState.battleTeamSlots);
        updatedLeaderboard[playerEntryIndex].playerName = newState.playerName;
        updatedLeaderboard[playerEntryIndex].vipLevel = newState.vipLevel;
        updatedLeaderboard[playerEntryIndex].rank = newState.arenaRank; 
    }


    for (let i = 0; i < NPC_ARENA_CHALLENGES_PER_INTERVAL; i++) {
        const npcs = updatedLeaderboard.filter(e => e.playerId !== 'player');
        if (npcs.length < 1) break; 
        
        const attackerNpcIndex = Math.floor(Math.random() * npcs.length);
        const attackerNpc = npcs[attackerNpcIndex];
        const globalAttackerNpcIdx = updatedLeaderboard.findIndex(e => e.playerId === attackerNpc.playerId);

        let defender: ArenaLeaderboardEntry | undefined = undefined;
        let globalDefenderIdx = -1;
        const targetPlayerChance = 0.20; 

        if (Math.random() < targetPlayerChance && playerEntryIndex !== -1) {
            const timeSinceLastAttack = Date.now() - (newState.lastTimePlayerWasAttackedInArena || 0);
            if (timeSinceLastAttack >= PLAYER_ARENA_DEFENSE_COOLDOWN_MS) {
                defender = updatedLeaderboard[playerEntryIndex];
                globalDefenderIdx = playerEntryIndex;
            }
        }
        
        if (!defender) { 
            const otherNpcs = npcs.filter(npc => npc.playerId !== attackerNpc.playerId);
            if (otherNpcs.length === 0) continue;

            const higherRankedNpcs = otherNpcs.filter(npc => npc.rank < attackerNpc.rank);

            if (higherRankedNpcs.length > 0) {
                // Prefer to attack someone ranked higher and closest
                higherRankedNpcs.sort((a, b) => b.rank - a.rank); // Sort by rank descending (e.g., rank 8 then rank 5 if attacker is 10)
                defender = higherRankedNpcs[0]; // Picks the one closest to attacker's rank but higher
            } else {
                // If no one is higher, attack someone lower (e.g., closest lower rank)
                const lowerRankedNpcs = otherNpcs.filter(npc => npc.rank > attackerNpc.rank);
                if (lowerRankedNpcs.length > 0) {
                    lowerRankedNpcs.sort((a, b) => (a.rank - attackerNpc.rank) - (b.rank - attackerNpc.rank)); // Sort by smallest rank difference (attacking down)
                    defender = lowerRankedNpcs[0];
                } else {
                    // Should not happen if there's more than 1 NPC, but as a fallback to ensure activity
                    if (otherNpcs.length > 0) defender = otherNpcs[0];
                    else continue; // No other NPC to attack
                }
            }
            if (defender) {
                globalDefenderIdx = updatedLeaderboard.findIndex(e => e.playerId === defender!.playerId);
            } else {
                continue; // Still no defender found
            }
        }

        if (!defender || globalAttackerNpcIdx === -1 || globalDefenderIdx === -1) continue;

        if (defender.playerId === 'player') {
            newState.lastTimePlayerWasAttackedInArena = Date.now(); 
            const playerDefenseTeam = newState.battleTeamSlots
                .map(id => id ? CharacterManager.getCharacterById(newState, id) : null)
                .filter(Boolean) as OwnedCharacter[];

            if (playerDefenseTeam.length === 0) continue;

            const npcAttackerTeamForBattle = constructEffectiveArenaNpcTeamForBattle(
                attackerNpc.teamPreview || [], attackerNpc.vipLevel
            );
            const battleSimResult = BattleManager.simulateBattle(
                playerDefenseTeam, npcAttackerTeamForBattle, 
                `競技場防守戰 vs ${attackerNpc.playerName}`,
                attackerNpc.combatPower, 
                (char: OwnedCharacter) => CharacterManager.calculateCharacterPower(char, newState, vipLevels),
                ELEMENT_ADVANTAGE, BASE_SKILLS_DATA
            );
            
            const oldPlayerRank = updatedLeaderboard[globalDefenderIdx].rank;
            if (battleSimResult.success) { 
                newState.resources[Currency.ARENA_COIN] = (newState.resources[Currency.ARENA_COIN] || 0) + ARENA_DEFENSE_SUCCESS_TOKENS;
                mailsToSend.push({
                    title: "競技場防守成功!",
                    body: `你的隊伍成功抵禦了 ${attackerNpc.playerName} (戰力: ${attackerNpc.combatPower.toLocaleString()}) 的挑戰！\n你的排名保持在 ${oldPlayerRank}。\n獲得獎勵：${CURRENCY_EMOJIS[Currency.ARENA_COIN]} ${ARENA_DEFENSE_SUCCESS_TOKENS} ${CURRENCY_NAMES[Currency.ARENA_COIN]}。`,
                    sender: "競技場管理處", rewards: { [Currency.ARENA_COIN]: ARENA_DEFENSE_SUCCESS_TOKENS }
                });
            } else { 
                let newPlayerRank = oldPlayerRank;
                if (attackerNpc.rank < oldPlayerRank) { // NPC attacker was lower rank (higher number) but won
                    updatedLeaderboard[globalAttackerNpcIdx].rank = oldPlayerRank;
                    newPlayerRank = attackerNpc.rank; // Player takes NPC's old rank
                } else { // NPC attacker was higher rank (lower number) and won
                    newPlayerRank = Math.min(ARENA_MAX_RANK, oldPlayerRank + ARENA_DEFENSE_RANK_CHANGE_LOSS);
                }
                updatedLeaderboard[globalDefenderIdx].rank = newPlayerRank;
                newState.arenaRank = newPlayerRank; 

                mailsToSend.push({
                    title: "競技場防守失敗",
                    body: `你的隊伍在競技場中被 ${attackerNpc.playerName} (戰力: ${attackerNpc.combatPower.toLocaleString()}) 擊敗了！\n你的排名從 ${oldPlayerRank} 變動至 ${newPlayerRank}。`,
                    sender: "競技場管理處",
                });
            }
        } else { // NPC vs NPC
            const npcBattleResult = simulateNpcVsNpcBattle(attackerNpc, defender);
            if (npcBattleResult.winnerId === attackerNpc.playerId && attackerNpc.rank > defender.rank) { 
                const tempRank = updatedLeaderboard[globalAttackerNpcIdx].rank;
                updatedLeaderboard[globalAttackerNpcIdx].rank = updatedLeaderboard[globalDefenderIdx].rank;
                updatedLeaderboard[globalDefenderIdx].rank = tempRank;
            }
        }
    }
    
    // Introduce new strong NPC or replace a lower-ranked one
    if (Math.random() < 0.10) { // 10% chance
        const targetRankForNewNpc = Math.floor(Math.random() * 40) + 1; // New NPC targets rank 1-40
        const existingNpcAtRank = updatedLeaderboard.find(e => e.rank === targetRankForNewNpc && e.playerId !== 'player');
        
        const numTeamMembers = (targetRankForNewNpc <= 50) ? MAX_HEROES_IN_BATTLE_TEAM : Math.floor(Math.random() * (MAX_HEROES_IN_BATTLE_TEAM - 2)) + 3;
        const newNpcTeamPreview = generateArenaNpcTeamData(targetRankForNewNpc, numTeamMembers, baseCharactersToUse);
        
        const newNpcEntry: ArenaLeaderboardEntry = {
            playerId: uuidv4(),
            playerName: generateRandomPlayerName(),
            vipLevel: Math.floor(Math.random() * (vipLevels.length * 0.8)),
            combatPower: 0, // Will be calculated later
            rank: targetRankForNewNpc,
            teamPreview: newNpcTeamPreview
        };

        if (existingNpcAtRank) {
            const idx = updatedLeaderboard.findIndex(e => e.playerId === existingNpcAtRank.playerId);
            if (idx !== -1) updatedLeaderboard.splice(idx, 1, newNpcEntry); // Replace
        } else {
            updatedLeaderboard.push(newNpcEntry); // Add new
        }
    }

    newState.arenaLeaderboard = normalizeLeaderboardRanks(updatedLeaderboard);
    const finalPlayerEntry = newState.arenaLeaderboard.find(e => e.playerId === 'player');
    if (finalPlayerEntry) {
        newState.arenaRank = finalPlayerEntry.rank;
    } else { 
        newState.arenaRank = ARENA_MAX_RANK;
    }
    
    newState.arenaLeaderboard = newState.arenaLeaderboard.map(entry => {
        if (entry.playerId === 'player') return entry; 
        
        if (Math.random() < 0.05 || !entry.teamPreview || entry.teamPreview.length === 0) { 
            const numTeamMembersForRegen = (entry.rank <= 50) ? MAX_HEROES_IN_BATTLE_TEAM : (entry.teamPreview?.length || MAX_HEROES_IN_BATTLE_TEAM);
            entry.teamPreview = generateArenaNpcTeamData(entry.rank, numTeamMembersForRegen, baseCharactersToUse);
        }
        
        const calculatedNpcTeamPower = CharacterManager.calculateTeamPower(
            { npcTeamPreview: entry.teamPreview!, npcVipLevel: entry.vipLevel },
            vipLevels
        );
        return { ...entry, combatPower: Math.max(1000, calculatedNpcTeamPower) };
    }).sort((a,b) => a.rank - b.rank);


    newState.lastArenaLeaderboardUpdateTime = Date.now();
    return { newState, mailsToSend };
};


export const processArenaBattleOutcome = (
    currentState: GameState,
    playerWins: boolean,
    playerOldRankBeforeBattle: number, 
    opponentOriginalRank: number, 
    opponentPlayerId: string 
): { newState: GameState, rewardsForDisplay: Partial<Record<Currency, number>>, rankChangeForDisplay: number, mailForTralaleroHero?: Omit<Mail, 'id' | 'timestamp' | 'isRead' | 'claimed'>, messageForDisplay?: string } => {
    
    let newState = { ...currentState }; 
    let newPlayerRank = playerOldRankBeforeBattle;
    let rewards: Partial<Record<Currency, number>> = {};
    let messageForDisplay: string | undefined = undefined;
    
    const playerEntryIndex = newState.arenaLeaderboard.findIndex(e => e.playerId === 'player');
    const opponentEntryIndex = newState.arenaLeaderboard.findIndex(e => e.playerId === opponentPlayerId);

    if (playerWins) {
        rewards[Currency.ARENA_COIN] = ARENA_TOKENS_PER_WIN;
        rewards[Currency.BATTLE_PASS_EXP] = 30;
        if (opponentOriginalRank < playerOldRankBeforeBattle) { 
            newPlayerRank = opponentOriginalRank; 
            if (opponentEntryIndex !== -1) {
                newState.arenaLeaderboard[opponentEntryIndex].rank = playerOldRankBeforeBattle; 
            }
            messageForDisplay = "戰勝對手！排名互換！";
        } else { 
            messageForDisplay = "戰勝對手！"; 
        }
    } else { 
        messageForDisplay = "挑戰失敗...";
        rewards[Currency.ARENA_COIN] = ARENA_TOKENS_PER_LOSS;
        rewards[Currency.BATTLE_PASS_EXP] = 10;
    }
    
    newState.resources[Currency.ARENA_COIN] = (newState.resources[Currency.ARENA_COIN] || 0) + (rewards[Currency.ARENA_COIN] || 0);
    newState.resources[Currency.BATTLE_PASS_EXP] = (newState.resources[Currency.BATTLE_PASS_EXP] || 0) + (rewards[Currency.BATTLE_PASS_EXP] || 0);
    newState.arenaRank = newPlayerRank; 

    if (playerEntryIndex !== -1) {
        newState.arenaLeaderboard[playerEntryIndex].rank = newState.arenaRank;
    }
    
    newState.arenaLeaderboard = normalizeLeaderboardRanks(newState.arenaLeaderboard);
    const finalPlayerEntry = newState.arenaLeaderboard.find(e => e.playerId === 'player');
    if (finalPlayerEntry) newState.arenaRank = finalPlayerEntry.rank;

    const rankChangeForDisplay = playerOldRankBeforeBattle - newState.arenaRank; 

    let mailForTralaleroHero: Omit<Mail, 'id' | 'timestamp' | 'isRead' | 'claimed'> | undefined = undefined;
    if (newState.arenaRank === 1 && !newState.claimedArenaRank1Hero) {
        newState.claimedArenaRank1Hero = true; 
        messageForDisplay = "恭喜登頂競技場第一！Tralalero Tralala 加入隊伍！";
        mailForTralaleroHero = {
            title: "海洋的霸主！",
            body: `你登上了競技場的頂點！傳奇英雄 Tralalero Tralala 🦈 被你的強大所吸引，加入了你的行列！`,
            sender: "競技場之神"
        };
    }

    return { newState, rewardsForDisplay: rewards, rankChangeForDisplay, mailForTralaleroHero, messageForDisplay };
};

export const processNpcArenaDefenseWin = ( 
    currentState: GameState
): GameState => {
    let newState = { ...currentState };
    const rankLostByPlayer = ARENA_DEFENSE_RANK_CHANGE_LOSS; 
    const oldRank = newState.arenaRank;
    newState.arenaRank = Math.min(ARENA_MAX_RANK, newState.arenaRank + rankLostByPlayer);
    
    const playerEntryIndex = newState.arenaLeaderboard.findIndex(e => e.playerId === 'player');
    if (playerEntryIndex !== -1) {
        newState.arenaLeaderboard[playerEntryIndex].rank = newState.arenaRank;
    }
    newState.arenaLeaderboard = normalizeLeaderboardRanks(newState.arenaLeaderboard);
    const finalPlayerEntry = newState.arenaLeaderboard.find(e => e.playerId === 'player');
    if (finalPlayerEntry) newState.arenaRank = finalPlayerEntry.rank;

    return newState;
};

export const processPlayerArenaDefenseSuccess = (
    currentState: GameState
): GameState => {
     let newState = { ...currentState };
     newState.resources[Currency.ARENA_COIN] = (newState.resources[Currency.ARENA_COIN] || 0) + ARENA_DEFENSE_SUCCESS_TOKENS;
     return newState;
};


export const getArenaOpponent = (gameState: GameState, playerRank: number, playerTeamPower: number): ArenaLeaderboardEntry | null => {
    if (playerRank <= 0) return null; 

    if (playerRank === 1) {
        return gameState.arenaLeaderboard.find(e => e.rank === 2 && e.playerId !== 'player') || null;
    }

    const targetRankMin = Math.ceil(playerRank * ARENA_OPPONENT_RANK_FACTOR_LOWER);
    const targetRankMax = Math.max(targetRankMin, Math.floor(playerRank * ARENA_OPPONENT_RANK_FACTOR_UPPER));
    
    const potentialOpponents = gameState.arenaLeaderboard
        .filter(e => e.playerId !== 'player' && 
                     e.teamPreview && e.teamPreview.length > 0 && 
                     e.rank >= targetRankMin && e.rank <= targetRankMax && e.rank < playerRank)
        .sort((a,b) => Math.abs(a.combatPower - playerTeamPower) - Math.abs(b.combatPower - playerTeamPower)); 
    
    if (potentialOpponents.length > 0) {
        return potentialOpponents[0]; 
    }
    
    const closestBetterRanked = gameState.arenaLeaderboard
        .filter(e => e.playerId !== 'player' && e.teamPreview && e.teamPreview.length > 0 && e.rank < playerRank)
        .sort((a,b) => (playerRank - a.rank) - (playerRank - b.rank)); 

    if (closestBetterRanked.length > 0) return closestBetterRanked[0];
        
    const anyOtherNpc = gameState.arenaLeaderboard
        .filter(e => e.playerId !== 'player' && e.teamPreview && e.teamPreview.length > 0 && e.rank !== playerRank)
        .sort((a,b) => Math.abs(a.rank - playerRank) - Math.abs(b.rank - playerRank)); 
        
    if (anyOtherNpc.length > 0) return anyOtherNpc[0];

    const fallbackRank = Math.max(1, playerRank - Math.floor(Math.random()*5 + 1));
    const fallbackTeamPreview = generateArenaNpcTeamData(fallbackRank, MAX_HEROES_IN_BATTLE_TEAM, REGULAR_CHARACTERS); 
    
    const fallbackEntry: ArenaLeaderboardEntry = {
        playerId: uuidv4(),
        playerName: generateRandomPlayerName(),
        vipLevel: Math.floor(Math.random() * 5),
        combatPower: playerTeamPower * (0.8 + Math.random() * 0.3), 
        rank: fallbackRank,
        teamPreview: fallbackTeamPreview,
    };
    return fallbackEntry;
};

export const constructEffectiveArenaNpcTeamForBattle = (
    opponentPreview: ArenaHeroPreview[],
    npcVipLevel: number
): ArenaNpcBattleDefinition[] => {
    return opponentPreview.map(heroPrev => {
        const baseHero = ALL_BASE_CHARACTERS.find(ch => ch.id === heroPrev.heroId); 
        if (!baseHero) {
            // This should ideally not happen if ArenaHeroPreview is generated correctly
            console.error(`Base character ${heroPrev.heroId} not found for Arena NPC ${heroPrev.name}`);
            const fallbackBase: Character = { id: heroPrev.heroId, name: heroPrev.name, spriteEmoji: heroPrev.spriteEmoji,
                rarity: CharacterRarity.N, element: ElementType.WATER, 
                baseHp: 100, baseAtk: 10, baseDef: 10, baseSpd: 10, critRate: 0, critDmg: 0, accuracy: 0, evasion: 0,
                skills: [] };
            return {
                ...fallbackBase,
                level: heroPrev.level,
                stars: heroPrev.stars,
                skills: [], // Fallback empty skills
                arenaPreview: heroPrev,
                npcVipLevelForBattle: npcVipLevel,
            };
        }

        const effectiveSkills: OwnedSkill[] = baseHero.skills.map(s_base => {
            const baseSkillDef = BASE_SKILLS_DATA[s_base.id];
            let currentLevel = 1;
            if (heroPrev.simulatedSkillLevels && heroPrev.simulatedSkillLevels[s_base.id] !== undefined) {
                currentLevel = heroPrev.simulatedSkillLevels[s_base.id];
            } else if (baseSkillDef) { 
                currentLevel = (heroPrev.level >= (MAX_CHARACTER_LEVEL_BY_STARS[heroPrev.stars] * 0.8) ? baseSkillDef.maxLevel : Math.max(1, baseSkillDef.maxLevel - 2));
            }

            if (!baseSkillDef) {
                return { id: s_base.id, name: "Unknown Skill", description: "Error: Skill definition missing.", emoji: "❓", maxLevel: 1, currentLevel: 1, upgradeCost: () => ({}) } as OwnedSkill;
            }
            return {
                ...(baseSkillDef as Omit<BaseSkill, 'id'>),
                id: s_base.id,
                currentLevel: Math.min(baseSkillDef.maxLevel, Math.max(1, currentLevel)),
            };
        });

        return {
            ...baseHero, // True base stats (hp, atk, def, spd from BASE_CHARACTERS)
            name: heroPrev.name, // Use name from preview if it differs (though usually same)
            level: heroPrev.level,
            stars: heroPrev.stars,
            spriteEmoji: heroPrev.spriteEmoji, // Use specific emoji from preview
            // Element, critRate, etc., will come from baseHero
            skills: effectiveSkills, // Use skills processed from simulatedSkillLevels
            arenaPreview: heroPrev, // Pass the original preview data
            npcVipLevelForBattle: npcVipLevel, // Pass the NPC's VIP level for this battle
        };
    });
};

export const checkArenaAvailableRedDot = (gameState: GameState): boolean => {
    return gameState.dailyArenaAttempts > 0 && gameState.resources.STAMINA >= ARENA_BATTLE_COST_STAMINA && !gameState.isProcessingArenaAction;
};
