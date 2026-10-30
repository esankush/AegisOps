import React, { useState, useMemo } from 'react';
import { X, FileCode, Play, Sparkles, AlertCircle, Cpu, Server, Database, ShieldAlert, Terminal, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

const REAL_WORLD_PRESETS = [
  {
    label: "🐧 Linux Kernel OOM",
    badge: "dmesg",
    service: "mysqld",
    title: "Linux Kernel OOM Killer: mysqld Terminated (Exit 137)",
    logs: `kernel: [ 1420.312948] Out of memory: Kill process 18429 (mysqld) score 892 or sacrifice child
kernel: [ 1420.312952] Killed process 18429 (mysqld) total-vm:4294820kB, anon-rss:2104928kB, file-rss:0kB
systemd[1]: mysqld.service: Main process exited, code=killed, status=9/KILL
systemd[1]: mysqld.service: Failed with result 'oom-kill'.
systemd[1]: mysqld.service: Consumed 4min 12.891s CPU time.`
  },
  {
    label: "🌐 Nginx 502 Refused",
    badge: "error.log",
    service: "nginx-ingress",
    title: "Nginx Ingress 502 Bad Gateway: Upstream Socket Refused",
    logs: `2026/10/31 03:22:15 [error] 14221#14221: *8912 connect() failed (111: Connection refused) while connecting to upstream, client: 192.168.1.100, server: api.production.internal, request: "POST /v1/checkout HTTP/1.1", upstream: "http://127.0.0.1:8080/v1/checkout", host: "api.production.internal"
2026/10/31 03:22:16 [error] 14221#14221: *8915 no live upstreams while connecting to upstream, client: 192.168.1.102, server: api.production.internal, request: "GET /healthz HTTP/1.1", upstream: "http://app_backend/healthz"`
  },
  {
    label: "🗄️ Postgres Pool Saturation",
    badge: "sql-error",
    service: "postgresql-primary",
    title: "PostgreSQL Pool Saturation: Remaining Connection Slots Reserved",
    logs: `2026-10-31 03:30:12.891 UTC [postgres] [FATAL]: remaining connection slots are reserved for non-replication superuser connections
2026-10-31 03:30:13.104 UTC [order-service] [ERROR]: org.postgresql.util.PSQLException: FATAL: 53300: sorry, too many clients already
2026-10-31 03:30:15.002 UTC [api-gateway] [ERROR]: HTTP 500 Internal Server Error: failed to acquire connection from pool within 5000ms timeout`
  },
  {
    label: "📦 K8s CrashLoopBackOff",
    badge: "kubelet",
    service: "payment-worker",
    title: "Kubernetes Pod CrashLoopBackOff: Exit Code 137 (OOMKilled)",
    logs: `2026-10-31T03:32:01.002Z kubelet node-03: Container payment-worker in pod payment-worker-78fb9c-xz21 failed liveness probe, will be restarted
2026-10-31T03:32:05.419Z kubelet node-03: Container payment-worker terminated with exit code 137 (OOMKilled)
2026-10-31T03:32:15.892Z k8s-events: Back-off restarting failed container payment-worker in pod payment-worker-78fb9c-xz21_default`
  },
  {
    label: "⚡ Unstructured Drift (\"type shit\")",
    badge: "polymorphic",
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
  const [overrideService, setOverrideService] = useState('');
  const [overrideTitle, setOverrideTitle] = useState('');

  // Live Auto-Detection Engine
  const detection = useMemo(() => {
    if (!logs.trim()) return null;
    const lower = logs.toLowerCase();

    // 1. Linux Kernel OOM
    if (lower.includes('oom-killer') || lower.includes('out of memory') || lower.includes('kernel: [') || lower.includes('killed process')) {
      const match = logs.match(/kill(?:ed)?\s+process\s+\d+\s+\(([\w\.\-]+)\)/i);
      const proc = match ? match[1] : 'mysqld';
      return {
        target: `${proc} (Linux Host Kernel)`,
        service: proc,
        category: "Linux OS Kernel Memory Starvation",
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
        category: "Ingress Gateway Outage (TCP 111 Refused)",
        severity: "P1 - CRITICAL",
        icon: Server,
        color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
        inferredTitle: "Nginx Ingress 502 Bad Gateway: Upstream Socket Refused"
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
        category: "Kubernetes Container Termination (Exit 137)",
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
      category: "Polymorphic Unstructured Anomaly (High Uncertainty)",
      severity: "P2 - MAJOR",
      icon: ShieldAlert,
      color: "text-cyan-300 bg-cyan-500/10 border-cyan-500/30",
      inferredTitle: `Polymorphic Drift: ${logs.trim().slice(0, 35)}...`
    };
  }, [logs]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset) => {
    setLogs(preset.logs);
    setOverrideService('');
    setOverrideTitle('');
  };

  const handleClear = () => {
    setLogs('');
    setOverrideService('');
    setOverrideTitle('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!logs.trim()) return;

    const finalService = manualOverride && overrideService.trim() 
      ? overrideService.trim() 
      : (detection ? detection.service : "auto-detected-service");

    const finalTitle = manualOverride && overrideTitle.trim() 
      ? overrideTitle.trim() 
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
                <span>Paste Error Logs &amp; Crash Dumps</span>
                <span className="text-[10px] font-mono font-normal bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/40">
                  Zero Config Auto-Triage
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Paste any logs or type text — AegisOps dynamically extracts the failing process, builds topology, and stages the fix.
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
          
          {/* 1. PRIMARY PASTE AREA - FRONT AND CENTER */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-200 font-mono font-bold flex items-center space-x-1.5 text-xs">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>Paste Any Server Crash Logs, dmesg, or Text:</span>
              </label>

              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] font-mono text-rose-400 hover:text-rose-300 flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <textarea
              rows={8}
              value={logs}
              onChange={(e) => {
                setLogs(e.target.value);
                setOverrideService('');
                setOverrideTitle('');
              }}
              placeholder="📋 Paste anything here! (e.g. Linux kernel panics, OOM killer traces, Nginx 502 errors, PostgreSQL locks, Python tracebacks, or raw unstructured text)..."
              required
              className="w-full bg-space-900/90 border border-slate-700 rounded-xl p-3.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-400 leading-relaxed placeholder:text-slate-600 shadow-inner"
            />
          </div>

          {/* 2. Sample Crash Shortcuts */}
          <div>
            <label className="block text-slate-400 font-mono mb-1.5 text-[11px] flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Or click to test with real-world crash logs:</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {REAL_WORLD_PRESETS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2.5 py-1.5 rounded-lg bg-space-900 hover:bg-space-800 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-200 transition-all text-[11px] font-mono flex items-center space-x-1"
                >
                  <span>{p.label}</span>
                  <span className="text-[9px] bg-slate-800 px-1 py-0.2 rounded text-slate-400">{p.badge}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Live Real-Time Auto-Detection Card */}
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
                  Failure Class: <span className="text-white font-semibold">{detection.category}</span>
                </p>
                <p className="text-[10px] text-slate-400">
                  Target Service is automatically isolated to <code className="text-cyan-300 font-bold">{detection.service}</code>. No manual input required.
                </p>
              </div>
            </div>
          )}

          {/* 4. Optional Manual Override */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setManualOverride(!manualOverride)}
              className="text-slate-400 hover:text-slate-200 font-mono text-[11px] flex items-center space-x-1"
            >
              <span>Optional: Override Target Microservice / Title</span>
              {manualOverride ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {manualOverride && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 p-3 rounded-xl bg-space-900/60 border border-slate-800">
                <div>
                  <label className="block text-slate-400 font-mono text-[10px] mb-1">
                    Custom Target Microservice:
                  </label>
                  <input
                    type="text"
                    value={overrideService}
                    onChange={(e) => setOverrideService(e.target.value)}
                    placeholder={detection ? detection.service : "e.g. checkout-service"}
                    className="w-full bg-space-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono text-[10px] mb-1">
                    Custom Incident Title:
                  </label>
                  <input
                    type="text"
                    value={overrideTitle}
                    onChange={(e) => setOverrideTitle(e.target.value)}
                    placeholder={detection ? detection.inferredTitle : "e.g. Database Connection Saturation"}
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
              <span>{isSubmitting ? 'Crew Investigating...' : 'Analyze & Deploy Triage'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
