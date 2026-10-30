import React from 'react';
import { Server, Database, Globe, Network, AlertCircle, CheckCircle } from 'lucide-react';

export default function CausalGraph({ topology }) {
  if (!topology || !topology.nodes) return null;

  const getNodeIcon = (type) => {
    switch (type) {
      case 'gateway': return Globe;
      case 'database':
      case 'queue': return Database;
      default: return Server;
    }
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case 'failing':
        return {
          bg: 'bg-rose-950/40 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          dot: 'bg-rose-500'
        };
      case 'degraded':
        return {
          bg: 'bg-amber-950/40 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.25)]',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          dot: 'bg-amber-500'
        };
      case 'remediated':
      case 'healthy':
        return {
          bg: 'bg-emerald-950/30 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          dot: 'bg-emerald-500'
        };
      default:
        return {
          bg: 'bg-space-900/60 border-slate-700/60',
          badge: 'bg-slate-700/40 text-slate-300 border-slate-600',
          dot: 'bg-slate-400'
        };
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-4">
        <div className="flex items-center space-x-2">
          <Network className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold tracking-wide text-slate-200">
            Topology & Blast Radius Map
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          {topology.nodes.length} Components Monitored
        </span>
      </div>

      {/* Grid of Microservice Nodes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1">
        {topology.nodes.map((node) => {
          const Icon = getNodeIcon(node.type);
          const style = getStatusStyles(node.status);

          return (
            <div
              key={node.id}
              className={`p-3.5 rounded-xl border transition-all duration-300 relative overflow-hidden ${style.bg}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-lg bg-space-950/60 text-cyan-400 border border-slate-800">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">{node.name}</h4>
                    <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                      {node.type}
                    </span>
                  </div>
                </div>

                <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border flex items-center space-x-1 ${style.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${style.dot} ${node.status === 'failing' ? 'animate-ping' : ''}`} />
                  <span>{node.status}</span>
                </span>
              </div>

              {/* Node Telemetry Details */}
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">p99 Latency:</span>
                  <span className={`font-semibold ${node.status === 'failing' ? 'text-rose-400' : 'text-slate-200'}`}>
                    {node.latency}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Error Rate:</span>
                  <span className={`font-semibold ${node.status === 'failing' ? 'text-rose-400' : 'text-slate-200'}`}>
                    {node.error_rate}
                  </span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Edge summary bar */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Healthy Path</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Cascade Breakpoint</span>
          </span>
        </div>
        <span>{topology.edges?.length || 0} active mesh routes</span>
      </div>
    </div>
  );
}

