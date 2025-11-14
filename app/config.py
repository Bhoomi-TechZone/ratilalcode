import os
from typing import List, Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):  # Change to inherit from BaseSettings
    # Application settings
    APP_NAME: str = "Ratilal & Sons"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    
    # Secret key and JWT settings
    SECRET_KEY: str = os.getenv("SECRET_KEY","your_secret_key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # Database settings
    MONGO_URI: str = "mongodb+srv://errahulverma:NBscZYSOYG1P07qZ@vmax-cluster09.tqrpt4d.mongodb.net/"
    DATABASE_NAME: str = "crm_test"
    
    # Background task settings
    BACKGROUND_TASK_INTERVAL_MINUTES: int = 15
    class Config:
        env_file = ".env"
        env_prefix = "CRM_"
        case_sensitive = False

# Create settings instance
settings = Settings()

# Function to get settings for dependency injection
def get_settings() -> Settings:
    return settings