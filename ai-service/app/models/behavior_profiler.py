"""
User Behavior Analytics (UBA) - Behavior Profiler

This module builds user behavior profiles based on historical activity
and detects deviations from normal patterns.

Key Concepts:
- Baseline Profiling: Build statistical model of "normal" behavior
- Deviation Detection: Flag when current behavior differs significantly
- Risk Scoring: Quantify the risk level based on deviation magnitude

Academic Reference:
- Bose, S., Leung, M., & McDonald, S. (2017). User behavior analytics.
  IEEE Security & Privacy, 15(3), 68-73.
"""
import os
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from collections import defaultdict
import numpy as np

logger = logging.getLogger(__name__)


class BehaviorProfiler:
    """
    User Behavior Analytics through Statistical Profiling
    
    This class builds behavioral profiles for each user based on their
    VPN activity patterns and detects when current behavior deviates
    significantly from the established baseline.
    
    Deviation Score Formula:
        z_score = (current_value - baseline_mean) / baseline_std
        risk_score = sigmoid(|z_score| - threshold) * 100
    
    Profile Components:
        - Time patterns (active hours, days)
        - Domain patterns (top domains, categories)
        - Traffic patterns (average bandwidth usage)
        - Session patterns (duration, frequency)
    """
    
    def __init__(
        self,
        model_path: str = "/models",
        window_days: int = 30,
        deviation_threshold: float = 2.0  # Standard deviations
    ):
        """
        Initialize the Behavior Profiler
        
        Args:
            model_path: Directory to save/load profiles
            window_days: Days of history to consider for profiling
            deviation_threshold: Z-score threshold for flagging deviation
        """
        self.model_path = model_path
        self.window_days = window_days
        self.deviation_threshold = deviation_threshold
        
        # User profiles storage
        self.profiles: Dict[str, Dict[str, Any]] = {}
        self.has_profiles: bool = False
    
    def _ensure_model_dir(self):
        """Ensure model directory exists"""
        os.makedirs(self.model_path, exist_ok=True)
    
    def build_profile(self, client_id: str, activities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Build a behavior profile for a specific user
        
        Args:
            client_id: The VPN client identifier
            activities: List of activity records for this user
            
        Returns:
            The generated user profile
        """
        if len(activities) < 10:
            logger.warning(f"Insufficient data for profile: {len(activities)} records for {client_id}")
            return {
                'client_id': client_id,
                'error': 'Insufficient data',
                'min_required': 10,
                'actual': len(activities)
            }
        
        logger.info(f"Building profile for {client_id} with {len(activities)} records")
        
        # Initialize counters
        hour_counts = np.zeros(24)
        day_counts = np.zeros(7)
        domain_counts: Dict[str, int] = defaultdict(int)
        category_counts: Dict[str, int] = defaultdict(int)
        browsers: Dict[str, int] = defaultdict(int)
        session_durations: List[float] = []
        bytes_sent_list: List[float] = []
        bytes_received_list: List[float] = []
        
        for activity in activities:
            try:
                # Parse timestamp
                ts_str = activity.get('timestamp', '')
                if ts_str:
                    timestamp = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                    hour_counts[timestamp.hour] += 1
                    day_counts[timestamp.weekday()] += 1
                
                # Domain and category
                domain = activity.get('domain', '')
                if domain:
                    domain_counts[domain] += 1
                
                category = activity.get('category', 'other')
                category_counts[category] += 1
                
                # Browser
                browser = activity.get('browser', 'Unknown')
                browsers[browser] += 1
                
                # Session duration
                duration = activity.get('duration')
                if duration is not None:
                    session_durations.append(float(duration))
                
                # Traffic
                bytes_sent = activity.get('bytes_sent')
                if bytes_sent is not None:
                    bytes_sent_list.append(float(bytes_sent))
                
                bytes_received = activity.get('bytes_received')
                if bytes_received is not None:
                    bytes_received_list.append(float(bytes_received))
                    
            except Exception as e:
                logger.warning(f"Error processing activity: {e}")
                continue
        
        # Calculate statistics
        profile = {
            'client_id': client_id,
            'created_at': datetime.now().isoformat(),
            'data_points': len(activities),
            'window_days': self.window_days,
            
            # Time patterns
            'time_patterns': {
                'typical_hours': self._get_typical_hours(hour_counts),
                'hour_distribution': hour_counts.tolist(),
                'typical_days': self._get_typical_days(day_counts),
                'day_distribution': day_counts.tolist(),
            },
            
            # Domain patterns
            'domain_patterns': {
                'top_domains': self._get_top_items(domain_counts, 10),
                'unique_domains': len(domain_counts),
                'avg_domains_per_day': len(domain_counts) / max(self.window_days, 1),
            },
            
            # Category patterns
            'category_patterns': {
                'distribution': dict(category_counts),
                'top_categories': self._get_top_items(category_counts, 5),
            },
            
            # Device patterns
            'device_patterns': {
                'browsers': dict(browsers),
                'primary_browser': max(browsers, key=browsers.get) if browsers else 'Unknown',
            },
            
            # Session patterns
            'session_patterns': self._calculate_session_stats(session_durations),
            
            # Traffic patterns
            'traffic_patterns': {
                'bytes_sent': self._calculate_stats(bytes_sent_list),
                'bytes_received': self._calculate_stats(bytes_received_list),
            },
            
            # Risk assessment
            'risk_level': 'low',  # Will be updated based on deviations
        }
        
        # Store profile
        self.profiles[client_id] = profile
        self.has_profiles = True
        
        return profile
    
    def _get_typical_hours(self, hour_counts: np.ndarray) -> List[int]:
        """Get hours where user is typically active (above average)"""
        if hour_counts.sum() == 0:
            return []
        threshold = hour_counts.mean() + (hour_counts.std() * 0.5)
        return [i for i, count in enumerate(hour_counts) if count >= threshold]
    
    def _get_typical_days(self, day_counts: np.ndarray) -> List[int]:
        """Get days where user is typically active"""
        if day_counts.sum() == 0:
            return []
        threshold = day_counts.mean()
        return [i for i, count in enumerate(day_counts) if count >= threshold]
    
    def _get_top_items(self, counts: Dict[str, int], top_n: int) -> List[Dict[str, Any]]:
        """Get top N items by count"""
        sorted_items = sorted(counts.items(), key=lambda x: x[1], reverse=True)
        return [{'name': k, 'count': v} for k, v in sorted_items[:top_n]]
    
    def _calculate_stats(self, values: List[float]) -> Dict[str, float]:
        """Calculate basic statistics for a list of values"""
        if not values:
            return {'mean': 0, 'std': 0, 'min': 0, 'max': 0, 'count': 0}
        
        arr = np.array(values)
        return {
            'mean': float(np.mean(arr)),
            'std': float(np.std(arr)),
            'min': float(np.min(arr)),
            'max': float(np.max(arr)),
            'count': len(values)
        }
    
    def _calculate_session_stats(self, durations: List[float]) -> Dict[str, float]:
        """Calculate session statistics"""
        stats = self._calculate_stats(durations)
        stats['typical_duration'] = stats['mean']  # Alias for clarity
        return stats
    
    def calculate_deviation(
        self,
        client_id: str,
        current_activity: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate how much current activity deviates from the baseline profile
        
        Args:
            client_id: The VPN client identifier
            current_activity: Current activity record to evaluate
            
        Returns:
            Deviation analysis with risk score
        """
        if client_id not in self.profiles:
            return {
                'client_id': client_id,
                'error': 'No profile found',
                'risk_score': 0,
                'deviations': []
            }
        
        profile = self.profiles[client_id]
        deviations = []
        total_z_scores = []
        
        try:
            # Check time deviation
            ts_str = current_activity.get('timestamp', '')
            if ts_str:
                timestamp = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                typical_hours = profile['time_patterns'].get('typical_hours', [])
                
                if typical_hours and timestamp.hour not in typical_hours:
                    deviations.append({
                        'type': 'unusual_time',
                        'detail': f'Activity at {timestamp.hour}:00, typical hours: {typical_hours}',
                        'severity': 'medium'
                    })
                    total_z_scores.append(2.0)  # Moderate deviation
            
            # Check domain deviation
            domain = current_activity.get('domain', '')
            if domain:
                top_domains = [d['name'] for d in profile['domain_patterns'].get('top_domains', [])]
                if domain not in top_domains:
                    deviations.append({
                        'type': 'new_domain',
                        'detail': f'First visit to {domain}',
                        'severity': 'low'
                    })
                    total_z_scores.append(1.0)
            
            # Check browser deviation
            browser = current_activity.get('browser', 'Unknown')
            primary_browser = profile['device_patterns'].get('primary_browser', '')
            if browser != 'Unknown' and browser != primary_browser:
                deviations.append({
                    'type': 'different_browser',
                    'detail': f'Using {browser}, typically uses {primary_browser}',
                    'severity': 'medium'
                })
                total_z_scores.append(2.0)
            
            # Check traffic volume deviation
            bytes_sent = current_activity.get('bytes_sent', 0)
            if bytes_sent:
                traffic_stats = profile['traffic_patterns'].get('bytes_sent', {})
                mean = traffic_stats.get('mean', 0)
                std = traffic_stats.get('std', 1) or 1  # Avoid division by zero
                
                if mean > 0:
                    z_score = abs(bytes_sent - mean) / std
                    if z_score > self.deviation_threshold:
                        deviations.append({
                            'type': 'unusual_traffic',
                            'detail': f'Traffic {bytes_sent} bytes, typical: {mean:.0f} ± {std:.0f}',
                            'severity': 'high' if z_score > 3 else 'medium',
                            'z_score': round(z_score, 2)
                        })
                        total_z_scores.append(z_score)
            
        except Exception as e:
            logger.error(f"Error calculating deviation: {e}")
            return {
                'client_id': client_id,
                'error': str(e),
                'risk_score': 0,
                'deviations': []
            }
        
        # Calculate overall risk score
        if total_z_scores:
            avg_z = np.mean(total_z_scores)
            # Sigmoid-like transformation: 0-100 scale
            risk_score = min(100, max(0, (self._sigmoid(avg_z - 1) * 100)))
        else:
            risk_score = 0
        
        # Determine risk level
        if risk_score >= 70:
            risk_level = 'critical'
        elif risk_score >= 50:
            risk_level = 'high'
        elif risk_score >= 30:
            risk_level = 'medium'
        else:
            risk_level = 'low'
        
        return {
            'client_id': client_id,
            'risk_score': round(risk_score, 2),
            'risk_level': risk_level,
            'deviations': deviations,
            'baseline_data_points': profile.get('data_points', 0),
            'evaluated_at': datetime.now().isoformat()
        }
    
    def _sigmoid(self, x: float) -> float:
        """Sigmoid function for risk normalization"""
        return 1 / (1 + np.exp(-x))
    
    def get_profile(self, client_id: str) -> Optional[Dict[str, Any]]:
        """Get profile for a specific client"""
        return self.profiles.get(client_id)
    
    def get_all_profiles_summary(self) -> List[Dict[str, Any]]:
        """Get summary of all profiles"""
        return [
            {
                'client_id': cid,
                'data_points': p.get('data_points', 0),
                'created_at': p.get('created_at'),
                'risk_level': p.get('risk_level', 'unknown'),
                'unique_domains': p.get('domain_patterns', {}).get('unique_domains', 0)
            }
            for cid, p in self.profiles.items()
        ]
    
    def save(self):
        """Save all profiles to disk"""
        self._ensure_model_dir()
        
        profiles_file = os.path.join(self.model_path, 'behavior_profiles.json')
        with open(profiles_file, 'w') as f:
            json.dump({
                'profiles': self.profiles,
                'saved_at': datetime.now().isoformat(),
                'window_days': self.window_days,
                'deviation_threshold': self.deviation_threshold
            }, f, indent=2)
        
        logger.info(f"Saved {len(self.profiles)} behavior profiles")
    
    def load(self):
        """Load profiles from disk"""
        profiles_file = os.path.join(self.model_path, 'behavior_profiles.json')
        
        if not os.path.exists(profiles_file):
            raise FileNotFoundError(f"Profiles file not found: {profiles_file}")
        
        with open(profiles_file, 'r') as f:
            data = json.load(f)
        
        self.profiles = data.get('profiles', {})
        self.window_days = data.get('window_days', self.window_days)
        self.deviation_threshold = data.get('deviation_threshold', self.deviation_threshold)
        self.has_profiles = len(self.profiles) > 0
        
        logger.info(f"Loaded {len(self.profiles)} behavior profiles")
    
    def update_risk_level(self, client_id: str, risk_level: str):
        """Update the risk level for a client profile"""
        if client_id in self.profiles:
            self.profiles[client_id]['risk_level'] = risk_level
            self.profiles[client_id]['risk_updated_at'] = datetime.now().isoformat()
