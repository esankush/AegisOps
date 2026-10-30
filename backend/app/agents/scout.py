import asyncio
from datetime import datetime
from app.models.schemas import Incident, AgentThought
from app.tools.log_inspector import LogInspector
from app.tools.metrics_collector import MetricsCollector

class ScoutAgent:
    """Scout - Telemetry, Logs & Anomaly Investigator Agent."""

    ID = "agent-scout"
    NAME = "Scout"
    ROLE = "Log & Anomaly Investigator"
    AVATAR = "🔍"

    @classmethod
    async def run(cls, incident: Incident) -> AgentThought:
        await asyncio.sleep(1.2)
        
        # Query logs & metrics via tools
        logs = LogInspector.query_logs("target", incident.scenario_id)
        analysis = LogInspector.analyze_stacktrace(logs)
        metrics = MetricsCollector.get_service_metrics(incident.scenario_id)
        
        sample_error = analysis["critical_signatures"][0] if analysis["critical_signatures"] else "High error rate"
        
        content = (
            f"Telemetry probe completed. Identified {analysis['error_count']} critical log entries. "
            f"Primary anomaly signature: \"{sample_error}\". "
            f"Traced memory/latency anomaly directly affecting upstream callers. "
            f"Suspected component origin: {analysis['suspected_class']}."
        )
        
        thought = AgentThought(
            agent_id=cls.ID,
            agent_name=cls.NAME,
            avatar=cls.AVATAR,
            timestamp=datetime.utcnow().isoformat() + "Z",
            step="INVESTIGATION",
            content=content,
            confidence=0.96,
            metadata={"logs_analyzed": len(logs), "top_signature": sample_error, "metrics": metrics}
        )
        incident.agent_thoughts.append(thought)
        return thought

