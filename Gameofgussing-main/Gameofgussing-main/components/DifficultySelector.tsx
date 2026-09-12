
import React from 'react';
import { Difficulty } from '../types';

interface DifficultySelectorProps {
  selectedDifficulty: Difficulty;
  onSelectDifficulty: (difficulty: Difficulty) => void;
  disabled: boolean;
}

const difficulties: Difficulty[] = ['Easy', 'Medium', 'Hard'];

const DifficultySelector: React.FC<DifficultySelectorProps> = ({ selectedDifficulty, onSelectDifficulty, disabled }) => {
  return (
    <div className="flex justify-center bg-slate-800/60 p-1.5 rounded-lg border border-slate-700/50">
      {difficulties.map((level) => (
        <button
          key={level}
          onClick={() => onSelectDifficulty(level)}
          disabled={disabled}
          className={`px-4 sm:px-6 py-2 text-sm sm:text-base font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed
            ${selectedDifficulty === level
              ? 'bg-cyan-600 text-white'
              : 'bg-transparent text-slate-400 hover:bg-slate-700/50'
            }`}
          aria-pressed={selectedDifficulty === level}
        >
          {level}
        </button>
      ))}
    </div>
  );
};

export default DifficultySelector;
