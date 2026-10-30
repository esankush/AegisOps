from typing import Dict, Any

class MetricsCollector:
    """Tool for fetching real-time Prometheus & system metrics."""

    @staticmethod
    def get_service_metrics(service_name: str) -> Dict[str, Any]:
        return {
            "checkout-service": {
                "cpu_utilization": "94.2%",
                "memory_usage": "3.8GB / 4.0GB",
                "active_connections": 100,
                "p99_latency_ms": 30100,
                "error_rate_pct": 89.4
            },
            "payments-worker": {
                "cpu_utilization": "100%",
                "memory_usage": "1048MB / 1024MB (Limit Exceeded)",
                "active_connections": 12,
                "p99_latency_ms": 0,
                "error_rate_pct": 100.0
            },
            "auth-service": {
                "cpu_utilization": "78.5%",
                "memory_usage": "1.2GB / 2.0GB",
                "active_connections": 200,
                "p99_latency_ms": 59800,
                "error_rate_pct": 95.0
            }
        }.get(service_name, {
            "cpu_utilization": "14.2%",
            "memory_usage": "512MB / 2.0GB",
            "active_connections": 24,
            "p99_latency_ms": 42,
            "error_rate_pct": 0.05
        })

