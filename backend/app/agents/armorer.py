import asyncio
from datetime import datetime
from app.models.schemas import Incident, AgentThought

class ArmorerAgent:
    """Armorer - Playbook & Remediation Engineer Agent."""

    ID = "agent-armorer"
    NAME = "Armorer"
    ROLE = "Remediation & Playbook Engineer"
    AVATAR = "⚙️"

    @classmethod
    async def run(cls, incident: Incident) -> AgentThought:
        await asyncio.sleep(1.2)
        
        rem = incident.remediation_plan
        if not rem:
            content = "No automated remediation plan could be formulated. Recommending manual on-call engineer intervention."
        else:
            content = (
                f"Formulated surgical remediation plan: \"{rem.title}\". "
                f"Risk Level: {rem.risk_level}. "
                f"Target command: `{rem.command}`. "
                f"Estimated recovery time: {rem.estimated_recovery_time}. "
                f"Rollback mechanism prepared: `{rem.rollback_command}`. "
                f"Action gated on Human Approval. Submitting to War Room Commander."
            )
        
        thought = AgentThought(
            agent_id=cls.ID,
            agent_name=cls.NAME,
            avatar=cls.AVATAR,
            timestamp=datetime.utcnow().isoformat() + "Z",
            step="REMEDIATION",
            content=content,
            confidence=0.99,
            metadata={"plan_id": rem.id if rem else None, "risk": rem.risk_level if rem else "UNKNOWN"}
        )
        incident.agent_thoughts.append(thought)
        incident.status = "AWAITING_APPROVAL"
        return thought
