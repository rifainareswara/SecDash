"""
AI Security Service Configuration
"""
import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Paths
    data_path: str = os.getenv("DATA_PATH", "/data")
    model_path: str = os.getenv("MODEL_PATH", "/models")
    
    # Anomaly Detection settings
    contamination: float = 0.05  # Expected proportion of anomalies
    n_estimators: int = 100  # Number of trees in Isolation Forest
    
    # Behavior Profiling settings
    profile_window_days: int = 30  # Days of data for profiling
    deviation_threshold: float = 2.0  # Standard deviations for flagging
    
    # Risk scoring thresholds
    risk_low_max: float = 30.0
    risk_medium_max: float = 60.0
    risk_high_max: float = 80.0
    
    # API settings
    api_prefix: str = "/api"
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Main dashboard URL (for callbacks)
    dashboard_url: str = os.getenv("DASHBOARD_URL", "http://localhost:3000")
    
    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
