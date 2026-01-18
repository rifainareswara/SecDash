# AI Security Service for SecDash VPN

A Python-based AI microservice for anomaly detection and user behavior analytics.

## Features

- **Anomaly Detection**: Uses Isolation Forest to detect unusual VPN usage patterns
- **User Behavior Analytics (UBA)**: Builds user profiles and detects deviations
- **Real-time Scoring**: Fast inference for immediate threat detection
- **REST API**: FastAPI-based endpoints for integration with main dashboard

## Quick Start

### Prerequisites

- Python 3.10+
- pip or Poetry

### Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the service
uvicorn app.main:app --reload --port 8001
```

### Docker

```bash
docker build -t secdash-ai .
docker run -p 8001:8001 -v ./models:/models -v ../wg-db:/data:ro secdash-ai
```

## API Endpoints

| Endpoint                   | Method | Description                    |
| -------------------------- | ------ | ------------------------------ |
| `/health`                  | GET    | Health check                   |
| `/api/analyze`             | POST   | Analyze activity for anomalies |
| `/api/profile/{client_id}` | GET    | Get user behavior profile      |
| `/api/train`               | POST   | Retrain models with new data   |
| `/api/anomalies`           | GET    | List detected anomalies        |

## Project Structure

```
ai-service/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration
│   ├── models/
│   │   ├── anomaly_detector.py
│   │   └── behavior_profiler.py
│   ├── features/
│   │   ├── extractor.py
│   │   └── preprocessor.py
│   ├── api/
│   │   ├── routes.py
│   │   └── schemas.py
│   └── utils/
│       └── data_loader.py
├── models/                   # Saved ML models
├── tests/
├── requirements.txt
└── Dockerfile
```

## Configuration

Environment variables:

| Variable              | Default   | Description                 |
| --------------------- | --------- | --------------------------- |
| `DATA_PATH`           | `/data`   | Path to activity logs       |
| `MODEL_PATH`          | `/models` | Path to save/load models    |
| `CONTAMINATION`       | `0.05`    | Expected anomaly ratio      |
| `PROFILE_WINDOW_DAYS` | `30`      | Days for behavior profiling |

## For Thesis

This service implements:

- **Isolation Forest** algorithm for anomaly detection
- **Statistical profiling** for user behavior analytics
- **Feature engineering** from VPN activity logs

See the main documentation for algorithm details and evaluation metrics.
