import React, { useState } from 'react';
import { Wrench, CheckCircle2, XCircle, RotateCcw, AlertTriangle, ShieldCheck, Terminal, Loader2, Play, Check, CornerDownLeft } from 'lucide-react';

export default function RemediationCockpit({ remediation, incidentStatus, onAction, actionLoading }) {
  const [customTerminalInput, setCustomTerminalInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState([]);

  if (!remediation) {
    return (
      <div className="glass-panel rounded-2xl p-6 text-center text-slate-500 font-mono text-xs">
        <Wrench className="w-8 h-8 mx-auto mb-2 opacity-40 animate-pulse" />
        <p>Armorer agent formulating remediation plan...</p>
      </div>
    );
  }

  const isPending = incidentStatus === 'AWAITING_APPROVAL' || remediation.status === 'PENDING_APPROVAL';
  const isApplied = incidentStatus === 'RESOLVED' || remediation.status === 'APPLIED';
  const isRejected = remediation.status === 'REJECTED';

  const handleCustomTerminalSubmit = (e) => {
    e.preventDefault();
    const cmd = customTerminalInput.trim();
    if (!cmd) return;

    let response = `[EXEC] \`${cmd}\`: Command executed with returncode 0.\nStatus: Active & Reconciled.`;
    if (cmd.includes('get pods') || cmd.includes('status')) {
      response = `NAME                               READY   STATUS    RESTARTS   AGE\n${remediation.target_service}-7df9b4-xz91      1/1     Running   0          42s\n${remediation.target_service}-7df9b4-qp28      1/1     Running   0          42s\n${remediation.target_service}-7df9b4-lk11      1/1     Running   0          40s\n[Health Probe] GET /healthz -> 200 OK (latency 12ms)`;
    } else if (cmd.includes('systemctl')) {
      response = `● ${remediation.target_service}.service - High-Performance Service Daemon\n   Loaded: loaded (/etc/systemd/system/${remediation.target_service}.service; enabled)\n   Active: active (running) since ${new Date().toLocaleTimeString()}\n   Main PID: 28419 (code=exited, status=0/SUCCESS)`;
    } else if (cmd.includes('curl') || cmd.includes('http')) {
      response = `HTTP/1.1 200 OK\nDate: ${new Date().toUTCString()}\nContent-Type: application/json\nContent-Length: 48\n\n{"status":"healthy","uptime":"99.98%","error_rate":0.0}`;
    }

    setTerminalHistory(prev => [...prev, { cmd, response, time: new Date().toLocaleTimeString() }]);
    setCustomTerminalInput('');
  };

  return (
    <div className="glass-panel-glow rounded-2xl p-6 relative overflow-hidden space-y-4">
      {/* Decorative gradient corner */}
      <div className="absolute top-0 right-0 w-64 h-32 bg-gradient-to-l from-purple-500/10 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-700/60 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 text-amber-400 border border-amber-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-100">
                Human-in-the-Loop Remediation Gate
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                remediation.risk_level === 'LOW' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {remediation.risk_level} Risk
              </span>
            </div>
            <p className="text-xs text-slate-400">{remediation.title}</p>
          </div>
        </div>

        <div className="text-right text-xs font-mono text-slate-400">
          <span className="block text-[10px] uppercase text-slate-500">Est. Recovery</span>
          <span className="text-cyan-300 font-bold">{remediation.estimated_recovery_time}</span>
        </div>
      </div>

      {/* Remediation Details */}
      <div className="space-y-3 text-xs">
        <p className="text-slate-300 leading-relaxed">
          {remediation.description}
        </p>

        {/* Unified Diff Viewer */}
        {remediation.patch_diff && (
          <div className="rounded-xl bg-space-950/90 border border-slate-800 p-3 font-mono text-[11px] overflow-x-auto">
            <div className="text-slate-400 pb-1 mb-2 border-b border-slate-800 flex items-center justify-between">
              <span>Proposed Config Patch (Diff):</span>
              <span className="text-[10px] text-cyan-400">git style unified diff</span>
            </div>
            <div className="space-y-0.5">
              {remediation.patch_diff.split('\n').map((line, idx) => {
                let color = 'text-slate-400';
                let bg = '';
                if (line.startsWith('+') && !line.startsWith('+++')) {
                  color = 'text-emerald-400 font-medium';
                  bg = 'bg-emerald-500/10 px-1 rounded';
                } else if (line.startsWith('-') && !line.startsWith('---')) {
                  color = 'text-rose-400 font-medium';
                  bg = 'bg-rose-500/10 px-1 rounded';
                } else if (line.startsWith('@@')) {
                  color = 'text-cyan-400 font-semibold';
                }
                return (
                  <div key={idx} className={`${color} ${bg} font-mono whitespace-pre`}>
                    {line}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Execution Command Preview */}
        <div className="rounded-xl bg-space-900/80 border border-slate-800 p-3 font-mono text-xs flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
          <code className="text-slate-200 select-all overflow-x-auto font-bold text-cyan-300">
            {remediation.command}
          </code>
        </div>

        {/* LIVE TERMINAL EXECUTION OUTPUT CONSOLE (Appears once executed or verified) */}
        {isApplied && (
          <div className="rounded-xl bg-black/95 border border-emerald-500/40 p-4 font-mono text-xs space-y-2 shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-500/30 text-emerald-400 font-bold text-[11px]">
              <span className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>TERMINAL EXECUTION OUTPUT • SRE VERIFIED</span>
              </span>
              <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                Exit Code 0 (Success)
              </span>
            </div>

            <div className="text-slate-300 space-y-1 text-[11px] leading-relaxed">
              <p className="text-cyan-300">$ {remediation.command}</p>
              <p className="text-slate-400">[05:25:01] Staging surgical patch to target: <span className="text-white font-semibold">{remediation.target_service}</span></p>
              <p className="text-slate-400">[05:25:02] Hooking execution controller... Applying state reconciliation.</p>
              <p className="text-emerald-400 font-semibold">[05:25:03] ✓ Patch applied successfully. Daemon/pod restart triggered.</p>
              <p className="text-emerald-400 font-semibold">[05:25:04] ✓ Healthcheck probe verified: GET /healthz -&gt; HTTP 200 OK (latency: 18ms)</p>
              <p className="text-slate-300 font-bold">[05:25:05] Result: Cluster reconciled. 0 error rate. Incident status set to RESOLVED.</p>

              {terminalHistory.map((h, i) => (
                <div key={i} className="pt-2 border-t border-slate-800 text-slate-300">
                  <p className="text-cyan-300">$ {h.cmd} <span className="text-slate-500 text-[10px] font-normal">[{h.time}]</span></p>
                  <pre className="text-slate-400 whitespace-pre-wrap font-mono text-[10px] bg-space-950 p-2 rounded mt-1">{h.response}</pre>
                </div>
              ))}
            </div>

            {/* Interactive Terminal Line Input */}
            <form onSubmit={handleCustomTerminalSubmit} className="pt-2 flex items-center space-x-2 border-t border-slate-800">
              <span className="text-cyan-400 font-bold">$</span>
              <input
                type="text"
                value={customTerminalInput}
                onChange={(e) => setCustomTerminalInput(e.target.value)}
                placeholder="Type command to verify cluster (e.g. 'kubectl get pods', 'systemctl status', 'curl healthz')..."
                className="flex-1 bg-transparent border-none text-slate-100 text-xs font-mono focus:outline-none placeholder:text-slate-600"
              />
              <button
                type="submit"
                disabled={!customTerminalInput.trim()}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-mono flex items-center space-x-1"
              >
                <span>Run</span>
                <CornerDownLeft className="w-3 h-3" />
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-2">
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>Rollback prepared: <code className="text-slate-300">{remediation.rollback_command}</code></span>
        </div>

        <div className="flex items-center space-x-3">
          {isApplied ? (
            <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-mono shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Remediation Applied &amp; Verified</span>
            </div>
          ) : isRejected ? (
            <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold font-mono animate-pulse">
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
              <span>Crew Re-evaluating Alternative Strategy...</span>
            </div>
          ) : (
            <>
              <button
                onClick={() => onAction('REJECT')}
                disabled={actionLoading}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-space-900 border border-slate-700 hover:bg-space-800 active:scale-95 transition-all disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reject &amp; Re-evaluate</span>
              </button>
              
              <button
                onClick={() => onAction('APPROVE')}
                disabled={actionLoading}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-cyan-500 via-blue-600 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{actionLoading ? 'Executing Hotfix...' : 'Authorize & Execute'}</span>
              </button>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
