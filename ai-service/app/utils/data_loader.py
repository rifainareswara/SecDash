"""
Data Loader Utility

Loads activity logs from the SecDash VPN database (JSON files)
"""
import os
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


class DataLoader:
    """
    Loads VPN activity data from JSON files
    
    The SecDash VPN stores activity logs in daily JSON files
    in the format: YYYY-MM-DD.json
    """
    
    def __init__(self, data_path: str = "/data"):
        """
        Initialize the data loader
        
        Args:
            data_path: Base path to the wg-db directory
        """
        self.data_path = Path(data_path)
        self.activity_logs_path = self.data_path / "activity_logs"
        self.clients_path = self.data_path / "clients"
    
    def load_activity_logs(
        self,
        days: int = 30,
        client_id: Optional[str] = None,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Load activity logs from JSON files
        
        Args:
            days: Number of days of history to load
            client_id: Filter by specific client (optional)
            category: Filter by category (optional)
            
        Returns:
            List of activity records
        """
        activities = []
        
        if not self.activity_logs_path.exists():
            logger.warning(f"Activity logs path does not exist: {self.activity_logs_path}")
            return activities
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Iterate through date range
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.strftime("%Y-%m-%d")
            log_file = self.activity_logs_path / f"{date_str}.json"
            
            if log_file.exists():
                try:
                    with open(log_file, 'r') as f:
                        day_logs = json.load(f)
                        
                        if isinstance(day_logs, list):
                            # Apply filters
                            for log in day_logs:
                                if client_id and log.get('client_id') != client_id:
                                    continue
                                if category and log.get('category') != category:
                                    continue
                                activities.append(log)
                                
                except json.JSONDecodeError as e:
                    logger.error(f"Error parsing {log_file}: {e}")
                except Exception as e:
                    logger.error(f"Error reading {log_file}: {e}")
            
            current_date += timedelta(days=1)
        
        logger.info(f"Loaded {len(activities)} activities from {days} days")
        return activities
    
    def load_clients(self) -> List[Dict[str, Any]]:
        """
        Load VPN client configurations
        
        Returns:
            List of client records
        """
        clients = []
        
        if not self.clients_path.exists():
            logger.warning(f"Clients path does not exist: {self.clients_path}")
            return clients
        
        for client_file in self.clients_path.glob("*.json"):
            try:
                with open(client_file, 'r') as f:
                    client = json.load(f)
                    clients.append(client)
            except Exception as e:
                logger.error(f"Error reading client file {client_file}: {e}")
        
        logger.info(f"Loaded {len(clients)} clients")
        return clients
    
    def load_vpn_connections(self) -> List[Dict[str, Any]]:
        """
        Load VPN connection history if available
        
        Note: Connection logs might be in-memory only in SecDash,
        so this might return empty for historical data.
        """
        connections_file = self.data_path / "vpn_connections.json"
        
        if connections_file.exists():
            try:
                with open(connections_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error reading connections: {e}")
        
        return []
    
    def get_activity_summary(self, days: int = 7) -> Dict[str, Any]:
        """
        Get summary statistics for activity data
        
        Returns:
            Summary including total records, unique clients, date range
        """
        activities = self.load_activity_logs(days=days)
        
        if not activities:
            return {
                'total_records': 0,
                'unique_clients': 0,
                'unique_domains': 0,
                'date_range': None
            }
        
        # Calculate statistics
        client_ids = set()
        domains = set()
        timestamps = []
        
        for activity in activities:
            client_ids.add(activity.get('client_id', 'unknown'))
            domains.add(activity.get('domain', ''))
            
            ts = activity.get('timestamp')
            if ts:
                try:
                    timestamps.append(datetime.fromisoformat(ts.replace('Z', '+00:00')))
                except:
                    pass
        
        date_range = None
        if timestamps:
            date_range = {
                'start': min(timestamps).isoformat(),
                'end': max(timestamps).isoformat()
            }
        
        return {
            'total_records': len(activities),
            'unique_clients': len(client_ids),
            'unique_domains': len(domains),
            'date_range': date_range,
            'clients': list(client_ids)
        }
    
    def enrich_activity(
        self,
        activity: Dict[str, Any],
        include_client_info: bool = True
    ) -> Dict[str, Any]:
        """
        Enrich activity record with additional context
        
        Args:
            activity: Raw activity record
            include_client_info: Whether to include client details
            
        Returns:
            Enriched activity record
        """
        enriched = activity.copy()
        
        # Add computed fields for ML
        if 'timestamp' in enriched:
            try:
                ts = datetime.fromisoformat(enriched['timestamp'].replace('Z', '+00:00'))
                enriched['hour_of_day'] = ts.hour
                enriched['day_of_week'] = ts.weekday()
                enriched['is_weekend'] = ts.weekday() >= 5
            except:
                pass
        
        # Calculate domain entropy if domain exists
        domain = enriched.get('domain', '')
        if domain:
            enriched['domain_length'] = len(domain)
            enriched['domain_entropy'] = self._calculate_entropy(domain)
        
        return enriched
    
    def _calculate_entropy(self, text: str) -> float:
        """Calculate Shannon entropy of a string"""
        import math
        from collections import Counter
        
        if not text:
            return 0.0
        
        freq = Counter(text.lower())
        length = len(text)
        
        entropy = 0.0
        for count in freq.values():
            p = count / length
            entropy -= p * math.log2(p)
        
        return entropy
