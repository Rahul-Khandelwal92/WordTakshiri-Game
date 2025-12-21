
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Search, Shuffle, RefreshCw, X, Info, Trophy, Music, Play, Timer as TimerIcon, Eye } from 'lucide-react';
import { BOLLYWOOD_WORDS } from './constants';
import { BollywoodWord, Difficulty, Category, FilterState } from './types';
import { WordCard } from './components/WordCard';
import { Timer } from './components/Timer';

// Audio Logic using Web Audio API
const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

const playTone = (freq: number, type: OscillatorType, duration: number, volume: number = 0.1) => {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
};

const playStartTune = () => {
  playTone(261.63, 'sine', 0.5); // C4
  setTimeout(() => playTone(329.63, 'sine', 0.5), 200); // E4
  setTimeout(() => playTone(392.00, 'sine', 0.8), 400); // G4
};

const playRandomTune = () => {
  playTone(392.00, 'square', 0.15, 0.05); // G4
  setTimeout(() => playTone(493.88, 'square', 0.15, 0.05), 100); // B4
  setTimeout(() => playTone(587.33, 'square', 0.15, 0.05), 200); // D5
  setTimeout(() => playTone(783.99, 'square', 0.3, 0.05), 300); // G5
};

const playEndTune = () => {
  playTone(392.00, 'triangle', 0.5); // G4
  setTimeout(() => playTone(329.63, 'triangle', 0.5), 200); // E4
  setTimeout(() => playTone(261.63, 'triangle', 1.0), 400); // C4
};

const playTickTune = (timeLeft: number) => {
  const freq = timeLeft <= 3 ? 880 : 440;
  playTone(freq, 'sine', 0.1, 0.05);
};

const triggerConfetti = () => {
  const flash = document.createElement('div');
  flash.className = 'fixed inset-0 z-[100] pointer-events-none bg-amber-500/20 animate-pulse';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 1000);
};

const App: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>({
    difficulty: 'All',
    category: 'All',
    search: '',
  });

  const [selectedWord, setSelectedWord] = useState<BollywoodWord | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isShowingAnswers, setIsShowingAnswers] = useState(false);
  const [showRules, setShowRules] = useState(false);

  // Filter logic
  const filteredWords = useMemo(() => {
    return BOLLYWOOD_WORDS.filter((item) => {
      const matchSearch = item.word.toLowerCase().includes(filters.search.toLowerCase()) || 
                          item.englishMeaning.toLowerCase().includes(filters.search.toLowerCase());
      const matchDifficulty = filters.difficulty === 'All' || item.difficulty === filters.difficulty;
      const matchCategory = filters.category === 'All' || item.category === filters.category;
      return matchSearch && matchDifficulty && matchCategory;
    });
  }, [filters]);

  const handlePickRandom = () => {
    const randomIndex = Math.floor(Math.random() * BOLLYWOOD_WORDS.length);
    const word = BOLLYWOOD_WORDS[randomIndex];
    setSelectedWord(word);
    setIsTimerActive(false);
    setIsShowingAnswers(false);
    playRandomTune();
  };

  const handleWordClick = (word: BollywoodWord) => {
    setSelectedWord(word);
    setIsTimerActive(false);
    setIsShowingAnswers(false);
    playStartTune();
  };

  const startTimer = () => {
    setIsTimerActive(true);
    setIsShowingAnswers(false);
  };

  const showAnswers = () => {
    setIsShowingAnswers(true);
    setIsTimerActive(false);
  };

  const resetGame = () => {
    setSelectedWord(null);
    setIsTimerActive(false);
    setIsShowingAnswers(false);
  };

  const handleTimerComplete = useCallback(() => {
    setIsTimerActive(false);
    setIsShowingAnswers(true);
    playEndTune();
  }, []);

  const handleTick = useCallback((timeLeft: number) => {
    if (timeLeft >= 0) {
      playTickTune(timeLeft);
    }
  }, []);

  return (
    <div className="min-h-screen pb-20 px-4 pt-6 max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-8 text-center">
        <div className="flex justify-center items-center gap-2 mb-2">
          <Music className="text-amber-500" size={24} />
          <h1 className="heading-font text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500">
            ANTAKSHARI 2.0
          </h1>
          <Music className="text-amber-500" size={24} />
        </div>
        <p className="text-slate-400 text-sm md:text-base font-light tracking-widest uppercase">
          Lyrics Hint • 15s Challenge • Retro Vibes
        </p>
      </header>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <button 
          onClick={handlePickRandom}
          className="flex items-center justify-center gap-2 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-amber-500/20 transition-all active:scale-95"
        >
          <Shuffle size={20} />
          RANDOM WORD
        </button>
        <button 
          onClick={() => setShowRules(true)}
          className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-bold py-4 px-6 rounded-2xl transition-all active:scale-95"
        >
          <span className="hidden sm:inline">VIEW</span> RULES
        </button>
      </div>

      {/* Filter & Search Bar */}
      {!selectedWord && (
        <div className="space-y-4 mb-8 bg-slate-800/30 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search words (e.g. Dil, Pyaar)..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <span className="w-full text-[10px] text-slate-500 uppercase font-bold tracking-wider">Difficulty</span>
              {(['All', ...Object.values(Difficulty)] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setFilters(prev => ({ ...prev, difficulty: diff }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    filters.difficulty === diff 
                      ? 'bg-amber-500 border-amber-500 text-slate-900' 
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Words Grid */}
      {!selectedWord && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {filteredWords.map((item) => (
            <WordCard key={item.id} item={item} onClick={handleWordClick} />
          ))}
        </div>
      )}

      {/* Detail View Overlay */}
      {selectedWord && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-amber-500/10 flex flex-col max-h-[90vh]">
            
            <div className="p-6 text-center border-b border-slate-800 relative">
              <button 
                onClick={resetGame}
                className="absolute right-4 top-4 text-slate-500 hover:text-white transition-colors p-2"
              >
                <X size={24} />
              </button>
              
              <div className="mb-2 flex justify-center gap-2 items-center">
                <span className="text-[10px] uppercase font-black bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full border border-amber-500/20">
                  {selectedWord.difficulty}
                </span>
                <span className="text-[10px] uppercase font-black bg-slate-800 text-slate-400 px-3 py-1 rounded-full">
                  {selectedWord.category}
                </span>
              </div>

              <h2 className="hindi-font text-6xl font-bold text-amber-400 mb-2">
                {selectedWord.word}
              </h2>
              <p className="text-slate-400 text-xl font-light italic">
                {selectedWord.englishMeaning}
              </p>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              {/* Intermediate Step: Options */}
              {!isTimerActive && !isShowingAnswers && (
                <div className="flex flex-col gap-4 py-8 animate-in zoom-in-95 duration-300">
                  <button 
                    onClick={startTimer}
                    className="flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black py-8 px-6 rounded-3xl shadow-xl shadow-amber-500/20 transition-all active:scale-95"
                  >
                    <TimerIcon size={32} />
                    <span className="text-xl">START TIMER</span>
                    <span className="text-xs font-normal opacity-80 uppercase tracking-widest">15 Seconds Challenge</span>
                  </button>
                  
                  <div className="flex items-center gap-4 text-slate-700 my-2">
                    <div className="h-[1px] flex-1 bg-slate-800"></div>
                    <span className="text-xs font-bold">OR</span>
                    <div className="h-[1px] flex-1 bg-slate-800"></div>
                  </div>

                  <button 
                    onClick={showAnswers}
                    className="flex flex-col items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-black py-8 px-6 rounded-3xl shadow-lg transition-all active:scale-95"
                  >
                    <Eye size={32} />
                    <span className="text-xl">SHOW ANSWERS</span>
                    <span className="text-xs font-normal opacity-80 uppercase tracking-widest">Reveal Song Hints</span>
                  </button>
                </div>
              )}

              {/* Timer Active View */}
              {isTimerActive && !isShowingAnswers && (
                <div className="flex flex-col items-center justify-center space-y-6 py-4 animate-in fade-in duration-500">
                  <Timer 
                    duration={15} 
                    onComplete={handleTimerComplete} 
                    onTick={handleTick}
                    isActive={true} 
                  />
                  <div className="text-center space-y-2">
                    <p className="text-slate-300 text-lg">Quick! Sing a song with <br/><span className="text-amber-400 font-bold">"{selectedWord.word}"</span>!</p>
                    <p className="text-xs text-slate-500 italic">Hints will automatically reveal in a moment...</p>
                  </div>
                </div>
              )}

              {/* Answers Revealed View */}
              {isShowingAnswers && (
                <div className="space-y-6 animate-in zoom-in-95 duration-500">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <div className="flex items-center gap-2">
                      <Trophy size={18} className="text-yellow-500" />
                      <h4 className="font-bold text-sm tracking-widest uppercase">Iconic Hints & Lyrics</h4>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {selectedWord.songs.map((song, i) => (
                      <div 
                        key={i} 
                        className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/30 flex items-center justify-between group hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex-1 pr-4">
                          <p className="text-amber-100 font-bold text-base leading-tight mb-1">{song.title}</p>
                          <p className="text-slate-400 text-xs italic">"{song.lyrics}"</p>
                        </div>
                        <a 
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(song.title + " Bollywood Song")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 text-amber-500 transition-all active:scale-90 flex-shrink-0"
                        >
                          <Play size={16} fill="currentColor" />
                        </a>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => {
                      triggerConfetti();
                      resetGame();
                    }}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 mt-4"
                  >
                    I SANG IT! NEXT WORD
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950/50 text-center border-t border-slate-800">
              <button 
                onClick={handlePickRandom}
                className="text-slate-500 hover:text-amber-400 flex items-center justify-center gap-2 mx-auto text-sm font-medium transition-colors"
              >
                <RefreshCw size={14} />
                ANOTHER RANDOM WORD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-8 relative">
            <button onClick={() => setShowRules(false)} className="absolute right-6 top-6 text-slate-500 hover:text-white"><X size={20} /></button>
            <h2 className="heading-font text-3xl font-bold text-amber-500 mb-6 flex items-center gap-2"><Info /> HOW TO PLAY</h2>
            <div className="space-y-6 text-slate-300">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-500 font-bold border border-amber-500/30">1</div>
                <p>Pick a word to enter the <span className="text-amber-400 font-bold">Challenge Zone</span>.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-500 font-bold border border-amber-500/30">2</div>
                <p>Choose to <span className="text-amber-400 font-bold">Start Timer</span> (15s) or <span className="text-amber-400 font-bold">Show Answers</span> immediately.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-500 font-bold border border-amber-500/30">3</div>
                <p>If the timer runs out, the songs are revealed. Sing it to win!</p>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-500 font-bold border border-amber-500/30">4</div>
                <p>A <span className="text-amber-400 font-bold">Tick sound</span> plays during the timer to keep the pressure on!</p>
              </div>
            </div>
            <button onClick={() => setShowRules(false)} className="w-full mt-8 bg-amber-500 text-slate-900 font-black py-4 rounded-xl shadow-lg">LET'S START</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
