import asyncio
from typing import Dict, List, Optional
from fastapi import WebSocket
from app.models.schemas import Incident, AgentThought
from app.engine.simulator import create_incident_from_scenario
from app.agents.sentinel import SentinelAgent
from app.agents.scout import ScoutAgent
from app.agents.oracle import OracleAgent
from app.agents.armorer import ArmorerAgent
from app.agents.commander import CommanderAgent

class CrewManager:
    """Orchestrates multi-agent crew execution, incident state, and WebSocket broadcasting."""

    def __init__(self):
        self.current_incident: Optional[Incident] = None
        self.active_websockets: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_websockets.append(websocket)
        if self.current_incident:
            await websocket.send_json({
                "type": "INCIDENT_UPDATE",
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
        # Create new incident from scenario definition
        incident = create_incident_from_scenario(scenario_id)
        self.current_incident = incident
        
        await self.broadcast({
            "type": "INCIDENT_CREATED",
            "incident": incident.model_dump()
        })
        
        # Launch multi-agent pipeline in background
        asyncio.create_task(self._run_agent_pipeline(incident))
        return incident

    async def _run_agent_pipeline(self, incident: Incident):
        incident.status = "ANALYZING"
        await self.broadcast({
            "type": "INCIDENT_UPDATE",
            "incident": incident.model_dump()
        })

        # Step 1: Sentinel (Triage)
        thought1 = await SentinelAgent.run(incident)
        await self.broadcast({
            "type": "AGENT_THOUGHT",
            "thought": thought1.model_dump(),
            "incident": incident.model_dump()
        })

        # Step 2: Scout (Investigation)
        thought2 = await ScoutAgent.run(incident)
        await self.broadcast({
            "type": "AGENT_THOUGHT",
            "thought": thought2.model_dump(),
            "incident": incident.model_dump()
        })

        # Step 3: Oracle (RCA)
        thought3 = await OracleAgent.run(incident)
        await self.broadcast({
            "type": "AGENT_THOUGHT",
            "thought": thought3.model_dump(),
            "incident": incident.model_dump()
        })

        # Step 4: Armorer (Remediation Plan)
        thought4 = await ArmorerAgent.run(incident)
        await self.broadcast({
            "type": "AGENT_THOUGHT",
            "thought": thought4.model_dump(),
            "incident": incident.model_dump()
        })

    async def handle_human_action(self, action: str, custom_command: Optional[str] = None) -> Incident:
        if not self.current_incident:
            raise ValueError("No active incident to act upon.")
            
        if action == "APPROVE":
            thought = await CommanderAgent.execute_approved_remediation(self.current_incident)
            await self.broadcast({
                "type": "AGENT_THOUGHT",
                "thought": thought.model_dump(),
                "incident": self.current_incident.model_dump()
            })
        elif action == "REJECT":
            thought = await CommanderAgent.reject_remediation(self.current_incident)
            await self.broadcast({
                "type": "AGENT_THOUGHT",
                "thought": thought.model_dump(),
                "incident": self.current_incident.model_dump()
            })
            
        return self.current_incident

crew_manager = CrewManager()
