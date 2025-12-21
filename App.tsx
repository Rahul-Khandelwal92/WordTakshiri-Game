
import React, { useState, useMemo, useCallback } from 'react';
import { Search, Shuffle, RefreshCw, X, Info, Trophy, Music, Play, Timer as TimerIcon, Eye, CheckCircle, Sparkles, Volume2, Loader2 } from 'lucide-react';
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

const playTone = (freq: number, type: OscillatorType, duration: number, volume: number = 0.1) => {
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
  playTone(261.63, 'sine', 0.5); // C4
  setTimeout(() => playTone(329.63, 'sine', 0.5), 200); // E4
  setTimeout(() => playTone(392.00, 'sine', 0.8), 400); // G4
};

const playShuffleTick = () => {
  playTone(660 + Math.random() * 100, 'sine', 0.05, 0.03);
};

const playRandomReveal = () => {
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
    category: 'All',
    search: '',
  });

  const [selectedWord, setSelectedWord] = useState<BollywoodWord | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isShowingAnswers, setIsShowingAnswers] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Shuffling animation states
  const [isShuffling, setIsShuffling] = useState(false);
  const [shufflingWord, setShufflingWord] = useState<string>('');

  // Grouping logic for "All Others" bucket
  const { visibleCategories, othersCategories } = useMemo(() => {
    const counts: Record<string, number> = {};
    BOLLYWOOD_WORDS.forEach(w => {
      counts[w.category] = (counts[w.category] || 0) + 1;
    });
    const visible = Object.values(Category).filter(cat => counts[cat] >= 6);
    const others = Object.values(Category).filter(cat => counts[cat] > 0 && counts[cat] < 6);
    return { visibleCategories: visible, othersCategories: others };
  }, []);

  // Filter logic
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

    let count = 0;
    const maxCount = 20; 
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * BOLLYWOOD_WORDS.length);
      setShufflingWord(BOLLYWOOD_WORDS[randomIndex].word);
      playShuffleTick();
      count++;

      if (count >= maxCount) {
        clearInterval(interval);
        const finalWord = BOLLYWOOD_WORDS[Math.floor(Math.random() * BOLLYWOOD_WORDS.length)];
        setTimeout(() => {
          setIsShuffling(false);
          setSelectedWord(finalWord);
          playRandomReveal();
          triggerConfetti();
        }, 100);
      }
    }, 80); 
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

  const speakWord = async () => {
    if (!selectedWord || isSpeaking) return;
    
    setIsSpeaking(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    <div className="min-h-screen pb-20 px-4 pt-6 max-w-4xl mx-auto">
      {/* Header - Enhanced Visual Design */}
      <header className="mb-6 text-center group">
        <div className="relative inline-flex flex-col items-center">
          {/* Subtle Background Glow */}
          <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-rose-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          <div className="flex justify-center items-center gap-3 mb-2 relative">
            <div className="relative">
              <Music className="text-amber-500 animate-pulse" size={20} />
              <div className="absolute -inset-1 bg-amber-400/30 blur-sm rounded-full animate-ping" />
            </div>
            
            <h1 className="heading-font text-4xl md:text-6xl font-black tracking-[0.1em] leading-tight select-none">
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">WORD-</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-orange-400 via-rose-500 to-rose-700 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">TAKSHARI</span>
            </h1>

            <div className="relative">
              <Music className="text-rose-500 animate-pulse" size={20} />
              <div className="absolute -inset-1 bg-rose-400/30 blur-sm rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>
          
          <div className="flex items-center gap-2 relative">
            <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-slate-600" />
            <p className="text-slate-400 text-[9px] md:text-[11px] font-bold tracking-[0.3em] uppercase opacity-80 group-hover:opacity-100 group-hover:text-amber-400/80 transition-all">
              A Bollywood Singing Challenge
            </p>
            <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-slate-600" />
          </div>
        </div>
      </header>

      {/* Primary Action Button - Refined CTA size */}
      <div className="space-y-4 mb-8">
        <button 
          onClick={handlePickRandom}
          disabled={isShuffling}
          className="w-full relative flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 hover:from-amber-300 hover:to-rose-500 text-white font-black py-6 px-6 rounded-[2rem] shadow-[0_15px_40px_rgba(251,191,36,0.2)] transition-all active:scale-95 disabled:opacity-50 overflow-hidden group border-b-4 border-rose-800"
        >
          <div className="flex items-center gap-3">
             <Shuffle size={24} className={isShuffling ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'} />
             <span className="text-xl sm:text-2xl tracking-tight uppercase drop-shadow-md">PICK A RANDOM WORD</span>
          </div>
          <span className="text-[10px] sm:text-xs font-medium opacity-90 tracking-[0.25em] uppercase">Start your challenge</span>
          {isShuffling && <div className="absolute inset-0 bg-white/10 animate-pulse" />}
        </button>
        
        <div className="flex justify-center">
           <button 
            onClick={() => setShowRules(true)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-amber-400 font-bold text-[9px] uppercase tracking-[0.2em] transition-all bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800"
          >
            <Info size={12} />
            How to Play
          </button>
        </div>
      </div>

      {/* Upfront Filters & Search */}
      {!selectedWord && !isShuffling && (
        <div className="space-y-6 mb-8 bg-slate-900/50 p-6 rounded-3xl border border-slate-800 backdrop-blur-sm">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input 
              type="text" 
              placeholder="Search words (e.g. Dil, Pyaar)..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all shadow-inner"
            />
          </div>
          
          <div className="space-y-3">
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest block px-1">Themes</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilters(prev => ({ ...prev, category: 'All' }))}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  filters.category === 'All' 
                    ? 'bg-amber-500 border-amber-500 text-slate-900 shadow-lg shadow-amber-500/20' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              {visibleCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilters(prev => ({ ...prev, category: cat }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    filters.category === cat 
                      ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
              {othersCategories.length > 0 && (
                <button
                  onClick={() => setFilters(prev => ({ ...prev, category: 'All Others' }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    filters.category === 'All Others' 
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Others
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Words Grid */}
      {!selectedWord && !isShuffling && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {filteredWords.map((item) => (
            <WordCard key={item.id} item={item} onClick={handleWordClick} />
          ))}
          {filteredWords.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-600">
                <Search size={32} />
              </div>
              <p className="text-slate-500 font-medium">No matches found for your selection.</p>
              <button 
                onClick={() => setFilters({ category: 'All', search: '' })}
                className="text-amber-500 font-bold hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Shuffle Animation Overlay */}
      {isShuffling && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-xl flex flex-col items-center justify-center p-4">
          <div className="relative flex flex-col items-center">
            <div className="absolute -top-12 animate-bounce">
              <Sparkles className="text-amber-400 w-8 h-8" />
            </div>
            <div className="text-center space-y-4">
              <p className="text-amber-500 font-bold tracking-[0.3em] text-xs uppercase opacity-70">Shuffling Hits...</p>
              <div className="h-40 flex items-center justify-center">
                <h2 className="hindi-font text-8xl font-black text-white transition-all duration-75 scale-110 blur-[1px] animate-pulse">
                  {shufflingWord}
                </h2>
              </div>
              <div className="flex gap-2 justify-center">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail View Overlay */}
      {selectedWord && !isShuffling && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-amber-500/10 flex flex-col max-h-[90vh]">
            
            <div className="p-6 text-center border-b border-slate-800 relative">
              <button 
                onClick={resetGame}
                className="absolute right-4 top-4 text-slate-500 hover:text-white transition-colors p-2"
              >
                <X size={24} />
              </button>
              
              <div className="mb-2 flex justify-center gap-2 items-center">
                <span className="text-[10px] uppercase font-black bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700">
                  {selectedWord.category}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center gap-4 mb-2">
                <div className="flex items-center gap-4">
                  <h2 className="hindi-font text-6xl font-bold text-amber-400">
                    {selectedWord.word}
                  </h2>
                  <span className="text-5xl">{selectedWord.emoji}</span>
                </div>
                
                <button 
                  onClick={speakWord}
                  disabled={isSpeaking}
                  className="flex items-center gap-2 text-amber-500 hover:text-amber-400 font-bold text-sm bg-amber-500/10 px-4 py-2 rounded-full border border-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSpeaking ? <Loader2 className="animate-spin" size={16} /> : <Volume2 size={16} />}
                  HEAR PRONUNCIATION
                </button>
              </div>
              <p className="text-slate-400 text-xl font-light italic mt-2">
                {selectedWord.englishMeaning}
              </p>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              {!isTimerActive && !isShowingAnswers && (
                <div className="flex flex-col gap-4 py-8 animate-in zoom-in-95 duration-300">
                  <button 
                    onClick={startTimer}
                    className="flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black py-8 px-6 rounded-3xl shadow-xl shadow-amber-500/20 transition-all active:scale-95"
                  >
                    <TimerIcon size={32} />
                    <span className="text-xl">START TIMER</span>
                    <span className="text-[10px] font-normal opacity-80 uppercase tracking-widest">15 Seconds Challenge</span>
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
                    <span className="text-[10px] font-normal opacity-80 uppercase tracking-widest">Reveal Song Hints</span>
                  </button>
                </div>
              )}

              {isTimerActive && !isShowingAnswers && (
                <div className="flex flex-col items-center justify-center space-y-8 py-4 animate-in fade-in duration-500">
                  <Timer 
                    duration={15} 
                    onComplete={handleTimerComplete} 
                    onTick={handleTick}
                    isActive={true} 
                  />
                  
                  <div className="w-full max-w-xs space-y-4">
                    <div className="text-center space-y-2">
                      <p className="text-slate-300 text-lg">Quick! Sing a song with <br/><span className="text-amber-400 font-bold">"{selectedWord.word}"</span>!</p>
                    </div>

                    <button 
                      onClick={showAnswers}
                      className="w-full relative flex items-center justify-center gap-4 bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-700 hover:from-emerald-300 hover:to-teal-600 text-white font-black py-4 px-6 rounded-[1.5rem] shadow-[0_12px_24px_rgba(16,185,129,0.25)] border-b-4 border-emerald-900 transition-all active:scale-95 active:border-b-0 group overflow-hidden"
                    >
                      <div className="bg-white/20 p-2 rounded-full group-hover:scale-110 transition-transform shadow-inner">
                        <CheckCircle size={22} className="drop-shadow-sm" />
                      </div>
                      <div className="text-left flex flex-col">
                        <span className="text-xl leading-tight uppercase tracking-tight drop-shadow-md">DONE!</span>
                        <span className="text-[10px] font-bold opacity-90 uppercase tracking-[0.1em] -mt-0.5">Show more answers</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

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
                          <p className="text-slate-400 text-[10px] italic">"{song.lyrics}"</p>
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
                      handlePickRandom();
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
                className="text-slate-500 hover:text-amber-400 flex items-center justify-center gap-2 mx-auto text-xs font-medium transition-colors"
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
                <p>Use <span className="text-amber-400 font-bold">Hear Pronunciation</span> to learn the word.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-500 font-bold border border-amber-500/30">3</div>
                <p>Choose to <span className="text-amber-400 font-bold">Start Timer</span> (15s) or <span className="text-amber-400 font-bold">Show Answers</span> immediately.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-500 font-bold border border-amber-500/30">4</div>
                <p>If the timer runs out, songs are revealed. Sing to win!</p>
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
