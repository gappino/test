#!/bin/bash
################################################################################
# Check Services - Ensures all guardian services are running
################################################################################

set -euo pipefail

LOG_FILE="/var/log/guardian.log"
SELF_DESTRUCT_SCRIPT="/usr/local/bin/self-destruct.sh"

# Services to monitor
SERVICES=(
    "guardian-main"
    "guardian-backup"
    "guardian-process"
    "guardian-files"
)

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [CHECK-SERVICES] $1" >> "$LOG_FILE"
}

# Check if being run too frequently (possible attack)
LAST_CHECK_FILE="/tmp/guardian-last-check"
if [[ -f "$LAST_CHECK_FILE" ]]; then
    LAST_CHECK=$(cat "$LAST_CHECK_FILE")
    CURRENT_TIME=$(date +%s)
    TIME_DIFF=$((CURRENT_TIME - LAST_CHECK))
    
    if [[ $TIME_DIFF -lt 30 ]]; then
        # Being run too frequently, skip
        exit 0
    fi
fi
echo "$(date +%s)" > "$LAST_CHECK_FILE"

# Count how many services are down
DOWN_COUNT=0
FAILED_SERVICES=""

for service in "${SERVICES[@]}"; do
    if ! systemctl is-active --quiet "$service" 2>/dev/null; then
        log "WARNING: Service '$service' is not running"
        DOWN_COUNT=$((DOWN_COUNT + 1))
        FAILED_SERVICES="$FAILED_SERVICES $service"
        
        # Try to restart
        log "Attempting to restart: $service"
        if systemctl restart "$service" 2>/dev/null; then
            log "Successfully restarted: $service"
            DOWN_COUNT=$((DOWN_COUNT - 1))
        else
            log "FAILED to restart: $service"
        fi
    fi
done

# If multiple services are down, this is suspicious
if [[ $DOWN_COUNT -ge 2 ]]; then
    log "ALERT: Multiple guardian services down ($DOWN_COUNT): $FAILED_SERVICES"
    log "This may indicate a tampering attempt!"
    
    # Give one more chance to restart
    sleep 5
    
    STILL_DOWN=0
    for service in $FAILED_SERVICES; do
        if ! systemctl is-active --quiet "$service" 2>/dev/null; then
            STILL_DOWN=$((STILL_DOWN + 1))
        fi
    done
    
    if [[ $STILL_DOWN -ge 2 ]]; then
        log "CRITICAL: Multiple services still down after restart attempt"
        log "Initiating self-destruct..."
        
        if [[ -x "$SELF_DESTRUCT_SCRIPT" ]]; then
            "$SELF_DESTRUCT_SCRIPT" "Multiple guardian services down: $FAILED_SERVICES" &
        fi
    fi
elif [[ $DOWN_COUNT -eq 0 ]]; then
    # All services running - update heartbeat
    echo "$(date +%s)" > /var/lib/project-guardian/services_check
fi

exit 0

