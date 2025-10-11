#!/bin/bash
################################################################################
# Security System Test Suite
# Tests various security scenarios
################################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/opt/videomakerfree_v2"
LOG_FILE="/var/log/guardian-test.log"

log() {
    echo -e "${BLUE}[TEST]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [TEST] $1" >> "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

fail() {
    echo -e "${RED}[✗]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Test 1: Check if all services are running
test_services() {
    log "Test 1: Checking if all guardian services are running..."
    
    local services=(
        "guardian-main"
        "guardian-backup"
        "guardian-process"
        "guardian-files"
    )
    
    local all_running=true
    
    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service"; then
            success "$service is running"
        else
            fail "$service is NOT running"
            all_running=false
        fi
    done
    
    if $all_running; then
        success "All services are running"
        return 0
    else
        fail "Some services are not running"
        return 1
    fi
}

# Test 2: Check file encryption
test_encryption() {
    log "Test 2: Checking file encryption..."
    
    local encrypted_count=$(find "$PROJECT_DIR" -name "*.encrypted" 2>/dev/null | wc -l)
    
    if [[ $encrypted_count -gt 0 ]]; then
        success "Found $encrypted_count encrypted files"
        return 0
    else
        warn "No encrypted files found (this may be normal if files are decrypted)"
        return 0
    fi
}

# Test 3: Check fingerprint
test_fingerprint() {
    log "Test 3: Verifying hardware fingerprint..."
    
    if /usr/local/bin/snapshot-detector.sh check; then
        success "Fingerprint verification passed"
        return 0
    else
        fail "Fingerprint verification failed"
        return 1
    fi
}

# Test 4: Check password baseline
test_password_baseline() {
    log "Test 4: Checking password baseline..."
    
    if [[ -f /var/lib/project-guardian/shadow.baseline ]]; then
        success "Password baseline exists"
        
        if /usr/local/bin/password-monitor.sh check; then
            success "Password check passed"
            return 0
        else
            fail "Password check failed"
            return 1
        fi
    else
        warn "Password baseline not found"
        return 0
    fi
}

# Test 5: Simulate suspicious activity (SAFE MODE)
test_process_detection() {
    log "Test 5: Testing process detection (safe mode)..."
    
    warn "This test will create a harmless file to test monitoring"
    warn "The guardian should detect this in logs but not trigger destruction"
    
    # Create a test file
    local test_file="/tmp/test_guardian_$(date +%s).txt"
    echo "test" > "$test_file"
    
    success "Test file created: $test_file"
    
    # Clean up
    rm -f "$test_file"
    
    success "Process detection test complete (check logs for activity)"
    return 0
}

# Test 6: Check audit rules
test_audit_rules() {
    log "Test 6: Checking audit rules..."
    
    if auditctl -l | grep -q "guardian"; then
        success "Guardian audit rules are loaded"
        return 0
    else
        warn "No guardian audit rules found"
        return 0
    fi
}

# Test 7: Check cron jobs
test_cron_jobs() {
    log "Test 7: Checking cron jobs..."
    
    if [[ -f /etc/cron.d/project-guardian ]]; then
        success "Guardian cron job exists"
        return 0
    else
        fail "Guardian cron job not found"
        return 1
    fi
}

# Test 8: Check configuration
test_configuration() {
    log "Test 8: Checking configuration..."
    
    if [[ -f /etc/project-guardian/config.json ]]; then
        if jq empty /etc/project-guardian/config.json 2>/dev/null; then
            success "Configuration file is valid JSON"
            return 0
        else
            fail "Configuration file is invalid JSON"
            return 1
        fi
    else
        fail "Configuration file not found"
        return 1
    fi
}

# Test 9: Check log files
test_logs() {
    log "Test 9: Checking log files..."
    
    if [[ -f /var/log/guardian.log ]]; then
        local log_size=$(stat -c%s /var/log/guardian.log)
        success "Guardian log exists (size: $log_size bytes)"
        
        log "Recent log entries:"
        tail -5 /var/log/guardian.log | while read -r line; do
            echo "  $line"
        done
        
        return 0
    else
        warn "Guardian log not found"
        return 0
    fi
}

# Test 10: Check self-destruct script
test_self_destruct() {
    log "Test 10: Checking self-destruct script..."
    
    if [[ -x /usr/local/bin/self-destruct.sh ]]; then
        success "Self-destruct script exists and is executable"
        warn "Self-destruct test will NOT be executed (dangerous!)"
        return 0
    else
        fail "Self-destruct script not found or not executable"
        return 1
    fi
}

# Display system status
display_status() {
    echo ""
    echo "=========================================="
    echo "  Guardian System Status"
    echo "=========================================="
    echo ""
    
    /usr/local/bin/project-guardian.sh status 2>/dev/null || warn "Could not get detailed status"
    
    echo ""
}

# Run all tests
run_all_tests() {
    echo "=========================================="
    echo "  Guardian Security System Test Suite"
    echo "=========================================="
    echo ""
    
    local total_tests=10
    local passed_tests=0
    
    test_services && passed_tests=$((passed_tests + 1))
    echo ""
    
    test_encryption && passed_tests=$((passed_tests + 1))
    echo ""
    
    test_fingerprint && passed_tests=$((passed_tests + 1))
    echo ""
    
    test_password_baseline && passed_tests=$((passed_tests + 1))
    echo ""
    
    test_process_detection && passed_tests=$((passed_tests + 1))
    echo ""
    
    test_audit_rules && passed_tests=$((passed_tests + 1))
    echo ""
    
    test_cron_jobs && passed_tests=$((passed_tests + 1))
    echo ""
    
    test_configuration && passed_tests=$((passed_tests + 1))
    echo ""
    
    test_logs && passed_tests=$((passed_tests + 1))
    echo ""
    
    test_self_destruct && passed_tests=$((passed_tests + 1))
    echo ""
    
    echo "=========================================="
    echo "  Test Results: $passed_tests/$total_tests passed"
    echo "=========================================="
    
    if [[ $passed_tests -eq $total_tests ]]; then
        success "All tests passed!"
    elif [[ $passed_tests -ge $((total_tests * 80 / 100)) ]]; then
        warn "Most tests passed (${passed_tests}/${total_tests})"
    else
        fail "Many tests failed (${passed_tests}/${total_tests})"
    fi
    
    display_status
}

# Main
main() {
    local test_type="${1:-all}"
    
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    case "$test_type" in
        all)
            run_all_tests
            ;;
        services)
            test_services
            ;;
        encryption)
            test_encryption
            ;;
        fingerprint)
            test_fingerprint
            ;;
        password)
            test_password_baseline
            ;;
        process)
            test_process_detection
            ;;
        audit)
            test_audit_rules
            ;;
        cron)
            test_cron_jobs
            ;;
        config)
            test_configuration
            ;;
        logs)
            test_logs
            ;;
        status)
            display_status
            ;;
        *)
            echo "Usage: $0 {all|services|encryption|fingerprint|password|process|audit|cron|config|logs|status}"
            exit 1
            ;;
    esac
}

main "$@"

