import React from 'react';
import { Star, Play } from 'lucide-react';
import { BollywoodWord } from '../types';

interface WordCardProps {
  item: BollywoodWord;
  onClick: (item: BollywoodWord) => void;
}

export const WordCard: React.FC<WordCardProps> = ({ item, onClick }) => {
  return (
    <button
      onClick={() => onClick(item)}
      className="group relative bg-white/[0.03] hover:bg-gradient-to-br hover:from-amber-500/[0.08] hover:to-transparent border border-white/5 hover:border-amber-500/40 rounded-3xl p-6 transition-all duration-500 transform hover:-translate-y-3 hover:shadow-[0_25px_50px_rgba(212,175,55,0.1)] active:scale-95 text-left w-full h-full flex flex-col overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <Star className="text-amber-500" size={12} fill="currentColor" />
      </div>
      
      <div className="flex justify-between items-start mb-6">
        <span className="text-[8px] text-amber-500/60 font-black uppercase tracking-[0.2em] bg-amber-500/5 px-2 py-1 rounded-md border border-amber-500/10">
          {item.category}
        </span>
        <span className="text-3xl group-hover:scale-125 transition-transform duration-700 ease-out">{item.emoji}</span>
      </div>
      
      <h3 className="hindi-font text-4xl font-black text-slate-100 group-hover:text-amber-400 group-hover:scale-105 origin-left transition-all duration-500 mb-3 leading-tight">
        {item.word}
      </h3>
      
      <div className="mt-auto pt-4 border-t border-white/5 opacity-40 group-hover:opacity-100 transition-opacity">
        <p className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.25em] flex items-center justify-between">
          <span>{item.englishMeaning}</span>
          <Play size={8} className="text-amber-500" fill="currentColor" />
        </p>
      </div>

      {/* Hover accent */}
      <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-amber-500 to-amber-700 group-hover:w-full transition-all duration-700" />
    </button>
  );
};