#!/bin/bash

# =============================================================================
# Kokoro TTS Server Fix Script
# Fixes PyTorch compatibility issues on Ubuntu servers
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "This script must be run as root (use sudo)"
    exit 1
fi

print_status "Starting Kokoro TTS server compatibility fix..."

# Update system packages
print_status "Updating system packages..."
apt update -y
apt upgrade -y

# Install essential build tools
print_status "Installing build tools..."
apt install -y \
    build-essential \
    python3-dev \
    python3-pip \
    python3-venv \
    libblas-dev \
    liblapack-dev \
    libatlas-base-dev \
    gfortran \
    libhdf5-dev \
    libffi-dev \
    libssl-dev \
    libjpeg-dev \
    libpng-dev \
    libfreetype6-dev \
    pkg-config \
    cmake

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
print_status "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
print_status "Upgrading pip..."
pip install --upgrade pip setuptools wheel

# Fix PyTorch installation
print_status "Fixing PyTorch installation for server compatibility..."

# Uninstall existing PyTorch
pip uninstall torch torchvision torchaudio -y || true

# Install server-compatible PyTorch versions
print_status "Installing server-compatible PyTorch..."

# Try PyTorch 2.1.0 first (most stable for servers)
if ! pip install torch==2.1.0+cpu torchvision==0.16.0+cpu torchaudio==2.1.0+cpu --index-url https://download.pytorch.org/whl/cpu; then
    print_warning "PyTorch 2.1.0 failed, trying 2.0.1..."
    if ! pip install torch==2.0.1+cpu torchvision==0.15.2+cpu torchaudio==2.0.2+cpu --index-url https://download.pytorch.org/whl/cpu; then
        print_warning "PyTorch 2.0.1 failed, trying 1.13.1..."
        pip install torch==1.13.1+cpu torchvision==0.14.1+cpu torchaudio==0.13.1+cpu --index-url https://download.pytorch.org/whl/cpu
    fi
fi

# Install compatible numpy version
print_status "Installing compatible NumPy..."
pip install "numpy>=1.21.0,<1.25.0"

# Install other dependencies
print_status "Installing other dependencies..."
pip install \
    soundfile>=0.10.0 \
    huggingface_hub \
    loguru \
    transformers \
    scipy \
    matplotlib \
    tqdm \
    openai-whisper \
    ffmpeg-python

# Test PyTorch installation
print_status "Testing PyTorch installation..."
python3 -c "
import torch
import numpy as np
print(f'PyTorch version: {torch.__version__}')
print(f'CUDA available: {torch.cuda.is_available()}')

# Test basic operations
x = torch.randn(2, 2)
y = torch.mm(x, x.t())
print('✅ Basic tensor operations working')

# Test numpy conversion
x_np = x.numpy()
print('✅ PyTorch to NumPy conversion working')
print('✅ PyTorch installation is working correctly')
"

# Install Kokoro TTS
print_status "Installing Kokoro TTS..."
if [ -d "kokoro" ]; then
    cd kokoro
    pip install -e .
    cd ..
else
    print_error "Kokoro directory not found. Please ensure you're in the correct project directory."
    exit 1
fi

# Test Kokoro installation
print_status "Testing Kokoro installation..."
python3 -c "
try:
    from kokoro import KPipeline
    print('✅ Kokoro TTS imported successfully')
    
    # Test pipeline creation
    pipeline = KPipeline(lang_code='a', device='cpu')
    print('✅ Kokoro pipeline created successfully')
except Exception as e:
    print(f'❌ Kokoro test failed: {e}')
    exit(1)
"

# Make scripts executable
print_status "Making scripts executable..."
chmod +x kokoro_server_fixed.py
chmod +x fix_pytorch_server.py

# Test the fixed script
print_status "Testing the fixed Kokoro script..."
if python3 kokoro_server_fixed.py "Hello from server" af_heart ./uploads/audio; then
    print_success "✅ Kokoro TTS is working correctly on server!"
else
    print_error "❌ Kokoro TTS test failed"
    exit 1
fi

print_success "🎉 Server compatibility fix completed successfully!"
print_status "You can now use: python3 kokoro_server_fixed.py 'Your text here' af_heart ./uploads/audio"



