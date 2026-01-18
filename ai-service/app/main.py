"""
AI Security Service for SecDash VPN
Main FastAPI application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import get_settings
from app.api.routes import router as api_router
from app.models.anomaly_detector import AnomalyDetector
from app.models.behavior_profiler import BehaviorProfiler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Global model instances
anomaly_detector: AnomalyDetector | None = None
behavior_profiler: BehaviorProfiler | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler - load models on startup"""
    global anomaly_detector, behavior_profiler
    
    settings = get_settings()
    logger.info("Starting AI Security Service...")
    
    # Initialize models
    anomaly_detector = AnomalyDetector(
        model_path=settings.model_path,
        contamination=settings.contamination
    )
    behavior_profiler = BehaviorProfiler(
        model_path=settings.model_path,
        window_days=settings.profile_window_days
    )
    
    # Try to load existing models
    try:
        anomaly_detector.load()
        logger.info("Loaded existing anomaly detection model")
    except FileNotFoundError:
        logger.info("No existing anomaly model found, will train on first data")
    
    try:
        behavior_profiler.load()
        logger.info("Loaded existing behavior profiles")
    except FileNotFoundError:
        logger.info("No existing profiles found, will build on first data")
    
    yield
    
    # Cleanup on shutdown
    logger.info("Shutting down AI Security Service...")


# Create FastAPI app
app = FastAPI(
    title="SecDash AI Security Service",
    description="AI-powered anomaly detection and user behavior analytics for VPN security",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for dashboard integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to dashboard URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ai-security",
        "models": {
            "anomaly_detector": anomaly_detector is not None and anomaly_detector.is_trained,
            "behavior_profiler": behavior_profiler is not None and behavior_profiler.has_profiles
        }
    }


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "SecDash AI Security Service",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


# Include API routes
app.include_router(api_router, prefix="/api")


def get_anomaly_detector() -> AnomalyDetector:
    """Get the global anomaly detector instance"""
    if anomaly_detector is None:
        raise RuntimeError("Anomaly detector not initialized")
    return anomaly_detector


def get_behavior_profiler() -> BehaviorProfiler:
    """Get the global behavior profiler instance"""
    if behavior_profiler is None:
        raise RuntimeError("Behavior profiler not initialized")
    return behavior_profiler
