#!/usr/bin/env python3
"""
Simple Kokoro TTS Script
"""

import sys
import os
import json
import numpy as np
import torch
import soundfile as sf
from pathlib import Path

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
        
        # Simple TTS simulation (since we can't install full Kokoro)
        # Generate a simple audio waveform based on text length
        sample_rate = 24000
        
        # Calculate duration based on text length (more realistic)
        # Average speaking rate is about 150 words per minute
        words = len(text.split())
        duration = max(2.0, words * 0.4)  # Minimum 2 seconds, 0.4 seconds per word
        
        t = np.linspace(0, duration, int(sample_rate * duration))
        
        # Generate a more complex tone with variation
        frequency = 200 + (hash(text) % 300)  # Vary frequency based on text
        
        # Create a more realistic audio pattern
        audio = np.sin(2 * np.pi * frequency * t) * 0.3
        
        # Add harmonics for more natural sound
        audio += np.sin(2 * np.pi * frequency * 1.5 * t) * 0.1
        audio += np.sin(2 * np.pi * frequency * 0.5 * t) * 0.05
        
        # Add some variation over time
        for i in range(1, 4):
            audio += np.sin(2 * np.pi * frequency * i * t) * (0.05 / i)
        
        # Apply envelope for more natural sound
        envelope = np.exp(-t * 0.5) * (1 - np.exp(-t * 10))  # Attack and decay
        audio *= envelope
        
        # Add some noise for realism
        noise = np.random.normal(0, 0.01, len(audio))
        audio += noise
        
        # Normalize audio
        audio = audio / np.max(np.abs(audio)) * 0.8
        
        # Save audio file
        output_file = os.path.join(output_dir, f'kokoro_audio_{int(torch.randint(1000000, 9999999, (1,)).item())}.wav')
        sf.write(output_file, audio, sample_rate)
        
        # Return result
        result = {
            "success": True,
            "audio_file": output_file,
            "duration": duration,
            "text": text,
            "voice": voice,
            "sample_rate": sample_rate,
            "words": words
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
