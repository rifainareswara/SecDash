"""
Anomaly Detection Model using Isolation Forest

This module implements anomaly detection for VPN activity patterns using
the Isolation Forest algorithm, which is effective for high-dimensional
data and identifying outliers based on path length in random decision trees.

Academic Reference:
- Liu, F. T., Ting, K. M., & Zhou, Z. H. (2008). Isolation forest.
  In 2008 eighth ieee international conference on data mining (pp. 413-422).
"""
import os
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib

logger = logging.getLogger(__name__)


class AnomalyDetector:
    """
    Anomaly Detection using Isolation Forest Algorithm
    
    The Isolation Forest works by randomly selecting a feature and then
    randomly selecting a split value between the maximum and minimum values
    of the selected feature. Anomalies are isolated faster (shorter paths)
    because they are few and different.
    
    Anomaly Score Formula:
        s(x, n) = 2^(-E(h(x)) / c(n))
    
    Where:
        - h(x) = path length for sample x
        - E(h(x)) = average path length across all trees
        - c(n) = average path length of unsuccessful search in BST
    """
    
    # Feature names used for training
    FEATURE_NAMES = [
        'hour_of_day',           # Access hour (0-23)
        'day_of_week',           # Day (0-6)
        'bytes_sent_log',        # Log of bytes sent
        'bytes_received_log',    # Log of bytes received
        'unique_domains',        # Unique domains in session
        'domain_entropy',        # Shannon entropy of domain characters
        'session_duration',      # Duration in minutes
        'requests_per_minute',   # Activity rate
        'new_domain_ratio',      # New domains / total domains
        'category_diversity',    # Number of unique categories
    ]
    
    def __init__(
        self,
        model_path: str = "/models",
        contamination: float = 0.05,
        n_estimators: int = 100,
        random_state: int = 42
    ):
        """
        Initialize the Anomaly Detector
        
        Args:
            model_path: Directory to save/load model
            contamination: Expected proportion of outliers (0.0 to 0.5)
            n_estimators: Number of trees in the forest
            random_state: Random seed for reproducibility
        """
        self.model_path = model_path
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.random_state = random_state
        
        self.model: Optional[IsolationForest] = None
        self.scaler: Optional[StandardScaler] = None
        self.is_trained: bool = False
        
        # Store training metadata
        self.training_metadata: Dict[str, Any] = {}
    
    def _ensure_model_dir(self):
        """Ensure model directory exists"""
        os.makedirs(self.model_path, exist_ok=True)
    
    def train(self, activities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Train the Isolation Forest model on activity data
        
        Args:
            activities: List of activity records from the VPN logs
            
        Returns:
            Training statistics and metadata
        """
        if len(activities) < 100:
            raise ValueError("Insufficient data for training. Need at least 100 records.")
        
        logger.info(f"Training anomaly detector on {len(activities)} records...")
        
        # Extract features
        features_df = self._extract_features(activities)
        
        # Initialize and fit scaler
        self.scaler = StandardScaler()
        features_scaled = self.scaler.fit_transform(features_df)
        
        # Initialize and train Isolation Forest
        self.model = IsolationForest(
            contamination=self.contamination,
            n_estimators=self.n_estimators,
            random_state=self.random_state,
            n_jobs=-1  # Use all CPU cores
        )
        self.model.fit(features_scaled)
        
        # Calculate training statistics
        scores = -self.model.score_samples(features_scaled)
        predictions = self.model.predict(features_scaled)
        
        self.training_metadata = {
            'trained_at': datetime.now().isoformat(),
            'n_samples': len(activities),
            'n_features': len(self.FEATURE_NAMES),
            'contamination': self.contamination,
            'n_anomalies_detected': int((predictions == -1).sum()),
            'score_mean': float(scores.mean()),
            'score_std': float(scores.std()),
            'score_min': float(scores.min()),
            'score_max': float(scores.max())
        }
        
        self.is_trained = True
        logger.info(f"Training complete. Detected {self.training_metadata['n_anomalies_detected']} anomalies in training data.")
        
        # Save model
        self.save()
        
        return self.training_metadata
    
    def _extract_features(self, activities: List[Dict[str, Any]]) -> pd.DataFrame:
        """
        Extract numerical features from activity records
        
        This is the feature engineering pipeline that converts raw
        activity logs into ML-ready features.
        """
        features = []
        
        for activity in activities:
            try:
                timestamp = datetime.fromisoformat(
                    activity.get('timestamp', datetime.now().isoformat()).replace('Z', '+00:00')
                )
                
                # Time-based features
                hour_of_day = timestamp.hour
                day_of_week = timestamp.weekday()
                
                # Traffic features (with log transform for scale)
                bytes_sent = activity.get('bytes_sent', 0) or 0
                bytes_received = activity.get('bytes_received', 0) or 0
                bytes_sent_log = np.log1p(bytes_sent)
                bytes_received_log = np.log1p(bytes_received)
                
                # Domain features
                domain = activity.get('domain', '')
                unique_domains = activity.get('unique_domains', 1)
                domain_entropy = self._calculate_entropy(domain)
                
                # Session features
                session_duration = activity.get('duration', 0) or 0
                requests_per_minute = activity.get('requests_count', 1) / max(session_duration / 60, 1)
                
                # Behavioral features
                new_domain_ratio = activity.get('new_domain_ratio', 0)
                category_diversity = activity.get('category_count', 1)
                
                features.append({
                    'hour_of_day': hour_of_day,
                    'day_of_week': day_of_week,
                    'bytes_sent_log': bytes_sent_log,
                    'bytes_received_log': bytes_received_log,
                    'unique_domains': unique_domains,
                    'domain_entropy': domain_entropy,
                    'session_duration': session_duration,
                    'requests_per_minute': requests_per_minute,
                    'new_domain_ratio': new_domain_ratio,
                    'category_diversity': category_diversity
                })
            except Exception as e:
                logger.warning(f"Error extracting features: {e}")
                continue
        
        return pd.DataFrame(features, columns=self.FEATURE_NAMES)
    
    def _calculate_entropy(self, text: str) -> float:
        """
        Calculate Shannon entropy of a string
        
        Higher entropy indicates more randomness, which can be an indicator
        of Domain Generation Algorithm (DGA) used by malware.
        """
        if not text:
            return 0.0
        
        # Count character frequencies
        freq = {}
        for char in text.lower():
            freq[char] = freq.get(char, 0) + 1
        
        # Calculate entropy
        length = len(text)
        entropy = 0.0
        for count in freq.values():
            if count > 0:
                p = count / length
                entropy -= p * np.log2(p)
        
        return entropy
    
    def score(self, activity: Dict[str, Any]) -> Dict[str, Any]:
        """
        Score a single activity for anomaly
        
        Args:
            activity: Single activity record
            
        Returns:
            Anomaly score and details
        """
        if not self.is_trained or self.model is None or self.scaler is None:
            raise RuntimeError("Model not trained. Call train() first.")
        
        # Extract features
        features_df = self._extract_features([activity])
        if features_df.empty:
            return {
                'score': 0,
                'is_anomaly': False,
                'error': 'Could not extract features'
            }
        
        # Scale features
        features_scaled = self.scaler.transform(features_df)
        
        # Get raw anomaly score (negative, lower = more anomalous)
        raw_score = -self.model.score_samples(features_scaled)[0]
        
        # Normalize to 0-100 scale (higher = more anomalous)
        # Typical range is around -0.5 to 0.5, we map to 0-100
        normalized_score = min(100, max(0, (raw_score + 0.5) * 100))
        
        # Get prediction (-1 = anomaly, 1 = normal)
        prediction = self.model.predict(features_scaled)[0]
        
        return {
            'score': round(normalized_score, 2),
            'raw_score': round(raw_score, 4),
            'is_anomaly': prediction == -1,
            'features': features_df.iloc[0].to_dict(),
            'threshold': self.contamination
        }
    
    def batch_score(self, activities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Score multiple activities efficiently"""
        if not activities:
            return []
        
        if not self.is_trained or self.model is None or self.scaler is None:
            raise RuntimeError("Model not trained. Call train() first.")
        
        # Extract features for all activities
        features_df = self._extract_features(activities)
        if features_df.empty:
            return []
        
        # Scale and score
        features_scaled = self.scaler.transform(features_df)
        raw_scores = -self.model.score_samples(features_scaled)
        predictions = self.model.predict(features_scaled)
        
        results = []
        for i, (activity, raw_score, prediction) in enumerate(zip(activities, raw_scores, predictions)):
            normalized_score = min(100, max(0, (raw_score + 0.5) * 100))
            results.append({
                'activity_id': activity.get('id', str(i)),
                'client_id': activity.get('client_id', 'unknown'),
                'score': round(normalized_score, 2),
                'is_anomaly': prediction == -1,
                'timestamp': activity.get('timestamp')
            })
        
        return results
    
    def save(self):
        """Save model and scaler to disk"""
        self._ensure_model_dir()
        
        if self.model is not None:
            joblib.dump(self.model, os.path.join(self.model_path, 'anomaly_model.joblib'))
        
        if self.scaler is not None:
            joblib.dump(self.scaler, os.path.join(self.model_path, 'anomaly_scaler.joblib'))
        
        # Save metadata
        if self.training_metadata:
            import json
            with open(os.path.join(self.model_path, 'anomaly_metadata.json'), 'w') as f:
                json.dump(self.training_metadata, f, indent=2)
        
        logger.info("Anomaly detection model saved successfully")
    
    def load(self):
        """Load model and scaler from disk"""
        model_file = os.path.join(self.model_path, 'anomaly_model.joblib')
        scaler_file = os.path.join(self.model_path, 'anomaly_scaler.joblib')
        metadata_file = os.path.join(self.model_path, 'anomaly_metadata.json')
        
        if not os.path.exists(model_file):
            raise FileNotFoundError(f"Model file not found: {model_file}")
        
        self.model = joblib.load(model_file)
        
        if os.path.exists(scaler_file):
            self.scaler = joblib.load(scaler_file)
        
        if os.path.exists(metadata_file):
            import json
            with open(metadata_file, 'r') as f:
                self.training_metadata = json.load(f)
        
        self.is_trained = True
        logger.info("Anomaly detection model loaded successfully")
    
    def get_feature_importance(self) -> Dict[str, float]:
        """
        Estimate feature importance based on split frequency
        
        Note: Isolation Forest doesn't have direct feature importance,
        but we can estimate it from the trees.
        """
        if not self.is_trained or self.model is None:
            return {}
        
        # Aggregate feature usage across all trees
        importances = np.zeros(len(self.FEATURE_NAMES))
        
        for tree in self.model.estimators_:
            feature_indices = tree.tree_.feature
            # Count non-leaf nodes (feature != -2)
            for idx in feature_indices[feature_indices >= 0]:
                importances[idx] += 1
        
        # Normalize
        total = importances.sum()
        if total > 0:
            importances = importances / total
        
        return dict(zip(self.FEATURE_NAMES, importances.tolist()))
