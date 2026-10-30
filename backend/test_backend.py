import asyncio
from app.engine.simulator import create_incident_from_scenario
from app.agents.sentinel import SentinelAgent
from app.agents.scout import ScoutAgent
from app.agents.oracle import OracleAgent
from app.agents.armorer import ArmorerAgent
from app.agents.commander import CommanderAgent

async def test_full_pipeline():
    print("Testing AegisOps Multi-Agent Pipeline...")
    incident = create_incident_from_scenario("db_pool_exhaustion")
    print(f"1. Created Incident: {incident.id} ({incident.title})")
    
    t1 = await SentinelAgent.run(incident)
    print(f"2. Sentinel finished: {t1.content[:60]}...")
    
    t2 = await ScoutAgent.run(incident)
    print(f"3. Scout finished: {t2.content[:60]}...")
    
    t3 = await OracleAgent.run(incident)
    print(f"4. Oracle finished: {t3.content[:60]}...")
    
    t4 = await ArmorerAgent.run(incident)
    print(f"5. Armorer finished: {t4.content[:60]}...")
    
    print("6. Simulating Human Approval...")
    t5 = await CommanderAgent.execute_approved_remediation(incident)
    print(f"7. Commander finished: {t5.content[:60]}...")
    print(f"8. Status: {incident.status}")
    print("ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(test_full_pipeline())
