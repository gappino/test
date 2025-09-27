#!/usr/bin/env python3
"""
Real TTS using pyttsx3 - Produces actual human-like speech
"""

import sys
import os
import json
import pyttsx3
import tempfile
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
        
        # Initialize TTS engine
        engine = pyttsx3.init()
        
        # Get available voices
        voices = engine.getProperty('voices')
        
        # Set voice (try to find a good English voice)
        if voices:
            # Look for English voices
            english_voices = [v for v in voices if 'en' in v.id.lower() or 'english' in v.name.lower()]
            if english_voices:
                engine.setProperty('voice', english_voices[0].id)
            else:
                engine.setProperty('voice', voices[0].id)
        
        # Set speech rate and volume
        engine.setProperty('rate', 150)  # Speed of speech
        engine.setProperty('volume', 0.9)  # Volume level (0.0 to 1.0)
        
        # Calculate duration
        words = len(text.split())
        duration = max(2.0, words * 0.5)
        
        # Generate output filename
        output_file = os.path.join(output_dir, f'pyttsx3_tts_{int(os.urandom(4).hex(), 16)}.wav')
        
        # Generate speech and save to file
        engine.save_to_file(text, output_file)
        engine.runAndWait()
        
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
            "engine": "pyttsx3 TTS"
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()


