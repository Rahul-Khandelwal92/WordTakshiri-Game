import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Search, Shuffle, RefreshCw, X, Info, Trophy, Music, Play, Timer as TimerIcon, Eye, CheckCircle, Sparkles, Volume2, VolumeX, Loader2, HelpCircle, Home, Mic2, Star, BookOpen, RotateCcw, Flame } from 'lucide-react';
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
  
  // Background Music States
  const [isMuted, setIsMuted] = useState(false);
  const [hasStartedAudio, setHasStartedAudio] = useState(false);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  
  // Streak States
  const [streak, setStreak] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [finalStreak, setFinalStreak] = useState(0);

  const [isShuffling, setIsShuffling] = useState(false);
  const [shufflingWord, setShufflingWord] = useState<string>('');

  // Background Music Setup
  useEffect(() => {
    // Light focus lofi track
    const audio = new Audio('https://cdn.pixabay.com/audio/2022/05/27/audio_1808d304ad.mp3');
    audio.loop = true;
    audio.volume = 0.08; 
    bgMusicRef.current = audio;

    const initAudio = () => {
      if (bgMusicRef.current && !isMuted) {
        bgMusicRef.current.play().then(() => {
          setHasStartedAudio(true);
        }).catch(e => console.log("Audio play deferred:", e));
      }
      if (gameAudioCtx.state === 'suspended') {
        gameAudioCtx.resume();
      }
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };

    window.addEventListener('click', initAudio);
    window.addEventListener('touchstart', initAudio);
    
    return () => {
      audio.pause();
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
  }, []);

  useEffect(() => {
    if (bgMusicRef.current) {
      if (isMuted) {
        bgMusicRef.current.pause();
      } else if (hasStartedAudio) {
        bgMusicRef.current.play().catch(() => {});
      }
    }
  }, [isMuted, hasStartedAudio]);

  // Duck music when TTS is speaking
  useEffect(() => {
    if (bgMusicRef.current) {
      bgMusicRef.current.volume = isSpeaking ? 0.02 : 0.08;
    }
  }, [isSpeaking]);

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

    const finalWord = BOLLYWOOD_WORDS[Math.floor(Math.random() * BOLLYWOOD_WORDS.length)];
    let count = 0;
    const maxCount = 20;
    
    const interval = setInterval(() => {
      count++;
      playShuffleTick();
      
      if (count >= maxCount) {
        setShufflingWord(finalWord.word);
        clearInterval(interval);
        
        setTimeout(() => {
          setIsShuffling(false);
          setSelectedWord(finalWord);
          triggerConfetti();
          playStartTune();
        }, 600);
      } else {
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
    <div className="min-h-screen pb-24 px-4 pt-4 md:pt-10 max-w-5xl mx-auto selection:bg-amber-500/30">
      {/* PERSISTENT STREAK COUNTER - ELEVATED Z-INDEX & FIXED AT THE TOP RIGHT */}
      <div className="fixed top-4 right-4 md:top-6 md:right-8 z-[500] pointer-events-none">
        <div 
          key={streak} 
          className={`flex items-center gap-2 md:gap-3 bg-slate-900/90 backdrop-blur-2xl border-2 px-3 py-1.5 md:px-5 md:py-2 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.2)] transition-all duration-500 ${
            streak > 0 
              ? 'border-amber-400 scale-100 md:scale-110 shadow-[0_0_50px_rgba(245,158,11,0.4)] animate-in zoom-in-95 bounce-in' 
              : 'border-white/10 opacity-70 scale-90'
          }`}
        >
          <div className="relative">
            <Flame 
              size={18}
              className={`${streak > 0 ? 'text-orange-500 animate-pulse' : 'text-slate-500'} md:w-6 md:h-6`} 
              fill={streak > 0 ? "currentColor" : "none"} 
            />
            {streak > 0 && (
              <div className="absolute inset-0 bg-orange-600 blur-xl opacity-40 animate-ping" />
            )}
          </div>
          <div className="flex flex-col items-center leading-none">
            <span className={`text-[7px] md:text-[9px] font-black uppercase tracking-[0.15em] mb-0.5 ${streak > 0 ? 'text-amber-300' : 'text-slate-500'}`}>
              Streak
            </span>
            <span className={`text-base md:text-2xl font-black ${streak > 0 ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'text-slate-500'}`}>
              {streak}
            </span>
          </div>
        </div>
      </div>

      {/* Background Music Toggle */}
      <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[110]">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className={`w-11 h-11 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl border group ${
            isMuted 
              ? 'bg-slate-900/80 border-white/10 text-slate-500' 
              : 'bg-amber-500 border-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
          }`}
        >
          <div className={`absolute inset-0 rounded-full bg-amber-500/20 ${!isMuted ? 'animate-ping' : ''}`} />
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={20} className="group-hover:scale-110 transition-transform" />}
        </button>
      </div>

      {/* Header - Balanced for Streak visibility */}
      <header className="mb-10 md:mb-12 text-center group mt-16 md:mt-4 px-2">
        <div className="relative inline-flex flex-col items-center max-w-full">
          <div className="flex justify-center items-center gap-2 md:gap-4 mb-2 relative">
            <Mic2 className="text-amber-500/60 animate-pulse hidden xs:block" size={18} />
            <h1 className="heading-font text-2xl sm:text-5xl md:text-7xl font-black tracking-tight gold-gradient-text drop-shadow-2xl gold-glow">
              WORD-TAKSHARI
            </h1>
            <Music className="text-amber-500/60 animate-pulse hidden xs:block" style={{ animationDelay: '0.5s' }} size={18} />
          </div>
          <p className="text-amber-500/40 text-[7px] md:text-xs font-bold tracking-[0.2em] md:tracking-[0.5em] uppercase opacity-80">
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
             <Shuffle size={24} className={`${isShuffling ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'} text-amber-100 md:w-8 md:h-8`} />
             <div className="text-left">
                <span className="block text-base md:text-2xl font-black heading-font tracking-wide text-white uppercase">RANDOM START</span>
                <span className="block text-[8px] md:text-[10px] uppercase font-bold text-amber-200/50 tracking-widest">Shuffle Melodies</span>
             </div>
          </div>
        </button>

        <button 
          onClick={() => setShowRules(true)}
          className="sm:w-48 bg-slate-900/40 hover:bg-slate-900/60 p-4 md:p-8 rounded-2xl md:rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-1 transition-all group shadow-xl"
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
                placeholder="Search lyrics..."
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
              <p className="text-amber-500 font-black tracking-[0.3em] md:tracking-[0.5em] text-[8px] md:text-[10px] uppercase mb-8 md:mb-12 opacity-60">Shuffling...</p>
              <div className="h-32 md:h-48 flex items-center justify-center">
                <h2 className="hindi-font text-5xl md:text-8xl font-black text-white transition-all blur-[1px] scale-110 animate-in zoom-in-90 duration-75 px-4 text-center">
                  {shufflingWord}
                </h2>
              </div>
              <Sparkles className="text-amber-500/30 mx-auto mt-6 md:mt-8 animate-bounce" size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Detail View Overlay - REDESIGNED FOR MOBILE CLARITY */}
      {selectedWord && !isShuffling && (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl flex flex-col p-4 animate-in fade-in duration-300 overflow-hidden">
          
          {/* TOP BAR / SAFE ZONE FOR STREAK & CLOSE */}
          <div className="flex items-center justify-between w-full h-16 px-2 mb-2 relative z-[160]">
             {/* Position Close button opposite of Streak HUD */}
            <button onClick={resetGame} className="text-slate-500 hover:text-white p-3 transition-colors bg-white/5 hover:bg-white/10 rounded-full border border-white/5">
              <X size={24} />
            </button>
            
            {/* Empty space here because Streak is Fixed viewport-wide above this z-index */}
            <div className="w-20" /> 
          </div>

          <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto no-scrollbar pb-10">
            <div className="w-full max-w-xl bg-slate-900 border border-amber-500/20 rounded-[2.5rem] md:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col relative animate-in zoom-in-95 duration-300">
              
              <div className={`p-6 md:p-10 text-center relative border-b border-white/5 transition-all ${isTimerActive || isGameOver || isShowingAnswers ? 'pt-10 pb-4' : 'py-10 md:py-16'}`}>
                <div className={`flex flex-col items-center justify-center gap-4 md:gap-6`}>
                  <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 px-2">
                    <h2 className={`hindi-font font-black text-amber-400 gold-glow break-words transition-all ${isTimerActive || isGameOver || isShowingAnswers ? 'text-4xl md:text-6xl' : 'text-5xl md:text-8xl'}`}>
                      {selectedWord.word}
                    </h2>
                    <span className={`transition-all ${isTimerActive || isGameOver || isShowingAnswers ? 'text-3xl md:text-5xl' : 'text-4xl md:text-7xl'}`}>{selectedWord.emoji}</span>
                  </div>
                  
                  {!isTimerActive && !isGameOver && !isShowingAnswers && (
                    <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4">
                      <div className="space-y-3">
                        <button 
                          onClick={speakWord}
                          disabled={isSpeaking}
                          className="flex items-center gap-2 text-amber-200 hover:text-white font-bold text-[9px] md:text-[10px] tracking-widest uppercase bg-white/5 px-6 md:px-8 py-2 md:py-3 rounded-full border border-white/10 active:scale-95 transition-all disabled:opacity-50 mx-auto"
                        >
                          {isSpeaking ? <Loader2 className="animate-spin" size={12} /> : <Volume2 size={12} />}
                          SPEAK IT
                        </button>
                        <p className="text-slate-400 text-base md:text-xl font-medium tracking-tight italic px-4">
                          "{selectedWord.englishMeaning}"
                        </p>
                      </div>

                      <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 md:p-6 shadow-xl max-w-xs mx-auto">
                         <p className="text-amber-400 text-[9px] font-black uppercase tracking-widest mb-1">Target</p>
                         <p className="text-white text-xs md:text-sm font-bold">Sing a song with <span className="text-amber-400">"{selectedWord.word}"</span></p>
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
                      className="flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-black py-6 md:py-8 rounded-2xl md:rounded-3xl shadow-2xl hover:brightness-110 active:scale-[0.98] transition-all"
                    >
                      <TimerIcon size={24} />
                      <span className="text-sm heading-font tracking-widest">SING NOW</span>
                    </button>

                    <button 
                      onClick={showAnswers}
                      className="flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-amber-500 font-bold py-6 md:py-8 rounded-2xl md:rounded-3xl border border-white/5 transition-all active:scale-[0.98]"
                    >
                      <Eye size={24} />
                      <span className="text-sm heading-font tracking-widest uppercase">Reveal Hints</span>
                    </button>
                  </div>
                )}

                {isTimerActive && !isShowingAnswers && !isGameOver && (
                  <div className="flex flex-col items-center justify-center space-y-6 md:space-y-12">
                    <div className="scale-90 md:scale-110">
                      <Timer 
                        duration={15} 
                        onComplete={handleDefeat} 
                        onTick={(left) => playTickSound(left)}
                        isActive={true} 
                      />
                    </div>
                    
                    <div className="w-full space-y-6 max-w-sm mx-auto">
                      <div className="flex gap-4 h-20 md:h-24 px-2">
                        <button 
                          onClick={handleVictory}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-xl flex flex-col items-center justify-center gap-1 transition-all active:translate-y-1"
                        >
                          <CheckCircle size={22} />
                          <span className="text-[10px] md:text-xs uppercase tracking-wide">NAILED IT</span>
                        </button>

                        <button 
                          onClick={handleDefeat}
                          className="flex-1 bg-slate-800 text-slate-400 font-bold rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
                        >
                          <HelpCircle size={22} className="text-amber-500" />
                          <span className="text-[10px] md:text-xs uppercase tracking-wide">NO IDEA</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {isGameOver && (
                  <div className="flex flex-col items-center justify-center py-4 md:py-8 animate-in zoom-in-95">
                    <div className="relative mb-6">
                      <div className="absolute -inset-10 bg-amber-500/10 blur-3xl rounded-full" />
                      <div className="relative bg-gradient-to-br from-amber-400 to-amber-700 p-8 rounded-full border-4 border-amber-300 shadow-2xl">
                        <Trophy size={48} className="text-slate-950" />
                      </div>
                    </div>
                    
                    <h3 className="heading-font text-2xl md:text-4xl font-black text-white mb-2 uppercase tracking-tighter">FINALE</h3>
                    <div className="flex items-center gap-3 mb-8">
                      <span className="text-slate-500 font-black text-xl tracking-widest uppercase">STREAK:</span>
                      <span className="text-amber-400 font-black text-5xl gold-glow">{finalStreak}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-sm mx-auto">
                      <button onClick={handleRestart} className="bg-white/10 hover:bg-white/20 text-white font-black py-4 rounded-xl border border-white/5 transition-all active:scale-95 text-xs tracking-widest uppercase">
                        REPLAY
                      </button>
                      <button onClick={() => { setIsGameOver(false); setIsShowingAnswers(true); }} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-4 rounded-xl shadow-xl transition-all active:scale-95 text-xs tracking-widest uppercase">
                        LYRICS
                      </button>
                    </div>
                  </div>
                )}

                {isShowingAnswers && !isGameOver && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-6 max-w-sm mx-auto">
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-center">
                      <p className="text-rose-400 font-black uppercase text-[10px] tracking-widest mb-1">Result</p>
                      <p className="text-white font-bold text-lg">Score: {finalStreak}</p>
                    </div>

                    <div className="space-y-3">
                      {selectedWord.songs.map((song, i) => (
                        <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between group">
                          <div className="flex-1 pr-3">
                            <p className="text-amber-100 font-bold text-sm leading-tight mb-1">{song.title}</p>
                            <p className="text-slate-500 text-[10px] italic line-clamp-1">"{song.lyrics}"</p>
                          </div>
                          <a 
                            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(song.title)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 hover:bg-amber-500 hover:text-slate-950 transition-all active:scale-90"
                          >
                            <Play size={14} fill="currentColor" />
                          </a>
                        </div>
                      ))}
                    </div>
                    <button onClick={handleRestart} className="w-full bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-black py-4 rounded-xl flex items-center justify-center gap-3 text-[10px] tracking-widest uppercase transition-all">
                      <Home size={16} /> MAIN SCREEN
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 bg-black/40 text-center border-t border-white/5 mt-auto">
                 <button onClick={handlePickRandom} className="text-slate-600 hover:text-amber-500 flex items-center justify-center gap-2 mx-auto text-[9px] font-black tracking-widest transition-colors uppercase">
                   <RefreshCw size={12} /> NEW WORD
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRules && (
        <div className="fixed inset-0 z-[600] bg-black/98 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/20 rounded-[2.5rem] p-8 relative shadow-2xl overflow-y-auto max-h-[90vh]">
            <button onClick={() => setShowRules(false)} className="absolute right-6 top-6 text-slate-600 hover:text-white p-2 transition-colors"><X size={24} /></button>
            <h2 className="heading-font text-3xl font-black text-amber-500 mb-8 tracking-widest uppercase">RULES</h2>
            <div className="space-y-6 text-slate-400 font-medium leading-relaxed text-sm">
              <p>I. Select a Bollywood keyword to start.</p>
              <p>II. You have <span className="text-amber-200">15 seconds</span> to sing a song with that word.</p>
              <p>III. <span className="text-amber-200">GIVING UP</span> shows lyrics but resets your streak.</p>
              <p>IV. <span className="text-emerald-400 font-bold">STREAKS:</span> Keep singing without help to build your score!</p>
            </div>
            <button onClick={() => setShowRules(false)} className="w-full mt-10 bg-amber-500 text-slate-950 font-black py-4 rounded-xl shadow-xl hover:brightness-110 active:translate-y-1 transition-all uppercase tracking-widest text-sm">LET'S GO</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;