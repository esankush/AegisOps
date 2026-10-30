import asyncio
import json
import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi import WebSocket
from app.models.schemas import Incident, AgentThought, RemediationPlan
from app.engine.simulator import create_incident_from_scenario, create_incident_from_custom_logs
from app.agents.sentinel import SentinelAgent
from app.agents.scout import ScoutAgent
from app.agents.oracle import OracleAgent
from app.agents.armorer import ArmorerAgent
from app.agents.commander import CommanderAgent

class CrewBlackboard:
    """Shared working memory and inter-agent communication bus."""
    def __init__(self, incident: Incident):
        self.incident_id = incident.id
        self.triage_brief: Dict[str, Any] = {}
        self.investigation_findings: Dict[str, Any] = {}
        self.rca_hypotheses: List[Dict[str, Any]] = []
        self.proposed_playbooks: List[Dict[str, Any]] = []
        self.inter_agent_messages: List[Dict[str, Any]] = []

    def post_message(self, sender: str, recipient: str, message: str, payload: Optional[Dict[str, Any]] = None):
        self.inter_agent_messages.append({
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "sender": sender,
            "recipient": recipient,
            "message": message,
            "payload": payload or {}
        })

class CrewManager:
    """Advanced Multi-Agent Orchestrator with state machine, shared blackboard, and live event streaming."""

    def __init__(self):
        self.current_incident: Optional[Incident] = None
        self.blackboard: Optional[CrewBlackboard] = None
        self.active_websockets: List[WebSocket] = []
        self.orchestration_phase: str = "IDLE"

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_websockets.append(websocket)
        
        # Send current state immediately upon client connection
        if self.current_incident:
            await websocket.send_json({
                "type": "INCIDENT_UPDATE",
                "phase": self.orchestration_phase,
                "incident": self.current_incident.model_dump()
            })

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_websockets:
            self.active_websockets.remove(websocket)

    async def broadcast(self, message: dict):
        for ws in list(self.active_websockets):
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(ws)

    async def trigger_scenario(self, scenario_id: str) -> Incident:
        incident = create_incident_from_scenario(scenario_id)
        self.current_incident = incident
        self.blackboard = CrewBlackboard(incident)
        self.orchestration_phase = "INITIALIZED"
        
        await self.broadcast({
            "type": "INCIDENT_CREATED",
            "phase": self.orchestration_phase,
            "incident": incident.model_dump()
        })
        
        asyncio.create_task(self._orchestrate_crew_pipeline(incident))
        return incident

    async def trigger_custom_incident(self, service: str, title: str, raw_logs: str) -> Incident:
        incident = create_incident_from_custom_logs(service, title, raw_logs)
        self.current_incident = incident
        self.blackboard = CrewBlackboard(incident)
        self.orchestration_phase = "INITIALIZED"
        
        await self.broadcast({
            "type": "INCIDENT_CREATED",
            "phase": self.orchestration_phase,
            "incident": incident.model_dump()
        })
        
        asyncio.create_task(self._orchestrate_crew_pipeline(incident))
        return incident

    async def _orchestrate_crew_pipeline(self, incident: Incident):
        """Sequential multi-agent cognitive pipeline with state synchronization."""
        try:
            # Phase 1: TRIAGE (Sentinel)
            self.orchestration_phase = "TRIAGING"
            incident.status = "ANALYZING"
            await self.broadcast({
                "type": "ORCHESTRATION_PHASE",
                "phase": "PHASE_1_TRIAGE",
                "message": "Sentinel correlating telemetry signals & evaluating blast radius...",
                "incident": incident.model_dump()
            })
            thought1 = await SentinelAgent.run(incident)
            self.blackboard.post_message("Sentinel", "Scout", "Alert storm triaged. Ingesting container logs.", {"severity": incident.severity})
            await self.broadcast({
                "type": "AGENT_THOUGHT",
                "thought": thought1.model_dump(),
                "incident": incident.model_dump()
            })

            # Phase 2: INVESTIGATION (Scout)
            self.orchestration_phase = "INVESTIGATING"
            await self.broadcast({
                "type": "ORCHESTRATION_PHASE",
                "phase": "PHASE_2_INVESTIGATION",
                "message": "Scout inspecting traces, error logs, and metric deviations...",
                "incident": incident.model_dump()
            })
            thought2 = await ScoutAgent.run(incident)
            self.blackboard.post_message("Scout", "Oracle", "Faulty stack trace isolated. Handing off to hypothesis engine.", thought2.metadata)
            await self.broadcast({
                "type": "AGENT_THOUGHT",
                "thought": thought2.model_dump(),
                "incident": incident.model_dump()
            })

            # Phase 3: ROOT CAUSE ANALYSIS (Oracle)
            self.orchestration_phase = "RCA"
            await self.broadcast({
                "type": "ORCHESTRATION_PHASE",
                "phase": "PHASE_3_RCA",
                "message": "Oracle constructing causal graph and synthesizing root cause...",
                "incident": incident.model_dump()
            })
            thought3 = await OracleAgent.run(incident)
            self.blackboard.post_message("Oracle", "Armorer", "Root cause established. Requesting surgical playbook.", {"root_cause": incident.root_cause_summary})
            await self.broadcast({
                "type": "AGENT_THOUGHT",
                "thought": thought3.model_dump(),
                "incident": incident.model_dump()
            })

            # Phase 4: REMEDIATION DESIGN & HUMAN GATE (Armorer)
            self.orchestration_phase = "AWAITING_APPROVAL"
            await self.broadcast({
                "type": "ORCHESTRATION_PHASE",
                "phase": "PHASE_4_REMEDIATION",
                "message": "Armorer formulating surgical patch, unified diff & staging rollback...",
                "incident": incident.model_dump()
            })
            thought4 = await ArmorerAgent.run(incident)
            self.blackboard.post_message("Armorer", "Commander", "Hotfix staged. Pausing at Human Approval Gate.", {"plan_id": incident.remediation_plan.id if incident.remediation_plan else None})
            await self.broadcast({
                "type": "AGENT_THOUGHT",
                "thought": thought4.model_dump(),
                "incident": incident.model_dump()
            })

        except Exception as e:
            print(f"[Orchestrator Error] Pipeline execution failed: {e}")

    async def _re_evaluate_alternative_pipeline(self, incident: Incident):
        """Autonomous agent re-evaluation triggered when human rejects initial plan."""
        try:
            await asyncio.sleep(1.0)
            
            # Step 1: Oracle explores secondary hypothesis
            thought_oracle = AgentThought(
                agent_id="agent-oracle",
                agent_name="Oracle",
                avatar="🔮",
                timestamp=datetime.utcnow().isoformat() + "Z",
                step="RCA",
                content="Human operator rejected primary plan. Re-evaluating topology for non-disruptive alternative: Bypassing pod rollout in favor of dynamic traffic draining and circuit breaker isolation.",
                confidence=0.91,
                metadata={"strategy": "ALTERNATIVE_PLAN_B", "focus": "zero_downtime_drain"}
            )
            incident.agent_thoughts.append(thought_oracle)
            await self.broadcast({
                "type": "AGENT_THOUGHT",
                "thought": thought_oracle.model_dump(),
                "incident": incident.model_dump()
            })

            await asyncio.sleep(1.2)

            # Step 2: Armorer drafts Alternative Plan B
            target_svc = incident.remediation_plan.target_service if incident.remediation_plan else "target-service"
            alt_plan = RemediationPlan(
                id=f"rem-alt-{uuid.uuid4().hex[:4]}",
                title=f"Alternative Plan B: Traffic Draining & Concurrency Limiting ({target_svc})",
                description="Zero-downtime remediation: Drain active HTTP/gRPC requests, throttle connection acquisition rate, and temporarily route new traffic to stable replica pool.",
                target_service=target_svc,
                command=f"kubectl annotate ingress/{target_svc} ingress.kubernetes.io/proxy-body-size='10m' && kubectl set env deployment/{target_svc} MAX_CONCURRENT_REQUESTS=50",
                patch_diff=f"--- a/deployments/{target_svc}-env.yaml\n+++ b/deployments/{target_svc}-env.yaml\n@@ -8,3 +8,4 @@\n   env:\n+  - name: MAX_CONCURRENT_REQUESTS\n+    value: \"50\"\n+  - name: CONNECTION_DRAIN_TIMEOUT_MS\n+    value: \"5000\"",
                risk_level="LOW",
                rollback_command=f"kubectl set env deployment/{target_svc} MAX_CONCURRENT_REQUESTS-",
                estimated_recovery_time="15 seconds",
                status="PENDING_APPROVAL"
            )
            incident.remediation_plan = alt_plan
            incident.status = "AWAITING_APPROVAL"
            self.orchestration_phase = "AWAITING_APPROVAL"

            thought_armorer = AgentThought(
                agent_id="agent-armorer",
                agent_name="Armorer",
                avatar="⚙️",
                timestamp=datetime.utcnow().isoformat() + "Z",
                step="REMEDIATION",
                content=f"Alternative Plan B formulated: \"{alt_plan.title}\". Prepared non-disruptive traffic-drain patch with 15s recovery time. Submitted for human review.",
                confidence=0.98,
                metadata={"plan_id": alt_plan.id, "strategy": "ALTERNATIVE_B"}
            )
            incident.agent_thoughts.append(thought_armorer)

            await self.broadcast({
                "type": "ORCHESTRATION_PHASE",
                "phase": "PHASE_4_REMEDIATION",
                "message": "Alternative Plan B ready for human review.",
                "incident": incident.model_dump()
            })
            await self.broadcast({
                "type": "AGENT_THOUGHT",
                "thought": thought_armorer.model_dump(),
                "incident": incident.model_dump()
            })

        except Exception as e:
            print(f"[Re-evaluation Error]: {e}")

    async def handle_human_action(self, action: str, custom_command: Optional[str] = None) -> Incident:
        if not self.current_incident:
            self.current_incident = create_incident_from_scenario("db_pool_exhaustion")
            self.blackboard = CrewBlackboard(self.current_incident)
            
        if action == "APPROVE":
            self.orchestration_phase = "EXECUTING"
            await self.broadcast({
                "type": "ORCHESTRATION_PHASE",
                "phase": "PHASE_5_EXECUTION",
                "message": "Human authorization confirmed. Applying surgical patch to cluster...",
                "incident": self.current_incident.model_dump()
            })
            thought = await CommanderAgent.execute_approved_remediation(self.current_incident)
            self.orchestration_phase = "RESOLVED"
            await self.broadcast({
                "type": "AGENT_THOUGHT",
                "thought": thought.model_dump(),
                "incident": self.current_incident.model_dump()
            })
        elif action == "REJECT":
            self.orchestration_phase = "RE-EVALUATING"
            thought = await CommanderAgent.reject_remediation(self.current_incident)
            await self.broadcast({
                "type": "ORCHESTRATION_PHASE",
                "phase": "PHASE_3_RCA",
                "message": "Plan rejected by operator. Crew re-evaluating alternative remediation strategies...",
                "incident": self.current_incident.model_dump()
            })
            await self.broadcast({
                "type": "AGENT_THOUGHT",
                "thought": thought.model_dump(),
                "incident": self.current_incident.model_dump()
            })
            # Trigger asynchronous re-evaluation pipeline!
            asyncio.create_task(self._re_evaluate_alternative_pipeline(self.current_incident))
            
        return self.current_incident

crew_manager = CrewManager()
