import React from 'react';
import { Shield, Search, Sparkles, Wrench, CheckCircle2, Loader2 } from 'lucide-react';

const AGENTS = [
  {
    id: 'agent-sentinel',
    name: 'Sentinel',
    role: 'Triage & Correlator',
    icon: Shield,
    color: 'from-cyan-500 to-blue-600',
    borderColor: 'border-cyan-500/40',
    glowColor: 'shadow-[0_0_15px_rgba(0,240,255,0.25)]',
    desc: 'Clusters alert storms, filters noise & classifies blast radius.'
  },
  {
    id: 'agent-scout',
    name: 'Scout',
    role: 'Log & Anomaly Investigator',
    icon: Search,
    color: 'from-blue-500 to-indigo-600',
    borderColor: 'border-blue-500/40',
    glowColor: 'shadow-[0_0_15px_rgba(59,130,246,0.25)]',
    desc: 'Queries stack traces, metrics anomalies & traces commits.'
  },
  {
    id: 'agent-oracle',
    name: 'Oracle',
    role: 'RCA & Hypothesis Engine',
    icon: Sparkles,
    color: 'from-purple-500 to-violet-600',
    borderColor: 'border-purple-500/40',
    glowColor: 'shadow-[0_0_15px_rgba(168,85,247,0.25)]',
    desc: 'Synthesizes causal graphs & pinpoints the true root cause.'
  },
  {
    id: 'agent-armorer',
    name: 'Armorer',
    role: 'Remediation Engineer',
    icon: Wrench,
    color: 'from-amber-500 to-rose-600',
    borderColor: 'border-amber-500/40',
    glowColor: 'shadow-[0_0_15px_rgba(245,158,11,0.25)]',
    desc: 'Formulates safe k8s patches, risk scores & rollback guarantees.'
  }
];

export default function AgentCrewPanel({ thoughts, incidentStatus }) {
  const getAgentStatus = (agentId) => {
    const hasThought = thoughts.some(t => t.agent_id === agentId);
    if (incidentStatus === 'RESOLVED') return 'COMPLETED';
    if (hasThought) return 'COMPLETED';
    if (incidentStatus === 'ANALYZING') {
      // check if it's currently active in pipeline
      const lastThought = thoughts[thoughts.length - 1];
      if (!lastThought && agentId === 'agent-sentinel') return 'ACTIVE';
      if (lastThought?.agent_id === 'agent-sentinel' && agentId === 'agent-scout') return 'ACTIVE';
      if (lastThought?.agent_id === 'agent-scout' && agentId === 'agent-oracle') return 'ACTIVE';
      if (lastThought?.agent_id === 'agent-oracle' && agentId === 'agent-armorer') return 'ACTIVE';
    }
    return 'STANDBY';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {AGENTS.map((agent) => {
        const Icon = agent.icon;
        const status = getAgentStatus(agent.id);

        return (
          <div
            key={agent.id}
            className={`glass-panel glass-card-hover rounded-xl p-4 relative overflow-hidden transition-all duration-300 ${
              status === 'ACTIVE' 
                ? `${agent.borderColor} ${agent.glowColor} ring-1 ring-cyan-400/50` 
                : 'border-slate-800'
            }`}
          >
            {/* Ambient background glow */}
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-gradient-to-br ${agent.color} opacity-10 blur-xl pointer-events-none`} />

            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center text-white shadow-md`}>
                <Icon className="w-5 h-5" />
              </div>

              {/* Status pill */}
              {status === 'COMPLETED' && (
                <span className="flex items-center space-x-1 text-[11px] font-mono font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Done</span>
                </span>
              )}
              {status === 'ACTIVE' && (
                <span className="flex items-center space-x-1 text-[11px] font-mono font-medium text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Working</span>
                </span>
              )}
              {status === 'STANDBY' && (
                <span className="text-[11px] font-mono text-slate-500 bg-slate-800/40 px-2 py-0.5 rounded-full">
                  Standby
                </span>
              )}
            </div>

            <h3 className="text-sm font-bold text-slate-100">{agent.name}</h3>
            <p className="text-xs font-mono text-cyan-400/90 mb-2">{agent.role}</p>
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{agent.desc}</p>
          </div>
        );
      })}
    </div>
  );
}

