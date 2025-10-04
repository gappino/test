#!/usr/bin/env python3
"""
Piper TTS Service
Replaces Kokoro TTS with Piper TTS for better reliability and performance
"""

import os
import sys
import json
import subprocess
import tempfile
import time
import uuid
import shutil
from pathlib import Path

# Set UTF-8 encoding for Windows
if sys.platform == "win32":
    os.environ["PYTHONIOENCODING"] = "utf-8"

def get_audio_duration(audio_file):
    """Get actual audio duration using ffprobe"""
    try:
        # Use ffprobe to get exact duration
        cmd = [
            'ffprobe', '-v', 'quiet', '-show_entries', 'format=duration',
            '-of', 'csv=p=0', audio_file
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            duration = float(result.stdout.strip())
            return duration
        else:
            print(f"ffprobe error: {result.stderr}")
            # Fallback to file size estimation
            file_size = os.path.getsize(audio_file)
            sample_rate = 22050  # Use 22kHz for better quality
            duration = file_size / (sample_rate * 2)
            return duration
            
    except Exception as e:
        print(f"Error getting audio duration: {e}")
        # Fallback to file size estimation
        try:
            file_size = os.path.getsize(audio_file)
            sample_rate = 22050  # Use 22kHz for better quality
            duration = file_size / (sample_rate * 2)
            return duration
        except:
            return 5.0  # Default fallback

def download_voice_if_needed(voice_name, data_dir=None):
    """Download voice if it doesn't exist"""
    if data_dir is None:
        data_dir = os.getcwd()
    
    voice_path = os.path.join(data_dir, voice_name)
    if not os.path.exists(voice_path):
        print(f"Downloading voice: {voice_name}")
        try:
            result = subprocess.run([
                sys.executable, '-m', 'piper.download_voices', voice_name
            ], capture_output=True, text=True, cwd=data_dir, encoding='utf-8', errors='replace')
            
            if result.returncode != 0:
                print(f"Error downloading voice: {result.stderr}")
                return False
            print(f"Successfully downloaded voice: {voice_name}")
            return True
        except Exception as e:
            print(f"Exception downloading voice: {e}")
            return False
    return True

def generate_speech(text, voice_name="en_US-kristin-medium", output_file=None, data_dir=None):
    """
    Generate speech using Piper TTS
    
    Args:
        text: Text to convert to speech
        voice_name: Voice model name (default: en_US-lessac-medium)
        output_file: Output file path (if None, will create temp file)
        data_dir: Directory containing voice models
    
    Returns:
        dict: Result with success status and file info
    """
    try:
        if not text or not text.strip():
            return {
                "success": False,
                "error": "متن مورد نیاز است"
            }
        
        # Set default data directory
        if data_dir is None:
            data_dir = os.getcwd()
        
        # Download voice if needed
        if not download_voice_if_needed(voice_name, data_dir):
            return {
                "success": False,
                "error": f"خطا در دانلود صدا: {voice_name}"
            }
        
        # Create output file if not provided
        if output_file is None:
            # Use the data_dir as the output directory with a unique filename
            unique_id = uuid.uuid4().hex
            output_file = os.path.join(os.path.abspath(data_dir), f"piper_tts_{unique_id}.wav")
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        
        # Print without encoding errors
        print(f"Generating speech with voice: {voice_name}")
        try:
            print(f"Text length: {len(text)} characters")
        except:
            pass
        print(f"Output: {output_file}")
        
        # Run Piper TTS with proper encoding
        cmd = [
            sys.executable, '-m', 'piper',
            '-m', voice_name,
            '-f', output_file,
            '--data-dir', data_dir,
            '--', text
        ]
        
        # Don't print command with Persian text to avoid encoding errors
        print(f"Running Piper TTS...")
        
        # Use UTF-8 encoding for subprocess
        result = subprocess.run(
            cmd, 
            capture_output=True, 
            text=True, 
            cwd=data_dir,
            encoding='utf-8',
            errors='replace'
        )
        
        if result.returncode != 0:
            print(f"Piper TTS error: {result.stderr}")
            return {
                "success": False,
                "error": f"خطا در تولید صدا: {result.stderr}"
            }
        
        # Check if output file was created
        if not os.path.exists(output_file):
            return {
                "success": False,
                "error": "فایل صوتی تولید نشد"
            }
        
        # Get file info
        file_size = os.path.getsize(output_file)
        
        # Get actual duration using ffprobe
        duration = get_audio_duration(output_file)
        
        return {
            "success": True,
            "audio_file": output_file,
            "duration": round(duration, 2),
            "text": text,
            "voice": voice_name,
            "sample_rate": 16000,
            "words": len(text.split()),
            "file_size": file_size,
            "engine": "Piper TTS"
        }
        
    except Exception as e:
        print(f"Exception in generate_speech: {e}")
        return {
            "success": False,
            "error": f"خطای سیستم: {str(e)}"
        }

def get_available_voices():
    """Get list of available voices"""
    try:
        result = subprocess.run([
            sys.executable, '-m', 'piper.download_voices'
        ], capture_output=True, text=True, encoding='utf-8', errors='replace')
        
        if result.returncode != 0:
            return []
        
        voices = []
        lines = result.stdout.split('\n')
        
        for line in lines:
            line = line.strip()
            if line and not line.startswith('Available voices:'):
                # Parse voice name and description
                parts = line.split(' - ', 1)
                if len(parts) >= 1:
                    voice_id = parts[0].strip()
                    description = parts[1].strip() if len(parts) > 1 else voice_id
                    
                    # Determine language and gender from voice name
                    language = "انگلیسی"
                    gender = "زن"
                    
                    if "male" in voice_id.lower() or "man" in voice_id.lower():
                        gender = "مرد"
                    
                    voices.append({
                        "id": voice_id,
                        "name": f"صدای {gender} - {description}",
                        "language": language,
                        "description": description
                    })
        
        return voices
        
    except Exception as e:
        print(f"Error getting voices: {e}")
        return []

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python piper_tts.py <text> [voice] [output_dir]")
        sys.exit(1)
    
    text = sys.argv[1]
    voice = sys.argv[2] if len(sys.argv) > 2 else "en_US-kristin-medium"
    output_dir = sys.argv[3] if len(sys.argv) > 3 else None
    unique_suffix = sys.argv[4] if len(sys.argv) > 4 else None
    
    target_output = None
    if output_dir and unique_suffix:
        target_output = os.path.join(os.path.abspath(output_dir), f"piper_tts_{unique_suffix}.wav")

    result = generate_speech(text, voice, output_file=target_output, data_dir=output_dir)
    print(json.dumps(result, ensure_ascii=True))
