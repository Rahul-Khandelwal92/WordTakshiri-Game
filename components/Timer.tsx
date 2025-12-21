
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
    <div className="relative flex flex-col items-center justify-center scale-90 -my-2">
      {/* Hourglass Container */}
      <div className="relative w-28 h-36">
        <svg viewBox="0 0 100 140" className="w-full h-full drop-shadow-xl">
          <defs>
            <path id="hourglass-shape" d="
              M 20 10 
              H 80 
              C 80 10, 80 20, 75 30
              L 55 65
              C 52 70, 48 70, 45 65
              L 25 30
              C 20 20, 20 10, 20 10
              Z
              M 25 110
              L 45 75
              C 48 70, 52 70, 55 75
              L 75 110
              C 80 120, 80 130, 80 130
              H 20
              C 20 130, 20 120, 25 110
              Z
            " />
            <clipPath id="top-bulb">
              <rect x="0" y={10 + (60 * (1 - topRatio))} width="100" height="60" />
            </clipPath>
            <clipPath id="bottom-bulb">
              <rect x="0" y={130 - (60 * bottomRatio)} width="100" height="60" />
            </clipPath>
          </defs>

          <path 
            d="M 20 10 H 80 C 80 10, 80 20, 75 30 L 55 65 C 52 70, 48 70, 45 65 L 25 30 C 20 20, 20 10, 20 10 Z" 
            fill="rgba(255,255,255,0.05)" 
            stroke="rgba(255,255,255,0.2)" 
            strokeWidth="2"
          />
          <path 
            d="M 25 110 L 45 75 C 48 70, 52 70, 55 75 L 75 110 C 80 120, 80 130, 80 130 H 20 C 20 130, 20 120, 25 110 Z" 
            fill="rgba(255,255,255,0.05)" 
            stroke="rgba(255,255,255,0.2)" 
            strokeWidth="2"
          />

          <path 
            d="M 20 10 H 80 L 50 70 Z" 
            fill="#fbbf24" 
            clipPath="url(#top-bulb)"
            className="transition-all duration-1000 ease-linear"
          />

          <path 
            d="M 20 130 H 80 L 50 70 Z" 
            fill="#fbbf24" 
            clipPath="url(#bottom-bulb)"
            className="transition-all duration-1000 ease-linear"
          />

          {timeLeft > 0 && isActive && (
            <line 
              x1="50" y1="65" x2="50" y2="125" 
              stroke="#fbbf24" 
              strokeWidth="2" 
              strokeDasharray="4 4"
              className="animate-sand-flow"
            />
          )}

          <rect x="15" y="5" width="70" height="6" rx="3" fill="#334155" />
          <rect x="15" y="129" width="70" height="6" rx="3" fill="#334155" />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className={`text-4xl font-black transition-all ${
            timeLeft <= 5 ? 'text-rose-500 scale-110 animate-pulse' : 'text-white'
          }`} style={{ textShadow: '0 0 10px rgba(0,0,0,0.5)' }}>
            {timeLeft}
          </span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes sand-flow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -20; }
        }
        .animate-sand-flow {
          animation: sand-flow 0.5s linear infinite;
        }
      `}} />

      <p className={`mt-2 text-[10px] font-black tracking-widest uppercase transition-colors ${
        timeLeft <= 5 ? 'text-rose-500 animate-bounce' : 'text-amber-500'
      }`}>
        {timeLeft <= 5 ? 'SING NOW!' : 'CLOCK IS TICKING'}
      </p>
    </div>
  );
};
