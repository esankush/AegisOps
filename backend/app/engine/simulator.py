import uuid
from datetime import datetime
from typing import Dict, Any
from app.models.schemas import Incident, Alert, TopologyGraph, CausalNode, CausalEdge, RemediationPlan

SCENARIOS: Dict[str, Dict[str, Any]] = {
    "db_pool_exhaustion": {
        "id": "db_pool_exhaustion",
        "title": "PostgreSQL Connection Pool Exhaustion & Thread Starvation",
        "severity": "P1 - CRITICAL",
        "blast_radius": "checkout-service, order-processor, api-gateway (38% of user transactions affected)",
        "service": "checkout-service",
        "alerts": [
            {
                "id": "alt-101",
                "timestamp": "2026-10-30T16:00:01Z",
                "source": "Prometheus / AlertManager",
                "service": "checkout-service",
                "severity": "CRITICAL",
                "message": "HikariPool-1 - Connection is not available, request timed out after 30005ms",
                "metrics": {"active_connections": 100, "max_connections": 100, "waiting_threads": 842}
            },
            {
                "id": "alt-102",
                "timestamp": "2026-10-30T16:00:15Z",
                "source": "Datadog APM",
                "service": "api-gateway",
                "severity": "HIGH",
                "message": "HTTP 500 Spike on POST /api/v2/checkout: error rate > 42.6%",
                "metrics": {"error_rate": "42.6%", "p99_latency": "14200ms"}
            },
            {
                "id": "alt-103",
                "timestamp": "2026-10-30T16:00:30Z",
                "source": "AWS RDS CloudWatch",
                "service": "postgres-cluster-primary",
                "severity": "HIGH",
                "message": "RDS Postgres MaxConnectionsReached: 1000/1000 connections occupied",
                "metrics": {"active_clients": 1000, "idle_in_transaction": 612}
            }
        ],
        "topology": {
            "nodes": [
                {"id": "api-gateway", "name": "API Gateway (Traefik)", "type": "gateway", "status": "degraded", "latency": "3800ms", "error_rate": "42.6%"},
                {"id": "auth-service", "name": "Auth Service", "type": "service", "status": "healthy", "latency": "18ms", "error_rate": "0.01%"},
                {"id": "checkout-service", "name": "Checkout Service", "type": "service", "status": "failing", "latency": "30100ms", "error_rate": "89.4%"},
                {"id": "inventory-service", "name": "Inventory Service", "type": "service", "status": "healthy", "latency": "45ms", "error_rate": "0.2%"},
                {"id": "postgres-db", "name": "Postgres Primary DB", "type": "database", "status": "failing", "latency": "12000ms", "error_rate": "68.1%"},
                {"id": "redis-cache", "name": "Redis Session Cache", "type": "database", "status": "healthy", "latency": "2ms", "error_rate": "0.0%"}
            ],
            "edges": [
                {"source": "api-gateway", "target": "auth-service", "label": "Bearer Verify", "failing": False},
                {"source": "api-gateway", "target": "checkout-service", "label": "/checkout HTTP", "failing": True},
                {"source": "checkout-service", "target": "inventory-service", "label": "gRPC Check", "failing": False},
                {"source": "checkout-service", "target": "postgres-db", "label": "Hikari JDBC", "failing": True},
                {"source": "checkout-service", "target": "redis-cache", "label": "Session", "failing": False}
            ]
        },
        "logs": [
            "2026-10-30T16:00:01.124Z [checkout-service] [ERROR] org.postgresql.util.PSQLException: FATAL: remaining connection slots are reserved for non-replication superuser connections",
            "2026-10-30T16:00:03.451Z [checkout-service] [WARN] com.zaxxer.hikari.pool.PoolBase: HikariPool-1 - Connection leak detected! Thread [pool-2-thread-44] acquired connection 184s ago at CheckoutHandler.java:189 and never released it",
            "2026-10-30T16:00:08.892Z [checkout-service] [ERROR] Unhandled exception in transaction scope: missing rollback on abandoned gRPC call to payment provider",
            "2026-10-30T16:00:14.210Z [api-gateway] [ERROR] Upstream timeout reaching http://checkout-service.prod.svc.cluster.local:8080/pay"
        ],
        "root_cause": "A leaked unclosed database connection in CheckoutHandler.java:189 during payment gateway timeouts accumulated idle uncommitted transactions, completely exhausting Postgres max_connections (1000/1000) and starving all downstream checkout pods.",
        "remediation": {
            "id": "rem-db-pool-01",
            "title": "Kill Stale Idle Transactions & Deploy Hotfix Config with Auto-Eviction",
            "description": "Execute targeted pg_terminate_backend for connections idle in transaction > 60s, patch Hikari maxLifetime to 30000ms, and set leakDetectionThreshold to 10000ms.",
            "target_service": "postgres-cluster-primary & checkout-service",
            "command": "kubectl patch configmap checkout-config --type merge -p '{\"data\":{\"HIKARI_MAX_LIFETIME\":\"30000\",\"HIKARI_LEAK_DETECTION\":\"10000\"}}' && kubectl rollout restart deployment/checkout-service",
            "patch_diff": "--- a/k8s/checkout-configmap.yaml\n+++ b/k8s/checkout-configmap.yaml\n@@ -14,4 +14,6 @@\n   SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE: \"25\"\n-  SPRING_DATASOURCE_HIKARI_LEAK_DETECTION_THRESHOLD: \"0\"\n+  SPRING_DATASOURCE_HIKARI_LEAK_DETECTION_THRESHOLD: \"10000\"\n+  SPRING_DATASOURCE_HIKARI_MAX_LIFETIME: \"30000\"\n+  SPRING_DATASOURCE_HIKARI_IDLE_TIMEOUT: \"10000\"",
            "risk_level": "LOW",
            "rollback_command": "kubectl rollout undo deployment/checkout-service",
            "estimated_recovery_time": "45 seconds",
            "status": "PENDING_APPROVAL"
        }
    },
    "memory_leak_crash": {
        "id": "memory_leak_crash",
        "title": "Canary Pod OOMKilled Loop (Out of Memory in payments-worker)",
        "severity": "P1 - CRITICAL",
        "blast_radius": "payments-worker (100% of canary cohort), webhook ingestion delayed",
        "service": "payments-worker",
        "alerts": [
            {
                "id": "alt-201",
                "timestamp": "2026-10-30T16:05:12Z",
                "source": "Kubernetes Kubelet",
                "service": "payments-worker-canary-7b89f",
                "severity": "CRITICAL",
                "message": "Pod payments-worker-canary-7b89f was OOMKilled (Exit Code 137). Memory cgroup limit (1024Mi) exceeded.",
                "metrics": {"restart_count": 5, "last_exit_code": 137, "memory_used": "1048MiB"}
            },
            {
                "id": "alt-202",
                "timestamp": "2026-10-30T16:05:40Z",
                "source": "RabbitMQ Metrics",
                "service": "payment-events-queue",
                "severity": "HIGH",
                "message": "Unacked messages spike: 18,400 messages unconsumed in queue 'payment.settlements'",
                "metrics": {"unacked_count": 18400, "consumer_count": 0}
            }
        ],
        "topology": {
            "nodes": [
                {"id": "api-gateway", "name": "API Gateway", "type": "gateway", "status": "healthy", "latency": "35ms", "error_rate": "0.1%"},
                {"id": "payments-worker", "name": "Payments Worker (Canary)", "type": "service", "status": "failing", "latency": "N/A (OOM Crash)", "error_rate": "100%"},
                {"id": "rabbitmq", "name": "RabbitMQ Cluster", "type": "queue", "status": "degraded", "latency": "140ms", "error_rate": "Queue Backlog"},
                {"id": "stripe-connector", "name": "Stripe Webhook Gateway", "type": "service", "status": "healthy", "latency": "220ms", "error_rate": "0.0%"}
            ],
            "edges": [
                {"source": "stripe-connector", "target": "rabbitmq", "label": "Enqueue Event", "failing": False},
                {"source": "rabbitmq", "target": "payments-worker", "label": "Consume Batch", "failing": True},
                {"source": "api-gateway", "target": "stripe-connector", "label": "/webhook", "failing": False}
            ]
        },
        "logs": [
            "2026-10-30T16:04:45.012Z [payments-worker] [INFO] Loaded release v2.14.0-canary (Commit: #e4f9b2 - 'Add in-memory payment idempotency cache')",
            "2026-10-30T16:05:01.884Z [payments-worker] [WARN] Heap allocated 980MB / 1024MB limit. GC paused for 2.4s",
            "2026-10-30T16:05:10.991Z [payments-worker] [FATAL] java.lang.OutOfMemoryError: Java heap space at ConcurrentHashMap.putVal(ConcurrentHashMap.java:1012)",
            "2026-10-30T16:05:12.001Z [kubelet] Pod payments-worker-canary-7b89f container payments terminated with ExitCode 137"
        ],
        "root_cause": "Commit #e4f9b2 introduced an unbounded static ConcurrentHashMap in PaymentsIdempotencyService with no TTL or eviction policy. High throughput webhook events filled heap within 3 minutes, triggering relentless Linux cgroup OOMKills.",
        "remediation": {
            "id": "rem-mem-02",
            "title": "Immediate Canary Rollback & Traffic Diversion to Stable v2.13.9",
            "description": "Roll back canary deployment to verified stable release v2.13.9, re-route RabbitMQ consumer channels, and reset queue worker scale.",
            "target_service": "payments-worker",
            "command": "kubectl rollout undo deployment/payments-worker-canary && kubectl scale deployment/payments-worker-stable --replicas=8",
            "patch_diff": "--- a/deployments/payments-worker.yaml\n+++ b/deployments/payments-worker.yaml\n@@ -22,3 +22,3 @@\n-    image: registry.internal/payments-worker:v2.14.0-canary\n+    image: registry.internal/payments-worker:v2.13.9\n-    replicas: 2\n+    replicas: 8",
            "risk_level": "LOW",
            "rollback_command": "kubectl rollout undo deployment/payments-worker-canary",
            "estimated_recovery_time": "30 seconds",
            "status": "PENDING_APPROVAL"
        }
    },
    "cascading_504_gateway": {
        "id": "cascading_504_gateway",
        "title": "Cascading Microservice 504 Gateway Timeout (Auth Deadlock)",
        "severity": "P1 - CRITICAL",
        "blast_radius": "All authenticated incoming traffic (Frontend, Mobile App, Partner APIs)",
        "service": "auth-service",
        "alerts": [
            {
                "id": "alt-301",
                "timestamp": "2026-10-30T16:10:00Z",
                "source": "Traefik Gateway Ingress",
                "service": "api-gateway",
                "severity": "CRITICAL",
                "message": "Gateway Timeout 504 reaching upstream service 'auth-service' for > 91% of requests",
                "metrics": {"error_504_rate": "91.2%", "p99_latency": "60000ms"}
            },
            {
                "id": "alt-302",
                "timestamp": "2026-10-30T16:10:15Z",
                "source": "Envoy Service Mesh",
                "service": "auth-service",
                "severity": "HIGH",
                "message": "Circuit breaker OPEN: consecutive 5xx failures exceeded threshold (50/50)",
                "metrics": {"circuit_breaker": "OPEN", "pending_requests": 2500}
            }
        ],
        "topology": {
            "nodes": [
                {"id": "api-gateway", "name": "API Gateway", "type": "gateway", "status": "failing", "latency": "60000ms", "error_rate": "91.2%"},
                {"id": "auth-service", "name": "Auth Service", "type": "service", "status": "failing", "latency": "59800ms", "error_rate": "95.0%"},
                {"id": "jwks-vault", "name": "Internal Vault / JWKS", "type": "service", "status": "degraded", "latency": "15000ms", "error_rate": "35.0%"},
                {"id": "user-db", "name": "User DB Replica", "type": "database", "status": "healthy", "latency": "5ms", "error_rate": "0.0%"}
            ],
            "edges": [
                {"source": "api-gateway", "target": "auth-service", "label": "Token Validation", "failing": True},
                {"source": "auth-service", "target": "jwks-vault", "label": "Key Fetch", "failing": True},
                {"source": "auth-service", "target": "user-db", "label": "Lookup", "failing": False}
            ]
        },
        "logs": [
            "2026-10-30T16:09:50.001Z [auth-service] [ERROR] JWKS public key rotation sync stalled: TCP handshake timeout to vault.internal:8200",
            "2026-10-30T16:09:58.330Z [auth-service] [ERROR] Synchronous lock acquired by KeyRotator thread holding AuthFilter threads blocked indefinitely",
            "2026-10-30T16:10:02.100Z [api-gateway] [ERROR] 504 Gateway Timeout: client canceled request after 60s"
        ],
        "root_cause": "JWKS key rotation thread entered a mutual deadlock with incoming JWT validation filters while waiting for unresponsive internal Vault endpoint, holding 200 HTTP worker threads in WAITING state.",
        "remediation": {
            "id": "rem-auth-03",
            "title": "Enable Stale Key Cache Fallback & Bypass Synchronous Vault Call",
            "description": "Switch Auth Service feature flag USE_LOCAL_JWKS_CACHE=true to serve cached keys with 24h grace period, and restart pods gracefully.",
            "target_service": "auth-service",
            "command": "kubectl set env deployment/auth-service USE_LOCAL_JWKS_CACHE=true VAULT_SYNC_TIMEOUT=2000ms && kubectl rollout restart deployment/auth-service",
            "patch_diff": "--- a/env/auth-service.env\n+++ b/env/auth-service.env\n@@ -8,2 +8,2 @@\n-USE_LOCAL_JWKS_CACHE=false\n-VAULT_SYNC_TIMEOUT=60000ms\n+USE_LOCAL_JWKS_CACHE=true\n+VAULT_SYNC_TIMEOUT=2000ms",
            "risk_level": "LOW",
            "rollback_command": "kubectl rollout undo deployment/auth-service",
            "estimated_recovery_time": "20 seconds",
            "status": "PENDING_APPROVAL"
        }
    }
}

def get_scenario(scenario_id: str) -> Dict[str, Any]:
    return SCENARIOS.get(scenario_id, SCENARIOS["db_pool_exhaustion"])

def create_incident_from_scenario(scenario_id: str) -> Incident:
    sc = get_scenario(scenario_id)
    now = datetime.utcnow().isoformat() + "Z"
    
    alerts = [Alert(**a) for a in sc["alerts"]]
    nodes = [CausalNode(**n) for n in sc["topology"]["nodes"]]
    edges = [CausalEdge(**e) for e in sc["topology"]["edges"]]
    top = TopologyGraph(nodes=nodes, edges=edges)
    rem = RemediationPlan(**sc["remediation"])
    
    incident = Incident(
        id=f"INC-{uuid.uuid4().hex[:6].upper()}",
        scenario_id=sc["id"],
        title=sc["title"],
        status="ACTIVE",
        severity=sc["severity"],
        created_at=now,
        blast_radius=sc["blast_radius"],
        root_cause_summary=None,
        alerts=alerts,
        agent_thoughts=[],
        topology=top,
        remediation_plan=rem,
        post_mortem=None
    )
    return incident
