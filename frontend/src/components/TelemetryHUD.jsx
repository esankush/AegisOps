import React from 'react';
import { Cpu, HardDrive, Zap, AlertOctagon } from 'lucide-react';

export default function TelemetryHUD({ incident }) {
  const isHealthy = incident?.status === 'RESOLVED';

  const metrics = isHealthy ? {
    cpu: 18.4,
    mem: 38.2,
    p99: 22,
    error: 0.0,
    statusColor: 'text-emerald-400'
  } : {
    cpu: 94.2,
    mem: 92.5,
    p99: 14200,
    error: 42.6,
    statusColor: 'text-rose-400'
  };

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-700/60 mb-4">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold tracking-wide text-slate-200">
            Real-Time Cluster Telemetry
          </h3>
        </div>
        <span className="text-[11px] font-mono text-cyan-400/90">
          Prometheus Scrape: 1s
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* CPU */}
        <div className="bg-space-900/70 rounded-xl p-3 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-mono">Cluster CPU</span>
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className={`text-xl font-mono font-bold ${metrics.statusColor}`}>
              {metrics.cpu}%
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${isHealthy ? 'bg-emerald-400' : 'bg-rose-500'}`}
              style={{ width: `${metrics.cpu}%` }}
            />
          </div>
        </div>

        {/* Memory */}
        <div className="bg-space-900/70 rounded-xl p-3 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-mono">Memory Pressure</span>
            <HardDrive className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className={`text-xl font-mono font-bold ${metrics.statusColor}`}>
              {metrics.mem}%
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${isHealthy ? 'bg-emerald-400' : 'bg-amber-500'}`}
              style={{ width: `${metrics.mem}%` }}
            />
          </div>
        </div>

        {/* p99 Latency */}
        <div className="bg-space-900/70 rounded-xl p-3 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-mono">p99 Latency</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className={`text-xl font-mono font-bold ${metrics.statusColor}`}>
              {metrics.p99}
            </span>
            <span className="text-xs text-slate-400 font-mono">ms</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono block mt-2">
            SLO Threshold: 250ms
          </span>
        </div>

        {/* Error Rate */}
        <div className="bg-space-900/70 rounded-xl p-3 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-mono">5xx Error Rate</span>
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className={`text-xl font-mono font-bold ${metrics.statusColor}`}>
              {metrics.error}%
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono block mt-2">
            SLO Target: &lt; 0.05%
          </span>
        </div>
      </div>
    </div>
  );
}
