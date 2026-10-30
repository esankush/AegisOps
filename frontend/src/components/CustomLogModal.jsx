import React, { useState } from 'react';
import { X, FileCode, Play, Sparkles, AlertCircle } from 'lucide-react';

const SAMPLE_LOGS = `2026-10-30T18:15:02.194Z [payment-processor] [FATAL] java.lang.NullPointerException: Cannot invoke "com.stripe.model.PaymentIntent.getStatus()" because "intent" is null
    at com.payment.service.BillingService.processCharge(BillingService.java:214)
    at com.payment.service.BillingService$$FastClassBySpringCGLIB.invoke(<generated>)
    at org.springframework.cglib.proxy.MethodProxy.invoke(MethodProxy.java:218)
    at org.springframework.aop.framework.CglibAopProxy$CglibMethodInvocation.invokeJoinpoint(CglibAopProxy.java:793)
2026-10-30T18:15:05.811Z [payment-processor] [ERROR] Unhandled RejectedExecutionException: Thread pool exhausted (queue capacity 500 reached)
2026-10-30T18:15:10.002Z [api-gateway] [ERROR] HTTP 502 Bad Gateway while routing to http://payment-processor:8080/v1/charge`;

export default function CustomLogModal({ isOpen, onClose, onSubmit, isSubmitting }) {
  const [service, setService] = useState('payment-processor');
  const [title, setTitle] = useState('Critical NullPointer in BillingService');
  const [logs, setLogs] = useState('');

  if (!isOpen) return null;

  const handleLoadSample = () => {
    setService('payment-processor');
    setTitle('NullPointerException & Thread Pool Starvation');
    setLogs(SAMPLE_LOGS);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!logs.trim()) return;
    onSubmit({ service, title, raw_logs: logs });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="glass-panel-glow w-full max-w-2xl rounded-2xl flex flex-col overflow-hidden border border-cyan-500/40 shadow-[0_0_40px_rgba(0,240,255,0.2)]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700/60 bg-space-900/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Paste Custom Error Logs
              </h3>
              <p className="text-xs text-slate-400">
                Trigger autonomous multi-agent triage on your own stack traces
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-space-950/90 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-mono mb-1.5 font-semibold">
                Target Microservice:
              </label>
              <input
                type="text"
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="e.g. checkout-service, auth-api"
                required
                className="w-full bg-space-900/90 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-mono mb-1.5 font-semibold">
                Incident Title:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Memory Leak on /checkout"
                required
                className="w-full bg-space-900/90 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Textarea for Raw Logs */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-mono font-semibold">
                Raw Log Stream / Stack Trace:
              </label>
              <button
                type="button"
                onClick={handleLoadSample}
                className="flex items-center space-x-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline"
              >
                <Sparkles className="w-3 h-3" />
                <span>Load Sample Stack Trace</span>
              </button>
            </div>
            <textarea
              rows={9}
              value={logs}
              onChange={(e) => setLogs(e.target.value)}
              placeholder="Paste terminal logs, Sentry errors, Kubernetes crash traces, or Datadog exceptions here..."
              required
              className="w-full bg-space-900/90 border border-slate-700 rounded-xl p-3 text-slate-200 font-mono text-[11px] leading-relaxed focus:outline-none focus:border-cyan-400 placeholder:text-slate-600 resize-none"
            />
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono bg-space-900/60 p-2.5 rounded-xl border border-slate-800">
            <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>The Multi-Agent Crew will parse error lines, isolate stack frames, hypothesize root causes, and propose a hotfix.</span>
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-space-800 hover:bg-space-700 transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !logs.trim()}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isSubmitting ? 'Crew Analyzing...' : 'Analyze with AegisOps Squad'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
