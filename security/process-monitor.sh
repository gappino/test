#!/bin/bash
################################################################################
# Process Monitor - Monitors dangerous commands (backup/copy operations)
################################################################################

set -euo pipefail

# Configuration
CONFIG_DIR="/etc/project-guardian"
LOG_FILE="/var/log/guardian.log"
SELF_DESTRUCT_SCRIPT="/usr/local/bin/self-destruct.sh"

# Dangerous commands to monitor
DANGEROUS_CMDS=(
    "tar"
    "rsync"
    "dd"
    "cp"
    "scp"
    "zip"
    "gzip"
    "bzip2"
    "7z"
    "rar"
    "mysqldump"
    "pg_dump"
    "git"
)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging
log() {
    echo -e "${GREEN}[PROCESS-MONITOR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [PROCESS-MONITOR] $1" >> "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARN] $1" >> "$LOG_FILE"
}

alert() {
    echo -e "${RED}[ALERT]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ALERT] $1" >> "$LOG_FILE"
}

# Load configuration
load_config() {
    if [[ -f "$CONFIG_DIR/config.json" ]]; then
        PROJECT_PATH=$(jq -r '.project_path' "$CONFIG_DIR/config.json")
        ALERT_MODE=$(jq -r '.alert_mode // "destruct"' "$CONFIG_DIR/config.json")
    else
        PROJECT_PATH="/opt/videomakerfree_v2"
        ALERT_MODE="destruct"
    fi
}

# Check if process is accessing project directory
is_accessing_project() {
    local pid="$1"
    local cmd="$2"
    
    # Get process command line
    if [[ ! -f "/proc/$pid/cmdline" ]]; then
        return 1
    fi
    
    local cmdline=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || echo "")
    
    # Check if project path is in command line
    if [[ "$cmdline" == *"$PROJECT_PATH"* ]]; then
        return 0
    fi
    
    # Check open files
    if [[ -d "/proc/$pid/fd" ]]; then
        local open_files=$(ls -l /proc/$pid/fd 2>/dev/null | grep "$PROJECT_PATH" || true)
        if [[ -n "$open_files" ]]; then
            return 0
        fi
    fi
    
    # Check current working directory
    if [[ -L "/proc/$pid/cwd" ]]; then
        local cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null || echo "")
        if [[ "$cwd" == "$PROJECT_PATH"* ]]; then
            return 0
        fi
    fi
    
    return 1
}

# Check if process should be whitelisted
is_whitelisted() {
    local pid="$1"
    local cmd="$2"
    
    # Get parent process
    local ppid=$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ')
    
    # Whitelist our own scripts
    if [[ -n "$ppid" ]]; then
        local parent_cmd=$(ps -o comm= -p "$ppid" 2>/dev/null || echo "")
        if [[ "$parent_cmd" == "project-guardian" ]] || \
           [[ "$parent_cmd" == "guardian-main" ]] || \
           [[ "$parent_cmd" == "encryption-manager" ]]; then
            return 0
        fi
    fi
    
    # Whitelist system backup processes that don't touch project
    local cmdline=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || echo "")
    if [[ "$cmdline" == *"/var/backups"* ]] || \
       [[ "$cmdline" == *"/var/log"* ]] || \
       [[ "$cmdline" == *"/etc/backup"* ]]; then
        if [[ "$cmdline" != *"$PROJECT_PATH"* ]]; then
            return 0
        fi
    fi
    
    return 1
}

# Trigger alert
trigger_alert() {
    local reason="$1"
    local pid="$2"
    local cmd="$3"
    
    alert "SECURITY BREACH DETECTED!"
    alert "Reason: $reason"
    alert "PID: $pid"
    alert "Command: $cmd"
    alert "Project Path: $PROJECT_PATH"
    
    # Get process details
    if [[ -f "/proc/$pid/cmdline" ]]; then
        local cmdline=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || echo "")
        alert "Full Command: $cmdline"
    fi
    
    if [[ "$ALERT_MODE" == "destruct" ]]; then
        alert "Initiating self-destruct sequence..."
        
        # Kill the suspicious process first
        kill -9 "$pid" 2>/dev/null || true
        
        # Execute self-destruct
        if [[ -x "$SELF_DESTRUCT_SCRIPT" ]]; then
            "$SELF_DESTRUCT_SCRIPT" "Process Monitor: $reason (PID: $pid, CMD: $cmd)" &
        else
            alert "Self-destruct script not found or not executable!"
        fi
    else
        warn "Alert mode is not 'destruct'. Logging only."
    fi
}

# Monitor processes
monitor_processes() {
    log "Starting process monitoring..."
    log "Monitoring project path: $PROJECT_PATH"
    
    while true; do
        for cmd in "${DANGEROUS_CMDS[@]}"; do
            # Find all processes with this command
            while read -r pid; do
                [[ -z "$pid" ]] && continue
                
                # Check if whitelisted
                if is_whitelisted "$pid" "$cmd"; then
                    continue
                fi
                
                # Check if accessing project
                if is_accessing_project "$pid" "$cmd"; then
                    trigger_alert "Dangerous command '$cmd' detected accessing project directory" "$pid" "$cmd"
                    sleep 2  # Give self-destruct time to start
                    exit 0
                fi
            done < <(pgrep -x "$cmd" 2>/dev/null || true)
        done
        
        # Check every 2 seconds
        sleep 2
    done
}

# Check for specific backup patterns
check_backup_patterns() {
    log "Checking for backup patterns..."
    
    # Check for archive files being created in suspicious locations
    find /tmp /home /root -name "*.tar.gz" -o -name "*.tar" -o -name "*.zip" \
        -newer /var/lib/project-guardian/last-check 2>/dev/null | while read -r archive; do
        
        # Check if archive contains project files
        if tar -tzf "$archive" 2>/dev/null | grep -q "$PROJECT_PATH" 2>/dev/null || \
           unzip -l "$archive" 2>/dev/null | grep -q "$PROJECT_PATH" 2>/dev/null; then
            
            alert "Backup archive detected: $archive"
            trigger_alert "Backup archive containing project files found" "0" "archive: $archive"
            return
        fi
    done
    
    # Update last check timestamp
    touch /var/lib/project-guardian/last-check
}

# Main function
main() {
    local action="${1:-monitor}"
    
    # Create log directory if not exists
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    chmod 640 "$LOG_FILE"
    
    # Load configuration
    load_config
    
    case "$action" in
        monitor)
            monitor_processes
            ;;
        check-backups)
            check_backup_patterns
            ;;
        test)
            log "Testing process monitor (safe mode)"
            ALERT_MODE="log"
            monitor_processes
            ;;
        *)
            echo "Usage: $0 {monitor|check-backups|test}"
            exit 1
            ;;
    esac
}

# Handle signals gracefully
trap 'log "Process monitor stopped"; exit 0' SIGTERM SIGINT

main "$@"

