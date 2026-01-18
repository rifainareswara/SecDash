"""
API Routes for AI Security Service
"""
import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from datetime import datetime

from app.api.schemas import (
    ActivityInput, BatchAnalyzeRequest, TrainRequest, ProfileRequest,
    AnalysisResult, AnomalyScore, DeviationResult, DeviationDetail,
    TrainingResult, UserProfile, ProfileSummary, AnomalyEvent,
    ProfilesListResponse, AnomaliesListResponse, ModelStatus,
    RiskLevel, EventType
)
from app.utils.data_loader import DataLoader
from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory storage for detected anomalies (in production, use a database)
detected_anomalies: List[AnomalyEvent] = []


def get_models():
    """Get model instances from main app"""
    from app.main import get_anomaly_detector, get_behavior_profiler
    return get_anomaly_detector(), get_behavior_profiler()


# =====================
# Analysis Endpoints
# =====================

@router.post("/analyze", response_model=AnalysisResult)
async def analyze_activity(activity: ActivityInput):
    """
    Analyze a single activity for anomalies and behavior deviations
    
    This endpoint performs:
    1. Anomaly detection using Isolation Forest
    2. Behavior deviation analysis against user profile
    3. Combined risk scoring
    """
    try:
        anomaly_detector, behavior_profiler = get_models()
        
        # Convert to dict for processing
        activity_dict = activity.dict()
        activity_dict['timestamp'] = activity_dict.get('timestamp') or datetime.now().isoformat()
        
        # Anomaly detection
        try:
            anomaly_result = anomaly_detector.score(activity_dict)
            anomaly_score = AnomalyScore(
                score=anomaly_result['score'],
                raw_score=anomaly_result.get('raw_score'),
                is_anomaly=anomaly_result['is_anomaly'],
                features=anomaly_result.get('features'),
                threshold=anomaly_result.get('threshold')
            )
        except RuntimeError:
            # Model not trained yet
            anomaly_score = AnomalyScore(score=0, is_anomaly=False)
        
        # Behavior deviation
        deviation_result = None
        try:
            deviation_dict = behavior_profiler.calculate_deviation(
                activity.client_id,
                activity_dict
            )
            if 'error' not in deviation_dict:
                deviation_result = DeviationResult(
                    client_id=deviation_dict['client_id'],
                    risk_score=deviation_dict['risk_score'],
                    risk_level=RiskLevel(deviation_dict['risk_level']),
                    deviations=[
                        DeviationDetail(
                            type=d['type'],
                            detail=d['detail'],
                            severity=RiskLevel(d['severity']),
                            z_score=d.get('z_score')
                        ) for d in deviation_dict.get('deviations', [])
                    ],
                    baseline_data_points=deviation_dict.get('baseline_data_points'),
                    evaluated_at=deviation_dict['evaluated_at']
                )
        except Exception as e:
            logger.warning(f"Deviation analysis error: {e}")
        
        # Calculate overall risk
        anomaly_weight = 0.6
        deviation_weight = 0.4
        
        overall_risk = anomaly_score.score * anomaly_weight
        if deviation_result:
            overall_risk += deviation_result.risk_score * deviation_weight
        else:
            overall_risk = anomaly_score.score  # Use only anomaly if no profile
        
        # Determine risk level
        if overall_risk >= 70:
            risk_level = RiskLevel.CRITICAL
        elif overall_risk >= 50:
            risk_level = RiskLevel.HIGH
        elif overall_risk >= 30:
            risk_level = RiskLevel.MEDIUM
        else:
            risk_level = RiskLevel.LOW
        
        # Store high-risk events
        if overall_risk >= 50 or anomaly_score.is_anomaly:
            event = AnomalyEvent(
                id=f"evt_{datetime.now().strftime('%Y%m%d%H%M%S')}_{activity.client_id[:8]}",
                client_id=activity.client_id,
                event_type=EventType.BEHAVIOR_DEVIATION if deviation_result else EventType.TRAFFIC_SPIKE,
                severity=risk_level,
                risk_score=overall_risk,
                details={
                    'anomaly_score': anomaly_score.score,
                    'deviation_score': deviation_result.risk_score if deviation_result else None,
                    'domain': activity.domain,
                    'deviations': [d.dict() for d in deviation_result.deviations] if deviation_result else []
                },
                detected_at=datetime.now().isoformat(),
                acknowledged=False
            )
            detected_anomalies.insert(0, event)
            # Keep only last 1000 events
            if len(detected_anomalies) > 1000:
                detected_anomalies.pop()
        
        return AnalysisResult(
            activity_id=activity.id,
            client_id=activity.client_id,
            timestamp=activity_dict['timestamp'],
            anomaly=anomaly_score,
            deviation=deviation_result,
            overall_risk_score=round(overall_risk, 2),
            overall_risk_level=risk_level
        )
        
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/batch")
async def analyze_batch(request: BatchAnalyzeRequest):
    """
    Analyze multiple activities in batch
    
    More efficient than individual calls for bulk processing.
    """
    try:
        anomaly_detector, _ = get_models()
        
        activities_dict = [a.dict() for a in request.activities]
        for a in activities_dict:
            a['timestamp'] = a.get('timestamp') or datetime.now().isoformat()
        
        try:
            results = anomaly_detector.batch_score(activities_dict)
            return {
                'success': True,
                'results': results,
                'total': len(results)
            }
        except RuntimeError:
            return {
                'success': False,
                'error': 'Model not trained',
                'results': [],
                'total': 0
            }
            
    except Exception as e:
        logger.error(f"Batch analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================
# Training Endpoints
# =====================

@router.post("/train", response_model=TrainingResult)
async def train_models(request: TrainRequest):
    """
    Train/retrain the anomaly detection model
    
    This endpoint loads activity data and trains the Isolation Forest model.
    Training typically takes a few seconds depending on data size.
    """
    try:
        anomaly_detector, _ = get_models()
        settings = get_settings()
        
        # Check if already trained
        if anomaly_detector.is_trained and not request.force:
            return TrainingResult(
                success=True,
                trained_at=anomaly_detector.training_metadata.get('trained_at', 'unknown'),
                n_samples=anomaly_detector.training_metadata.get('n_samples', 0),
                n_features=anomaly_detector.training_metadata.get('n_features', 0),
                contamination=anomaly_detector.contamination,
                n_anomalies_detected=anomaly_detector.training_metadata.get('n_anomalies_detected', 0),
                message="Model already trained. Use force=true to retrain."
            )
        
        # Load training data
        loader = DataLoader(settings.data_path)
        activities = loader.load_activity_logs(days=request.data_days)
        
        if len(activities) < 100:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient data for training. Need at least 100 records, got {len(activities)}."
            )
        
        # Train model
        metadata = anomaly_detector.train(activities)
        
        return TrainingResult(
            success=True,
            trained_at=metadata['trained_at'],
            n_samples=metadata['n_samples'],
            n_features=metadata['n_features'],
            contamination=metadata['contamination'],
            n_anomalies_detected=metadata['n_anomalies_detected'],
            message="Model trained successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Training error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/profile/build")
async def build_profile(request: ProfileRequest):
    """
    Build or update behavior profile for a user
    """
    try:
        _, behavior_profiler = get_models()
        settings = get_settings()
        
        # Load user data
        loader = DataLoader(settings.data_path)
        activities = loader.load_activity_logs(
            days=request.data_days,
            client_id=request.client_id
        )
        
        if len(activities) < 10:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient data. Need at least 10 records for {request.client_id}, got {len(activities)}."
            )
        
        # Build profile
        profile = behavior_profiler.build_profile(request.client_id, activities)
        
        # Save profiles
        behavior_profiler.save()
        
        return {
            'success': True,
            'profile': profile
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile build error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/profile/build-all")
async def build_all_profiles(data_days: int = Query(default=30, ge=7, le=90)):
    """
    Build profiles for all users with sufficient data
    """
    try:
        _, behavior_profiler = get_models()
        settings = get_settings()
        
        loader = DataLoader(settings.data_path)
        activities = loader.load_activity_logs(days=data_days)
        
        # Group by client
        from collections import defaultdict
        client_activities = defaultdict(list)
        for a in activities:
            client_activities[a.get('client_id', 'unknown')].append(a)
        
        # Build profiles for clients with enough data
        built = []
        skipped = []
        
        for client_id, client_data in client_activities.items():
            if len(client_data) >= 10:
                behavior_profiler.build_profile(client_id, client_data)
                built.append(client_id)
            else:
                skipped.append({'client_id': client_id, 'count': len(client_data)})
        
        # Save profiles
        behavior_profiler.save()
        
        return {
            'success': True,
            'built': len(built),
            'skipped': len(skipped),
            'clients_built': built,
            'clients_skipped': skipped
        }
        
    except Exception as e:
        logger.error(f"Build all profiles error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================
# Profile Endpoints
# =====================

@router.get("/profile/{client_id}")
async def get_profile(client_id: str):
    """
    Get behavior profile for a specific user
    """
    try:
        _, behavior_profiler = get_models()
        
        profile = behavior_profiler.get_profile(client_id)
        if not profile:
            raise HTTPException(status_code=404, detail=f"Profile not found for {client_id}")
        
        return {
            'success': True,
            'profile': profile
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get profile error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/profiles", response_model=ProfilesListResponse)
async def list_profiles():
    """
    List all user behavior profiles
    """
    try:
        _, behavior_profiler = get_models()
        
        summaries = behavior_profiler.get_all_profiles_summary()
        profiles = [
            ProfileSummary(
                client_id=s['client_id'],
                data_points=s['data_points'],
                created_at=s.get('created_at'),
                risk_level=RiskLevel(s.get('risk_level', 'low')),
                unique_domains=s.get('unique_domains', 0)
            )
            for s in summaries
        ]
        
        return ProfilesListResponse(
            profiles=profiles,
            total=len(profiles)
        )
        
    except Exception as e:
        logger.error(f"List profiles error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================
# Anomaly Events Endpoints
# =====================

@router.get("/anomalies", response_model=AnomaliesListResponse)
async def list_anomalies(
    client_id: Optional[str] = None,
    severity: Optional[RiskLevel] = None,
    acknowledged: Optional[bool] = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=100)
):
    """
    List detected anomaly events with filtering
    """
    filtered = detected_anomalies.copy()
    
    if client_id:
        filtered = [a for a in filtered if a.client_id == client_id]
    if severity:
        filtered = [a for a in filtered if a.severity == severity]
    if acknowledged is not None:
        filtered = [a for a in filtered if a.acknowledged == acknowledged]
    
    # Pagination
    start = (page - 1) * per_page
    end = start + per_page
    paginated = filtered[start:end]
    
    return AnomaliesListResponse(
        anomalies=paginated,
        total=len(filtered),
        page=page,
        per_page=per_page
    )


@router.post("/anomalies/{event_id}/acknowledge")
async def acknowledge_anomaly(event_id: str, acknowledged_by: str = "admin"):
    """
    Acknowledge an anomaly event
    """
    for event in detected_anomalies:
        if event.id == event_id:
            event.acknowledged = True
            event.acknowledged_by = acknowledged_by
            return {'success': True, 'event': event}
    
    raise HTTPException(status_code=404, detail=f"Event not found: {event_id}")


@router.get("/anomalies/stats")
async def anomaly_stats():
    """
    Get anomaly statistics
    """
    total = len(detected_anomalies)
    unacknowledged = sum(1 for a in detected_anomalies if not a.acknowledged)
    
    by_severity = {}
    for level in RiskLevel:
        by_severity[level.value] = sum(1 for a in detected_anomalies if a.severity == level)
    
    by_type = {}
    for event_type in EventType:
        by_type[event_type.value] = sum(1 for a in detected_anomalies if a.event_type == event_type)
    
    return {
        'total': total,
        'unacknowledged': unacknowledged,
        'by_severity': by_severity,
        'by_type': by_type
    }


# =====================
# Model Status Endpoints
# =====================

@router.get("/status", response_model=ModelStatus)
async def model_status():
    """
    Get status of ML models
    """
    try:
        anomaly_detector, behavior_profiler = get_models()
        
        return ModelStatus(
            anomaly_detector={
                'is_trained': anomaly_detector.is_trained,
                'metadata': anomaly_detector.training_metadata if anomaly_detector.is_trained else None
            },
            behavior_profiler={
                'has_profiles': behavior_profiler.has_profiles,
                'profile_count': len(behavior_profiler.profiles)
            }
        )
    except Exception as e:
        return ModelStatus(
            anomaly_detector={'is_trained': False, 'error': str(e)},
            behavior_profiler={'has_profiles': False, 'error': str(e)}
        )


@router.get("/feature-importance")
async def feature_importance():
    """
    Get feature importance from anomaly detector
    """
    try:
        anomaly_detector, _ = get_models()
        
        if not anomaly_detector.is_trained:
            raise HTTPException(status_code=400, detail="Model not trained yet")
        
        importance = anomaly_detector.get_feature_importance()
        
        return {
            'success': True,
            'features': importance,
            'sorted': sorted(importance.items(), key=lambda x: x[1], reverse=True)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Feature importance error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
