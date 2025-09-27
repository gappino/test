#!/usr/bin/env python3
"""
Test script for Tiny Whisper functionality
"""

import os
import sys
import json
from tiny_whisper import TinyWhisper

def test_tiny_whisper():
    """Test Tiny Whisper with available audio files"""
    
    # Check for available audio files
    audio_files = []
    
    # Check public/audio directory
    public_audio_dir = "public/audio"
    if os.path.exists(public_audio_dir):
        for file in os.listdir(public_audio_dir):
            if file.endswith(('.wav', '.mp3', '.m4a', '.flac')):
                audio_files.append(os.path.join(public_audio_dir, file))
    
    # Check uploads/audio directory
    uploads_audio_dir = "uploads/audio"
    if os.path.exists(uploads_audio_dir):
        for file in os.listdir(uploads_audio_dir):
            if file.endswith(('.wav', '.mp3', '.m4a', '.flac')):
                audio_files.append(os.path.join(uploads_audio_dir, file))
    
    if not audio_files:
        print("❌ No audio files found for testing")
        print("Please add some audio files to public/audio or uploads/audio directories")
        return False
    
    print(f"🎵 Found {len(audio_files)} audio files for testing:")
    for file in audio_files:
        print(f"  - {file}")
    
    # Test with the first available audio file
    test_file = audio_files[0]
    print(f"\n🧪 Testing with: {test_file}")
    
    try:
        # Initialize Tiny Whisper
        print("📦 Initializing Tiny Whisper...")
        whisper_engine = TinyWhisper(model_size="tiny", language="auto")
        
        # Test transcription
        print("🎤 Testing transcription...")
        result = whisper_engine.transcribe(test_file, include_timestamps=True)
        
        if result['success']:
            print("✅ Transcription successful!")
            print(f"📝 Text: {result['text'][:100]}...")
            print(f"🌍 Language: {result['language']}")
            print(f"⏱️  Segments: {result['duration']}")
            
            # Test subtitle generation
            print("\n📋 Testing subtitle generation...")
            subtitle_result = whisper_engine.generate_subtitles(test_file, 'srt')
            
            if subtitle_result['success']:
                print("✅ Subtitle generation successful!")
                print(f"📄 Format: {subtitle_result['format']}")
                print(f"🔢 Segments count: {subtitle_result['segments_count']}")
                print(f"🌍 Language: {subtitle_result['language']}")
                
                # Show first few lines of SRT
                lines = subtitle_result['content'].split('\n')[:10]
                print("📝 Sample SRT content:")
                for line in lines:
                    print(f"  {line}")
                
                return True
            else:
                print(f"❌ Subtitle generation failed: {subtitle_result.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ Transcription failed: {result.get('error', 'Unknown error')}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        return False

def main():
    print("🚀 Tiny Whisper Test Script")
    print("=" * 50)
    
    success = test_tiny_whisper()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 All tests passed! Tiny Whisper is working correctly.")
        print("\n📚 Available API endpoints:")
        print("  POST /api/whisper/transcribe - Basic transcription")
        print("  POST /api/whisper/transcribe-with-timestamps - Transcription with timestamps")
        print("  POST /api/whisper/generate-subtitles - Generate SRT/VTT subtitles")
        print("\n🔧 Parameters:")
        print("  - language: 'auto', 'en', 'fa', etc.")
        print("  - model: 'tiny', 'base', 'small', 'medium', 'large'")
        print("  - format: 'json', 'srt', 'vtt' (for subtitles)")
    else:
        print("💥 Tests failed. Please check the error messages above.")
        sys.exit(1)

if __name__ == "__main__":
    main()


