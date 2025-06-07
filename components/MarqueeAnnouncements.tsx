
import React, { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { GachaAnnouncement, CharacterRarity } from '../types';
import { RARITY_COLORS } from '../constants/uiConstants';

const MarqueeAnnouncements: React.FC = () => {
  const { gameState } = useGame();
  const [currentlyPlaying, setCurrentlyPlaying] = useState<GachaAnnouncement | null>(null);
  const [internalQueue, setInternalQueue] = useState<GachaAnnouncement[]>([]);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

  // Effect 1: Populate internalQueue from gameState.gachaAnnouncements
  useEffect(() => {
    const newGameAnnouncements = gameState.gachaAnnouncements;

    const newAnnouncementsToAdd = newGameAnnouncements.filter(ga =>
        !processedIds.has(ga.id) &&
        !internalQueue.some(iq => iq.id === ga.id) &&
        (!currentlyPlaying || currentlyPlaying.id !== ga.id)
    );

    if (newAnnouncementsToAdd.length > 0) {
        setInternalQueue(prevQueue => {
            const updatedQueue = [...prevQueue, ...newAnnouncementsToAdd];
            // Sort by timestamp to ensure older announcements are processed first if multiple new ones arrive
            updatedQueue.sort((a, b) => a.timestamp - b.timestamp);
            return updatedQueue;
        });
    }
  }, [gameState.gachaAnnouncements, processedIds, internalQueue, currentlyPlaying]);

  // Effect 2: Manage currentlyPlaying from internalQueue
  useEffect(() => {
    if (!currentlyPlaying && internalQueue.length > 0) {
        const nextAnnouncement = internalQueue[0];
        setCurrentlyPlaying(nextAnnouncement);
        setInternalQueue(prevQueue => prevQueue.slice(1));
        setProcessedIds(prevIds => new Set(prevIds).add(nextAnnouncement.id));
    }
  }, [currentlyPlaying, internalQueue]);

  // Effect 3: Animation handling
  useEffect(() => {
    if (currentlyPlaying) {
      const marqueeTextElement = document.getElementById('marquee-text-content');
      const marqueeContainerElement = document.getElementById('marquee-container');

      if (marqueeTextElement && marqueeContainerElement) {
        const containerWidth = marqueeContainerElement.offsetWidth;
        const textWidth = marqueeTextElement.scrollWidth;
        
        const totalScrollDistance = containerWidth + textWidth;
        const scrollSpeed = 350; // pixels per second, higher is faster. Original: 75, then 150
        const calculatedDuration = totalScrollDistance / scrollSpeed;
        
        // Ensure a minimum duration for very short text or very wide containers relative to text.
        // Also prevents excessively fast scrolling for short text.
        const duration = Math.max(2, calculatedDuration); // Minimum duration of 2s.

        marqueeTextElement.style.animationDuration = `${duration}s`;
        marqueeTextElement.classList.add('animate-marquee');

        // Set a timeout to clear the current announcement after it finishes scrolling
        const timer = setTimeout(() => {
          marqueeTextElement.classList.remove('animate-marquee');
          setCurrentlyPlaying(null); // Clear current, allowing next in queue to play
        }, (duration + 0.1) * 1000); // Added a small buffer (0.1s) for animation to visually complete
        
        return () => clearTimeout(timer);
      }
    }
  }, [currentlyPlaying]);

  // If nothing is playing and the queue is empty, don't render the marquee bar
  if (!currentlyPlaying && internalQueue.length === 0) {
    return null; 
  }

  // Determine rarity color, default if not found
  const rarityClass = currentlyPlaying ? (RARITY_COLORS[currentlyPlaying.rarity]?.split(' ')[0] || 'text-yellow-300') : 'text-yellow-300';

  return (
    // Only render the container if there's something to play or in queue (ensures bar hides when truly empty)
    (currentlyPlaying || internalQueue.length > 0) && (
      <div
        id="marquee-container"
        className="fixed top-0 left-0 right-0 z-50 w-full h-8 bg-black bg-opacity-80 flex items-center overflow-hidden whitespace-nowrap pointer-events-none shadow-lg"
        aria-live="polite"
        aria-atomic="true"
      >
        <style>
          {`
            @keyframes marqueeAnimation {
              0% { transform: translateX(100vw); } /* Start from viewport right */
              100% { transform: translateX(-100%); } /* Scroll fully to the left, ensuring text exits */
            }
            .animate-marquee {
              animation-name: marqueeAnimation;
              animation-timing-function: linear;
              animation-iteration-count: 1;
              display: inline-block; /* Important for scrollWidth calculation */
              white-space: nowrap;
            }
          `}
        </style>
        {currentlyPlaying && (
          <div
            id="marquee-text-content"
            className="text-sm md:text-base" // Ensure it's display: inline-block or similar for scrollWidth
          >
            {/* Pad with non-breaking spaces if needed for visual start/end, or handle with translateX start/end values */}
            <span className={`px-2 font-semibold text-gray-100`}>
              🎉 恭喜玩家 <span className="text-cyan-300">{currentlyPlaying.playerName}</span> 抽中了 {currentlyPlaying.itemEmoji}
              <span className={`px-1 ${rarityClass}`}>{currentlyPlaying.rarity}</span>
              <span className={`${rarityClass}`}>{currentlyPlaying.itemName}</span>！ 🎉
            </span>
          </div>
        )}
      </div>
    )
  );
};

export default MarqueeAnnouncements;
