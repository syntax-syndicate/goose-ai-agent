import React from 'react';
import Back from '../icons/Back';

interface BackButtonProps {
  onClick?: () => void; // Mark onClick as optional
  className?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ onClick, className = '' }) => {
  const handleExit = () => {
    if (onClick) {
      onClick(); // Custom onClick handler passed via props
    } else if (window.history.length > 1) {
      window.history.back(); // Navigate to the previous page
    } else {
      console.warn('No history to go back to');
    }
  };

  return (
    <button
      onClick={handleExit}
      className={`flex items-center text-sm text-textSubtle group hover:text-textStandard px-2 ${className}`}
    >
      <Back className="w-4 h-4 group-hover:-translate-x-1 transition-all" />
      <span>Back</span>
    </button>
  );
};

export default BackButton;
