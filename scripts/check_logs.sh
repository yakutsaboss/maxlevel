#!/bin/bash
# Log Checker Script
# Tails PM2 logs and checks for error patterns.
#
# Usage: ./scripts/check_logs.sh [lines]
# Example: ./scripts/check_logs.sh 200

LINES=${1:-100}
PM2_APP="telegram-rpg-bot"

echo "=== Last $LINES lines of $PM2_APP logs ==="
echo ""

# Get recent logs
LOGS=$(pm2 logs "$PM2_APP" --lines "$LINES" --nostream 2>/dev/null)

if [ -z "$LOGS" ]; then
  echo "No logs found for process '$PM2_APP'"
  exit 1
fi

# Count error patterns
ERRORS=$(echo "$LOGS" | grep -ci "error\|exception\|fatal\|ECONNREFUSED\|ENOTFOUND\|ETIMEDOUT" 2>/dev/null)
WARNINGS=$(echo "$LOGS" | grep -ci "warn\|deprecat" 2>/dev/null)
RATE_LIMITS=$(echo "$LOGS" | grep -ci "rate.limit\|429\|too many" 2>/dev/null)
AUTH_FAILS=$(echo "$LOGS" | grep -ci "AUTH FAILED\|unauthorized\|401" 2>/dev/null)
DB_ERRORS=$(echo "$LOGS" | grep -ci "DB.*error\|connection.*refused\|pool.*error" 2>/dev/null)

echo "--- Summary (last $LINES lines) ---"
echo "Errors:       $ERRORS"
echo "Warnings:     $WARNINGS"
echo "Rate limits:  $RATE_LIMITS"
echo "Auth failures: $AUTH_FAILS"
echo "DB errors:    $DB_ERRORS"
echo ""

if [ "$ERRORS" -gt 10 ]; then
  echo "HIGH ERROR COUNT ($ERRORS errors in last $LINES lines)"
  echo ""
  echo "--- Recent errors ---"
  echo "$LOGS" | grep -i "error\|exception\|fatal" | tail -10
  exit 1
fi

if [ "$DB_ERRORS" -gt 0 ]; then
  echo "DATABASE ERRORS DETECTED"
  echo ""
  echo "--- DB errors ---"
  echo "$LOGS" | grep -i "DB.*error\|connection.*refused\|pool.*error" | tail -5
  exit 1
fi

echo "Log check passed."
exit 0
