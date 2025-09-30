#!/bin/bash

# ===========================================
# VideoMaker Free V2 - Ubuntu 24 Installation Script (Final)
# ===========================================
# This script only uses packages available in Ubuntu 24

set -e  # Exit on any error

echo "==========================================="
echo "VideoMaker Free V2 - Ubuntu 24 Setup (Final)"
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root on Ubuntu 24 server."
   print_warning "Please run: sudo bash install_ubuntu24_final.sh"
   exit 1
fi

print_status "Running as root on Ubuntu 24 server - OK"

# Update system packages
print_header "Updating system packages..."
apt update && apt upgrade -y

# Install essential system packages (only available packages)
print_header "Installing essential system packages..."
apt install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    python3 \
    python3-venv \
    python3-dev \
    python3-pip \
    libffi-dev \
    libssl-dev \
    pkg-config \
    libasound2-dev \
    portaudio19-dev \
    libsndfile1 \
    libsndfile1-dev \
    libsox-dev \
    sox \
    ffmpeg \
    espeak \
    espeak-data \
    libespeak1 \
    libespeak-dev

# Install Node.js 20.x (LTS)
print_header "Installing Node.js 20.x LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_status "Node.js installed: $NODE_VERSION"
print_status "npm installed: $NPM_VERSION"

# Verify Python installation (Ubuntu 24 default)
PYTHON_VERSION=$(python3 --version)
PIP_VERSION=$(pip3 --version)
print_status "Python installed: $PYTHON_VERSION"
print_status "pip installed: $PIP_VERSION"

# Install additional audio/video libraries
print_header "Installing additional audio/video libraries..."
apt install -y \
    libavcodec-dev \
    libavformat-dev \
    libavutil-dev \
    libswscale-dev \
    libswresample-dev \
    libavfilter-dev \
    libavdevice-dev \
    libopus-dev \
    libvorbis-dev \
    libmp3lame-dev \
    libx264-dev \
    libx265-dev \
    libvpx-dev \
    libaom-dev \
    libfdk-aac-dev \
    libxvidcore-dev \
    libtheora-dev \
    libspeex-dev \
    libvorbis-dev

# Install system dependencies for machine learning
print_header "Installing ML system dependencies..."
apt install -y \
    libopenblas-dev \
    liblapack-dev \
    libatlas-base-dev \
    gfortran \
    libhdf5-dev \
    libhdf5-serial-dev \
    libhdf5-103 \
    libqtgui4 \
    libqtwebkit4 \
    libqt4-test \
    python3-pyqt5 \
    libgtk-3-dev \
    libboost-all-dev

# Set up project directory
print_header "Setting up project directory..."
PROJECT_DIR="/opt/videomakerfree_v2"
mkdir -p $PROJECT_DIR

# Clone project from GitHub
print_header "Cloning project from GitHub..."
cd /opt
if [ -d "videomakerfree_v2" ]; then
    print_warning "Project directory already exists. Removing old version..."
    rm -rf videomakerfree_v2
fi

print_status "Cloning VideoMaker Free V2 from GitHub..."
git clone https://github.com/gappino/test.git videomakerfree_v2
cd $PROJECT_DIR

# Get Gemini API key from user
print_header "Gemini API Key Setup..."
echo ""
echo -e "${YELLOW}Please provide your Gemini API key:${NC}"
echo -e "${YELLOW}You can get it from: https://aistudio.google.com/app/apikey${NC}"
echo ""
read -p "Enter your Gemini API key: " GEMINI_API_KEY

if [ -z "$GEMINI_API_KEY" ]; then
    print_warning "No API key provided. You can add it later in the .env file."
    GEMINI_API_KEY="your_gemini_api_key_here"
fi

# Set up environment file
print_header "Setting up environment configuration..."
if [ -f "env.example" ]; then
    cp env.example .env
    print_status "Environment file created from template."
    
    # Update .env file with the API key
    sed -i "s/GEMINI_API_KEY=.*/GEMINI_API_KEY=$GEMINI_API_KEY/" .env
    print_status "Gemini API key configured in .env file."
else
    print_warning "env.example not found. Creating basic .env file..."
    cat > .env << EOF
# Gemini API Configuration
GEMINI_API_KEY=$GEMINI_API_KEY

# Pollinations.ai Configuration (No API key needed - Free service)

# Server Configuration
PORT=3003
NODE_ENV=production
EOF
    print_status "Basic .env file created with API key."
fi

# Set up Node.js dependencies
print_header "Installing Node.js dependencies..."
npm install

# Set up Python virtual environment using Ubuntu 24 default Python
print_header "Setting up Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Upgrade pip in virtual environment
pip install --upgrade pip setuptools wheel

# Install Python dependencies
print_header "Installing Python dependencies..."
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt

# Install Kokoro TTS dependencies
print_header "Installing Kokoro TTS..."
cd kokoro
pip install -e .
cd ..

# Install additional Python packages for audio processing
print_header "Installing additional Python audio packages..."
pip install \
    librosa \
    soundfile \
    pyaudio \
    pyttsx3 \
    gTTS \
    SpeechRecognition \
    pydub \
    moviepy \
    pillow \
    numpy \
    scipy \
    matplotlib \
    requests \
    python-dotenv

# Create necessary directories
print_header "Creating project directories..."
mkdir -p uploads/audio
mkdir -p uploads/video
mkdir -p uploads/images
mkdir -p generation
mkdir -p output
mkdir -p temp
mkdir -p public/audio

# Set proper permissions
print_header "Setting file permissions..."
chmod +x server.js
chmod 755 -R $PROJECT_DIR

# Create systemd service for auto-start
print_header "Creating systemd service..."
tee /etc/systemd/system/videomakerfree.service > /dev/null <<EOF
[Unit]
Description=VideoMaker Free V2 Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT_DIR
Environment=PATH=$PROJECT_DIR/venv/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
systemctl daemon-reload
systemctl enable videomakerfree.service

# Create startup script
print_header "Creating startup script..."
tee $PROJECT_DIR/start.sh > /dev/null <<EOF
#!/bin/bash
cd $PROJECT_DIR
source venv/bin/activate
node server.js
EOF

chmod +x $PROJECT_DIR/start.sh

# Create stop script
tee $PROJECT_DIR/stop.sh > /dev/null <<EOF
#!/bin/bash
systemctl stop videomakerfree.service
EOF

chmod +x $PROJECT_DIR/stop.sh

# Create restart script
tee $PROJECT_DIR/restart.sh > /dev/null <<EOF
#!/bin/bash
systemctl restart videomakerfree.service
EOF

chmod +x $PROJECT_DIR/restart.sh

# Test installations
print_header "Testing installations..."

# Test Node.js
if command -v node &> /dev/null; then
    print_status "✓ Node.js is working"
else
    print_error "✗ Node.js installation failed"
fi

# Test Python
if command -v python3 &> /dev/null; then
    print_status "✓ Python is working"
else
    print_error "✗ Python installation failed"
fi

# Test FFmpeg
if command -v ffmpeg &> /dev/null; then
    FFMPEG_VERSION=$(ffmpeg -version | head -n1)
    print_status "✓ FFmpeg is working: $FFMPEG_VERSION"
else
    print_error "✗ FFmpeg installation failed"
fi

# Start the service automatically
print_header "Starting VideoMaker Free V2 server..."
systemctl start videomakerfree.service
sleep 5

# Check if service started successfully
if systemctl is-active --quiet videomakerfree.service; then
    print_status "✓ Server started successfully!"
    print_status "✓ Service is running and enabled for auto-start"
    
    # Get server IP for external access
    SERVER_IP=$(hostname -I | awk '{print $1}')
    
    echo ""
    echo -e "${GREEN}===========================================${NC}"
    echo -e "${GREEN}🚀 VideoMaker Free V2 is now running!${NC}"
    echo -e "${GREEN}===========================================${NC}"
    echo ""
    echo -e "${YELLOW}Access URLs:${NC}"
    echo -e "  • Local:  http://localhost:3003"
    echo -e "  • Server: http://$SERVER_IP:3003"
    echo ""
    echo -e "${YELLOW}Service Status:${NC}"
    systemctl status videomakerfree.service --no-pager -l
    echo ""
else
    print_error "✗ Failed to start server."
    print_warning "Checking logs for errors..."
    journalctl -u videomakerfree.service --no-pager -l --since "1 minute ago"
    echo ""
    print_warning "You can try starting manually with:"
    print_warning "systemctl start videomakerfree.service"
    print_warning "journalctl -u videomakerfree.service -f"
fi

echo ""
echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}Installation completed successfully!${NC}"
echo -e "${GREEN}===========================================${NC}"
