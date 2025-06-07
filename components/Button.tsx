
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'special' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', children, className = '', ...props }) => {
  const baseStyle = 'font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';
  
  let variantStyle = '';
  switch (variant) {
    case 'primary':
      variantStyle = 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-400';
      break;
    case 'secondary':
      variantStyle = 'bg-gray-600 hover:bg-gray-700 text-gray-100 focus:ring-gray-500';
      break;
    case 'danger':
      variantStyle = 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-400';
      break;
    case 'special':
      variantStyle = 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white focus:ring-pink-400';
      break;
    case 'ghost':
      variantStyle = 'bg-transparent hover:bg-gray-700 text-gray-200 focus:ring-gray-500 border border-gray-600';
      break;
  }

  let sizeStyle = '';
  switch (size) {
    case 'sm':
      sizeStyle = 'px-3 py-1.5 text-xs';
      break;
    case 'md':
      sizeStyle = 'px-4 py-2 text-sm';
      break;
    case 'lg':
      sizeStyle = 'px-6 py-3 text-base';
      break;
  }

  return (
    <button className={`${baseStyle} ${variantStyle} ${sizeStyle} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
