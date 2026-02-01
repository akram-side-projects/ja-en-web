
import React, { useEffect, useState, useMemo } from 'react';

interface Props {
  progress: number;
  isProcessing: boolean;
}

const NeuralBrain: React.FC<Props> = ({ progress, isProcessing }) => {
  // Library of phrases to simulate real-time processing
  const jaPhrases = useMemo(() => [
    "おはようございます", "信じられない...", "どこに行くの？", "ターゲットを確認",
    "力を合わせて", "未来のために", "準備はいいか？", "システムの再起動",
    "通信開始...", "翻訳プロトコル", "データの解析中", "完了しました"
  ], []);

  const enPhrases = useMemo(() => [
    "Good morning.", "I can't believe it...", "Where are you going?", "Target confirmed.",
    "Join our forces.", "For the sake of the future.", "Are you ready?", "System reboot.",
    "Starting comms...", "Translation protocol.", "Analyzing data...", "Task complete."
  ], []);

  const [activePhrases, setActivePhrases] = useState({ ja: "", en: "" });

  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        const idx = Math.floor(Math.random() * jaPhrases.length);
        setActivePhrases({
          ja: jaPhrases[idx],
          en: enPhrases[idx]
        });
      }, 150); // High speed updates
      return () => clearInterval(interval);
    }
  }, [isProcessing, jaPhrases, enPhrases]);

  return (
    <div className="w-full py-12 flex flex-col items-center">
      <div className="relative w-full max-w-5xl aspect-[21/9] flex items-center justify-between px-12 overflow-hidden glass-dark rounded-[2rem] border border-white/5">
        <div className="scanline opacity-20"></div>

        {/* Input: Transcription Stream */}
        <div className="w-1/3 h-full relative flex flex-col justify-center items-center overflow-hidden">
          <div className="absolute top-4 left-4 font-orbitron text-[8px] text-indigo-500/60 tracking-widest uppercase">JA_INPUT_STREAM</div>
          <div className="flex flex-col gap-2 items-center">
             <div className="text-xl font-bold text-indigo-400 animate-pulse tracking-widest font-japanese">
               {activePhrases.ja}
             </div>
             <div className="w-full h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
             <div className="text-[10px] font-mono text-indigo-300/30 opacity-50">
               RAW_PCM_BUFFER_0x{Math.floor(Math.random() * 9999).toString(16)}
             </div>
          </div>
        </div>

        {/* Central Neural Machine */}
        <div className="relative w-1/3 h-full flex items-center justify-center">
          <svg viewBox="0 0 400 300" className="w-full h-full drop-shadow-[0_0_20px_rgba(99,102,241,0.2)]">
            <circle cx="200" cy="150" r="80" fill="url(#brainGlow)" className={isProcessing ? "animate-pulse" : ""} />
            <defs>
              <radialGradient id="brainGlow">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>

            {/* Neural Synapses */}
            <g className="opacity-40">
              {[...Array(12)].map((_, i) => (
                <line 
                  key={i}
                  x1="140" y1={100 + i * 10} x2="260" y2={100 + i * 10}
                  stroke={i % 2 === 0 ? "#6366f1" : "#d946ef"}
                  strokeWidth="0.5"
                  className={isProcessing ? "animate-[dash_2s_linear_infinite]" : ""}
                  style={{ animationDelay: `${i * 0.1}s`, strokeDasharray: "4, 10" }}
                />
              ))}
            </g>

            <rect x="175" y="125" width="50" height="50" rx="8" fill="#020617" stroke="#6366f1" strokeWidth="1" className="animate-spin-slow" />
            <text x="200" y="155" textAnchor="middle" className="fill-white font-orbitron text-[14px] font-bold">
              {progress}%
            </text>
          </svg>
        </div>

        {/* Output: Translation Synthesis */}
        <div className="w-1/3 h-full relative flex flex-col justify-center items-center overflow-hidden">
          <div className="absolute top-4 right-4 font-orbitron text-[8px] text-fuchsia-500/60 tracking-widest uppercase">EN_SRT_SYNTH</div>
          <div className="flex flex-col gap-2 items-center">
             <div className="text-sm font-bold text-fuchsia-400 animate-pulse tracking-wide italic">
               "{activePhrases.en}"
             </div>
             <div className="w-full h-px bg-gradient-to-r from-transparent via-fuchsia-500/20 to-transparent"></div>
             <div className="text-[10px] font-mono text-fuchsia-300/30 opacity-50">
               SRT_BLOCK_SEQ_00{Math.floor(progress * 5)}
             </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dash {
          to { stroke-dashoffset: -100; }
        }
        .animate-spin-slow {
          animation: spin 10s linear infinite;
        }
        .font-japanese {
          font-family: "MS PGothic", "Hiragino Kaku Gothic ProN", sans-serif;
        }
      `}</style>
    </div>
  );
};

export default NeuralBrain;
