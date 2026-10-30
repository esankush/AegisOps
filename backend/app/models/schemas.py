from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime

class Alert(BaseModel):
    id: str
    timestamp: str
    source: str
    service: str
    severity: str # "CRITICAL", "HIGH", "MEDIUM", "LOW"
    message: str
    metrics: Dict[str, Any] = Field(default_factory=dict)

class AgentThought(BaseModel):
    agent_id: str
    agent_name: str
    avatar: str
    timestamp: str
    step: str # "TRIAGE", "INVESTIGATION", "RCA", "REMEDIATION", "VERIFICATION"
    content: str
    confidence: float = 0.95
    metadata: Dict[str, Any] = Field(default_factory=dict)

class CausalNode(BaseModel):
    id: str
    name: str
    type: str # "service", "database", "gateway", "queue"
    status: str # "healthy", "degraded", "failing", "remediated"
    latency: str
    error_rate: str

class CausalEdge(BaseModel):
    source: str
    target: str
    label: Optional[str] = None
    failing: bool = False

class TopologyGraph(BaseModel):
    nodes: List[CausalNode]
    edges: List[CausalEdge]

class RemediationPlan(BaseModel):
    id: str
    title: str
    description: str
    target_service: str
    command: str
    patch_diff: str
    risk_level: str # "LOW", "MEDIUM", "HIGH"
    rollback_command: str
    estimated_recovery_time: str
    status: str = "PENDING_APPROVAL" # "PENDING_APPROVAL", "APPROVED", "REJECTED", "APPLIED", "FAILED"

class Incident(BaseModel):
    id: str
    scenario_id: str
    title: str
    status: str # "ACTIVE", "ANALYZING", "AWAITING_APPROVAL", "REMEDIATING", "RESOLVED"
    severity: str # "P1 - CRITICAL", "P2 - MAJOR", "P3 - MODERATE"
    created_at: str
    resolved_at: Optional[str] = None
    blast_radius: str
    root_cause_summary: Optional[str] = None
    clock_skew_detected: Optional[str] = None
    uncertainty_analysis: Optional[str] = None
    where_to_look_next: Optional[List[str]] = Field(default_factory=list)
    alerts: List[Alert] = Field(default_factory=list)
    agent_thoughts: List[AgentThought] = Field(default_factory=list)
    topology: TopologyGraph
    remediation_plan: Optional[RemediationPlan] = None
    post_mortem: Optional[str] = None

class ScenarioTriggerRequest(BaseModel):
    scenario_id: str = Field(
        default="skewed_clocks_format_drift",
        description="Scenario identifier: 'skewed_clocks_format_drift', 'db_pool_exhaustion', 'memory_leak_crash', or 'cascading_504_gateway'",
        examples=["skewed_clocks_format_drift", "db_pool_exhaustion"]
    )

class CustomLogIncidentRequest(BaseModel):
    service: str = Field(
        default="billing-worker",
        description="Target microservice name",
        examples=["billing-worker"]
    )
    title: Optional[str] = Field(
        default="Custom Production Log Outage",
        description="Human-readable incident title",
        examples=["Deadlock and High Latency Outage"]
    )
    raw_logs: str = Field(
        default="2026-10-31T03:30:00Z [billing-worker] [FATAL] Thread pool exhausted: 500 connections active\n2026-10-31T03:30:02Z [api-gateway] [ERROR] 504 Gateway Timeout downstream",
        description="Raw container logs or stack trace text",
        examples=["2026-10-31T03:30:00Z [billing-worker] [FATAL] Thread pool exhausted: 500 connections active"]
    )

class RemediationActionRequest(BaseModel):
    action: Literal["APPROVE", "REJECT", "CUSTOM_COMMAND"] = Field(
        default="APPROVE",
        description="Remediation action: 'APPROVE', 'REJECT', or 'CUSTOM_COMMAND'",
        examples=["APPROVE", "REJECT", "CUSTOM_COMMAND"]
    )
    custom_command: Optional[str] = Field(
        default=None,
        description="Shell command to execute if action is CUSTOM_COMMAND",
        examples=["kubectl rollout restart deployment/billing-worker"]
    )

class ChatMessageRequest(BaseModel):
    message: str = Field(
        default="Explain what caused this incident",
        description="User question to the AI Copilot",
        examples=["What is the root cause?", "Is it safe to execute the hotfix?"]
    )
