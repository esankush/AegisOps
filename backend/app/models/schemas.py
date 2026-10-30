from typing import List, Optional, Dict, Any
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
    alerts: List[Alert] = Field(default_factory=list)
    agent_thoughts: List[AgentThought] = Field(default_factory=list)
    topology: TopologyGraph
    remediation_plan: Optional[RemediationPlan] = None
    post_mortem: Optional[str] = None

class ScenarioTriggerRequest(BaseModel):
    scenario_id: str

class CustomLogIncidentRequest(BaseModel):
    service: str = "custom-service"
    title: Optional[str] = "Custom Production Log Outage"
    raw_logs: str

class RemediationActionRequest(BaseModel):
    action: str # "APPROVE", "REJECT", "CUSTOM_COMMAND"
    custom_command: Optional[str] = None

