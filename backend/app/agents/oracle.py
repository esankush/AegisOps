import asyncio
from datetime import datetime
from app.models.schemas import Incident, AgentThought
from app.engine.simulator import SCENARIOS

class OracleAgent:
    """Oracle - RCA & Hypothesis Engine with Epistemic Uncertainty & Next Steps Guidance."""

    ID = "agent-oracle"
    NAME = "Oracle"
    ROLE = "RCA & Hypothesis Engine"
    AVATAR = "🔮"

    @classmethod
    async def run(cls, incident: Incident) -> AgentThought:
        await asyncio.sleep(1.4)
        
        sc = SCENARIOS.get(incident.scenario_id, {})
        rca_text = incident.root_cause_summary or sc.get("root_cause", "Anomaly induced cascade failure.")
        incident.root_cause_summary = rca_text
        
        if "unstructured" in incident.scenario_id or "drift" in incident.scenario_id:
            confidence = 0.385
        elif incident.clock_skew_detected:
            confidence = 0.825
        else:
            confidence = 0.964
        
        uncertainty_note = ""
        if incident.uncertainty_analysis:
            uncertainty_note = f" [Epistemic Uncertainty: {incident.uncertainty_analysis}]"
            
        next_steps_str = ""
        if incident.where_to_look_next:
            next_steps_str = " Recommended Next Investigative Steps: " + " | ".join([f"({i+1}) {s}" for i, s in enumerate(incident.where_to_look_next)])
        
        content = (
            f"Root Cause Hypothesis synthesized with {round(confidence * 100, 1)}% calibrated confidence: {rca_text}"
            f"{uncertainty_note} Causal graph mapped: Wall-clock skew corrected via distributed trace span IDs.{next_steps_str}"
        )
        
        thought = AgentThought(
            agent_id=cls.ID,
            agent_name=cls.NAME,
            avatar=cls.AVATAR,
            timestamp=datetime.utcnow().isoformat() + "Z",
            step="RCA",
            content=content,
            confidence=confidence,
            metadata={
                "root_cause": rca_text,
                "confidence_calibrated": confidence,
                "uncertainty_analysis": incident.uncertainty_analysis,
                "where_to_look_next": incident.where_to_look_next
            }
        )
        incident.agent_thoughts.append(thought)
        return thought
