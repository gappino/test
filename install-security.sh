#!/bin/bash
################################################################################
# Security System Installer
# This script installs and configures the complete security system
################################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}"
SECURITY_DIR="${SCRIPT_DIR}/security"

# Installation paths
BIN_DIR="/usr/local/bin"
SYSTEMD_DIR="/etc/systemd/system"
CONFIG_DIR="/etc/project-guardian"
STATE_DIR="/var/lib/project-guardian"
AUDIT_DIR="/etc/audit/rules.d"
CRON_DIR="/etc/cron.d"

# Logging functions
log() {
    echo -e "${GREEN}[INSTALL]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root!"
        exit 1
    fi
}

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    local missing_deps=()
    
    # Required packages
    local required=(
        "jq"
        "openssl"
        "inotify-tools"
        "auditd"
        "bc"
        "curl"
        "lsof"
        "dmidecode"
    )
    
    for pkg in "${required[@]}"; do
        if ! command -v "$pkg" &> /dev/null; then
            missing_deps+=("$pkg")
        fi
    done
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        warn "Missing dependencies: ${missing_deps[*]}"
        log "Installing dependencies..."
        
        apt-get update -qq
        apt-get install -y "${missing_deps[@]}"
    fi
    
    log "All dependencies satisfied"
}

# Install scripts
install_scripts() {
    log "Installing security scripts..."
    
    local scripts=(
        "encryption-manager.sh"
        "process-monitor.sh"
        "file-access-monitor.sh"
        "password-monitor.sh"
        "snapshot-detector.sh"
        "self-destruct.sh"
        "project-guardian.sh"
        "check-services.sh"
        "hidden-watchdog.sh"
        "enable-protection.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [[ -f "$SECURITY_DIR/$script" ]]; then
            info "  Installing: $script"
            cp "$SECURITY_DIR/$script" "$BIN_DIR/"
            chmod 755 "$BIN_DIR/$script"
        else
            error "  Script not found: $script"
            exit 1
        fi
    done
    
    # Install hidden watchdog with disguised name
    info "  Installing hidden watchdog..."
    cp "$BIN_DIR/hidden-watchdog.sh" "$BIN_DIR/.systemd-timesyncd-helper"
    chmod 755 "$BIN_DIR/.systemd-timesyncd-helper"
    
    log "Scripts installed successfully"
}

# Install systemd services
install_services() {
    log "Installing systemd services..."
    
    local services=(
        "guardian-main.service"
        "guardian-backup.service"
        "guardian-process.service"
        "guardian-files.service"
        "project-app.service"
    )
    
    for service in "${services[@]}"; do
        if [[ -f "$SECURITY_DIR/systemd/$service" ]]; then
            info "  Installing: $service"
            cp "$SECURITY_DIR/systemd/$service" "$SYSTEMD_DIR/"
            chmod 644 "$SYSTEMD_DIR/$service"
        else
            error "  Service file not found: $service"
            exit 1
        fi
    done
    
    # Reload systemd
    systemctl daemon-reload
    
    log "Services installed successfully"
}

# Install configuration
install_config() {
    log "Installing configuration..."
    
    mkdir -p "$CONFIG_DIR"
    chmod 700 "$CONFIG_DIR"
    
    # Update project path in config and set to SAFE MODE initially
    local config_file="$SECURITY_DIR/config/config.json"
    if [[ -f "$config_file" ]]; then
        # Replace project path with actual path and set to LOG mode (safe)
        jq --arg path "$PROJECT_DIR" \
           '.project_path = $path | .alert_mode = "log"' \
           "$config_file" > "$CONFIG_DIR/config.json"
        chmod 600 "$CONFIG_DIR/config.json"
        
        log "Configuration installed: $CONFIG_DIR/config.json"
        warn "System installed in SAFE MODE (log only)"
        warn "To enable full protection, run: enable-protection.sh"
    else
        error "Config file not found: $config_file"
        exit 1
    fi
    
    # Create state directory
    mkdir -p "$STATE_DIR"
    chmod 700 "$STATE_DIR"
    
    log "State directory created: $STATE_DIR"
}

# Install auditd rules
install_audit_rules() {
    log "Installing auditd rules..."
    
    if [[ ! -d "$AUDIT_DIR" ]]; then
        mkdir -p "$AUDIT_DIR"
    fi
    
    if [[ -f "$SECURITY_DIR/auditd/guardian.rules" ]]; then
        # Update paths in audit rules
        sed "s|/opt/videomakerfree_v2|$PROJECT_DIR|g" \
            "$SECURITY_DIR/auditd/guardian.rules" > "$AUDIT_DIR/guardian.rules"
        chmod 640 "$AUDIT_DIR/guardian.rules"
        
        # Reload audit rules
        if systemctl is-active --quiet auditd; then
            augenrules --load || service auditd restart
        else
            systemctl start auditd
        fi
        
        log "Audit rules installed and loaded"
    else
        warn "Audit rules file not found, skipping..."
    fi
}

# Install cron jobs
install_cron() {
    log "Installing cron jobs..."
    
    if [[ -f "$SECURITY_DIR/cron/project-guardian" ]]; then
        cp "$SECURITY_DIR/cron/project-guardian" "$CRON_DIR/project-guardian"
        chmod 644 "$CRON_DIR/project-guardian"
        
        log "Cron jobs installed"
    else
        warn "Cron file not found, skipping..."
    fi
}

# Generate encryption key
generate_encryption_key() {
    log "Generating encryption key..."
    
    "$BIN_DIR/encryption-manager.sh" generate
    
    log "Encryption key generated"
}

# Encrypt sensitive files
encrypt_files() {
    log "Encrypting sensitive files..."
    
    local patterns=$(jq -r '.encrypted_files[]' "$CONFIG_DIR/config.json")
    
    echo "$patterns" | while read -r pattern; do
        info "  Encrypting pattern: $pattern"
        "$BIN_DIR/encryption-manager.sh" encrypt-pattern "$pattern" "$PROJECT_DIR" || true
    done
    
    log "File encryption complete"
}

# Generate fingerprint
generate_fingerprint() {
    log "Generating hardware fingerprint..."
    
    "$BIN_DIR/snapshot-detector.sh" generate
    
    log "Fingerprint generated"
}

# Create password baseline
create_password_baseline() {
    log "Creating password baseline..."
    
    "$BIN_DIR/password-monitor.sh" baseline
    
    log "Password baseline created"
}

# Enable and start services
enable_services() {
    log "Enabling and starting services..."
    
    local services=(
        "guardian-process"
        "guardian-files"
        "guardian-backup"
        "guardian-main"
    )
    
    for service in "${services[@]}"; do
        info "  Enabling: $service"
        systemctl enable "$service"
        
        info "  Starting: $service"
        systemctl start "$service"
        
        # Verify it started
        if systemctl is-active --quiet "$service"; then
            info "  ✓ $service is running"
        else
            error "  ✗ $service failed to start"
            systemctl status "$service" --no-pager || true
        fi
    done
    
    log "Services enabled and started"
}

# Display summary
display_summary() {
    echo ""
    echo "=========================================="
    echo "  Security System Installation Complete"
    echo "=========================================="
    echo ""
    echo "Project Path: $PROJECT_DIR"
    echo "Configuration: $CONFIG_DIR/config.json"
    echo "State Directory: $STATE_DIR"
    echo "Logs: /var/log/guardian.log"
    echo ""
    echo "Services Status:"
    systemctl status guardian-main --no-pager -l | grep Active || true
    systemctl status guardian-backup --no-pager -l | grep Active || true
    systemctl status guardian-process --no-pager -l | grep Active || true
    systemctl status guardian-files --no-pager -l | grep Active || true
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT ⚠️${NC}"
    echo ""
    echo -e "System is in ${GREEN}SAFE MODE${NC} (monitoring only)"
    echo "No files will be deleted, only logged."
    echo ""
    echo "To enable FULL PROTECTION (destruction on breach):"
    echo -e "  ${GREEN}/usr/local/bin/enable-protection.sh${NC}"
    echo ""
    echo "Useful commands:"
    echo "  Status:  /usr/local/bin/project-guardian.sh status"
    echo "  Logs:    tail -f /var/log/guardian.log"
    echo "  Test:    $PROJECT_DIR/security/test-security.sh all"
    echo ""
    echo "${GREEN}Installation successful!${NC}"
    echo "=========================================="
}

# Create uninstaller
create_uninstaller() {
    log "Creating uninstaller script..."
    
    cat > "$PROJECT_DIR/uninstall-security.sh" <<'EOF'
#!/bin/bash
# Uninstall security system (use with caution!)

echo "WARNING: This will remove all security protections!"
read -p "Are you sure? (yes/no): " confirm

if [[ "$confirm" != "yes" ]]; then
    echo "Uninstall cancelled."
    exit 0
fi

echo "Stopping services..."
systemctl stop guardian-main guardian-backup guardian-process guardian-files 2>/dev/null || true

echo "Disabling services..."
systemctl disable guardian-main guardian-backup guardian-process guardian-files 2>/dev/null || true

echo "Removing service files..."
rm -f /etc/systemd/system/guardian-*.service
rm -f /etc/systemd/system/project-app.service
systemctl daemon-reload

echo "Removing scripts..."
rm -f /usr/local/bin/project-guardian.sh
rm -f /usr/local/bin/process-monitor.sh
rm -f /usr/local/bin/file-access-monitor.sh
rm -f /usr/local/bin/password-monitor.sh
rm -f /usr/local/bin/snapshot-detector.sh
rm -f /usr/local/bin/self-destruct.sh
rm -f /usr/local/bin/encryption-manager.sh
rm -f /usr/local/bin/check-services.sh

echo "Removing configuration..."
rm -rf /etc/project-guardian
rm -rf /var/lib/project-guardian

echo "Removing cron jobs..."
rm -f /etc/cron.d/project-guardian

echo "Removing audit rules..."
rm -f /etc/audit/rules.d/guardian.rules
service auditd restart 2>/dev/null || true

echo "Security system uninstalled."
EOF
    
    chmod 700 "$PROJECT_DIR/uninstall-security.sh"
    
    info "Uninstaller created: $PROJECT_DIR/uninstall-security.sh"
}

# Test mode
test_installation() {
    log "Running installation tests..."
    
    # Check if all scripts are executable
    info "Testing scripts..."
    "$BIN_DIR/project-guardian.sh" check || true
    
    # Check if services can start
    info "Testing services..."
    for service in guardian-main guardian-backup guardian-process guardian-files; do
        if systemctl is-active --quiet "$service"; then
            info "  ✓ $service is active"
        else
            warn "  ✗ $service is not active"
        fi
    done
    
    log "Tests complete"
}

# Main installation
main() {
    echo "=========================================="
    echo "  Project Guardian Security System"
    echo "  Installation Script"
    echo "=========================================="
    echo ""
    
    # Check prerequisites
    check_root
    check_dependencies
    
    # Confirm installation
    warn "This will install a comprehensive security system."
    warn "The system will monitor and protect: $PROJECT_DIR"
    echo ""
    read -p "Continue with installation? (yes/no): " confirm
    
    if [[ "$confirm" != "yes" ]]; then
        log "Installation cancelled."
        exit 0
    fi
    
    echo ""
    log "Starting installation..."
    echo ""
    
    # Install components
    install_scripts
    install_services
    install_config
    install_audit_rules
    install_cron
    
    # Setup security
    generate_encryption_key
    encrypt_files
    generate_fingerprint
    create_password_baseline
    
    # Enable services
    enable_services
    
    # Finalize
    create_uninstaller
    test_installation
    
    # Display summary
    display_summary
}

# Run main
main "$@"

