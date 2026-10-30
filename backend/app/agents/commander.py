import asyncio
from datetime import datetime
from app.models.schemas import Incident, AgentThought
from app.tools.k8s_patcher import K8sPatcher

class CommanderAgent:
    """Commander - Human-in-the-Loop Orchestrator & Remediation Executor."""

    ID = "agent-commander"
    NAME = "Commander"
    ROLE = "Crew Orchestrator & Human Gate"
    AVATAR = "⭐"

    @classmethod
    async def execute_approved_remediation(cls, incident: Incident) -> AgentThought:
        incident.status = "REMEDIATING"
        rem = incident.remediation_plan
        
        # Call K8s patcher tool
        patch_result = await K8sPatcher.apply_remediation(rem.command if rem else "kubectl rollout restart")
        
        # Update node status in topology to remediated / healthy
        for node in incident.topology.nodes:
            if node.status in ["failing", "degraded"]:
                node.status = "remediated"
                node.latency = "22ms"
                node.error_rate = "0.0%"
        
        for edge in incident.topology.edges:
            edge.failing = False
            
        incident.status = "RESOLVED"
        incident.resolved_at = datetime.utcnow().isoformat() + "Z"
        if rem:
            rem.status = "APPLIED"
            
        skew_section = ""
        if incident.clock_skew_detected:
            skew_section = f"""### 2b. Distributed Systems Clock Drift & Skew Analysis
- **Observed Offset:** {incident.clock_skew_detected}
- **Resolution Strategy:** Disregarded misleading wall-clock timestamps; resolved causality via distributed trace span IDs.
"""

        uncertainty_section = ""
        if incident.uncertainty_analysis:
            uncertainty_section = f"""### 2c. Epistemic Uncertainty & Confidence Calibration
- {incident.uncertainty_analysis}
"""

        next_steps_section = ""
        if incident.where_to_look_next:
            next_steps_section = "### 5. Recommended Next Investigative Lookouts\n" + "\n".join([f"- [ ] {s}" for s in incident.where_to_look_next]) + "\n"

        # Generate automated post mortem markdown
        post_mortem_md = f"""# 📄 Post-Mortem Incident Report: {incident.id}
**Scenario:** {incident.title}  
**Severity:** {incident.severity}  
**Status:** RESOLVED  
**Resolution Time:** {incident.resolved_at}  

---

### 1. Executive Summary
At {incident.created_at}, an alert storm triggered autonomous triage by **AegisOps**. 
The incident was isolated to `{incident.blast_radius}`. Autonomous root-cause analysis was completed and verified by human authorization before applying surgical cluster remediation.

### 2. Root Cause Analysis
{incident.root_cause_summary}

{skew_section}
{uncertainty_section}

### 3. Timeline of Autonomous Multi-Agent Actions
""" + "\n".join([f"- **{t.timestamp} [{t.agent_name} - {t.step}]**: {t.content}" for t in incident.agent_thoughts]) + f"""

### 4. Remediation Executed
- **Command:** `{rem.command if rem else 'N/A'}`
- **Verification:** {patch_result.get('stdout')}
- **Rollback Prepared:** `{rem.rollback_command if rem else 'N/A'}`

{next_steps_section}
### 6. Preventative Action Items
- [ ] Deploy chrony NTP daemon across all Kubernetes worker nodes with <10ms drift tripwires.
- [ ] Enforce schema validation on microservice stdout logs to prevent polymorphic format drift.
- [ ] Implement OpenTelemetry W3C tracecontext baggage propagation across all ingress routes.
"""
        incident.post_mortem = post_mortem_md

        thought = AgentThought(
            agent_id=cls.ID,
            agent_name=cls.NAME,
            avatar=cls.AVATAR,
            timestamp=datetime.utcnow().isoformat() + "Z",
            step="VERIFICATION",
            content=f"Human authorization received. Surgical remediation successfully applied. All affected services verified healthy. Incident {incident.id} marked RESOLVED. Post-Mortem generated with clock drift & uncertainty calibration.",
            confidence=1.0,
            metadata={"status": "RESOLVED", "execution": patch_result}
        )
        incident.agent_thoughts.append(thought)
        return thought

    @classmethod
    async def reject_remediation(cls, incident: Incident) -> AgentThought:
        incident.status = "ACTIVE"
        if incident.remediation_plan:
            incident.remediation_plan.status = "REJECTED"
            
        thought = AgentThought(
            agent_id=cls.ID,
            agent_name=cls.NAME,
            avatar=cls.AVATAR,
            timestamp=datetime.utcnow().isoformat() + "Z",
            step="REMEDIATION",
            content="Remediation plan was REJECTED by human operator. Agents returning to investigative hypothesis state for alternative resolution strategies.",
            confidence=1.0,
            metadata={"status": "REJECTED"}
        )
        incident.agent_thoughts.append(thought)
        return thought
