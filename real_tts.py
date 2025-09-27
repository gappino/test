#!/usr/bin/env python3
"""
Real TTS using Windows SAPI (Speech API) - Produces actual human-like speech
"""

import sys
import os
import json
import subprocess
import tempfile
from pathlib import Path

def text_to_speech_windows(text, output_file):
    """
    Use Windows built-in TTS to generate real speech
    """
    try:
        # Create a PowerShell script for TTS
        ps_script = f'''
        Add-Type -AssemblyName System.Speech
        $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
        $synth.Rate = 0
        $synth.Volume = 100
        $synth.SetOutputToWaveFile("{output_file}")
        $synth.Speak("{text}")
        $synth.Dispose()
        '''
        
        # Write script to temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.ps1', delete=False) as f:
            f.write(ps_script)
            temp_script = f.name
        
        # Execute PowerShell script
        result = subprocess.run([
            'powershell', '-ExecutionPolicy', 'Bypass', '-File', temp_script
        ], capture_output=True, text=True, timeout=30)
        
        # Clean up
        os.unlink(temp_script)
        
        if result.returncode == 0:
            return True
        else:
            print(f"PowerShell error: {result.stderr}", file=sys.stderr)
            return False
            
    except Exception as e:
        print(f"TTS error: {e}", file=sys.stderr)
        return False

def text_to_speech_espeak(text, output_file):
    """
    Use eSpeak if available (fallback)
    """
    try:
        result = subprocess.run([
            'espeak', '-s', '150', '-v', 'en', '-w', output_file, text
        ], capture_output=True, text=True, timeout=30)
        return result.returncode == 0
    except:
        return False

def main():
    try:
        # Get input from command line arguments
        if len(sys.argv) < 2:
            print(json.dumps({"error": "No text provided"}))
            sys.exit(1)
        
        text = sys.argv[1]
        voice = sys.argv[2] if len(sys.argv) > 2 else 'af_heart_0'
        output_dir = sys.argv[3] if len(sys.argv) > 3 else './uploads/audio'
        
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)
        
        # Calculate duration based on text length
        words = len(text.split())
        duration = max(2.0, words * 0.5)
        
        # Generate output filename
        output_file = os.path.join(output_dir, f'real_tts_{int(os.urandom(4).hex(), 16)}.wav')
        
        # Try Windows SAPI first
        success = text_to_speech_windows(text, output_file)
        
        # If Windows SAPI fails, try eSpeak
        if not success:
            print("Trying eSpeak fallback...", file=sys.stderr)
            success = text_to_speech_espeak(text, output_file)
        
        if not success:
            print(json.dumps({"error": "Failed to generate speech with any TTS engine"}))
            sys.exit(1)
        
        # Check if file was created
        if not os.path.exists(output_file):
            print(json.dumps({"error": "Audio file was not created"}))
            sys.exit(1)
        
        # Get file size
        file_size = os.path.getsize(output_file)
        
        # Return result
        result = {
            "success": True,
            "audio_file": output_file,
            "duration": duration,
            "text": text,
            "voice": voice,
            "sample_rate": 22050,
            "words": words,
            "file_size": file_size,
            "engine": "Windows SAPI" if success else "eSpeak"
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()


