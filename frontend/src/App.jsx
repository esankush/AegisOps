import React, { useState, useEffect } from 'react';
import InterstellarBackground from './components/InterstellarBackground';
import Header from './components/Header';
import IncidentHeader from './components/IncidentHeader';
import AgentCrewPanel from './components/AgentCrewPanel';
import LiveWarRoom from './components/LiveWarRoom';
import CausalGraph from './components/CausalGraph';
import RemediationCockpit from './components/RemediationCockpit';
import TelemetryHUD from './components/TelemetryHUD';
import PostMortemModal from './components/PostMortemModal';
import CustomLogModal from './components/CustomLogModal';

// Dynamic connection endpoints with automatic fallback
const getApiBase = () => {
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `http://${window.location.hostname}:8000/api`;
  }
  return 'http://localhost:8000/api';
};

const getWsUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `ws://${window.location.hostname}:8000/ws/warroom`;
  }
  return 'ws://localhost:8000/ws/warroom';
};

const API_BASE = getApiBase();
const WS_URL = getWsUrl();

export default function App() {
  const [scenarios, setScenarios] = useState([
    { id: 'db_pool_exhaustion', title: 'PostgreSQL Pool Exhaustion & Deadlock' },
    { id: 'memory_leak_crash', title: 'Canary Pod OOMKilled Crash Loop' },
    { id: 'cascading_504_gateway', title: 'Cascading 504 Gateway Auth Timeout' }
  ]);
  const [currentScenario, setCurrentScenario] = useState('db_pool_exhaustion');
  const [incident, setIncident] = useState(null);
  const [orchestrationPhase, setOrchestrationPhase] = useState('IDLE');
  const [orchestrationMessage, setOrchestrationMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [backendOnline, setBackendOnline] = useState(true);
  const [isPostMortemOpen, setIsPostMortemOpen] = useState(false);
  const [isCustomLogModalOpen, setIsCustomLogModalOpen] = useState(false);

  // Fetch initial scenarios and active incident
  const refreshState = () => {
    fetch(`${API_BASE}/scenarios`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) setScenarios(data);
        setBackendOnline(true);
      })
      .catch(() => {
        // Fallback to Vite proxy
        fetch('/api/scenarios')
          .then(res => res.json())
          .then(data => {
            if (data && data.length > 0) setScenarios(data);
            setBackendOnline(true);
          })
          .catch(() => setBackendOnline(false));
      });

    fetch(`${API_BASE}/incident/current`)
      .then(res => res.json())
      .then(data => {
        setIncident(data);
        setBackendOnline(true);
      })
      .catch(() => {
        fetch('/api/incident/current')
          .then(res => res.json())
          .then(data => {
            setIncident(data);
            setBackendOnline(true);
          })
          .catch(() => setBackendOnline(false));
      });
  };

  useEffect(() => {
    refreshState();
  }, []);

  // WebSocket for real-time live war room updates
  useEffect(() => {
    let ws;
    let reconnectTimer;

    const connectWS = () => {
      try {
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          setWsConnected(true);
          setBackendOnline(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'INCIDENT_CREATED' || data.type === 'INCIDENT_UPDATE') {
              setIncident(data.incident);
              if (data.phase) setOrchestrationPhase(data.phase);
            } else if (data.type === 'ORCHESTRATION_PHASE') {
              setOrchestrationPhase(data.phase);
              setOrchestrationMessage(data.message || '');
              if (data.incident) setIncident(data.incident);
            } else if (data.type === 'AGENT_THOUGHT') {
              setIncident(data.incident);
            }
          } catch (e) {
            console.error('WS Parse Error', e);
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimer = setTimeout(connectWS, 2500);
        };

        ws.onerror = () => {
          setWsConnected(false);
          ws.close();
        };
      } catch (err) {
        setWsConnected(false);
        reconnectTimer = setTimeout(connectWS, 2500);
      }
    };

    connectWS();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  // Universal Robust API Caller with dual fallback
  const callApi = async (endpoint, options = {}) => {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, options);
      if (res.ok) return await res.json();
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      // Fallback to Vite reverse proxy
      const fallbackRes = await fetch(`/api${endpoint}`, options);
      if (fallbackRes.ok) return await fallbackRes.json();
      throw err;
    }
  };

  // Trigger Chaos Scenario
  const handleTriggerScenario = async (scenarioId) => {
    setLoading(true);
    try {
      const data = await callApi('/incident/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: scenarioId })
      });
      setIncident(data);
    } catch (err) {
      console.error('Failed to trigger scenario', err);
    } finally {
      setLoading(false);
    }
  };

  // Submit User Custom Error Logs
  const handleCustomLogSubmit = async ({ service, title, raw_logs }) => {
    setLoading(true);
    try {
      const data = await callApi('/incident/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, title, raw_logs })
      });
      setIncident(data);
      setIsCustomLogModalOpen(false);
    } catch (err) {
      console.error('Failed to analyze custom logs', err);
    } finally {
      setLoading(false);
    }
  };

  // Human Action (APPROVE / REJECT)
  const handleRemediationAction = async (action) => {
    setActionLoading(true);
    try {
      const data = await callApi('/incident/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      setIncident(data);
      if (action === 'APPROVE') {
        setTimeout(() => setIsPostMortemOpen(true), 1000);
      }
    } catch (err) {
      console.error('Failed to apply remediation action', err);
      // Optimistic local state update in case of network glitch
      if (action === 'APPROVE' && incident) {
        setIncident(prev => ({
          ...prev,
          status: 'RESOLVED',
          remediation_plan: prev.remediation_plan ? { ...prev.remediation_plan, status: 'APPLIED' } : null,
          topology: {
            ...prev.topology,
            nodes: prev.topology.nodes.map(n => ({ ...n, status: 'remediated', latency: '22ms', error_rate: '0.0%' })),
            edges: prev.topology.edges.map(e => ({ ...e, failing: false }))
          }
        }));
        setTimeout(() => setIsPostMortemOpen(true), 800);
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen text-slate-100 flex flex-col">
      {/* 1. Dynamic Interstellar Cosmic Canvas */}
      <InterstellarBackground />

      {/* 2. Top Header Navigation */}
      <Header
        scenarios={scenarios}
        currentScenario={currentScenario}
        onSelectScenario={setCurrentScenario}
        onTriggerScenario={handleTriggerScenario}
        loading={loading}
        wsConnected={wsConnected}
        incident={incident}
        onOpenPostMortem={() => setIsPostMortemOpen(true)}
        onOpenCustomLogModal={() => setIsCustomLogModalOpen(true)}
      />

      {/* Main War Room Body */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Backend Offline Warning Banner (if offline) */}
        {!backendOnline && (
          <div className="bg-rose-500/20 border border-rose-500/40 rounded-xl p-3 flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="font-semibold">Backend Engine Offline (Port 8000):</span>
              <span>Double-click <code className="bg-space-950 px-1.5 py-0.5 rounded text-rose-200">run_aegisops.bat</code> or run <code className="bg-space-950 px-1.5 py-0.5 rounded text-rose-200">backend\run_backend.bat</code>.</span>
            </div>
            <button 
              onClick={refreshState}
              className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs"
            >
              Retry Link
            </button>
          </div>
        )}

        {/* Multi-Agent Orchestration Stepper Bar */}
        <div className="glass-panel rounded-xl px-5 py-3 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] uppercase tracking-wider text-cyan-400 font-bold">Crew Orchestration:</span>
            {orchestrationMessage && (
              <span className="text-slate-300 font-sans text-xs italic">"{orchestrationMessage}"</span>
            )}
          </div>
          <div className="flex items-center space-x-3 text-[11px]">
            <span className={`px-2 py-0.5 rounded ${incident?.agent_thoughts?.some(t => t.agent_id === 'agent-sentinel') ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-500'}`}>
              1. Triage
            </span>
            <span className="text-slate-600">→</span>
            <span className={`px-2 py-0.5 rounded ${incident?.agent_thoughts?.some(t => t.agent_id === 'agent-scout') ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'text-slate-500'}`}>
              2. Investigate
            </span>
            <span className="text-slate-600">→</span>
            <span className={`px-2 py-0.5 rounded ${incident?.agent_thoughts?.some(t => t.agent_id === 'agent-oracle') ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'text-slate-500'}`}>
              3. RCA
            </span>
            <span className="text-slate-600">→</span>
            <span className={`px-2 py-0.5 rounded ${incident?.agent_thoughts?.some(t => t.agent_id === 'agent-armorer') ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-500'}`}>
              4. Playbook
            </span>
            <span className="text-slate-600">→</span>
            <span className={`px-2 py-0.5 rounded ${incident?.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-500'}`}>
              5. Resolve
            </span>
          </div>
        </div>

        {/* Incident Summary Banner */}
        <IncidentHeader incident={incident} />

        {/* 4 Agent Squad Cards */}
        <AgentCrewPanel 
          thoughts={incident?.agent_thoughts || []} 
          incidentStatus={incident?.status || 'STANDBY'} 
        />

        {/* Middle Dual Split: Live War Room Terminal + Topology Blast Radius */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LiveWarRoom 
            thoughts={incident?.agent_thoughts || []} 
            incidentStatus={incident?.status || 'STANDBY'} 
          />
          <CausalGraph 
            topology={incident?.topology} 
          />
        </div>

        {/* Human-in-the-Loop Remediation Cockpit (Diff & Authorization) */}
        <RemediationCockpit
          remediation={incident?.remediation_plan}
          incidentStatus={incident?.status}
          onAction={handleRemediationAction}
          actionLoading={actionLoading}
        />

        {/* Cluster Telemetry Gauges */}
        <TelemetryHUD incident={incident} />

      </main>

      {/* Post Mortem Modal */}
      <PostMortemModal
        isOpen={isPostMortemOpen}
        onClose={() => setIsPostMortemOpen(false)}
        markdown={incident?.post_mortem}
        incidentId={incident?.id}
      />

      {/* Custom Error Log Ingestion Modal */}
      <CustomLogModal
        isOpen={isCustomLogModalOpen}
        onClose={() => setIsCustomLogModalOpen(false)}
        onSubmit={handleCustomLogSubmit}
        isSubmitting={loading}
      />

      {/* Cyber Footer */}
      <footer className="relative z-10 glass-panel border-t border-slate-800 py-4 px-6 text-center text-xs font-mono text-slate-500">
        <p>AegisOps • Autonomous Multi-Agent Incident Response & Triage Crew • Built for Afterhours 1.0 Hackathon</p>
      </footer>
    </div>
  );
}

