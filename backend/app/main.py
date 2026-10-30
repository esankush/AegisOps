import sys
import os

# Auto-inject backend directory into sys.path to ensure absolute & relative imports work anywhere
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.openapi.utils import get_openapi
from app.config import settings
from app.models.schemas import (
    ScenarioTriggerRequest,
    CustomLogIncidentRequest,
    RemediationActionRequest,
    Incident
)
from app.engine.simulator import SCENARIOS
from app.engine.crew_manager import crew_manager

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="AegisOps: Autonomous Multi-Agent Incident Response & Triage Crew",
    swagger_ui_parameters={"validatorUrl": None}
)

def custom_openapi():
    """Custom OpenAPI generator: removes default 422 Validation Error documentation from Swagger UI."""
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    # Strip 422 response schemas so only 200 Successful Response appears in docs
    for path_data in schema.get("paths", {}).values():
        for operation in path_data.values():
            if isinstance(operation, dict) and "responses" in operation:
                operation["responses"].pop("422", None)
    
    # Clean up validation error schemas from components
    if "components" in schema and "schemas" in schema["components"]:
        schema["components"]["schemas"].pop("ValidationError", None)
        schema["components"]["schemas"].pop("HTTPValidationError", None)

    app.openapi_schema = schema
    return app.openapi_schema

app.openapi = custom_openapi

# Enable CORS for frontend Vite dev server & production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", response_class=HTMLResponse)
async def root_index():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>AegisOps Engine | API Online</title>
        <style>
            body { background: #030712; color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: rgba(11, 19, 43, 0.8); border: 1px solid rgba(0, 240, 255, 0.3); border-radius: 16px; padding: 32px; max-width: 500px; text-align: center; box-shadow: 0 0 30px rgba(0, 240, 255, 0.15); }
            h1 { color: #00F0FF; margin-top: 0; }
            .btn { display: inline-block; background: linear-gradient(135deg, #00F0FF, #3B82F6); color: #030712; text-decoration: none; font-weight: bold; padding: 10px 20px; border-radius: 8px; margin: 8px; }
            .btn-outline { background: transparent; border: 1px solid #38bdf8; color: #38bdf8; }
            .badge { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-family: monospace; }
        </style>
    </head>
    <body>
        <div class="card">
            <span class="badge">● ENGINE ONLINE</span>
            <h1>🛡️ AegisOps Multi-Agent API</h1>
            <p style="color: #94a3b8; font-size: 14px;">Autonomous incident triage, log investigation, RCA hypothesis, and human-in-the-loop remediation.</p>
            <div style="margin-top: 24px;">
                <a href="http://localhost:3000" class="btn">Launch War Room UI</a>
                <a href="/docs" class="btn btn-outline">Interactive Swagger API Docs</a>
            </div>
        </div>
    </body>
    </html>
    """

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "AegisOps Multi-Agent Engine",
        "active_incident": crew_manager.current_incident.id if crew_manager.current_incident else None
    }

@app.get("/api/scenarios")
async def list_scenarios():
    return [
        {
            "id": sc_id,
            "title": data.get("title", sc_id),
            "severity": data.get("severity", "P1 - CRITICAL"),
            "blast_radius": data.get("blast_radius", "Microservice cluster"),
            "service": data.get("service", "target-service")
        }
        for sc_id, data in SCENARIOS.items()
        if not sc_id.startswith("custom_")
    ]

@app.post("/api/incident/trigger", response_model=Incident)
async def trigger_incident(req: ScenarioTriggerRequest):
    if req.scenario_id not in SCENARIOS:
        valid_ids = [k for k in SCENARIOS.keys() if not k.startswith("custom_")]
        raise HTTPException(
            status_code=404,
            detail=f"Scenario '{req.scenario_id}' not found. Valid scenarios: {valid_ids}"
        )
    incident = await crew_manager.trigger_scenario(req.scenario_id)
    return incident

@app.post("/api/incident/custom", response_model=Incident)
async def trigger_custom_incident(req: CustomLogIncidentRequest):
    logs = (req.raw_logs or "").strip()
    if not logs:
        logs = "2026-10-31T03:30:00Z [custom-service] [ERROR] Unhandled connection timeout in worker thread pool"
    
    # Auto-detect service & title if default placeholders or empty
    service_param = None if req.service in [None, "", "custom-service", "payment-processor", "target-service", "billing-worker"] else req.service
    title_param = None if req.title in [None, "", "Custom Production Log Outage", "Critical NullPointer in BillingService"] else req.title
    
    incident = await crew_manager.trigger_custom_incident(
        service=service_param or "",
        title=title_param or "",
        raw_logs=logs
    )
    return incident

@app.get("/api/incident/current", response_model=Incident)
async def get_current_incident():
    if not crew_manager.current_incident:
        # Auto-initialize default scenario so UI is never blank
        await crew_manager.trigger_scenario("db_pool_exhaustion")
    return crew_manager.current_incident

@app.post("/api/incident/action", response_model=Incident)
async def perform_action(req: RemediationActionRequest):
    try:
        action = req.action if req.action in ["APPROVE", "REJECT", "CUSTOM_COMMAND"] else "APPROVE"
        updated = await crew_manager.handle_human_action(action, req.custom_command)
        return updated
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.websocket("/ws/warroom")
async def warroom_websocket(websocket: WebSocket):
    await crew_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Support incoming ping or commands
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        crew_manager.disconnect(websocket)
    except Exception:
        crew_manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

