#!/bin/bash

# ===========================================
# VideoMaker Free V2 - Ubuntu 24 Installation Script
# ===========================================
# This script installs all dependencies and sets up the project
# Run with: sudo bash install_ubuntu24.sh

set -e  # Exit on any error

echo "==========================================="
echo "VideoMaker Free V2 - Ubuntu 24 Setup"
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
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons."
   print_warning "Please run as a regular user. The script will ask for sudo when needed."
   exit 1
fi

# Update system packages
print_header "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential system packages
print_header "Installing essential system packages..."
sudo apt install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    python3-venv \
    python3-pip \
    python3-dev \
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
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_status "Node.js installed: $NODE_VERSION"
print_status "npm installed: $NPM_VERSION"

# Install Python 3.11+ (required for Kokoro TTS)
print_header "Installing Python 3.11..."
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3.11-distutils

# Create symbolic links for python3.11
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
sudo update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1

# Install pip for Python 3.11
curl -sS https://bootstrap.pypa.io/get-pip.py | python3.11

# Verify Python installation
PYTHON_VERSION=$(python3 --version)
PIP_VERSION=$(pip3 --version)
print_status "Python installed: $PYTHON_VERSION"
print_status "pip installed: $PIP_VERSION"

# Install additional audio/video libraries
print_header "Installing additional audio/video libraries..."
sudo apt install -y \
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
sudo apt install -y \
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
sudo mkdir -p $PROJECT_DIR
sudo chown $USER:$USER $PROJECT_DIR

# Clone or copy project (assuming current directory contains the project)
print_header "Copying project files..."
if [ -f "package.json" ]; then
    print_status "Copying project from current directory..."
    cp -r . $PROJECT_DIR/
    cd $PROJECT_DIR
else
    print_error "package.json not found in current directory."
    print_warning "Please run this script from the project root directory."
    exit 1
fi

# Set up Node.js dependencies
print_header "Installing Node.js dependencies..."
npm install

# Set up Python virtual environment
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

# Set up environment file
print_header "Setting up environment configuration..."
if [ ! -f ".env" ]; then
    cp env.example .env
    print_status "Environment file created from template."
fi

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

# Update .env file with the API key
sed -i "s/GEMINI_API_KEY=.*/GEMINI_API_KEY=$GEMINI_API_KEY/" .env
print_status "Gemini API key configured in .env file."

# Set proper permissions
print_header "Setting file permissions..."
chmod +x server.js
chmod 755 -R $PROJECT_DIR
chown -R $USER:$USER $PROJECT_DIR

# Create systemd service for auto-start
print_header "Creating systemd service..."
sudo tee /etc/systemd/system/videomakerfree.service > /dev/null <<EOF
[Unit]
Description=VideoMaker Free V2 Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR
Environment=PATH=$PROJECT_DIR/venv/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable videomakerfree.service

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
sudo systemctl stop videomakerfree.service
EOF

chmod +x $PROJECT_DIR/stop.sh

# Create restart script
tee $PROJECT_DIR/restart.sh > /dev/null <<EOF
#!/bin/bash
sudo systemctl restart videomakerfree.service
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

# Final setup instructions
print_header "Installation Complete!"
echo ""
echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}Setup Complete - Ready to Use!${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""
echo -e "${GREEN}✓ All dependencies installed${NC}"
echo -e "${GREEN}✓ Project configured${NC}"
echo -e "${GREEN}✓ Gemini API key configured${NC}"
echo -e "${GREEN}✓ Service created${NC}"
echo ""
echo "Server Management Commands:"
echo "  • Start:   sudo systemctl start videomakerfree.service"
echo "  • Stop:    sudo systemctl stop videomakerfree.service"
echo "  • Restart: sudo systemctl restart videomakerfree.service"
echo "  • Status:  sudo systemctl status videomakerfree.service"
echo "  • Logs:    sudo journalctl -u videomakerfree.service -f"
echo ""
echo -e "${YELLOW}Server URL: http://localhost:3003${NC}"
echo -e "${YELLOW}Project Directory: $PROJECT_DIR${NC}"
echo ""
echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}Ready to start your VideoMaker server!${NC}"
echo -e "${GREEN}===========================================${NC}"

# Optional: Start the service automatically
read -p "Do you want to start the server now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_header "Starting VideoMaker Free V2 server..."
    sudo systemctl start videomakerfree.service
    sleep 3
    if sudo systemctl is-active --quiet videomakerfree.service; then
        print_status "✓ Server started successfully!"
        print_status "Server is running on: http://localhost:3003"
    else
        print_error "✗ Failed to start server. Check logs with: sudo journalctl -u videomakerfree.service"
    fi
fi