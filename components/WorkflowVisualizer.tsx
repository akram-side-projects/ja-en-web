
import React from 'react';

interface Props {
  progress: number;
}

const WorkflowVisualizer: React.FC<Props> = ({ progress }) => {
  const stages = [
    { id: 'INGEST', label: 'Ingestion', threshold: 0 },
    { id: 'PARSE', label: 'Tokenization', threshold: 25 },
    { id: 'NEURAL', label: 'Inference', threshold: 50 },
    { id: 'SYNTH', label: 'Synthesis', threshold: 75 },
    { id: 'RECON', label: 'Recon', threshold: 95 },
  ];

  return (
    <div className="w-full py-12">
      <div className="relative flex justify-between max-w-2xl mx-auto">
        {/* Connecting Lines */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 -translate-y-1/2 z-0">
          <div 
            className="h-full bg-indigo-500 transition-all duration-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {stages.map((stage, idx) => {
          const isActive = progress >= stage.threshold;
          const isCurrent = progress >= stage.threshold && (idx === stages.length - 1 || progress < stages[idx+1].threshold);
          
          return (
            <div key={stage.id} className="relative z-10 flex flex-col items-center">
              <div 
                className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all duration-500 ${
                  isActive 
                    ? 'bg-indigo-600 border-indigo-400 neon-glow scale-110' 
                    : 'bg-slate-900 border-slate-700'
                } ${isCurrent ? 'animate-pulse ring-4 ring-indigo-500/20' : ''}`}
              >
                <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-white animate-flicker' : 'bg-slate-700'}`}></div>
              </div>
              <span className={`absolute -bottom-8 font-orbitron text-[8px] uppercase tracking-widest transition-colors ${
                isActive ? 'text-white' : 'text-slate-600'
              }`}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Data Flow Particles (Simulated with simple CSS) */}
      {progress > 0 && progress < 100 && (
        <div className="mt-16 flex justify-center space-x-2">
          {[1, 2, 3].map(i => (
            <div 
              key={i} 
              className="w-1 h-1 bg-indigo-400 rounded-full animate-ping" 
              style={{ animationDelay: `${i * 0.4}s` }}
            ></div>
          ))}
          <span className="text-[10px] font-mono text-indigo-500/60 uppercase tracking-widest">Streaming Neural Packets...</span>
        </div>
      )}
    </div>
  );
};

export default WorkflowVisualizer;
