#!/usr/bin/env python3
"""
Direct Kokoro TTS using the repository code
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
        voice = sys.argv[2] if len(sys.argv) > 2 else 'af_heart_0'
        output_dir = sys.argv[3] if len(sys.argv) > 3 else './uploads/audio'
        
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)
        
        # Add kokoro directory to Python path
        kokoro_path = os.path.join(os.path.dirname(__file__), 'kokoro')
        if kokoro_path not in sys.path:
            sys.path.insert(0, kokoro_path)
        
        try:
            # Try to import from the cloned repository
            from kokoro import KPipeline
            
            # Initialize TTS pipeline
            pipeline = KPipeline('a')  # American English
            
            # Check available voices
            available_voices = list(pipeline.voices.keys())
            print(f"Available voices: {available_voices}", file=sys.stderr)
            
            # Use first available voice if the requested voice is not found
            if voice not in available_voices:
                voice = available_voices[0] if available_voices else None
                if voice is None:
                    raise ValueError("No voices available")
                print(f"Using voice: {voice}", file=sys.stderr)
            
            # Generate speech using __call__ method
            results = list(pipeline(text, voice=voice))
            
            # Combine all audio results
            audio_parts = []
            for result in results:
                if result.audio is not None:
                    audio_parts.append(result.audio)
            
            if not audio_parts:
                raise ValueError("No audio generated")
            
            # Concatenate audio parts
            import torch
            audio = torch.cat(audio_parts, dim=-1)
            
            # Calculate duration
            words = len(text.split())
            duration = max(2.0, words * 0.5)
            
            # Generate output filename
            output_file = os.path.join(output_dir, f'kokoro_direct_{int(os.urandom(4).hex(), 16)}.wav')
            
            # Save audio
            import soundfile as sf
            sf.write(output_file, audio, 22050)
            
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
                "engine": "Real Kokoro TTS (Direct)"
            }
            
            print(json.dumps(result))
            
        except ImportError as e:
            print(json.dumps({"error": f"Kokoro import failed: {e}"}))
            sys.exit(1)
        except Exception as e:
            print(json.dumps({"error": f"Kokoro synthesis failed: {e}"}))
            sys.exit(1)
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
