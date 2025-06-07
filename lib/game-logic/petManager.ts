
import { GameState, OwnedPet, BasePet, Currency, CharacterRarity, OwnedCharacter } from '../../types';
import { uuidv4 } from './utils';
import { MAX_PET_LEVEL, PET_ENHANCEMENT_COST } from '../../constants/petConstants'; // Import MAX_PET_LEVEL

interface AddPetResult {
    newState: GameState;
    pet: OwnedPet | null;
}

export const addPetLogic = (
    prev: GameState,
    basePetId: string,
    source: string = "Unknown",
    basePets: BasePet[]
): AddPetResult => {
    const basePet = basePets.find(p => p.id === basePetId);
    if (!basePet) return { newState: prev, pet: null };

    const newOwnedPet: OwnedPet = {
        ...basePet,
        uniqueId: uuidv4(),
        level: 1, // Pets start at level 1
    };

    const newState: GameState = {
        ...prev,
        ownedPets: [...prev.ownedPets, newOwnedPet],
    };

    return { newState, pet: newOwnedPet };
};

export const assignPetLogic = (
    prev: GameState,
    characterId: string,
    petUniqueId: string | null
): GameState => {
    const charIndex = prev.characters.findIndex(c => c.id === characterId);
    if (charIndex === -1) return prev;

    if (petUniqueId && !prev.ownedPets.some(p => p.uniqueId === petUniqueId)) {
        console.warn(`Attempted to assign non-existent pet: ${petUniqueId} to character ${characterId}`);
        return prev;
    }

    const updatedCharacters = prev.characters.map((char, index) => {
        if (index === charIndex) {
            return { ...char, assignedPetId: petUniqueId };
        }
        // If this pet was assigned to another hero, unassign it from them
        if (char.assignedPetId === petUniqueId && char.id !== characterId) {
            return { ...char, assignedPetId: null };
        }
        return char;
    });

    return {
        ...prev,
        characters: updatedCharacters,
    };
};

export const getOwnedPetByUniqueId = (
    gameState: GameState,
    uniqueId: string
): OwnedPet | undefined => {
    return gameState.ownedPets.find(p => p.uniqueId === uniqueId);
};

export const enhancePetLogic = (
    prev: GameState,
    petUniqueId: string,
    enhancementCostFn: (level: number, rarity: CharacterRarity) => Partial<Record<Currency, number>>,
    maxPetLevelConst: number,
    canAffordCheck: (currency: Currency, amount: number) => boolean
): GameState => {
    const petIndex = prev.ownedPets.findIndex(p => p.uniqueId === petUniqueId);
    if (petIndex === -1) return prev;

    const pet = prev.ownedPets[petIndex];
    if (pet.level >= maxPetLevelConst) return prev;

    const costs = enhancementCostFn(pet.level + 1, pet.rarity);
    for (const currency in costs) {
        if (!canAffordCheck(currency as Currency, costs[currency as Currency]!)) {
            return prev;
        }
    }

    const updatedPets = [...prev.ownedPets];
    updatedPets[petIndex] = { ...pet, level: pet.level + 1 };

    let newResources = { ...prev.resources };
    for (const currency in costs) {
        newResources[currency as Currency]! -= costs[currency as Currency]!;
    }
    
    const newTaskProgress = {
        ...prev.taskProgress,
        petsEnhanced: (prev.taskProgress.petsEnhanced || 0) + 1,
    };

    return { ...prev, ownedPets: updatedPets, resources: newResources, taskProgress: newTaskProgress };
};

export const canEnhancePet = (
    pet: OwnedPet,
    resources: GameState['resources'], // Pass resources directly
    enhancementCostFn: (level: number, rarity: CharacterRarity) => Partial<Record<Currency, number>>,
    maxPetLevelConst: number,
    canAffordFn: (currency: Currency, amount: number, currentResources: GameState['resources']) => boolean
): boolean => {
    if (!pet || pet.level >= maxPetLevelConst) return false;

    const costs = enhancementCostFn(pet.level + 1, pet.rarity);
    return Object.entries(costs).every(([curr, amount]) => canAffordFn(curr as Currency, amount as number, resources));
};


// This function checks if ANY hero has a pet that can be enhanced, or if there's an unassigned pet and an empty hero slot.
// For HeroDetailPanel, a more specific check using `canEnhancePet` for the current hero's pet is better.
export const checkGlobalPetRedDot = (
    gameState: GameState,
    enhancementCostFn: (level: number, rarity: CharacterRarity) => Partial<Record<Currency, number>>,
    maxPetLevelConst: number,
    canAffordFn: (currency: Currency, amount: number, currentResources: GameState['resources']) => boolean // Ensure this canAffordFn takes resources
): boolean => {
    // Check if any hero's assigned pet can be enhanced
    for (const char of gameState.characters) {
        if (char.assignedPetId) {
            const pet = gameState.ownedPets.find(p => p.uniqueId === char.assignedPetId);
            if (pet && canEnhancePet(pet, gameState.resources, enhancementCostFn, maxPetLevelConst, canAffordFn)) {
                return true;
            }
        }
    }
    // Check if any hero has an empty pet slot and there's an available unassigned pet
    const hasUnassignedPets = gameState.ownedPets.some(p => !gameState.characters.some(c => c.assignedPetId === p.uniqueId));
    if (hasUnassignedPets) {
        if (gameState.characters.some(char => char.assignedPetId === null)) {
            return true;
        }
    }
    return false;
};