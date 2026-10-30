import React from 'react';
import { Wrench, CheckCircle2, XCircle, RotateCcw, AlertTriangle, ShieldCheck, Terminal } from 'lucide-react';

export default function RemediationCockpit({ remediation, incidentStatus, onAction, actionLoading }) {
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

  return (
    <div className="glass-panel-glow rounded-2xl p-6 relative overflow-hidden">
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
      <div className="py-4 space-y-3 text-xs">
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
          <code className="text-slate-200 select-all overflow-x-auto">
            {remediation.command}
          </code>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-2">
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>Rollback prepared: <code className="text-slate-300">{remediation.rollback_command}</code></span>
        </div>

        <div className="flex items-center space-x-3">
          {isApplied ? (
            <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Remediation Applied & Verified</span>
            </div>
          ) : isRejected ? (
            <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold font-mono">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>Remediation Rejected by Human</span>
            </div>
          ) : (
            <>
              <button
                onClick={() => onAction('REJECT')}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-space-900 border border-slate-700 hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50"
              >
                Reject & Re-evaluate
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

