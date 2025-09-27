# Tiny Whisper Integration Guide
## راهنمای نصب و استفاده از Tiny Whisper برای تبدیل صدا به متن و تولید زیرنویس

### 🎯 Overview
Tiny Whisper has been successfully integrated into your video maker project for speech-to-text conversion and subtitle generation. This lightweight version of OpenAI's Whisper model provides fast and accurate transcription capabilities.

### 📦 Installation Status
✅ **Completed:**
- OpenAI Whisper package installed
- FFmpeg Python bindings installed
- Tiny Whisper implementation created
- API endpoints configured
- Test script validated

### 🚀 Available API Endpoints

#### 1. Basic Transcription
**Endpoint:** `POST /api/whisper/transcribe`

**Parameters:**
- `audio` (file): Audio file to transcribe
- `language` (string, optional): Language code ('auto', 'en', 'fa', etc.)
- `model` (string, optional): Model size ('tiny', 'base', 'small', 'medium', 'large')

**Example Request:**
```javascript
const formData = new FormData();
formData.append('audio', audioFile);
formData.append('language', 'auto');
formData.append('model', 'tiny');

fetch('/api/whisper/transcribe', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

#### 2. Transcription with Timestamps
**Endpoint:** `POST /api/whisper/transcribe-with-timestamps`

**Parameters:**
- `audio` (file): Audio file to transcribe
- `language` (string, optional): Language code
- `model` (string, optional): Model size

**Response includes:**
- Full text transcription
- Language detection
- Timestamped segments
- Duration information

#### 3. Subtitle Generation
**Endpoint:** `POST /api/whisper/generate-subtitles`

**Parameters:**
- `audio` (file): Audio file to process
- `language` (string, optional): Language code
- `model` (string, optional): Model size
- `format` (string, optional): Subtitle format ('srt', 'vtt', 'json')

**Example Request:**
```javascript
const formData = new FormData();
formData.append('audio', audioFile);
formData.append('format', 'srt');
formData.append('language', 'fa'); // For Persian

fetch('/api/whisper/generate-subtitles', {
  method: 'POST',
  body: formData
})
.then(response => response.text())
.then(subtitleContent => {
  // Save as .srt file
  const blob = new Blob([subtitleContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'subtitles.srt';
  a.click();
});
```

### 🎵 Supported Audio Formats
- WAV
- MP3
- M4A
- FLAC
- And other formats supported by FFmpeg

### 🌍 Language Support
Tiny Whisper supports multiple languages including:
- **English** (en)
- **Persian/Farsi** (fa)
- **Arabic** (ar)
- **French** (fr)
- **German** (de)
- **Spanish** (es)
- **Chinese** (zh)
- And many more...

### ⚙️ Model Sizes and Performance

| Model Size | Speed | Accuracy | RAM Usage | Best For |
|------------|-------|----------|-----------|----------|
| `tiny` | ⚡⚡⚡ | ⭐⭐ | ~1GB | Quick transcription |
| `base` | ⚡⚡ | ⭐⭐⭐ | ~1GB | Balanced performance |
| `small` | ⚡ | ⭐⭐⭐⭐ | ~2GB | Good accuracy |
| `medium` | ⚡ | ⭐⭐⭐⭐⭐ | ~5GB | High accuracy |
| `large` | ⚡ | ⭐⭐⭐⭐⭐ | ~10GB | Best accuracy |

### 📝 Subtitle Formats

#### SRT Format
```
1
00:00:00,000 --> 00:00:03,000
Hello, welcome to our video.

2
00:00:03,000 --> 00:00:06,000
Today we will discuss AI technology.
```

#### VTT Format
```
WEBVTT

00:00:00.000 --> 00:00:03.000
Hello, welcome to our video.

00:00:03.000 --> 00:00:06.000
Today we will discuss AI technology.
```

### 🧪 Testing
Run the test script to verify everything is working:
```bash
python test_tiny_whisper.py
```

### 💡 Usage Examples

#### JavaScript Frontend Integration
```javascript
// Upload audio and get transcription
async function transcribeAudio(audioFile) {
  const formData = new FormData();
  formData.append('audio', audioFile);
  formData.append('language', 'auto');
  
  const response = await fetch('/api/whisper/transcribe', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  return result.data.text;
}

// Generate subtitles
async function generateSubtitles(audioFile, format = 'srt') {
  const formData = new FormData();
  formData.append('audio', audioFile);
  formData.append('format', format);
  
  const response = await fetch('/api/whisper/generate-subtitles', {
    method: 'POST',
    body: formData
  });
  
  if (format === 'json') {
    return await response.json();
  } else {
    return await response.text();
  }
}
```

#### Python Direct Usage
```python
from tiny_whisper import TinyWhisper

# Initialize Tiny Whisper
whisper = TinyWhisper(model_size='tiny', language='auto')

# Transcribe audio
result = whisper.transcribe('path/to/audio.wav')
print(result['text'])

# Generate subtitles
subtitles = whisper.generate_subtitles('path/to/audio.wav', 'srt')
print(subtitles['content'])
```

### 🔧 Configuration

#### Environment Variables (Optional)
```bash
# Set in your .env file
WHISPER_MODEL_SIZE=tiny
WHISPER_DEFAULT_LANGUAGE=auto
WHISPER_MAX_FILE_SIZE=25000000  # 25MB
```

#### Server Configuration
The server is configured with:
- Maximum file size: 25MB
- Supported formats: WAV, MP3, M4A, FLAC
- Automatic cleanup of uploaded files
- Error handling and logging

### 🚨 Troubleshooting

#### Common Issues:

1. **Model Loading Error**
   - Ensure you have enough RAM (at least 1GB for tiny model)
   - Check internet connection for first-time model download

2. **Audio Processing Error**
   - Verify audio file is not corrupted
   - Check file format is supported
   - Ensure file size is under 25MB

3. **Language Detection Issues**
   - Try specifying language explicitly instead of 'auto'
   - For Persian, use 'fa' language code

4. **Performance Issues**
   - Use 'tiny' model for fastest processing
   - Consider using 'base' model for better accuracy
   - Ensure adequate CPU resources

### 📊 Performance Tips

1. **For Speed:** Use `tiny` model
2. **For Accuracy:** Use `base` or `small` model
3. **For Persian Content:** Specify `language: 'fa'`
4. **For Large Files:** Consider splitting audio into chunks
5. **For Batch Processing:** Process files sequentially to avoid memory issues

### 🔄 Integration with Video Maker

The Tiny Whisper integration works seamlessly with your existing video maker features:

1. **Audio Upload:** Users can upload audio files through the web interface
2. **Automatic Transcription:** Audio is automatically transcribed
3. **Subtitle Generation:** Subtitles can be generated in multiple formats
4. **Video Integration:** Transcribed text can be used for video content generation
5. **Multi-language Support:** Supports Persian, English, and other languages

### 🎉 Success!
Tiny Whisper is now fully integrated and ready to use! You can:
- ✅ Convert speech to text
- ✅ Generate subtitles in SRT/VTT formats
- ✅ Support multiple languages including Persian
- ✅ Process various audio formats
- ✅ Integrate with your video maker workflow

For any issues or questions, refer to the test script or check the console logs for detailed error messages.


