
import React from 'react';

export interface RedDotProps { // Exported interface
  className?: string;
  count?: number;
}

const RedDot: React.FC<RedDotProps> = ({ className = '', count }) => {
  return (
    <span 
      className={`absolute w-3 h-3 bg-red-500 rounded-full border-2 border-gray-800 flex items-center justify-center text-white text-[8px] font-bold ${className}`}
      style={{ top: '-0.25rem', right: '-0.25rem' }} // Default positioning, can be overridden
    >
      {count && count > 0 && count < 10 ? count : count && count >=10 ? "!" : ""}
    </span>
  );
};

export default RedDot;
