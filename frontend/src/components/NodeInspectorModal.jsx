import React from 'react';
import { X, Server, Activity, Terminal, Shield, CheckCircle, AlertTriangle } from 'lucide-react';

export default function NodeInspectorModal({ node, isOpen, onClose }) {
  if (!isOpen || !node) return null;

  const isFailing = node.status === 'failing';
  const isRemediated = node.status === 'remediated' || node.status === 'healthy';

  const mockLogs = isFailing ? [
    `2026-10-30T16:20:01.102Z [${node.id}] [FATAL] ThreadPoolExecutor saturation: 200/200 worker threads BLOCKED`,
    `2026-10-30T16:20:03.451Z [${node.id}] [ERROR] Connection timeout reaching downstream dependency (HikariPool timeout > 30000ms)`,
    `2026-10-30T16:20:05.892Z [${node.id}] [WARN] Container memory cgroup reaching limit: 984MiB / 1024MiB`,
    `2026-10-30T16:20:08.210Z [kubelet] Liveness probe failed: HTTP probe returned statuscode: 500`
  ] : [
    `2026-10-30T16:25:00.012Z [${node.id}] [INFO] Pod deployment healthy. 8/8 containers ready.`,
    `2026-10-30T16:25:02.144Z [${node.id}] [INFO] Active connection pool: 14/100 idle. Latency: 18ms.`,
    `2026-10-30T16:25:05.890Z [${node.id}] [INFO] HTTP 200 OK healthcheck probe passed successfully.`
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="glass-panel-glow w-full max-w-2xl rounded-2xl flex flex-col overflow-hidden border border-cyan-500/40 shadow-[0_0_35px_rgba(0,240,255,0.2)]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700/60 bg-space-900/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl border ${
              isFailing ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
            }`}>
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-100">{node.name}</h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {node.type}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400">Kubernetes Pod Inspector • {node.id}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 bg-space-950/90 text-xs font-mono">
          
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-space-900/80 border border-slate-800 rounded-xl p-3">
              <span className="text-slate-400 text-[10px] block">Current Health</span>
              <span className={`text-sm font-bold uppercase ${isFailing ? 'text-rose-400' : 'text-emerald-400'}`}>
                {node.status}
              </span>
            </div>

            <div className="bg-space-900/80 border border-slate-800 rounded-xl p-3">
              <span className="text-slate-400 text-[10px] block">p99 Latency</span>
              <span className={`text-sm font-bold ${isFailing ? 'text-rose-400' : 'text-slate-200'}`}>
                {node.latency}
              </span>
            </div>

            <div className="bg-space-900/80 border border-slate-800 rounded-xl p-3">
              <span className="text-slate-400 text-[10px] block">5xx Error Rate</span>
              <span className={`text-sm font-bold ${isFailing ? 'text-rose-400' : 'text-slate-200'}`}>
                {node.error_rate}
              </span>
            </div>
          </div>

          {/* Pod Status Bar */}
          <div className="bg-space-900/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 font-semibold">Deployment Pod Replicas:</span>
              <span className={isFailing ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                {isFailing ? '1/4 Available (3 CrashLoopBackOff)' : '4/4 Ready (Healthy)'}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${isFailing ? 'bg-rose-500' : 'bg-emerald-400'}`}
                style={{ width: isFailing ? '25%' : '100%' }}
              />
            </div>
          </div>

          {/* Real-time Container Stdout Logs */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <div className="flex items-center space-x-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Live Container STDOUT Logs:</span>
              </div>
              <span className="text-[10px] text-cyan-400/80">Tail: 4 entries</span>
            </div>

            <div className="bg-space-950 rounded-xl border border-slate-800 p-3 space-y-1 text-[10px] text-slate-300 overflow-x-auto leading-relaxed">
              {mockLogs.map((log, idx) => (
                <div key={idx} className={log.includes('FATAL') || log.includes('ERROR') ? 'text-rose-400 font-medium' : 'text-slate-300'}>
                  {log}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-space-900/60 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-400">
            Node inspected by Scout Agent
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-300 bg-space-800 hover:bg-space-700 transition-all font-mono"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
}

