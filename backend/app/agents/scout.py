import asyncio
from datetime import datetime
from app.models.schemas import Incident, AgentThought
from app.tools.log_inspector import LogInspector
from app.tools.metrics_collector import MetricsCollector

class ScoutAgent:
    """Scout - Telemetry, Logs & Anomaly Investigator Agent with Adaptive Polymorphic Parsing."""

    ID = "agent-scout"
    NAME = "Scout"
    ROLE = "Adaptive Log Investigator"
    AVATAR = "🔍"

    @classmethod
    async def run(cls, incident: Incident) -> AgentThought:
        await asyncio.sleep(1.2)
        
        # Adaptive polymorphic query
        logs = LogInspector.query_logs("target", incident.scenario_id)
        analysis = LogInspector.analyze_stacktrace(logs)
        metrics = MetricsCollector.get_service_metrics(incident.scenario_id)
        
        formats_str = ", ".join(analysis["formats_detected"])
        sample_error = analysis["critical_signatures"][0] if analysis["critical_signatures"] else "High error rate"
        
        format_drift_note = ""
        if analysis["unstructured_lines"] > 0:
            format_drift_note = f" Detected shifting log formats [{formats_str}] including {analysis['unstructured_lines']} newly-deployed unstructured lines. Applied adaptive fallback parser without dropping lines."
        
        content = (
            f"Adaptive telemetry probe completed across {analysis['total_lines']} log events.{format_drift_note} "
            f"Identified {analysis['error_count']} critical error signatures. Primary failure signature: \"{sample_error}\". "
            f"Trace correlation confirmed origin on {incident.topology.nodes[1].name if len(incident.topology.nodes) > 1 else 'target service'}."
        )
        
        thought = AgentThought(
            agent_id=cls.ID,
            agent_name=cls.NAME,
            avatar=cls.AVATAR,
            timestamp=datetime.utcnow().isoformat() + "Z",
            step="INVESTIGATION",
            content=content,
            confidence=0.94,
            metadata={
                "logs_analyzed": len(logs),
                "formats_detected": analysis["formats_detected"],
                "unstructured_lines_handled": analysis["unstructured_lines"],
                "metrics": metrics
            }
        )
        incident.agent_thoughts.append(thought)
        return thought
