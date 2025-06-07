
import React from 'react';
import { GameState, ShopItem, TriggeredOffer, Mail, OwnedCharacter, OwnedEquipmentItem, BasePet, VIPLevel, Currency } from '../../types';
import * as ShopManager from '../../lib/game-logic/shopManager';
import { VIP_LEVELS } from '../../constants/gameplayConstants';
import { BASE_PETS } from '../../constants/petConstants';
import { 
    SHOP_ITEMS_RESOURCES, TRIGGERED_OFFERS_TEMPLATES, TRIGGER_OFFER_EMOJIS, 
    SHOP_ITEMS_CURRENCY_STAMINA 
} from '../../constants/shopConstants';
import * as CharacterManager from '../../lib/game-logic/characterManager';
import { BASE_CHARACTERS } from '../../constants/characterConstants';
import * as EquipmentManager from '../../lib/game-logic/equipmentManager';
import { BASE_EQUIPMENT_ITEMS } from '../../constants/equipmentConstants';

type SendSystemMailFn = (mailData: Omit<Mail, 'id' | 'timestamp' | 'isRead' | 'claimed'>) => void;
type TriggerOfferByIdFnInternal = (templateIndex: number, dynamicData?: any) => void;

type AddCharacterInternalFn = (currentState: GameState, characterId: string, initialShards?: number) => { newState: GameState, character: OwnedCharacter | null, offerToTrigger?: { templateIndex: number; dynamicData?: any } };
type AddEquipmentInternalFn = (currentState: GameState, baseItemId: string, source?: string) => { newState: GameState, item: OwnedEquipmentItem | null };


export const purchaseShopItemCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    sendSystemMailFn: SendSystemMailFn,
    triggerOfferByIdFn: TriggerOfferByIdFnInternal
) => (item: ShopItem): boolean => {
    let wasSuccessful = false;
    setGameState(prev => {
        const internalAddCharacter: AddCharacterInternalFn = (gs, charId, shards) => {
            // Pass empty array for TRIGGERED_OFFERS_TEMPLATES here, as shop purchase itself might trigger offers
            // and we don't want addCharacter to re-trigger the same one based on new_ssr_hero condition
            // if the purchase was for diamonds and a new_ssr_hero offer is already pending from the purchase.
            const addResult = CharacterManager.addCharacterLogic(gs, charId, shards, BASE_CHARACTERS, []);
            return { newState: addResult.newState, character: addResult.character, offerToTrigger: addResult.offerToTrigger };
        };
        const internalAddEquipment: AddEquipmentInternalFn = (gs, itemId, source) => {
            return EquipmentManager.addEquipmentItemLogic(gs, itemId, source, BASE_EQUIPMENT_ITEMS);
        };

        const result = ShopManager.purchaseShopItemLogic(
            prev, item, BASE_PETS, VIP_LEVELS, SHOP_ITEMS_RESOURCES,
            SHOP_ITEMS_CURRENCY_STAMINA, 
            TRIGGERED_OFFERS_TEMPLATES, TRIGGER_OFFER_EMOJIS,
            internalAddCharacter, internalAddEquipment
        );
        wasSuccessful = result.success;
        
        let nextState = result.newState;

        // If addCharacterLogic (from purchasing a hero bundle) also wanted to trigger an offer
        // And the shop purchase itself didn't already set one, let the hero bundle offer through.
        // This assumes character bundle offers are distinct from the 'first diamond purchase' offer.
        // For example, if internalAddCharacter triggered an offer, and result.offerToTrigger is undefined
        // because the shop item itself was not a diamond purchase triggering a "first buy" offer.
        // The current internalAddCharacter in purchaseShopItemLogic is simplified, so this specific path might not be hit often.
        // However, to be safe, if purchaseShopItemLogic didn't trigger, and addCharacterLogic (via bundle) did, trigger it.
        // THIS PART IS TRICKY: CharacterManager.addCharacterLogic itself has offer triggering.
        // We need to ensure that if ShopManager.purchaseShopItemLogic already decided to trigger an offer (e.g., 'login_first_time'),
        // it takes precedence, or we handle potential conflicts.
        // Let's assume the offer from purchaseShopItemLogic takes precedence if both exist.

        if (result.offerToTrigger) {
            // Trigger the offer decided by ShopManager.purchaseShopItemLogic
            // but only if the state doesn't ALREADY have an active triggeredOffer from a previous async operation.
            if (!nextState.triggeredOffer) { // Check against potentially already updated state
                 setTimeout(() => triggerOfferByIdFn(result.offerToTrigger!.templateIndex, result.offerToTrigger!.dynamicData), 0);
            }
        }
        
        if (result.mailToSend) { // Mail for VIP level up can be sent regardless of offer
            setTimeout(() => sendSystemMailFn(result.mailToSend!), 0);
        }

        return nextState; // Return the state updated by ShopManager.purchaseShopItemLogic
    });
    return wasSuccessful;
};

export const triggerOfferByIdCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => (templateIndex: number, dynamicData?: any) => {
    setGameState(prev => ShopManager.triggerOfferByIdLogic(prev, templateIndex, dynamicData, TRIGGERED_OFFERS_TEMPLATES, TRIGGER_OFFER_EMOJIS));
};

export const clearTriggeredOfferCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => () => {
    setGameState(prev => ShopManager.clearTriggeredOfferLogic(prev));
};

export const purchaseTriggeredOfferCallback = (
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    sendSystemMailFn: SendSystemMailFn
) => (offerId: string) => {
    setGameState(prev => {
        const { newState, mailToSend } = ShopManager.purchaseTriggeredOfferLogic(prev, offerId, BASE_PETS, VIP_LEVELS);
        if (mailToSend && !newState.triggeredOffer) { // Check against potentially updated state
            setTimeout(() => sendSystemMailFn(mailToSend!), 0);
        }
        return newState;
    });
};
