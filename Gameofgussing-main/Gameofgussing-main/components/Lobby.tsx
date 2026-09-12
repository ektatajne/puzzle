import React from 'react';
import type { Player } from '../types';
import QRCode from './QRCode';

interface LobbyProps {
  players: Player[];
  onStartGame: () => void;
  joinUrl: string;
  isLocalhost: boolean;
}

const Lobby: React.FC<LobbyProps> = ({ players, onStartGame, joinUrl, isLocalhost }) => {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl shadow-lg p-6 sm:p-8 space-y-8">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-cyan-300">Game Lobby</h2>
        <p className="text-slate-400 mt-2">
          Have players scan the QR code to join on their device.
        </p>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-center gap-8">
        <div className="flex-shrink-0 bg-white p-4 rounded-lg shadow-md">
          <QRCode url={joinUrl} />
        </div>
        <div className="w-full md:w-1/2 bg-slate-900/40 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4 text-slate-200 text-center">Players Joined ({players.length})</h3>
          {players.length > 0 ? (
            <ul className="space-y-3 max-h-48 overflow-y-auto">
              {players.map((player) => (
                <li key={player.id} className="bg-slate-700/50 rounded-md px-4 py-2 text-slate-300 font-medium text-center animate-fade-in">
                  {player.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 text-center py-4">Waiting for players...</p>
          )}
        </div>
      </div>
      
      {isLocalhost ? (
        <div className="text-center bg-amber-900/40 border border-amber-700 p-4 rounded-lg space-y-3">
          <h4 className="font-bold text-lg text-amber-300">How to Play with Friends</h4>
          <p className="text-sm text-amber-200">
            You are running this app on `localhost`. Others can't connect to this address.
          </p>
          <div className="text-left text-sm space-y-3 bg-slate-900/30 p-4 rounded-md">
             <p>
              <strong className="text-slate-100">Option 1: Same Wi-Fi Network</strong><br/>
              <span className="text-slate-300">
                Replace `localhost` in the URL with your computer's local IP address. Players on the same Wi-Fi can then connect.
              </span>
            </p>
            <p>
              <strong className="text-slate-100">Option 2: Deploy Online (Recommended)</strong><br/>
              <span className="text-slate-300">
                For anyone to join from anywhere, deploy this project to a free hosting service like Netlify, Vercel, or GitHub Pages.
              </span>
            </p>
          </div>
           <p className="text-xs font-mono text-cyan-400 break-all mt-2 bg-slate-800 p-2 rounded-md">
            {joinUrl}
          </p>
        </div>
      ) : (
        <div className="text-center bg-slate-900/40 p-4 rounded-lg border border-slate-700">
          <h4 className="font-semibold text-slate-300">Share this link to join:</h4>
          <p className="text-xs font-mono text-cyan-400 break-all mt-2 bg-slate-800 p-2 rounded-md">
            {joinUrl}
          </p>
        </div>
      )}


      <div className="border-t border-slate-700/50 pt-6">
        <button
          onClick={onStartGame}
          disabled={players.length === 0}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500"
        >
          Start Game
        </button>
      </div>
    </div>
  );
};

export default Lobby;