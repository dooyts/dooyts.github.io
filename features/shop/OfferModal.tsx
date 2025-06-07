
import React, { useState, useEffect } from 'react';
import { TriggeredOffer, Currency } from '../../types';
import Button from '../../components/Button';
import Modal from '../../components/Modal';

interface OfferModalProps {
  offer: TriggeredOffer;
  onClose: () => void;
  onPurchase: () => void;
}

const OfferModal: React.FC<OfferModalProps> = ({ offer, onClose, onPurchase }) => {
  const [timeLeft, setTimeLeft] = useState(offer.durationSeconds);

  useEffect(() => {
    if (timeLeft <= 0) {
      onClose(); 
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prevTime => prevTime - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onClose]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getCurrencyName = (currencyKey: string): string => {
    switch(currencyKey) {
        case Currency.GOLD: return "金幣";
        case Currency.DIAMONDS: return "鑽石";
        case Currency.STAMINA: return "體力";
        case Currency.EXP_POTION: return "經驗藥水";
        case Currency.BREAKTHROUGH_STONE: return "突破石";
        case Currency.GACHA_TICKET: return "召喚券";
        default: return currencyKey;
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="限時特惠!" size="md">
      <div className="p-2 text-center">
        <div className="text-6xl mb-4">{offer.emoji || '🎉'}</div>
        <h3 className="text-xl font-bold text-yellow-300 mb-2">{offer.name}</h3>
        
        <div className="bg-gray-700 p-3 rounded-lg mb-4 text-sm text-left">
          <p className="font-semibold mb-1">立即獲得以下超值道具:</p>
          {offer.diamondsAwarded && <p>💎 鑽石: {offer.diamondsAwarded.toLocaleString()}</p>}
          {offer.resources && Object.entries(offer.resources).map(([key, value]) => (
            <p key={key} className="capitalize">{getCurrencyName(key)}: {Number(value).toLocaleString()}</p>
          ))}
        </div>

        <p className="text-2xl font-bold text-green-400 mb-1">只需 NT${offer.priceNT}!</p>
        <p className="text-lg text-red-500 font-semibold mb-4 animate-pulse">
          剩餘時間: {formatTime(timeLeft)}
        </p>
        
        <Button onClick={onPurchase} variant="special" size="lg" className="w-full mb-2">
          立即搶購!
        </Button>
        <Button onClick={onClose} variant="ghost" className="w-full">
          下次再說
        </Button>
      </div>
    </Modal>
  );
};

export default OfferModal;
