import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, Shuffle, RefreshCw, X, Info, Trophy, Music, Play, Timer as TimerIcon, Eye, CheckCircle, Sparkles, Volume2, Loader2, HelpCircle, Home, Mic2, Star, BookOpen, RotateCcw, Flame } from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import { BOLLYWOOD_WORDS } from './constants';
import { BollywoodWord, Category, FilterState } from './types';
import { WordCard } from './components/WordCard';
import { Timer } from './components/Timer';

// Audio Encoding & Decoding Helpers
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

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

const playShuffleTick = () => {
  playTone(440 + Math.random() * 200, 'triangle', 0.04, 0.02);
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
  flash.className = 'fixed inset-0 z-[100] pointer-events-none bg-amber-500/10 animate-pulse';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 800);
};

const App: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>({
    category: 'All',
    search: '',
  });

  const [selectedWord, setSelectedWord] = useState<BollywoodWord | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isShowingAnswers, setIsShowingAnswers] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Streak States
  const [streak, setStreak] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [finalStreak, setFinalStreak] = useState(0);

  const [isShuffling, setIsShuffling] = useState(false);
  const [shufflingWord, setShufflingWord] = useState<string>('');

  const { visibleCategories, othersCategories } = useMemo(() => {
    const counts: Record<string, number> = {};
    BOLLYWOOD_WORDS.forEach(w => {
      counts[w.category] = (counts[w.category] || 0) + 1;
    });
    const visible = Object.values(Category).filter(cat => counts[cat] >= 5);
    const others = Object.values(Category).filter(cat => counts[cat] > 0 && counts[cat] < 5);
    return { visibleCategories: visible, othersCategories: others };
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

      return matchSearch && matchCategory;
    });
  }, [filters, othersCategories]);

  const handlePickRandom = () => {
    if (isShuffling) return;
    
    setIsShuffling(true);
    setSelectedWord(null);
    setIsTimerActive(false);
    setIsShowingAnswers(false);
    setIsGameOver(false);

    // Pre-determine the final word so the shuffle can land on it
    const finalWord = BOLLYWOOD_WORDS[Math.floor(Math.random() * BOLLYWOOD_WORDS.length)];
    let count = 0;
    const maxCount = 20; // Increased count for better shuffle effect
    
    const interval = setInterval(() => {
      count++;
      playShuffleTick();
      
      if (count >= maxCount) {
        // Last iteration: Show the final selected word
        setShufflingWord(finalWord.word);
        clearInterval(interval);
        
        // Pause briefly on the final word for impact before opening detail view
        setTimeout(() => {
          setIsShuffling(false);
          setSelectedWord(finalWord);
          triggerConfetti();
          playStartTune();
        }, 600);
      } else {
        // Shuffling: Show a random word
        const randomIndex = Math.floor(Math.random() * BOLLYWOOD_WORDS.length);
        setShufflingWord(BOLLYWOOD_WORDS[randomIndex].word);
      }
    }, 70); 
  };

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
    // Selecting clues explicitly ends the current game session
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

  const speakWord = async () => {
    if (!selectedWord || isSpeaking) return;
    
    setIsSpeaking(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say clearly: ${selectedWord.word}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        const audioBuffer = await decodeAudioData(
          decode(base64Audio),
          outputAudioContext,
          24000,
          1,
        );
        const source = outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(outputAudioContext.destination);
        source.start();
        source.onended = () => setIsSpeaking(false);
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error("TTS failed:", error);
      setIsSpeaking(false);
    }
  };

  return (
    <div className="min-h-screen pb-16 px-4 pt-6 md:pt-10 max-w-5xl mx-auto selection:bg-amber-500/30">
      {/* PERSISTENT STREAK COUNTER - Fixed position to be always visible */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[110] pointer-events-none">
        <div 
          key={streak} 
          className={`flex items-center gap-3 bg-slate-900/90 backdrop-blur-xl border-2 px-6 py-2.5 rounded-full shadow-[0_0_30px_rgba(245,158,11,0.2)] transition-all duration-500 ${
            streak > 0 
              ? 'border-amber-500 scale-110 animate-in zoom-in-95 bounce-in shadow-[0_0_40px_rgba(245,158,11,0.4)]' 
              : 'border-white/10 opacity-60'
          }`}
        >
          <div className="relative">
            <Flame 
              size={24} 
              className={`${streak > 0 ? 'text-orange-500 animate-pulse' : 'text-slate-500'}`} 
              fill={streak > 0 ? "currentColor" : "none"} 
            />
            {streak > 0 && (
              <>
                <div className="absolute inset-0 bg-orange-500 blur-md opacity-40 animate-ping" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full animate-bounce" />
              </>
            )}
          </div>
          <div className="flex flex-col items-center leading-none">
            <span className={`text-[8px] font-black uppercase tracking-[0.2em] mb-0.5 ${streak > 0 ? 'text-amber-400/80' : 'text-slate-500'}`}>
              Streak
            </span>
            <span className={`text-xl md:text-2xl font-black ${streak > 0 ? 'text-white gold-glow' : 'text-slate-500'}`}>
              {streak}
            </span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="mb-8 md:mb-12 text-center group mt-14">
        <div className="relative inline-flex flex-col items-center">
          <div className="flex justify-center items-center gap-2 md:gap-4 mb-3 relative">
            <Mic2 className="text-amber-500/60 animate-pulse hidden xs:block" size={20} />
            <h1 className="heading-font text-4xl sm:text-5xl md:text-7xl font-black tracking-tight gold-gradient-text drop-shadow-2xl gold-glow">
              WORD-TAKSHARI
            </h1>
            <Music className="text-amber-500/60 animate-pulse hidden xs:block" style={{ animationDelay: '0.5s' }} size={20} />
          </div>
          <p className="text-amber-500/40 text-[8px] md:text-xs font-bold tracking-[0.3em] md:tracking-[0.5em] uppercase opacity-80">
            The Definitive Bollywood Singing Arena
          </p>
        </div>
      </header>

      {/* Primary Action Button */}
      <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-8 md:mb-12">
        <button 
          onClick={handlePickRandom}
          disabled={isShuffling}
          className="flex-1 relative overflow-hidden group bg-gradient-to-br from-amber-600 to-amber-900 p-6 md:p-8 rounded-2xl md:rounded-3xl border border-amber-500/20 shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20 pointer-events-none" />
          <div className="relative flex items-center justify-center gap-4 md:gap-5">
             <Shuffle size={28} className={`${isShuffling ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'} text-amber-100`} />
             <div className="text-left">
                <span className="block text-lg md:text-2xl font-black heading-font tracking-wide text-white uppercase">CHOOSE A RANDOM WORD</span>
                <span className="block text-[9px] md:text-[10px] uppercase font-bold text-amber-200/50 tracking-widest">Generate Melody</span>
             </div>
          </div>
        </button>

        <button 
          onClick={() => setShowRules(true)}
          className="sm:w-48 bg-slate-900/40 hover:bg-slate-900/60 p-5 md:p-8 rounded-2xl md:rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-1 transition-all group shadow-xl"
        >
          <Info className="text-slate-500 group-hover:text-amber-500 transition-colors" size={18} />
          <span className="text-[9px] uppercase font-black tracking-widest text-slate-500 group-hover:text-slate-200">Rules</span>
        </button>
      </div>

      {/* Filters & Search */}
      {!selectedWord && !isShuffling && (
        <section className="animate-in fade-in duration-700">
          <div className="mb-6 md:mb-8 flex flex-col md:flex-row gap-4 items-center glass-panel p-3 md:p-4 rounded-2xl md:rounded-3xl">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500/30" size={16} />
              <input 
                type="text" 
                placeholder="Search lyrical themes..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full bg-slate-950/40 border border-white/5 text-slate-100 rounded-xl py-3 md:py-4 pl-10 pr-4 focus:outline-none focus:border-amber-500/40 transition-all placeholder:text-slate-600 text-sm md:text-base"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 w-full md:w-auto no-scrollbar scroll-smooth">
              {['All', ...visibleCategories, 'All Others'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilters(prev => ({ ...prev, category: cat as any }))}
                  className={`px-4 md:px-5 py-2 md:py-3 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
                    filters.category === cat 
                      ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-lg' 
                      : 'bg-slate-900/40 border-white/5 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {filteredWords.map((item) => (
              <WordCard key={item.id} item={item} onClick={handleWordClick} />
            ))}
          </div>
        </section>
      )}

      {/* Shuffle Animation */}
      {isShuffling && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-6 backdrop-blur-xl">
          <div className="relative">
            <div className="absolute -inset-16 md:-inset-24 bg-amber-500/10 blur-[80px] md:blur-[120px] rounded-full animate-pulse" />
            <div className="text-center relative">
              <p className="text-amber-500 font-black tracking-[0.3em] md:tracking-[0.5em] text-[8px] md:text-[10px] uppercase mb-8 md:mb-12 opacity-60">Melodic Shuffling...</p>
              <div className="h-32 md:h-48 flex items-center justify-center">
                <h2 className="hindi-font text-6xl md:text-8xl font-black text-white transition-all blur-[1px] scale-110 animate-in zoom-in-90 duration-75">
                  {shufflingWord}
                </h2>
              </div>
              <Sparkles className="text-amber-500/30 mx-auto mt-6 md:mt-8 animate-bounce" size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Detail View Overlay */}
      {selectedWord && !isShuffling && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 pt-24 md:pt-4 animate-in fade-in duration-300 overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-amber-500/20 rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col my-auto h-auto max-h-[80vh] relative scale-95 sm:scale-100">
            
            {/* Close Button */}
            <button onClick={resetGame} className="absolute right-4 top-4 md:right-8 md:top-8 text-slate-500 hover:text-white p-3 transition-colors z-[60] bg-slate-950/40 rounded-full border border-white/5 md:bg-transparent md:border-none">
              <X size={24} />
            </button>

            <div className={`${(isTimerActive || isGameOver || isShowingAnswers) ? 'p-3 md:p-4' : 'p-4 md:p-10'} text-center relative border-b border-white/5`}>
              <div className={`flex flex-col items-center justify-center gap-2 md:gap-6 transition-all ${(isTimerActive || isGameOver || isShowingAnswers) ? 'scale-90' : ''}`}>
                <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 px-4">
                  <h2 className={`${(isTimerActive || isGameOver || isShowingAnswers) ? 'text-3xl md:text-5xl' : 'text-5xl sm:text-6xl md:text-8xl'} hindi-font font-black text-amber-400 gold-glow break-words`}>
                    {selectedWord.word}
                  </h2>
                  <span className={`${(isTimerActive || isGameOver || isShowingAnswers) ? 'text-2xl md:text-4xl' : 'text-4xl sm:text-5xl md:text-6xl'}`}>{selectedWord.emoji}</span>
                </div>
                
                {!isTimerActive && !isGameOver && !isShowingAnswers && (
                  <div className="space-y-4 md:space-y-6">
                    <div className="space-y-2">
                      <button 
                        onClick={speakWord}
                        disabled={isSpeaking}
                        className="flex items-center gap-3 text-amber-200 hover:text-white font-bold text-[8px] md:text-[10px] tracking-widest uppercase bg-white/5 px-6 md:px-8 py-2 md:py-3 rounded-full border border-white/10 active:scale-95 transition-all disabled:opacity-50 mx-auto"
                      >
                        {isSpeaking ? <Loader2 className="animate-spin" size={14} /> : <Volume2 size={14} />}
                        PHONETIC GUIDE
                      </button>
                      <p className="text-slate-500 text-lg md:text-xl font-medium tracking-tight italic px-4">
                        "{selectedWord.englishMeaning}"
                      </p>
                    </div>

                    {/* Instruction Callout */}
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 md:p-5 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                       <p className="text-amber-400 text-[10px] md:text-xs font-black uppercase tracking-widest mb-1">Objective</p>
                       <p className="text-white text-sm md:text-base font-bold">Sing a Bollywood song featuring the word <span className="text-amber-400">"{selectedWord.word}"</span>!</p>
                       <button 
                        onClick={() => setShowRules(true)}
                        className="mt-3 flex items-center gap-2 mx-auto text-[9px] font-black uppercase text-amber-500/60 hover:text-amber-400 transition-colors"
                       >
                         <BookOpen size={10} /> View full rules
                       </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={`${(isTimerActive || isGameOver || isShowingAnswers) ? 'p-3 md:p-4' : 'p-4 md:p-8'} flex-1 overflow-y-auto`}>
              {!isTimerActive && !isShowingAnswers && !isGameOver && (
                <div className="grid grid-cols-2 gap-3 md:gap-4 py-2 md:py-4">
                  <button 
                    onClick={startTimer}
                    className="flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-black py-4 md:py-8 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl hover:brightness-110 active:scale-[0.98] transition-all"
                  >
                    <TimerIcon className="w-5 h-5 md:w-6 md:h-6" />
                    <span className="text-xs md:text-sm heading-font tracking-widest">START TIMER</span>
                    <span className="text-[7px] md:text-[8px] font-bold opacity-70 uppercase tracking-tight">Challenge On</span>
                  </button>

                  <button 
                    onClick={showAnswers}
                    className="flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-amber-500 font-bold py-4 md:py-8 rounded-[1.5rem] md:rounded-[2rem] border border-white/5 transition-all active:scale-[0.98]"
                  >
                    <Eye className="w-5 h-5 md:w-6 md:h-6" />
                    <span className="text-xs md:text-sm heading-font tracking-widest uppercase">LYRICAL CLUES</span>
                    <span className="text-[7px] md:text-[8px] font-bold opacity-50 uppercase tracking-tight">Ends Current Game</span>
                  </button>
                </div>
              )}

              {isTimerActive && !isShowingAnswers && !isGameOver && (
                <div className="flex flex-col items-center justify-center space-y-4 md:space-y-10">
                  <Timer 
                    duration={15} 
                    onComplete={handleDefeat} 
                    onTick={(left) => playTickSound(left)}
                    isActive={true} 
                  />
                  
                  <div className="w-full space-y-4 md:space-y-8">
                    <p className="text-slate-400 text-center font-medium text-xs md:text-sm italic">"Let the melody flow..."</p>
                    <div className="flex gap-3 md:gap-4 h-16 md:h-24 px-2">
                      <button 
                        onClick={handleVictory}
                        className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-black rounded-2xl md:rounded-3xl shadow-xl flex flex-col items-center justify-center gap-1 transition-all active:translate-y-1"
                      >
                        <CheckCircle className="w-[18px] h-[18px] md:w-[22px] md:h-[22px]" />
                        <span className="text-xs md:text-sm uppercase tracking-wide">I DID IT</span>
                      </button>

                      <button 
                        onClick={handleDefeat}
                        className="flex-1 bg-slate-800 text-slate-400 font-bold rounded-2xl md:rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
                      >
                        <HelpCircle className="text-amber-500 w-[18px] h-[18px] md:w-[22px] md:h-[22px]" />
                        <span className="text-xs md:text-sm uppercase tracking-wide">I DONT KNOW</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isGameOver && (
                <div className="flex flex-col items-center justify-center py-4 md:py-10 animate-in zoom-in-95 duration-500">
                  <div className="relative mb-4 md:mb-6">
                    <div className="absolute -inset-10 bg-amber-500/20 blur-3xl rounded-full" />
                    <div className="relative bg-gradient-to-br from-amber-400 to-amber-700 p-6 md:p-12 rounded-full border-4 border-amber-300 shadow-2xl">
                      <Trophy className="text-slate-950 w-10 h-10 md:w-20 md:h-20" />
                    </div>
                  </div>
                  
                  <h3 className="heading-font text-2xl md:text-5xl font-black text-white mb-2 uppercase tracking-tighter text-center">STREAK ENDED</h3>
                  <div className="flex items-center gap-3 mb-6 md:mb-8">
                    <span className="text-slate-400 font-black text-lg md:text-2xl tracking-widest uppercase opacity-60">SCORE:</span>
                    <span className="text-amber-400 font-black text-4xl md:text-6xl gold-glow">{finalStreak}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full px-4">
                    <button 
                      onClick={handleRestart}
                      className="flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 text-white font-black py-4 rounded-2xl border border-white/5 transition-all active:scale-95 text-xs md:text-sm tracking-widest uppercase"
                    >
                      <RotateCcw size={18} /> RESTART GAME
                    </button>
                    <button 
                      onClick={() => { setIsGameOver(false); setIsShowingAnswers(true); }}
                      className="flex items-center justify-center gap-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 text-xs md:text-sm tracking-widest uppercase"
                    >
                      <Eye size={18} /> VIEW ANSWER
                    </button>
                  </div>
                </div>
              )}

              {isShowingAnswers && !isGameOver && (
                <div className="space-y-4 md:space-y-6 animate-in slide-in-from-bottom-6 duration-600 px-1">
                  {/* Streak Ended Banner for "Lyrical Clues" selection */}
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-center">
                    <p className="text-rose-400 font-black uppercase text-xs tracking-widest mb-1">Streak Ended</p>
                    <p className="text-white font-bold text-sm">Final Score: <span className="text-amber-400 text-lg">{finalStreak}</span></p>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-amber-500 px-2 md:px-4">
                    <div className="flex items-center gap-2">
                      <Star size={14} fill="currentColor" />
                      <h4 className="font-black text-[9px] md:text-[10px] tracking-[0.2em] md:tracking-[0.3em] uppercase">Iconic Verse References</h4>
                    </div>
                  </div>
                  <div className="space-y-2 md:space-y-3">
                    {selectedWord.songs.map((song, i) => (
                      <div key={i} className="bg-white/5 p-3 md:p-5 rounded-2xl md:rounded-3xl border border-white/5 flex items-center justify-between group">
                        <div className="flex-1 pr-3">
                          <p className="text-amber-100 font-bold text-sm md:text-base leading-tight mb-1 tracking-tight">{song.title}</p>
                          <p className="text-slate-500 text-[9px] md:text-[10px] leading-relaxed italic line-clamp-2">"{song.lyrics}"</p>
                        </div>
                        <a 
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(song.title)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 hover:bg-amber-500 hover:text-slate-950 transition-all active:scale-90 flex-shrink-0"
                        >
                          <Play size={16} fill="currentColor" />
                        </a>
                      </div>
                    ))}
                  </div>
                  <button onClick={handleRestart} className="w-full bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-black py-3 md:py-5 rounded-xl md:rounded-2xl flex items-center justify-center gap-3 text-[9px] md:text-[10px] tracking-[0.2em] uppercase transition-all">
                    <Home size={16} /> EXIT THE STAGE
                  </button>
                </div>
              )}
            </div>

            <div className="p-3 md:p-5 bg-black/40 text-center border-t border-white/5 mt-auto">
               <button onClick={handlePickRandom} className="text-slate-600 hover:text-amber-500 flex items-center justify-center gap-2 mx-auto text-[9px] md:text-[10px] font-black tracking-widest transition-colors uppercase">
                 <RefreshCw size={12} /> NEW CHALLENGE
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-[120] bg-black/98 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/20 rounded-[2rem] md:rounded-[3rem] p-8 md:p-12 relative shadow-[0_0_100px_rgba(212,175,55,0.1)] overflow-y-auto max-h-[90vh]">
            <button onClick={() => setShowRules(false)} className="absolute right-6 top-6 text-slate-600 hover:text-white p-2 transition-colors"><X size={24} /></button>
            <h2 className="heading-font text-3xl md:text-4xl font-black text-amber-500 mb-8 md:mb-10 tracking-widest uppercase">RULES</h2>
            <div className="space-y-6 md:space-y-8 text-slate-400 font-medium leading-relaxed md:leading-loose text-xs md:text-sm">
              <p>I. Select your keyword from the tile selection or use the <span className="text-amber-200">Random Word</span> shuffle.</p>
              <p>II. Once selected, a <span className="text-amber-200">15-second countdown</span> tracks your time to sing.</p>
              <p>III. <span className="text-amber-200 font-bold underline">You MUST sing any Bollywood track featuring the chosen word.</span></p>
              <p>IV. Using <span className="text-amber-200">Lyrical Clues</span> will end your current streak but show you the answers.</p>
              <p>V. <span className="text-emerald-400 font-bold">STREAKS:</span> Successfully singing a song increases your current streak. A failure or timeout ends it!</p>
            </div>
            <button onClick={() => setShowRules(false)} className="w-full mt-10 md:mt-12 bg-amber-500 text-slate-950 font-black py-4 md:py-5 rounded-xl md:rounded-2xl shadow-2xl hover:brightness-110 active:translate-y-1 transition-all uppercase tracking-widest text-xs md:text-sm">COMMAND THE STAGE</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;