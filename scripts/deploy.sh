#!/bin/bash
# deploy.sh — Push, build, restart, and verify deployment
#
# This is the ONLY correct way to deploy. It ensures:
# 1. Code is pushed to GitHub
# 2. Server pulls and rebuilds both bot and mini-app
# 3. ONLY telegram-rpg-bot is restarted (NOT telegram-rpg-api)
# 4. The running version is verified via /health endpoint
#
# Usage: ./scripts/deploy.sh
#
# WARNING: NEVER restart telegram-rpg-api. Nginx routes to port 3000
# which is served exclusively by telegram-rpg-bot (PM2 id 0).
# The telegram-rpg-api cluster process exists in ecosystem.config.js
# but does NOT receive traffic.

set -euo pipefail

SERVER="root@85.239.58.205"
DEPLOY_PATH="/opt/wibecode-bot"
HEALTH_URL="https://yakutsa.ru/health"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Deploy Started ===${NC}"

# Step 1: Get local commit hash for verification
LOCAL_VERSION=$(git rev-parse --short HEAD)
LOCAL_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo -e "Local version: ${GREEN}${LOCAL_VERSION}${NC}"

# Step 2: Push to GitHub
echo -e "\n${YELLOW}[1/5] Pushing to GitHub...${NC}"
git push origin main
echo -e "${GREEN}Pushed.${NC}"

# Step 3: SSH to server — pull, build, set version, restart
echo -e "\n${YELLOW}[2/5] Building on server...${NC}"
ssh ${SERVER} << REMOTE_SCRIPT
  set -e
  cd ${DEPLOY_PATH}

  echo "Pulling latest code..."
  git pull --ff-only

  echo "Building bot..."
  cd bot && npm install && npm run build && cd ..

  echo "Building mini-app..."
  cd mini-app && npm run build && cd ..

  echo "Setting BUILD_VERSION and BUILD_TIMESTAMP..."
  export BUILD_VERSION="${LOCAL_VERSION}"
  export BUILD_TIMESTAMP="${LOCAL_TIMESTAMP}"

  echo "Restarting telegram-rpg-bot (ONLY this process)..."
  BUILD_VERSION="${LOCAL_VERSION}" BUILD_TIMESTAMP="${LOCAL_TIMESTAMP}" pm2 restart telegram-rpg-bot --update-env

  echo "Server build complete."
REMOTE_SCRIPT
echo -e "${GREEN}Server build and restart done.${NC}"

# Step 4: Wait for server to stabilize
echo -e "\n${YELLOW}[3/5] Waiting 3 seconds for server to stabilize...${NC}"
sleep 3

# Step 5: Verify deployment via /health endpoint
echo -e "\n${YELLOW}[4/5] Verifying deployment...${NC}"
HEALTH_RESPONSE=$(curl -s --max-time 10 "${HEALTH_URL}" 2>/dev/null || echo "CURL_FAILED")

if [ "${HEALTH_RESPONSE}" = "CURL_FAILED" ]; then
  echo -e "${RED}FAILED: Could not reach ${HEALTH_URL}${NC}"
  echo "Manual check: curl ${HEALTH_URL}"
  exit 1
fi

REMOTE_VERSION=$(echo "${HEALTH_RESPONSE}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('version','UNKNOWN'))" 2>/dev/null || echo "PARSE_FAILED")

echo -e "\n${YELLOW}[5/5] Version comparison:${NC}"
echo -e "  Local:  ${GREEN}${LOCAL_VERSION}${NC}"
echo -e "  Remote: ${GREEN}${REMOTE_VERSION}${NC}"

if [ "${REMOTE_VERSION}" = "${LOCAL_VERSION}" ]; then
  echo -e "\n${GREEN}=== Deploy SUCCESSFUL ===${NC}"
  echo -e "Version ${GREEN}${LOCAL_VERSION}${NC} is live at ${HEALTH_URL}"
  echo ""
  echo "Health response:"
  echo "${HEALTH_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${HEALTH_RESPONSE}"
  exit 0
else
  echo -e "\n${RED}=== Deploy VERIFICATION FAILED ===${NC}"
  echo -e "Expected ${GREEN}${LOCAL_VERSION}${NC} but got ${RED}${REMOTE_VERSION}${NC}"
  echo ""
  echo "This usually means:"
  echo "  1. PM2 did not pick up the new BUILD_VERSION env var"
  echo "  2. The wrong PM2 process was restarted"
  echo "  3. The server is still starting up (try: curl ${HEALTH_URL})"
  echo ""
  echo "Manual fix:"
  echo "  ssh ${SERVER} \"cd ${DEPLOY_PATH} && BUILD_VERSION=${LOCAL_VERSION} BUILD_TIMESTAMP=${LOCAL_TIMESTAMP} pm2 restart telegram-rpg-bot --update-env\""
  exit 1
fi
