
import React from 'react';
import { GachaPool, Currency, CharacterRarity, GachaPullableItem, GachaItemType, GachaResultItem } from '../../types';
import { useGame } from '../../contexts/GameContext';
import Button from '../../components/Button';
import {
    SINGLE_PULL_COST_DIAMONDS, SINGLE_PULL_COST_GACHA_TICKET,
    SINGLE_PULL_COST_DIAMONDS_EQUIPMENT, SINGLE_PULL_COST_EQUIPMENT_TICKET
} from '../../constants/gachaConstants';
import { BASE_CHARACTERS } from '../../constants/characterConstants';
import { BASE_EQUIPMENT_ITEMS } from '../../constants/equipmentConstants';
import { BASE_PETS } from '../../constants/petConstants';
import { BASE_RUNES } from '../../constants/runeConstants';
import { RARITY_COLORS, CURRENCY_EMOJIS, CURRENCY_NAMES } from '../../constants/uiConstants';


interface GachaModalContentProps {
  pool: GachaPool;
  onPull: (results: GachaPullableItem[]) => void;
}

const GachaModalContent: React.FC<GachaModalContentProps> = ({ pool, onPull }) => {
  const { gachaPull, canAfford, gameState } = useGame();

  const handlePull = (numPulls: 1 | 10) => {
    const results = gachaPull(pool.id, numPulls);
    if (results.length > 0) {
      onPull(results);
    } else {
      // Consider a more user-friendly notification system than alert
      // For now, let's assume the gachaPull logic or the UI elsewhere handles "insufficient funds" more gracefully.
      // If gachaPull itself can return an empty array due to insufficient funds without throwing/alerting,
      // then an alert here might be okay as a temporary measure.
      alert("貨幣或召喚券不足，或召喚失敗！");
    }
  };

  let cost1PullDisplay = "";
  let canAffordSingle = false;
  let singlePullCostCurrency: Currency | null = null;
  let singlePullCostAmount = 0;


  if (pool.pulls.includes(1)) {
    if (pool.isLuckyDraw && pool.singlePullCost) {
        singlePullCostCurrency = pool.singlePullCost.currency;
        singlePullCostAmount = pool.singlePullCost.amount;
        cost1PullDisplay = `${CURRENCY_EMOJIS[singlePullCostCurrency]}${singlePullCostAmount}`;
        canAffordSingle = canAfford(singlePullCostCurrency, singlePullCostAmount);
    } else if (pool.id.includes('character_') && pool.singlePullCost?.currency === Currency.GACHA_TICKET) {
        singlePullCostCurrency = Currency.GACHA_TICKET;
        singlePullCostAmount = SINGLE_PULL_COST_GACHA_TICKET;
        const diamondCost = SINGLE_PULL_COST_DIAMONDS;
        cost1PullDisplay = `${CURRENCY_EMOJIS[Currency.DIAMONDS]}${diamondCost} / ${CURRENCY_EMOJIS[singlePullCostCurrency]}${singlePullCostAmount}`;
        canAffordSingle = canAfford(singlePullCostCurrency, singlePullCostAmount) || canAfford(Currency.DIAMONDS, diamondCost);
    } else if (pool.id.includes('equipment_') && pool.singlePullCost?.currency === Currency.EQUIPMENT_TICKET) {
        singlePullCostCurrency = Currency.EQUIPMENT_TICKET;
        singlePullCostAmount = SINGLE_PULL_COST_EQUIPMENT_TICKET;
        const diamondCost = SINGLE_PULL_COST_DIAMONDS_EQUIPMENT;
        cost1PullDisplay = `${CURRENCY_EMOJIS[Currency.DIAMONDS]}${diamondCost} / ${CURRENCY_EMOJIS[singlePullCostCurrency]}${singlePullCostAmount}`;
        canAffordSingle = canAfford(singlePullCostCurrency, singlePullCostAmount) || canAfford(Currency.DIAMONDS, diamondCost);
    } else if (pool.singlePullCost) { // For other ticket-based pulls like pet/rune
        singlePullCostCurrency = pool.singlePullCost.currency;
        singlePullCostAmount = pool.singlePullCost.amount;
        cost1PullDisplay = `${CURRENCY_EMOJIS[singlePullCostCurrency]}${singlePullCostAmount}`;
        canAffordSingle = canAfford(singlePullCostCurrency, singlePullCostAmount);
    }
  }


  let cost10PullDisplay = "";
  let canAffordMulti = false;
  if (pool.pulls.includes(10) && !pool.isLuckyDraw) { // Lucky draw usually doesn't have 10-pulls
    cost10PullDisplay = `${CURRENCY_EMOJIS[pool.costCurrency]}${pool.costAmount}`;
    canAffordMulti = canAfford(pool.costCurrency, pool.costAmount);
  }

  const getItemDisplay = (item: { type: GachaItemType, id: string, rarity: CharacterRarity }) => {
    let details = { name: 'Unknown', emoji: '❓' };
    switch (item.type) {
        case 'character':
            const char = BASE_CHARACTERS.find(c => c.id === item.id);
            if (char) { details = { name: char.name, emoji: char.spriteEmoji }; }
            break;
        case 'equipment':
            const eq = BASE_EQUIPMENT_ITEMS.find(e => e.id === item.id);
            if (eq) { details = { name: eq.name, emoji: eq.emoji }; }
            break;
        case 'pet':
            const pet = BASE_PETS.find(p => p.id === item.id);
            if (pet) { details = { name: pet.name, emoji: pet.emoji }; }
            break;
        case 'rune':
            const rune = BASE_RUNES.find(r => r.id === item.id);
            if (rune) { details = { name: rune.name, emoji: rune.emoji }; }
            break;
        case 'resource': // For lucky draw
             // Type assertion for itemPool elements to satisfy TypeScript when accessing 'amount'
            const itemPoolEntry = pool.itemPool.find(i => {
                const castedPoolItem = i as GachaResultItem; // Assuming GachaResultItem is the correct type for lucky draw items
                const castedDisplayItem = item as GachaResultItem;
                return castedPoolItem.id === castedDisplayItem.id && castedPoolItem.amount === castedDisplayItem.amount && castedPoolItem.rarity === castedDisplayItem.rarity;
            }) as GachaResultItem | undefined;
            if (itemPoolEntry) {
                details = { name: itemPoolEntry.name, emoji: itemPoolEntry.emoji };
            }
            break;
    }
    return details;
  };


  return (
    <div className="p-4 text-white">
      <h3 className="text-xl font-bold text-yellow-300 mb-2 text-center">{pool.name}</h3>
      <div className="text-sm text-gray-300 mb-4 max-h-40 overflow-y-auto">
        <h4 className="font-semibold text-gray-100">獎池預覽 (部分):</h4>
        <ul className="list-disc list-inside pl-2 text-xs">
          {pool.itemPool.slice(0, 10).map((item, idx) => {
            // Type assertion for itemPool elements to satisfy TypeScript
            const displayableItem = item as { type: GachaItemType, id: string, rarity: CharacterRarity, name?:string, emoji?:string, amount?:number };
            const itemDetails = getItemDisplay(displayableItem);
            return (
              <li key={idx} className={`${RARITY_COLORS[item.rarity]?.split(' ')[0] || 'text-gray-400'}`}>
                {itemDetails.emoji} {displayableItem.name || itemDetails.name} ({item.rarity})
                {displayableItem.type === 'resource' && displayableItem.amount ? ` x${displayableItem.amount}` : ''}
              </li>
            );
          })}
           {pool.itemPool.length > 10 && <li>...等更多獎勵</li>}
        </ul>
      </div>

      {!pool.isLuckyDraw && pool.guarantees.hardPitySSR && (
        <p className="text-xs text-center mt-2 mb-3 text-gray-400">
            SSR/UR保底進度: {(gameState.gachaPity[pool.id]?.ssrCount || 0)}/{pool.guarantees.hardPitySSR}抽.
            {(gameState.gachaPity[pool.id]?.upGuaranteed) ? " 下次SSR/UR必為UP!" : ""}
        </p>
      )}


      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        {pool.pulls.includes(1) && (
          <Button
            onClick={() => handlePull(1)}
            disabled={!canAffordSingle}
            variant="primary"
            className="flex-1 py-3"
          >
            單次召喚 <span className="text-xs block">({cost1PullDisplay})</span>
          </Button>
        )}
        {pool.pulls.includes(10) && !pool.isLuckyDraw && (
          <Button
            onClick={() => handlePull(10)}
            disabled={!canAffordMulti}
            variant="special"
            className="flex-1 py-3"
          >
            十連召喚 <span className="text-xs block">({cost10PullDisplay})</span>
          </Button>
        )}
      </div>
       <p className="text-xs text-gray-500 mt-4 text-center">
        擁有: {singlePullCostCurrency && CURRENCY_EMOJIS[singlePullCostCurrency]} {singlePullCostCurrency ? gameState.resources[singlePullCostCurrency]?.toLocaleString() : ''}
        {pool.id.includes('character_') || pool.id.includes('equipment_') ? ` / ${CURRENCY_EMOJIS[Currency.DIAMONDS]} ${gameState.resources[Currency.DIAMONDS]?.toLocaleString()}` : ''}
       </p>
    </div>
  );
};

export default GachaModalContent;