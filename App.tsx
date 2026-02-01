
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
      (logEndRef.current as any).scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-40), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const loadFFmpeg = async () => {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    const ffmpeg = ffmpegRef.current;
    
    try {
      addLog("Initializing Neural Media Core...");
      
      const isMultithreaded = typeof SharedArrayBuffer !== 'undefined';
      if (!isMultithreaded) {
        addLog("Warning: SharedArrayBuffer unavailable. Parallel processing disabled.");
      }

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        ...(isMultithreaded ? { workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript') } : {})
      });
      
      setFfmpegReady(true);
      addLog(`Core Status: ONLINE (${isMultithreaded ? 'Multithread' : 'Single-thread'})`);
    } catch (err: any) {
      addLog(`Initialization Fault: ${err.message}. Retrying single-thread...`);
      try {
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        setFfmpegReady(true);
        addLog("Core Status: ONLINE (Single-thread Fallback)");
      } catch (innerErr: any) {
        addLog(`System Critical Error: ${innerErr.message}`);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target as any;
    const file = target.files?.[0];
    if (!file) return;

    // Store file reference before clearing input value
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();

    if (fileExtension === 'srt') {
      addLog(`SRT Document Detected: ${fileName}`);
      const text = await file.text();
      processTranslation(text);
    } else {
      handleVideoProbe(file);
    }
    
    // Allow re-selection of the same file
    target.value = '';
  };

  const handleVideoProbe = async (file: File) => {
    setStep(AppStep.PROBING);
    addLog(`Ingesting: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
    
    try {
      const ffmpeg = ffmpegRef.current;
      
      // Cleanup previous memory
      try { await ffmpeg.deleteFile('input_video'); } catch(e){}
      
      addLog("Allocating virtual memory...");
      await ffmpeg.writeFile('input_video', await fetchFile(file));
      
      const probeLogs: string[] = [];
      const captureLog = ({ message }: { message: string }) => {
        if (message.includes('Stream #')) {
          addLog(message.trim());
          if (message.toLowerCase().includes('subtitle')) {
             probeLogs.push(message);
          }
        }
      };
      
      ffmpeg.on('log', captureLog);
      addLog("Mapping bitstream architecture...");
      
      // We expect this to "fail" because -i with no output exits with code 1, 
      // but metadata is still populated in the log callback.
      try {
        await ffmpeg.exec(['-i', 'input_video']);
      } catch (e) {
        // Exit code 1 is expected here
      }
      
      ffmpeg.off('log', captureLog);

      const parsedTracks: AudioTrack[] = probeLogs.map((line, i) => {
        const streamMatch = line.match(/Stream #0:(\d+)(\((.*?)\))?/);
        const formatMatch = line.match(/Subtitle: (.*?)(\(|$)/i);
        
        return {
          index: streamMatch ? parseInt(streamMatch[1]) : i,
          codec: formatMatch ? formatMatch[1].trim() : 'srt',
          language: streamMatch?.[3] || 'und',
          title: `Stream 0:${streamMatch?.[1] || i}`
        };
      });

      if (parsedTracks.length === 0) {
        addLog("Critical: Container lacks internal subtitle streams.");
        throw new Error("No embedded subtitle tracks detected.");
      }

      setSubtitleTracks(parsedTracks);
      setStep(AppStep.SELECT_TRACK);
      addLog(`Success: Identified ${parsedTracks.length} subtitle tracks.`);
    } catch (err: any) {
      addLog(`Probe Failure: ${err.message}`);
      setStep(AppStep.IDLE);
    }
  };

  const extractAndTranslate = async (trackIndex: number) => {
    setStep(AppStep.PROCESSING);
    setProcessing({ isProcessing: true, progress: 5, currentTask: 'Demuxing Stream...', error: null });
    
    try {
      const ffmpeg = ffmpegRef.current;
      addLog(`Demuxing Stream 0:${trackIndex} to virtual SRT...`);
      
      try { await ffmpeg.deleteFile('extracted.srt'); } catch(e){}

      await ffmpeg.exec(['-i', 'input_video', '-map', `0:${trackIndex}`, 'extracted.srt']);
      
      const data = await ffmpeg.readFile('extracted.srt');
      const text = typeof data === 'string' ? data : new TextDecoder().decode(data as Uint8Array);
      
      if (!text || text.trim().length === 0) {
        throw new Error("Extracted track is empty or incompatible.");
      }

      processTranslation(text);
    } catch (err: any) {
      addLog(`Extraction Error: ${err.message}`);
      setProcessing({ isProcessing: false, progress: 0, currentTask: '', error: err.message });
      setStep(AppStep.IDLE);
    }
  };

  const processTranslation = async (srtText: string) => {
    setStep(AppStep.PROCESSING);
    setProcessing({ isProcessing: true, progress: 15, currentTask: 'Neural Analysis...', error: null });
    
    try {
      const items = parseSRT(srtText);
      if (items.length === 0) {
        throw new Error("SRT format unreadable or invalid character encoding.");
      }
      
      const textsToTranslate = items.map(item => item.text);
      addLog(`Linguistic Protocol: Translating ${items.length} dialogue segments.`);
      
      const translatedTexts = await translateTexts(textsToTranslate, (prog, partial) => {
        setProcessing(prev => ({
          ...prev,
          progress: 15 + (prog * 0.8),
          currentTask: `Synchronizing: ${prog}%`
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
      addLog("Protocol Terminated: Synthesis Complete.");
      
    } catch (err: any) {
      setProcessing({ isProcessing: false, progress: 0, currentTask: '', error: err.message });
      addLog(`Neural Link Failure: ${err.message}`);
    }
  };

  const reset = () => {
    setStep(AppStep.IDLE);
    setSubtitleTracks([]);
    setFinalSRT('');
    setLogs([]);
    setProcessing({ isProcessing: false, progress: 0, currentTask: '', error: null });
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
             <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest hidden md:inline">Node State: Ready</span>
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
                Japanese to English high-fidelity subtitle synthesis.
              </p>
            </div>

            <div className="max-w-xl mx-auto w-full">
              <div className="glass-dark rounded-[3rem] p-1 relative overflow-hidden group border border-white/5">
                <div className="scanline opacity-10"></div>
                <div className="bg-[#0b1121]/80 p-16 rounded-[2.8rem] border border-white/5 flex flex-col items-center justify-center min-h-[350px]">
                   <input 
                     type="file" 
                     accept=".srt,video/*,.mkv,.mp4,.avi" 
                     onChange={handleFileUpload} 
                     ref={fileInputRef} 
                     className="hidden" 
                     id="sub-up" 
                     disabled={!ffmpegReady}
                   />
                   <label 
                     htmlFor="sub-up" 
                     className={`px-12 py-6 rounded-2xl font-orbitron font-bold text-sm tracking-[0.2em] transition uppercase border ${ffmpegReady ? 'bg-indigo-600 cursor-pointer hover:bg-indigo-500 text-white border-indigo-400/30 shadow-xl shadow-indigo-600/20 active:scale-95' : 'bg-slate-800 text-slate-500 border-white/5'}`}
                   >
                      {ffmpegReady ? 'Ingest Media' : 'Syncing Core...'}
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
             <div className="relative">
                <div className="w-32 h-32 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center font-orbitron text-xs text-indigo-400">ANALYSIS</div>
             </div>
             <div className="text-center space-y-3">
                <h2 className="text-2xl font-orbitron text-white tracking-widest uppercase">Analyzing Streams</h2>
                <p className="text-indigo-400 font-mono text-[10px] tracking-[0.4em] uppercase animate-pulse">Mapping Bitstream Offsets...</p>
             </div>
          </div>
        )}

        {step === AppStep.SELECT_TRACK && (
          <div className="w-full max-w-4xl space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-orbitron font-bold text-white tracking-widest uppercase">Stream Selector</h2>
              <p className="text-slate-400 text-sm">Select the source <span className="text-indigo-400 font-bold underline underline-offset-8">Japanese Subtitle</span> track.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {subtitleTracks.map((track) => {
                const isJpn = track.language?.toLowerCase().includes('jpn') || track.language?.toLowerCase().includes('ja');
                return (
                  <button 
                    key={track.index}
                    onClick={() => extractAndTranslate(track.index)}
                    className={`group glass-dark p-8 rounded-[2rem] border transition-all text-left flex items-center justify-between ${
                      isJpn ? 'border-indigo-500/50 bg-indigo-500/5 ring-1 ring-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h4 className="text-white font-orbitron font-bold uppercase tracking-widest text-[10px]">{track.title}</h4>
                        {isJpn && <span className="text-[8px] bg-indigo-600 px-2 py-0.5 rounded font-bold uppercase">Optimal Source</span>}
                      </div>
                      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">
                        Codec: <span className="text-indigo-400">{track.codec}</span> • 
                        Tag: <span className="text-fuchsia-400">{track.language?.toUpperCase()}</span>
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-white/5 group-hover:bg-indigo-600 flex items-center justify-center transition shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="text-center pt-8">
              <button onClick={reset} className="text-[10px] font-orbitron text-slate-600 hover:text-white transition uppercase tracking-widest">Abort Selection</button>
            </div>
          </div>
        )}

        {step === AppStep.PROCESSING && (
          <div className="w-full max-w-5xl animate-in fade-in duration-500">
            <div className="glass-dark p-16 rounded-[4rem] border border-indigo-500/20 text-center relative overflow-hidden shadow-2xl">
              <div className="scanline opacity-20"></div>
              <h2 className="text-2xl font-orbitron font-bold text-white tracking-[0.4em] uppercase mb-8">Neural Synthesis</h2>
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
                <pre>{finalSRT.split('\n').slice(0, 100).join('\n')}...</pre>
              </div>
              <div className="flex gap-6 w-full">
                <button onClick={reset} className="flex-1 px-10 py-6 rounded-2xl font-orbitron bg-white/5 border border-white/10 text-white uppercase tracking-widest text-[10px] hover:bg-white/10 transition">Discard</button>
                <button onClick={() => downloadBlob(finalSRT, 'Translated_English.srt')} className="flex-1 px-10 py-6 rounded-2xl font-orbitron bg-indigo-600 text-white uppercase tracking-widest text-[10px] hover:bg-indigo-500 transition shadow-2xl shadow-indigo-600/40">Download SRT</button>
              </div>
            </div>
          </div>
        )}

        {(step !== AppStep.IDLE && step !== AppStep.COMPLETED) && (
          <div className="mt-16 w-full max-w-2xl glass-dark p-6 rounded-3xl border border-white/5 h-[240px] overflow-hidden flex flex-col">
             <div className="text-[9px] font-mono text-slate-600 uppercase tracking-[0.3em] mb-4 border-b border-white/5 pb-2">Bitstream Traffic Logs</div>
             <div className="flex-grow overflow-y-auto font-mono text-[10px] text-indigo-300/60 scrollbar-hide space-y-1.5">
                {logs.map((log, i) => <div key={i} className="animate-in slide-in-from-left-2 opacity-80">{log}</div>)}
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
