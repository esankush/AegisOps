import React, { useState, useEffect, useRef } from "react";
import { 
  Terminal, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  ChevronDown, 
  Activity, 
  Server,
  RefreshCw,
  Cpu,
  Flame,
  Radio
} from "lucide-react";

export default function AegisOpsApp() {
  const [incidentState, setIncidentState] = useState("HEALTHY"); // HEALTHY | FAILING | RESOLVING | RESOLVED
  const [activeScenario, setActiveScenario] = useState(null);
  const [agentLogs, setAgentLogs] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [autoPilot, setAutoPilot] = useState(true);
  const consoleRef = useRef(null);

  // Auto-scroll chat feed as agents talk
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [agentLogs]);

  // WebSocket connection to FastAPI backend
  useEffect(() => {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = window.location.hostname === "localhost" ? "localhost:8000" : window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/api/ws/warroom`;

    let ws;
    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => setWsConnected(false);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "INCIDENT_CREATED") {
            setIncidentState("FAILING");
            setAgentLogs([]);
          } else if (data.type === "AGENT_THOUGHT") {
            setAgentLogs((prev) => [...prev, data.thought]);
            if (data.thought.step === "VERIFICATION" || data.incident?.status === "RESOLVED") {
              setIncidentState("RESOLVED");
            }
          }
        } catch (e) {
          console.error("Error parsing WebSocket message", e);
        }
      };
    } catch (err) {
      console.warn("WebSocket unavailable. Running in local demonstration fallback mode.");
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  // Trigger real backend or graceful client demonstration
  const triggerCrash = async (scenarioId) => {
    setActiveScenario(scenarioId);
    setIncidentState("FAILING");
    setAgentLogs([
      {
        agent_name: "Host Kernel",
        avatar: "💥",
        step: "CRASH_INJECTED",
        content: `ALERT: Critical fault injected [${scenarioId}]. Service heartbeat dropped to 0!`,
        confidence: 1.0,
      },
    ]);

    try {
      const res = await fetch(`http://localhost:8000/api/scenarios/${scenarioId}/trigger`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Backend API responded with error");
    } catch (err) {
      console.log("Backend offline or unreachable, demonstrating real-time agent workflow on frontend:", err);
      simulateAutonomousSequence(scenarioId);
    }
  };

  // Autonomous Multi-Agent sequence simulation fallback
  const simulateAutonomousSequence = (scenario) => {
    const sequence = [
      {
        avatar: "🛡️",
        agent_name: "Sentinel",
        step: "TRIAGE",
        content: "CRITICAL ALERT: Node saturation anomaly detected! CPU usage 99.8%, response timeout > 5000ms. Dispatched incident ticket #INC-892 to Scout.",
        confidence: 0.98,
      },
      {
        avatar: "🔍",
        agent_name: "Scout",
        step: "INVESTIGATION",
        content: "Scanned 12,400 raw log lines. Identified fault signature: java.lang.OutOfMemoryError: Java heap space. Process PID 4018 terminated with ExitCode 137.",
        confidence: 0.95,
      },
      {
        avatar: "🔮",
        agent_name: "Oracle",
        step: "RCA",
        content: "Hypothesis confirmed via ML Log Classifier (96.4% calibrated confidence). Causal root cause: Memory leak in concurrent transaction worker pool.",
        confidence: 0.964,
      },
      {
        avatar: "⚙️",
        agent_name: "Armorer",
        step: "REMEDIATION",
        content: "Formulated hotfix playbook: Bump cgroup memory ceiling to 4Gi, flush deadlocked slabs, and trigger zero-downtime rolling restart.",
        confidence: 0.99,
      },
      {
        avatar: "⭐",
        agent_name: "Commander",
        step: "EXECUTION & VERIFICATION",
        content: "Auto-Pilot: Confidence threshold passed (96.4% >= 85%). Patch executed via cluster API. Live health probe returned HTTP 200. Cluster restored to NOMINAL.",
        confidence: 1.0,
      },
    ];

    sequence.forEach((msg, idx) => {
      setTimeout(() => {
        setAgentLogs((prev) => [...prev, msg]);
        if (idx === sequence.length - 1) {
          setIncidentState("RESOLVED");
        }
      }, (idx + 1) * 1400);
    });
  };

  const scrollToConsole = () => {
    document.getElementById("interactive-console")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-white">
      
      {/* ========================================================
          PHASE 1: STORYTELLING AGENT INTRODUCTIONS (FULL VIEWPORT)
          ======================================================== */}

      {/* 1. Main Agent (Commander) First Introduction */}
      <section className="h-screen flex flex-col justify-center items-center px-6 relative border-b border-slate-900 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-3xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-400 text-xs font-mono tracking-widest uppercase">
            <Sparkles size={14} /> Autonomous Incident Response Squad
          </div>
          
          <div className="text-7xl mb-2 animate-pulse">⭐</div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500">
            "I am Commander."
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 leading-relaxed">
            I am the main orchestrator of this squad. When a production server collapses, I coordinate our agents, 
            govern security gates, and execute surgical hotfixes to restore the cluster without waking up human engineers.
          </p>

          <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/30 text-cyan-300 text-sm font-mono max-w-lg mx-auto">
            "Here comes our next agent who guards the servers 24/7..."
          </div>

          <div className="pt-4 flex flex-col items-center gap-2 text-slate-400 text-xs font-mono">
            <span>Scroll down to meet Sentinel</span>
            <ChevronDown className="animate-bounce text-cyan-400" size={24} />
          </div>
        </div>
      </section>

      {/* 2. Sentinel Introduction */}
      <section className="h-screen flex flex-col justify-center items-center px-6 relative border-b border-slate-900 bg-slate-950">
        <div className="max-w-3xl text-center space-y-6">
          <div className="text-7xl mb-2">🛡️</div>
          <h2 className="text-3xl sm:text-5xl font-bold text-emerald-400 font-mono">
            "I am Sentinel."
          </h2>
          <p className="text-lg sm:text-xl text-slate-300 leading-relaxed">
            I watch the server's heartbeat every second—monitoring CPU spikes, RAM exhaustion, and latency anomalies. 
            The microsecond an outage starts, I catch it and raise the alarm before users notice.
          </p>
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/20 text-emerald-300 text-sm font-mono max-w-lg mx-auto">
            "Here comes our next agent who dives straight into the crash logs..."
          </div>
          <div className="pt-2 flex flex-col items-center gap-2 text-slate-400 text-xs font-mono">
            <span>Scroll down to meet Scout</span>
            <ChevronDown className="animate-bounce text-emerald-400" size={24} />
          </div>
        </div>
      </section>

      {/* 3. Scout Introduction */}
      <section className="h-screen flex flex-col justify-center items-center px-6 relative border-b border-slate-900 bg-slate-950">
        <div className="max-w-3xl text-center space-y-6">
          <div className="text-7xl mb-2">🔍</div>
          <h2 className="text-3xl sm:text-5xl font-bold text-amber-400 font-mono">
            "I am Scout."
          </h2>
          <p className="text-lg sm:text-xl text-slate-300 leading-relaxed">
            When Sentinel rings the alarm, I instantly ingest and analyze tens of thousands of messy stack traces, 
            terminal dumps, and container outputs to pinpoint the exact failure signature and offending line of code.
          </p>
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-950/20 text-amber-300 text-sm font-mono max-w-lg mx-auto">
            "Here comes our reasoning brain who figures out the root cause..."
          </div>
          <div className="pt-2 flex flex-col items-center gap-2 text-slate-400 text-xs font-mono">
            <span>Scroll down to meet Oracle</span>
            <ChevronDown className="animate-bounce text-amber-400" size={24} />
          </div>
        </div>
      </section>

      {/* 4. Oracle Introduction */}
      <section className="h-screen flex flex-col justify-center items-center px-6 relative border-b border-slate-900 bg-slate-950">
        <div className="max-w-3xl text-center space-y-6">
          <div className="text-7xl mb-2">🔮</div>
          <h2 className="text-3xl sm:text-5xl font-bold text-purple-400 font-mono">
            "I am Oracle."
          </h2>
          <p className="text-lg sm:text-xl text-slate-300 leading-relaxed">
            I run causal machine learning models over Scout's evidence. I eliminate false timestamp drifts, 
            isolate the exact root cause, and pass the diagnosis to Armorer to stage the remediation patch.
          </p>
          <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-950/20 text-purple-300 text-sm font-mono max-w-lg mx-auto">
            "Now Commander is returning to lead us into action..."
          </div>
          <div className="pt-2 flex flex-col items-center gap-2 text-slate-400 text-xs font-mono">
            <span>Scroll down for the mission</span>
            <ChevronDown className="animate-bounce text-purple-400" size={24} />
          </div>
        </div>
      </section>

      {/* 5. Main Agent (Commander) Returns */}
      <section className="h-screen flex flex-col justify-center items-center px-6 relative bg-gradient-to-t from-slate-900 via-slate-950 to-slate-950 text-center">
        <div className="max-w-2xl space-y-6">
          <div className="text-7xl animate-bounce">⭐</div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-cyan-300">
            "Let's solve the issue real quick."
          </h2>
          <p className="text-slate-300 text-base sm:text-lg">
            Below is the live incident cockpit. Inject a real server crash, watch our agents talk to each other, 
            and see the server recover back to green in seconds.
          </p>
          <button 
            onClick={scrollToConsole}
            className="px-8 py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-base transition-all shadow-lg shadow-cyan-500/25 hover:scale-105 inline-flex items-center gap-3"
          >
            Launch Incident Cockpit <Play size={18} fill="currentColor" />
          </button>
        </div>
      </section>


      {/* ========================================================
          PHASE 2: INTERACTIVE CRASH INJECTION & AGENT WAR ROOM
          ======================================================== */}
      
      <main id="interactive-console" className="min-h-screen py-16 px-4 sm:px-8 max-w-7xl mx-auto space-y-8">
        
        {/* Status Dashboard Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-xl transition-colors duration-500 ${
              incidentState === "FAILING" ? "bg-rose-500/20 text-rose-400 animate-pulse" :
              incidentState === "RESOLVED" ? "bg-emerald-500/20 text-emerald-400" :
              "bg-cyan-500/20 text-cyan-400"
            }`}>
              <Server size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold">Target Cluster: us-east-1</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-mono font-semibold transition-colors duration-500 ${
                  incidentState === "FAILING" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" :
                  incidentState === "RESOLVED" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                  "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                }`}>
                  {incidentState}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Active Scenario: <span className="text-slate-200">{activeScenario || "Nominal Operations (Idle)"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setAutoPilot(!autoPilot)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-2 ${
                autoPilot 
                  ? "bg-cyan-950/60 border-cyan-500/40 text-cyan-300" 
                  : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              <Radio size={14} className={autoPilot ? "animate-pulse text-cyan-400" : ""} />
              Auto-Pilot: {autoPilot ? "ON (Full Auto)" : "OFF (Human Gate)"}
            </button>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${wsConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              <span className="text-xs font-mono text-slate-400">
                {wsConnected ? "WebSocket Connected" : "Local Engine"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Failure Injection Cockpit */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h4 className="text-sm font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Flame size={16} className="text-rose-400" /> Inject Server Crash
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Click any failure below to break the server. The multi-agent squad will immediately take over triage and remediation.
              </p>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => triggerCrash("memory_leak_crash")}
                  className="w-full text-left p-4 rounded-xl border border-rose-500/20 bg-rose-950/20 hover:bg-rose-900/40 hover:border-rose-500/60 transition-all group"
                >
                  <div className="font-semibold text-rose-300 text-sm group-hover:translate-x-1 transition-transform flex items-center justify-between">
                    <span>💥 Canary Pod OOMKilled</span>
                    <span className="text-[10px] font-mono bg-rose-500/20 px-2 py-0.5 rounded text-rose-300">Exit 137</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                    Linux cgroup limit exceeded on payments-worker
                  </div>
                </button>

                <button
                  onClick={() => triggerCrash("db_pool_exhaustion")}
                  className="w-full text-left p-4 rounded-xl border border-amber-500/20 bg-amber-950/20 hover:bg-amber-900/40 hover:border-amber-500/60 transition-all group"
                >
                  <div className="font-semibold text-amber-300 text-sm group-hover:translate-x-1 transition-transform flex items-center justify-between">
                    <span>🔌 DB Connection Saturation</span>
                    <span className="text-[10px] font-mono bg-amber-500/20 px-2 py-0.5 rounded text-amber-300">Max Conns</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                    HikariCP connection leak / 100% Postgres pool exhaustion
                  </div>
                </button>

                <button
                  onClick={() => triggerCrash("cascading_504_gateway")}
                  className="w-full text-left p-4 rounded-xl border border-purple-500/20 bg-purple-950/20 hover:bg-purple-900/40 hover:border-purple-500/60 transition-all group"
                >
                  <div className="font-semibold text-purple-300 text-sm group-hover:translate-x-1 transition-transform flex items-center justify-between">
                    <span>⏳ Cascading 504 Gateway</span>
                    <span className="text-[10px] font-mono bg-purple-500/20 px-2 py-0.5 rounded text-purple-300">504 Timeout</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                    Ingress timeout due to upstream key rotation deadlock
                  </div>
                </button>
              </div>
            </div>

            {/* Pipeline Architecture Indicator */}
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 text-xs font-mono space-y-2">
              <div className="text-slate-400 uppercase font-bold tracking-wider mb-2">Agent Collaboration Graph:</div>
              <div className="flex items-center gap-2 text-emerald-400">
                <span>🛡️ Sentinel</span> <span className="text-slate-600">→</span> <span>Telemetry Anomaly</span>
              </div>
              <div className="flex items-center gap-2 text-amber-400">
                <span>🔍 Scout</span> <span className="text-slate-600">→</span> <span>Log Extraction</span>
              </div>
              <div className="flex items-center gap-2 text-purple-400">
                <span>🔮 Oracle</span> <span className="text-slate-600">→</span> <span>ML Root-Cause</span>
              </div>
              <div className="flex items-center gap-2 text-cyan-400">
                <span>⚙️ Armorer</span> <span className="text-slate-600">→</span> <span>Surgical Patch</span>
              </div>
              <div className="flex items-center gap-2 text-blue-400">
                <span>⭐ Commander</span> <span className="text-slate-600">→</span> <span>Auto Verification</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Inter-Agent Communication Feed */}
          <div className="lg:col-span-8 flex flex-col h-[580px] rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-2xl">
            {/* Console Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal size={18} className="text-cyan-400" />
                <span className="text-sm font-mono font-semibold">Live Inter-Agent War Room Feed</span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {agentLogs.length} events emitted
              </span>
            </div>

            {/* Scrollable Message Feed */}
            <div ref={consoleRef} className="flex-1 p-6 overflow-y-auto space-y-4 font-mono text-sm">
              {agentLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3">
                  <Activity size={32} className="animate-spin text-slate-600" />
                  <p className="text-xs">Cluster nominal. Click a crash scenario on the left to activate the agents.</p>
                </div>
              ) : (
                agentLogs.map((log, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-xl border bg-slate-950/70 space-y-2 transition-all ${
                      log.step === "CRASH_INJECTED" ? "border-rose-500/40 bg-rose-950/20" :
                      log.step === "VERIFICATION" ? "border-emerald-500/40 bg-emerald-950/20" :
                      "border-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-slate-200">
                        <span className="text-base">{log.avatar}</span>
                        <span>{log.agent_name}</span>
                        <span className="text-slate-500 font-normal">[{log.step}]</span>
                      </div>
                      {log.confidence && (
                        <span className="text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20 text-[10px]">
                          Calibrated Confidence: {(log.confidence * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                      {log.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Live Resolution Action Bar */}
            {incidentState === "RESOLVED" && (
              <div className="p-4 bg-emerald-950/40 border-t border-emerald-500/30 flex items-center justify-between text-emerald-300 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>Incident Resolved: Cluster healed autonomously. Downtime: 4.8s.</span>
                </div>
                <button
                  onClick={() => {
                    setIncidentState("HEALTHY");
                    setAgentLogs([]);
                    setActiveScenario(null);
                  }}
                  className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 rounded border border-emerald-500/40 text-emerald-200 transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw size={12} /> Reset Cockpit
                </button>
              </div>
            )}
          </div>

        </div>
      </main>

    </div>
  );
}
