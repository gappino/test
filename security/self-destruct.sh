#!/bin/bash
################################################################################
# Self-Destruct - Securely destroys the project when triggered
################################################################################

set -euo pipefail

# Configuration
CONFIG_DIR="/etc/project-guardian"
STATE_DIR="/var/lib/project-guardian"
LOG_FILE="/var/log/guardian.log"
DESTRUCTION_LOG="/var/log/guardian-destruction.log"
MARKER_FILE="/tmp/project-destroyed"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging
log() {
    local msg="$(date '+%Y-%m-%d %H:%M:%S') [SELF-DESTRUCT] $1"
    echo -e "${RED}$msg${NC}"
    echo "$msg" >> "$LOG_FILE"
    echo "$msg" >> "$DESTRUCTION_LOG"
}

# Get reason for destruction
REASON="${1:-Unknown trigger}"

log "=========================================="
log "SELF-DESTRUCT SEQUENCE INITIATED"
log "=========================================="
log "Reason: $REASON"
log "Timestamp: $(date)"
log "Hostname: $(hostname)"
log "User: $(whoami)"

# Load configuration
if [[ -f "$CONFIG_DIR/config.json" ]]; then
    PROJECT_PATH=$(jq -r '.project_path' "$CONFIG_DIR/config.json")
    GRACE_PERIOD=$(jq -r '.grace_period // 0' "$CONFIG_DIR/config.json")
else
    PROJECT_PATH="/opt/videomakerfree_v2"
    GRACE_PERIOD=0
fi

log "Project path: $PROJECT_PATH"
log "Grace period: ${GRACE_PERIOD}s"

# Grace period (if configured)
if [[ $GRACE_PERIOD -gt 0 ]]; then
    log "Grace period active. Destruction will begin in ${GRACE_PERIOD} seconds..."
    log "To cancel: touch /tmp/guardian-cancel"
    
    for ((i=GRACE_PERIOD; i>0; i--)); do
        if [[ -f /tmp/guardian-cancel ]]; then
            log "Destruction cancelled by user!"
            rm -f /tmp/guardian-cancel
            exit 0
        fi
        
        if [[ $i -le 10 ]] || [[ $((i % 10)) -eq 0 ]]; then
            log "Destruction in ${i} seconds..."
        fi
        
        sleep 1
    done
fi

log "=========================================="
log "BEGINNING DESTRUCTION SEQUENCE"
log "=========================================="

# Function to securely delete a file
secure_delete_file() {
    local file="$1"
    
    if [[ ! -e "$file" ]]; then
        return
    fi
    
    log "Shredding: $file"
    
    # Try shred first (most secure)
    if command -v shred &> /dev/null; then
        shred -vfz -n 3 "$file" 2>/dev/null || {
            # Fallback to overwrite
            dd if=/dev/urandom of="$file" bs=1M 2>/dev/null || true
            rm -f "$file"
        }
    else
        # Fallback: overwrite with random data
        dd if=/dev/urandom of="$file" bs=1M count=1 2>/dev/null || true
        rm -f "$file"
    fi
}

# Function to securely delete directory
secure_delete_directory() {
    local dir="$1"
    
    if [[ ! -d "$dir" ]]; then
        log "Directory not found: $dir"
        return
    fi
    
    log "Destroying directory: $dir"
    
    # First, shred all files
    find "$dir" -type f | while read -r file; do
        secure_delete_file "$file"
    done
    
    # Remove directory structure
    rm -rf "$dir" 2>/dev/null || true
    
    log "Directory destroyed: $dir"
}

# Stop all related services
log "Stopping guardian services..."

SERVICES=(
    "guardian-main"
    "guardian-backup"
    "guardian-process"
    "guardian-files"
    "project-app"
)

for service in "${SERVICES[@]}"; do
    if systemctl is-active --quiet "$service" 2>/dev/null; then
        log "Stopping service: $service"
        systemctl stop "$service" 2>/dev/null || true
    fi
done

# Log current system state before destruction
log "Current system state:"
log "  Uptime: $(uptime -p)"
log "  Load: $(uptime | awk -F'load average:' '{print $2}')"
log "  Current sessions: $(w -h | wc -l)"
log "  Disk usage: $(df -h $PROJECT_PATH | tail -1 | awk '{print $5}')"

# Log who might have triggered this
log "Recent authentication logs:"
tail -20 /var/log/auth.log 2>/dev/null | while read -r line; do
    log "  $line"
done || log "  (auth log not accessible)"

log "Recent command history:"
if [[ -f /root/.bash_history ]]; then
    tail -20 /root/.bash_history | while read -r cmd; do
        log "  $cmd"
    done
fi

# Begin destruction
log "=========================================="
log "PHASE 1: Destroying project files"
log "=========================================="

if [[ -d "$PROJECT_PATH" ]]; then
    # Calculate size before destruction
    local size=$(du -sh "$PROJECT_PATH" 2>/dev/null | awk '{print $1}')
    log "Project size: $size"
    
    # Destroy sensitive files first
    log "Destroying sensitive files..."
    
    SENSITIVE_PATTERNS=(
        "*.js"
        "*.json"
        "*.env"
        ".git"
        "node_modules"
        "routes"
        "security"
    )
    
    for pattern in "${SENSITIVE_PATTERNS[@]}"; do
        find "$PROJECT_PATH" -name "$pattern" -type f 2>/dev/null | while read -r file; do
            secure_delete_file "$file"
        done
        
        find "$PROJECT_PATH" -name "$pattern" -type d 2>/dev/null | while read -r dir; do
            secure_delete_directory "$dir"
        done
    done
    
    # Destroy entire project directory
    log "Destroying entire project directory..."
    secure_delete_directory "$PROJECT_PATH"
    
    log "Project directory destroyed: $PROJECT_PATH"
else
    log "Project directory not found: $PROJECT_PATH"
fi

# Phase 2: Clean up guardian files
log "=========================================="
log "PHASE 2: Cleaning up guardian files"
log "=========================================="

# Remove encryption keys
if [[ -f "$STATE_DIR/encryption.key" ]]; then
    log "Destroying encryption key..."
    secure_delete_file "$STATE_DIR/encryption.key"
fi

# Clear key from memory
if [[ -d /dev/shm/guardian-keys ]]; then
    log "Clearing keys from memory..."
    find /dev/shm/guardian-keys -type f -exec shred -vfz -n 3 {} \; 2>/dev/null || true
    umount /dev/shm/guardian-keys 2>/dev/null || true
    rm -rf /dev/shm/guardian-keys
fi

# Remove fingerprints and baselines
log "Removing fingerprints and baselines..."
rm -f "$STATE_DIR/fingerprint.json"
rm -f "$STATE_DIR/shadow.baseline"
rm -f "$STATE_DIR/last_timestamp"

# Phase 3: Disable services
log "=========================================="
log "PHASE 3: Disabling guardian services"
log "=========================================="

for service in "${SERVICES[@]}"; do
    if systemctl list-unit-files | grep -q "^$service.service"; then
        log "Disabling service: $service"
        systemctl disable "$service" 2>/dev/null || true
        rm -f "/etc/systemd/system/$service.service"
    fi
done

systemctl daemon-reload 2>/dev/null || true

# Phase 4: Remove cron jobs
log "=========================================="
log "PHASE 4: Removing cron jobs"
log "=========================================="

if [[ -f /etc/cron.d/project-guardian ]]; then
    log "Removing guardian cron job..."
    rm -f /etc/cron.d/project-guardian
fi

# Phase 5: Remove auditd rules
log "=========================================="
log "PHASE 5: Removing auditd rules"
log "=========================================="

if [[ -f /etc/audit/rules.d/guardian.rules ]]; then
    log "Removing guardian audit rules..."
    rm -f /etc/audit/rules.d/guardian.rules
    service auditd restart 2>/dev/null || true
fi

# Phase 6: Clean up scripts (optional - leave for forensics)
log "=========================================="
log "PHASE 6: Cleanup complete"
log "=========================================="

# Create destruction marker
log "Creating destruction marker..."
cat > "$MARKER_FILE" <<EOF
PROJECT DESTROYED
==================
Timestamp: $(date)
Reason: $REASON
Hostname: $(hostname)
Machine ID: $(cat /etc/machine-id 2>/dev/null || echo 'unknown')

This project has been automatically destroyed by the guardian security system.
EOF

chmod 644 "$MARKER_FILE"

# Final log
log "=========================================="
log "DESTRUCTION COMPLETE"
log "=========================================="
log "The project has been completely destroyed."
log "Destruction log: $DESTRUCTION_LOG"
log "Marker file: $MARKER_FILE"
log "Reason: $REASON"
log "=========================================="

# Display message to any active terminals
wall "SECURITY ALERT: Project has been destroyed due to: $REASON" 2>/dev/null || true

# Optionally, send notification (if configured)
if [[ -f "$CONFIG_DIR/notification_url" ]]; then
    NOTIFICATION_URL=$(cat "$CONFIG_DIR/notification_url")
    log "Sending notification to: $NOTIFICATION_URL"
    
    curl -X POST "$NOTIFICATION_URL" \
        -H "Content-Type: application/json" \
        -d "{\"event\":\"self_destruct\",\"reason\":\"$REASON\",\"hostname\":\"$(hostname)\",\"timestamp\":\"$(date)\"}" \
        2>/dev/null || log "Failed to send notification"
fi

log "Self-destruct sequence completed."

# Exit
exit 0

