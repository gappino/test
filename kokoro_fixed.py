#!/usr/bin/env python3
"""
Fixed Kokoro TTS Script - Using correct path
"""

import sys
import os
import json
import tempfile
from pathlib import Path

# Add kokoro directory to Python path
kokoro_path = os.path.join(os.path.dirname(__file__), 'kokoro')
sys.path.insert(0, kokoro_path)

def main():
    try:
        # Get input from command line arguments
        if len(sys.argv) < 2:
            print(json.dumps({"error": "No text provided"}))
            sys.exit(1)
        
        text = sys.argv[1]
        voice = sys.argv[2] if len(sys.argv) > 2 else 'af_heart'
        output_dir = sys.argv[3] if len(sys.argv) > 3 else './uploads/audio'
        
        # Ensure voice is a valid Kokoro voice
        if not voice.startswith(('af_', 'am_', 'bf_', 'bm_')):
            voice = 'af_heart'  # Default to a valid voice
        
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)
        
        # Import Kokoro from the correct path
        try:
            from kokoro import KPipeline
            import soundfile as sf
            import torch
            import numpy as np
        except ImportError as e:
            print(json.dumps({"error": f"Kokoro not available: {e}"}))
            sys.exit(1)
        
        # Initialize Kokoro TTS Pipeline
        try:
            # Create pipeline for English (American)
            pipeline = KPipeline(lang_code='a', device='cpu')
            print("✅ Kokoro pipeline initialized successfully", file=sys.stderr)
        except Exception as e:
            print(json.dumps({"error": f"Failed to initialize pipeline: {e}"}))
            sys.exit(1)
        
        # Calculate duration
        words = len(text.split())
        estimated_duration = max(2.0, words * 0.5)
        
        # Generate output filename
        output_file = os.path.join(output_dir, f'kokoro_fixed_{int(os.urandom(4).hex(), 16)}.wav')
        
        # Generate speech using Kokoro
        try:
            print(f"🎤 Generating speech for: {text[:50]}...", file=sys.stderr)
            
            # Split long text into smaller chunks to avoid Kokoro errors
            max_length = 100  # Maximum characters per chunk
            text_chunks = []
            
            if len(text) > max_length:
                # Split by sentences first
                sentences = text.replace('!', '.').replace('?', '.').split('.')
                current_chunk = ""
                
                for sentence in sentences:
                    sentence = sentence.strip()
                    if not sentence:
                        continue
                        
                    # Add sentence ending back
                    if sentence and not sentence.endswith(('.', '!', '?')):
                        if '?' in text[text.find(sentence):text.find(sentence) + len(sentence) + 5]:
                            sentence += '?'
                        elif '!' in text[text.find(sentence):text.find(sentence) + len(sentence) + 5]:
                            sentence += '!'
                        else:
                            sentence += '.'
                    
                    if len(current_chunk + sentence) <= max_length:
                        current_chunk += sentence + " "
                    else:
                        if current_chunk.strip():
                            text_chunks.append(current_chunk.strip())
                        current_chunk = sentence + " "
                
                if current_chunk.strip():
                    text_chunks.append(current_chunk.strip())
            else:
                text_chunks = [text]
            
            print(f"📝 Split text into {len(text_chunks)} chunks", file=sys.stderr)
            
            # Generate audio for each chunk
            all_audio_chunks = []
            total_duration = 0
            
            for i, chunk in enumerate(text_chunks):
                print(f"🎤 Processing chunk {i+1}/{len(text_chunks)}: {chunk[:30]}...", file=sys.stderr)
                
                try:
                    # Clean chunk text - remove problematic characters
                    clean_chunk = chunk.replace('...', '.').replace('–', '-').replace("'", "'").replace('"', '"').replace('"', '"')
                    
                    # Convert text to tokens using G2P
                    _, tokens = pipeline.g2p(clean_chunk)
                    print(f"📝 Generated {len(tokens)} tokens for chunk {i+1}", file=sys.stderr)
                    
                    # Generate audio from tokens
                    chunk_audio = []
                    for result in pipeline.generate_from_tokens(tokens=tokens, voice=voice, speed=1.0):
                        if result.audio is not None:
                            audio_data = result.audio.cpu().numpy()
                            chunk_audio.append(audio_data)
                            print(f"📄 Generated audio chunk: {len(audio_data)} samples", file=sys.stderr)
                    
                    if chunk_audio:
                        chunk_combined = np.concatenate(chunk_audio)
                        all_audio_chunks.append(chunk_combined)
                        chunk_duration = len(chunk_combined) / 24000
                        total_duration += chunk_duration
                        print(f"✅ Chunk {i+1} completed: {chunk_duration:.2f}s", file=sys.stderr)
                    else:
                        print(f"⚠️ No audio generated for chunk {i+1}", file=sys.stderr)
                        
                except Exception as chunk_error:
                    print(f"❌ Error processing chunk {i+1}: {chunk_error}", file=sys.stderr)
                    # Continue with other chunks instead of failing completely
                    continue
            
            if all_audio_chunks:
                # Combine all chunks
                full_audio = np.concatenate(all_audio_chunks)
                print(f"✅ Combined {len(all_audio_chunks)} audio chunks", file=sys.stderr)
                actual_duration = total_duration
            else:
                raise Exception("No audio chunks generated successfully")
            
            # Ensure audio is in the right format
            if full_audio.ndim > 1:
                full_audio = full_audio.flatten()
            
            # Normalize audio
            if np.max(np.abs(full_audio)) > 0:
                full_audio = full_audio / np.max(np.abs(full_audio)) * 0.8
            
            # Save audio
            sf.write(output_file, full_audio, 24000)
            actual_duration = len(full_audio) / 24000
            
            print(f"✅ Audio saved: {output_file}", file=sys.stderr)
            print(f"📊 Duration: {actual_duration:.2f}s", file=sys.stderr)
            
            # Return success result
            result = {
                "success": True,
                "audio_file": output_file,
                "duration": actual_duration,
                "text": text,
                "voice": voice,
                "sample_rate": 24000,
                "words": words,
                "file_size": os.path.getsize(output_file) if os.path.exists(output_file) else 0,
                "engine": "Real Kokoro TTS"
            }
            
            print(json.dumps(result))
                
        except Exception as e:
            print(json.dumps({"error": f"Kokoro synthesis failed: {e}"}))
            sys.exit(1)
            
    except Exception as e:
        print(json.dumps({"error": f"Script error: {e}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
