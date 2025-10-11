#!/bin/bash
################################################################################
# Enable Full Protection Mode
# Switches from SAFE MODE (log only) to FULL PROTECTION (destruct on breach)
################################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

CONFIG_FILE="/etc/project-guardian/config.json"

echo "=========================================="
echo "  Enable Full Protection Mode"
echo "=========================================="
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}Error: This script must be run as root${NC}"
    exit 1
fi

# Check if config exists
if [[ ! -f "$CONFIG_FILE" ]]; then
    echo -e "${RED}Error: Configuration file not found${NC}"
    echo "Is the security system installed?"
    exit 1
fi

# Show current mode
current_mode=$(jq -r '.alert_mode' "$CONFIG_FILE")
echo -e "Current mode: ${YELLOW}$current_mode${NC}"
echo ""

if [[ "$current_mode" == "destruct" ]]; then
    echo -e "${GREEN}Full protection is already enabled!${NC}"
    exit 0
fi

# Warning
echo -e "${RED}⚠️  WARNING ⚠️${NC}"
echo ""
echo "Enabling full protection will activate the following:"
echo ""
echo "  ${RED}▪${NC} Automatic project destruction on security breach"
echo "  ${RED}▪${NC} Detection of backup/copy attempts → DESTROY"
echo "  ${RED}▪${NC} Detection of password changes → DESTROY"
echo "  ${RED}▪${NC} Detection of VM snapshot/restore → DESTROY"
echo "  ${RED}▪${NC} Detection of service tampering → DESTROY"
echo "  ${RED}▪${NC} Detection of security file deletion → DESTROY"
echo ""
echo -e "${YELLOW}Once triggered, there is NO RECOVERY possible!${NC}"
echo ""

# Confirmation
read -p "Are you absolutely sure you want to enable full protection? (yes/no): " confirm

if [[ "$confirm" != "yes" ]]; then
    echo "Operation cancelled."
    exit 0
fi

# Second confirmation
echo ""
echo -e "${RED}FINAL WARNING:${NC}"
echo "This will permanently enable destruction mode."
echo ""
read -p "Type 'ENABLE' to confirm: " final_confirm

if [[ "$final_confirm" != "ENABLE" ]]; then
    echo "Operation cancelled."
    exit 0
fi

# Enable protection
echo ""
echo "Enabling full protection..."

# Update config
jq '.alert_mode = "destruct"' "$CONFIG_FILE" > "${CONFIG_FILE}.tmp"
mv "${CONFIG_FILE}.tmp" "$CONFIG_FILE"
chmod 600 "$CONFIG_FILE"

# Restart services
echo "Restarting guardian services..."
systemctl restart guardian-main guardian-backup guardian-process guardian-files

# Verify
sleep 2
if systemctl is-active --quiet guardian-main; then
    echo ""
    echo "=========================================="
    echo -e "  ${GREEN}✓ Full Protection Enabled${NC}"
    echo "=========================================="
    echo ""
    echo "The security system is now in FULL PROTECTION mode."
    echo ""
    echo "Monitored activities:"
    echo "  • Backup/copy attempts"
    echo "  • Password changes"
    echo "  • VM snapshots/clones"
    echo "  • Service tampering"
    echo "  • Security file modifications"
    echo ""
    echo "Log file: /var/log/guardian.log"
    echo "Status: /usr/local/bin/project-guardian.sh status"
    echo ""
else
    echo -e "${RED}Error: Guardian service failed to start${NC}"
    systemctl status guardian-main
    exit 1
fi

