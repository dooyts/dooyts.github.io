
import React from 'react';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import { ArenaLeaderboardEntry, CharacterRarity, ElementType } from '../../types';
import { RARITY_COLORS, ELEMENT_COLORS } from '../../constants/uiConstants';
import { BASE_CHARACTERS } from '../../constants/characterConstants';

interface ArenaTeamViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    entry: ArenaLeaderboardEntry | null;
}

const ArenaTeamViewModal: React.FC<ArenaTeamViewModalProps> = ({ isOpen, onClose, entry }) => {
    if (!isOpen || !entry || !entry.teamPreview) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${entry.playerName} 的隊伍`} size="lg">
            <div className="p-2">
                <p className="text-center text-gray-300 mb-2">
                    戰力: {entry.combatPower.toLocaleString()} | 排名: {entry.rank}
                </p>
                {entry.teamPreview.length === 0 && <p className="text-center text-gray-400">該玩家隊伍資訊未公開。</p>}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {entry.teamPreview.map((hero, index) => {
                        const baseHero = BASE_CHARACTERS.find(bh => bh.id === hero.heroId);
                        const rarity = baseHero?.rarity || CharacterRarity.N;
                        const element = baseHero?.element || ElementType.WATER; 
                        return (
                            <div key={index} className={`p-3 rounded-lg shadow-md border-2 ${RARITY_COLORS[rarity]} bg-gray-700`}>
                                <div className="flex items-center space-x-2">
                                    <div className="w-12 h-12 rounded-md border border-gray-600 flex items-center justify-center text-3xl bg-gray-600">
                                        {hero.spriteEmoji}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className={`text-sm font-bold ${RARITY_COLORS[rarity]?.split(' ')[0]}`}>{hero.name}</h4>
                                        <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full text-white ${ELEMENT_COLORS[element]}`}>{element}</span>
                                        <p className="text-xs text-gray-400">等級: {hero.level} | 星級: {'★'.repeat(hero.stars)}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <Button onClick={onClose} variant="secondary" className="w-full mt-4">關閉</Button>
            </div>
        </Modal>
    );
};

export default ArenaTeamViewModal;
