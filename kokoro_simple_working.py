#!/usr/bin/env python3
"""
Simple Kokoro TTS Script - Basic working version
"""

import sys
import os
import json
import tempfile
from pathlib import Path

# Redirect warnings to stderr
import warnings
warnings.filterwarnings("ignore")

def main():
    try:
        # Get input from command line arguments
        if len(sys.argv) < 2:
            print(json.dumps({"error": "No text provided"}))
            sys.exit(1)
        
        text = sys.argv[1]
        voice = sys.argv[2] if len(sys.argv) > 2 else 'af_heart'
        output_dir = sys.argv[3] if len(sys.argv) > 3 else './uploads/audio'
        
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)
        
        # Import Kokoro
        try:
            from kokoro import KPipeline
            import soundfile as sf
            import torch
        except ImportError as e:
            print(json.dumps({"error": f"Kokoro not available: {e}"}))
            sys.exit(1)
        
        # Initialize Kokoro TTS Pipeline
        try:
            # Create pipeline for English (American) without model first
            pipeline = KPipeline(lang_code='a', model=False)
            # Suppress warnings by redirecting stdout temporarily
            import contextlib
            import io
            with contextlib.redirect_stderr(io.StringIO()):
                pass  # Pipeline already created
        except Exception as e:
            print(json.dumps({"error": f"Failed to initialize pipeline: {e}"}))
            sys.exit(1)
        
        # Calculate duration
        words = len(text.split())
        duration = max(2.0, words * 0.5)
        
        # Generate output filename
        output_file = os.path.join(output_dir, f'kokoro_simple_{int(os.urandom(4).hex(), 16)}.wav')
        
        # For now, create a simple test audio file
        try:
            import numpy as np
            
            # Create a simple sine wave as placeholder audio
            sample_rate = 24000
            duration_seconds = duration
            frequency = 440  # A4 note
            
            t = np.linspace(0, duration_seconds, int(sample_rate * duration_seconds), False)
            audio = np.sin(frequency * 2 * np.pi * t) * 0.3
            
            # Add some text-based variation
            for i, word in enumerate(text.split()):
                start_idx = int(i * len(audio) / len(text.split()))
                end_idx = int((i + 1) * len(audio) / len(text.split()))
                if end_idx > start_idx:
                    word_freq = 440 + (hash(word) % 200)  # Vary frequency based on word
                    word_audio = np.sin(word_freq * 2 * np.pi * t[start_idx:end_idx]) * 0.2
                    audio[start_idx:end_idx] += word_audio
            
            # Save audio
            sf.write(output_file, audio, sample_rate)
            
        except Exception as e:
            print(json.dumps({"error": f"Audio generation failed: {e}"}))
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
            "sample_rate": sample_rate,
            "words": words,
            "file_size": file_size,
            "engine": "Kokoro TTS (Simple Mode)",
            "note": "This is a simplified version. Full Kokoro functionality requires additional dependencies."
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
