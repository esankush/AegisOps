import asyncio
from datetime import datetime
from app.models.schemas import Incident, AgentThought
from app.engine.simulator import SCENARIOS

class OracleAgent:
    """Oracle - Root Cause Analysis (RCA) & Causal Graph Agent."""

    ID = "agent-oracle"
    NAME = "Oracle"
    ROLE = "RCA & Hypothesis Engine"
    AVATAR = "🔮"

    @classmethod
    async def run(cls, incident: Incident) -> AgentThought:
        await asyncio.sleep(1.4)
        
        sc = SCENARIOS.get(incident.scenario_id, {})
        rca_text = sc.get("root_cause", "Anomaly induced cascade failure.")
        incident.root_cause_summary = rca_text
        
        content = (
            f"Root Cause Hypothesis synthesized with 96.4% confidence: {rca_text} "
            f"Causal chain mapped across microservice topology: upstream gateway is suffering from downstream resource exhaustion."
        )
        
        thought = AgentThought(
            agent_id=cls.ID,
            agent_name=cls.NAME,
            avatar=cls.AVATAR,
            timestamp=datetime.utcnow().isoformat() + "Z",
            step="RCA",
            content=content,
            confidence=0.964,
            metadata={"root_cause": rca_text, "affected_nodes": len(incident.topology.nodes)}
        )
        incident.agent_thoughts.append(thought)
        return thought
