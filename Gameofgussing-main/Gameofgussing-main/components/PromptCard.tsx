
import React from 'react';

interface PromptCardProps {
  image: string | null;
  isLoading: boolean;
  taskTitle: string;
}

const ImageSkeleton: React.FC = () => (
  <div className="w-full aspect-square bg-slate-700 rounded-lg animate-pulse"></div>
);

const PromptCard: React.FC<PromptCardProps> = ({ image, isLoading, taskTitle }) => {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl shadow-lg p-6 space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-cyan-300">Your Mission</h2>
        <p className="text-slate-400">
          Write a prompt that could generate the image below. Be as descriptive as possible.
        </p>
      </div>
      <div className="w-full">
        {isLoading ? (
          <ImageSkeleton />
        ) : image ? (
          <img 
            src={image} 
            alt={taskTitle} 
            className="w-full h-full object-cover rounded-lg border-2 border-slate-600"
          />
        ) : (
          <div className="w-full aspect-square bg-slate-900/50 rounded-lg flex items-center justify-center text-slate-500">
            <p>Image could not be loaded.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptCard;
