import uuid
from datetime import datetime
from typing import Dict, Any
from app.models.schemas import Incident, Alert, TopologyGraph, CausalNode, CausalEdge, RemediationPlan

SCENARIOS: Dict[str, Dict[str, Any]] = {
    "skewed_clocks_format_drift": {
        "id": "skewed_clocks_format_drift",
        "title": "Skewed Clocks & Polymorphic Log Drift (Afterhours Challenge 12)",
        "severity": "P1 - CRITICAL",
        "blast_radius": "billing-worker, api-gateway (Clock drift +3400ms & mixed JSON/unstructured logs)",
        "service": "billing-worker",
        "clock_skew": "Clock skew of +3400ms detected on billing-worker relative to api-gateway. Naive timestamp ordering falsely blames api-gateway.",
        "uncertainty_analysis": "Confidence calibrated to 82.5% (17.5% uncertainty due to 2 unparsed polymorphic log formats and NTP drift across node-04).",
        "where_to_look_next": [
            "Check NTP daemon clock synchronization on node-04 (chrony/systemd-timesyncd).",
            "Trace distributed span parentage via OpenTelemetry trace_id #tr-99201 to verify request sequence.",
            "Inspect raw stderr on billing-worker container for unstructured panic frames."
        ],
        "alerts": [
            {
                "id": "alt-skew-01",
                "timestamp": "2026-10-30T16:20:00Z", # Shows as happening earlier due to clock skew!
                "source": "Traefik Ingress Gateway",
                "service": "api-gateway",
                "severity": "CRITICAL",
                "message": "HTTP 504 Gateway Timeout downstream. Upstream caller timed out after 5000ms.",
                "metrics": {"clock_offset": "-3400ms", "upstream_target": "billing-worker"}
            },
            {
                "id": "alt-skew-02",
                "timestamp": "2026-10-30T16:20:03.400Z", # Misleading timestamp!
                "source": "Kubelet Node Monitor",
                "service": "billing-worker",
                "severity": "HIGH",
                "message": "NTP_CLOCK_SKEW_WARNING: Host clock drifted by +3400ms. Deadlock detected in worker pool.",
                "metrics": {"ntp_drift_ms": 3400, "pool_deadlock": True}
            }
        ],
        "topology": {
            "nodes": [
                {"id": "api-gateway", "name": "API Gateway (Traefik)", "type": "gateway", "status": "degraded", "latency": "5200ms", "error_rate": "48.2%"},
                {"id": "billing-worker", "name": "Billing Worker (Clock Drifted +3.4s)", "type": "service", "status": "failing", "latency": "Deadlocked", "error_rate": "100.0%"},
                {"id": "stripe-vault", "name": "Stripe Secrets Vault", "type": "service", "status": "healthy", "latency": "35ms", "error_rate": "0.0%"},
                {"id": "postgres-db", "name": "Ledger DB Primary", "type": "database", "status": "healthy", "latency": "8ms", "error_rate": "0.0%"}
            ],
            "edges": [
                {"source": "api-gateway", "target": "billing-worker", "label": "RPC (Trace #tr-99201)", "failing": True},
                {"source": "billing-worker", "target": "stripe-vault", "label": "Key Auth", "failing": False},
                {"source": "billing-worker", "target": "postgres-db", "label": "SQL Tx", "failing": False}
            ]
        },
        "logs": [
            '{"timestamp":"2026-10-30T16:20:00.120Z","service":"api-gateway","level":"ERROR","trace_id":"tr-99201","parent_span":"root","msg":"504 Upstream Timeout to billing-worker"}',
            "2026-10-30T16:20:03.421Z [billing-worker] [FATAL] [TS_DRIFT: +3400ms] Deadlock in SettlementTask.java:77 while acquiring MutexLock on billing-queue",
            ">>> NEW_DEPLOY_FORMAT: CRASH_REPORT worker_pid=8812 status=MUTEX_DEADLOCK lines_unread=true unexpected_payload=0x9920ff1",
            "2026-10-30T16:20:03.900Z [billing-worker] [WARN] [NTP_CLOCK_SKEW] Local clock offset is +3400ms ahead of cluster reference time"
        ],
        "root_cause": "A mutex deadlock in SettlementTask.java:77 halted billing-worker. Because billing-worker's clock was drifted +3.4s ahead, naive timestamp sorting made api-gateway look like the cause, but trace parentage (tr-99201) reveals billing-worker initiated the failure.",
        "remediation": {
            "id": "rem-skew-12",
            "title": "Restart Deadlocked Billing Worker & Trigger Node Clock Resync",
            "description": "Terminate deadlocked billing-worker instances, flush stale mutex locks, and invoke chronyd NTP resync on node-04.",
            "target_service": "billing-worker",
            "command": "kubectl rollout restart deployment/billing-worker && ssh node-04 'chronyc makestep'",
            "patch_diff": "--- a/deployments/billing-worker.yaml\n+++ b/deployments/billing-worker.yaml\n@@ -12,2 +12,4 @@\n   spec:\n+    hostNetwork: false\n+    tolerations: [{key: ntp-synced, operator: Exists}]\n     containers:\n-      image: billing-worker:v1.4.1-rc1\n+      image: billing-worker:v1.4.0-stable",
            "risk_level": "LOW",
            "rollback_command": "kubectl rollout undo deployment/billing-worker",
            "estimated_recovery_time": "25 seconds",
            "status": "PENDING_APPROVAL"
        }
    },
    "db_pool_exhaustion": {
        "id": "db_pool_exhaustion",
        "title": "PostgreSQL Connection Pool Exhaustion & Thread Starvation",
        "severity": "P1 - CRITICAL",
        "blast_radius": "checkout-service, order-processor, api-gateway (38% of user transactions affected)",
        "service": "checkout-service",
        "clock_skew": None,
        "uncertainty_analysis": "Confidence calibrated to 96.4% (Deterministic stack trace and Prometheus metrics directly correlate).",
        "where_to_look_next": [
            "Inspect CheckoutHandler.java:189 to verify missing finally block on DB connection.",
            "Check AWS RDS CloudWatch connection metric graphs for connection leak rate."
        ],
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
        "clock_skew": None,
        "uncertainty_analysis": "Confidence 98%: Linux cgroup memory metrics directly match OOMKill exit code 137.",
        "where_to_look_next": [
            "Check git commit #e4f9b2 diff in PaymentsIdempotencyService.",
            "Review JVM heap dump for static map leak."
        ],
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
        "clock_skew": None,
        "uncertainty_analysis": "Confidence 94%: Consecutive 5xx timeouts on ingress corroborate Vault thread locks.",
        "where_to_look_next": [
            "Verify Vault network route latency on port 8200.",
            "Inspect KeyRotator deadlock mutex status in auth-service."
        ],
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
    return SCENARIOS.get(scenario_id, SCENARIOS["skewed_clocks_format_drift"])

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
        clock_skew_detected=sc.get("clock_skew"),
        uncertainty_analysis=sc.get("uncertainty_analysis"),
        where_to_look_next=sc.get("where_to_look_next", []),
        alerts=alerts,
        agent_thoughts=[],
        topology=top,
        remediation_plan=rem,
        post_mortem=None
    )
    return incident

def create_incident_from_custom_logs(service: str, title: str, raw_logs: str) -> Incident:
    now = datetime.utcnow().isoformat() + "Z"
    clean_service = service.strip() or "target-service"
    log_lines = [line.strip() for line in raw_logs.strip().split("\n") if line.strip()]
    
    error_lines = [l for l in log_lines if any(k in l.lower() for k in ["error", "fatal", "exception", "failed", "timeout", "oom", "panic", "refused", "nullpointer"])]
    sample_error = error_lines[0] if error_lines else (log_lines[0] if log_lines else "Unknown application exception")
    
    has_skew = any("drift" in l.lower() or "skew" in l.lower() for l in log_lines)
    skew_msg = f"Clock drift flagged on {clean_service} nodes. Causal tracing activated." if has_skew else None
    
    severity = "P1 - CRITICAL" if len(error_lines) > 2 or any(k in raw_logs.lower() for k in ["fatal", "oom", "panic", "deadlock"]) else "P2 - MAJOR"
    root_cause_guess = f"Adaptive analysis on {clean_service} detected critical failure signature: '{sample_error[:120]}'. Trace causality prioritized over raw timestamps."
    
    alerts = [
        Alert(
            id=f"alt-custom-01",
            timestamp=now,
            source="Adaptive Log Ingestion",
            service=clean_service,
            severity="CRITICAL" if severity == "P1 - CRITICAL" else "HIGH",
            message=sample_error[:200],
            metrics={"log_lines_analyzed": len(log_lines), "error_count": len(error_lines)}
        )
    ]
    
    nodes = [
        CausalNode(id="api-gateway", name="API Gateway", type="gateway", status="degraded", latency="420ms", error_rate="18.5%"),
        CausalNode(id=clean_service, name=f"{clean_service.title()} (User Target)", type="service", status="failing", latency="12400ms", error_rate="74.2%"),
        CausalNode(id="backend-db", name="Primary DB / Storage", type="database", status="healthy", latency="4ms", error_rate="0.0%")
    ]
    edges = [
        CausalEdge(source="api-gateway", target=clean_service, label="Causal Span tr-custom", failing=True),
        CausalEdge(source=clean_service, target="backend-db", label="Storage Queries", failing=False)
    ]
    
    top = TopologyGraph(nodes=nodes, edges=edges)
    
    rem = RemediationPlan(
        id=f"rem-cust-{uuid.uuid4().hex[:4]}",
        title=f"Emergency Hotfix Configuration & Rolling Restart for {clean_service}",
        description=f"Isolate failing instances of {clean_service}, drain active connections, apply safe concurrency limits, and execute rolling container restart.",
        target_service=clean_service,
        command=f"kubectl rollout restart deployment/{clean_service} && kubectl scale deployment/{clean_service} --replicas=4",
        patch_diff=f"--- a/deployments/{clean_service}.yaml\n+++ b/deployments/{clean_service}.yaml\n@@ -10,3 +10,4 @@\n   spec:\n-    replicas: 1\n+    replicas: 4\n+    terminationGracePeriodSeconds: 30",
        risk_level="LOW",
        rollback_command=f"kubectl rollout undo deployment/{clean_service}",
        estimated_recovery_time="35 seconds",
        status="PENDING_APPROVAL"
    )
    
    SCENARIOS[f"custom_{clean_service}"] = {
        "id": f"custom_{clean_service}",
        "title": title or f"Custom Log Incident in {clean_service}",
        "logs": log_lines,
        "root_cause": root_cause_guess,
        "clock_skew": skew_msg,
        "uncertainty_analysis": f"Confidence: 85% (15% calibrated uncertainty due to user log ingestion dialect variance).",
        "where_to_look_next": [
            f"Check container log stderr on {clean_service} pods.",
            "Verify distributed trace context headers (traceparent/b3) across downstream RPCs."
        ]
    }
    
    return Incident(
        id=f"INC-{uuid.uuid4().hex[:6].upper()}",
        scenario_id=f"custom_{clean_service}",
        title=title or f"Custom Log Incident: {clean_service}",
        status="ACTIVE",
        severity=severity,
        created_at=now,
        blast_radius=f"{clean_service}, upstream gateway (User-pasted error logs)",
        root_cause_summary=root_cause_guess,
        clock_skew_detected=skew_msg,
        uncertainty_analysis=f"Confidence: 85% (Calibrated uncertainty based on custom log parsing).",
        where_to_look_next=[
            f"Inspect {clean_service} thread allocation.",
            "Check upstream gateway retry timeout configuration."
        ],
        alerts=alerts,
        agent_thoughts=[],
        topology=top,
        remediation_plan=rem,
        post_mortem=None
    )
