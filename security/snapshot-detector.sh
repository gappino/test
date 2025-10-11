#!/bin/bash
################################################################################
# Snapshot Detector - Detects VM snapshot/clone/restore operations
################################################################################

set -euo pipefail

# Configuration
CONFIG_DIR="/etc/project-guardian"
STATE_DIR="/var/lib/project-guardian"
LOG_FILE="/var/log/guardian.log"
SELF_DESTRUCT_SCRIPT="/usr/local/bin/self-destruct.sh"
FINGERPRINT_FILE="$STATE_DIR/fingerprint.json"
TIMESTAMP_FILE="$STATE_DIR/last_timestamp"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging
log() {
    echo -e "${GREEN}[SNAPSHOT-DETECTOR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SNAPSHOT-DETECTOR] $1" >> "$LOG_FILE"
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
        FINGERPRINT_CHECK=$(jq -r '.fingerprint_check // true' "$CONFIG_DIR/config.json")
        TIMESTAMP_CHECK=$(jq -r '.timestamp_check // true' "$CONFIG_DIR/config.json")
    else
        ALERT_MODE="destruct"
        FINGERPRINT_CHECK="true"
        TIMESTAMP_CHECK="true"
    fi
}

# Generate hardware fingerprint
generate_fingerprint() {
    log "Generating hardware fingerprint..."
    
    mkdir -p "$STATE_DIR"
    chmod 700 "$STATE_DIR"
    
    local fingerprint=$(cat <<EOF
{
  "timestamp": "$(date +%s)",
  "hostname": "$(hostname)",
  "machine_id": "$(cat /etc/machine-id 2>/dev/null || echo 'unknown')",
  "boot_id": "$(cat /proc/sys/kernel/random/boot_id 2>/dev/null || echo 'unknown')",
  "cpu_info": "$(grep -m 1 'model name' /proc/cpuinfo | cut -d: -f2 | xargs || echo 'unknown')",
  "cpu_cores": "$(nproc 2>/dev/null || echo 'unknown')",
  "total_memory": "$(free -b | awk '/^Mem:/{print $2}' || echo 'unknown')",
  "mac_addresses": [
    $(ip link show | awk '/link\/ether/ {print "\"" $2 "\""}' | paste -sd,)
  ],
  "disk_uuids": [
    $(blkid | grep -oP 'UUID="[^"]*"' | sed 's/UUID=//' | paste -sd,)
  ],
  "system_uuid": "$(dmidecode -s system-uuid 2>/dev/null || echo 'unknown')",
  "board_serial": "$(dmidecode -s baseboard-serial-number 2>/dev/null || echo 'unknown')",
  "boot_time": "$(uptime -s 2>/dev/null || date)",
  "kernel_version": "$(uname -r)"
}
EOF
)
    
    echo "$fingerprint" > "$FINGERPRINT_FILE"
    chmod 600 "$FINGERPRINT_FILE"
    
    log "Fingerprint generated successfully"
    log "Machine ID: $(jq -r '.machine_id' "$FINGERPRINT_FILE")"
    log "System UUID: $(jq -r '.system_uuid' "$FINGERPRINT_FILE")"
}

# Verify hardware fingerprint
verify_fingerprint() {
    if [[ ! -f "$FINGERPRINT_FILE" ]]; then
        warn "No fingerprint found. Generating one now..."
        generate_fingerprint
        return 0
    fi
    
    log "Verifying hardware fingerprint..."
    
    local stored_machine_id=$(jq -r '.machine_id' "$FINGERPRINT_FILE")
    local current_machine_id=$(cat /etc/machine-id 2>/dev/null || echo 'unknown')
    
    local stored_boot_id=$(jq -r '.boot_id' "$FINGERPRINT_FILE")
    local current_boot_id=$(cat /proc/sys/kernel/random/boot_id 2>/dev/null || echo 'unknown')
    
    local stored_system_uuid=$(jq -r '.system_uuid' "$FINGERPRINT_FILE")
    local current_system_uuid=$(dmidecode -s system-uuid 2>/dev/null || echo 'unknown')
    
    local stored_macs=$(jq -r '.mac_addresses[]' "$FINGERPRINT_FILE" 2>/dev/null | sort)
    local current_macs=$(ip link show | awk '/link\/ether/ {print $2}' | sort)
    
    local stored_cpu=$(jq -r '.cpu_info' "$FINGERPRINT_FILE")
    local current_cpu=$(grep -m 1 'model name' /proc/cpuinfo | cut -d: -f2 | xargs || echo 'unknown')
    
    local changed=0
    local reasons=""
    
    # Check machine ID
    if [[ "$stored_machine_id" != "$current_machine_id" ]] && [[ "$stored_machine_id" != "unknown" ]]; then
        warn "Machine ID changed: $stored_machine_id -> $current_machine_id"
        changed=1
        reasons="$reasons machine_id"
    fi
    
    # Check system UUID
    if [[ "$stored_system_uuid" != "$current_system_uuid" ]] && [[ "$stored_system_uuid" != "unknown" ]]; then
        warn "System UUID changed: $stored_system_uuid -> $current_system_uuid"
        changed=1
        reasons="$reasons system_uuid"
    fi
    
    # Check MAC addresses
    if [[ "$stored_macs" != "$current_macs" ]]; then
        warn "MAC addresses changed"
        warn "Stored: $stored_macs"
        warn "Current: $current_macs"
        changed=1
        reasons="$reasons mac_addresses"
    fi
    
    # Check CPU (less strict, as this might be virtualization artifact)
    if [[ "$stored_cpu" != "$current_cpu" ]] && [[ "$stored_cpu" != "unknown" ]]; then
        warn "CPU info changed: $stored_cpu -> $current_cpu"
        # Don't trigger on CPU alone, but note it
        reasons="$reasons cpu_info(minor)"
    fi
    
    if [[ $changed -eq 1 ]]; then
        trigger_alert "Hardware fingerprint mismatch detected" "Changed:$reasons"
        return 1
    fi
    
    log "Hardware fingerprint verified successfully"
    return 0
}

# Update timestamp
update_timestamp() {
    local current_time=$(date +%s)
    echo "$current_time" > "$TIMESTAMP_FILE"
    chmod 600 "$TIMESTAMP_FILE"
}

# Check for time anomalies
check_timestamp() {
    local current_time=$(date +%s)
    
    if [[ ! -f "$TIMESTAMP_FILE" ]]; then
        log "No previous timestamp found. Creating one..."
        update_timestamp
        return 0
    fi
    
    local last_time=$(cat "$TIMESTAMP_FILE")
    local time_diff=$((current_time - last_time))
    
    log "Time difference: ${time_diff}s"
    
    # If time went backwards
    if [[ $time_diff -lt 0 ]]; then
        alert "Time anomaly: Clock went backwards by ${time_diff}s!"
        trigger_alert "Time travel detected (clock went backwards)" "time_diff=$time_diff"
        return 1
    fi
    
    # If gap is too large (more than 10 minutes)
    # This could indicate a snapshot restore
    if [[ $time_diff -gt 600 ]]; then
        warn "Large time gap detected: ${time_diff}s ($(($time_diff / 60)) minutes)"
        
        # Check if system was actually suspended/hibernated
        local boot_time=$(cat /proc/uptime | awk '{print int($1)}')
        
        if [[ $time_diff -gt $((boot_time + 120)) ]]; then
            alert "Time gap exceeds system uptime - possible snapshot restore!"
            trigger_alert "Suspicious time gap detected" "gap=${time_diff}s, uptime=${boot_time}s"
            return 1
        else
            log "Time gap within acceptable range (system uptime: ${boot_time}s)"
        fi
    fi
    
    # Update timestamp for next check
    update_timestamp
    return 0
}

# Check for cloning indicators
check_clone_indicators() {
    log "Checking for VM clone indicators..."
    
    # Check for duplicate machine-id issues
    local machine_id=$(cat /etc/machine-id 2>/dev/null)
    if [[ -z "$machine_id" ]] || [[ "$machine_id" == "uninitialized" ]]; then
        warn "Machine ID is not initialized - possible clone!"
        return 1
    fi
    
    # Check for VMware clone indicators
    if command -v vmware-toolbox-cmd &> /dev/null; then
        local vm_uuid=$(vmware-toolbox-cmd stat sessionid 2>/dev/null || echo "")
        log "VMware session ID: $vm_uuid"
        
        # Store and compare
        if [[ -f "$STATE_DIR/vm_uuid" ]]; then
            local stored_uuid=$(cat "$STATE_DIR/vm_uuid")
            if [[ "$vm_uuid" != "$stored_uuid" ]] && [[ -n "$vm_uuid" ]]; then
                alert "VMware UUID changed - possible clone!"
                trigger_alert "VMware clone detected" "uuid_changed"
                return 1
            fi
        else
            echo "$vm_uuid" > "$STATE_DIR/vm_uuid"
        fi
    fi
    
    # Check boot ID changes without reboot
    local current_boot_id=$(cat /proc/sys/kernel/random/boot_id 2>/dev/null)
    if [[ -f "$STATE_DIR/boot_id" ]]; then
        local stored_boot_id=$(cat "$STATE_DIR/boot_id")
        if [[ "$current_boot_id" != "$stored_boot_id" ]]; then
            # This is normal after reboot, but check uptime
            local uptime=$(cat /proc/uptime | awk '{print int($1)}')
            if [[ $uptime -gt 300 ]]; then  # System up for more than 5 minutes
                warn "Boot ID changed but system uptime is ${uptime}s"
                # This could be normal, don't trigger yet
            fi
        fi
    fi
    echo "$current_boot_id" > "$STATE_DIR/boot_id"
    
    return 0
}

# Trigger alert
trigger_alert() {
    local reason="$1"
    local details="$2"
    
    alert "VM SNAPSHOT/CLONE DETECTED!"
    alert "Reason: $reason"
    alert "Details: $details"
    
    # Log current system state
    alert "Current machine ID: $(cat /etc/machine-id 2>/dev/null || echo 'unknown')"
    alert "Current boot ID: $(cat /proc/sys/kernel/random/boot_id 2>/dev/null || echo 'unknown')"
    alert "System uptime: $(uptime -p)"
    
    if [[ "$ALERT_MODE" == "destruct" ]]; then
        alert "Initiating self-destruct sequence..."
        
        if [[ -x "$SELF_DESTRUCT_SCRIPT" ]]; then
            "$SELF_DESTRUCT_SCRIPT" "Snapshot Detector: $reason ($details)" &
        fi
    else
        warn "Alert mode is not 'destruct'. Logging only."
    fi
}

# Continuous monitoring
monitor() {
    log "Starting snapshot/clone detection monitoring..."
    
    while true; do
        if [[ "$FINGERPRINT_CHECK" == "true" ]]; then
            verify_fingerprint || true
        fi
        
        if [[ "$TIMESTAMP_CHECK" == "true" ]]; then
            check_timestamp || true
        fi
        
        check_clone_indicators || true
        
        # Check every 5 minutes
        sleep 300
    done
}

# Main function
main() {
    local action="${1:-check}"
    
    # Create directories
    mkdir -p "$STATE_DIR" "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    chmod 640 "$LOG_FILE"
    
    # Load configuration
    load_config
    
    case "$action" in
        generate)
            generate_fingerprint
            update_timestamp
            ;;
        check)
            verify_fingerprint
            check_timestamp
            check_clone_indicators
            ;;
        monitor)
            monitor
            ;;
        test)
            log "Testing snapshot detector (safe mode)"
            ALERT_MODE="log"
            verify_fingerprint
            check_timestamp
            ;;
        *)
            echo "Usage: $0 {generate|check|monitor|test}"
            exit 1
            ;;
    esac
}

# Handle signals
trap 'log "Snapshot detector stopped"; exit 0' SIGTERM SIGINT

main "$@"

