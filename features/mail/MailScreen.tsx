
import React, { useState } from 'react';
// import TopBar from '../lobby/TopBar'; // Removed
import { useGame } from '../../contexts/GameContext';
import { Mail as MailType, Currency } from '../../types';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { CURRENCY_NAMES, CURRENCY_EMOJIS } from '../../constants/uiConstants';

const MailScreen: React.FC = () => {
  const { gameState, readMail, claimMailReward, deleteMail } = useGame();
  const [selectedMail, setSelectedMail] = useState<MailType | null>(null);

  const handleMailClick = (mail: MailType) => {
    setSelectedMail(mail);
    if (!mail.isRead) {
      readMail(mail.id);
    }
  };

  const handleClaim = (mailId: string) => {
    claimMailReward(mailId);
    if (selectedMail && selectedMail.id === mailId) {
        setSelectedMail(prev => prev ? {...prev, claimed: true} : null);
    }
  }
  
  const handleDelete = (mailId: string) => {
    deleteMail(mailId);
    if (selectedMail && selectedMail.id === mailId) {
        setSelectedMail(null);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* <TopBar /> Removed */}
      <div className="p-4 flex-grow"> {/* Standardized to p-4 */}
        <h1 className="text-2xl font-bold text-yellow-400 mb-4 text-center">郵件中心</h1>

        {gameState.mails.length === 0 && <p className="text-center text-gray-400">沒有任何郵件。</p>}

        <div className="space-y-2">
          {gameState.mails.map(mail => (
            <div
              key={mail.id}
              onClick={() => handleMailClick(mail)}
              className={`p-3 rounded-md cursor-pointer transition-colors ${mail.isRead ? 'bg-gray-700 hover:bg-gray-650' : 'bg-blue-700 hover:bg-blue-600 animate-pulse'}`}
            >
              <div className="flex justify-between items-center">
                <h3 className={`font-semibold ${!mail.isRead ? 'text-yellow-300' : 'text-gray-200'}`}>{mail.title}</h3>
                <span className="text-xs text-gray-400">{new Date(mail.timestamp).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-gray-300 truncate">{mail.body}</p>
              {mail.rewards && !mail.claimed && <span className="text-xs text-green-400">🎁 有附件</span>}
            </div>
          ))}
        </div>
      </div>

      {selectedMail && (
        <Modal isOpen={!!selectedMail} onClose={() => setSelectedMail(null)} title={selectedMail.title} size="md">
          <div className="space-y-3">
            <p className="text-xs text-gray-400">寄件人: {selectedMail.sender}</p>
            <p className="text-sm text-gray-200 whitespace-pre-wrap">{selectedMail.body}</p>
            {selectedMail.rewards && (
              <div className="mt-2 pt-2 border-t border-gray-600">
                <h4 className="font-semibold text-yellow-300">附件:</h4>
                <ul className="list-disc list-inside text-sm text-gray-300">
                  {Object.entries(selectedMail.rewards).map(([key, value]) => (
                    <li key={key}>{CURRENCY_EMOJIS[key as Currency] || ''} {CURRENCY_NAMES[key as Currency] || key}: {(value as number).toLocaleString()}</li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleClaim(selectedMail.id)}
                  disabled={selectedMail.claimed}
                  variant="primary"
                  className="w-full mt-3"
                >
                  {selectedMail.claimed ? '已領取附件' : '領取附件'}
                </Button>
              </div>
            )}
            <div className="flex gap-2 mt-4">
                <Button onClick={() => handleDelete(selectedMail.id)} variant="danger" className="flex-1">刪除郵件</Button>
                <Button onClick={() => setSelectedMail(null)} variant="secondary" className="flex-1">關閉</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MailScreen;
