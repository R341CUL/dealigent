from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    groq_api_key:      str = ""
    gemini_api_key:    str = ""
    cerebras_api_key:  str = ""
    apify_api_key:     str = ""
    database_url:      str = "sqlite+aiosqlite:///./dealigent.db"
    chroma_persist_dir:str = "./chroma_db"
    cors_origins:      str = "http://localhost:5173"

    class Config:
        env_file = ".env"

settings = Settings()
