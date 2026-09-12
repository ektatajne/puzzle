import React from 'react';
import HostClient from './HostClient';
import PlayerClient from './PlayerClient';
import Header from './components/Header';
import Footer from './components/Footer';

const App: React.FC = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('gameId');

  const renderClient = () => {
    if (gameId) {
      return <PlayerClient gameId={gameId} />;
    }
    return <HostClient />;
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 font-sans">
      <Header />
      <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8 flex flex-col items-center">
        {renderClient()}
      </main>
      <Footer />
    </div>
  );
};

export default App;
