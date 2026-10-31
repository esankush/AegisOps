import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, FileCode, Play, Sparkles, Cpu, Server, Database, 
  ShieldAlert, Terminal, RotateCcw, Layers, HardDrive, Wifi, CheckCircle2 
} from 'lucide-react';

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
    label: "📭 Kafka Partition Offline",
    badge: "kafka-broker",
    service: "kafka-broker-3",
    title: "Kafka Broker Partition 12 Desynchronized & Offline",
    logs: `2026-10-31 03:35:10.120 [kafka-broker-3] ERROR [KafkaServer id=3] Fatal error during KafkaServer startup. Prepare to shutdown (kafka.server.KafkaServer)
org.apache.kafka.common.errors.LeaderNotAvailableException: There is no leader for partition checkout-events-12
[kafka-coordinator] WARN [GroupCoordinator 3]: Failed to write empty metadata for group cart-analytics-group: NOT_COORDINATOR`
  },
  {
    label: "🐍 Python Async Traceback",
    badge: "python",
    service: "cart-service",
    title: "Python AsyncIO Deadlock in Cart Service",
    logs: `2026-10-31 03:40:02.109 [cart-service] ERROR: Traceback (most recent call last):
  File "/app/services/cart/checkout.py", line 142, in process_cart_lock
    await redis_pool.acquire_lock(user_id, timeout=2.0)
  File "/usr/local/lib/python3.12/asyncio/tasks.py", line 498, in wait_for
    raise exceptions.TimeoutError("Redis mutex lock acquisition timed out after 2000ms")
TimeoutError: Redis mutex lock acquisition timed out after 2000ms`
  },
  {
    label: "⚡ Custom / Unstructured Drift",
    badge: "drift",
    service: "runtime-worker",
    title: "Corrupted Buffer Frame & Peer Disconnect",
    logs: `CRITICAL_PANIC_CORE_DUMP_0x89AA12: corrupted frame in buffer slot 92
unhandled drift state: sequence interrupted by peer disconnect
unknown payload format: [RAW_STREAM_NON_RFC] bytes=0x4141414141414141`
  }
];

// Dynamic Target Extractor
function extractDynamicTarget(text) {
  if (!text || !text.trim()) return "workload-service";

  // 1. Bracketed identifier [service-name]
  const bracketMatches = text.match(/\[([a-zA-Z0-9_\-\.]{3,35})\]/g);
  const ignoredBrackets = new Set([
    "INFO", "ERROR", "WARN", "WARNING", "FATAL", "DEBUG", "TRACE", "CRITICAL",
    "POSTGRES", "UTC", "STDERR", "STDOUT", "SYSLOG", "KUBELET", "SYSTEMD",
    "KERNEL", "AUDIT", "FAIL", "PANIC", "EMERG"
  ]);
  if (bracketMatches) {
    for (const b of bracketMatches) {
      const clean = b.slice(1, -1);
      if (!ignoredBrackets.has(clean.toUpperCase()) && !clean.startsWith("TS_") && isNaN(clean)) {
        return clean.toLowerCase();
      }
    }
  }

  // 2. Systemd service unit (e.g. mysqld.service, rabbitmq.service)
  const systemdMatch = text.match(/([a-zA-Z0-9_\-\.]+)\.service/i);
  if (systemdMatch) return systemdMatch[1].toLowerCase();

  // 3. Linux Kernel killed process
  const killedMatch = text.match(/kill(?:ed)?\s+process\s+\d+\s+\(([\w\.\-]+)\)/i);
  if (killedMatch) return killedMatch[1].toLowerCase();

  // 4. Kubernetes pod or container
  const k8sMatch = text.match(/(?:pod[\s\/]+|container[\s:=]+)([\w\.\-]+)/i);
  if (k8sMatch) return k8sMatch[1].toLowerCase();

  // 5. Upstream proxy target or URL
  const upstreamMatch = text.match(/(?:upstream|connecting to|host)[:\s]+["']?(?:https?:\/\/)?([a-zA-Z0-9_\-\.]+)(?::\d+)?/i);
  if (upstreamMatch) {
    const cand = upstreamMatch[1].toLowerCase();
    if (cand !== "127.0.0.1" && cand !== "localhost" && cand !== "0.0.0.0") {
      return cand;
    }
  }

  // 6. Hyphenated microservice slug (e.g. auth-service, order-processor, billing-api)
  const slugMatch = text.match(/\b([a-z0-9]+-(?:service|worker|api|gateway|server|app|db|processor|daemon|engine|broker|cluster|node))\b/i);
  if (slugMatch) return slugMatch[1].toLowerCase();

  // 7. Common infrastructure keywords
  const lower = text.toLowerCase();
  const keywordMap = [
    ["kafka", "kafka-broker"],
    ["zookeeper", "zookeeper-cluster"],
    ["elasticsearch", "elasticsearch-cluster"],
    ["opensearch", "opensearch-cluster"],
    ["rabbitmq", "rabbitmq-server"],
    ["redis", "redis-cluster"],
    ["postgres", "postgresql-primary"],
    ["psql", "postgresql-primary"],
    ["mysql", "mysqld"],
    ["mariadb", "mariadb-server"],
    ["nginx", "nginx-ingress"],
    ["envoy", "envoy-gateway"],
    ["traefik", "traefik-proxy"],
    ["vault", "vault-secrets"],
    ["consul", "consul-cluster"],
    ["cart", "cart-service"],
    ["checkout", "checkout-service"],
    ["billing", "billing-worker"],
    ["payment", "payment-processor"],
    ["auth", "auth-service"],
    ["order", "order-service"],
    ["search", "search-api"],
    ["notification", "notification-worker"]
  ];
  for (const [kw, svc] of keywordMap) {
    if (lower.includes(kw)) return svc;
  }

  // 8. Extract first 2 distinct alphanumeric words
  const words = text.match(/[a-zA-Z0-9]{3,15}/g);
  if (words && words.length >= 2) {
    const s = `${words[0].toLowerCase()}-${words[1].toLowerCase()}`;
    if (!["out-of", "failed-to", "error-in", "unable-to"].includes(s)) {
      return s;
    }
  }

  return "workload-service";
}

export default function CustomLogModal({ isOpen, onClose, onSubmit, isSubmitting }) {
  const [logs, setLogs] = useState('');
  const [title, setTitle] = useState('');
  const [service, setService] = useState('');
  
  // Track if user explicitly edited the inputs manually
  const [userEditedTitle, setUserEditedTitle] = useState(false);
  const [userEditedService, setUserEditedService] = useState(false);

  // Dynamic Real-time Detection Engine
  const detection = useMemo(() => {
    if (!logs.trim()) return null;
    const lower = logs.toLowerCase();
    const dynamicTarget = extractDynamicTarget(logs);

    // 1. Linux Kernel OOM
    if (lower.includes('oom-killer') || lower.includes('out of memory') || lower.includes('kernel: [') || lower.includes('killed process')) {
      return {
        target: dynamicTarget,
        category: "Linux OS Kernel Memory Starvation",
        severity: "P1 - CRITICAL",
        icon: Cpu,
        color: "text-rose-400 bg-rose-500/10 border-rose-500/30",
        inferredTitle: `Linux Kernel OOM Killer: Terminated '${dynamicTarget}' (Signal 9)`
      };
    }

    // 2. Nginx / Ingress 502 Refused
    if (lower.includes('nginx') || lower.includes('502 bad gateway') || lower.includes('connection refused') || lower.includes('upstream')) {
      return {
        target: dynamicTarget === "workload-service" ? "nginx-ingress" : dynamicTarget,
        category: "Ingress Reverse Proxy Socket Rejection (502 Refused)",
        severity: "P1 - CRITICAL",
        icon: Server,
        color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
        inferredTitle: `Nginx Ingress 502 Bad Gateway: Upstream Socket Refused on '${dynamicTarget}'`
      };
    }

    // 3. PostgreSQL / Relational DB
    if (lower.includes('postgres') || lower.includes('psql') || lower.includes('connection slots') || lower.includes('deadlock') || lower.includes('max_connections')) {
      return {
        target: dynamicTarget === "workload-service" ? "postgresql-primary" : dynamicTarget,
        category: "Database Connection Pool Collapse & Deadlock",
        severity: "P1 - CRITICAL",
        icon: Database,
        color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
        inferredTitle: `PostgreSQL Pool Saturation: Remaining Connection Slots Reserved on '${dynamicTarget}'`
      };
    }

    // 4. Redis Memory / Cache
    if (lower.includes('redis') || lower.includes('maxmemory') || lower.includes('noeviction')) {
      return {
        target: dynamicTarget === "workload-service" ? "redis-cluster" : dynamicTarget,
        category: "In-Memory Cache Key Eviction & OOM Failure",
        severity: "P2 - MAJOR",
        icon: Database,
        color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
        inferredTitle: `Redis OOM: Command Not Allowed on '${dynamicTarget}' (MaxMemory Exceeded)`
      };
    }

    // 5. Kubernetes CrashLoopBackOff
    if (lower.includes('crashloopbackoff') || lower.includes('exit code 137') || lower.includes('oomkilled') || lower.includes('kubelet')) {
      return {
        target: dynamicTarget,
        category: "Kubernetes Pod CrashLoopBackOff & Eviction",
        severity: "P1 - CRITICAL",
        icon: Layers,
        color: "text-rose-400 bg-rose-500/10 border-rose-500/30",
        inferredTitle: `Kubernetes Pod CrashLoopBackOff: '${dynamicTarget}' Terminated (Exit 137)`
      };
    }

    // 6. Kafka Message Broker
    if (lower.includes('kafka') || lower.includes('leadernotavailable') || lower.includes('offsetcommit') || lower.includes('consumer group')) {
      return {
        target: dynamicTarget,
        category: "Message Broker Partition Desynchronization & Consumer Lag",
        severity: "P1 - CRITICAL",
        icon: Server,
        color: "text-amber-300 bg-amber-500/10 border-amber-500/30",
        inferredTitle: `Kafka Broker Partition Offline: LeaderNotAvailable on '${dynamicTarget}'`
      };
    }

    // 7. Elasticsearch / Search Cluster
    if (lower.includes('elasticsearch') || lower.includes('opensearch') || lower.includes('cluster_block_exception') || lower.includes('unassigned shards')) {
      return {
        target: dynamicTarget,
        category: "Search Index Shard Allocation & Circuit Breaker Collapse",
        severity: "P1 - CRITICAL",
        icon: Database,
        color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
        inferredTitle: `Elasticsearch Cluster Red: Unassigned Shards on '${dynamicTarget}'`
      };
    }

    // 8. Disk Space Exhaustion
    if (lower.includes('no space left') || lower.includes('disk full') || lower.includes('read-only file system')) {
      return {
        target: dynamicTarget,
        category: "Host Disk Space Exhaustion & Filesystem Lock",
        severity: "P1 - CRITICAL",
        icon: HardDrive,
        color: "text-red-400 bg-red-500/10 border-red-500/30",
        inferredTitle: `Disk Space Exhaustion: No Space Left on Device (${dynamicTarget})`
      };
    }

    // 9. Network Socket / DNS
    if (lower.includes('name resolution') || lower.includes('connection reset') || lower.includes('broken pipe') || lower.includes('econnreset')) {
      return {
        target: dynamicTarget,
        category: "Network Transport Socket Timeout & DNS Resolution Failure",
        severity: "P1 - CRITICAL",
        icon: Wifi,
        color: "text-sky-400 bg-sky-500/10 border-sky-500/30",
        inferredTitle: `Network Socket Refusal & DNS Resolution Timeout on '${dynamicTarget}'`
      };
    }

    // 10. Java Spring JVM
    if (lower.includes('nullpointerexception') || lower.includes('outofmemoryerror: java heap') || lower.includes('at com.')) {
      return {
        target: dynamicTarget,
        category: "Java Spring JVM Thread Starvation & Exception",
        severity: "P1 - CRITICAL",
        icon: Cpu,
        color: "text-orange-400 bg-orange-500/10 border-orange-500/30",
        inferredTitle: `Java Spring JVM Exception in '${dynamicTarget}'`
      };
    }

    // 11. Python Runtime Traceback
    if (lower.includes('traceback (most recent call last)') || lower.includes('timeouterror') || lower.includes('unhandled exception')) {
      return {
        target: dynamicTarget,
        category: "Python Asynchronous Runtime Traceback & Process Crash",
        severity: "P1 - CRITICAL",
        icon: Terminal,
        color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
        inferredTitle: `Python Runtime Exception in '${dynamicTarget}'`
      };
    }

    // 12. Dynamic Custom Service Problem
    const firstLine = logs.trim().split('\n')[0].slice(0, 40);
    return {
      target: dynamicTarget,
      category: `${dynamicTarget.toUpperCase()} Service Degradation & Anomaly`,
      severity: "P1 - CRITICAL",
      icon: ShieldAlert,
      color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
      inferredTitle: `Production Outage on '${dynamicTarget}': ${firstLine}...`
    };
  }, [logs]);

  // Synchronize draft title and target with auto-detection if user hasn't explicitly typed them
  useEffect(() => {
    if (detection) {
      if (!userEditedTitle) {
        setTitle(detection.inferredTitle);
      }
      if (!userEditedService) {
        setService(detection.target);
      }
    }
  }, [detection, userEditedTitle, userEditedService]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset) => {
    setLogs(preset.logs);
    setTitle(preset.title);
    setService(preset.service);
    setUserEditedTitle(false);
    setUserEditedService(false);
  };

  const handleClear = () => {
    setLogs('');
    setTitle('');
    setService('');
    setUserEditedTitle(false);
    setUserEditedService(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!logs.trim()) return;

    const finalTitle = title.trim() || (detection ? detection.inferredTitle : "Production Incident Outage");
    const finalService = service.trim() || (detection ? detection.target : "workload-service");

    onSubmit({
      service: finalService,
      title: finalTitle,
      raw_logs: logs
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="glass-panel-glow w-full max-w-2xl rounded-2xl flex flex-col overflow-hidden border border-cyan-500/40 shadow-[0_0_40px_rgba(0,240,255,0.2)] max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700/60 bg-space-900/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <span>Paste Error Logs &amp; Incident Triage</span>
                <span className="text-[10px] font-mono font-normal bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/40">
                  Adaptive Multi-Agent Triage
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Specify your incident title &amp; target microservice — AegisOps dynamically builds causal topology and surgical remediation.
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
          
          {/* 1. TOP PROMINENT INPUT: INCIDENT TITLE (ASKED TO USER) */}
          <div className="p-3.5 rounded-xl bg-space-900/70 border border-slate-700/80 space-y-1.5">
            <label className="text-slate-200 font-mono font-bold text-xs flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <span className="text-cyan-400 font-bold">1.</span>
                <span>Incident Title * (What happened?)</span>
              </span>
              {userEditedTitle && (
                <button
                  type="button"
                  onClick={() => {
                    setUserEditedTitle(false);
                    if (detection) setTitle(detection.inferredTitle);
                  }}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center space-x-1"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset to auto-detected</span>
                </button>
              )}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setUserEditedTitle(true);
              }}
              placeholder="e.g. Linux Kernel OOM Killer on mysqld, Payment Gateway 502 Refused, Kafka Broker Partition Loss"
              required
              className="w-full bg-space-950 border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 text-slate-100 font-medium text-xs focus:outline-none transition-colors"
            />
            <p className="text-[10px] text-slate-400 font-mono">
              Provide a clear name for this war room incident, or let live auto-detection formulate it from your logs.
            </p>
          </div>

          {/* 2. TOP PROMINENT INPUT: TARGET MICROSERVICE / COMPONENT */}
          <div className="p-3.5 rounded-xl bg-space-900/70 border border-slate-700/80 space-y-1.5">
            <label className="text-slate-200 font-mono font-bold text-xs flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <span className="text-cyan-400 font-bold">2.</span>
                <span>Target Microservice / Component * (Which system broke?)</span>
              </span>
              {userEditedService && (
                <button
                  type="button"
                  onClick={() => {
                    setUserEditedService(false);
                    if (detection) setService(detection.target);
                  }}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center space-x-1"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset to auto-detected</span>
                </button>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                value={service}
                onChange={(e) => {
                  setService(e.target.value);
                  setUserEditedService(true);
                }}
                placeholder="e.g. mysqld, nginx-ingress, payment-worker, cart-service, kafka-broker-3"
                required
                className="w-full bg-space-950 border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 text-cyan-300 font-mono font-semibold text-xs focus:outline-none transition-colors"
              />
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              The isolated component receiving triage, causal topology isolation, and surgical remediation commands.
            </p>
          </div>

          {/* 3. LOG INPUT TEXTAREA */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-200 font-mono font-bold flex items-center space-x-1.5 text-xs">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>3. Paste Server Crash Logs, dmesg, Stack Traces, or Text *</span>
              </label>

              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] font-mono text-rose-400 hover:text-rose-300 flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            <textarea
              rows={7}
              value={logs}
              onChange={(e) => setLogs(e.target.value)}
              placeholder="📋 Paste anything here! (e.g. Linux kernel panics, OOM killer traces, Nginx 502, Postgres connection locks, Kafka partition offline, Python/Node.js stack traces, or custom error text)..."
              required
              className="w-full bg-space-900/90 border border-slate-700 rounded-xl p-3.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-400 leading-relaxed placeholder:text-slate-600 shadow-inner"
            />
          </div>

          {/* 4. Real-World Crash Shortcuts */}
          <div>
            <label className="block text-slate-400 font-mono mb-1.5 text-[11px] flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Or click a real-world scenario to test instant triage:</span>
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

          {/* 5. Live Real-Time Auto-Detection Card */}
          {detection && (
            <div className={`p-3.5 rounded-xl border flex items-start space-x-3 transition-all ${detection.color}`}>
              <detection.icon className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                    <span>● Target Isolated:</span>
                    <span className="text-white bg-black/40 px-2 py-0.5 rounded font-mono border border-white/10">
                      {service.trim() || detection.target}
                    </span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10 font-semibold">
                    {detection.severity}
                  </span>
                </div>
                <p className="text-[11px] text-slate-200 font-mono">
                  Failure Class: <span className="text-cyan-300 font-bold">{detection.category}</span>
                </p>
                <p className="text-[10px] text-slate-400">
                  Target Component isolated to <code className="text-cyan-300 font-bold">{service.trim() || detection.target}</code>. Topology nodes &amp; rollback commands will be generated specifically for this system.
                </p>
              </div>
            </div>
          )}

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
              disabled={isSubmitting || !logs.trim() || !title.trim() || !service.trim()}
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
