
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  let sizeClasses = '';
  switch (size) {
    case 'sm': sizeClasses = 'max-w-sm'; break;
    case 'md': sizeClasses = 'max-w-md'; break;
    case 'lg': sizeClasses = 'max-w-lg'; break;
    case 'xl': sizeClasses = 'max-w-xl'; break;
    default: sizeClasses = 'max-w-md';
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className={`bg-gray-800 p-6 rounded-xl shadow-2xl w-full ${sizeClasses} transform transition-all duration-300 ease-out scale-95 opacity-0 animate-modal-appear`}>
        {title && (
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-700">
            <h3 className="text-xl font-bold text-yellow-400">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
          </div>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
};

export default Modal;