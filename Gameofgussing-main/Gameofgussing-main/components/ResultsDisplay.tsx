import React from 'react';
import type { Player } from '../types';

interface ResultsDisplayProps {
  players: Player[];
  winners: string[];
  isLoading: boolean;
  onNextTask: () => void;
}

const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 !== 0;
  const emptyStars = 10 - fullStars - (halfStar ? 1 : 0);

  return (
    <div className="flex items-center">
      {[...Array(fullStars)].map((_, i) => (
        <svg key={`full-${i}`} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
      ))}
      {halfStar && (
         <svg key="half" className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" clipRule="evenodd" /><path d="M10 2.5v12.5a.5.5 0 01-1 0V2.5a.5.5 0 011 0z" /></svg>
      )}
      {[...Array(emptyStars)].map((_, i) => (
         <svg key={`empty-${i}`} className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
      ))}
    </div>
  );
};

const PlayerResultCard: React.FC<{ player: Player; isWinner: boolean; rank: number }> = ({ player, isWinner, rank }) => {
  if (!player.result) return null;
  const { result } = player;
  const accuracyColor = result.accuracy >= 75 ? 'text-green-400' : result.accuracy >= 50 ? 'text-yellow-400' : 'text-red-400';
  const winnerBorder = isWinner ? 'border-amber-400 ring-2 ring-amber-400' : 'border-slate-700';
  const rankColor = rank === 1 ? 'bg-amber-400 text-slate-900' : rank === 2 ? 'bg-slate-400 text-slate-900' : rank === 3 ? 'bg-amber-700 text-slate-200' : 'bg-slate-600 text-slate-200';

  return (
    <div className={`bg-slate-800/50 border ${winnerBorder} rounded-xl shadow-lg p-6 space-y-5 transition-all duration-300`}>
      <div className="flex justify-between items-start">
        <h3 className="text-xl font-bold text-slate-100">{player.name}</h3>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${rankColor}`}>
          #{rank}
        </div>
      </div>
      
      <div className="p-4 bg-slate-900/40 rounded-lg">
        <p className="text-sm font-medium text-slate-400 mb-1">Accuracy</p>
        <p className={`text-4xl font-bold ${accuracyColor}`}>{result.accuracy}<span className="text-2xl">%</span></p>
      </div>
      
      <div className="p-4 bg-slate-900/40 rounded-lg">
        <p className="text-sm font-medium text-slate-400 mb-2">Rating</p>
        <StarRating rating={result.rating} />
      </div>

      <div>
        <h4 className="text-md font-semibold text-cyan-300 mb-2">Generated Image</h4>
        {player.generatedImage ? (
          <img 
            src={player.generatedImage} 
            alt={`Image from ${player.name}'s prompt`} 
            className="w-full rounded-lg border-2 border-slate-600"
          />
        ) : (
          <div className="w-full aspect-square bg-slate-700 rounded-lg animate-pulse"></div>
        )}
      </div>

      <div>
        <h4 className="text-md font-semibold text-cyan-300 mb-2">Suggestions</h4>
        <ul className="space-y-1.5 list-disc list-inside text-sm text-slate-300">
          {result.suggestions.slice(0, 3).map((suggestion, index) => (
            <li key={index} className="pl-1">{suggestion}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const LoadingSkeleton: React.FC = () => (
  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 animate-pulse">
    <div className="h-8 bg-slate-700 rounded w-1/2 mx-auto mb-8"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="flex-1 space-y-4 p-4 bg-slate-700/50 rounded-lg">
          <div className="h-6 bg-slate-600 rounded w-1/3 mb-4"></div>
          <div className="h-12 bg-slate-600 rounded"></div>
          <div className="h-10 bg-slate-600 rounded"></div>
          <div className="aspect-square bg-slate-600 rounded-lg mt-2"></div>
          <div className="h-4 bg-slate-600 rounded w-full mt-4"></div>
          <div className="h-4 bg-slate-600 rounded w-5/6"></div>
        </div>
      ))}
    </div>
  </div>
);

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ players, winners, isLoading, onNextTask }) => {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (winners.length === 0 || !players.every(p => p.result)) {
    return null;
  }
  
  const sortedPlayers = [...players].sort((a, b) => (b.result?.accuracy ?? 0) - (a.result?.accuracy ?? 0));
  
  const winnerText = winners.length > 1 ? `It's a Tie!` : `${winners[0]} Wins!`;
  
  return (
    <div className="space-y-6">
      <div className="text-center bg-slate-800/60 border border-slate-700 rounded-xl py-4 px-6">
        <h2 className="text-3xl font-bold text-amber-400 animate-pulse">{winnerText}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sortedPlayers.map((player, index) => (
          <PlayerResultCard 
            key={player.id} 
            player={player} 
            isWinner={winners.includes(player.name)} 
            rank={index + 1}
          />
        ))}
      </div>

      <button
        onClick={onNextTask}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500"
      >
        Play Again
      </button>
    </div>
  );
};

export default ResultsDisplay;
