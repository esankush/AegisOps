import asyncio
from datetime import datetime
from app.models.schemas import Incident, AgentThought

class SentinelAgent:
    """Sentinel - Triage & Alert Correlator Agent with Clock Drift Awareness."""
    
    ID = "agent-sentinel"
    NAME = "Sentinel"
    ROLE = "Alert Triage & Correlator"
    AVATAR = "🛡️"

    @classmethod
    async def run(cls, incident: Incident) -> AgentThought:
        await asyncio.sleep(1.0)
        
        alerts_summary = ", ".join([f"{a.service} ({a.severity})" for a in incident.alerts])
        
        skew_warning = ""
        if incident.clock_skew_detected:
            skew_warning = f" ⚠️ CLOCK SKEW FLAGGED: {incident.clock_skew_detected} Naive timestamp order will be bypassed in favor of distributed trace span causality."
        
        content = (
            f"Alert storm detected across {len(incident.alerts)} distinct monitors: [{alerts_summary}]. "
            f"Correlating signals into single incident {incident.id}. "
            f"Assigned Severity: {incident.severity}. "
            f"Calculated blast radius: {incident.blast_radius}.{skew_warning} Initiating deep telemetry investigation."
        )
        
        thought = AgentThought(
            agent_id=cls.ID,
            agent_name=cls.NAME,
            avatar=cls.AVATAR,
            timestamp=datetime.utcnow().isoformat() + "Z",
            step="TRIAGE",
            content=content,
            confidence=0.98,
            metadata={
                "alerts_correlated": len(incident.alerts),
                "severity": incident.severity,
                "clock_skew_flagged": bool(incident.clock_skew_detected)
            }
        )
        incident.agent_thoughts.append(thought)
        return thought
