#!/usr/bin/env python3
"""
Working Kokoro TTS Script - Using actual Kokoro library
"""

import sys
import os
import json
import tempfile
from pathlib import Path

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
        except ImportError as e:
            print(json.dumps({"error": f"Kokoro not available: {e}"}))
            sys.exit(1)
        
        # Initialize Kokoro TTS Pipeline
        try:
            # Create pipeline for English (American)
            pipeline = KPipeline(lang_code='a', device='cpu')
        except Exception as e:
            print(json.dumps({"error": f"Failed to initialize pipeline: {e}"}))
            sys.exit(1)
        
        # Calculate duration
        words = len(text.split())
        duration = max(2.0, words * 0.5)
        
        # Generate output filename
        output_file = os.path.join(output_dir, f'kokoro_working_{int(os.urandom(4).hex(), 16)}.wav')
        
        # Generate speech using Kokoro
        try:
            # Use Kokoro to generate speech
            audio_chunks = []
            
            # Process text through pipeline
            for result in pipeline(text, voice=voice):
                if result.audio is not None:
                    audio_chunks.append(result.audio.cpu().numpy())
            
            if not audio_chunks:
                print(json.dumps({"error": "No audio generated"}))
                sys.exit(1)
            
            # Concatenate audio chunks
            import numpy as np
            full_audio = np.concatenate(audio_chunks)
            
            # Save audio
            sf.write(output_file, full_audio, 24000)  # Kokoro uses 24kHz
            
        except Exception as e:
            print(json.dumps({"error": f"Kokoro synthesis failed: {e}"}))
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
            "sample_rate": 24000,
            "words": words,
            "file_size": file_size,
            "engine": "Kokoro TTS"
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
