
import React from 'react';
import { GameState, Stage, Currency, OwnedCharacter, OwnedEquipmentItem, Mail, OwnedSkill, StatusEffectType, BaseSkill } from '../../types';
import * as BattleManagerUtils from '../../lib/game-logic/battleManager'; // Renamed to avoid conflict
import * as TaskManager from '../../lib/game-logic/taskManager';
import * as EventManager from '../../lib/game-logic/eventManager';
import { initializeBattleState, processTurn, BattleState, BattleParticipant } from '../../lib/game-logic/battleSimulator'; // Import new simulator
import {
    GAME_STAGES, BATTLE_COST_STAMINA, ELEMENT_ADVANTAGE, MAX_TURNS_WORLD_BOSS_FIGHT // Using MAX_TURNS_WORLD_BOSS_FIGHT as general max turns
} from '../../constants/gameplayConstants';
import { BASE_SKILLS_DATA, BASE_CHARACTERS } from '../../constants/characterConstants';
import { BASE_EQUIPMENT_ITEMS } from '../../constants/equipmentConstants';
import { TRIGGERED_OFFERS_TEMPLATES } from '../../constants/shopConstants';
import { uuidv4 } from '../../lib/game-logic/utils';
import * as CharacterManager from '../../lib/game-logic/characterManager'; // For Bombardiro


// Typedefs for functions passed from GameContext
type GetBattleTeamFn = () => OwnedCharacter[];
type CalculateCharacterPowerFn = (character: OwnedCharacter) => number; // Keep for display/recommendation
type SpendCurrencyFn = (currency: Currency, amount: number) => boolean;
type AddCurrencyFn = (currency: Currency, amount: number) => void;
type AddEquipmentItemFn = (baseItemId: string, source?: string) => OwnedEquipmentItem | null;
type TriggerOfferByIdFn = (templateIndex: number, dynamicData?: any) => void;
type GetCurrentGameStateFn = () => GameState;
type SendSystemMailFn = (mailData: Omit<Mail, 'id' | 'timestamp' | 'isRead' | 'claimed'>) => void;
type AddCharacterFn = (characterId: string, shards?: number) => OwnedCharacter | null;


export const completeStageCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    triggerOfferByIdFn: TriggerOfferByIdFn,
    addEquipmentItemFn: AddEquipmentItemFn 
) => (stageId: string, fromBattle: boolean = true) => {
    let offerToTriggerOnComplete: { templateIndex: number; dynamicData?: any } | null = null;
    setGameState(prev => {
        const currentLevel = EventManager.getPlayerLevelForProgress(prev, GAME_STAGES);
        // processStageWin is now primarily for giving rewards and advancing stage progress in GameState
        // The actual battle simulation happens elsewhere.
        const result = BattleManagerUtils.completeStageLogic(prev, stageId, fromBattle, GAME_STAGES, BASE_EQUIPMENT_ITEMS, addEquipmentItemFn);
        const newLevel = EventManager.getPlayerLevelForProgress(result, GAME_STAGES);

        if (!prev.triggeredOffer && newLevel === 10 && currentLevel < 10) {
             offerToTriggerOnComplete = {templateIndex: TRIGGERED_OFFERS_TEMPLATES.findIndex(t => t.triggerCondition === 'level_10_player')};
        }
        return result;
    });
    if (offerToTriggerOnComplete && offerToTriggerOnComplete.templateIndex !== -1) {
        triggerOfferByIdFn(offerToTriggerOnComplete.templateIndex, offerToTriggerOnComplete.dynamicData);
    }
};

export const startBattleCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    getBattleTeamFn: GetBattleTeamFn,
    calculateCharPowerFn: CalculateCharacterPowerFn, // Still useful for initial checks or display
    spendCurrencyFn: SpendCurrencyFn,
    addCurrencyFn: AddCurrencyFn,
    triggerOfferByIdFn: TriggerOfferByIdFn,
    clearBattleLogFn: () => void,
    addEquipmentItemFn: AddEquipmentItemFn,
    getGameState: GetCurrentGameStateFn, // Added missing parameter
    sendSystemMailFn: SendSystemMailFn, // Added for Bombardiro
    addCharacterFnFromContext: AddCharacterFn // Added for Bombardiro
) => (stageId: string): { success: boolean; rewards?: Partial<Record<Currency, number>>; battleLog: string[] } => {
    clearBattleLogFn();
    
    const currentInitialGameState = getGameState(); // Get initial state for checks

    if (!spendCurrencyFn(Currency.STAMINA, BATTLE_COST_STAMINA)) {
        const log = ["<span class='text-red-400'>戰鬥失敗：體力不足。</span>"];
        setGameState(prev => ({ ...prev, battleLog: log }));
        return { success: false, battleLog: log };
    }

    const stage = GAME_STAGES.find(s => s.id === stageId);
    if (!stage) {
        const log = ["錯誤：找不到關卡資訊。"];
        setGameState(prev => ({ ...prev, battleLog: log }));
        addCurrencyFn(Currency.STAMINA, BATTLE_COST_STAMINA); 
        return { success: false, battleLog: log };
    }

    const playerTeamHeroes = getBattleTeamFn();
    if (playerTeamHeroes.length === 0) {
        const log = ["錯誤：戰鬥隊伍為空。"];
        setGameState(prev => ({ ...prev, battleLog: log }));
        addCurrencyFn(Currency.STAMINA, BATTLE_COST_STAMINA);
        return { success: false, battleLog: log };
    }

    let battleState: BattleState = initializeBattleState(playerTeamHeroes, stage.enemies, currentInitialGameState);
    let finalBattleLog = [...battleState.battleLog]; // Start with initialization logs

    // Main battle loop
    while (!battleState.isBattleOver && battleState.turnNumber < MAX_TURNS_WORLD_BOSS_FIGHT) {
        battleState.turnNumber++;
        const actor = battleState.turnOrder[battleState.currentActorIndex];

        if (actor.currentHp > 0 && !actor.statusEffects.some(eff => eff.type === StatusEffectType.UNABLE_TO_ACT)) {
            // AI / Player skill selection (Simplified for now)
            // Filter for available skills (not on cooldown)
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
            
            // Target selection (Simplified for now)
            let targetId: string | undefined = undefined;
            const skillDefFromData = BASE_SKILLS_DATA[skillToUse.id] || skillToUse; 
            const skillDef = { ...skillDefFromData, id: skillToUse.id } as BaseSkill; // Ensure id is present
            
            if (skillDef.target?.startsWith('enemy')) {
                const potentialTargets = (actor.isPlayerTeam ? battleState.enemyTeam : battleState.playerTeam).filter(t => t.currentHp > 0);
                if (potentialTargets.length > 0) {
                    targetId = potentialTargets[Math.floor(Math.random() * potentialTargets.length)].battleId;
                }
            } else if (skillDef.target === 'ally_single_lowest_hp') {
                 const potentialAllies = (actor.isPlayerTeam ? battleState.playerTeam : battleState.enemyTeam).filter(t => t.currentHp > 0);
                 if (potentialAllies.length > 0) {
                    targetId = [...potentialAllies].sort((a,b) => (a.currentHp/a.battleStats.hp) - (b.currentHp/b.battleStats.hp))[0].battleId;
                 }
            } // Other targeting types like 'self' or 'ally_all' don't need a specific targetId passed this way.


            battleState = processTurn(battleState, actor.battleId, skillToUse.id, targetId);
        } else if (actor.currentHp > 0 && actor.statusEffects.some(eff => eff.type === StatusEffectType.UNABLE_TO_ACT)) {
            // Actor is stunned, skip turn but log it. processTurn already handles this log.
             battleState = processTurn(battleState, actor.battleId, actor.skills[0].id, undefined); // Call processTurn to handle status ticks/log
        }


        finalBattleLog.push(...battleState.battleLog.slice(finalBattleLog.length)); // Append new logs
        
        battleState.currentActorIndex = (battleState.currentActorIndex + 1) % battleState.turnOrder.length;
        // Filter out defeated participants from turn order for next round (or handle in processTurn itself)
        battleState.turnOrder = battleState.turnOrder.filter(p => p.currentHp > 0);
        if(battleState.turnOrder.length === 0 && !battleState.isBattleOver){ // Should not happen if isBattleOver is set correctly
             battleState.isBattleOver = true;
             battleState.winner = battleState.playerTeam.some(p=>p.currentHp > 0) ? 'player' : 'enemy'; // Double check winner
        } else if (battleState.turnOrder.length > 0){
             battleState.currentActorIndex = battleState.currentActorIndex % battleState.turnOrder.length;
        }


    }

    if (!battleState.isBattleOver && battleState.turnNumber >= MAX_TURNS_WORLD_BOSS_FIGHT) {
        finalBattleLog.push("<span class='text-yellow-500'>(達到最大回合數)</span>");
        // Determine winner by remaining HP percentage or other tie-breaking rules
        const playerHpPercent = battleState.playerTeam.reduce((sum, p) => sum + p.currentHp, 0) / battleState.playerTeam.reduce((sum, p) => sum + p.battleStats.hp, 1);
        const enemyHpPercent = battleState.enemyTeam.reduce((sum, p) => sum + p.currentHp, 0) / battleState.enemyTeam.reduce((sum, p) => sum + p.battleStats.hp, 1);
        battleState.winner = playerHpPercent >= enemyHpPercent ? 'player' : 'enemy';
        battleState.isBattleOver = true;
    }

    finalBattleLog.push(battleState.winner === 'player' ? "\n<span class='text-2xl text-green-300'>🎉 === 戰鬥勝利! === 🎉</span>" : "\n<span class='text-2xl text-red-300'>☠️ === 戰鬥失敗... === ☠️</span>");

    let rewardsForDisplay: Partial<Record<Currency, number>> = {};
    let equipmentDrops: OwnedEquipmentItem[] = [];

    setGameState(prev => {
        let newStateAfterBattle = { ...prev, battleLog: finalBattleLog, taskProgress: TaskManager.updateBattleTasks(prev.taskProgress, true) };
        
        if (battleState.winner === 'player') {
            const stageWinResult = BattleManagerUtils.processStageWin(newStateAfterBattle, stageId, GAME_STAGES, BASE_EQUIPMENT_ITEMS);
            newStateAfterBattle = stageWinResult.newState; // This updates resources and completedStages
            rewardsForDisplay = stageWinResult.rewardsForDisplay;
            equipmentDrops = stageWinResult.equipmentDrops;
            
            equipmentDrops.forEach(eqDrop => {
                 if (!newStateAfterBattle.ownedEquipment.find(oe => oe.uniqueId === eqDrop.uniqueId)) { 
                    newStateAfterBattle.ownedEquipment = [...newStateAfterBattle.ownedEquipment, eqDrop];
                 }
            });

            const levelBefore = EventManager.getPlayerLevelForProgress(prev, GAME_STAGES);
            const levelAfter = EventManager.getPlayerLevelForProgress(newStateAfterBattle, GAME_STAGES);
            if (!prev.triggeredOffer && levelAfter === 10 && levelBefore < 10) {
                 setTimeout(() => triggerOfferByIdFn(TRIGGERED_OFFERS_TEMPLATES.findIndex(t => t.triggerCondition === 'level_10_player')), 0);
            }

            // Bombardiro Crocodilo acquisition
            const allStagesNowCompleted = newStateAfterBattle.completedStages.length === GAME_STAGES.length;
            const wasBombardiroAlreadyClaimedInPrevState = prev.claimedBombardiroHero;

            if (allStagesNowCompleted && !wasBombardiroAlreadyClaimedInPrevState) {
                const bombardiro = addCharacterFnFromContext('c_bombardiro'); 
                if (bombardiro) { 
                     newStateAfterBattle.claimedBombardiroHero = true;
                     // Mail is sent by addCharacterFnFromContext's underlying logic via GameContext
                }
            }
        }
        return newStateAfterBattle;
    });
    
    let displayModalRewards = { ...rewardsForDisplay };
    equipmentDrops.forEach(eq => {
        const key = `${eq.name} (${eq.rarity})` as any; // Using 'as any' for dynamic key, consider a safer type
        displayModalRewards[key] = (displayModalRewards[key] || 0) + 1;
    });

    return { success: battleState.winner === 'player', rewards: displayModalRewards, battleLog: finalBattleLog };
};

export const isStageCompletedCallback = (
    getGameState: GetCurrentGameStateFn
) => (stageId: string): boolean => {
    return BattleManagerUtils.isStageCompleted(getGameState(), stageId);
};

export const getNextStageCallback = (
    getGameState: GetCurrentGameStateFn
) => (): Stage | null => {
    return BattleManagerUtils.getNextStage(getGameState(), GAME_STAGES);
};
