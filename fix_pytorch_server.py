#!/usr/bin/env python3
"""
PyTorch Server Compatibility Fix
Installs the correct PyTorch version for server environments
"""

import subprocess
import sys
import os

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e}")
        print(f"Error output: {e.stderr}")
        return False

def fix_pytorch_installation():
    """Fix PyTorch installation for server compatibility"""
    print("🔧 Fixing PyTorch installation for server compatibility...")
    
    # Uninstall existing PyTorch
    print("🗑️ Removing existing PyTorch installation...")
    run_command("pip uninstall torch torchvision torchaudio -y", "Uninstall existing PyTorch")
    
    # Install CPU-only PyTorch with specific version for server compatibility
    print("📦 Installing server-compatible PyTorch...")
    
    # Try different PyTorch versions for better compatibility
    pytorch_versions = [
        "torch==2.1.0+cpu torchvision==0.16.0+cpu torchaudio==2.1.0+cpu --index-url https://download.pytorch.org/whl/cpu",
        "torch==2.0.1+cpu torchvision==0.15.2+cpu torchaudio==2.0.2+cpu --index-url https://download.pytorch.org/whl/cpu",
        "torch==1.13.1+cpu torchvision==0.14.1+cpu torchaudio==0.13.1+cpu --index-url https://download.pytorch.org/whl/cpu"
    ]
    
    for version_cmd in pytorch_versions:
        print(f"🔄 Trying PyTorch version: {version_cmd.split()[0]}")
        if run_command(f"pip install {version_cmd}", f"Install PyTorch {version_cmd.split()[0]}"):
            break
    else:
        print("❌ All PyTorch versions failed, trying basic installation...")
        run_command("pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu", "Install basic PyTorch")
    
    # Test PyTorch installation
    print("🧪 Testing PyTorch installation...")
    test_script = """
import torch
import numpy as np

print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")

# Test basic operations
try:
    x = torch.randn(2, 2)
    y = torch.mm(x, x.t())
    print("✅ Basic tensor operations working")
    
    # Test numpy conversion
    x_np = x.numpy()
    print("✅ PyTorch to NumPy conversion working")
    
    print("✅ PyTorch installation is working correctly")
except Exception as e:
    print(f"❌ PyTorch test failed: {e}")
    exit(1)
"""
    
    with open("test_pytorch.py", "w") as f:
        f.write(test_script)
    
    if run_command("python test_pytorch.py", "Test PyTorch installation"):
        print("✅ PyTorch is working correctly")
        os.remove("test_pytorch.py")
        return True
    else:
        print("❌ PyTorch test failed")
        os.remove("test_pytorch.py")
        return False

def install_additional_dependencies():
    """Install additional dependencies for server compatibility"""
    print("📦 Installing additional server dependencies...")
    
    dependencies = [
        "numpy>=1.21.0,<1.25.0",  # Compatible numpy version
        "soundfile>=0.10.0",
        "huggingface_hub",
        "loguru",
        "transformers",
        "scipy",
        "matplotlib",
        "tqdm",
        "openai-whisper",
        "ffmpeg-python"
    ]
    
    for dep in dependencies:
        run_command(f"pip install {dep}", f"Install {dep}")

def main():
    print("=" * 60)
    print("🔧 PyTorch Server Compatibility Fix")
    print("=" * 60)
    
    # Check if running in virtual environment
    if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        print("✅ Running in virtual environment")
    else:
        print("⚠️ Not running in virtual environment - consider using one")
    
    # Fix PyTorch installation
    if fix_pytorch_installation():
        print("✅ PyTorch installation fixed successfully")
    else:
        print("❌ PyTorch installation failed")
        return False
    
    # Install additional dependencies
    install_additional_dependencies()
    
    print("=" * 60)
    print("✅ Server compatibility fix completed!")
    print("=" * 60)
    print("You can now try running:")
    print("python kokoro_server_fixed.py --text 'Hello from server' --voice af_heart --out output.wav")
    
    return True

if __name__ == "__main__":
    main()


