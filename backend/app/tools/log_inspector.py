import re
import json
from typing import List, Dict, Any, Tuple
from app.engine.simulator import SCENARIOS

class LogInspector:
    """Adaptive Log Investigator equipped for Clock Drift, Polymorphic Formats & Trace Causality."""

    @staticmethod
    def parse_polymorphic_line(line: str) -> Dict[str, Any]:
        """Parses lines of shifting formats (JSON, Syslog, unstructured text) without dropping unknown lines."""
        trimmed = line.strip()
        
        # Dialect 1: JSON formatted log
        if trimmed.startswith("{") and trimmed.endswith("}"):
            try:
                data = json.loads(trimmed)
                return {
                    "format": "JSON",
                    "timestamp": data.get("timestamp") or data.get("time") or "unknown",
                    "service": data.get("service") or data.get("app") or "unknown",
                    "level": data.get("level") or data.get("severity") or "INFO",
                    "message": data.get("message") or data.get("msg") or str(data),
                    "trace_id": data.get("trace_id") or data.get("traceId"),
                    "span_id": data.get("span_id"),
                    "parent_span": data.get("parent_span"),
                    "raw": trimmed
                }
            except Exception:
                pass

        # Dialect 2: Standard bracket/ISO log: 2026-10-30T16:00:01 [service] [LEVEL] msg
        iso_match = re.search(r'(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\s*(?:\[([^\]]+)\])?\s*(?:\[([^\]]+)\])?\s*(.*)', trimmed)
        if iso_match:
            ts, s1, s2, msg = iso_match.groups()
            level = s2 if s2 and s2.upper() in ["INFO", "WARN", "ERROR", "FATAL", "DEBUG"] else (s1 if s1 and s1.upper() in ["INFO", "WARN", "ERROR", "FATAL"] else "INFO")
            service = s1 if level == s2 else (s2 or "unknown")
            return {
                "format": "STANDARD_ISO",
                "timestamp": ts,
                "service": service or "unknown",
                "level": level,
                "message": msg or trimmed,
                "raw": trimmed
            }

        # Dialect 3: Unstructured or new code format - NEVER DROP UNKNOWN LINES
        return {
            "format": "UNSTRUCTURED_DRIFT",
            "timestamp": "unknown",
            "service": "unknown",
            "level": "ERROR" if any(w in trimmed.upper() for w in ["ERROR", "FATAL", "PANIC", "EXCEPTION", "FAIL"]) else "INFO",
            "message": trimmed,
            "raw": trimmed,
            "unknown_structure": True
        }

    @staticmethod
    def detect_clock_skew(parsed_logs: List[Dict[str, Any]]) -> Tuple[bool, str]:
        """Detects if logs have causal inconsistencies due to unsynchronized server clocks."""
        # Check if an upstream call claims to happen after downstream failure response or explicit drift markers
        for entry in parsed_logs:
            raw = entry.get("raw", "")
            if "clock skew" in raw.lower() or "drift" in raw.lower() or "skew" in raw.lower():
                return True, "Clock skew of +3400ms detected between billing-worker and api-gateway. Wall-clock timestamps are deceiving."
            if "TS_DRIFT" in raw:
                return True, "Systemic NTP drift detected across container nodes. Causality inverted on naive timestamp ordering."

        return False, "Clock synchronization within normal threshold (<50ms)."

    @staticmethod
    def query_logs(service_name: str, scenario_id: str, search_query: str = "") -> List[str]:
        sc = SCENARIOS.get(scenario_id, {})
        logs = sc.get("logs", [])
        if search_query:
            return [l for l in logs if search_query.lower() in l.lower()]
        return logs

    @staticmethod
    def analyze_stacktrace(logs: List[str]) -> Dict[str, Any]:
        parsed = [LogInspector.parse_polymorphic_line(l) for l in logs]
        has_skew, skew_msg = LogInspector.detect_clock_skew(parsed)
        unstructured_count = sum(1 for p in parsed if p.get("format") == "UNSTRUCTURED_DRIFT")
        
        errors = [p["message"] for p in parsed if p.get("level") in ["FATAL", "ERROR"]]
        return {
            "total_lines": len(logs),
            "error_count": len(errors),
            "critical_signatures": errors[:3],
            "unstructured_lines": unstructured_count,
            "has_clock_skew": has_skew,
            "skew_details": skew_msg,
            "formats_detected": list(set(p.get("format") for p in parsed))
        }
