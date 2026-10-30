import React, { useRef, useEffect } from 'react';
import { Terminal, Bot, Check, ArrowRight } from 'lucide-react';

export default function LiveWarRoom({ thoughts, incidentStatus }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thoughts]);

  const getStepBadgeColor = (step) => {
    switch (step) {
      case 'TRIAGE': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'INVESTIGATION': return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'RCA': return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'REMEDIATION': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'VERIFICATION': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  return (
    <div className="glass-panel rounded-2xl flex flex-col h-[520px] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-700/60 bg-space-900/70 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold tracking-wide text-slate-200">
            Live War Room Feed
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            {thoughts.length} events
          </span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[11px] font-mono text-slate-400">Stream Connected</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
        {thoughts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
            <Bot className="w-8 h-8 text-slate-600 animate-pulse" />
            <p>War room initialized. Waiting for agent pipeline triggers...</p>
          </div>
        ) : (
          thoughts.map((t, index) => (
            <div 
              key={index} 
              className="bg-space-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2 hover:border-slate-700/80 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-base select-none">{t.avatar}</span>
                  <span className="font-bold text-slate-200">{t.agent_name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${getStepBadgeColor(t.step)}`}>
                    {t.step}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                  <span className="text-cyan-400/90 font-medium">{Math.round(t.confidence * 100)}% conf</span>
                  <span>•</span>
                  <span>{new Date(t.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              <p className="text-slate-300 font-sans text-xs leading-relaxed pl-7">
                {t.content}
              </p>

              {/* Optional Metadata snippet */}
              {t.metadata && Object.keys(t.metadata).length > 0 && (
                <div className="pl-7 pt-1">
                  <div className="bg-space-950/80 rounded-lg p-2 text-[11px] text-slate-400 border border-slate-800/80 overflow-x-auto">
                    <span className="text-cyan-400/80 font-bold block mb-1">Attached Context:</span>
                    <pre className="text-[10px] text-slate-300 whitespace-pre-wrap">
                      {JSON.stringify(t.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {incidentStatus === 'ANALYZING' && (
          <div className="flex items-center space-x-2 text-cyan-400 animate-pulse pl-2 py-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-xs">Autonomous agents collaborating in real-time...</span>
          </div>
        )}
      </div>

    </div>
  );
}
