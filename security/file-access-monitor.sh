#!/bin/bash
################################################################################
# File Access Monitor - Uses inotify to monitor file access in real-time
################################################################################

set -euo pipefail

# Configuration
CONFIG_DIR="/etc/project-guardian"
LOG_FILE="/var/log/guardian.log"
SELF_DESTRUCT_SCRIPT="/usr/local/bin/self-destruct.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging
log() {
    echo -e "${GREEN}[FILE-MONITOR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [FILE-MONITOR] $1" >> "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARN] $1" >> "$LOG_FILE"
}

alert() {
    echo -e "${RED}[ALERT]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ALERT] $1" >> "$LOG_FILE"
}

# Check if inotify-tools is installed
check_dependencies() {
    if ! command -v inotifywait &> /dev/null; then
        alert "inotify-tools not installed. Installing..."
        apt-get update -qq && apt-get install -y inotify-tools
    fi
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

# Get process info from inotify event
get_process_info() {
    local file="$1"
    
    # Find processes that have this file open
    local pids=$(lsof "$file" 2>/dev/null | awk 'NR>1 {print $2}' | sort -u)
    
    if [[ -n "$pids" ]]; then
        echo "$pids"
    else
        # Fallback: try to find recent processes
        echo ""
    fi
}

# Check if access is legitimate
is_legitimate_access() {
    local file="$1"
    local event="$2"
    local pid="$3"
    
    # Allow access from our own services
    if [[ -n "$pid" ]]; then
        local cmd=$(ps -o comm= -p "$pid" 2>/dev/null || echo "")
        
        # Whitelist our services
        if [[ "$cmd" == "node" ]] || \
           [[ "$cmd" == "npm" ]] || \
           [[ "$cmd" == "project-guardian"* ]] || \
           [[ "$cmd" == "guardian-"* ]] || \
           [[ "$cmd" == "encryption-manager" ]]; then
            return 0
        fi
        
        # Check parent process
        local ppid=$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ')
        if [[ -n "$ppid" ]]; then
            local parent_cmd=$(ps -o comm= -p "$ppid" 2>/dev/null || echo "")
            if [[ "$parent_cmd" == "systemd" ]] || \
               [[ "$parent_cmd" == "guardian-"* ]]; then
                return 0
            fi
        fi
    fi
    
    # Allow read access to certain file types during normal operation
    if [[ "$event" == "OPEN" ]] || [[ "$event" == "ACCESS" ]]; then
        # Allow reading of non-sensitive files
        if [[ "$file" == *.mp4 ]] || \
           [[ "$file" == *.mp3 ]] || \
           [[ "$file" == *.wav ]] || \
           [[ "$file" == *.jpg ]] || \
           [[ "$file" == *.png ]] || \
           [[ "$file" == *.json ]]; then
            return 0
        fi
    fi
    
    return 1
}

# Trigger alert
trigger_alert() {
    local reason="$1"
    local file="$2"
    local event="$3"
    
    alert "SUSPICIOUS FILE ACCESS DETECTED!"
    alert "Reason: $reason"
    alert "File: $file"
    alert "Event: $event"
    
    # Get process info
    local pids=$(get_process_info "$file")
    if [[ -n "$pids" ]]; then
        alert "Accessing PIDs: $pids"
        for pid in $pids; do
            if [[ -f "/proc/$pid/cmdline" ]]; then
                local cmdline=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || echo "")
                alert "PID $pid Command: $cmdline"
            fi
        done
    fi
    
    if [[ "$ALERT_MODE" == "destruct" ]]; then
        alert "Initiating self-destruct sequence..."
        
        # Kill suspicious processes
        for pid in $pids; do
            kill -9 "$pid" 2>/dev/null || true
        done
        
        # Execute self-destruct
        if [[ -x "$SELF_DESTRUCT_SCRIPT" ]]; then
            "$SELF_DESTRUCT_SCRIPT" "File Monitor: $reason (File: $file, Event: $event)" &
        fi
    else
        warn "Alert mode is not 'destruct'. Logging only."
    fi
}

# Monitor sensitive files
monitor_files() {
    log "Starting file access monitoring..."
    log "Monitoring project path: $PROJECT_PATH"
    
    # Critical files and directories to monitor
    local watch_paths=(
        "$PROJECT_PATH/server.js"
        "$PROJECT_PATH/routes"
        "$PROJECT_PATH/security"
        "$PROJECT_PATH/.env"
        "$PROJECT_PATH/package.json"
    )
    
    # Build inotifywait arguments
    local watch_args=""
    for path in "${watch_paths[@]}"; do
        if [[ -e "$path" ]]; then
            watch_args="$watch_args $path"
        fi
    done
    
    if [[ -z "$watch_args" ]]; then
        warn "No paths to monitor found!"
        return 1
    fi
    
    log "Watching: $watch_args"
    
    # Monitor with inotify
    # Events: open, access, modify, delete, move, attrib
    inotifywait -m -r -e open,access,modify,delete,move,attrib \
        --format '%w%f|%e|%T' --timefmt '%Y-%m-%d %H:%M:%S' \
        $watch_args 2>/dev/null | while IFS='|' read -r file event timestamp; do
        
        # Skip empty events
        [[ -z "$file" ]] && continue
        
        # Get accessing process
        local pids=$(get_process_info "$file")
        local pid="${pids%% *}"  # First PID
        
        # Check if legitimate
        if ! is_legitimate_access "$file" "$event" "$pid"; then
            
            # Special attention to sensitive events
            if [[ "$event" == *"DELETE"* ]] || \
               [[ "$event" == *"MOVE"* ]] || \
               [[ "$event" == *"ATTRIB"* ]]; then
                warn "Suspicious event: $event on $file at $timestamp"
            fi
            
            # Trigger on sensitive file access
            if [[ "$file" == *"/routes/"* ]] || \
               [[ "$file" == *"server.js"* ]] || \
               [[ "$file" == *"security/"* ]] || \
               [[ "$file" == *".env"* ]]; then
                
                if [[ "$event" == *"OPEN"* ]] || [[ "$event" == *"ACCESS"* ]]; then
                    log "Access to sensitive file: $file (Event: $event, PID: $pid)"
                    
                    # Count suspicious accesses
                    local count_file="/tmp/guardian-access-count-$$"
                    echo "1" >> "$count_file"
                    local count=$(wc -l < "$count_file" 2>/dev/null || echo 0)
                    
                    # Trigger if too many accesses in short time
                    if [[ $count -gt 10 ]]; then
                        trigger_alert "Excessive access to sensitive files detected" "$file" "$event"
                        rm -f "$count_file"
                        sleep 2
                        exit 0
                    fi
                    
                    # Reset counter after 60 seconds
                    (sleep 60 && rm -f "$count_file") &
                fi
            fi
        fi
    done
}

# Monitor file integrity
check_integrity() {
    log "Checking file integrity..."
    
    local integrity_file="/var/lib/project-guardian/integrity.sha256"
    
    if [[ ! -f "$integrity_file" ]]; then
        log "Creating baseline integrity checksums..."
        find "$PROJECT_PATH" -type f \( -name "*.js" -o -name "*.json" \) \
            ! -path "*/node_modules/*" \
            ! -path "*/output/*" \
            ! -path "*/uploads/*" \
            -exec sha256sum {} \; > "$integrity_file"
        return
    fi
    
    log "Verifying integrity against baseline..."
    
    # Check for modified files
    local modified=0
    while read -r expected_hash expected_file; do
        if [[ -f "$expected_file" ]]; then
            local current_hash=$(sha256sum "$expected_file" | awk '{print $1}')
            if [[ "$current_hash" != "$expected_hash" ]]; then
                warn "File modified: $expected_file"
                modified=$((modified + 1))
            fi
        else
            warn "File deleted: $expected_file"
            modified=$((modified + 1))
        fi
    done < "$integrity_file"
    
    if [[ $modified -gt 5 ]]; then
        trigger_alert "Multiple file modifications detected ($modified files)" "integrity-check" "MODIFIED"
    elif [[ $modified -gt 0 ]]; then
        warn "$modified file(s) have been modified"
    fi
}

# Main function
main() {
    local action="${1:-monitor}"
    
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    chmod 640 "$LOG_FILE"
    
    # Check dependencies
    check_dependencies
    
    # Load configuration
    load_config
    
    case "$action" in
        monitor)
            monitor_files
            ;;
        integrity)
            check_integrity
            ;;
        test)
            log "Testing file monitor (safe mode)"
            ALERT_MODE="log"
            monitor_files
            ;;
        *)
            echo "Usage: $0 {monitor|integrity|test}"
            exit 1
            ;;
    esac
}

# Handle signals
trap 'log "File monitor stopped"; exit 0' SIGTERM SIGINT

main "$@"

