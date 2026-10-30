import React, { useState } from 'react';
import { AlertTriangle, Clock, Layers, Activity, CheckCircle2, ShieldAlert, Compass, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function IncidentHeader({ incident }) {
  const [showNextSteps, setShowNextSteps] = useState(true);

  if (!incident) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
      case 'ANALYZING':
        return (
          <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
            <Activity className="w-3.5 h-3.5" />
            <span>CREW ANALYZING</span>
          </span>
        );
      case 'AWAITING_APPROVAL':
        return (
          <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-bounce">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>HUMAN APPROVAL REQUIRED</span>
          </span>
        );
      case 'REMEDIATING':
        return (
          <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse">
            <Activity className="w-3.5 h-3.5" />
            <span>APPLYING HOTFIX</span>
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>INCIDENT RESOLVED</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="glass-panel-glow rounded-2xl p-6 relative overflow-hidden space-y-4">
      {/* Decorative cyber grid accent */}
      <div className="absolute top-0 right-0 w-72 h-32 bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
        <div>
          <div className="flex items-center space-x-3 mb-2 flex-wrap gap-y-2">
            <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-bold bg-slate-800 text-cyan-300 border border-cyan-500/30">
              {incident.id}
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
              {incident.severity}
            </span>
            {getStatusBadge(incident.status)}

            {/* Skew Badge if detected (Direct Answer to Hackathon Challenge) */}
            {incident.clock_skew_detected && (
              <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                <Clock className="w-3 h-3 text-purple-400" />
                <span>Clock Drift Normalized</span>
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">
            {incident.title}
          </h2>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-1.5 bg-space-900/80 px-3 py-1.5 rounded-lg border border-slate-700/50">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Triggered: {incident.created_at ? new Date(incident.created_at).toLocaleTimeString() : 'Just now'}</span>
          </div>
        </div>
      </div>

      {/* Challenge Notice: Clock Skew & Epistemic Uncertainty Banner */}
      {(incident.clock_skew_detected || incident.uncertainty_analysis) && (
        <div className="rounded-xl bg-purple-950/40 border border-purple-500/30 p-3.5 text-xs text-purple-200 space-y-1.5 font-mono">
          {incident.clock_skew_detected && (
            <div className="flex items-start space-x-2">
              <Clock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-purple-300">Clock Skew Guard:</strong> {incident.clock_skew_detected}
              </span>
            </div>
          )}
          {incident.uncertainty_analysis && (
            <div className="flex items-start space-x-2">
              <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-cyan-300">Epistemic Uncertainty:</strong> {incident.uncertainty_analysis}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Incident Details Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-space-900/60 rounded-xl p-3 border border-slate-800 flex items-start space-x-3">
          <Layers className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-slate-400 font-mono block">Blast Radius:</span>
            <span className="text-slate-200 font-medium">{incident.blast_radius}</span>
          </div>
        </div>

        <div className="bg-space-900/60 rounded-xl p-3 border border-slate-800 flex items-start space-x-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-slate-400 font-mono block">Correlated Alerts:</span>
            <span className="text-slate-200 font-medium">
              {incident.alerts?.length || 0} telemetry monitors triggered
            </span>
          </div>
        </div>

        <div className="bg-space-900/60 rounded-xl p-3 border border-slate-800 flex items-start space-x-3">
          <Activity className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-slate-400 font-mono block">Multi-Agent Squad:</span>
            <span className="text-slate-200 font-medium">
              Sentinel, Scout, Oracle, Armorer (Active)
            </span>
          </div>
        </div>
      </div>

      {/* "Where To Look Next" Guidance Section (Direct Answer to Hint 3) */}
      {incident.where_to_look_next && incident.where_to_look_next.length > 0 && (
        <div className="rounded-xl bg-space-900/70 border border-cyan-500/30 overflow-hidden text-xs">
          <button
            onClick={() => setShowNextSteps(!showNextSteps)}
            className="w-full px-4 py-2.5 bg-space-900/90 flex items-center justify-between text-left font-mono font-semibold text-cyan-300 hover:bg-space-800/80 transition-all"
          >
            <div className="flex items-center space-x-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Where The System Suggests To Look Next (Uncertainty Mitigation)</span>
            </div>
            {showNextSteps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showNextSteps && (
            <div className="p-3.5 space-y-2 border-t border-slate-800 bg-space-950/60 font-mono text-[11px]">
              {incident.where_to_look_next.map((step, idx) => (
                <div key={idx} className="flex items-start space-x-2 text-slate-300">
                  <span className="text-cyan-400 font-bold">[{idx + 1}]</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
