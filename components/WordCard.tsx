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
  const accentColor = isLuxury ? 'emerald-600' : 'teal-400';
  
  return (
    <button
      onClick={() => onClick(item)}
      className={`group relative border rounded-2xl md:rounded-3xl p-4 md:p-6 transition-all duration-500 transform hover:-translate-y-2 md:hover:-translate-y-3 active:scale-95 text-left w-full h-full flex flex-col overflow-hidden shadow-sm ${
        isLuxury 
          ? 'bg-white border-slate-100 hover:shadow-xl hover:shadow-emerald-500/5' 
          : 'bg-black border-white/5 hover:border-teal-500/40 hover:shadow-2xl hover:shadow-teal-500/10'
      }`}
    >
      <div className="absolute top-0 right-0 p-2 md:p-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <Star className={`text-${accentColor}`} size={10} fill="currentColor" />
      </div>
      
      <div className="flex justify-between items-start mb-4 md:mb-6">
        <span className={`text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 md:py-1 rounded-md border ${
          isLuxury 
            ? 'text-emerald-600/60 bg-slate-50 border-slate-100' 
            : 'text-teal-400/60 bg-white/5 border-white/10'
        }`}>
          {item.category}
        </span>
        <span className="text-2xl md:text-3xl group-hover:scale-125 transition-transform duration-700 ease-out">{item.emoji}</span>
      </div>
      
      <h3 className={`hindi-font text-2xl md:text-4xl font-black group-hover:scale-105 origin-left transition-all duration-500 mb-2 md:mb-3 leading-tight ${
        isLuxury ? 'text-slate-800 group-hover:text-emerald-700' : 'text-white group-hover:text-teal-400'
      }`}>
        {item.word}
      </h3>
      
      <div className={`mt-auto pt-3 md:pt-4 border-t opacity-60 group-hover:opacity-100 transition-opacity ${isLuxury ? 'border-slate-50' : 'border-white/5'}`}>
        <p className="text-slate-400 text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] md:tracking-[0.25em] flex items-center justify-between">
          <span className="truncate mr-2">{item.englishMeaning}</span>
          <Play size={8} className={`text-${accentColor} flex-shrink-0`} fill="currentColor" />
        </p>
      </div>

      <div className={`absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r ${
        isLuxury ? 'from-emerald-600 to-cyan-400' : 'from-teal-500 to-blue-400'
      } group-hover:w-full transition-all duration-700`} />
    </button>
  );
};