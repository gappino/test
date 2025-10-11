#!/bin/bash
################################################################################
# Hidden Watchdog - Secret guardian for security system integrity
# This script monitors the guardian system itself
################################################################################

set -euo pipefail

# Hidden paths (looks like system service)
HIDDEN_STATE="/var/lib/systemd/.guardian-state"
HIDDEN_LOG="/var/log/systemd/.guardian-check.log"
SELF_DESTRUCT="/usr/local/bin/self-destruct.sh"

# Files to monitor
CRITICAL_FILES=(
    "/usr/local/bin/project-guardian.sh"
    "/usr/local/bin/process-monitor.sh"
    "/usr/local/bin/file-access-monitor.sh"
    "/usr/local/bin/password-monitor.sh"
    "/usr/local/bin/snapshot-detector.sh"
    "/usr/local/bin/self-destruct.sh"
    "/usr/local/bin/encryption-manager.sh"
    "/etc/systemd/system/guardian-main.service"
    "/etc/systemd/system/guardian-backup.service"
    "/etc/project-guardian/config.json"
)

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [HIDDEN-WATCHDOG] $1" >> "$HIDDEN_LOG"
}

# Check if critical files exist
check_files() {
    local missing_count=0
    local missing_files=""
    
    for file in "${CRITICAL_FILES[@]}"; do
        if [[ ! -f "$file" ]]; then
            missing_count=$((missing_count + 1))
            missing_files="$missing_files $file"
            log "CRITICAL: Missing file: $file"
        fi
    done
    
    if [[ $missing_count -gt 0 ]]; then
        log "ALERT: $missing_count critical security files are missing!"
        log "Missing: $missing_files"
        return 1
    fi
    
    return 0
}

# Check if services are running
check_services() {
    local services=(
        "guardian-main"
        "guardian-backup"
    )
    
    local down_count=0
    
    for service in "${services[@]}"; do
        if ! systemctl is-active --quiet "$service" 2>/dev/null; then
            down_count=$((down_count + 1))
            log "WARNING: Service $service is not running"
        fi
    done
    
    if [[ $down_count -ge 2 ]]; then
        log "CRITICAL: Multiple core services are down!"
        return 1
    fi
    
    return 0
}

# Main check
main() {
    # Create hidden directories
    mkdir -p "$(dirname "$HIDDEN_STATE")" "$(dirname "$HIDDEN_LOG")"
    
    log "Starting integrity check..."
    
    # Check files
    if ! check_files; then
        log "SECURITY BREACH: Critical files deleted!"
        log "Initiating emergency self-destruct..."
        
        if [[ -x "$SELF_DESTRUCT" ]]; then
            "$SELF_DESTRUCT" "Hidden Watchdog: Critical security files deleted" &
        else
            # Self-destruct is also missing, do it manually
            log "Self-destruct script missing! Manual destruction..."
            PROJECT_PATH="/opt/videomakerfree_v2"
            if [[ -d "$PROJECT_PATH" ]]; then
                find "$PROJECT_PATH" -type f -exec shred -vfz -n 3 {} \; 2>/dev/null || true
                rm -rf "$PROJECT_PATH" 2>/dev/null || true
                echo "Project destroyed by hidden watchdog" > /tmp/project-destroyed
            fi
        fi
        exit 1
    fi
    
    # Check services
    if ! check_services; then
        log "WARNING: Core services are down"
        
        # Try to restart
        systemctl restart guardian-main 2>/dev/null || {
            log "CRITICAL: Cannot restart guardian services!"
            log "This indicates tampering. Initiating self-destruct..."
            
            if [[ -x "$SELF_DESTRUCT" ]]; then
                "$SELF_DESTRUCT" "Hidden Watchdog: Guardian services cannot be restarted" &
            fi
        }
    fi
    
    # Update state
    echo "$(date +%s)" > "$HIDDEN_STATE"
    
    log "Integrity check passed"
}

# Run silently
main > /dev/null 2>&1 || true

