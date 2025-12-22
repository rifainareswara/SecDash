#!/bin/bash

# =================================
# SecDash VPN - Multi-Environment Runner
# =================================
# Usage:
#   ./run-env.sh dev    # Run development
#   ./run-env.sh uat    # Run UAT
#   ./run-env.sh prod   # Run production
#   ./run-env.sh dev stop   # Stop development
#   ./run-env.sh all stop   # Stop all environments

set -e

ENV=$1
ACTION=${2:-up}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}=================================${NC}"
    echo -e "${BLUE}  SecDash VPN - Multi Environment${NC}"
    echo -e "${BLUE}=================================${NC}"
}

usage() {
    echo -e "${YELLOW}Usage:${NC} $0 <environment> [action]"
    echo ""
    echo -e "${GREEN}Environments:${NC}"
    echo "  dev   - Development (port 3000, WG 51820)"
    echo "  uat   - User Acceptance Testing (port 3001, WG 51821)"
    echo "  prod  - Production (port 3002, WG 51822)"
    echo "  all   - All environments (for stop/status only)"
    echo ""
    echo -e "${GREEN}Actions:${NC}"
    echo "  up      - Start environment (default)"
    echo "  down    - Stop and remove containers"
    echo "  stop    - Stop containers"
    echo "  restart - Restart containers"
    echo "  logs    - Show logs"
    echo "  status  - Show container status"
    echo "  build   - Build images"
    echo ""
    echo -e "${GREEN}Examples:${NC}"
    echo "  $0 dev          # Start dev environment"
    echo "  $0 uat up       # Start UAT environment"
    echo "  $0 prod logs    # View production logs"
    echo "  $0 all status   # Status of all environments"
    exit 1
}

if [ -z "$ENV" ]; then
    print_header
    usage
fi

# Validate environment
if [[ ! "$ENV" =~ ^(dev|uat|prod|all)$ ]]; then
    echo -e "${RED}Error: Invalid environment '$ENV'${NC}"
    usage
fi

ENV_FILE="environments/${ENV}.env"
COMPOSE_FILE="docker-compose.multi-env.yml"

# Handle 'all' environment
if [ "$ENV" == "all" ]; then
    print_header
    echo ""
    
    if [ "$ACTION" == "status" ]; then
        echo -e "${YELLOW}Container Status:${NC}"
        docker ps -a --filter "name=wireguard-" --filter "name=vpn-dashboard-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        exit 0
    elif [ "$ACTION" == "stop" ] || [ "$ACTION" == "down" ]; then
        for e in dev uat prod; do
            if [ -f "environments/${e}.env" ]; then
                echo -e "${YELLOW}Stopping ${e}...${NC}"
                docker compose --env-file "environments/${e}.env" -f "$COMPOSE_FILE" -p "secdash-${e}" down 2>/dev/null || true
            fi
        done
        echo -e "${GREEN}All environments stopped.${NC}"
        exit 0
    else
        echo -e "${RED}Error: 'all' only supports 'status', 'stop', or 'down' actions${NC}"
        exit 1
    fi
fi

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: Environment file not found: $ENV_FILE${NC}"
    echo "Please create it from the template."
    exit 1
fi

# Create data directory for this environment
mkdir -p "data/${ENV}/config" "data/${ENV}/wg-db"

print_header
echo ""
echo -e "${GREEN}Environment:${NC} $ENV"
echo -e "${GREEN}Action:${NC} $ACTION"
echo -e "${GREEN}Env File:${NC} $ENV_FILE"
echo ""

# Load ports for display
source "$ENV_FILE"
echo -e "${YELLOW}Ports:${NC}"
echo "  Dashboard: http://localhost:${WEBUI_PORT:-3000}"
echo "  WireGuard: UDP ${WG_PORT:-51820}"
echo ""

PROJECT_NAME="secdash-${ENV}"

case "$ACTION" in
    up)
        echo -e "${GREEN}Starting $ENV environment...${NC}"
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d --build
        echo ""
        echo -e "${GREEN}✓ $ENV environment started!${NC}"
        echo -e "  Dashboard: ${BLUE}http://localhost:${WEBUI_PORT:-3000}${NC}"
        ;;
    down)
        echo -e "${YELLOW}Stopping and removing $ENV environment...${NC}"
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down
        echo -e "${GREEN}✓ $ENV environment removed.${NC}"
        ;;
    stop)
        echo -e "${YELLOW}Stopping $ENV environment...${NC}"
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" -p "$PROJECT_NAME" stop
        echo -e "${GREEN}✓ $ENV environment stopped.${NC}"
        ;;
    restart)
        echo -e "${YELLOW}Restarting $ENV environment...${NC}"
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" -p "$PROJECT_NAME" restart
        echo -e "${GREEN}✓ $ENV environment restarted.${NC}"
        ;;
    logs)
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" -p "$PROJECT_NAME" logs -f
        ;;
    status)
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps
        ;;
    build)
        echo -e "${YELLOW}Building $ENV environment...${NC}"
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" -p "$PROJECT_NAME" build
        echo -e "${GREEN}✓ Build complete.${NC}"
        ;;
    *)
        echo -e "${RED}Error: Unknown action '$ACTION'${NC}"
        usage
        ;;
esac
