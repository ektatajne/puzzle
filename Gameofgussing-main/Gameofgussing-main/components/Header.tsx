
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-slate-900/70 backdrop-blur-md sticky top-0 z-10 border-b border-slate-700/50">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 py-4 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.82m5.84-2.56a16.95 16.95 0 0 0-2.63-3.07A16.95 16.95 0 0 0 8.41 16.97m7.18-2.6a16.92 16.92 0 0 0-2.63-3.07M12 6.75V3.75m0 3a15.93 15.93 0 0 1 3.59 2.25m-3.59-2.25a15.93 15.93 0 0 0-3.59 2.25m3.59 0a12.93 12.93 0 0 1-3.59 2.25m3.59-2.25a12.93 12.93 0 0 0 3.59 2.25M12 12.75V16.5m0-3.75a12.93 12.93 0 0 1-3.59-2.25m3.59 2.25a12.93 12.93 0 0 0 3.59-2.25M12 21.75V19.5m0 2.25a15.93 15.93 0 0 1-3.59-2.25M12 19.5a15.93 15.93 0 0 0-3.59-2.25m3.59 2.25a15.93 15.93 0 0 0 3.59-2.25M5.41 16.97a16.95 16.95 0 0 1-2.63-3.07M5.41 16.97a16.95 16.95 0 0 0-2.63-3.07m0 0a16.95 16.95 0 0 1 2.63-3.07m2.63 3.07a16.92 16.92 0 0 1 2.63-3.07" />
          </svg>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Image Prompt Battle
          </h1>
        </div>
      </div>
    </header>
  );
};

export default Header;
