import React from 'react';
import { Star, Play } from 'lucide-react';
import { BollywoodWord } from '../types';

interface WordCardProps {
  item: BollywoodWord;
  onClick: (item: BollywoodWord) => void;
  theme?: 'luxury' | 'midnight';
}

export const WordCard: React.FC<WordCardProps> = ({ item, onClick, theme = 'luxury' }) => {
  const isLuxury = theme === 'luxury';
  const accentColor = isLuxury ? 'amber-500' : 'sky-400';
  
  return (
    <button
      onClick={() => onClick(item)}
      className={`group relative bg-white/[0.03] hover:bg-gradient-to-br hover:from-${accentColor}/[0.08] hover:to-transparent border border-white/5 hover:border-${accentColor}/40 rounded-2xl md:rounded-3xl p-4 md:p-6 transition-all duration-500 transform hover:-translate-y-2 md:hover:-translate-y-3 hover:shadow-2xl active:scale-95 text-left w-full h-full flex flex-col overflow-hidden`}
    >
      <div className="absolute top-0 right-0 p-2 md:p-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <Star className={`text-${accentColor}`} size={10} fill="currentColor" />
      </div>
      
      <div className="flex justify-between items-start mb-4 md:mb-6">
        <span className={`text-[7px] md:text-[8px] ${isLuxury ? 'text-amber-500/60' : 'text-sky-400/60'} font-black uppercase tracking-[0.2em] bg-white/5 px-2 py-0.5 md:py-1 rounded-md border border-white/5`}>
          {item.category}
        </span>
        <span className="text-2xl md:text-3xl group-hover:scale-125 transition-transform duration-700 ease-out">{item.emoji}</span>
      </div>
      
      <h3 className={`hindi-font text-2xl md:text-4xl font-black text-slate-100 group-hover:${isLuxury ? 'text-amber-400' : 'text-sky-300'} group-hover:scale-105 origin-left transition-all duration-500 mb-2 md:mb-3 leading-tight`}>
        {item.word}
      </h3>
      
      <div className="mt-auto pt-3 md:pt-4 border-t border-white/5 opacity-40 group-hover:opacity-100 transition-opacity">
        <p className="text-slate-500 text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] md:tracking-[0.25em] flex items-center justify-between">
          <span className="truncate mr-2">{item.englishMeaning}</span>
          <Play size={8} className={`text-${accentColor} flex-shrink-0`} fill="currentColor" />
        </p>
      </div>

      {/* Hover accent */}
      <div className={`absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r ${isLuxury ? 'from-amber-500 to-amber-700' : 'from-sky-400 to-sky-700'} group-hover:w-full transition-all duration-700`} />
    </button>
  );
};