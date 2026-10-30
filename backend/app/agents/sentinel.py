import asyncio
from datetime import datetime
from app.models.schemas import Incident, AgentThought

class SentinelAgent:
    """Sentinel - Triage & Alert Correlator Agent."""
    
    ID = "agent-sentinel"
    NAME = "Sentinel"
    ROLE = "Alert Triage & Correlator"
    AVATAR = "🛡️"

    @classmethod
    async def run(cls, incident: Incident) -> AgentThought:
        await asyncio.sleep(1.0)
        
        alerts_summary = ", ".join([f"{a.service} ({a.severity})" for a in incident.alerts])
        content = (
            f"Alert storm detected across {len(incident.alerts)} distinct monitors: [{alerts_summary}]. "
            f"Correlating signals into single incident {incident.id}. "
            f"Assigned Severity: {incident.severity}. "
            f"Calculated blast radius: {incident.blast_radius}. Initiating deep telemetry investigation."
        )
        
        thought = AgentThought(
            agent_id=cls.ID,
            agent_name=cls.NAME,
            avatar=cls.AVATAR,
            timestamp=datetime.utcnow().isoformat() + "Z",
            step="TRIAGE",
            content=content,
            confidence=0.98,
            metadata={"alerts_correlated": len(incident.alerts), "severity": incident.severity}
        )
        incident.agent_thoughts.append(thought)
        return thought
