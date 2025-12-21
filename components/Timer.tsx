
import React, { useState, useEffect } from 'react';

interface TimerProps {
  duration: number;
  onComplete: () => void;
  onTick?: (timeLeft: number) => void;
  isActive: boolean;
}

export const Timer: React.FC<TimerProps> = ({ duration, onComplete, onTick, isActive }) => {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    let timer: any;
    if (isActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          if (onTick) {
            onTick(next);
          }
          return next;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      onComplete();
    }
    return () => clearInterval(timer);
  }, [isActive, timeLeft, onComplete, onTick]);

  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);

  // Calculate percentages for the sand levels
  const topRatio = timeLeft / duration;
  const bottomRatio = 1 - topRatio;

  return (
    <div className="relative flex flex-col items-center justify-center scale-110">
      {/* Hourglass Container */}
      <div className="relative w-36 h-44">
        <svg viewBox="0 0 100 140" className="w-full h-full drop-shadow-[0_0_30px_rgba(212,175,55,0.2)]">
          <defs>
            <clipPath id="top-bulb-premium">
              <rect x="0" y={10 + (60 * (1 - topRatio))} width="100" height="60" />
            </clipPath>
            <clipPath id="bottom-bulb-premium">
              <rect x="0" y={130 - (60 * bottomRatio)} width="100" height="60" />
            </clipPath>
            <linearGradient id="sand-gold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="50%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>

          {/* Hourglass Glass */}
          <path 
            d="M 20 10 H 80 C 80 10, 80 20, 75 30 L 55 65 C 52 70, 48 70, 45 65 L 25 30 C 20 20, 20 10, 20 10 Z" 
            fill="rgba(255,255,255,0.01)" 
            stroke="rgba(255,255,255,0.1)" 
            strokeWidth="1"
          />
          <path 
            d="M 25 110 L 45 75 C 48 70, 52 70, 55 75 L 75 110 C 80 120, 80 130, 80 130 H 20 C 20 130, 20 120, 25 110 Z" 
            fill="rgba(255,255,255,0.01)" 
            stroke="rgba(255,255,255,0.1)" 
            strokeWidth="1"
          />

          {/* Sand Fill */}
          <path 
            d="M 20 10 H 80 L 50 70 Z" 
            fill="url(#sand-gold)" 
            clipPath="url(#top-bulb-premium)"
            className="transition-all duration-1000 ease-linear"
          />

          <path 
            d="M 20 130 H 80 L 50 70 Z" 
            fill="url(#sand-gold)" 
            clipPath="url(#bottom-bulb-premium)"
            className="transition-all duration-1000 ease-linear"
          />

          {/* Flow Line */}
          {timeLeft > 0 && isActive && (
            <line 
              x1="50" y1="65" x2="50" y2="125" 
              stroke="#d4af37" 
              strokeWidth="1" 
              strokeDasharray="2 3"
              className="animate-sand-trickle"
            />
          )}

          {/* End Caps */}
          <rect x="15" y="5" width="70" height="4" rx="2" fill="#d4af37" fillOpacity="0.8" />
          <rect x="15" y="131" width="70" height="4" rx="2" fill="#d4af37" fillOpacity="0.8" />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className={`text-4xl font-black heading-font transition-all ${
            timeLeft <= 5 ? 'text-rose-500 scale-125 animate-pulse' : 'text-amber-500/80'
          }`}>
            {timeLeft}
          </span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes sand-trickle {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -10; }
        }
        .animate-sand-trickle {
          animation: sand-trickle 0.3s linear infinite;
        }
      `}} />

      <p className={`mt-4 text-[9px] font-black tracking-[0.4em] uppercase transition-colors ${
        timeLeft <= 5 ? 'text-rose-500 animate-bounce' : 'text-amber-500/40'
      }`}>
        {timeLeft <= 5 ? 'FINAL CHANCE!' : 'THE TEMPO RISES'}
      </p>
    </div>
  );
};
