import React, { useMemo } from 'react';
import { Cpu, HardDrive, Zap, Clock, AlertTriangle } from 'lucide-react';

export default function TelemetryHUD({ incident }) {
  const isHealthy = incident?.status === 'RESOLVED';
  const scId = incident?.scenario_id || '';

  const metrics = useMemo(() => {
    if (isHealthy) {
      return {
        cpu: 16.2,
        mem: 34.5,
        p99: '18ms',
        error: 0.0,
        statusColor: 'text-emerald-400',
        label: 'Cluster State: Optimal (Post-Remediation)'
      };
    }

    if (scId.includes('oom') || scId.includes('linux')) {
      return {
        cpu: 32.4,
        mem: 99.8,
        p99: '180ms',
        error: 100.0,
        statusColor: 'text-rose-400',
        label: 'Host RAM Starvation (OOM Killer Invoked)'
      };
    }

    if (scId.includes('nginx')) {
      return {
        cpu: 68.4,
        mem: 44.1,
        p99: '5020ms',
        error: 91.5,
        statusColor: 'text-rose-400',
        label: 'Ingress 502 Bad Gateway (Socket Refused)'
      };
    }

    if (scId.includes('postgres') || scId.includes('db')) {
      return {
        cpu: 96.8,
        mem: 78.4,
        p99: '32000ms',
        error: 88.0,
        statusColor: 'text-rose-400',
        label: 'Transaction Pool Saturated (100/100 Slots)'
      };
    }

    if (scId.includes('redis')) {
      return {
        cpu: 45.2,
        mem: 98.9,
        p99: '1400ms',
        error: 95.0,
        statusColor: 'text-amber-400',
        label: 'Redis MaxMemory Limit Exceeded (Eviction Paused)'
      };
    }

    if (scId.includes('unstructured') || scId.includes('drift')) {
      return {
        cpu: 18.0,
        mem: 42.0,
        p99: 'Unknown',
        error: 100.0,
        statusColor: 'text-purple-400',
        label: 'Dialect Anomaly (Epistemic Uncertainty: High)'
      };
    }

    return {
      cpu: 91.4,
      mem: 86.2,
      p99: '14200ms',
      error: 48.2,
      statusColor: 'text-rose-400',
      label: 'Cascade Service Starvation'
    };
  }, [isHealthy, scId]);

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-700/60 mb-4 gap-2">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold tracking-wide text-slate-200">
            Real-Time Cluster Telemetry
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-space-900 text-slate-400 border border-slate-800">
            {metrics.label}
          </span>
        </div>
        <span className="text-[11px] font-mono text-cyan-400/90 flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Prometheus Scrape: 1s</span>
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
              className={`h-full transition-all duration-500 ${isHealthy ? 'bg-emerald-400' : (metrics.mem > 95 ? 'bg-rose-500 animate-pulse' : 'bg-amber-500')}`}
              style={{ width: `${metrics.mem}%` }}
            />
          </div>
        </div>

        {/* Latency */}
        <div className="bg-space-900/70 rounded-xl p-3 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-mono">p99 Latency</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className={`text-xl font-mono font-bold ${metrics.statusColor}`}>
              {metrics.p99}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${isHealthy ? 'bg-emerald-400' : 'bg-amber-500'}`}
              style={{ width: isHealthy ? '15%' : '85%' }}
            />
          </div>
        </div>

        {/* Error Rate */}
        <div className="bg-space-900/70 rounded-xl p-3 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-mono">Error Rate</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className={`text-xl font-mono font-bold ${metrics.statusColor}`}>
              {metrics.error}%
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${isHealthy ? 'bg-emerald-400' : 'bg-rose-500'}`}
              style={{ width: `${Math.min(metrics.error, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
