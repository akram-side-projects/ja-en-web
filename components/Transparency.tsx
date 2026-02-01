
import React from 'react';

const Transparency: React.FC = () => {
  return (
    <section className="py-24 border-t border-white/5 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-orbitron font-bold text-white tracking-widest uppercase">
            Neural <span className="text-indigo-500">Architecture</span> & Training
          </h2>
          <p className="text-slate-500 mt-4 font-light tracking-wide">Transparency Protocol v2.5.0 • Verified 2025</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Model Specification */}
          <div className="glass-dark p-8 rounded-3xl border border-white/5 space-y-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <h3 className="font-orbitron font-bold text-white uppercase tracking-widest text-sm">Model Specification</h3>
            </div>
            <ul className="space-y-4 font-mono text-[11px] text-slate-400">
              <li className="flex justify-between border-b border-white/5 pb-2">
                <span>BASE_MODEL</span>
                <span className="text-indigo-400">MarianMT (JA-EN)</span>
              </li>
              <li className="flex justify-between border-b border-white/5 pb-2">
                <span>ARCH</span>
                <span className="text-indigo-400">Encoder-Decoder Transformer</span>
              </li>
              <li className="flex justify-between border-b border-white/5 pb-2">
                <span>OPTIMIZATION</span>
                <span className="text-indigo-400">Machine Translation (NMT)</span>
              </li>
              <li className="flex justify-between border-b border-white/5 pb-2">
                <span>STATUS</span>
                <span className="text-green-500">Non-Conversational</span>
              </li>
            </ul>
          </div>

          {/* Fine-Tuning Process */}
          <div className="md:col-span-2 glass-dark p-8 rounded-3xl border border-white/5">
            <div className="flex items-center gap-3 mb-8">
              <span className="text-2xl">🧪</span>
              <h3 className="font-orbitron font-bold text-white uppercase tracking-widest text-sm">Fine-Tuning Protocol</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Training Assets</h4>
                <ul className="text-xs text-slate-500 space-y-2 list-disc pl-4">
                  <li>Parallel Japanese–English subtitle datasets</li>
                  <li>Conversational & emotional dialogue datasets</li>
                  <li>Real-world informal speech samples</li>
                  <li>Strict timing constraint mapping</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Enhanced Capabilities</h4>
                <ul className="text-xs text-slate-500 space-y-2 list-disc pl-4">
                  <li>Natural spoken English synthesis</li>
                  <li>Subtitle-friendly sentence truncation</li>
                  <li>Context-aware command processing</li>
                  <li>Deep emotion preservation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Quality Measures */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-dark p-8 rounded-3xl border border-indigo-500/10 bg-indigo-500/[0.02]">
            <h4 className="font-orbitron font-bold text-white text-xs uppercase tracking-[0.2em] mb-6">Optimization Focus</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                <div className="text-indigo-400 font-bold text-xs mb-1">Implicit Subjects</div>
                <div className="text-[10px] text-slate-500">Resolves hidden Japanese subjects in dialogue.</div>
              </div>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                <div className="text-indigo-400 font-bold text-xs mb-1">Drama/Anime</div>
                <div className="text-[10px] text-slate-500">Tuned for creative media and emotional nuance.</div>
              </div>
            </div>
          </div>

          <div className="glass-dark p-8 rounded-3xl border border-fuchsia-500/10 bg-fuchsia-500/[0.02]">
            <h4 className="font-orbitron font-bold text-white text-xs uppercase tracking-[0.2em] mb-6">Safety & Stability</h4>
            <ul className="grid grid-cols-2 gap-y-3 text-[10px] font-mono text-slate-400">
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Timestamp-safe</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Zero Drift</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Deterministic</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> No Persistence</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Local Buffering</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Verified AES-256</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-xs text-slate-600 font-light italic">
            * This system is trained and tuned specifically for subtitles, not documents. Avoids over-formal textbook translations and word-by-word mapping.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Transparency;
