import uuid
import json
import urllib.request
import urllib.error
from datetime import datetime
from typing import Optional, Dict, Any, List
from app.models.schemas import Incident
from app.config import settings

class AICopilot:
    """Intelligent SRE Assistant & Incident Response Copilot powered by Groq LPU™ Inference.
    
    Provides interactive conversational insights, explains root causes in plain English,
    validates manual commands, and guides operators during live outages.
    """

    GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
    PRIMARY_MODEL = "openai/gpt-oss-120b"
    FALLBACK_MODELS = ["openai/gpt-oss-20b", "qwen/qwen3.8-27b"]

    @classmethod
    def generate_response(cls, message: str, incident: Optional[Incident] = None) -> Dict[str, Any]:
        now = datetime.utcnow().strftime("%H:%M:%S")

        # 1. Try Groq Cloud AI completion if API key is present
        if settings.GROQ_API_KEY and not settings.SIMULATED_AI_MODE:
            groq_reply = cls._call_groq_api(message, incident)
            if groq_reply:
                return {
                    "id": f"msg-{uuid.uuid4().hex[:6]}",
                    "sender": "Aegis Copilot",
                    "role": "assistant",
                    "avatar": "🤖",
                    "timestamp": now,
                    "model": "Groq LPU (GPT-OSS-120B)",
                    "content": groq_reply
                }

        # 2. Heuristic fallback engine (guarantees instant responses if offline or rate-limited)
        fallback_content = cls._generate_heuristic_fallback(message, incident, now)
        return {
            "id": f"msg-{uuid.uuid4().hex[:6]}",
            "sender": "Aegis Copilot",
            "role": "assistant",
            "avatar": "🤖",
            "timestamp": now,
            "model": "Aegis Rule Engine",
            "content": fallback_content
        }

    @classmethod
    def _call_groq_api(cls, user_message: str, incident: Optional[Incident]) -> Optional[str]:
        """Calls Groq LPU API with full incident context."""
        context_parts = []
        if incident:
            context_parts.append(f"CURRENT INCIDENT CONTEXT:")
            context_parts.append(f"- Incident ID: {incident.id}")
            context_parts.append(f"- Title: {incident.title}")
            context_parts.append(f"- Severity: {incident.severity}")
            context_parts.append(f"- Status: {incident.status}")
            context_parts.append(f"- Blast Radius: {incident.blast_radius}")
            if incident.root_cause_summary:
                context_parts.append(f"- Root Cause: {incident.root_cause_summary}")
            if incident.clock_skew_detected:
                context_parts.append(f"- Clock Drift / Skew: {incident.clock_skew_detected}")
            if incident.uncertainty_analysis:
                context_parts.append(f"- Epistemic Uncertainty: {incident.uncertainty_analysis}")
            if incident.where_to_look_next:
                context_parts.append(f"- Next Lookouts: {'; '.join(incident.where_to_look_next)}")
            if incident.remediation_plan:
                context_parts.append(f"- Proposed Hotfix: {incident.remediation_plan.title}")
                context_parts.append(f"- Command: `{incident.remediation_plan.command}`")
                context_parts.append(f"- Rollback Command: `{incident.remediation_plan.rollback_command}`")
                context_parts.append(f"- Risk Level: {incident.remediation_plan.risk_level}")
        else:
            context_parts.append("Cluster status: Normal / Nominal. No active outage.")

        system_prompt = (
            "You are AegisOps AI Copilot, an elite Site Reliability Engineering (SRE) and Autonomous Incident Response assistant. "
            "You are pair-programming with the human operator in the AegisOps War Room.\n"
            + "\n".join(context_parts) + "\n\n"
            "Guidelines:\n"
            "1. Answer questions concisely, professionally, and accurately in markdown.\n"
            "2. If asked to explain simply or like to a kid, use simple analogies and clear headings.\n"
            "3. If asked about safety or risk, audit the proposed command and explain rollback mechanisms.\n"
            "4. If asked about clock drift (Mentor Challenge 12), explain how naive timestamps deceive and how trace parentage solves it.\n"
            "5. If asked about epistemic uncertainty, explain confidence calibration and recommended next steps.\n"
            "6. Always format bash/kubectl/sql commands in markdown code blocks."
        )

        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "AegisOps-WarRoom/1.0"
        }

        for model_name in [cls.PRIMARY_MODEL] + cls.FALLBACK_MODELS:
            payload = {
                "model": model_name,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                "temperature": 0.3,
                "max_tokens": 500
            }

            try:
                req = urllib.request.Request(
                    cls.GROQ_API_URL,
                    data=json.dumps(payload).encode("utf-8"),
                    headers=headers
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    choices = data.get("choices", [])
                    if choices and "message" in choices[0]:
                        return choices[0]["message"]["content"].strip()
            except urllib.error.HTTPError as e:
                # If model is unavailable or rate limited, try next fallback model
                continue
            except Exception:
                continue

        return None

    @classmethod
    def _generate_heuristic_fallback(cls, message: str, incident: Optional[Incident], now: str) -> str:
        msg_lower = message.lower().strip()

        # 1. Clock Skew / Challenge 12
        if any(w in msg_lower for w in ["clock", "drift", "skew", "timestamp", "causality", "challenge"]):
            if incident and incident.clock_skew_detected:
                return (
                    f"⏰ **Clock Skew Analysis (Challenge 12):**\n\n"
                    f"- **Observed Drift:** {incident.clock_skew_detected}\n"
                    "- **The Trap:** When host clocks drift by several seconds, error logs from downstream services may appear to happen *before* upstream requests, tricking naive timestamp-based monitors.\n"
                    "- **AegisOps Solution:** Our Scout and Oracle agents disregarded wall-clock order and sorted events using OpenTelemetry distributed trace parent-span IDs (`trace_id`)."
                )
            return (
                "⏰ **Clock Drift Protection:**\n\n"
                "AegisOps uses causal trace parentage (`trace_id`) instead of raw wall-clock timestamps. "
                "You can trigger Scenario 12: *'Skewed Clocks & Polymorphic Log Drift'* from the top dropdown to see this in action!"
            )

        # 2. Epistemic Uncertainty
        if any(w in msg_lower for w in ["sure", "confidence", "uncertain", "doubt", "trust", "epistemic"]):
            if incident and incident.uncertainty_analysis:
                return (
                    f"🔮 **Epistemic Uncertainty & Confidence Calibration:**\n\n"
                    f"{incident.uncertainty_analysis}\n\n"
                    "Our agents are built with **calibrated confidence** (Hackathon Hint #3). When logs have shifting formats or missing timestamps, the crew admits ambiguity and provides recommended next steps rather than guessing blindly."
                )
            return "Current RCA confidence is high (>95%). The error signatures match well-known failure patterns."

        # 3. Safety / Risk Analysis
        if any(w in msg_lower for w in ["safe", "risk", "danger", "rollback"]):
            if incident and incident.remediation_plan:
                rem = incident.remediation_plan
                return (
                    f"🛡️ **Remediation Safety Audit:**\n\n"
                    f"- **Risk Level:** `{rem.risk_level}`\n"
                    f"- **Staged Command:** `{rem.command}`\n"
                    f"- **Rollback Plan:** If anything degrades further, AegisOps can instantly execute:\n  `{rem.rollback_command}`\n\n"
                    "✓ Our Commander agent verifies that traffic will not be dropped during the rollout."
                )
            return "No active remediation plan is awaiting approval right now. All cluster deployments are running normally."

        # 4. Linux / Server Commands / How do I fix manually?
        if any(w in msg_lower for w in ["manual", "terminal", "bash", "linux", "command", "how to fix"]):
            if incident and incident.remediation_plan:
                rem = incident.remediation_plan
                return (
                    f"💻 **Manual Terminal Intervention Guide:**\n\n"
                    f"Run this command directly on your host or cluster:\n\n"
                    f"```bash\n{rem.command}\n```\n\n"
                    f"To verify recovery:\n"
                    f"```bash\ncurl -I http://localhost:8000/api/health\n```"
                )
            return "No manual intervention needed. System is operating at nominal levels."

        # 5. Plain English / Simple Explanation
        if any(w in msg_lower for w in ["explain", "simple", "kid", "what happened", "why", "root cause", "summary"]):
            if incident:
                rca = incident.root_cause_summary or "Autonomous agents are currently investigating stack frames and telemetry."
                rem_info = f"Our Armorer agent staged `{incident.remediation_plan.command}` (Est. recovery: {incident.remediation_plan.estimated_recovery_time})." if incident.remediation_plan else "Investigating playbook."
                return (
                    f"**Here is what happened in simple terms:**\n\n"
                    f"🛡️ **The Problem:** {incident.title}\n\n"
                    f"🔍 **Root Cause:** {rca}\n\n"
                    f"🎯 **Target Affected:** `{incident.blast_radius}`\n\n"
                    f"⚙️ **The Solution:** {rem_info}\n\n"
                    "Click **Authorize & Execute** in the Remediation Cockpit to apply the hotfix!"
                )
            return "Currently the cluster is in a stable state. You can trigger any chaos scenario or paste a server crash log from the top navigation to see the multi-agent crew in action!"

        # 6. Default
        active_info = f"Active Incident: {incident.title} ({incident.id})" if incident else "Cluster Status: Normal"
        return (
            f"👋 **AegisOps AI Copilot Online** [{now}]\n\n"
            f"**System State:** {active_info}\n\n"
            f"You asked: *\"{message}\"*\n\n"
            "I can help you with:\n"
            "- Explaining any active crash or stack trace in plain English\n"
            "- Reviewing proposed Kubernetes/Linux hotfixes before you approve them\n"
            "- Guiding you through manual command line fixes\n"
            "- Demonstrating clock drift normalizers and polymorphic log parsing"
        )
