# AI Security Service for SecDash VPN

A Python-based AI microservice for anomaly detection and user behavior analytics.

## Features

- **Anomaly Detection**: Isolation Forest algorithm detects unusual VPN patterns
- **User Behavior Analytics**: Statistical profiling with deviation detection
- **Real-time Scoring**: Fast inference for immediate threat detection
- **REST API**: FastAPI-based endpoints for dashboard integration

## Quick Start

### With Docker (Recommended)

```bash
# From project root
docker-compose up -d ai-service

# Check logs
docker logs ai-service
```

### Local Development

```bash
cd ai-service

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run service
uvicorn app.main:app --reload --port 8001
```

## API Endpoints

| Endpoint                          | Method | Description             |
| --------------------------------- | ------ | ----------------------- |
| `/health`                         | GET    | Health check            |
| `/api/status`                     | GET    | Model status            |
| `/api/analyze`                    | POST   | Analyze single activity |
| `/api/analyze/batch`              | POST   | Batch analysis          |
| `/api/train`                      | POST   | Train anomaly model     |
| `/api/profile/build`              | POST   | Build user profile      |
| `/api/profile/build-all`          | POST   | Build all profiles      |
| `/api/profile/{id}`               | GET    | Get user profile        |
| `/api/profiles`                   | GET    | List all profiles       |
| `/api/anomalies`                  | GET    | List anomalies          |
| `/api/anomalies/{id}/acknowledge` | POST   | Acknowledge anomaly     |
| `/api/anomalies/stats`            | GET    | Anomaly statistics      |
| `/api/feature-importance`         | GET    | Feature importance      |

## Configuration

| Variable              | Default   | Description            |
| --------------------- | --------- | ---------------------- |
| `DATA_PATH`           | `/data`   | Activity logs path     |
| `MODEL_PATH`          | `/models` | ML models path         |
| `CONTAMINATION`       | `0.05`    | Expected anomaly ratio |
| `PROFILE_WINDOW_DAYS` | `30`      | Baseline window        |
| `DEVIATION_THRESHOLD` | `2.0`     | Z-score threshold      |

## Project Structure

```
ai-service/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Settings
│   ├── models/
│   │   ├── anomaly_detector.py   # Isolation Forest
│   │   └── behavior_profiler.py  # User profiling
│   ├── api/
│   │   ├── routes.py        # Endpoints
│   │   └── schemas.py       # Pydantic models
│   └── utils/
│       └── data_loader.py   # Data loading
├── Dockerfile
└── requirements.txt
```

## For Thesis

### Algorithms

1. **Isolation Forest** (Liu et al., 2008)
   - Complexity: O(n log n)
   - Formula: `s(x,n) = 2^(-E(h(x))/c(n))`

2. **Statistical Profiling**
   - Rolling 30-day baseline
   - Z-score deviation detection

### Evaluation Metrics

- Precision, Recall, F1-Score
- False Positive Rate
- Detection Latency
