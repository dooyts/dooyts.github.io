
import { GameState, Stage, OwnedCharacter, Character, Currency, ElementType, BaseSkill, Dungeon, OwnedEquipmentItem, OwnedSkill, BaseEquipmentItem, CharacterRarity, DungeonRewardTier } from '../../types';
import { ELEMENT_ADVANTAGE as ELEMENT_ADVANTAGE_MAP } from '../../constants/gameplayConstants';
import { BASE_CHARACTERS as ALL_BASE_CHARACTERS, BASE_SKILLS_DATA, REGULAR_CHARACTERS } from '../../constants/characterConstants';
import { BASE_EQUIPMENT_ITEMS } from '../../constants/equipmentConstants';
import { uuidv4 } from './utils';

// --- Battle Simulation & Stage Management ---
export const isStageCompleted = (gameState: GameState, stageId: string): boolean => {
    return gameState.completedStages.includes(stageId);
};

export const getNextStage = (gameState: GameState, gameStages: Stage[]): Stage | null => {
    for (const stage of gameStages) {
        if (!gameState.completedStages.includes(stage.id)) {
            return stage;
        }
    }
    return null;
};

interface BattleSimulationResult {
    success: boolean;
    battleLog: string[];
    totalPlayerDamageDealt: number;
}

export const simulateBattle = (
    playerTeam: OwnedCharacter[],
    enemyTeamCharacters: Character[],
    battleName: string,
    recommendedPower: number,
    calculateCharPowerFn: (char: OwnedCharacter) => number,
    elementAdvantage: Record<ElementType, ElementType>,
    baseSkillsData: Record<string, Omit<BaseSkill, 'id'>>
): BattleSimulationResult => {
    const teamPower = playerTeam.reduce((sum, char) => sum + calculateCharPowerFn(char), 0);
    let currentBattleLog: string[] = [`<span class="text-gray-400">=== ${battleName} - 戰鬥開始 ===</span>`, `<span class="text-gray-400">我方戰力: ${teamPower.toLocaleString()}, 推薦戰力: ${recommendedPower.toLocaleString()}</span>`];
    let totalPlayerDamageDealt = 0;

    const getEffectiveStatsAndSkills = (char: Character | OwnedCharacter, isPlayer: boolean, charSkillsOverride?: OwnedSkill[]): any => {
        const base = char as Character;
        const levelFactor = 1 + ((base.level || 1) -1) * 0.1;
        const starFactor = 1 + ((base.stars || 1) -1) * 0.15;
        
        let charAtk = (base as any).baseAtk * levelFactor * starFactor;
        let charHp = (base as any).baseHp * levelFactor * starFactor;
        let charDef = (base as any).baseDef * levelFactor * starFactor;
        
        if (!isPlayer) { // Buff NPCs slightly more for challenge
            charHp *= 1.8; 
            charAtk *= 1.3; 
            charDef *= 1.1; 
        }

        let skillsToUse: { name: string; damageMultiplier?: number; upgradeEffect?: BaseSkill['upgradeEffect']; currentLevel?: number, emoji?: string }[] = [];

        if (isPlayer && (char as OwnedCharacter).skills) {
            const ownedPlayer = char as OwnedCharacter;
            skillsToUse = ownedPlayer.skills.map(s => ({
                name: s.name,
                damageMultiplier: s.damageMultiplier,
                upgradeEffect: baseSkillsData[s.id]?.upgradeEffect,
                currentLevel: s.currentLevel,
                emoji: s.emoji
            }));
        } else { 
            const enemyChar = char as Character;
            if (enemyChar.skills && enemyChar.skills.length > 0) {
                 skillsToUse = enemyChar.skills.map(s => ({
                    name: s.name,
                    damageMultiplier: s.damageMultiplier,
                    upgradeEffect: baseSkillsData[s.id]?.upgradeEffect, 
                    currentLevel: 1, 
                    emoji: s.emoji
                }));
            }
        }
        if(skillsToUse.length === 0){
             skillsToUse.push({ name: "普通攻擊", damageMultiplier: 1.0, emoji: baseSkillsData.defaultAttack?.emoji || '⚔️' });
        }

        return {
            id: base.id, name: base.name,
            hp: Math.max(100, Math.floor(charHp)), atk: Math.max(10,Math.floor(charAtk)), def: Math.max(5, Math.floor(charDef)),
            spd: base.baseSpd, element: base.element, sprite: base.spriteEmoji,
            skills: skillsToUse, isPlayer,
        };
    };

    let livePlayerTeam = playerTeam.map(char => ({ ...getEffectiveStatsAndSkills(char, true, char.skills), currentHp: getEffectiveStatsAndSkills(char, true, char.skills).hp, team: 'player' as 'player' }));
    let liveEnemyTeam = enemyTeamCharacters.map(char => ({ ...getEffectiveStatsAndSkills(char, false), currentHp: getEffectiveStatsAndSkills(char, false).hp, team: 'enemy' as 'enemy'}));

    let turnOrder = [...livePlayerTeam, ...liveEnemyTeam].sort((a, b) => b.spd - a.spd);
    let turn = 0;
    const MAX_TURNS = 30;

    while (livePlayerTeam.some(p => p.currentHp > 0) && liveEnemyTeam.some(e => e.currentHp > 0) && turn < MAX_TURNS) {
        turn++;
        currentBattleLog.push(`\n<span class="text-purple-400">--- 第 ${turn} 回合 ---</span>`);

        for (const attacker of turnOrder) {
            if (attacker.currentHp <= 0) continue;

            const targetTeamLive = attacker.team === 'player' ? liveEnemyTeam.filter(t => t.currentHp > 0) : livePlayerTeam.filter(t => t.currentHp > 0);
            if (targetTeamLive.length === 0) break;

            const defender = targetTeamLive[Math.floor(Math.random() * targetTeamLive.length)];
            
            const skillToUse = attacker.skills[Math.floor(Math.random() * attacker.skills.length)]; 
            let damageMultiplier = skillToUse.damageMultiplier || 1.0; 
            
            if (skillToUse.upgradeEffect && skillToUse.currentLevel) {
                const effectAtLevel = skillToUse.upgradeEffect(skillToUse.currentLevel);
                if (effectAtLevel.damageMultiplier) damageMultiplier = effectAtLevel.damageMultiplier;
            }

            let damage = Math.max(5, (attacker.atk * damageMultiplier) - defender.def * 0.5);
            
            const attackerNameDisplay = `<span class="${attacker.isPlayer ? 'battle-log-player' : 'battle-log-enemy'}">${attacker.sprite} ${attacker.name}</span>`;
            const defenderNameDisplay = `<span class="${defender.isPlayer ? 'battle-log-player' : 'battle-log-enemy'}">${defender.sprite} ${defender.name}</span>`;
            let attackMessage = `${attackerNameDisplay} (${attacker.element}) 使用 ${skillToUse.emoji || '⚔️'}${skillToUse.name} 攻擊 ${defenderNameDisplay} (${defender.element}). `;

            if (elementAdvantage[attacker.element] === defender.element) {
                damage *= 1.3;
                attackMessage += `<span class="battle-log-buff">屬性克制!</span> `;
            } else if (elementAdvantage[defender.element] === attacker.element) {
                damage *= 0.8;
                attackMessage += `<span class="battle-log-debuff">屬性被克制!</span> `;
            }
            damage = Math.floor(damage);

            if (attacker.isPlayer) {
                totalPlayerDamageDealt += damage;
            }

            defender.currentHp -= damage;
            attackMessage += `造成 <span class="battle-log-damage">${damage.toLocaleString()}</span> 傷害.`;
            currentBattleLog.push(attackMessage);

            if (defender.currentHp <= 0) {
                const defenderFallenNameDisplay = `<span class="${defender.isPlayer ? 'battle-log-player' : 'battle-log-enemy'}">${defender.sprite} ${defender.name}</span>`;
                currentBattleLog.push(`${defenderFallenNameDisplay} <span class="battle-log-system">倒下了!</span>`);
            }
            if (!livePlayerTeam.some(p => p.currentHp > 0) || !liveEnemyTeam.some(e => e.currentHp > 0)) break;
        }
        turnOrder = turnOrder.filter(unit => unit.currentHp > 0);
    }

    const success = livePlayerTeam.some(p => p.currentHp > 0) && !liveEnemyTeam.some(e => e.currentHp > 0);
    currentBattleLog.push(success ? "\n<span class='text-2xl text-green-300'>🎉 === 戰鬥勝利! === 🎉</span>" : "\n<span class='text-2xl text-red-300'>☠️ === 戰鬥失敗... === ☠️</span>");
    if (turn >= MAX_TURNS && success) currentBattleLog.push("<span class='text-yellow-500'>(達到最大回合數，判定勝利)</span>");
    else if (turn >= MAX_TURNS && !success) currentBattleLog.push("<span class='text-yellow-500'>(達到最大回合數，判定失敗)</span>");
    
    return { success, battleLog: currentBattleLog, totalPlayerDamageDealt };
};

export const processStageWin = (
    currentState: GameState,
    stageId: string,
    gameStages: Stage[],
    baseEquipmentItems: BaseEquipmentItem[]
): { newState: GameState, rewardsForDisplay: Partial<Record<Currency, number>>, equipmentDrops: OwnedEquipmentItem[] } => {
    let newState = { ...currentState };
    const stage = gameStages.find(s => s.id === stageId);
    if (!stage) return { newState, rewardsForDisplay: {}, equipmentDrops: [] };

    let newResources = { ...newState.resources };
    let rewardsForDisplay: Partial<Record<Currency, number>> = {};
    let equipmentDrops: OwnedEquipmentItem[] = [];

    if (stage.rewards) {
        Object.entries(stage.rewards).forEach(([key, value]) => {
            if (key === 'firstClearDiamonds') {
                if (!newState.completedStages.includes(stageId)) {
                    newResources[Currency.DIAMONDS] = (newResources[Currency.DIAMONDS] || 0) + (value as number);
                    rewardsForDisplay[`${Currency.DIAMONDS} (首通)` as any] = (value as number); 
                }
            } else if (key === 'equipmentDropIds' && Array.isArray(value)) {
                (value as string[]).forEach(eqId => {
                    const baseItem = baseEquipmentItems.find(item => item.id === eqId);
                    if (baseItem) {
                        equipmentDrops.push({ ...baseItem, uniqueId: uuidv4(), enhancementLevel: 0 });
                    }
                });
            } else if (key !== 'petDropIds' && key !== 'runeDropIds' && newResources[key as Currency] !== undefined) {
                newResources[key as Currency] = (newResources[key as Currency] || 0) + (value as number);
                rewardsForDisplay[key as Currency] = (rewardsForDisplay[key as Currency] || 0) + (value as number);
            }
        });
    }

    let newCompletedStages = newState.completedStages;
    if (!newState.completedStages.includes(stageId)) {
        newCompletedStages = [...newState.completedStages, stageId];
    }

    let newChapter = newState.currentChapter;
    let newLevelInChapter = newState.currentLevelInChapter;
    const currentStageIndex = gameStages.findIndex(s => s.id === stageId);
    if (currentStageIndex !== -1 && currentStageIndex + 1 < gameStages.length) {
        const nextStageDetails = gameStages[currentStageIndex + 1];
        newChapter = nextStageDetails.chapter;
        newLevelInChapter = nextStageDetails.levelInChapter;
    }
    
    newState = {
        ...newState,
        resources: newResources,
        completedStages: newCompletedStages,
        currentChapter: newChapter,
        currentLevelInChapter: newLevelInChapter,
    };
    return { newState, rewardsForDisplay, equipmentDrops };
};

export const processDungeonOutcome = (
    currentState: GameState,
    dungeon: Dungeon,
    totalPlayerDamageDealt: number,
    _addCurrencyFn_placeholder: (currency: Currency, amount: number) => void, 
    _addEquipmentFn_placeholder: (itemId: string, source: string) => OwnedEquipmentItem | null 
): { newState: GameState, rewardsForDisplay: Partial<Record<Currency, number>>, equipmentDrops: OwnedEquipmentItem[] } => {
    let rewardsForDisplay: Partial<Record<Currency, number>> = {};
    let equipmentDrops: OwnedEquipmentItem[] = [];

    if (dungeon.baseRewards) {
        Object.entries(dungeon.baseRewards).forEach(([key, value]) => {
            if (key === 'equipmentDropIds' && Array.isArray(value)) {
                 (value as string[]).forEach(eqId => {
                    const baseItem = BASE_EQUIPMENT_ITEMS.find(item => item.id === eqId);
                    if (baseItem) {
                        equipmentDrops.push({ ...baseItem, uniqueId: uuidv4(), enhancementLevel: 0 });
                    }
                 });
            } else if (key !== 'petDropIds' && key !== 'runeDropIds' && Object.values(Currency).includes(key as Currency)) {
                rewardsForDisplay[key as Currency] = (rewardsForDisplay[key as Currency] || 0) + (value as number);
            }
        });
    }

    if (dungeon.isDamageBasedReward && dungeon.rewardTiers) {
        let achievedTier: DungeonRewardTier | undefined = undefined;
        for (const tier of [...dungeon.rewardTiers].sort((a,b) => b.damageThreshold - a.damageThreshold)) {
            if (totalPlayerDamageDealt >= tier.damageThreshold) {
                achievedTier = tier;
                break; 
            }
        }
        if (achievedTier) {
            Object.entries(achievedTier.rewards).forEach(([key, value]) => {
                if (key === 'equipmentDropIds' && Array.isArray(value)) {
                    (value as string[]).forEach(eqId => {
                        const baseItem = BASE_EQUIPMENT_ITEMS.find(item => item.id === eqId);
                        if (baseItem) {
                            if (!equipmentDrops.some(ed => ed.id === baseItem.id)) { 
                                equipmentDrops.push({ ...baseItem, uniqueId: uuidv4(), enhancementLevel: 0 }); 
                            }
                        }
                     });
                } else if (key !== 'petDropIds' && key !== 'runeDropIds' && Object.values(Currency).includes(key as Currency)) {
                    rewardsForDisplay[key as Currency] = (rewardsForDisplay[key as Currency] || 0) + (value as number);
                }
            });
        }
    }
    return { newState: currentState, rewardsForDisplay, equipmentDrops }; 
};


export const completeStageLogic = (
    prev: GameState,
    stageId: string,
    fromBattle: boolean,
    gameStages: Stage[],
    baseEquipmentItems: BaseEquipmentItem[],
    addEquipmentItemFn: (baseItemId: string, source?: string) => OwnedEquipmentItem | null
): GameState => {
    if (prev.completedStages.includes(stageId) && fromBattle) { 
        // Already completed
    }

    const stage = gameStages.find(s => s.id === stageId);
    if (!stage) return prev;

    let newCompletedStages = prev.completedStages;
    if (!prev.completedStages.includes(stageId)) {
        newCompletedStages = [...prev.completedStages, stageId];
    }
    
    let newChapter = prev.currentChapter;
    let newLevelInChapter = prev.currentLevelInChapter;
    const currentStageIndex = gameStages.findIndex(s => s.id === stageId);
    if (currentStageIndex !== -1 && currentStageIndex + 1 < gameStages.length) {
        const nextStageDetails = gameStages[currentStageIndex + 1];
        newChapter = nextStageDetails.chapter;
        newLevelInChapter = nextStageDetails.levelInChapter;
    }
    
    return {
        ...prev,
        completedStages: newCompletedStages,
        currentChapter: newChapter,
        currentLevelInChapter: newLevelInChapter,
        taskProgress: { ...prev.taskProgress, stagesCleared: (prev.taskProgress.stagesCleared || 0) + (fromBattle ? 1 : 0) },
    };
};

export const generateEndlessTowerEnemies = (floor: number, baseCharacters: Character[]): Character[] => {
    const numEnemies = Math.min(5, Math.floor(floor / 10) + 1);
    const enemies: Character[] = [];
    // Use REGULAR_CHARACTERS to exclude hidden heroes
    const availableBaseChars = REGULAR_CHARACTERS.length > 0 ? REGULAR_CHARACTERS.filter(c => c.rarity !== CharacterRarity.N) : ALL_BASE_CHARACTERS.filter(c => c.rarity !== CharacterRarity.N);


    if (availableBaseChars.length === 0) {
        const fallbackCharPool = REGULAR_CHARACTERS.length > 0 ? REGULAR_CHARACTERS : ALL_BASE_CHARACTERS;
        const fallbackChar = fallbackCharPool.length > 0 ? fallbackCharPool[0] : ({ id: 'fallback', name: 'Fallback Enemy', baseHp: 100, baseAtk: 10, baseDef: 10, baseSpd: 10, rarity: CharacterRarity.N, element: ElementType.FIRE, critRate: 0, critDmg: 0, accuracy: 0, evasion: 0, spriteEmoji: '❓', skills: [] } as Character);
        availableBaseChars.push(fallbackChar);
    }

    for (let i = 0; i < numEnemies; i++) {
        const baseCharTemplate = availableBaseChars[Math.floor(Math.random() * availableBaseChars.length)];
        const enemyLevel = Math.max(1, floor * 2 + Math.floor(Math.random() * 5));
        const enemyStars = Math.min(7, Math.floor(floor / 5) + 1 + Math.floor(Math.random() * 2));
        const statScaleFactor = 1 + (floor / 50); 

        enemies.push({
            ...baseCharTemplate,
            id: `${baseCharTemplate.id}_et_f${floor}_e${i}`, 
            name: `${baseCharTemplate.name} (塔衛 ${floor}-${i+1})`,
            level: enemyLevel,
            stars: enemyStars,
            baseHp: Math.floor(baseCharTemplate.baseHp * statScaleFactor),
            baseAtk: Math.floor(baseCharTemplate.baseAtk * statScaleFactor),
            baseDef: Math.floor(baseCharTemplate.baseDef * statScaleFactor),
        });
    }
    return enemies;
};
