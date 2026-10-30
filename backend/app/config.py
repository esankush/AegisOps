import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    PROJECT_NAME: str = "AegisOps Engine"
    API_V1_PREFIX: str = "/api"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    SIMULATED_AI_MODE: bool = os.getenv("SIMULATED_AI_MODE", "true").lower() == "true"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

settings = Settings()
