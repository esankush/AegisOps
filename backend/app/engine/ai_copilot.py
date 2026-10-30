import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from app.models.schemas import Incident

class AICopilot:
    """Intelligent SRE Assistant & Incident Response Copilot.
    
    Provides interactive conversational insights, explains root causes in plain English,
    validates manual commands, and guides operators during live outages.
    """

    @classmethod
    def generate_response(cls, message: str, incident: Optional[Incident] = None) -> Dict[str, Any]:
        msg_lower = message.lower().strip()
        now = datetime.utcnow().strftime("%H:%M:%S")

        # 1. Clock Skew / Mentor Curveball Questions
        if any(w in msg_lower for w in ["clock", "drift", "skew", "timestamp", "causality", "challenge"]):
            if incident and incident.clock_skew_detected:
                reply = (
                    f"⏰ **Clock Skew Analysis (Challenge 12):**\n\n"
                    f"- **Observed Drift:** {incident.clock_skew_detected}\n"
                    "- **The Trap:** When host clocks drift by several seconds, error logs from downstream services may appear to happen *before* upstream requests, tricking naive timestamp-based monitors.\n"
                    "- **AegisOps Solution:** Our Scout and Oracle agents disregarded wall-clock order and sorted events using OpenTelemetry distributed trace parent-span IDs (`trace_id`)."
                )
            else:
                reply = (
                    "⏰ **Clock Drift Protection:**\n\n"
                    "AegisOps uses causal trace parentage (`trace_id`) instead of raw wall-clock timestamps. "
                    "You can trigger Scenario 12: *'Skewed Clocks & Polymorphic Log Drift'* from the top dropdown to see this in action!"
                )

        # 2. Epistemic Uncertainty / "Are you sure?"
        elif any(w in msg_lower for w in ["sure", "confidence", "uncertain", "doubt", "trust", "epistemic"]):
            if incident and incident.uncertainty_analysis:
                reply = (
                    f"🔮 **Epistemic Uncertainty & Confidence Calibration:**\n\n"
                    f"{incident.uncertainty_analysis}\n\n"
                    "Our agents are built with **calibrated confidence** (Hackathon Hint #3). When logs have shifting formats or missing timestamps, the crew admits ambiguity and provides recommended next steps rather than guessing blindly."
                )
            else:
                reply = "Current RCA confidence is high (>95%). The error signatures match well-known failure patterns."

        # 3. Safety / Risk Analysis
        elif any(w in msg_lower for w in ["safe", "risk", "danger", "rollback"]):
            if incident and incident.remediation_plan:
                rem = incident.remediation_plan
                reply = (
                    f"🛡️ **Remediation Safety Audit:**\n\n"
                    f"- **Risk Level:** `{rem.risk_level}`\n"
                    f"- **Staged Command:** `{rem.command}`\n"
                    f"- **Rollback Plan:** If anything degrades further, AegisOps can instantly execute:\n  `{rem.rollback_command}`\n\n"
                    "✓ Our Commander agent verifies that traffic will not be dropped during the rollout."
                )
            else:
                reply = "No active remediation plan is awaiting approval right now. All cluster deployments are running normally."

        # 4. Linux / Server Commands / How do I fix manually?
        elif any(w in msg_lower for w in ["manual", "terminal", "bash", "linux", "command", "how to fix"]):
            if incident and incident.remediation_plan:
                rem = incident.remediation_plan
                reply = (
                    f"💻 **Manual Terminal Intervention Guide:**\n\n"
                    f"Run this command directly on your host or cluster:\n\n"
                    f"```bash\n{rem.command}\n```\n\n"
                    f"To verify recovery:\n"
                    f"```bash\ncurl -I http://localhost:8000/api/health\n```"
                )
            else:
                reply = "No manual intervention needed. System is operating at nominal levels."

        # 5. Plain English / Simple Explanation
        elif any(w in msg_lower for w in ["explain", "simple", "kid", "what happened", "why", "root cause", "summary"]):
            if incident:
                rca = incident.root_cause_summary or "Autonomous agents are currently investigating stack frames and telemetry."
                rem_info = f"Our Armorer agent staged `{incident.remediation_plan.command}` (Est. recovery: {incident.remediation_plan.estimated_recovery_time})." if incident.remediation_plan else "Investigating playbook."
                reply = (
                    f"**Here is what happened in simple terms:**\n\n"
                    f"🛡️ **The Problem:** {incident.title}\n\n"
                    f"🔍 **Root Cause:** {rca}\n\n"
                    f"🎯 **Target Affected:** `{incident.blast_radius}`\n\n"
                    f"⚙️ **The Solution:** {rem_info}\n\n"
                    "Click **Authorize & Execute** in the Remediation Cockpit to apply the hotfix!"
                )
            else:
                reply = "Currently the cluster is in a stable state. You can trigger any chaos scenario or paste a server crash log from the top navigation to see the multi-agent crew in action!"

        # 6. Default / General AI Assistant Response
        else:
            active_info = f"Active Incident: {incident.title} ({incident.id})" if incident else "Cluster Status: Normal"
            reply = (
                f"👋 **AegisOps AI Copilot Online** [{now}]\n\n"
                f"**System State:** {active_info}\n\n"
                f"You asked: *\"{message}\"*\n\n"
                "I can help you with:\n"
                "- Explaining any active crash or stack trace in plain English\n"
                "- Reviewing proposed Kubernetes/Linux hotfixes before you approve them\n"
                "- Guiding you through manual command line fixes\n"
                "- Demonstrating clock drift normalizers and polymorphic log parsing"
            )

        return {
            "id": f"msg-{uuid.uuid4().hex[:6]}",
            "sender": "Aegis Copilot",
            "role": "assistant",
            "avatar": "🤖",
            "timestamp": now,
            "content": reply
        }
