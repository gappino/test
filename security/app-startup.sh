#!/bin/bash
################################################################################
# Application Startup Script
# Decrypts files and starts the application
################################################################################

set -euo pipefail

# Paths
PROJECT_DIR="/opt/videomakerfree_v2"
CONFIG_DIR="/etc/project-guardian"
ENCRYPTION_MANAGER="/usr/local/bin/encryption-manager.sh"
LOG_FILE="/var/log/guardian.log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [APP-STARTUP] $1" >> "$LOG_FILE"
    echo "[APP-STARTUP] $1"
}

error() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [APP-STARTUP ERROR] $1" >> "$LOG_FILE"
    echo "[ERROR] $1" >&2
}

# Check if guardian is running
if ! systemctl is-active --quiet guardian-main.service; then
    error "Guardian service is not running! Refusing to start application."
    exit 1
fi

log "Starting application startup sequence..."

# Decrypt files if needed
if [[ -f "$CONFIG_DIR/config.json" ]]; then
    log "Decrypting sensitive files..."
    
    # Get patterns from config
    patterns=$(jq -r '.encrypted_files[]' "$CONFIG_DIR/config.json" 2>/dev/null || echo "")
    
    if [[ -n "$patterns" ]]; then
        echo "$patterns" | while read -r pattern; do
            log "Decrypting pattern: $pattern"
            "$ENCRYPTION_MANAGER" decrypt-pattern "$pattern" "$PROJECT_DIR" 2>&1 | tee -a "$LOG_FILE" || {
                error "Failed to decrypt: $pattern"
                exit 1
            }
        done
    fi
    
    log "Decryption complete"
else
    log "No configuration found, skipping decryption"
fi

# Change to project directory
cd "$PROJECT_DIR" || {
    error "Failed to change to project directory: $PROJECT_DIR"
    exit 1
}

# Verify critical files exist
log "Verifying critical files..."
if [[ ! -f "server.js" ]]; then
    error "server.js not found!"
    exit 1
fi

if [[ ! -f "package.json" ]]; then
    error "package.json not found!"
    exit 1
fi

log "File verification complete"

# Start the application
log "Starting Node.js application..."
exec node server.js

