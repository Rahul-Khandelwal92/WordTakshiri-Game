
import React from 'react';
import { BollywoodWord, Difficulty } from '../types';

interface WordCardProps {
  item: BollywoodWord;
  onClick: (item: BollywoodWord) => void;
}

const getDifficultyColor = (diff: Difficulty) => {
  switch (diff) {
    case Difficulty.Easy: return 'bg-green-500/20 text-green-400 border-green-500/30';
    case Difficulty.Medium: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case Difficulty.Hard: return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

export const WordCard: React.FC<WordCardProps> = ({ item, onClick }) => {
  return (
    <button
      onClick={() => onClick(item)}
      className="group relative bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-xl p-4 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 active:scale-95 text-left w-full"
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getDifficultyColor(item.difficulty)}`}>
          {item.difficulty}
        </span>
        <span className="text-[10px] text-slate-400 font-medium italic">
          {item.category}
        </span>
      </div>
      <h3 className="hindi-font text-2xl font-bold text-amber-100 mb-1 group-hover:text-amber-400 transition-colors">
        {item.word}
      </h3>
      <p className="text-slate-400 text-sm font-light">
        {item.englishMeaning}
      </p>
      
      {/* Decorative gradient element */}
      <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-amber-500 to-orange-500 group-hover:w-full transition-all duration-500 rounded-b-xl" />
    </button>
  );
};
