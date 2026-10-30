from typing import List, Dict, Any
from app.engine.simulator import SCENARIOS

class LogInspector:
    """Tool for investigating system logs, trace spans, and stacktraces."""

    @staticmethod
    def query_logs(service_name: str, scenario_id: str, search_query: str = "") -> List[str]:
        sc = SCENARIOS.get(scenario_id, {})
        logs = sc.get("logs", [])
        if search_query:
            return [l for l in logs if search_query.lower() in l.lower()]
        return logs

    @staticmethod
    def analyze_stacktrace(logs: List[str]) -> Dict[str, Any]:
        errors = [l for l in logs if "FATAL" in l or "ERROR" in l or "Exception" in l or "OOM" in l]
        return {
            "error_count": len(errors),
            "critical_signatures": errors[:3],
            "suspected_class": "CheckoutHandler.java" if any("CheckoutHandler" in l for l in logs) else "PaymentsIdempotencyService"
        }

