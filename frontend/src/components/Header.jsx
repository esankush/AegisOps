import React from 'react';
import { Shield, Radio, Flame, Sparkles, FileText, CheckCircle2 } from 'lucide-react';

export default function Header({ 
  scenarios, 
  currentScenario, 
  onSelectScenario, 
  onTriggerScenario, 
  loading, 
  wsConnected, 
  incident,
  onOpenPostMortem 
}) {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-cyan-500/20 px-6 py-3.5 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        
        {/* Brand */}
        <div className="flex items-center space-x-3.5">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-600/30 border border-cyan-400/40 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            <Shield className="w-6 h-6 text-cyber-cyan" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-white via-cyan-200 to-purple-300 bg-clip-text text-transparent">
                AEGISOPS
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyber-cyan border border-cyan-500/30 font-semibold tracking-wider">
                Multi-Agent v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 tracking-tight">Autonomous Incident Response & Triage Crew</p>
          </div>
        </div>

        {/* Center / Scenario Selector & Chaos Trigger */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-space-900/80 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <Flame className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400 font-medium">Chaos Scenario:</span>
            <select
              value={currentScenario}
              onChange={(e) => onSelectScenario(e.target.value)}
              className="bg-transparent text-slate-100 font-medium border-none focus:outline-none cursor-pointer pr-2"
            >
              {scenarios.map((sc) => (
                <option key={sc.id} value={sc.id} className="bg-space-900 text-slate-100">
                  {sc.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => onTriggerScenario(currentScenario)}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 active:scale-95 transition-all shadow-[0_0_15px_rgba(244,63,94,0.35)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{loading ? "Synthesizing..." : "Inject Outage"}</span>
          </button>
        </div>

        {/* Right Status Badges */}
        <div className="flex items-center space-x-4 text-xs font-mono">
          {incident?.status === "RESOLVED" && incident?.post_mortem && (
            <button
              onClick={onOpenPostMortem}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)]"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Post-Mortem</span>
            </button>
          )}

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-space-900/60 border border-slate-700/50">
            <Radio className={`w-3.5 h-3.5 ${wsConnected ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`} />
            <span className="text-slate-300">
              {wsConnected ? 'Telemetry Live' : 'Connecting...'}
            </span>
          </div>
        </div>

      </div>
    </header>
  );
}
