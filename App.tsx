
import React, { useState, useRef, useEffect } from 'react';
import { AppStep, ProcessingState, AudioTrack, SubtitleItem } from './types';
import { parseSRT, generateSRT, downloadBlob } from './utils/srtUtils';
import { translateTexts } from './services/translationService';
import Features from './components/Features';
import Transparency from './components/Transparency';
import NeuralBrain from './components/NeuralBrain';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.IDLE);
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    currentTask: '',
    error: null,
  });
  
  const [logs, setLogs] = useState<string[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<AudioTrack[]>([]);
  const [finalSRT, setFinalSRT] = useState<string>('');
  const [ffmpegReady, setFfmpegReady] = useState(false);
  
  const ffmpegRef = useRef(new FFmpeg());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFFmpeg();
  }, []);

  useEffect(() => {
    if (logEndRef.current) {
      // Fix: Cast current to any to bypass environment-specific property existence checks for scrollIntoView
      (logEndRef.current as any).scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-20), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const loadFFmpeg = async () => {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    const ffmpeg = ffmpegRef.current;
    
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
      });
      setFfmpegReady(true);
      addLog("FFmpeg Media Core: ONLINE (Multi-thread Enabled)");
    } catch (err) {
      addLog("System Note: Falling back to standard mode...");
      setFfmpegReady(true);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Fix: Access files property via any-casting on e.target to satisfy environments with incomplete DOM type definitions for HTMLInputElement
    const file = (e.target as any).files?.[0];
    if (!file) return;

    if (file.name.endsWith('.srt')) {
      const text = await file.text();
      processTranslation(text);
    } else {
      handleVideoProbe(file);
    }
  };

  const handleVideoProbe = async (file: File) => {
    setStep(AppStep.PROBING);
    addLog(`Probing Container: ${file.name}`);
    
    try {
      const ffmpeg = ffmpegRef.current;
      await ffmpeg.writeFile('input_video', await fetchFile(file));
      
      const probeLogs: string[] = [];
      const captureLog = ({ message }: { message: string }) => {
        if (message.includes('Subtitle:')) probeLogs.push(message);
      };
      
      ffmpeg.on('log', captureLog);
      await ffmpeg.exec(['-i', 'input_video']);
      ffmpeg.off('log', captureLog);

      const parsedTracks: AudioTrack[] = probeLogs.map((line, i) => {
        const streamMatch = line.match(/Stream #0:(\d+)(\((.*?)\))?/);
        const formatMatch = line.match(/Subtitle: (.*?)(\(|$)/);
        
        return {
          index: streamMatch ? parseInt(streamMatch[1]) : i,
          codec: formatMatch ? formatMatch[1].trim() : 'srt',
          language: streamMatch?.[3] || 'und',
          title: `Subtitle Stream 0:${streamMatch?.[1] || i}`
        };
      });

      if (parsedTracks.length === 0) {
        throw new Error("No embedded subtitle tracks detected in this video.");
      }

      setSubtitleTracks(parsedTracks);
      setStep(AppStep.SELECT_TRACK);
      addLog(`Found ${parsedTracks.length} subtitle tracks.`);
    } catch (err: any) {
      addLog(`Error: ${err.message}`);
      setStep(AppStep.IDLE);
    }
  };

  const extractAndTranslate = async (trackIndex: number) => {
    setStep(AppStep.PROCESSING);
    setProcessing({ isProcessing: true, progress: 10, currentTask: 'Extracting Track...', error: null });
    
    try {
      const ffmpeg = ffmpegRef.current;
      addLog(`Dumping Subtitle Stream 0:${trackIndex}...`);
      
      // Attempt to extract as SRT
      await ffmpeg.exec(['-i', 'input_video', '-map', `0:${trackIndex}`, 'extracted.srt']);
      const data = await ffmpeg.readFile('extracted.srt');
      // Fix: FFmpeg's readFile can return a string or Uint8Array; handle both to satisfy TextDecoder and ensure string output
      const text = typeof data === 'string' ? data : new TextDecoder().decode(data as Uint8Array);
      
      processTranslation(text);
    } catch (err: any) {
      addLog(`Extraction Failed: ${err.message}`);
      setStep(AppStep.IDLE);
    }
  };

  const processTranslation = async (srtText: string) => {
    setStep(AppStep.PROCESSING);
    setProcessing({ isProcessing: true, progress: 20, currentTask: 'Parsing SRT Structure...', error: null });
    
    try {
      const items = parseSRT(srtText);
      const textsToTranslate = items.map(item => item.text);
      
      addLog(`Loaded ${items.length} dialogue blocks.`);
      
      const translatedTexts = await translateTexts(textsToTranslate, (prog, partial) => {
        setProcessing(prev => ({
          ...prev,
          progress: 20 + (prog * 0.75), // Scale to 20-95%
          currentTask: `Neural Synthesis: ${prog}%`
        }));
      });

      const translatedItems: SubtitleItem[] = items.map((item, i) => ({
        ...item,
        text: translatedTexts[i] || item.text
      }));

      const result = generateSRT(translatedItems);
      setFinalSRT(result);
      setStep(AppStep.COMPLETED);
      setProcessing(prev => ({ ...prev, isProcessing: false }));
      addLog("Translation Completed.");
      
    } catch (err: any) {
      setProcessing({ isProcessing: false, progress: 0, currentTask: '', error: err.message });
      addLog(`Translation Error: ${err.message}`);
    }
  };

  const reset = () => {
    setStep(AppStep.IDLE);
    setSubtitleTracks([]);
    setFinalSRT('');
    setLogs([]);
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-[#020617] text-slate-200">
      <nav className="border-b border-white/5 glass-dark sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 flex justify-between h-16 items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={reset}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center neon-glow">
              <span className="text-white font-orbitron font-bold text-lg">S</span>
            </div>
            <span className="font-orbitron font-bold text-xl tracking-widest text-white">SUBGLOT</span>
          </div>
          <div className="flex items-center gap-4">
             <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest hidden md:inline">Neural Node: Offline-Optimized</span>
          </div>
        </div>
      </nav>

      <main className="flex-grow flex flex-col items-center py-12 px-6 z-10">
        {step === AppStep.IDLE && (
          <div className="w-full max-w-5xl space-y-16 animate-in fade-in duration-1000">
            <div className="text-center space-y-6">
              <h1 className="text-6xl md:text-8xl font-bold font-orbitron tracking-tight text-white leading-tight uppercase">
                Sub <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400 neon-text">Link</span>
              </h1>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
                Japanese to English SRT translation service. Powered by high-speed neural machine translation.
              </p>
            </div>

            <div className="max-w-xl mx-auto w-full">
              <div className="glass-dark rounded-[3rem] p-1 relative overflow-hidden group border border-white/5">
                <div className="scanline opacity-10"></div>
                <div className="bg-[#0b1121]/80 p-16 rounded-[2.8rem] border border-white/5 flex flex-col items-center justify-center min-h-[350px]">
                   <input type="file" accept=".srt,video/*,.mkv" onChange={handleFileUpload} ref={fileInputRef} className="hidden" id="sub-up" disabled={!ffmpegReady}/>
                   <label htmlFor="sub-up" className={`px-12 py-6 rounded-2xl font-orbitron font-bold text-sm tracking-[0.2em] transition uppercase border ${ffmpegReady ? 'bg-indigo-600 cursor-pointer hover:bg-indigo-500 text-white border-indigo-400/30 shadow-xl shadow-indigo-600/20' : 'bg-slate-800 text-slate-500 border-white/5'}`}>
                      {ffmpegReady ? 'Upload SRT or Video' : 'Initializing Core...'}
                   </label>
                   <p className="mt-6 text-slate-600 font-mono text-[10px] uppercase tracking-widest">SRT • MKV • MP4 • AVI</p>
                </div>
              </div>
            </div>
            <Features />
          </div>
        )}

        {step === AppStep.PROBING && (
          <div className="w-full max-w-2xl flex flex-col items-center gap-12 py-24">
             <div className="w-24 h-24 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
             <div className="text-center space-y-3">
                <h2 className="text-2xl font-orbitron text-white tracking-widest uppercase">Media Analysis</h2>
                <p className="text-indigo-400 font-mono text-[10px] tracking-[0.4em] uppercase animate-pulse">Scanning Stream Indices...</p>
             </div>
          </div>
        )}

        {step === AppStep.SELECT_TRACK && (
          <div className="w-full max-w-4xl space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-orbitron font-bold text-white tracking-widest uppercase">Stream Selector</h2>
              <p className="text-slate-400 text-sm">Select the <span className="text-indigo-400 font-bold underline underline-offset-8">Japanese Subtitle</span> track for translation.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {subtitleTracks.map((track) => {
                const isJpn = track.language?.toLowerCase().includes('jpn') || track.language?.toLowerCase().includes('ja');
                return (
                  <button 
                    key={track.index}
                    onClick={() => extractAndTranslate(track.index)}
                    className={`group glass-dark p-8 rounded-[2rem] border transition-all text-left flex items-center justify-between ${
                      isJpn ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h4 className="text-white font-orbitron font-bold uppercase tracking-widest text-[10px]">{track.title}</h4>
                        {isJpn && <span className="text-[8px] bg-indigo-600 px-2 py-0.5 rounded font-bold uppercase">Source Found</span>}
                      </div>
                      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">
                        Format: <span className="text-indigo-400">{track.codec}</span> • 
                        Tag: <span className="text-fuchsia-400">{track.language?.toUpperCase()}</span>
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-white/5 group-hover:bg-indigo-600 flex items-center justify-center transition">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === AppStep.PROCESSING && (
          <div className="w-full max-w-5xl animate-in fade-in duration-500">
            <div className="glass-dark p-16 rounded-[4rem] border border-indigo-500/20 text-center relative overflow-hidden shadow-2xl">
              <div className="scanline opacity-20"></div>
              <h2 className="text-2xl font-orbitron font-bold text-white tracking-[0.4em] uppercase mb-8">Neural Translation</h2>
              <NeuralBrain progress={Math.round(processing.progress)} isProcessing={true} />
              <div className="mt-12 space-y-4 max-w-md mx-auto">
                 <p className="text-indigo-400 font-mono text-[10px] uppercase tracking-[0.5em] animate-pulse">{processing.currentTask}</p>
                 <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${processing.progress}%` }}></div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {step === AppStep.COMPLETED && (
          <div className="w-full max-w-4xl space-y-8 animate-in zoom-in-95 duration-700">
            <div className="glass-dark p-12 rounded-[4rem] border border-indigo-500/20 shadow-2xl flex flex-col items-center text-center gap-10">
              <div className="w-24 h-24 bg-green-500/10 rounded-[2rem] flex items-center justify-center border border-green-500/30">
                <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-4xl font-orbitron font-bold text-white tracking-widest uppercase">SRT Synthesis Ready</h2>
              <div className="w-full bg-black/40 p-8 rounded-3xl border border-white/5 font-mono text-[11px] text-slate-500 text-left max-h-[350px] overflow-y-auto">
                <pre>{finalSRT.split('\n').slice(0, 50).join('\n')}...</pre>
              </div>
              <div className="flex gap-6 w-full">
                <button onClick={reset} className="flex-1 px-10 py-6 rounded-2xl font-orbitron bg-white/5 border border-white/10 text-white uppercase tracking-widest text-[10px] hover:bg-white/10 transition">Discard</button>
                <button onClick={() => downloadBlob(finalSRT, 'Translated_English.srt')} className="flex-1 px-10 py-6 rounded-2xl font-orbitron bg-indigo-600 text-white uppercase tracking-widest text-[10px] hover:bg-indigo-500 transition shadow-2xl shadow-indigo-600/40">Download English SRT</button>
              </div>
            </div>
          </div>
        )}

        {(step !== AppStep.IDLE && step !== AppStep.COMPLETED) && (
          <div className="mt-16 w-full max-w-2xl glass-dark p-6 rounded-3xl border border-white/5 h-[140px] overflow-hidden flex flex-col">
             <div className="text-[9px] font-mono text-slate-600 uppercase tracking-[0.3em] mb-4 border-b border-white/5 pb-2">Session Traffic Logs</div>
             <div className="flex-grow overflow-y-auto font-mono text-[10px] text-indigo-300/40 scrollbar-hide space-y-1.5">
                {logs.map((log, i) => <div key={i} className="animate-in slide-in-from-left-2">{log}</div>)}
                <div ref={logEndRef}></div>
             </div>
          </div>
        )}
      </main>
      <Transparency />
    </div>
  );
};

export default App;
