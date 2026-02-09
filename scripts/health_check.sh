#!/bin/bash
# Health Check Script
# Checks the bot's health endpoint and alerts if it's down.
#
# Usage: ./scripts/health_check.sh
# Cron:  */5 * * * * /opt/wibecode-bot/scripts/health_check.sh

HEALTH_URL="https://yakutsa.ru/health"
TIMEOUT=15
LOG_FILE="/var/log/wibecode-health.log"

timestamp() {
  date -u '+%Y-%m-%d %H:%M:%S UTC'
}

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$HEALTH_URL" 2>/dev/null)
CURL_EXIT=$?

if [ "$CURL_EXIT" -ne 0 ]; then
  echo "[$(timestamp)] FAIL — curl error (exit code $CURL_EXIT), health endpoint unreachable" | tee -a "$LOG_FILE"
  exit 1
fi

if [ "$HTTP_STATUS" = "200" ]; then
  echo "[$(timestamp)] OK — health endpoint returned $HTTP_STATUS"
  exit 0
else
  echo "[$(timestamp)] FAIL — health endpoint returned $HTTP_STATUS" | tee -a "$LOG_FILE"
  exit 1
fi
