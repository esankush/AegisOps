import sys
import os

# Auto-inject backend directory into sys.path to ensure absolute & relative imports work anywhere
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from app.config import settings
from app.models.schemas import ScenarioTriggerRequest, CustomLogIncidentRequest, RemediationActionRequest
from app.engine.simulator import SCENARIOS
from app.engine.crew_manager import crew_manager

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="AegisOps: Autonomous Multi-Agent Incident Response & Triage Crew"
)

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
            "title": data["title"],
            "severity": data["severity"],
            "blast_radius": data["blast_radius"],
            "service": data["service"]
        }
        for sc_id, data in SCENARIOS.items()
    ]

@app.post("/api/incident/trigger")
async def trigger_incident(req: ScenarioTriggerRequest):
    if req.scenario_id not in SCENARIOS:
        raise HTTPException(status_code=404, detail="Scenario not found")
    incident = await crew_manager.trigger_scenario(req.scenario_id)
    return incident

@app.post("/api/incident/custom")
async def trigger_custom_incident(req: CustomLogIncidentRequest):
    if not req.raw_logs or not req.raw_logs.strip():
        raise HTTPException(status_code=400, detail="raw_logs cannot be empty")
    incident = await crew_manager.trigger_custom_incident(
        service=req.service,
        title=req.title,
        raw_logs=req.raw_logs
    )
    return incident

@app.get("/api/incident/current")
async def get_current_incident():
    if not crew_manager.current_incident:
        # Auto-initialize default scenario so UI is never blank
        await crew_manager.trigger_scenario("db_pool_exhaustion")
    return crew_manager.current_incident

@app.post("/api/incident/action")
async def perform_action(req: RemediationActionRequest):
    try:
        updated = await crew_manager.handle_human_action(req.action, req.custom_command)
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

