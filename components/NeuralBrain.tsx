
import React, { useEffect, useState, useRef } from 'react';
import { SubtitleItem } from '../types';

interface Props {
  progress: number;
  originalSubs: SubtitleItem[];
  currentTranslations: string[];
}

const NeuralBrain: React.FC<Props> = ({ progress, originalSubs, currentTranslations }) => {
  const [activeNode, setActiveNode] = useState(0);
  const [streamPairs, setStreamPairs] = useState<{ ja: string; en: string; id: number }[]>([]);
  const lastIndexRef = useRef(0);

  useEffect(() => {
    if (progress < 20) setActiveNode(1);
    else if (progress < 40) setActiveNode(2);
    else if (progress < 60) setActiveNode(3);
    else if (progress < 80) setActiveNode(4);
    else setActiveNode(5);
  }, [progress]);

  // Feed the visualizer with real data as it becomes available
  useEffect(() => {
    if (currentTranslations.length > 0) {
      // Get the latest batch of pairs
      const start = Math.max(0, currentTranslations.length - 10);
      const latestPairs = currentTranslations.slice(start).map((en, idx) => ({
        ja: originalSubs[start + idx]?.text || "...",
        en: en,
        id: Date.now() + idx
      }));
      setStreamPairs(latestPairs);
    }
  }, [currentTranslations, originalSubs]);

  return (
    <div className="w-full py-8 flex flex-col items-center">
      <div className="relative w-full max-w-4xl aspect-[21/9] flex items-center justify-between px-4 overflow-hidden">
        
        {/* Real-time Japanese Input Ticker */}
        <div className="w-1/3 h-full relative flex flex-col justify-center overflow-hidden border-r border-indigo-500/10">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent"></div>
          <div className="flex flex-col gap-2 animate-[slide_1.5s_linear_infinite]">
            {originalSubs.slice(Math.floor(progress * originalSubs.length / 100), Math.floor(progress * originalSubs.length / 100) + 8).map((sub, i) => (
              <div 
                key={sub.id + i} 
                className="text-[10px] font-medium text-indigo-400/40 whitespace-nowrap overflow-hidden text-ellipsis px-4"
                style={{ opacity: 1 - (i * 0.12) }}
              >
                {sub.text}
              </div>
            ))}
          </div>
          <div className="absolute bottom-2 left-4 text-[8px] font-orbitron text-indigo-500 tracking-[0.3em] uppercase bg-[#020617] px-2">JA_UPLINK</div>
        </div>

        {/* Central Neural Machine */}
        <div className="relative w-1/3 h-full flex items-center justify-center">
          <svg viewBox="0 0 400 300" className="w-full h-full">
            {/* Core Glow */}
            <circle cx="200" cy="150" r="60" fill="url(#coreGradient)" className="animate-pulse" />
            <defs>
              <radialGradient id="coreGradient">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                <stop offset="70%" stopColor="#d946ef" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#020617" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Neural Matrix Lines */}
            <g className="opacity-20">
              {[...Array(12)].map((_, i) => (
                <line 
                  key={i}
                  x1="120" y1={80 + i * 12} x2="280" y2={80 + i * 12} 
                  stroke="white" strokeWidth="0.2"
                  className="animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </g>

            {/* Processing Core */}
            <rect x="170" y="120" width="60" height="60" rx="12" fill="none" stroke="#6366f1" strokeWidth="1" className="animate-spin-slow" />
            <rect x="180" y="130" width="40" height="40" rx="8" fill="none" stroke="#d946ef" strokeWidth="1" className="animate-[spin_4s_linear_infinite_reverse]" />
            
            <text x="200" y="155" textAnchor="middle" className="fill-white font-orbitron text-[14px] font-bold tracking-widest">
              {progress}%
            </text>
          </svg>
          
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
             <div className="w-32 h-32 border border-white/5 rounded-full animate-ping opacity-10"></div>
          </div>
        </div>

        {/* Real-time English Output Ticker */}
        <div className="w-1/3 h-full relative flex flex-col justify-center overflow-hidden border-l border-fuchsia-500/10">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-fuchsia-500/5 to-transparent"></div>
          <div className="flex flex-col gap-2 animate-[slide_1.2s_linear_infinite]">
            {currentTranslations.slice(-8).reverse().map((text, i) => (
              <div 
                key={i} 
                className="text-[10px] font-bold text-fuchsia-400 whitespace-nowrap overflow-hidden text-ellipsis px-4"
                style={{ opacity: 1 - (i * 0.12) }}
              >
                {text}
              </div>
            ))}
          </div>
          <div className="absolute bottom-2 right-4 text-[8px] font-orbitron text-fuchsia-500 tracking-[0.3em] uppercase bg-[#020617] px-2">EN_SYNTH</div>
        </div>
      </div>

      {/* High-Speed Status Line */}
      <div className="w-full max-w-2xl px-8 py-2 bg-white/5 rounded-full border border-white/5 flex items-center justify-between font-mono text-[9px] uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-flicker"></div>
          <span className="text-indigo-400">Stream: Active</span>
        </div>
        <div className="text-slate-500">
          Latency: <span className="text-green-500">0.42ms</span> • Buffer: <span className="text-white">OPTIMIZED</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-fuchsia-400">Layer: {activeNode}</span>
          <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 animate-flicker"></div>
        </div>
      </div>

      <style>{`
        @keyframes slide {
          from { transform: translateY(0); }
          to { transform: translateY(-20px); }
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default NeuralBrain;
