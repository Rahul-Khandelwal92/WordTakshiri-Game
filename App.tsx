
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Search, Shuffle, RefreshCw, X, Info, Trophy, Music, Play, Timer as TimerIcon, Eye, CheckCircle, Sparkles, HelpCircle, Home, Mic2, Star, RotateCcw, Flame, Moon, Sun, Settings, Clock, ChevronRight } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { BOLLYWOOD_WORDS } from './constants';
import { BollywoodWord, Category, FilterState } from './types';
import { WordCard } from './components/WordCard';
import { Timer } from './components/Timer';

// Audio Logic for game sounds using Web Audio API
const gameAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

const playTone = (freq: number, type: OscillatorType, duration: number, volume: number = 0.05) => {
  if (gameAudioCtx.state === 'suspended') {
    gameAudioCtx.resume();
  }
  const osc = gameAudioCtx.createOscillator();
  const gain = gameAudioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, gameAudioCtx.currentTime);
  gain.gain.setValueAtTime(volume, gameAudioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, gameAudioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(gameAudioCtx.destination);
  osc.start();
  osc.stop(gameAudioCtx.currentTime + duration);
};

const playStartTune = () => {
  playTone(392, 'sine', 0.4); // G4
  setTimeout(() => playTone(493.88, 'sine', 0.4), 150); // B4
  setTimeout(() => playTone(587.33, 'sine', 0.6), 300); // D5
};

const playShuffleTick = (intensity: number) => {
  const freq = 300 + (intensity * 200);
  playTone(freq + Math.random() * 50, 'triangle', 0.04, 0.02);
};

const playTickSound = (secondsLeft: number) => {
  const freq = secondsLeft <= 5 ? 1200 : 800;
  const vol = secondsLeft <= 5 ? 0.03 : 0.015;
  playTone(freq, 'sine', 0.05, vol);
};

const playEndTune = () => {
  playTone(261.63, 'square', 0.8, 0.03);
};

const triggerConfetti = () => {
  const flash = document.createElement('div');
  flash.className = 'fixed inset-0 z-[1000] pointer-events-none bg-emerald-500/10 animate-pulse';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 400);
};

const App: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>({
    category: 'All',
    search: '',
    startingLetter: 'All',
  });

  const [selectedWord, setSelectedWord] = useState<BollywoodWord | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isShowingAnswers, setIsShowingAnswers] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<'luxury' | 'midnight'>('luxury');
  const [roundDuration, setRoundDuration] = useState(15);
  
  // Streak States
  const [streak, setStreak] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [finalStreak, setFinalStreak] = useState(0);

  const [isShuffling, setIsShuffling] = useState(false);
  const [shufflingWord, setShufflingWord] = useState<string>('');
  const [shuffleBlur, setShuffleBlur] = useState(0);

  // Apply theme class to body
  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  // Resume Audio Context on interaction
  useEffect(() => {
    const initAudio = () => {
      if (gameAudioCtx.state === 'suspended') {
        gameAudioCtx.resume();
      }
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
    window.addEventListener('click', initAudio);
    window.addEventListener('touchstart', initAudio);
    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
  }, []);

  const { visibleCategories, othersCategories, availableLetters } = useMemo(() => {
    const counts: Record<string, number> = {};
    const lettersSet = new Set<string>();
    
    BOLLYWOOD_WORDS.forEach(w => {
      counts[w.category] = (counts[w.category] || 0) + 1;
      if (w.word && w.word.length > 0) {
        lettersSet.add(w.word[0].toUpperCase());
      }
    });
    
    const visible = Object.values(Category).filter(cat => counts[cat] >= 5);
    const others = Object.values(Category).filter(cat => counts[cat] > 0 && counts[cat] < 5);
    const sortedLetters = Array.from(lettersSet).sort();
    
    return { visibleCategories: visible, othersCategories: others, availableLetters: sortedLetters };
  }, []);

  const filteredWords = useMemo(() => {
    return BOLLYWOOD_WORDS.filter((item) => {
      const matchSearch = item.word.toLowerCase().includes(filters.search.toLowerCase()) || 
                          item.englishMeaning.toLowerCase().includes(filters.search.toLowerCase());
      
      let matchCategory = true;
      if (filters.category === 'All Others') {
        matchCategory = othersCategories.includes(item.category);
      } else if (filters.category !== 'All') {
        matchCategory = item.category === filters.category;
      }

      let matchLetter = true;
      if (filters.startingLetter !== 'All') {
        matchLetter = item.word.toUpperCase().startsWith(filters.startingLetter);
      }

      return matchSearch && matchCategory && matchLetter;
    });
  }, [filters, othersCategories]);

  const handlePickRandom = useCallback(() => {
    if (isShuffling) return;
    
    setIsShuffling(true);
    setSelectedWord(null);
    setIsTimerActive(false);
    setIsShowingAnswers(false);
    setIsGameOver(false);

    const finalWord = BOLLYWOOD_WORDS[Math.floor(Math.random() * BOLLYWOOD_WORDS.length)];
    let currentIteration = 0;
    const totalIterations = 25;
    
    const shuffleNext = (delay: number) => {
      currentIteration++;
      const intensity = currentIteration / totalIterations;
      playShuffleTick(intensity);
      const blurAmount = Math.max(0, 10 - (delay / 20));
      setShuffleBlur(blurAmount);

      if (currentIteration >= totalIterations) {
        setShufflingWord(finalWord.word);
        setShuffleBlur(0);
        setTimeout(() => {
          setIsShuffling(false);
          setSelectedWord(finalWord);
          triggerConfetti();
          playStartTune();
        }, 800);
      } else {
        const randomIndex = Math.floor(Math.random() * BOLLYWOOD_WORDS.length);
        setShufflingWord(BOLLYWOOD_WORDS[randomIndex].word);
        const nextDelay = delay * 1.12; 
        setTimeout(() => shuffleNext(nextDelay), nextDelay);
      }
    };
    shuffleNext(40);
  }, [isShuffling]);

  const handleWordClick = (word: BollywoodWord) => {
    setSelectedWord(word);
    setIsTimerActive(false);
    setIsShowingAnswers(false);
    setIsGameOver(false);
    playStartTune();
  };

  const startTimer = () => {
    setIsTimerActive(true);
    setIsShowingAnswers(false);
    setIsGameOver(false);
  };

  const showAnswers = () => {
    setFinalStreak(streak);
    if (streak > 0) {
      setStreak(0);
      playEndTune();
    }
    setIsShowingAnswers(true);
    setIsTimerActive(false);
    setIsGameOver(false);
  };

  const handleVictory = () => {
    triggerConfetti();
    setStreak(prev => prev + 1);
    handlePickRandom();
  };

  const handleDefeat = () => {
    setFinalStreak(streak);
    setStreak(0);
    setIsGameOver(true);
    setIsTimerActive(false);
    playEndTune();
  };

  const handleRestart = () => {
    setStreak(0);
    setIsGameOver(false);
    setIsShowingAnswers(false);
    resetGame();
  };

  const resetGame = () => {
    setSelectedWord(null);
    setIsTimerActive(false);
    setIsShowingAnswers(false);
    setIsGameOver(false);
  };

  const isLuxury = theme === 'luxury';
  const accentColor = isLuxury ? 'emerald-600' : 'teal-400';
  const accentBorder = isLuxury ? 'border-emerald-600' : 'border-teal-400';
  const gradientText = isLuxury ? 'ocean-gradient-text' : 'mint-gradient-text';
  const glowClass = isLuxury ? 'ocean-glow' : 'mint-glow';
  const primaryButtonBg = isLuxury ? 'from-emerald-500 to-cyan-600' : 'from-teal-500 to-blue-600';

  return (
    <div className={`min-h-screen pb-24 px-4 pt-4 md:pt-10 max-w-5xl mx-auto selection:bg-${accentColor}/20 flex flex-col`}>
      
      <div className="flex-grow">
        {/* PERSISTENT STREAK COUNTER */}
        <div className="fixed top-4 right-4 md:top-6 md:right-8 z-[500] pointer-events-none">
          <div 
            key={streak} 
            className={`flex items-center gap-2 md:gap-3 backdrop-blur-3xl border-2 px-3 py-1.5 md:px-5 md:py-2 rounded-2xl shadow-xl transition-all duration-500 ${
              streak > 0 
                ? `${accentBorder} scale-100 md:scale-110 shadow-emerald-500/20 animate-in zoom-in-95` 
                : `border-${isLuxury ? 'slate-200' : 'white/10'} opacity-80 scale-90`
            } ${isLuxury ? 'bg-white/90' : 'bg-black/80'}`}
          >
            <div className="relative">
              <Flame 
                size={18}
                className={`${streak > 0 ? (isLuxury ? 'text-emerald-500' : 'text-teal-400') : 'text-slate-400'} md:w-6 md:h-6 animate-pulse`} 
                fill={streak > 0 ? "currentColor" : "none"} 
              />
            </div>
            <div className="flex flex-col items-center leading-none">
              <span className={`text-[7px] md:text-[9px] font-black uppercase tracking-[0.15em] mb-0.5 ${streak > 0 ? (isLuxury ? 'text-emerald-600' : 'text-teal-400') : 'text-slate-400'}`}>
                Streak
              </span>
              <span className={`text-base md:text-2xl font-black ${streak > 0 ? (isLuxury ? 'text-slate-900' : 'text-white') : 'text-slate-400'}`}>
                {streak}
              </span>
            </div>
          </div>
        </div>

        {/* Header */}
        <header className="mb-10 md:mb-12 text-center mt-12 md:mt-4 px-2">
          <div className="relative inline-flex flex-col items-center max-w-full">
            <div className="flex justify-center items-center gap-2 md:gap-4 mb-2 relative">
              <Mic2 className={`${isLuxury ? 'text-emerald-600/40' : 'text-teal-400/40'} animate-pulse hidden xs:block`} size={18} />
              <h1 className={`heading-font text-3xl sm:text-5xl md:text-7xl font-black tracking-tight ${gradientText} ${glowClass}`}>
                WORD-TAKSHARI
              </h1>
              <Music className={`${isLuxury ? 'text-emerald-600/40' : 'text-teal-400/40'} animate-pulse hidden xs:block`} style={{ animationDelay: '0.5s' }} size={18} />
            </div>
            <p className={`${isLuxury ? 'text-emerald-600/60' : 'text-teal-400/60'} text-[7px] md:text-xs font-bold tracking-[0.2em] md:tracking-[0.5em] uppercase`}>
              The Definitive Bollywood Singing Arena
            </p>
          </div>
        </header>

        {/* Primary Action Button */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-8 md:mb-12">
          <button 
            onClick={handlePickRandom}
            disabled={isShuffling}
            className={`flex-1 relative overflow-hidden group bg-gradient-to-br ${primaryButtonBg} p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-xl hover:shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 text-white`}
          >
            <div className="relative flex items-center justify-center gap-4 md:gap-5">
               <Shuffle size={24} className={isShuffling ? 'animate-spin' : ''} />
               <div className="text-left">
                  <span className="block text-base md:text-2xl font-black heading-font tracking-wide uppercase">RANDOM START</span>
                  <span className="block text-[8px] md:text-[10px] uppercase font-bold text-white/60 tracking-widest">Shuffle Melodies</span>
               </div>
            </div>
          </button>

          <button 
            onClick={() => setShowRules(true)}
            className={`sm:w-48 p-4 md:p-8 rounded-2xl md:rounded-3xl border flex flex-col items-center justify-center gap-1 transition-all group shadow-sm ${isLuxury ? 'bg-white border-slate-200 hover:bg-slate-50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
          >
            <Info className={`${isLuxury ? 'text-slate-400 group-hover:text-emerald-500' : 'text-white/40 group-hover:text-teal-400'} transition-colors`} size={18} />
            <span className={`text-[9px] uppercase font-black tracking-widest transition-colors ${isLuxury ? 'text-slate-400 group-hover:text-slate-600' : 'text-white/40 group-hover:text-white'}`}>Rules</span>
          </button>
        </div>

        {/* Filters & Search */}
        {!selectedWord && !isShuffling && (
          <section className="animate-in fade-in duration-700">
            <div className={`mb-6 md:mb-8 flex flex-col gap-4 glass-panel p-3 md:p-5 rounded-3xl`}>
              {/* Search Bar */}
              <div className="relative flex-1 w-full">
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isLuxury ? 'text-emerald-600/40' : 'text-teal-400/40'}`} size={16} />
                <input 
                  type="text" 
                  placeholder="Search lyrics or meanings..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className={`w-full rounded-2xl py-3 md:py-4 pl-10 pr-4 focus:outline-none transition-all placeholder:text-slate-400 text-sm md:text-base border ${isLuxury ? 'bg-white border-slate-100 focus:border-emerald-500/40 text-slate-900 shadow-sm' : 'bg-black/20 border-white/5 focus:border-teal-400/40 text-white'}`}
                />
              </div>

              {/* Alphabet Scroller */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest ${isLuxury ? 'text-slate-400' : 'text-white/30'}`}>Alphabetical</span>
                  <button 
                    onClick={() => setFilters(prev => ({ ...prev, startingLetter: 'All' }))}
                    className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest hover:underline ${filters.startingLetter === 'All' ? (isLuxury ? 'text-emerald-600' : 'text-teal-400') : 'text-slate-400'}`}
                  >
                    Clear
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
                  {availableLetters.map((letter) => (
                    <button
                      key={letter}
                      onClick={() => setFilters(prev => ({ ...prev, startingLetter: prev.startingLetter === letter ? 'All' : letter }))}
                      className={`flex-shrink-0 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl md:rounded-2xl text-sm md:text-lg font-black transition-all border ${
                        filters.startingLetter === letter 
                          ? `${isLuxury ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-teal-500 border-teal-400 text-white'} shadow-lg scale-110 z-10` 
                          : `${isLuxury ? 'bg-white border-slate-100 text-slate-600 hover:border-emerald-200' : 'bg-white/5 border-white/10 text-white/50 hover:border-teal-400/30'}`
                      }`}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Scroller */}
              <div className="space-y-2">
                <div className="px-1">
                  <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest ${isLuxury ? 'text-slate-400' : 'text-white/30'}`}>Categories</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 w-full no-scrollbar scroll-smooth">
                  {['All', ...visibleCategories, 'All Others'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilters(prev => ({ ...prev, category: cat as any }))}
                      className={`px-4 md:px-5 py-2 md:py-3 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
                        filters.category === cat 
                          ? `${isLuxury ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-teal-500 border-teal-400 text-white'} shadow-md` 
                          : `${isLuxury ? 'bg-white border-slate-100 text-slate-500 hover:text-slate-800' : 'bg-white/5 border-white/10 text-white/50 hover:text-white'}`
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {filteredWords.map((item) => (
                <WordCard key={item.id} item={item} onClick={handleWordClick} theme={theme} />
              ))}
              {filteredWords.length === 0 && (
                <div className="col-span-full py-16 text-center animate-in fade-in zoom-in-95">
                  <Search size={48} className={`mx-auto mb-4 opacity-20 ${isLuxury ? 'text-slate-900' : 'text-white'}`} />
                  <p className={`text-xl font-black heading-font ${isLuxury ? 'text-slate-400' : 'text-white/30'}`}>No Melodies Found</p>
                  <p className="text-xs text-slate-500 mt-2">Try clearing some filters</p>
                  <button 
                    onClick={() => setFilters({ category: 'All', search: '', startingLetter: 'All' })}
                    className={`mt-6 px-6 py-2 rounded-full border font-black text-[10px] uppercase tracking-[0.2em] ${isLuxury ? 'border-emerald-500 text-emerald-600' : 'border-teal-400 text-teal-400'}`}
                  >
                    Reset All
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Shuffle Animation - Slot Machine Style */}
        {isShuffling && (
          <div className={`fixed inset-0 z-[1000] flex flex-col items-center justify-center p-6 overflow-hidden ${isLuxury ? 'bg-white' : 'bg-black'}`}>
            <div className={`absolute inset-0 opacity-20 pointer-events-none transition-all duration-1000 ${isLuxury ? 'bg-[radial-gradient(circle_at_center,_#10b981_0%,_transparent_70%)]' : 'bg-[radial-gradient(circle_at_center,_#2dd4bf_0%,_transparent_70%)]'} animate-pulse`} />
            <div className="relative z-10 w-full max-w-2xl text-center">
              <p className={`${isLuxury ? 'text-emerald-600' : 'text-teal-400'} font-black tracking-[0.5em] text-[10px] md:text-xs uppercase mb-16 opacity-60 animate-bounce`}>
                Rolling the Melodies...
              </p>
              <div className="perspective-1000 relative h-48 md:h-72 flex items-center justify-center">
                 <h2 
                  key={shufflingWord}
                  style={{ filter: `blur(${shuffleBlur}px)` }}
                  className={`hindi-font text-6xl md:text-9xl font-black px-4 leading-tight transition-all duration-75 animate-in slide-in-from-bottom-12 ${isLuxury ? 'text-slate-900' : 'text-white'}`}
                >
                  {shufflingWord}
                </h2>
              </div>
              <div className="mt-16 flex justify-center gap-4">
                 {[1,2,3].map(i => (
                   <div key={i} className={`w-2 h-2 rounded-full ${isLuxury ? 'bg-emerald-500' : 'bg-teal-400'} animate-ping`} style={{ animationDelay: `${i * 0.2}s` }} />
                 ))}
              </div>
            </div>
          </div>
        )}

        {/* Detail View Overlay */}
        {selectedWord && !isShuffling && (
          <div className={`fixed inset-0 z-[150] backdrop-blur-3xl flex flex-col p-4 animate-in fade-in duration-300 overflow-hidden ${isLuxury ? 'bg-white/98' : 'bg-black/95'}`}>
            <div className="flex items-center justify-between w-full h-16 px-2 mb-2 relative z-[160]">
              <button onClick={resetGame} className={`p-3 transition-colors rounded-full border ${isLuxury ? 'bg-slate-100 text-slate-400 hover:text-slate-900 border-slate-200' : 'bg-white/5 text-white/40 hover:text-white border-white/10'}`}>
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto no-scrollbar pb-10">
              <div className={`w-full max-w-xl border rounded-[2.5rem] md:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col relative animate-in zoom-in-95 duration-300 ${isLuxury ? 'bg-white border-slate-100' : 'bg-zinc-900/50 border-white/5'}`}>
                <div className={`p-4 sm:p-6 md:p-10 text-center relative border-b transition-all ${isLuxury ? 'border-slate-100' : 'border-white/5'} ${isTimerActive || isGameOver || isShowingAnswers ? 'pt-8 pb-4' : 'py-8 md:py-16'}`}>
                  <div className="flex flex-col items-center justify-center gap-2 md:gap-6 w-full">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 md:gap-4 px-4 w-full">
                      <h2 className={`hindi-font font-black break-all transition-all text-center ${isLuxury ? 'text-emerald-600' : 'text-teal-400'} ${glowClass} ${isTimerActive || isGameOver || isShowingAnswers ? 'text-3xl sm:text-4xl md:text-6xl' : 'text-4xl sm:text-5xl md:text-8xl'}`}>
                        {selectedWord.word}
                      </h2>
                      <span className={`transition-all shrink-0 ${isTimerActive || isGameOver || isShowingAnswers ? 'text-2xl sm:text-3xl md:text-5xl' : 'text-3xl sm:text-4xl md:text-7xl'}`}>{selectedWord.emoji}</span>
                    </div>
                    
                    {!isTimerActive && !isGameOver && !isShowingAnswers && (
                      <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 text-center w-full">
                        <p className={`text-sm sm:text-base md:text-xl font-medium tracking-tight italic px-4 ${isLuxury ? 'text-slate-500' : 'text-white/60'}`}>
                          "{selectedWord.englishMeaning}"
                        </p>
                        <div className={`rounded-2xl p-4 md:p-6 shadow-sm max-w-[280px] sm:max-w-xs mx-auto border ${isLuxury ? 'bg-emerald-50 border-emerald-100' : 'bg-teal-500/10 border-teal-500/20'}`}>
                           <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isLuxury ? 'text-emerald-600' : 'text-teal-400'}`}>Target</p>
                           <p className={`text-xs md:text-sm font-bold ${isLuxury ? 'text-slate-800' : 'text-white'}`}>Sing a song with <span className={isLuxury ? 'text-emerald-600' : 'text-teal-400'}>"{selectedWord.word}"</span></p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 md:p-10 flex-1">
                  {!isTimerActive && !isShowingAnswers && !isGameOver && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 max-w-sm mx-auto">
                      <button 
                        onClick={startTimer}
                        className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br ${primaryButtonBg} text-white font-black py-6 md:py-8 rounded-2xl md:rounded-3xl shadow-xl hover:brightness-110 active:scale-[0.98] transition-all`}
                      >
                        <TimerIcon size={24} />
                        <span className="text-sm heading-font tracking-widest">SING NOW</span>
                      </button>
                      <button onClick={showAnswers} className={`flex flex-col items-center justify-center gap-2 font-bold py-6 md:py-8 rounded-2xl md:rounded-3xl border transition-all active:scale-[0.98] ${isLuxury ? 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200' : 'bg-white/5 hover:bg-white/10 text-white/40 border-white/5'}`}>
                        <Eye size={24} />
                        <span className="text-sm heading-font tracking-widest uppercase">Reveal Hints</span>
                      </button>
                    </div>
                  )}

                  {isTimerActive && !isShowingAnswers && !isGameOver && (
                    <div className="flex flex-col items-center justify-center space-y-6 md:space-y-12">
                      <div className="scale-90 md:scale-110">
                        <Timer duration={roundDuration} onComplete={handleDefeat} onTick={(left) => playTickSound(left)} isActive={true} theme={theme} />
                      </div>
                      <div className="w-full space-y-6 max-w-sm mx-auto">
                        <div className="flex gap-4 h-20 md:h-24 px-2">
                          <button onClick={handleVictory} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-lg flex flex-col items-center justify-center gap-1 transition-all active:translate-y-1">
                            <CheckCircle size={22} />
                            <span className="text-[10px] md:text-xs uppercase tracking-wide">NAILED IT</span>
                          </button>
                          <button onClick={handleDefeat} className={`flex-1 font-bold rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${isLuxury ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-white/5 text-white/40 border-white/10'}`}>
                            <HelpCircle size={22} className={isLuxury ? 'text-emerald-500' : 'text-teal-400'} />
                            <span className="text-[10px] md:text-xs uppercase tracking-wide">NO IDEA</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {isGameOver && (
                    <div className="flex flex-col items-center justify-center py-4 md:py-8 animate-in zoom-in-95">
                      <div className="relative mb-6">
                        <div className={`bg-gradient-to-br ${primaryButtonBg} p-8 rounded-full shadow-2xl`}>
                          <Trophy size={48} className="text-white" />
                        </div>
                      </div>
                      <h3 className={`heading-font text-2xl md:text-4xl font-black mb-2 uppercase tracking-tighter ${isLuxury ? 'text-slate-900' : 'text-white'}`}>FINALE</h3>
                      <div className="flex items-center gap-3 mb-8">
                        <span className="text-slate-400 font-black text-xl tracking-widest uppercase">STREAK:</span>
                        <span className={`${isLuxury ? 'text-emerald-600' : 'text-teal-400'} font-black text-5xl ${glowClass}`}>{finalStreak}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-sm mx-auto">
                        <button onClick={handleRestart} className={`font-black py-4 rounded-xl border transition-all active:scale-95 text-xs tracking-widest uppercase ${isLuxury ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200' : 'bg-white/10 hover:bg-white/20 text-white border-white/5'}`}>REPLAY</button>
                        <button onClick={() => { setIsGameOver(false); setIsShowingAnswers(true); }} className={`bg-${accentColor} hover:brightness-110 text-white font-black py-4 rounded-xl shadow-lg transition-all active:scale-95 text-xs tracking-widest uppercase`}>LYRICS</button>
                      </div>
                    </div>
                  )}

                  {isShowingAnswers && !isGameOver && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-6 max-w-sm mx-auto">
                      <div className={`rounded-2xl p-4 text-center border ${isLuxury ? 'bg-slate-50 border-slate-100' : 'bg-white/5 border-white/10'}`}>
                        <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest mb-1">Result</p>
                        <p className={`font-bold text-lg ${isLuxury ? 'text-slate-900' : 'text-white'}`}>Score: {finalStreak}</p>
                      </div>
                      <div className="space-y-3">
                        {selectedWord.songs.map((song, i) => (
                          <div key={i} className={`p-4 rounded-2xl border flex items-center justify-between group shadow-sm transition-all ${isLuxury ? 'bg-white border-slate-100' : 'bg-black/40 border-white/5 hover:border-teal-500/40'}`}>
                            <div className="flex-1 pr-3">
                              <p className={`font-bold text-sm leading-tight mb-1 ${isLuxury ? 'text-emerald-700' : 'text-teal-300'}`}>{song.title}</p>
                              <p className="text-slate-500 text-[10px] italic line-clamp-1">"{song.lyrics}"</p>
                            </div>
                            <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(song.title)}`} target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 ${isLuxury ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/30'}`}>
                              <Play size={14} fill="currentColor" />
                            </a>
                          </div>
                        ))}
                      </div>
                      <button onClick={handleRestart} className={`w-full font-black py-4 rounded-xl flex items-center justify-center gap-3 text-[10px] tracking-widest uppercase transition-all ${isLuxury ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'bg-white/5 hover:bg-white/10 text-white/60'}`}>
                        <Home size={16} /> MAIN SCREEN
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className={`w-full py-8 text-center transition-colors duration-400 ${isLuxury ? 'text-slate-400' : 'text-white/20'}`}>
        <p className="text-[10px] md:text-xs font-bold tracking-widest uppercase">
          © 2025 Swar-Takshari | Created by RPM
        </p>
      </footer>

      {/* SETTINGS BUTTON (BOTTOM RIGHT) */}
      <div className="fixed bottom-6 right-6 z-[500]">
        <button 
          onClick={() => setShowSettings(true)}
          className={`flex items-center justify-center w-14 h-14 shadow-2xl rounded-full border transition-all hover:scale-110 active:scale-95 ${isLuxury ? 'bg-white text-emerald-600 border-slate-200' : 'bg-teal-500 text-white border-teal-400'}`}
        >
          <Settings size={24} className={isShuffling ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* SETTINGS OVERLAY */}
      {showSettings && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className={`w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden border ${isLuxury ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-950 border-white/10 text-white'}`}>
            <button onClick={() => setShowSettings(false)} className="absolute right-6 top-6 text-slate-400 hover:text-slate-900 transition-colors">
              <X size={24} />
            </button>
            
            <h2 className="heading-font text-2xl font-black mb-8 tracking-widest uppercase flex items-center gap-3">
              <Settings className={isLuxury ? 'text-emerald-600' : 'text-teal-400'} size={24} />
              Settings
            </h2>

            <div className="space-y-8">
              {/* Theme Selection */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Atmosphere</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setTheme('luxury')}
                    className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${isLuxury ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : (isLuxury ? 'border-slate-100 bg-slate-50 text-slate-400' : 'border-white/5 bg-white/5 text-white/40')}`}
                  >
                    <Sun size={18} />
                    <span className="text-xs font-bold">Luminous</span>
                  </button>
                  <button 
                    onClick={() => setTheme('midnight')}
                    className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${!isLuxury ? 'border-teal-500 bg-teal-500/10 text-teal-400' : (isLuxury ? 'border-slate-100 bg-slate-50 text-slate-400' : 'border-white/5 bg-white/5 text-white/40')}`}
                  >
                    <Moon size={18} />
                    <span className="text-xs font-bold">Midnight</span>
                  </button>
                </div>
              </div>

              {/* Timer Selection */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Singing Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 30].map((t) => (
                    <button 
                      key={t}
                      onClick={() => setRoundDuration(t)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${roundDuration === t ? (isLuxury ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-teal-500 bg-teal-500/10 text-teal-400') : (isLuxury ? 'border-slate-100 bg-slate-50 text-slate-400' : 'border-white/5 bg-white/5 text-white/40')}`}
                    >
                      <span className="text-sm font-black">{t}s</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowSettings(false)} 
              className={`w-full mt-10 text-white font-black py-4 rounded-xl shadow-lg transition-all active:scale-95 uppercase tracking-widest text-xs ${isLuxury ? 'bg-emerald-600' : 'bg-teal-500'}`}
            >
              Apply Changes
            </button>
          </div>
        </div>
      )}

      {showRules && (
        <div className={`fixed inset-0 z-[600] flex items-center justify-center p-4 backdrop-blur-md ${isLuxury ? 'bg-white/95' : 'bg-black/95'}`}>
          <div className={`w-full max-md border rounded-[2.5rem] p-8 relative shadow-2xl overflow-y-auto max-h-[90vh] ${isLuxury ? 'bg-white border-slate-200' : 'bg-zinc-950 border-white/10'}`}>
            <button onClick={() => setShowRules(false)} className={`absolute right-6 top-6 transition-colors ${isLuxury ? 'text-slate-400 hover:text-slate-900' : 'text-white/40 hover:text-white'}`}>
              <X size={24} />
            </button>
            <h2 className={`heading-font text-3xl font-black mb-8 tracking-widest uppercase ${isLuxury ? 'text-emerald-600' : 'text-teal-400'}`}>RULES</h2>
            <div className={`space-y-6 font-medium leading-relaxed text-sm ${isLuxury ? 'text-slate-600' : 'text-white/70'}`}>
              <p>I. Select a Bollywood keyword to start.</p>
              <p>II. You have <span className="font-bold">{roundDuration} seconds</span> to sing a song with that word.</p>
              <p>III. <span className="font-bold">GIVING UP</span> shows lyrics but resets your streak.</p>
              <p>IV. <span className="font-bold">STREAKS:</span> Keep singing without help to build your score!</p>
            </div>
            <button onClick={() => setShowRules(false)} className={`w-full mt-10 text-white font-black py-4 rounded-xl shadow-lg hover:brightness-110 active:translate-y-1 transition-all uppercase tracking-widest text-sm ${isLuxury ? 'bg-emerald-600' : 'bg-teal-500'}`}>LET'S GO</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;