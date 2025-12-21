
import React from 'react';
import { BollywoodWord } from '../types';

interface WordCardProps {
  item: BollywoodWord;
  onClick: (item: BollywoodWord) => void;
}

export const WordCard: React.FC<WordCardProps> = ({ item, onClick }) => {
  return (
    <button
      onClick={() => onClick(item)}
      className="group relative bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-xl p-4 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 active:scale-95 text-left w-full h-full flex flex-col"
    >
      <div className="flex justify-end items-start mb-2">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          {item.category}
        </span>
      </div>
      
      <div className="flex items-center gap-2 mb-1">
        <h3 className="hindi-font text-2xl font-bold text-amber-100 group-hover:text-amber-400 transition-colors truncate">
          {item.word}
        </h3>
        <span className="text-xl shrink-0">{item.emoji}</span>
      </div>
      
      <p className="text-slate-400 text-sm font-light truncate mt-auto">
        {item.englishMeaning}
      </p>
      
      {/* Decorative gradient element */}
      <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-amber-500 to-orange-500 group-hover:w-full transition-all duration-500 rounded-b-xl" />
    </button>
  );
};
