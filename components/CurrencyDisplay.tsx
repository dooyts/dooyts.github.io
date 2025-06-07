
import React, { useState, useEffect } from 'react';
import { Currency } from '../types';
import { useGame } from '../contexts/GameContext';
import Button from './Button';
import { MILLISECONDS_PER_STAMINA_POINT } from '../constants/gameplayConstants';

interface CurrencyDisplayProps {
  currency: Currency;
  icon: string;
  showMax?: boolean; // For stamina
  onAddClick?: () => void;
}

const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({ currency, icon, showMax = false, onAddClick }) => {
  const { gameState } = useGame();
  const value = currency === Currency.STAMINA ? gameState.resources.currentStamina : gameState.resources[currency];
  const maxValue = currency === Currency.STAMINA ? gameState.resources.maxStamina : undefined;

  const [staminaRegenTimer, setStaminaRegenTimer] = useState<string>('');

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | undefined;
    if (currency === Currency.STAMINA && gameState.resources.currentStamina < gameState.resources.maxStamina) {
      const updateTimer = () => {
        const timeSinceLastUpdate = Date.now() - gameState.lastStaminaUpdateTime;
        const timeToNextPoint = MILLISECONDS_PER_STAMINA_POINT - (timeSinceLastUpdate % MILLISECONDS_PER_STAMINA_POINT);
        
        if (timeToNextPoint <= 0) {
             setStaminaRegenTimer('');
        } else {
            const minutes = Math.floor(timeToNextPoint / 60000);
            const seconds = Math.floor((timeToNextPoint % 60000) / 1000);
            setStaminaRegenTimer(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }
      };
      updateTimer();
      timerId = setInterval(updateTimer, 1000);
    } else {
      setStaminaRegenTimer('');
    }
    return () => clearInterval(timerId);
  }, [currency, gameState.resources.currentStamina, gameState.resources.maxStamina, gameState.lastStaminaUpdateTime]);


  return (
    <div className="flex items-center bg-gray-700 px-2 py-1 rounded-lg shadow">
      <span className="text-lg mr-1">{icon}</span>
      <div className="flex flex-col items-start">
        <span className="text-xs font-medium text-yellow-300 leading-tight">
          {value.toLocaleString()}
          {showMax && maxValue !== undefined && `/${maxValue.toLocaleString()}`}
        </span>
        {currency === Currency.STAMINA && staminaRegenTimer && (
          <span className="text-[10px] text-cyan-300 leading-tight">{staminaRegenTimer}</span>
        )}
      </div>
      {onAddClick && (
        <Button size="sm" variant="ghost" onClick={onAddClick} className="ml-1 w-5 h-5 p-0 text-lg leading-none border-none hover:bg-yellow-500">+</Button>
      )}
    </div>
  );
};

export default CurrencyDisplay;