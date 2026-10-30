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

const API_BASE = 'http://localhost:8000/api';
const WS_URL = 'ws://localhost:8000/ws/warroom';

export default function App() {
  const [scenarios, setScenarios] = useState([
    { id: 'db_pool_exhaustion', title: 'PostgreSQL Pool Exhaustion & Deadlock' },
    { id: 'memory_leak_crash', title: 'Canary Pod OOMKilled Crash Loop' },
    { id: 'cascading_504_gateway', title: 'Cascading 504 Gateway Auth Timeout' }
  ]);
  const [currentScenario, setCurrentScenario] = useState('db_pool_exhaustion');
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [isPostMortemOpen, setIsPostMortemOpen] = useState(false);

  // Fetch initial scenarios and active incident
  useEffect(() => {
    fetch(`${API_BASE}/scenarios`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) setScenarios(data);
      })
      .catch(err => console.log('Using default scenarios'));

    fetch(`${API_BASE}/incident/current`)
      .then(res => res.json())
      .then(data => setIncident(data))
      .catch(err => console.log('Waiting for backend engine...'));
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
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'INCIDENT_CREATED' || data.type === 'INCIDENT_UPDATE') {
              setIncident(data.incident);
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

  // Trigger Chaos Scenario
  const handleTriggerScenario = async (scenarioId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/incident/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: scenarioId })
      });
      const data = await res.json();
      setIncident(data);
    } catch (err) {
      console.error('Failed to trigger scenario', err);
    } finally {
      setLoading(false);
    }
  };

  // Human Action (APPROVE / REJECT)
  const handleRemediationAction = async (action) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/incident/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      setIncident(data);
      if (action === 'APPROVE') {
        setTimeout(() => setIsPostMortemOpen(true), 1200);
      }
    } catch (err) {
      console.error('Failed to apply remediation action', err);
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
      />

      {/* Main War Room Body */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
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

      {/* Cyber Footer */}
      <footer className="relative z-10 glass-panel border-t border-slate-800 py-4 px-6 text-center text-xs font-mono text-slate-500">
        <p>AegisOps • Autonomous Multi-Agent Incident Response & Triage Crew • Built for Afterhours 1.0 Hackathon</p>
      </footer>
    </div>
  );
}
