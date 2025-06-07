
import React from 'react';

const VipBadge: React.FC<{ level: number, small?: boolean }> = ({ level, small }) => {
    if (level === 0) return null;

    let vipColor = 'text-green-400 border-green-500';
    let vipShine = '';
    let fontWeight = 'font-semibold';

    if (level >= 15) {
        vipColor = 'text-red-400 border-red-500';
        vipShine = 'animate-pulse'; 
        fontWeight = 'font-black';
    } else if (level >= 12) {
        vipColor = 'text-yellow-400 border-yellow-500';
        vipShine = 'animate-pulse';
        fontWeight = 'font-bold';
    } else if (level >= 9) {
        vipColor = 'text-purple-400 border-purple-500';
        vipShine = 'animate-pulse animation-duration-slow'; 
    } else if (level >= 6) {
        vipColor = 'text-blue-400 border-blue-500';
    }

    const textSize = small ? 'text-[9px]' : 'text-xs';
    const padding = small ? 'px-0.5' : 'px-1';

    return (
        <span className={`inline-block ${textSize} ${fontWeight} ${vipColor} ${vipShine} border rounded-sm ${padding} mr-1 align-middle`}>
            VIP{level}
        </span>
    );
};

export default VipBadge;
