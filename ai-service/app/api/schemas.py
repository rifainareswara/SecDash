"""
API Schemas using Pydantic
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class EventType(str, Enum):
    TRAFFIC_SPIKE = "traffic_spike"
    UNUSUAL_TIME = "unusual_time"
    NEW_DOMAIN_BURST = "new_domain_burst"
    PORT_SCAN = "port_scan"
    BEHAVIOR_DEVIATION = "behavior_deviation"


# =====================
# Request Schemas
# =====================

class ActivityInput(BaseModel):
    """Input schema for activity analysis"""
    id: Optional[str] = None
    client_id: str
    timestamp: Optional[str] = None
    url: Optional[str] = None
    domain: Optional[str] = None
    category: Optional[str] = None
    duration: Optional[float] = None
    bytes_sent: Optional[int] = None
    bytes_received: Optional[int] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    device_type: Optional[str] = None


class BatchAnalyzeRequest(BaseModel):
    """Request for batch activity analysis"""
    activities: List[ActivityInput]


class TrainRequest(BaseModel):
    """Request to trigger model training"""
    force: bool = False  # Force retrain even if model exists
    data_days: int = Field(default=30, ge=7, le=90)  # Days of data to use


class ProfileRequest(BaseModel):
    """Request to build user profile"""
    client_id: str
    data_days: int = Field(default=30, ge=7, le=90)


# =====================
# Response Schemas
# =====================

class AnomalyScore(BaseModel):
    """Anomaly score result"""
    score: float = Field(ge=0, le=100)
    raw_score: Optional[float] = None
    is_anomaly: bool
    features: Optional[Dict[str, float]] = None
    threshold: Optional[float] = None


class DeviationDetail(BaseModel):
    """Detail of a single deviation"""
    type: str
    detail: str
    severity: RiskLevel
    z_score: Optional[float] = None


class DeviationResult(BaseModel):
    """Result of deviation analysis"""
    client_id: str
    risk_score: float = Field(ge=0, le=100)
    risk_level: RiskLevel
    deviations: List[DeviationDetail]
    baseline_data_points: Optional[int] = None
    evaluated_at: str


class AnalysisResult(BaseModel):
    """Combined analysis result"""
    activity_id: Optional[str] = None
    client_id: str
    timestamp: Optional[str] = None
    anomaly: AnomalyScore
    deviation: Optional[DeviationResult] = None
    overall_risk_score: float = Field(ge=0, le=100)
    overall_risk_level: RiskLevel


class TrainingResult(BaseModel):
    """Training result"""
    success: bool
    trained_at: str
    n_samples: int
    n_features: int
    contamination: float
    n_anomalies_detected: int
    message: Optional[str] = None


class UserProfile(BaseModel):
    """User behavior profile"""
    client_id: str
    created_at: str
    data_points: int
    window_days: int
    time_patterns: Dict[str, Any]
    domain_patterns: Dict[str, Any]
    category_patterns: Dict[str, Any]
    device_patterns: Dict[str, Any]
    session_patterns: Dict[str, float]
    traffic_patterns: Dict[str, Any]
    risk_level: RiskLevel


class ProfileSummary(BaseModel):
    """Summary of a user profile"""
    client_id: str
    data_points: int
    created_at: Optional[str] = None
    risk_level: RiskLevel
    unique_domains: int


class AnomalyEvent(BaseModel):
    """Detected anomaly event"""
    id: str
    client_id: str
    event_type: EventType
    severity: RiskLevel
    risk_score: float = Field(ge=0, le=100)
    details: Dict[str, Any]
    detected_at: str
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    models: Dict[str, bool]


class ModelStatus(BaseModel):
    """Status of ML models"""
    anomaly_detector: Dict[str, Any]
    behavior_profiler: Dict[str, Any]


# =====================
# List Responses
# =====================

class AnomaliesListResponse(BaseModel):
    """List of anomaly events"""
    anomalies: List[AnomalyEvent]
    total: int
    page: int = 1
    per_page: int = 50


class ProfilesListResponse(BaseModel):
    """List of user profiles"""
    profiles: List[ProfileSummary]
    total: int
