#!/usr/bin/env python3
"""
Tiny Whisper Implementation for Speech-to-Text and Subtitle Generation
Optimized for speed and efficiency using the tiny model
"""

import whisper
import json
import sys
import os
import argparse
from pathlib import Path
import ffmpeg
import tempfile
import warnings
from contextlib import redirect_stderr, redirect_stdout
import io

class TinyWhisper:
    def __init__(self, model_size="tiny", language=None):
        """
        Initialize Tiny Whisper
        
        Args:
            model_size (str): Whisper model size ('tiny', 'base', 'small', 'medium', 'large')
            language (str): Language code (e.g., 'en', 'fa', 'auto' for automatic detection)
        """
        self.model_size = model_size
        self.language = language
        self.model = None
        self.load_model()
    
    def load_model(self):
        """Load the Whisper model"""
        try:
            # Only print to stderr to avoid interfering with JSON output
            print(f"Loading Whisper model: {self.model_size}", file=sys.stderr)
            self.model = whisper.load_model(self.model_size)
            print(f"Model loaded successfully!", file=sys.stderr)
        except Exception as e:
            print(f"Error loading model: {e}", file=sys.stderr)
            sys.exit(1)
    
    def preprocess_audio(self, audio_path):
        """
        Preprocess audio file for Whisper
        
        Args:
            audio_path (str): Path to audio file
            
        Returns:
            str: Path to processed audio file
        """
        try:
            # Check if file exists
            if not os.path.exists(audio_path):
                raise FileNotFoundError(f"Audio file not found: {audio_path}")
            
            # Create temporary file for processed audio
            temp_dir = tempfile.mkdtemp()
            processed_path = os.path.join(temp_dir, "processed_audio.wav")
            
            # Use ffmpeg to convert to the format Whisper expects
            (
                ffmpeg
                .input(audio_path)
                .output(
                    processed_path,
                    acodec='pcm_s16le',  # 16-bit PCM
                    ac=1,                # Mono
                    ar=16000             # 16kHz sample rate
                )
                .overwrite_output()
                .run(quiet=True)
            )
            
            return processed_path
            
        except Exception as e:
            print(f"Error preprocessing audio: {e}")
            return audio_path  # Return original if preprocessing fails
    
    def transcribe(self, audio_path, include_timestamps=True):
        """
        Transcribe audio file to text
        
        Args:
            audio_path (str): Path to audio file
            include_timestamps (bool): Whether to include timestamps
            
        Returns:
            dict: Transcription result with text, language, and optional timestamps
        """
        try:
            # Preprocess audio
            processed_path = self.preprocess_audio(audio_path)
            
            # Transcribe with Whisper
            print(f"Transcribing audio: {audio_path}", file=sys.stderr)
            
            # Set transcription options
            options = {
                'verbose': False,
                'task': 'transcribe',
                'fp16': False  # Disable FP16 warnings
            }
            
            if self.language and self.language != 'auto':
                options['language'] = self.language
            
            if include_timestamps:
                options['word_timestamps'] = True
            
            # Perform transcription with suppressed output
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                # Capture Whisper's progress output
                old_stderr = sys.stderr
                sys.stderr = open(os.devnull, 'w')
                try:
                    result = self.model.transcribe(processed_path, **options)
                finally:
                    sys.stderr.close()
                    sys.stderr = old_stderr
            
            # Clean up temporary file
            if processed_path != audio_path:
                os.remove(processed_path)
                os.rmdir(os.path.dirname(processed_path))
            
            # Format result
            transcription_result = {
                'text': result['text'].strip(),
                'language': result.get('language', 'unknown'),
                'duration': len(result.get('segments', [])),
                'success': True
            }
            
            if include_timestamps and 'segments' in result:
                transcription_result['segments'] = []
                for segment in result['segments']:
                    transcription_result['segments'].append({
                        'start': segment['start'],
                        'end': segment['end'],
                        'text': segment['text'].strip()
                    })
            
            return transcription_result
            
        except Exception as e:
            print(f"Error during transcription: {e}", file=sys.stderr)
            return {
                'text': '',
                'language': 'unknown',
                'duration': 0,
                'success': False,
                'error': str(e)
            }
    
    def generate_subtitles(self, audio_path, subtitle_format='srt'):
        """
        Generate subtitles from audio
        
        Args:
            audio_path (str): Path to audio file
            subtitle_format (str): Subtitle format ('srt', 'vtt', 'json')
            
        Returns:
            dict: Subtitle result with content and format
        """
        try:
            # Transcribe with timestamps
            result = self.transcribe(audio_path, include_timestamps=True)
            
            if not result['success']:
                return result
            
            # Generate subtitles based on format
            if subtitle_format.lower() == 'srt':
                subtitle_content = self._generate_srt(result['segments'])
            elif subtitle_format.lower() == 'vtt':
                subtitle_content = self._generate_vtt(result['segments'])
            elif subtitle_format.lower() == 'json':
                subtitle_content = json.dumps(result, indent=2, ensure_ascii=False)
            else:
                raise ValueError(f"Unsupported subtitle format: {subtitle_format}")
            
            return {
                'success': True,
                'format': subtitle_format,
                'content': subtitle_content,
                'segments_count': len(result.get('segments', [])),
                'language': result['language']
            }
            
        except Exception as e:
            print(f"Error generating subtitles: {e}", file=sys.stderr)
            return {
                'success': False,
                'error': str(e)
            }
    
    def _generate_srt(self, segments):
        """Generate SRT subtitle format"""
        srt_content = []
        for i, segment in enumerate(segments, 1):
            start_time = self._format_srt_time(segment['start'])
            end_time = self._format_srt_time(segment['end'])
            text = segment['text'].strip()
            
            srt_content.append(f"{i}")
            srt_content.append(f"{start_time} --> {end_time}")
            srt_content.append(text)
            srt_content.append("")  # Empty line between subtitles
        
        return "\n".join(srt_content)
    
    def _generate_vtt(self, segments):
        """Generate VTT subtitle format"""
        vtt_content = ["WEBVTT", ""]
        for segment in segments:
            start_time = self._format_vtt_time(segment['start'])
            end_time = self._format_vtt_time(segment['end'])
            text = segment['text'].strip()
            
            vtt_content.append(f"{start_time} --> {end_time}")
            vtt_content.append(text)
            vtt_content.append("")  # Empty line between subtitles
        
        return "\n".join(vtt_content)
    
    def _format_srt_time(self, seconds):
        """Format time for SRT format"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millisecs = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millisecs:03d}"
    
    def _format_vtt_time(self, seconds):
        """Format time for VTT format"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millisecs = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millisecs:03d}"

def main():
    parser = argparse.ArgumentParser(description='Tiny Whisper for Speech-to-Text and Subtitle Generation')
    parser.add_argument('audio_file', help='Path to audio file')
    parser.add_argument('--model', default='tiny', choices=['tiny', 'base', 'small', 'medium', 'large'],
                       help='Whisper model size (default: tiny)')
    parser.add_argument('--language', default='auto', help='Language code (e.g., en, fa) or auto for detection')
    parser.add_argument('--output', help='Output file path (optional)')
    parser.add_argument('--format', default='json', choices=['json', 'srt', 'vtt'],
                       help='Output format (default: json)')
    parser.add_argument('--subtitles', action='store_true', help='Generate subtitles instead of just transcription')
    
    args = parser.parse_args()
    
    # Initialize Tiny Whisper
    whisper_engine = TinyWhisper(model_size=args.model, language=args.language)
    
    try:
        if args.subtitles:
            # Generate subtitles
            result = whisper_engine.generate_subtitles(args.audio_file, args.format)
        else:
            # Simple transcription
            result = whisper_engine.transcribe(args.audio_file, include_timestamps=True)
        
        # Output result
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                if args.format == 'json':
                    json.dump(result, f, indent=2, ensure_ascii=False)
                else:
                    f.write(result.get('content', ''))
            print(f"Result saved to: {args.output}", file=sys.stderr)
        else:
            # Print to stdout (only the actual result, no extra text)
            if args.format == 'json':
                print(json.dumps(result, indent=2, ensure_ascii=False))
            else:
                print(result.get('content', ''))
                
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
