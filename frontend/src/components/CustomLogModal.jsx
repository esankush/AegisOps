import React, { useState, useMemo } from 'react';
import { X, FileCode, Play, Sparkles, AlertCircle, Cpu, Server, Database, ShieldAlert, Terminal, ChevronDown, ChevronUp } from 'lucide-react';

const REAL_WORLD_PRESETS = [
  {
    label: "🐧 Linux Kernel OOM Panic",
    desc: "Host memory starvation triggering kernel oom-killer on mysqld",
    service: "mysqld",
    title: "Linux Kernel OOM Killer: mysqld Terminated (Exit 137)",
    logs: `kernel: [ 1420.312948] Out of memory: Kill process 18429 (mysqld) score 892 or sacrifice child
kernel: [ 1420.312952] Killed process 18429 (mysqld) total-vm:4294820kB, anon-rss:2104928kB, file-rss:0kB
systemd[1]: mysqld.service: Main process exited, code=killed, status=9/KILL
systemd[1]: mysqld.service: Failed with result 'oom-kill'.
systemd[1]: mysqld.service: Consumed 4min 12.891s CPU time.`
  },
  {
    label: "🌐 Nginx 502 Bad Gateway",
    desc: "Upstream socket connection refused on internal backend port 8080",
    service: "nginx-ingress",
    title: "Nginx Ingress 502 Bad Gateway: Upstream Socket Refused",
    logs: `2026/10/31 03:22:15 [error] 14221#14221: *8912 connect() failed (111: Connection refused) while connecting to upstream, client: 192.168.1.100, server: api.production.internal, request: "POST /v1/checkout HTTP/1.1", upstream: "http://127.0.0.1:8080/v1/checkout", host: "api.production.internal"
2026/10/31 03:22:16 [error] 14221#14221: *8915 no live upstreams while connecting to upstream, client: 192.168.1.102, server: api.production.internal, request: "GET /healthz HTTP/1.1", upstream: "http://app_backend/healthz"`
  },
  {
    label: "🗄️ PostgreSQL Connection Exhaustion",
    desc: "Active transaction pool saturation blocking incoming write queries",
    service: "postgresql-primary",
    title: "PostgreSQL Pool Saturation: Remaining Connection Slots Reserved",
    logs: `2026-10-31 03:30:12.891 UTC [postgres] [FATAL]: remaining connection slots are reserved for non-replication superuser connections
2026-10-31 03:30:13.104 UTC [order-service] [ERROR]: org.postgresql.util.PSQLException: FATAL: 53300: sorry, too many clients already
2026-10-31 03:30:15.002 UTC [api-gateway] [ERROR]: HTTP 500 Internal Server Error: failed to acquire connection from pool within 5000ms timeout`
  },
  {
    label: "📦 Kubernetes CrashLoopBackOff",
    desc: "Container pod terminated by Kubelet due to memory limits",
    service: "payment-worker",
    title: "Kubernetes Pod CrashLoopBackOff: Exit Code 137 (OOMKilled)",
    logs: `2026-10-31T03:32:01.002Z kubelet node-03: Container payment-worker in pod payment-worker-78fb9c-xz21 failed liveness probe, will be restarted
2026-10-31T03:32:05.419Z kubelet node-03: Container payment-worker terminated with exit code 137 (OOMKilled)
2026-10-31T03:32:15.892Z k8s-events: Back-off restarting failed container payment-worker in pod payment-worker-78fb9c-xz21_default`
  },
  {
    label: "⚡ Unstructured / Arbitrary Stream",
    desc: "Corrupted stream or raw unformatted syntax (Mentor Challenge #2)",
    service: "telemetry-pipeline",
    title: "Unrecognized Polymorphic Telemetry Stream",
    logs: `CRITICAL_PANIC_CORE_DUMP_0x89AA12: corrupted frame in buffer slot 92
unhandled drift state: sequence interrupted by peer disconnect
unknown payload format: [RAW_STREAM_NON_RFC] bytes=0x4141414141414141`
  }
];

export default function CustomLogModal({ isOpen, onClose, onSubmit, isSubmitting }) {
  const [logs, setLogs] = useState('');
  const [manualOverride, setManualOverride] = useState(false);
  const [customService, setCustomService] = useState('');
  const [customTitle, setCustomTitle] = useState('');

  // Live Auto-Detection Engine
  const detection = useMemo(() => {
    if (!logs.trim()) return null;
    const lower = logs.toLowerCase();

    // 1. Linux Kernel OOM
    if (lower.includes('oom-killer') || lower.includes('out of memory') || lower.includes('kernel: [') || lower.includes('killed process')) {
      const match = logs.match(/kill(?:ed)?\s+process\s+\d+\s+\(([\w\.\-]+)\)/i);
      const proc = match ? match[1] : 'mysqld';
      return {
        target: `${proc} (Linux Kernel OOM)`,
        service: proc,
        category: "Linux OS Kernel Crash",
        severity: "P1 - CRITICAL",
        icon: Cpu,
        color: "text-rose-400 bg-rose-500/10 border-rose-500/30",
        inferredTitle: `Linux Kernel OOM Killer: Terminated '${proc}' (Signal 9)`
      };
    }

    // 2. Nginx 502
    if (lower.includes('nginx') || lower.includes('502 bad gateway') || lower.includes('connection refused') || lower.includes('upstream')) {
      return {
        target: "nginx-ingress (Reverse Proxy)",
        service: "nginx-ingress",
        category: "Ingress Gateway Outage",
        severity: "P1 - CRITICAL",
        icon: Server,
        color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
        inferredTitle: "Nginx Ingress 502 Bad Gateway: Upstream Connection Refused"
      };
    }

    // 3. PostgreSQL / DB
    if (lower.includes('postgres') || lower.includes('psql') || lower.includes('connection slots') || lower.includes('deadlock') || lower.includes('max_connections')) {
      return {
        target: "postgresql-primary (Port 5432)",
        service: "postgresql-primary",
        category: "Database Connection Pool Collapse",
        severity: "P1 - CRITICAL",
        icon: Database,
        color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
        inferredTitle: "PostgreSQL Pool Saturation: Remaining Connection Slots Reserved"
      };
    }

    // 4. Redis OOM
    if (lower.includes('redis') || lower.includes('maxmemory') || lower.includes('noeviction')) {
      return {
        target: "redis-cluster (Port 6379)",
        service: "redis-cluster",
        category: "Redis Cache Key Eviction Failure",
        severity: "P2 - MAJOR",
        icon: Database,
        color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
        inferredTitle: "Redis OOM: Command Not Allowed (MaxMemory Exceeded)"
      };
    }

    // 5. Kubernetes CrashLoop
    if (lower.includes('crashloopbackoff') || lower.includes('exit code 137') || lower.includes('oomkilled') || lower.includes('kubelet')) {
      const podMatch = logs.match(/pod[\s\/]+([\w\.\-]+)/i) || logs.match(/container\s+([\w\.\-]+)/i);
      const pod = podMatch ? podMatch[1] : 'worker-pod';
      return {
        target: `Pod: ${pod} (Kubernetes)`,
        service: pod,
        category: "Kubernetes Container Termination",
        severity: "P1 - CRITICAL",
        icon: Server,
        color: "text-rose-400 bg-rose-500/10 border-rose-500/30",
        inferredTitle: `Kubernetes Pod CrashLoopBackOff: '${pod}' Terminated (Exit 137)`
      };
    }

    // 6. Generic / Unstructured Drift / Slang / "type shit"
    return {
      target: "telemetry-pipeline (Auto-Inferred)",
      service: "telemetry-pipeline",
      category: "Polymorphic Unstructured Anomaly",
      severity: "P2 - MAJOR",
      icon: ShieldAlert,
      color: "text-cyan-300 bg-cyan-500/10 border-cyan-500/30",
      inferredTitle: `Polymorphic Drift: ${logs.trim().slice(0, 35)}...`
    };
  }, [logs]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset) => {
    setLogs(preset.logs);
    setCustomService(preset.service);
    setCustomTitle(preset.title);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!logs.trim()) return;

    const finalService = manualOverride && customService.trim() 
      ? customService.trim() 
      : (detection ? detection.service : "auto-detected-service");

    const finalTitle = manualOverride && customTitle.trim() 
      ? customTitle.trim() 
      : (detection ? detection.inferredTitle : "Production Incident Outage");

    onSubmit({
      service: finalService,
      title: finalTitle,
      raw_logs: logs
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="glass-panel-glow w-full max-w-2xl rounded-2xl flex flex-col overflow-hidden border border-cyan-500/40 shadow-[0_0_40px_rgba(0,240,255,0.2)] max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700/60 bg-space-900/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <span>Autonomous Crash & Log Triage</span>
                <span className="text-[10px] font-mono font-normal bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/40">
                  Zero Configuration Required
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Paste any server crash logs, dmesg traces, or raw text — AegisOps auto-detects the system component & failure pattern
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-space-950/90 text-xs overflow-y-auto">
          
          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-slate-300 font-mono mb-2 font-semibold flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Load Real-World Crash Scenarios:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REAL_WORLD_PRESETS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="text-left p-2.5 rounded-xl bg-space-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-space-850 transition-all text-slate-300 flex flex-col group"
                >
                  <span className="font-semibold text-slate-200 group-hover:text-cyan-300 text-xs">{p.label}</span>
                  <span className="text-[10px] text-slate-400 line-clamp-1">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Textarea for Raw Logs */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-mono font-semibold flex items-center space-x-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Paste Crash Logs / Stack Trace / Raw Output:</span>
              </label>
              {logs.length > 0 && (
                <span className="text-[11px] font-mono text-cyan-400">
                  {logs.split('\n').filter(Boolean).length} lines detected
                </span>
              )}
            </div>

            <textarea
              rows={7}
              value={logs}
              onChange={(e) => setLogs(e.target.value)}
              placeholder="Paste any logs here (e.g. Linux kernel dmesg, Nginx 502, PostgreSQL connection errors, Python tracebacks, or raw unstructured text)..."
              required
              className="w-full bg-space-900/90 border border-slate-700 rounded-xl p-3 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-400 leading-relaxed placeholder:text-slate-600"
            />
          </div>

          {/* Live Auto-Detection Card */}
          {detection && (
            <div className={`p-3.5 rounded-xl border flex items-start space-x-3 transition-all ${detection.color}`}>
              <detection.icon className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-[11px]">
                    ● Auto-Detected: {detection.target}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10 font-semibold">
                    {detection.severity}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-mono">
                  Classification: <span className="text-white font-semibold">{detection.category}</span>
                </p>
                <p className="text-[10px] text-slate-400">
                  AegisOps will automatically map causal topology, evaluate epistemic uncertainty, and draft surgical remediation for <code className="text-cyan-300">{detection.service}</code> without requiring manual input.
                </p>
              </div>
            </div>
          )}

          {/* Optional Manual Override Toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setManualOverride(!manualOverride)}
              className="text-slate-400 hover:text-slate-200 font-mono text-[11px] flex items-center space-x-1"
            >
              <span>Advanced: Override Target Microservice / Title Manually</span>
              {manualOverride ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {manualOverride && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-3 rounded-xl bg-space-900/60 border border-slate-800">
                <div>
                  <label className="block text-slate-400 font-mono text-[10px] mb-1">
                    Custom Target Microservice:
                  </label>
                  <input
                    type="text"
                    value={customService}
                    onChange={(e) => setCustomService(e.target.value)}
                    placeholder={detection ? detection.service : "e.g. billing-worker"}
                    className="w-full bg-space-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono text-[10px] mb-1">
                    Custom Incident Title:
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder={detection ? detection.inferredTitle : "e.g. Memory Leak Outage"}
                    className="w-full bg-space-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-space-900 transition-all font-mono text-xs"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !logs.trim()}
              className="px-5 py-2.5 rounded-xl font-bold font-mono text-xs text-space-950 bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] flex items-center space-x-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isSubmitting ? 'Crew Investigating...' : 'Deploy Autonomous Triage'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
