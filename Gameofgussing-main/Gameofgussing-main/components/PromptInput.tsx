import React from 'react';
import type { Player } from '../types';

interface MultiplayerInputProps {
  players: Player[];
  onPromptChange: (playerId: string, value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  disabled: boolean;
}

const PlayerInput: React.FC<{
  player: Player;
  onPromptChange: (playerId: string, value: string) => void;
  disabled: boolean;
}> = ({ player, onPromptChange, disabled }) => {
  return (
    <div className="flex-1 min-w-[250px]">
      <label htmlFor={`player-${player.id}-prompt`} className="block text-lg font-semibold mb-2 text-slate-300">
        {player.name}
      </label>
      <textarea
        id={`player-${player.id}-prompt`}
        value={player.prompt}
        onChange={(e) => onPromptChange(player.id, e.target.value)}
        placeholder={`${player.name}, write your prompt here...`}
        className="w-full h-32 p-4 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={disabled}
      />
    </div>
  );
}

const MultiplayerInput: React.FC<MultiplayerInputProps> = ({ players, onPromptChange, onSubmit, isLoading, disabled }) => {
  
  const allPromptsFilled = players.every(p => p.prompt.trim() !== '');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if(!disabled && !isLoading && allPromptsFilled) {
        onSubmit();
      }
    }
  };
  
  return (
    <div className="space-y-6" onKeyDown={handleKeyDown}>
      <div className="flex flex-wrap gap-6">
        {players.map(player => (
          <PlayerInput 
            key={player.id}
            player={player}
            onPromptChange={onPromptChange}
            disabled={disabled}
          />
        ))}
      </div>
      <button
        onClick={onSubmit}
        disabled={isLoading || disabled || !allPromptsFilled}
        className="w-full flex items-center justify-center bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Analyzing...
          </>
        ) : (
          'Analyze Prompts (Ctrl+Enter)'
        )}
      </button>
    </div>
  );
};

export default MultiplayerInput;
