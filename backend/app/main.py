from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.models.schemas import ScenarioTriggerRequest, RemediationActionRequest
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
