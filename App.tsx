
import React, { useState, useRef, useEffect } from 'react';
import { AppStep, ProcessingState, AudioTrack } from './types';
import { downloadBlob } from './utils/srtUtils';
import { processAudioToSRT } from './services/geminiService';
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
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
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
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-20), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const loadFFmpeg = async () => {
    // We use unpkg for more predictable worker/wasm resolution in sandbox environments
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    const ffmpeg = ffmpegRef.current;
    
    try {
      // Fix: Use toBlobURL for ALL internal components to prevent cross-origin worker errors
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        // Explicitly providing workerURL is critical for the "Failed to construct Worker" fix
        workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
      });
      setFfmpegReady(true);
      addLog("FFmpeg Multimodal Core: ONLINE");
    } catch (err: any) {
      addLog("Local processing core failed to start. Falling back to single-thread mode...");
      try {
        // Fallback to single-threaded if COOP/COEP headers are missing
        const stBaseURL = 'https://unpkg.com/@ffmpeg/core-st@0.12.6/dist/esm';
        await ffmpeg.load({
          coreURL: await toBlobURL(`${stBaseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${stBaseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        setFfmpegReady(true);
        addLog("FFmpeg Single-Thread Core: ONLINE (Compatible Mode)");
      } catch (fallbackErr) {
        addLog("FATAL: Media engine could not be initialized.");
        console.error(fallbackErr);
      }
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ffmpegReady) return;

    setVideoFile(file);
    setStep(AppStep.PROBING);
    setLogs(['Initiating Media Stream Discovery...']);
    
    try {
      const ffmpeg = ffmpegRef.current;
      await ffmpeg.writeFile('input_video', await fetchFile(file));
      
      const probeLogs: string[] = [];
      const captureLog = ({ message }: { message: string }) => {
        if (message.includes('Audio:')) {
          probeLogs.push(message);
        }
      };
      
      ffmpeg.on('log', captureLog);
      // Run probe command
      await ffmpeg.exec(['-i', 'input_video']);
      ffmpeg.off('log', captureLog);

      const parsedTracks: AudioTrack[] = probeLogs.map((line, i) => {
        // Parse stream metadata from FFmpeg output
        // Example: Stream #0:1(jpn): Audio: aac (LC), 48000 Hz, stereo, fltp (default)
        const streamInfoMatch = line.match(/Stream #0:(\d+)(\((.*?)\))?/);
        const codecMatch = line.match(/Audio: (.*?),/);
        
        const trackIndex = streamInfoMatch ? parseInt(streamInfoMatch[1]) : i;
        const langCode = streamInfoMatch?.[3] || 'und';
        
        return {
          index: trackIndex,
          codec: codecMatch ? codecMatch[1] : 'Unknown',
          language: langCode,
          title: `Stream Track 0:${trackIndex}`
        };
      });

      if (parsedTracks.length === 0) {
        throw new Error("No compatible audio streams found in container.");
      }

      setAudioTracks(parsedTracks);
      setStep(AppStep.SELECT_TRACK);
      addLog(`Discovery Finished. Found ${parsedTracks.length} potential audio sources.`);
    } catch (err: any) {
      addLog(`Probing Error: ${err.message}`);
      setStep(AppStep.IDLE);
    }
  };

  const selectAndProcess = async (trackIndex: number) => {
    setStep(AppStep.PROCESSING);
    setProcessing({
      isProcessing: true,
      progress: 10,
      currentTask: 'Extracting Selected Stream...',
      error: null,
    });

    try {
      const ffmpeg = ffmpegRef.current;
      addLog(`Isolating Audio Stream 0:${trackIndex}...`);
      
      await ffmpeg.exec([
        '-i', 'input_video',
        '-map', `0:${trackIndex}`,
        '-vn', 
        '-acodec', 'aac',
        '-b:a', '128k',
        'isolated_audio.aac'
      ]);

      const data = await ffmpeg.readFile('isolated_audio.aac');
      const audioBlob = new Blob([data], { type: 'audio/aac' });
      
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(audioBlob);
      });

      setProcessing(prev => ({ ...prev, progress: 40, currentTask: 'Translating Japanese Dialogue...' }));

      const srtResult = await processAudioToSRT(
        base64Audio, 
        'audio/aac',
        (prog, task) => {
          setProcessing(prev => ({ ...prev, progress: prog, currentTask: task }));
          addLog(task);
        }
      );

      setFinalSRT(srtResult);
      setStep(AppStep.COMPLETED);
      setProcessing(prev => ({ ...prev, isProcessing: false }));
      
    } catch (err: any) {
      setProcessing({
        isProcessing: false,
        progress: 0,
        currentTask: '',
        error: err.message,
      });
      addLog(`SYSTEM FAILURE: ${err.message}`);
      setStep(AppStep.IDLE);
    }
  };

  const reset = () => {
    setStep(AppStep.IDLE);
    setVideoFile(null);
    setAudioTracks([]);
    setFinalSRT('');
    setLogs([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-[#020617] text-white">
      <nav className="border-b border-white/5 glass-dark sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 flex justify-between h-16 items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={reset}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center neon-glow">
              <span className="text-white font-orbitron font-bold text-lg">S</span>
            </div>
            <span className="font-orbitron font-bold text-xl tracking-widest">SUBGLOT</span>
          </div>
          {!ffmpegReady && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
              <span className="text-[10px] font-mono text-yellow-500 uppercase tracking-widest">WASM_BOOTING...</span>
            </div>
          )}
        </div>
      </nav>

      <main className="flex-grow flex flex-col items-center py-12 px-6 z-10">
        {step === AppStep.IDLE && (
          <div className="w-full max-w-5xl space-y-12 animate-in fade-in duration-700">
            <div className="text-center space-y-6">
              <h1 className="text-5xl md:text-7xl font-bold font-orbitron tracking-tight text-white leading-tight uppercase">
                Video <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400 neon-text">Translation</span>
              </h1>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
                Professional-grade Japanese audio extraction with manual stream targeting.
              </p>
            </div>

            <div className="max-w-xl mx-auto w-full">
              <div className="glass-dark rounded-[2.5rem] p-1 relative overflow-hidden group">
                <div className="scanline opacity-10"></div>
                <div className="bg-[#0b1121]/80 p-12 rounded-[2.3rem] border border-white/5 flex flex-col items-center justify-center min-h-[300px]">
                   <input type="file" accept="video/*,.mkv" onChange={handleVideoUpload} ref={fileInputRef} className="hidden" id="v-up" disabled={!ffmpegReady}/>
                   <label htmlFor="v-up" className={`px-12 py-5 rounded-2xl font-orbitron font-bold text-sm tracking-[0.2em] transition uppercase border ${ffmpegReady ? 'bg-indigo-600 cursor-pointer hover:bg-indigo-500 text-white border-indigo-400/30' : 'bg-slate-800 text-slate-500 border-white/5'}`}>
                      {ffmpegReady ? 'Upload Media File' : 'System Initializing...'}
                   </label>
                   <p className="mt-4 text-slate-600 font-mono text-[9px] uppercase tracking-widest">MKV • MP4 • AVI • MOV</p>
                </div>
              </div>
            </div>
            <Features />
          </div>
        )}

        {step === AppStep.PROBING && (
          <div className="w-full max-w-2xl flex flex-col items-center gap-12 py-20">
            <div className="relative">
              <div className="w-32 h-32 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
              </div>
            </div>
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-orbitron text-white tracking-widest uppercase">Analyzing Streams</h2>
              <p className="text-slate-500 font-mono text-[10px] tracking-[0.3em] uppercase animate-pulse">Scanning Media Container...</p>
            </div>
          </div>
        )}

        {step === AppStep.SELECT_TRACK && (
          <div className="w-full max-w-4xl space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-orbitron font-bold text-white tracking-widest uppercase">Stream Mapping</h2>
              <p className="text-slate-400 text-sm font-light">Identify the <span className="text-indigo-400 font-bold underline underline-offset-8">Japanese</span> audio track for extraction.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {audioTracks.map((track) => {
                const isJpn = track.language?.toLowerCase().includes('jpn') || track.language?.toLowerCase().includes('japanese');
                return (
                  <button 
                    key={track.index}
                    onClick={() => selectAndProcess(track.index)}
                    className={`group relative glass-dark p-8 rounded-3xl border transition-all text-left flex items-center justify-between overflow-hidden ${
                      isJpn ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <h4 className="text-white font-orbitron font-bold uppercase tracking-widest text-xs">{track.title}</h4>
                        {isJpn && <span className="text-[8px] bg-indigo-600 px-2 py-0.5 rounded-full font-bold">DETECTED_JA</span>}
                      </div>
                      <p className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">
                        Codec: <span className="text-indigo-400">{track.codec}</span><br/>
                        Language: <span className="text-fuchsia-400 font-bold">{track.language?.toUpperCase() || 'UNKNOWN'}</span>
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white/5 group-hover:bg-indigo-500 group-hover:scale-110 flex items-center justify-center transition duration-300">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === AppStep.PROCESSING && (
          <div className="w-full max-w-5xl space-y-12 animate-in fade-in duration-500">
            <div className="glass-dark p-12 rounded-[3rem] border border-indigo-500/20 text-center relative overflow-hidden shadow-2xl">
              <div className="scanline opacity-20"></div>
              <h2 className="text-2xl font-orbitron font-bold text-white tracking-[0.3em] uppercase mb-4">Neural Processing Active</h2>
              <NeuralBrain progress={processing.progress} isProcessing={true} />
              <div className="mt-8 space-y-4">
                 <p className="text-indigo-400 font-mono text-[10px] uppercase tracking-[0.4em] animate-pulse">{processing.currentTask}</p>
                 <div className="max-w-md mx-auto h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all duration-300" style={{ width: `${processing.progress}%` }}></div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {step === AppStep.COMPLETED && (
          <div className="w-full max-w-4xl space-y-8 animate-in zoom-in-95 duration-700">
            <div className="glass-dark p-12 rounded-[3rem] border border-indigo-500/20 shadow-2xl flex flex-col items-center text-center gap-10">
              <div className="w-24 h-24 bg-indigo-500/10 rounded-3xl flex items-center justify-center border border-indigo-500/30 shadow-lg shadow-indigo-500/20">
                <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-4xl font-orbitron font-bold text-white tracking-widest uppercase">SRT RECONSTRUCTION COMPLETE</h2>
              <div className="w-full bg-black/40 p-8 rounded-3xl border border-white/5 font-mono text-[11px] text-slate-400 text-left max-h-[400px] overflow-y-auto leading-relaxed">
                <pre>{finalSRT}</pre>
              </div>
              <div className="flex gap-6 w-full">
                <button onClick={reset} className="flex-1 px-10 py-6 rounded-2xl font-orbitron bg-white/5 border border-white/10 text-white uppercase tracking-widest text-xs hover:bg-white/10 transition">New Link</button>
                <button onClick={() => downloadBlob(finalSRT, 'SubGlot_Sync_EN.srt')} className="flex-1 px-10 py-6 rounded-2xl font-orbitron bg-indigo-600 text-white uppercase tracking-widest text-xs hover:bg-indigo-500 transition shadow-xl shadow-indigo-500/40 border border-indigo-400/30">Download English SRT</button>
              </div>
            </div>
          </div>
        )}

        {(step !== AppStep.IDLE && step !== AppStep.COMPLETED) && (
          <div className="mt-12 w-full max-w-2xl glass-dark p-5 rounded-2xl border border-white/5 h-[160px] overflow-hidden flex flex-col shadow-inner">
             <div className="text-[9px] font-mono text-slate-600 uppercase tracking-[0.3em] mb-3 border-b border-white/5 pb-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                Security Protocol Stream
             </div>
             <div className="flex-grow overflow-y-auto font-mono text-[10px] text-indigo-300/60 scrollbar-hide space-y-1.5">
                {logs.map((log, i) => <div key={i} className="animate-in slide-in-from-left-2 duration-300 opacity-80">{log}</div>)}
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
