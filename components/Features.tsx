
import React from 'react';

const Features: React.FC = () => {
  const features = [
    {
      title: 'Neural Engine',
      description: 'Massive parallel translation processing optimized for Japanese structures.',
      icon: '🧠',
      color: 'from-indigo-500/20'
    },
    {
      title: 'Tempo Sync',
      description: 'Millisecond-precision timestamp preservation for perfect synchronization.',
      icon: '⏱️',
      color: 'from-fuchsia-500/20'
    },
    {
      title: 'Idiom Mapping',
      description: 'Advanced contextual understanding of Japanese slang and honorifics.',
      icon: '🏯',
      color: 'from-cyan-500/20'
    },
    {
      title: 'Uplink Cloud',
      description: 'Decentralized processing nodes for zero-latency translation tasks.',
      icon: '☁️',
      color: 'from-violet-500/20'
    },
  ];

  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20 space-y-4">
          <h2 className="text-4xl font-bold font-orbitron text-white tracking-[0.2em] uppercase">
            System <span className="text-indigo-500">Features</span>
          </h2>
          <div className="h-1 w-24 bg-indigo-500 mx-auto rounded-full shadow-[0_0_10px_#6366f1]"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {features.map((feature, idx) => (
            <div 
              key={idx} 
              className={`p-10 border border-white/5 rounded-[2rem] bg-gradient-to-br ${feature.color} to-transparent glass-dark transition-all duration-500 hover:scale-105 hover:border-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] group`}
            >
              <div className="text-5xl mb-6 group-hover:animate-bounce">{feature.icon}</div>
              <h3 className="text-xl font-orbitron font-bold mb-4 text-white tracking-widest">{feature.title}</h3>
              <p className="text-slate-400 font-light leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
