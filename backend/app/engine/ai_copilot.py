import uuid
import re
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
    validates safety, and guides operators during live outages WITHOUT generating code snippets or code blocks.
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
                clean_reply = cls._clean_code_from_text(groq_reply)
                return {
                    "id": f"msg-{uuid.uuid4().hex[:6]}",
                    "sender": "Aegis Copilot",
                    "role": "assistant",
                    "avatar": "🤖",
                    "timestamp": now,
                    "model": "Groq LPU (GPT-OSS-120B)",
                    "content": clean_reply
                }

        # 2. Heuristic fallback engine (guarantees instant responses if offline or rate-limited)
        fallback_content = cls._generate_heuristic_fallback(message, incident, now)
        clean_fallback = cls._clean_code_from_text(fallback_content)
        return {
            "id": f"msg-{uuid.uuid4().hex[:6]}",
            "sender": "Aegis Copilot",
            "role": "assistant",
            "avatar": "🤖",
            "timestamp": now,
            "model": "Aegis Rule Engine",
            "content": clean_fallback
        }

    @classmethod
    def _clean_code_from_text(cls, text: str) -> str:
        """Completely strips out all code blocks, code fences, and raw code snippets from AI output."""
        if not text:
            return ""
        # 1. Completely remove markdown code fences ```...``` and any code inside them
        cleaned = re.sub(r'```[\s\S]*?```', '', text)
        # 2. Remove stray backticks
        cleaned = cleaned.replace('```', '')
        # 3. Clean up multiple consecutive empty lines
        cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
        return cleaned.strip()

    @classmethod
    def _call_groq_api(cls, user_message: str, incident: Optional[Incident]) -> Optional[str]:
        """Calls Groq LPU API with full incident context, strictly requesting no code generation."""
        context_parts = []
        if incident:
            context_parts.append("CURRENT INCIDENT CONTEXT:")
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
                context_parts.append(f"- Staged Playbook: {incident.remediation_plan.title}")
                context_parts.append(f"- Recovery Time: {incident.remediation_plan.estimated_recovery_time}")
                context_parts.append(f"- Risk Level: {incident.remediation_plan.risk_level}")
        else:
            context_parts.append("Cluster status: Normal / Nominal. No active outage.")

        system_prompt = (
            "You are AegisOps AI Copilot, an elite Site Reliability Engineering (SRE) conversational assistant. "
            "You are pair-programming with the human operator in the War Room.\n"
            + "\n".join(context_parts) + "\n\n"
            "CRITICAL CONSTRAINTS:\n"
            "1. NEVER WRITE OR GENERATE ANY CODE, SCRIPTS, BASH COMMANDS, PYTHON, JAVA, OR SQL.\n"
            "2. NEVER USE MARKDOWN CODE BLOCKS (```). The operator does NOT want code in the response.\n"
            "3. Answer strictly in clear, professional conversational English prose.\n"
            "4. Explain root causes, system impact, risk level, and next steps conceptually without code.\n"
            "5. If describing how to resolve the incident, explain the conceptual steps in plain English (e.g. 'restart the failing worker service', 'drop stale cache memory', 'expand database connection limit') without writing code.\n"
            "6. Keep explanations concise, direct, helpful, and conversational."
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
                "temperature": 0.2,
                "max_tokens": 400
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
            except urllib.error.HTTPError:
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
                    f"Clock Skew Analysis (Challenge 12):\n\n"
                    f"Observed Drift: {incident.clock_skew_detected}\n\n"
                    "The Problem: When host clocks drift by several seconds, error logs from downstream services may appear to happen before upstream requests, tricking naive timestamp-based monitors.\n\n"
                    "AegisOps Solution: Our Scout and Oracle agents disregarded wall-clock order and sorted events using OpenTelemetry distributed trace parent-span IDs."
                )
            return (
                "Clock Drift Protection:\n\n"
                "AegisOps uses causal trace parentage instead of raw wall-clock timestamps. "
                "You can trigger Scenario 12: 'Skewed Clocks & Polymorphic Log Drift' from the top dropdown to see this in action."
            )

        # 2. Epistemic Uncertainty
        if any(w in msg_lower for w in ["sure", "confidence", "uncertain", "doubt", "trust", "epistemic"]):
            if incident and incident.uncertainty_analysis:
                return (
                    f"Epistemic Uncertainty & Confidence Calibration:\n\n"
                    f"{incident.uncertainty_analysis}\n\n"
                    "Our agents are built with calibrated confidence. When logs have shifting formats or missing timestamps, the crew admits ambiguity and provides recommended next steps rather than guessing blindly."
                )
            return "Current root cause analysis confidence is high (>95%). The error signatures match well-known failure patterns."

        # 3. Safety / Risk Analysis
        if any(w in msg_lower for w in ["safe", "risk", "danger", "rollback"]):
            if incident and incident.remediation_plan:
                rem = incident.remediation_plan
                return (
                    f"Remediation Safety Audit:\n\n"
                    f"- Risk Level: {rem.risk_level}\n"
                    f"- Staged Plan: {rem.title}\n"
                    "- Rollback Plan: If anything degrades further, AegisOps can instantly trigger the rollback mechanism to revert to the previous revision.\n\n"
                    "Our Commander agent verifies that traffic will not be dropped during the rollout."
                )
            return "No active remediation plan is awaiting approval right now. All cluster deployments are running normally."

        # 4. Action Steps / How to fix
        if any(w in msg_lower for w in ["manual", "terminal", "bash", "linux", "command", "how to fix", "action steps"]):
            if incident and incident.remediation_plan:
                rem = incident.remediation_plan
                return (
                    f"Recommended Action Steps:\n\n"
                    f"1. Review the proposed playbook: '{rem.title}'.\n"
                    f"2. Authorize execution in the Remediation Cockpit to apply the configuration adjustments.\n"
                    f"3. The automated engine will restart the {rem.target_service} daemon and verify recovery using live health probes."
                )
            return "No manual intervention needed. System is operating at nominal levels."

        # 5. Plain English / Simple Explanation
        if any(w in msg_lower for w in ["explain", "simple", "kid", "what happened", "why", "root cause", "summary"]):
            if incident:
                rca = incident.root_cause_summary or "Autonomous agents are currently investigating stack frames and telemetry."
                rem_info = f"Our Armorer agent staged: '{incident.remediation_plan.title}' with an estimated recovery of {incident.remediation_plan.estimated_recovery_time}." if incident.remediation_plan else "Investigating playbook."
                return (
                    f"Here is what happened in simple terms:\n\n"
                    f"The Problem: {incident.title}\n\n"
                    f"Root Cause: {rca}\n\n"
                    f"Target Affected: {incident.blast_radius}\n\n"
                    f"The Solution: {rem_info}\n\n"
                    "Click Authorize & Execute in the Remediation Cockpit to apply the hotfix."
                )
            return "Currently the cluster is in a stable state. You can trigger any chaos scenario or paste a server crash log from the top navigation to see the multi-agent crew in action."

        # 6. Default
        active_info = f"Active Incident: {incident.title} ({incident.id})" if incident else "Cluster Status: Normal"
        return (
            f"AegisOps AI Copilot Online [{now}]\n\n"
            f"System State: {active_info}\n\n"
            f"You asked: '{message}'\n\n"
            "I can help you with:\n"
            "- Explaining any active crash or stack trace in plain English\n"
            "- Reviewing proposed hotfixes before you approve them\n"
            "- Explaining root causes and system blast radius\n"
            "- Demonstrating clock drift normalizers and polymorphic log parsing"
        )
