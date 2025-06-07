
import React from 'react';
import { GameState, Currency, OwnedCharacter, Mail, Character, OwnedSkill, StatusEffectType, BaseSkill } from '../../types';
import * as BattleManagerUtils from '../../lib/game-logic/battleManager'; // For general battle utilities if needed
import * as ArenaManager from '../../lib/game-logic/arenaManager';
import * as TaskManager from '../../lib/game-logic/taskManager';
import * as CharacterManager from '../../lib/game-logic/characterManager';
import { initializeBattleState, processTurn, BattleState, BattleParticipant } from '../../lib/game-logic/battleSimulator'; // Import new simulator
import {
    ELEMENT_ADVANTAGE, ARENA_BATTLE_COST_STAMINA, MAX_TURNS_WORLD_BOSS_FIGHT
} from '../../constants/gameplayConstants';
import { BASE_CHARACTERS, BASE_SKILLS_DATA } from '../../constants/characterConstants';
import { CURRENCY_NAMES } from '../../constants/uiConstants';

// Typedefs for functions passed from GameContext
type GetCurrentGameStateFn = () => GameState;
type GetBattleTeamFn = () => OwnedCharacter[];
type CalculateTeamPowerFn = (customTeamIds?: (string | null)[]) => number;
type SpendCurrencyFn = (currency: Currency, amount: number) => boolean;
type AddCurrencyFn = (currency: Currency, amount: number) => void;
type SendSystemMailFn = (mailData: Omit<Mail, 'id' | 'timestamp' | 'isRead' | 'claimed'>) => void;
type GetPlayerLevelForProgressFn = () => number;
type CalculateCharacterPowerFn = (character: OwnedCharacter) => number;
type AddCharacterFn = (characterId: string, initialShards?: number) => OwnedCharacter | null;
type ClearBattleLogFn = () => void;


export const startArenaBattleCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    getGameState: GetCurrentGameStateFn,
    getBattleTeamFn: GetBattleTeamFn,
    calculateTeamPowerFn: CalculateTeamPowerFn,
    spendCurrencyFn: SpendCurrencyFn,
    addCurrencyFn: AddCurrencyFn,
    sendSystemMailFn: SendSystemMailFn,
    clearBattleLogFn: ClearBattleLogFn,
    getPlayerLevelForProgressFn: GetPlayerLevelForProgressFn, // Unused, but kept for signature consistency if needed later
    calculateCharPowerFn: CalculateCharacterPowerFn, // Used for display/recommendation only if needed by ArenaManager or UI
    addCharacterFn: AddCharacterFn
) => (): { success: boolean; rewards?: Partial<Record<Currency, number>>; battleLog: string[], rankChange?: number, message?: string } => {
    clearBattleLogFn();
    const initialGameStateForBattleChecks = getGameState();
    const playerOldRank = initialGameStateForBattleChecks.arenaRank;
    const playerTeamPower = calculateTeamPowerFn(); 
    
    setGameState(prev => ({...prev, isProcessingArenaAction: true}));

    if (initialGameStateForBattleChecks.dailyArenaAttempts <= 0) {
        const log = ["<span class='text-red-400'>挑戰失敗：次數不足。</span>"];
        setGameState(prev => ({...prev, battleLog: log, isProcessingArenaAction: false }));
        return { success: false, battleLog: log, message: "次數不足" };
    }

    if (!spendCurrencyFn(Currency.STAMINA, ARENA_BATTLE_COST_STAMINA)) {
        const log = ["<span class='text-red-400'>挑戰失敗：體力不足。</span>"];
        setGameState(prev => ({...prev, battleLog: log, isProcessingArenaAction: false }));
        return { success: false, battleLog: log, message: "體力不足" };
    }

    const playerTeam = getBattleTeamFn();
    if (playerTeam.length === 0) {
        const log = ["錯誤：戰鬥隊伍為空。"];
        setGameState(prev => ({ ...prev, battleLog: log, isProcessingArenaAction: false }));
        addCurrencyFn(Currency.STAMINA, ARENA_BATTLE_COST_STAMINA); 
        return { success: false, battleLog: log, message: "隊伍為空" };
    }

    const opponentEntry = ArenaManager.getArenaOpponent(initialGameStateForBattleChecks, playerOldRank, playerTeamPower);
    if (!opponentEntry || !opponentEntry.teamPreview || opponentEntry.teamPreview.length === 0) {
        const log = ["<span class='text-yellow-400'>未能找到合適的競技場對手，請稍後再試。</span>"];
        setGameState(prev => ({ ...prev, battleLog: log, isProcessingArenaAction: false }));
        addCurrencyFn(Currency.STAMINA, ARENA_BATTLE_COST_STAMINA);
        return { success: false, message: "未能找到對手", battleLog: log };
    }
    
    const opponentNpcDefinitionTeam = ArenaManager.constructEffectiveArenaNpcTeamForBattle(opponentEntry.teamPreview, opponentEntry.vipLevel);
    
    let arenaBattleHeaderLog: string[] = [];
    arenaBattleHeaderLog.push(`<span class='text-cyan-400 font-semibold'>遭遇競技場對手:</span>`);
    arenaBattleHeaderLog.push(`<span class='text-cyan-400'> • 姓名: ${opponentEntry.playerName}</span>`);
    arenaBattleHeaderLog.push(`<span class='text-cyan-400'> • ID: ${opponentEntry.playerId}</span>`);
    arenaBattleHeaderLog.push(`<span class='text-cyan-400'> • 排名: ${opponentEntry.rank}</span>`);
    arenaBattleHeaderLog.push(`<span class='text-cyan-400'> • 總戰力: ${opponentEntry.combatPower.toLocaleString()}</span>`);
    arenaBattleHeaderLog.push("<hr class='border-gray-600 my-1'>");


    let battleState: BattleState = initializeBattleState(playerTeam, opponentNpcDefinitionTeam, initialGameStateForBattleChecks);
    // Prepend the header log to the battle state's log
    battleState.battleLog = [...arenaBattleHeaderLog, ...battleState.battleLog];
    let finalBattleLog = [...battleState.battleLog]; 


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
                skillToUse = ({ ...(defaultSkillData as Omit<BaseSkill, 'id'>), id: 'defaultAttack', currentLevel: 1 } as OwnedSkill);
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
             battleState = processTurn(battleState, actor.battleId, actor.skills[0].id, undefined); // Skill ID doesn't matter if stunned, but need to process turn
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
    
    const playerWinsBattle = battleState.winner === 'player';
    finalBattleLog.push(playerWinsBattle ? "\n<span class='text-2xl text-green-300'>🎉 === 競技勝利! === 🎉</span>" : "\n<span class='text-2xl text-red-300'>☠️ === 競技失敗... === ☠️</span>");
    
    let outcomeForDisplay: { success: boolean; rewards?: Partial<Record<Currency, number>>; battleLog: string[], rankChange?: number, message?: string } = 
        { success: playerWinsBattle, battleLog: finalBattleLog, rankChange: 0, rewards: {} };

    setGameState(prev => {
        let newState = { ...prev };
        newState.dailyArenaAttempts = Math.max(0, prev.dailyArenaAttempts - 1);

        const arenaProcessingResult = ArenaManager.processArenaBattleOutcome(
            newState, playerWinsBattle, playerOldRank, opponentEntry.rank, opponentEntry.playerId
        );
        newState = arenaProcessingResult.newState;

        if (arenaProcessingResult.mailForTralaleroHero) {
            const addCharResult = CharacterManager.addCharacterLogic(newState, 'c_tralala', 0, BASE_CHARACTERS, []);
            newState = addCharResult.newState; // Update state with character added
            const mailData = arenaProcessingResult.mailForTralaleroHero;
            setTimeout(() => sendSystemMailFn(mailData), 0); 
        }
        
        outcomeForDisplay = { // Update the outer scope variable for return
            ...outcomeForDisplay,
            rewards: arenaProcessingResult.rewardsForDisplay,
            rankChange: arenaProcessingResult.rankChangeForDisplay,
            message: arenaProcessingResult.messageForDisplay,
        };

        const updatedTaskProgress = TaskManager.updateBattleTasks(newState.taskProgress, false, playerWinsBattle ? 'arena' : undefined);
        newState.battleLog = finalBattleLog;
        newState.taskProgress = updatedTaskProgress;
        // isProcessingArenaAction is set to false by finishArenaAction via BattleScreen UI
        return newState;
    });

    return outcomeForDisplay;
};
