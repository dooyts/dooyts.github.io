
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import RedDot, { RedDotProps } from '../../components/RedDot'; 
import { useGame, RedDotType } from '../../contexts/GameContext'; 

interface NavItemProps {
  to: string;
  label: string;
  icon: string;
  hasRedDot?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, label, icon, hasRedDot }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (location.pathname === '/' && to === '/lobby');

  return (
    <NavLink
      to={to}
      className={`flex-1 flex flex-col items-center justify-center p-2 relative transition-colors duration-200 ${
        isActive ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-300'
      }`}
    >
      {hasRedDot && <RedDot className="!top-1 !right-1/2 !translate-x-3" />}
      <span className="text-2xl">{icon}</span>
      <span className="text-xs mt-0.5">{label}</span>
    </NavLink>
  );
};

const BottomNav: React.FC = () => {
  const { checkRedDot } = useGame();

  const navItems: { to: string, label: string, icon: string, redDotKey?: RedDotType | RedDotType[] }[] = [
    { to: '/lobby', label: '主城', icon: '🏰' },
    { to: '/heroes', label: '英雄', icon: '🦸', redDotKey: ['hero_upgrade', 'hero_team_assign'] }, 
    { to: '/battle', label: '戰役', icon: '⚔️', redDotKey: 'stage_progress' }, 
    { to: '/inventory', label: '背包', icon: '🎒' },
    // { to: '/guild', label: '公會', icon: '🛡️', redDotKey: 'guild_checkin' }, // Guild system removed
    { to: '/shop', label: '商城', icon: '🛍️', redDotKey: 'shop_free' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-sm mx-auto bg-gray-800 border-t border-gray-700 shadow-top flex z-40">
      {navItems.map(item => {
        let hasRedDot = false;
        if (item.redDotKey) {
            if (Array.isArray(item.redDotKey)) {
                hasRedDot = item.redDotKey.some(key => checkRedDot(key));
            } else {
                hasRedDot = checkRedDot(item.redDotKey);
            }
        }
        return (
            <NavItem
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
            hasRedDot={hasRedDot}
            />
        );
        })}
    </nav>
  );
};

export default BottomNav;