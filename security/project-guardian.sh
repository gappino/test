#!/bin/bash
################################################################################
# Project Guardian - Main orchestrator for security monitoring
################################################################################

set -euo pipefail

# Configuration
CONFIG_DIR="/etc/project-guardian"
STATE_DIR="/var/lib/project-guardian"
LOG_FILE="/var/log/guardian.log"
SCRIPTS_DIR="/usr/local/bin"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() {
    echo -e "${GREEN}[GUARDIAN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [GUARDIAN] $1" >> "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARN] $1" >> "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" >&2
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $1" >> "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Load configuration
load_config() {
    if [[ -f "$CONFIG_DIR/config.json" ]]; then
        PROJECT_PATH=$(jq -r '.project_path' "$CONFIG_DIR/config.json")
        ALERT_MODE=$(jq -r '.alert_mode // "destruct"' "$CONFIG_DIR/config.json")
        ENABLE_PROCESS_MONITOR=$(jq -r '.enable_process_monitor // true' "$CONFIG_DIR/config.json")
        ENABLE_FILE_MONITOR=$(jq -r '.enable_file_monitor // true' "$CONFIG_DIR/config.json")
        ENABLE_PASSWORD_MONITOR=$(jq -r '.enable_password_monitor // true' "$CONFIG_DIR/config.json")
        ENABLE_SNAPSHOT_DETECTOR=$(jq -r '.enable_snapshot_detector // true' "$CONFIG_DIR/config.json")
    else
        error "Configuration file not found: $CONFIG_DIR/config.json"
        exit 1
    fi
}

# Check if all monitoring services are running
check_services() {
    local services=(
        "guardian-process"
        "guardian-files"
    )
    
    local all_running=true
    
    for service in "${services[@]}"; do
        if ! systemctl is-active --quiet "$service" 2>/dev/null; then
            warn "Service not running: $service"
            all_running=false
            
            # Try to restart
            log "Attempting to restart: $service"
            systemctl restart "$service" 2>/dev/null || {
                error "Failed to restart: $service"
            }
        fi
    done
    
    if $all_running; then
        log "All monitoring services are running"
    fi
}

# Heartbeat function
heartbeat() {
    local heartbeat_file="$STATE_DIR/heartbeat"
    local current_time=$(date +%s)
    
    # Update heartbeat
    echo "$current_time" > "$heartbeat_file"
    
    # Check if other watchdogs are alive
    if [[ -f "$STATE_DIR/backup_heartbeat" ]]; then
        local backup_time=$(cat "$STATE_DIR/backup_heartbeat")
        local diff=$((current_time - backup_time))
        
        if [[ $diff -gt 120 ]]; then
            warn "Backup guardian not responding (${diff}s)"
        fi
    fi
}

# Check system integrity
check_integrity() {
    # Check if project directory exists
    if [[ ! -d "$PROJECT_PATH" ]]; then
        error "Project directory not found: $PROJECT_PATH"
        error "This may indicate the project has been moved or deleted!"
        
        if [[ -f /tmp/project-destroyed ]]; then
            log "Found destruction marker - project was destroyed by guardian"
            exit 0
        fi
        
        # Something suspicious happened
        "$SCRIPTS_DIR/self-destruct.sh" "Project directory disappeared" &
        exit 1
    fi
    
    # Check if critical files exist
    local critical_files=(
        "$PROJECT_PATH/server.js"
        "$PROJECT_PATH/package.json"
    )
    
    for file in "${critical_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            warn "Critical file missing: $file"
        fi
    done
    
    # Check encryption key
    if [[ ! -f "$STATE_DIR/encryption.key" ]]; then
        error "Encryption key missing! Possible tampering detected!"
        "$SCRIPTS_DIR/self-destruct.sh" "Encryption key missing" &
        exit 1
    fi
}

# Monitor system resources
monitor_resources() {
    # Check if system is under heavy load (possible attack)
    local load=$(uptime | awk -F'load average:' '{print $2}' | awk -F',' '{print $1}' | xargs)
    local cpu_count=$(nproc)
    local load_threshold=$((cpu_count * 2))
    
    if (( $(echo "$load > $load_threshold" | bc -l 2>/dev/null || echo 0) )); then
        warn "High system load detected: $load (threshold: $load_threshold)"
    fi
    
    # Check disk space
    local disk_usage=$(df -h "$PROJECT_PATH" | tail -1 | awk '{print $5}' | sed 's/%//')
    if [[ $disk_usage -gt 90 ]]; then
        warn "Disk usage critical: ${disk_usage}%"
    fi
    
    # Check memory
    local mem_available=$(free -m | awk '/^Mem:/ {print $7}')
    if [[ $mem_available -lt 100 ]]; then
        warn "Low memory: ${mem_available}MB available"
    fi
}

# Check for suspicious network activity
check_network() {
    # Check for unusual outbound connections
    local connections=$(netstat -tn 2>/dev/null | grep ESTABLISHED | wc -l)
    
    if [[ $connections -gt 50 ]]; then
        warn "High number of established connections: $connections"
    fi
    
    # Check for data exfiltration (high upload traffic)
    # This is a simple check - could be enhanced
    if command -v vnstat &> /dev/null; then
        local tx_rate=$(vnstat -tr 2>/dev/null | grep tx | awk '{print $2}')
        # Log for monitoring purposes
        log "Current TX rate: $tx_rate"
    fi
}

# Check if we're being debugged
check_debugging() {
    # Check for attached debuggers
    if [[ -f /proc/self/status ]]; then
        local tracer_pid=$(grep TracerPid /proc/self/status | awk '{print $2}')
        if [[ "$tracer_pid" != "0" ]]; then
            error "Debugger detected! TracerPid: $tracer_pid"
            "$SCRIPTS_DIR/self-destruct.sh" "Debugger attached (PID: $tracer_pid)" &
            exit 1
        fi
    fi
    
    # Check for strace/ltrace
    if pgrep -x strace >/dev/null || pgrep -x ltrace >/dev/null; then
        local strace_pids=$(pgrep -x strace || true)
        local ltrace_pids=$(pgrep -x ltrace || true)
        warn "System tracing tools detected: strace($strace_pids) ltrace($ltrace_pids)"
    fi
}

# Verify guardian services integrity
verify_services_integrity() {
    # Check if service files have been modified
    local services=(
        "/etc/systemd/system/guardian-main.service"
        "/etc/systemd/system/guardian-backup.service"
        "/etc/systemd/system/guardian-process.service"
        "/etc/systemd/system/guardian-files.service"
    )
    
    for service_file in "${services[@]}"; do
        if [[ -f "$service_file" ]]; then
            # Check if service file was modified recently
            local mod_time=$(stat -c %Y "$service_file" 2>/dev/null || echo 0)
            local current_time=$(date +%s)
            local diff=$((current_time - mod_time))
            
            if [[ $diff -lt 300 ]]; then
                warn "Service file recently modified: $service_file (${diff}s ago)"
            fi
        else
            error "Service file missing: $service_file"
            "$SCRIPTS_DIR/self-destruct.sh" "Guardian service file deleted: $service_file" &
            exit 1
        fi
    done
}

# Main monitoring loop
main_loop() {
    log "=========================================="
    log "Project Guardian Started"
    log "=========================================="
    log "Project: $PROJECT_PATH"
    log "Alert Mode: $ALERT_MODE"
    log "Process Monitor: $ENABLE_PROCESS_MONITOR"
    log "File Monitor: $ENABLE_FILE_MONITOR"
    log "Password Monitor: $ENABLE_PASSWORD_MONITOR"
    log "Snapshot Detector: $ENABLE_SNAPSHOT_DETECTOR"
    log "=========================================="
    
    # Initial checks
    check_integrity
    check_services
    
    # Main loop
    local iteration=0
    
    while true; do
        iteration=$((iteration + 1))
        
        # Update heartbeat every iteration
        heartbeat
        
        # Every 30 seconds: check services
        if [[ $((iteration % 3)) -eq 0 ]]; then
            check_services
        fi
        
        # Every minute: integrity check
        if [[ $((iteration % 6)) -eq 0 ]]; then
            check_integrity
        fi
        
        # Every 2 minutes: resource monitoring
        if [[ $((iteration % 12)) -eq 0 ]]; then
            monitor_resources
        fi
        
        # Every 5 minutes: comprehensive checks
        if [[ $((iteration % 30)) -eq 0 ]]; then
            log "Running comprehensive security check..."
            check_network
            check_debugging
            verify_services_integrity
            
            # Run snapshot detector
            if [[ "$ENABLE_SNAPSHOT_DETECTOR" == "true" ]]; then
                "$SCRIPTS_DIR/snapshot-detector.sh" check || true
            fi
        fi
        
        # Every 30 minutes: log status
        if [[ $((iteration % 180)) -eq 0 ]]; then
            log "Guardian status: Active and monitoring"
            log "Uptime: $(uptime -p)"
            log "Iterations: $iteration"
        fi
        
        # Sleep for 10 seconds between iterations
        sleep 10
    done
}

# Status report
status() {
    info "=========================================="
    info "Project Guardian Status"
    info "=========================================="
    
    load_config
    
    info "Configuration:"
    info "  Project: $PROJECT_PATH"
    info "  Alert Mode: $ALERT_MODE"
    
    info ""
    info "Services:"
    
    local services=(
        "guardian-main"
        "guardian-backup"
        "guardian-process"
        "guardian-files"
        "project-app"
    )
    
    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service" 2>/dev/null; then
            info "  $service: ${GREEN}RUNNING${NC}"
        else
            info "  $service: ${RED}STOPPED${NC}"
        fi
    done
    
    info ""
    info "Project Status:"
    if [[ -d "$PROJECT_PATH" ]]; then
        info "  Directory: ${GREEN}EXISTS${NC}"
        info "  Size: $(du -sh "$PROJECT_PATH" 2>/dev/null | awk '{print $1}')"
    else
        info "  Directory: ${RED}NOT FOUND${NC}"
    fi
    
    if [[ -f "$STATE_DIR/encryption.key" ]]; then
        info "  Encryption Key: ${GREEN}PRESENT${NC}"
    else
        info "  Encryption Key: ${RED}MISSING${NC}"
    fi
    
    info ""
    info "Recent Logs:"
    tail -10 "$LOG_FILE" 2>/dev/null | while read -r line; do
        info "  $line"
    done
    
    info "=========================================="
}

# Main function
main() {
    local action="${1:-monitor}"
    
    # Create directories
    mkdir -p "$CONFIG_DIR" "$STATE_DIR" "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    chmod 640 "$LOG_FILE"
    
    # Load configuration
    load_config
    
    case "$action" in
        monitor)
            main_loop
            ;;
        check)
            log "Running one-time security check..."
            check_integrity
            check_services
            check_debugging
            log "Security check complete"
            ;;
        status)
            status
            ;;
        test)
            log "Test mode - running checks without enforcement"
            ALERT_MODE="log"
            check_integrity
            check_services
            ;;
        *)
            echo "Usage: $0 {monitor|check|status|test}"
            exit 1
            ;;
    esac
}

# Handle signals
trap 'log "Guardian shutting down..."; exit 0' SIGTERM SIGINT

main "$@"

