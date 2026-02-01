
import React, { useState, useRef, useEffect } from 'react';
import { SubtitleItem, AppStep, ProcessingState } from './types';
import { parseSRT, generateSRT, downloadBlob } from './utils/srtUtils';
import { translateTexts } from './services/translationService';
import Features from './components/Features';
import Transparency from './components/Transparency';
import NeuralBrain from './components/NeuralBrain';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.IDLE);
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    currentTask: '',
    error: null,
  });
  
  const [logs, setLogs] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [originalSubs, setOriginalSubs] = useState<SubtitleItem[]>([]);
  const [translatedSubs, setTranslatedSubs] = useState<SubtitleItem[]>([]);
  const [currentTranslations, setCurrentTranslations] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-15), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.srt')) {
      alert('System error: Expected .srt format.');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseSRT(content);
      if (parsed.length === 0) {
        alert('Data corruption: Could not parse subtitle blocks.');
        return;
      }
      setOriginalSubs(parsed);
      setStep(AppStep.IDLE);
    };
    reader.readAsText(file);
  };

  const startTranslation = async () => {
    if (originalSubs.length === 0) return;

    setStep(AppStep.PROCESSING);
    setCurrentTranslations([]);
    setLogs(['Initializing Neural Translation Protocol...', 'Target: Japanese (UTF-8) -> English', 'Allocating temporary cache blocks...']);
    
    setProcessing({
      isProcessing: true,
      progress: 0,
      currentTask: 'Connecting to Neural Core...',
      error: null,
    });

    try {
      const textsToTranslate = originalSubs.map(s => s.text);
      
      const translations = await translateTexts(textsToTranslate, (prog, partial) => {
        setCurrentTranslations(prev => [...prev, ...partial]);
        setProcessing(prev => ({ 
          ...prev, 
          progress: prog,
          currentTask: prog < 100 ? 'Synthesizing Linguistics...' : 'Finalizing output stream...'
        }));
        
        if (prog % 10 === 0) {
          addLog(`Processed chunk: ${prog}% synchronization complete...`);
        }
      });

      addLog('Stream verified. Finalizing structure...');

      const translatedItems: SubtitleItem[] = originalSubs.map((item, idx) => ({
        ...item,
        text: translations[idx] || item.text
      }));

      setTimeout(() => {
        setTranslatedSubs(translatedItems);
        setStep(AppStep.COMPLETED);
        setProcessing(prev => ({ ...prev, isProcessing: false }));
      }, 800);
      
    } catch (err) {
      setProcessing({
        isProcessing: false,
        progress: 0,
        currentTask: '',
        error: 'Terminal Error: Translation link severed.',
      });
      setStep(AppStep.IDLE);
    }
  };

  const handleDownload = () => {
    if (translatedSubs.length === 0) return;
    const content = generateSRT(translatedSubs);
    const newFileName = fileName.replace('.srt', '_SubGlot_EN.srt');
    downloadBlob(content, newFileName);
  };

  const reset = () => {
    setStep(AppStep.IDLE);
    setOriginalSubs([]);
    setTranslatedSubs([]);
    setCurrentTranslations([]);
    setFileName('');
    setLogs([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-[#020617]">
      {/* Refined Glowing Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] bg-indigo-500/5 blur-[100px] rounded-full animate-float"></div>
        <div className="absolute bottom-[20%] right-[10%] w-[25%] h-[25%] bg-fuchsia-500/5 blur-[80px] rounded-full animate-float" style={{ animationDelay: '3s' }}></div>
      </div>

      <nav className="border-b border-white/5 glass-dark sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={reset}>
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center neon-glow group-hover:scale-110 transition-transform duration-300">
                <span className="text-white font-orbitron font-bold text-lg">S</span>
              </div>
              <span className="font-orbitron font-bold text-xl tracking-widest text-white group-hover:text-indigo-400 transition-colors duration-300">SUBGLOT</span>
            </div>
            <div className="text-[10px] font-mono text-indigo-500/60 tracking-widest uppercase">
              System Ver: <span className="text-white">2.5.0</span> • Node: <span className="text-green-500 animate-pulse">ACTIVE</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow flex flex-col items-center py-12 px-6 z-10">
        {step === AppStep.IDLE && (
          <div className="w-full max-w-5xl space-y-24 animate-in fade-in zoom-in-95 duration-1000">
            <div className="space-y-12">
              <div className="text-center space-y-4">
                <h1 className="text-5xl md:text-7xl font-bold font-orbitron tracking-tight text-white leading-tight uppercase">
                  Japanese <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400 neon-text">Subtitle Neural Link</span>
                </h1>
                <p className="text-lg text-slate-400 max-w-xl mx-auto font-light">
                  Professional translation protocol optimized for subtitles, conversational drama, and emotional context.
                </p>
              </div>

              <div className="max-w-3xl mx-auto">
                <div className="glass-dark rounded-3xl p-1 relative overflow-hidden group transition-all duration-500 hover:neon-border-subtle">
                  <div className="scanline opacity-20 group-hover:opacity-40 transition-opacity"></div>
                  <div className="bg-[#0b1121]/90 p-12 rounded-[1.4rem] border border-white/5 flex flex-col items-center justify-center min-h-[350px]">
                    {!fileName ? (
                      <>
                        <div className="w-20 h-20 bg-indigo-600/5 rounded-full flex items-center justify-center mb-6 border border-indigo-500/20 group-hover:scale-110 transition-transform duration-500">
                          <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-orbitron font-bold text-white tracking-widest uppercase mb-2 text-center">Establish Source Link</h3>
                        <p className="text-slate-500 text-sm font-mono mb-8 italic">Secure .SRT data pipeline</p>
                        
                        <input 
                          type="file" 
                          accept=".srt" 
                          onChange={handleFileUpload}
                          ref={fileInputRef}
                          className="hidden"
                          id="file-upload"
                        />
                        <label 
                          htmlFor="file-upload"
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-xl font-orbitron font-bold tracking-widest text-sm transition shadow-lg hover:shadow-indigo-500/20 active:scale-95 cursor-pointer uppercase border border-indigo-400/30"
                        >
                          Select SRT File
                        </label>
                      </>
                    ) : (
                      <div className="w-full space-y-8">
                        <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/10 group-hover:border-indigo-500/30 transition">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                              <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-bold text-white font-orbitron text-sm">{fileName}</p>
                              <p className="text-indigo-400 font-mono text-[10px] tracking-widest mt-0.5">{originalSubs.length} DATA BLOCKS DETECTED</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {setFileName(''); setOriginalSubs([]);}}
                            className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-500 rounded-lg transition"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        
                        <button 
                          onClick={startTranslation}
                          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-5 rounded-xl font-orbitron font-bold text-lg hover:scale-[1.01] transition shadow-2xl hover:shadow-indigo-600/30 tracking-[0.2em] uppercase border border-white/10"
                        >
                          Execute Protocol
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Features />
            <Transparency />
          </div>
        )}

        {step === AppStep.PROCESSING && (
          <div className="w-full max-w-5xl space-y-12 animate-in fade-in duration-500">
            <div className="glass-dark p-10 rounded-[2.5rem] border border-indigo-500/20 relative overflow-hidden text-center">
              <div className="scanline opacity-20"></div>
              
              <div className="space-y-4 mb-4">
                <h2 className="text-3xl font-orbitron font-bold text-white tracking-[0.2em] uppercase">Neural Transcription Core</h2>
                <p className="text-indigo-400 font-mono text-xs uppercase tracking-widest">Processing Layer: {processing.progress}% Synchronized</p>
              </div>

              {/* High-Speed Real Data Visualization */}
              <NeuralBrain 
                progress={processing.progress} 
                originalSubs={originalSubs} 
                currentTranslations={currentTranslations}
              />

              <div className="mt-8 space-y-6">
                <div className="max-w-xl mx-auto">
                  <div className="relative h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all duration-300"
                      style={{ width: `${processing.progress}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.3em] animate-pulse">
                  {processing.currentTask}
                </p>
              </div>
            </div>

            <div className="glass-dark p-6 rounded-2xl border border-white/5 font-mono text-[10px] h-[250px] overflow-hidden flex flex-col max-w-2xl mx-auto w-full">
              <div className="flex items-center gap-2 mb-4 text-slate-500 uppercase tracking-tighter border-b border-white/5 pb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                Linguistic Analysis Stream
              </div>
              <div className="flex-grow overflow-y-auto space-y-1.5 scrollbar-hide text-indigo-300/60">
                {logs.map((log, i) => (
                  <div key={i} className="animate-in slide-in-from-left-2 duration-300">
                    <span className="text-indigo-500/40 mr-2">sys_node://</span>
                    {log}
                  </div>
                ))}
                <div ref={logEndRef}></div>
              </div>
            </div>
          </div>
        )}

        {step === AppStep.COMPLETED && (
          <div className="w-full max-w-6xl space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="glass-dark p-8 rounded-3xl border border-indigo-500/20 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 bg-gradient-to-r from-[#0b1121] to-[#0f172a]">
              <div className="flex items-center gap-6">
                <div className="bg-indigo-500/10 p-5 rounded-2xl border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                  <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-orbitron font-bold text-white tracking-tight">TRANSLATION VERIFIED</h2>
                  <p className="text-slate-400 font-light mt-1 uppercase text-xs tracking-[0.2em]">{translatedSubs.length} data blocks synthesized</p>
                </div>
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <button 
                  onClick={reset}
                  className="flex-1 md:flex-none bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-xl font-bold font-orbitron transition border border-white/10 uppercase tracking-widest text-xs"
                >
                  New Stream
                </button>
                <button 
                  onClick={handleDownload}
                  className="flex-1 md:flex-none bg-indigo-600 text-white px-10 py-4 rounded-xl font-orbitron font-bold hover:bg-indigo-500 transition shadow-xl shadow-indigo-500/20 uppercase tracking-widest text-xs border border-indigo-400/30"
                >
                  Download Output
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass-dark rounded-[2rem] overflow-hidden border border-white/5">
                <div className="p-5 bg-white/5 border-b border-white/5 font-orbitron text-xs font-bold text-slate-500 flex justify-between tracking-widest uppercase">
                  <span>Source Nodes</span>
                  <span className="opacity-40">JA_JP</span>
                </div>
                <div className="max-h-[500px] overflow-y-auto p-6 space-y-4">
                  {originalSubs.slice(0, 50).map((sub) => (
                    <div key={sub.id} className="text-xs p-4 bg-slate-900/50 rounded-xl border border-white/5 transition hover:border-white/10">
                      <div className="flex justify-between mb-2 opacity-30 font-mono text-[9px] uppercase tracking-tighter">
                        <span>Block #{sub.id}</span>
                        <span>{sub.startTime}</span>
                      </div>
                      <p className="text-slate-400 leading-relaxed font-light">{sub.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-dark rounded-[2rem] overflow-hidden border border-white/5 group hover:border-indigo-500/20 transition duration-500">
                <div className="p-5 bg-indigo-500/5 border-b border-indigo-500/10 font-orbitron text-xs font-bold text-indigo-400 flex justify-between tracking-widest uppercase">
                  <span>Translated Output</span>
                  <span className="opacity-60 text-[9px] bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">NEURAL_EN</span>
                </div>
                <div className="max-h-[500px] overflow-y-auto p-6 space-y-4">
                  {translatedSubs.slice(0, 50).map((sub) => (
                    <div key={sub.id} className="text-xs p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10 transition hover:bg-indigo-500/10">
                      <div className="flex justify-between mb-2 opacity-30 font-mono text-[9px] uppercase tracking-tighter text-indigo-400">
                        <span>Synced #{sub.id}</span>
                        <span>{sub.startTime}</span>
                      </div>
                      <p className="text-white leading-relaxed font-medium">{sub.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-transparent border-t border-white/5 py-12 px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex flex-col items-center md:items-start gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center neon-glow">
                <span className="text-white font-orbitron font-bold text-sm">S</span>
              </div>
              <span className="font-orbitron font-bold text-lg text-white tracking-widest">SUBGLOT</span>
            </div>
            <p className="text-slate-600 text-[10px] font-mono tracking-wider max-w-xs text-center md:text-left leading-relaxed uppercase">
              DECENTRALIZED NEURAL LINGUISTIC PROCESSING UNIT v2.5.0
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 text-[10px] font-orbitron tracking-[0.2em] text-slate-500 uppercase">
            <a href="#" className="hover:text-indigo-400 transition-colors">Security</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">Interface</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">Core API</a>
          </div>
          
          <div className="text-center md:text-right space-y-2">
            <p className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">© 2025 SubGlot System. All Rights Reserved.</p>
            <div className="flex flex-col items-center md:items-end">
              <span className="text-[10px] text-indigo-500/70 uppercase tracking-[0.4em] font-orbitron font-bold">Created by Akram</span>
              <div className="h-px w-20 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent mt-1.5"></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
