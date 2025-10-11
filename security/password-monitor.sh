#!/bin/bash
################################################################################
# Password Monitor - Detects password changes on the system
################################################################################

set -euo pipefail

# Configuration
CONFIG_DIR="/etc/project-guardian"
STATE_DIR="/var/lib/project-guardian"
LOG_FILE="/var/log/guardian.log"
SELF_DESTRUCT_SCRIPT="/usr/local/bin/self-destruct.sh"
SHADOW_BASELINE="$STATE_DIR/shadow.baseline"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging
log() {
    echo -e "${GREEN}[PASSWORD-MONITOR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [PASSWORD-MONITOR] $1" >> "$LOG_FILE"
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
        ALERT_MODE=$(jq -r '.alert_mode // "destruct"' "$CONFIG_DIR/config.json")
        MONITOR_USERS=$(jq -r '.monitor_password_users // "all"' "$CONFIG_DIR/config.json")
    else
        ALERT_MODE="destruct"
        MONITOR_USERS="all"
    fi
}

# Create baseline of current passwords
create_baseline() {
    log "Creating password baseline..."
    
    mkdir -p "$STATE_DIR"
    chmod 700 "$STATE_DIR"
    
    # Store hash of /etc/shadow
    if [[ -r /etc/shadow ]]; then
        sha256sum /etc/shadow > "$SHADOW_BASELINE"
        chmod 600 "$SHADOW_BASELINE"
        
        # Also store individual user hashes for detailed tracking
        awk -F: '{print $1":"$2}' /etc/shadow > "$SHADOW_BASELINE.users"
        chmod 600 "$SHADOW_BASELINE.users"
        
        log "Password baseline created successfully"
    else
        alert "Cannot read /etc/shadow! Need root privileges."
        exit 1
    fi
}

# Check for password changes
check_passwords() {
    if [[ ! -f "$SHADOW_BASELINE" ]]; then
        warn "No baseline found. Creating one now..."
        create_baseline
        return
    fi
    
    # Get current shadow hash
    local current_hash=$(sha256sum /etc/shadow | awk '{print $1}')
    local baseline_hash=$(awk '{print $1}' "$SHADOW_BASELINE")
    
    # If hashes match, no changes
    if [[ "$current_hash" == "$baseline_hash" ]]; then
        return 0
    fi
    
    log "Password file has changed! Checking details..."
    
    # Compare user by user
    local changed_users=""
    
    while IFS=: read -r user hash; do
        local current_user_hash=$(awk -F: -v u="$user" '$1==u {print $2}' /etc/shadow)
        
        if [[ "$current_user_hash" != "$hash" ]]; then
            changed_users="$changed_users $user"
            alert "Password changed for user: $user"
        fi
    done < "$SHADOW_BASELINE.users"
    
    # Check for new users
    local new_users=""
    while IFS=: read -r user _; do
        if ! grep -q "^$user:" "$SHADOW_BASELINE.users"; then
            new_users="$new_users $user"
            alert "New user detected: $user"
        fi
    done < /etc/shadow
    
    # Trigger self-destruct
    if [[ -n "$changed_users" ]] || [[ -n "$new_users" ]]; then
        trigger_alert "Password changes detected" "$changed_users $new_users"
    fi
}

# Monitor password changes in real-time
monitor_passwords() {
    log "Starting password monitoring..."
    log "Monitoring mode: $ALERT_MODE"
    
    # Create baseline if doesn't exist
    if [[ ! -f "$SHADOW_BASELINE" ]]; then
        create_baseline
    fi
    
    # Use inotify to watch /etc/shadow
    if command -v inotifywait &> /dev/null; then
        log "Using inotify for real-time monitoring..."
        
        inotifywait -m -e modify,attrib /etc/shadow 2>/dev/null | while read -r path action file; do
            log "Detected change in /etc/shadow"
            sleep 1  # Give time for write to complete
            check_passwords
        done
    else
        # Fallback to polling
        warn "inotifywait not available, using polling mode..."
        
        while true; do
            check_passwords
            sleep 10  # Check every 10 seconds
        done
    fi
}

# Monitor auth attempts
monitor_auth_logs() {
    log "Monitoring authentication logs..."
    
    # Watch for password change commands
    if [[ -f /var/log/auth.log ]]; then
        tail -F /var/log/auth.log 2>/dev/null | while read -r line; do
            if echo "$line" | grep -qE "passwd|chpasswd|usermod.*-p"; then
                warn "Password change command detected in auth log"
                alert "Auth log: $line"
                sleep 2
                check_passwords
            fi
        done
    fi
}

# Trigger alert
trigger_alert() {
    local reason="$1"
    local users="$2"
    
    alert "PASSWORD SECURITY BREACH!"
    alert "Reason: $reason"
    alert "Affected users: $users"
    
    # Log who made the change
    local last_login=$(last -n 5 | head -10)
    alert "Recent logins:"
    echo "$last_login" | while read -r line; do
        alert "  $line"
    done
    
    # Log current sessions
    local current_sessions=$(w -h)
    alert "Current sessions:"
    echo "$current_sessions" | while read -r line; do
        alert "  $line"
    done
    
    if [[ "$ALERT_MODE" == "destruct" ]]; then
        alert "Initiating self-destruct sequence..."
        
        if [[ -x "$SELF_DESTRUCT_SCRIPT" ]]; then
            "$SELF_DESTRUCT_SCRIPT" "Password Monitor: $reason (Users: $users)" &
        fi
    else
        warn "Alert mode is not 'destruct'. Logging only."
    fi
}

# Check for suspicious user modifications
check_user_modifications() {
    log "Checking for user account modifications..."
    
    # Check for new sudo users
    local sudo_users=$(getent group sudo | cut -d: -f4)
    local stored_sudo_users=""
    
    if [[ -f "$STATE_DIR/sudo_users.baseline" ]]; then
        stored_sudo_users=$(cat "$STATE_DIR/sudo_users.baseline")
        
        if [[ "$sudo_users" != "$stored_sudo_users" ]]; then
            alert "Sudo group membership changed!"
            alert "Previous: $stored_sudo_users"
            alert "Current: $sudo_users"
            trigger_alert "Sudo group modified" "sudo"
        fi
    else
        echo "$sudo_users" > "$STATE_DIR/sudo_users.baseline"
    fi
    
    # Check for new root-equivalent users (UID 0)
    local root_users=$(awk -F: '$3 == 0 {print $1}' /etc/passwd)
    if [[ $(echo "$root_users" | wc -l) -gt 1 ]]; then
        alert "Multiple UID 0 users detected: $root_users"
        trigger_alert "Multiple root users detected" "$root_users"
    fi
}

# Main function
main() {
    local action="${1:-monitor}"
    
    # Create directories
    mkdir -p "$STATE_DIR" "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    chmod 640 "$LOG_FILE"
    
    # Load configuration
    load_config
    
    case "$action" in
        baseline)
            create_baseline
            ;;
        check)
            check_passwords
            check_user_modifications
            ;;
        monitor)
            monitor_passwords
            ;;
        monitor-auth)
            monitor_auth_logs
            ;;
        test)
            log "Testing password monitor (safe mode)"
            ALERT_MODE="log"
            check_passwords
            ;;
        *)
            echo "Usage: $0 {baseline|check|monitor|monitor-auth|test}"
            exit 1
            ;;
    esac
}

# Handle signals
trap 'log "Password monitor stopped"; exit 0' SIGTERM SIGINT

main "$@"

