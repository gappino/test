#!/bin/bash

# ===========================================
# VideoMaker Free V2 - Quick Install Script
# ===========================================
# For users who want a simple one-command installation

set -e

echo "==========================================="
echo "VideoMaker Free V2 - Quick Install"
echo "==========================================="

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ This script should not be run as root."
   echo "Please run as a regular user. The script will ask for sudo when needed."
   exit 1
fi

# Download and run the full installation script
echo "📥 Downloading installation script..."
curl -fsSL https://raw.githubusercontent.com/gappino/test/master/install_ubuntu24.sh -o install_ubuntu24.sh

echo "🔧 Making script executable..."
chmod +x install_ubuntu24.sh

echo "🚀 Starting installation..."
echo "This will install all dependencies and set up VideoMaker Free V2"
echo ""

# Run the full installation
sudo bash install_ubuntu24.sh

echo ""
echo "✅ Installation completed!"
echo "Your VideoMaker Free V2 server should now be running."
echo ""
